import { minutes } from "@/domain/race/rules";
import {
  assignDriverToEntry,
  createTeamState,
  type Driver,
  type Entry,
  type TeamState,
} from "@/domain/team/model";
import type { LapSample } from "@/domain/pace/analysis";

export type DashboardEntryInput = {
  entryId: string;
  position: number;
  trend: "up" | "down" | "flat";
  stops: number;
  gap: string;
  expectedLapMs: number;
  laps: LapSample[];
};

export const raceElapsedMs = minutes(49);

export const drivers: Driver[] = [
  { id: "ana", name: "Ana Costa", rating: 9 },
  { id: "bruno", name: "Bruno Reis", rating: 7 },
  { id: "caio", name: "Caio Nunes", rating: 8 },
  { id: "duda", name: "Duda Lima", rating: 6 },
  { id: "leo", name: "Leo Martins", rating: 9 },
  { id: "rafa", name: "Rafa Torres", rating: 7 },
];

export const entries: Entry[] = [
  { id: "entry-12", number: "12", role: "leader" },
  { id: "entry-27", number: "27", role: "attack" },
  { id: "entry-41", number: "41", role: "support" },
  { id: "entry-88", number: "88", role: "recovery" },
];

export const dashboardEntryInputs: DashboardEntryInput[] = [
  {
    entryId: "entry-12",
    position: 2,
    trend: "up",
    stops: 3,
    gap: "+18.4s",
    expectedLapMs: 65_000,
    laps: [
      { lapNumber: 41, lapTimeMs: 65_120 },
      { lapNumber: 42, lapTimeMs: 64_980 },
      { lapNumber: 43, lapTimeMs: 65_040 },
      { lapNumber: 44, lapTimeMs: 64_900 },
      { lapNumber: 45, lapTimeMs: 65_060 },
    ],
  },
  {
    entryId: "entry-27",
    position: 5,
    trend: "up",
    stops: 2,
    gap: "+1 volta",
    expectedLapMs: 65_000,
    laps: [
      { lapNumber: 38, lapTimeMs: 65_400 },
      { lapNumber: 39, lapTimeMs: 65_650 },
      { lapNumber: 40, lapTimeMs: 65_500 },
      { lapNumber: 41, lapTimeMs: 65_720 },
      { lapNumber: 42, lapTimeMs: 65_430 },
    ],
  },
  {
    entryId: "entry-41",
    position: 9,
    trend: "flat",
    stops: 2,
    gap: "+2 voltas",
    expectedLapMs: 65_700,
    laps: [
      { lapNumber: 34, lapTimeMs: 67_100 },
      { lapNumber: 35, lapTimeMs: 68_400 },
      { lapNumber: 36, lapTimeMs: 66_900 },
      { lapNumber: 37, lapTimeMs: 70_200 },
      { lapNumber: 38, lapTimeMs: 67_300 },
    ],
  },
  {
    entryId: "entry-88",
    position: 12,
    trend: "down",
    stops: 1,
    gap: "+3 voltas",
    expectedLapMs: 65_900,
    laps: [
      { lapNumber: 29, lapTimeMs: 72_500 },
      { lapNumber: 30, lapTimeMs: 72_700 },
      { lapNumber: 31, lapTimeMs: 73_000 },
      { lapNumber: 32, lapTimeMs: 72_600 },
      { lapNumber: 33, lapTimeMs: 72_800 },
    ],
  },
];

export function createMockTeamState(params?: {
  entries?: Entry[];
  strategyMode?: "participation" | "performance";
}): TeamState {
  const stateEntries = params?.entries ?? entries;

  return [
    ["entry-12", "ana", 0],
    ["entry-27", "bruno", minutes(8)],
    ["entry-41", "caio", minutes(20)],
    ["entry-88", "duda", minutes(5)],
  ].reduce((state, [entryId, driverId, startedAt], index) => {
    const result = assignDriverToEntry(state, {
      stintId: `stint-${index + 1}`,
      entryId: String(entryId),
      driverId: String(driverId),
      startedAtMs: Number(startedAt),
    });

    return result.ok ? result.state : state;
  }, createTeamState({
    drivers,
    entries: stateEntries,
    strategyMode: params?.strategyMode ?? "performance",
  }));
}
