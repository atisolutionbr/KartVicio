import fs from 'node:fs';
import assert from 'node:assert/strict';
const base='https://kartvicio.atisolution.com.br';
const access=fs.readFileSync('private-data/local-access.txt','utf8');
const email=/Email: (.+)/.exec(access)[1].trim(), password=/Senha: (.+)/.exec(access)[1].trim();
assert.equal((await fetch(base+'/api/auth/me')).status,401);
const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({email,password})});
assert.equal(login.status,200);const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/Secure/i);assert.match(setCookie,/HttpOnly/i);
const cookie=setCookie.split(';')[0];
try {
 let total=0;
 for(const file of fs.readdirSync('private-data').filter(f=>f.endsWith('.json')&&fs.existsSync('base44/entities/'+f.slice(0,-5)+'.jsonc'))){
  const expected=JSON.parse(fs.readFileSync('private-data/'+file));
  const r=await fetch(base+'/api/entities/'+file.slice(0,-5)+'/list',{method:'POST',headers:{'Content-Type':'application/json',cookie,Origin:base},body:JSON.stringify({legacy:true})});assert.equal(r.status,200);
  const actual=await r.json();const sort=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(sort(actual),sort(expected));total+=actual.length;
 }
 const manifest=await (await fetch(base+'/manifest.json')).json();assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons)assert.equal((await fetch(base+icon.src)).status,200);
 assert.equal((await fetch(base+'/sw.js')).status,200);
 assert.equal((await fetch(base+'/media/kartvicio-logo.png')).status,200);
 console.log(`HTTPS, login administrador, cookie seguro, ${total} registros, manifesto, ícones e service worker: OK.`);
 console.log('Provedores OAuth:',await(await fetch(base+'/api/auth/providers')).json());
} finally {await fetch(base+'/api/auth/logout',{method:'POST',headers:{cookie,Origin:base}});}
