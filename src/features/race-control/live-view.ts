import { buildEntryTrend } from "@/domain/timing/trend";
import { normalizeEntryNumber } from "@/domain/timing/entry-number";
import type { Gap, TimingSnapshot } from "@/domain/timing/types";
import { formatLapTime, formatSignedSeconds, type RaceControlEntryView } from "./view-model";

export function mergeLiveTimingViews(
  views: RaceControlEntryView[],
  snapshots: TimingSnapshot[],
): RaceControlEntryView[] {
  const latest = snapshots.at(-1);
  if (!latest) return views;
  const previous = snapshots.at(-2);
  const leaderLapMs = latest.entries.find((entry) => entry.position === 1)?.lastLapMs;

  return views.map((view) => {
    const number = normalizeEntryNumber(view.entry.number);
    const timing = latest.entries.find(
      (entry) => normalizeEntryNumber(entry.entryNumber) === number,
    );
    if (!timing) return view;
    const previousTiming = previous?.entries.find(
      (entry) => normalizeEntryNumber(entry.entryNumber) === number,
    );
    const trend = buildEntryTrend(snapshots, number).at(-1);

    return {
      ...view,
      position: timing.position,
      trend: positionTrend(previousTiming?.position, timing.position),
      gap: formatGap(timing.gapToLeader),
      pace: formatLapTime(trend?.rollingPaceMs ?? timing.lastLapMs),
      delta:
        timing.lastLapMs != null && leaderLapMs != null
          ? formatSignedSeconds(timing.lastLapMs - leaderLapMs)
          : view.delta,
    };
  });
}

function positionTrend(previous: number | undefined, current: number) {
  if (previous == null || previous === current) return "flat";
  return current < previous ? "up" : "down";
}

export function formatGap(gap: Gap): string {
  if (gap.type === "none") return "LIDER";
  if (gap.type === "time") return `+${(gap.ms / 1_000).toFixed(3)}s`;
  if (gap.type === "laps") return `+${gap.laps}v`;
  return gap.raw || "--";
}
