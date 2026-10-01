import { describe, expect, it } from "vitest";
import { extractMyLapTimeSnapshot } from "./extractor";

const fixture = `
  <div class="lt-timer-value">00:49:12</div>
  <div class="lt-timer-flag green"></div>
  <div class="lt-table-header">
    <div class="lt-th-center">M.V</div>
    <div class="lt-th-center">T.M.V</div>
    <div class="lt-th-center">LAP</div>
    <div class="lt-th-center">T.U.V</div>
    <div class="lt-th-center">DIFF</div>
    <div class="lt-th-center">GAP</div>
  </div>
  <div class="lt-competitor-row">
    <span class="lt-pos-badge">1</span>
    <span class="lt-driver-number">#12</span>
    <span class="lt-driver-name">FDK 12</span>
    <span class="lt-driver-state">PISTA</span>
    <div class="lt-row-desktop">
      <span class="lt-data-cell lt-data-cell--pos">1</span>
      <span class="lt-data-cell lt-data-cell--driver">FDK 12</span>
      <span class="lt-data-cell">42</span>
      <span class="lt-data-cell">1:04.980</span>
      <span class="lt-data-cell">45</span>
      <span class="lt-data-cell">1:05.120</span>
      <span class="lt-data-cell">---</span>
      <span class="lt-data-cell">---</span>
    </div>
  </div>
  <div class="lt-competitor-row">
    <span class="lt-pos-badge">2</span>
    <span class="lt-driver-number">#27</span>
    <span class="lt-driver-name">FDK 27</span>
    <span class="lt-driver-state">BOX</span>
    <div class="lt-mobile-stat"><span class="lt-stat-label">M.V</span><span class="lt-stat-value">40</span></div>
    <div class="lt-mobile-stat"><span class="lt-stat-label">T.M.V</span><span class="lt-stat-value">1:05.500</span></div>
    <div class="lt-mobile-stat"><span class="lt-stat-label">LAP</span><span class="lt-stat-value">44</span></div>
    <div class="lt-mobile-stat"><span class="lt-stat-label">T.U.V</span><span class="lt-stat-value">1:05.720</span></div>
    <div class="lt-mobile-stat"><span class="lt-stat-label">DIFF</span><span class="lt-stat-value">+1 volta</span></div>
    <div class="lt-mobile-stat"><span class="lt-stat-label">GAP</span><span class="lt-stat-value">+3.200</span></div>
  </div>
`;

describe("MyLapTime extractor", () => {
  it("extracts a normalized timing snapshot from rendered LiveTime HTML", () => {
    expect(extractMyLapTimeSnapshot(fixture, 123_000)).toEqual({
      capturedAtMs: 123_000,
      raceClockMs: 2_952_000,
      flag: "green",
      entries: [
        {
          position: 1,
          entryNumber: "12",
          displayName: "FDK 12",
          lapCount: 45,
          lastLapMs: 65_120,
          bestLapMs: 64_980,
          bestLapNumber: 42,
          gapToLeader: { type: "none", raw: "---" },
          gapToNext: { type: "none", raw: "---" },
          state: "PISTA",
        },
        {
          position: 2,
          entryNumber: "27",
          displayName: "FDK 27",
          lapCount: 44,
          lastLapMs: 65_720,
          bestLapMs: 65_500,
          bestLapNumber: 40,
          gapToLeader: { type: "laps", raw: "+1 volta", laps: 1 },
          gapToNext: { type: "time", raw: "+3.200", ms: 3_200 },
          state: "BOX",
        },
      ],
    });
  });
});
