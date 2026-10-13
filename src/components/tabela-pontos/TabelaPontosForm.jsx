import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, X, Save } from "lucide-react";

export default function TabelaPontosForm({ item, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(item || {
    posicao: 1,
    pontos: 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      posicao: parseInt(formData.posicao),
      pontos: parseInt(formData.pontos)
    });
  };

  return (
    <Card className="mb-6 shadow-lg border-2 border-yellow-200">
      <CardHeader className="copa-gradient-gold text-white">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          {item ? "Editar Pontuação" : "Configurar Pontuação"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="posicao">Posição *</Label>
              <Select
                value={formData.posicao.toString()}
                onValueChange={(value) => setFormData({...formData, posicao: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: 20}, (_, i) => i + 1).map(pos => (
                    <SelectItem key={pos} value={pos.toString()}>
                      {pos}º lugar
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pontos">Pontos *</Label>
              <Input
                id="pontos"
                type="number"
                min="0"
                value={formData.pontos}
                onChange={(e) => setFormData({...formData, pontos: e.target.value})}
                placeholder="Pontos para esta posição"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Sugestão de Pontuação:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-800">
              <span>1º: 25 pts</span>
              <span>2º: 18 pts</span>
              <span>3º: 15 pts</span>
              <span>4º: 12 pts</span>
              <span>5º: 10 pts</span>
              <span>6º: 8 pts</span>
              <span>7º: 6 pts</span>
              <span>8º: 4 pts</span>
              <span>9º: 2 pts</span>
              <span>10º: 1 pt</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              {item ? "Atualizar" : "Configurar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}