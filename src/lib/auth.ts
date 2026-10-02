/*
 * Gate de acesso por usuario + senha compartilhados (mantém o projeto fora do público).
 * O cookie NÃO guarda as credenciais — guarda um token derivado (SHA-256), que o middleware
 * recalcula e compara. Usa Web Crypto (funciona no Edge middleware e nas rotas).
 *
 * Credenciais padrão (por enquanto): admin / kart123. Sobrescreva com APP_USER e APP_PASSWORD
 * no ambiente do deploy.
 */
export const AUTH_COOKIE = "enduro_auth";

export function getCredentials(): { user: string; password: string } {
  if(process.env.NODE_ENV==="production"&&!process.env.APP_PASSWORD)throw new Error("Configure APP_PASSWORD antes de executar em produção.");
  return {
    user: (process.env.APP_USER ?? "admin").trim(),
    password: process.env.APP_PASSWORD ?? "kart123",
  };
}

/** token determinístico a partir das credenciais (hex do SHA-256). */
export async function tokenFor(user: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`enduro:${user}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** token esperado a partir das credenciais configuradas. */
export function expectedToken(): Promise<string> {
  const { user, password } = getCredentials();
  return tokenFor(user, password);
}
