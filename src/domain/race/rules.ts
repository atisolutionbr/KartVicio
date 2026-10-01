export type StopValidity =
  | {
      status: "invalid";
      reason: "below-minimum";
      countsAsMandatoryStop: false;
      penaltyLaps: 0;
    }
  | {
      status: "valid-with-penalty";
      reason: "under-regulation-time";
      countsAsMandatoryStop: true;
      penaltyLaps: 2;
    }
  | {
      status: "valid";
      reason: "regulation-time";
      countsAsMandatoryStop: true;
      penaltyLaps: 0;
    };

export type PitWindowStatus = "not-open-yet" | "open" | "closed";

export type StintLimitStatus = "ok" | "warning" | "critical" | "over-limit";

export type RaceRules = {
  durationMs: number;
  mandatoryStops: number;
  stints: number;
  pitOpenAfterMs: number;
  pitCloseBeforeEndMs: number;
  stopMinimumMs: number;
  stopPenaltyThresholdMs: number;
  stintMaximumMs: number;
  stintWarningMs: number;
  stintCriticalMs: number;
};

export const FDK_100_MILHAS_RULES: RaceRules = {
  durationMs: minutes(240),
  mandatoryStops: 7,
  stints: 8,
  pitOpenAfterMs: minutes(10),
  pitCloseBeforeEndMs: minutes(20),
  stopMinimumMs: minutes(5),
  stopPenaltyThresholdMs: minutes(4) + seconds(55),
  stintMaximumMs: minutes(50),
  stintWarningMs: minutes(45),
  stintCriticalMs: minutes(48),
};

export function minutes(value: number): number {
  return value * 60_000;
}

export function seconds(value: number): number {
  return value * 1_000;
}

export function getPitWindowStatus(
  elapsedMs: number,
  rules: RaceRules = FDK_100_MILHAS_RULES,
): PitWindowStatus {
  if (elapsedMs < rules.pitOpenAfterMs) return "not-open-yet";
  if (elapsedMs > rules.durationMs - rules.pitCloseBeforeEndMs) return "closed";
  return "open";
}

export function evaluateStopDuration(
  durationMs: number,
  rules: RaceRules = FDK_100_MILHAS_RULES,
): StopValidity {
  if (durationMs < rules.stopPenaltyThresholdMs) {
    return {
      status: "invalid",
      reason: "below-minimum",
      countsAsMandatoryStop: false,
      penaltyLaps: 0,
    };
  }

  if (durationMs < rules.stopMinimumMs) {
    return {
      status: "valid-with-penalty",
      reason: "under-regulation-time",
      countsAsMandatoryStop: true,
      penaltyLaps: 2,
    };
  }

  return {
    status: "valid",
    reason: "regulation-time",
    countsAsMandatoryStop: true,
    penaltyLaps: 0,
  };
}

export function getStintLimitStatus(
  stintElapsedMs: number,
  rules: RaceRules = FDK_100_MILHAS_RULES,
): StintLimitStatus {
  if (stintElapsedMs > rules.stintMaximumMs) return "over-limit";
  if (stintElapsedMs >= rules.stintCriticalMs) return "critical";
  if (stintElapsedMs >= rules.stintWarningMs) return "warning";
  return "ok";
}

export function getRemainingMandatoryStops(
  completedStops: number,
  rules: RaceRules = FDK_100_MILHAS_RULES,
): number {
  return Math.max(0, rules.mandatoryStops - completedStops);
}
