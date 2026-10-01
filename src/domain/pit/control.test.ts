import { describe, expect, it } from "vitest";
import {
  completePitStop,
  createIdlePitStop,
  getPitStopElapsedMs,
  resetPitStop,
  startPitStop,
} from "./control";
import { minutes, seconds } from "@/domain/race/rules";

describe("pit stop control", () => {
  it("starts a pit stop from idle", () => {
    expect(startPitStop(createIdlePitStop("entry-12"), 1_000)).toEqual({
      status: "in-box",
      entryId: "entry-12",
      startedAtMs: 1_000,
    });
  });

  it("does not restart an active pit stop", () => {
    const active = startPitStop(createIdlePitStop("entry-12"), 1_000);

    expect(startPitStop(active, 2_000)).toEqual(active);
  });

  it("completes with stop validity", () => {
    const active = startPitStop(createIdlePitStop("entry-12"), 1_000);

    expect(completePitStop(active, 1_000 + minutes(5))).toMatchObject({
      status: "complete",
      entryId: "entry-12",
      validity: {
        status: "valid",
        countsAsMandatoryStop: true,
      },
    });
  });

  it("detects penalty range", () => {
    const active = startPitStop(createIdlePitStop("entry-12"), 0);

    expect(completePitStop(active, minutes(4) + seconds(57))).toMatchObject({
      status: "complete",
      validity: {
        status: "valid-with-penalty",
        penaltyLaps: 2,
      },
    });
  });

  it("returns elapsed time for active and complete controls", () => {
    const active = startPitStop(createIdlePitStop("entry-12"), 1_000);
    const complete = completePitStop(active, 11_000);

    expect(getPitStopElapsedMs(active, 6_000)).toBe(5_000);
    expect(getPitStopElapsedMs(complete, 20_000)).toBe(10_000);
  });

  it("resets to idle", () => {
    const active = startPitStop(createIdlePitStop("entry-12"), 1_000);

    expect(resetPitStop(active)).toEqual({
      status: "idle",
      entryId: "entry-12",
    });
  });
});
