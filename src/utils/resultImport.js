import {analyzeResultText} from './resultText.mjs';
export {parseResultText,analyzeResultText} from './resultText.mjs';
export async function recognizeResultFile(file,onProgress=()=>{},{rotation='auto',signal}={}) {
 if(file.size>15*1024*1024)throw Error('O limite é 15 MB por arquivo.');
 let worker;
 const check=()=>{if(signal?.aborted)throw Error('Leitura cancelada.');};
 const stop=()=>worker?.terminate().catch(()=>{});signal?.addEventListener('abort',stop,{once:true});
 const ocr=async(image)=>{
  if(!worker){const {createWorker}=await import('tesseract.js');worker=await createWorker('por',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/ocr',logger:m=>onProgress(`${m.status}: ${Math.round((m.progress||0)*100)}%`)});}
  check();await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});return (await worker.recognize(image,{rotateAuto:true})).data.text;
 };
 const orientedOcr=async(source)=>{
  const angles=rotation==='auto'?[0,90,270,180]:[Number(rotation)];let bestText='',bestScore=-1;
  for(const angle of angles){check();onProgress(`Lendo imagem · orientação ${angle}°`);const canvas=document.createElement('canvas');const sideways=angle%180!==0;canvas.width=sideways?source.height:source.width;canvas.height=sideways?source.width:source.height;const ctx=canvas.getContext('2d');ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(source,-source.width/2,-source.height/2);const text=await ocr(canvas);const parsed=analyzeResultText(text);const count=parsed.rows.filter(r=>r.formato==='laptime').length;const score=count*100+parsed.rows.length;canvas.width=canvas.height=0;if(score>bestScore){bestText=text;bestScore=score;}if(count>=3)break;
  }return bestText;
 };
 let pdf,task;
 try {
  if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')){
   const lib=await import('pdfjs-dist');const workerUrl=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');lib.GlobalWorkerOptions.workerSrc=workerUrl.default;
   task=lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});pdf=await task.promise;
   if(pdf.numPages>10)throw Error('Selecione um PDF com até 10 páginas.');
   const texts=[];
   for(let i=1;i<=pdf.numPages;i++){
    onProgress(`Lendo página ${i} de ${pdf.numPages}`);const page=await pdf.getPage(i),content=await page.getTextContent();
    const lines=new Map();for(const item of content.items){if(!item.str)continue;const y=Math.round(item.transform[5]/3)*3;if(!lines.has(y))lines.set(y,[]);lines.get(y).push(item);}
    let text=[...lines].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ')).join('\n');
    if(text.trim().length<30){const initial=page.getViewport({scale:1}),scale=Math.min(2,2400/Math.max(initial.width,initial.height));const viewport=page.getViewport({scale});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;text=await orientedOcr(canvas);canvas.width=canvas.height=0;}
    texts.push(text);page.cleanup();
   }
   return texts.join('\n');
  }
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Selecione PNG, JPEG, WebP ou PDF.');
  const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>40000000){bitmap.close();throw Error('Imagem muito grande. Reduza a resolução.');}
  const scale=Math.min(2,2800/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=bitmap.width*scale;canvas.height=bitmap.height*scale;canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return await orientedOcr(canvas);
 }finally{signal?.removeEventListener('abort',stop);if(worker)await worker.terminate().catch(()=>{});if(task)await task.destroy();}
}
