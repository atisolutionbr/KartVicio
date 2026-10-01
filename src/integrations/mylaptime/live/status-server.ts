import http from "node:http";
import type { LiveWorkerState } from "./worker";

/*
 * Servidor HTTP de status/pareamento (opcional, via config.port). Numa nuvem headless, abra
 * http://host:PORT: mostra o QR + código para parear e as estatísticas. Também serve o índice
 * de eventos e os dados por evento que o frontend consome. Portado de src/ingestor/status-server.js.
 */

export type StatusServerHooks = {
  getState: () => LiveWorkerState;
  getQrPng: () => Promise<Buffer | null>;
  setFocus: (ids: string[]) => void;
  requestRepair: () => void;
};

export function startStatusServer(port: number, hooks: StatusServerHooks): http.Server {
  const server = http.createServer(async (req, res) => {
    try {
      res.setHeader("Access-Control-Allow-Origin", "*"); // o frontend busca cross-origin
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "content-type");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // frontend manda o FOCO (eventos analisando + fixados): o worker captura só esses.
      if (req.method === "POST" && req.url === "/focus") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 1e5) req.destroy();
        });
        req.on("end", () => {
          let ids: string[] = [];
          try {
            const parsed = JSON.parse(body || "{}");
            ids = Array.isArray(parsed) ? parsed : (parsed.ids ?? []);
          } catch {
            ids = [];
          }
          hooks.setFocus(ids.map(String));
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: true, focus: hooks.getState().focus }));
        });
        return;
      }

      // re-pareamento sob demanda: volta o worker ao modo pareamento (novo código/QR).
      if (req.method === "POST" && req.url === "/repair") {
        hooks.requestRepair();
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (req.url === "/health") {
        const { eventData, ...light } = hooks.getState(); // eventData é pesado — fora do health
        void eventData;
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(light));
        return;
      }

      if (req.url === "/events") {
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        res.end(JSON.stringify(hooks.getState().events));
        return;
      }

      const evMatch = req.url?.match(/^\/events\/([^/?]+)/);
      if (evMatch) {
        const data = hooks.getState().eventData[decodeURIComponent(evMatch[1]!)];
        if (!data) {
          res.writeHead(404, { "content-type": "application/json" });
          res.end('{"error":"evento não capturado"}');
          return;
        }
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        res.end(JSON.stringify(data));
        return;
      }

      if (req.url?.startsWith("/qr.png")) {
        const png = await hooks.getQrPng().catch(() => null);
        if (!png) {
          res.writeHead(404);
          res.end("sem qr");
          return;
        }
        res.writeHead(200, { "content-type": "image/png", "cache-control": "no-store" });
        res.end(png);
        return;
      }

      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(renderStatusPage(hooks.getState()));
    } catch {
      res.writeHead(500);
      res.end("erro");
    }
  });
  server.listen(port, () => console.log(`[status] servidor em http://localhost:${port}`));
  server.on("error", (e) => console.log("[status] erro ao subir servidor:", e.message));
  return server;
}

function renderStatusPage(state: LiveWorkerState): string {
  const pairing = state.paired
    ? ""
    : `<p>Para capturar as voltas, pareie uma vez: no app <b>MyLapTime</b> → Carreira → câmera,
        escaneie o QR abaixo (ou cole o código).</p>
       <img src="/qr.png?t=${Date.now()}" alt="QR" style="width:280px;background:#fff;padding:8px;border-radius:10px"/>
       <p>Código: <code style="font-size:16px">${state.pairingCode ?? "…"}</code></p>`;
  const color = state.paired ? "#4ade80" : "#f5a623";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="refresh" content="5"><title>EnduroKart · Captura</title></head>
    <body style="font:15px system-ui,sans-serif;background:#0f1115;color:#e6e6e6;margin:0;padding:22px;max-width:560px">
    <h2 style="margin:.2em 0">🏁 EnduroKart · Captura ao vivo</h2>
    <p>Status: <b style="color:${color}">${state.paired ? "CAPTURANDO" : "AGUARDANDO PAREAMENTO"}</b>
       &nbsp;·&nbsp;conexão: ${state.status}</p>
    ${pairing}
    <table style="border-collapse:collapse;margin-top:14px">
      <tr><td style="padding:3px 12px 3px 0;color:#9aa4b2">ciclos</td><td>${state.cycles}</td></tr>
      <tr><td style="padding:3px 12px 3px 0;color:#9aa4b2">eventos ativos</td><td>${state.activeEvents}</td></tr>
      <tr><td style="padding:3px 12px 3px 0;color:#9aa4b2">snapshots gravados</td><td>${state.samples}</td></tr>
      <tr><td style="padding:3px 12px 3px 0;color:#9aa4b2">último evento</td><td>${state.lastEvent ?? "—"}</td></tr>
      <tr><td style="padding:3px 12px 3px 0;color:#9aa4b2">atualizado</td><td>${
        state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString("pt-BR") : "—"
      }</td></tr>
    </table>
    <div style="margin-top:18px;border-top:1px solid #23262e;padding-top:14px">
      <p style="color:#9aa4b2;font-size:13px;margin:0 0 8px">Precisou re-parear (ex.: token expirou)? Gera um código novo pra escanear no app.</p>
      <button id="repair" style="font:600 14px system-ui;padding:10px 16px;border:0;border-radius:9px;background:#f5a623;color:#111;cursor:pointer">Parear novamente</button>
      <span id="repair-msg" style="margin-left:10px;color:#9aa4b2;font-size:13px"></span>
    </div>
    <script>
      document.getElementById('repair').addEventListener('click', async function () {
        this.disabled = true;
        document.getElementById('repair-msg').textContent = 'solicitado — o código aparece em instantes…';
        try { await fetch('/repair', { method: 'POST' }); } catch (e) {}
        setTimeout(function () { location.reload(); }, 3000);
      });
    </script>
    </body></html>`;
}
