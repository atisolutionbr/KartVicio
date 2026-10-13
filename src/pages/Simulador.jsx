import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award, Crown, Filter, Calculator, Trash2, Info, Download, Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePdfExport } from "@/hooks/usePdfExport";
import CampeonatoSelector from "@/components/campeonatos/CampeonatoSelector";
import SemAcessoCard from "@/components/SemAcessoCard";
import { filtrarCampeonatosAcessiveis, usuarioSemAcesso } from "@/utils/campeonatoAccess";
import ComparadorPilotos from "@/components/simulador/ComparadorPilotos";
import SimularEtapasPanel from "@/components/simulador/SimularEtapasPanel";
import RankingCard from "@/components/ranking/RankingCard";
import { carregarDadosRanking, recalcularResultados, computarPontos } from "@/utils/rankingCalc";
import { calcularDescartesPiloto } from "@/utils/descarte";
import { useEntitySubscriptions } from "@/hooks/useEntitySubscriptions";


import carregarResultadosRanking from '@/components/ranking/carregarResultadosRanking';
import { carregarNomesVinculados } from '@/components/pilotos/vinculosPilotos';
const Etapa = base44.entities.Etapa;
const Campeonato = base44.entities.Campeonato;

export default function SimuladorPage({ userPermissions }) {
  const [campeonatos, setCampeonatos] = useState([]);
  const [campeonatoId, setCampeonatoId] = useState("");
  const [resultados, setResultados] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [etapaSelecionada, setEtapaSelecionada] = useState("geral");
  const [modoDescarte, setModoDescarte] = useState(false);
  const [anoFiltro, setAnoFiltro] = useState(null);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [loading, setLoading] = useState(false);
  const [pilotos, setPilotos] = useState([]);
  const [penalidadesPorChave, setPenalidadesPorChave] = useState({});
  const [tabelaMap, setTabelaMap] = useState({});
  const loadVersion = React.useRef(0);

  useEffect(() => {
    Campeonato.list("-ano").then(list => {
      const acessiveis = filtrarCampeonatosAcessiveis(list, userPermissions);
      setCampeonatos(acessiveis);
      if (acessiveis.length > 0) {
        setCampeonatoId(acessiveis[0].id);
      }
    });
  }, [userPermissions]);

  useEffect(() => {
    if (!campeonatoId) return;
    setEtapaSelecionada("geral");
    setModoDescarte(false);
    setCategoriaFiltro("todas");
    const camp = campeonatos.find(c => c.id === campeonatoId);
    const anoBase = camp?.ano || new Date().getFullYear();
    Etapa.filter({ campeonato_id: campeonatoId }, { distinct: 'ano', limit: 1000 }).then(page => {
      const anos = page.items.map(Number).filter(Boolean).sort((a, b) => b - a);
      if (anos.length > 0) {
        setAnosDisponiveis(anos);
        const anoPreferido = anos.includes(anoBase) ? anoBase : anos[0];
        setAnoFiltro(anoPreferido);
      } else {
        setAnoFiltro(anoBase);
      }
    });
  }, [campeonatoId]);

  const loadData = useCallback(async () => {
    if (!campeonatoId || !anoFiltro) return;
    const version = ++loadVersion.current;
    setLoading(true);
    const [etapasData, { penalidadesPorChave: penMap, tabelaMap: tabMap }, nomes] = await Promise.all([
      Etapa.filter({ campeonato_id: campeonatoId, ano: anoFiltro }, 'numero_etapa'),
      carregarDadosRanking(campeonatoId),
      carregarNomesVinculados(campeonatoId, categoriaFiltro),
    ]);
    const filtros = { piloto_nome: { $in: nomes } };
    if (etapaSelecionada !== 'geral') filtros.etapa_id = etapaSelecionada;
    if (categoriaFiltro !== 'todas') filtros.categoria = categoriaFiltro;
    const resultadosData = await carregarResultadosRanking(campeonatoId, etapasData, filtros);
    if (version !== loadVersion.current) return;
    setPenalidadesPorChave(penMap);
    setTabelaMap(tabMap);
    setResultados(recalcularResultados(resultadosData, etapasData, penMap, tabMap));
    setEtapas(etapasData);
    setPilotos(nomes.sort((a, b) => a.localeCompare(b, 'pt-BR')));
    setLoading(false);
  }, [campeonatoId, anoFiltro, categoriaFiltro, etapaSelecionada]);

  useEffect(() => {
    if (!campeonatoId || !anoFiltro) return;
    loadData();
  }, [loadData]);

  // Tempo real: recarrega quando resultados, penalidades, etapas ou tabelas mudam
  useEntitySubscriptions(
    loadData,
    ["ResultadoEtapa", "Penalidade", "Etapa", "TabelaPontos", "TabelaPontosCampeonato", "Piloto", "InscricaoPiloto"],
    !!campeonatoId && !!anoFiltro
  );

  const campeonatoAtual = campeonatos.find(c => c.id === campeonatoId);
  const descarteQtd = campeonatoAtual?.descarte_quantidade || 1;
  const categorias = campeonatoAtual?.categorias || [];
  const temCategorias = categorias.length > 0;

  // REGRAS DE DESCARTE (conforme config do campeonato):
  // 1) descarte_quantidade = total de descartes do campeonato.
  // 2) Faltas do piloto (etapas realizadas - disputadas) consomem os descartes primeiro.
  // 3) Se faltas >= descarte_quantidade -> nenhuma etapa real é descartada.
  // 4) Se sobram descartes -> descarta as piores etapas (menor pontos_totais) sem penalidade.
  // 5) Etapas com penalidade NUNCA são descartadas.
  const calcularDescartesPilotoLocal = useCallback((resultadosFinalizadosPiloto, totalEtapasRealizadas) => {
    return calcularDescartesPiloto(resultadosFinalizadosPiloto, totalEtapasRealizadas, 0, descarteQtd);
  }, [descarteQtd]);

  const calcularRanking = (filtroCategoria = categoriaFiltro) => {
    const ranking = {};

    let resultadosValidos = resultados.filter(r => !r.descartado);
    if (etapaSelecionada !== "geral") {
      resultadosValidos = resultadosValidos.filter(r => r.etapa_id === etapaSelecionada);
    }
    if (temCategorias && filtroCategoria !== "todas") {
      resultadosValidos = resultadosValidos.filter(r => (r.categoria || "").trim() === filtroCategoria.trim());
    }

    // Etapas realizadas = etapa_ids únicos dentro do conjunto de resultados
    // válidos. Derivado dos resultados, sem depender do campo `categoria` ou
    // `finalizada` das etapas — funciona para qualquer campeonato.
    const etapasRealizadasIds = new Set(resultadosValidos.map(r => r.etapa_id));
    const totalEtapasRealizadas = etapasRealizadasIds.size;

    const resultadosPorPiloto = {};
    resultadosValidos.forEach(resultado => {
      if (!resultadosPorPiloto[resultado.piloto_nome]) resultadosPorPiloto[resultado.piloto_nome] = [];
      resultadosPorPiloto[resultado.piloto_nome].push(resultado);
    });

    const descartesPorPiloto = {};
    if (modoDescarte && etapaSelecionada === "geral") {
      Object.keys(resultadosPorPiloto).forEach(pilotoNome => {
        descartesPorPiloto[pilotoNome] = calcularDescartesPilotoLocal(
          resultadosPorPiloto[pilotoNome],
          totalEtapasRealizadas
        );
      });
    }

    resultadosValidos.forEach(resultado => {
      const pilotoNome = resultado.piloto_nome;
      const etapasDescartadas = descartesPorPiloto[pilotoNome]?.etapasDescartadas || [];
      if (modoDescarte && etapaSelecionada === "geral" && etapasDescartadas.includes(resultado.etapa_id)) return;

      if (!ranking[pilotoNome]) {
        ranking[pilotoNome] = {
          piloto: pilotoNome,
          categoria: resultado.categoria || "",
          pontos_totais: 0,
          pontos_penalidades: 0,
          pontos_melhor_volta: 0,
          pontos_tipo_extra: 0,
          etapas_disputadas: 0,
          posicao_etapa: resultado.posicao || null,
          etapas_descartadas: etapasDescartadas,
          descartes_automaticos: descartesPorPiloto[pilotoNome]?.descartesAutomaticos || 0,
          porEtapa: {},
          recentes: [],
        };
      }
      ranking[pilotoNome].pontos_totais += resultado.pontos_totais || 0;
      ranking[pilotoNome].pontos_penalidades += resultado.pontos_penalidade || 0;
      ranking[pilotoNome].pontos_melhor_volta += resultado.pontos_melhor_volta || 0;
      ranking[pilotoNome].pontos_tipo_extra += resultado.pontos_tipo_extra || 0;
      ranking[pilotoNome].etapas_disputadas += 1;
      ranking[pilotoNome].porEtapa[resultado.etapa_id] = resultado;
      if (etapaSelecionada !== "geral") ranking[pilotoNome].posicao_etapa = resultado.posicao;
    });

    // Construir "recentes" (últimas 4 etapas) para cada piloto
    const etapasOrdenadas = [...etapas].sort((a, b) => (a.numero_etapa || 0) - (b.numero_etapa || 0));
    Object.values(ranking).forEach(item => {
      const resOrdenados = etapasOrdenadas.map(e => item.porEtapa[e.id]).filter(Boolean);
      item.recentes = resOrdenados.slice(-4);
      while (item.recentes.length < 4) item.recentes.unshift(null);
    });

    // etapas_disputadas refletindo etapas únicas (eita mesmo piloto possa ter
    // mais de um resultado por etapa em campeonatos multi-categoria).
    Object.keys(ranking).forEach(nome => {
      const ids = new Set((resultadosPorPiloto[nome] || []).map(r => r.etapa_id));
      ranking[nome].etapas_disputadas = ids.size;
      // etapas_ausentes = etapa_ids realizadas em que o piloto não participou
      ranking[nome].etapas_ausentes = [...etapasRealizadasIds].filter(id => !ids.has(id));
    });

    return Object.values(ranking)
      .sort((a, b) => b.pontos_totais - a.pontos_totais)
      .map((item, index) => ({ ...item, posicao: index + 1 }));
  };

  const { exportToPdf, exporting } = usePdfExport();
  const rankingData = calcularRanking();
  const etapasDisponiveis = [...etapas].sort((a, b) => a.numero_etapa - b.numero_etapa);
  // Etapas realizadas = etapa_ids com pelo menos um resultado (considerando
  // também filtro de categoria quando aplicável).
  const _etapasRealizadasIds = new Set(
    resultados
      .filter(r => !r.descartado)
      .filter(r => !(temCategorias && categoriaFiltro !== "todas") || (r.categoria || "").trim() === categoriaFiltro.trim())
      .map(r => r.etapa_id)
  );
  const totalEtapasRealizadas = _etapasRealizadasIds.size;

  if (usuarioSemAcesso(userPermissions)) return <SemAcessoCard />;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">🧮 Simulador de Descarte</h1>
          <p className="text-gray-600">
            {campeonatoAtual ? `Simular descarte — ${campeonatoAtual.nome}` : "Selecione um campeonato"}
          </p>
        </div>
        <Button
          onClick={() => exportToPdf({ elementId: "simulador-export-area", filename: `simulador-${campeonatoAtual?.nome || 'campeonato'}.pdf` })}
          disabled={exporting || !campeonatoId}
          className="w-full lg:w-auto bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold"
        >
          <Download className="w-4 h-4 mr-2" />
          {exporting ? "Exportando..." : "Exportar PDF"}
        </Button>
      </div>

      {/* Filtros */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px]">
              <Label className="text-xs text-gray-500 font-semibold mb-1 block">Campeonato</Label>
              <CampeonatoSelector campeonatos={campeonatos} value={campeonatoId} onChange={(v) => { setCampeonatoId(v); setEtapaSelecionada("geral"); }} />
            </div>
            {campeonatoId && temCategorias && (
              <div className="min-w-[160px]">
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Categoria</Label>
                <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                  <SelectTrigger className="w-full">
                    <Tag className="w-4 h-4 mr-1 text-blue-600" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Categorias</SelectItem>
                    {categorias.map(cat => (
                      <SelectItem key={cat.id} value={cat.nome}>{cat.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {campeonatoId && anosDisponiveis.length > 0 && (
              <div className="min-w-[100px]">
                <Label className="text-xs text-gray-500 font-semibold mb-1 block">Ano</Label>
                <Select value={anoFiltro?.toString()} onValueChange={(v) => { setAnoFiltro(parseInt(v)); setEtapaSelecionada("geral"); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anosDisponiveis.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {campeonatoId && (
              <div className="min-w-[220px] flex-1">
                <Label className="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Etapa
                </Label>
                <Select value={etapaSelecionada} onValueChange={setEtapaSelecionada}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Ranking Geral</SelectItem>
                    {etapasDisponiveis.map(etapa => (
                      <SelectItem key={etapa.id} value={etapa.id}>
                        {etapa.numero_etapa}ª Etapa - {etapa.local || new Date(etapa.data_hora).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!campeonatoId ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-semibold">Selecione um campeonato para simular</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <>
          {/* Controle de Descarte */}
          {etapaSelecionada === "geral" && (
            <Alert className={modoDescarte ? "border-red-500 bg-red-50" : "border-blue-500 bg-blue-50"}>
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:justify-between">
                <div className="flex-1 min-w-0">
                  <AlertTitle className="flex items-center gap-2 mb-2 text-sm sm:text-base">
                    {modoDescarte ? <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0" /> : <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                    <span className={modoDescarte ? "text-red-800 font-bold" : "text-blue-800 font-bold"}>
                      {modoDescarte ? "Modo Descarte Ativado" : "Modo Normal"}
                    </span>
                  </AlertTitle>
                  <AlertDescription className={`text-xs sm:text-sm ${modoDescarte ? "text-red-700" : "text-blue-700"}`}>
                    {modoDescarte ? (
                      <>
                        <strong>Regras de descarte (config do campeonato):</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Total de etapas realizadas: <strong>{totalEtapasRealizadas}</strong></li>
                          <li>Quantidade de descartes: <strong>{descarteQtd}</strong></li>
                          <li>As <b>faltas</b> do piloto consomem os descartes primeiro.</li>
                          <li>Se o piloto faltou mais (ou igual) que o total de descartes, nenhuma etapa real é descartada.</li>
                          <li>Se sobram descartes, descarta a pior etapa (menor pontuação) sem penalidade.</li>
                          <li>Etapas com penalidade nunca são descartadas.</li>
                        </ul>
                      </>
                    ) : (
                      <>
                        Ative o descarte para simular o ranking aplicando a regra de descarte deste campeonato.
                        <br />
                        <strong>Regra:</strong> {descarteQtd} descarte(s); as faltas consomem descartes primeiro; se sobram, descarta a pior etapa sem penalidade.
                      </>
                    )}
                  </AlertDescription>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch id="modo-descarte" checked={modoDescarte} onCheckedChange={setModoDescarte} />
                  <Label htmlFor="modo-descarte" className="font-bold cursor-pointer text-sm">
                    {modoDescarte ? "Desativar" : "Ativar"}
                  </Label>
                </div>
              </div>
            </Alert>
          )}

          <div id="simulador-export-area">
            {/* Title inside export area */}
            <div className="mb-6 pb-4 border-b-2 border-yellow-400">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">🧮 Simulador de Descarte — {campeonatoAtual?.nome}</h1>
              <p className="text-gray-600 text-lg">
                {etapaSelecionada === "geral"
                  ? `Classificação geral · ${anoFiltro}`
                  : `${etapas.find(e => e.id === etapaSelecionada)?.numero_etapa}ª Etapa — ${campeonatoAtual?.nome}`
                }
                {modoDescarte && <span className="ml-3 text-red-600 font-bold">• Modo Descarte Ativo</span>}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card className="copa-gradient-gold text-white shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm opacity-90">Total Pilotos</p><p className="text-3xl font-bold">{rankingData.length}</p></div>
                    <Trophy className="w-8 h-8 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="copa-gradient-blue text-white shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm opacity-90">Etapas Realizadas</p><p className="text-3xl font-bold">{totalEtapasRealizadas}</p></div>
                    <Award className="w-8 h-8 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm opacity-90">Líder</p><p className="text-lg font-bold truncate">{rankingData[0]?.piloto || "-"}</p></div>
                    <Crown className="w-8 h-8 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className={`${modoDescarte ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-purple-500 to-purple-600'} text-white shadow-xl`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm opacity-90">Modo</p><p className="text-lg font-bold">{modoDescarte ? "Com Descarte" : "Normal"}</p></div>
                    {modoDescarte ? <Trash2 className="w-8 h-8 opacity-80" /> : <Medal className="w-8 h-8 opacity-80" />}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ranking Card (estilo driverone com cores KartVicio) */}
            <RankingCard
              ranking={rankingData}
              titulo={`${modoDescarte ? "Simulação com Descarte" : "Classificação Atual"} — ${campeonatoAtual?.nome || ""}`}
              logoUrl={campeonatoAtual?.logo_url}
              categorias={categorias}
              categoriaAtiva={categoriaFiltro}
              onCategoriaChange={setCategoriaFiltro}
              etapas={etapasDisponiveis}
              modoDescarte={modoDescarte}
              onModoDescarteChange={etapaSelecionada === "geral" ? setModoDescarte : undefined}
              onExport={() => exportToPdf({ elementId: "simulador-export-area", filename: `simulador-${campeonatoAtual?.nome || 'campeonato'}.pdf` })}
              exporting={exporting}
              etapasDescartadasPorPiloto={Object.fromEntries(rankingData.map(r => [r.piloto, r.etapas_descartadas || []]))}
            />
          </div>

          {/* Simulação de Etapas Faltantes */}
          {etapaSelecionada === "geral" && pilotos.length > 0 && (
            <SimularEtapasPanel
              key={`${campeonatoId}-${anoFiltro}-${categoriaFiltro}`}
              resultadosReais={resultados.filter(r => !r.descartado)}
              etapas={etapas}
              pilotos={pilotos}
              tabelaMap={tabelaMap}
              penalidadesPorChave={penalidadesPorChave}
              computarPontosFn={computarPontos}
              rankingAtual={rankingData}
            />
          )}

          {/* Comparador de Pilotos */}
          {resultados.length > 1 && (
            <ComparadorPilotos
              key={`${campeonatoId}-${anoFiltro}-${categoriaFiltro}`}
              resultados={resultados}
              etapas={etapas}
              campeonato={campeonatoAtual}
            />
          )}
        </>
      )}
    </div>
  );
}