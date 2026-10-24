import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='https://kartvicio.atisolution.com.br';
const access=fs.readFileSync('private-data/local-access.txt','utf8');
const email=/Email: (.+)/.exec(access)[1].trim(),password=/Senha: (.+)/.exec(access)[1].trim();
const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({email,password})});assert.equal(login.status,200,'administrator login');
const cookie=login.headers.get('set-cookie').split(';')[0];
async function call(path,body){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',cookie,Origin:base},body:JSON.stringify(body)});assert.equal(r.status,200,path+': '+await r.clone().text());return r.json();}
try{
 const me=await(await fetch(base+'/api/auth/me',{headers:{cookie}})).json();assert.equal(me.email,email);assert.equal(me.permissions.permissao,'admin');
 const types=['Piloto','InscricaoPiloto','ResultadoEtapa','Penalidade','Pontuacao','LogAlteracao','Campeonato','Etapa'];
 const records=Object.fromEntries(await Promise.all(types.map(async entity=>[entity,await call('/api/entities/'+entity+'/list',{legacy:true})])));
 const names=new Set(records.Piloto.map(p=>p.nome.trim().toLowerCase())),camps=new Set(records.Campeonato.map(c=>c.id)),stages=new Map(records.Etapa.map(e=>[e.id,e]));
 const issues={missingPilot:0,missingChampionship:0,missingStage:0,stageChampionshipMismatch:0};
 for(const type of ['InscricaoPiloto','ResultadoEtapa','Penalidade','Pontuacao'])for(const row of records[type]){
  if(row.piloto_nome&&!names.has(row.piloto_nome.trim().toLowerCase()))issues.missingPilot++;
  if(row.campeonato_id&&!camps.has(row.campeonato_id))issues.missingChampionship++;
  if(row.etapa_id&&!stages.has(row.etapa_id))issues.missingStage++;
  else if(row.etapa_id&&row.campeonato_id&&stages.get(row.etapa_id).campeonato_id!==row.campeonato_id)issues.stageChampionshipMismatch++;
 }
 const pilot=records.Piloto.find(p=>p.ativo===false)||records.Piloto[0];
 if(pilot){const preview=await call('/api/pilots/'+encodeURIComponent(pilot.id)+'/preview-delete',{});assert.equal(preview.pilot.id,pilot.id);assert.equal(typeof preview.version,'string');assert(preview.total>=1);}
 assert.equal((await fetch(base+'/api/pilots/invalid/preview-delete',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'{}'})).status,401);
 console.log('PRODUCTION_OK: HTTPS, administrator login/role, authenticated deletion preview, anonymous denial; no pilot or result modified.');
 console.log('Read-only relationship audit:',JSON.stringify(issues));
 console.log('Record counts:',JSON.stringify(Object.fromEntries(types.map(t=>[t,records[t].length]))));
 assert.deepEqual(issues,{missingPilot:0,missingChampionship:0,missingStage:0,stageChampionshipMismatch:0});
}finally{await fetch(base+'/api/auth/logout',{method:'POST',headers:{cookie,Origin:base}});}
