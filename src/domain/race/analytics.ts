import type { RaceSession, RaceLap } from "./session";
import { performance, type Performance } from "@/domain/pace/performance";
import { driverTime } from "./engine";
type Metrics={recent:Performance;drivers:Map<string,Performance>;stints:Map<string,Performance>};
const cache=new Map<string,{token:string;metrics:Metrics}>();
export function invalidateMetrics(){cache.clear();}
export function teamMetrics(s:RaceSession,teamId:string):Metrics {
  const laps=s.laps[teamId]??[];const stints=s.stints.filter(x=>x.teamId===teamId);
  const token=`${s.lapRevisions?.[teamId]??laps.length}:${laps[0]?.timestamp??0}:${laps.at(-1)?.timestamp??0}:${JSON.stringify(s.config.thresholds)}:${stints.map(x=>`${x.id}:${x.driverId}:${x.startLap}:${x.endLap??""}`).join(";")}`;
  const key=`${s.id}:${teamId}`;const existing=cache.get(key);if(existing?.token===token)return existing.metrics;
  const byDriver=new Map<string,RaceLap[]>();const byStint=new Map<string,RaceLap[]>();
  for(const lap of laps){if(lap.driverId){const list=byDriver.get(lap.driverId)??[];list.push(lap);byDriver.set(lap.driverId,list);}
    const stint=stints.find(x=>x.driverId===lap.driverId&&lap.lapNumber>x.startLap&&lap.raceElapsedMs>=x.startMs&&(x.endMs==null||lap.raceElapsedMs<=x.endMs));
    if(stint){const list=byStint.get(stint.id)??[];list.push(lap);byStint.set(stint.id,list);}}
  const metrics={recent:performance(laps.slice(-120),s.config.thresholds),drivers:new Map([...byDriver].map(([id,list])=>[id,performance(list,s.config.thresholds)])),stints:new Map([...byStint].map(([id,list])=>[id,performance(list,s.config.thresholds)]))};
  if(cache.size>500)cache.clear();cache.set(key,{token,metrics});return metrics;
}
export function raceAnalytics(s:RaceSession) {
  const t=s.config.thresholds;
  const stints=s.stints.map(stint=>{
    const metrics=teamMetrics(s,stint.teamId);const last=(s.laps[stint.teamId]??[]).at(-1);const finalPosition=stint.endMs==null?last?.position:stint.endPosition;
    return {...stint,driverName:s.drivers.find(d=>d.id===stint.driverId)?.name??stint.driverId,teamName:s.teams.find(team=>team.id===stint.teamId)?.name??stint.teamId,
      durationMs:Math.max(0,(stint.endMs??s.elapsedMs)-stint.startMs),performance:metrics.stints.get(stint.id)??performance([],t),positionsGained:stint.startPosition!=null&&finalPosition!=null?stint.startPosition-finalPosition:null};
  });
  const drivers=s.drivers.map(d=>{const own=stints.filter(x=>x.driverId===d.id);const teams=s.teams.filter(team=>team.driverIds.includes(d.id));
    const stats=teams.length===1?teamMetrics(s,teams[0].id).drivers.get(d.id):performance(teams.flatMap(team=>(s.laps[team.id]??[]).filter(l=>l.driverId===d.id)),t);
    return {...d,timeMs:driverTime(s,d.id),stintCount:own.length,performance:stats??performance([],t),positionsGained:own.every(x=>x.positionsGained!=null)?own.reduce((sum,x)=>sum+x.positionsGained!,0):null};});
  return {stints,drivers};
}
