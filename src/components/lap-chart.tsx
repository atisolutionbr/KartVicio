"use client";
import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from "recharts";
import type { RaceLap } from "@/domain/race/session";
import { median } from "@/domain/strategy/analysis";
export function LapChart({laps,medianMs}:{laps:RaceLap[];medianMs:number|null}) {
  const data=useMemo(()=>{const valid:number[]=[];return laps.slice(-100).map(l=>{if(l.kind==="normal"&&!l.excluded&&l.lapTimeMs!=null)valid.push(l.lapTimeMs);return {lap:l.lapNumber,seconds:l.lapTimeMs==null?null:l.lapTimeMs/1000,pace:valid.length>=3?median(valid.slice(-5))!/1000:null};});},[laps]);
  if(!data.length)return <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">Gráfico disponível após receber voltas.</div>;
  return <div className="h-64 w-full min-w-0" aria-label="Gráfico volta a volta e mediana móvel"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="lap"/><YAxis domain={["auto","auto"]} width={55}/><Tooltip/><Line name="Volta (s)" dataKey="seconds" stroke="#94a3b8" dot={false} isAnimationActive={false}/><Line name="Mediana 5 (s)" dataKey="pace" stroke="#0284c7" dot={false} isAnimationActive={false}/>{medianMs!=null&&<ReferenceLine y={medianMs/1000} stroke="#059669" strokeDasharray="5 5"/>}</LineChart></ResponsiveContainer></div>;
}
