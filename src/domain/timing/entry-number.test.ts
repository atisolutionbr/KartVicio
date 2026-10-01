import { describe, expect, it } from "vitest";
import { normalizeEntryNumber } from "./entry-number";

describe("normalizeEntryNumber", () => {
  it("matches formatted numeric kart numbers", () => {
    expect(normalizeEntryNumber(" #007 ")).toBe("7");
  });

  it("keeps alphanumeric identifiers in a stable form", () => {
    expect(normalizeEntryNumber(" kart-a ")).toBe("KART-A");
  });
});
