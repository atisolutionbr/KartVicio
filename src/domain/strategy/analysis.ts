import { greenLapMs } from "./projection";

/*
 * ANÁLISE DE CORRIDA — deriva do histórico volta a volta (que o ingestor captura) as
 * informações de decisão que a cronometragem crua não mostra: estado do stint,
 * degradação de ritmo, taxa de aproximação (alcança em N voltas), ranking de ritmo e a
 * linha do tempo retrospectiva. Mais o rating híbrido de piloto (velocidade + consistência).
 *
 * Tudo função pura sobre `laps: { n, ms, pos? }[]`. Sem React/DOM.
 * Portado do EnduroKartTeam (web/src/lib/analytics.js + decisions.js).
 */

export type Lap = { n: number; ms: number; pos?: number };

export type DriverLaps = {
  number: string | number;
  name?: string;
  laps: Lap[];
  /** fallbacks quando não há histórico suficiente para ritmo verde */
  avg?: number | null;
  best?: number | null;
};

/** ajustes da detecção de "volta de box" (parada embutida numa volta longa). */
export type PitDetectOptions = {
  /** se souber a parada mínima (ms), usa green + 60% dela como corte */
  minStopMs?: number;
  /** senão, corta em green * fator (default 2.0) */
  pitFactor?: number;
};

export type Stint = {
  idx: number;
  startN: number;
  endN: number;
  laps: Lap[];
  count: number;
  ms: number;
  pitLapMs: number | null;
};

export type CurrentStint = {
  startN: number;
  lapsInStint: number;
  msInStint: number;
  stopsSoFar: number;
  justPitted: boolean;
};

export type Degradation = {
  base: number;
  recent: number;
  delta: number;
  /** down = ritmo caindo (mais lento); up = melhorando; flat = estável */
  dir: "down" | "up" | "flat";
};

export type PaceRankRow = { green: number | null; rank: number };

export type PairTrend = {
  /** ms/volta que eu ganho no outro (>0 = me aproximo / sou mais rápido) */
  ratePerLap: number;
  laps: number;
};

export type TimelineEvent = {
  n: number;
  type: "pit" | "fastest" | "lead";
  number: string;
  name?: string;
  ms?: number;
};

export function median(values: (number | null | undefined)[]): number | null {
  const sorted = values.filter((x): x is number => x != null).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Uma volta é "de box" se muito mais longa que o ritmo verde (parada embutida). */
export function isPitLap(ms: number, greenMs: number | null, opts: PitDetectOptions = {}): boolean {
  if (!greenMs) return false;
  if (opts.minStopMs) return ms >= greenMs + opts.minStopMs * 0.6;
  return ms >= greenMs * (opts.pitFactor ?? 2.0);
}

/** Segmenta as voltas em stints, cortando nas voltas de box. */
export function stints(laps: Lap[], greenMs: number | null, opts: PitDetectOptions = {}): Stint[] {
  const segs: Lap[][] = [];
  let cur: Lap[] = [];
  for (const l of laps) {
    cur.push(l);
    if (isPitLap(l.ms, greenMs, opts)) {
      segs.push(cur);
      cur = [];
    }
  }
  if (cur.length) segs.push(cur);
  return segs.map((s, i) => {
    const last = s[s.length - 1]!;
    return {
      idx: i,
      startN: s[0]!.n,
      endN: last.n,
      laps: s,
      count: s.length,
      ms: s.reduce((a, l) => a + l.ms, 0),
      pitLapMs: isPitLap(last.ms, greenMs, opts) ? last.ms : null,
    };
  });
}

/** Estado do stint ATUAL: voltas desde a última parada + tempo acumulado. */
export function currentStint(
  laps: Lap[],
  greenMs: number | null,
  opts: PitDetectOptions = {},
): CurrentStint | null {
  if (!laps || !laps.length) return null;
  const segs = stints(laps, greenMs, opts);
  const last = segs[segs.length - 1]!;
  // se a última volta foi de box, o kart acabou de parar → stint "zerando"
  const justPitted = isPitLap(laps[laps.length - 1]!.ms, greenMs, opts);
  // paradas = nº de voltas-de-box (contar direto evita subcontagem quando a última é parada)
  const stopsSoFar = laps.filter((l) => isPitLap(l.ms, greenMs, opts)).length;
  return {
    startN: last.startN,
    lapsInStint: justPitted ? 0 : last.count,
    msInStint: justPitted ? 0 : last.laps.reduce((a, l) => a + l.ms, 0),
    stopsSoFar,
    justPitted,
  };
}

/** Média móvel de ritmo (para gráfico/tendência). */
export function rollingPace(laps: Lap[], w = 5): { n: number; ms: number | null }[] {
  return laps.map((l, i) => {
    const win = laps.slice(Math.max(0, i - w + 1), i + 1).map((x) => x.ms);
    return { n: l.n, ms: mean(win) };
  });
}

/*
 * Degradação do stint atual: compara o ritmo das últimas w voltas limpas com o começo
 * do stint. delta > 0 = ritmo caindo (kart/piloto cansando ou problema).
 */
export function degradation(
  laps: Lap[],
  greenMs: number | null,
  w = 5,
  opts: PitDetectOptions = {},
): Degradation | null {
  if (!laps || laps.length < 3) return null;
  const segs = stints(laps, greenMs, opts);
  const seg = segs[segs.length - 1]!.laps.filter((l) => !isPitLap(l.ms, greenMs, opts));
  if (seg.length < 4) return null;
  const clean = seg.filter((l) => l.ms <= (greenMs ?? Infinity) * 1.25).map((l) => l.ms);
  const use = clean.length >= 4 ? clean : seg.map((l) => l.ms);
  const base = mean(use.slice(0, Math.min(w, use.length)));
  const recent = mean(use.slice(-w));
  if (base == null || recent == null) return null;
  const delta = recent - base;
  return {
    base,
    recent,
    delta,
    dir: delta > 400 ? "down" : delta < -400 ? "up" : "flat", // down = mais lento
  };
}

/** Ranking do grid por ritmo verde. Retorna Map<number, { green, rank }>. */
export function paceRank(drivers: DriverLaps[]): Map<string, PaceRankRow> {
  const arr = drivers.map((d) => ({
    number: String(d.number),
    green: greenLapMs(d.laps.map((l) => l.ms)) ?? d.avg ?? d.best ?? Infinity,
  }));
  arr.sort((a, b) => a.green - b.green);
  const m = new Map<string, PaceRankRow>();
  arr.forEach((x, i) => m.set(x.number, { green: isFinite(x.green) ? x.green : null, rank: i + 1 }));
  return m;
}

/*
 * Tendência entre dois karts (eu vs outro) nas últimas w voltas em comum.
 * ratePerLap > 0 = estou mais rápido que o outro (ganhando ~X ms/volta nele).
 * Se o outro está à frente, isso é a TAXA DE APROXIMAÇÃO.
 */
export function pairTrend(meLaps: Lap[], otherLaps: Lap[], w = 5): PairTrend | null {
  const om = new Map(otherLaps.map((l) => [l.n, l.ms]));
  const common = meLaps.filter((l) => om.has(l.n)).slice(-w);
  if (common.length < 2) return null;
  const deltas = common.map((l) => om.get(l.n)! - l.ms); // outro − eu
  const ratePerLap = mean(deltas);
  if (ratePerLap == null) return null;
  return { ratePerLap, laps: common.length };
}

/** Em quantas voltas fecho um gap (ms), dada a taxa de aproximação (ms/volta). */
export function catchLaps(gapMs: number, ratePerLap: number): number | null {
  if (!gapMs || !ratePerLap || ratePerLap <= 0) return null;
  return gapMs / ratePerLap;
}

/*
 * LINHA DO TEMPO retrospectiva reconstruída do histórico: paradas, trocas de liderança e
 * recordes de volta. Ordenada da mais recente para a mais antiga.
 */
export function timeline(
  drivers: DriverLaps[],
  opts: PitDetectOptions & { limit?: number } = {},
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  let overallBest = Infinity;
  const maxN = drivers.reduce(
    (m, d) => Math.max(m, d.laps.length ? d.laps[d.laps.length - 1]!.n : 0),
    0,
  );
  const greens = new Map(drivers.map((d) => [String(d.number), greenLapMs(d.laps.map((l) => l.ms))]));

  for (let n = 1; n <= maxN; n++) {
    for (const d of drivers) {
      const lap = d.laps.find((l) => l.n === n);
      if (!lap) continue;
      // parada (volta de box)
      if (isPitLap(lap.ms, greens.get(String(d.number)) ?? null, opts)) {
        events.push({ n, type: "pit", number: String(d.number), name: d.name, ms: lap.ms });
      }
      // recorde geral de volta
      if (lap.ms < overallBest && lap.ms > 8000) {
        overallBest = lap.ms;
        events.push({ n, type: "fastest", number: String(d.number), name: d.name, ms: lap.ms });
      }
    }
  }
  // trocas de liderança (a partir do campo pos por volta)
  let prevLeader: string | null = null;
  for (let n = 1; n <= maxN; n++) {
    const leader = drivers.find((d) => d.laps.some((l) => l.n === n && l.pos === 1));
    if (leader && String(leader.number) !== prevLeader) {
      if (prevLeader != null) {
        events.push({ n, type: "lead", number: String(leader.number), name: leader.name });
      }
      prevLeader = String(leader.number);
    }
  }
  return events.sort((a, b) => b.n - a.n).slice(0, opts.limit ?? 40);
}

/*
 * HABILIDADE DO PILOTO (0–100) a partir do desempenho medido.
 * Combina ritmo relativo ao melhor do grid (speed) e consistência (regularidade).
 * refBestMs = melhor ritmo verde do grid; usado para normalizar a velocidade.
 */
export type DriverRating = { overall: number; speed: number; consist: number };

export function driverRating(
  input: { greenMs: number | null; sdMs?: number | null },
  ref: { refBestMs: number | null },
): DriverRating | null {
  const { greenMs, sdMs } = input;
  const { refBestMs } = ref;
  if (!greenMs || !refBestMs) return null;
  // velocidade: 100 no ref; cada 1% mais lento tira ~4 pontos
  const slowPct = ((greenMs - refBestMs) / refBestMs) * 100;
  const speed = Math.max(0, 100 - slowPct * 4);
  // consistência: 100 no melhor desvio; penaliza a variação relativa ao ritmo
  let consist = 60;
  if (sdMs != null && greenMs) {
    const cv = sdMs / greenMs; // coef. de variação (menor = melhor)
    consist = Math.max(0, 100 - cv * 100 * 8); // 1% de CV ~ -8 pts
  }
  const overall = Math.round(speed * 0.6 + consist * 0.4);
  return {
    overall: Math.max(0, Math.min(100, overall)),
    speed: Math.round(speed),
    consist: Math.round(consist),
  };
}
