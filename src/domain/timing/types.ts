export type Gap =
  | { type: "none"; raw?: string | null }
  | { type: "time"; raw: string; ms: number }
  | { type: "laps"; raw: string; laps: number }
  | { type: "other"; raw: string };

export type FlagState = "unknown" | "green" | "yellow" | "red" | "checkered";

export type LapEvent = {
  entryNumber: string;
  lapNumber: number;
  lapTimeMs: number | null;
  capturedAtMs: number;
};

export type TimingEntry = {
  position: number;
  entryNumber: string;
  displayName: string;
  lapCount: number;
  lastLapMs: number | null;
  bestLapMs: number | null;
  bestLapNumber: number | null;
  gapToLeader: Gap;
  gapToNext: Gap;
  state?: string | null;
};

export type TimingSnapshot = {
  capturedAtMs: number;
  raceClockMs: number | null;
  flag: FlagState;
  entries: TimingEntry[];
};

export type TimingProvider = {
  getSnapshot(): Promise<TimingSnapshot | null>;
};
