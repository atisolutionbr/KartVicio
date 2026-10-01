import type { RaceLap, RaceSession, Source, Quality, LapKind } from "@/domain/race/session";
import { parseGap } from "./gaps";
import { normalizeEntryNumber } from "./entry-number";
import type { TimingProvider, TimingSnapshot } from "./types";

const SOURCES: Source[]=["MANUAL","SIMULATION","REPLAY","LIVE"];
const QUALITIES: Quality[]=["CONFIRMED","ESTIMATED","MANUAL","STALE","INVALID"];
const KINDS: LapKind[]=["normal","pit","in-lap","out-lap","yellow","traffic","incident","invalid","outlier"];
function object(value: unknown): Record<string,unknown> {
  if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error("Registro de volta inválido.");
  return value as Record<string,unknown>;
}
function number(value: unknown, field: string, optional=false): number | undefined {
  if(optional && (value==null||value==="")) return undefined;
  const n=Number(value); if(!Number.isFinite(n)||n<0) throw new Error(`Campo ${field} inválido.`); return n;
}
export function normalizeLap(value: unknown,s: Pick<RaceSession,"id"|"teams">,source: Source="MANUAL"): RaceLap {
  const row=object(value);
  const team=s.teams.find(t=>t.id===row.teamId || normalizeEntryNumber(t.number)===normalizeEntryNumber(String(row.number??row.entryNumber??row.kartNumber??"")));
  if(!team) throw new Error(`Equipe não cadastrada: ${row.teamId??row.number??row.entryNumber??"?"}`);
  const lapNumber=number(row.lapNumber??row.lap,"lapNumber")!;
  if(!Number.isInteger(lapNumber)||lapNumber<1) throw new Error("Número de volta deve ser inteiro positivo.");
  const elapsed=number(row.raceElapsedMs??row.raceElapsed,"raceElapsedMs")!;
  const ms=number(row.lapTimeMs??(row.lapTimeSeconds!=null?Number(row.lapTimeSeconds)*1000:row.lapTime),"lapTimeMs",true)??null;
  const timestamp=number(row.timestamp,"timestamp",true)??elapsed;
  const position=number(row.position,"position",true);
  if(position!=null && (!Number.isInteger(position)||position<1)) throw new Error("Posição deve ser inteiro positivo.");
  const kind=String(row.kind??"normal") as LapKind;
  const quality=String(row.quality??(source==="MANUAL"?"MANUAL":"CONFIRMED")) as Quality;
  const src=String(row.source??source) as Source;
  if(!KINDS.includes(kind)||!QUALITIES.includes(quality)||!SOURCES.includes(src)) throw new Error("Qualidade/origem/tipo de volta inválidos.");
  if(row.pitStatus!=null && row.pitStatus!=="enter"&&row.pitStatus!=="exit") throw new Error("pitStatus inválido.");
  const gap=typeof row.gap==="string"?parseGap(row.gap):row.gap==null?undefined:normalizeGap(row.gap);
  return {raceId:s.id,teamId:team.id,driverId:typeof row.driverId==="string"?row.driverId:undefined,
    kartNumber:row.kartNumber!=null?String(row.kartNumber):undefined,lapNumber,lapTimeMs:ms,
    timestamp,position,raceElapsedMs:elapsed,source:src,quality,kind,
    pitStatus:row.pitStatus as "enter"|"exit"|undefined,gap,
    sourceTimestamp:number(row.sourceTimestamp,"sourceTimestamp",true),
    sectorTimes:Array.isArray(row.sectorTimes)?row.sectorTimes.map(v=>number(v,"sectorTime")!):undefined};
}
function normalizeGap(value: unknown) {
  const g=object(value);
  if(g.type==="none") return {type:"none" as const};
  if(g.type==="time") return {type:"time" as const,ms:number(g.ms,"gap.ms")!,raw:String(g.raw??g.ms)};
  if(g.type==="laps") return {type:"laps" as const,laps:number(g.laps,"gap.laps")!,raw:String(g.raw??g.laps)};
  if(g.type==="other") return {type:"other" as const,raw:String(g.raw??"")};
  throw new Error("Gap inválido.");
}
export function parseCsv(text: string): Record<string,string>[] {
  const rows: string[][]=[]; let row: string[]=[];let cell="";let quoted=false;
  const first=text.split(/\r?\n/)[0]; const separator=first.includes(";")?";":",";
  for(let i=0;i<text.length;i++) {
    const ch=text[i];
    if(ch==='"') { if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted; }
    else if(ch===separator&&!quoted){row.push(cell);cell="";}
    else if(ch==='\n'&&!quoted){row.push(cell.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);row=[];cell="";}
    else cell+=ch;
  }
  if(quoted) throw new Error("CSV contém aspas não fechadas.");
  row.push(cell.replace(/\r$/, ""));if(row.some(Boolean))rows.push(row);
  const headers=(rows.shift()??[]).map(h=>h.replace(/^\uFEFF/,"").trim());
  if(new Set(headers).size!==headers.length) throw new Error("CSV contém colunas duplicadas.");
  return rows.map((r,i)=>{if(r.length!==headers.length)throw new Error(`CSV: quantidade de colunas inválida na linha ${i+2}.`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
}
export function parseRaceFile(text: string,format: "json"|"csv",s: Pick<RaceSession,"id"|"teams">,source: Source="REPLAY"): RaceLap[] {
  const value:unknown=format==="csv"?parseCsv(text):JSON.parse(text);
  const rows=Array.isArray(value)?value:object(value).laps;
  const flat=Array.isArray(rows)?rows:rows&&typeof rows==="object"?Object.values(rows).flat():null;
  if(!flat || !flat.length) throw new Error("Arquivo não contém voltas.");
  if(flat.length>200_000) throw new Error("Limite de 200.000 voltas por arquivo.");
  const laps=flat.map(row=>normalizeLap(row,s,source)).sort((a,b)=>a.raceElapsedMs-b.raceElapsedMs||a.lapNumber-b.lapNumber);
  const seen=new Set<string>(); const last=new Map<string,number>();
  return laps.filter(l=>{const key=`${l.teamId}:${l.lapNumber}`;if(seen.has(key))return false;if(l.lapNumber<=(last.get(l.teamId)??0))throw new Error("Voltas fora de ordem temporal.");seen.add(key);last.set(l.teamId,l.lapNumber);return true;});
}
export class JsonTimingProvider implements TimingProvider {
  private cursor=0;
  constructor(private readonly snapshots: TimingSnapshot[]) {}
  async getSnapshot(){ return this.snapshots[this.cursor++]??null; }
}
export class ManualTimingProvider extends JsonTimingProvider {}
export class ReplayTimingProvider extends JsonTimingProvider {}
export class CsvTimingProvider extends JsonTimingProvider {}
export class AuthorizedApiTimingProvider implements TimingProvider {
  constructor(private readonly read:()=>Promise<TimingSnapshot|null>) {}
  getSnapshot(){return this.read();}
}
export class WebSocketTimingProvider implements TimingProvider {
  private latest: TimingSnapshot|null=null;
  receive(snapshot: TimingSnapshot){this.latest=snapshot;}
  async getSnapshot(){const latest=this.latest;this.latest=null;return latest;}
}
export class AuthorizedLapTimeProvider implements TimingProvider {
  async getSnapshot():Promise<TimingSnapshot|null>{throw new Error("LapTime requer autorização escrita e documentação oficial de API. Integração desativada.");}
}
export function validateSnapshot(value: unknown): TimingSnapshot {
  const s=object(value);
  if(!Array.isArray(s.entries)||s.entries.length>1000)throw new Error("Snapshot inválido.");
  if(!["unknown","green","yellow","red","checkered"].includes(String(s.flag)))throw new Error("Bandeira inválida.");
  const entries=s.entries.map(value=>{const e=object(value);const position=number(e.position,"position")!;const lapCount=number(e.lapCount,"lapCount")!;
    if(!Number.isInteger(position)||position<1||!Number.isInteger(lapCount))throw new Error("Posição/voltas inválidas.");
    const entryNumber=normalizeEntryNumber(String(e.entryNumber??""));if(!entryNumber)throw new Error("Número da equipe inválido.");
    return {position,entryNumber,displayName:String(e.displayName??entryNumber).slice(0,200),lapCount,
      lastLapMs:number(e.lastLapMs,"lastLapMs",true)??null,bestLapMs:number(e.bestLapMs,"bestLapMs",true)??null,
      bestLapNumber:number(e.bestLapNumber,"bestLapNumber",true)??null,gapToLeader:normalizeGap(e.gapToLeader??{type:"other",raw:""}),gapToNext:normalizeGap(e.gapToNext??{type:"other",raw:""}),state:typeof e.state==="string"?e.state:undefined};});
  if(new Set(entries.map(e=>e.entryNumber)).size!==entries.length)throw new Error("Snapshot contém números duplicados.");
  return {capturedAtMs:number(s.capturedAtMs,"capturedAtMs")!,raceClockMs:number(s.raceClockMs,"raceClockMs",true)??null,flag:s.flag as TimingSnapshot["flag"],entries};
}
