import { describe, expect, it } from "vitest";
import { minutes } from "@/domain/race/rules";
import {
  assignDriverToEntry,
  createTeamState,
  endActiveStint,
  setStrategyMode,
  type Driver,
  type Entry,
} from "@/domain/team/model";
import {
  confirmSuggestion,
  getEntryStrategyStatus,
  suggestNextDriver,
} from "./engine";

const drivers: Driver[] = [
  { id: "driver-1", name: "Ana", rating: 9 },
  { id: "driver-2", name: "Bruno", rating: 7 },
  { id: "driver-3", name: "Caio", rating: 8 },
];

const entries: Entry[] = [{ id: "entry-12", number: "12", role: "leader" }];

describe("strategy engine", () => {
  it("alerts when stint reaches warning and critical windows", () => {
    const assigned = assignDriverToEntry(
      createTeamState({ drivers, entries }),
      {
        stintId: "stint-1",
        entryId: "entry-12",
        driverId: "driver-1",
        startedAtMs: 0,
      },
    );
    if (!assigned.ok) throw new Error("expected assignment to succeed");

    expect(
      getEntryStrategyStatus({
        state: assigned.state,
        entryId: "entry-12",
        elapsedMs: minutes(45),
        completedStops: 0,
      }).alerts.some((alert) => alert.code === "stint-warning"),
    ).toBe(true);

    expect(
      getEntryStrategyStatus({
        state: assigned.state,
        entryId: "entry-12",
        elapsedMs: minutes(49),
        completedStops: 0,
      }).alerts.some((alert) => alert.code === "stint-critical"),
    ).toBe(true);
  });

  it("alerts when stint exceeds the 50 minute limit", () => {
    const assigned = assignDriverToEntry(
      createTeamState({ drivers, entries }),
      {
        stintId: "stint-1",
        entryId: "entry-12",
        driverId: "driver-1",
        startedAtMs: 0,
      },
    );
    if (!assigned.ok) throw new Error("expected assignment to succeed");

    const status = getEntryStrategyStatus({
      state: assigned.state,
      entryId: "entry-12",
      elapsedMs: minutes(50) + 1,
      completedStops: 0,
    });

    expect(status.stintStatus).toBe("over-limit");
    expect(status.alerts.some((alert) => alert.code === "stint-over-limit")).toBe(
      true,
    );
  });

  it("tracks pit window and remaining mandatory stops", () => {
    const state = createTeamState({ drivers, entries });

    expect(
      getEntryStrategyStatus({
        state,
        entryId: "entry-12",
        elapsedMs: minutes(5),
        completedStops: 2,
      }).pitWindow,
    ).toBe("not-open-yet");

    const status = getEntryStrategyStatus({
      state,
      entryId: "entry-12",
      elapsedMs: minutes(20),
      completedStops: 2,
    });

    expect(status.pitWindow).toBe("open");
    expect(status.remainingStops).toBe(5);
  });

  it("suggests least-used available driver in participation mode", () => {
    const first = assignDriverToEntry(createTeamState({ drivers, entries }), {
      stintId: "stint-1",
      entryId: "entry-12",
      driverId: "driver-1",
      startedAtMs: 0,
    });
    if (!first.ok) throw new Error("expected assignment to succeed");

    const ended = endActiveStint(first.state, {
      entryId: "entry-12",
      endedAtMs: minutes(10),
    });

    const suggestion = suggestNextDriver({
      state: ended,
      entryId: "entry-12",
      nowMs: minutes(10),
    });

    expect(suggestion).toMatchObject({
      driverId: "driver-2",
      mode: "participation",
    });
  });

  it("suggests highest-rated available driver in performance mode", () => {
    const state = setStrategyMode(
      createTeamState({ drivers, entries }),
      "performance",
    );

    expect(
      suggestNextDriver({
        state,
        entryId: "entry-12",
        nowMs: 0,
      }),
    ).toMatchObject({ driverId: "driver-1", mode: "performance" });
  });

  it("does not mutate state when creating a suggestion", () => {
    const state = createTeamState({ drivers, entries });
    const suggestion = suggestNextDriver({
      state,
      entryId: "entry-12",
      nowMs: 0,
    });

    expect(state.stints).toHaveLength(0);
    expect(suggestion?.driverId).toBe("driver-1");

    const confirmed = confirmSuggestion(suggestion, 1_000);

    expect(state.stints).toHaveLength(0);
    expect(confirmed).toEqual({
      suggestion,
      confirmedAtMs: 1_000,
    });
  });
});
