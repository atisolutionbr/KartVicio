import { parseGap } from "./gaps";
import type { TimingSnapshot } from "./types";

export const MOCK_TIMING_SNAPSHOTS: TimingSnapshot[] = [
  {
    capturedAtMs: 1_000,
    raceClockMs: 60_000,
    flag: "green",
    entries: [
      entry(1, "12", "FDK 12", 1, 65_120, 65_120, 1, "---", "---"),
      entry(2, "27", "FDK 27", 1, 65_900, 65_900, 1, "+0.780", "+0.780"),
      entry(3, "8", "Rival 8", 1, 66_400, 66_400, 1, "+1.280", "+0.500"),
    ],
  },
  {
    capturedAtMs: 70_000,
    raceClockMs: 130_000,
    flag: "green",
    entries: [
      entry(1, "12", "FDK 12", 2, 64_980, 64_980, 2, "---", "---"),
      entry(2, "27", "FDK 27", 2, 65_500, 65_500, 2, "+1.300", "+1.300"),
      entry(3, "8", "Rival 8", 2, 66_000, 66_000, 2, "+2.300", "+1.000"),
    ],
  },
  {
    capturedAtMs: 135_000,
    raceClockMs: 195_000,
    flag: "yellow",
    entries: [
      entry(1, "12", "FDK 12", 3, 68_000, 64_980, 2, "---", "---"),
      entry(2, "8", "Rival 8", 3, 65_100, 65_100, 3, "+0.400", "+0.400"),
      entry(3, "27", "FDK 27", 3, 69_200, 65_500, 2, "+2.100", "+1.700"),
    ],
  },
];

function entry(
  position: number,
  entryNumber: string,
  displayName: string,
  lapCount: number,
  lastLapMs: number,
  bestLapMs: number,
  bestLapNumber: number,
  gapToLeader: string,
  gapToNext: string,
) {
  return {
    position,
    entryNumber,
    displayName,
    lapCount,
    lastLapMs,
    bestLapMs,
    bestLapNumber,
    gapToLeader: parseGap(gapToLeader),
    gapToNext: parseGap(gapToNext),
    state: null,
  };
}
