import assetMap from './assets-map.json';
function localAssets(value) {
 if(typeof value==='string')return assetMap[value] || value;
 if(Array.isArray(value))return value.map(localAssets);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,localAssets(v)]));
 return value;
}
export async function request(url,data,method='POST') {
 const r=await fetch(url,{method,credentials:'same-origin',...(data!==undefined?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});
 const result=await r.json();if(!r.ok)throw Object.assign(new Error(result.message||'Erro na operação'),{status:r.status});return localAssets(result);
}
const listeners=new Map();let stream;
function subscribe(entity,callback){if(!listeners.has(entity))listeners.set(entity,new Set());listeners.get(entity).add(callback);
 if(!stream){stream=new EventSource('/api/events');stream.onmessage=e=>{const m=JSON.parse(e.data);for(const cb of listeners.get(m.entity)||[])cb(m);};}
 return()=>{listeners.get(entity)?.delete(callback);if([...listeners.values()].every(s=>!s.size)){stream?.close();stream=null;}};
}
const options=(sort,limit,skip,fields)=>typeof sort==='object'&&sort!==null?{options:sort,legacy:false}:{options:{sort,limit,skip,fields},legacy:true};
const entities=new Proxy({},{get:(_,entity)=>{
 const call=(action,data)=>request('/api/entities/'+entity+'/'+action,data);
 return {list:(...args)=>call('list',options(...args)),filter:(query,...args)=>call('filter',{query,...options(...args)}),
 get:id=>call('get',{id}),count:query=>call('count',{query}),aggregate:spec=>call('aggregate',spec),
 create:data=>call('create',{data}),update:(id,data)=>call('update',{id,data}),delete:id=>call('delete',{id}),
 updateMany:(query,data)=>call('updateMany',{query,data}),bulkCreate:records=>call('bulkCreate',{records}),
 upsert:(records,{key})=>call('upsert',{records,key}),subscribe:cb=>subscribe(entity,cb)};
}});
const auth={me:()=>request('/api/auth/me',undefined,'GET'),login:()=>{window.location.href='/login';},redirectToLogin:()=>{window.location.href='/login';},
 logout:async()=>{await request('/api/auth/logout',{});window.location.href='/login';}};
export const base44={entities,auth,integrations:{Core:{UploadPublicFile:async({file})=>{
 const form=new FormData();form.append('file',file);const r=await fetch('/api/upload',{method:'POST',body:form});const result=await r.json();if(!r.ok)throw new Error(result.message);return result;
}}},users:{inviteUser:email=>request('/api/users/invite',{email})}};
