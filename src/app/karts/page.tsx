"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { appUrl } from "@/lib/app-url";

/*
 * RITMO POR KART — o número do mylaptime = kart físico. Mostra o ritmo relativo ao grid
 * (mediana do kart ÷ mediana do grid), agregado de muitas sessões. No dia da prova: sorteou
 * o kart X → olha aqui se é rápido ou lento. Consome GET /api/kart-pace (worker → data/*.jsonl).
 */

type KartRow = { track: string; number: string; relPace: number; sessions: number; laps: number };
type KartPace = { generatedAt: string; filter: string | null; sessions: number; byKart: KartRow[] };

export default function KartsPage() {
  const [track, setTrack] = useState("camburi");
  const [data, setData] = useState<KartPace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(appUrl(`/api/kart-pace?track=${encodeURIComponent(track)}`), { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as KartPace);
    } catch {
      setError("Não foi possível carregar o histórico de voltas da sessão.");
    } finally {
      setLoading(false);
    }
  }, [track]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const byKart = data?.byKart ?? [];

  return (
    <AppShell active="/karts">
      <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
          <header className="flex flex-col gap-3 border-b border-border pb-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant="info">Inteligencia de kart</Badge>
                {data && <Badge variant="outline">{data.sessions} sessoes</Badge>}
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">Ritmo por kart</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ritmo relativo das voltas válidas por kart físico na sessão. Menor % = ritmo mais rápido.
                Importações autorizadas e simulação alimentam esta análise; piloto e condições também influenciam.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Pista (filtro)
                <input
                  value={track}
                  onChange={(event) => setTrack(event.target.value)}
                  placeholder="camburi"
                  className="h-9 w-44 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none ring-ring focus:ring-2"
                />
              </label>
              <Button variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Atualizar
              </Button>
            </div>
          </header>

          {error && (
            <div className="rounded-md border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
          )}

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead className="border-b border-border bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Kart</th>
                    <th className="px-4 py-3">Ritmo relativo</th>
                    <th className="px-4 py-3">Classificacao</th>
                    <th className="px-4 py-3 text-right">Sessoes</th>
                    <th className="px-4 py-3 text-right">Voltas</th>
                    <th className="px-4 py-3">Pista</th>
                  </tr>
                </thead>
                <tbody>
                  {byKart.map((kart, index) => {
                    const pct = (kart.relPace - 1) * 100;
                    const tag = pct <= -0.5 ? "RAPIDO" : pct >= 1.5 ? "LENTO" : "medio";
                    const variant = tag === "RAPIDO" ? "ok" : tag === "LENTO" ? "critical" : "secondary";
                    return (
                      <tr key={`${kart.track}-${kart.number}`} className="border-b border-border/70">
                        <td className="px-4 py-2.5 text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-2.5 text-lg font-bold">#{kart.number}</td>
                        <td className={cn("px-4 py-2.5 font-semibold tabular-nums", pct <= -0.5 ? "text-emerald-600" : pct >= 1.5 ? "text-red-600" : "")}>
                          {pct >= 0 ? "+" : ""}
                          {pct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={variant}>{tag}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{kart.sessions}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{kart.laps}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{kart.track}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {byKart.length === 0 && !loading && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Ainda sem dados para &quot;{track}&quot;. Rode a captura (npm run mylaptime) na pista para popular.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}
