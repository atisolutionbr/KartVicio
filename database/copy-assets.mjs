import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const urls=new Set();
const logo='https://media.base44.com/images/public/68af8b4414dd5072425cde4e/f03ef8652_logo_kart_vicio.jpeg';
urls.add(logo);
function collect(value){if(typeof value==='string'&&/^https:\/\/(media\.base44\.com|base44\.app)\//.test(value))urls.add(value);else if(value&&typeof value==='object')Object.values(value).forEach(collect);}
for(const file of await fs.readdir('private-data'))if(file.endsWith('.json'))collect(JSON.parse(await fs.readFile('private-data/'+file,'utf8')));
await fs.mkdir('public/media',{recursive:true});await fs.mkdir('public/pwa',{recursive:true});
const map={};
for(const url of urls){const response=await fetch(url);if(!response.ok)throw new Error(`Falha ao copiar imagem: ${response.status}`);const type=response.headers.get('content-type')||'';if(!type.startsWith('image/'))throw new Error('Conteúdo recebido não é imagem');const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';const name=crypto.createHash('sha256').update(url).digest('hex').slice(0,16)+'.'+ext;await fs.writeFile('public/media/'+name,Buffer.from(await response.arrayBuffer()));map[url]='/media/'+name;}
await fs.writeFile('src/api/assets-map.json',JSON.stringify(map,null,2));
for(const name of ['icon-192.png','icon-512.png','icon-maskable-512.png']){const r=await fetch('https://kartvicio.base44.app/pwa/'+name);if(r.ok&&r.headers.get('content-type')?.startsWith('image/')){await fs.writeFile('public/pwa/'+name,Buffer.from(await r.arrayBuffer()));console.log('PWA '+name);}else console.log('PWA ausente na origem: '+name);}
for(const file of ['src/Layout.jsx','src/hooks/usePdfExport.js','src/components/resultados/PdfEtapa.jsx','src/components/ranking/RankingCard.jsx']){const content=await fs.readFile(file,'utf8');await fs.writeFile(file,content.replaceAll(logo,map[logo]));}
console.log(`Imagens copiadas: ${urls.size}`);
