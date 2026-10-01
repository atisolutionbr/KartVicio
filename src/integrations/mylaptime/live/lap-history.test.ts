import { describe, expect, it } from "vitest";
import { extractLapHistory } from "./lap-history";

/** board mínimo com uma linha expandida (estrutura real do .lt-expansion-panel). */
const HTML = `
<div class="lt-competitors-list">
  <div class="lt-competitor-row">
    <span class="lt-driver-number">#7</span>
    <div class="lt-expansion-panel">
      <div class="lt-passings-grid">
        <div class="lt-passing-item">
          <div class="lt-passing-field"><span>Lap</span><strong>1</strong></div>
          <div class="lt-passing-field"><span>Pos</span><strong>3</strong></div>
          <div class="lt-passing-field"><span>Tempo</span><strong>41.200</strong></div>
        </div>
        <div class="lt-passing-item">
          <div class="lt-passing-field"><span>Lap</span><strong>2</strong></div>
          <div class="lt-passing-field"><span>Pos</span><strong>2</strong></div>
          <div class="lt-passing-field"><span>Tempo</span><strong>40.900</strong></div>
        </div>
      </div>
    </div>
  </div>
  <div class="lt-competitor-row">
    <span class="lt-driver-number">#12</span>
    <div class="lt-expansion-panel"><div class="lt-expansion-empty">Sem voltas</div></div>
  </div>
</div>`;

describe("extractLapHistory", () => {
  it("reads laps per entry number, parsing time and position", () => {
    const laps = extractLapHistory(HTML);
    expect(Object.keys(laps)).toEqual(["7"]); // #12 tem painel vazio → não entra
    expect(laps["7"]).toHaveLength(2);
    expect(laps["7"]![0]).toEqual({ n: 1, ms: 41_200, pos: 3 });
    expect(laps["7"]![1]!.ms).toBe(40_900);
  });

  it("returns empty object when there are no expanded panels", () => {
    expect(extractLapHistory("<div>nada</div>")).toEqual({});
  });
});
