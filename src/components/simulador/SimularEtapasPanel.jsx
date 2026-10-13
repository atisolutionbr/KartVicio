import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, RotateCcw, ChevronDown, ChevronUp, Info } from "lucide-react";

/**
 * Painel para simular posições das etapas faltantes (não finalizadas).
 * O usuário escolhe uma etapa futura e atribui posições previstas aos pilotos.
 * O ranking projetado é calculado somando os resultados reais + simulados.
 */
export default function SimularEtapasPanel({
  resultadosReais,
  etapas,
  pilotos,
  tabelaMap,
  penalidadesPorChave,
  computarPontosFn,
  rankingAtual,
}) {
  const [etapasSimuladas, setEtapasSimuladas] = useState({});
  // etapasSimuladas: { [etapaId]: { [pilotoNome]: posicao } }
  const [expandedo, setExpandedo] = useState(true);

  const etapasFaltantes = useMemo(() =>
    etapas.filter(e => !e.finalizada && !resultadosReais.some(r => r.etapa_id === e.id)),
    [etapas, resultadosReais]
  );

  const todasEtapasParaSimular = useMemo(() =>
    etapas.filter(e => !e.finalizada),
    [etapas]
  );

  const setPosicaoSimulada = (etapaId, pilotoNome, posicao) => {
    setEtapasSimuladas(prev => {
      const next = { ...prev };
      if (!next[etapaId]) next[etapaId] = {};
      const pos = parseInt(posicao);
      if (!pos || pos < 1) {
        delete next[etapaId][pilotoNome];
      } else {
        next[etapaId][pilotoNome] = pos;
      }
      return next;
    });
  };

  const limparSimulacao = (etapaId) => {
    setEtapasSimuladas(prev => {
      const next = { ...prev };
      delete next[etapaId];
      return next;
    });
  };

  // Construir resultados simulados a partir das posições previstas
  const resultadosSimulados = useMemo(() => {
    const sim = [];
    Object.entries(etapasSimuladas).forEach(([etapaId, pilotosPos]) => {
      const etapaInfo = etapas.find(e => e.id === etapaId);
      if (!etapaInfo || etapaInfo.finalizada) return;
      Object.entries(pilotosPos).forEach(([pilotoNome, posicao]) => {
        if (!pilotos.some(p => (p.nome || p) === pilotoNome)) return;
        const resultadoFake = {
          piloto_nome: pilotoNome,
          etapa_id: etapaId,
          posicao,
          status: "regular",
          pontos_melhor_volta: 0,
          tipos_ponto_aplicados: [],
        };
        const calculado = computarPontosFn(resultadoFake, etapaInfo, tabelaMap, penalidadesPorChave);
        sim.push({ ...resultadoFake, ...calculado, _simulado: true });
      });
    });
    return sim;
  }, [etapasSimuladas, etapas, pilotos, tabelaMap, penalidadesPorChave, computarPontosFn]);

  // Ranking projetado = resultados reais + simulados
  const rankingProjetado = useMemo(() => {
    const todos = [...resultadosReais.filter(r => !r.descartado), ...resultadosSimulados];
    const ranking = {};
    todos.forEach(r => {
      if (!ranking[r.piloto_nome]) {
        ranking[r.piloto_nome] = {
          piloto: r.piloto_nome,
          categoria: r.categoria || "",
          pontos_totais: 0,
          pontos_penalidades: 0,
          etapas_disputadas: 0,
          etapas_simuladas: 0,
        };
      }
      ranking[r.piloto_nome].pontos_totais += r.pontos_totais || 0;
      ranking[r.piloto_nome].pontos_penalidades += r.pontos_penalidade || 0;
      ranking[r.piloto_nome].etapas_disputadas += 1;
      if (r._simulado) ranking[r.piloto_nome].etapas_simuladas += 1;
    });
    return Object.values(ranking)
      .sort((a, b) => b.pontos_totais - a.pontos_totais)
      .map((item, i) => ({ ...item, posicao: i + 1 }));
  }, [resultadosReais, resultadosSimulados]);

  const temSimulacao = resultadosSimulados.length > 0;

  // Encontrar mudança de posição entre ranking atual e projetado
  const posicaoAtualMap = useMemo(() => {
    const m = {};
    rankingAtual.forEach((r, i) => { m[r.piloto] = i + 1; });
    return m;
  }, [rankingAtual]);

  return (
    <Card className="shadow-lg border-2 border-yellow-400/50 overflow-hidden rounded-2xl">
      <CardHeader
        className="py-3 px-4 cursor-pointer"
        style={{ background: "linear-gradient(135deg, #0a1628 0%, #1e3a5c 100%)" }}
        onClick={() => setExpandedo(!expandedo)}
      >
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-yellow-400" />
            <span className="text-sm sm:text-base font-bold">Simular Etapas Faltantes</span>
          </div>
          {expandedo ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </CardTitle>
      </CardHeader>

      {expandedo && (
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Atribua posições previstas para cada piloto nas etapas que ainda não foram realizadas.
              O ranking projetado aparece abaixo, combinando resultados reais + simulados.
            </p>
          </div>

          {todasEtapasParaSimular.length === 0 && (
            <p className="text-center text-gray-500 py-6 text-sm">Todas as etapas já foram finalizadas. Nada para simular.</p>
          )}

          {todasEtapasParaSimular.map(etapa => {
            const simulacao = etapasSimuladas[etapa.id] || {};
            const numPilotosSimulados = Object.keys(simulacao).length;
            const data = etapa.data_hora ? new Date(etapa.data_hora).toLocaleDateString("pt-BR") : "";
            return (
              <div key={etapa.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#0a1628] text-white font-bold">{etapa.numero_etapa}ª Etapa</Badge>
                    <span className="text-sm text-gray-600">{etapa.local || "Local a definir"}{data && ` · ${data}`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {numPilotosSimulados > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800 font-bold text-xs">
                        {numPilotosSimulados} piloto(s)
                      </Badge>
                    )}
                    {numPilotosSimulados > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => limparSimulacao(etapa.id)}
                        className="h-7 text-xs text-red-600 hover:bg-red-50"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Limpar
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-3 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {pilotos.map(p => (
                      <div key={p.nome || p} className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700 truncate flex-1">{p.nome || p}</span>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          placeholder="—"
                          value={simulacao[p.nome || p] || ""}
                          onChange={e => setPosicaoSimulada(etapa.id, p.nome || p, e.target.value)}
                          className="w-14 h-8 text-center text-sm font-bold border border-gray-300 rounded-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {temSimulacao && (
            <div className="border-2 border-yellow-400/50 rounded-xl overflow-hidden">
              <div className="bg-yellow-50 px-3 py-2 border-b border-yellow-200">
                <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-yellow-600" />
                  Ranking Projetado (Real + Simulado)
                </h3>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-center font-bold text-gray-700 p-2 w-12">#</th>
                      <th className="text-left font-bold text-gray-700 p-2">Piloto</th>
                      <th className="text-center font-bold text-gray-700 p-2 hidden sm:table-cell">Trend</th>
                      <th className="text-center font-bold text-gray-700 p-2">Pts</th>
                      <th className="text-center font-bold text-gray-700 p-2 hidden sm:table-cell">Sim.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingProjetado.map(item => {
                      const posAtual = posicaoAtualMap[item.piloto] || 999;
                      const diff = posAtual - item.posicao;
                      return (
                        <tr key={item.piloto} className={`border-b border-gray-100 ${item.posicao <= 3 ? "bg-yellow-50" : "bg-white"}`}>
                          <td className="text-center font-bold p-2">
                            {item.posicao <= 3 && (
                              <span className={item.posicao === 1 ? "text-yellow-500" : item.posicao === 2 ? "text-gray-400" : "text-orange-500"}>
                                {item.posicao === 1 ? "👑" : item.posicao === 2 ? "🥈" : "🥉"}
                              </span>
                            )}
                            {" "}{item.posicao}º
                          </td>
                          <td className="p-2 font-semibold text-gray-900">{item.piloto}</td>
                          <td className="text-center p-2 hidden sm:table-cell">
                            {diff > 0 ? (
                              <span className="text-green-600 font-bold text-xs flex items-center justify-center gap-0.5">
                                <ChevronUp className="w-3 h-3" />{diff}
                              </span>
                            ) : diff < 0 ? (
                              <span className="text-red-600 font-bold text-xs flex items-center justify-center gap-0.5">
                                <ChevronDown className="w-3 h-3" />{Math.abs(diff)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="text-center font-extrabold p-2 text-base">{item.pontos_totais}</td>
                          <td className="text-center p-2 hidden sm:table-cell">
                            {item.etapas_simuladas > 0 ? (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs font-bold">+{item.etapas_simuladas}</Badge>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}