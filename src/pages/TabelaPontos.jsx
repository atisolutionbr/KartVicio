import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Target, Trophy, Layers } from "lucide-react";

const TabelaPontosCampeonato = base44.entities.TabelaPontosCampeonato;
const Campeonato = base44.entities.Campeonato;

export default function TabelaPontosPage({ userPermissions }) {
  const [campeonatos, setCampeonatos] = useState([]);
  const [campeonatoId, setCampeonatoId] = useState("");
  const [tabelaPontos, setTabelaPontos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editPosicao, setEditPosicao] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Campeonato.list("-ano").then(list => {
      setCampeonatos(list);
      if (list.length > 0) setCampeonatoId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!campeonatoId) return;
    loadTabelaPontos();
  }, [campeonatoId]);

  const loadTabelaPontos = async () => {
    setLoading(true);
    const data = await TabelaPontosCampeonato.filter({ campeonato_id: campeonatoId });
    setTabelaPontos(data.sort((a, b) => a.posicao - b.posicao));
    setLoading(false);
  };

  const handleCardClick = (posicao, item) => {
    if (!canCreate) return;
    setEditPosicao(posicao);
    setEditingItem(item || null);
    setEditValue(item ? item.pontos.toString() : "");
    setShowForm(true);
  };

  const handleSave = async () => {
    const pontos = parseInt(editValue);
    if (isNaN(pontos)) return;

    if (editingItem) {
      // Atualizar registro existente
      await TabelaPontosCampeonato.update(editingItem.id, { ...editingItem, pontos });
    } else {
      // Verificar se já existe para esta posição (evitar duplicatas)
      const existing = tabelaPontos.filter(tp => tp.posicao === editPosicao);
      if (existing.length > 0) {
        // Atualizar o existente em vez de criar novo
        await TabelaPontosCampeonato.update(existing[0].id, { ...existing[0], pontos });
        // Remover eventuais duplicatas extras
        for (let i = 1; i < existing.length; i++) {
          await TabelaPontosCampeonato.delete(existing[i].id);
        }
      } else {
        await TabelaPontosCampeonato.create({ campeonato_id: campeonatoId, posicao: editPosicao, pontos });
      }
    }
    setShowForm(false);
    setEditingItem(null);
    setEditPosicao(null);
    setEditValue("");
    loadTabelaPontos();
  };

  const canEdit = userPermissions?.permissao === 'admin';
  const canCreate = canEdit || userPermissions?.permissao === 'operador';

  const getPosicaoColor = (posicao) => {
    if (posicao === 1) return "bg-yellow-100 text-yellow-800 border-2 border-yellow-400";
    if (posicao === 2) return "bg-gray-100 text-gray-800 border-2 border-gray-400";
    if (posicao === 3) return "bg-orange-100 text-orange-800 border-2 border-orange-400";
    if (posicao <= 10) return "bg-green-100 text-green-800";
    return "bg-blue-100 text-blue-800";
  };

  const campeonatoAtual = campeonatos.find(c => c.id === campeonatoId);

  return (
    <div>
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Tabela de Pontuação</h1>
            <p className="text-gray-600">
              {campeonatoAtual ? `${campeonatoAtual.nome} (${campeonatoAtual.ano})` : "Selecione um campeonato"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-gray-500" />
            <Select value={campeonatoId} onValueChange={setCampeonatoId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Campeonato" />
              </SelectTrigger>
              <SelectContent>
                {campeonatos.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome} ({c.ano})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Inline edit form */}
        {showForm && canCreate && (
          <Card className="mb-6 border-2 border-yellow-400 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4">
                {editingItem ? "Editar" : "Configurar"} pontos para {editPosicao}º lugar
              </h3>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="Pontos"
                  className="border rounded-lg px-4 py-2 text-lg w-36 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  autoFocus
                />
                <Button onClick={handleSave} className="copa-gradient-gold text-white">Salvar</Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingItem(null); }}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <Card className="shadow-lg">
            <CardHeader className="copa-gradient-navy text-white">
              <CardTitle className="flex items-center gap-3">
                <Target className="w-6 h-6" />
                Pontuação por Posição ({tabelaPontos.length}/30)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
                {Array.from({length: 30}, (_, i) => {
                  const posicao = i + 1;
                  const item = tabelaPontos.find(tp => tp.posicao === posicao);
                  const isClickable = canCreate;
                  return (
                    <Card 
                      key={posicao} 
                      className={`transition-all duration-300 ${isClickable ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'} ${getPosicaoColor(posicao)}`}
                      onClick={() => handleCardClick(posicao, item)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                          {posicao === 1 && <Trophy className="w-6 h-6 text-yellow-600 mr-2" />}
                          <span className="text-2xl font-bold">{posicao}º</span>
                        </div>
                        <div className="text-lg font-semibold">
                          {item ? `${item.pontos} pts` : '0 pts'}
                        </div>
                        <div className="text-xs opacity-75 mt-1">
                          {item ? (canEdit ? 'Clique para editar' : 'Configurado') : (canCreate ? 'Clique para configurar' : 'Não configurado')}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Legenda de Cores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-400 rounded"></div>
                <span>1º Lugar (Ouro)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 border-2 border-gray-400 rounded"></div>
                <span>2º Lugar (Prata)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-200 border-2 border-orange-400 rounded"></div>
                <span>3º Lugar (Bronze)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-200 rounded"></div>
                <span>4º ao 10º</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}