import { FDK_100_MILHAS_RULES, minutes, type RaceRules } from "@/domain/race/rules";

/*
 * Projeção de corrida: classificação VIRTUAL + PREVISÃO de resultado.
 *
 * O motor atual tem regras/pace/next-driver, mas não responde as duas perguntas que
 * a cronometragem crua não responde num endurance com paradas obrigatórias:
 *   - VIRTUAL: quem está ganhando DE VERDADE (ordem se todos cumprissem agora as
 *     paradas que ainda devem — um entry à frente na pista que deve mais paradas está
 *     virtualmente atrás).
 *   - PREVISÃO: como termina na bandeirada (voltas projetadas descontando as paradas
 *     que faltam).
 *
 * Função pura. Portado do EnduroKartTeam (validado por simulador).
 */

export type EntryProjectionInput = {
  entryNumber: string;
  lapsDone: number;
  /** ritmo verde (mediana das voltas limpas) em ms; null = sem dados de volta ainda */
  greenLapMs: number | null;
  stopsCompleted: number;
};

export type ProjectionOptions = {
  elapsedMs: number;
  rules?: RaceRules;
  /** tempo que UMA parada obrigatória consome fora de pista (default 8 min) */
  stopCostMs?: number;
};

export type VirtualRow = {
  entryNumber: string;
  position: number;
  lapsDone: number;
  stopsCompleted: number;
  pendingStops: number;
  netLaps: number;
  gapLaps: number;
};

export type PredictionRow = {
  entryNumber: string;
  position: number;
  greenLapMs: number | null;
  addedLaps: number;
  projectedLaps: number;
  gapLaps: number;
  gapMs: number | null;
};

export type RaceProjection = { virtual: VirtualRow[]; prediction: PredictionRow[] };

const DEFAULT_STOP_COST_MS = minutes(8);

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

/** ritmo verde = mediana das voltas limpas (descarta box/tráfego: acima de mediana*fator). */
export function greenLapMs(lapTimesMs: number[], outlierFactor = 1.3): number | null {
  const valid = lapTimesMs.filter((ms) => ms > 0);
  if (valid.length === 0) return null;
  const raw = median(valid)!;
  const clean = valid.filter((ms) => ms <= raw * outlierFactor);
  return median(clean.length ? clean : valid);
}

export function projectRace(
  inputs: EntryProjectionInput[],
  options: ProjectionOptions,
): RaceProjection {
  const rules = options.rules ?? FDK_100_MILHAS_RULES;
  const stopCostMs = options.stopCostMs ?? DEFAULT_STOP_COST_MS;
  const remainingMs = Math.max(0, rules.durationMs - options.elapsedMs);

  const rows = inputs.map((input) => {
    const pendingStops = Math.max(0, rules.mandatoryStops - input.stopsCompleted);
    let addedLaps = 0;
    let projectedLaps = input.lapsDone;
    if (input.greenLapMs && input.greenLapMs > 0) {
      const raceTimeLeftMs = Math.max(0, remainingMs - pendingStops * stopCostMs);
      addedLaps = raceTimeLeftMs / input.greenLapMs;
      projectedLaps = input.lapsDone + addedLaps;
    }
    return { ...input, pendingStops, addedLaps, projectedLaps };
  });

  // ritmo de referência (mediana do grid) para converter a dívida de paradas em voltas
  // no VIRTUAL — usar o ritmo de cada um distorceria (kart lento teria "dívida" menor).
  const refGreen =
    median(rows.map((r) => r.greenLapMs).filter((v): v is number => v != null && v > 0)) ??
    minutes(0.75);

  const virtualSorted = rows
    .map((r) => ({
      entryNumber: r.entryNumber,
      lapsDone: r.lapsDone,
      stopsCompleted: r.stopsCompleted,
      pendingStops: r.pendingStops,
      netLaps: r.lapsDone - (r.pendingStops * stopCostMs) / refGreen,
    }))
    .sort((a, b) => b.netLaps - a.netLaps);
  const vLead = virtualSorted[0];
  const virtual: VirtualRow[] = virtualSorted.map((r, i) => ({
    ...r,
    position: i + 1,
    gapLaps: vLead ? vLead.netLaps - r.netLaps : 0,
  }));

  const predictionSorted = [...rows].sort((a, b) => b.projectedLaps - a.projectedLaps);
  const pLead = predictionSorted[0];
  const prediction: PredictionRow[] = predictionSorted.map((r, i) => ({
    entryNumber: r.entryNumber,
    position: i + 1,
    greenLapMs: r.greenLapMs,
    addedLaps: r.addedLaps,
    projectedLaps: r.projectedLaps,
    gapLaps: pLead ? pLead.projectedLaps - r.projectedLaps : 0,
    gapMs: pLead && pLead.greenLapMs ? (pLead.projectedLaps - r.projectedLaps) * pLead.greenLapMs : null,
  }));

  return { virtual, prediction };
}
