import assert from 'node:assert/strict';
import {totalPoints,bounds,prepareTitleModel,simulateTitle} from '../src/utils/titleModel.mjs';
assert.equal(totalPoints([{points:25},{points:10}],2,1),25);
assert.equal(totalPoints([{points:25},{points:10,penalty:true}],2,1),10);
assert.equal(totalPoints([{points:25},{points:10}],3,1),35);
const config={championship:{numero_etapas_planejadas:2,descarte_quantidade:0},stages:[{id:'done',numero_etapa:1,finalizada:true},{id:'next',numero_etapa:2,dobrar_pontos:true}],results:[{piloto_nome:'A',etapa_id:'done',posicao:1,pontos_totais:30},{piloto_nome:'B',etapa_id:'done',posicao:2,pontos_totais:0}],registrations:[],table:[{posicao:1,pontos:10},{posicao:2,pontos:5}],bonus:1};
const model=prepareTitleModel(config);assert.deepEqual(model.maxFuture,[21]);assert.equal(model.pilots[1].upper,21);
const out=simulateTitle(model,{iterations:300});assert.equal(out.pilots[0].clinched,true);assert.equal(out.pilots[1].eliminated,true);assert.equal(out.pilots[0].probability,100);
const tied=prepareTitleModel({...config,stages:[config.stages[0]],championship:{numero_etapas_planejadas:1},results:config.results.map(r=>({...r,pontos_totais:10})),useDiscards:false});
const tieOut=simulateTitle(tied);assert.deepEqual(tieOut.pilots.map(p=>p.probability),[50,50]);assert(tieOut.pilots.every(p=>!p.clinched&&!p.eliminated));
const competitive=prepareTitleModel({...config,results:config.results.map(r=>({...r,pontos_totais:10}))});
const a=simulateTitle(competitive,{iterations:1000}),b=simulateTitle(competitive,{iterations:1000});assert.deepEqual(a,b);assert(Math.abs(a.pilots.reduce((s,p)=>s+p.probability,0)-100)<1e-8);
for(const p of a.pilots)for(const example of p.examples){for(const stage of example.finishes){const pos=stage.filter(Boolean);assert.equal(pos.length,new Set(pos).size);}for(let i=0;i<example.scores.length;i++){assert(example.scores[i]>=competitive.pilots[i].lower-1e-8);assert(example.scores[i]<=competitive.pilots[i].upper+1e-8);}}
// Enumerate all attendance/point possibilities and check conservative discard bounds.
const history=[{points:-2,penalty:true},{points:5},{points:20}];const bound=bounds(history,5,[10,20],2);
for(const first of [null,0,10])for(const second of [null,0,20]){const rows=[...history,...[first,second].filter(x=>x!==null).map(points=>({points}))];const score=totalPoints(rows,5,2);assert(score>=bound.lower);assert(score<=bound.upper);}
assert.equal(prepareTitleModel({...config,championship:{numero_etapas_planejadas:4}}).missing,2);
assert.throws(()=>prepareTitleModel({...config,table:[]}));
console.log('OK: scoring, penalties, absences, discards, double points, bonus, tie handling, deterministic percentages, exclusive race positions, valid scenario bounds and missing schedule.');
