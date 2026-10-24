// Pure, deterministic model shared by the worker and regression tests.
const sum=a=>a.reduce((s,x)=>s+x.points,0);
export function totalPoints(history,totalStages,drops=0){
 const allowed=Math.max(0,drops-Math.max(0,totalStages-history.length));
 const candidates=history.filter(x=>!x.penalty).map(x=>x.points).sort((a,b)=>a-b);
 return sum(history)-candidates.slice(0,allowed).reduce((s,x)=>s+x,0);
}
export function bounds(history,totalStages,futureMax,drops){
 // Zero-point participation and absence consume discards differently.
 const lower=Math.min(...Array.from({length:futureMax.length+1},(_,k)=>totalPoints([...history,...Array.from({length:k},()=>({points:0,penalty:false}))],totalStages,drops)));
 return {lower,upper:totalPoints([...history,...futureMax.map(points=>({points,penalty:false}))],totalStages,drops)};
}
function randomGenerator(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function prepareTitleModel({championship,stages,results,registrations,table,bonus=0,extra=0,useDiscards=true,category='todas'}){
 const relevant=stages.filter(e=>category==='todas'||!e.categoria||e.categoria.trim()===category.trim()).sort((a,b)=>a.numero_etapa-b.numero_etapa||a.id.localeCompare(b.id));
 const knownIds=new Set(relevant.map(e=>e.id));
 const valid=results.filter(r=>knownIds.has(r.etapa_id)&&!r.descartado&&(category==='todas'||(r.categoria||'').trim()===category.trim()));
 const hasResults=new Set(results.filter(r=>knownIds.has(r.etapa_id)).map(r=>r.etapa_id));
 const completed=relevant.filter(e=>e.finalizada||hasResults.has(e.id));
 const pending=relevant.filter(e=>!e.finalizada&&!hasResults.has(e.id)).map(e=>({...e,label:`${e.numero_etapa}ª etapa`}));
 const planned=category==='todas'?Number(championship.numero_etapas_planejadas)||relevant.length:relevant.length;
 const missing=Math.max(0,planned-relevant.length);
 const lastNumber=Math.max(0,...relevant.map(e=>Number(e.numero_etapa)||0));
 for(let i=0;i<missing;i++)pending.push({id:`planned-${i}`,numero_etapa:lastNumber+i+1,label:`Etapa prevista ${lastNumber+i+1} (sem cadastro)`,estimated:true});
 if(pending.length>60)throw Error('Há mais de 60 etapas pendentes. Revise o planejamento antes de simular.');
 const names=[...new Set([...valid.map(r=>r.piloto_nome),...registrations.filter(r=>r.ativo!==false&&(category==='todas'||r.categoria===category||(r.categorias||[]).includes(category))).map(r=>r.piloto_nome)])].filter(Boolean).sort();
 if(!names.length)throw Error('Nenhum piloto possui resultado ou inscrição nesta seleção.');
 if(names.length>200)throw Error('Selecione uma categoria com até 200 pilotos.');
 if(!table.length)throw Error('Cadastre a tabela de pontos para calcular o relatório.');
 const points=Object.fromEntries(table.map(t=>[t.posicao,Number(t.pontos)||0]));
 if(Object.values(points).some(p=>p<0))throw Error('A projeção exige pontuação de chegada não negativa.');
 const maximum=Math.max(0,...Object.values(points));
 const maxFuture=pending.map(e=>maximum*(e.dobrar_pontos?2:1)+bonus+extra);
 const drops=useDiscards?Math.max(0,Number(championship.descarte_quantidade??1)):0;
 const pilots=names.map(name=>{
  // Use one consolidated result per driver/stage; never silently add duplicates.
  const grouped=new Map();for(const r of valid.filter(r=>r.piloto_nome===name)){const old=grouped.get(r.etapa_id);if(!old||r.pontos_totais>old.pontos_totais)grouped.set(r.etapa_id,r);}
  const history=[...grouped.values()].map(r=>({points:Number(r.pontos_totais)||0,penalty:Boolean(Number(r.pontos_penalidade)),position:Number(r.posicao)||0,status:r.status}));
  const regular=history.filter(r=>r.position>0&&!['NC','DQ'].includes(r.status));
  // Shrink observed strength and attendance towards a neutral prior.
  const strength=(regular.reduce((s,r)=>s+Math.max(0,1-(r.position-1)/Math.max(names.length,1)),0)+2)/(regular.length+4);
  const attendance=(regular.length+3)/(completed.length+4);
  return {name,history,strength:Math.exp(4*strength),attendance:Math.min(.98,Math.max(.15,attendance)),current:totalPoints(history,completed.length,drops),...bounds(history,completed.length+pending.length,maxFuture,drops)};
 });
 return {pilots,pending,completed:completed.length,points,bonus,extra,drops,maxFuture,provisional:completed.filter(e=>!e.finalizada).length,missing,duplicateCount:valid.length-pilots.reduce((s,p)=>s+p.history.length,0)};
}
export function simulateTitle(model,{iterations=6000,seed=174241,onProgress}={}){
 const {pilots,pending,points,bonus,extra,drops,maxFuture}=model,n=pilots.length;
 const rnd=randomGenerator(seed),weights=Array(n).fill(0),examples=Array.from({length:n},()=>[]),earliest=Array(n).fill(null),firstPaths=Array(n).fill(null);
 const total=model.completed+pending.length;
 const proof=pilots.map((p,i)=>({eliminated:pilots.some((q,j)=>i!==j&&p.upper<q.lower-1e-8),clinched:pilots.every((q,j)=>i===j||p.lower>q.upper+1e-8)}));
 const bestRank=Array(n).fill(n),worstRank=Array(n).fill(1);
 const runs=pending.length?iterations:1;
 for(let run=0;run<runs;run++){
  const history=pilots.map(p=>[...p.history]),path=[],earnedPath=[];
  for(let stage=0;stage<pending.length;stage++){
   const order=pilots.map((p,i)=>({i,key:-Math.log(Math.max(rnd(),1e-12))/p.strength,active:rnd()<p.attendance})).filter(p=>p.active).sort((a,b)=>a.key-b.key);
   const finish=Array(n).fill(null),earned=Array(n).fill(0),fastest=order.length?order[Math.floor(rnd()*order.length)].i:-1;
   order.forEach(({i},rank)=>{finish[i]=rank+1;history[i].push({points:(points[rank+1]||0)*(pending[stage].dobrar_pontos?2:1)+(i===fastest?bonus:0)+(extra?(rnd()<.5?extra:0):0),penalty:false});});
   for(let i=0;i<n;i++)if(finish[i])earned[i]=history[i].at(-1).points;
   path.push(finish);earnedPath.push(earned);
   // Find a concrete prefix that guarantees a strictly higher final score.
   for(let i=0;run<200&&i<n;i++)if(earliest[i]===null||stage<earliest[i]){
    const own=bounds(history[i],total,maxFuture.slice(stage+1),drops).lower;
    if(history.every((h,j)=>i===j||own>bounds(h,total,maxFuture.slice(stage+1),drops).upper+1e-8)){
     earliest[i]=stage;firstPaths[i]={through:stage,finishes:path.map(a=>[...a]),earned:earnedPath.map(a=>[...a])};
    }
   }
  }
  const scores=history.map(h=>totalPoints(h,total,drops)),best=Math.max(...scores),winners=scores.map((s,i)=>Math.abs(s-best)<1e-8?i:-1).filter(i=>i>=0);
  for(let i=0;i<n;i++){
   const above=scores.filter(s=>s>scores[i]+1e-8).length;
   const equal=scores.filter(s=>Math.abs(s-scores[i])<1e-8).length;
   bestRank[i]=Math.min(bestRank[i],above+1);worstRank[i]=Math.max(worstRank[i],above+equal);
  }
  winners.forEach(i=>{weights[i]+=1/winners.length;if(examples[i].length<3)examples[i].push({finishes:path.map(a=>[...a]),earned:earnedPath.map(a=>[...a]),scores,tied:winners.length>1});});
  if(onProgress && run%250===0)onProgress(run/runs);
 }
 return {iterations:runs,seed,pilots:pilots.map((p,i)=>({...p,index:i,bestObservedRank:bestRank[i],worstObservedRank:worstRank[i],probability:100*weights[i]/runs,...proof[i],earliest:earliest[i],earlyPath:firstPaths[i],examples:examples[i]})).sort((a,b)=>b.current-a.current||a.name.localeCompare(b.name))};
}
// Conservative what-if: this driver repeats an exact position in every future
// race up to each milestone. Rivals get their largest compatible race score.
export function planTitlePositions(model,pilotIndex,{position=1,fastest=false}={}){
 const {pilots,pending,points,bonus,extra,drops,maxFuture,completed}=model;
 if(!Number.isInteger(pilotIndex)||pilotIndex<0||pilotIndex>=pilots.length)throw Error('Piloto inválido');
 if(!Number.isInteger(position)||position<1||position>pilots.length)throw Error('Posição inválida');
 const total=completed+pending.length;
 const evaluate=(through,pos)=>{
  const own=[...pilots[pilotIndex].history];
  const opponents=pilots.map(p=>[...p.history]);
  for(let stage=0;stage<=through;stage++){
   const multiplier=pending[stage].dobrar_pontos?2:1;
   own.push({points:(points[pos]||0)*multiplier+(fastest?bonus:0),penalty:false});
   const rivalBase=Math.max(0,...Array.from({length:pilots.length},(_,i)=>i+1).filter(p=>p!==pos).map(p=>points[p]||0));
   for(let i=0;i<pilots.length;i++)if(i!==pilotIndex)opponents[i].push({points:rivalBase*multiplier+(fastest?0:bonus)+extra,penalty:false});
  }
  const floor=bounds(own,total,maxFuture.slice(through+1),drops).lower;
  const rivals=opponents.map((h,i)=>i===pilotIndex?-Infinity:bounds(h,total,maxFuture.slice(through+1),drops).upper);
  const rivalCeiling=pilots.length===1?0:Math.max(...rivals);
  return {floor,rivalCeiling,guaranteed:pilots.length===1||floor>rivalCeiling+1e-8};
 };
 return pending.map((stage,through)=>{
  let sufficient=null;
  for(let pos=pilots.length;pos>=1;pos--)if(evaluate(through,pos).guaranteed){sufficient=pos;break;}
  return {id:stage.id,label:stage.label,through,position,...evaluate(through,position),sufficient};
 });
}
