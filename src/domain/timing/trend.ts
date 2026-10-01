import type { Gap, TimingSnapshot } from "./types";
import { normalizeEntryNumber } from "./entry-number";

export type TrendPoint = {
  capturedAtMs: number;
  raceClockMs: number | null;
  lapNumber: number;
  lapTimeMs: number | null;
  rollingPaceMs: number | null;
  gapToLeaderMs: number | null;
  position: number;
};

export type TrendMetric = "pace" | "gap" | "position";
export type TrendChartRow = { lap: number } & Record<string, number>;

export function buildEntryTrend(
  snapshots: TimingSnapshot[],
  entryNumber: string,
  windowSize = 5,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  const normalizedEntryNumber = normalizeEntryNumber(entryNumber);
  const lapTimes: number[] = [];
  let previousLap = -1;

  for (const snapshot of snapshots) {
    const entry = snapshot.entries.find(
      (candidate) => normalizeEntryNumber(candidate.entryNumber) === normalizedEntryNumber,
    );
    if (!entry || entry.lapCount === previousLap) continue;
    previousLap = entry.lapCount;
    if (entry.lastLapMs != null) lapTimes.push(entry.lastLapMs);
    const recent = lapTimes.slice(-windowSize);
    points.push({
      capturedAtMs: snapshot.capturedAtMs,
      raceClockMs: snapshot.raceClockMs,
      lapNumber: entry.lapCount,
      lapTimeMs: entry.lastLapMs,
      rollingPaceMs:
        recent.length > 0
          ? recent.reduce((sum, value) => sum + value, 0) / recent.length
          : null,
      gapToLeaderMs: gapToMs(entry.gapToLeader),
      position: entry.position,
    });
  }

  return points;
}

export function keepRecentSnapshots(
  snapshots: TimingSnapshot[],
  limit = 1_200,
): TimingSnapshot[] {
  return snapshots.slice(-Math.max(1, limit));
}

export function buildTrendChartRows(
  snapshots: TimingSnapshot[],
  entryNumbers: string[],
  metric: TrendMetric,
): TrendChartRow[] {
  const rows = new Map<number, TrendChartRow>();
  for (const number of entryNumbers) {
    for (const point of buildEntryTrend(snapshots, number)) {
      const value = trendValue(point, metric);
      if (value == null) continue;
      const row = rows.get(point.lapNumber) ?? { lap: point.lapNumber };
      row[number] = value;
      rows.set(point.lapNumber, row);
    }
  }

  return [...rows.entries()].sort(([left], [right]) => left - right).map(([, row]) => row);
}

function trendValue(point: TrendPoint, metric: TrendMetric): number | null {
  if (metric === "pace") {
    return point.rollingPaceMs;
  }
  if (metric === "gap") {
    return point.gapToLeaderMs == null ? null : point.gapToLeaderMs / 1_000;
  }
  return point.position;
}

function gapToMs(gap: Gap): number | null {
  if (gap.type === "none") return 0;
  return gap.type === "time" ? gap.ms : null;
}
