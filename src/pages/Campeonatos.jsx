import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trophy, Settings, Users, Calendar, Star, Trash2 } from "lucide-react";
import CampeonatoForm from "@/components/campeonatos/CampeonatoForm";
import { Link } from "react-router-dom";
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

const Campeonato = base44.entities.Campeonato;
const ResultadoEtapa = base44.entities.ResultadoEtapa;
const Etapa = base44.entities.Etapa;
const InscricaoPiloto = base44.entities.InscricaoPiloto;
const Penalidade = base44.entities.Penalidade;
const TabelaPontosCampeonato = base44.entities.TabelaPontosCampeonato;
const LogAlteracao = base44.entities.LogAlteracao;

export default function CampeonatosPage({ userPermissions }) {
  const [campeonatos, setCampeonatos] = useState([]);
  const [stats, setStats] = useState({});
  const [anoFiltroStats, setAnoFiltroStats] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingCampeonato, setEditingCampeonato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allEtapas, setAllEtapas] = useState([]);
  const [allInscricoes, setAllInscricoes] = useState([]);

  const canEdit = userPermissions?.permissao === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [camps, etapas, inscricoes] = await Promise.all([
      Campeonato.list("-ano"),
      Etapa.list(),
      InscricaoPiloto.list()
    ]);
    setCampeonatos(camps);
    setAllEtapas(etapas);
    setAllInscricoes(inscricoes);

    // inicializar filtro de ano por campeonato com o ano atual
    const anoAtual = new Date().getFullYear();
    const anoInit = {};
    camps.forEach(c => { anoInit[c.id] = c.ano || anoAtual; });
    setAnoFiltroStats(anoInit);

    const statsMap = {};
    camps.forEach(c => {
      const anoRef = c.ano || anoAtual;
      const etapasCamp = etapas.filter(e => e.campeonato_id === c.id && e.ano === anoRef);
      const pilotosCamp = inscricoes.filter(i => i.campeonato_id === c.id && i.ativo);
      statsMap[c.id] = {
        etapas: etapasCamp.length,
        etapasFinalizadas: etapasCamp.filter(e => e.finalizada).length,
        pilotos: pilotosCamp.length
      };
    });
    setStats(statsMap);
    setLoading(false);
  };

  const handleAnoFiltroChange = (campId, ano) => {
    setAnoFiltroStats(prev => ({ ...prev, [campId]: parseInt(ano) }));
    const anoN = parseInt(ano);
    const etapasCamp = allEtapas.filter(e => e.campeonato_id === campId && e.ano === anoN);
    const pilotosCamp = allInscricoes.filter(i => i.campeonato_id === campId && i.ativo);
    setStats(prev => ({
      ...prev,
      [campId]: {
        etapas: etapasCamp.length,
        etapasFinalizadas: etapasCamp.filter(e => e.finalizada).length,
        pilotos: pilotosCamp.length
      }
    }));
  };

  const handleSubmit = async (data) => {
    if (editingCampeonato) {
      await Campeonato.update(editingCampeonato.id, data);
    } else {
      await Campeonato.create(data);
    }
    setShowForm(false);
    setEditingCampeonato(null);
    loadData();
  };

  const handleDeleteCampeonato = async (camp) => {
    // Elimina todos os rastros do campeonato (ordem respeita dependências)
    await ResultadoEtapa.deleteMany({ campeonato_id: camp.id });
    await Penalidade.deleteMany({ campeonato_id: camp.id });
    await Etapa.deleteMany({ campeonato_id: camp.id });
    await InscricaoPiloto.deleteMany({ campeonato_id: camp.id });
    await TabelaPontosCampeonato.deleteMany({ campeonato_id: camp.id });
    await LogAlteracao.deleteMany({ campeonato_id: camp.id });
    await Campeonato.delete(camp.id);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏆 Campeonatos</h1>
          <p className="text-gray-600">Gerencie todos os campeonatos do sistema</p>
        </div>
        {canEdit && (
          <Button
            onClick={() => { setEditingCampeonato(null); setShowForm(true); }}
            className="copa-gradient-gold hover:opacity-90 text-white shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Campeonato
          </Button>
        )}
      </div>

      {showForm && canEdit && (
        <CampeonatoForm
          campeonato={editingCampeonato}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingCampeonato(null); }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campeonatos.map(camp => (
          <Card key={camp.id} className="shadow-lg hover:shadow-xl transition-shadow border-0 overflow-hidden">
            <CardHeader className={`${camp.ativo ? 'copa-gradient-navy' : 'bg-gray-500'} text-white py-4 px-5`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-white leading-tight">{camp.nome}</CardTitle>
                  <p className="text-blue-200 text-sm mt-1">{camp.ano}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={camp.ativo ? "bg-green-400 text-green-900" : "bg-gray-400 text-gray-900"}>
                    {camp.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  {camp.descarte_ativo && (
                    <Badge className="bg-red-400 text-white text-xs">Com Descarte</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {camp.descricao && (
                <p className="text-gray-600 text-sm mb-4">{camp.descricao}</p>
              )}
              {/* Filtro de ano para este campeonato */}
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <Select
                  value={(anoFiltroStats[camp.id] || camp.ano)?.toString()}
                  onValueChange={(v) => handleAnoFiltroChange(camp.id, v)}
                >
                  <SelectTrigger className="h-7 text-xs w-28 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 5}, (_, i) => (camp.ano || 2024) - 1 + i).map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-400">Ano dos dados</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center bg-blue-50 rounded-lg p-2">
                  <Calendar className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-blue-700">{stats[camp.id]?.etapas || 0}</p>
                  <p className="text-xs text-blue-600">Etapas</p>
                </div>
                <div className="text-center bg-green-50 rounded-lg p-2">
                  <Star className="w-4 h-4 text-green-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-green-700">{stats[camp.id]?.etapasFinalizadas || 0}</p>
                  <p className="text-xs text-green-600">Finalizadas</p>
                </div>
                <div className="text-center bg-yellow-50 rounded-lg p-2">
                  <Users className="w-4 h-4 text-yellow-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-yellow-700">{stats[camp.id]?.pilotos || 0}</p>
                  <p className="text-xs text-yellow-600">Pilotos</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/Dashboard?campeonato=${camp.id}`} className="flex-1">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm" size="sm">
                    <Trophy className="w-4 h-4 mr-1" />
                    Ranking
                  </Button>
                </Link>
                <Link to={`/CampeonatoDetalhe?id=${camp.id}`}>
                  <Button variant="outline" size="sm" className="text-sm">
                    <Users className="w-4 h-4 mr-1" />
                    Gerir
                  </Button>
                </Link>
                {canEdit && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingCampeonato(camp); setShowForm(true); }}
                      title="Editar campeonato"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" title="Excluir campeonato e todos os dados">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Campeonato — Ação Irreversível</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir <strong>{camp.nome}</strong> ({camp.ano})?
                            <br /><br />
                            <strong>Todos os dados serão permanentemente removidos:</strong>
                            <br />• Todas as etapas cadastradas
                            <br />• Todos os resultados de pilotos
                            <br />• Todas as penalidades
                            <br />• Todas as inscrições de pilotos
                            <br />• Tabela de pontos do campeonato
                            <br />• Histórico de alterações relacionado
                            <br /><br />
                            Esta ação <strong>não pode ser desfeita</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCampeonato(camp)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir Tudo Permanentemente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {campeonatos.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-500">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-semibold">Nenhum campeonato cadastrado</p>
            <p className="text-sm mt-2">Crie o primeiro campeonato para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}