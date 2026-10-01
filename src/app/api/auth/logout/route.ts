import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

/* POST → encerra a sessao (apaga o cookie). */
export function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: AUTH_COOKIE, value: "", path: process.env.NEXT_PUBLIC_BASE_PATH || "/", maxAge: 0 });
  return response;
}
