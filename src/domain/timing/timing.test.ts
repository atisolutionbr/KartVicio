import { describe, expect, it } from "vitest";
import { parseGap, parseTimeToMs } from "./gaps";
import { appendLapEvents, detectNewLaps } from "./laps";
import { MOCK_TIMING_SNAPSHOTS } from "./mock-data";
import { MockTimingProvider, replaySnapshots } from "./mock-provider";

describe("timing domain", () => {
  it("parses lap times and race times into milliseconds", () => {
    expect(parseTimeToMs("45.203")).toBe(45_203);
    expect(parseTimeToMs("1:02.540")).toBe(62_540);
    expect(parseTimeToMs("1:30:52.497")).toBe(5_452_497);
    expect(parseTimeToMs("---")).toBeNull();
  });

  it("parses gaps as none, time, laps, or other", () => {
    expect(parseGap("---")).toEqual({ type: "none", raw: "---" });
    expect(parseGap("+0.523")).toEqual({ type: "time", raw: "+0.523", ms: 523 });
    expect(parseGap("+1 volta")).toEqual({
      type: "laps",
      raw: "+1 volta",
      laps: 1,
    });
    expect(parseGap("box")).toEqual({ type: "other", raw: "box" });
  });

  it("replays mock snapshots in order", async () => {
    const provider = new MockTimingProvider(MOCK_TIMING_SNAPSHOTS);

    await expect(replaySnapshots(provider)).resolves.toEqual(
      MOCK_TIMING_SNAPSHOTS,
    );
  });

  it("detects initial and subsequent new laps", () => {
    const first = MOCK_TIMING_SNAPSHOTS[0]!;
    const second = MOCK_TIMING_SNAPSHOTS[1]!;

    expect(detectNewLaps(null, first)).toEqual([
      {
        entryNumber: "12",
        lapNumber: 1,
        lapTimeMs: 65_120,
        capturedAtMs: 1_000,
      },
      {
        entryNumber: "27",
        lapNumber: 1,
        lapTimeMs: 65_900,
        capturedAtMs: 1_000,
      },
      {
        entryNumber: "8",
        lapNumber: 1,
        lapTimeMs: 66_400,
        capturedAtMs: 1_000,
      },
    ]);

    expect(detectNewLaps(first, second)).toEqual([
      {
        entryNumber: "12",
        lapNumber: 2,
        lapTimeMs: 64_980,
        capturedAtMs: 70_000,
      },
      {
        entryNumber: "27",
        lapNumber: 2,
        lapTimeMs: 65_500,
        capturedAtMs: 70_000,
      },
      {
        entryNumber: "8",
        lapNumber: 2,
        lapTimeMs: 66_000,
        capturedAtMs: 70_000,
      },
    ]);
  });

  it("accumulates lap history without duplicates", () => {
    const firstEvents = detectNewLaps(null, MOCK_TIMING_SNAPSHOTS[0]!);
    const secondEvents = detectNewLaps(
      MOCK_TIMING_SNAPSHOTS[0]!,
      MOCK_TIMING_SNAPSHOTS[1]!,
    );

    const history = appendLapEvents(
      appendLapEvents([], firstEvents),
      [...firstEvents, ...secondEvents],
    );

    expect(history).toHaveLength(6);
    expect(history.filter((lap) => lap.entryNumber === "12")).toHaveLength(2);
  });
});
