import type { Driver, DriverId, Entry, EntryId } from "@/domain/team/model";

/*
 * Allocation planner: suggests who drives each stint across the team's entries.
 *
 * Respects, in order:
 *   1. pressure-ready drivers land on the FINAL stints (the crunch);
 *   2. the strongest drivers go to the SLOWEST entries (rental karts vary);
 *   3. even usage (~same number of stints per driver);
 *   4. no back-to-back stints in the same entry (fatigue).
 *
 * It is a suggestion — the team chief adjusts on top. Pure function, no I/O.
 */

const DEFAULT_RATING = 70;
const PRESSURE_BONUS = 15;

export type AllocationInput = {
  drivers: Driver[];
  entries: Entry[];
  stints: number;
  /** drivers considered ready for high-pressure final stints */
  pressureReady?: ReadonlySet<DriverId>;
  /** green pace per entry in ms (lower = faster); missing entries treated as average */
  entryPaceMs?: ReadonlyMap<EntryId, number>;
  /** how many final stints count as the pressure zone (default 2) */
  pressureStints?: number;
};

/** grid[entryId][stintIndex] = driverId or null when unassigned */
export type AllocationPlan = Record<EntryId, (DriverId | null)[]>;

export function driverScore(driver: Driver): number {
  return driver.rating ?? DEFAULT_RATING;
}

export function suggestAllocation(input: AllocationInput): AllocationPlan {
  const { drivers, entries, stints } = input;
  const plan: AllocationPlan = {};
  for (const entry of entries) {
    plan[entry.id] = Array.from({ length: stints }, () => null);
  }
  if (drivers.length === 0 || entries.length === 0) return plan;

  const pressureReady = input.pressureReady ?? new Set<DriverId>();

  // Entries ordered slowest first, so the snake draft feeds them the best drivers.
  const paces = entries
    .map((entry) => input.entryPaceMs?.get(entry.id))
    .filter((value): value is number => value != null);
  const avgPace = paces.length ? paces.reduce((a, b) => a + b, 0) / paces.length : 0;
  const paceOf = (entry: Entry) => input.entryPaceMs?.get(entry.id) ?? avgPace;
  const entryOrder = [...entries].sort((a, b) => paceOf(b) - paceOf(a));

  // Snake draft: strongest drivers spread across crews (slowest entry picks first).
  const byScore = [...drivers].sort((a, b) => driverScore(b) - driverScore(a));
  const crews = new Map<EntryId, Driver[]>(entryOrder.map((entry) => [entry.id, []]));
  let idx = 0;
  let dir = 1;
  for (const driver of byScore) {
    crews.get(entryOrder[idx]!.id)!.push(driver);
    idx += dir;
    if (idx >= entryOrder.length) {
      idx = entryOrder.length - 1;
      dir = -1;
    } else if (idx < 0) {
      idx = 0;
      dir = 1;
    }
  }

  // Within each entry, order the crew ascending by (score + pressure bonus) and fill
  // stints cyclically: the strongest/pressure-ready land on the final stints, and the
  // cycle guarantees nobody repeats in back-to-back stints (crew size >= 2).
  const keyOf = (driver: Driver) =>
    driverScore(driver) + (pressureReady.has(driver.id) ? PRESSURE_BONUS : 0);
  for (const entry of entries) {
    const crew = [...(crews.get(entry.id) ?? [])].sort((a, b) => keyOf(a) - keyOf(b));
    if (crew.length === 0) continue;
    for (let s = 0; s < stints; s++) {
      plan[entry.id]![s] = crew[s % crew.length]!.id;
    }
  }
  return plan;
}

export type PressureGap = {
  entryId: EntryId;
  stintIndex: number;
  driverId: DriverId;
};

/**
 * Slots in the pressure zone (the last `pressureStints` stints) that were filled with a
 * driver who is NOT pressure-ready — the chief should review these.
 */
export function findPressureGaps(
  plan: AllocationPlan,
  pressureReady: ReadonlySet<DriverId>,
  stints: number,
  pressureStints = 2,
): PressureGap[] {
  const firstPressureStint = Math.max(0, stints - pressureStints);
  const gaps: PressureGap[] = [];
  for (const [entryId, slots] of Object.entries(plan)) {
    for (let s = firstPressureStint; s < slots.length; s++) {
      const driverId = slots[s];
      if (driverId && !pressureReady.has(driverId)) {
        gaps.push({ entryId, stintIndex: s, driverId });
      }
    }
  }
  return gaps;
}
