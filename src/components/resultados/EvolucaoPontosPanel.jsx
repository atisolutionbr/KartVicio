import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ChevronDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Paleta de cores inspirada na logo do KartVicio (navy + gold)
const KARTVICIO_COLORS = [
  "#fbbf24", // gold (primário)
  "#0a1628", // navy (primário)
  "#f59e0b", // gold dark
  "#1e3a5c", // navy light
  "#3b82f6", // blue light
  "#d97706", // amber
  "#1e3a8a", // blue
  "#60a5fa", // blue 400
  "#92400e", // brown
  "#fde68a", // gold light
  "#1e40af", // blue 800
  "#eab308", // yellow 500
];

export default function EvolucaoPontosPanel({ resultados, etapas, campeonatoNome }) {
  const [aberto, setAberto] = useState(false);
  const [pilotosSelecionados, setPilotosSelecionados] = useState(null);

  const { chartData, pilotos, pilotosExibidos } = useMemo(() => {
    const etapasOrdenadas = [...etapas].sort((a, b) => a.numero_etapa - b.numero_etapa);

    // Pontos por piloto por etapa
    const pontosPorEtapa = {};
    etapasOrdenadas.forEach(etapa => {
      const resEtapa = resultados.filter(r => r.etapa_id === etapa.id && !r.descartado);
      resEtapa.forEach(r => {
        if (!pontosPorEtapa[r.piloto_nome]) pontosPorEtapa[r.piloto_nome] = {};
        pontosPorEtapa[r.piloto_nome][etapa.numero_etapa] = r.pontos_totais || 0;
      });
    });

    const nomes = Object.keys(pontosPorEtapa);
    const totais = nomes.map(nome => ({
      nome,
      total: Object.values(pontosPorEtapa[nome]).reduce((s, v) => s + v, 0),
    })).sort((a, b) => b.total - a.total);

    const top = totais.slice(0, 8).map(p => p.nome);
    const exibidos = pilotosSelecionados ?? top;

    // Monta dados acumulados por etapa
    const data = etapasOrdenadas.map(etapa => {
      const ponto = { etapa: `${etapa.numero_etapa}ª` };
      exibidos.forEach(nome => {
        ponto[nome] = etapasOrdenadas
          .filter(e => e.numero_etapa <= etapa.numero_etapa)
          .reduce((sum, e) => sum + (pontosPorEtapa[nome]?.[e.numero_etapa] || 0), 0);
      });
      return ponto;
    });

    return { chartData: data, pilotos: totais, pilotosExibidos: exibidos };
  }, [resultados, etapas, pilotosSelecionados]);

  const togglePiloto = (nome) => {
    const atual = pilotosSelecionados ?? pilotos.slice(0, 8).map(p => p.nome);
    if (atual.includes(nome)) {
      if (atual.length > 1) setPilotosSelecionados(atual.filter(p => p !== nome));
    } else {
      setPilotosSelecionados([...atual, nome]);
    }
  };

  if (chartData.length === 0) return null;

  return (
    <Card className="shadow-lg border-2 border-yellow-400/40">
      <CardHeader
        className="copa-gradient-navy text-white cursor-pointer select-none"
        onClick={() => setAberto(!aberto)}
      >
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            Evolução da Pontuação por Etapa
          </span>
          <div className="flex items-center gap-2 text-sm font-normal text-yellow-200">
            {campeonatoNome && <span className="hidden sm:inline">{campeonatoNome}</span>}
            <ChevronDown className={`w-5 h-5 transition-transform ${aberto ? "rotate-180" : ""}`} />
          </div>
        </CardTitle>
      </CardHeader>
      {aberto && (
        <CardContent className="p-4 sm:p-6">
          {/* Seletor de pilotos */}
          <div className="mb-4">
            <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-2">
              Pilotos (clique para ativar/desativar):
            </p>
            <div className="flex flex-wrap gap-2">
              {pilotos.map((p, index) => {
                const ativo = pilotosExibidos.includes(p.nome);
                const cor = KARTVICIO_COLORS[index % KARTVICIO_COLORS.length];
                return (
                  <button
                    key={p.nome}
                    onClick={() => togglePiloto(p.nome)}
                    className="px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border-2 transition-all"
                    style={
                      ativo
                        ? { backgroundColor: cor, borderColor: cor, color: index % 2 === 0 ? "#0a1628" : "#fff" }
                        : { backgroundColor: "#fff", borderColor: "#e5e7eb", color: "#9ca3af" }
                    }
                  >
                    {p.nome}
                  </button>
                );
              })}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="etapa" tick={{ fontSize: 13, fontWeight: 600, fill: "#0a1628" }} />
              <YAxis tick={{ fontSize: 12, fill: "#475569" }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #fbbf24", backgroundColor: "#fffbeb" }}
                formatter={(value, name) => [`${value} pts`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {pilotosExibidos.map((nome) => {
                const idx = pilotos.findIndex(p => p.nome === nome);
                return (
                  <Line
                    key={nome}
                    type="monotone"
                    dataKey={nome}
                    stroke={KARTVICIO_COLORS[idx % KARTVICIO_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      )}
    </Card>
  );
}