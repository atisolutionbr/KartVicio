import type { Gap } from "./types";

export function parseGap(raw: string | null | undefined): Gap {
  if (raw == null) return { type: "none", raw: null };

  const value = raw.trim();
  if (!value || /^-+$/.test(value)) return { type: "none", raw: value };

  const lapMatch = value.match(/([+-]?\d+)\s*voltas?/i);
  if (lapMatch) {
    return {
      type: "laps",
      raw: value,
      laps: Number.parseInt(lapMatch[1] ?? "0", 10),
    };
  }

  const ms = parseTimeToMs(value.replace(/^\+/, ""));
  if (ms != null) return { type: "time", raw: value, ms };

  return { type: "other", raw: value };
}

export function parseTimeToMs(raw: string | null | undefined): number | null {
  if (raw == null) return null;

  const value = raw.trim().replace(",", ".");
  if (!value || /^-+$/.test(value)) return null;

  const parts = value.split(":");
  if (
    parts.length > 3 ||
    !parts.every((part) => /^\d{1,2}(?:\.\d{1,3})?$/.test(part))
  ) {
    return null;
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 1) {
    seconds = Number.parseFloat(parts[0] ?? "0");
  } else if (parts.length === 2) {
    minutes = Number.parseInt(parts[0] ?? "0", 10);
    seconds = Number.parseFloat(parts[1] ?? "0");
  } else {
    hours = Number.parseInt(parts[0] ?? "0", 10);
    minutes = Number.parseInt(parts[1] ?? "0", 10);
    seconds = Number.parseFloat(parts[2] ?? "0");
  }

  return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1_000);
}
