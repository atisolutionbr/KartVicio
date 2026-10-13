import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, X, Save } from "lucide-react";

export default function PenalidadeForm({ penalidade, pilotos, etapas, onSubmit, onCancel, inscricoes = [], categoriasCampeonato = [], saving = false }) {
  const [formData, setFormData] = useState(penalidade || {
    etapa_id: "",
    piloto_nome: "",
    tipo: "posicao",
    pontos_penalidade: 0,
    posicao_inicial: "",
    posicao_final: "",
    observacao: ""
  });

  const temCategorias = categoriasCampeonato.length > 0;
  const etapaSelecionada = etapas.find(e => e.id === formData.etapa_id);
  const categoriaAtiva = etapaSelecionada?.categoria || "";
  const isEditing = !!penalidade;

  // Apenas pilotos inscritos no campeonato, filtrados por categoria da etapa quando aplicável
  const pilotosDisponiveis = useMemo(() => {
    const nomesInscritos = new Set(inscricoes.filter(i => i.ativo === true).map(i => i.piloto_nome));
    let base = pilotos.filter(p => p.ativo === true && nomesInscritos.has(p.nome));
    if (temCategorias && categoriaAtiva) {
      const nomesNaCategoria = new Set(
        inscricoes.filter(i => (i.categorias || []).includes(categoriaAtiva)).map(i => i.piloto_nome)
      );
      base = base.filter(p => nomesNaCategoria.has(p.nome));
    }
    return base;
  }, [pilotos, inscricoes, temCategorias, categoriaAtiva]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      pontos_penalidade: parseFloat(formData.pontos_penalidade) || 0,
      posicao_inicial: formData.posicao_inicial ? parseInt(formData.posicao_inicial) : null,
      posicao_final: formData.posicao_final ? parseInt(formData.posicao_final) : null,
    });
  };

  return (
    <Card className="mb-6 shadow-lg border-2 border-red-200">
      <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {penalidade ? "Editar Penalidade" : "Aplicar Nova Penalidade"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="etapa_id">Etapa *</Label>
              <Select
                value={formData.etapa_id}
                onValueChange={(value) => setFormData({...formData, etapa_id: value, piloto_nome: ''})}
                required
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {etapas.map(etapa => (
                    <SelectItem key={etapa.id} value={etapa.id}>
                      {etapa.numero_etapa}ª Etapa - {etapa.local || 'Local Definido'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="piloto_nome">Piloto *</Label>
              <Select
                value={formData.piloto_nome}
                onValueChange={(value) => setFormData({...formData, piloto_nome: value})}
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
                    pilotosDisponiveis.map(piloto => (
                      <SelectItem key={piloto.id} value={piloto.nome}>
                        {piloto.nome}
                      </SelectItem>
                    ))
                  )}
                  {!isEditing && pilotosDisponiveis.length === 0 && formData.etapa_id && (
                    <SelectItem disabled value="__none__">
                      {temCategorias && categoriaAtiva
                        ? `Nenhum piloto na categoria ${categoriaAtiva}`
                        : "Nenhum piloto inscrito no campeonato"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Penalidade *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({...formData, tipo: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="posicao">Perda de Posições</SelectItem>
                  <SelectItem value="tempo">Acréscimo de Tempo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pontos_penalidade">Pontos de Penalidade</Label>
              <Input
                id="pontos_penalidade"
                type="number"
                step="0.01"
                min="0"
                value={formData.pontos_penalidade}
                onChange={(e) => setFormData({...formData, pontos_penalidade: e.target.value})}
                placeholder="Pontos a serem descontados"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="posicao_inicial">Posição Inicial</Label>
              <Input
                id="posicao_inicial"
                type="number"
                min="0"
                value={formData.posicao_inicial}
                onChange={(e) => setFormData({...formData, posicao_inicial: e.target.value})}
                placeholder="Posição antes da penalidade"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="posicao_final">Posição Final</Label>
              <Input
                id="posicao_final"
                type="number"
                min="0"
                value={formData.posicao_final}
                onChange={(e) => setFormData({...formData, posicao_final: e.target.value})}
                placeholder="Posição após penalidade"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData({...formData, observacao: e.target.value})}
              placeholder="Descreva o motivo da penalidade"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : penalidade ? 'Atualizar' : 'Aplicar Penalidade'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}