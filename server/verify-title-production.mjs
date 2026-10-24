import fs from 'node:fs';
import assert from 'node:assert/strict';
import {prepareTitleModel,simulateTitle,planTitlePositions} from '../src/utils/titleModel.mjs';
const source=fs.readFileSync('src/utils/rankingCalc.js','utf8').replace(/import .*?;\r?\n/,'');
const {recalcularResultados}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const base='https://kartvicio.atisolution.com.br',access=fs.readFileSync('private-data/local-access.txt','utf8');
const email=/Email: (.+)/.exec(access)[1].trim(),password=/Senha: (.+)/.exec(access)[1].trim();
assert.equal((await fetch(base+'/api/auth/me')).status,401);
const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({email,password})});assert.equal(login.status,200);
const cookie=login.headers.get('set-cookie').split(';')[0];
const read=async(entity,query)=>{const r=await fetch(base+'/api/entities/'+entity+'/filter',{method:'POST',headers:{'Content-Type':'application/json',cookie,Origin:base},body:JSON.stringify({query,legacy:true})});assert.equal(r.status,200);return r.json();};
try{
 const camps=await read('Campeonato',{});let count=0;
 for(const championship of camps){const stagesAll=await read('Etapa',{campeonato_id:championship.id});const year=Math.max(...stagesAll.map(e=>e.ano));const stages=stagesAll.filter(e=>e.ano===year);if(!stages.length)continue;
 const query={campeonato_id:championship.id};const [results,registrations,global,custom,penalties]=await Promise.all([read('ResultadoEtapa',query),read('InscricaoPiloto',query),read('TabelaPontos',{}),read('TabelaPontosCampeonato',query),read('Penalidade',query)]);
 const table=custom.length?custom:global,map=Object.fromEntries(table.map(r=>[r.posicao,r]));const penal={};for(const p of penalties){const k=p.piloto_nome+'||'+p.etapa_id;penal[k]=(penal[k]||0)+(Number(p.pontos_penalidade)||0);}
 const model=prepareTitleModel({championship,stages,results:recalcularResultados(results,stages,penal,map),registrations,table,bonus:championship.pontos_melhor_volta||0,useDiscards:Boolean(championship.descarte_ativo)});const t=performance.now(),r=simulateTitle(model);assert(Math.abs(r.pilots.reduce((s,p)=>s+p.probability,0)-100)<1e-6);const leader=r.pilots[0];const plan=planTitlePositions(model,leader.index,{position:1});assert.equal(plan.length,model.pending.length);assert(leader.bestObservedRank>=1&&leader.worstObservedRank<=model.pilots.length);count++;
 console.log(JSON.stringify({championship:championship.nome,year,pilots:model.pilots.length,completed:model.completed,pending:model.pending.length,elapsedMs:Math.round(performance.now()-t),probabilitySum:100}));
 }
 assert(count>0);assert.equal((await fetch(base+'/Relatorios')).status,200);console.log('OK: HTTPS, authentication, current live data, calculation and probability totals; no official records changed.');
}finally{await fetch(base+'/api/auth/logout',{method:'POST',headers:{cookie,Origin:base}});}
