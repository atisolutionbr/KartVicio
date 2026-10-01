import { describe, expect, it } from "vitest";
import {
  createMockTeamState,
  dashboardEntryInputs,
  raceElapsedMs,
} from "./mock-race";
import {
  buildRaceControlEntries,
  formatDuration,
  formatLapTime,
  formatSignedSeconds,
} from "./view-model";

describe("race control view model", () => {
  it("builds display entries with calculated pace and recommendations", () => {
    const entries = buildRaceControlEntries({
      state: createMockTeamState(),
      inputs: dashboardEntryInputs,
      elapsedMs: raceElapsedMs,
    });

    expect(entries).toHaveLength(4);
    expect(entries[0]).toMatchObject({
      entryId: "entry-12",
      pace: "1:05.020",
      projectedLoss: "0s",
      recommendation: "keep",
    });
    expect(entries[3]?.recommendation).toBe("call");
  });

  it("changes suggestions when strategy mode changes", () => {
    const performanceEntries = buildRaceControlEntries({
      state: createMockTeamState({ strategyMode: "performance" }),
      inputs: dashboardEntryInputs,
      elapsedMs: raceElapsedMs,
    });
    const participationEntries = buildRaceControlEntries({
      state: createMockTeamState({ strategyMode: "participation" }),
      inputs: dashboardEntryInputs,
      elapsedMs: raceElapsedMs,
    });

    expect(performanceEntries[0]?.suggestion?.mode).toBe("performance");
    expect(participationEntries[0]?.suggestion?.mode).toBe("participation");
  });

  it("formats lap time and deltas for display", () => {
    expect(formatLapTime(65_020)).toBe("1:05.020");
    expect(formatLapTime(null)).toBe("--");
    expect(formatSignedSeconds(1_234)).toBe("+1.23s");
    expect(formatSignedSeconds(-320)).toBe("-0.32s");
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(28_400)).toBe("28s");
    expect(formatDuration(88_000)).toBe("1m 28s");
  });
});
