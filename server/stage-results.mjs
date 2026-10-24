import {lockRelations} from './relations.mjs';
import crypto from 'node:crypto';
import {timeMilliseconds} from '../src/utils/resultText.mjs';
export function installStageResults(app,pool,{assertWrite,broadcast}) {
 app.post('/api/results/stage/:action',async(req,res)=>{
  const {action}=req.params,{etapa_id,rows,confirm}=req.body;
  if(!['import','delete'].includes(action))return res.status(404).json({message:'Operação inválida'});
  if(action==='delete' && (req.user.permissions.permissao!=='admin'||confirm!==etapa_id))return res.status(403).json({message:'Exclusão requer administrador e confirmação da etapa.'});
  const db=await pool.connect();
  try {
   await db.query('BEGIN');await lockRelations(db);
   for(const entity of ['Etapa','Penalidade','ResultadoEtapa'])await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[entity]);
   const etapa=(await db.query("SELECT data FROM kartvicio.records WHERE entity='Etapa' AND id=$1",[etapa_id])).rows[0]?.data;
   if(!etapa)throw Error('Etapa não encontrada');
   assertWrite(req,'ResultadoEtapa',{campeonato_id:etapa.campeonato_id});
   const existing=(await db.query("SELECT data FROM kartvicio.records WHERE entity='ResultadoEtapa' AND data->>'etapa_id'=$1",[etapa_id])).rows.map(r=>r.data);
   let count=0;
   if(action==='delete'){
    await db.query('CREATE TABLE IF NOT EXISTS kartvicio.resultados_excluidos (batch_id text,entity text,id text,data jsonb,deleted_at timestamptz DEFAULT now(),deleted_by text)');
    const batch=crypto.randomUUID();
    await db.query("INSERT INTO kartvicio.resultados_excluidos(batch_id,entity,id,data,deleted_by) SELECT $1,entity,id,data,$2 FROM kartvicio.records WHERE entity IN ('ResultadoEtapa','Penalidade') AND data->>'etapa_id'=$3",[batch,req.user.email,etapa_id]);
    await db.query("DELETE FROM kartvicio.records WHERE entity IN ('ResultadoEtapa','Penalidade') AND data->>'etapa_id'=$1",[etapa_id]);
    await db.query("UPDATE kartvicio.records SET data=data || '{\"finalizada\":false,\"publicado\":false}'::jsonb WHERE entity='Etapa' AND id=$1",[etapa_id]);
    count=existing.length;
   }else{
    if(etapa.finalizada)throw Error('Reabra a etapa antes de importar.');
    if(!Array.isArray(rows)||!rows.length||rows.length>200)throw Error('Importe de 1 a 200 resultados por vez.');
    const names=new Set(existing.map(r=>r.piloto_nome.trim().toLowerCase()));
    const positions=new Set(existing.filter(r=>!['NC','DQ'].includes(r.status)).map(r=>r.posicao));
    const table=(await db.query("SELECT entity,data FROM kartvicio.records WHERE entity='TabelaPontos' OR (entity='TabelaPontosCampeonato' AND data->>'campeonato_id'=$1)",[etapa.campeonato_id])).rows;
    const custom=table.filter(r=>r.entity==='TabelaPontosCampeonato');
    const points=new Map((custom.length?custom:table.filter(r=>r.entity==='TabelaPontos')).map(r=>[r.data.posicao,Number(r.data.pontos)||0]));
    const penalties=(await db.query("SELECT data FROM kartvicio.records WHERE entity='Penalidade' AND data->>'etapa_id'=$1",[etapa_id])).rows.map(r=>r.data);
    const pilotRows=(await db.query("SELECT id,data->>'nome' AS nome FROM kartvicio.records WHERE entity='Piloto' AND data->>'ativo'='true'")).rows;
    const pilots=new Map(pilotRows.filter(p=>pilotRows.filter(r=>r.nome===p.nome).length===1).map(r=>[r.nome,r.id]));
    const linked=new Set((await db.query("SELECT data->>'piloto_nome' AS nome FROM kartvicio.records WHERE entity='InscricaoPiloto' AND data->>'campeonato_id'=$1 AND COALESCE((data->>'ativo')::boolean,true)",[etapa.campeonato_id])).rows.map(r=>r.nome));
    for(const row of rows){
     const name=String(row.piloto_nome||'').trim(),status=row.status||'regular',pos=Number(row.posicao),bonus=Number(row.pontos_melhor_volta||0);
     if(!pilots.has(name)||!linked.has(name))throw Error('Selecione um piloto ativo e vinculado ao campeonato: '+name);
     if(!['regular','NC','DQ'].includes(status)||!Number.isInteger(pos)||(status==='regular'?pos<1||pos>200:pos!==0)||!Number.isFinite(bonus)||bonus<0||bonus>1000)throw Error('Posição, status ou bônus inválido.');
     if(names.has(name.toLowerCase())||(status==='regular'&&positions.has(pos)))throw Error('Piloto ou posição duplicado na etapa. Revise a importação.');
     names.add(name.toLowerCase());if(status==='regular')positions.add(pos);
     const regular=status==='regular',base=regular?(points.get(pos)||0)*(etapa.dobrar_pontos?2:1):0;
     const penalty=regular?penalties.filter(p=>p.piloto_nome===name).reduce((s,p)=>s+(Number(p.pontos_penalidade)||0),0):0;
     const id=crypto.randomUUID(),now=new Date().toISOString();
     const data={id,etapa_id,campeonato_id:etapa.campeonato_id,ano:etapa.ano,piloto_nome:name,categoria:etapa.categoria||'',status,posicao:pos,pontos:base,pontos_melhor_volta:regular?bonus:0,pontos_penalidade:penalty,pontos_tipo_extra:0,tipos_ponto_aplicados:[],pontos_totais:base+(regular?bonus:0)-penalty,descartado:false,created_date:now,updated_date:now,created_by:req.user.email};
     data.piloto_id=pilots.get(name);
     if(row.numero_kart!==undefined){if(!/^\d{1,3}$/.test(String(row.numero_kart)))throw Error('Número do kart inválido.');data.numero_kart=String(row.numero_kart);}
     for(const field of ['melhor_volta_tempo','tempo_total'])if(row[field]){if(timeMilliseconds(row[field])===null)throw Error('Tempo inválido: '+field);data[field]=String(row[field]).slice(0,20);}
     for(const field of ['voltas','volta_melhor'])if(row[field]!==undefined){if(!Number.isInteger(row[field])||row[field]<0||row[field]>10000)throw Error('Quantidade de voltas inválida.');data[field]=row[field];}
     await db.query("INSERT INTO kartvicio.records VALUES('ResultadoEtapa',$1,$2)",[id,data]);count++;
    }
   }
   const id=crypto.randomUUID();
   await db.query("INSERT INTO kartvicio.records VALUES('LogAlteracao',$1,$2)",[id,{id,operacao:action==='delete'?'excluir_etapa':'importar_resultados',campeonato_id:etapa.campeonato_id,etapa_id,usuario_email:req.user.email,usuario_nome:req.user.full_name,descricao:`${action}: ${count} resultados`,created_date:new Date().toISOString()}]);
   await db.query('COMMIT');broadcast(etapa);res.json({count});
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
 });
}
