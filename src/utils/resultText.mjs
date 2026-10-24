export const normalizePilotName=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim();
const timePattern='(?:\\d{1,2}:){1,2}\\d{2}[.,]\\d{3}';
export function timeMilliseconds(value){if(!/^(?:\d{1,2}:){1,2}\d{2}[.,]\d{3}$/.test(String(value||'')))return null;const parts=String(value||'').replace(',','.').split(':').map(Number);if(parts.some(x=>!Number.isFinite(x)||x<0)||parts.length<2||parts.length>3||parts.at(-1)>=60||(parts.length===3&&parts[1]>=60))return null;return Math.round(parts.reduce((s,n)=>s*60+n,0)*1000);}
export function analyzeResultText(text,pilots=[]){
 const rows=[],warnings=[];const known=pilots.filter(p=>p.nome&&p.ativo!==false);
 const laptime=new RegExp('^\\s*(\\d{1,3})[º°.)]?\\s+(\\d{1,3})\\s+(.+?)\\s+(\\d{1,3})\\s+('+timePattern+')(?=\\s|$)\\s*(.*)$','u');
 for(const rawLine of String(text).split(/\r?\n/)){
  const line=rawLine.replace(/[|]/g,' ').trim();if(/^(?:legenda|observa[çc][õo]es|melhor volta\s*:)/i.test(line))break;const m=line.match(laptime);
  let row;
  if(m){const total=m[6].match(new RegExp(timePattern));const ending=m[6].match(new RegExp(timePattern+'\\s+(\\d{1,3})\\s+\\d{1,3}[.,]\\d{1,2}(?:\\s+[A-Z]{2})?\\s*$'));const laps=ending?Number(ending[1]):NaN;
   row={posicao:Number(m[1]),numero_kart:m[2],piloto_nome:m[3].trim(),volta_melhor:Number(m[4]),melhor_volta_tempo:m[5].replace(',','.'),tempo_total:total?.[0]?.replace(',','.')||'',voltas:Number.isInteger(laps)&&laps>=0?laps:undefined,formato:'laptime'};
  }else{
   const simple=line.match(/^\s*(\d{1,3})\s*[º°.)-]?\s+([^\d].*?)\s*$/u);if(!simple||!/[\p{L}]/u.test(simple[2])||/^(?:voltas?|etapas?|pontos?)\b/i.test(simple[2]))continue;
   row={posicao:Number(simple[1]),piloto_nome:simple[2].replace(/\s+\d.*$/,'').trim(),formato:'simples'};
  }
  if(!row.piloto_nome||row.posicao<1||row.posicao>200)continue;
  row.nome_lido=row.piloto_nome;const exact=known.filter(p=>normalizePilotName(p.nome)===normalizePilotName(row.piloto_nome));
  row.piloto_nome=exact.length===1?exact[0].nome:row.piloto_nome;row.nome_validado=exact.length===1;
  row.pontos_melhor_volta=0;row.status='regular';rows.push(row);
 }
 if(rows.some(r=>r.formato==='laptime')){const incomplete=rows.filter(r=>r.formato!=='laptime').length;if(incomplete)warnings.push('Linhas incompletas foram ignoradas: '+incomplete+'. Confira posições ausentes.');rows.splice(0,rows.length,...rows.filter(r=>r.formato==='laptime'));}
 const timing=rows.filter(r=>r.formato==='laptime'&&timeMilliseconds(r.melhor_volta_tempo)>0);const best=timing.length?Math.min(...timing.map(r=>timeMilliseconds(r.melhor_volta_tempo))):null;
 for(const row of rows)row.melhor_volta_sugerida=best!==null&&timeMilliseconds(row.melhor_volta_tempo)===best;
 const positions=rows.map(r=>r.posicao);if(new Set(positions).size!==positions.length)warnings.push('Posições repetidas: o arquivo pode conter mais de uma bateria. Importe uma etapa por vez.');
 if(positions.length&&Math.max(...positions)<=200){const missing=Array.from({length:Math.max(...positions)},(_,i)=>i+1).filter(p=>!positions.includes(p));if(missing.length)warnings.push('Posições ausentes no reconhecimento: '+missing.join(', ')+'. Confira a foto.');}
 if(rows.some(r=>!r.nome_validado))warnings.push('Há nomes não confirmados no cadastro. Selecione o piloto correto; apelidos e nomes parciais não são vinculados automaticamente.');
 if(/observa[çc][õo]es|penali|bandeira|\bDQ\b|desclassific/i.test(text))warnings.push('Há observações de prova ou punição. Revise manualmente; a leitura não aplica penalidades nem desclassificação.');
 const date=String(text).match(/\b(\d{2}\/\d{2}\/\d{4})\b/)?.[1]||'';
 return {rows,warnings,metadata:{format:timing.length?'Laptime / FDK':'Texto simples',date,bestLapTime:best===null?'':timing.find(r=>timeMilliseconds(r.melhor_volta_tempo)===best).melhor_volta_tempo}};
}
export const parseResultText=(text,pilots=[])=>analyzeResultText(text,pilots).rows;
