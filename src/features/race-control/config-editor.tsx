"use client";
import { useState } from "react";
import { useRace } from "./race-context";
import { RaceFrame, Field, inputClass } from "@/components/race-frame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEFAULT_CONFIG, validateConfig, type RaceConfig } from "@/domain/race/session";
const ruleFields:[keyof RaceConfig,string,number][]=[
  ["durationMs","Duração (min)",60000],["maxTeams","Máximo de equipes",1],["minDrivers","Mínimo de pilotos por equipe",1],["maxDrivers","Máximo de pilotos por equipe",1],
  ["mandatoryStops","Paradas obrigatórias",1],["stopMinimumMs","Parada mínima (s)",1000],["stopPenaltyThresholdMs","Parada mínima com penalidade (s)",1000],
  ["penaltyLaps","Penalidade por parada curta (voltas)",1],["stintMinimumMs","Stint mínimo (min)",60000],["stintMaximumMs","Stint máximo (min)",60000],
  ["stintWarningMs","Aviso de stint (min)",60000],["stintCriticalMs","Stint crítico (min)",60000],
  ["driverMinimumMs","Tempo mínimo por piloto (min)",60000],["driverMaximumMs","Tempo máximo por piloto (min)",60000],["driverMinimumStints","Stints mínimos por piloto",1],
  ["pitOpenAfterMs","Box abre após (min)",60000],["pitCloseBeforeEndMs","Box fecha antes do fim (min)",60000],
  ["pitLossMs","Perda de trânsito no pit (s)",1000],["driverChangeMs","Tempo de troca adicional (s)",1000],["minimumWeightKg","Peso mínimo com lastro (kg)",1],
];
const thresholdLabels:Record<keyof RaceConfig["thresholds"],string>={paceAcceptableMs:"Delta aceitável (ms)",paceWarningMs:"Delta de atenção (ms)",paceCriticalMs:"Delta crítico (ms)",degradationWarningMs:"Degradação atenção (ms)",degradationCriticalMs:"Degradação crítica (ms)",consistencyMs:"Consistência limite MAD (ms)",pitWarningMs:"Antecedência aviso box (ms)",staleMs:"Timeout dados parados (ms)",minimumSamples:"Amostras mínimas",madMultiplier:"Multiplicador MAD",outlierFloorMs:"Tolerância mínima outlier (ms)",alertCooldownMs:"Intervalo de alerta repetido (ms)",trafficGapMs:"Gap de tráfego (ms)"};
export function ConfigEditor({settings=false}:{settings?:boolean}) {
  const {race,send,busy}=useRace();const [draft,setDraft]=useState<RaceConfig|null>(null);const [saved,setSaved]=useState(false);
  const c=draft??race?.config??DEFAULT_CONFIG;const errors=validateConfig(c);
  const patch=(p:Partial<RaceConfig>)=>{setDraft({...c,...p});setSaved(false);};
  return <RaceFrame active={settings?"/settings":"/setup"} title={settings?"Parâmetros de análise":"Setup da prova"} description="Regulamento e thresholds centralizados. Confira com o regulamento oficial da sua prova.">
    {!settings&&<Card><CardHeader><CardTitle>Evento</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><Field label="Nome"><input className={inputClass} value={c.name} onChange={e=>patch({name:e.target.value})}/></Field><Field label="Kartódromo"><input className={inputClass} value={c.venue} onChange={e=>patch({venue:e.target.value})}/></Field><Field label="Largada prevista (horário local)"><input type="datetime-local" className={inputClass} value={c.startsAt} onChange={e=>patch({startsAt:e.target.value})}/></Field></CardContent></Card>}
    {!settings&&<Card><CardHeader><CardTitle>Regras de endurance</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{ruleFields.map(([key,label,unit])=><Field key={key} label={label}><input type="number" min="0" step="any" className={inputClass} value={Number(c[key])/unit} onChange={e=>patch({[key]:Number(e.target.value)*unit})}/></Field>)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.requireDriverChange} onChange={e=>patch({requireDriverChange:e.target.checked})}/>Troca de piloto obrigatória</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.requireKartChange} onChange={e=>patch({requireKartChange:e.target.checked})}/>Troca de kart obrigatória</label><Field label="Regras específicas / notas de operação"><textarea className="min-h-24 rounded-md border border-border p-3" value={c.specificRules} onChange={e=>patch({specificRules:e.target.value})}/></Field></CardContent></Card>}
    <Card><CardHeader><CardTitle>Parâmetros de análise e conexão</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{(Object.keys(thresholdLabels) as (keyof RaceConfig["thresholds"])[]).map(key=><Field key={key} label={thresholdLabels[key]}><input type="number" min="0" step="any" className={inputClass} value={c.thresholds[key]} onChange={e=>patch({thresholds:{...c.thresholds,[key]:Number(e.target.value)}})}/></Field>)}</CardContent></Card>
    {errors.length>0&&<div role="alert" className="rounded-md bg-red-50 p-3 text-red-700">{errors.join(" ")}</div>}
    <div className="flex items-center gap-3"><Button disabled={busy||errors.length>0} onClick={async()=>{if(await send({type:"configure",config:{...c,stints:c.mandatoryStops+1}})){setDraft(null);setSaved(true);}}}>Salvar configuração</Button>{saved&&<span className="text-sm text-emerald-700">Configuração salva no servidor.</span>}</div>
    <p className="text-sm text-muted-foreground">A projeção soma parada mínima + trânsito de pit + troca adicional. Se a troca já está incluída na parada mínima, configure tempo adicional como zero. Regras escritas nas notas exigem conferência humana; o motor aplica os campos numéricos e as trocas obrigatórias.</p>
  </RaceFrame>;
}
