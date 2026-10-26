import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {base44} from '@/api/base44Client';
import {Button} from '@/components/ui/button';
import {Calculator,Download,RotateCcw,Search,RefreshCw} from 'lucide-react';
import {usePdfExport} from '@/hooks/usePdfExport';
import {useEntitySubscriptions} from '@/hooks/useEntitySubscriptions';
import {filtrarCampeonatosAcessiveis,usuarioSemAcesso} from '@/utils/campeonatoAccess';
import SemAcessoCard from '@/components/SemAcessoCard';
import ComparadorPilotos from '@/components/simulador/ComparadorPilotos';
import {carregarDadosRanking,recalcularResultados,computarPontos} from '@/utils/rankingCalc';
import carregarResultadosRanking from '@/components/ranking/carregarResultadosRanking';
import {carregarNomesVinculados} from '@/components/pilotos/vinculosPilotos';
import {projectSimulation} from '@/utils/simulatorModel.mjs';

const selectClass='w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:ring-2 focus:ring-yellow-400';
export default function SimuladorPage({userPermissions}){
 const [championships,setChampionships]=useState([]),[championshipId,setChampionshipId]=useState(''),[year,setYear]=useState(''),[category,setCategory]=useState('todas');
 const [data,setData]=useState({stages:[],results:[],pilots:[],table:{},penalties:{},recordedStages:[]}),[years,setYears]=useState([]);
 const [drafts,setDrafts]=useState({});
 const [scenario,setScenario]=useState({}),[discard,setDiscard]=useState(false),[stageId,setStageId]=useState(''),[search,setSearch]=useState('');
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[inputError,setInputError]=useState('');
 const version=useRef(0),[revision,setRevision]=useState(0);
 const championship=championships.find(c=>c.id===championshipId);
 const discardCount=championship?.descarte_quantidade??1;
 const {exportToPdf,exporting}=usePdfExport();
 useEffect(()=>{let active=true;base44.entities.Campeonato.list('-ano').then(list=>{if(!active)return;const allowed=filtrarCampeonatosAcessiveis(list,userPermissions);setChampionships(allowed);setChampionshipId(current=>allowed.some(c=>c.id===current)?current:(allowed[0]?.id||''));if(!allowed.length)setLoading(false);}).catch(e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;};},[userPermissions,revision]);
 useEffect(()=>{let active=true;if(!championshipId)return;setLoading(true);base44.entities.Etapa.filter({campeonato_id:championshipId},{distinct:'ano',limit:1000}).then(page=>{if(!active)return;const values=page.items.map(Number).filter(Boolean).sort((a,b)=>b-a);setYears(values);setYear(current=>values.includes(Number(current))?current:String(values.includes(championship?.ano)?championship.ano:values[0]||championship?.ano||new Date().getFullYear()));}).catch(e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;};},[championshipId,revision]);
 const load=useCallback(async()=>{
  if(!championshipId||!year)return;const request=++version.current;setLoading(true);setError('');
  try{
   const [stages,maps,names,recorded]=await Promise.all([base44.entities.Etapa.filter({campeonato_id:championshipId,ano:Number(year)},'numero_etapa'),carregarDadosRanking(championshipId),carregarNomesVinculados(championshipId,category),base44.entities.ResultadoEtapa.filter({campeonato_id:championshipId,ano:Number(year)},{distinct:'etapa_id',limit:1000})]);
   if(recorded.has_more)throw Error('Há etapas demais para carregar a projeção completa.');
   // Read every result to keep stages with partial results out of future projections.
   const raw=await carregarResultadosRanking(championshipId,stages);
   if(request!==version.current)return;
   setData({stages,results:recalcularResultados(raw,stages,maps.penalidadesPorChave,maps.tabelaMap),pilots:names.sort((a,b)=>a.localeCompare(b,'pt-BR')),table:maps.tabelaMap,penalties:maps.penalidadesPorChave,recordedStages:recorded.items});
  }catch(e){if(request===version.current)setError(e.message||'Não foi possível carregar a simulação.');}
  finally{if(request===version.current)setLoading(false);}
 },[championshipId,year,category,revision]);
 useEffect(()=>{load();return()=>{version.current++;};},[load]);
 useEntitySubscriptions(()=>setRevision(v=>v+1),['Campeonato','ResultadoEtapa','Penalidade','Etapa','TabelaPontos','TabelaPontosCampeonato','Piloto','InscricaoPiloto']);
 useEffect(()=>{setScenario({});setDrafts({});setStageId('');setInputError('');setSearch('');},[championshipId,year,category]);
 const filtered=useMemo(()=>data.results.filter(r=>data.pilots.includes(r.piloto_nome)&&(category==='todas'||r.categoria?.trim()===category.trim())),[data,category]);
 const model=useMemo(()=>projectSimulation({results:filtered,recordedStages:data.recordedStages,stages:data.stages,pilots:data.pilots,scenario,table:data.table,penalties:data.penalties,compute:computarPontos,discard,discardCount}),[data,filtered,scenario,discard,discardCount]);
 const selectedStage=model.available.find(e=>e.id===stageId)||model.available[0];
 const stageEntries=scenario[selectedStage?.id]||{};
 const simulatedStages=new Set(model.simulated.map(r=>r.etapa_id)).size;
 const setPosition=(name,value)=>{
  if(!selectedStage)return;
  setInputError('');
  setDrafts(previous=>({...previous,[selectedStage.id]:{...previous[selectedStage.id],[name]:value}}));
  const removeInvalid=()=>setScenario(previous=>{const entries={...previous[selectedStage.id]};delete entries[name];return {...previous,[selectedStage.id]:entries};});
  if(value!==''&&(!Number.isInteger(Number(value))||Number(value)<0||Number(value)>200)){removeInvalid();setInputError('Use uma posição inteira de 1 a 200, ou 0 para não completar (NC).');return;}
  const conflict=Object.entries(stageEntries).find(([other,pos])=>other!==name&&value!==''&&Number(value)>0&&Number(pos)===Number(value));
  if(conflict){removeInvalid();setInputError(`A ${value}ª posição já está atribuída a ${conflict[0]}. Limpe essa posição antes de reutilizá-la.`);return;}
  setScenario(previous=>{const entries={...previous[selectedStage.id]};if(value==='')delete entries[name];else entries[name]=Number(value);return {...previous,[selectedStage.id]:entries};});
 };
 const projected=new Map(model.ranking.map(r=>[r.piloto,r]));
 const missingTable=Object.keys(data.table).length===0;
 if(usuarioSemAcesso(userPermissions))return <SemAcessoCard/>;
 return <div className="space-y-5">
  <header className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-yellow-700 font-semibold text-xs uppercase tracking-widest"><Calculator size={16}/> Planeje as próximas etapas</div><h1 className="text-3xl font-extrabold text-slate-900 mt-1">Simulador do campeonato</h1><p className="text-slate-600 mt-1">Informe uma posição e veja os pontos e a nova classificação na hora.</p></div><Button variant="outline" disabled={loading||!!error||!championshipId||exporting} onClick={()=>exportToPdf({elementId:'simulador-export-area',filename:'simulador-campeonato.pdf'})}><Download size={16} className="mr-2"/>{exporting?'Exportando…':'Exportar projeção'}</Button></header>
  <section aria-label="Filtros do simulador" className="grid sm:grid-cols-3 gap-3 rounded-2xl border bg-white p-4 shadow-sm">
   <label className="text-sm font-semibold">Campeonato<select className={selectClass+' mt-1'} value={championshipId} onChange={e=>{setChampionshipId(e.target.value);setYear('');setCategory('todas');}}>{!championships.length&&<option value="">Nenhum campeonato disponível</option>}{championships.map(c=><option value={c.id} key={c.id}>{c.nome}</option>)}</select></label>
   <label className="text-sm font-semibold">Temporada<select className={selectClass+' mt-1'} value={year} onChange={e=>setYear(e.target.value)}>{!years.length&&<option value={year}>{year||'Carregando…'}</option>}{years.map(y=><option value={y} key={y}>{y}</option>)}</select></label>
   <label className="text-sm font-semibold">Categoria<select className={selectClass+' mt-1'} value={category} onChange={e=>setCategory(e.target.value)}><option value="todas">Todas as categorias</option>{(championship?.categorias||[]).map(c=><option value={c.nome} key={c.id||c.nome}>{c.nome}</option>)}</select></label>
  </section>
  {error&&<div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">{error}<Button variant="outline" className="ml-3" onClick={load}><RefreshCw size={14} className="mr-2"/>Tentar novamente</Button></div>}
  {loading?<p role="status" className="p-10 text-center text-slate-600">Carregando classificação e tabela de pontos…</p>:!error&&championshipId&&<>
   <section id="simulador-export-area" className="space-y-4">
    <div className="rounded-2xl bg-slate-900 p-5 text-white flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold text-lg">{championship?.nome} · {year}</h2><p className="text-sm text-slate-300 mt-1">{discard?`Com descarte · ${discardCount} permitido(s)`:'Sem descarte automático'} · {model.simulated.length?`${simulatedStages} etapa(s) simulada(s)`:'Classificação atual'}</p></div><div role="group" aria-label="Regra de descarte da simulação" className="flex rounded-xl bg-slate-800 p-1 gap-1">{[[false,'Sem descarte'],[true,'Com descarte']].map(([value,label])=><button type="button" key={label} aria-pressed={discard===value} onClick={()=>setDiscard(value)} className={'px-4 py-3 rounded-lg font-bold text-sm transition-colors '+(discard===value?'bg-yellow-400 text-slate-950 shadow':'text-white hover:bg-slate-700')}>{label}</button>)}</div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Pilotos',model.ranking.length],['Etapas para simular',model.available.length],['Líder projetado',model.ranking[0]?.piloto||'—'],['Pontos do líder',model.ranking[0]?.pontos_totais??0]].map(([label,value])=><div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500 font-semibold">{label}</p><p className="text-lg font-bold mt-1 text-slate-900">{value}</p></div>)}</div>
    <div className="text-sm text-slate-600 rounded-xl border bg-white p-3">{discard?'Faltas consomem os descartes primeiro; resultados penalizados são preservados.':'Soma dos resultados válidos, sem descarte automático.'} Resultados descartados manualmente continuam excluídos. {discard&&Number(discardCount)===0&&<strong>Este campeonato está configurado com zero descartes.</strong>}</div>
    <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-4 items-start">
     <section className="rounded-2xl border bg-white shadow-sm overflow-hidden" aria-label="Posições previstas">
      <div className="p-4 border-b bg-slate-50"><h2 className="font-bold text-lg">1. Informe as posições</h2><p className="text-sm text-slate-600">A tabela ao lado é recalculada a cada alteração.</p></div>
      <div className="p-4 space-y-3">
       {model.available.length? <><label className="block text-sm font-semibold">Etapa a simular<select aria-label="Etapa a simular" className={selectClass+' mt-1'} value={selectedStage?.id||''} onChange={e=>{setStageId(e.target.value);setInputError('');}}>{model.available.map(e=><option key={e.id} value={e.id}>{e.numero_etapa}ª etapa · {e.local||'Local a definir'}{e.dobrar_pontos?' · Pontos dobrados':''}{Object.keys(scenario[e.id]||{}).length?' · Preenchida':''}</option>)}</select></label>
       {selectedStage?.dobrar_pontos&&<p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-2">Esta etapa dobra os pontos de posição.</p>}
       <label className="flex items-center gap-2 border rounded-lg px-3"><Search size={16}/><input aria-label="Buscar piloto na simulação" placeholder="Buscar piloto…" value={search} onChange={e=>setSearch(e.target.value)} className="p-3 w-full outline-none"/></label>
       <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!Object.keys(stageEntries).length&&!Object.keys(drafts[selectedStage?.id]||{}).length} onClick={()=>{setScenario(s=>{const next={...s};delete next[selectedStage.id];return next;});setDrafts(s=>{const next={...s};delete next[selectedStage.id];return next;});setInputError('');}}>Limpar esta etapa</Button><Button size="sm" variant="ghost" disabled={!Object.keys(drafts).length&&!model.simulated.length} onClick={()=>{setScenario({});setDrafts({});setInputError('');}}><RotateCcw size={14} className="mr-1"/>Reiniciar tudo</Button></div>
       <p className="text-xs text-slate-500">0 = não completou (NC). Campo vazio = sem resultado previsto. Etapas ainda não simuladas não entram na conta.</p>
       {missingTable&&<p role="alert" className="text-red-700">Cadastre a tabela de pontos para calcular posições previstas.</p>}
       {inputError&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{inputError}</p>}
       <div data-pdf-expand className="max-h-[34rem] overflow-y-auto divide-y">{data.pilots.filter(name=>name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map(name=>{const row=projected.get(name),sim=model.simulated.find(r=>r.piloto_nome===name&&r.etapa_id===selectedStage.id);return <div key={name} className={'flex items-center gap-3 py-3 px-1 '+(sim?'bg-yellow-50/70':'')}><div className="flex-1 min-w-0"><p className="font-semibold text-sm break-words">{name}</p>{drafts[selectedStage.id]?.[name]&&!sim&&<p className="text-xs text-red-700">Posição inválida ou repetida; valor não aplicado.</p>}<p className="text-xs text-slate-500">{sim?`${sim.pontos_totais} pts na etapa · `:''}Projeção: {row?.posicao}º · {row?.pontos_totais} pts</p></div><label className="text-xs text-slate-600 text-center">Posição<input aria-label={`Posição prevista de ${name}`} type="number" inputMode="numeric" min="0" max="200" step="1" disabled={missingTable} value={drafts[selectedStage.id]?.[name]??stageEntries[name]??''} placeholder="—" onChange={e=>setPosition(name,e.target.value)} className="block w-20 rounded-lg border border-slate-300 p-2 text-center text-base font-bold text-slate-900 focus:ring-2 focus:ring-yellow-400"/></label></div>;})}</div>
       </>:<p className="text-slate-600 py-6">Não há etapas futuras sem resultados. Etapas finalizadas ou com resultados lançados são preservadas.</p>}
      </div>
     </section>
     <section className="rounded-2xl border bg-white shadow-sm overflow-hidden xl:sticky xl:top-4" aria-label="Classificação projetada">
      <div className="p-4 border-b bg-yellow-50"><h2 className="font-bold text-lg">2. Confira a nova classificação</h2><p role="status" aria-live="polite" className="text-sm text-slate-600">{model.simulated.length?`${model.simulated.length} resultado(s) previsto(s) · atualização instantânea`:'Informe uma posição para começar a projeção.'}</p></div>
      <div data-pdf-expand className="overflow-auto max-h-[44rem]"><table className="w-full text-sm" aria-label="Tabela de classificação projetada"><thead className="sticky top-0 bg-slate-100 text-slate-600"><tr>{['Pos.','Piloto','Atual','Variação','Projetado'].map(label=><th key={label} className="p-3 text-left whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{model.ranking.map(row=><tr key={row.piloto} className={'border-t '+(row.simulados?'bg-yellow-50/70':'')}><td className="p-3 font-bold whitespace-nowrap">{row.posicao}º</td><td className="p-3"><p className="font-semibold whitespace-nowrap">{row.piloto}</p><span className="text-xs text-slate-500">{row.variacao>0?'↑ '+row.variacao+' posição(ões)':row.variacao<0?'↓ '+Math.abs(row.variacao)+' posição(ões)':'Mantém posição'}{row.empatado?' · Empate em pontos':''}</span>{discard&&<p className="text-xs text-slate-500">Descarte: {row.pontos_descartados} pts · faltas: {row.descartes_automaticos}</p>}</td><td className="p-3 tabular-nums">{row.atual}</td><td className={'p-3 font-semibold tabular-nums '+(row.delta>0?'text-green-700':row.delta<0?'text-red-700':'text-slate-400')}>{row.delta>0?'+':''}{row.delta}</td><td className="p-3 font-extrabold text-lg tabular-nums" data-testid={`projected-${row.piloto}`}>{row.pontos_totais}</td></tr>)}</tbody></table></div>
      {!model.ranking.length&&<p className="p-6 text-slate-600">Nenhum piloto ativo vinculado nesta seleção.</p>}
      <p className="p-3 text-xs text-slate-500 border-t">Atual e projetado usam o mesmo modo de descarte. Empates em pontos aparecem em ordem alfabética, sem decidir o desempate oficial.</p>
     </section>
    </div>
    {model.simulated.length>0&&<p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Cenário parcial: nas etapas simuladas, pilotos sem posição recebem zero e contam como ausência para o descarte. Preencha todos para comparar um grid completo. Bônus de melhor volta não são presumidos.</p>}
    <p className="text-sm text-slate-500">Simulação temporária: altera apenas esta projeção. Trocar campeonato, ano ou categoria limpa o cenário.</p>
   </section>
   {filtered.length>1&&<details className="rounded-2xl border bg-white p-4"><summary className="font-bold cursor-pointer">Comparar histórico dos pilotos</summary><div className="mt-4"><ComparadorPilotos key={`${championshipId}-${year}-${category}`} resultados={filtered} etapas={data.stages}/></div></details>}
  </>}
 </div>;
}
