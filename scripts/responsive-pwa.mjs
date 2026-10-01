import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const host=process.env.QA_URL??'http://127.0.0.1:5300';
const prefix=process.env.QA_BASE_PATH??'';
const path=p=>host+prefix+p;
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
const context=await browser.newContext();
const page=await context.newPage();page.setDefaultTimeout(60000);
const login=await context.request.post(path('/api/auth/login'),{data:{user:'admin',password:process.env.QA_PASSWORD??'kart123'}});assert.equal(login.status(),200);
const manifest=await context.request.get(path('/manifest.webmanifest'));assert.equal(manifest.status(),200);const m=await manifest.json();assert.equal(m.display,'standalone');assert.equal(m.scope,prefix+'/');
for(const icon of m.icons){const r=await context.request.get(host+icon.src);assert.equal(r.status(),200);assert.match(r.headers()['content-type'],/image\/png/);}
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const routes=['/','/monitoring','/strategy','/box','/karts','/setup','/drivers','/teams','/stints','/history','/replay','/settings','/command','/ipad'];
for(const width of [320,390,768,1440]){
await page.setViewportSize({width,height:900});
for(const route of routes){await page.goto(path(route),{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.body.innerText.includes("Carregando sessão..."));await page.waitForTimeout(150);const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(dimensions.width<=dimensions.viewport+1,`${route} overflow at ${width}: ${JSON.stringify(dimensions)}`);}
await page.screenshot({path:`artifacts/responsive-${width}.png`,fullPage:false});
}
await page.goto(path('/'));assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).zoom),'0.7');
await page.getByRole('button',{name:'Escala 70%. Alternar escala',exact:true}).click();assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).zoom),'1');await page.reload();await page.getByRole('button',{name:'Escala 100%. Alternar escala',exact:true}).waitFor();
await page.getByRole('button',{name:'Escala 100%. Alternar escala',exact:true}).click();
await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
await context.setOffline(true);await page.goto(path('/history'),{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Sem conexão com o servidor'}).waitFor();await context.setOffline(false);
assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',widths:[320,390,768,1440],routes:routes.length,manifest:true,icons:true,scale:true,offlineFallback:true}));
}finally{await browser.close();}
