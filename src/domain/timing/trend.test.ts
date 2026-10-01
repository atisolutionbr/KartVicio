import { describe, expect, it } from "vitest";
import type { TimingSnapshot } from "./types";
import { buildEntryTrend, buildTrendChartRows, keepRecentSnapshots } from "./trend";

const snapshot = (lap: number, lapTimeMs: number, capturedAtMs: number): TimingSnapshot => ({
  capturedAtMs,
  raceClockMs: capturedAtMs,
  flag: "green",
  entries: [{
    position: 2,
    entryNumber: "11",
    displayName: "FDK",
    lapCount: lap,
    lastLapMs: lapTimeMs,
    bestLapMs: lapTimeMs,
    bestLapNumber: lap,
    gapToLeader: { type: "time", raw: "+1.000", ms: 1_000 },
    gapToNext: { type: "time", raw: "+0.500", ms: 500 },
  }],
});

describe("timing trend", () => {
  it("emits one point per new lap and calculates rolling pace", () => {
    const snapshots = [
      snapshot(1, 60_000, 1_000),
      snapshot(1, 60_000, 2_000),
      snapshot(2, 62_000, 3_000),
    ];
    const trend = buildEntryTrend(snapshots, "11", 2);
    expect(trend).toHaveLength(2);
    expect(trend[1]?.rollingPaceMs).toBe(61_000);
  });

  it("keeps only the configured recent snapshot window", () => {
    expect(keepRecentSnapshots([snapshot(1, 60_000, 1), snapshot(2, 61_000, 2)], 1))
      .toHaveLength(1);
  });

  it("builds chart rows using lap on the horizontal axis", () => {
    const rows = buildTrendChartRows(
      [snapshot(1, 60_000, 60_000), snapshot(2, 62_000, 120_000)],
      ["11"],
      "pace",
    );
    expect(rows.map((row) => row.lap)).toEqual([1, 2]);
    expect(rows[1]?.["11"]).toBe(61_000);
  });

  it("builds gap and position series", () => {
    const snapshots = [snapshot(1, 60_000, 60_000)];
    expect(buildTrendChartRows(snapshots, ["11"], "gap")[0]?.["11"]).toBe(1);
    expect(buildTrendChartRows(snapshots, ["11"], "position")[0]?.["11"]).toBe(2);
  });
});
