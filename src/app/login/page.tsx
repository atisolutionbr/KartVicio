"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flag, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/app-url";

/*
 * Tela de acesso — porta de entrada do projeto (senha compartilhada). O middleware
 * redireciona pra cá quando não há sessão; ao entrar, volta pra rota de origem (?from).
 */
function LoginForm() {
  const router = useRouter();
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
        body: JSON.stringify({ user, password }),
      });
      if (response.ok) {
        router.replace(from);
        router.refresh();
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
    <main className="flex min-h-screen items-center justify-center bg-[#0b1220] px-4 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
            <Flag className="h-6 w-6" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Enduro</div>
          <h1 className="mt-1 text-2xl font-bold">Race Control</h1>
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
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-md border border-white/15 bg-[#0b1220] pl-9 pr-3 text-sm text-white outline-none ring-sky-500 focus:ring-2"
                placeholder="••••••••"
              />
            </span>
          </label>

          {error && (
            <p className="mt-3 rounded-md border-l-2 border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <Button type="submit" disabled={!hydrated || loading || password.length === 0} className="mt-4 w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">FDK 100 Milhas Endurance · Jardim Camburi</p>
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
