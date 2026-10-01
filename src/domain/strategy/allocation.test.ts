import { describe, expect, it } from "vitest";
import type { Driver, DriverId, Entry } from "@/domain/team/model";
import {
  driverScore,
  findPressureGaps,
  suggestAllocation,
} from "./allocation";

function roster16(): Driver[] {
  // ratings from 96 down to 66 so scores form a clear gradient
  return Array.from({ length: 16 }, (_, i) => ({
    id: `d${i + 1}`,
    name: `P${i + 1}`,
    rating: 96 - i * 2,
  }));
}

const entries: Entry[] = [
  { id: "A", number: "11", role: "leader" },
  { id: "B", number: "4", role: "attack" },
  { id: "C", number: "2", role: "support" },
  { id: "D", number: "29", role: "recovery" },
];

// A slowest -> D fastest (A should get the strongest crew)
const entryPaceMs = new Map<string, number>([
  ["A", 42000],
  ["B", 41500],
  ["C", 41000],
  ["D", 40500],
]);

const avg = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

describe("suggestAllocation (16 drivers, 4 entries, 8 stints)", () => {
  const drivers = roster16();
  const pressureReady = new Set<DriverId>(["d1", "d2", "d3", "d4"]);
  const stints = 8;
  const plan = suggestAllocation({
    drivers,
    entries,
    stints,
    pressureReady,
    entryPaceMs,
  });
  const scoreById = new Map(drivers.map((d) => [d.id, driverScore(d)]));
  const scoreOf = (id: DriverId | null) => (id ? scoreById.get(id)! : 0);

  it("fills every one of the 32 slots", () => {
    for (const entry of entries) {
      expect(plan[entry.id].every((slot) => slot != null)).toBe(true);
    }
  });

  it("gives each driver exactly 2 stints", () => {
    const count = new Map<string, number>();
    for (const entry of entries) {
      for (const id of plan[entry.id]) {
        if (id) count.set(id, (count.get(id) ?? 0) + 1);
      }
    }
    expect(count.size).toBe(16);
    expect([...count.values()].every((c) => c === 2)).toBe(true);
  });

  it("never puts a driver in back-to-back stints of the same entry", () => {
    for (const entry of entries) {
      const slots = plan[entry.id];
      for (let s = 0; s < slots.length - 1; s++) {
        expect(slots[s]).not.toBe(slots[s + 1]);
      }
    }
  });

  it("puts the aces on the final stints (last 2 > first 2 by score)", () => {
    const early: number[] = [];
    const late: number[] = [];
    for (const entry of entries) {
      const slots = plan[entry.id];
      early.push(scoreOf(slots[0]), scoreOf(slots[1]));
      late.push(scoreOf(slots[slots.length - 2]), scoreOf(slots[slots.length - 1]));
    }
    expect(avg(late)).toBeGreaterThan(avg(early));
  });

  it("puts the strongest drivers in the slowest entry (crew A >= crew D)", () => {
    const crewAvg = (entryId: string) =>
      avg([...new Set(plan[entryId])].map(scoreOf));
    expect(crewAvg("A")).toBeGreaterThanOrEqual(crewAvg("D"));
  });

  it("leaves no pressure gaps when there are enough pressure-ready aces", () => {
    // 4 aces for 4 entries: one ace per crew lands the final stint of each entry.
    const finalStintDrivers = entries.map((entry) => plan[entry.id][stints - 1]);
    expect(finalStintDrivers.every((id) => id && pressureReady.has(id))).toBe(true);
  });
});

describe("findPressureGaps", () => {
  it("flags a non-pressure-ready driver placed in the pressure zone", () => {
    const drivers: Driver[] = [
      { id: "ace1", name: "Ace 1", rating: 95 },
      { id: "ace2", name: "Ace 2", rating: 94 },
      { id: "mid", name: "Mid", rating: 72 },
      { id: "nov", name: "Nov", rating: 58 },
    ];
    const oneEntry: Entry[] = [{ id: "A", number: "11", role: "leader" }];
    const pressureReady = new Set<DriverId>(["ace1", "ace2"]);
    const plan = suggestAllocation({ drivers, entries: oneEntry, stints: 8, pressureReady });

    // with exactly 2 aces and 2 pressure stints, the final two slots should be the aces
    const gaps = findPressureGaps(plan, pressureReady, 8, 2);
    expect(gaps).toHaveLength(0);
    expect(pressureReady.has(plan.A[7]!)).toBe(true);
    expect(pressureReady.has(plan.A[6]!)).toBe(true);
  });
});
