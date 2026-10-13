import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Assina mudanças em tempo real de múltiplas entidades e dispara um reload
 * debounced (350ms) quando qualquer uma delas sofre create/update/delete.
 *
 * Apenas a transição de aba visível dispara reload — focus/online eram
 * redundantes e causavam recargas duplicadas a cada troca de janela.
 *
 * @param {Function} reloadFn - função chamada quando dados mudam (ex: loadData)
 * @param {string[]} entityNames - nomes das entidades em base44.entities
 * @param {boolean} enabled - se a assinatura está ativa
 */
export function useEntitySubscriptions(reloadFn, entityNames, enabled = true) {
  const reloadRef = useRef(reloadFn);
  reloadRef.current = reloadFn;

  const key = entityNames.join(",");

  useEffect(() => {
    if (!enabled) return;
    let timer = null;
    let running = false;
    let pending = false;
    let disposed = false;
    const reload = async () => {
      if (running) { pending = true; return; }
      running = true;
      try {
        do {
          pending = false;
          await reloadRef.current();
        } while (pending && !disposed);
      } finally {
        running = false;
      }
    };
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(reload, 350);
    };
    // Só recarrega quando a aba volta a ficar visível (não a cada focus).
    const visible = () => { if (document.visibilityState === 'visible') trigger(); };
    const unsubs = key.split(',').filter(Boolean).map(name => {
      try { return base44.entities[name].subscribe(trigger); }
      catch { return () => {}; }
    });
    document.addEventListener('visibilitychange', visible);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      unsubs.forEach(unsubscribe => unsubscribe());
      document.removeEventListener('visibilitychange', visible);
    };
  }, [enabled, key]);
}