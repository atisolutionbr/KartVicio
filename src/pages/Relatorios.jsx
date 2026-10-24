import React, { useState, useEffect } from "react";
import { ResultadoEtapa, Piloto, Etapa, Penalidade } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Table from '@/components/relatorios/ResponsiveReportTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Trophy, 
  Calendar, 
  Zap, 
  Award,
  Crown,
  TrendingUp,
  Download,
  Layers
} from "lucide-react";
import EvolucaoPontosChart from "../components/relatorios/EvolucaoPontosChart";
import MediasRelatorios from "../components/relatorios/MediasRelatorios";
import FiltroEtapaCategoria from "../components/relatorios/FiltroEtapaCategoria";
import PontuacaoEtapaEtapa from "../components/relatorios/PontuacaoEtapaEtapa";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useExcelExport } from "@/hooks/useExcelExport";
import SemAcessoCard from "@/components/SemAcessoCard";
import { filtrarCampeonatosAcessiveis, usuarioSemAcesso } from "@/utils/campeonatoAccess";
import ComparadorPilotos from "@/components/simulador/ComparadorPilotos";
import DiferencaPontosPilotos from "@/components/relatorios/DiferencaPontosPilotos";
import CampeonatoLogo from "@/components/campeonatos/CampeonatoLogo";

const ChancesTitulo = React.lazy(() => import('@/components/relatorios/ChancesTitulo'));

const Campeonato = base44.entities.Campeonato;
const InscricaoPiloto = base44.entities.InscricaoPiloto;

export default function RelatoriosPage({ userPermissions }) {
  const isAdmin = userPermissions?.permissao === 'admin';
  const [campeonatos, setCampeonatos] = useState([]);
  const [campeonatoId, setCampeonatoId] = useState(isAdmin ? "todos" : "");
  const [pilotosInscritosCount, setPilotosInscritosCount] = useState(null);
  const [anoFiltro, setAnoFiltro] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [pilotos, setPilotos] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [penalidades, setPenalidades] = useState([]);
  const [etapaFiltroResultado, setEtapaFiltroResultado] = useState("todas");
  const [categoriaFiltroResultado, setCategoriaFiltroResultado] = useState("todas");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [cardFiltros, setCardFiltros] = useState({});
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Campeonato.list("-ano").then(list => {
      const acessiveis = filtrarCampeonatosAcessiveis(list, userPermissions);
      setCampeonatos(acessiveis);
      // Usuário não-admin não pode ver "Todos os Campeonatos" — trava no primeiro acessível
      if (!isAdmin && !campeonatoId && acessiveis.length > 0) {
        setCampeonatoId(acessiveis[0].id);
      }
    });
  }, [userPermissions]);

  // Pilotos inscritos no campeonato selecionado (para o card "Pilotos Ativos")
  useEffect(() => {
    if (campeonatoId === "todos") {
      setPilotosInscritosCount(null);
      return;
    }
    if (!campeonatoId) return;
    InscricaoPiloto.filter({ campeonato_id: campeonatoId, ativo: true }).then(list => {
      setPilotosInscritosCount(list.length);
    });
  }, [campeonatoId]);

  // Ao trocar campeonato, reseta filtros (não força o ano aqui — o loadData vai detectar)
  useEffect(() => {
    setCategoriaFiltro("todas");
    setEtapaFiltroResultado("todas");
    setAnoFiltro(null); // força redetecção ao carregar
  }, [campeonatoId]);

  // Reseta os filtros individuais de cada card ao trocar de campeonato
  useEffect(() => {
    setCardFiltros({});
    setCategoriaFiltroResultado("todas");
  }, [campeonatoId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [resultadosData, pilotosData, etapasData, penalidadesData] = await Promise.all([
          campeonatoId !== "todos" ? ResultadoEtapa.filter({ campeonato_id: campeonatoId }) : ResultadoEtapa.list(),
          Piloto.list(),
          campeonatoId !== "todos" ? Etapa.filter({ campeonato_id: campeonatoId }) : Etapa.list(),
          campeonatoId !== "todos" ? Penalidade.filter({ campeonato_id: campeonatoId }) : Penalidade.list()
        ]);

        // Detecta anos disponíveis nos dados reais
        const anosNosData = [...new Set(etapasData.map(e => e.ano).filter(Boolean))].sort((a, b) => b - a);
        setAnosDisponiveis(anosNosData);

        // Determina o ano correto: usa anoFiltro se existir nos dados, senão usa o mais recente
        const camp = campeonatos.find(c => c.id === campeonatoId);
        const anoBase = anoFiltro || camp?.ano || new Date().getFullYear();
        const anoEfetivo = anosNosData.includes(anoBase) ? anoBase : (anosNosData[0] || anoBase);

        if (anoEfetivo !== anoFiltro) {
          setAnoFiltro(anoEfetivo);
          // O useEffect vai re-rodar com o ano correto
        }

        // Filtrar por ano efetivo
        const etapasFiltradas = etapasData.filter(e => e.ano === anoEfetivo);
        const etapaIds = new Set(etapasFiltradas.map(e => e.id));
        const resultadosFiltrados = resultadosData.filter(r => etapaIds.has(r.etapa_id));
        const penalidadesFiltradas = penalidadesData.filter(p => etapaIds.has(p.etapa_id));

        setResultados(resultadosFiltrados);
        setPilotos(pilotosData);
        setEtapas(etapasFiltradas);
        setPenalidades(penalidadesFiltradas);
        setEtapaFiltroResultado("todas");
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
      setLoading(false);
    };

    if (campeonatos.length > 0 || campeonatoId === "todos") loadData();
  }, [campeonatoId, anoFiltro, campeonatos]);

  const campeonatoAtual = campeonatos.find(c => c.id === campeonatoId);
  const categoriasCampeonato = campeonatoAtual?.categorias || [];

  // Resultados filtrados por categoria (base para todos os cálculos)
  const resultadosVisiveis = categoriaFiltro === "todas"
    ? resultados
    : resultados.filter(r => r.categoria === categoriaFiltro);

  // Filtros independentes por card: cada relatório pode ser refinado por etapa/categoria
  const getCardFiltro = (id) => cardFiltros[id] || { etapa: "todas", categoria: "todas" };
  const setCardFiltro = (id, patch) => setCardFiltros(prev => ({ ...prev, [id]: { ...getCardFiltro(id), ...patch } }));
  const filtrarPorCard = (lista, id) => {
    const f = getCardFiltro(id);
    let out = lista;
    if (f.etapa !== "todas") out = out.filter(r => r.etapa_id === f.etapa);
    if (f.categoria !== "todas") out = out.filter(r => (r.categoria || "").trim() === f.categoria.trim());
    return out;
  };

  // Relatório: Penalidades
  const relatorioPenalidades = (lista) => {
    const penalidadesPorEtapa = {};
    lista.forEach(pen => {
      const etapa = etapas.find(e => e.id === pen.etapa_id);
      if (!etapa) return;
      const key = etapa.id;
      if (!penalidadesPorEtapa[key]) {
        penalidadesPorEtapa[key] = {
          etapa: `${etapa.numero_etapa}ª Etapa`,
          quantidade: 0,
          pontos_totais: 0
        };
      }
      penalidadesPorEtapa[key].quantidade += 1;
      penalidadesPorEtapa[key].pontos_totais += pen.pontos_penalidade || 0;
    });
    return Object.values(penalidadesPorEtapa).sort((a, b) => 
      parseInt(a.etapa) - parseInt(b.etapa)
    );
  };

  // Relatório: Resultados por Etapa
  const relatorioResultadosPorEtapa = () => {
    const base = categoriaFiltroResultado === "todas" ? resultadosVisiveis : resultadosVisiveis.filter(r => (r.categoria || "").trim() === categoriaFiltroResultado.trim());
    const resultadosPorEtapa = {};
    base.forEach(res => {
      const etapa = etapas.find(e => e.id === res.etapa_id);
      if (!etapa) return;
      const key = etapa.id;
      if (!resultadosPorEtapa[key]) {
        resultadosPorEtapa[key] = {
          etapa: `${etapa.numero_etapa}ª Etapa`,
          local: etapa.local,
          data: new Date(etapa.data_hora).toLocaleDateString(),
          pilotos_participantes: 0,
          finalizada: etapa.finalizada
        };
      }
      resultadosPorEtapa[key].pilotos_participantes += 1;
    });
    return Object.values(resultadosPorEtapa).sort((a, b) => 
      parseInt(a.etapa) - parseInt(b.etapa)
    );
  };

  const resultadosDetalhadosEtapa = () => {
    if (etapaFiltroResultado === "todas") return [];
    return resultadosVisiveis
      .filter(r => r.etapa_id === etapaFiltroResultado)
      .filter(r => categoriaFiltroResultado === "todas" || (r.categoria || "").trim() === categoriaFiltroResultado.trim())
      .sort((a, b) => a.posicao - b.posicao);
  };

  const etapasEmAberto = etapas
    .filter(e => !e.finalizada)
    .sort((a, b) => a.numero_etapa - b.numero_etapa)
    .map(e => ({
      etapa: `${e.numero_etapa}ª Etapa`,
      local: e.local,
      data: new Date(e.data_hora).toLocaleDateString(),
      hora: new Date(e.data_hora).toLocaleTimeString()
    }));

  const pilotosMaisPenalizados = (lista) => {
    const contagemPenalidades = {};
    lista.forEach(pen => {
      if (!contagemPenalidades[pen.piloto_nome]) {
        contagemPenalidades[pen.piloto_nome] = { piloto: pen.piloto_nome, quantidade: 0, pontos_perdidos: 0 };
      }
      contagemPenalidades[pen.piloto_nome].quantidade += 1;
      contagemPenalidades[pen.piloto_nome].pontos_perdidos += pen.pontos_penalidade || 0;
    });
    return Object.values(contagemPenalidades).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);
  };

  const pilotosMaisVoltasRapidas = (lista) => {
    const contagemVoltasRapidas = {};
    lista.forEach(res => {
      if (!res.pontos_melhor_volta || res.pontos_melhor_volta === 0) return;
      if (!contagemVoltasRapidas[res.piloto_nome]) {
        contagemVoltasRapidas[res.piloto_nome] = { piloto: res.piloto_nome, quantidade: 0, pontos_extras: 0 };
      }
      contagemVoltasRapidas[res.piloto_nome].quantidade += 1;
      contagemVoltasRapidas[res.piloto_nome].pontos_extras += res.pontos_melhor_volta;
    });
    return Object.values(contagemVoltasRapidas).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);
  };

  const pilotosMaisPodios = (lista) => {
    const contagemPodios = {};
    lista.forEach(res => {
      if (res.posicao > 3) return;
      if (!contagemPodios[res.piloto_nome]) {
        contagemPodios[res.piloto_nome] = { piloto: res.piloto_nome, podios: 0, primeiro: 0, segundo: 0, terceiro: 0 };
      }
      contagemPodios[res.piloto_nome].podios += 1;
      if (res.posicao === 1) contagemPodios[res.piloto_nome].primeiro += 1;
      if (res.posicao === 2) contagemPodios[res.piloto_nome].segundo += 1;
      if (res.posicao === 3) contagemPodios[res.piloto_nome].terceiro += 1;
    });
    return Object.values(contagemPodios).sort((a, b) => b.podios - a.podios).slice(0, 10);
  };

  const pilotosMaisVitorias = (lista) => {
    const contagemVitorias = {};
    lista.forEach(res => {
      if (res.posicao !== 1) return;
      if (!contagemVitorias[res.piloto_nome]) {
        contagemVitorias[res.piloto_nome] = { piloto: res.piloto_nome, vitorias: 0 };
      }
      contagemVitorias[res.piloto_nome].vitorias += 1;
    });
    return Object.values(contagemVitorias).sort((a, b) => b.vitorias - a.vitorias).slice(0, 10);
  };

  // Relatório: Tipos de Ponto por Piloto
  const relatorioTiposPontoPorPiloto = () => {
    const contagem = {};
    resultadosVisiveis.forEach(res => {
      if (!res.tipos_ponto_aplicados || res.tipos_ponto_aplicados.length === 0) return;
      res.tipos_ponto_aplicados.forEach(tp => {
        const key = `${res.piloto_nome}__${tp.descricao}`;
        if (!contagem[key]) {
          contagem[key] = { piloto: res.piloto_nome, descricao: tp.descricao, valor_unitario: tp.valor, quantidade: 0, total: 0 };
        }
        contagem[key].quantidade += 1;
        contagem[key].total += parseFloat(tp.valor) || 0;
      });
    });
    return Object.values(contagem).sort((a, b) => b.quantidade - a.quantidade);
  };

  // Relatório: quem mais aplicou cada tipo
  const rankingPorTipo = (lista) => {
    const porTipo = {};
    lista.forEach(res => {
      if (!res.tipos_ponto_aplicados || res.tipos_ponto_aplicados.length === 0) return;
      res.tipos_ponto_aplicados.forEach(tp => {
        if (!porTipo[tp.descricao]) porTipo[tp.descricao] = {};
        if (!porTipo[tp.descricao][res.piloto_nome]) porTipo[tp.descricao][res.piloto_nome] = { piloto: res.piloto_nome, quantidade: 0, total: 0 };
        porTipo[tp.descricao][res.piloto_nome].quantidade += 1;
        porTipo[tp.descricao][res.piloto_nome].total += parseFloat(tp.valor) || 0;
      });
    });
    return Object.entries(porTipo).map(([tipo, pilotos]) => ({
      tipo,
      pilotos: Object.values(pilotos).sort((a, b) => b.quantidade - a.quantidade)
    }));
  };

  const piorResultadoPorPiloto = (lista) => {
    const pioresResultados = {};
    lista.forEach(res => {
      const etapa = etapas.find(e => e.id === res.etapa_id);
      if (!etapa) return;
      if (!pioresResultados[res.piloto_nome] || res.posicao > pioresResultados[res.piloto_nome].pior_posicao) {
        pioresResultados[res.piloto_nome] = {
          piloto: res.piloto_nome,
          pior_posicao: res.posicao,
          etapa: `${etapa.numero_etapa}ª Etapa`,
          local: etapa.local,
          pontos_totais: res.pontos_totais
        };
      }
    });
    return Object.values(pioresResultados).sort((a, b) => a.piloto.localeCompare(b.piloto));
  };

  const { exportToPdf, exporting } = usePdfExport();
  const { exportToExcel } = useExcelExport();

  const handleExportExcel = () => {
    const ranking = {};
    resultadosVisiveis.forEach(r => {
      if (!ranking[r.piloto_nome]) ranking[r.piloto_nome] = { Piloto: r.piloto_nome, Categoria: r.categoria || '-', Pontos: 0, Penalidades: 0, MelhorVolta: 0, TiposExtra: 0, Etapas: 0 };
      ranking[r.piloto_nome].Pontos += r.pontos_totais || 0;
      ranking[r.piloto_nome].Penalidades += r.pontos_penalidade || 0;
      ranking[r.piloto_nome].MelhorVolta += r.pontos_melhor_volta || 0;
      ranking[r.piloto_nome].TiposExtra += r.pontos_tipo_extra || 0;
      ranking[r.piloto_nome].Etapas += 1;
    });
    const rankingData = Object.values(ranking).sort((a, b) => b.Pontos - a.Pontos).map((r, i) => ({ Posicao: i + 1, ...r }));

    // Detalhes etapa a etapa
    const detalhes = resultadosVisiveis.map(r => {
      const etapa = etapas.find(e => e.id === r.etapa_id);
      return {
        Etapa: etapa ? `${etapa.numero_etapa}ª Etapa` : 'N/A',
        Local: etapa?.local || '',
        Piloto: r.piloto_nome,
        Categoria: r.categoria || '-',
        Posicao: r.posicao,
        PontosBase: r.pontos,
        MelhorVolta: r.pontos_melhor_volta || 0,
        TiposExtra: r.pontos_tipo_extra || 0,
        Penalidade: r.pontos_penalidade || 0,
        Total: r.pontos_totais
      };
    }).sort((a, b) => a.Etapa.localeCompare(b.Etapa) || a.Posicao - b.Posicao);

    // Exporta duas planilhas em arquivo único via duas chamadas seguidas (ranking + detalhes)
    exportToExcel({ data: rankingData, filename: `ranking-${subtitulo.replace(/[\s/]/g, '-')}` });
    exportToExcel({ data: detalhes, filename: `resultados-detalhados-${subtitulo.replace(/[\s/]/g, '-')}` });
  };

  const subtitulo = campeonatoAtual
    ? `${campeonatoAtual.nome} — ${anoFiltro}${categoriaFiltro !== 'todas' ? ` — Cat. ${categoriaFiltro}` : ''}`
    : `Todos os Campeonatos — ${anoFiltro}`;

  if (usuarioSemAcesso(userPermissions)) return <SemAcessoCard />;

  return (
    <div className="min-w-0 w-full space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col justify-between items-start gap-4 xl:flex-row xl:items-center">
        <div className="min-w-0">
          <h1 className="break-words text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">📊 Relatórios e Estatísticas</h1>
          <p className="break-words text-gray-600">{subtitulo}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Layers className="w-4 h-4 text-gray-500 hidden sm:block" />
            <Select value={campeonatoId} onValueChange={(v) => { setCampeonatoId(v); setEtapaFiltroResultado("todas"); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Campeonato" />
              </SelectTrigger>
              <SelectContent>
                {isAdmin && <SelectItem value="todos">Todos os Campeonatos</SelectItem>}
                {campeonatos.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome} ({c.ano})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={anoFiltro ? anoFiltro.toString() : ""} onValueChange={(v) => { setAnoFiltro(parseInt(v)); setEtapaFiltroResultado("todas"); setCategoriaFiltro("todas"); }}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(anosDisponiveis.length > 0 ? anosDisponiveis : [anoFiltro]).filter(Boolean).map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoriasCampeonato.length > 0 && (
              <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Categorias</SelectItem>
                  {categoriasCampeonato.map(cat => (
                    <SelectItem key={cat.id} value={cat.nome}>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: cat.cor }} />
                        {cat.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExportExcel}
              disabled={loading}
              variant="outline"
              className="border-green-600 text-green-700 hover:bg-green-50 font-bold whitespace-nowrap"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              onClick={() => exportToPdf({
                elementId: "relatorios-export-area",
                filename: `relatorios-${subtitulo.replace(/\s/g,'-')}.pdf`,
                title: `Relatórios`,
                subtitle: subtitulo,
              })}
              disabled={exporting || loading}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold whitespace-nowrap"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? "Exportando..." : "PDF"}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando relatórios...</p>
          </div>
        </div>
      ) : (
      <div id="relatorios-export-area" className="min-w-0 w-full space-y-4 sm:space-y-6">
        {/* Cabeçalho com logo do campeonato */}
        {campeonatoAtual && (
          <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-yellow-400">
            <CampeonatoLogo campeonato={campeonatoAtual} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{campeonatoAtual.nome}</h2>
              <p className="text-sm text-gray-500">{subtitulo}</p>
            </div>
          </div>
        )}
        <React.Suspense fallback={<p>Carregando análise de título…</p>}><ChancesTitulo championship={campeonatoAtual} year={anoFiltro} category={categoriaFiltro}/></React.Suspense>
        {/* Stats Cards */}
        <div className="grid min-w-0 grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total de Etapas</p>
                  <p className="text-3xl font-bold">{etapas.length}</p>
                </div>
                <Calendar className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Etapas Finalizadas</p>
                  <p className="text-3xl font-bold">{etapas.filter(e => e.finalizada).length}</p>
                </div>
                <Trophy className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Penalidades</p>
                  <p className="text-3xl font-bold">{penalidades.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Pilotos Ativos</p>
                  <p className="text-3xl font-bold">{pilotosInscritosCount !== null ? pilotosInscritosCount : pilotos.filter(p => p.ativo).length}</p>
                </div>
                <Award className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pontuação Etapa por Etapa */}
        <PontuacaoEtapaEtapa
          resultados={resultados}
          etapas={etapas}
          penalidades={penalidades}
          anoSelecionado={anoFiltro}
        />

        {/* Diferença de Pontos entre Pilotos */}
        <DiferencaPontosPilotos resultados={resultadosVisiveis} etapas={etapas} />

        {/* Evolução dos Pontos */}
        <EvolucaoPontosChart
          resultados={resultados}
          etapas={etapas}
          anoSelecionado={anoFiltro}
        />

        {/* Comparador de Pilotos */}
        {resultadosVisiveis.length > 1 && (
          <div className="mt-6">
            <ComparadorPilotos resultados={resultadosVisiveis} etapas={etapas} />
          </div>
        )}

        {/* Médias: Pontos, Colocação e Geral */}
        <MediasRelatorios resultados={resultados} etapas={etapas} categorias={categoriasCampeonato} />

        {/* Grid de Estatísticas de Pilotos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Pilotos Mais Penalizados */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white">
              <CardTitle className="flex items-center gap-3 text-lg">
                <AlertTriangle className="w-5 h-5" />
                Pilotos Mais Penalizados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <FiltroEtapaCategoria
                etapas={etapas}
                categorias={categoriasCampeonato}
                etapaValue={getCardFiltro('penalizados').etapa}
                onEtapaChange={(v) => setCardFiltro('penalizados', { etapa: v })}
                categoriaValue={getCardFiltro('penalizados').categoria}
                onCategoriaChange={(v) => setCardFiltro('penalizados', { categoria: v })}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Piloto</TableHead>
                    <TableHead className="font-bold text-center">Penalidades</TableHead>
                    <TableHead className="font-bold text-center">Pts Perdidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pilotosMaisPenalizados(filtrarPorCard(penalidades, 'penalizados')).map((item, index) => (
                    <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <TableCell className="font-semibold">{item.piloto}</TableCell>
                      <TableCell className="text-center"><Badge variant="destructive">{item.quantidade}</Badge></TableCell>
                      <TableCell className="text-center"><Badge className="bg-red-100 text-red-800">-{item.pontos_perdidos}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {pilotosMaisPenalizados(filtrarPorCard(penalidades, 'penalizados')).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-500">Sem dados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pilotos Mais Voltas Rápidas */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Zap className="w-5 h-5" />
                Pilotos com Mais Voltas Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <FiltroEtapaCategoria
                etapas={etapas}
                categorias={categoriasCampeonato}
                etapaValue={getCardFiltro('voltas').etapa}
                onEtapaChange={(v) => setCardFiltro('voltas', { etapa: v })}
                categoriaValue={getCardFiltro('voltas').categoria}
                onCategoriaChange={(v) => setCardFiltro('voltas', { categoria: v })}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Piloto</TableHead>
                    <TableHead className="font-bold text-center">Voltas Rápidas</TableHead>
                    <TableHead className="font-bold text-center">Pts Extras</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pilotosMaisVoltasRapidas(filtrarPorCard(resultadosVisiveis, 'voltas')).map((item, index) => (
                    <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <TableCell className="font-semibold">{item.piloto}</TableCell>
                      <TableCell className="text-center"><Badge className="bg-purple-100 text-purple-800">{item.quantidade}</Badge></TableCell>
                      <TableCell className="text-center"><Badge className="bg-purple-100 text-purple-800">+{item.pontos_extras}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {pilotosMaisVoltasRapidas(filtrarPorCard(resultadosVisiveis, 'voltas')).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-500">Sem dados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pilotos Mais Pódios */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Award className="w-5 h-5" />
                Pilotos com Mais Pódios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <FiltroEtapaCategoria
                etapas={etapas}
                categorias={categoriasCampeonato}
                etapaValue={getCardFiltro('podios').etapa}
                onEtapaChange={(v) => setCardFiltro('podios', { etapa: v })}
                categoriaValue={getCardFiltro('podios').categoria}
                onCategoriaChange={(v) => setCardFiltro('podios', { categoria: v })}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Piloto</TableHead>
                    <TableHead className="font-bold text-center">Pódios</TableHead>
                    <TableHead className="font-bold text-center">1º/2º/3º</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pilotosMaisPodios(filtrarPorCard(resultadosVisiveis, 'podios')).map((item, index) => (
                    <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <TableCell className="font-semibold">{item.piloto}</TableCell>
                      <TableCell className="text-center"><Badge className="bg-orange-100 text-orange-800">{item.podios}</Badge></TableCell>
                      <TableCell className="text-center text-sm">
                        <span className="text-yellow-600 font-bold">{item.primeiro}</span> / 
                        <span className="text-gray-500 font-bold">{item.segundo}</span> / 
                        <span className="text-orange-600 font-bold">{item.terceiro}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pilotosMaisPodios(filtrarPorCard(resultadosVisiveis, 'podios')).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-500">Sem dados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pilotos Mais Vitórias */}
          <Card className="shadow-lg">
            <CardHeader className="copa-gradient-gold text-white">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Crown className="w-5 h-5" />
                Pilotos com Mais Vitórias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <FiltroEtapaCategoria
                etapas={etapas}
                categorias={categoriasCampeonato}
                etapaValue={getCardFiltro('vitorias').etapa}
                onEtapaChange={(v) => setCardFiltro('vitorias', { etapa: v })}
                categoriaValue={getCardFiltro('vitorias').categoria}
                onCategoriaChange={(v) => setCardFiltro('vitorias', { categoria: v })}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Piloto</TableHead>
                    <TableHead className="font-bold text-center">Vitórias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pilotosMaisVitorias(filtrarPorCard(resultadosVisiveis, 'vitorias')).map((item, index) => (
                    <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <TableCell className="font-semibold flex items-center gap-2">
                        {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                        {item.piloto}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-yellow-100 text-yellow-800 font-bold text-base">{item.vitorias}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pilotosMaisVitorias(filtrarPorCard(resultadosVisiveis, 'vitorias')).length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center py-8 text-gray-500">Sem dados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Penalidades por Etapa */}
        <Card className="shadow-lg mt-6">
          <CardHeader className="bg-gradient-to-r from-red-700 to-red-800 text-white">
            <CardTitle className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6" />
              Relatório de Penalidades por Etapa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <FiltroEtapaCategoria
              etapas={etapas}
              categorias={categoriasCampeonato}
              etapaValue={getCardFiltro('penalidadesEtapa').etapa}
              onEtapaChange={(v) => setCardFiltro('penalidadesEtapa', { etapa: v })}
              categoriaValue={getCardFiltro('penalidadesEtapa').categoria}
              onCategoriaChange={(v) => setCardFiltro('penalidadesEtapa', { categoria: v })}
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Etapa</TableHead>
                  <TableHead className="font-bold text-center">Quantidade</TableHead>
                  <TableHead className="font-bold text-center">Pontos Totais Perdidos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorioPenalidades(filtrarPorCard(penalidades, 'penalidadesEtapa')).map((item, index) => (
                  <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <TableCell className="font-semibold">{item.etapa}</TableCell>
                    <TableCell className="text-center"><Badge variant="destructive">{item.quantidade}</Badge></TableCell>
                    <TableCell className="text-center"><Badge className="bg-red-100 text-red-800">-{item.pontos_totais} pts</Badge></TableCell>
                  </TableRow>
                ))}
                {relatorioPenalidades(filtrarPorCard(penalidades, 'penalidadesEtapa')).length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-500">Nenhuma penalidade registrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Resultados por Etapa */}
        <Card className="shadow-lg mt-6">
          <CardHeader className="copa-gradient-navy text-white">
            <CardTitle className="flex items-center gap-3">
              <Trophy className="w-6 h-6" />
              Relatório de Resultados por Etapa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <Select value={etapaFiltroResultado} onValueChange={setEtapaFiltroResultado}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Selecione uma etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Etapas (Resumo)</SelectItem>
                  {etapas.sort((a, b) => a.numero_etapa - b.numero_etapa).map(etapa => (
                    <SelectItem key={etapa.id} value={etapa.id}>
                      {etapa.numero_etapa}ª Etapa - {etapa.local || 'N/D'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoriasCampeonato.length > 0 && (
                <Select value={categoriaFiltroResultado} onValueChange={setCategoriaFiltroResultado}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas Categorias</SelectItem>
                    {categoriasCampeonato.map(cat => (
                      <SelectItem key={cat.id} value={cat.nome}>{cat.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {etapaFiltroResultado === "todas" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Etapa</TableHead>
                    <TableHead className="font-bold">Local</TableHead>
                    <TableHead className="font-bold text-center">Data</TableHead>
                    <TableHead className="font-bold text-center">Participantes</TableHead>
                    <TableHead className="font-bold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorioResultadosPorEtapa().map((item, index) => (
                    <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <TableCell className="font-semibold">{item.etapa}</TableCell>
                      <TableCell>{item.local || 'N/D'}</TableCell>
                      <TableCell className="text-center">{item.data}</TableCell>
                      <TableCell className="text-center"><Badge className="bg-blue-100 text-blue-800">{item.pilotos_participantes}</Badge></TableCell>
                      <TableCell className="text-center">
                        <Badge className={item.finalizada ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {item.finalizada ? "Finalizada" : "Em aberto"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {relatorioResultadosPorEtapa().length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Nenhum resultado registrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-center">Pos</TableHead>
                    <TableHead className="font-bold">Piloto</TableHead>
                    <TableHead className="font-bold text-center">Pontos Base</TableHead>
                    <TableHead className="font-bold text-center">MV</TableHead>
                    <TableHead className="font-bold text-center">Penalidades</TableHead>
                    <TableHead className="font-bold text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultadosDetalhadosEtapa().map((res, index) => (
                    <TableRow key={res.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <TableCell className="text-center font-bold text-lg">{res.posicao}º</TableCell>
                      <TableCell className="font-semibold">{res.piloto_nome}</TableCell>
                      <TableCell className="text-center"><Badge className="bg-green-100 text-green-800">{res.pontos}</Badge></TableCell>
                      <TableCell className="text-center"><Badge className="bg-purple-100 text-purple-800">+{res.pontos_melhor_volta || 0}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="destructive">-{res.pontos_penalidade || 0}</Badge></TableCell>
                      <TableCell className="text-center"><Badge className="bg-yellow-100 text-yellow-800 font-bold">{res.pontos_totais} pts</Badge></TableCell>
                    </TableRow>
                  ))}
                  {resultadosDetalhadosEtapa().length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Nenhum resultado registrado para esta etapa</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Etapas em Aberto */}
        <Card className="shadow-lg mt-6">
          <CardHeader className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white">
            <CardTitle className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              Etapas em Aberto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Etapa</TableHead>
                  <TableHead className="font-bold">Local</TableHead>
                  <TableHead className="font-bold text-center">Data</TableHead>
                  <TableHead className="font-bold text-center">Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {etapasEmAberto.map((item, index) => (
                  <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <TableCell className="font-semibold">{item.etapa}</TableCell>
                    <TableCell>{item.local || 'N/D'}</TableCell>
                    <TableCell className="text-center">{item.data}</TableCell>
                    <TableCell className="text-center">{item.hora}</TableCell>
                  </TableRow>
                ))}
                {etapasEmAberto.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">Todas as etapas foram finalizadas</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Relatório de Tipos de Ponto */}
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            Relatório por Tipo de Ponto
          </h2>
          <FiltroEtapaCategoria
            etapas={etapas}
            categorias={categoriasCampeonato}
            etapaValue={getCardFiltro('tiposPonto').etapa}
            onEtapaChange={(v) => setCardFiltro('tiposPonto', { etapa: v })}
            categoriaValue={getCardFiltro('tiposPonto').categoria}
            onCategoriaChange={(v) => setCardFiltro('tiposPonto', { categoria: v })}
          />
          {rankingPorTipo(filtrarPorCard(resultadosVisiveis, 'tiposPonto')).length === 0 && (
            <p className="text-center py-8 text-gray-500">Sem dados</p>
          )}
          {rankingPorTipo(filtrarPorCard(resultadosVisiveis, 'tiposPonto')).map(({ tipo, pilotos }) => (
              <Card key={tipo} className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-5">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="w-4 h-4" />
                    {tipo}
                    <Badge className="ml-auto bg-white/20 text-white text-sm">
                      {pilotos.reduce((s, p) => s + p.quantidade, 0)} aplicações no total
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-bold px-4">Pos</TableHead>
                        <TableHead className="font-bold px-4">Piloto</TableHead>
                        <TableHead className="font-bold text-center px-4">Aplicações</TableHead>
                        <TableHead className="font-bold text-center px-4">Total Pontos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pilotos.slice(0, 10).map((p, idx) => (
                        <TableRow key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <TableCell className="font-bold text-center px-4">{idx + 1}º</TableCell>
                          <TableCell className="font-semibold px-4">{p.piloto}</TableCell>
                          <TableCell className="text-center px-4">
                            <Badge className="bg-indigo-100 text-indigo-800 font-bold">{p.quantidade}x</Badge>
                          </TableCell>
                          <TableCell className="text-center px-4">
                            <Badge className={p.total >= 0 ? "bg-green-100 text-green-800 font-bold" : "bg-red-100 text-red-800 font-bold"}>
                              {p.total >= 0 ? '+' : ''}{p.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pts
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
          ))}
        </div>

        {/* Pior Resultado por Piloto */}
        <Card className="shadow-lg mt-6">
          <CardHeader className="bg-gradient-to-r from-gray-600 to-gray-700 text-white">
            <CardTitle className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6" />
              Pior Resultado de Cada Piloto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <FiltroEtapaCategoria
              etapas={etapas}
              categorias={categoriasCampeonato}
              etapaValue={getCardFiltro('piorResultado').etapa}
              onEtapaChange={(v) => setCardFiltro('piorResultado', { etapa: v })}
              categoriaValue={getCardFiltro('piorResultado').categoria}
              onCategoriaChange={(v) => setCardFiltro('piorResultado', { categoria: v })}
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Piloto</TableHead>
                  <TableHead className="font-bold text-center">Pior Posição</TableHead>
                  <TableHead className="font-bold">Etapa</TableHead>
                  <TableHead className="font-bold">Local</TableHead>
                  <TableHead className="font-bold text-center">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {piorResultadoPorPiloto(filtrarPorCard(resultadosVisiveis, 'piorResultado')).map((item, index) => (
                  <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <TableCell className="font-semibold">{item.piloto}</TableCell>
                    <TableCell className="text-center"><Badge variant="destructive" className="font-bold text-base">{item.pior_posicao}º</Badge></TableCell>
                    <TableCell>{item.etapa}</TableCell>
                    <TableCell>{item.local || 'N/D'}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-gray-100 text-gray-800">{item.pontos_totais} pts</Badge></TableCell>
                  </TableRow>
                ))}
                {piorResultadoPorPiloto(filtrarPorCard(resultadosVisiveis, 'piorResultado')).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Nenhum resultado registrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}