import { describe, expect, it } from "vitest";
import type { TimingSnapshot } from "@/domain/timing/types";
import { createMockTeamState, dashboardEntryInputs, raceElapsedMs } from "./mock-race";
import { buildRaceControlEntries } from "./view-model";
import { mergeLiveTimingViews } from "./live-view";

function liveSnapshot(position: number, lapTimeMs: number, capturedAtMs: number): TimingSnapshot {
  return {
    capturedAtMs,
    raceClockMs: capturedAtMs,
    flag: "green",
    entries: [{
      position,
      entryNumber: "012",
      displayName: "FDK",
      lapCount: capturedAtMs / 1_000,
      lastLapMs: lapTimeMs,
      bestLapMs: lapTimeMs,
      bestLapNumber: 1,
      gapToLeader: { type: "time", raw: "+2.500", ms: 2_500 },
      gapToNext: { type: "time", raw: "+1.000", ms: 1_000 },
    }],
  };
}

describe("mergeLiveTimingViews", () => {
  it("overrides mock position, pace and gap using live timing", () => {
    const views = buildRaceControlEntries({
      state: createMockTeamState(),
      inputs: dashboardEntryInputs,
      elapsedMs: raceElapsedMs,
    });
    const merged = mergeLiveTimingViews(views, [liveSnapshot(7, 64_321, 1_000)]);
    expect(merged[0]).toMatchObject({ position: 7, pace: "1:04.321", gap: "+2.500s" });
  });

  it("calculates position trend between the latest snapshots", () => {
    const views = buildRaceControlEntries({
      state: createMockTeamState(),
      inputs: dashboardEntryInputs,
      elapsedMs: raceElapsedMs,
    });
    const merged = mergeLiveTimingViews(views, [
      liveSnapshot(8, 65_000, 1_000),
      liveSnapshot(6, 64_000, 2_000),
    ]);
    expect(merged[0]?.trend).toBe("up");
  });
});
