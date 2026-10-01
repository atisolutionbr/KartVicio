import { minutes } from "@/domain/race/rules";

export type LapSample = {
  lapNumber: number;
  lapTimeMs: number;
};

export type PaceAnalysis = {
  sampleSize: number;
  averageMs: number | null;
  medianMs: number | null;
  consistencyMs: number | null;
  projectedLossMs: number;
  recommendation: PaceRecommendation;
};

export type PaceRecommendation = "keep" | "watch" | "prepare" | "call";

export type PaceAnalysisOptions = {
  expectedLapMs: number;
  remainingStintMs: number;
  outlierToleranceMs?: number;
};

export function analyzePace(
  laps: LapSample[],
  options: PaceAnalysisOptions,
): PaceAnalysis {
  const cleanLaps = removeOutliers(
    laps.map((lap) => lap.lapTimeMs),
    options.outlierToleranceMs ?? 4_000,
  );

  const averageMs = average(cleanLaps);
  const medianMs = median(cleanLaps);
  const consistencyMs = standardDeviation(cleanLaps);
  const projectedLossMs =
    averageMs == null
      ? 0
      : projectLoss({
          actualLapMs: averageMs,
          expectedLapMs: options.expectedLapMs,
          remainingStintMs: options.remainingStintMs,
        });

  return {
    sampleSize: cleanLaps.length,
    averageMs,
    medianMs,
    consistencyMs,
    projectedLossMs,
    recommendation: recommendAction({
      projectedLossMs,
      consistencyMs,
      remainingStintMs: options.remainingStintMs,
    }),
  };
}

export function recentLaps(laps: LapSample[], count: number): LapSample[] {
  return [...laps]
    .sort((a, b) => a.lapNumber - b.lapNumber)
    .slice(-count);
}

export function projectLoss(params: {
  actualLapMs: number;
  expectedLapMs: number;
  remainingStintMs: number;
}): number {
  const deltaMs = params.actualLapMs - params.expectedLapMs;
  if (deltaMs <= 0) return 0;

  const estimatedRemainingLaps = Math.floor(
    params.remainingStintMs / params.actualLapMs,
  );

  return Math.round(deltaMs * estimatedRemainingLaps);
}

export function recommendAction(params: {
  projectedLossMs: number;
  consistencyMs: number | null;
  remainingStintMs: number;
}): PaceRecommendation {
  if (params.remainingStintMs <= minutes(3)) return "keep";
  if (params.projectedLossMs >= 25_000) return "call";
  if (params.projectedLossMs >= 15_000) return "prepare";
  if ((params.consistencyMs ?? 0) >= 1_500 || params.projectedLossMs >= 5_000) {
    return "watch";
  }
  return "keep";
}

export function removeOutliers(values: number[], toleranceMs: number): number[] {
  const center = median(values);
  if (center == null) return [];

  return values.filter((value) => Math.abs(value - center) <= toleranceMs);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[middle] ?? null;

  const left = sorted[middle - 1];
  const right = sorted[middle];

  if (left == null || right == null) return null;
  return Math.round((left + right) / 2);
}

function standardDeviation(values: number[]): number | null {
  if (values.length === 0) return null;

  const mean = average(values);
  if (mean == null) return null;

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.round(Math.sqrt(variance));
}
