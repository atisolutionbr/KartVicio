"use client";

import { useCallback } from "react";
import {
  ACTIVE_EVENT_STORAGE_KEY,
  DEFAULT_MONITORED_EVENT,
  EVENTS_STORAGE_KEY,
  normalizeEntryNumbers,
  type MonitoredEvent,
} from "@/domain/monitoring/session";
import { useLocalStorageState } from "@/lib/use-local-storage-state";

/*
 * Evento ativo compartilhado por TODAS as telas — fonte única dos números da equipe.
 * Sem nada salvo, cai no evento padrão da prova (DEFAULT_MONITORED_EVENT).
 */
export function useActiveEvent() {
  const [events, setEvents] = useLocalStorageState<MonitoredEvent[]>(EVENTS_STORAGE_KEY, [
    DEFAULT_MONITORED_EVENT,
  ]);
  const [activeId, setActiveId] = useLocalStorageState<string>(
    ACTIVE_EVENT_STORAGE_KEY,
    DEFAULT_MONITORED_EVENT.id,
  );

  const event = events.find((candidate) => candidate.id === activeId) ?? events[0] ?? DEFAULT_MONITORED_EVENT;
  /** números como editados (podem ter linhas vazias durante a edição no Setup). */
  const rawTeamEntryNumbers = event.teamEntryNumbers ?? [];
  /** números válidos (sem vazios/duplicados) — o que as telas de operação usam. */
  const normalized = normalizeEntryNumbers(rawTeamEntryNumbers);
  const teamEntryNumbers = normalized.length ? normalized : DEFAULT_MONITORED_EVENT.teamEntryNumbers;

  const setTeamEntryNumbers = useCallback(
    (numbers: string[]) => {
      setEvents((current) => {
        const list = current.length ? current : [DEFAULT_MONITORED_EVENT];
        const targetId = list.some((candidate) => candidate.id === event.id) ? event.id : list[0]!.id;
        return list.map((candidate) =>
          candidate.id === targetId ? { ...candidate, teamEntryNumbers: numbers } : candidate,
        );
      });
    },
    [setEvents, event.id],
  );

  return {
    events,
    setEvents,
    activeId: event.id,
    setActiveId,
    event,
    rawTeamEntryNumbers,
    teamEntryNumbers,
    setTeamEntryNumbers,
  };
}
