import type { Driver } from "@/domain/team/model";

export type DriverProfile = Driver & {
  weightKg: number;
  ballastKg: number;
  preferredRole: "performance" | "balanced" | "safe";
  preferredStint?: "opening" | "middle" | "closing" | "any";
  pressureReady?: boolean;
  active?: boolean;
  notes?: string;
  nickname?: string;
  experience?: string;
  order?: number;
  minimumMs?: number;
  maximumMs?: number;
  minimumStints?: number;
  stintCount: number;
  totalTimeMs: number;
  bestLapMs?: number;
  consistencyMs?: number;
};

export const driverProfiles: DriverProfile[] = [
  {
    id: "ana",
    name: "Ana Costa",
    rating: 9,
    weightKg: 76,
    ballastKg: 24,
    preferredRole: "performance",
    stintCount: 1,
    totalTimeMs: 49 * 60_000,
    bestLapMs: 64_900,
    consistencyMs: 180,
  },
  {
    id: "bruno",
    name: "Bruno Reis",
    rating: 7,
    weightKg: 82,
    ballastKg: 18,
    preferredRole: "balanced",
    stintCount: 1,
    totalTimeMs: 41 * 60_000,
    bestLapMs: 65_430,
    consistencyMs: 260,
  },
  {
    id: "caio",
    name: "Caio Nunes",
    rating: 8,
    weightKg: 91,
    ballastKg: 9,
    preferredRole: "safe",
    stintCount: 1,
    totalTimeMs: 29 * 60_000,
    bestLapMs: 66_900,
    consistencyMs: 920,
  },
  {
    id: "duda",
    name: "Duda Lima",
    rating: 6,
    weightKg: 70,
    ballastKg: 25,
    preferredRole: "balanced",
    stintCount: 1,
    totalTimeMs: 44 * 60_000,
    bestLapMs: 72_500,
    consistencyMs: 210,
  },
  {
    id: "leo",
    name: "Leo Martins",
    rating: 9,
    weightKg: 88,
    ballastKg: 12,
    preferredRole: "performance",
    stintCount: 0,
    totalTimeMs: 0,
  },
  {
    id: "rafa",
    name: "Rafa Torres",
    rating: 7,
    weightKg: 96,
    ballastKg: 4,
    preferredRole: "safe",
    stintCount: 0,
    totalTimeMs: 0,
  },
];
