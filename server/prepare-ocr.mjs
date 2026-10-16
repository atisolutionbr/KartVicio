import fs from 'node:fs';
fs.mkdirSync('public/ocr',{recursive:true});
fs.copyFileSync('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
for(const name of fs.readdirSync('node_modules/tesseract.js-core'))if(/\.wasm(\.js)?$/.test(name))fs.copyFileSync('node_modules/tesseract.js-core/'+name,'public/ocr/'+name);
fs.copyFileSync('node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz','public/ocr/por.traineddata.gz');
