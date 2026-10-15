import assert from 'node:assert/strict';
import express from 'express';
import {installInvitations,smtpOptions} from './invitations.mjs';
const smtp={SMTP_HOST:'smtp.example.invalid',SMTP_USER:'test',SMTP_PASSWORD:'fake-test-only',SMTP_FROM:'KartVicio <test@example.invalid>'};
assert.equal(smtpOptions({}),null);
assert.equal(smtpOptions(smtp).secure,true);
assert.equal(smtpOptions({...smtp,SMTP_PORT:'587'}).requireTLS,true);
assert.throws(()=>smtpOptions({...smtp,SMTP_PORT:'25'}));
assert.throws(()=>smtpOptions({...smtp,SMTP_FROM:'x\r\nBcc: x@example.invalid'}));
async function scenario(env,send){
 const sent=[],claims=new Set();let active=true;
 const pool={query:async(sql,args=[])=>{
  if(sql.startsWith('SELECT data'))return {rows:args[0]==='member@example.invalid'?[{data:{ativo:active}}]:[]};
  if(sql.startsWith('INSERT INTO')){if(claims.has(args[0]))return {rowCount:0};claims.add(args[0]);return {rowCount:1};}
  return {rows:[],rowCount:1};
 }};
 const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={email:'admin@example.invalid',permissions:{permissao:req.headers['x-test-role']||'admin'}};next();});
 await installInvitations(app,pool,{env,createTransport:()=>({sendMail:async mail=>{sent.push(mail);return send(mail);}})});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const invite=(email,role='admin')=>fetch(base+'/api/users/invite',{method:'POST',headers:{'Content-Type':'application/json','x-test-role':role},body:JSON.stringify({email})});
 return {invite,sent,deactivate:()=>active=false,close:()=>new Promise(resolve=>server.close(resolve))};
}
let s=await scenario({},()=>({accepted:[]}));
try{assert.equal((await s.invite('member@example.invalid')).status,503);assert.equal(s.sent.length,0);}finally{await s.close();}
s=await scenario(smtp,mail=>({accepted:[mail.to]}));
try{
 assert.equal((await s.invite('member@example.invalid','visualizador')).status,403);
 assert.equal((await s.invite('unknown@example.invalid')).status,400);
 assert.equal((await s.invite('member@example.invalid\r\nBcc:x@example.invalid')).status,400);
 assert.equal((await s.invite(' MEMBER@example.invalid ')).status,200);
 assert.equal((await s.invite('member@example.invalid')).status,429);
 assert.equal(s.sent.length,1);assert.equal(s.sent[0].to,'member@example.invalid');assert.match(s.sent[0].text,/\/login/);
 s.deactivate();assert.equal((await s.invite('member@example.invalid')).status,400);
}finally{await s.close();}
s=await scenario(smtp,()=>{throw Error('fake SMTP failure');});
try{assert.equal((await s.invite('member@example.invalid')).status,502);}finally{await s.close();}
console.log('OK: SMTP seguro, restrição administrativa, cadastros ativos, intervalo de envio e falha do provedor; nenhum e-mail real enviado.');
