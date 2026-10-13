import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trophy, Crown, Medal, Award, AlertTriangle, Zap, Star, TrendingUp, TrendingDown, Minus, User, Globe, Search, Undo, Trash2, Users } from "lucide-react";
import { filtrarCampeonatosAcessiveis, usuarioSemAcesso } from "@/utils/campeonatoAccess";
import SemAcessoCard from "@/components/SemAcessoCard";
import EvolucaoPilotoChart from "@/components/pilotos/EvolucaoPilotoChart";
import PilotoCombobox from "@/components/pilotos/PilotoCombobox";
import CompararPilotosPanel from "@/components/pilotos/CompararPilotosPanel";

const calcularDescartesEtapa = (resultadosPiloto, campeonato, totalEtapasRealizadas) => {
  if (!campeonato?.descarte_ativo) return { etapasDescartadas: [], descartesAutomaticos: 0 };
  const minEtapas = campeonato.descarte_min_etapas || 10;
  if (totalEtapasRealizadas < minEtapas) return { etapasDescartadas: [], descartesAutomaticos: 0 };
  const descarteQtd = campeonato.descarte_quantidade || 1;
  const etapasFaltantes = Math.max(0, totalEtapasRealizadas - resultadosPiloto.length);
  const descartesAutomaticos = Math.min(etapasFaltantes, descarteQtd);
  const descartesRestantes = descarteQtd - descartesAutomaticos;
  let etapasDescartadas = [];
  if (descartesRestantes > 0) {
    const candidatos = resultadosPiloto
      .filter(r => !r.pontos_penalidade || r.pontos_penalidade === 0)
      .sort((a, b) => a.pontos_totais - b.pontos_totais);
    etapasDescartadas = candidatos.slice(0, descartesRestantes).map(r => r.etapa_id);
  }
  return { etapasDescartadas, descartesAutomaticos };
};

const Piloto = base44.entities.Piloto;
const Campeonato = base44.entities.Campeonato;
const ResultadoEtapa = base44.entities.ResultadoEtapa;
const Penalidade = base44.entities.Penalidade;
const Etapa = base44.entities.Etapa;
const InscricaoPiloto = base44.entities.InscricaoPiloto;

export default function PerfilPilotoPage({ userPermissions }) {
  const [pilotos, setPilotos] = useState([]);
  const [campeonatos, setCampeonatos] = useState([]);
  const [pilotoSelecionado, setPilotoSelecionado] = useState("");
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [anoFiltro, setAnoFiltro] = useState("todos");
  const [comparando, setComparando] = useState(false);
  const [todosResultadosData, setTodosResultadosData] = useState([]);
  const [todasEtapasData, setTodasEtapasData] = useState([]);

  useEffect(() => {
    Promise.all([Piloto.list(), Campeonato.list("-ano"), InscricaoPiloto.list()]).then(([p, c, inscricoes]) => {
      const acessiveis = filtrarCampeonatosAcessiveis(c, userPermissions);
      setCampeonatos(acessiveis);
      // Usuário não-admin só pode ver/buscar pilotos inscritos em campeonatos aos quais tem acesso
      if (userPermissions?.permissao === 'admin') {
        setPilotos(p);
      } else {
        const idsAcessiveis = new Set(acessiveis.map(camp => camp.id));
        const nomesPermitidos = new Set(
          inscricoes.filter(i => idsAcessiveis.has(i.campeonato_id)).map(i => i.piloto_nome)
        );
        setPilotos(p.filter(pl => nomesPermitidos.has(pl.nome)));
      }
    });
  }, [userPermissions]);

  useEffect(() => {
    if (!pilotoSelecionado) { setDados(null); return; }
    carregarDados(pilotoSelecionado);
  }, [pilotoSelecionado]);

  const carregarDados = async (pilotoNome) => {
    setLoading(true);

    // Carregar TODOS os resultados (não só do piloto) para calcular rankings corretos
    const [todosResultados, todasPenalidades, todasEtapas] = await Promise.all([
      ResultadoEtapa.list(),
      Penalidade.list(),
      Etapa.list()
    ]);

    const resultadosPiloto = todosResultados.filter(r => r.piloto_nome === pilotoNome);
    const penalidadesPiloto = todasPenalidades.filter(p => p.piloto_nome === pilotoNome);

    const porCampeonato = {};

    // Gerar chaves únicas por campeonato + ano (um campeonato pode ter múltiplos anos)
    const chavesUnicas = new Set();
    todosResultados
      .filter(r => r.campeonato_id)
      .forEach(r => {
        const etapa = todasEtapas.find(e => e.id === r.etapa_id);
        if (etapa?.ano) chavesUnicas.add(`${r.campeonato_id}__${etapa.ano}`);
      });

    chavesUnicas.forEach(chave => {
      const [campId, anoStr] = chave.split('__');
      const ano = parseInt(anoStr);
      const camp = campeonatos.find(c => c.id === campId);
      if (!camp) return;

      // Etapas deste campeonato + ano
      const etapasCampAno = todasEtapas.filter(e => e.campeonato_id === campId && e.ano === ano);
      const etapaIdsCampAno = new Set(etapasCampAno.map(e => e.id));

      const ressCampTodos = resultadosPiloto.filter(r => r.campeonato_id === campId && etapaIdsCampAno.has(r.etapa_id));
      const ressCamp = ressCampTodos.filter(r => !r.descartado);
      if (ressCampTodos.length === 0) return;

      // Detectar categoria(s) do piloto neste campeonato
      const categoriasNoCamp = [...new Set(ressCamp.map(r => r.categoria).filter(Boolean))];

      const etapasFinalizadas = etapasCampAno.filter(e => e.finalizada);
      const pensCamp = penalidadesPiloto.filter(p => etapaIdsCampAno.has(p.etapa_id));

      const pontosTotais = ressCamp.reduce((sum, r) => sum + (r.pontos_totais || 0), 0);
      const vitorias = ressCamp.filter(r => r.posicao === 1).length;
      const podios = ressCamp.filter(r => r.posicao <= 3).length;
      const voltasRapidas = ressCamp.filter(r => (r.pontos_melhor_volta || 0) > 0).length;
      const totalPenalidades = pensCamp.length;
      const pontosPenalidades = pensCamp.reduce((sum, p) => sum + (p.pontos_penalidade || 0), 0);

      // Ranking REAL apenas deste campeonato + ano (geral)
      const rankingCamp = {};
      todosResultados
        .filter(r => r.campeonato_id === campId && etapaIdsCampAno.has(r.etapa_id) && !r.descartado)
        .forEach(r => {
          if (!rankingCamp[r.piloto_nome]) rankingCamp[r.piloto_nome] = 0;
          rankingCamp[r.piloto_nome] += r.pontos_totais || 0;
        });
      const sortedCamp = Object.entries(rankingCamp).sort((a, b) => b[1] - a[1]);
      const posicaoNoCampeonato = sortedCamp.findIndex(([nome]) => nome === pilotoNome) + 1;
      const totalPilotosCamp = sortedCamp.length;

      // Ranking por categoria (se o campeonato tiver categorias e o piloto tiver categoria)
      const rankingPorCategoria = {};
      if (categoriasNoCamp.length > 0) {
        categoriasNoCamp.forEach(cat => {
          const rankingCat = {};
          todosResultados
            .filter(r => r.campeonato_id === campId && etapaIdsCampAno.has(r.etapa_id) && !r.descartado && r.categoria === cat)
            .forEach(r => {
              if (!rankingCat[r.piloto_nome]) rankingCat[r.piloto_nome] = 0;
              rankingCat[r.piloto_nome] += r.pontos_totais || 0;
            });
          const sortedCat = Object.entries(rankingCat).sort((a, b) => b[1] - a[1]);
          rankingPorCategoria[cat] = {
            posicao: sortedCat.findIndex(([nome]) => nome === pilotoNome) + 1,
            total: sortedCat.length,
          };
        });
      }

      const melhorPosicao = ressCamp.reduce((best, r) => Math.min(best, r.posicao), 99);
      const piorPosicao = ressCamp.reduce((worst, r) => Math.max(worst, r.posicao), 0);

      // Descarte analisa somente etapas já FECHADAS (finalizada=true) — etapas em aberto não contam
      const etapaIdsFinalizadas = new Set(etapasFinalizadas.map(e => e.id));
      const ressCampFinalizadas = ressCamp.filter(r => etapaIdsFinalizadas.has(r.etapa_id));
      const { etapasDescartadas, descartesAutomaticos } = calcularDescartesEtapa(ressCampFinalizadas, camp, etapasFinalizadas.length);

      porCampeonato[chave] = {
        chave,
        campeonato: { ...camp, _ano: ano },
        ano,
        pontosTotais,
        etapasDisputadas: ressCamp.length,
        etapasTotal: etapasFinalizadas.length,
        vitorias,
        podios,
        voltasRapidas,
        totalPenalidades,
        pontosPenalidades,
        posicaoNoCampeonato,
        totalPilotosCamp,
        melhorPosicao,
        piorPosicao,
        mediaPontos: ressCamp.length > 0 ? (pontosTotais / ressCamp.length).toFixed(1) : 0,
        categoriasNoCamp,
        rankingPorCategoria,
        etapasDescartadas,
        descartesAutomaticos,
        resultados: ressCampTodos.sort((a, b) => {
          const ea = todasEtapas.find(e => e.id === a.etapa_id);
          const eb = todasEtapas.find(e => e.id === b.etapa_id);
          return (ea?.numero_etapa || 0) - (eb?.numero_etapa || 0);
        })
      };
    });

    // ——— Ranking Geral: somar pontos apenas dos campeonatos acessíveis ao usuário ———
    const idsCampeonatosAcessiveis = new Set(campeonatos.map(c => c.id));
    const isAdminUser = userPermissions?.permissao === 'admin';
    const rankingGeral = {};
    todosResultados
      .filter(r => !r.descartado && (isAdminUser || idsCampeonatosAcessiveis.has(r.campeonato_id)))
      .forEach(r => {
        if (!rankingGeral[r.piloto_nome]) rankingGeral[r.piloto_nome] = 0;
        rankingGeral[r.piloto_nome] += r.pontos_totais || 0;
      });
    const sortedGeral = Object.entries(rankingGeral).sort((a, b) => b[1] - a[1]);
    const posicaoGeral = sortedGeral.findIndex(([nome]) => nome === pilotoNome) + 1;
    const totalPilotosGeral = sortedGeral.length;
    const pontosGerais = rankingGeral[pilotoNome] || 0;

    const lista = Object.values(porCampeonato);
    const melhorCampeonato = lista.length > 0
      ? lista.reduce((best, curr) => curr.posicaoNoCampeonato < best.posicaoNoCampeonato ? curr : best)
      : null;

    setTodosResultadosData(todosResultados);
    setTodasEtapasData(todasEtapas);
    setDados({ porCampeonato, melhorCampeonato, etapas: todasEtapas, posicaoGeral, totalPilotosGeral, pontosGerais });
    setLoading(false);
  };

  const canEdit = userPermissions?.permissao === 'admin' || userPermissions?.permissao === 'operador';

  const handleDescartarManual = async (resultado) => {
    await ResultadoEtapa.update(resultado.id, { descartado: !resultado.descartado });
    carregarDados(pilotoSelecionado);
  };

  const listaCampeonatosAll = dados ? Object.values(dados.porCampeonato) : [];

  // Anos disponíveis para filtro
  const anosDisponiveis = useMemo(() => {
    const anos = [...new Set(listaCampeonatosAll.map(c => c.ano))].sort((a, b) => b - a);
    return anos;
  }, [listaCampeonatosAll]);

  const listaCampeonatos = anoFiltro === "todos"
    ? listaCampeonatosAll
    : listaCampeonatosAll.filter(c => c.ano === parseInt(anoFiltro));

  const getPosicaoIcon = (pos) => {
    if (pos === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (pos === 2) return <Trophy className="w-4 h-4 text-gray-400" />;
    if (pos === 3) return <Medal className="w-4 h-4 text-orange-500" />;
    return null;
  };

  // Indicador de variação de posição entre etapas consecutivas
  const getVariacaoPosicao = (resultadosOrdenados, idx) => {
    if (idx === 0) return null;
    const atual = resultadosOrdenados[idx]?.posicao;
    const anterior = resultadosOrdenados[idx - 1]?.posicao;
    if (!atual || !anterior) return null;
    const diff = anterior - atual; // positivo = subiu (posição menor é melhor)
    if (diff > 0) return { tipo: "subiu", diff, icon: <TrendingUp className="w-3 h-3 text-green-600" />, cor: "text-green-600" };
    if (diff < 0) return { tipo: "desceu", diff: Math.abs(diff), icon: <TrendingDown className="w-3 h-3 text-red-500" />, cor: "text-red-500" };
    return { tipo: "igual", diff: 0, icon: <Minus className="w-3 h-3 text-gray-400" />, cor: "text-gray-400" };
  };

  if (usuarioSemAcesso(userPermissions)) return <SemAcessoCard />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">👤 Perfil do Piloto</h1>
        <p className="text-sm sm:text-base text-gray-600">Desempenho e ranking por campeonato + ranking geral</p>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <User className="w-5 h-5 text-gray-500 hidden sm:block flex-shrink-0" />
            <div className="flex-1 w-full">
              <PilotoCombobox
                pilotos={pilotos}
                value={pilotoSelecionado}
                onChange={(v) => { setPilotoSelecionado(v); setAnoFiltro("todos"); setComparando(false); }}
                placeholder="Buscar e selecionar piloto..."
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {listaCampeonatosAll.length > 0 && (
                <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                  <SelectTrigger className="w-28 sm:w-32 text-sm h-9 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os anos</SelectItem>
                    {anosDisponiveis.map(a => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {pilotoSelecionado && (
                <Button
                  variant={comparando ? "default" : "outline"}
                  onClick={() => setComparando(!comparando)}
                  className="text-sm h-9 sm:h-10 whitespace-nowrap"
                >
                  <Users className="w-4 h-4 mr-1" />
                  {comparando ? "Fechar" : "Comparar"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {comparando && pilotoSelecionado && todosResultadosData.length > 0 && (
        <CompararPilotosPanel
          pilotoAtual={pilotoSelecionado}
          pilotos={pilotos}
          campeonatos={campeonatos}
          todosResultados={todosResultadosData}
          todasEtapas={todasEtapasData}
        />
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      )}

      {!loading && dados && listaCampeonatos.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum resultado encontrado para este piloto.</p>
          </CardContent>
        </Card>
      )}

      {!loading && dados && listaCampeonatos.length > 0 && (
        <>
          {/* Ranking Geral */}
          <Card className="border-2 border-blue-400 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-700 text-white py-3 px-5">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="w-5 h-5" />
                Ranking Geral — Todos os Campeonatos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-4xl font-bold text-blue-700">{dados.posicaoGeral}º</p>
                  <p className="text-sm text-gray-500 mt-1">Posição Geral</p>
                  <p className="text-xs text-gray-400">de {dados.totalPilotosGeral} pilotos</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-green-600">{dados.pontosGerais}</p>
                  <p className="text-sm text-gray-500 mt-1">Pontos Totais</p>
                  <p className="text-xs text-gray-400">todos campeonatos</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-yellow-600">{listaCampeonatos.length}</p>
                  <p className="text-sm text-gray-500 mt-1">Campeonatos</p>
                  <p className="text-xs text-gray-400">com participação</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Melhor Campeonato */}
          {dados.melhorCampeonato && (
            <Card className="border-2 border-yellow-400 shadow-xl">
              <CardHeader className="copa-gradient-gold text-white py-3 px-5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="w-5 h-5" />
                  Melhor Posição — {dados.melhorCampeonato.campeonato.nome} ({dados.melhorCampeonato.ano})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-yellow-600">{dados.melhorCampeonato.posicaoNoCampeonato}º</p>
                    <p className="text-sm text-gray-500">de {dados.melhorCampeonato.totalPilotosCamp}</p>
                    <p className="text-xs text-gray-400">Posição no Camp.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">{dados.melhorCampeonato.pontosTotais}</p>
                    <p className="text-xs text-gray-400">Pontos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{dados.melhorCampeonato.vitorias}</p>
                    <p className="text-xs text-gray-400">Vitórias</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-600">{dados.melhorCampeonato.podios}</p>
                    <p className="text-xs text-gray-400">Pódios</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumo por campeonato */}
          <Card className="shadow-lg">
            <CardHeader className="copa-gradient-navy text-white py-3 px-5">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Desempenho por Campeonato
                <span className="text-sm font-normal text-yellow-200 ml-auto">
                  {listaCampeonatos.length} resultado(s)
                  {anoFiltro !== "todos" ? ` — ${anoFiltro}` : " — Todos os anos"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold">Campeonato</TableHead>
                      <TableHead className="font-bold text-center">Categoria</TableHead>
                      <TableHead className="font-bold text-center">Posição no Camp.</TableHead>
                      <TableHead className="font-bold text-center">Pontos</TableHead>
                      <TableHead className="font-bold text-center">Média/Etapa</TableHead>
                      <TableHead className="font-bold text-center">Vitórias</TableHead>
                      <TableHead className="font-bold text-center">Pódios</TableHead>
                      <TableHead className="font-bold text-center">MV</TableHead>
                      <TableHead className="font-bold text-center">Penalidades</TableHead>
                      <TableHead className="font-bold text-center">Etapas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listaCampeonatos.sort((a, b) => b.ano - a.ano).map((item, idx) => (
                      <TableRow key={item.chave} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                        <TableCell className="font-semibold">
                          <div>{item.campeonato.nome}</div>
                          <div className="text-xs text-gray-400">{item.ano}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.categoriasNoCamp && item.categoriasNoCamp.length > 0 ? (
                            <div className="flex flex-col gap-1 items-center">
                              {item.categoriasNoCamp.map(cat => {
                                const catInfo = campeonatos.find(c => c.id === item.campeonato.id)?.categorias?.find(c => c.nome === cat);
                                const pos = item.rankingPorCategoria[cat];
                                return (
                                  <div key={cat} className="flex items-center gap-1">
                                    <span
                                      className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                                      style={{ backgroundColor: catInfo?.cor || "#6b7280" }}
                                    >{cat}</span>
                                    {pos && <span className="text-xs text-gray-500">{pos.posicao}º/{pos.total}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                           <div className="flex items-center justify-center gap-1">
                             {getPosicaoIcon(item.posicaoNoCampeonato)}
                             <span className="font-bold text-lg">{item.posicaoNoCampeonato}º</span>
                             <span className="text-xs text-gray-400">/{item.totalPilotosCamp}</span>
                             {item.chave === dados.melhorCampeonato?.chave && (
                               <Star className="w-4 h-4 text-yellow-400" />
                             )}
                           </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-100 text-green-800 font-bold">{item.pontosTotais} pts</Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">{item.mediaPontos}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-yellow-100 text-yellow-800">{item.vitorias}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-orange-100 text-orange-800">{item.podios}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-purple-100 text-purple-800">{item.voltasRapidas}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.totalPenalidades > 0 ? "destructive" : "outline"}>
                            {item.totalPenalidades} ({item.pontosPenalidades > 0 ? `-${item.pontosPenalidades}pts` : '0pts'})
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-medium">{item.etapasDisputadas}/{item.etapasTotal}</span>
                            {item.etapasTotal > 0 && (
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-blue-500"
                                  style={{ width: `${Math.round((item.etapasDisputadas / item.etapasTotal) * 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Detalhe etapa a etapa por campeonato */}
          {listaCampeonatos.sort((a, b) => b.ano - a.ano).map(item => (
            <Card key={item.chave} className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-700 text-white py-3 px-5">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  <TrendingUp className="w-4 h-4 text-yellow-300" />
                  {item.campeonato.nome} ({item.ano}) — Etapa por Etapa
                  <div className="ml-auto flex items-center gap-3">
                    {item.etapasTotal > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-200">{item.etapasDisputadas}/{item.etapasTotal} etapas</span>
                        <div className="w-20 h-1.5 bg-blue-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full"
                            style={{ width: `${Math.round((item.etapasDisputadas / item.etapasTotal) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Badge className="bg-yellow-400 text-gray-900 font-bold">
                      {item.posicaoNoCampeonato}º lugar
                    </Badge>
                    {item.descartesAutomaticos > 0 && (
                      <Badge className="bg-gray-700 text-white text-xs">
                        {item.descartesAutomaticos} ausência{item.descartesAutomaticos > 1 ? "s" : ""} descartada{item.descartesAutomaticos > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {item.etapasDescartadas?.length > 0 && (
                      <Badge className="bg-red-600 text-white text-xs">
                        {item.etapasDescartadas.length} pior{item.etapasDescartadas.length > 1 ? "es" : ""} resultado{item.etapasDescartadas.length > 1 ? "s" : ""} descartado{item.etapasDescartadas.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              <EvolucaoPilotoChart resultados={item.resultados} etapas={dados.etapas} />

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="font-bold text-center">Etapa</TableHead>
                        {item.categoriasNoCamp?.length > 0 && (
                          <TableHead className="font-bold text-center">Cat.</TableHead>
                        )}
                        <TableHead className="font-bold text-center">Posição</TableHead>
                        <TableHead className="font-bold text-center">Descarte</TableHead>
                        <TableHead className="font-bold text-center">Variação</TableHead>
                        <TableHead className="font-bold text-center">Pts Base</TableHead>
                        <TableHead className="font-bold text-center">MV</TableHead>
                        <TableHead className="font-bold text-center hidden md:table-cell">Extra</TableHead>
                        <TableHead className="font-bold text-center">Penal.</TableHead>
                        <TableHead className="font-bold text-center">Total</TableHead>
                        <TableHead className="font-bold text-center hidden sm:table-cell">Acum.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.resultados.map((res, idx) => {
                        const etapa = dados.etapas.find(e => e.id === res.etapa_id);
                        const variacao = getVariacaoPosicao(item.resultados, idx);
                        const ptAcum = item.resultados.slice(0, idx + 1).reduce((s, r) => {
                          if (r.descartado || item.etapasDescartadas?.includes(r.etapa_id)) return s;
                          return s + (r.pontos_totais || 0);
                        }, 0);
                        return (
                          <TableRow key={res.id} className={res.descartado ? 'bg-gray-100 opacity-60' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                           <TableCell className="text-center py-2">
                             <Badge variant="outline" className="font-bold text-xs">
                               {etapa ? `${etapa.numero_etapa}ª` : '?'}
                             </Badge>
                           </TableCell>
                           {item.categoriasNoCamp?.length > 0 && (
                             <TableCell className="text-center py-2">
                               {res.categoria ? (() => {
                                 const catInfo = campeonatos.find(c => c.id === item.campeonato.id)?.categorias?.find(c => c.nome === res.categoria);
                                 return (
                                   <span className="px-1.5 py-0.5 rounded-full text-white text-xs font-bold" style={{ backgroundColor: catInfo?.cor || "#6b7280" }}>
                                     {res.categoria}
                                   </span>
                                 );
                               })() : <span className="text-gray-300 text-xs">—</span>}
                             </TableCell>
                           )}
                           <TableCell className="text-center font-bold py-2">
                              {res.posicao === 1 && <span>🥇</span>}
                              {res.posicao === 2 && <span>🥈</span>}
                              {res.posicao === 3 && <span>🥉</span>}
                              {res.posicao > 3 && <span className="text-sm">{res.posicao}º</span>}
                            </TableCell>
                            <TableCell className="text-center py-2">
                              <div className="flex flex-col items-center gap-1">
                                {res.descartado ? (
                                  <Badge className="bg-gray-600 text-white text-xs">Manual</Badge>
                                ) : item.etapasDescartadas?.includes(res.etapa_id) ? (
                                  <Badge variant="destructive" className="text-xs">Automático</Badge>
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                                {canEdit && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-1.5 text-[10px]"
                                    onClick={() => handleDescartarManual(res)}
                                    title={res.descartado ? "Reativar este resultado" : "Descartar manualmente este resultado"}
                                  >
                                    {res.descartado ? <Undo className="w-3 h-3 mr-0.5" /> : <Trash2 className="w-3 h-3 mr-0.5" />}
                                    {res.descartado ? "Reativar" : "Descartar"}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-2">
                              {variacao ? (
                                <div className={`flex items-center justify-center gap-0.5 ${variacao.cor}`}>
                                  {variacao.icon}
                                  {variacao.diff > 0 && <span className="text-xs font-bold">{variacao.diff}</span>}
                                </div>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-center py-2">
                              <Badge className="bg-green-100 text-green-800 text-xs">{res.pontos}</Badge>
                            </TableCell>
                            <TableCell className="text-center py-2">
                              {(res.pontos_melhor_volta || 0) > 0
                                ? <Badge className="bg-purple-100 text-purple-800 text-xs">+{res.pontos_melhor_volta}</Badge>
                                : <span className="text-gray-300 text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-center hidden md:table-cell py-2">
                              {(res.pontos_tipo_extra || 0) !== 0 ? (
                                <Badge className={(res.pontos_tipo_extra || 0) >= 0 ? "bg-indigo-100 text-indigo-800 text-xs" : "bg-orange-100 text-orange-800 text-xs"}>
                                  {(res.pontos_tipo_extra || 0) >= 0 ? '+' : ''}{res.pontos_tipo_extra}
                                </Badge>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-center py-2">
                              {(res.pontos_penalidade || 0) > 0
                                ? <Badge variant="destructive" className="text-xs">-{res.pontos_penalidade}</Badge>
                                : <span className="text-gray-300 text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-center py-2">
                              <Badge className="bg-yellow-100 text-yellow-800 font-bold text-xs">{res.pontos_totais} pts</Badge>
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell py-2">
                              <span className="text-xs font-semibold text-blue-600">{ptAcum} pts</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}