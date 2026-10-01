import * as cheerio from "cheerio";
import { parseTimeToMs } from "@/domain/timing/gaps";

/*
 * Extrai o HISTÓRICO VOLTA A VOLTA dos painéis expandidos (.lt-expansion-panel) do board.
 * O extractor.ts do repo já lê o snapshot (posição/gaps/melhor volta); aqui pegamos as
 * voltas individuais, que alimentam a análise de degradação e o ritmo por kart.
 *
 * Estrutura real (mapeada em 16/09): por competidor,
 *   .lt-expansion-panel > .lt-passings-grid > .lt-passing-item (uma por volta)
 *     .lt-passing-field: <span>Lap|Pos|Tempo|Diff|Líder|Delta</span><strong>valor</strong>
 * Portado de src/extractor/mylaptime-extractor.js (readLaps).
 */

export type HistoryLap = { n: number; ms: number | null; pos: number | null };

function toInt(value: string | null | undefined): number | null {
  if (value == null) return null;
  const normalized = value.replace(/[^\d-]/g, "");
  return normalized === "" ? null : Number.parseInt(normalized, 10);
}

/** Devolve, por número de kart (entryNumber), a lista de voltas capturadas do painel. */
export function extractLapHistory(html: string): Record<string, HistoryLap[]> {
  const $ = cheerio.load(html);
  const out: Record<string, HistoryLap[]> = {};

  $(".lt-competitor-row").each((_, rowEl) => {
    const row = $(rowEl);
    const number = row.find(".lt-driver-number").first().text().trim().replace(/^#/, "");
    if (!number) return;

    const panel = row.find(".lt-expansion-panel").first();
    if (panel.length === 0 || panel.find(".lt-expansion-empty").length > 0) return;

    const laps: HistoryLap[] = [];
    panel.find(".lt-passing-item").each((__, itemEl) => {
      const fields: Record<string, string> = {};
      $(itemEl)
        .find(".lt-passing-field")
        .each((___, fieldEl) => {
          const label = $(fieldEl).find("span").first().text().trim().toLowerCase().replace(/[íi]der/, "lider");
          const value = $(fieldEl).find("strong").first().text().trim();
          if (label) fields[label] = value;
        });
      const n = toInt(fields["lap"]);
      if (n == null) return;
      laps.push({ n, ms: parseTimeToMs(fields["tempo"] ?? null), pos: toInt(fields["pos"]) });
    });

    if (laps.length) out[number] = laps.sort((a, b) => a.n - b.n);
  });

  return out;
}
