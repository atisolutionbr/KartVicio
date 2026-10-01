"use client";

import { useCallback, useEffect, useState } from "react";
import type { TimingSnapshot } from "@/domain/timing/types";
import { useActiveEvent } from "@/features/monitoring/use-active-event";

export function useActiveTiming() {
  // mesmo evento ativo do Monitoramento (com padrão compartilhado) — antes o padrão aqui era
  // [], então num navegador novo o cockpit nunca conectava ao timing ao vivo.
  const { event } = useActiveEvent();
  const eventId = event.id;
  const [snapshots, setSnapshots] = useState<TimingSnapshot[]>([]);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    try {
      const response = await fetch(`/api/timing?eventId=${encodeURIComponent(eventId)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { snapshots: TimingSnapshot[] };
      setSnapshots(data.snapshots);
    } catch {
      // The next polling cycle retries after transient connection failures.
    }
  }, [eventId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 2_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return {
    event,
    snapshots,
    latest: snapshots.at(-1) ?? null,
    connected: snapshots.length > 0,
  };
}
