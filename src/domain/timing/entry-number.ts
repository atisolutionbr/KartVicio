export function normalizeEntryNumber(value: string): string {
  const cleaned = value.trim().replace(/^#/, "");
  if (/^\d+$/.test(cleaned)) return String(Number.parseInt(cleaned, 10));
  return cleaned.toUpperCase();
}
