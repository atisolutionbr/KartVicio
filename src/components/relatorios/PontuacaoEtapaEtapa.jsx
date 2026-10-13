import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import PontuacaoPilotoCards from '@/components/relatorios/PontuacaoPilotoCards';

export default function PontuacaoEtapaEtapa({ resultados, etapas, penalidades, anoSelecionado }) {
  const { etapasOrdenadas, linhas } = useMemo(() => {
    const etapasAno = [...etapas]
      .filter(e => e.ano === anoSelecionado)
      .sort((a, b) => a.numero_etapa - b.numero_etapa);

    // Mapear resultados por piloto e etapa
    const porPiloto = {};
    resultados.forEach(res => {
      const etapa = etapasAno.find(e => e.id === res.etapa_id);
      if (!etapa) return;
      if (!porPiloto[res.piloto_nome]) porPiloto[res.piloto_nome] = {};
      porPiloto[res.piloto_nome][etapa.numero_etapa] = {
        pontos: res.pontos || 0,
        mv: res.pontos_melhor_volta || 0,
        penalidade: res.pontos_penalidade || 0,
        total: res.pontos_totais || 0,
        posicao: res.posicao || null,
      };
    });

    // Calcular total geral por piloto
    const pilotos = Object.keys(porPiloto).map(nome => {
      const totalGeral = etapasAno.reduce((sum, e) => {
        return sum + (porPiloto[nome][e.numero_etapa]?.total || 0);
      }, 0);
      return { nome, totalGeral };
    }).sort((a, b) => b.totalGeral - a.totalGeral);

    return { etapasOrdenadas: etapasAno, linhas: pilotos.map((p, idx) => ({ ...p, posicao: idx + 1, dados: porPiloto[p.nome] })) };
  }, [resultados, etapas, penalidades, anoSelecionado]);

  if (etapasOrdenadas.length === 0) return null;

  const posicaoBg = (pos) => {
    if (pos === 1) return "bg-yellow-50";
    if (pos === 2) return "bg-gray-50";
    if (pos === 3) return "bg-orange-50";
    return pos % 2 === 0 ? "bg-white" : "bg-slate-50";
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white">
        <CardTitle className="flex items-center gap-3">
          <Trophy className="w-6 h-6" />
          Pontuação Etapa por Etapa — {anoSelecionado}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 p-0">
        <PontuacaoPilotoCards linhas={linhas} etapas={etapasOrdenadas} ano={anoSelecionado} />
        <div className="hidden min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain md:block" tabIndex={0} role="region" aria-label="Pontuação por piloto e etapa">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-indigo-50 border-b-2 border-indigo-200">
              <th className="text-left px-3 py-2 font-bold text-gray-700 sticky left-0 bg-indigo-50 z-10 min-w-[40px]">#</th>
              <th className="text-left px-3 py-2 font-bold text-gray-700 sticky left-10 bg-indigo-50 z-10 min-w-[160px]">Piloto</th>
              {etapasOrdenadas.map(e => (
                <th key={e.id} colSpan={4} className="text-center px-1 py-2 font-bold text-indigo-700 border-l border-indigo-200 min-w-[150px]">
                  {e.numero_etapa}ª Etapa
                </th>
              ))}
              <th className="text-center px-3 py-2 font-bold text-indigo-900 border-l-2 border-indigo-400 min-w-[80px]">Total</th>
            </tr>
            <tr className="bg-indigo-100/60 border-b border-indigo-200">
              <th className="sticky left-0 bg-indigo-100/60 z-10"></th>
              <th className="sticky left-10 bg-indigo-100/60 z-10"></th>
              {etapasOrdenadas.map(e => (
                <React.Fragment key={e.id}>
                  <th className="text-center px-1 py-1 text-xs text-blue-600 font-semibold border-l border-indigo-200">Pos</th>
                  <th className="text-center px-1 py-1 text-xs text-gray-500 font-semibold">Pts</th>
                  <th className="text-center px-1 py-1 text-xs text-purple-600 font-semibold">MV</th>
                  <th className="text-center px-1 py-1 text-xs text-red-500 font-semibold">Pen</th>
                </React.Fragment>
              ))}
              <th className="border-l-2 border-indigo-400"></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.nome} className={`border-b border-gray-100 hover:brightness-95 transition-all ${posicaoBg(linha.posicao)}`}>
                <td className={`px-3 py-2 font-bold text-center sticky left-0 z-10 ${posicaoBg(linha.posicao)}`}>
                  {linha.posicao === 1 ? "🥇" : linha.posicao === 2 ? "🥈" : linha.posicao === 3 ? "🥉" : linha.posicao}
                </td>
                <td className={`px-3 py-2 font-semibold text-gray-800 sticky left-10 z-10 ${posicaoBg(linha.posicao)}`}>
                  {linha.nome}
                </td>
                {etapasOrdenadas.map(e => {
                  const d = linha.dados[e.numero_etapa];
                  return (
                    <React.Fragment key={e.id}>
                      <td className="text-center px-1 py-2 border-l border-gray-100">
                        {d?.posicao ? <span className="font-bold text-blue-700">{d.posicao}º</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="text-center px-1 py-2">
                        {d ? <span className="font-semibold text-green-700">{d.pontos}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="text-center px-1 py-2">
                        {d?.mv > 0 ? <span className="text-purple-600 font-semibold">+{d.mv}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="text-center px-1 py-2">
                        {d?.penalidade > 0 ? <span className="text-red-500 font-semibold">-{d.penalidade}</span> : <span className="text-gray-300">—</span>}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="text-center px-3 py-2 border-l-2 border-indigo-200">
                  <span className="font-bold text-indigo-900 text-base">{linha.totalGeral}</span>
                </td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={2 + etapasOrdenadas.length * 4 + 1} className="text-center py-10 text-gray-400">
                  Nenhum resultado registrado para {anoSelecionado}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <div className="flex flex-wrap gap-4 px-4 py-3 bg-gray-50 border-t text-xs text-gray-500">
          <span><span className="font-bold text-blue-700">Pos</span> = Posição na etapa</span>
          <span><span className="font-bold text-green-700">Pts</span> = Pontos da posição</span>
          <span><span className="font-bold text-purple-600">MV</span> = Melhor volta</span>
          <span><span className="font-bold text-red-500">Pen</span> = Penalidade</span>
        </div>
      </CardContent>
    </Card>
  );
}