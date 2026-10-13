import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Crown, Trophy, Medal, TrendingUp } from "lucide-react";
import ComparadorEvolucaoChart from "@/components/simulador/ComparadorEvolucaoChart";
import PilotoCombobox from "./PilotoCombobox";

const CORES = [
  { text: "text-blue-700", badge: "bg-blue-200 text-blue-900", light: "bg-blue-50" },
  { text: "text-red-700", badge: "bg-red-200 text-red-900", light: "bg-red-50" },
];

export default function CompararPilotosPanel({ pilotoAtual, pilotos, campeonatos, todosResultados, todasEtapas }) {
  const [pilotoComparar, setPilotoComparar] = useState("");
  const [campeonatoChave, setCampeonatoChave] = useState("");

  // Campeonatos + anos onde ambos os pilotos têm resultados
  const chavesComuns = useMemo(() => {
    if (!pilotoComparar) return [];
    const chavesAtual = new Set();
    const chavesComparar = new Set();
    todosResultados.forEach(r => {
      const etapa = todasEtapas.find(e => e.id === r.etapa_id);
      if (!etapa?.ano || !r.campeonato_id) return;
      const chave = `${r.campeonato_id}__${etapa.ano}`;
      if (r.piloto_nome === pilotoAtual) chavesAtual.add(chave);
      if (r.piloto_nome === pilotoComparar) chavesComparar.add(chave);
    });
    const comuns = [...chavesAtual].filter(c => chavesComparar.has(c));
    // ordenar por ano desc
    return comuns.sort((a, b) => {
      const [, aAno] = a.split('__');
      const [, bAno] = b.split('__');
      return parseInt(bAno) - parseInt(aAno);
    });
  }, [pilotoAtual, pilotoComparar, todosResultados, todasEtapas]);

  useEffect(() => {
    if (chavesComuns.length > 0 && !chavesComuns.includes(campeonatoChave)) {
      setCampeonatoChave(chavesComuns[0]);
    }
  }, [chavesComuns]);

  const dadosComparacao = useMemo(() => {
    if (!pilotoComparar || !campeonatoChave) return null;
    const [campId, anoStr] = campeonatoChave.split('__');
    const ano = parseInt(anoStr);

    const etapasCamp = todasEtapas
      .filter(e => e.campeonato_id === campId && e.ano === ano)
      .sort((a, b) => (a.numero_etapa || 0) - (b.numero_etapa || 0));

    const camp = campeonatos.find(c => c.id === campId);

    const getResultosPiloto = (nome) => {
      const res = todosResultados.filter(r =>
        r.piloto_nome === nome && r.campeonato_id === campId &&
        etapasCamp.some(e => e.id === r.etapa_id) && !r.descartado
      );
      let acumulado = 0;
      const porEtapa = etapasCamp.map(etapa => {
        const r = res.find(x => x.etapa_id === etapa.id);
        if (r) acumulado += r.pontos_totais || 0;
        return { etapa, resultado: r || null, pontosCumulativos: r ? acumulado : null };
      });
      const total = res.reduce((s, r) => s + (r.pontos_totais || 0), 0);
      const media = res.length > 0 ? (total / res.length).toFixed(1) : "—";
      const vitorias = res.filter(r => r.posicao === 1).length;
      const podios = res.filter(r => r.posicao <= 3).length;
      return { nome, porEtapa, totalPontos: total, media, vitorias, podios, etapasDisputadas: res.length };
    };

    return {
      camp,
      ano,
      etapasCamp,
      pilotos: [getResultosPiloto(pilotoAtual), getResultosPiloto(pilotoComparar)],
    };
  }, [pilotoAtual, pilotoComparar, campeonatoChave, todosResultados, todasEtapas, campeonatos]);

  const pilotosDisponiveis = pilotos.filter(p => p.nome !== pilotoAtual);

  const getPosIcon = (pos) => {
    if (pos === 1) return <Crown className="w-3.5 h-3.5 text-yellow-500" />;
    if (pos === 2) return <Trophy className="w-3.5 h-3.5 text-gray-400" />;
    if (pos === 3) return <Medal className="w-3.5 h-3.5 text-orange-500" />;
    return null;
  };

  return (
    <Card className="border-2 border-purple-300 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-800 to-purple-700 text-white py-3 px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-5 h-5 text-purple-200" />
          Comparar Pilotos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Seleção do segundo piloto */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className={`text-xs font-bold mb-1 ${CORES[0].text}`}>Piloto 1 (atual)</label>
            <div className="flex items-center h-9 sm:h-10 px-3 border rounded-md bg-blue-50 text-sm font-medium text-blue-900">
              {pilotoAtual}
            </div>
          </div>
          <div className="flex-1">
            <label className={`text-xs font-bold mb-1 ${CORES[1].text}`}>Piloto 2 (selecionar)</label>
            <PilotoCombobox
              pilotos={pilotosDisponiveis}
              value={pilotoComparar}
              onChange={setPilotoComparar}
              placeholder="Buscar piloto para comparar..."
            />
          </div>
        </div>

        {!pilotoComparar && (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Selecione outro piloto para iniciar a comparação</p>
          </div>
        )}

        {pilotoComparar && chavesComuns.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Estes pilotos não participaram do mesmo campeonato.</p>
          </div>
        )}

        {pilotoComparar && chavesComuns.length > 0 && dadosComparacao && (
          <>
            {/* Seletor de campeonato */}
            {chavesComuns.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Campeonato:</label>
                <Select value={campeonatoChave} onValueChange={setCampeonatoChave}>
                  <SelectTrigger className="flex-1 text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chavesComuns.map(chave => {
                      const [cId, aNo] = chave.split('__');
                      const c = campeonatos.find(x => x.id === cId);
                      return (
                        <SelectItem key={chave} value={chave}>
                          {c?.nome || '—'} ({aNo})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {chavesComuns.length === 1 && dadosComparacao.camp && (
              <p className="text-sm text-gray-600">
                <Trophy className="w-4 h-4 inline mr-1 text-yellow-500" />
                {dadosComparacao.camp.nome} — {dadosComparacao.ano}
              </p>
            )}

            {/* Gráfico de evolução */}
            <ComparadorEvolucaoChart dados={dadosComparacao.pilotos} etapasOrdenadas={dadosComparacao.etapasCamp} />

            {/* Resumo: total de pontos e média/etapa */}
            <div className="grid grid-cols-2 gap-3">
              {dadosComparacao.pilotos.map((d, idx) => d && (
                <div key={idx} className={`p-4 rounded-xl border-2 ${CORES[idx].light} ${idx === 0 ? 'border-blue-300' : 'border-red-300'}`}>
                  <p className={`text-sm font-bold truncate mb-2 ${CORES[idx].text}`}>{d.nome}</p>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{d.totalPontos}</p>
                      <p className="text-xs text-gray-500">Total de pontos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{d.media}</p>
                      <p className="text-xs text-gray-500">Média/etapa</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200 flex justify-center gap-3 text-xs text-gray-500">
                    <span>{d.vitorias} vitória(s)</span>
                    <span>{d.podios} pódio(s)</span>
                    <span>{d.etapasDisputadas} etapa(s)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela comparativa etapa a etapa */}
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="text-center text-xs font-bold py-2 w-16">Etapa</TableHead>
                    {dadosComparacao.pilotos.map((d, idx) => d && (
                      <React.Fragment key={idx}>
                        <TableHead className={`text-center text-xs font-bold py-2 ${CORES[idx].text}`}>Pos</TableHead>
                        <TableHead className={`text-center text-xs font-bold py-2 ${CORES[idx].text}`}>Pts</TableHead>
                        <TableHead className={`text-center text-xs font-bold py-2 ${CORES[idx].text}`}>Acum.</TableHead>
                      </React.Fragment>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosComparacao.etapasCamp.map(etapa => {
                    const porPiloto = dadosComparacao.pilotos.map(d => d ? d.porEtapa.find(x => x.etapa.id === etapa.id) : null);
                    const ptsValidos = porPiloto.map(e => e?.resultado?.pontos_totais ?? null).filter(v => v !== null);
                    const melhorPts = ptsValidos.length > 1 ? Math.max(...ptsValidos) : null;
                    return (
                      <TableRow key={etapa.id} className="hover:bg-purple-50">
                        <TableCell className="text-center py-1.5">
                          <Badge variant="outline" className="text-xs font-bold">{etapa.numero_etapa}ª</Badge>
                        </TableCell>
                        {dadosComparacao.pilotos.map((d, idx) => {
                          if (!d) return null;
                          const e = porPiloto[idx];
                          const pts = e?.resultado?.pontos_totais ?? null;
                          const destaque = melhorPts !== null && pts === melhorPts;
                          return (
                            <React.Fragment key={idx}>
                              <TableCell className="text-center py-1.5">
                                {e?.resultado ? (
                                  <div className="flex items-center justify-center gap-0.5">
                                    {getPosIcon(e.resultado.posicao)}
                                    <span className={`text-xs font-semibold ${CORES[idx].text}`}>{e.resultado.posicao}º</span>
                                  </div>
                                ) : <span className="text-gray-300 text-xs">—</span>}
                              </TableCell>
                              <TableCell className="text-center py-1.5">
                                {pts !== null ? (
                                  <Badge className={`text-xs ${destaque ? CORES[idx].badge : "bg-gray-100 text-gray-600"}`}>
                                    {pts}
                                  </Badge>
                                ) : <span className="text-gray-300 text-xs">—</span>}
                              </TableCell>
                              <TableCell className="text-center py-1.5">
                                <span className={`text-xs font-medium ${CORES[idx].text}`}>{e?.pontosCumulativos ?? "—"}</span>
                              </TableCell>
                            </React.Fragment>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Placar de etapas vencidas */}
            {(() => {
              const wins = dadosComparacao.pilotos.map(() => 0);
              dadosComparacao.etapasCamp.forEach(etapa => {
                const ptsPorPiloto = dadosComparacao.pilotos.map(d => d ? (d.porEtapa.find(x => x.etapa.id === etapa.id)?.resultado?.pontos_totais ?? null) : null);
                const validos = ptsPorPiloto.filter(v => v !== null);
                if (validos.length < 2) return;
                const max = Math.max(...validos);
                const vencedores = ptsPorPiloto.map((v, i) => (v === max ? i : -1)).filter(i => i !== -1);
                if (vencedores.length === 1) wins[vencedores[0]]++;
              });
              return (
                <div className="flex items-center justify-center gap-6 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  {dadosComparacao.pilotos.map((d, idx) => d && (
                    <div key={idx} className="text-center">
                      <p className={`text-xs font-medium mb-1 ${CORES[idx].text} truncate max-w-[150px]`}>{d.nome}</p>
                      <p className={`text-3xl font-black ${CORES[idx].text}`}>{wins[idx]}</p>
                    </div>
                  ))}
                  <span className="text-xs text-gray-500 font-medium">etapas vencidas</span>
                </div>
              );
            })()}
          </>
        )}
      </CardContent>
    </Card>
  );
}