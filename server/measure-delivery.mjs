import https from 'node:https';
import {gunzipSync} from 'node:zlib';
const base='https://kartvicio.atisolution.com.br';
function get(url){return new Promise((resolve,reject)=>{
 const started=performance.now();
 https.get(url,{headers:{'Accept-Encoding':'gzip'}},res=>{
  const chunks=[];res.on('data',c=>chunks.push(c));res.on('error',reject);res.on('end',()=>{
   if(res.statusCode!==200)return reject(Error('HTTP '+res.statusCode));
   const body=Buffer.concat(chunks),gzip=res.headers['content-encoding']==='gzip';
   resolve({bytes:body.length,text:(gzip?gunzipSync(body):body).toString('utf8'),gzip,ms:Math.round(performance.now()-started)});
  });
 }).on('error',reject);
});}
const html=await get(base+'/');const entry=html.text.match(/<script[^>]+src="([^"]+)"/)[1];
const queue=[new URL(entry,base).href],seen=new Set();let bytes=0,files=0,gzipped=0;
while(queue.length){const url=queue.shift();if(seen.has(url))continue;seen.add(url);
 const file=await get(url);files++;bytes+=file.bytes;gzipped+=Number(file.gzip);
 for(const match of file.text.matchAll(/\b(?:from\s*|import\s*)["']([^"']+\.js)["']/g)){
  const next=new URL(match[1],url);if(next.origin===base)queue.push(next.href);
 }
}
console.log(JSON.stringify({entry,initialJavaScriptFiles:files,transferredJavaScriptBytes:bytes,gzippedFiles:gzipped,htmlResponseMs:html.ms}));
