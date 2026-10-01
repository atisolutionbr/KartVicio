import { describe, expect, it } from "vitest";
import { replaySnapshots } from "@/domain/timing/mock-provider";
import { MyLapTimeHtmlProvider } from "./html-provider";

const html = `
  <div class="lt-timer-value">00:01:05</div>
  <div class="lt-competitor-row">
    <span class="lt-pos-badge">1</span>
    <span class="lt-driver-number">#12</span>
    <span class="lt-driver-name">FDK 12</span>
    <div class="lt-mobile-stat"><span class="lt-stat-label">LAP</span><span class="lt-stat-value">1</span></div>
    <div class="lt-mobile-stat"><span class="lt-stat-label">T.U.V</span><span class="lt-stat-value">1:05.000</span></div>
  </div>
`;

describe("MyLapTimeHtmlProvider", () => {
  it("replays HTML frames as normalized snapshots", async () => {
    const provider = new MyLapTimeHtmlProvider([
      { html, capturedAtMs: 1_000 },
      { html, capturedAtMs: 2_000 },
    ]);

    const snapshots = await replaySnapshots(provider);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]?.entries[0]).toMatchObject({
      entryNumber: "12",
      lapCount: 1,
      lastLapMs: 65_000,
    });
    expect(snapshots[1]?.capturedAtMs).toBe(2_000);
  });
});
