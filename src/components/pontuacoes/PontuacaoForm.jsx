import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Target, X, Save } from "lucide-react";

export default function PontuacaoForm({ pontuacao, pilotos, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(pontuacao || {
    piloto_nome: "",
    etapa: 1,
    posicao: "",
    pontos: 0,
    observacao: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      etapa: parseInt(formData.etapa),
      pontos: parseInt(formData.pontos)
    });
  };

  return (
    <Card className="mb-6 shadow-lg border-2 border-yellow-200">
      <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          {pontuacao ? "Editar Pontuação" : "Registrar Nova Pontuação"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="piloto_nome">Piloto *</Label>
              <Select
                value={formData.piloto_nome}
                onValueChange={(value) => setFormData({...formData, piloto_nome: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o piloto" />
                </SelectTrigger>
                <SelectContent>
                  {pilotos.map(piloto => (
                    <SelectItem key={piloto.id} value={piloto.nome}>
                      {piloto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="etapa">Etapa *</Label>
              <Select
                value={formData.etapa.toString()}
                onValueChange={(value) => setFormData({...formData, etapa: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      Etapa {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="posicao">Posição Final</Label>
              <Input
                id="posicao"
                value={formData.posicao}
                onChange={(e) => setFormData({...formData, posicao: e.target.value})}
                placeholder="Ex: 1º, 2º, DNS, DNF"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pontos">Pontos Conquistados *</Label>
              <Input
                id="pontos"
                type="number"
                min="0"
                value={formData.pontos}
                onChange={(e) => setFormData({...formData, pontos: e.target.value})}
                placeholder="Pontos"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observações</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData({...formData, observacao: e.target.value})}
              placeholder="Observações adicionais (DNF, DNS, penalidades, etc.)"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              {pontuacao ? "Atualizar" : "Registrar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}