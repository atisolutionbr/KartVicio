import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_URL??'http://127.0.0.1:5300';
const prefix=process.env.QA_BASE_PATH??'';
const url=p=>base+prefix+p;
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(60000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function post(data){const r=await context.request.post(url('/api/race'),{data});assert.equal(r.status(),200,await r.text());return r.json();}
async function get(){const r=await context.request.get(url('/api/race'));assert.equal(r.status(),200);return r.json();}
try{
  assert.equal((await context.request.get(url('/api/race'))).status(),401);
  assert.equal((await context.request.post(url('/api/timing'),{data:{laps:[]}})).status(),401);
  await page.goto(url('/'),{waitUntil:'domcontentloaded'});
  await page.getByLabel('Senha de acesso').fill(process.env.QA_PASSWORD??'kart123');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.waitForURL(location=>location.pathname===prefix+'/'||location.pathname===prefix);
  await page.getByRole('heading',{name:'Race Control',exact:true}).waitFor();
  await post({type:'reset'});
  let race=await get();
  for(const d of race.drivers)if(!race.stints.some(s=>s.driverId===d.id))await post({type:'driver-delete',driverId:d.id});
  race=await get();for(const t of race.teams)await post({type:'team-delete',teamId:t.id});
  race=await post({type:'configure',config:{...race.config,name:'Kart Vício · validação',durationMs:7200000,mandatoryStops:3,stints:4,minDrivers:2,maxDrivers:16,pitOpenAfterMs:0,pitCloseBeforeEndMs:600000,stopMinimumMs:5000,stopPenaltyThresholdMs:5000,driverMinimumMs:600000,driverMaximumMs:3600000,stintMaximumMs:2100000,stintWarningMs:1800000,stintCriticalMs:2040000}});
  await page.goto(url('/drivers'));
  for(const name of ['Jonatha','Pedro']){
    await page.getByRole('button',{name:'Novo piloto'}).click();
    await page.getByLabel('Nome completo').fill(name);
    await page.getByRole('button',{name:'Salvar piloto'}).click();
    await page.getByText(name,{exact:true}).first().waitFor();
  }
  race=await get();assert.equal(race.drivers.length,2);
  await page.goto(url('/teams'));
  await page.getByRole('button',{name:'Nova equipe'}).click();
  await page.getByLabel('Número de inscrição').fill('17');await page.getByLabel('Nome',{exact:true}).fill('KRT Racing');await page.getByLabel('Kart físico').fill('17');
  await page.getByLabel('Jonatha',{exact:true}).check();await page.getByLabel('Pedro',{exact:true}).check();
  await page.getByRole('button',{name:'Salvar equipe'}).click();
  await page.getByRole('heading',{name:'#17 KRT Racing'}).waitFor();
  await page.goto(url('/'));
  race=await get();const team=race.teams[0];const a=race.drivers.find(d=>d.name==='Jonatha');const b=race.drivers.find(d=>d.name==='Pedro');
  await page.getByLabel('Piloto atual',{exact:true}).selectOption(a.id);await page.getByRole('button',{name:'Registrar piloto'}).click();
  await page.getByRole('button',{name:'Iniciar relógio'}).click();
  await post({type:'normalized-laps',laps:Array.from({length:20},(_,i)=>({teamId:team.id,lapNumber:i+1,lapTimeMs:47000+(i%3)*50,raceElapsedMs:(i+1)*47000,position:1,gap:{type:'none'},source:'MANUAL',quality:'MANUAL'}))});
  await page.getByText('47.050 s',{exact:true}).first().waitFor();
  await page.getByRole('button',{name:'Entrar no box',exact:true}).click();
  await page.goto(url('/box'));
  await page.getByLabel('Próximo piloto 17').selectOption(b.id);await page.getByLabel('Kart sorteado').fill('99');
  for(const label of ['Placa conferida','Sensor conferido','Pesagem ≥ 100 kg','Lastro conferido'])await page.getByLabel(label,{exact:true}).check();
  await page.getByRole('button',{name:'Liberar kart e registrar troca'}).waitFor();
  await page.waitForTimeout(6000);await page.getByRole('button',{name:'Liberar kart e registrar troca'}).click();
  race=await get();assert.equal(race.pits[0].valid,true);assert.equal(race.views[0].completedStops,1);assert.equal(race.views[0].driverName,'Pedro');
  await page.reload();await page.getByText('1/3 paradas',{exact:true}).waitFor();
  await page.goto(url('/'));await page.getByText('Pedro',{exact:true}).first().waitFor();
  await page.screenshot({path:'artifacts/cockpit-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/cockpit-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile page overflows');
  await page.setViewportSize({width:1440,height:1000});
  const backup=await (await context.request.get(url('/api/race?export=1'))).json();await writeFile('artifacts/qa-race.json',JSON.stringify(backup,null,2));
  await post({type:'import',text:JSON.stringify(backup),format:'json',replay:true});await post({type:'playback',action:'play',speed:0});
  for(let i=0;i<20;i++){race=await get();if(race.phase==='finished')break;}
  assert.equal(race.phase,'finished');assert.equal(race.pits.filter(p=>p.valid).length,1);assert.equal(race.stints.length,2);
  await post({type:'simulation',teamCount:15,driversPerTeam:3,seed:42,speed:10});
  await post({type:'playback',action:'play',speed:0});
  for(let i=0;i<50;i++){race=await get();if(race.phase==='finished')break;}
  assert.equal(race.phase,'finished');assert.equal(race.teams.length,15);assert.ok(race.totalLaps>1000);assert.ok(race.pits.length>0);
  for(const route of ['/','/setup','/teams','/drivers','/monitoring','/box','/strategy','/analysis','/stints','/history','/replay','/settings','/command','/ipad','/karts']){
    const response=await page.goto(url(route),{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,route);
  }
  await page.goto(url('/strategy'));await page.screenshot({path:'artifacts/strategy-desktop.png',fullPage:true});
  assert.deepEqual(errors,[]);
  await post({type:'simulation',teamCount:15,driversPerTeam:3,seed:42,speed:10});
  await post({type:'playback',action:'play',speed:0});
  for(let i=0;i<3;i++)await get();await post({type:'playback',action:'pause',speed:10});
  console.log(JSON.stringify({status:'passed',prefix,routes:15,assertions:['login','protected-ingestion','driver-crud','team-crud','driver-change','pit-checklist','persistence','desktop','mobile','full-backup-replay','simulation-finish'],browserErrors:errors}));
}finally{await browser.close();}
