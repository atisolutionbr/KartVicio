// Apply the approved duplicate cleanup to the immutable original export.
export function expectedAfterMigration(entity, rows) {
 if(entity!=='Usuario')return rows;
 const seen=new Set();
 return [...rows].sort((a,b)=>a.id.localeCompare(b.id)).filter(row=>{
  const email=String(row.email||'').trim().toLowerCase();
  if(!email)return true;
  if(seen.has(email))return false;
  seen.add(email);return true;
 }).map(row=>({...row,email:String(row.email||'').trim().toLowerCase()}));
}
