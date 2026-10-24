import assert from 'node:assert/strict';
import {analyzeResultText,timeMilliseconds} from '../src/utils/resultText.mjs';
const text=`Baterias 01/01/2030
POS # Nome MV TMV TT Gap INT T.U.V TV VM UF
1 30 Piloto Alfa 10 00:41.911 00:15:29.050 — — 00:42.286 22 42,62 ES
2 14 Piloto Béta 5 00:41.772 00:15:32.048 00:02.998 00:02.998 00:42.419 22 42,49 ES
3 28 Apelido 5 00:41.799 00:15:33.000 00:03.950 00:00.952 00:42.251 22 42,44 ES
Observações da prova
O competidor recebeu uma bandeira. Alteração manuscrita precisa de revisão.
99 20 Não é resultado 1 00:41.000`;
const parsed=analyzeResultText(text,[{nome:'Piloto Alfa',ativo:true},{nome:'Piloto Beta',ativo:true},{nome:'Apelido Completo',ativo:true}]);
assert.equal(parsed.rows.length,3);assert.equal(parsed.rows[0].posicao,1);assert.equal(parsed.rows[0].numero_kart,'30');
assert.equal(parsed.rows[1].piloto_nome,'Piloto Beta');assert.equal(parsed.rows[1].volta_melhor,5);assert.equal(parsed.rows[1].voltas,22);
assert.equal(parsed.rows[1].melhor_volta_sugerida,true);assert.equal(parsed.rows[0].melhor_volta_sugerida,false);
assert.equal(parsed.rows[2].nome_validado,false);assert.equal(parsed.rows[2].piloto_nome,'Apelido');
assert(parsed.rows.every(r=>r.pontos_melhor_volta===0&&r.status==='regular'));
assert(parsed.warnings.some(w=>w.includes('punição')));assert.equal(parsed.metadata.date,'01/01/2030');
assert.equal(timeMilliseconds('00:41.772'),41772);assert.equal(timeMilliseconds('00:15:32.048'),932048);assert.equal(timeMilliseconds('00:61.000'),null);
const missing=analyzeResultText('1 3 Alfa 1 00:41.000\n3 4 Beta 2 00:42.000');assert(missing.warnings.some(w=>w.includes('ausentes')));
assert.equal(analyzeResultText('1 Alfa\n2 Beta').rows.length,2);
console.log('OK: synthetic Laptime layout, POS vs kart, MV vs TMV, laps, accents, aliases, notes and review-only bonus. No attachments read.');
