import { describe, expect, it } from "vitest";
import {
  analyzePace,
  projectLoss,
  recentLaps,
  removeOutliers,
} from "./analysis";
import { minutes } from "@/domain/race/rules";

describe("pace analysis", () => {
  it("selects recent laps by lap number", () => {
    expect(
      recentLaps(
        [
          { lapNumber: 3, lapTimeMs: 65_000 },
          { lapNumber: 1, lapTimeMs: 66_000 },
          { lapNumber: 2, lapTimeMs: 64_000 },
        ],
        2,
      ),
    ).toEqual([
      { lapNumber: 2, lapTimeMs: 64_000 },
      { lapNumber: 3, lapTimeMs: 65_000 },
    ]);
  });

  it("removes obvious outliers around the median", () => {
    expect(removeOutliers([65_000, 65_200, 65_100, 84_000], 2_000)).toEqual([
      65_000,
      65_200,
      65_100,
    ]);
  });

  it("projects loss from pace delta and remaining stint time", () => {
    expect(
      projectLoss({
        actualLapMs: 66_000,
        expectedLapMs: 65_000,
        remainingStintMs: minutes(11),
      }),
    ).toBe(10_000);
  });

  it("keeps recommendation when driver is on pace and stable", () => {
    expect(
      analyzePace(
        [
          { lapNumber: 1, lapTimeMs: 65_000 },
          { lapNumber: 2, lapTimeMs: 65_100 },
          { lapNumber: 3, lapTimeMs: 64_900 },
        ],
        {
          expectedLapMs: 65_000,
          remainingStintMs: minutes(20),
        },
      ),
    ).toMatchObject({
      sampleSize: 3,
      averageMs: 65_000,
      medianMs: 65_000,
      recommendation: "keep",
    });
  });

  it("watches when consistency is poor", () => {
    expect(
      analyzePace(
        [
          { lapNumber: 1, lapTimeMs: 65_000 },
          { lapNumber: 2, lapTimeMs: 67_000 },
          { lapNumber: 3, lapTimeMs: 64_000 },
        ],
        {
          expectedLapMs: 65_000,
          remainingStintMs: minutes(20),
          outlierToleranceMs: 5_000,
        },
      ).recommendation,
    ).toBe("watch");
  });

  it("prepares when projected loss is meaningful", () => {
    expect(
      analyzePace(
        [
          { lapNumber: 1, lapTimeMs: 66_700 },
          { lapNumber: 2, lapTimeMs: 66_900 },
          { lapNumber: 3, lapTimeMs: 66_800 },
        ],
        {
          expectedLapMs: 65_000,
          remainingStintMs: minutes(12),
        },
      ).recommendation,
    ).toBe("prepare");
  });

  it("calls the kart when projected loss is severe and there is time left", () => {
    expect(
      analyzePace(
        [
          { lapNumber: 1, lapTimeMs: 68_500 },
          { lapNumber: 2, lapTimeMs: 68_700 },
          { lapNumber: 3, lapTimeMs: 68_600 },
        ],
        {
          expectedLapMs: 65_000,
          remainingStintMs: minutes(15),
        },
      ).recommendation,
    ).toBe("call");
  });

  it("does not call the kart for pace when stint is nearly over", () => {
    expect(
      analyzePace(
        [
          { lapNumber: 1, lapTimeMs: 70_000 },
          { lapNumber: 2, lapTimeMs: 70_200 },
        ],
        {
          expectedLapMs: 65_000,
          remainingStintMs: minutes(2),
        },
      ).recommendation,
    ).toBe("keep");
  });
});
