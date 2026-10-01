"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

/*
 * Estado persistido no localStorage, compartilhado entre telas/abas.
 * Usa useSyncExternalStore: o servidor e a hidratação renderizam o valor padrão (sem
 * mismatch) e o cliente passa ao valor salvo logo depois. Toda escrita notifica os outros
 * componentes que leem a mesma chave (e outras abas, via evento "storage").
 */

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function parse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((current: T) => T)) => void] {
  // referência estável do padrão (callers costumam passar literais novos a cada render)
  const [fallback] = useState(initialValue);

  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    () => null,
  );
  const state = useMemo(() => parse(raw, fallback), [raw, fallback]);

  const update = useCallback(
    (value: T | ((current: T) => T)) => {
      const current = parse(window.localStorage.getItem(key), fallback);
      const next =
        typeof value === "function" ? (value as (current: T) => T)(current) : value;
      window.localStorage.setItem(key, JSON.stringify(next));
      listeners.forEach((listener) => listener());
    },
    [key, fallback],
  );

  return [state, update];
}
