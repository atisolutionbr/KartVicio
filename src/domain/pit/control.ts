import {
  evaluateStopDuration,
  type RaceRules,
  type StopValidity,
} from "@/domain/race/rules";

export type PitStopControl =
  | {
      status: "idle";
      entryId: string;
    }
  | {
      status: "in-box";
      entryId: string;
      startedAtMs: number;
    }
  | {
      status: "complete";
      entryId: string;
      startedAtMs: number;
      endedAtMs: number;
      validity: StopValidity;
    };

export function createIdlePitStop(entryId: string): PitStopControl {
  return {
    status: "idle",
    entryId,
  };
}

export function startPitStop(
  control: PitStopControl,
  startedAtMs: number,
): PitStopControl {
  if (control.status === "in-box") return control;

  return {
    status: "in-box",
    entryId: control.entryId,
    startedAtMs,
  };
}

export function completePitStop(
  control: PitStopControl,
  endedAtMs: number,
  rules?: RaceRules,
): PitStopControl {
  if (control.status !== "in-box") return control;

  return {
    status: "complete",
    entryId: control.entryId,
    startedAtMs: control.startedAtMs,
    endedAtMs,
    validity: evaluateStopDuration(endedAtMs - control.startedAtMs, rules),
  };
}

export function resetPitStop(control: PitStopControl): PitStopControl {
  return createIdlePitStop(control.entryId);
}

export function getPitStopElapsedMs(
  control: PitStopControl,
  nowMs: number,
): number {
  if (control.status === "idle") return 0;
  if (control.status === "complete") {
    return Math.max(0, control.endedAtMs - control.startedAtMs);
  }
  return Math.max(0, nowMs - control.startedAtMs);
}
