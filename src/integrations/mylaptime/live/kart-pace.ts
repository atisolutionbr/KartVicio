import fs from "node:fs";
import path from "node:path";
import type { EventData } from "./event-index";

/*
 * Inteligência de ritmo POR KART (o número do mylaptime = nº do kart físico).
 * Lê os snapshots capturados (data/snapshots-*.jsonl) e produz, por PISTA × KART, o RITMO
 * RELATIVO ao grid (mediana do kart ÷ mediana do grid na sessão) — isso isola a velocidade
 * do kart das condições do dia e, agregando muitas sessões (pilotos diferentes), do piloto.
 *
 *   npx tsx src/integrations/mylaptime/live/kart-pace.ts [filtroPista]   # ex.: camburi
 *
 * Gera data/kart-pace.json e imprime o ranking. No dia da prova: sorteou o kart X → olha aqui.
 * Portado do EnduroKartTeam (tools/kart-pace.js).
 */

type SnapshotLine = { at: number; data: EventData };
type KartAgg = { track: string; number: string; rels: number[]; laps: number; sessions: number };

function median(values: number[]): number | null {
  const sorted = values.filter((x) => x != null).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

/** ritmo verde de uma lista de voltas (mediana das limpas: descarta box/tráfego). */
function greenMs(lapMs: number[]): number | null {
  const valid = lapMs.filter((x) => x > 8000 && x < 600_000);
  if (!valid.length) return null;
  const raw = median(valid)!;
  const clean = valid.filter((x) => x <= raw * 1.3);
  return median(clean.length ? clean : valid);
}

function cleanLines(value: string | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function nameOf(data: EventData): string {
  const parts = cleanLines(data.event.name);
  return parts.find((p) => !/^(corrida|race|tomada|classif|treino)/i.test(p)) ?? parts[0] ?? "?";
}

function trackOf(data: EventData): string {
  return cleanLines(data.event.track)[0] ?? "?";
}

export function aggregateKartPace(dataDir: string, filter = ""): {
  generatedAt: string;
  filter: string | null;
  sessions: number;
  byKart: { track: string; number: string; relPace: number; sessions: number; laps: number }[];
} {
  const files = fs.existsSync(dataDir)
    ? fs.readdirSync(dataDir).filter((f) => /^snapshots-.*\.jsonl$/.test(f)).map((f) => path.join(dataDir, f))
    : [];

  // 1) agrupa por SESSÃO (pista+bateria), guardando o snapshot mais completo (mais voltas).
  const bySession = new Map<string, { track: string; data: EventData; laps: number }>();
  for (const file of files) {
    for (const line of fs.readFileSync(file, "utf8").trim().split(/\r?\n/).filter(Boolean)) {
      let rec: SnapshotLine;
      try {
        rec = JSON.parse(line) as SnapshotLine;
      } catch {
        continue;
      }
      const data = rec.data;
      if (!data?.event) continue;
      const track = trackOf(data);
      if (filter && !`${track} ${data.event.name ?? ""}`.toLowerCase().includes(filter)) continue;
      const key = `${track} :: ${nameOf(data)}`;
      const laps = data.drivers.reduce((sum, d) => sum + (d.laps?.length ?? 0), 0);
      const prev = bySession.get(key);
      if (!prev || laps >= prev.laps) bySession.set(key, { track, data, laps });
    }
  }

  // 2) por sessão: mediana de cada kart + mediana do grid → ritmo relativo do kart.
  // 3) agrega por (pista, kart) ao longo das sessões.
  const agg = new Map<string, KartAgg>();
  for (const { track, data } of bySession.values()) {
    const perKart: { number: string; green: number; laps: number }[] = [];
    for (const driver of data.drivers) {
      if (!driver.number) continue;
      const times = driver.laps.map((l) => l.ms).filter((ms): ms is number => ms != null);
      const green = greenMs(times);
      if (green) perKart.push({ number: driver.number, green, laps: times.length });
    }
    const fieldMedian = median(perKart.map((k) => k.green));
    if (!fieldMedian) continue;
    for (const kart of perKart) {
      const rel = kart.green / fieldMedian; // <1 = mais rápido que o grid; >1 = mais lento
      const key = `${track}::${kart.number}`;
      const entry = agg.get(key) ?? { track, number: kart.number, rels: [], laps: 0, sessions: 0 };
      entry.rels.push(rel);
      entry.laps += kart.laps;
      entry.sessions += 1;
      agg.set(key, entry);
    }
  }

  const byKart = [...agg.values()]
    .map((a) => ({
      track: a.track,
      number: a.number,
      relPace: (median(a.rels.map((r) => Math.round(r * 1000))) ?? 1000) / 1000,
      sessions: a.sessions,
      laps: a.laps,
    }))
    .sort((a, b) => a.relPace - b.relPace);

  return { generatedAt: new Date().toISOString(), filter: filter || null, sessions: bySession.size, byKart };
}

// Executado direto pela CLI (tsx). ESM: sem require.main — usa o argv.
const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").endsWith("live/kart-pace.ts");
if (invokedDirectly) {
  const filter = (process.argv[2] ?? "").toLowerCase();
  const dir = path.join(process.cwd(), "data");
  const out = aggregateKartPace(dir, filter);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "kart-pace.json"), JSON.stringify(out));
  console.log(`sessões: ${out.sessions} · karts: ${out.byKart.length}${filter ? ` [pista ~ ${filter}]` : ""}`);
  for (const k of out.byKart.slice(0, 12)) {
    const pct = (k.relPace - 1) * 100;
    const tag = pct <= -0.5 ? "RÁPIDO" : pct >= 1.5 ? "LENTO" : "médio";
    console.log(
      `  #${k.number.padEnd(3)} ${(pct >= 0 ? "+" : "") + pct.toFixed(1)}%  ${tag.padEnd(7)} (${k.sessions} sessões, ${k.laps} voltas) · ${k.track}`,
    );
  }
}
