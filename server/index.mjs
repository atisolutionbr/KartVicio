import express from 'express';
import compression from 'compression';
import pg from 'pg';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { matches, pageRows, aggregateRows } from './query.mjs';
import {installPilotLifecycle} from './pilot-lifecycle.mjs';
import {lockRelations,validateRelations} from './relations.mjs';
import {installStageResults} from './stage-results.mjs';
import { installOAuth } from './oauth.mjs';
import { origin, secureCookies, database } from './config.mjs';
import { installInvitations } from './invitations.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pool = new pg.Pool(database);
await pool.query(`CREATE SCHEMA IF NOT EXISTS kartvicio;
CREATE TABLE IF NOT EXISTS kartvicio.records (entity text NOT NULL,id text NOT NULL,data jsonb NOT NULL,PRIMARY KEY(entity,id));
CREATE TABLE IF NOT EXISTS kartvicio.accounts (email text PRIMARY KEY,password_hash text NOT NULL,full_name text NOT NULL);
CREATE TABLE IF NOT EXISTS kartvicio.sessions (token_hash text PRIMARY KEY,email text NOT NULL REFERENCES kartvicio.accounts(email),expires timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS kartvicio.migrations (name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());`);
const migrated = await pool.query("SELECT 1 FROM kartvicio.migrations WHERE name='base44-initial'");
if (!migrated.rowCount) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('INSERT INTO kartvicio.records SELECT entity,id,data FROM base44_import.records ON CONFLICT DO NOTHING');
    await db.query("INSERT INTO kartvicio.migrations(name) VALUES('base44-initial')");
    await db.query('COMMIT');
  } catch(e) { await db.query('ROLLBACK'); throw e; } finally { db.release(); }
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function passwordHash(value, salt=crypto.randomBytes(16).toString('hex')) { return salt+':'+crypto.scryptSync(value,salt,64).toString('hex'); }
function verifyPassword(value, saved) { if(!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(saved||''))return false;const [salt] = saved.split(':'); const actual = passwordHash(value,salt); return crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(saved)); }
const adminEmail = process.env.LOCAL_ADMIN_EMAIL || 'jonatha.soares@atisolution.com.br';
if (!(await pool.query('SELECT 1 FROM kartvicio.accounts WHERE email=$1',[adminEmail])).rowCount) {
  const password = crypto.randomBytes(18).toString('base64url');
  await pool.query('INSERT INTO kartvicio.accounts VALUES($1,$2,$3)',[adminEmail,passwordHash(password),'Administrador KartVicio']);
  fs.mkdirSync(path.join(root,'private-data'),{recursive:true});
  fs.writeFileSync(path.join(root,'private-data/local-access.txt'),`URL: http://localhost:6300\nEmail: ${adminEmail}\nSenha: ${password}\n`);
}
const schemas = Object.fromEntries(fs.readdirSync(path.join(root,'base44/entities')).filter(f=>f.endsWith('.jsonc')).map(f=>[f.slice(0,-6), JSON.parse(fs.readFileSync(path.join(root,'base44/entities',f),'utf8'))]));
const app = express();
app.disable('x-powered-by');
app.use(compression({filter:(req,res)=>req.path!=='/api/events' && compression.filter(req,res)}));
app.use('/api',(req,res,next)=>{res.set('Cache-Control','private, no-store');next();});
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(express.json({limit:'2mb'}));
app.use((req,res,next)=>{
  const allowedOrigins = secureCookies ? [origin] : [origin,'http://127.0.0.1:6300'];
  if (!allowedOrigins.some(url=>new URL(url).host===req.headers.host)) return res.status(403).json({message:'Host inválido'});
  if (req.method !== 'GET' && req.headers.origin && !allowedOrigins.includes(req.headers.origin)) return res.status(403).json({message:'Origem inválida'});
  next();
});
const read = async (entity, db=pool) => (await db.query('SELECT data FROM kartvicio.records WHERE entity=$1 ORDER BY id',[entity])).rows.map(r=>r.data);
const cookieToken = req => /(?:^|;\s*)kv_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
const attempts = new Map();
await installOAuth(app,pool,adminEmail);
// Expire sessions created before the identity binding correction, once per database.
await pool.query(`WITH applied AS (INSERT INTO kartvicio.migrations(name) VALUES('identity-isolation-v2') ON CONFLICT DO NOTHING RETURNING name) DELETE FROM kartvicio.sessions WHERE EXISTS(SELECT 1 FROM applied)`);
app.post('/api/auth/login',async(req,res)=>{
  const key=req.ip, attempt=attempts.get(key);
  if(attempt && attempt.count>=15 && Date.now()-attempt.time<900000) return res.status(429).json({message:'Aguarde alguns minutos para tentar novamente.'});
  const email=String(req.body.email || '').trim().toLowerCase(), password=String(req.body.password || '');
  const account=(await pool.query('SELECT * FROM kartvicio.accounts WHERE email=$1',[email])).rows[0];
  if(!account || password.length>256 || !verifyPassword(password,account.password_hash)) {
    attempts.set(key,{time:Date.now(),count:(attempt?.count || 0)+1});
    return res.status(401).json({message:'E-mail ou senha inválidos.'});
  }
  attempts.delete(key);
  const permissions=(await read('Usuario')).filter(u=>u.email?.trim().toLowerCase()===email);
  if(email!==adminEmail&&(!permissions.length||permissions.some(p=>p.ativo===false)))return res.status(403).json({message:'Usuário sem acesso ou inativo.'});
  const token=crypto.randomBytes(32).toString('hex');
  await pool.query("INSERT INTO kartvicio.sessions VALUES($1,$2,now()+interval '12 hours')",[hash(token),email]);
  res.cookie('kv_session',token,{httpOnly:true,secure:secureCookies,sameSite:'strict',maxAge:43200000,path:'/'}).json({ok:true});
});
app.post('/api/auth/logout',async(req,res)=>{
  await pool.query('DELETE FROM kartvicio.sessions WHERE token_hash=$1',[hash(cookieToken(req)||'')]);
  for(const client of subscribers)if(cookieToken(client.req)===cookieToken(req))client.res.end();
  res.clearCookie('kv_session',{path:'/'}).json({ok:true});
});
app.use('/api',async(req,res,next)=>{
  const account=(await pool.query('SELECT a.email,a.full_name FROM kartvicio.sessions s JOIN kartvicio.accounts a ON a.email=s.email WHERE token_hash=$1 AND expires>now()',[hash(cookieToken(req)||'')])).rows[0];
  if(!account) return res.status(401).json({message:'Autenticação necessária'});
  const configs=(await read('Usuario')).filter(u=>u.email?.trim().toLowerCase()===account.email);
  if(account.email!==adminEmail&&(!configs.length||configs.some(p=>p.ativo===false)))return res.status(403).json({message:'Usuário sem acesso ou inativo'});
  const permission=account.email===adminEmail ? {permissao:'admin',ativo:true,campeonatos_ids:[]} : {...configs[0]};
  // Only the configured owner can administer accounts. Legacy admin flags do not grant it.
  if(account.email!==adminEmail && permission.permissao==='admin')permission.permissao='visualizador';
  if(permission.ativo===false) return res.status(403).json({message:'Usuário inativo'});
  req.user={...account,id:account.email,role:permission.permissao==='admin'?'admin':'user',permissions:permission};
  if(permission.permissao!=='admin'){
    const names=await pool.query("SELECT DISTINCT data->>'piloto_nome' AS name FROM kartvicio.records WHERE entity IN ('InscricaoPiloto','ResultadoEtapa') AND data->>'campeonato_id'=ANY($1::text[])",[permission.campeonatos_ids||[]]);
    req.allowedPilots=new Set(names.rows.map(r=>r.name));
  }
  next();
});
app.get('/api/auth/me',(req,res)=>res.json(req.user));
await installInvitations(app,pool);
const permitted=(req,entity,row)=>{
  const p=req.user.permissions;
  if(p.permissao==='admin')return true;
  if(entity==='Usuario')return row.email?.toLowerCase()===req.user.email;
  if(entity==='LogAlteracao')return false;
  if(entity==='Piloto'||entity==='Pontuacao')return req.allowedPilots?.has(entity==='Piloto'?row.nome:row.piloto_nome)===true;
  const camp=entity==='Campeonato'?row.id:row.campeonato_id;
  return camp ? (p.campeonatos_ids||[]).includes(camp) : true;
};
const assertWrite=(req,entity,row)=>{
  const role=req.user.permissions.permissao;
  if(role!=='admin' && !(role==='operador' && ['ResultadoEtapa','Penalidade','LogAlteracao'].includes(entity))) throw Object.assign(new Error('Sem permissão para alterar este cadastro'),{status:403});
  if(!permitted(req,entity,row) && entity!=='LogAlteracao') throw Object.assign(new Error('Campeonato sem acesso'),{status:403});
};
const invalidate=entities=>{for(const entity of new Set(entities))for(const client of subscribers)client.res.write(`data: ${JSON.stringify({entity,type:'update'})}\n\n`);};
installPilotLifecycle(app,pool,invalidate);
installStageResults(app,pool,{assertWrite,broadcast:etapa=>{for(const entity of ['ResultadoEtapa','Penalidade','Etapa'])for(const client of subscribers)if(permitted(client.req,entity,etapa))client.res.write(`data: ${JSON.stringify({entity,type:'update'})}\n\n`);}});
app.post('/api/entities/:entity/:action',async(req,res)=>{
  const {entity,action}=req.params, body=req.body;
  if(entity==='User' && action==='list') {
    if(req.user.permissions.permissao!=='admin')return res.status(403).json({message:'Sem permissão'});
    const users=await read('User'); return res.json(body.legacy ? users : pageRows(users,body.options||{}));
  }
  if(!schemas[entity])return res.status(404).json({message:'Entidade inválida'});
  if(['list','filter','get','count','aggregate'].includes(action)) {
    const rows=(await read(entity)).filter(row=>permitted(req,entity,row));
    if(action==='get') { const row=rows.find(r=>r.id===body.id);return row?res.json(row):res.status(404).json({message:'Registro não encontrado'}); }
    if(action==='aggregate')return res.json(aggregateRows(rows,body));
    const filtered=rows.filter(row=>matches(row,body.query));
    if(action==='count')return res.json(filtered.length);
    return res.json(pageRows(filtered,body.options||{},body.legacy));
  }
  const db=await pool.connect(); const events=[],relatedChanges=[];
  try {
    await db.query('BEGIN');await lockRelations(db);
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[entity]);
    const rows=await read(entity,db);
    const save=async(data,id)=>{
      if(!data || typeof data!=='object' || Array.isArray(data))throw new Error('Dados inválidos');
      const old=id?rows.find(r=>r.id===id):null;
      if(id&&!old)throw Object.assign(new Error('Registro não encontrado'),{status:404});
      if(old)assertWrite(req,entity,old);
      const defaults=Object.fromEntries(Object.entries(schemas[entity].properties).filter(([,s])=>'default' in s).map(([k,s])=>[k,s.default]));
      const now=new Date().toISOString();
      const row={...defaults,...old,...data,id:old?.id || crypto.randomUUID(),created_date:old?.created_date || now,created_by:old?.created_by || req.user.email,updated_date:now};
      if(entity==='Usuario') {
        row.email=String(row.email||'').trim().toLowerCase();
      }
      if(['ResultadoEtapa','Penalidade'].includes(entity)) {
        const stage=(await db.query("SELECT data FROM kartvicio.records WHERE entity='Etapa' AND id=$1",[row.etapa_id])).rows[0]?.data;
        if(!stage || stage.campeonato_id!==row.campeonato_id || (entity==='ResultadoEtapa' && stage.ano!==row.ano))throw Object.assign(new Error('Etapa, campeonato e ano inconsistentes.'),{status:400});
        if(entity==='ResultadoEtapa' && stage.finalizada && (!old || Object.keys(data).some(key=>!['id','descartado','pontos','pontos_melhor_volta','pontos_penalidade','pontos_tipo_extra','pontos_totais'].includes(key))))throw Object.assign(new Error('Reabra a etapa para alterar resultados.'),{status:409});
      }
      assertWrite(req,entity,row);
      relatedChanges.push(...await validateRelations(db,entity,row,old));
      if(entity==='Usuario' && row.permissao==='admin' && row.email!==adminEmail)throw Object.assign(new Error('Somente o administrador principal pode ter este perfil.'),{status:400});
      if(entity==='Usuario'&&rows.some(r=>r.id!==row.id&&String(r.email||'').trim().toLowerCase()===row.email))throw Object.assign(new Error('Já existe um usuário com este e-mail.'),{status:409});
      for(const key of schemas[entity].required||[])if(row[key]===undefined||row[key]===null||row[key]==='')throw new Error(`Campo obrigatório: ${key}`);
      for(const [key,schema] of Object.entries(schemas[entity].properties)) {
        if(row[key]==null)continue;
        if(schema.enum&&!schema.enum.includes(row[key]))throw new Error(`Valor inválido: ${key}`);
        if(schema.type==='number'&&(typeof row[key]!=='number'||!Number.isFinite(row[key])))throw new Error(`Número inválido: ${key}`);
      }
      await db.query('INSERT INTO kartvicio.records VALUES($1,$2,$3) ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data',[entity,row.id,row]);
      if(old)rows.splice(rows.indexOf(old),1,row);else rows.push(row);
      events.push({type:old?'update':'create',id:row.id,data:row});return row;
    };
    let result;
    if(action==='create')result=await save(body.data);
    else if(action==='update')result=await save(body.data,body.id);
    else if(action==='delete') {
      const old=rows.find(r=>r.id===body.id); if(!old)throw Object.assign(new Error('Registro não encontrado'),{status:404});
      assertWrite(req,entity,old);
      if(entity==='Piloto')throw Object.assign(new Error('Use a exclusão completa com prévia de vínculos.'),{status:409});
      if(['Campeonato','Etapa'].includes(entity)){const field=entity==='Campeonato'?'campeonato_id':'etapa_id';const linked=await db.query('SELECT 1 FROM kartvicio.records WHERE data->>$1=$2 LIMIT 1',[field,old.id]);if(linked.rowCount)throw Object.assign(new Error('Existem registros vinculados. Remova ou transfira os vínculos antes de excluir.'),{status:409});}
      await db.query('DELETE FROM kartvicio.records WHERE entity=$1 AND id=$2',[entity,body.id]);result={id:body.id};events.push({type:'delete',id:body.id,data:old});
    } else if(action==='updateMany') {
      let count=0;for(const row of [...rows].filter(r=>matches(r,body.query))) {await save(body.data.$set||body.data,row.id);count++;}result={modified_count:count,has_more:false};
    } else if(action==='upsert'||action==='bulkCreate') {
      result=[];if(!Array.isArray(body.records)||body.records.length>1000)throw new Error('Lote inválido');
      for(const data of body.records) {const old=action==='upsert'?rows.find(r=>body.key.every(k=>r[k]===data[k])):null;result.push(await save(data,old?.id));}
    } else throw new Error('Operação não suportada');
    await db.query('COMMIT');
    if(relatedChanges.length)invalidate(relatedChanges);
    if(entity==='Usuario')for(const client of subscribers)client.res.end();
    for(const event of events)for(const client of subscribers)if(permitted(client.req,entity,event.data)) client.res.write(`data: ${JSON.stringify({entity,...event})}\n\n`);
    res.json(result);
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
});
const subscribers=new Set();
app.get('/api/events',(req,res)=>{
  res.set({'Content-Type':'text/event-stream','Cache-Control':'private, no-store','Connection':'keep-alive'});res.flushHeaders();
  const client={req,res};subscribers.add(client);const timer=setInterval(async()=>{
    try { const active=await pool.query('SELECT 1 FROM kartvicio.sessions WHERE token_hash=$1 AND expires>now()',[hash(cookieToken(req)||'')]); if(!active.rowCount)return res.end(); res.write(': keepalive\n\n'); } catch { res.end(); }
  },25000);
  req.on('close',()=>{clearInterval(timer);subscribers.delete(client);});
});
fs.mkdirSync(path.join(root,'private-data/uploads'),{recursive:true});
const upload=multer({storage:multer.diskStorage({destination:path.join(root,'private-data/uploads'),filename:(req,file,cb)=>cb(null,crypto.randomUUID()+({ 'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp' }[file.mimetype]||''))}),limits:{fileSize:5*1024*1024},fileFilter:(req,file,cb)=>cb(null,['image/png','image/jpeg','image/webp'].includes(file.mimetype))});
app.post('/api/upload',(req,res,next)=>req.user.permissions.permissao==='admin'?next():res.status(403).json({message:'Sem permissão'}),upload.single('file'),(req,res)=>req.file?res.json({file_url:'/uploads/'+req.file.filename}):res.status(400).json({message:'Envie PNG, JPEG ou WebP'}));
app.use('/uploads',express.static(path.join(root,'private-data/uploads')));
app.use('/api',(req,res)=>res.status(404).json({message:'Recurso não configurado no ambiente local'}));
app.use((error,req,res,next)=>{console.error(error.message);res.status(error.status||400).json({message:error.message || 'Erro na operação'});});
if(process.argv.includes('--dev')) {
  const {createServer}=await import('vite');const vite=await createServer({root,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);
} else {
 app.use('/assets',express.static(path.join(root,'dist/assets'),{immutable:true,maxAge:'1y'}));
 app.use(express.static(path.join(root,'dist'),{setHeaders:res=>res.setHeader('Cache-Control','no-cache')}));
 app.get('/{*path}',(req,res)=>{res.set('Cache-Control','no-cache');res.sendFile(path.join(root,'dist/index.html'));});
}
app.listen(6300,process.env.BIND_HOST || '127.0.0.1',()=>console.log('KartVicio disponível em '+origin));
