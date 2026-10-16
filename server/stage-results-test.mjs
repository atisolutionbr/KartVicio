import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
process.loadEnvFile('.env');
const db=new pg.Pool({host:'127.0.0.1',port:55432,database:'kartvicio',user:'kartvicio',password:process.env.POSTGRES_PASSWORD});
const id=crypto.randomUUID(),camp='test-'+id,stage='stage-'+id,pilot='Teste '+id,token=crypto.randomBytes(32).toString('hex');
const owner=process.env.LOCAL_ADMIN_EMAIL||'jonatha.soares@atisolution.com.br';
const hash=crypto.createHash('sha256').update(token).digest('hex');
const call=async(action,data)=>fetch('http://localhost:6300/api/results/stage/'+action,{method:'POST',headers:{'Content-Type':'application/json',Cookie:'kv_session='+token},body:JSON.stringify({etapa_id:stage,...data})});
try{
 await db.query("INSERT INTO kartvicio.sessions VALUES($1,$2,now()+interval '5 minutes')",[hash,owner]);
 for(const [entity,key,data] of [['Campeonato',camp,{id:camp,nome:'Teste descartável'}],['Etapa',stage,{id:stage,campeonato_id:camp,ano:2026,numero_etapa:1,dobrar_pontos:true}],['Piloto',id,{id,nome:pilot}],['TabelaPontosCampeonato','points-'+id,{id:'points-'+id,campeonato_id:camp,posicao:1,pontos:25}]])await db.query('INSERT INTO kartvicio.records VALUES($1,$2,$3)',[entity,key,data]);
 let r=await call('import',{rows:[{piloto_nome:pilot,posicao:1,pontos_melhor_volta:2}]});assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).count,1);
 const result=(await db.query("SELECT data FROM kartvicio.records WHERE entity='ResultadoEtapa' AND data->>'etapa_id'=$1",[stage])).rows[0].data;assert.equal(result.pontos_totais,52);
 r=await call('import',{rows:[{piloto_nome:pilot,posicao:1}]});assert.equal(r.status,400);
 assert.equal((await db.query("SELECT count(*) FROM kartvicio.records WHERE entity='ResultadoEtapa' AND data->>'etapa_id'=$1",[stage])).rows[0].count,'1');
 r=await call('delete',{confirm:'wrong'});assert.equal(r.status,403);
 r=await call('delete',{confirm:stage});assert.equal(r.status,200);
 assert.equal((await db.query("SELECT count(*) FROM kartvicio.records WHERE entity='ResultadoEtapa' AND data->>'etapa_id'=$1",[stage])).rows[0].count,'0');
 assert.equal((await db.query("SELECT count(*) FROM kartvicio.resultados_excluidos WHERE data->>'etapa_id'=$1",[stage])).rows[0].count,'1');
 console.log('OK: imported scores computed on server, duplicates rejected atomically, explicit stage deletion, recovery archive.');
}finally{
 await db.query("DELETE FROM kartvicio.records WHERE id=ANY($1) OR data->>'campeonato_id'=$2 OR data->>'etapa_id'=$3",[[id,camp,stage,'points-'+id],camp,stage]);
 await db.query("DELETE FROM kartvicio.resultados_excluidos WHERE data->>'etapa_id'=$1",[stage]).catch(()=>{});
 await db.query('DELETE FROM kartvicio.sessions WHERE token_hash=$1',[hash]);await db.end();
}
