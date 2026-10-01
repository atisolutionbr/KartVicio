import { describe, expect, it } from "vitest";
import type { TimingSnapshot } from "@/domain/timing/types";
import {
  eventId,
  indexFromLive,
  orderEvents,
  selectForCapture,
  slug,
  toEventData,
  type EventIndexRow,
  type LiveEvent,
} from "./event-index";

function ev(index: number, name: string, track: string, type = "race"): LiveEvent {
  return { index, name, track, type, live: true };
}

describe("slug / eventId", () => {
  it("normalizes accents and spaces", () => {
    expect(slug("Corrida Fãs de Kart")).toBe("corrida-fas-de-kart");
  });

  it("makes ids unique by track + name (name alone collides)", () => {
    const a = eventId("Jardim Camburi", "Corrida");
    const b = eventId("FKI Linhares", "Corrida");
    expect(a).not.toBe(b);
  });
});

describe("selectForCapture", () => {
  const live = [ev(0, "Corrida 1", "Jardim Camburi"), ev(1, "Bateria", "FKI Linhares")];

  it("captures only the focused events when focus is set", () => {
    const focus = [eventId("Jardim Camburi", "Corrida 1")];
    const sel = selectForCapture(live, { focus });
    expect(sel).toHaveLength(1);
    expect(sel[0]!.track).toBe("Jardim Camburi");
  });

  it("falls back to the event filter when there is no focus", () => {
    const sel = selectForCapture(live, { eventFilter: ["camburi"] });
    expect(sel).toHaveLength(1);
    expect(sel[0]!.track).toBe("Jardim Camburi");
  });

  it("captures nothing without focus or filter", () => {
    expect(selectForCapture(live, {})).toHaveLength(0);
  });

  it("always captures priority tracks, unioned with explicit focus", () => {
    const focus = [eventId("Jardim Camburi", "Corrida 1")];
    const sel = selectForCapture(live, { focus, priorityTracks: ["Linhares"] });
    expect(sel.map((e) => e.track).sort()).toEqual(["FKI Linhares", "Jardim Camburi"]);
  });

  it("captures priority tracks even with no focus set", () => {
    const sel = selectForCapture(live, { priorityTracks: ["linhares"] });
    expect(sel).toHaveLength(1);
    expect(sel[0]!.track).toBe("FKI Linhares");
  });
});

describe("orderEvents", () => {
  it("puts priority tracks first and caps per cycle", () => {
    const live = [ev(0, "A", "Outra"), ev(1, "B", "FKI Linhares"), ev(2, "C", "Mais uma")];
    const ordered = orderEvents(live, { priorityTracks: ["Linhares"], maxPerCycle: 2 });
    expect(ordered).toHaveLength(2);
    expect(ordered[0]!.track).toBe("FKI Linhares");
  });
});

describe("indexFromLive", () => {
  it("carries captured enrichment from the previous index", () => {
    const live = [ev(0, "Corrida 1", "Jardim Camburi")];
    const id = eventId("Jardim Camburi", "Corrida 1");
    const prev: EventIndexRow[] = [{ id, name: "Corrida 1", track: "Jardim Camburi", live: true, karts: 12, laps: 30 }];
    const index = indexFromLive(live, prev);
    expect(index[0]!.karts).toBe(12);
    expect(index[0]!.laps).toBe(30);
  });
});

describe("toEventData", () => {
  const snapshot: TimingSnapshot = {
    capturedAtMs: 1000,
    raceClockMs: 60_000,
    flag: "green",
    entries: [
      {
        position: 1,
        entryNumber: "7",
        displayName: "Kart 7",
        lapCount: 3,
        lastLapMs: 41_000,
        bestLapMs: 40_500,
        bestLapNumber: 2,
        gapToLeader: { type: "none", raw: null },
        gapToNext: { type: "none", raw: null },
        state: "track",
      },
    ],
  };

  it("computes best/avg/sd from lap history and keeps position order", () => {
    const data = toEventData(
      { uid: null, name: "Corrida 1", track: "Jardim Camburi", type: "race" },
      snapshot,
      { "7": [
        { n: 1, ms: 41_000, pos: 1 },
        { n: 2, ms: 40_500, pos: 1 },
        { n: 3, ms: 41_200, pos: 1 },
      ] },
    );
    expect(data.drivers).toHaveLength(1);
    expect(data.drivers[0]!.best).toBe(40_500);
    expect(data.drivers[0]!.avg).toBeGreaterThan(40_000);
    expect(data.drivers[0]!.sd).not.toBeNull();
    expect(data.event.flag).toBe("green");
  });

  it("falls back to the snapshot best lap when there is no history", () => {
    const data = toEventData({ uid: null, name: "x", track: "y", type: "race" }, snapshot, {});
    expect(data.drivers[0]!.best).toBe(40_500);
    expect(data.drivers[0]!.avg).toBeNull();
  });
});
