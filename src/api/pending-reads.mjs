// Share only in-flight reads. Responses are never retained after completion.
export function createPendingReads() {
 const pending=new Map();
 return async function share(key,read) {
  if(!pending.has(key)){
   const promise=Promise.resolve().then(read);
   pending.set(key,promise);
   promise.then(()=>pending.delete(key),()=>pending.delete(key));
  }
  return structuredClone(await pending.get(key));
 };
}
