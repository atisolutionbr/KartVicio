import { analyzePace, recentLaps, type PaceRecommendation } from "@/domain/pace/analysis";
import { minutes } from "@/domain/race/rules";
import { getEntryStrategyStatus, suggestNextDriver } from "@/domain/strategy/engine";
import type { Entry, TeamState } from "@/domain/team/model";
import type { DashboardEntryInput } from "./mock-race";

export type RaceControlEntryView = DashboardEntryInput & {
  entry: Entry;
  activeStint: { driverId: string; startedAtMs: number };
  strategy: ReturnType<typeof getEntryStrategyStatus>;
  suggestion: ReturnType<typeof suggestNextDriver>;
  pace: string;
  delta: string;
  projectedLoss: string;
  recommendation: PaceRecommendation;
  consistency: string;
};

export function buildRaceControlEntries(params: {
  state: TeamState;
  inputs: DashboardEntryInput[];
  elapsedMs: number;
}): RaceControlEntryView[] {
  return params.inputs.map((input) => {
    const entry = requireEntry(params.state, input.entryId);
    const activeStint = requireActiveStint(params.state, input.entryId);
    const stintElapsedMs = params.elapsedMs - activeStint.startedAtMs;
    const remainingStintMs = Math.max(0, minutes(50) - stintElapsedMs);
    const pace = analyzePace(recentLaps(input.laps, 5), {
      expectedLapMs: input.expectedLapMs,
      remainingStintMs,
    });
    const deltaMs = (pace.averageMs ?? input.expectedLapMs) - input.expectedLapMs;

    return {
      ...input,
      entry,
      activeStint,
      strategy: getEntryStrategyStatus({
        state: params.state,
        entryId: input.entryId,
        elapsedMs: params.elapsedMs,
        completedStops: input.stops,
      }),
      suggestion: suggestNextDriver({
        state: params.state,
        entryId: input.entryId,
        nowMs: params.elapsedMs,
      }),
      pace: formatLapTime(pace.averageMs),
      delta: formatSignedSeconds(deltaMs),
      projectedLoss: formatDuration(pace.projectedLossMs),
      recommendation: pace.recommendation,
      consistency: formatSignedSeconds(pace.consistencyMs ?? 0).replace("+", ""),
    };
  });
}

export function formatLapTime(ms: number | null): string {
  if (ms == null) return "--";

  const totalSeconds = ms / 1_000;
  const minutesValue = Math.floor(totalSeconds / 60);
  const secondsValue = totalSeconds - minutesValue * 60;

  return `${minutesValue}:${secondsValue.toFixed(3).padStart(6, "0")}`;
}

export function formatSignedSeconds(ms: number): string {
  const sign = ms >= 0 ? "+" : "-";
  return `${sign}${(Math.abs(ms) / 1_000).toFixed(2)}s`;
}

export function formatDuration(ms: number): string {
  if (ms < 1_000) return "0s";
  if (ms < 60_000) return `${Math.round(ms / 1_000)}s`;

  const minutesValue = Math.floor(ms / 60_000);
  const secondsValue = Math.round((ms % 60_000) / 1_000);
  return `${minutesValue}m ${secondsValue}s`;
}

function requireEntry(state: TeamState, entryId: string): Entry {
  const entry = state.entries.find((candidate) => candidate.id === entryId);
  if (!entry) throw new Error(`Entry not found: ${entryId}`);
  return entry;
}

function requireActiveStint(
  state: TeamState,
  entryId: string,
): { driverId: string; startedAtMs: number } {
  const activeStint = state.stints.find(
    (stint) => stint.entryId === entryId && stint.endedAtMs == null,
  );
  if (!activeStint) throw new Error(`Active stint not found: ${entryId}`);
  return activeStint;
}
