import {calcularRankingComDescarte} from './descarte.js';
export function calcularDiferencasPontos({resultados=[],etapas=[],campeonato,aplicarDescarte=false,categoria='todas'}){
 let ranking;
 if(aplicarDescarte&&campeonato){
  ranking=calcularRankingComDescarte({resultados,etapas,campeonato,categoriaFiltro:categoria}).map(r=>({piloto:r.piloto,pontos:r.pontos_totais,etapas:r.etapas_disputadas,categoria:r.categoria,posicao:r.posicao}));
 }else{
  const porPiloto=new Map();
  for(const r of resultados.filter(r=>!r.descartado)){
   if(!porPiloto.has(r.piloto_nome))porPiloto.set(r.piloto_nome,{piloto:r.piloto_nome,pontos:0,ids:new Set(),categoria:r.categoria||''});
   const p=porPiloto.get(r.piloto_nome);p.pontos+=Number(r.pontos_totais)||0;p.ids.add(r.etapa_id);
  }
  ranking=[...porPiloto.values()].sort((a,b)=>b.pontos-a.pontos).map(({ids,...r},i)=>({...r,etapas:ids.size,posicao:i+1}));
 }
 const liderPts=ranking[0]?.pontos??0;
 return ranking.map((r,i)=>({...r,difLider:r.pontos-liderPts,difAnterior:i===0?null:r.pontos-ranking[i-1].pontos}));
}
