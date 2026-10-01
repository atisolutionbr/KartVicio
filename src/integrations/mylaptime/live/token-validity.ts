import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "./config";
import { MyLapTimeLiveSession } from "./session";

/*
 * TESTE DE VALIDADE DO TOKEN DE PAREAMENTO.
 * A cada execução: cria um perfil de navegador ZERADO, injeta o section_access_token salvo e
 * verifica se consegue ABRIR UM BOARD (= token ainda vale) ou se cai no pareamento (= expirou).
 * Registra em data/token-validity.log. Agende (cron/loop) pra descobrir se/quando expira.
 *
 *   npx tsx src/integrations/mylaptime/live/token-validity.ts
 *
 * Portado do EnduroKartTeam (tools/token-validity.js).
 */

async function main(): Promise<number> {
  const dataDir = path.join(process.cwd(), "data");
  const tokenFile = path.join(dataDir, "section-token.txt");
  const token =
    (process.env.SECTION_ACCESS_TOKEN ?? "").trim() ||
    (() => {
      try {
        return fs.readFileSync(tokenFile, "utf8").trim();
      } catch {
        return "";
      }
    })();

  const record = (paired: boolean | null, note?: string): void => {
    const status = paired === null ? "INCONCLUSIVO" : paired ? "SIM" : "NAO";
    const line = `${new Date().toISOString()} · token=${(token || "—").slice(0, 8)} · paired=${status}${note ? ` · ${note}` : ""}`;
    console.log(line);
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.appendFileSync(path.join(dataDir, "token-validity.log"), `${line}\n`);
    } catch {
      /* ignore */
    }
  };

  if (!token) {
    record(false, "sem token (pareie 1x)");
    return 2;
  }

  // perfil ZERADO por execução → qualquer "pareado" vem do TOKEN, não de perfil salvo.
  const fresh = path.join(os.tmpdir(), `ek-token-test-${Date.now()}`);
  const config = loadConfig({
    ...process.env,
    USER_DATA_DIR: fresh,
    HEADLESS: process.env.HEADLESS ?? "true",
    BROWSER_CHANNEL: process.env.BROWSER_CHANNEL ?? "chrome",
    PORT: "0",
    SECTION_ACCESS_TOKEN: token,
  });

  const session = new MyLapTimeLiveSession(config);
  let exit = 3;
  try {
    await session.launch();
    const events = await session.listEvents().catch(() => []);
    if (!events.length) {
      record(null, "sem eventos online p/ testar");
      exit = 4;
    } else {
      let paired = false;
      let sawCode = false;
      for (let i = 0; i < 4 && !paired; i++) {
        if (await session.openEventByIndex(0).catch(() => false)) {
          paired = true;
          break;
        }
        const code = await session.readPairingCode().catch(() => null);
        if (code) {
          sawCode = true;
          break;
        }
        await session.page.waitForTimeout(3000);
      }
      record(paired, paired ? "board acessível" : sawCode ? "pediu pareamento (token expirado?)" : "board não abriu");
      exit = paired ? 0 : 1;
    }
  } catch (e) {
    record(false, `erro: ${String((e as Error).message ?? e).slice(0, 50)}`);
  } finally {
    await session.close().catch(() => {});
    try {
      fs.rmSync(fresh, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  return exit;
}

main().then((code) => process.exit(code));
