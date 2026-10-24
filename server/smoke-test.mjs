import fs from 'node:fs';
import assert from 'node:assert/strict';
import {expectedAfterMigration} from './migration-expected.mjs';
import { matches, aggregateRows, pageRows } from './query.mjs';
const access=fs.readFileSync('private-data/local-access.txt','utf8');
const email=/Email: (.+)/.exec(access)[1], password=/Senha: (.+)/.exec(access)[1];
const base='http://localhost:6300';
const anonymous=await fetch(base+'/api/auth/me');assert.equal(anonymous.status,401);
const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
async function call(entity,action,body) {
 const r=await fetch(base+'/api/entities/'+entity+'/'+action,{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
 const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;
}
let total=0;
for(const filename of fs.readdirSync('private-data').filter(f=>f.endsWith('.json')&&fs.existsSync('base44/entities/'+f.slice(0,-5)+'.jsonc'))) {
 const entity=filename.slice(0,-5),source=expectedAfterMigration(entity,JSON.parse(fs.readFileSync('private-data/'+filename)));
 const rows=await call(entity,'list',{legacy:true});
 assert.deepEqual(rows.sort((a,b)=>a.id.localeCompare(b.id)),source.sort((a,b)=>a.id.localeCompare(b.id)),entity+' diverge da origem');total+=rows.length;
}
assert(matches({categorias:['A','B']},{categorias:'A'}));
assert(matches({nome:'André'},{nome:{$regex:'andré',$options:'i'}}));
assert(matches({status:'regular'},{status:{$nin:['excluido']}}));
assert.deepEqual(aggregateRows([{p:'A',v:3},{p:'A',v:4}],{groupBy:'p',sum:'v'}).rows,[{p:'A',count:2,sum_v:7}]);
assert.deepEqual(pageRows([{id:'1'},{id:'2'}],{limit:1}),{items:[{id:'1'}],has_more:true,next_cursor:'1'});
const item=await call('Piloto','create',{data:{nome:'TESTE LOCAL DESCARTAVEL '+Date.now(),peso:80,ativo:true}});
try {
 const edited=await call('Piloto','update',{id:item.id,data:{ativo:false}});assert.equal(edited.ativo,false);
 const count=await call('Piloto','count',{query:{id:item.id}});assert.equal(count,1);
} finally {
 const endpoint=base+'/api/pilots/'+item.id+'/';
 const options={method:'POST',headers:{'Content-Type':'application/json',cookie}};
 const preview=await(await fetch(endpoint+'preview-delete',{...options,body:'{}'})).json();
 const deleted=await fetch(endpoint+'delete-complete',{...options,body:JSON.stringify({confirmName:preview.pilot.nome,version:preview.version})});
 assert.equal(deleted.status,200);
}
assert.equal(await call('Piloto','count',{}),48);
console.log(`OK: ${total} registros idênticos à exportação; autenticação, filtros, paginação, agregação e CRUD conferidos.`);
