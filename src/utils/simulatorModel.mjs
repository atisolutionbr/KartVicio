import {calcularDescartesPiloto} from './descarte.js';

export function projectSimulation({results=[],recordedStages=results.map(r=>r.etapa_id),stages=[],pilots=[],scenario={},table={},penalties={},compute,discard=false,discardCount=1}) {
 const names=[...new Set(pilots.map(p=>p.nome||p))];
 const stageMap=new Map(stages.map(e=>[e.id,e]));
 const occupiedStages=new Set(recordedStages);
 const available=stages.filter(e=>!e.finalizada&&!occupiedStages.has(e.id));
 const allowed=new Set(available.map(e=>e.id));
 const simulated=[],errors=[];
 for(const [stageId,entries] of Object.entries(scenario)) {
  if(!allowed.has(stageId))continue;
  const positions=new Set();
  for(const [name,value] of Object.entries(entries)) {
   if(value===''||value==null||!names.includes(name))continue;
   const position=Number(value);
   if(!Number.isInteger(position)||position<0||position>200){errors.push(`${name}: informe uma posição de 1 a 200 ou NC.`);continue;}
   if(position>0&&positions.has(position)){errors.push(`${stageMap.get(stageId).numero_etapa}ª etapa: posição ${position} repetida.`);continue;}
   if(position>0)positions.add(position);
   const row={piloto_nome:name,etapa_id:stageId,posicao:position,status:position===0?'NC':'regular',pontos_melhor_volta:0,tipos_ponto_aplicados:[],_simulado:true};
   simulated.push({...row,...compute(row,stageMap.get(stageId),table,penalties)});
  }
 }
 const rank=rows=>{
  const valid=rows.filter(r=>!r.descartado&&names.includes(r.piloto_nome));
  const occurred=new Set(valid.map(r=>r.etapa_id));
  const ranking=names.map(name=>{
   const own=valid.filter(r=>r.piloto_nome===name),byStage=new Map();
   for(const r of own){const group=byStage.get(r.etapa_id)||{etapa_id:r.etapa_id,pontos_totais:0,pontos_penalidade:0};group.pontos_totais+=Number(r.pontos_totais)||0;group.pontos_penalidade+=Number(r.pontos_penalidade)||0;byStage.set(r.etapa_id,group);}
   const removed=discard?calcularDescartesPiloto([...byStage.values()],occurred.size,0,Math.max(0,Number(discardCount)||0)):{etapasDescartadas:[],descartesAutomaticos:0};
   const kept=own.filter(r=>!removed.etapasDescartadas.includes(r.etapa_id));
   const sum=(list,key)=>list.reduce((total,r)=>total+(Number(r[key])||0),0);
   return {piloto:name,pontos_totais:sum(kept,'pontos_totais'),brutos:sum(own,'pontos_totais'),pontos_descartados:sum(own.filter(r=>removed.etapasDescartadas.includes(r.etapa_id)),'pontos_totais'),pontos_penalidades:sum(kept,'pontos_penalidade'),etapas_disputadas:byStage.size,etapas_descartadas:removed.etapasDescartadas,descartes_automaticos:removed.descartesAutomaticos,simulados:own.filter(r=>r._simulado).length};
  }).sort((a,b)=>b.pontos_totais-a.pontos_totais||a.piloto.localeCompare(b.piloto,'pt-BR'));
  return ranking.map((r,index)=>({...r,posicao:index+1,empatado:ranking.some(other=>other!==r&&other.pontos_totais===r.pontos_totais)}));
 };
 const baseline=rank(results),ranking=rank([...results,...simulated]);
 const before=new Map(baseline.map(r=>[r.piloto,r]));
 return {available,simulated,errors,baseline,ranking:ranking.map(r=>({...r,atual:before.get(r.piloto).pontos_totais,posicao_atual:before.get(r.piloto).posicao,variacao:before.get(r.piloto).posicao-r.posicao,delta:r.pontos_totais-before.get(r.piloto).pontos_totais}))};
}
