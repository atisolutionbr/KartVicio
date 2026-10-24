import crypto from 'node:crypto';
import {lockRelations,deletionPreview,pilotDependents} from './relations.mjs';
export function installPilotLifecycle(app,pool,invalidate){
 app.post('/api/pilots/:id/:action',async(req,res)=>{
  if(req.user.permissions.permissao!=='admin')return res.status(403).json({message:'Somente o administrador pode excluir pilotos.'});
  if(!['preview-delete','delete-complete'].includes(req.params.action))return res.status(404).json({message:'Operação inválida.'});
  const db=await pool.connect();
  try{
   await db.query('BEGIN');await lockRelations(db);
   const records=(await db.query("SELECT entity,id,data FROM kartvicio.records WHERE entity IN ('Piloto','InscricaoPiloto','ResultadoEtapa','Penalidade','Pontuacao','LogAlteracao')")).rows;
   const pilot=records.find(r=>r.entity==='Piloto'&&r.id===req.params.id)?.data;
   if(!pilot)throw Object.assign(Error('Piloto não encontrado.'),{status:404});
   const preview=deletionPreview(records,pilot);
   const digest=crypto.createHash('sha256').update(JSON.stringify(records.filter(r=>r.entity==='Piloto'&&r.id===pilot.id||pilotDependents([r],pilot).length).sort((a,b)=>(a.entity+a.id).localeCompare(b.entity+b.id)))).digest('hex');
   if(req.params.action==='preview-delete'){await db.query('COMMIT');return res.json({...preview,version:digest});}
   if(preview.blocked)throw Error('Nome compartilhado por outros cadastros: revise os vínculos antes de excluir.');
   if(req.body.confirmName!==pilot.nome||req.body.version!==digest)throw Object.assign(Error('Confirmação inválida ou vínculos alterados. Reabra a prévia.'),{status:409});
   await db.query('CREATE TABLE IF NOT EXISTS kartvicio.pilot_deletion_archive(batch_id text NOT NULL,entity text NOT NULL,id text NOT NULL,data jsonb NOT NULL,deleted_at timestamptz NOT NULL DEFAULT now(),deleted_by text NOT NULL)');
   const batch=crypto.randomUUID(),targets=[records.find(r=>r.entity==='Piloto'&&r.id===pilot.id),...pilotDependents(records,pilot)];
   for(const record of targets){
    await db.query('INSERT INTO kartvicio.pilot_deletion_archive(batch_id,entity,id,data,deleted_by) VALUES($1,$2,$3,$4,$5)',[batch,record.entity,record.id,record.data,req.user.email]);
    await db.query('DELETE FROM kartvicio.records WHERE entity=$1 AND id=$2',[record.entity,record.id]);
   }
   // Remove recovery copies of this driver's operational results as well.
   for(const table of ['resultados_excluidos']){
    const present=(await db.query('SELECT to_regclass($1) AS name',['kartvicio.'+table])).rows[0].name;
    if(present){const old=(await db.query("SELECT entity,id,data FROM kartvicio.resultados_excluidos WHERE lower(trim(data->>'piloto_nome'))=lower(trim($1))",[pilot.nome])).rows;
     for(const r of old)await db.query('INSERT INTO kartvicio.pilot_deletion_archive(batch_id,entity,id,data,deleted_by) VALUES($1,$2,$3,$4,$5)',[batch,r.entity,r.id,r.data,req.user.email]);
     await db.query("DELETE FROM kartvicio.resultados_excluidos WHERE lower(trim(data->>'piloto_nome'))=lower(trim($1))",[pilot.nome]);
    }
   }
   await db.query('COMMIT');invalidate(['Piloto','InscricaoPiloto','ResultadoEtapa','Penalidade','Pontuacao','LogAlteracao']);res.json({deleted:targets.length,batch});
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 });
}
