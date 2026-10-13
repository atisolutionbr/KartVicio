import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

export default function EtapasChart({ pontuacoes }) {
  const getEtapasData = () => {
    const etapas = {};
    
    pontuacoes.forEach(pontuacao => {
      const etapa = pontuacao.etapa;
      if (!etapas[etapa]) {
        etapas[etapa] = {
          etapa: `Etapa ${etapa}`,
          participantes: 0,
          pontos_total: 0
        };
      }
      etapas[etapa].participantes += 1;
      etapas[etapa].pontos_total += pontuacao.pontos || 0;
    });

    return Object.values(etapas).sort((a, b) => 
      parseInt(a.etapa.split(' ')[1]) - parseInt(b.etapa.split(' ')[1])
    );
  };

  const data = getEtapasData();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Participação por Etapa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis 
                dataKey="etapa" 
                stroke="#6366f1"
                fontSize={12}
              />
              <YAxis stroke="#6366f1" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1e3a8a',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Bar 
                dataKey="participantes" 
                fill="url(#goldGradient)" 
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.7}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}