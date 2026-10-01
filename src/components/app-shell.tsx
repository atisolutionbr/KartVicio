"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3, Flag, Gauge, LayoutDashboard, Radio, Settings2, Tablet, Timer, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";
import { useRace } from "@/features/race-control/race-context";

const navItems = [
  { href: "/", label: "Cockpit", icon: LayoutDashboard },
  { href: "/monitoring", label: "Monitoramento", icon: Radio },
  { href: "/strategy", label: "Estrategia", icon: Flag },
  { href: "/box", label: "Box", icon: Timer },
  { href: "/karts", label: "Karts", icon: Gauge },
  { href: "/setup", label: "Setup", icon: Settings2 },
  { href: "/drivers", label: "Pilotos", icon: UsersRound },
  { href: "/teams", label: "Equipes", icon: UsersRound },
  { href: "/stints", label: "Stints", icon: Timer },
  { href: "/history", label: "Historico", icon: Flag },
  { href: "/replay", label: "Replay / Simulacao", icon: Radio },
  { href: "/settings", label: "Parametros", icon: Settings2 },
  { href: "/command", label: "Command Center", icon: Gauge },
  { href: "/ipad", label: "iPad", icon: Tablet },
  { href: "/analysis", label: "Analise", icon: BarChart3 },
];

export function AppShell({
  children,
  active,
}: {
  children: ReactNode;
  active: string;
}) {
  const {race,error}=useRace();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border bg-[#111827] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
            Enduro
          </div>
          <div className="mt-1 text-xl font-bold">Race Control</div>
          <div className="mt-2 text-xs leading-5 text-slate-300">
            Estrategia de box, pilotos e ritmo para endurance.
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4 text-xs text-slate-300">
          <div className="font-semibold text-white">{race?.config.name??"Kart Vício"}</div>
          <div>{race?.teams.length??0} equipes / {race?.drivers.length??0} pilotos</div>
          <div>{race?.config.venue}</div>
          <LogoutButton />
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Enduro
              </div>
              <div className="font-bold">Race Control</div>
            </div>
            <div className="flex gap-1">
              {navItems.slice(0, 2).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md border border-border bg-card p-2",
                      active === item.href && "bg-primary text-primary-foreground",
                    )}
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-4 py-2 lg:hidden" aria-label="Navegação móvel">{navItems.map(item=><Link key={item.href} href={item.href} className={cn("whitespace-nowrap rounded-md border px-3 py-1.5 text-xs",active===item.href&&"bg-primary text-primary-foreground")}>{item.label}</Link>)}</nav>
        {error&&<div role="alert" className="bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>}
        {children}
      </div>
    </div>
  );
}
