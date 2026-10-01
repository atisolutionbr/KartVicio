import { describe, expect, it } from "vitest";
import {
  createMonitoredEvent,
  monitoringHealth,
  normalizeEntryNumbers,
  validateMonitoredEvent,
} from "./session";

describe("monitoring session", () => {
  it("normalizes duplicated team entry numbers", () => {
    expect(normalizeEntryNumbers([" 11", "4", "11", ""])).toEqual(["11", "4"]);
  });

  it("marks a live session stale after ten seconds without snapshots", () => {
    const event = createMonitoredEvent({
      name: "Enduro",
      teamEntryNumbers: ["11"],
      status: "live",
      lastSnapshotAtMs: 1_000,
    });
    expect(monitoringHealth(event, 11_001)).toBe("stale");
  });

  it("validates a MyLapTime event before monitoring", () => {
    const event = createMonitoredEvent({
      name: "Enduro",
      source: "mylaptime",
      sourceUrl: "https://example.com/live",
    });
    expect(validateMonitoredEvent(event)).toEqual([
      "Informe ao menos um numero da equipe.",
      "Use uma URL HTTPS do dominio mylaptime.com.br.",
    ]);
  });
});
