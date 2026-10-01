"use client";
import { useCallback, useMemo } from "react";
import { useRace } from "@/features/race-control/race-context";
import type { DriverProfile } from "./mock-drivers";
export function useRaceDrivers():[DriverProfile[],(value:DriverProfile[]|((drivers:DriverProfile[])=>DriverProfile[]))=>void] {
  const {race,send}=useRace();
  const drivers=useMemo(()=>race?.drivers.map(d=>{const stats=race.analytics.drivers.find(o=>o.id===d.id);
    return {...d,stintCount:stats?.stintCount??0,totalTimeMs:stats?.timeMs??0,bestLapMs:stats?.performance.bestMs??undefined,consistencyMs:stats?.performance.madMs??undefined};})??[],[race]);
  const update=useCallback((value:DriverProfile[]|((drivers:DriverProfile[])=>DriverProfile[]))=>{
    const next=typeof value==="function"?value(drivers):value;
    for(const d of next){const prior=drivers.find(p=>p.id===d.id);if(!prior||JSON.stringify(prior)!==JSON.stringify(d))void send({type:"driver-save",driver:d});}
    for(const d of drivers)if(!next.some(n=>n.id===d.id))void send({type:"driver-delete",driverId:d.id});
  },[drivers,send]);return [drivers,update];
}
