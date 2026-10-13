import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

export default function EvolucaoPilotoChart({ resultados, etapas }) {
  let acumulado = 0;
  const data = resultados.map(r => {
    const etapa = etapas.find(e => e.id === r.etapa_id);
    acumulado += r.pontos_totais || 0;
    return { etapa: etapa ? `${etapa.numero_etapa}ª` : "?", pontos: acumulado };
  });

  if (data.length < 2) return null;

  return (
    <div className="px-5 pt-3 pb-1 bg-blue-50 border-b border-blue-100">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
        <span className="text-xs font-semibold text-blue-700">Evolução de Pontos Acumulados</span>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
          <XAxis dataKey="etapa" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => [`${v} pts`, "Acumulado"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Line type="monotone" dataKey="pontos" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}