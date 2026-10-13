import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
process.loadEnvFile('.env');
const db=new pg.Pool({host:'127.0.0.1',port:55432,database:'kartvicio',user:'kartvicio',password:process.env.POSTGRES_PASSWORD});
const email=`test-${crypto.randomUUID()}@example.invalid`,id=crypto.randomUUID(),token=crypto.randomBytes(32).toString('hex');
const base='http://localhost:6300';const headers={'Content-Type':'application/json',Cookie:'kv_session='+token};
try {
 await db.query('INSERT INTO kartvicio.accounts VALUES($1,$2,$3)',[email,'!test-only','Teste descartável']);
 await db.query("INSERT INTO kartvicio.sessions VALUES($1,$2,now()+interval '5 minutes')",[crypto.createHash('sha256').update(token).digest('hex'),email]);
 await db.query('INSERT INTO kartvicio.records VALUES($1,$2,$3)',['Usuario',id,{id,email,nome:'Teste',permissao:'visualizador',ativo:true,campeonatos_ids:[]}]);
 let response=await fetch(base+'/api/auth/me',{headers});assert.equal(response.status,200);assert.equal((await response.json()).permissions.permissao,'visualizador');
 response=await fetch(base+'/api/entities/Campeonato/list',{method:'POST',headers,body:JSON.stringify({legacy:true})});assert.deepEqual(await response.json(),[]);
 response=await fetch(base+'/api/entities/Usuario/create',{method:'POST',headers,body:JSON.stringify({data:{nome:'Teste',email,permissao:'admin'}})});assert.equal(response.status,403);
 await db.query("UPDATE kartvicio.records SET data=jsonb_set(data,'{ativo}','false') WHERE entity='Usuario' AND id=$1",[id]);
 response=await fetch(base+'/api/auth/me',{headers});assert.equal(response.status,403);
 response=await fetch(base+'/api/auth/google/callback?state=invalid&code=invalid',{redirect:'manual'});assert.equal(response.status,302);assert.equal(response.headers.get('location'),'/login?auth_error=invalid');
 response=await fetch(base+'/api/auth/providers');assert.equal(response.status,200);const providers=await response.json();assert.equal(typeof providers.google,'boolean');assert.equal(typeof providers.microsoft,'boolean');
 response=await fetch(base+'/');assert((await response.text()).includes('href="/media/kartvicio-logo.png"'));
 response=await fetch(base+'/media/kartvicio-logo.png');assert.equal(response.status,200);assert(response.headers.get('content-type').startsWith('image/'));
 console.log('OK: permissões, bloqueio de inativos, callback inválido, configuração dos provedores e favicon.');
}finally{
 await db.query('DELETE FROM kartvicio.sessions WHERE email=$1',[email]);await db.query('DELETE FROM kartvicio.accounts WHERE email=$1',[email]);await db.query("DELETE FROM kartvicio.records WHERE entity='Usuario' AND id=$1",[id]);await db.end();
}
