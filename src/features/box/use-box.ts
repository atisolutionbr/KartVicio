"use client";

import { useCallback, useEffect, useState } from "react";
import { evaluateStopDuration, FDK_100_MILHAS_RULES, type StopValidity } from "@/domain/race/rules";
import { useLocalStorageState } from "@/lib/use-local-storage-state";

/*
 * BOX — fonte ÚNICA das paradas. A tela /box (checklist completo) e o cartão de cada kart no
 * Cockpit leem e gravam o MESMO estado, então a contagem de paradas nunca diverge.
 * Chave: número do kart (o mesmo do evento ativo).
 */

export const BOX_STORAGE_KEY = "enduro.box";
const RULES = FDK_100_MILHAS_RULES;

export type BoxActive = {
  startedAtMs: number;
  drawnKart: string;
  plate: boolean;
  sensor: boolean;
  weighed: boolean;
  ballastOut: boolean;
};

export type BoxLog = {
  number: string;
  endedAtMs: number;
  durationMs: number;
  drawnKart: string;
  status: StopValidity["status"];
  penalty: boolean;
};

export type BoxState = {
  stops: Record<string, number>;
  active: Record<string, BoxActive>;
  log: BoxLog[];
};

const EMPTY_BOX: BoxState = { stops: {}, active: {}, log: [] };

export function isChecklistComplete(active: BoxActive): boolean {
  return active.drawnKart.trim().length > 0 && active.plate && active.sensor && active.weighed && active.ballastOut;
}

export function useBox() {
  const [box, setBox] = useLocalStorageState<BoxState>(BOX_STORAGE_KEY, EMPTY_BOX);

  const enter = useCallback(
    (number: string) =>
      setBox((current) => ({
        ...current,
        active: {
          ...current.active,
          [number]: {
            startedAtMs: Date.now(),
            drawnKart: "",
            plate: false,
            sensor: false,
            weighed: false,
            ballastOut: false,
          },
        },
      })),
    [setBox],
  );

  const cancel = useCallback(
    (number: string) =>
      setBox((current) => {
        const active = { ...current.active };
        delete active[number];
        return { ...current, active };
      }),
    [setBox],
  );

  const patch = useCallback(
    (number: string, change: Partial<BoxActive>) =>
      setBox((current) => {
        const cur = current.active[number];
        if (!cur) return current;
        return { ...current, active: { ...current.active, [number]: { ...cur, ...change } } };
      }),
    [setBox],
  );

  /** encerra a parada: valida pelas zonas do regulamento e soma +1 se contar. */
  const leave = useCallback(
    (number: string) =>
      setBox((current) => {
        const cur = current.active[number];
        if (!cur) return current;
        const endedAtMs = Date.now();
        const durationMs = endedAtMs - cur.startedAtMs;
        const validity = evaluateStopDuration(durationMs, RULES);
        const stops = { ...current.stops };
        if (validity.countsAsMandatoryStop) {
          stops[number] = Math.min(RULES.mandatoryStops, (stops[number] ?? 0) + 1);
        }
        const log: BoxLog[] = [
          {
            number,
            endedAtMs,
            durationMs,
            drawnKart: cur.drawnKart,
            status: validity.status,
            penalty: validity.penaltyLaps > 0,
          },
          ...current.log,
        ].slice(0, 40);
        const active = { ...current.active };
        delete active[number];
        return { stops, active, log };
      }),
    [setBox],
  );

  const stopsOf = useCallback((number: string) => box.stops[number] ?? 0, [box.stops]);

  return { box, enter, cancel, patch, leave, stopsOf };
}

/** relógio que avança sozinho (para cronômetros de box). Começa em 0 no servidor/hidratação. */
export function useNow(intervalMs = 200): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const kick = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}

export function formatBoxClock(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const tenths = Math.floor((total * 10) % 10);
  return `${m}:${String(s).padStart(2, "0")}.${tenths}`;
}
