import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
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

const COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6",
  "#f97316", "#06b6d4", "#ec4899", "#84cc16", "#6366f1",
  "#14b8a6", "#f43f5e", "#a855f7", "#0ea5e9", "#22c55e",
];

export default function EvolucaoPontosChart({ resultados, etapas, anoSelecionado }) {
  const [pilotosSelecionados, setPilotosSelecionados] = useState(null); // null = todos (top 8 padrão)

  const { chartData, pilotos, pilotosExibidos } = useMemo(() => {
    const etapasAno = etapas
      .filter(e => e.ano === anoSelecionado)
      .sort((a, b) => a.numero_etapa - b.numero_etapa);

    // Calcular pontos totais acumulados por piloto por etapa
    const pontosAcumulados = {};

    etapasAno.forEach(etapa => {
      const resultadosEtapa = resultados.filter(r => r.etapa_id === etapa.id);
      resultadosEtapa.forEach(r => {
        if (!pontosAcumulados[r.piloto_nome]) {
          pontosAcumulados[r.piloto_nome] = {};
        }
        pontosAcumulados[r.piloto_nome][etapa.numero_etapa] = r.pontos_totais || 0;
      });
    });

    const todosOsPilotos = Object.keys(pontosAcumulados);

    // Calcular total por piloto para ordenar e definir top 8
    const totalPorPiloto = todosOsPilotos.map(nome => ({
      nome,
      total: Object.values(pontosAcumulados[nome]).reduce((s, v) => s + v, 0)
    })).sort((a, b) => b.total - a.total);

    const topPilotos = totalPorPiloto.slice(0, 8).map(p => p.nome);
    const pilotosExibidos = pilotosSelecionados ?? topPilotos;

    // Montar dados do gráfico com pontos acumulados
    const chartData = etapasAno.map(etapa => {
      const ponto = { etapa: `${etapa.numero_etapa}ª` };
      pilotosExibidos.forEach(nome => {
        // Acumula pontos até esta etapa
        const acumulado = etapasAno
          .filter(e => e.numero_etapa <= etapa.numero_etapa)
          .reduce((sum, e) => sum + (pontosAcumulados[nome]?.[e.numero_etapa] || 0), 0);
        ponto[nome] = acumulado;
      });
      return ponto;
    });

    return { chartData, pilotos: totalPorPiloto, pilotosExibidos };
  }, [resultados, etapas, anoSelecionado, pilotosSelecionados]);

  const togglePiloto = (nome) => {
    const atual = pilotosSelecionados ?? pilotos.slice(0, 8).map(p => p.nome);
    if (atual.includes(nome)) {
      if (atual.length > 1) setPilotosSelecionados(atual.filter(p => p !== nome));
    } else {
      setPilotosSelecionados([...atual, nome]);
    }
  };

  if (chartData.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-800 text-white">
          <CardTitle className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6" />
            Evolução dos Pontos por Etapa
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 p-3 sm:p-6">
          <p className="text-center text-gray-500 py-8">Nenhum resultado registrado para {anoSelecionado}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-800 text-white">
        <CardTitle className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6" />
          Evolução dos Pontos Acumulados por Etapa — {anoSelecionado}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 p-3 sm:p-6">
        {/* Seletor de pilotos */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-600 mb-2">Filtrar pilotos (clique para ativar/desativar):</p>
          <div className="flex flex-wrap gap-2">
            {pilotos.map((p, index) => {
              const ativo = pilotosExibidos.includes(p.nome);
              return (
                <button
                  key={p.nome}
                  onClick={() => togglePiloto(p.nome)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold border-2 transition-all ${
                    ativo ? "text-white border-transparent" : "bg-white text-gray-400 border-gray-200"
                  }`}
                  style={ativo ? { backgroundColor: COLORS[index % COLORS.length], borderColor: COLORS[index % COLORS.length] } : {}}
                >
                  {p.nome}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-80 min-w-0 w-full sm:h-[380px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="etapa" tick={{ fontSize: 13, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(value, name) => [`${value} pts`, name]}
            />
            <Legend />
            {pilotosExibidos.map((nome, index) => (
              <Line
                key={nome}
                type="monotone"
                dataKey={nome}
                stroke={COLORS[pilotos.findIndex(p => p.nome === nome) % COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}