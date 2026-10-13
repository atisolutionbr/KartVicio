import React, { useState, useEffect, useCallback } from "react";
import { Penalidade, Etapa, ResultadoEtapa } from "@/entities/all";
import { carregarDadosRanking, computarPontos } from '@/utils/rankingCalc';
import { carregarNomesVinculados } from '@/components/pilotos/vinculosPilotos';
import { base44 } from "@/api/base44Client";
import CampeonatoSelector from "@/components/campeonatos/CampeonatoSelector";
import SemAcessoCard from "@/components/SemAcessoCard";
import { filtrarCampeonatosAcessiveis, usuarioSemAcesso } from "@/utils/campeonatoAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Filter, Trash2 } from "lucide-react";
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
import PenalidadeForm from "../components/penalidades/PenalidadeForm";
import PenalidadeRowCard from "../components/penalidades/PenalidadeRowCard";
import { useEntitySubscriptions } from "@/hooks/useEntitySubscriptions";

const Campeonato = base44.entities.Campeonato;


export default function PenalidadesPage({ userPermissions }) {
  const [campeonatos, setCampeonatos] = useState([]);
  const [campeonatoId, setCampeonatoId] = useState("");
  const [penalidades, setPenalidades] = useState([]);
  const [pilotos, setPilotos] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPenalidade, setEditingPenalidade] = useState(null);
  const [filtroEtapa, setFiltroEtapa] = useState("all");
  const [anoFiltro, setAnoFiltro] = useState(null);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPenalidade, setSavingPenalidade] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [penalidadeParaExcluir, setPenalidadeParaExcluir] = useState(null);
  const submitLock = React.useRef(false);
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

  // Ao trocar campeonato, detecta anos disponíveis nas etapas
  useEffect(() => {
    if (!campeonatoId || campeonatos.length === 0) return;
    const camp = campeonatos.find(c => c.id === campeonatoId);
    const anoBase = camp?.ano || new Date().getFullYear();
    setFiltroEtapa("all");
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
  }, [campeonatoId, campeonatos]);

  const loadData = useCallback(async () => {
    if (!campeonatoId || !anoFiltro) return;
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const [pilotosData, etapasData, penalidadesData, inscricoesData] = await Promise.all([
        carregarNomesVinculados(campeonatoId),
        Etapa.filter({ campeonato_id: campeonatoId }),
        Penalidade.filter({ campeonato_id: campeonatoId }),
        base44.entities.InscricaoPiloto.filter({ campeonato_id: campeonatoId, ativo: true })
      ]);

      if (version !== loadVersion.current) return;
      const anos = [...new Set(etapasData.map(e => e.ano).filter(Boolean))].sort((a, b) => b - a);
      setAnosDisponiveis(anos);

      const etapasFiltradas = etapasData.filter(e => e.ano === anoFiltro);
      const etapaIds = new Set(etapasFiltradas.map(e => e.id));
      const penalidadesFiltradas = penalidadesData.filter(p => etapaIds.has(p.etapa_id));

      setPenalidades(penalidadesFiltradas);
      setPilotos(pilotosData.map(nome => ({ id: nome, nome, ativo: true })));
      setInscricoes(inscricoesData);
      setEtapas(etapasFiltradas.sort((a, b) => a.numero_etapa - b.numero_etapa));
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [campeonatoId, anoFiltro]);

  useEffect(() => {
    if (anoFiltro) loadData();
  }, [loadData, anoFiltro]);

  // Tempo real: recarrega quando penalidades, resultados, pilotos ou etapas mudam
  useEntitySubscriptions(
    loadData,
    ["Penalidade", "ResultadoEtapa", "Piloto", "InscricaoPiloto", "Etapa"],
    !!campeonatoId && !!anoFiltro
  );

  const recalcularResultados = async (etapaId, pilotoNome) => {
    const [page, etapa, dados] = await Promise.all([
      ResultadoEtapa.filter({ campeonato_id: campeonatoId, etapa_id: etapaId, piloto_nome: pilotoNome }, { limit: 50 }),
      Etapa.get(etapaId), carregarDadosRanking(campeonatoId),
    ]);
    if (!page.items.length) return;
    await ResultadoEtapa.bulkUpdate(page.items.map(resultado => ({
      id: resultado.id,
      ...computarPontos(resultado, etapa, dados.tabelaMap, dados.penalidadesPorChave),
    })));
  };

  const handleSubmit = async (penalidadeData) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSavingPenalidade(true);
    setSaveError('');
    try {
      if (!penalidadeData.etapa_id || !penalidadeData.piloto_nome) throw new Error('Selecione a etapa e o piloto.');
      if (editingPenalidade) {
        await Penalidade.update(editingPenalidade.id, penalidadeData);
      } else {
        await Penalidade.create({ ...penalidadeData, campeonato_id: campeonatoId });
      }
      await recalcularResultados(penalidadeData.etapa_id, penalidadeData.piloto_nome);
      if (editingPenalidade && (editingPenalidade.etapa_id !== penalidadeData.etapa_id || editingPenalidade.piloto_nome !== penalidadeData.piloto_nome)) {
        await recalcularResultados(editingPenalidade.etapa_id, editingPenalidade.piloto_nome);
      }
      setShowForm(false);
      setEditingPenalidade(null);
      await loadData();
    } catch (error) {
      setSaveError(error.message || 'Não foi possível salvar a penalidade.');
    } finally {
      submitLock.current = false;
      setSavingPenalidade(false);
    }
  };

  const handleEdit = (penalidade) => {
    setEditingPenalidade(penalidade);
    setShowForm(true);
  };

  const handleDelete = async (penalidade) => {
    try {
      // Guarda dados antes de excluir para recalcular depois
      const { etapa_id, piloto_nome } = penalidade;
      await Penalidade.delete(penalidade.id);
      await recalcularResultados(etapa_id, piloto_nome);
      await loadData();
    } catch (error) {
      console.error("Erro ao excluir penalidade:", error);
      alert("Erro ao excluir penalidade. Tente novamente.");
    }
  };

  const canEdit = userPermissions?.permissao === 'admin';
  const canCreate = canEdit || userPermissions?.permissao === 'operador';

  const penalidadesFiltradas = filtroEtapa === "all"
    ? penalidades
    : penalidades.filter(p => p.etapa_id === filtroEtapa);

  const getEtapaNome = (etapaId) => {
    const etapa = etapas.find(e => e.id === etapaId);
    return etapa ? `${etapa.numero_etapa}ª Etapa` : "N/A";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando penalidades...</p>
        </div>
      </div>
    );
  }

  const etapasAbertas = etapas.filter(e => !e.finalizada);
  const campeonatoAtual = campeonatos.find(c => c.id === campeonatoId);
  const categoriasCampeonato = campeonatoAtual?.categorias || [];

  if (usuarioSemAcesso(userPermissions)) return <SemAcessoCard />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⚠️ Gerenciar Penalidades</h1>
          <p className="text-gray-600">Registrar e acompanhar penalidades aplicadas</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <CampeonatoSelector
            campeonatos={campeonatos}
            value={campeonatoId}
            onChange={(v) => { setCampeonatoId(v); setFiltroEtapa("all"); }}
          />
          {canCreate && (
            <Button
              size="sm"
              onClick={() => { setEditingPenalidade(null); setShowForm(true); }}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Nova Penalidade</span>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
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
                {etapas.map(etapa => (
                  <SelectItem key={etapa.id} value={etapa.id}>
                    {etapa.numero_etapa}ª Etapa - {etapa.local || 'Local'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500 hidden md:inline-block">
              {penalidadesFiltradas.length} registros
            </span>
          </div>
        </CardContent>
      </Card>

      {saveError && <p role="alert" className="text-destructive">{saveError}</p>}
      {showForm && canCreate && (
        <PenalidadeForm
          penalidade={editingPenalidade}
          saving={savingPenalidade}
          pilotos={pilotos}
          etapas={etapasAbertas}
          inscricoes={inscricoes}
          categoriasCampeonato={categoriasCampeonato}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingPenalidade(null); }}
        />
      )}

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-700 to-red-800 text-white">
          <CardTitle className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            Penalidades Aplicadas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: cards */}
          {penalidadesFiltradas.length > 0 && (
            <div className="space-y-3 p-4 md:hidden">
              {penalidadesFiltradas.map(pen => (
                <PenalidadeRowCard
                  key={pen.id}
                  pen={pen}
                  etapaNome={getEtapaNome(pen.etapa_id)}
                  canEdit={canEdit}
                  onEdit={handleEdit}
                  onDelete={(penalidade) => setPenalidadeParaExcluir(penalidade)}
                />
              ))}
            </div>
          )}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold">Piloto</TableHead>
                  <TableHead className="font-bold text-center">Etapa</TableHead>
                  <TableHead className="font-bold text-center">Tipo</TableHead>
                  <TableHead className="font-bold text-center">Pontos</TableHead>
                  <TableHead className="font-bold text-center hidden md:table-cell">Pos. Inicial</TableHead>
                  <TableHead className="font-bold text-center hidden md:table-cell">Pos. Final</TableHead>
                  <TableHead className="font-bold hidden lg:table-cell">Observação</TableHead>
                  {canEdit && <TableHead className="font-bold text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {penalidadesFiltradas.map((pen, index) => (
                  <TableRow
                    key={pen.id}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-red-50 transition-colors`}
                  >
                    <TableCell className="font-semibold">{pen.piloto_nome}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{getEtapaNome(pen.etapa_id)}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={pen.tipo === 'tempo' ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}>
                        {pen.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive">-{pen.pontos_penalidade || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">{pen.posicao_inicial || '-'}</TableCell>
                    <TableCell className="text-center hidden md:table-cell">{pen.posicao_final || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate hidden lg:table-cell">{pen.observacao}</TableCell>
                    {canEdit && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(pen)}>
                            Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" title="Excluir penalidade">
                                <Trash2 className="w-3.5 h-3.5 sm:mr-1" />
                                <span className="hidden sm:inline">Excluir</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Penalidade</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a penalidade de <strong>{pen.piloto_nome}</strong> na <strong>{getEtapaNome(pen.etapa_id)}</strong>?
                                  <br /><br />
                                  Os pontos serão recalculados automaticamente (sem descontar esta penalidade). Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(pen)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir Penalidade
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {penalidadesFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 8 : 7} className="text-center py-8 text-gray-500">
                      Nenhuma penalidade registrada para o filtro selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(penalidadeParaExcluir)} onOpenChange={(open) => !open && setPenalidadeParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Penalidade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a penalidade de <strong>{penalidadeParaExcluir?.piloto_nome}</strong> na <strong>{penalidadeParaExcluir ? getEtapaNome(penalidadeParaExcluir.etapa_id) : ''}</strong>?
              <br /><br />
              Os pontos serão recalculados automaticamente (sem descontar esta penalidade). Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (penalidadeParaExcluir) handleDelete(penalidadeParaExcluir); setPenalidadeParaExcluir(null); }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Penalidade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}