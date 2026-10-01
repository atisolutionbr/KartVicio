import { describe, expect, it } from "vitest";
import { minutes } from "@/domain/race/rules";
import {
  greenLapMs,
  projectRace,
  type EntryProjectionInput,
} from "./projection";

const TWO_HOURS = minutes(120);

describe("projectRace — virtual classification", () => {
  it("an entry that still owes more stops falls behind in the virtual order", () => {
    const inputs: EntryProjectionInput[] = [
      { entryNumber: "10", lapsDone: 40, greenLapMs: 41_000, stopsCompleted: 5 },
      { entryNumber: "20", lapsDone: 40, greenLapMs: 41_000, stopsCompleted: 1 },
    ];
    const { virtual } = projectRace(inputs, { elapsedMs: TWO_HOURS });
    const a = virtual.find((r) => r.entryNumber === "10")!;
    const b = virtual.find((r) => r.entryNumber === "20")!;
    expect(a.position).toBeLessThan(b.position);
    expect(a.netLaps).toBeGreaterThan(b.netLaps);
  });

  it("with equal pending stops, keeps the on-track order (no distortion by pace)", () => {
    const inputs: EntryProjectionInput[] = [
      { entryNumber: "1", lapsDone: 40, greenLapMs: 40_500, stopsCompleted: 3 },
      { entryNumber: "2", lapsDone: 40, greenLapMs: 43_000, stopsCompleted: 3 },
    ];
    const { virtual } = projectRace(inputs, { elapsedMs: TWO_HOURS });
    // same laps + same pending → same netLaps → tie kept as given (no slow-car boost)
    expect(virtual[0]!.netLaps).toBeCloseTo(virtual[1]!.netLaps, 6);
  });
});

describe("projectRace — prediction", () => {
  it("fewer pending stops => more projected laps (less box time to spend)", () => {
    const inputs: EntryProjectionInput[] = [
      { entryNumber: "10", lapsDone: 40, greenLapMs: 41_000, stopsCompleted: 5 },
      { entryNumber: "20", lapsDone: 40, greenLapMs: 41_000, stopsCompleted: 1 },
    ];
    const { prediction } = projectRace(inputs, { elapsedMs: TWO_HOURS });
    const a = prediction.find((r) => r.entryNumber === "10")!;
    const b = prediction.find((r) => r.entryNumber === "20")!;
    expect(a.projectedLaps).toBeGreaterThan(b.projectedLaps);
    expect(prediction[0]!.entryNumber).toBe("10");
  });

  it("with equal stops, the faster entry is predicted first", () => {
    const inputs: EntryProjectionInput[] = [
      { entryNumber: "fast", lapsDone: 40, greenLapMs: 40_500, stopsCompleted: 3 },
      { entryNumber: "slow", lapsDone: 40, greenLapMs: 41_500, stopsCompleted: 3 },
    ];
    const { prediction } = projectRace(inputs, { elapsedMs: TWO_HOURS });
    expect(prediction[0]!.entryNumber).toBe("fast");
  });
});

describe("greenLapMs", () => {
  it("ignores pit/traffic outliers (median of clean laps)", () => {
    // 41s laps + one 5min pit lap → green stays ~41s
    const green = greenLapMs([41_000, 41_200, 40_900, 341_000, 41_100]);
    expect(green).not.toBeNull();
    expect(green!).toBeLessThan(42_000);
  });
});
