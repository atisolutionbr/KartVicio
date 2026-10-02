"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/app-url";

/*
 * Tela de acesso — porta de entrada do projeto (senha compartilhada). O middleware
 * redireciona pra cá quando não há sessão; ao entrar, volta pra rota de origem (?from).
 */
function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setHydrated(true), 0); return () => clearTimeout(timer); }, []);
  const params = useSearchParams();
  const requested = params.get("from") || "/";
  const from = requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\") ? requested : "/";
  const [user, setUser] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(appUrl("/api/auth/login"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ user, password }),
      });
      if (response.ok) {
        window.location.replace(appUrl(from));
        return;
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Nao foi possivel entrar.");
    } catch {
      setError("Falha de conexao. Tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100dvh/0.7)] items-center justify-center bg-[#0b1220] px-4 py-8 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Image src={appUrl("/icons/kart-vicio-logo.jpeg")} alt="Kart Vício" width={240} height={240} priority unoptimized className="mx-auto mb-5 rounded-2xl" />
          <h1 className="mt-1 text-2xl font-bold">Entrar no Kart Vício</h1>
          <p className="mt-2 text-sm text-slate-400">Acesso restrito a equipe. Informe a senha.</p>
        </div>

        <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-5 shadow-xl">
          <label className="grid gap-1.5 text-sm font-medium text-slate-200">
            Usuario
            <span className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                disabled={!hydrated}
                type="text"
                autoComplete="username"
                name="username"
                autoCapitalize="none"
                spellCheck={false}
                value={user}
                onChange={(event) => setUser(event.target.value)}
                className="h-11 w-full rounded-md border border-white/15 bg-[#0b1220] pl-9 pr-3 text-sm text-white outline-none ring-sky-500 focus:ring-2"
                placeholder="admin"
              />
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-200">
            Senha de acesso
            <span className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                disabled={!hydrated}
                type={showPassword ? "text" : "password"}
                autoFocus
                autoComplete="current-password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-md border border-white/15 bg-[#0b1220] pl-9 pr-14 text-sm text-white outline-none ring-sky-500 focus:ring-2"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} className="absolute right-1 top-0 flex h-full w-12 items-center justify-center text-slate-400">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-3 rounded-md border-l-2 border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <Button type="submit" disabled={!hydrated || loading || password.length === 0} className="mt-4 w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">Kart é paixão, vício é pura adrenalina.</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
