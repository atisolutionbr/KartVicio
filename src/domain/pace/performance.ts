import { median } from "@/domain/strategy/analysis";
import type { RaceLap, Thresholds, LapKind } from "@/domain/race/session";

export type Performance = {
  count: number; validCount: number; bestMs: number | null; worstMs: number | null;
  averageMs: number | null; medianMs: number | null; trimmedMeanMs: number | null;
  madMs: number | null; sdMs: number | null; paceMs: number | null;
  last3Ms: number | null; last5Ms: number | null; last10Ms: number | null;
  degradationMs: number | null; slopeMsPerLap: number | null;
};
export function classifyLap(lap: RaceLap, history: RaceLap[], t: Thresholds): LapKind {
  if (lap.quality==="INVALID" || lap.lapTimeMs == null || !Number.isFinite(lap.lapTimeMs) || lap.lapTimeMs <= 0) return "invalid";
  if (lap.kind !== "normal") return lap.kind;
  if (lap.pitStatus === "enter") return "in-lap";
  if (lap.pitStatus === "exit") return "out-lap";
  const values = history.filter(l => l.kind === "normal" && !l.excluded && l.lapTimeMs != null).slice(-30).map(l => l.lapTimeMs!);
  if (values.length < t.minimumSamples) return "normal";
  const center = median(values)!;
  const mad = median(values.map(v => Math.abs(v - center)))!;
  if (Math.abs(lap.lapTimeMs - center) > Math.max(t.outlierFloorMs, t.madMultiplier * 1.4826 * mad)) return "outlier";
  return "normal";
}
export function performance(laps: RaceLap[], t: Thresholds): Performance {
  const clean = laps.filter(l => !l.excluded && l.kind === "normal" && l.lapTimeMs != null && l.quality !== "INVALID" && l.quality !== "STALE");
  const values = clean.map(l => l.lapTimeMs!);
  const mean = (v: number[]) => v.length ? v.reduce((a,b) => a+b,0)/v.length : null;
  const center = median(values);
  const mad = center == null ? null : median(values.map(v => Math.abs(v-center)));
  const avg = mean(values);
  const sorted = [...values].sort((a,b)=>a-b);
  const trim = Math.floor(sorted.length * .1);
  const trimmed = mean(sorted.slice(trim, sorted.length-trim));
  const enough = values.length >= t.minimumSamples;
  const recent = clean.slice(-20);
  let slope: number | null = null;
  if (recent.length >= Math.max(6, t.minimumSamples)) {
    const x = recent.map(l=>l.lapNumber); const y = recent.map(l=>l.lapTimeMs!);
    const mx = mean(x)!; const my = mean(y)!;
    const denom = x.reduce((sum,v)=>sum+(v-mx)**2,0);
    slope = denom ? x.reduce((sum,v,i)=>sum+(v-mx)*(y[i]-my),0)/denom : 0;
  }
  return { count: laps.length, validCount: values.length, bestMs: sorted[0] ?? null, worstMs: sorted.at(-1) ?? null,
    averageMs: avg, medianMs: center, trimmedMeanMs: trimmed, madMs: mad,
    sdMs: avg == null ? null : Math.sqrt(values.reduce((sum,v)=>sum+(v-avg)**2,0)/values.length),
    paceMs: enough ? median([center, trimmed, median(values.slice(-10))]) : null,
    last3Ms: values.length >= 3 ? median(values.slice(-3)) : null,
    last5Ms: values.length >= 5 ? median(values.slice(-5)) : null,
    last10Ms: values.length >= 10 ? median(values.slice(-10)) : null,
    degradationMs: slope == null ? null : slope * (recent.at(-1)!.lapNumber - recent[0].lapNumber), slopeMsPerLap: slope };
}
