import type { RaceSession } from "@/domain/race/session";
import type { TeamView } from "./endurance";
export type PlannedStint={driverId:string;driverName:string;durationMs:number;paceMs:number|null};
/** Bounded deterministic search. Every returned plan satisfies the represented time/stint constraints. */
export function legalPlan(s:RaceSession,me:TeamView,firstDriverId:string,waitMs:number):{stints:PlannedStint[];violations:string[];addedLaps:number|null;pitCount:number} {
  const c=s.config;const remaining=c.durationMs-s.elapsedMs-waitMs;
  const obligations=me.obligations.map(o=>({...o,remainingMinimumMs:Math.max(0,o.remainingMinimumMs-(o.id===me.stint?.driverId?waitMs:0)),availableMs:Math.max(0,o.availableMs-(o.id===me.stint?.driverId?waitMs:0))}));
  const neededStints=obligations.reduce((sum,o)=>sum+o.remainingStints,0);
  const pitCount=Math.max(1,me.remainingStops,neededStints);
  const pitCost=c.stopMinimumMs+c.pitLossMs+c.driverChangeMs;
  const driveTime=remaining-pitCount*pitCost;
  const violations:string[]=[];
  if(pitCount>16)violations.push("Planejamento limitado a 16 stints futuros");
  if(driveTime<=0||driveTime<pitCount*c.stintMinimumMs||driveTime>pitCount*c.stintMaximumMs)violations.push("Tempo restante incompatível com limites dos stints");
  if(remaining-c.pitCloseBeforeEndMs<pitCount*pitCost+(pitCount-1)*c.stintMinimumMs)violations.push("Janela não comporta paradas futuras");
  const candidates=obligations.filter(o=>s.drivers.find(d=>d.id===o.id)?.active!==false&&!s.stints.some(st=>st.driverId===o.id&&st.endMs==null&&st.teamId!==me.team.id));
  if(obligations.reduce((sum,o)=>sum+o.remainingMinimumMs,0)>driveTime)violations.push("Tempos mínimos dos pilotos inviáveis");
  if(violations.length)return {stints:[],violations,addedLaps:null,pitCount};
  let visited=0;
  const search=(slots:number,left:number,previous:string|undefined,used:Map<string,number>,counts:Map<string,number>,plan:PlannedStint[]):PlannedStint[]|null=>{
    if(++visited>5000)return null;
    if(!slots){if(left>1)return null;return obligations.every(o=>(used.get(o.id)??0)+1>=o.remainingMinimumMs&&(counts.get(o.id)??0)>=o.remainingStints)?plan:null;}
    const pool=(plan.length?candidates:candidates.filter(o=>o.id===firstDriverId)).filter(o=>!c.requireDriverChange||o.id!==previous).sort((a,b)=>(b.remainingMinimumMs-(used.get(b.id)??0))-(a.remainingMinimumMs-(used.get(a.id)??0)));
    for(const driver of pool){
      const capacity=driver.availableMs-(used.get(driver.id)??0);
      const maximum=Math.min(c.stintMaximumMs,capacity,left-(slots-1)*c.stintMinimumMs);
      const minimum=Math.max(1,c.stintMinimumMs,left-(slots-1)*c.stintMaximumMs);
      if(maximum<minimum)continue;
      const needs=Math.max(0,driver.remainingMinimumMs-(used.get(driver.id)??0));
      const otherNeeds=obligations.filter(o=>o.id!==driver.id).reduce((sum,o)=>sum+Math.max(0,o.remainingMinimumMs-(used.get(o.id)??0)),0);
      const options=slots===1?[left]:[left/slots,needs,maximum,Math.max(minimum,left-otherNeeds),minimum];
      for(const raw of [...new Set(options.map(Math.round))]){
        const duration=Math.min(maximum,Math.max(minimum,raw));
        const elapsedBefore=s.elapsedMs+waitMs+plan.reduce((sum,p)=>sum+p.durationMs,0)+(plan.length+1)*pitCost;
        if(elapsedBefore>c.durationMs-c.pitCloseBeforeEndMs)continue;
        const nextUsed=new Map(used);nextUsed.set(driver.id,(used.get(driver.id)??0)+duration);
        const nextCounts=new Map(counts);nextCounts.set(driver.id,(counts.get(driver.id)??0)+1);
        const missing=obligations.reduce((sum,o)=>sum+Math.max(0,o.remainingStints-(nextCounts.get(o.id)??0)),0);
        if(missing>slots-1)continue;
        const found=search(slots-1,left-duration,driver.id,nextUsed,nextCounts,[...plan,{driverId:driver.id,driverName:driver.name,durationMs:duration,paceMs:driver.pace.paceMs}]);
        if(found)return found;
      }
    }
    return null;
  };
  const plan=search(pitCount,driveTime,me.stint?.driverId,new Map(),new Map(),[]);
  if(!plan)return {stints:[],violations:[visited>5000?"Busca limitada: não foi encontrado um plano legal":"Não foi encontrado um plano que cumpra todos os tempos e stints mínimos"],addedLaps:null,pitCount};
  const addedLaps=plan.every(p=>p.paceMs!=null)?plan.reduce((sum,p)=>sum+p.durationMs/p.paceMs!,0):null;
  return {stints:plan,violations:[],addedLaps,pitCount};
}
