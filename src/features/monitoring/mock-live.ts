import type { TimingEntry, TimingSnapshot } from "@/domain/timing/types";

const fillerNumbers = ["11", "4", "2", "29", "7", "15", "21", "33", "44", "51", "77", "88", "5", "9"];
const GRID_SIZE = 12;
// posições (0-based) onde os karts da equipe entram no grid simulado — espalhados, como na prova
const TEAM_SLOTS = [1, 4, 8, 11];

/** grid simulado que CONTÉM os números da equipe (senão as telas não acham nossos karts). */
export function simulatedGrid(teamNumbers: string[]): string[] {
  const team = teamNumbers.filter(Boolean).slice(0, TEAM_SLOTS.length);
  const fillers = fillerNumbers.filter((number) => !team.includes(number));
  const grid: string[] = [];
  let teamIndex = 0;
  for (let slot = 0; slot < GRID_SIZE; slot++) {
    if (TEAM_SLOTS.includes(slot) && teamIndex < team.length) grid.push(team[teamIndex++]!);
    else grid.push(fillers.shift()!);
  }
  return grid;
}

export function createMockLiveSnapshot(
  lap: number,
  capturedAtMs: number,
  teamNumbers: string[],
): TimingSnapshot {
  const competitorNumbers = simulatedGrid(teamNumbers);
  const entries = competitorNumbers.map((number, index) => {
    const teamIndex = teamNumbers.indexOf(number);
    const baseMs = 64_300 + index * 115 + (teamIndex >= 0 ? teamIndex * 80 : 0);
    const wave = Math.sin((lap + index) * 0.7) * 420;
    const lapTimeMs = Math.round(baseMs + wave);
    return entry(number, index + 1, lap, lapTimeMs, index * 1_350);
  });

  return {
    capturedAtMs,
    raceClockMs: lap * 65_000,
    flag: "green",
    entries,
  };
}

function entry(
  entryNumber: string,
  position: number,
  lapCount: number,
  lastLapMs: number,
  gapMs: number,
): TimingEntry {
  return {
    position,
    entryNumber,
    displayName: `Equipe ${entryNumber}`,
    lapCount,
    lastLapMs,
    bestLapMs: lastLapMs - 250,
    bestLapNumber: Math.max(1, lapCount - 2),
    gapToLeader: gapMs === 0
      ? { type: "none" }
      : { type: "time", raw: `+${(gapMs / 1_000).toFixed(3)}`, ms: gapMs },
    gapToNext: position === 1
      ? { type: "none" }
      : { type: "time", raw: "+1.350", ms: 1_350 },
  };
}
