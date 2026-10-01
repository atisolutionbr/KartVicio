import { describe, expect, it } from "vitest";
import { MyLapTimePlaywrightProvider } from "./playwright-provider";

describe("MyLapTimePlaywrightProvider", () => {
  it("reads the current page HTML and returns a normalized snapshot", async () => {
    const provider = new MyLapTimePlaywrightProvider(
      {
        async content() {
          return `
            <div class="lt-timer-value">00:02:10</div>
            <div class="lt-competitor-row">
              <span class="lt-pos-badge">1</span>
              <span class="lt-driver-number">#12</span>
              <span class="lt-driver-name">FDK 12</span>
              <div class="lt-mobile-stat"><span class="lt-stat-label">LAP</span><span class="lt-stat-value">2</span></div>
              <div class="lt-mobile-stat"><span class="lt-stat-label">T.U.V</span><span class="lt-stat-value">1:05.000</span></div>
            </div>
          `;
        },
      },
      { now: () => 9_000 },
    );

    await expect(provider.getSnapshot()).resolves.toMatchObject({
      capturedAtMs: 9_000,
      raceClockMs: 130_000,
      entries: [
        {
          entryNumber: "12",
          lapCount: 2,
          lastLapMs: 65_000,
        },
      ],
    });
  });
});
