export const relationKey=v=>String(v||'').normalize('NFC').trim().toLowerCase();
export const pilotEntities=['InscricaoPiloto','ResultadoEtapa','Penalidade','Pontuacao','LogAlteracao'];
export function pilotDependents(records,pilot){
 const name=relationKey(pilot.nome);
 return records.filter(r=>pilotEntities.includes(r.entity)&&((r.data.piloto_id&&r.data.piloto_id===pilot.id)||(!r.data.piloto_id&&relationKey(r.data.piloto_nome)===name)));
}
export function deletionPreview(records,pilot){
 const linked=pilotDependents(records,pilot),counts=Object.fromEntries(pilotEntities.map(e=>[e,linked.filter(r=>r.entity===e).length]));
 const homonyms=records.filter(r=>r.entity==='Piloto'&&r.id!==pilot.id&&relationKey(r.data.nome)===relationKey(pilot.nome));
 return {pilot:{id:pilot.id,nome:pilot.nome,ativo:pilot.ativo},counts,total:linked.length+1,blocked:homonyms.length>0};
}
export async function lockRelations(db){await db.query("SELECT pg_advisory_xact_lock(hashtext('kartvicio-relations-v1'))");}
export async function validateRelations(db,entity,row,old){
 const exists=async(type,id)=>(await db.query('SELECT data FROM kartvicio.records WHERE entity=$1 AND id=$2',[type,id])).rows[0]?.data;
 if(row.campeonato_id&&entity!=='LogAlteracao'&&!await exists('Campeonato',row.campeonato_id))throw Error('Campeonato não encontrado. Atualize a seleção.');
 if(['InscricaoPiloto','ResultadoEtapa','Penalidade','Pontuacao'].includes(entity)){
  const drivers=(await db.query("SELECT id,data FROM kartvicio.records WHERE entity='Piloto' AND lower(trim(data->>'nome'))=$1",[relationKey(row.piloto_nome)])).rows;
  if(drivers.length!==1)throw Error('Piloto inexistente ou nome ambíguo. Revise o cadastro.');
  row.piloto_nome=drivers[0].data.nome;
  row.piloto_id=drivers[0].id;
  if(entity==='ResultadoEtapa'&&!old&&drivers[0].data.ativo!==true)throw Error('Ative o piloto antes de lançar o resultado.');
  if(entity==='InscricaoPiloto'&&row.ativo!==false&&drivers[0].data.ativo!==true)throw Error('Ative o piloto antes de vinculá-lo.');
 }
 if(entity==='InscricaoPiloto'&&(!old||old.piloto_nome!==row.piloto_nome||old.campeonato_id!==row.campeonato_id)){
  const duplicate=await db.query("SELECT 1 FROM kartvicio.records WHERE entity='InscricaoPiloto' AND id<>$1 AND data->>'campeonato_id'=$2 AND lower(trim(data->>'piloto_nome'))=$3",[row.id,row.campeonato_id,relationKey(row.piloto_nome)]);
  if(duplicate.rowCount)throw Object.assign(Error('O piloto já possui vínculo com este campeonato. Edite o vínculo existente.'),{status:409});
 }
 if(entity==='Etapa'&&old&&old.campeonato_id!==row.campeonato_id){
  const linked=await db.query("SELECT 1 FROM kartvicio.records WHERE data->>'etapa_id'=$1 LIMIT 1",[old.id]);
  if(linked.rowCount)throw Error('A etapa possui registros vinculados e não pode mudar de campeonato.');
 }
 if(entity==='ResultadoEtapa'&&!old){
  const active=await db.query("SELECT 1 FROM kartvicio.records WHERE entity='InscricaoPiloto' AND data->>'piloto_nome'=$1 AND data->>'campeonato_id'=$2 AND COALESCE((data->>'ativo')::boolean,true)",[row.piloto_nome,row.campeonato_id]);
  if(!active.rowCount)throw Error('Vincule o piloto ao campeonato antes de lançar o resultado.');
 }
 if(entity!=='Piloto')return [];
 row.nome=String(row.nome||'').trim();if(!row.nome)throw Error('Nome do piloto obrigatório.');
 const duplicate=(await db.query("SELECT 1 FROM kartvicio.records WHERE entity='Piloto' AND id<>$1 AND lower(trim(data->>'nome'))=$2",[row.id,relationKey(row.nome)])).rowCount;
 if(duplicate)throw Object.assign(Error('Já existe um piloto com esse nome.'),{status:409});
 const changed=[];
 if(old&&old.nome!==row.nome){
  const duplicateOld=(await db.query("SELECT 1 FROM kartvicio.records WHERE entity='Piloto' AND id<>$1 AND lower(trim(data->>'nome'))=$2",[old.id,relationKey(old.nome)])).rowCount;
  if(duplicateOld)throw Error('Há cadastros com o nome antigo duplicado. Regularize antes de renomear.');
  for(const type of pilotEntities){
   await db.query("UPDATE kartvicio.records SET data=data || jsonb_build_object('piloto_nome',$1::text,'updated_date',$2::text) WHERE entity=$3 AND (data->>'piloto_id'=$4 OR (COALESCE(data->>'piloto_id','')='' AND lower(trim(data->>'piloto_nome'))=$5))",[row.nome,new Date().toISOString(),type,old.id,relationKey(old.nome)]);changed.push(type);
  }
  if((await db.query("SELECT to_regclass('kartvicio.resultados_excluidos') AS name")).rows[0].name){
   await db.query("UPDATE kartvicio.resultados_excluidos SET data=data || jsonb_build_object('piloto_nome',$1::text) WHERE data->>'piloto_id'=$2 OR (COALESCE(data->>'piloto_id','')='' AND lower(trim(data->>'piloto_nome'))=$3)",[row.nome,old.id,relationKey(old.nome)]);
  }
 }
 if(row.ativo===false){await db.query("UPDATE kartvicio.records SET data=data || '{\"ativo\":false}'::jsonb WHERE entity='InscricaoPiloto' AND lower(trim(data->>'piloto_nome'))=$1",[relationKey(row.nome)]);changed.push('InscricaoPiloto');}
 return changed;
}
