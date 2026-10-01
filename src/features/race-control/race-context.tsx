"use client";
import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { RaceView, Operation } from "@/server/race-store";
import { appUrl } from "@/lib/app-url";
type Context={race:RaceView|null;error:string|null;connectionError:string|null;busy:boolean;refresh:()=>Promise<void>;send:(op:Operation)=>Promise<boolean>};
const RaceContext=createContext<Context|null>(null);
export function RaceProvider({children}:{children:ReactNode}) {
  const [race,setRace]=useState<RaceView|null>(null);const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState(false);
  const [connectionError,setConnectionError]=useState<string|null>(null);
  const inflight=useRef(false);const mutation=useRef(0);
  const refresh=useCallback(async()=>{
    if(inflight.current)return;inflight.current=true;const sequence=mutation.current;
    try { const response=await fetch(appUrl("/api/race"),{cache:"no-store",signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error("Não foi possível atualizar a corrida.");
      const value=await response.json() as RaceView;
      if(sequence===mutation.current)setRace(value);
      setConnectionError(null);
    }catch(e){setConnectionError(e instanceof Error?e.message:"Falha de conexão. Recomendações suspensas.");}finally{inflight.current=false;}
  },[]);
  useEffect(()=>{const initial=window.setTimeout(()=>void refresh(),0);const timer=window.setInterval(()=>void refresh(),1000);return()=>{clearTimeout(initial);clearInterval(timer);};},[refresh]);
  const send=useCallback(async(op:Operation)=>{
    mutation.current++;setBusy(true);setError(null);
    try {const response=await fetch(appUrl("/api/race"),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(op),signal:AbortSignal.timeout(30000)});
      const value=await response.json();if(!response.ok)throw new Error(value.error??"Operação recusada.");
      setRace(value as RaceView);return true;
    }catch(e){setError(e instanceof Error?e.message:"Falha de conexão.");return false;}finally{setBusy(false);}
  },[]);
  return <RaceContext.Provider value={{race,error:error??connectionError,connectionError,busy,refresh,send}}>{children}</RaceContext.Provider>;
}
export function useRace(){const context=useContext(RaceContext);if(!context)throw new Error("RaceProvider ausente.");return context;}
