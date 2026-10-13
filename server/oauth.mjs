import crypto from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {origin,secureCookies} from './config.mjs';
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
const random=()=>crypto.randomBytes(32).toString('base64url');
export async function installOAuth(app,pool,adminEmail) {
 await pool.query(`CREATE TABLE IF NOT EXISTS kartvicio.identities(provider text NOT NULL,subject text NOT NULL,email text NOT NULL REFERENCES kartvicio.accounts(email),PRIMARY KEY(provider,subject));
 CREATE TABLE IF NOT EXISTS kartvicio.oauth_states(state_hash text PRIMARY KEY,browser_hash text NOT NULL,provider text NOT NULL,verifier text NOT NULL,nonce text NOT NULL,expires timestamptz NOT NULL,link_email text);`);
 const personalTenant='9188040d-6c67-4c5b-b112-36a304b66dad';
 const providers={
  google:{id:process.env.GOOGLE_CLIENT_ID,secret:process.env.GOOGLE_CLIENT_SECRET,discovery:'https://accounts.google.com/.well-known/openid-configuration',issuer:'https://accounts.google.com'},
  microsoft:{id:process.env.MICROSOFT_CLIENT_ID,secret:process.env.MICROSOFT_CLIENT_SECRET,discovery:'https://login.microsoftonline.com/consumers/v2.0/.well-known/openid-configuration',issuer:`https://login.microsoftonline.com/${personalTenant}/v2.0`}
 };
 const metadata=new Map();
 async function config(name){if(!metadata.has(name)){const r=await fetch(providers[name].discovery,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Provedor indisponível');const d=await r.json();metadata.set(name,{...d,keys:createRemoteJWKSet(new URL(d.jwks_uri))});}return metadata.get(name);}
 app.get('/api/auth/providers',(req,res)=>res.json(Object.fromEntries(Object.entries(providers).map(([k,v])=>[k,Boolean(v.id&&v.secret)]))));
 app.get('/api/auth/:provider/start',async(req,res)=>{
  const name=req.params.provider,p=providers[name];if(!p?.id||!p.secret)return res.redirect('/login?auth_error=not_configured');
  if(req.headers.host!==new URL(origin).host)return res.redirect(origin+req.originalUrl);
  try {
   const d=await config(name),state=random(),browser=random(),verifier=random(),nonce=random();
   const session=/(?:^|;\s*)kv_session=([^;]+)/.exec(req.headers.cookie||'')?.[1];
   const link=(await pool.query('SELECT email FROM kartvicio.sessions WHERE token_hash=$1 AND expires>now()',[digest(session||'')])).rows[0]?.email||null;
   await pool.query('DELETE FROM kartvicio.oauth_states WHERE expires<now()');
   await pool.query("INSERT INTO kartvicio.oauth_states VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes',$6)",[digest(state),digest(browser),name,verifier,nonce,link]);
   res.cookie('kv_oauth',browser,{httpOnly:true,secure:secureCookies,sameSite:'lax',path:'/api/auth',maxAge:600000});
   const url=new URL(d.authorization_endpoint);url.search=new URLSearchParams({client_id:p.id,redirect_uri:`${origin}/api/auth/${name}/callback`,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'}).toString();res.redirect(url.href);
  }catch{res.redirect('/login?auth_error=provider_unavailable');}
 });
 app.get('/api/auth/:provider/callback',async(req,res)=>{
  const name=req.params.provider,p=providers[name];
  try {
   if(!p?.id||!p.secret||typeof req.query.state!=='string'||typeof req.query.code!=='string')throw Error('invalid');
   const browser=/(?:^|;\s*)kv_oauth=([^;]+)/.exec(req.headers.cookie||'')?.[1]||'';
   const state=(await pool.query('DELETE FROM kartvicio.oauth_states WHERE state_hash=$1 AND browser_hash=$2 AND provider=$3 AND expires>now() RETURNING *',[digest(req.query.state),digest(browser),name])).rows[0];
   if(!state)throw Error('invalid');
   res.clearCookie('kv_oauth',{path:'/api/auth'});
   const d=await config(name),tokenResponse=await fetch(d.token_endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code:req.query.code,client_id:p.id,client_secret:p.secret,redirect_uri:`${origin}/api/auth/${name}/callback`,code_verifier:state.verifier}),signal:AbortSignal.timeout(15000)});
   if(!tokenResponse.ok)throw Error('invalid');const tokens=await tokenResponse.json();
   const {payload}=await jwtVerify(tokens.id_token,d.keys,{issuer:p.issuer,audience:p.id,algorithms:['RS256'],requiredClaims:['sub','exp','iat','nonce']});
   if(payload.nonce!==state.nonce)throw Error('invalid');
   const db=await pool.connect();let email;
   try {
    await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[name+payload.sub]);
    const identity=(await db.query('SELECT email FROM kartvicio.identities WHERE provider=$1 AND subject=$2',[name,payload.sub])).rows[0];
    email=identity?.email;
    if(!email){
     // Google is authoritative for verified Gmail or verified Workspace identities.
     const googleVerified=name==='google'&&payload.email_verified===true&&typeof payload.email==='string'&&(/@gmail\.com$/i.test(payload.email)||Boolean(payload.hd));
     email=state.link_email||(googleVerified?payload.email.trim().toLowerCase():null);
     if(!email)throw Error('link_required');
     const configs=(await db.query("SELECT data FROM kartvicio.records WHERE entity='Usuario' AND lower(trim(data->>'email'))=$1",[email])).rows;
     if(email!==adminEmail&&(!configs.length||configs.some(r=>r.data.ativo===false)))throw Error('not_allowed');
     await db.query('INSERT INTO kartvicio.accounts(email,password_hash,full_name) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING',[email,'!oauth-only',String(payload.name||email)]);
     await db.query('INSERT INTO kartvicio.identities VALUES($1,$2,$3)',[name,payload.sub,email]);
    }
    const configs=(await db.query("SELECT data FROM kartvicio.records WHERE entity='Usuario' AND lower(trim(data->>'email'))=$1",[email])).rows;
    if(email!==adminEmail&&(!configs.length||configs.some(r=>r.data.ativo===false)))throw Error('not_allowed');
    const session=random();await db.query("INSERT INTO kartvicio.sessions VALUES($1,$2,now()+interval '12 hours')",[digest(session),email]);
    await db.query('COMMIT');res.cookie('kv_session',session,{httpOnly:true,secure:secureCookies,sameSite:'strict',path:'/',maxAge:43200000});
   }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
   res.redirect('/');
  }catch(e){const reason=['link_required','not_allowed'].includes(e.message)?e.message:'invalid';res.redirect('/login?auth_error='+reason);}
 });
}
