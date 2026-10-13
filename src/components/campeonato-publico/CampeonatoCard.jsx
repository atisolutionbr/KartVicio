import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Users, CheckCircle2, Flag } from "lucide-react";
import CampeonatoLogo from "@/components/campeonatos/CampeonatoLogo";

export default function CampeonatoCard({ campeonato, totalEtapas, etapasFinalizadas, totalPilotos, onClick }) {
  const categoriasCount = campeonato.categorias?.length || 0;
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 border-0 shadow-md"
    >
      <CardContent className="p-4 h-full flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CampeonatoLogo campeonato={campeonato} size="md" />
          <span className="text-xs text-gray-400 font-semibold">{campeonato.ano}</span>
        </div>
        <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 text-sm">{campeonato.nome}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600 font-medium">
          {categoriasCount > 0 && (
            <span className="inline-flex items-center gap-0.5"><Flag className="w-3 h-3 text-gray-500" />{categoriasCount} cat.</span>
          )}
          <span className="inline-flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3 text-green-600" />{etapasFinalizadas ?? "—"} / {totalEtapas ?? "—"} etapas</span>
        </div>
        <div className="mt-auto flex items-center justify-between border-t pt-2">
          <span className="inline-flex items-center gap-1 text-xs text-gray-700 font-semibold">
            <Users className="w-3.5 h-3.5 text-blue-700" />
            {totalPilotos ?? "—"} pilotos
          </span>
          <span className="text-[10px] text-gray-400">Acompanhar →</span>
        </div>
      </CardContent>
    </Card>
  );
}