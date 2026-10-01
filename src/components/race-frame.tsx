"use client";
import { useRace } from "@/features/race-control/race-context";
import { AppShell } from "./app-shell";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import type { ReactNode } from "react";
export const inputClass="h-10 min-w-0 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500";
export function lapTime(ms:number|null|undefined){return ms==null?"—":(ms/1000).toFixed(3)+" s";}
export function clock(ms:number|null|undefined){if(ms==null)return "—";const sec=Math.floor(Math.max(0,ms)/1000);return `${Math.floor(sec/3600).toString().padStart(2,"0")}:${Math.floor(sec/60%60).toString().padStart(2,"0")}:${(sec%60).toString().padStart(2,"0")}`;}
export function delta(ms:number|null|undefined){return ms==null?"Dados insuficientes":`${ms>=0?"+":""}${(ms/1000).toFixed(3)} s`;}
export function RaceFrame({active,title,description,children,command=false}:{active:string;title:string;description?:string;children:ReactNode;command?:boolean}) {
  const {race,error,connectionError,busy,send}=useRace();
  return <AppShell active={active}><main className={`min-h-screen px-4 py-5 sm:px-6 lg:px-8 ${command?"command-mode":""}`}><div className="mx-auto flex max-w-[1500px] flex-col gap-4">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4"><div><div className="mb-2 flex flex-wrap gap-2"><Badge variant={connectionError||race?.connection==="DELAYED"?"critical":race?.connection==="LIVE"?"ok":"info"}>{connectionError?"DISCONNECTED":race?.connection??"Conectando"}</Badge><Badge variant="outline">{race?.config.name??"Kart Vício"}</Badge><Badge variant="outline">{race?.phase??"carregando"}</Badge></div><h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>{description&&<p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>
      {race&&<div className="flex flex-wrap items-center gap-3"><div className="text-xs text-muted-foreground">Prova <strong className="block font-mono text-lg text-foreground">{clock(race.elapsedMs)}</strong></div><div className="text-xs text-muted-foreground">Restam <strong className="block font-mono text-lg text-foreground">{clock(race.config.durationMs-race.elapsedMs)}</strong></div><label className="grid gap-1 text-xs">Minha equipe<select aria-label="Minha equipe" className={inputClass} value={race.selectedTeamId??""} onChange={e=>void send({type:"select-team",teamId:e.target.value})}><option value="" disabled>Selecione</option>{race.teams.map(t=><option key={t.id} value={t.id}>#{t.number} {t.name}</option>)}</select></label>{!race.playback&&<Button variant="outline" disabled={busy} onClick={()=>void send({type:"clock",action:race.phase==="running"?"pause":"start"})}>{race.phase==="running"?"Pausar relógio":"Iniciar relógio"}</Button>}</div>}
    </header>
    {error&&<div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800">{error}{connectionError&&" Recomendações suspensas até a conexão voltar."}</div>}
    {race?.connection==="DELAYED"&&<div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 font-bold text-red-800">ATENÇÃO — CRONOMETRAGEM SEM ATUALIZAÇÃO. Decisões de ritmo suspensas.</div>}
    {!race?<p>Carregando sessão...</p>:children}
  </div></main></AppShell>;
}
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span>{children}</label>;}
export function Stat({label,value}:{label:string;value:ReactNode}){return <div className="min-w-0 rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-mono text-lg font-bold">{value}</div></div>;}
