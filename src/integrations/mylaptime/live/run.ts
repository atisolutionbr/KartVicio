import { runWorker } from "./worker";

/*
 * Entrada CLI do worker de captura. Rode com: npm run capture
 * (usa tsx; veja o README nesta pasta).
 */
runWorker().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
