import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const CORES_LINHA = ["#2563eb", "#dc2626", "#16a34a"];

export default function ComparadorEvolucaoChart({ dados, etapasOrdenadas }) {
  const chartData = etapasOrdenadas.map(etapa => {
    const ponto = { etapa: `${etapa.numero_etapa}ª` };
    dados.forEach(d => {
      if (!d) return;
      const item = d.porEtapa.find(x => x.etapa.id === etapa.id);
      ponto[d.nome] = item ? item.pontosCumulativos : null;
    });
    return ponto;
  });

  return (
    <Card className="border-2 border-purple-200 shadow-md mt-4">
      <CardHeader className="bg-gradient-to-r from-purple-800 to-purple-700 text-white py-3 px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5 text-purple-200" />
          Evolução de Pontos Acumulados
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="etapa" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {dados.map((d, idx) => d && (
                <Line
                  key={d.nome}
                  type="monotone"
                  dataKey={d.nome}
                  stroke={CORES_LINHA[idx]}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}