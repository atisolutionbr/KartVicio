import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Crown, Trophy, Medal } from "lucide-react";
import ComparadorEvolucaoChart from "./ComparadorEvolucaoChart";

const CORES = [
  { text: "text-blue-700", border: "border-blue-300", light: "bg-blue-50", badge: "bg-blue-200 text-blue-900" },
  { text: "text-red-700", border: "border-red-300", light: "bg-red-50", badge: "bg-red-200 text-red-900" },
  { text: "text-green-700", border: "border-green-300", light: "bg-green-50", badge: "bg-green-200 text-green-900" },
];

export default function ComparadorPilotos({ resultados, etapas }) {
  const [selecionados, setSelecionados] = useState(["", "", ""]);

  const pilotos = useMemo(() => [...new Set(resultados.map(r => r.piloto_nome))].sort(), [resultados]);
  const etapasOrdenadas = useMemo(() => [...etapas].sort((a, b) => a.numero_etapa - b.numero_etapa), [etapas]);

  const getDadosPiloto = (nome) => {
    if (!nome) return null;
    const resPiloto = resultados.filter(r => r.piloto_nome === nome && !r.descartado);
    let acumulado = 0;
    const porEtapa = etapasOrdenadas.map(etapa => {
      const res = resPiloto.find(r => r.etapa_id === etapa.id);
      if (res) acumulado += res.pontos_totais || 0;
      return { etapa, resultado: res || null, pontosCumulativos: res ? acumulado : null };
    });
    const totalPontos = resPiloto.reduce((s, r) => s + (r.pontos_totais || 0), 0);
    const vitorias = resPiloto.filter(r => r.posicao === 1).length;
    const podios = resPiloto.filter(r => r.posicao <= 3).length;
    const media = resPiloto.length ? (totalPontos / resPiloto.length).toFixed(1) : "—";
    return { nome, porEtapa, totalPontos, vitorias, podios, media, etapasDisputadas: resPiloto.length };
  };

  const dados = selecionados.map(getDadosPiloto);
  const qtdSelecionados = dados.filter(Boolean).length;

  const getPosIcon = (pos) => {
    if (pos === 1) return <Crown className="w-3.5 h-3.5 text-yellow-500" />;
    if (pos === 2) return <Trophy className="w-3.5 h-3.5 text-gray-400" />;
    if (pos === 3) return <Medal className="w-3.5 h-3.5 text-orange-500" />;
    return null;
  };

  const handleSelect = (idx, valor) => {
    setSelecionados(prev => prev.map((v, i) => (i === idx ? valor : (v === valor ? "" : v))));
  };

  return (
    <Card className="border-2 border-purple-200 shadow-md">
      <CardHeader className="bg-gradient-to-r from-purple-800 to-purple-700 text-white py-3 px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-5 h-5 text-purple-200" />
          Comparador de Pilotos (até 3)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Seleção */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
          {[0, 1, 2].map(idx => (
            <div key={idx}>
              <p className={`text-xs font-bold mb-1 ${CORES[idx].text}`}>Piloto {idx + 1}</p>
              <Select value={selecionados[idx]} onValueChange={(v) => handleSelect(idx, v)}>
                <SelectTrigger className={`${CORES[idx].border} ${CORES[idx].light} h-9 text-sm`}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {pilotos.filter(p => !selecionados.includes(p) || p === selecionados[idx]).map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {qtdSelecionados < 2 && (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Selecione pelo menos dois pilotos para comparar</p>
          </div>
        )}

        {qtdSelecionados >= 2 && (
          <>
            <ComparadorEvolucaoChart dados={dados} etapasOrdenadas={etapasOrdenadas} />

            {/* Sumário */}
            <div
              className="grid gap-3 mb-4 p-3 bg-gray-50 rounded-xl border"
              style={{ gridTemplateColumns: `repeat(${qtdSelecionados}, minmax(0,1fr))` }}
            >
              {dados.map((d, idx) => d && (
                <div key={idx} className="text-center">
                  <p className={`text-sm font-bold truncate mb-1 ${CORES[idx].text}`}>{d.nome}</p>
                  <p className="text-xs text-gray-500">{d.etapasDisputadas} etapas</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">{d.totalPontos} pts</p>
                  <p className="text-xs text-gray-500">{d.vitorias} vitórias · {d.podios} pódios · média {d.media}</p>
                </div>
              ))}
            </div>

            {/* Tabela comparativa */}
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="text-center text-xs font-bold py-2 w-16">Etapa</TableHead>
                    {dados.map((d, idx) => d && (
                      <React.Fragment key={idx}>
                        <TableHead className={`text-center text-xs font-bold py-2 ${CORES[idx].text}`}>Pos</TableHead>
                        <TableHead className={`text-center text-xs font-bold py-2 ${CORES[idx].text}`}>Pts</TableHead>
                        <TableHead className={`text-center text-xs font-bold py-2 ${CORES[idx].text}`}>Acum.</TableHead>
                      </React.Fragment>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {etapasOrdenadas.map(etapa => {
                    const porPiloto = dados.map(d => d ? d.porEtapa.find(x => x.etapa.id === etapa.id) : null);
                    const ptsValidos = porPiloto.map(e => e?.resultado?.pontos_totais ?? null).filter(v => v !== null);
                    const melhorPts = ptsValidos.length > 1 ? Math.max(...ptsValidos) : null;
                    return (
                      <TableRow key={etapa.id} className="hover:bg-purple-50">
                        <TableCell className="text-center py-1.5">
                          <Badge variant="outline" className="text-xs font-bold">{etapa.numero_etapa}ª</Badge>
                        </TableCell>
                        {dados.map((d, idx) => {
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

            {/* Placar final: etapas vencidas por cada piloto */}
            {(() => {
              const wins = dados.map(() => 0);
              etapasOrdenadas.forEach(etapa => {
                const ptsPorPiloto = dados.map(d => d ? (d.porEtapa.find(x => x.etapa.id === etapa.id)?.resultado?.pontos_totais ?? null) : null);
                const validos = ptsPorPiloto.filter(v => v !== null);
                if (validos.length < 2) return;
                const max = Math.max(...validos);
                const vencedores = ptsPorPiloto.map((v, i) => (v === max ? i : -1)).filter(i => i !== -1);
                if (vencedores.length === 1) wins[vencedores[0]]++;
              });
              return (
                <div className="mt-3 flex items-center justify-center gap-4 p-2 bg-purple-50 rounded-lg border border-purple-200 flex-wrap">
                  {dados.map((d, idx) => d && (
                    <span key={idx} className={`text-xl font-black ${CORES[idx].text}`}>{wins[idx]}</span>
                  ))}
                  <span className="text-xs text-gray-500 font-medium">etapas vencidas (na ordem dos pilotos selecionados)</span>
                </div>
              );
            })()}
          </>
        )}
      </CardContent>
    </Card>
  );
}