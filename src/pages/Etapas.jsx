import React, { useState, useEffect, useCallback } from "react";
import { Etapa, ConfiguracaoTemporada } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, Filter, Lock, Unlock, Settings, Save, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CampeonatoSelector from "@/components/campeonatos/CampeonatoSelector";
import SemAcessoCard from "@/components/SemAcessoCard";
import { filtrarCampeonatosAcessiveis, usuarioSemAcesso } from "@/utils/campeonatoAccess";
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

import EtapaForm from "../components/etapas/EtapaForm";

const Campeonato = base44.entities.Campeonato;
const ResultadoEtapa = base44.entities.ResultadoEtapa;
const Penalidade = base44.entities.Penalidade;
const LogAlteracao = base44.entities.LogAlteracao;

export default function EtapasPage({ userPermissions }) {
  const [campeonatos, setCampeonatos] = useState([]);
  const [campeonatoId, setCampeonatoId] = useState("");
  const [etapas, setEtapas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState(null);
  const [anoFiltro, setAnoFiltro] = useState(null);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [configuracao, setConfiguracao] = useState(null);
  const [numeroEtapas, setNumeroEtapas] = useState(14);
  const [editandoConfig, setEditandoConfig] = useState(false);

  useEffect(() => {
    Campeonato.list("-ano").then(list => {
      const acessiveis = filtrarCampeonatosAcessiveis(list, userPermissions);
      setCampeonatos(acessiveis);
      if (acessiveis.length > 0) {
        setCampeonatoId(acessiveis[0].id);
      }
    });
  }, [userPermissions]);

  // Ao trocar campeonato, descobre os anos disponíveis nas etapas
  useEffect(() => {
    if (!campeonatoId) return;
    const camp = campeonatos.find(c => c.id === campeonatoId);
    const anoBase = camp?.ano || new Date().getFullYear();
    Etapa.filter({ campeonato_id: campeonatoId }).then(etapasData => {
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

  const loadEtapas = useCallback(async () => {
    if (!campeonatoId || !anoFiltro) return;
    const data = await Etapa.filter({ campeonato_id: campeonatoId });
    // Descobrir anos disponíveis
    const anos = [...new Set(data.map(e => e.ano).filter(Boolean))].sort((a, b) => b - a);
    setAnosDisponiveis(anos);
    // Filtrar pelo ano selecionado
    const filtradas = data.filter(e => e.ano === anoFiltro);
    setEtapas(filtradas.sort((a, b) => a.numero_etapa - b.numero_etapa));
  }, [campeonatoId, anoFiltro]);

  const loadConfiguracao = useCallback(async () => {
    const configs = await ConfiguracaoTemporada.filter({ ano: anoFiltro });
    if (configs.length > 0) {
      setConfiguracao(configs[0]);
      setNumeroEtapas(configs[0].numero_etapas);
    } else {
      setConfiguracao(null);
      setNumeroEtapas(14);
    }
    setEditandoConfig(false);
  }, [anoFiltro]);

  useEffect(() => {
    loadEtapas();
    loadConfiguracao();
  }, [loadEtapas, loadConfiguracao]);

  const handleSubmit = async (etapaData) => {
    if (editingEtapa) {
      await Etapa.update(editingEtapa.id, etapaData);
    } else {
      await Etapa.create({ ...etapaData, campeonato_id: campeonatoId });
    }
    setShowForm(false);
    setEditingEtapa(null);
    loadEtapas();
  };

  const handleToggleFinalizada = async (etapa) => {
    await Etapa.update(etapa.id, { finalizada: !etapa.finalizada });
    loadEtapas();
  };

  const handleTogglePublicado = async (etapa) => {
    await Etapa.update(etapa.id, { publicado: !etapa.publicado });
    loadEtapas();
  };

  const handleEdit = (etapa) => {
    setEditingEtapa(etapa);
    setShowForm(true);
  };

  const handleDeleteEtapa = async (etapa) => {
    // Remove resultados e penalidades vinculados à etapa, depois a própria etapa
    await ResultadoEtapa.deleteMany({ etapa_id: etapa.id });
    await Penalidade.deleteMany({ etapa_id: etapa.id });
    await LogAlteracao.deleteMany({ etapa_id: etapa.id });
    await Etapa.delete(etapa.id);
    loadEtapas();
  };

  const handleSaveConfiguracao = async () => {
    if (configuracao) {
      await ConfiguracaoTemporada.update(configuracao.id, { numero_etapas: numeroEtapas });
    } else {
      await ConfiguracaoTemporada.create({ ano: anoFiltro, numero_etapas: numeroEtapas });
    }
    loadConfiguracao();
  };
  
  const canEdit = userPermissions?.permissao === 'admin';
  const canCreate = canEdit || userPermissions?.permissao === 'operador';

  if (usuarioSemAcesso(userPermissions)) return <SemAcessoCard />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📅 Gerenciar Etapas</h1>
          <p className="text-gray-600">Calendário e controle das etapas da temporada</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <CampeonatoSelector campeonatos={campeonatos} value={campeonatoId} onChange={setCampeonatoId} />
          {canCreate && campeonatoId && (
            <Button 
              onClick={() => { setEditingEtapa(null); setShowForm(true); }}
              className="copa-gradient-gold hover:opacity-90 text-white shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Etapa
            </Button>
          )}
        </div>
      </div>

      {/* Configuração do Número de Etapas */}
      {canEdit && (
        <Card className="shadow-lg border-2 border-yellow-400">
          <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <Settings className="w-5 h-5" />
              Configuração da Temporada {anoFiltro}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Número Total de Etapas Planejadas:
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={numeroEtapas}
                    onChange={(e) => setNumeroEtapas(parseInt(e.target.value))}
                    disabled={!editandoConfig}
                    className="w-24"
                  />
                  {!editandoConfig ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditandoConfig(true)}
                    >
                      Editar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleSaveConfiguracao}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {configuracao ? 
                    `Configurado: ${configuracao.numero_etapas} etapas | Cadastradas: ${etapas.length} de ${configuracao.numero_etapas}` :
                    `Esta informação será usada para referência. Cadastradas: ${etapas.length} etapas`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <Select value={anoFiltro?.toString()} onValueChange={(value) => setAnoFiltro(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(anosDisponiveis.length > 0 ? anosDisponiveis : [anoFiltro]).filter(Boolean).map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">
              {etapas.length} etapas cadastradas
              {configuracao && ` de ${configuracao.numero_etapas}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {showForm && canCreate && (
        <EtapaForm
          etapa={editingEtapa}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingEtapa(null);
          }}
          categoriasCampeonato={campeonatos.find(c => c.id === campeonatoId)?.categorias || []}
        />
      )}

      <Card className="shadow-lg">
        <CardHeader className="copa-gradient-navy text-white">
          <CardTitle className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            Etapas da Temporada {anoFiltro}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold text-center">Etapa</TableHead>
                  <TableHead className="font-bold">Data e Hora</TableHead>
                  <TableHead className="font-bold">Local</TableHead>
                  {(campeonatos.find(c => c.id === campeonatoId)?.categorias || []).length > 0 && (
                    <TableHead className="font-bold text-center">Cat.</TableHead>
                  )}
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="font-bold text-center">Visível</TableHead>
                  <TableHead className="font-bold text-center">Pontos</TableHead>
                  {canEdit && <TableHead className="font-bold text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {etapas.map((etapa, index) => (
                  <TableRow 
                    key={etapa.id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                  >
                    <TableCell className="text-center">
                      <Badge className="bg-blue-100 text-blue-800 font-bold text-lg">
                        {etapa.numero_etapa}ª
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">
                        {new Date(etapa.data_hora).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(etapa.data_hora).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{etapa.local || '-'}</TableCell>
                    {(campeonatos.find(c => c.id === campeonatoId)?.categorias || []).length > 0 && (
                      <TableCell className="text-center">
                        {etapa.categoria ? (
                          <span className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                            style={{ backgroundColor: campeonatos.find(c => c.id === campeonatoId)?.categorias?.find(cat => cat.nome === etapa.categoria)?.cor || '#6b7280' }}>
                            {etapa.categoria}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Badge className={etapa.finalizada ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                        {etapa.finalizada ? "Finalizada" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={etapa.publicado ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-600"}>
                        {etapa.publicado ? "Publicada" : "Rascunho"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {etapa.dobrar_pontos && <Badge className="bg-purple-100 text-purple-800">2X</Badge>}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-center py-1 sm:py-3">
                        <div className="flex items-center gap-1 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(etapa)}
                            className="px-1.5 sm:px-3 text-xs"
                            title="Editar"
                          >
                            <span className="hidden sm:inline">Editar</span>
                            <Pencil className="w-3 h-3 sm:hidden" />
                          </Button>
                          <Button
                            variant={etapa.finalizada ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handleToggleFinalizada(etapa)}
                            className={`px-1.5 sm:px-3 text-xs ${etapa.finalizada ? "" : "bg-green-600 hover:bg-green-700"}`}
                            title={etapa.finalizada ? "Reabrir" : "Finalizar"}
                          >
                            {etapa.finalizada ? <Unlock className="w-3 h-3 sm:mr-1" /> : <Lock className="w-3 h-3 sm:mr-1" />}
                            <span className="hidden sm:inline">{etapa.finalizada ? "Reabrir" : "Finalizar"}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePublicado(etapa)}
                            className={`px-1.5 sm:px-3 text-xs ${etapa.publicado ? "border-blue-500 text-blue-700 hover:bg-blue-50" : "border-gray-400 text-gray-600 hover:bg-gray-100"}`}
                            title={etapa.publicado ? "Ocultar do painel público (Rascunho)" : "Publicar no painel Acompanhe"}
                          >
                            {etapa.publicado ? <Eye className="w-3 h-3 sm:mr-1" /> : <EyeOff className="w-3 h-3 sm:mr-1" />}
                            <span className="hidden sm:inline">{etapa.publicado ? "Publicada" : "Publicar"}</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="px-1.5 sm:px-3 text-xs"
                                title="Excluir etapa, resultados e penalidades"
                              >
                                <Trash2 className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">Excluir</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Etapa {etapa.numero_etapa}ª</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a <strong>{etapa.numero_etapa}ª Etapa</strong>?
                                  <br /><br />
                                  Serão removidos permanentemente:
                                  <br />• A etapa em si
                                  <br />• Todos os resultados de pilotos desta etapa
                                  <br />• Todas as penalidades desta etapa
                                  <br />• Histórico de alterações relacionado
                                  <br /><br />
                                  Esta ação <strong>não pode ser desfeita</strong>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEtapa(etapa)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir Permanentemente
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {etapas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={(campeonatos.find(c => c.id === campeonatoId)?.categorias || []).length > 0 ? (canEdit ? 8 : 7) : (canEdit ? 7 : 6)} className="text-center py-8 text-gray-500">
                      Nenhuma etapa cadastrada para {anoFiltro}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}