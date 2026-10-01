import * as cheerio from "cheerio";
import { parseGap, parseTimeToMs } from "@/domain/timing/gaps";
import { normalizeEntryNumber } from "@/domain/timing/entry-number";
import type { FlagState, TimingEntry, TimingSnapshot } from "@/domain/timing/types";

export function extractMyLapTimeSnapshot(
  html: string,
  capturedAtMs: number,
): TimingSnapshot {
  const $ = cheerio.load(html);

  return {
    capturedAtMs,
    raceClockMs: parseTimeToMs(text($, ".lt-timer-value")),
    flag: extractFlag($),
    entries: extractEntries($),
  };
}

function extractEntries($: cheerio.CheerioAPI): TimingEntry[] {
  const headerLabels = $(".lt-table-header .lt-th-center")
    .map((_, element) => normalizeLabel($(element).text()))
    .get();

  return $(".lt-competitor-row")
    .map((index, element) => {
      const row = $(element);
      const mobileStats = readMobileStats($, row);
      const desktopStats =
        Object.keys(mobileStats).length > 0
          ? mobileStats
          : readDesktopStats($, row, headerLabels);
      const numberText = normalizeEntryNumber(textFrom(row, ".lt-driver-number"));
      const position = toInt(textFrom(row, ".lt-pos-badge")) ?? index + 1;

      return {
        position,
        entryNumber: numberText,
        displayName: textFrom(row, ".lt-driver-name"),
        lapCount: toInt(desktopStats.LAP) ?? 0,
        lastLapMs: parseTimeToMs(desktopStats.TUV ?? desktopStats["T.U.V"]),
        bestLapMs: parseTimeToMs(desktopStats.TMV ?? desktopStats["T.M.V"]),
        bestLapNumber: toInt(desktopStats.MV ?? desktopStats["M.V"]),
        gapToLeader: parseGap(desktopStats.DIFF),
        gapToNext: parseGap(desktopStats.GAP),
        state: textFrom(row, ".lt-driver-state") || null,
      };
    })
    .get();
}

function readMobileStats(
  $: cheerio.CheerioAPI,
  row: ReturnType<cheerio.CheerioAPI>,
): Record<string, string> {
  const stats: Record<string, string> = {};

  row.find(".lt-mobile-stat").each((_, element) => {
    const label = normalizeLabel($(element).find(".lt-stat-label").text());
    const value = $(element).find(".lt-stat-value").text().trim();
    if (label) stats[label] = value;
  });

  return stats;
}

function readDesktopStats(
  $: cheerio.CheerioAPI,
  row: ReturnType<cheerio.CheerioAPI>,
  headerLabels: string[],
): Record<string, string> {
  const stats: Record<string, string> = {};

  row.find(".lt-row-desktop .lt-data-cell")
    .not(".lt-data-cell--pos")
    .not(".lt-data-cell--driver")
    .each((index, element) => {
      const label = headerLabels[index];
      if (label) stats[label] = $(element).text().trim();
    });

  return stats;
}

function extractFlag($: cheerio.CheerioAPI): FlagState {
  const raw = [
    $(".lt-timer-flag").attr("class"),
    $(".lt-racing-flag-icon").attr("class"),
    $(".lt-timer-flag").attr("style"),
    $(".lt-racing-flag-icon").attr("style"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (raw.includes("green") || raw.includes("verde")) return "green";
  if (raw.includes("yellow") || raw.includes("amarel")) return "yellow";
  if (raw.includes("red") || raw.includes("vermelh")) return "red";
  if (raw.includes("checker") || raw.includes("xadrez")) return "checkered";
  return "unknown";
}

function text($: cheerio.CheerioAPI, selector: string): string {
  return $(selector).first().text().trim();
}

function textFrom(
  row: ReturnType<cheerio.CheerioAPI>,
  selector: string,
): string {
  return row.find(selector).first().text().trim();
}

function normalizeLabel(label: string): string {
  return label.toUpperCase().replace(/\s+/g, "");
}

function toInt(value: string | null | undefined): number | null {
  if (value == null) return null;
  const normalized = value.replace(/[^\d-]/g, "");
  if (!normalized) return null;
  return Number.parseInt(normalized, 10);
}
