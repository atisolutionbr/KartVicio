import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, X, Save, Ban, Flag } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const TipoPontoEntity = base44.entities.TipoPonto;

export default function ResultadoForm({ resultado, pilotos, etapas, allResultados, onSubmit, onCancel, userPermissions: _userPermissions, categoriasCampeonato = [], inscricoes = [], saving = false }) {
  const [tiposPonto, setTiposPonto] = useState([]);
  const temCategorias = categoriasCampeonato.length > 0;
  const [formData, setFormData] = useState(resultado || {
    ano: new Date().getFullYear(),
    etapa_id: "",
    piloto_nome: "",
    categoria: "",
    status: "regular",
    posicao: 1,
    pontos_melhor_volta: 0,
    tipos_ponto_aplicados: [],
    descartado: false
  });

  const isEditing = !!resultado;
  const isSemColocacao = formData.status === "NC" || formData.status === "DQ";
  const wasOriginallySC = !!(resultado && (resultado.status === "NC" || resultado.status === "DQ"));

  useEffect(() => {
    TipoPontoEntity.list().then(list => setTiposPonto(list.filter(t => t.ativo !== false)));
  }, []);

  // Auto-fill categoria when etapa changes
  useEffect(() => {
    if (!isEditing && formData.etapa_id && temCategorias) {
      const etapa = etapas.find(e => e.id === formData.etapa_id);
      if (etapa?.categoria) {
        setFormData(prev => ({ ...prev, categoria: etapa.categoria, piloto_nome: '' }));
      }
    }
  }, [formData.etapa_id, isEditing, temCategorias]);

  // Pilotos: sempre apenas os inscritos no campeonato; por categoria da etapa quando aplicável
  const pilotosFiltrados = useMemo(() => {
    if (isEditing) return pilotos;
    // Restringe aos pilotos inscritos no campeonato (quando há inscrições)
    const nomesInscritos = new Set(inscricoes.filter(i => i.ativo === true).map(i => i.piloto_nome));
    let base = pilotos.filter(p => p.ativo === true && nomesInscritos.has(p.nome));
    // Se há categorias e uma categoria selecionada, filtra pelos inscritos nessa categoria
    if (temCategorias && formData.categoria) {
      const nomesNaCategoria = new Set(
        inscricoes.filter(i => (i.categorias || []).includes(formData.categoria)).map(i => i.piloto_nome)
      );
      base = base.filter(p => nomesNaCategoria.has(p.nome));
    }
    return base;
  }, [formData.etapa_id, formData.categoria, pilotos, inscricoes, isEditing, temCategorias]);

  const { availablePilotos, availablePosicoes } = useMemo(() => {
    if (!formData.etapa_id) {
      return {
        availablePilotos: pilotosFiltrados,
        availablePosicoes: Array.from({ length: 20 }, (_, i) => i + 1)
      };
    }
    // Exclui resultados NC/DQ e o próprio resultado sendo editado da lista de ocupados
    const etapaResultados = allResultados.filter(r =>
      r.etapa_id === formData.etapa_id && r.id !== resultado?.id
    );
    const usedPilotos = etapaResultados.map(r => r.piloto_nome);
    const usedPosicoes = etapaResultados
      .filter(r => r.status !== "NC" && r.status !== "DQ")
      .map(r => r.posicao)
      .filter(p => p > 0);
    return {
      availablePilotos: isEditing
        ? pilotosFiltrados
        : pilotosFiltrados.filter(p => !usedPilotos.includes(p.nome)),
      availablePosicoes: Array.from({ length: 20 }, (_, i) => i + 1).filter(pos => !usedPosicoes.includes(pos))
    };
  }, [formData.etapa_id, pilotosFiltrados, allResultados, isEditing, resultado]);

  const tiposAplicados = formData.tipos_ponto_aplicados || [];

  const addTipo = (tipoId) => {
    if (!tipoId) return;
    const tipo = tiposPonto.find(t => t.id === tipoId);
    if (!tipo) return;
    const novaLista = [...tiposAplicados, { tipo_id: tipo.id, descricao: tipo.descricao, valor: tipo.valor }];
    setFormData({ ...formData, tipos_ponto_aplicados: novaLista });
  };

  const removeTipo = (idx) => {
    const novaLista = tiposAplicados.filter((_, i) => i !== idx);
    setFormData({ ...formData, tipos_ponto_aplicados: novaLista });
  };

  const totalTiposExtra = tiposAplicados.reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.etapa_id || !formData.piloto_nome) {
      alert("Por favor, selecione a etapa e o piloto.");
      return;
    }
    if (temCategorias && !formData.categoria) {
      alert("Por favor, selecione a categoria.");
      return;
    }
    if (!isSemColocacao && (!formData.posicao || parseInt(formData.posicao) <= 0)) {
      alert("Por favor, selecione a posição final do piloto.");
      return;
    }
    if (isSemColocacao) {
      // NC/DQ: registra participação no grid, sem colocação e sem pontos
      onSubmit({
        ...formData,
        status: formData.status,
        posicao: 0,
        pontos_melhor_volta: 0,
        tipos_ponto_aplicados: [],
        pontos_tipo_extra: 0
      });
      return;
    }
    onSubmit({
      ...formData,
      status: formData.status || "regular",
      posicao: parseInt(formData.posicao),
      pontos_melhor_volta: parseFloat(formData.pontos_melhor_volta || 0),
      tipos_ponto_aplicados: tiposAplicados,
      pontos_tipo_extra: totalTiposExtra
    });
  };

  const formatValor = (v) => {
    const n = parseFloat(v);
    return (n >= 0 ? "+" : "") + n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const etapaSelecionada = etapas.find(e => e.id === formData.etapa_id);

  return (
    <Card className="mb-6 shadow-lg border-2 border-yellow-200">
      <CardHeader className="copa-gradient-gold text-white">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          {isEditing ? "Editar Resultado" : "Registrar Novo Resultado"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Etapa */}
            <div className="space-y-2">
              <Label>Etapa *</Label>
              <Select
                value={formData.etapa_id}
                onValueChange={(value) => {
                  const etapa = etapas.find(e => e.id === value);
                  setFormData({
                    ...formData,
                    etapa_id: value,
                    piloto_nome: '',
                    categoria: etapa?.categoria || formData.categoria,
                    posicao: 1
                  });
                }}
                required
                disabled={isEditing}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
                <SelectContent>
                  {etapas.map(etapa => (
                    <SelectItem key={etapa.id} value={etapa.id}>
                      {etapa.numero_etapa}ª Etapa - {new Date(etapa.data_hora).toLocaleDateString()}
                      {temCategorias && etapa.categoria ? ` [${etapa.categoria}]` : ''}
                    </SelectItem>
                  ))}
                  {etapas.length === 0 && <SelectItem disabled value="__none__">Nenhuma etapa aberta</SelectItem>}
                </SelectContent>
              </Select>
              {isEditing && <p className="text-xs text-gray-500">Não é possível alterar a etapa de um resultado existente.</p>}
            </div>

            {/* Piloto */}
            <div className="space-y-2">
              <Label>Piloto *</Label>
              <Select
                value={formData.piloto_nome}
                onValueChange={(value) => setFormData({ ...formData, piloto_nome: value })}
                required
                disabled={isEditing || !formData.etapa_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!formData.etapa_id ? "Selecione a etapa primeiro" : "Selecione o piloto"} />
                </SelectTrigger>
                <SelectContent>
                  {isEditing ? (
                    <SelectItem value={formData.piloto_nome}>{formData.piloto_nome}</SelectItem>
                  ) : (
                    availablePilotos.map(piloto => (
                      <SelectItem key={piloto.id} value={piloto.nome}>{piloto.nome}</SelectItem>
                    ))
                  )}
                  {!isEditing && availablePilotos.length === 0 && formData.etapa_id && (
                    <SelectItem disabled value="__none__">
                      {temCategorias && formData.categoria
                        ? `Nenhum piloto disponível na categoria ${formData.categoria}`
                        : "Todos os pilotos lançados"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {isEditing && <p className="text-xs text-gray-500">Não é possível alterar o piloto de um resultado existente.</p>}
            </div>

            {/* Status / Tipo de Resultado */}
            <div className="space-y-2 md:col-span-2">
              <Label>Tipo de Resultado *</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    status: "regular",
                    posicao: formData.posicao > 0 ? formData.posicao : (wasOriginallySC ? 0 : (availablePosicoes[0] || 1))
                  })}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                    formData.status === "regular" || !formData.status
                      ? "border-yellow-500 bg-yellow-50 text-yellow-900"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Trophy className="w-4 h-4" /> Com Colocação
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "NC" })}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                    formData.status === "NC"
                      ? "border-orange-500 bg-orange-50 text-orange-900"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Ban className="w-4 h-4" /> NC — Não Completou
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "DQ" })}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                    formData.status === "DQ"
                      ? "border-red-500 bg-red-50 text-red-900"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Flag className="w-4 h-4" /> DQ — Desqualificado
                </button>
              </div>
              {isSemColocacao && (
                <p className="text-xs text-gray-500">
                  {formData.status === "NC"
                    ? "Piloto participou do grid mas não completou a prova. Não pontua."
                    : "Piloto participou do grid mas foi desqualificado. Não pontua."}
                </p>
              )}
            </div>

            {/* Posição (somente quando com colocação) */}
            {!isSemColocacao && (
              <div className="space-y-2">
                <Label>Posição Final *</Label>
                <Select
                  value={formData.posicao.toString()}
                  onValueChange={(value) => setFormData({ ...formData, posicao: parseInt(value) })}
                  disabled={!formData.etapa_id}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {isEditing && formData.posicao > 0 && !wasOriginallySC ? (
                      <SelectItem value={formData.posicao.toString()}>{formData.posicao}º lugar</SelectItem>
                    ) : (
                      availablePosicoes.map(pos => (
                        <SelectItem key={pos} value={pos.toString()}>{pos}º lugar</SelectItem>
                      ))
                    )}
                    {isEditing && availablePosicoes.length === 0 && wasOriginallySC && (
                      <SelectItem disabled value="__none__">Todas as posições ocupadas</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Categoria (auto-preenchida da etapa, mas editável) */}
            {temCategorias && (
              <div className="space-y-2">
                <Label>Categoria *</Label>
                {etapaSelecionada?.categoria ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full text-white text-sm font-bold"
                      style={{ backgroundColor: categoriasCampeonato.find(c => c.nome === formData.categoria)?.cor || '#6b7280' }}>
                      {formData.categoria || etapaSelecionada.categoria}
                    </span>
                    <p className="text-xs text-gray-400">(vinculada à etapa)</p>
                  </div>
                ) : (
                  <Select
                    value={formData.categoria || ""}
                    onValueChange={(value) => setFormData({ ...formData, categoria: value, piloto_nome: '' })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    <SelectContent>
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
            )}

            {/* Melhor Volta */}
            {!isSemColocacao && (
              <div className="space-y-2">
                <Label>Pontos Melhor Volta</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pontos_melhor_volta}
                  onChange={(e) => setFormData({ ...formData, pontos_melhor_volta: e.target.value })}
                  placeholder="Pontos extras pela melhor volta"
                />
              </div>
            )}

            {isEditing && !isSemColocacao && (
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="descartado"
                  checked={formData.descartado}
                  onCheckedChange={(checked) => setFormData({ ...formData, descartado: checked })}
                />
                <Label htmlFor="descartado">Descartar este Resultado</Label>
              </div>
            )}
          </div>

          {/* Tipos de Ponto Extras */}
          {tiposPonto.length > 0 && !isSemColocacao && (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <Label className="text-base font-bold text-gray-800">⭐ Tipos de Ponto Extras</Label>
              
              <div className="flex gap-2 flex-wrap">
                <Select onValueChange={addTipo}>
                  <SelectTrigger className="w-full sm:w-72 bg-white">
                    <SelectValue placeholder="Selecionar tipo de ponto para adicionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposPonto.map(tp => (
                      <SelectItem key={tp.id} value={tp.id}>
                        {tp.descricao} ({formatValor(tp.valor)} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 self-center">Clique para adicionar. Pode adicionar o mesmo tipo múltiplas vezes.</p>
              </div>

              {tiposAplicados.length > 0 && (
                <div className="space-y-2">
                  {tiposAplicados.map((tp, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-gray-700">{tp.descricao}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={parseFloat(tp.valor) >= 0
                          ? "bg-green-100 text-green-800 font-bold"
                          : "bg-red-100 text-red-800 font-bold"}>
                          {formatValor(tp.valor)} pts
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:bg-red-50"
                          onClick={() => removeTipo(idx)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Badge className={totalTiposExtra >= 0
                      ? "bg-green-100 text-green-800 font-bold text-sm"
                      : "bg-red-100 text-red-800 font-bold text-sm"}>
                      Total tipos: {formatValor(totalTiposExtra)} pts
                    </Badge>
                  </div>
                </div>
              )}

              {tiposAplicados.length === 0 && (
                <p className="text-sm text-gray-400 italic">Nenhum tipo de ponto extra selecionado.</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
              <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}