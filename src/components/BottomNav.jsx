import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  BarChart3,
  Trophy,
  Calculator,
  AlertTriangle,
  CalendarDays,
  FileText,
  Menu,
  User as UserIcon,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const ALL_ITEMS = [
  { title: "Ranking", url: createPageUrl("Dashboard"), icon: BarChart3, roles: ["admin", "operador", "visualizador"] },
  { title: "Acompanhe", url: createPageUrl("CampeonatoPublico"), icon: Trophy, roles: ["admin", "operador", "visualizador"] },
  { title: "Resultados", url: createPageUrl("Resultados"), icon: Trophy, roles: ["admin", "operador"] },
  { title: "Penalidades", url: createPageUrl("Penalidades"), icon: AlertTriangle, roles: ["admin", "operador"] },
  { title: "Simulador", url: createPageUrl("Simulador"), icon: Calculator, roles: ["admin", "operador"] },
  { title: "Calendário", url: createPageUrl("Calendario"), icon: CalendarDays, roles: ["admin", "operador", "visualizador"] },
  { title: "Relatórios", url: createPageUrl("Relatorios"), icon: FileText, roles: ["admin", "operador", "visualizador"] },
  { title: "Perfil", url: createPageUrl("PerfilPiloto"), icon: UserIcon, roles: ["admin", "operador", "visualizador"] },
];

export default function BottomNav({ userPermissions }) {
  const location = useLocation();
  const { toggleSidebar } = useSidebar();

  const role = userPermissions?.permissao || "visualizador";
  const visible = ALL_ITEMS.filter((i) => i.roles.includes(role));
  const top = visible.slice(0, 4);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-yellow-400 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] safe-area-bottom">
      <div className="flex h-[calc(4rem/var(--app-scale))] items-stretch justify-around">
        {top.map((item) => {
          const active = location.pathname === item.url;
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.url}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[44px] transition-colors ${
                active ? "text-yellow-600" : "text-gray-500"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "text-yellow-500" : "text-gray-400"}`} />
              <span className={`text-[calc(0.625rem/var(--app-scale))] font-bold leading-none ${active ? "text-yellow-600" : "text-gray-500"}`}>
                {item.title}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => toggleSidebar()}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[44px] text-gray-500"
        >
          <Menu className="w-5 h-5 text-gray-400" />
          <span className="text-[calc(0.625rem/var(--app-scale))] font-bold leading-none text-gray-500">Mais</span>
        </button>
      </div>
    </nav>
  );
}