import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ResultadoEtapa, Etapa } from "@/entities/all";
import { carregarDadosRanking, recalcularResultados, computarPontos } from '@/utils/rankingCalc';
import { carregarNomesVinculados } from '@/components/pilotos/vinculosPilotos';
import { base44, request } from "@/api/base44Client";
import CampeonatoSelector from "@/components/campeonatos/CampeonatoSelector";
import SemAcessoCard from "@/components/SemAcessoCard";
import { filtrarCampeonatosAcessiveis, usuarioSemAcesso } from "@/utils/campeonatoAccess";
import { useExcelExport } from "@/hooks/useExcelExport";
import { useEntitySubscriptions } from "@/hooks/useEntitySubscriptions";
const Campeonato = base44.entities.Campeonato;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Filter, Edit, Trash2, Undo, Download, Upload, FileText, AlertTriangle, Lock, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import ResultadoForm from "../components/resultados/ResultadoForm";
import ImportarDocumento from '../components/resultados/ImportarDocumento';
import ImportarCSV from "../components/resultados/ImportarCSV";
import PdfEtapa from "../components/resultados/PdfEtapa";
import HistoricoAlteracoes from "../components/resultados/HistoricoAlteracoes";
import FinalizarEtapa from "../components/resultados/FinalizarEtapa";
import EvolucaoPontosPanel from "../components/resultados/EvolucaoPontosPanel";
import ResultadoRowCard from "../components/resultados/ResultadoRowCard";
const LogAlteracao = base44.entities.LogAlteracao;

export default function ResultadosPage({ userPermissions }) {
  const [campeonatos, setCampeonatos] = useState([]);
  const [campeonatoId, setCampeonatoId] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [allResultados, setAllResultados] = useState([]);
  const [pilotos, setPilotos] = useState([]);
  const [resultadoParaExcluir, setResultadoParaExcluir] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [savingResultado, setSavingResultado] = useState(false);
  const [saveError, setSaveError] = useState('');
  const submitLock = React.useRef(false);
  const loadVersion = React.useRef(0);
  const [showForm, setShowForm] = useState(false);
  const [resultPage,setResultPage]=useState(0);
  const [showDocument,setShowDocument]=useState(false);
  const [deleteStage,setDeleteStage]=useState('');
  const [stageBusy,setStageBusy]=useState(false);
  const [stageError,setStageError]=useState('');
  const [showImportCSV, setShowImportCSV] = useState(false);
  const [showPdfEtapa, setShowPdfEtapa] = useState(false);
  const [editingResultado, setEditingResultado] = useState(null);
  const [filtroEtapa, setFiltroEtapa] = useState("all");
  const [filtroCategoria, setFiltroCategoria] = useState("all");
  const [anoFiltro, setAnoFiltro] = useState(null);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalcEtapaLoading, setRecalcEtapaLoading] = useState(false);
  const [buscaPiloto, setBuscaPiloto] = useState("");

  useEffect(()=>setResultPage(0),[campeonatoId,filtroEtapa,filtroCategoria,anoFiltro,buscaPiloto]);
  useEffect(() => {
    base44.auth.me().then(u => setUserInfo(u)).catch(() => {});
    Campeonato.list("-ano").then(list => {
      const acessiveis = filtrarCampeonatosAcessiveis(list, userPermissions);
      setCampeonatos(acessiveis);
      if (acessiveis.length > 0) {
        setCampeonatoId(acessiveis[0].id);
      }
    });
  }, [userPermissions]);

  // Ao trocar campeonato, pré-carrega etapas para descobrir anos disponíveis
  useEffect(() => {
    if (!campeonatoId) return;
    setFiltroEtapa("all");
    setFiltroCategoria("all");
    const camp = campeonatos.find(c => c.id === campeonatoId);
    const anoBase = camp?.ano || new Date().getFullYear();
    base44.entities.Etapa.filter({ campeonato_id: campeonatoId }).then(etapasData => {
      const anos = [...new Set(etapasData.map(e => e.ano).filter(Boolean))].sort((a, b) => b - a);
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
    const [resultadosRawData, etapasData, dadosRanking, inscricoesData, nomes] = await Promise.all([
      ResultadoEtapa.filter({ campeonato_id: campeonatoId, ano: anoFiltro }),
      Etapa.filter({ campeonato_id: campeonatoId }),
      carregarDadosRanking(campeonatoId),
      base44.entities.InscricaoPiloto.filter({ campeonato_id: campeonatoId, ativo: true }),
      carregarNomesVinculados(campeonatoId),
    ]);
    if (version !== loadVersion.current) return;
    const pilotosData = nomes.map(nome => ({ id: nome, nome, ativo: true }));
    const resultadosProcessados = recalcularResultados(resultadosRawData, etapasData, dadosRanking.penalidadesPorChave, dadosRanking.tabelaMap);

    // Descobrir anos disponíveis
    const anos = [...new Set(etapasData.map(e => e.ano).filter(Boolean))].sort((a, b) => b - a);
    setAnosDisponiveis(anos);

    // Filtrar etapas pelo ano selecionado
    const etapasFiltradas = etapasData.filter(e => e.ano === anoFiltro);
    const etapaIds = new Set(etapasFiltradas.map(e => e.id));
    const resultadosFiltradosAno = resultadosProcessados.filter(r => etapaIds.has(r.etapa_id));

    setAllResultados(resultadosFiltradosAno);
    setPilotos(pilotosData);
    setEtapas(etapasFiltradas);
    setInscricoes(inscricoesData);
    setLoading(false);
  }, [campeonatoId, anoFiltro]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tempo real: recarrega quando qualquer entidade relevante muda
  useEntitySubscriptions(
    loadData,
    ["ResultadoEtapa", "Penalidade", "Piloto", "InscricaoPiloto", "Etapa", "TabelaPontos", "TabelaPontosCampeonato"],
    !!campeonatoId && !!anoFiltro
  );

  const handleSubmit = async (resultadoData) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSavingResultado(true);
    setSaveError('');
    try {
    // Verificar duplicação: piloto + etapa
    const queryBase = { campeonato_id: campeonatoId, etapa_id: resultadoData.etapa_id, ...(editingResultado ? { id: { $ne: editingResultado.id } } : {}) };
    const { items: duplicados } = await ResultadoEtapa.filter({ ...queryBase, piloto_nome: resultadoData.piloto_nome }, { limit: 1 });
    const existingPiloto = duplicados[0];
    if (existingPiloto) {
      alert("Erro: Este piloto já possui um resultado lançado para esta etapa.");
      return;
    }

    const isSemColocacao = resultadoData.status === "NC" || resultadoData.status === "DQ";

    // Verificar duplicação: posição + etapa (mesma posição não pode ter dois pilotos)
    // Ignora NC/DQ (posicao=0) — múltiplos pilotos podem ter NC/DQ na mesma etapa
    if (!isSemColocacao) {
      const { items: ocupados } = await ResultadoEtapa.filter({ ...queryBase, posicao: resultadoData.posicao, status: { $nin: ['NC', 'DQ'] } }, { limit: 1 });
      const existingPosicao = ocupados[0];
      if (existingPosicao) {
        alert(`Erro: A posição ${resultadoData.posicao}º já está ocupada por ${existingPosicao.piloto_nome} nesta etapa.`);
        return;
      }
    }

    const etapaInfo = await Etapa.get(resultadoData.etapa_id);
    if (etapaInfo.campeonato_id !== campeonatoId || etapaInfo.finalizada) throw new Error('A etapa não está aberta neste campeonato.');
    if (!editingResultado) {
      const [pilotoAtivo, vinculoAtivo] = await Promise.all([
        base44.entities.Piloto.count({ nome: resultadoData.piloto_nome, ativo: true }),
        base44.entities.InscricaoPiloto.count({ campeonato_id: campeonatoId, piloto_nome: resultadoData.piloto_nome, ativo: true }),
      ]);
      if (!pilotoAtivo || !vinculoAtivo) throw new Error('Este piloto precisa estar ativo e vinculado ao campeonato.');
    }
    const dadosRanking = await carregarDadosRanking(campeonatoId);
    const dadosCompletos = {
      ...resultadoData,
      campeonato_id: campeonatoId,
      ano: Number(etapaInfo.ano),
      status: resultadoData.status || 'regular',
      ...computarPontos(resultadoData, etapaInfo, dadosRanking.tabelaMap, dadosRanking.penalidadesPorChave),
      ...(isSemColocacao ? { posicao: 0, tipos_ponto_aplicados: [] } : {}),
    };

    const nomeUsuario = userInfo?.full_name || userPermissions?.nome || "Sistema";
    const emailUsuario = userInfo?.email || userPermissions?.email || "";

    if (editingResultado) {
      await ResultadoEtapa.update(editingResultado.id, dadosCompletos);
      await LogAlteracao.create({
        entidade: "ResultadoEtapa", entidade_id: editingResultado.id,
        operacao: "editar",
        usuario_nome: nomeUsuario, usuario_email: emailUsuario,
        campeonato_id: campeonatoId,
        etapa_id: resultadoData.etapa_id,
        piloto_nome: resultadoData.piloto_nome,
        valor_anterior: JSON.stringify({ posicao: editingResultado.posicao, pontos_totais: editingResultado.pontos_totais }),
        valor_novo: JSON.stringify({ posicao: dadosCompletos.posicao, pontos_totais: dadosCompletos.pontos_totais }),
        descricao: `Resultado de ${resultadoData.piloto_nome} editado por ${nomeUsuario} (${editingResultado.posicao}º→${dadosCompletos.posicao}º, ${editingResultado.pontos_totais}→${dadosCompletos.pontos_totais} pts)`
      }).catch(() => {});
    } else {
      const novo = await ResultadoEtapa.create(dadosCompletos);
      await LogAlteracao.create({
        entidade: "ResultadoEtapa", entidade_id: novo?.id || "",
        operacao: "criar",
        usuario_nome: nomeUsuario, usuario_email: emailUsuario,
        campeonato_id: campeonatoId,
        etapa_id: resultadoData.etapa_id,
        piloto_nome: resultadoData.piloto_nome,
        valor_novo: JSON.stringify({ posicao: dadosCompletos.posicao, pontos_totais: dadosCompletos.pontos_totais }),
        descricao: `Resultado criado: ${resultadoData.piloto_nome} — ${dadosCompletos.posicao}º lugar, ${dadosCompletos.pontos_totais} pts — por ${nomeUsuario}`
      }).catch(() => {});
    }
    
    setShowForm(false);
    setEditingResultado(null);
    await loadData();
    } catch (error) {
      setSaveError(error.message || 'Não foi possível salvar o resultado.');
    } finally {
      submitLock.current = false;
      setSavingResultado(false);
    }
  };
  
  const handleDescartar = async (resultado) => {
    const novoDescartado = !resultado.descartado;
    await ResultadoEtapa.update(resultado.id, { descartado: novoDescartado });
    const nomeUsuario = userInfo?.full_name || userPermissions?.nome || "Sistema";
    await LogAlteracao.create({
      entidade: "ResultadoEtapa", entidade_id: resultado.id,
      operacao: "descartar",
      usuario_nome: nomeUsuario, usuario_email: userInfo?.email || "",
      campeonato_id: campeonatoId, etapa_id: resultado.etapa_id,
      piloto_nome: resultado.piloto_nome,
      descricao: `Resultado de ${resultado.piloto_nome} ${novoDescartado ? "descartado" : "reativado"} por ${nomeUsuario}`
    }).catch(() => {});
    loadData();
  };

  const handleDelete = async (resultado) => {
    await ResultadoEtapa.delete(resultado.id);
    const nomeUsuario = userInfo?.full_name || userPermissions?.nome || "Sistema";
    await LogAlteracao.create({
      entidade: "ResultadoEtapa", entidade_id: resultado.id,
      operacao: "excluir",
      usuario_nome: nomeUsuario, usuario_email: userInfo?.email || "",
      campeonato_id: campeonatoId, etapa_id: resultado.etapa_id,
      piloto_nome: resultado.piloto_nome,
      descricao: `Resultado de ${resultado.piloto_nome} excluído por ${nomeUsuario} (era ${resultado.posicao}º, ${resultado.pontos_totais} pts)`
    }).catch(() => {});
    loadData();
  };

  const handleEdit = (resultado) => {
    setEditingResultado(resultado);
    setShowForm(true);
  };

  // Recalcula pontos/penalidades/totalizadores de um resultado com base nos dados atuais
  // (tabela de pontos, dobrar_pontos da etapa, penalidades vigentes, tipos de ponto aplicados)
  const calcularDadosAtualizados = async (resultado) => {
    const [etapa, dados] = await Promise.all([Etapa.get(resultado.etapa_id), carregarDadosRanking(campeonatoId)]);
    const calculado = computarPontos(resultado, etapa, dados.tabelaMap, dados.penalidadesPorChave);
    return resultado.status === 'NC' || resultado.status === 'DQ'
      ? { ...calculado, posicao: 0, tipos_ponto_aplicados: [] }
      : calculado;
  };

  const handleRecalcular = async (resultado) => {
    const dados = await calcularDadosAtualizados(resultado);
    await ResultadoEtapa.update(resultado.id, dados);
    const nomeUsuario = userInfo?.full_name || userPermissions?.nome || "Sistema";
    await LogAlteracao.create({
      entidade: "ResultadoEtapa", entidade_id: resultado.id,
      operacao: "editar",
      usuario_nome: nomeUsuario, usuario_email: userInfo?.email || "",
      campeonato_id: campeonatoId, etapa_id: resultado.etapa_id,
      piloto_nome: resultado.piloto_nome,
      valor_anterior: JSON.stringify({ pontos_totais: resultado.pontos_totais }),
      valor_novo: JSON.stringify({ pontos_totais: dados.pontos_totais }),
      descricao: `Resultado de ${resultado.piloto_nome} recalculado por ${nomeUsuario} (${resultado.pontos_totais}→${dados.pontos_totais} pts)`
    }).catch(() => {});
    loadData();
  };

  const handleRecalcularEtapa = async () => {
    const etapaId = filtroEtapa !== "all" ? filtroEtapa : null;
    const alvos = etapaId ? allResultados.filter(r => r.etapa_id === etapaId) : allResultados;
    if (alvos.length === 0) return;
    setRecalcEtapaLoading(true);
    const dadosRanking = await carregarDadosRanking(campeonatoId);
    const etapaMap = Object.fromEntries(etapas.map(etapa => [etapa.id, etapa]));
    const atualizacoes = alvos.map(res => ({ id: res.id, ...computarPontos(res, etapaMap[res.etapa_id], dadosRanking.tabelaMap, dadosRanking.penalidadesPorChave) }));
    for (let i = 0; i < atualizacoes.length; i += 500) await ResultadoEtapa.bulkUpdate(atualizacoes.slice(i, i + 500));
    const nomeUsuario = userInfo?.full_name || userPermissions?.nome || "Sistema";
    const etapaInfo = etapaId ? etapas.find(e => e.id === etapaId) : null;
    await LogAlteracao.create({
      entidade: "ResultadoEtapa",
      operacao: "editar",
      usuario_nome: nomeUsuario, usuario_email: userInfo?.email || "",
      campeonato_id: campeonatoId, etapa_id: etapaId || "",
      descricao: `Etapa ${etapaInfo ? etapaInfo.numero_etapa + 'ª' : 'inteira'} recalculada por ${nomeUsuario} (${alvos.length} resultados atualizados)`
    }).catch(() => {});
    setRecalcEtapaLoading(false);
    loadData();
  };

  const handleImportCSV = async (rows) => {
    if(filtroEtapa==='all'){alert('Selecione uma etapa específica no filtro antes de importar.');return;}
    try { await request('/api/results/stage/import',{etapa_id:filtroEtapa,rows});setShowImportCSV(false);await loadData(); }
    catch(error){alert(error.message);}
  };
  
  const canEdit = userPermissions?.permissao === 'admin';
  const canCreate = canEdit || userPermissions?.permissao === 'operador';

  // Verifica se uma etapa está finalizada (travada)
  const etapaFinalizada = (etapaId) => {
    if (!etapaId || etapaId === "all") return false;
    return etapas.find(e => e.id === etapaId)?.finalizada === true;
  };
  const etapaAtualFinalizada = filtroEtapa !== "all" && etapaFinalizada(filtroEtapa);

  const { exportToExcel } = useExcelExport();

  const handleExportExcel = () => {
    const campAtual = campeonatos.find(c => c.id === campeonatoId);
    const data = resultadosFiltrados.map(r => {
      const etapa = etapas.find(e => e.id === r.etapa_id);
      return {
        Etapa: etapa ? `${etapa.numero_etapa}ª Etapa` : 'N/A',
        Categoria: r.categoria || etapa?.categoria || 'N/A',
        Posicao: r.posicao,
        Piloto: r.piloto_nome,
        PontosBase: r.pontos,
        MelhorVolta: r.pontos_melhor_volta || 0,
        TiposExtra: r.pontos_tipo_extra || 0,
        TiposDescricao: (r.tipos_ponto_aplicados || []).map(t => `${t.descricao}(${t.valor})`).join('; '),
        Penalidade: r.pontos_penalidade || 0,
        Total: r.pontos_totais,
        Descartado: r.descartado ? 'Sim' : 'Não'
      };
    });
    exportToExcel({ data, filename: `resultados-${campAtual?.nome || 'campeonato'}-${anoFiltro}` });
  };

  const etapasAbertas = etapas.filter(e => !e.finalizada).sort((a, b) => a.numero_etapa - b.numero_etapa);
  const etapasDisponiveis = [...etapas].sort((a, b) => a.numero_etapa - b.numero_etapa);
  const campeonatoAtual = campeonatos.find(c => c.id === campeonatoId);
  const categoriasCampeonato = campeonatoAtual?.categorias || [];
  const temCategorias = categoriasCampeonato.length > 0;

  const resultadosFiltrados = useMemo(() => {
    let res = allResultados;
    if (filtroEtapa !== "all") {
      res = res.filter(r => r.etapa_id === filtroEtapa);
    }
    if (temCategorias && filtroCategoria !== "all") {
      res = res.filter(r => r.categoria === filtroCategoria);
    }
    if (buscaPiloto.trim()) {
      const term = buscaPiloto.toLowerCase().trim();
      res = res.filter(r => r.piloto_nome.toLowerCase().includes(term));
    }
    return res.sort((a, b) => {
      const aSC = a.status === "NC" || a.status === "DQ";
      const bSC = b.status === "NC" || b.status === "DQ";
      if (aSC && !bSC) return 1;
      if (!aSC && bSC) return -1;
      return a.posicao - b.posicao;
    });
  }, [allResultados, filtroEtapa, filtroCategoria, temCategorias, buscaPiloto]);

  // Pilotos com penalidades na etapa filtrada
  const pilotsComPenalidade = useMemo(() => new Set(
    resultadosFiltrados.filter(r => (r.pontos_penalidade || 0) > 0).map(r => r.piloto_nome)
  ), [resultadosFiltrados]);
    
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando resultados...</p>
        </div>
      </div>
    );
  }

  if (usuarioSemAcesso(userPermissions)) return <SemAcessoCard />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏆 Resultados das Etapas</h1>
          <p className="text-gray-600">Registrar e gerenciar resultados</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <CampeonatoSelector campeonatos={campeonatos} value={campeonatoId} onChange={(v) => { setCampeonatoId(v); setFiltroEtapa("all"); }} />
          {canCreate && campeonatoId && <Button variant="outline" onClick={()=>setShowDocument(v=>!v)}>Importar imagem / PDF</Button>}
          {canEdit && filtroEtapa!=='all' && <Button variant="destructive" onClick={()=>{setDeleteStage(filtroEtapa);setStageError('');}}>Excluir resultados da etapa</Button>}
          {campeonatoId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="border-green-600 text-green-700 hover:bg-green-50 font-bold"
            >
              <Download className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
          )}
          {campeonatoId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowPdfEtapa(!showPdfEtapa); setShowImportCSV(false); setShowForm(false); }}
              className="border-orange-500 text-orange-700 hover:bg-orange-50 font-bold"
            >
              <FileText className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">PDF Etapa</span>
            </Button>
          )}
          {canCreate && campeonatoId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowImportCSV(!showImportCSV); setShowPdfEtapa(false); setShowForm(false); }}
              className="border-blue-600 text-blue-700 hover:bg-blue-50 font-bold"
            >
              <Upload className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Importar CSV</span>
            </Button>
          )}
          {canCreate && campeonatoId && allResultados.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalcularEtapa}
              disabled={recalcEtapaLoading}
              className="border-indigo-600 text-indigo-700 hover:bg-indigo-50 font-bold"
              title="Recalcular pontos, penalidades e totalizadores de todos os resultados visíveis"
            >
              <RefreshCw className={`w-4 h-4 sm:mr-1 ${recalcEtapaLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{recalcEtapaLoading ? "Recalculando..." : `Recalcular ${filtroEtapa !== "all" ? "Etapa" : "Tudo"}`}</span>
            </Button>
          )}
          {canCreate && campeonatoId && !etapaAtualFinalizada && (
            <Button 
              size="sm"
              onClick={() => { setEditingResultado(null); setShowForm(true); setShowImportCSV(false); setShowPdfEtapa(false); }}
              className="copa-gradient-gold hover:opacity-90 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Novo Resultado</span>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar piloto..."
                value={buscaPiloto}
                onChange={(e) => setBuscaPiloto(e.target.value)}
                className="pl-9"
              />
            </div>
            <Filter className="w-5 h-5 text-gray-500" />
            <Select value={anoFiltro?.toString()} onValueChange={(v) => { setAnoFiltro(parseInt(v)); setFiltroEtapa("all"); }}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(anosDisponiveis.length > 0 ? anosDisponiveis : [anoFiltro]).filter(Boolean).map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroEtapa} onValueChange={setFiltroEtapa}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Etapas</SelectItem>
                {etapasDisponiveis.map(etapa => (
                  <SelectItem key={etapa.id} value={etapa.id}>
                    {etapa.numero_etapa}ª Etapa - {etapa.local || 'N/D'}
                    {temCategorias && etapa.categoria ? ` [${etapa.categoria}]` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {temCategorias && (
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {categoriasCampeonato.map(cat => (
                    <SelectItem key={cat.id} value={cat.nome}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <span className="text-sm text-gray-500 hidden md:inline">
              {resultadosFiltrados.length} registros
            </span>
          </div>
        </CardContent>
      </Card>

      {saveError && <p role="alert" className="text-destructive">{saveError}</p>}
      {showForm && canCreate && (
        <ResultadoForm
          resultado={editingResultado}
          saving={savingResultado}
          pilotos={pilotos}
          etapas={etapasAbertas}
          allResultados={allResultados}
          inscricoes={inscricoes}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingResultado(null);
          }}
          userPermissions={userPermissions}
          categoriasCampeonato={categoriasCampeonato}
        />
      )}

      {resultadosFiltrados.length>30 && <div className="flex items-center gap-3"><Button variant="outline" disabled={resultPage===0} onClick={()=>setResultPage(p=>p-1)}>Anterior</Button><span>Página {resultPage+1} de {Math.ceil(resultadosFiltrados.length/30)}</span><Button variant="outline" disabled={(resultPage+1)*30>=resultadosFiltrados.length} onClick={()=>setResultPage(p=>p+1)}>Próxima</Button></div>}
      {showDocument && canCreate && <ImportarDocumento key={campeonatoId} etapas={etapas} pilotos={pilotos} bonusMelhorVolta={Number(campeonatos.find(c=>c.id===campeonatoId)?.pontos_melhor_volta)||0} onComplete={()=>{setShowDocument(false);loadData();}} onCancel={()=>setShowDocument(false)}/>}
      <AlertDialog open={Boolean(deleteStage)} onOpenChange={open=>{if(!open&&!stageBusy)setDeleteStage('');}}>
       <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir todos os resultados desta etapa?</AlertDialogTitle><AlertDialogDescription>Etapa {etapas.find(e=>e.id===deleteStage)?.numero_etapa}: todos os resultados e penalidades serão retirados do ranking. A etapa ficará aberta e não publicada. Pilotos e demais etapas serão mantidos.</AlertDialogDescription></AlertDialogHeader>
       {stageError&&<p role="alert" className="text-red-700">{stageError}</p>}
       <AlertDialogFooter><AlertDialogCancel disabled={stageBusy}>Cancelar</AlertDialogCancel><Button variant="destructive" disabled={stageBusy} onClick={async()=>{setStageBusy(true);setStageError('');try{await request('/api/results/stage/delete',{etapa_id:deleteStage,confirm:deleteStage});setDeleteStage('');await loadData();}catch(e){setStageError(e.message);}finally{setStageBusy(false);}}}>{stageBusy?'Excluindo…':'Confirmar exclusão completa'}</Button></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      {showImportCSV && canCreate && (
        <ImportarCSV
          pilotos={pilotos}
          etapa={filtroEtapa !== "all" ? etapas.find(e => e.id === filtroEtapa) : etapasAbertas[0]}
          onImport={handleImportCSV}
          onCancel={() => setShowImportCSV(false)}
        />
      )}

      {showPdfEtapa && (
        <PdfEtapa
          etapas={etapasDisponiveis}
          resultados={allResultados}
          campeonato={campeonatoAtual}
          onClose={() => setShowPdfEtapa(false)}
        />
      )}

      {/* Finalizar Etapa */}
      {campeonatoId && (
        <FinalizarEtapa
          etapas={etapasDisponiveis}
          resultados={allResultados}
          campeonato={campeonatoAtual}
          onEtapaFinalizada={loadData}
          userPermissions={userPermissions}
          userInfo={userInfo}
        />
      )}

      {/* Banner: etapa finalizada */}
      {etapaAtualFinalizada && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-300 rounded-lg px-4 py-3">
          <Lock className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-indigo-800 text-sm">Etapa Finalizada — Somente Leitura</p>
            <p className="text-xs text-indigo-600 mt-0.5">Esta etapa foi finalizada. Edição e exclusão estão travadas, mas você ainda pode descartar/reativar resultados manualmente.</p>
          </div>
        </div>
      )}

      {/* Banner de aviso: pilotos com penalidades na visão atual */}
      {pilotsComPenalidade.size > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-lg px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700 text-sm">
              {pilotsComPenalidade.size} piloto(s) com penalidade ativa nesta visualização:
            </p>
            <p className="text-sm text-red-600 mt-0.5">
              {Array.from(pilotsComPenalidade).join(" • ")}
            </p>
            <p className="text-xs text-red-400 mt-1">Pontos penalizados já estão descontados no total.</p>
          </div>
        </div>
      )}

      {/* Painel de gráficos — evolução da pontuação */}
      {allResultados.length > 0 && (
        <EvolucaoPontosPanel
          resultados={allResultados}
          etapas={etapasDisponiveis}
          campeonatoNome={campeonatoAtual?.nome}
        />
      )}

      <Card className="shadow-lg">
        <CardHeader className="copa-gradient-navy text-white">
          <CardTitle className="flex items-center gap-3">
            <Trophy className="w-6 h-6" />
            Resultados Registrados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: cards */}
          {resultadosFiltrados.length > 0 && (
            <div className="space-y-3 p-4 md:hidden">
              {resultadosFiltrados.slice(resultPage*30,(resultPage+1)*30).map(res => {
                const etapa = etapas.find(e => e.id === res.etapa_id);
                return (
                  <ResultadoRowCard
                    key={res.id}
                    res={res}
                    etapa={etapa}
                    categoriasCampeonato={categoriasCampeonato}
                    temCategorias={temCategorias}
                    canEdit={canEdit}
                    onDescartar={handleDescartar}
                    onRecalcular={handleRecalcular}
                    onEdit={handleEdit}
                    onDelete={(resultado) => setResultadoParaExcluir(resultado)}
                  />
                );
              })}
            </div>
          )}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold text-center">Pos</TableHead>
                  <TableHead className="font-bold">Piloto</TableHead>
                  {temCategorias && <TableHead className="font-bold text-center">Cat.</TableHead>}
                  <TableHead className="font-bold text-center hidden md:table-cell">Etapa</TableHead>
                  <TableHead className="font-bold text-center">Pontos Base</TableHead>
                  <TableHead className="font-bold text-center">MV</TableHead>
                  <TableHead className="font-bold text-center hidden lg:table-cell">Tipos Extra</TableHead>
                  <TableHead className="font-bold text-center">Pen.</TableHead>
                  <TableHead className="font-bold text-center">Total</TableHead>
                  {canEdit && <TableHead className="font-bold text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultadosFiltrados.slice(resultPage*30,(resultPage+1)*30).map((res, index) => {
                   const etapa = etapas.find(e => e.id === res.etapa_id);
                   const temPenalidade = (res.pontos_penalidade || 0) > 0;
                   const rowClass = res.descartado
                     ? "opacity-50 bg-gray-200"
                     : temPenalidade
                     ? "bg-red-50 border-l-4 border-red-400"
                     : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50');
                  
                  return (
                    <TableRow 
                      key={res.id} 
                      className={`${rowClass} hover:bg-blue-50 transition-colors`}
                    >
                      <TableCell className="text-center font-bold">
                        {res.status === "NC" ? (
                          <Badge className="bg-orange-200 text-orange-900 font-bold">NC</Badge>
                        ) : res.status === "DQ" ? (
                          <Badge className="bg-red-200 text-red-900 font-bold">DQ</Badge>
                        ) : (
                          <span className={res.descartado ? 'line-through' : ''}>{res.posicao}º</span>
                        )}
                      </TableCell>
                      <TableCell className={`font-semibold ${res.descartado ? 'line-through' : ''}`}>
                        <div className="flex items-center gap-2">
                          {res.piloto_nome}
                          {temPenalidade && !res.descartado && (
                            <Badge className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 font-bold">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Pen.
                            </Badge>
                          )}
                          {(res.status === "NC" || res.status === "DQ") && (
                            <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                              No grid
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {temCategorias && (
                        <TableCell className="text-center">
                          {res.categoria ? (
                            <span className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                              style={{ backgroundColor: categoriasCampeonato.find(c => c.nome === res.categoria)?.cor || '#6b7280' }}>
                              {res.categoria}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </TableCell>
                      )}
                      <TableCell className="text-center hidden md:table-cell">
                        <Badge variant="outline" className={res.descartado ? 'line-through' : ''}>
                          {etapa ? `${etapa.numero_etapa}ª Etapa` : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`bg-green-100 text-green-800 ${res.descartado ? 'line-through' : ''}`}>
                          {res.pontos}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`bg-purple-100 text-purple-800 ${res.descartado ? 'line-through' : ''}`}>
                          +{res.pontos_melhor_volta || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {(res.tipos_ponto_aplicados?.length > 0) ? (
                          <div className="flex flex-col gap-1 items-center">
                            {res.tipos_ponto_aplicados.map((tp, i) => (
                              <Badge key={i} className={`text-xs ${parseFloat(tp.valor) >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                {tp.descricao} ({parseFloat(tp.valor) >= 0 ? '+' : ''}{tp.valor})
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" className={res.descartado ? 'line-through' : ''}>
                          -{res.pontos_penalidade || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`bg-yellow-100 text-yellow-800 font-bold ${res.descartado ? 'line-through' : ''}`}>
                          {res.pontos_totais} pts
                        </Badge>
                      </TableCell>
                      {canEdit && (
                       <TableCell className="text-center p-1 sm:p-2">
                         <div className="flex items-center gap-1 justify-center flex-wrap">
                           {etapa?.finalizada && (
                             <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-300">
                               <Lock className="w-2.5 h-2.5 mr-1" />Travado
                             </Badge>
                           )}
                           <Button
                             variant={res.descartado ? "default" : "secondary"}
                             size="sm"
                             onClick={() => handleDescartar(res)}
                             className={`px-1.5 sm:px-3 text-xs ${res.descartado ? "bg-green-600 hover:bg-green-700" : ""}`}
                             title={res.descartado ? "Reativar" : "Descartar manualmente (funciona mesmo com etapa travada)"}
                           >
                             {res.descartado ? <Undo className="w-3 h-3 sm:mr-1" /> : <Trash2 className="w-3 h-3 sm:mr-1" />}
                             <span className="hidden sm:inline">{res.descartado ? "Reativar" : "Descartar"}</span>
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleRecalcular(res)}
                             className="px-1.5 sm:px-3 text-xs border-indigo-500 text-indigo-700 hover:bg-indigo-50"
                             title="Recalcular pontos, penalidades e totalizadores deste resultado"
                           >
                             <RefreshCw className="w-3 h-3 sm:mr-1" />
                             <span className="hidden sm:inline">Recalcular</span>
                           </Button>
                           {!etapa?.finalizada && (
                             <>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => handleEdit(res)}
                                 className="px-1.5 sm:px-3 text-xs"
                                 title="Editar"
                               >
                                 <Edit className="w-3 h-3 sm:mr-1" />
                                 <span className="hidden sm:inline">Editar</span>
                               </Button>
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <Button
                                     variant="destructive"
                                     size="sm"
                                     className="px-1.5 sm:px-3 text-xs"
                                     title="Excluir"
                                   >
                                     <Trash2 className="w-3 h-3 sm:mr-1" />
                                     <span className="hidden sm:inline">Excluir</span>
                                   </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
                                   <AlertDialogHeader>
                                     <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                     <AlertDialogDescription>
                                       Tem certeza que deseja excluir permanentemente o resultado de <strong>{res.piloto_nome}</strong> na <strong>{etapa ? `${etapa.numero_etapa}ª Etapa` : 'etapa'}</strong>?
                                       <br /><br />
                                       Esta ação não pode ser desfeita.
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                     <AlertDialogAction
                                       onClick={() => handleDelete(res)}
                                       className="bg-red-600 hover:bg-red-700"
                                     >
                                       Excluir Permanentemente
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             </>
                           )}
                         </div>
                       </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {resultadosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 9 : 8} className="text-center py-8 text-gray-500">
                      Nenhum resultado registrado para este filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Histórico de Alterações */}
      {campeonatoId && (
        <HistoricoAlteracoes campeonatoId={campeonatoId} etapaId={filtroEtapa} />
      )}

      <AlertDialog open={Boolean(resultadoParaExcluir)} onOpenChange={(open) => !open && setResultadoParaExcluir(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente o resultado de <strong>{resultadoParaExcluir?.piloto_nome}</strong> na <strong>{resultadoParaExcluir ? `${etapas.find(e => e.id === resultadoParaExcluir.etapa_id)?.numero_etapa || ''}ª Etapa` : ''}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (resultadoParaExcluir) handleDelete(resultadoParaExcluir); setResultadoParaExcluir(null); }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}