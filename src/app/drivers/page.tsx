"use client";

import { useMemo, useState } from "react";
import { Gauge, Pencil, Plus, Search, ShieldCheck, Trash2, UserRound, Weight, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type DriverProfile } from "@/features/drivers/mock-drivers";
import { useRaceDrivers } from "@/features/drivers/use-race-drivers";
import { useRace } from "@/features/race-control/race-context";

const emptyDriver = (): DriverProfile => ({
  id: crypto.randomUUID(), name: "", rating: 7, weightKg: 80, ballastKg: 20,
  preferredRole: "balanced", preferredStint: "any", pressureReady: false,
  active: true, notes: "", stintCount: 0, totalTimeMs: 0,
});

export default function DriversPage() {
  const {race}=useRace();
  const minimumWeight=race?.config.minimumWeightKg??100;
  const [drivers, setDrivers] = useRaceDrivers();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<DriverProfile | null>(null);
  const filteredDrivers = useMemo(() => drivers.filter((driver) =>
    driver.name.toLowerCase().includes(query.trim().toLowerCase()),
  ), [drivers, query]);
  const activeDrivers = drivers.filter((driver) => driver.active !== false);
  const readyDrivers = activeDrivers.filter((driver) => driver.weightKg + driver.ballastKg >= minimumWeight);

  const saveDriver = (driver: DriverProfile) => {
    setDrivers((current) => current.some((candidate) => candidate.id === driver.id)
      ? current.map((candidate) => candidate.id === driver.id ? driver : candidate)
      : [...current, driver]);
    setEditing(null);
  };

  return (
    <AppShell active="/drivers">
      <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
          <header className="flex flex-col gap-3 border-b border-border pb-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant="info">Escalacao</Badge>
                <Badge variant={activeDrivers.length > 0 ? "ok" : "warning"}>{activeDrivers.length} ativos</Badge>
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">Pilotos</h1>
              <p className="mt-1 text-sm text-muted-foreground">Peso, lastro, ritmo e disponibilidade para montar os stints.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar piloto" className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2 sm:w-72" />
              </label>
              <Button onClick={() => setEditing(emptyDriver())}><Plus className="h-4 w-4" />Novo piloto</Button>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Summary icon={<UserRound />} label="Ativos" value={`${activeDrivers.length}`} />
            <Summary icon={<Weight />} label="Peso regular" value={`${readyDrivers.length}/${activeDrivers.length}`} />
            <Summary icon={<ShieldCheck />} label="Pressao" value={activeDrivers.filter((driver) => driver.pressureReady).length.toString()} />
            <Summary icon={<Gauge />} label="Nota media" value={(activeDrivers.reduce((sum, driver) => sum + (driver.rating ?? 0), 0) / Math.max(1, activeDrivers.length)).toFixed(1)} />
          </section>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[920px] border-collapse text-sm">
                <thead className="border-b border-border bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-3">Piloto</th><th>Perfil</th><th>Nota</th><th>Peso</th><th>Lastro</th><th>Total</th><th>Stint ideal</th><th>Historico</th><th className="px-4 text-right">Acoes</th></tr>
                </thead>
                <tbody>{filteredDrivers.map((driver) => {
                  const totalWeight = driver.weightKg + driver.ballastKg;
                  return (
                    <tr key={driver.id} className="border-b border-border/70 transition-colors hover:bg-secondary/35">
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-semibold">{initials(driver.name)}</span><div><div className="font-semibold">{driver.name || "Sem nome"}</div><div className="mt-0.5 flex gap-1"><Badge variant={driver.active === false ? "outline" : "ok"}>{driver.active === false ? "Inativo" : "Ativo"}</Badge>{driver.pressureReady && <Badge variant="info">Pressao</Badge>}</div></div></div></td>
                      <td><Badge variant={profileBadge(driver.preferredRole)}>{profileLabel(driver.preferredRole)}</Badge></td>
                      <td className="font-semibold">{driver.rating ?? "--"}</td><td>{driver.weightKg} kg</td><td>{driver.ballastKg} kg</td>
                      <td><Badge variant={totalWeight >= minimumWeight ? "ok" : "critical"}>{totalWeight} kg</Badge></td><td>{stintLabel(driver.preferredStint)}</td>
                      <td><div>{driver.stintCount} stint(s)</div><div className="text-xs text-muted-foreground">Melhor {formatLap(driver.bestLapMs)}</div></td>
                      <td className="px-4"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label={`Editar ${driver.name}`} onClick={() => setEditing({ ...driver })}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`Remover ${driver.name}`} onClick={() => { if (window.confirm(`Remover ${driver.name}?`)) setDrivers((current) => current.filter((candidate) => candidate.id !== driver.id)); }}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></td>
                    </tr>
                  );
                })}</tbody>
              </table>
              {filteredDrivers.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">Nenhum piloto encontrado.</div>}
            </CardContent>
          </Card>
        </div>
      </main>
      {editing && <DriverEditor driver={editing} onCancel={() => setEditing(null)} onSave={saveDriver} />}
    </AppShell>
  );
}

function DriverEditor({ driver, onCancel, onSave }: { driver: DriverProfile; onCancel: () => void; onSave: (driver: DriverProfile) => void }) {
  const {race}=useRace();
  const minimumWeight=race?.config.minimumWeightKg??100;
  const [draft, setDraft] = useState(driver);
  const totalWeight = draft.weightKg + draft.ballastKg;
  const valid = draft.name.trim().length >= 2 && draft.weightKg > 0 && draft.ballastKg >= 0;
  const set = <K extends keyof DriverProfile>(key: K, value: DriverProfile[K]) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35" role="dialog" aria-modal="true" aria-label="Editar piloto">
      <button className="flex-1 cursor-default" onClick={onCancel} aria-label="Fechar editor" />
      <div className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-background shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4"><div><div className="text-xs font-semibold uppercase text-sky-700">Cadastro</div><h2 className="text-xl font-bold">{driver.name ? "Editar piloto" : "Novo piloto"}</h2></div><Button size="icon" variant="ghost" onClick={onCancel} aria-label="Fechar"><X className="h-5 w-5" /></Button></header>
        <div className="grid gap-5 p-5">
          <section className="grid gap-3"><h3 className="text-sm font-semibold">Identificacao</h3><Field label="Nome completo" value={draft.name} onChange={(value) => set("name", value)} /><div className="grid grid-cols-2 gap-3"><NumberField label="Peso com equipamento" value={draft.weightKg} suffix="kg" onChange={(value) => set("weightKg", value)} /><NumberField label="Lastro planejado" value={draft.ballastKg} suffix="kg" onChange={(value) => set("ballastKg", value)} /></div><div className={`border-l-2 px-3 py-2 text-sm ${totalWeight >= minimumWeight ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-red-600 bg-red-50 text-red-900"}`}>Peso de prova: <strong>{totalWeight} kg</strong>{totalWeight < minimumWeight && ` · faltam ${minimumWeight - totalWeight} kg`}</div></section>
          <section className="grid gap-3 border-t border-border pt-5"><h3 className="text-sm font-semibold">Perfil estrategico</h3><NumberField label="Nota de desempenho" value={draft.rating ?? 7} min={1} max={10} onChange={(value) => set("rating", value)} /><SelectField label="Perfil" value={draft.preferredRole} onChange={(value) => set("preferredRole", value as DriverProfile["preferredRole"])} options={[["performance", "Performance"], ["balanced", "Equilibrado"], ["safe", "Seguro"]]} /><SelectField label="Stint preferido" value={draft.preferredStint ?? "any"} onChange={(value) => set("preferredStint", value as DriverProfile["preferredStint"])} options={[["any", "Qualquer"], ["opening", "Largada"], ["middle", "Meio da prova"], ["closing", "Final"]]} /><Toggle label="Preparado para stint de pressao" checked={draft.pressureReady ?? false} onChange={(value) => set("pressureReady", value)} /><Toggle label="Disponivel para esta prova" checked={draft.active !== false} onChange={(value) => set("active", value)} /></section>
          <section className="grid gap-3 border-t border-border pt-5"><h3 className="font-semibold">Limites individuais (padrão da prova se não definidos)</h3><Field label="Apelido" value={draft.nickname??""} onChange={v=>set("nickname",v)}/><Field label="Experiência" value={draft.experience??""} onChange={v=>set("experience",v)}/><NumberField label="Ordem prevista" value={draft.order??0} onChange={v=>set("order",v)}/><NumberField label="Tempo mínimo (min)" value={(draft.minimumMs??race?.config.driverMinimumMs??0)/60000} max={1440} onChange={v=>set("minimumMs",v*60000)}/><NumberField label="Tempo máximo (min)" value={(draft.maximumMs??race?.config.driverMaximumMs??0)/60000} max={1440} onChange={v=>set("maximumMs",v*60000)}/><NumberField label="Stints mínimos" value={draft.minimumStints??race?.config.driverMinimumStints??0} onChange={v=>set("minimumStints",v)}/><p className="text-xs text-muted-foreground">Peso mínimo da prova: {minimumWeight} kg. Ajuste peso e lastro antes da saída do box.</p></section>
          <section className="grid gap-2 border-t border-border pt-5"><label className="grid gap-1.5 text-sm font-medium">Observacoes<textarea value={draft.notes ?? ""} onChange={(event) => set("notes", event.target.value)} rows={4} className="resize-none rounded-md border border-border bg-card p-3 text-sm outline-none ring-ring focus:ring-2" placeholder="Restricoes, preferencias ou observacoes da equipe" /></label></section>
        </div>
        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background p-4"><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button disabled={!valid} onClick={() => onSave({ ...draft, name: draft.name.trim() })}>Salvar piloto</Button></footer>
      </div>
    </div>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <Card><CardContent className="flex items-center gap-3 p-4"><span className="text-sky-700">{icon}</span><div><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-bold">{value}</div></div></CardContent></Card>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid gap-1.5 text-sm font-medium">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none ring-ring focus:ring-2" /></label>; }
function NumberField({ label, value, onChange, suffix, min = 0, max = 200 }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; min?: number; max?: number }) { return <label className="grid gap-1.5 text-sm font-medium">{label}<span className="relative"><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-10 w-full rounded-md border border-border bg-card px-3 pr-10 text-sm outline-none ring-ring focus:ring-2" />{suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}</span></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label className="grid gap-1.5 text-sm font-medium">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-border bg-card px-3 text-sm">{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between gap-4 rounded-md border border-border p-3 text-sm font-medium"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-slate-900" /></label>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?"; }
function profileBadge(role: DriverProfile["preferredRole"]) { return role === "performance" ? "info" : role === "safe" ? "ok" : "secondary"; }
function profileLabel(role: DriverProfile["preferredRole"]) { return role === "performance" ? "Performance" : role === "safe" ? "Seguro" : "Equilibrado"; }
function stintLabel(stint?: DriverProfile["preferredStint"]) { return { opening: "Largada", middle: "Meio", closing: "Final", any: "Qualquer" }[stint ?? "any"]; }
function formatLap(ms?: number) { if (!ms) return "--"; return `${Math.floor(ms / 60_000)}:${((ms % 60_000) / 1_000).toFixed(3).padStart(6, "0")}`; }
