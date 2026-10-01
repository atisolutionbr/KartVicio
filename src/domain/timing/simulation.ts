import type { RaceSession, RaceLap, RaceTeam, RaceDriver } from "@/domain/race/session";

/** Deterministic complete race dataset; all timestamps are race-clock milliseconds. */
export function simulateRace(config: RaceSession["config"], teamCount=15, driversPerTeam=3, seed=42) {
  teamCount=Math.max(1,Math.min(config.maxTeams,teamCount));
  driversPerTeam=Math.max(config.minDrivers,Math.min(config.maxDrivers,driversPerTeam));
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const teams:RaceTeam[]=[];const drivers:RaceDriver[]=[];const laps:RaceLap[]=[];
  for(let i=0;i<teamCount;i++) {
    const teamId=`sim-team-${i+1}`;const driverIds:string[]=[];
    for(let j=0;j<driversPerTeam;j++) {
      const id=`sim-driver-${i+1}-${j+1}`;driverIds.push(id);
      drivers.push({id,name:`Piloto ${i+1}.${j+1}`,weightKg:80,ballastKg:Math.max(0,config.minimumWeightKg-80),rating:7+j,
        preferredRole:"balanced",preferredStint:"any",pressureReady:j===0,active:true,stintCount:0,totalTimeMs:0,order:j});
    }
    teams.push({id:teamId,number:String(i+1),name:`Equipe ${i+1}`,kart:String(i+1),category:"Endurance",driverIds,role:i===0?"leader":"support"});
    let elapsed=0;let lapNumber=0;let stint=0;let stintStart=0;let nextStop=0;
    const windowEnd=config.durationMs-config.pitCloseBeforeEndMs;
    const stopCost=config.stopMinimumMs+config.pitLossMs+config.driverChangeMs;
    const drivingStint=Math.max(1,(config.durationMs-config.mandatoryStops*stopCost)/(config.mandatoryStops+1));
    const base=46_500+i*45;
    while(elapsed<config.durationMs) {
      lapNumber++;
      const degradation=Math.max(0,elapsed-stintStart)/60_000*(i%4===0?20:3);
      let lapTime=base+(random()-.5)*220+degradation;let kind:RaceLap["kind"]="normal";
      if(random()<.015){lapTime+=8000;kind="traffic";}
      if(random()<.003){lapTime+=20_000;kind="incident";}
      elapsed+=Math.round(lapTime);
      if(elapsed>config.durationMs)break;
      const common={raceId:"kart-vicio",teamId,driverId:driverIds[stint%driversPerTeam],kartNumber:String(i+1+stint*teamCount),lapNumber,
        timestamp:elapsed,raceElapsedMs:elapsed,source:"SIMULATION" as const,quality:"ESTIMATED" as const};
      const due=Math.max(config.pitOpenAfterMs,(nextStop+1)*drivingStint+nextStop*stopCost);
      if(nextStop<config.mandatoryStops && elapsed>=due && elapsed+config.stopMinimumMs+config.pitLossMs<windowEnd) {
        laps.push({...common,lapTimeMs:Math.round(lapTime),kind:"in-lap",pitStatus:"enter"});
        elapsed+=config.stopMinimumMs+config.pitLossMs+config.driverChangeMs;stint++;nextStop++;stintStart=elapsed;
        lapNumber++;
        laps.push({...common,driverId:driverIds[stint%driversPerTeam],kartNumber:String(i+1+stint*teamCount),lapNumber,
          lapTimeMs:null,timestamp:elapsed,raceElapsedMs:elapsed,kind:"out-lap",pitStatus:"exit"});
      } else laps.push({...common,lapTimeMs:Math.round(lapTime),kind});
    }
  }
  laps.sort((a,b)=>a.raceElapsedMs-b.raceElapsedMs||a.teamId.localeCompare(b.teamId));
  // Position and gaps use comparable elapsed progress; no fictitious live classifications.
  const progress=new Map<string,{lap:number;elapsed:number}>();
  for(const lap of laps) {
    progress.set(lap.teamId,{lap:lap.lapNumber,elapsed:lap.raceElapsedMs});
    const ordered=[...progress.entries()].sort((a,b)=>b[1].lap-a[1].lap||a[1].elapsed-b[1].elapsed);
    lap.position=ordered.findIndex(([id])=>id===lap.teamId)+1;
    const leader=ordered[0][1]; const deficit=leader.lap-lap.lapNumber;
    lap.gap=lap.position===1?{type:"none"}:deficit>0?{type:"laps",laps:deficit,raw:`${deficit} voltas`}:{type:"time",ms:Math.max(0,lap.raceElapsedMs-leader.elapsed),raw:String(Math.max(0,lap.raceElapsedMs-leader.elapsed)/1000)};
  }
  return {teams,drivers,laps};
}
