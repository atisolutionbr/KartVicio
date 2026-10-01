import type { LapEvent, TimingSnapshot } from "./types";

export function detectNewLaps(
  previous: TimingSnapshot | null,
  current: TimingSnapshot,
): LapEvent[] {
  if (!previous) {
    return current.entries
      .filter((entry) => entry.lapCount > 0)
      .map((entry) => ({
        entryNumber: entry.entryNumber,
        lapNumber: entry.lapCount,
        lapTimeMs: entry.lastLapMs,
        capturedAtMs: current.capturedAtMs,
      }));
  }

  return current.entries.flatMap((entry) => {
    const prior = previous.entries.find(
      (candidate) => candidate.entryNumber === entry.entryNumber,
    );
    const previousLapCount = prior?.lapCount ?? 0;

    if (entry.lapCount <= previousLapCount) return [];

    return Array.from(
      { length: entry.lapCount - previousLapCount },
      (_, index) => {
        const lapNumber = previousLapCount + index + 1;
        return {
          entryNumber: entry.entryNumber,
          lapNumber,
          lapTimeMs: lapNumber === entry.lapCount ? entry.lastLapMs : null,
          capturedAtMs: current.capturedAtMs,
        };
      },
    );
  });
}

export function appendLapEvents(
  history: LapEvent[],
  events: LapEvent[],
): LapEvent[] {
  const existing = new Set(
    history.map((lap) => `${lap.entryNumber}:${lap.lapNumber}`),
  );

  return [
    ...history,
    ...events.filter((lap) => !existing.has(`${lap.entryNumber}:${lap.lapNumber}`)),
  ];
}
