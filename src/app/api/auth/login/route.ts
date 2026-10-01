import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, getCredentials, tokenFor } from "@/lib/auth";

const attempts = new Map<string, { count: number; until: number }>();
/* POST { user, password } → valida contra APP_USER/APP_PASSWORD e seta o cookie de sessao. */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "local";
  const now = Date.now();
  const attempt = attempts.get(ip);
  if (attempt && attempt.until > now && attempt.count >= 10) return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429, headers: { "Retry-After": String(Math.ceil((attempt.until-now)/1000)) } });
  const { user, password } = getCredentials();

  let body: { user?: string; password?: string };
  try {
    body = (await request.json()) as { user?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
  }

  if (typeof body.user!=="string" || body.user.trim() !== user || typeof body.password!=="string" || body.password !== password) {
    if (attempts.size > 5000) { for (const [key, value] of attempts) if(value.until <= now) attempts.delete(key); }
    attempts.set(ip, { count: attempt && attempt.until > now ? attempt.count + 1 : 1, until: attempt && attempt.until > now ? attempt.until : now + 900000 });
    return NextResponse.json({ error: "Usuario ou senha incorretos." }, { status: 401 });
  }

  attempts.delete(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: await tokenFor(user, password),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.AUTH_SECURE_COOKIES === "true",
    path: process.env.NEXT_PUBLIC_BASE_PATH || "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  return response;
}
