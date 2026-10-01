import type { RaceSession, RaceTeam } from "@/domain/race/session";
import { activePit, activeStint, driverTime } from "@/domain/race/engine";
import { getPitWindowStatus } from "@/domain/race/rules";
import { performance, type Performance } from "@/domain/pace/performance";
import { median } from "./analysis";
import { legalPlan } from "./legal-plan";
import { teamMetrics } from "@/domain/race/analytics";

export type DriverObligation = {id:string;name:string;timeMs:number;remainingMinimumMs:number;availableMs:number;remainingStints:number;pace:Performance};
export type TeamView = {
  team:RaceTeam;position:number|null;lapCount:number;lastLapMs:number|null;gapMs:number|null;gapLabel:string;
  pace:Performance;stintPace:Performance;stint:ReturnType<typeof activeStint>;pit:ReturnType<typeof activePit>;
  stintElapsedMs:number;completedStops:number;remainingStops:number;totalPitMs:number;penaltyLaps:number;
  driverName:string;nextDriverId:string|null;obligations:DriverObligation[];
  classification:string;paceDeltaMs:number|null;recommendation:Recommendation;
};
export type Recommendation = {action:string;confidence:number;reason:string;rule:string;metrics:Record<string,number|null>;window:string};
export function connection(s:RaceSession,now:number) {
  if(s.source==="REPLAY"||s.source==="SIMULATION")return s.source;
  if(s.source==="MANUAL")return "MANUAL";
  if(s.lastReceivedMs==null)return "DISCONNECTED";
  return now-s.lastReceivedMs>s.config.thresholds.staleMs?"DELAYED":"LIVE";
}
export function teamViews(s:RaceSession,now=Date.now()):TeamView[] {
  const t=s.config.thresholds;
  const snapshot=s.latestSnapshot;
  const views:TeamView[]=s.teams.map(team=>{
    const laps=s.laps[team.id]??[];const last=laps.at(-1);const stint=activeStint(s,team.id);const pit=activePit(s,team.id);
    const timing=snapshot?.entries.find(x=>x.entryNumber===team.number);
    const metrics=teamMetrics(s,team.id);const pace=metrics.recent;
    const stintPace=stint?metrics.stints.get(stint.id)??performance([],t):performance([],t);
    const pits=s.pits.filter(p=>p.teamId===team.id&&p.exitMs!=null);
    const completed=pits.filter(p=>p.valid).length;
    const gap=timing?.gapToLeader??last?.gap;
    const position=timing?.position??last?.position??null;
    const gapMs=position===1?0:gap?.type==="time"?gap.ms:null;
    const gapLabel=gap?.type==="laps"?`+${gap.laps} v`:gapMs!=null?`+${(gapMs/1000).toFixed(2)} s`:"Dados insuficientes";
    const obligations=team.driverIds.map(id=>{const driver=s.drivers.find(d=>d.id===id)!;const timeMs=driverTime(s,id);
      const count=s.stints.filter(x=>x.driverId===id).length;
      return {id,name:driver.name,timeMs,remainingMinimumMs:Math.max(0,(driver.minimumMs??s.config.driverMinimumMs)-timeMs),
        availableMs:Math.max(0,(driver.maximumMs??s.config.driverMaximumMs)-timeMs),remainingStints:Math.max(0,(driver.minimumStints??s.config.driverMinimumStints)-count),
        pace:metrics.drivers.get(id)??performance([],t)};});
    const available=obligations.filter(o=>o.id!==stint?.driverId&&o.availableMs>=s.config.stintMinimumMs&&!s.stints.some(x=>x.driverId===o.id&&x.endMs==null)&&s.drivers.find(d=>d.id===o.id)?.active!==false);
    available.sort((a,b)=>{
      if(a.remainingMinimumMs!==b.remainingMinimumMs)return b.remainingMinimumMs-a.remainingMinimumMs;
      if(a.remainingStints!==b.remainingStints)return b.remainingStints-a.remainingStints;
      if(s.strategyMode==="participation")return a.timeMs-b.timeMs;
      return (a.pace.paceMs??Infinity)-(b.pace.paceMs??Infinity)||a.timeMs-b.timeMs;
    });
    return {team,position,lapCount:timing?.lapCount??last?.lapNumber??0,lastLapMs:timing?.lastLapMs??last?.lapTimeMs??null,gapMs,gapLabel,
      pace,stintPace,stint,pit,stintElapsedMs:stint?Math.max(0,s.elapsedMs-stint.startMs):0,completedStops:completed,
      remainingStops:Math.max(0,s.config.mandatoryStops-completed),totalPitMs:pits.reduce((sum,p)=>sum+(p.durationMs??0),0),
      penaltyLaps:pits.reduce((sum,p)=>sum+p.penaltyLaps,0),driverName:s.drivers.find(d=>d.id===stint?.driverId)?.name??"Selecione o piloto",
      nextDriverId:available[0]?.id??null,obligations,classification:"Dados insuficientes",paceDeltaMs:null,
      recommendation:{action:"CALCULANDO",confidence:0,reason:"Dados insuficientes.",rule:"minimumSamples",metrics:{},window:"MUITO CEDO"}};
  });
  for(const v of views) {
    const nearby=views.filter(x=>x.team.id!==v.team.id&&x.position!=null&&v.position!=null&&Math.abs(x.position-v.position)<=2);
    const ref=median(nearby.map(x=>x.pace.last5Ms));
    const pace=v.stintPace.last5Ms;
    v.paceDeltaMs=pace!=null&&ref!=null?pace-ref:null;
    const delta=v.paceDeltaMs;
    v.classification=delta==null?"Dados insuficientes":delta < -t.paceAcceptableMs?"EXCELENTE":delta<=0?"BOM":delta<=t.paceAcceptableMs?"ACEITÁVEL":delta<t.paceCriticalMs?"ATENÇÃO":"RUIM";
    v.recommendation=recommend(s,v,connection(s,now));
  }
  return views.sort((a,b)=>(a.position??Infinity)-(b.position??Infinity));
}
function recommend(s:RaceSession,v:TeamView,status:string):Recommendation {
  const c=s.config;const t=c.thresholds;const remaining=Math.max(0,c.durationMs-s.elapsedMs);
  const stintLeft=c.stintMaximumMs-v.stintElapsedMs;
  const pitWindow=getPitWindowStatus(s.elapsedMs,c);
  const windowRemaining=c.durationMs-c.pitCloseBeforeEndMs-s.elapsedMs;
  const stopCost=c.stopMinimumMs+c.pitLossMs+c.driverChangeMs;
  const obligations=v.obligations.reduce((sum,o)=>sum+o.remainingMinimumMs,0);
  const degree=v.stintPace.degradationMs;
  const metrics={stintElapsedMs:v.stintElapsedMs,stintLimitMs:c.stintMaximumMs,paceDeltaMs:v.paceDeltaMs,
    degradationMs:degree,remainingStops:v.remainingStops,windowRemainingMs:windowRemaining,mandatoryDriverMs:obligations};
  const result=(action:string,reason:string,rule:string,window:string,confidence=.9):Recommendation=>({action,reason,rule,window,confidence,metrics});
  if(s.phase==="finished")return result("PROVA ENCERRADA","Análises históricas disponíveis.","phase","ENCERRADO",1);
  if(v.pit)return result("NO BOX","Conclua o tempo mínimo, troca e checklist para liberar.","pit-active","OBRIGATÓRIO",1);
  if(status==="DELAYED"||status==="DISCONNECTED")return result("DADOS ATRASADOS","Cronometragem sem atualização; recomendações de ritmo suspensas.","staleMs","ATENÇÃO",0);
  if(!v.stint)return result("SELECIONAR PILOTO","Informe o piloto atual para controlar o stint.","active-driver","ATENÇÃO",0);
  if(stintLeft<=0)return result("BOX AGORA",pitWindow==="open"?"Limite regulamentar do stint atingido.":"Limite do stint atingido e box fechado; intervenção do chefe necessária.","stintMaximumMs","OBRIGATÓRIO",1);
  if(v.obligations.find(o=>o.id===v.stint?.driverId)?.availableMs===0)return result("BOX AGORA","Piloto atingiu seu tempo máximo acumulado.","driverMaximumMs","OBRIGATÓRIO",1);
  if(obligations>remaining-v.remainingStops*stopCost)return result("ESTRATÉGIA INVIÁVEL","Tempo restante insuficiente para mínimos dos pilotos e paradas. Revise o plano.","driverMinimumMs","OBRIGATÓRIO",1);
  if(v.remainingStops>0 && windowRemaining<v.remainingStops*stopCost+(v.remainingStops-1)*c.stintMinimumMs)return result("ESTRATÉGIA INVIÁVEL","Janela não comporta todas as paradas restantes.","mandatoryStops","OBRIGATÓRIO",1);
  if(pitWindow!=="open")return result("EVITAR BOX AGORA",pitWindow==="closed"?"Janela regulamentar de box encerrada.":"Pit lane ainda não abriu.","pit-window","MUITO CEDO",1);
  if(v.stintElapsedMs<c.stintMinimumMs)return result("CONTINUAR","Stint mínimo ainda não cumprido.","stintMinimumMs","MUITO CEDO",1);
  const pace=v.stintPace.last5Ms??v.pace.last5Ms;
  if(pace && stintLeft<=pace)return result("BOX PRÓXIMA VOLTA","A próxima volta aproxima o limite do stint.","stintMaximumMs","OBRIGATÓRIO",1);
  if(pace && stintLeft<=3*pace)return result("BOX EM 3 VOLTAS","Limite regulamentar próximo.","stintMaximumMs","ATENÇÃO",1);
  if(pace && stintLeft<=5*pace)return result("BOX EM 5 VOLTAS","Prepare a troca antes do limite regulamentar.","stintMaximumMs","ATENÇÃO",1);
  if(v.remainingStops>0 && windowRemaining<=v.remainingStops*stopCost+Math.max(t.pitWarningMs,(v.remainingStops-1)*c.stintMinimumMs))return result("BOX AGORA","É necessário reservar tempo para todas as paradas restantes.","mandatoryStops","OBRIGATÓRIO",1);
  if(stintLeft<=t.pitWarningMs)return result("PREPARAR BOX","Stint próximo do limite regulamentar.","pitWarningMs","ATENÇÃO",1);
  if(v.stintPace.validCount<t.minimumSamples)return result("CALCULANDO","Amostras válidas do piloto neste stint são insuficientes para análise de ritmo.","minimumSamples","MUITO CEDO",.2);
  const confidence=s.source==="MANUAL"?.65:s.source==="SIMULATION"?.75:.85;
  if(degree!=null&&degree>=t.degradationCriticalMs)return result("BOX PRÓXIMA VOLTA","Tendência de degradação supera o limite crítico; confirme próximo piloto.","degradationCriticalMs","IDEAL",confidence);
  if((degree??0)>=t.degradationWarningMs||(v.paceDeltaMs??0)>=t.paceWarningMs)return result("PREPARAR BOX","Degradação ou delta de ritmo ultrapassou a tolerância configurada.","degradationWarningMs / paceWarningMs","ATENÇÃO",confidence);
  if((v.stintPace.madMs??0)>t.consistencyMs)return result("PREPARAR BOX","Dispersão robusta das voltas excede a tolerância de consistência. Avalie tráfego e fadiga.","consistencyMs","ATENÇÃO",confidence);
  return result("CONTINUAR","Ritmo competitivo dentro dos thresholds; limites regulamentares preservados.","paceAcceptableMs","IDEAL",confidence);
}
export function battle(me:TeamView,other:TeamView|undefined) {
  if(!other)return null;
  const gap=me.gapMs!=null&&other.gapMs!=null?Math.abs(me.gapMs-other.gapMs):null;
  const gain=me.pace.last5Ms!=null&&other.pace.last5Ms!=null?other.pace.last5Ms-me.pace.last5Ms:null;
  return {teamId:other.team.id,name:other.team.name,position:other.position,gapMs:gap,gainMs:gain,
    catchLaps:gap!=null&&gain!=null&&gain>0?Math.ceil(gap/gain):null};
}
export function pitScenarios(s:RaceSession,views:TeamView[],teamId:string) {
  const me=views.find(v=>v.team.id===teamId); if(!me)return [];
  const current=me.pace.last5Ms;const remaining=s.config.durationMs-s.elapsedMs;
  const cost=s.config.stopMinimumMs+s.config.pitLossMs+s.config.driverChangeMs;
  const options=[0,5,10].flatMap(waitLaps=>me.obligations.filter(d=>d.id!==me.stint?.driverId&&s.drivers.find(x=>x.id===d.id)?.active!==false).map(d=>{
    const nextPace=d.pace.paceMs;const waitMs=current!=null?waitLaps*current:null;
    const totalPitDebt=Math.max(1,me.remainingStops)*cost;
    const timed=waitMs!=null&&nextPace!=null&&current!=null;
    const plan=waitMs!=null?legalPlan(s,me,d.id,waitMs):null;
    const laps=timed&&plan?.addedLaps!=null?waitLaps+plan.addedLaps:null;
    const violations:string[]=[];
    if(plan)violations.push(...plan.violations);
    if(!me.stint)violations.push("Piloto atual não definido");
    if(waitMs==null)violations.push("Dados de ritmo insuficientes");
    if(waitMs!=null && me.stintElapsedMs+waitMs<s.config.stintMinimumMs)violations.push("Stint mínimo");
    if(waitMs!=null && me.stintElapsedMs+waitMs>s.config.stintMaximumMs)violations.push("Stint máximo");
    if(waitMs!=null && getPitWindowStatus(s.elapsedMs+waitMs,s.config)!=="open")violations.push("Fora da janela de box");
    if(s.stints.some(x=>x.driverId===d.id&&x.endMs==null))violations.push("Piloto já está em pista");
    if(d.availableMs<s.config.stintMinimumMs)violations.push("Piloto sem tempo disponível");
    const minNeed=me.obligations.reduce((sum,o)=>sum+Math.max(0,o.remainingMinimumMs-(o.id===me.stint?.driverId?(waitMs??0):0)),0);
    const rest=Math.max(0,remaining-(waitMs??0)-totalPitDebt);
    if(minNeed>rest)violations.push("Tempos mínimos inviáveis");
    if(me.obligations.some(o=>o.remainingStints>0) && rest<me.obligations.reduce((sum,o)=>sum+o.remainingStints*s.config.stintMinimumMs,0))violations.push("Stints mínimos inviáveis");
    const myProgress=laps==null?null:me.lapCount+laps-me.penaltyLaps;
    const otherProjections=views.filter(v=>v.team.id!==teamId).map(v=>v.pace.paceMs==null?null:v.lapCount-v.penaltyLaps+Math.max(0,remaining-v.remainingStops*cost)/v.pace.paceMs);
    const enough=otherProjections.every(x=>x!=null);
    const finish=myProgress!=null&&enough?1+otherProjections.filter(x=>x!>myProgress).length:null;
    const currentGap=me.gapMs;
    const returnPosition=currentGap==null||views.some(v=>v.gapMs==null)?null:1+views.filter(v=>v.team.id!==teamId&&v.gapMs!<currentGap+cost+(waitMs??0)*((current??1)-(v.pace.last5Ms??current??1))/(current??1)).length;
    const traffic=currentGap==null?"Dados insuficientes":views.some(v=>v.team.id!==teamId&&v.gapMs!=null&&Math.abs(v.gapMs-(currentGap+cost))<s.config.thresholds.trafficGapMs)?"ALTO":"BAIXO";
    return {waitLaps,driverId:d.id,driverName:d.name,expectedPaceMs:nextPace,pitLossMs:cost,finishPosition:finish,plan:plan?.stints??[],plannedPitCount:plan?.pitCount??me.remainingStops,
      returnPosition,traffic,legal:violations.length===0,violations,projectedLaps:myProgress,
      interval:finish==null?null:[Math.max(1,finish-1),Math.min(views.length,finish+2)],cut:nextPace==null||current==null?"SEM VANTAGEM CLARA":nextPace<current?"UNDERCUT POSSÍVEL":"OVERCUT POSSÍVEL"};
  }));
  return options.sort((a,b)=>Number(b.legal)-Number(a.legal)||(b.projectedLaps??-Infinity)-(a.projectedLaps??-Infinity));
}
