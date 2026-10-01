import { describe, expect, it } from "vitest";
import {
  assignDriverToEntry,
  changeEntryRole,
  createTeamState,
  endActiveStint,
  getActiveStintForDriver,
  getActiveStintForEntry,
  getDriverTotalTimeMs,
  setStrategyMode,
  type Driver,
  type Entry,
  type TeamState,
} from "./model";

const drivers: Driver[] = [
  { id: "driver-1", name: "Ana", rating: 9 },
  { id: "driver-2", name: "Bruno", rating: 7 },
  { id: "driver-3", name: "Caio", rating: 8 },
];

const entries: Entry[] = [
  { id: "entry-12", number: "12", role: "leader" },
  { id: "entry-27", number: "27", role: "support" },
];

function baseState(): TeamState {
  return createTeamState({ drivers, entries });
}

describe("team model", () => {
  it("assigns a driver to an entry manually", () => {
    const result = assignDriverToEntry(baseState(), {
      stintId: "stint-1",
      entryId: "entry-12",
      driverId: "driver-1",
      startedAtMs: 1_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stint).toMatchObject({
      id: "stint-1",
      entryId: "entry-12",
      driverId: "driver-1",
      startedAtMs: 1_000,
    });
    expect(getActiveStintForEntry(result.state, "entry-12")?.id).toBe(
      "stint-1",
    );
  });

  it("does not allow an entry to have two active drivers", () => {
    const first = assignDriverToEntry(baseState(), {
      stintId: "stint-1",
      entryId: "entry-12",
      driverId: "driver-1",
      startedAtMs: 1_000,
    });
    if (!first.ok) throw new Error("expected first assignment to succeed");

    const second = assignDriverToEntry(first.state, {
      stintId: "stint-2",
      entryId: "entry-12",
      driverId: "driver-2",
      startedAtMs: 2_000,
    });

    expect(second).toEqual({ ok: false, reason: "entry-already-active" });
  });

  it("does not allow a driver to be active in two entries at the same time", () => {
    const first = assignDriverToEntry(baseState(), {
      stintId: "stint-1",
      entryId: "entry-12",
      driverId: "driver-1",
      startedAtMs: 1_000,
    });
    if (!first.ok) throw new Error("expected first assignment to succeed");

    const second = assignDriverToEntry(first.state, {
      stintId: "stint-2",
      entryId: "entry-27",
      driverId: "driver-1",
      startedAtMs: 2_000,
    });

    expect(second).toEqual({ ok: false, reason: "driver-already-active" });
  });

  it("allows a driver to move between entries across different stints", () => {
    const first = assignDriverToEntry(baseState(), {
      stintId: "stint-1",
      entryId: "entry-12",
      driverId: "driver-1",
      startedAtMs: 1_000,
    });
    if (!first.ok) throw new Error("expected first assignment to succeed");

    const afterStop = endActiveStint(first.state, {
      entryId: "entry-12",
      endedAtMs: 11_000,
    });

    const second = assignDriverToEntry(afterStop, {
      stintId: "stint-2",
      entryId: "entry-27",
      driverId: "driver-1",
      startedAtMs: 20_000,
    });

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(getActiveStintForDriver(second.state, "driver-1")?.entryId).toBe(
      "entry-27",
    );
  });

  it("records role changes", () => {
    const state = changeEntryRole(baseState(), {
      entryId: "entry-27",
      role: "attack",
      changedAtMs: 30_000,
    });

    expect(state.entries.find((entry) => entry.id === "entry-27")?.role).toBe(
      "attack",
    );
    expect(state.roleChanges).toEqual([
      { entryId: "entry-27", role: "attack", changedAtMs: 30_000 },
    ]);
  });

  it("calculates total driver time across ended and active stints", () => {
    const first = assignDriverToEntry(baseState(), {
      stintId: "stint-1",
      entryId: "entry-12",
      driverId: "driver-1",
      startedAtMs: 1_000,
    });
    if (!first.ok) throw new Error("expected first assignment to succeed");

    const ended = endActiveStint(first.state, {
      entryId: "entry-12",
      endedAtMs: 11_000,
    });

    const second = assignDriverToEntry(ended, {
      stintId: "stint-2",
      entryId: "entry-27",
      driverId: "driver-1",
      startedAtMs: 20_000,
    });
    if (!second.ok) throw new Error("expected second assignment to succeed");

    expect(getDriverTotalTimeMs(second.state, "driver-1", 25_000)).toBe(
      15_000,
    );
  });

  it("switches strategy mode", () => {
    const state = setStrategyMode(baseState(), "performance");

    expect(state.strategyMode).toBe("performance");
  });

  it("rejects unknown entries and drivers", () => {
    expect(
      assignDriverToEntry(baseState(), {
        stintId: "stint-1",
        entryId: "missing",
        driverId: "driver-1",
        startedAtMs: 1_000,
      }),
    ).toEqual({ ok: false, reason: "entry-not-found" });

    expect(
      assignDriverToEntry(baseState(), {
        stintId: "stint-1",
        entryId: "entry-12",
        driverId: "missing",
        startedAtMs: 1_000,
      }),
    ).toEqual({ ok: false, reason: "driver-not-found" });
  });
});
