import { normalizeEntryNumber } from "@/domain/timing/entry-number";

export type MonitoringSource = "mock" | "mylaptime";

export type MonitoringStatus =
  | "idle"
  | "waiting-pairing"
  | "connecting"
  | "live"
  | "stale"
  | "error";

export type MonitoredEvent = {
  id: string;
  name: string;
  venue: string;
  startsAt: string;
  source: MonitoringSource;
  sourceUrl: string;
  teamEntryNumbers: string[];
  status: MonitoringStatus;
  lastSnapshotAtMs: number | null;
};

export const DEFAULT_MYLAPTIME_URL = "https://mylaptime.com.br/LiveTime";
export const STALE_AFTER_MS = 10_000;

/* Chaves compartilhadas no navegador (todas as telas leem o MESMO evento ativo). */
export const EVENTS_STORAGE_KEY = "enduro.events";
export const ACTIVE_EVENT_STORAGE_KEY = "enduro.activeEvent";

/*
 * Evento padrão = a prova. É a ÚNICA fonte dos números da equipe: Cockpit, iPad, Estratégia,
 * Box e Setup leem daqui (Setup edita). Mesmo sem nada salvo, todas as telas concordam.
 */
export const DEFAULT_MONITORED_EVENT: MonitoredEvent = {
  id: "fdk-100-milhas",
  name: "FDK 100 Milhas Endurance",
  venue: "Kartodromo de Jardim Camburi",
  startsAt: "2026-10-17T14:00",
  source: "mock",
  sourceUrl: DEFAULT_MYLAPTIME_URL,
  teamEntryNumbers: ["12", "27", "41", "88"],
  status: "idle",
  lastSnapshotAtMs: null,
};

export function createMonitoredEvent(
  event: Partial<MonitoredEvent> & Pick<MonitoredEvent, "name">,
): MonitoredEvent {
  return {
    id: event.id ?? crypto.randomUUID(),
    name: event.name.trim(),
    venue: event.venue?.trim() ?? "",
    startsAt: event.startsAt ?? "",
    source: event.source ?? "mock",
    sourceUrl: event.sourceUrl?.trim() || DEFAULT_MYLAPTIME_URL,
    teamEntryNumbers: normalizeEntryNumbers(event.teamEntryNumbers ?? []),
    status: event.status ?? "idle",
    lastSnapshotAtMs: event.lastSnapshotAtMs ?? null,
  };
}

export function normalizeEntryNumbers(numbers: string[]): string[] {
  return [...new Set(numbers.map(normalizeEntryNumber).filter(Boolean))];
}

export function monitoringHealth(
  event: MonitoredEvent,
  nowMs: number,
): MonitoringStatus {
  if (event.status === "error" || event.status === "waiting-pairing") {
    return event.status;
  }
  if (event.lastSnapshotAtMs == null) return event.status;
  return nowMs - event.lastSnapshotAtMs > STALE_AFTER_MS ? "stale" : "live";
}

export function validateMonitoredEvent(event: MonitoredEvent): string[] {
  const errors: string[] = [];
  if (!event.name.trim()) errors.push("Informe o nome do evento.");
  if (event.teamEntryNumbers.length === 0) {
    errors.push("Informe ao menos um numero da equipe.");
  }
  if (event.source === "mylaptime") {
    try {
      const url = new URL(event.sourceUrl);
      if (url.protocol !== "https:" || url.hostname !== "mylaptime.com.br") {
        errors.push("Use uma URL HTTPS do dominio mylaptime.com.br.");
      }
    } catch {
      errors.push("Informe uma URL valida do MyLapTime.");
    }
  }
  return errors;
}
