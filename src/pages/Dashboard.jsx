import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Award, Crown, Filter, Tag, Medal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePdfExport } from "@/hooks/usePdfExport";
import CampeonatoSelector from "@/components/campeonatos/CampeonatoSelector";
import CampeonatoLogo from "@/components/campeonatos/CampeonatoLogo";
import SemAcessoCard from "@/components/SemAcessoCard";
import { filtrarCampeonatosAcessiveis, usuarioSemAcesso } from "@/utils/campeonatoAccess";
import { carregarDadosRanking, recalcularResultados } from "@/utils/rankingCalc";
import RankingCard from "@/components/ranking/RankingCard";
import { useEntitySubscriptions } from "@/hooks/useEntitySubscriptions";
import { useLocation } from "react-router-dom";
import carregarResultadosRanking from '@/components/ranking/carregarResultadosRanking';


const Etapa = base44.entities.Etapa;
const Campeonato = base44.entities.Campeonato;

export default function DashboardPage({ userPermissions }) {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);

  const [campeonatos, setCampeonatos] = useState([]);
  const [campeonatoId, setCampeonatoId] = useState(urlParams.get("campeonato") || "");
  const [resultados, setResultados] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [etapaSelecionada, setEtapaSelecionada] = useState("geral");
  const [anoFiltro, setAnoFiltro] = useState(null);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [loading, setLoading] = useState(true);
  const loadVersion = React.useRef(0);

  useEffect(() => {
    Campeonato.list("-ano").then(list => {
      const acessiveis = filtrarCampeonatosAcessiveis(list, userPermissions);
      setCampeonatos(acessiveis);
      if (!campeonatoId && acessiveis.length > 0) {
        setCampeonatoId(acessiveis[0].id);
      }
    });
  }, [userPermissions]);

  useEffect(() => {
    if (!campeonatoId) return;
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
    const [etapasPage, { penalidadesPorChave, tabelaMap }] = await Promise.all([
      Etapa.filter({ campeonato_id: campeonatoId, ano: anoFiltro }, { sort: 'numero_etapa', limit: 100, fields: ['id','numero_etapa','finalizada','categoria','dobrar_pontos','local','data_hora'] }),
      carregarDadosRanking(campeonatoId),
    ]);
    const etapasData = etapasPage.items || etapasPage;
    const filtros = {};
    if (etapaSelecionada !== 'geral') filtros.etapa_id = etapaSelecionada;
    if (categoriaFiltro !== 'todas') filtros.categoria = categoriaFiltro;
    const resultadosData = await carregarResultadosRanking(campeonatoId, etapasData, filtros);
    if (version !== loadVersion.current) return;
    setResultados(recalcularResultados(resultadosData, etapasData, penalidadesPorChave, tabelaMap));
    setEtapas(etapasData);
    setLoading(false);
  }, [campeonatoId, anoFiltro, categoriaFiltro, etapaSelecionada]);

  useEffect(() => {
    if (!campeonatoId || !anoFiltro) return;
    loadData();
  }, [loadData]);

  // Tempo real: recarrega quando resultados, penalidades, etapas ou tabelas mudam
  useEntitySubscriptions(
    loadData,
    ["ResultadoEtapa", "Penalidade", "Etapa", "TabelaPontos", "TabelaPontosCampeonato"],
    !!campeonatoId && !!anoFiltro
  );

  const campeonatoAtual = campeonatos.find(c => c.id === campeonatoId);
  const categorias = campeonatoAtual?.categorias || [];
  const temCategorias = categorias.length > 0;

  // Passe único: computa ranking geral + todos os por-categoria em uma só
  // iteração sobre resultados (antes eram N+2 passagens).
  const allRankings = useMemo(() => {
    const etapasOrdenadas = [...etapas].sort((a, b) => (a.numero_etapa || 0) - (b.numero_etapa || 0));
    const nova = () => ({
      piloto: "", categoria: "", pontos_totais: 0, pontos_penalidades: 0,
      pontos_melhor_volta: 0, etapas_disputadas: 0, porEtapa: {}, recentes: [],
    });
    const finalize = (map) => {
      Object.values(map).forEach(item => {
        const resOrdenados = etapasOrdenadas.map(e => item.porEtapa[e.id]).filter(Boolean);
        item.recentes = resOrdenados.slice(-4);
        while (item.recentes.length < 4) item.recentes.unshift(null);
      });
      return Object.values(map)
        .sort((a, b) => b.pontos_totais - a.pontos_totais)
        .map((item, i) => ({ ...item, posicao: i + 1 }));
    };

    let validos = resultados.filter(r => !r.descartado);
    if (etapaSelecionada !== "geral") validos = validos.filter(r => r.etapa_id === etapaSelecionada);

    const geralMap = {};
    const catMaps = {};
    categorias.forEach(cat => { catMaps[cat.nome] = {}; });

    validos.forEach(resultado => {
      const nome = resultado.piloto_nome;
      const catNome = (resultado.categoria || "").trim();
      const acumular = (map) => {
        if (!map[nome]) map[nome] = { ...nova(), piloto: nome, categoria: catNome };
        const e = map[nome];
        e.pontos_totais += resultado.pontos_totais || 0;
        e.pontos_penalidades += resultado.pontos_penalidade || 0;
        e.pontos_melhor_volta += resultado.pontos_melhor_volta || 0;
        e.etapas_disputadas += 1;
        e.porEtapa[resultado.etapa_id] = resultado;
      };
      acumular(geralMap);
      if (catMaps[catNome]) acumular(catMaps[catNome]);
    });

    const porCategoria = {};
    Object.keys(catMaps).forEach(nome => { porCategoria[nome] = finalize(catMaps[nome]); });
    return { geral: finalize(geralMap), porCategoria };
  }, [resultados, etapaSelecionada, etapas, categorias]);

  const { exportToPdf, exporting } = usePdfExport();

  const getEtapaNome = () => {
    if (etapaSelecionada === "geral") return "Geral";
    const etapa = etapas.find(e => e.id === etapaSelecionada);
    return etapa ? `${etapa.numero_etapa}ª Etapa` : "Etapa";
  };

  const rankingGeral = allRankings.geral;
  const rankingFiltrado = useMemo(
    () => categoriaFiltro === "todas" ? rankingGeral : (allRankings.porCategoria[categoriaFiltro] || rankingGeral),
    [categoriaFiltro, allRankings, rankingGeral]
  );
  const etapasDisponiveis = useMemo(() => [...etapas].sort((a, b) => a.numero_etapa - b.numero_etapa), [etapas]);
  const rankingsPorCategoria = useMemo(
    () => categorias.map(cat => ({ cat, ranking: allRankings.porCategoria[cat.nome] })).filter(x => x.ranking && x.ranking.length > 0),
    [categorias, allRankings]
  );

  if (usuarioSemAcesso(userPermissions)) return <SemAcessoCard />;

  const tituloRanking = categoriaFiltro !== "todas"
    ? `Categoria ${categoriaFiltro}`
    : etapaSelecionada === "geral"
      ? "Classificação Geral"
      : `Classificação ${getEtapaNome()}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {campeonatoAtual && <CampeonatoLogo campeonato={campeonatoAtual} size="md" />}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">🏁 Ranking</h1>
              <p className="text-gray-500 text-sm truncate max-w-xs sm:max-w-none">
                {campeonatoAtual ? `${campeonatoAtual.nome} · ${etapaSelecionada === "geral" ? "Classificação Geral" : getEtapaNome()}` : "Selecione um campeonato"}
              </p>
            </div>
          </div>
        </div>
        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <CampeonatoSelector campeonatos={campeonatos} value={campeonatoId} onChange={(v) => { setCampeonatoId(v); setEtapaSelecionada("geral"); }} />
          {campeonatoId && anosDisponiveis.length > 0 && (
            <Select value={anoFiltro?.toString()} onValueChange={(v) => { setAnoFiltro(parseInt(v)); setEtapaSelecionada("geral"); }}>
              <SelectTrigger className="w-24 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {campeonatoId && temCategorias && (
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="w-36 h-9">
                <Tag className="w-4 h-4 mr-1 text-blue-600 flex-shrink-0" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat.id} value={cat.nome}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {campeonatoId && (
            <Select value={etapaSelecionada} onValueChange={setEtapaSelecionada}>
              <SelectTrigger className="w-44 sm:w-52 h-9">
                <Filter className="w-4 h-4 mr-1 text-gray-500 flex-shrink-0" />
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">Ranking Geral</SelectItem>
                {etapasDisponiveis.map(etapa => (
                  <SelectItem key={etapa.id} value={etapa.id}>
                    {etapa.numero_etapa}ª Etapa{etapa.local ? ` - ${etapa.local}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {!campeonatoId ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-semibold">Selecione um campeonato para ver o ranking</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <div id="dashboard-export-area" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="shadow-md border-0" style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)" }}>
              <CardContent className="p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-90 font-medium">Pilotos</p>
                    <p className="text-2xl font-extrabold">{rankingFiltrado.length}</p>
                  </div>
                  <Trophy className="w-7 h-7 opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-md border-0" style={{ background: "linear-gradient(135deg, #0a1628 0%, #1e3a5c 100%)" }}>
              <CardContent className="p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-90 font-medium">Etapas Realizadas</p>
                    <p className="text-2xl font-extrabold">{etapas.filter(e => e.finalizada).length}</p>
                  </div>
                  <Award className="w-7 h-7 opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-md border-0 bg-gradient-to-r from-green-500 to-green-600">
              <CardContent className="p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs opacity-90 font-medium">Líder {categoriaFiltro !== "todas" ? categoriaFiltro : "Geral"}</p>
                    <p className="text-base font-bold truncate">{rankingFiltrado[0]?.piloto || "-"}</p>
                  </div>
                  <Crown className="w-7 h-7 opacity-80 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-md border-0 bg-gradient-to-r from-purple-500 to-purple-600">
              <CardContent className="p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-90 font-medium">Total Etapas</p>
                    <p className="text-2xl font-extrabold">{etapas.length}</p>
                  </div>
                  <Medal className="w-7 h-7 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rankings */}
          {temCategorias && categoriaFiltro === "todas" ? (
            <div className="space-y-8">
              <RankingCard
                ranking={rankingGeral}
                titulo={`Classificação Geral — ${campeonatoAtual?.nome || ""}`}
                logoUrl={campeonatoAtual?.logo_url}
                categorias={categorias}
                categoriaAtiva="todas"
                onCategoriaChange={setCategoriaFiltro}
                etapas={etapasDisponiveis}
                onExport={() => exportToPdf({ elementId: "dashboard-export-area", filename: `ranking-${campeonatoAtual?.nome || 'campeonato'}.pdf` })}
                exporting={exporting}
              />
              {rankingsPorCategoria.map(({ cat, ranking: rankingCat }) => (
                <RankingCard
                  key={cat.id}
                  ranking={rankingCat}
                  titulo={`Categoria ${cat.nome}`}
                  logoUrl={campeonatoAtual?.logo_url}
                  categorias={categorias}
                  categoriaAtiva={cat.nome}
                  etapas={etapasDisponiveis}
                />
              ))}
            </div>
          ) : (
            <RankingCard
              ranking={rankingFiltrado}
              titulo={`${tituloRanking} — ${campeonatoAtual?.nome || ""}`}
              logoUrl={campeonatoAtual?.logo_url}
              categorias={categorias}
              categoriaAtiva={categoriaFiltro}
              onCategoriaChange={setCategoriaFiltro}
              etapas={etapasDisponiveis}
              onExport={() => exportToPdf({ elementId: "dashboard-export-area", filename: `ranking-${campeonatoAtual?.nome || 'campeonato'}.pdf` })}
              exporting={exporting}
            />
          )}
        </div>
      )}
    </div>
  );
}