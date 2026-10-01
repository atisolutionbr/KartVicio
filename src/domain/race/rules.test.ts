import { describe, expect, it } from "vitest";
import {
  evaluateStopDuration,
  FDK_100_MILHAS_RULES,
  getPitWindowStatus,
  getRemainingMandatoryStops,
  getStintLimitStatus,
  minutes,
  seconds,
} from "./rules";

describe("FDK race rules", () => {
  it("keeps pit lane closed before race minute 10", () => {
    expect(getPitWindowStatus(minutes(9) + seconds(59))).toBe("not-open-yet");
  });

  it("opens pit lane at race minute 10", () => {
    expect(getPitWindowStatus(minutes(10))).toBe("open");
  });

  it("closes pit lane with 20 minutes remaining", () => {
    expect(getPitWindowStatus(minutes(220) + seconds(1))).toBe("closed");
  });

  it("keeps pit lane open exactly at the close boundary", () => {
    expect(getPitWindowStatus(minutes(220))).toBe("open");
  });

  it("invalidates stops below 4:55.000", () => {
    expect(evaluateStopDuration(minutes(4) + seconds(54.999))).toEqual({
      status: "invalid",
      reason: "below-minimum",
      countsAsMandatoryStop: false,
      penaltyLaps: 0,
    });
  });

  it("counts stops from 4:55.000 to 4:59.999 with a two-lap penalty", () => {
    expect(evaluateStopDuration(minutes(4) + seconds(55))).toEqual({
      status: "valid-with-penalty",
      reason: "under-regulation-time",
      countsAsMandatoryStop: true,
      penaltyLaps: 2,
    });

    expect(evaluateStopDuration(minutes(4) + seconds(59.999)).status).toBe(
      "valid-with-penalty",
    );
  });

  it("validates stops at 5:00.000 or more without penalty", () => {
    expect(evaluateStopDuration(minutes(5))).toEqual({
      status: "valid",
      reason: "regulation-time",
      countsAsMandatoryStop: true,
      penaltyLaps: 0,
    });
  });

  it("marks stints over 50 minutes as over limit", () => {
    expect(getStintLimitStatus(minutes(50) + 1)).toBe("over-limit");
  });

  it("marks stint warning and critical windows", () => {
    expect(getStintLimitStatus(minutes(44) + seconds(59))).toBe("ok");
    expect(getStintLimitStatus(minutes(45))).toBe("warning");
    expect(getStintLimitStatus(minutes(48))).toBe("critical");
    expect(getStintLimitStatus(minutes(50))).toBe("critical");
  });

  it("calculates remaining mandatory stops", () => {
    expect(getRemainingMandatoryStops(0)).toBe(7);
    expect(getRemainingMandatoryStops(4)).toBe(3);
    expect(getRemainingMandatoryStops(9)).toBe(0);
  });

  it("stores the core event shape from the regulation", () => {
    expect(FDK_100_MILHAS_RULES.durationMs).toBe(minutes(240));
    expect(FDK_100_MILHAS_RULES.mandatoryStops).toBe(7);
    expect(FDK_100_MILHAS_RULES.stints).toBe(8);
  });
});
