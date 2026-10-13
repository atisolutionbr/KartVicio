import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Share2, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { filtrarCampeonatosAcessiveis, usuarioSemAcesso } from "@/utils/campeonatoAccess";
import SemAcessoCard from "@/components/SemAcessoCard";
import CampeonatoCard from "@/components/campeonato-publico/CampeonatoCard";
import CampeonatoLogo from "@/components/campeonatos/CampeonatoLogo";
import RankingResumoTable from "@/components/campeonato-publico/RankingResumoTable";
import RankingDetalhadoTable from "@/components/campeonato-publico/RankingDetalhadoTable";
import RankingDescarteTable from "@/components/campeonato-publico/RankingDescarteTable";
import { calcularRankingComDescarte } from "@/utils/descarte";
import { carregarDadosRanking, recalcularResultados } from "@/utils/rankingCalc";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useExcelExport } from "@/hooks/useExcelExport";
import { useEntitySubscriptions } from "@/hooks/useEntitySubscriptions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Campeonato = base44.entities.Campeonato;
const Etapa = base44.entities.Etapa;
import carregarResultadosRanking from '@/components/ranking/carregarResultadosRanking';
import { valoresDistintos } from '@/components/pilotos/vinculosPilotos';

export default function CampeonatoPublicoPage({ userPermissions }) {
  const [campeonatos, setCampeonatos] = useState([]);
  const [etapasPorCampeonato, setEtapasPorCampeonato] = useState({});
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [etapasTodas, setEtapasTodas] = useState([]);
  const [resultadosTodas, setResultadosTodas] = useState([]);
  const [anoFiltro, setAnoFiltro] = useState(null);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState("todas");
  const [visao, setVisao] = useState("resumo");
  const [loading, setLoading] = useState(false);
  const [etapasFinalizadasPorCampeonato, setEtapasFinalizadasPorCampeonato] = useState({});
  const [pilotosPorCampeonato, setPilotosPorCampeonato] = useState({});
  const loadVersion = React.useRef(0);

  const carregarCatalogo = useCallback(async () => {
    const list = await Campeonato.list('-ano');
    const acessiveis = filtrarCampeonatosAcessiveis(list, userPermissions);
    const ids = acessiveis.map(c => c.id);
    const nomes = await valoresDistintos('Piloto', { ativo: true }, 'nome');
    const [statsEtapas, statsPilotos] = await Promise.all([
      Etapa.aggregate({ query: { campeonato_id: { $in: ids } }, groupBy: ['campeonato_id', 'finalizada'], limit: 1000 }),
      base44.entities.InscricaoPiloto.aggregate({ query: { campeonato_id: { $in: ids }, ativo: true, piloto_nome: { $in: nomes } }, groupBy: 'campeonato_id', countDistinct: 'piloto_nome', limit: 1000 }),
    ]);
    const totals = {}, finished = {};
    statsEtapas.rows.forEach(row => {
      totals[row.campeonato_id] = (totals[row.campeonato_id] || 0) + row.count;
      if (row.finalizada) finished[row.campeonato_id] = row.count;
    });
    setCampeonatos(acessiveis);
    setEtapasPorCampeonato(totals);
    setEtapasFinalizadasPorCampeonato(finished);
    setPilotosPorCampeonato(Object.fromEntries(statsPilotos.rows.map(row => [row.campeonato_id, row.count_distinct_piloto_nome])));
    if (!selecionado) setLoading(false);
  }, [userPermissions, selecionado]);
  useEffect(() => { carregarCatalogo(); }, [userPermissions]);
  // Catálogo só recarrega quando nenhum campeonato está aberto — evita
  // disparo duplo junto à subscrição de detalhe (ambos vigiavam Etapa).
  useEntitySubscriptions(carregarCatalogo, ['Campeonato', 'Etapa', 'InscricaoPiloto', 'Piloto'], !selecionado);

  const abrirCampeonato = (camp) => {
    setSelecionado(camp);
    setCategoriaAtiva('todas');
    setVisao('resumo');
    setAnoFiltro(null);
    setEtapasTodas([]);
    setResultadosTodas([]);
    setBase(null);
    setLoading(true);
  };

  // Base estável por campeonato/ano: etapas, anos, penalidades e tabela de pontos.
  // Não depende da categoria — evita refazer 3 chamadas a cada troca de categoria.
  const [base, setBase] = useState(null);

  const carregarBase = useCallback(async () => {
    if (!selecionado) return;
    const version = ++loadVersion.current;
    const [etapasData, anosPage, { penalidadesPorChave, tabelaMap }] = await Promise.all([
      Etapa.filter({ campeonato_id: selecionado.id, ...(anoFiltro ? { ano: anoFiltro } : {}) }, 'numero_etapa'),
      Etapa.filter({ campeonato_id: selecionado.id }, { distinct: 'ano', limit: 1000 }),
      carregarDadosRanking(selecionado.id),
    ]);
    if (version !== loadVersion.current) return;
    const anos = anosPage.items.map(Number).filter(Boolean).sort((a, b) => b - a);
    const anoBase = Number(selecionado.ano) || new Date().getFullYear();
    const ano = anoFiltro || (anos.includes(anoBase) ? anoBase : anos[0] || anoBase);
    const etapasAno = etapasData.filter(e => Number(e.ano) === ano);
    setEtapasTodas(etapasAno);
    setAnosDisponiveis(anos);
    if (!anoFiltro) setAnoFiltro(ano);
    setBase({ etapasAno, penalidadesPorChave, tabelaMap });
  }, [selecionado, anoFiltro]);

  // Resultados carregados uma única vez por campeonato/ano (sem filtro de
  // categoria no aggregate). A categoria é filtrada client-side em
  // construirRanking — evita disparar o aggregate (mais limitado) a cada
  // troca de categoria, principal causa do rate limit.
  const carregarResultados = useCallback(async () => {
    if (!selecionado || !base) return;
    const resultadosData = await carregarResultadosRanking(selecionado.id, base.etapasAno, {});
    setResultadosTodas(recalcularResultados(resultadosData, base.etapasAno, base.penalidadesPorChave, base.tabelaMap));
  }, [selecionado, base]);

  useEffect(() => { setLoading(true); carregarBase(); }, [carregarBase]);
  useEffect(() => {
    if (!base) return;
    setLoading(true);
    let active = true;
    carregarResultados().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [carregarResultados]);

  // Subscrições separadas: mudanças estruturais recarregam a base; mudanças de
  // resultado/penalidade recarregam só os resultados.
  useEntitySubscriptions(carregarBase, ['Etapa', 'TabelaPontos', 'TabelaPontosCampeonato'], !!selecionado);
  useEntitySubscriptions(carregarResultados, ['ResultadoEtapa', 'Penalidade'], !!selecionado && !!base);

  const categorias = selecionado?.categorias || [];

  // Etapas/resultados do ano selecionado — derivados, sem refetch.
  const etapas = useMemo(() => {
    const comResultados = new Set(resultadosTodas.map(r => r.etapa_id));
    return etapasTodas
      .filter(e => !anoFiltro || Number(e.ano) === anoFiltro)
      // Etapas com resultados entram imediatamente, mesmo antes da finalização.
      .filter(e => e.publicado !== false || e.finalizada || comResultados.has(e.id))
      .sort((a, b) => (a.numero_etapa || 0) - (b.numero_etapa || 0));
  }, [etapasTodas, anoFiltro, resultadosTodas]);

  const resultados = useMemo(() => {
    const etapaIds = new Set(etapas.map(e => e.id));
    return resultadosTodas.filter(r => etapaIds.has(r.etapa_id));
  }, [etapas, resultadosTodas]);

  const construirRanking = () => {
    if (!selecionado) return [];

    let validos = resultados.filter(r => !r.descartado);
    if (categoriaAtiva !== "todas") {
      validos = validos.filter(r => (r.categoria || "").trim() === categoriaAtiva.trim());
    }

    const etapaMap = new Map(etapas.map(e => [e.id, e]));

    const porPiloto = {};
    validos.forEach(r => {
      const arr = porPiloto[r.piloto_nome] || (porPiloto[r.piloto_nome] = []);
      arr.push(r);
    });

    const ranking = Object.entries(porPiloto).map(([piloto, resPiloto]) => {
      const pontos_totais = resPiloto.reduce((s, r) => s + (r.pontos_totais || 0), 0);
      const ordenadosPorEtapa = [...resPiloto].sort((a, b) => {
        const ea = etapaMap.get(a.etapa_id);
        const eb = etapaMap.get(b.etapa_id);
        return (ea?.numero_etapa || 0) - (eb?.numero_etapa || 0);
      });
      const recentes = ordenadosPorEtapa.slice(-4);
      while (recentes.length < 4) recentes.unshift(null);
      const porEtapa = {};
      resPiloto.forEach(r => { porEtapa[r.etapa_id] = r; });
      return { piloto, pontos_totais, recentes, porEtapa };
    });

    return ranking
      .sort((a, b) => b.pontos_totais - a.pontos_totais)
      .map((item, idx) => ({ ...item, posicao: idx + 1 }));
  };

  const rankingCalculado = useMemo(() => construirRanking(), [selecionado, etapas, resultados, categoriaAtiva]);

  const rankingDescarte = useMemo(() => {
    if (!selecionado) return [];
    return calcularRankingComDescarte({
      resultados,
      etapas,
      campeonato: selecionado,
      categoriaFiltro: categoriaAtiva
    });
  }, [selecionado, etapas, resultados, categoriaAtiva]);

  const { exportToPdf, exporting } = usePdfExport();
  const { exportToExcel } = useExcelExport();

  const gerarLinhasExport = () => (visao === "descarte" ? rankingDescarte : rankingCalculado).map(item => ({
    "Posição": item.posicao,
    "Piloto": item.piloto,
    "Pontos": item.pontos_totais.toFixed(1)
  }));

  const campeonatosFiltrados = campeonatos.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()));

  if (usuarioSemAcesso(userPermissions)) return <SemAcessoCard />;

  if (!selecionado) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">🏁 Campeonatos</h1>
          <p className="text-gray-600 text-sm sm:text-base">Acompanhe os campeonatos e veja o ranking por categoria.</p>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input placeholder="Pesquisar campeonatos..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {campeonatosFiltrados.map(camp => (
            <CampeonatoCard
              key={camp.id}
              campeonato={camp}
              totalEtapas={etapasPorCampeonato[camp.id] || 0}
              etapasFinalizadas={etapasFinalizadasPorCampeonato[camp.id] || 0}
              totalPilotos={pilotosPorCampeonato[camp.id] || 0}
              onClick={() => abrirCampeonato(camp)}
            />
          ))}
        </div>
        {loading && campeonatosFiltrados.length === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-36 rounded-2xl bg-white border shadow-md animate-pulse" />
            ))}
          </div>
        )}
        {!loading && campeonatosFiltrados.length === 0 && (
          <Card><CardContent className="py-16 text-center text-gray-500">Nenhum campeonato encontrado.</CardContent></Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setSelecionado(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <CampeonatoLogo campeonato={selecionado} size="md" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{selecionado.nome}</h1>
              <p className="text-xs sm:text-sm text-gray-500">
                {categorias.length > 0 ? `${categorias.length} categorias · ` : ""}{etapas.length} etapas · {anoFiltro || selecionado.ano}
              </p>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={exporting}>
              <Share2 className="w-4 h-4 mr-1" /> {exporting ? "Exportando..." : "Compartilhar"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportToPdf({ elementId: "campeonato-publico-export-area", filename: `${selecionado.nome}-ranking.pdf` })}>
              <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToExcel({ data: gerarLinhasExport(), filename: `${selecionado.nome}-ranking.xlsx` })}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToExcel({ data: gerarLinhasExport(), filename: `${selecionado.nome}-ranking.csv` })}>
              <FileText className="w-4 h-4 mr-2" /> Exportar CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="shadow-lg border-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap p-3 border-b bg-gray-50">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={categoriaAtiva === "todas" ? "default" : "outline"}
              onClick={() => setCategoriaAtiva("todas")}
              className={categoriaAtiva === "todas" ? "copa-gradient-navy text-white" : ""}
            >
              Todas
            </Button>
            {categorias.map(cat => (
              <Button
                key={cat.id}
                size="sm"
                variant={categoriaAtiva === cat.nome ? "default" : "outline"}
                onClick={() => setCategoriaAtiva(cat.nome)}
                style={categoriaAtiva === cat.nome ? { backgroundColor: cat.cor, color: "#fff" } : {}}
              >
                {cat.nome}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white rounded-lg border p-1">
            <Button size="sm" variant={visao === "resumo" ? "secondary" : "ghost"} onClick={() => setVisao("resumo")}>Resumo</Button>
            <Button size="sm" variant={visao === "detalhado" ? "secondary" : "ghost"} onClick={() => setVisao("detalhado")}>Detalhado</Button>
            <Button size="sm" variant={visao === "descarte" ? "secondary" : "ghost"} onClick={() => setVisao("descarte")} title="Aplica descarte conforme regra do campeonato">Descarte</Button>
          </div>
          {anosDisponiveis.length > 1 && (
            <Select value={(anoFiltro || "").toString()} onValueChange={v => setAnoFiltro(parseInt(v))}>
              <SelectTrigger className="w-24 h-9">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <CardContent className="p-0" id="campeonato-publico-export-area">
          <div className="flex items-center gap-3 p-4 border-b bg-white">
            <CampeonatoLogo campeonato={selecionado} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selecionado.nome}</h2>
              <p className="text-xs text-gray-500">{anoFiltro || selecionado.ano}{categoriaAtiva !== "todas" ? ` · ${categoriaAtiva}` : ""}</p>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500"></div>
            </div>
          ) : visao === "detalhado" ? (
            <RankingDetalhadoTable ranking={rankingCalculado} etapas={etapas} />
          ) : visao === "descarte" ? (
            <RankingDescarteTable
              ranking={rankingDescarte}
              etapas={etapas}
              campeonato={selecionado}
              temCategorias={categorias.length > 0}
            />
          ) : (
            <RankingResumoTable ranking={rankingCalculado} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}