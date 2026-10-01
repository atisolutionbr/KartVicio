/*
 * Configuração do worker de captura ao vivo. Lê variáveis de ambiente com defaults
 * sensatos. Portado do EnduroKartTeam (src/ingestor/config.js).
 */

function bool(value: string | undefined, def: boolean): boolean {
  if (value == null || value === "") return def;
  return /^(1|true|yes|sim)$/i.test(value);
}

function num(value: string | undefined, def: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : def;
}

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export type LiveConfig = {
  headless: boolean;
  /** 'chrome' | 'msedge' para usar o navegador do sistema; vazio = Chromium do Playwright. */
  browserChannel: string;
  navTimeoutMs: number;
  listRefreshMs: number;
  betweenEventsMs: number;
  staleSeconds: number;
  pairingWaitMs: number;
  pairingCodeFile: string;
  captureLaps: boolean;
  maxEventsPerCycle: number;
  priorityTracks: string[];
  /** filtro estrito: se preenchido, captura só eventos cujo nome/pista casem (uso via CLI). */
  eventFilter: string[];
  /** porta do servidor de status/pareamento; 0 = desligado. */
  port: number;
  debug: boolean;
  dataDir: string;
  /** perfil persistente do navegador; vazio = <dataDir>/browser-profile. */
  userDataDir: string;
  /** token de pareamento "pra sempre"; vazio = lê de <dataDir>/section-token.txt. */
  sectionAccessToken: string;
  /** se setado, cada snapshot capturado também é enviado (POST) pra API do app (/api/timing). */
  ingestUrl: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): LiveConfig {
  return {
    headless: bool(env.HEADLESS, true),
    browserChannel: env.BROWSER_CHANNEL ?? "",
    navTimeoutMs: num(env.NAV_TIMEOUT_MS, 30_000),
    listRefreshMs: num(env.LIST_REFRESH_MS, 45_000),
    betweenEventsMs: num(env.BETWEEN_EVENTS_MS, 800),
    staleSeconds: num(env.STALE_SECONDS, 20),
    pairingWaitMs: num(env.PAIRING_WAIT_MS, 180_000),
    pairingCodeFile: env.PAIRING_CODE_FILE ?? "pairing-code.txt",
    captureLaps: bool(env.CAPTURE_LAPS, true),
    maxEventsPerCycle: num(env.MAX_EVENTS_PER_CYCLE, 0),
    priorityTracks: list(env.PRIORITY_TRACKS),
    eventFilter: list(env.EVENT_FILTER),
    port: num(env.PORT, 0),
    debug: bool(env.DEBUG, false),
    dataDir: env.DATA_DIR ?? "data",
    userDataDir: env.USER_DATA_DIR ?? "",
    sectionAccessToken: (env.SECTION_ACCESS_TOKEN ?? "").trim(),
    ingestUrl: (env.ENDURO_INGEST_URL ?? "").trim(),
  };
}
