import {
  FDK_100_MILHAS_RULES,
  getPitWindowStatus,
  getRemainingMandatoryStops,
  getStintLimitStatus,
  type PitWindowStatus,
  type RaceRules,
  type StintLimitStatus,
} from "@/domain/race/rules";
import {
  getActiveStintForEntry,
  getDriverTotalTimeMs,
  type Driver,
  type EntryId,
  type StrategyMode,
  type TeamState,
} from "@/domain/team/model";

export type AlertSeverity = "info" | "warning" | "critical";

export type RaceAlert = {
  severity: AlertSeverity;
  entryId: EntryId;
  code:
    | "pit-not-open"
    | "pit-open"
    | "pit-closed"
    | "stint-warning"
    | "stint-critical"
    | "stint-over-limit"
    | "mandatory-stops-remaining";
  message: string;
};

export type EntryStrategyStatus = {
  entryId: EntryId;
  pitWindow: PitWindowStatus;
  stintStatus: StintLimitStatus | "no-active-stint";
  completedStops: number;
  remainingStops: number;
  alerts: RaceAlert[];
};

export type DriverSuggestion = {
  kind: "next-driver";
  entryId: EntryId;
  driverId: string;
  mode: StrategyMode;
  reason: string;
};

export type ConfirmedSuggestion<TSuggestion> = {
  suggestion: TSuggestion;
  confirmedAtMs: number;
};

export function getEntryStrategyStatus(params: {
  state: TeamState;
  entryId: EntryId;
  elapsedMs: number;
  completedStops: number;
  rules?: RaceRules;
}): EntryStrategyStatus {
  const rules = params.rules ?? FDK_100_MILHAS_RULES;
  const pitWindow = getPitWindowStatus(params.elapsedMs, rules);
  const activeStint = getActiveStintForEntry(params.state, params.entryId);
  const stintStatus = activeStint
    ? getStintLimitStatus(params.elapsedMs - activeStint.startedAtMs, rules)
    : "no-active-stint";
  const remainingStops = getRemainingMandatoryStops(params.completedStops, rules);
  const alerts: RaceAlert[] = [];

  if (pitWindow === "not-open-yet") {
    alerts.push({
      severity: "info",
      entryId: params.entryId,
      code: "pit-not-open",
      message: "Pit lane not open yet.",
    });
  } else if (pitWindow === "closed") {
    alerts.push({
      severity: "critical",
      entryId: params.entryId,
      code: "pit-closed",
      message: "Pit lane is closed.",
    });
  } else if (remainingStops > 0) {
    alerts.push({
      severity: "info",
      entryId: params.entryId,
      code: "pit-open",
      message: "Pit lane is open.",
    });
  }

  if (stintStatus === "warning") {
    alerts.push({
      severity: "warning",
      entryId: params.entryId,
      code: "stint-warning",
      message: "Stint is approaching the maximum time.",
    });
  } else if (stintStatus === "critical") {
    alerts.push({
      severity: "critical",
      entryId: params.entryId,
      code: "stint-critical",
      message: "Stint is near the 50 minute limit.",
    });
  } else if (stintStatus === "over-limit") {
    alerts.push({
      severity: "critical",
      entryId: params.entryId,
      code: "stint-over-limit",
      message: "Stint exceeded the 50 minute limit.",
    });
  }

  if (remainingStops > 0) {
    alerts.push({
      severity: "info",
      entryId: params.entryId,
      code: "mandatory-stops-remaining",
      message: `${remainingStops} mandatory stops remaining.`,
    });
  }

  return {
    entryId: params.entryId,
    pitWindow,
    stintStatus,
    completedStops: params.completedStops,
    remainingStops,
    alerts,
  };
}

export function suggestNextDriver(params: {
  state: TeamState;
  entryId: EntryId;
  nowMs: number;
}): DriverSuggestion | null {
  const availableDrivers = params.state.drivers.filter(
    (driver) => !params.state.stints.some(
      (stint) => stint.driverId === driver.id && stint.endedAtMs == null,
    ),
  );

  if (availableDrivers.length === 0) return null;

  const driver =
    params.state.strategyMode === "performance"
      ? bestPerformanceDriver(availableDrivers)
      : leastUsedDriver(params.state, availableDrivers, params.nowMs);

  return {
    kind: "next-driver",
    entryId: params.entryId,
    driverId: driver.id,
    mode: params.state.strategyMode,
    reason:
      params.state.strategyMode === "performance"
        ? "Highest available performance rating."
        : "Lowest accumulated driving time.",
  };
}

export function confirmSuggestion<TSuggestion>(
  suggestion: TSuggestion,
  confirmedAtMs: number,
): ConfirmedSuggestion<TSuggestion> {
  return {
    suggestion,
    confirmedAtMs,
  };
}

function bestPerformanceDriver(drivers: Driver[]): Driver {
  return [...drivers].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]!;
}

function leastUsedDriver(
  state: TeamState,
  drivers: Driver[],
  nowMs: number,
): Driver {
  return [...drivers].sort((a, b) => {
    const timeDelta =
      getDriverTotalTimeMs(state, a.id, nowMs) -
      getDriverTotalTimeMs(state, b.id, nowMs);

    if (timeDelta !== 0) return timeDelta;
    return a.name.localeCompare(b.name);
  })[0]!;
}
