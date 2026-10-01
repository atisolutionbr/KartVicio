import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptySession, type RaceSession, type RaceLap, type PlaybackAction } from "@/domain/race/session";
import { applyCommand, ingestLap, recordEvent, type RaceCommand } from "@/domain/race/engine";
import { connection, teamViews, pitScenarios, battle } from "@/domain/strategy/endurance";
import { simulateRace } from "@/domain/timing/simulation";
import { parseRaceFile, normalizeLap, validateSnapshot } from "@/domain/timing/providers";
import type { TimingSnapshot } from "@/domain/timing/types";
import { raceAnalytics, invalidateMetrics } from "@/domain/race/analytics";

const directory=path.resolve(/* turbopackIgnore: true */ process.env.KART_DATA_DIR??path.join(process.cwd(),"data","race-control"));
type Store={session:RaceSession|null;queue:Promise<unknown>;savedRevision:number;lastSaveMs?:number};
const globalStore=globalThis as typeof globalThis&{__kartRaceStore?:Store};
const store=globalStore.__kartRaceStore??{session:null,queue:Promise.resolve(),savedRevision:-1};
globalStore.__kartRaceStore=store;
export type Operation=RaceCommand
  | {type:"simulation";teamCount:number;driversPerTeam:number;seed:number;speed:number}
  | {type:"import";text:string;format:"json"|"csv";replay:boolean}
  | {type:"playback";action:"play"|"pause"|"speed";speed?:number}
  | {type:"normalized-laps";laps:unknown[]}
  | {type:"snapshot";snapshot:unknown}
  | {type:"restore";session:RaceSession};
function exclusive<T>(fn:()=>Promise<T>):Promise<T> {
  const job=store.queue.then(fn,fn);store.queue=job.then(()=>undefined,()=>undefined);return job;
}
async function load():Promise<RaceSession> {
  if(store.session)return store.session;
  try { const raw=JSON.parse(await readFile(path.join(directory,"session.json"),"utf8")) as RaceSession;
    if(raw.version!==1||!raw.config||!Array.isArray(raw.teams))throw new Error("Formato de sessão desconhecido.");
    store.session=raw;store.savedRevision=raw.revision;
    // Resume clock from persisted anchors; playback resumes from the last persisted cursor to avoid lost events.
    if(raw.playback){raw.playback.anchorWallMs=Date.now();raw.playback.anchorRaceMs=raw.elapsedMs;}
    return raw;
  } catch(error) {
    if((error as NodeJS.ErrnoException).code!=="ENOENT")throw new Error("Falha ao ler a sessão persistida. Preserve o arquivo e restaure um backup.");
    store.session=emptySession();return store.session;
  }
}
async function save(s:RaceSession,force=false) {
  if(s.revision===store.savedRevision)return;
  if(!force&&Date.now()-(store.lastSaveMs??0)<5000)return;
  await mkdir(directory,{recursive:true});const target=path.join(directory,"session.json");
  await writeFile(target+".tmp",JSON.stringify(s),{mode:0o600});await rename(target+".tmp",target);
  store.savedRevision=s.revision;store.lastSaveMs=Date.now();
}
function tick(s:RaceSession,now:number) {
  try { advancePlayback(s,now); } catch(error) {
    if(!s.playback) throw error;
    s.playback.running=false; s.phase="paused";
    recordEvent(s,"PLAYBACK_FAILED",`Replay pausado: ${error instanceof Error ? error.message : "Evento inválido"}`,undefined,"CRÍTICO"); s.revision++;
  }
}
function advancePlayback(s:RaceSession,now:number) {
  const playback=s.playback;
  if(playback?.running) {
    const target=playback.speed===0?Infinity:playback.anchorRaceMs+(now-playback.anchorWallMs)*playback.speed;
    let processed=0;
    const actions=playback.actions??[];playback.actionCursor??=0;
    while(processed<2000) {
      const nextLap=playback.laps[playback.cursor];const nextAction=actions[playback.actionCursor];
      if(nextAction&&nextAction.atMs<=(nextLap?.raceElapsedMs??Infinity)&&nextAction.atMs<=target){
        s.elapsedMs=Math.max(s.elapsedMs,nextAction.atMs);
        if(nextAction.type==="driver") {
          if(!s.pits.some(p=>p.teamId===nextAction.teamId&&p.exitMs==null))applyCommand(s,{type:"driver-change",teamId:nextAction.teamId,driverId:nextAction.driverId!},now);
        } else if(nextAction.type==="pit-enter")applyCommand(s,{type:"pit-enter",teamId:nextAction.teamId},now);
        else applyCommand(s,{type:"pit-exit",teamId:nextAction.teamId,driverId:nextAction.driverId!,kart:nextAction.kart!,checks:nextAction.checks!},now);
        playback.actionCursor++;processed++;
      } else if(nextLap&&nextLap.raceElapsedMs<=target){ingestLap(s,nextLap,now);playback.cursor++;processed++;}
      else break;
    }
    if(processed){s.revision++;}
    if(playback.cursor===playback.laps.length&&playback.actionCursor===actions.length){playback.running=false;s.phase="finished";recordEvent(s,"RACE_FINISHED","Replay/simulação concluído.");
      s.stints.forEach(x=>{if(x.endMs==null){x.endMs=s.elapsedMs;x.endLap=s.laps[x.teamId]?.at(-1)?.lapNumber;x.endPosition=s.laps[x.teamId]?.at(-1)?.position;}});s.revision++;}
  } else if(s.phase==="running"&&s.source==="MANUAL") {
    const elapsed=Math.min(s.config.durationMs,s.clockAnchorRaceMs+Math.max(0,now-s.clockAnchorWallMs));
    if(elapsed>s.elapsedMs){s.elapsedMs=elapsed;s.revision++;}
    if(elapsed>=s.config.durationMs)applyCommand(s,{type:"clock",action:"finish"},now);
  }
}
function alert(s:RaceSession,now:number) {
  for(const view of teamViews(s,now)) {
    const r=view.recommendation;
    if(["CONTINUAR","CALCULANDO","PROVA ENCERRADA","NO BOX"].includes(r.action))continue;
    const key=`${view.team.id}:${r.action}:${r.rule}`;
    if(now-(s.lastAlerts[key]??0)<s.config.thresholds.alertCooldownMs)continue;
    s.lastAlerts[key]=now;
    recordEvent(s,"ALERT",`${r.action}: ${r.reason}`,view.team.id,r.action.includes("AGORA")||r.action.includes("INVIÁVEL")?"CRÍTICO":"ATENÇÃO",r.rule);s.revision++;
  }
}
function view(s:RaceSession,now:number) {
  const teams=teamViews(s,now);const selected=teams.find(x=>x.team.id===s.selectedTeamId);
  const rivals=selected?teams.filter(x=>x.team.id!==selected.team.id):[];
  const ahead=selected?.position!=null?rivals.filter(x=>x.position!=null&&x.position<selected.position!).at(-1):undefined;
  const behind=selected?.position!=null?rivals.find(x=>x.position!=null&&x.position>selected.position!):undefined;
  const {playback,laps,...state}=s;
  return {...state,laps:Object.fromEntries(Object.entries(laps).map(([id,list])=>[id,list.slice(-200)])),
    events:s.events.slice(-300),views:teams,scenarios:selected?pitScenarios(s,teams,selected.team.id):[],
    battle:{ahead:selected?battle(selected,ahead):null,behind:selected?battle(selected,behind):null},
    connection:connection(s,now),serverTimeMs:now,totalLaps:Object.values(laps).reduce((sum,list)=>sum+list.length,0),
    analytics:raceAnalytics(s),playback:playback?{cursor:playback.cursor,total:playback.laps.length,speed:playback.speed,running:playback.running}:null};
}
export type RaceView=ReturnType<typeof view>;
export function readRace(){return exclusive(async()=>{const s=await load();const now=Date.now();tick(s,now);alert(s,now);await save(s);return view(s,now);});}
export function exportRace(){return exclusive(async()=>{const s=await load();tick(s,Date.now());await save(s,true);return structuredClone(s);});}
function playback(s:RaceSession,laps:RaceLap[],speed:number,source:"SIMULATION"|"REPLAY",now:number) {
  applyCommand(s,{type:"reset"},now);s.source=source;s.phase="paused";
  s.playback={laps:laps.map(l=>({...l,source})),cursor:0,speed,running:false,anchorWallMs:now,anchorRaceMs:0};
  recordEvent(s,"PROVIDER_CHANGED",`Fonte alterada para ${source}.`);s.revision++;
}
export function operateRace(op:Operation,expectedRevision?:number) {
  return exclusive(async()=>{
    const current=await load();
    // Mutations operate on a copy: a failed multi-step action never leaks partial data into memory/disk.
    if(expectedRevision!=null && expectedRevision!==current.revision)throw new Error("A sessão mudou em outra tela. Atualize e tente novamente.");
    const s=structuredClone(current);const now=Date.now();tick(s,now);
    switch(op.type) {
      case "simulation": {
        if(!Number.isInteger(op.teamCount)||!Number.isInteger(op.driversPerTeam)||!Number.isFinite(op.seed)||!Number.isFinite(op.speed)||op.speed<0)throw new Error("Parâmetros da simulação inválidos.");
        const generated=simulateRace(s.config,op.teamCount,op.driversPerTeam,op.seed);
        s.teams=generated.teams;s.drivers=generated.drivers;s.selectedTeamId=s.teams[0].id;
        playback(s,generated.laps,op.speed,"SIMULATION",now);break;
      }
      case "import": {
        let actions:PlaybackAction[]=[];
        if(op.format==="json") {
          const document=JSON.parse(op.text);
          if(document&&!Array.isArray(document)&&Array.isArray(document.teams)&&Array.isArray(document.drivers)&&document.config) {
            applyCommand(s,{type:"configure",config:document.config},now);
            applyCommand(s,{type:"reset"},now);s.teams=[];s.drivers=[];
            for(const driver of document.drivers)applyCommand(s,{type:"driver-save",driver},now);
            for(const team of document.teams)applyCommand(s,{type:"team-save",team},now);
            s.selectedTeamId=document.selectedTeamId??s.teams[0]?.id??null;
            if(op.replay) {
              for (const team of s.teams) {
                const firstPit = (document.pits ?? []).filter((p: RaceSession["pits"][number]) => p.teamId === team.id).sort((a: RaceSession["pits"][number], b: RaceSession["pits"][number]) => a.enterMs - b.enterMs)[0];
                const firstLap = (document.laps?.[team.id] ?? []).find((l: RaceLap) => l.kartNumber);
                if (firstPit?.oldKart) team.kart = firstPit.oldKart; else if(firstLap?.kartNumber) team.kart = firstLap.kartNumber;
              }
              actions=(document.stints??[]).map((stint:RaceSession["stints"][number])=>({atMs:stint.startMs,type:"driver" as const,teamId:stint.teamId,driverId:stint.driverId}));
              for(const pit of document.pits??[]) {
                actions.push({atMs:pit.enterMs,type:"pit-enter",teamId:pit.teamId});
                if(pit.exitMs!=null&&pit.valid&&pit.nextDriverId&&pit.newKart)actions.push({atMs:pit.exitMs,type:"pit-exit",teamId:pit.teamId,driverId:pit.nextDriverId,kart:pit.newKart,checks:pit.checks});
              }
              // Laps with explicit pit transitions already recreate their own stops.
              const transitionTeams=new Set(Object.values(document.laps??{}).flat().filter((l)=>l&&typeof l==="object"&&"pitStatus" in l&&l.pitStatus).map(l=>(l as RaceLap).teamId));
              actions=actions.filter(a=>a.type==="driver"||!transitionTeams.has(a.teamId)).sort((a,b)=>a.atMs-b.atMs);
            }
          }
        }
        const laps=parseRaceFile(op.text,op.format,s,op.replay?"REPLAY":"MANUAL");
        if(op.replay){playback(s,laps,1,"REPLAY",now);s.playback!.actions=actions;s.playback!.actionCursor=0;}
        else {applyCommand(s,{type:"laps",laps},now);s.phase="paused";}break;
      }
      case "normalized-laps": {
        if(!Array.isArray(op.laps)||op.laps.length>2000)throw new Error("Envie no máximo 2000 voltas por lote.");
        if(s.playback?.running)throw new Error("Pause o replay antes de receber outra fonte.");
        const laps=op.laps.map(l=>normalizeLap(l,s,"LIVE"));applyCommand(s,{type:"laps",laps},now);
        if(s.source==="MANUAL"){s.clockAnchorWallMs=now;s.clockAnchorRaceMs=s.elapsedMs;}break;
      }
      case "snapshot": ingestSnapshot(s,validateSnapshot(op.snapshot),now);break;
      case "playback": {
        const p=s.playback;if(!p)throw new Error("Carregue um replay ou simulação.");
        if(op.speed!=null){if(![0,1,2,5,10,60].includes(op.speed))throw new Error("Velocidade inválida.");p.speed=op.speed;}
        if(op.action==="play"){p.running=true;s.phase="running";}
        if(op.action==="pause"){p.running=false;s.phase="paused";}
        p.anchorWallMs=now;p.anchorRaceMs=s.elapsedMs;s.revision++;break;
      }
      case "restore": {
        const restored=op.session;
        if(restored.version!==1||!Array.isArray(restored.teams)||!Array.isArray(restored.drivers)||!restored.config||!restored.laps||!Array.isArray(restored.stints)||!Array.isArray(restored.pits)||!Array.isArray(restored.events))throw new Error("Backup inválido.");
        const checked=emptySession(restored.id);applyCommand(checked,{type:"configure",config:restored.config});
        restored.drivers.forEach(driver=>applyCommand(checked,{type:"driver-save",driver}));restored.teams.forEach(team=>applyCommand(checked,{type:"team-save",team}));
        const all=Object.values(restored.laps).flat();if(all.length>200_000)throw new Error("Backup excede o limite de voltas.");
        all.forEach(l=>normalizeLap(l,checked,l.source));
        Object.assign(s,structuredClone(restored));s.revision=current.revision+1;s.phase="paused";if(s.playback)s.playback.running=false;
        invalidateMetrics();
        recordEvent(s,"BACKUP_RESTORED","Backup restaurado com relógio pausado.");break;
      }
      default: applyCommand(s,op,now);
    }
    alert(s,now);await save(s,true);store.session=s;return view(s,now);
  });
}
function ingestSnapshot(s:RaceSession,snapshot:TimingSnapshot,now:number) {
  if(s.playback?.running)throw new Error("Pause o replay antes de receber timing ao vivo.");
  if(s.latestSnapshot&&snapshot.capturedAtMs<=s.latestSnapshot.capturedAtMs)return;
  if(snapshot.raceClockMs==null)throw new Error("Informe o relógio de corrida; o sistema não inventa tempo decorrido.");
  for(const entry of snapshot.entries) {
    let team=s.teams.find(t=>t.number===entry.entryNumber);
    if(!team){
      if(s.teams.length>=s.config.maxTeams)throw new Error("Snapshot excede o limite de equipes.");
      team={id:`timing-${entry.entryNumber}`,number:entry.entryNumber,name:entry.displayName,kart:entry.entryNumber,category:"",driverIds:[],role:"support"};s.teams.push(team);
    }
    const prior=s.laps[team.id]?.at(-1)?.lapNumber??0;
    if(entry.lapCount>prior)ingestLap(s,{raceId:s.id,teamId:team.id,lapNumber:entry.lapCount,lapTimeMs:entry.lastLapMs,
      timestamp:snapshot.capturedAtMs,position:entry.position,gap:entry.gapToLeader,raceElapsedMs:snapshot.raceClockMs,
      source:"LIVE",quality:"CONFIRMED",kind:snapshot.flag==="yellow"?"yellow":"normal",sourceTimestamp:snapshot.capturedAtMs},now);
  }
  s.latestSnapshot=snapshot;s.elapsedMs=Math.max(s.elapsedMs,snapshot.raceClockMs);s.lastReceivedMs=now;s.source="LIVE";s.revision++;
}
export function snapshotFromView(v:RaceView):TimingSnapshot {
  return {capturedAtMs:v.serverTimeMs,raceClockMs:v.elapsedMs,flag:v.phase==="finished"?"checkered":"unknown",
    entries:v.views.filter(x=>x.position!=null).map(x=>({position:x.position!,entryNumber:x.team.number,displayName:x.team.name,
      lapCount:x.lapCount,lastLapMs:x.lastLapMs,bestLapMs:x.pace.bestMs,bestLapNumber:null,
      gapToLeader:x.gapMs==null?{type:"other",raw:x.gapLabel}:x.gapMs===0?{type:"none"}:{type:"time",ms:x.gapMs,raw:x.gapLabel},gapToNext:{type:"other",raw:""}}))};
}
