import type { TimingSnapshot } from "@/domain/timing/types";
import { keepRecentSnapshots } from "@/domain/timing/trend";

type TimingStore = Map<string, TimingSnapshot[]>;

const globalStore = globalThis as typeof globalThis & {
  __enduroTimingStore?: TimingStore;
};
const store = globalStore.__enduroTimingStore ?? new Map<string, TimingSnapshot[]>();
globalStore.__enduroTimingStore = store;

export function appendTimingSnapshot(eventId: string, snapshot: TimingSnapshot) {
  const current = store.get(eventId) ?? [];
  if (current.at(-1)?.capturedAtMs === snapshot.capturedAtMs) return;
  store.set(eventId, keepRecentSnapshots([...current, structuredClone(snapshot)]));
}

export function listTimingSnapshots(eventId: string): TimingSnapshot[] {
  return structuredClone(store.get(eventId) ?? []);
}

export function clearTimingSnapshots(eventId: string) {
  store.delete(eventId);
}
