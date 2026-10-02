import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const host=process.env.QA_URL??'http://127.0.0.1:5300';
const prefix=process.env.QA_BASE_PATH??'';
const password=process.env.QA_PASSWORD??'kart123';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts',{recursive:true});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(host+prefix+'/login');
 const user=page.locator('input[name="username"]'), pass=page.locator('input[name="password"]');
 await user.fill(process.env.QA_USER??'admin');
 await pass.fill('deliberately-wrong-password');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Usuario ou senha incorretos.'}).waitFor();
 await pass.fill(password);
 await page.getByRole('button',{name:'Mostrar senha',exact:true}).click();
 assert.equal(await pass.getAttribute('type'),'text');
 await page.getByRole('button',{name:'Ocultar senha',exact:true}).click();
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const logo=page.getByAltText('Kart Vício');
  await logo.waitFor();assert.ok(await logo.evaluate(el=>el.complete&&el.naturalWidth>0));
  assert.equal(await page.getByText(/Escala 70%|Para instalar:|Instalar KartVicio/).count(),0);
 }
 await page.screenshot({path:'artifacts/login-branding.png'});
 const favicon=await page.locator('link[rel="icon"][type="image/png"]').getAttribute('href');
 assert.ok(favicon.includes('kart-vicio-32.png'));
 const icon=await context.request.get(new URL(favicon,host).href);assert.equal(icon.status(),200);
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.waitForURL(u=>u.pathname===(prefix||'/')||u.pathname===prefix+'/');
 assert.equal((await context.request.get(host+prefix+'/api/race')).status(),200);
 await page.reload();await page.getByRole('button',{name:'Sair',exact:true}).waitFor();
 assert.ok(!page.url().includes('/login'));
 await page.getByRole('button',{name:'Sair',exact:true}).click();
 await page.waitForURL('**/login');
 assert.equal((await context.request.get(host+prefix+'/api/race')).status(),401);
 await user.fill(process.env.QA_USER??'admin');await pass.fill(password);
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.waitForURL(u=>u.pathname===(prefix||'/')||u.pathname===prefix+'/');
 assert.equal((await context.request.get(host+prefix+'/api/race')).status(),200);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'passed',host,prefix,loginForm:true,wrongPasswordRejected:true,reloadSession:true,logoutAndRelogin:true,logo:true,favicon:true,hiddenPwaControls:true,widths:[320,390,768,1440]}));
}finally{await browser.close();}
