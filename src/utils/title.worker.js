import {prepareTitleModel,simulateTitle} from './titleModel.mjs';
self.onmessage=event=>{try{const model=prepareTitleModel(event.data);const result=simulateTitle(model,{onProgress:p=>self.postMessage({progress:p})});self.postMessage({model,result});}catch(e){self.postMessage({error:e.message});}};
