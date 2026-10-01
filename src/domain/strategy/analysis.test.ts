import { describe, expect, it } from "vitest";
import {
  catchLaps,
  currentStint,
  degradation,
  driverRating,
  paceRank,
  pairTrend,
  stints,
  timeline,
  type DriverLaps,
  type Lap,
} from "./analysis";

const GREEN = 41_000;
const PIT = 300_000; // volta com parada embutida (~5 min)

/** gera voltas de ritmo ~base (ms) com jitter determinístico. */
function laps(base: number, count: number, startN = 1, jitter = 0): Lap[] {
  return Array.from({ length: count }, (_, i) => ({
    n: startN + i,
    ms: base + (jitter ? ((i % 3) - 1) * jitter : 0),
  }));
}

describe("stints", () => {
  it("splits the history at pit laps", () => {
    const history: Lap[] = [
      ...laps(GREEN, 10),
      { n: 11, ms: PIT },
      ...laps(GREEN, 8, 12),
    ];
    const segs = stints(history, GREEN);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.count).toBe(11);
    expect(segs[0]!.pitLapMs).toBe(PIT);
    expect(segs[1]!.count).toBe(8);
    expect(segs[1]!.pitLapMs).toBeNull();
  });
});

describe("currentStint", () => {
  it("counts stops directly and reports the ongoing stint", () => {
    const history: Lap[] = [
      ...laps(GREEN, 10),
      { n: 11, ms: PIT },
      ...laps(GREEN, 5, 12),
    ];
    const cur = currentStint(history, GREEN)!;
    expect(cur.stopsSoFar).toBe(1);
    expect(cur.justPitted).toBe(false);
    expect(cur.lapsInStint).toBe(5);
  });

  it("zeroes the stint right after a pit lap", () => {
    const history: Lap[] = [...laps(GREEN, 10), { n: 11, ms: PIT }];
    const cur = currentStint(history, GREEN)!;
    expect(cur.stopsSoFar).toBe(1);
    expect(cur.justPitted).toBe(true);
    expect(cur.lapsInStint).toBe(0);
  });
});

describe("degradation", () => {
  it("flags a fading pace (getting slower) as down", () => {
    // começa em 41s e sobe pra ~43s
    const rising: Lap[] = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, ms: GREEN + i * 200 }));
    const deg = degradation(rising, GREEN)!;
    expect(deg.dir).toBe("down");
    expect(deg.delta).toBeGreaterThan(0);
  });

  it("reports flat when pace is steady", () => {
    const steady = laps(GREEN, 12);
    const deg = degradation(steady, GREEN)!;
    expect(deg.dir).toBe("flat");
  });
});

describe("paceRank", () => {
  it("ranks entries by green pace (fastest first)", () => {
    const drivers: DriverLaps[] = [
      { number: "10", laps: laps(42_000, 8) },
      { number: "20", laps: laps(40_000, 8) },
      { number: "30", laps: laps(41_000, 8) },
    ];
    const rank = paceRank(drivers);
    expect(rank.get("20")!.rank).toBe(1);
    expect(rank.get("30")!.rank).toBe(2);
    expect(rank.get("10")!.rank).toBe(3);
  });
});

describe("pairTrend + catchLaps", () => {
  it("positive rate means I'm reeling the other in, and estimates the catch", () => {
    // eu 40.5s, ele 41.0s → ganho ~500ms/volta
    const me: Lap[] = laps(40_500, 8);
    const other: Lap[] = laps(41_000, 8);
    const trend = pairTrend(me, other)!;
    expect(trend.ratePerLap).toBeCloseTo(500, 0);
    // gap de 5s a 500ms/volta ≈ 10 voltas
    expect(catchLaps(5_000, trend.ratePerLap)!).toBeCloseTo(10, 5);
  });

  it("catchLaps is null when not closing (rate <= 0)", () => {
    expect(catchLaps(5_000, 0)).toBeNull();
    expect(catchLaps(5_000, -300)).toBeNull();
  });
});

describe("timeline", () => {
  it("captures pit and fastest events, most recent first", () => {
    const drivers: DriverLaps[] = [
      {
        number: "7",
        name: "Kart 7",
        laps: [...laps(41_000, 5), { n: 6, ms: PIT }, ...laps(41_000, 3, 7)],
      },
    ];
    const events = timeline(drivers);
    expect(events.some((e) => e.type === "pit" && e.number === "7")).toBe(true);
    // ordenado do mais recente (maior n) para o mais antigo
    expect(events[0]!.n).toBeGreaterThanOrEqual(events[events.length - 1]!.n);
  });
});

describe("driverRating", () => {
  it("gives ~100 to the reference pace with tight consistency", () => {
    const r = driverRating({ greenMs: 41_000, sdMs: 200 }, { refBestMs: 41_000 })!;
    expect(r.speed).toBe(100);
    expect(r.overall).toBeGreaterThan(90);
  });

  it("penalizes a slower entry", () => {
    const fast = driverRating({ greenMs: 41_000, sdMs: 200 }, { refBestMs: 41_000 })!;
    const slow = driverRating({ greenMs: 43_000, sdMs: 200 }, { refBestMs: 41_000 })!;
    expect(slow.speed).toBeLessThan(fast.speed);
    expect(slow.overall).toBeLessThan(fast.overall);
  });

  it("returns null without a reference or pace", () => {
    expect(driverRating({ greenMs: null }, { refBestMs: 41_000 })).toBeNull();
    expect(driverRating({ greenMs: 41_000 }, { refBestMs: null })).toBeNull();
  });
});
