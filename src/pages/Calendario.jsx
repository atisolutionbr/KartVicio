import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, ChevronLeft, ChevronRight, Flag, Trophy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CampeonatoLogo from "@/components/campeonatos/CampeonatoLogo";
import SemAcessoCard from "@/components/SemAcessoCard";
import { filtrarCampeonatosAcessiveis, usuarioSemAcesso } from "@/utils/campeonatoAccess";

const Campeonato = base44.entities.Campeonato;
const Etapa = base44.entities.Etapa;

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function mesmaData(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function CalendarioPage({ userPermissions }) {
  const [campeonatos, setCampeonatos] = useState([]);
  const [allEtapas, setAllEtapas] = useState([]);
  const [campeonatoFiltro, setCampeonatoFiltro] = useState("all");
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(new Date().getMonth());

  useEffect(() => {
    Campeonato.list("-ano").then(list => {
      const acessiveis = filtrarCampeonatosAcessiveis(list, userPermissions);
      setCampeonatos(acessiveis);
      if (acessiveis.length > 0) {
        setAnoFiltro(acessiveis[0].ano || new Date().getFullYear());
      }
    });
  }, [userPermissions]);

  useEffect(() => {
    if (campeonatos.length === 0) return;
    setLoading(true);
    Promise.all(
      campeonatos.map(c => Etapa.filter({ campeonato_id: c.id }))
    ).then(resultados => {
      const todas = resultados.flat();
      setAllEtapas(todas);
      setLoading(false);
    });
  }, [campeonatos]);

  const anosDisponiveis = useMemo(() => {
    const anos = [...new Set(allEtapas.map(e => e.ano).filter(Boolean))].sort((a, b) => b - a);
    if (anos.length === 0) return [new Date().getFullYear()];
    return anos;
  }, [allEtapas]);

  const etapasFiltradas = useMemo(() => {
    return allEtapas.filter(e => {
      if (e.ano !== anoFiltro) return false;
      if (campeonatoFiltro !== "all" && e.campeonato_id !== campeonatoFiltro) return false;
      return true;
    });
  }, [allEtapas, anoFiltro, campeonatoFiltro]);

  // Etapas do mês exibido
  const etapasDoMes = useMemo(() => {
    return etapasFiltradas
      .filter(e => {
        const d = new Date(e.data_hora);
        return d.getMonth() === mesAtual && d.getFullYear() === anoFiltro;
      })
      .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
  }, [etapasFiltradas, mesAtual, anoFiltro]);

  // Grade do calendário
  const diasDoCalendario = useMemo(() => {
    const primeiroDia = new Date(anoFiltro, mesAtual, 1);
    const inicioSemana = primeiroDia.getDay();
    const diasNoMes = new Date(anoFiltro, mesAtual + 1, 0).getDate();
    const celulas = [];
    for (let i = 0; i < inicioSemana; i++) celulas.push(null);
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(anoFiltro, mesAtual, dia);
      const etapasDoDia = etapasFiltradas.filter(e => {
        const d = new Date(e.data_hora);
        return mesmaData(d, data);
      });
      celulas.push({ dia, etapas: etapasDoDia });
    }
    return celulas;
  }, [etapasFiltradas, mesAtual, anoFiltro]);

  const navegarMes = (delta) => {
    let novoMes = mesAtual + delta;
    let novoAno = anoFiltro;
    if (novoMes < 0) {
      novoMes = 11;
      novoAno--;
    } else if (novoMes > 11) {
      novoMes = 0;
      novoAno++;
    }
    setMesAtual(novoMes);
    if (novoAno !== anoFiltro) setAnoFiltro(novoAno);
  };

  const getCampInfo = (id) => campeonatos.find(c => c.id === id);
  const getCategoriaCor = (etapa) => {
    const camp = getCampInfo(etapa.campeonato_id);
    if (!camp?.categorias || !etapa.categoria) return null;
    return camp.categorias.find(cat => cat.nome === etapa.categoria)?.cor || null;
  };

  if (usuarioSemAcesso(userPermissions)) return <SemAcessoCard />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-blue-700" />
            Calendário de Etapas
          </h1>
          <p className="text-gray-600">Datas e locais de todas as etapas planejadas por campeonato</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={campeonatoFiltro} onValueChange={setCampeonatoFiltro}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Campeonato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Campeonatos</SelectItem>
              {campeonatos.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome} ({c.ano})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={anoFiltro.toString()} onValueChange={(v) => setAnoFiltro(parseInt(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anosDisponiveis.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <>
          {/* Navegação do mês */}
          <Card className="shadow-lg">
            <CardHeader className="copa-gradient-navy text-white py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-yellow-400" />
                  {MESES[mesAtual]} de {anoFiltro}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navegarMes(-1)}
                    className="text-white hover:bg-white/20"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setMesAtual(new Date().getMonth()); setAnoFiltro(new Date().getFullYear()); }}
                    className="text-yellow-300 hover:bg-white/20 text-xs font-bold"
                  >
                    Hoje
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navegarMes(1)}
                    className="text-white hover:bg-white/20"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              {/* Grade do calendário */}
              <div className="grid grid-cols-7 gap-1">
                {DIAS_SEMANA.map(d => (
                  <div key={d} className="text-center text-xs font-bold text-gray-500 py-2">
                    {d}
                  </div>
                ))}
                {diasDoCalendario.map((celula, i) => (
                  <div
                    key={i}
                    className={`min-h-[60px] sm:min-h-[90px] border rounded-lg p-1 ${
                      !celula
                        ? "bg-gray-50 border-gray-100"
                        : celula.etapas.length > 0
                        ? "bg-yellow-50 border-yellow-300"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    {celula && (
                      <>
                        <div className="text-xs font-bold text-gray-700 mb-1">{celula.dia}</div>
                        <div className="space-y-1">
                          {celula.etapas.slice(0, 2).map((etapa, idx) => {
                            const camp = getCampInfo(etapa.campeonato_id);
                            return (
                              <div
                                key={idx}
                                className="text-[10px] sm:text-xs px-1 py-0.5 rounded font-semibold truncate bg-blue-900 text-white"
                                title={`${etapa.numero_etapa}ª Etapa — ${etapa.local || 'N/D'} — ${camp?.nome || ''}`}
                              >
                                {etapa.numero_etapa}ª {etapa.local || ''}
                              </div>
                            );
                          })}
                          {celula.etapas.length > 2 && (
                            <div className="text-[10px] text-gray-500 font-semibold">
                              +{celula.etapas.length - 2}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lista detalhada das etapas do mês */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-700 text-white py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Flag className="w-5 h-5 text-yellow-400" />
                Etapas em {MESES[mesAtual]} ({etapasDoMes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {etapasDoMes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Nenhuma etapa planejada para {MESES[mesAtual]} de {anoFiltro}.
                </p>
              ) : (
                <div className="space-y-3">
                  {etapasDoMes.map((etapa, idx) => {
                    const camp = getCampInfo(etapa.campeonato_id);
                    const data = new Date(etapa.data_hora);
                    return (
                      <div
                        key={etapa.id || idx}
                        className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${
                          etapa.finalizada
                            ? "bg-green-50 border-green-500"
                            : "bg-yellow-50 border-yellow-500"
                        }`}
                      >
                        <div className="flex-shrink-0 text-center min-w-[48px]">
                          <div className="text-2xl font-bold text-gray-800">{data.getDate()}</div>
                          <div className="text-xs text-gray-500 uppercase">
                            {MESES[data.getMonth()].slice(0, 3)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className="bg-blue-900 text-white font-bold">
                              {etapa.numero_etapa}ª Etapa
                            </Badge>
                            {camp && (
                              <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                                <CampeonatoLogo campeonato={camp} size="sm" />
                                {camp.nome}
                              </span>
                            )}
                            {etapa.categoria && (
                              <span
                                className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                                style={{ backgroundColor: getCategoriaCor(etapa) || "#6b7280" }}
                              >
                                {etapa.categoria}
                              </span>
                            )}
                            <Badge className={etapa.finalizada ? "bg-green-200 text-green-800" : "bg-yellow-200 text-yellow-800"}>
                              {etapa.finalizada ? "Finalizada" : "Pendente"}
                            </Badge>
                            {etapa.dobrar_pontos && (
                              <Badge className="bg-purple-200 text-purple-800">2X Pontos</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-4 h-4 text-gray-400" />
                              {data.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                            </span>
                            <span className="font-semibold text-blue-700">
                              {data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {etapa.local && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                {etapa.local}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumo do ano */}
          <Card className="shadow-lg border-2 border-yellow-400/40">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Resumo de {anoFiltro}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-900">{etapasFiltradas.length}</div>
                  <div className="text-sm text-gray-600">Total de Etapas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {etapasFiltradas.filter(e => e.finalizada).length}
                  </div>
                  <div className="text-sm text-gray-600">Finalizadas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {etapasFiltradas.filter(e => !e.finalizada).length}
                  </div>
                  <div className="text-sm text-gray-600">Pendentes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-700">
                    {campeonatoFiltro === "all" ? campeonatos.length : 1}
                  </div>
                  <div className="text-sm text-gray-600">Campeonatos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}