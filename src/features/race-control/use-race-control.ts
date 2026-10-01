"use client";

import { useMemo } from "react";
import type { StrategyMode, StrategyRole } from "@/domain/team/model";
import type { StintLimitStatus } from "@/domain/race/rules";
import { useBox, useNow } from "@/features/box/use-box";
import { useActiveTiming } from "@/features/monitoring/use-active-timing";
import {
  createMockTeamState,
  dashboardEntryInputs,
  entries,
  raceElapsedMs,
} from "@/features/race-control/mock-race";
import { buildRaceControlEntries } from "@/features/race-control/view-model";
import { mergeLiveTimingViews } from "@/features/race-control/live-view";
import { useLocalStorageState } from "@/lib/use-local-storage-state";

/*
 * Dados do "race control" montados num lugar só — o Cockpit e o iPad usam o MESMO hook,
 * então mostram exatamente a mesma coisa:
 *   - timing ao vivo do evento ativo (posição, gap, ritmo, relógio da prova);
 *   - números da equipe do evento ativo;
 *   - PARADAS reais do box (features/box) — alimentam cartão e alertas;
 *   - STINT real: começa na última saída do box daquele kart (antes: horários fixos do
 *     exemplo, que davam 88:50 de stint).
 * Pilotos ainda vêm do plano de exemplo (a troca de piloto é manual).
 */
export function useRaceControl() {
  const { event: activeEvent, snapshots, latest, connected } = useActiveTiming();
  const [strategyMode, setStrategyMode] = useLocalStorageState<StrategyMode>("enduro.strategyMode", "performance");
  const [roleOverrides, setRoleOverrides] = useLocalStorageState<Record<string, StrategyRole>>(
    "enduro.roleOverrides",
    {},
  );
  const boxApi = useBox();
  const { box } = boxApi;
  const now = useNow(1000);

  const elapsedMs = latest?.raceClockMs ?? raceElapsedMs;

  const localEntries = useMemo(
    () =>
      entries.map((entry, index) => ({
        ...entry,
        number: activeEvent.teamEntryNumbers?.[index] ?? entry.number,
        role: roleOverrides[entry.id] ?? entry.role,
      })),
    [activeEvent, roleOverrides],
  );

  /** início do stint (no relógio da prova) = última saída do box; sem parada ainda = largada. */
  const stintStartFor = (number: string): number => {
    const lastExit = box.log.find((log) => log.number === number); // log: mais recente primeiro
    if (!lastExit || !now) return 0;
    return Math.max(0, elapsedMs - Math.max(0, now - lastExit.endedAtMs));
  };

  const baseState = createMockTeamState({ entries: localEntries, strategyMode });
  const teamState = {
    ...baseState,
    stints: baseState.stints.map((stint) => {
      const number = localEntries.find((entry) => entry.id === stint.entryId)?.number ?? "";
      return { ...stint, startedAtMs: stintStartFor(number) };
    }),
  };

  const entryInputs = dashboardEntryInputs.map((input) => {
    const number = localEntries.find((entry) => entry.id === input.entryId)?.number;
    return { ...input, stops: number ? (box.stops[number] ?? 0) : 0 };
  });

  const statuses = mergeLiveTimingViews(
    buildRaceControlEntries({ state: teamState, inputs: entryInputs, elapsedMs }),
    snapshots,
  );

  return {
    activeEvent,
    connected,
    latest,
    elapsedMs,
    statuses,
    strategyMode,
    setStrategyMode,
    setRoleOverrides,
    box: boxApi,
  };
}

/** tempo de stint decorrido de um kart (relógio da prova). */
export function stintElapsedOf(elapsedMs: number, activeStint: { startedAtMs: number }): number {
  return Math.max(0, elapsedMs - activeStint.startedAtMs);
}

/** cor da barra de stint — "over-limit" (> 50 min, +20s) também é vermelho. */
export function stintTone(status: StintLimitStatus | "no-active-stint"): "critical" | "warning" | "ok" {
  if (status === "critical" || status === "over-limit") return "critical";
  if (status === "warning") return "warning";
  return "ok";
}
