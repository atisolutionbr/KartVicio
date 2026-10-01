import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { extractMyLapTimeSnapshot } from "@/integrations/mylaptime/extractor";
import type { TimingSnapshot } from "@/domain/timing/types";
import type { LiveConfig } from "./config";
import type { EventMeta, LiveEvent } from "./event-index";
import { extractLapHistory, type HistoryLap } from "./lap-history";

/*
 * Controla UM navegador Playwright vivo sobre o mylaptime LiveTime.
 * Regra de ouro: carregar a página UMA vez (goto) e navegar só por cliques do SPA — nunca
 * reload — para preservar o circuito Blazor/pareamento. Perfil PERSISTENTE + injeção do
 * token guardam o pareamento entre reinícios ("pra sempre"). Portado do EnduroKartTeam.
 */

const LIVE_URL = "https://mylaptime.com.br/LiveTime";

export type CaptureResult = {
  meta: EventMeta;
  snapshot: TimingSnapshot;
  laps: Record<string, HistoryLap[]>;
};

function log(...args: unknown[]): void {
  console.log("[session]", ...args);
}

export class MyLapTimeLiveSession {
  private ctx!: BrowserContext;
  page!: Page;
  paired = false;
  savedToken = "";
  private userDataDir = "";

  constructor(private readonly config: LiveConfig) {}

  private dataPath(...parts: string[]): string {
    return path.join(process.cwd(), this.config.dataDir, ...parts);
  }

  async launch(): Promise<void> {
    throw new Error("Captura automatizada desativada. LapTime requer autorização escrita e documentação oficial; use AuthorizedLapTimeProvider.");
    /* Legacy implementation retained for provenance; unreachable and never enabled by a flag. */
    // Perfil PERSISTENTE: cookies/localStorage/IndexedDB sobrevivem ao restart, então o
    // pareamento/login do mylaptime fica salvo — pareia 1× e pronto.
    this.userDataDir = this.config.userDataDir || this.dataPath("browser-profile");
    try {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    } catch {
      /* ignore */
    }
    this.ctx = await chromium.launchPersistentContext(this.userDataDir, {
      headless: this.config.headless,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1280, height: 900 },
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
      ...(this.config.browserChannel ? { channel: this.config.browserChannel } : {}),
    });

    // "Pareamento pra sempre": injeta o token salvo (localStorage.section_access_token) ANTES
    // de carregar a página — ela já inicia pareada. Vem do config ou de data/section-token.txt.
    let token = this.config.sectionAccessToken;
    if (!token) {
      try {
        token = fs.readFileSync(this.dataPath("section-token.txt"), "utf8").trim();
      } catch {
        token = "";
      }
    }
    if (token) {
      await this.ctx.addInitScript((value: string) => {
        try {
          localStorage.setItem("section_access_token", value);
          localStorage.setItem("accept_term", "accepted");
          localStorage.setItem("cookie_consent", "accepted_all");
        } catch {
          /* ignore */
        }
      }, token);
      log("token de pareamento injetado — tentando entrar já pareado");
    }
    this.savedToken = token;

    this.page = this.ctx.pages()[0] ?? (await this.ctx.newPage());
    this.page.setDefaultTimeout(this.config.navTimeoutMs);
    await this.page.goto(LIVE_URL, { waitUntil: "domcontentloaded" });
    await this.page.waitForTimeout(2500);
    await this.acceptTerms();
    log("LiveTime carregado.");
  }

  /** Clica "Aceitar Termos e gerar codigo" se o modal de boas-vindas estiver presente. */
  async acceptTerms(): Promise<void> {
    try {
      const btn = this.page.locator("button", { hasText: /Aceitar Termos/i }).first();
      if (await btn.count()) {
        await btn.click({ timeout: 4000 }).catch(() => {});
        await this.page.waitForTimeout(800);
      }
    } catch {
      /* ignore */
    }
  }

  /** Lê o código de pareamento do modal (32 hex, pode vir quebrado em 2 linhas). */
  async readPairingCode(): Promise<string | null> {
    return this.page
      .evaluate(() => {
        const norm = (s: string | null): string => (s ?? "").replace(/\s+/g, "");
        let best: string | null = null;
        for (const el of Array.from(document.querySelectorAll("div,span,p,code,strong"))) {
          const t = norm(el.textContent);
          if (/^[0-9a-f]{24,40}$/i.test(t) && (!best || t.length <= best.length)) best = t;
        }
        return best;
      })
      .catch(() => null);
  }

  async dismissModals(): Promise<void> {
    await this.page
      .evaluate(() => {
        Array.from(document.querySelectorAll<HTMLElement>("body *")).forEach((el) => {
          const c = getComputedStyle(el);
          if (
            c.position === "fixed" &&
            el.offsetWidth > innerWidth * 0.4 &&
            el.offsetHeight > innerHeight * 0.4 &&
            /Bem-vindo|QR Code|c[oó]digo de acesso/i.test(el.textContent ?? "") &&
            !el.querySelector(".lt-event-card, .lt-competitors-list")
          ) {
            el.remove();
          }
        });
      })
      .catch(() => {});
  }

  /**
   * Espera você parear no app. NÃO navega enquanto o código está na tela (mantém o QR estável
   * pra escanear). Detecta o pareamento pelo board acessível; re-dispara o modal só quando não
   * há código por >12s. data/paired.flag continua como override manual.
   */
  async waitForPairing(onCode?: (code: string) => void): Promise<boolean> {
    const flagPath = this.dataPath("paired.flag");
    try {
      fs.unlinkSync(flagPath);
    } catch {
      /* ignore */
    }
    const deadline = Date.now() + this.config.pairingWaitMs;
    let lastCode: string | null = null;
    let lastBeat = 0;
    let lastNav = 0;
    while (Date.now() < deadline) {
      if (fs.existsSync(flagPath)) {
        this.paired = true;
        log("sinal de pareamento (paired.flag) recebido — seguindo para captura.");
        await this.dumpAuthState().catch(() => {});
        return true;
      }
      await this.acceptTerms();
      const board = await this.page.$(".lt-competitors-list").catch(() => null);
      if (board) {
        this.paired = true;
        log("pareado (board acessível).");
        await this.backToList().catch(() => {});
        await this.dumpAuthState().catch(() => {});
        return true;
      }
      const code = await this.readPairingCode();
      if (code) {
        if (code !== lastCode) {
          lastCode = code;
          onCode?.(code);
        }
      } else if (Date.now() - lastNav > 12_000) {
        lastNav = Date.now();
        await this.openEventByIndex(0).catch(() => {});
      }
      if (Date.now() - lastBeat > 10_000) {
        lastBeat = Date.now();
        log(`aguardando pareamento… ${lastCode ? `código=${lastCode.slice(0, 8)}…` : "(gerando)"}`);
      }
      await this.page.waitForTimeout(2500);
    }
    return false;
  }

  /** Clica o botão "Assistir" (passo entre o card e o board). Devolve true se clicou. */
  private async clickAssistir(): Promise<boolean> {
    return this.page
      .evaluate(() => {
        const target = Array.from(document.querySelectorAll("button,a,div,span")).find((el) => {
          const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
          return /^(play_arrow\s*)?assistir$/i.test(t);
        });
        if (target instanceof HTMLElement) {
          target.click();
          return true;
        }
        return false;
      })
      .catch(() => false);
  }

  /** Abre o evento de índice `index`: card -> (detalhe) -> "Assistir" -> board. */
  async openEventByIndex(index: number): Promise<boolean> {
    try {
      await this.dismissModals();
      const clicked = await this.page
        .evaluate((i: number) => {
          const cards = document.querySelectorAll<HTMLElement>(".lt-event-card");
          const card = cards[i];
          if (!card) return false;
          card.click();
          return true;
        }, index)
        .catch(() => false);
      if (!clicked) return false;
      try {
        await this.page.waitForFunction(
          () =>
            !!document.querySelector(".lt-competitors-list") ||
            Array.from(document.querySelectorAll("button,a,div,span")).some((el) =>
              /^(play_arrow\s*)?assistir$/i.test((el.textContent ?? "").replace(/\s+/g, " ").trim()),
            ),
          { timeout: 8000 },
        );
      } catch {
        return false;
      }
      const hasBoard = await this.page.$(".lt-competitors-list").catch(() => null);
      if (!hasBoard) {
        await this.dismissModals();
        await this.clickAssistir();
      }
      try {
        await this.page.waitForSelector(".lt-competitors-list", { timeout: 8000 });
        return true;
      } catch {
        return false;
      }
    } catch {
      // navegação/reconexão no meio não pode derrubar o worker
      return false;
    }
  }

  /** Garante estar na lista de eventos. Do board/detalhe, clica "Voltar" até ver os cards. */
  async backToList(): Promise<boolean> {
    for (let i = 0; i < 5; i++) {
      const onList = await this.page
        .evaluate(() => !!document.querySelector(".lt-event-card"))
        .catch(() => false);
      if (onList) {
        await this.dismissModals();
        return true;
      }
      const clicked = await this.page
        .evaluate(() => {
          const candidates = Array.from(document.querySelectorAll<HTMLElement>("button,a")).filter((el) => {
            if (el.classList.contains("lt-dark-mode-btn")) return false;
            const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
            return /(^|\b)voltar(\b|$)/i.test(t);
          });
          const btn = candidates[0];
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        })
        .catch(() => false);
      await this.page.waitForTimeout(900);
      if (!clicked) break;
    }
    await this.dismissModals();
    return this.page.evaluate(() => !!document.querySelector(".lt-event-card")).catch(() => false);
  }

  /** Lê os cards da lista (gate-free — não precisa de pareamento). */
  async listEvents(): Promise<LiveEvent[]> {
    await this.backToList();
    await this.dismissModals();
    return this.page
      .evaluate(() =>
        Array.from(document.querySelectorAll(".lt-event-card")).map((card, index) => {
          const t = (sel: string): string => card.querySelector(sel)?.textContent ?? "";
          return {
            index,
            name: t(".lt-event-name").trim(),
            track: t(".lt-company-name").trim(),
            type: t(".lt-racing-type-name").trim(),
            live: /AO VIVO/i.test(card.textContent ?? ""),
          };
        }),
      )
      .catch(() => [] as LiveEvent[]);
  }

  private decodeUid(b64: string | null): string | null {
    try {
      return Buffer.from(b64 ?? "", "base64").toString("utf8") || null;
    } catch {
      return null;
    }
  }

  /**
   * Abre o evento de índice `index`, aplica page-size 100, expande as linhas (se pedido),
   * e devolve { meta, snapshot, laps }. Assume já pareado.
   */
  async captureEvent(
    index: number,
    options: { expandLaps?: boolean; cleanMeta?: { name?: string; track?: string; type?: string } } = {},
  ): Promise<CaptureResult | null> {
    await this.backToList();
    const opened = await this.openEventByIndex(index);
    if (!opened) {
      await this.dismissModals();
      return null;
    }

    // paginação 100 (mais voltas por página no painel expandido)
    await this.page
      .evaluate(() => {
        document.querySelectorAll<HTMLSelectElement>(".lt-page-select").forEach((sel) => {
          if (sel.value !== "100") {
            sel.value = "100";
            sel.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });
      })
      .catch(() => {});

    if (options.expandLaps) {
      await this.page
        .evaluate(() => {
          document.querySelectorAll<HTMLElement>(".lt-competitor-row.lt-competitor-row--clickable").forEach((row) => {
            if (row.querySelector(".lt-expansion-panel")) return;
            const target = row.querySelector<HTMLElement>(".lt-row-desktop, .lt-row-mobile, .lt-mobile-header") ?? row;
            target.click();
          });
        })
        .catch(() => {});
      await this.page.waitForTimeout(1600);
    }

    const html = await this.page.content();
    const snapshot = extractMyLapTimeSnapshot(html, Date.now());
    const laps = extractLapHistory(html);

    const rawMeta = await this.page
      .evaluate(() => {
        const uidB64 = localStorage.getItem("company_livetime_selected");
        const info = document.querySelector(".lt-racing-info");
        let boardName: string | null = null;
        if (info) {
          const parts = (info.textContent ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
          boardName = parts.find((p) => !/^(corrida|race|tomada de tempo|classificat)/i.test(p)) ?? parts[0] ?? null;
        }
        const body = document.body.textContent ?? "";
        let eventType = "unknown";
        if (/tomada de tempo/i.test(body)) eventType = "practice";
        else if (/classificat/i.test(body)) eventType = "quali";
        else if (/\brace\b|corrida/i.test(body)) eventType = "race";
        return { uidB64, boardName, eventType };
      })
      .catch(() => ({ uidB64: null as string | null, boardName: null as string | null, eventType: "unknown" }));

    const meta: EventMeta = {
      uid: this.decodeUid(rawMeta.uidB64),
      name: rawMeta.boardName ?? options.cleanMeta?.name ?? null,
      track: options.cleanMeta?.track ?? null,
      type: rawMeta.eventType || "unknown",
    };
    return { meta, snapshot, laps };
  }

  /** Saúde da conexão: relógio + modal de reconexão do Blazor. */
  async connectionHealth(): Promise<{ clock: string | null; reconnecting: boolean }> {
    return this.page
      .evaluate(() => {
        const clock = document.querySelector(".lt-timer-value")?.textContent ?? null;
        const modal = document.getElementById("components-reconnect-modal");
        const reconnecting = !!modal && getComputedStyle(modal).display !== "none" && modal.style.display !== "none";
        return { clock, reconnecting };
      })
      .catch(() => ({ clock: null, reconnecting: false }));
  }

  async tryReconnect(): Promise<void> {
    await this.page
      .evaluate(() => {
        try {
          const blazor = (window as unknown as { Blazor?: { reconnect?: () => void } }).Blazor;
          blazor?.reconnect?.();
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
  }

  async screenshotQR(): Promise<Buffer | null> {
    try {
      return await this.page.screenshot({ type: "png" });
    } catch {
      return null;
    }
  }

  /** Salva cookies + localStorage ao parear; extrai o token reinjetável (pareamento pra sempre). */
  async dumpAuthState(): Promise<void> {
    try {
      const cookies = await this.ctx.cookies();
      const ls = await this.page
        .evaluate(() => {
          const out: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) out[key] = localStorage.getItem(key) ?? "";
          }
          return out;
        })
        .catch(() => ({}) as Record<string, string>);
      const dump = { at: new Date().toISOString(), url: this.page.url(), cookies, localStorage: ls };
      try {
        fs.mkdirSync(this.dataPath(), { recursive: true });
      } catch {
        /* ignore */
      }
      fs.writeFileSync(this.dataPath("auth-dump.json"), JSON.stringify(dump, null, 2));
      if (ls["section_access_token"]) {
        try {
          fs.writeFileSync(this.dataPath("section-token.txt"), ls["section_access_token"]);
          log("token de pareamento salvo em data/section-token.txt");
        } catch {
          /* ignore */
        }
      }
      log(`estado de auth salvo — ${cookies.length} cookies, ${Object.keys(ls).length} chaves localStorage`);
    } catch (e) {
      log("falha ao salvar auth-dump:", (e as Error).message);
    }
  }

  async close(): Promise<void> {
    try {
      await this.ctx?.close();
    } catch {
      /* ignore */
    }
  }
}

export { LIVE_URL };
