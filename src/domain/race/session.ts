import { FDK_100_MILHAS_RULES, type RaceRules } from "./rules";
import type { DriverProfile } from "@/features/drivers/mock-drivers";
import type { Gap, TimingSnapshot } from "@/domain/timing/types";

export type Source = "MANUAL" | "SIMULATION" | "REPLAY" | "LIVE";
export type Quality = "CONFIRMED" | "ESTIMATED" | "MANUAL" | "STALE" | "INVALID";
export type LapKind = "normal" | "pit" | "in-lap" | "out-lap" | "yellow" | "traffic" | "incident" | "invalid" | "outlier";
export type Thresholds = {
  paceAcceptableMs: number; paceWarningMs: number; paceCriticalMs: number;
  degradationWarningMs: number; degradationCriticalMs: number; consistencyMs: number;
  pitWarningMs: number; staleMs: number; minimumSamples: number; madMultiplier: number;
  outlierFloorMs: number; alertCooldownMs: number; trafficGapMs: number;
};
export type RaceConfig = RaceRules & {
  name: string; venue: string; startsAt: string; maxTeams: number;
  minDrivers: number; maxDrivers: number; stintMinimumMs: number;
  driverMinimumMs: number; driverMaximumMs: number; driverMinimumStints: number;
  pitLossMs: number; driverChangeMs: number; penaltyLaps: number; minimumWeightKg: number;
  requireDriverChange: boolean; requireKartChange: boolean; specificRules: string;
  thresholds: Thresholds;
};
export const DEFAULT_CONFIG: RaceConfig = {
  ...FDK_100_MILHAS_RULES, name: "FDK 100 Milhas Endurance", venue: "Kartódromo de Jardim Camburi",
  startsAt: "2026-10-17T14:00", maxTeams: 40, minDrivers: 2, maxDrivers: 16,
  stintMinimumMs: 0, driverMinimumMs: 0, driverMaximumMs: 240 * 60_000,
  driverMinimumStints: 0, pitLossMs: 18_000, driverChangeMs: 15_000, penaltyLaps: 2,
  minimumWeightKg: 100, requireDriverChange: true, requireKartChange: true, specificRules: "",
  thresholds: { paceAcceptableMs: 200, paceWarningMs: 400, paceCriticalMs: 700,
    degradationWarningMs: 300, degradationCriticalMs: 600, consistencyMs: 250,
    pitWarningMs: 5 * 60_000, staleMs: 90_000, minimumSamples: 5, madMultiplier: 6,
    outlierFloorMs: 1500, alertCooldownMs: 60_000, trafficGapMs: 3000 },
};
export type RaceTeam = {
  id: string; number: string; name: string; kart: string; category: string;
  driverIds: string[]; role: "leader" | "attack" | "support" | "recovery";
};
export type RaceDriver = DriverProfile & {
  nickname?: string; experience?: string; order?: number;
  minimumMs?: number; maximumMs?: number; minimumStints?: number;
};
export type RaceLap = {
  raceId: string; teamId: string; driverId?: string; kartNumber?: string; lapNumber: number;
  lapTimeMs: number | null; sectorTimes?: number[]; timestamp: number;
  position?: number; gap?: Gap; pitStatus?: "enter" | "exit"; raceElapsedMs: number;
  source: Source; quality: Quality; kind: LapKind; excluded?: boolean;
  sourceTimestamp?: number; receivedTimestamp?: number; processedTimestamp?: number;
};
export type RaceStint = {
  id: string; teamId: string; driverId: string; startMs: number; endMs?: number;
  startLap: number; endLap?: number; startPosition?: number; endPosition?: number;
};
export type RacePit = {
  id: string; teamId: string; enterMs: number; exitMs?: number; oldKart: string; newKart?: string;
  previousDriverId?: string; nextDriverId?: string; durationMs?: number;
  valid?: boolean; penaltyLaps: number; checks: { plate: boolean; sensor: boolean; weighed: boolean; ballast: boolean };
};
export type RaceEvent = {
  id: string; type: string; elapsedMs: number; teamId?: string; message: string;
  severity: "INFO" | "ATENÇÃO" | "IMPORTANTE" | "CRÍTICO"; rule?: string;
};
export type Playback = {
  laps: RaceLap[]; cursor: number; speed: number; running: boolean;
  anchorWallMs: number; anchorRaceMs: number;
  actions?: PlaybackAction[]; actionCursor?: number;
};
export type PlaybackAction={atMs:number;type:"driver"|"pit-enter"|"pit-exit";teamId:string;driverId?:string;kart?:string;checks?:RacePit["checks"]};
export type RaceSession = {
  version: 1; id: string; revision: number; config: RaceConfig; teams: RaceTeam[]; drivers: RaceDriver[];
  selectedTeamId: string | null; source: Source; phase: "ready" | "running" | "paused" | "finished";
  elapsedMs: number; clockAnchorWallMs: number; clockAnchorRaceMs: number;
  lastReceivedMs: number | null; laps: Record<string, RaceLap[]>; stints: RaceStint[]; pits: RacePit[];
  events: RaceEvent[]; lastAlerts: Record<string, number>; latestSnapshot: TimingSnapshot | null;
  lapRevisions?: Record<string,number>;
  playback: Playback | null; strategyMode: "performance" | "participation";
};
export function emptySession(id = "kart-vicio"): RaceSession {
  return { version: 1, id, revision: 0, config: structuredClone(DEFAULT_CONFIG), teams: [], drivers: [],
    selectedTeamId: null, source: "MANUAL", phase: "ready", elapsedMs: 0,
    clockAnchorWallMs: 0, clockAnchorRaceMs: 0, lastReceivedMs: null, laps: {}, stints: [], pits: [],
    events: [], lastAlerts: {}, latestSnapshot: null, lapRevisions:{}, playback: null, strategyMode: "performance" };
}
export function validateConfig(c: RaceConfig): string[] {
  const errors: string[] = [];
  if (!c.name.trim()) errors.push("Informe o nome da prova.");
  const numeric = Object.entries(c).filter(([,v]) => typeof v === "number");
  if (numeric.some(([,v]) => !Number.isFinite(v) || (v as number) < 0)) errors.push("Valores numéricos devem ser finitos e não negativos.");
  if (c.durationMs <= 0 || c.stintMaximumMs <= 0) errors.push("Duração e stint máximo devem ser positivos.");
  if (c.stintMinimumMs > c.stintMaximumMs) errors.push("Stint mínimo excede o máximo.");
  if (c.driverMinimumMs > c.driverMaximumMs) errors.push("Tempo mínimo do piloto excede o máximo.");
  if (c.minDrivers > c.maxDrivers || c.minDrivers < 1 || c.maxTeams < 1) errors.push("Limites de equipes/pilotos inválidos.");
  if (c.pitOpenAfterMs + c.pitCloseBeforeEndMs >= c.durationMs) errors.push("A janela de box precisa existir dentro da prova.");
  if (c.stopPenaltyThresholdMs > c.stopMinimumMs) errors.push("Limiar de penalidade excede a parada mínima.");
  if (c.stintWarningMs > c.stintCriticalMs || c.stintCriticalMs > c.stintMaximumMs) errors.push("Avisos de stint devem respeitar o limite máximo.");
  if (Object.values(c.thresholds).some(v => !Number.isFinite(v) || v < 0) || c.thresholds.minimumSamples < 3 || c.thresholds.staleMs < 1000) errors.push("Thresholds inválidos (mínimo de 3 amostras e timeout de 1 segundo).");
  if (c.thresholds.paceAcceptableMs > c.thresholds.paceWarningMs || c.thresholds.paceWarningMs > c.thresholds.paceCriticalMs || c.thresholds.degradationWarningMs > c.thresholds.degradationCriticalMs) errors.push("Thresholds de atenção devem preceder os críticos.");
  return errors;
}
