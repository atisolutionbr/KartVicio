import fs from "node:fs";
import path from "node:path";
import { loadConfig, type LiveConfig } from "./config";
import {
  eventId,
  indexFromLive,
  orderEvents,
  selectForCapture,
  toEventData,
  type EventData,
  type EventIndexRow,
} from "./event-index";
import { MyLapTimeLiveSession } from "./session";
import { startStatusServer } from "./status-server";
import type { TimingSnapshot } from "@/domain/timing/types";

/*
 * Worker de captura: mantém UM navegador pareado vivo e, em ciclos, consome os eventos em
 * FOCO do mylaptime, gravando os snapshots normalizados em data/*.jsonl (o ritmo por kart lê
 * de lá). Nunca dá reload (preserva o circuito Blazor/pareamento).
 * Portado do EnduroKartTeam (src/ingestor/worker.js).
 */

export type LiveWorkerState = {
  paired: boolean;
  pairingCode: string | null;
  cycles: number;
  activeEvents: number;
  samples: number;
  lastEvent: string | null;
  status: string;
  updatedAt: number;
  events: EventIndexRow[];
  eventData: Record<string, EventData>;
  focus: string[];
};

function log(...args: unknown[]): void {
  console.log(new Date().toISOString(), ...args);
}

function banner(msg: string): void {
  const line = "=".repeat(Math.min(60, msg.length + 4));
  console.log(`\n${line}\n  ${msg}\n${line}\n`);
}

/** .env simples (sem dependência) — só se existir. */
function loadEnvFile(): void {
  try {
    const p = path.join(process.cwd(), ".env");
    if (!fs.existsSync(p)) return;
    for (const rawLine of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = rawLine.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
}

class CaptureWorker {
  readonly state: LiveWorkerState = {
    paired: false,
    pairingCode: null,
    cycles: 0,
    activeEvents: 0,
    samples: 0,
    lastEvent: null,
    status: "—",
    updatedAt: Date.now(),
    events: [],
    eventData: {},
    focus: [],
  };

  private readonly session: MyLapTimeLiveSession;
  private staleStreak = 0;
  private stopping = false;
  private repairRequested = false;

  constructor(private readonly config: LiveConfig) {
    this.session = new MyLapTimeLiveSession(config);
  }

  private dataDir(): string {
    return path.join(process.cwd(), this.config.dataDir);
  }

  private persist(data: EventData): void {
    try {
      fs.mkdirSync(this.dataDir(), { recursive: true });
      const file = path.join(this.dataDir(), `snapshots-${new Date().toISOString().slice(0, 10)}.jsonl`);
      fs.appendFileSync(file, `${JSON.stringify({ at: Date.now(), data })}\n`);
    } catch {
      /* ignore */
    }
  }

  /** Alimenta a API do app (POST /api/timing) no contrato dele: { eventId, snapshot }. */
  private async ingest(eventId: string, snapshot: TimingSnapshot): Promise<void> {
    if (!this.config.ingestUrl) return;
    try {
      await fetch(this.config.ingestUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, snapshot }),
      });
    } catch (e) {
      log("  ingest falhou:", (e as Error).message);
    }
  }

  private setFocus = (ids: string[]): void => {
    this.state.focus = ids.map(String);
    log("foco atualizado (capturando):", this.state.focus.join(", ") || "(nenhum — selecione na tela Eventos)");
    this.state.updatedAt = Date.now();
  };

  // pedido de RE-PAREAMENTO (botão na página de status). O loop atende no próximo ciclo:
  // volta ao modo pareamento e expõe um código/QR novo em :PORT pra escanear no app.
  private requestRepair = (): void => {
    this.repairRequested = true;
    log("re-pareamento SOLICITADO — vai expor um código novo no próximo ciclo.");
    this.state.updatedAt = Date.now();
  };

  /** Roda o fluxo de pareamento (mostra código/QR até detectar o board) e salva o token. */
  private async pairFlow(): Promise<boolean> {
    this.state.paired = false;
    this.state.pairingCode = null;
    this.state.status = "AGUARDANDO PAREAMENTO";
    this.state.updatedAt = Date.now();
    banner(
      "PAREAMENTO — abra o app MyLapTime (Carreira) e escaneie/cole o código" +
        (this.config.port ? ` · ou abra http://localhost:${this.config.port}` : ""),
    );
    const paired = await this.session.waitForPairing((code) => {
      banner(`CÓDIGO DE PAREAMENTO: ${code}`);
      this.state.pairingCode = code;
      this.state.updatedAt = Date.now();
      try {
        fs.mkdirSync(this.dataDir(), { recursive: true });
        fs.writeFileSync(path.join(this.dataDir(), this.config.pairingCodeFile), `${code}\n`);
      } catch {
        /* ignore */
      }
    });
    if (paired) {
      this.state.paired = true;
      this.state.pairingCode = null;
      this.state.status = "ok";
      this.state.updatedAt = Date.now();
    }
    return paired;
  }

  private async refreshIndex(): Promise<void> {
    try {
      this.state.events = indexFromLive(await this.session.listEvents(), this.state.events);
      this.state.updatedAt = Date.now();
    } catch {
      /* ignore */
    }
  }

  private async healthCheck(): Promise<void> {
    const health = await this.session.connectionHealth();
    if (health.reconnecting) {
      this.staleStreak++;
      log("  conexão: RECONECTANDO…");
      await this.session.tryReconnect();
    } else {
      this.staleStreak = 0;
    }
    this.state.status = health.reconnecting ? "RECONECTANDO" : "ok";
    this.state.updatedAt = Date.now();
    if (this.staleStreak >= 5) {
      banner("ATENÇÃO: circuito instável. Pode ser necessário re-parear/reiniciar o worker.");
    }
  }

  private async cycle(): Promise<void> {
    const live = await this.session.listEvents();
    this.state.events = indexFromLive(live, this.state.events);

    const selected = selectForCapture(live, {
      focus: this.state.focus,
      eventFilter: this.config.eventFilter,
      priorityTracks: this.config.priorityTracks,
    });
    const events = orderEvents(selected, {
      priorityTracks: this.config.priorityTracks,
      maxPerCycle: this.config.maxEventsPerCycle,
    });

    const focusNote = this.state.focus.length
      ? ` [foco: ${this.state.focus.join(", ")}]`
      : this.config.eventFilter.length
        ? ` [filtro: ${this.config.eventFilter.join(", ")}]`
        : " [sem foco — selecione na tela Eventos]";
    log(`ciclo: ${live.length} online · capturando ${events.length}${focusNote}`);
    this.state.cycles++;
    this.state.activeEvents = events.length;
    this.state.updatedAt = Date.now();

    for (const ev of events) {
      const res = await this.session
        .captureEvent(ev.index, {
          expandLaps: this.config.captureLaps,
          cleanMeta: { name: ev.name, track: ev.track, type: ev.type },
        })
        .catch(() => null);
      if (!res) {
        log(`  [${ev.index}] ${ev.track} — falhou ao abrir`);
        continue;
      }
      const data = toEventData(res.meta, res.snapshot, res.laps);
      this.persist(data);
      this.state.samples++;

      const id = eventId(res.meta.track ?? ev.track, res.meta.name ?? ev.name);
      await this.ingest(id, res.snapshot); // alimenta a UI do app (se ENDURO_INGEST_URL setado)
      this.state.eventData[id] = data;
      const enrich: Partial<EventIndexRow> = {
        karts: data.drivers.length,
        laps: data.drivers.reduce((m, d) => Math.max(m, d.lapCount || 0), 0),
        flag: res.snapshot.flag,
        capturedAt: Date.now(),
        dataUrl: `/events/${id}`,
      };
      const row = this.state.events.find((x) => x.id === id);
      if (row) Object.assign(row, enrich);
      else this.state.events.push({ id, name: res.meta.name ?? ev.name, track: res.meta.track ?? ev.track, live: true, ...enrich });

      this.state.lastEvent = `${res.meta.track ?? ev.track} · ${res.meta.name ?? ev.name}`;
      this.state.updatedAt = Date.now();
      log(`  [${ev.index}] ${this.state.lastEvent} · ${data.drivers.length} karts`);
      await this.session.page.waitForTimeout(this.config.betweenEventsMs);
    }

    await this.healthCheck();
  }

  async run(): Promise<void> {
    banner("EnduroKart · Captura mylaptime");
    log("Prioridade:", this.config.priorityTracks.join(", ") || "(nenhuma)", "| laps:", this.config.captureLaps);

    await this.session.launch();

    if (this.config.port) {
      startStatusServer(this.config.port, {
        getState: () => this.state,
        getQrPng: () => this.session.screenshotQR(),
        setFocus: this.setFocus,
        requestRepair: this.requestRepair,
      });
    }

    // lista os eventos online (gate-free) 1× antes do pareamento (não dá pra navegar durante ele).
    await this.refreshIndex();
    log(
      `eventos online agora: ${this.state.events.length}` +
        (this.state.events.length ? ` — ${this.state.events.map((e) => e.name).join(" | ")}` : ""),
    );

    if (!(await this.pairFlow())) {
      banner("Não pareado a tempo. Encerrando. (Ajuste PAIRING_WAIT_MS e rode de novo.)");
      await this.session.close();
      process.exit(1);
    }
    banner("Pareado. Iniciando captura contínua. Ctrl+C para parar.");

    const stop = async (): Promise<void> => {
      if (this.stopping) return;
      this.stopping = true;
      log("encerrando…");
      await this.session.close();
      process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);

    while (!this.stopping) {
      // RE-PAREAMENTO (manual via /repair, ou auto quando o pareamento cai): volta a expor
      // um código/QR até re-parear, sem derrubar o worker.
      if (this.repairRequested) {
        this.repairRequested = false;
        banner("RE-PAREAMENTO em andamento — escaneie o novo código no app MyLapTime.");
        await this.pairFlow();
        banner("Re-pareado. Retomando captura.");
        continue;
      }
      const t0 = Date.now();
      try {
        await this.cycle();
      } catch (e) {
        log("erro no ciclo:", (e as Error).message);
      }
      // auto-detecção: se um código de pareamento voltou a aparecer, o token caiu → re-parear.
      if (!this.repairRequested) {
        const code = await this.session.readPairingCode().catch(() => null);
        if (code) {
          log("pareamento perdido (código reapareceu) — entrando em re-pareamento automático.");
          this.repairRequested = true;
        }
      }
      const wait = Math.max(0, this.config.listRefreshMs - (Date.now() - t0));
      if (wait && !this.repairRequested) await this.session.page.waitForTimeout(wait);
    }
  }
}

export async function runWorker(): Promise<void> {
  loadEnvFile();
  const worker = new CaptureWorker(loadConfig());
  await worker.run();
}
