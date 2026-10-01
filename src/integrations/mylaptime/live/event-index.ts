import type { FlagState, TimingSnapshot } from "@/domain/timing/types";
import type { HistoryLap } from "./lap-history";

/*
 * Índice de eventos + normalização do que a captura produz. Tudo função pura (testável):
 * id estável por evento, seleção por FOCO (o que o frontend manda capturar), ordenação por
 * prioridade e a montagem do EventData que a UI consome. Portado de src/ingestor/worker.js.
 */

export type LiveEvent = {
  index: number;
  name: string;
  track: string;
  type: string;
  live: boolean;
};

export type EventMeta = {
  uid: string | null;
  name: string | null;
  track: string | null;
  type: string;
};

export type EventDriver = {
  number: string;
  name: string;
  pos: number;
  lapCount: number;
  best: number | null;
  avg: number | null;
  sd: number | null;
  laps: HistoryLap[];
  state: string | null;
  gap: string | null;
  diff: string | null;
};

export type EventData = {
  generatedAt: string;
  event: {
    track: string | null;
    name: string | null;
    uid: string | null;
    capturedAt: number;
    raceClockMs: number | null;
    flag: FlagState;
  };
  drivers: EventDriver[];
};

export type EventIndexRow = {
  id: string;
  name: string;
  track: string;
  live: boolean;
  karts?: number;
  laps?: number;
  flag?: FlagState;
  capturedAt?: number;
  dataUrl?: string;
};

/** slug ASCII, minúsculo, hifenizado (remove acentos). */
export function slug(input: string | null | undefined): string {
  return (
    String(input ?? "evento")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "evento"
  );
}

/** id estável e ÚNICO por evento = pista + bateria (só o nome colide: vários "Corrida"). */
export function eventId(track: string | null | undefined, name: string | null | undefined): string {
  return slug(`${track ?? ""} ${name ?? ""}`);
}

/** Normaliza o snapshot + histórico num EventData que a UI consome. */
export function toEventData(
  meta: EventMeta,
  snapshot: TimingSnapshot,
  lapsByEntry: Record<string, HistoryLap[]>,
): EventData {
  const drivers: EventDriver[] = snapshot.entries
    .filter((entry) => entry.entryNumber)
    .map((entry) => {
      const laps = (lapsByEntry[entry.entryNumber] ?? []).slice().sort((a, b) => a.n - b.n);
      const times = laps.map((l) => l.ms).filter((ms): ms is number => ms != null);
      const best = times.length ? Math.min(...times) : entry.bestLapMs;
      const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
      const sd =
        times.length > 1 && avg != null
          ? Math.round(Math.sqrt(times.reduce((a, b) => a + (b - avg) ** 2, 0) / times.length))
          : null;
      return {
        number: entry.entryNumber,
        name: entry.displayName || `#${entry.entryNumber}`,
        pos: entry.position,
        lapCount: entry.lapCount,
        best,
        avg,
        sd,
        laps,
        state: entry.state ?? null,
        gap: entry.gapToNext.raw ?? null,
        diff: entry.gapToLeader.raw ?? null,
      };
    })
    .sort((a, b) => (a.pos || 99) - (b.pos || 99));

  return {
    generatedAt: new Date().toISOString(),
    event: {
      track: meta.track,
      name: meta.name,
      uid: meta.uid,
      capturedAt: snapshot.capturedAtMs,
      raceClockMs: snapshot.raceClockMs,
      flag: snapshot.flag,
    },
    drivers,
  };
}

/** Índice de TODOS os online (gate-free), preservando o que já foi capturado. */
export function indexFromLive(live: LiveEvent[], prev: EventIndexRow[]): EventIndexRow[] {
  return live.map((event) => {
    const id = eventId(event.track, event.name);
    const before = prev.find((row) => row.id === id);
    const carried: Partial<EventIndexRow> = before
      ? {
          karts: before.karts,
          laps: before.laps,
          flag: before.flag,
          capturedAt: before.capturedAt,
          dataUrl: before.dataUrl,
        }
      : {};
    return { id, name: event.name || event.track, track: event.track, live: true, ...carried };
  });
}

/** Ordena eventos priorizando pistas escolhidas; limita por ciclo se maxPerCycle > 0. */
export function orderEvents(
  events: LiveEvent[],
  options: { priorityTracks?: string[]; maxPerCycle?: number } = {},
): LiveEvent[] {
  const prio = (options.priorityTracks ?? []).map((s) => s.toLowerCase());
  const score = (e: LiveEvent): number => {
    const hay = `${e.track} ${e.name}`.toLowerCase();
    return prio.some((p) => hay.includes(p)) ? 0 : 1;
  };
  const sorted = events.slice().sort((a, b) => score(a) - score(b));
  const max = options.maxPerCycle ?? 0;
  return max > 0 ? sorted.slice(0, max) : sorted;
}

/**
 * Seleciona o que capturar. As **pistas prioritárias** (ex.: FKI Linhares / Fãs de Kart)
 * entram SEMPRE no foco por padrão; somadas ao FOCO explícito (eventos analisando + fixados
 * vindos do frontend). Sem foco nem prioridade, cai no eventFilter (uso via CLI); sem nada,
 * não captura (só lista).
 */
export function selectForCapture(
  live: LiveEvent[],
  options: { focus?: string[]; eventFilter?: string[]; priorityTracks?: string[] } = {},
): LiveEvent[] {
  const focus = new Set(options.focus ?? []);
  const prio = (options.priorityTracks ?? []).map((s) => s.toLowerCase());
  const isPriority = (e: LiveEvent): boolean => {
    const hay = `${e.track} ${e.name}`.toLowerCase();
    return prio.some((p) => hay.includes(p));
  };
  if (focus.size || prio.length) {
    // união: foco explícito + prioridades sempre fixadas
    return live.filter((e) => focus.has(eventId(e.track, e.name)) || isPriority(e));
  }
  const filter = (options.eventFilter ?? []).map((s) => s.toLowerCase());
  if (filter.length) {
    return live.filter((e) => {
      const hay = `${e.track} ${e.name}`.toLowerCase();
      return filter.some((f) => hay.includes(f));
    });
  }
  return [];
}
