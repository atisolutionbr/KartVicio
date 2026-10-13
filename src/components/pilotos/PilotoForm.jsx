import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserPlus, X, Save } from "lucide-react";

export default function PilotoForm({ piloto, onSubmit, onCancel, saving = false }) {
  const [formData, setFormData] = useState(piloto || {
    nome: "",
    numero: "",
    categoria: "Senior",
    equipe: "",
    ativo: true,
    peso: "", // Initialize as empty string to allow controlled input, will be parsed to number
    idade: "", // Initialize as empty string
    telefone: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      numero: formData.numero ? parseInt(formData.numero) : null,
      peso: formData.peso ? parseFloat(formData.peso) : 0, // Parse peso to float, default to 0 if empty
      idade: formData.idade ? parseInt(formData.idade) : 0 // Parse idade to integer, default to 0 if empty
    });
  };

  return (
    <Card className="mb-6 shadow-lg border-2 border-yellow-200">
      <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="w-5 h-5" />
          {piloto ? "Editar Piloto" : "Cadastrar Novo Piloto"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                placeholder="Nome do piloto"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="peso">Peso (kg) *</Label>
              <Input
                id="peso"
                type="number"
                step="0.1"
                value={formData.peso}
                onChange={(e) => setFormData({...formData, peso: e.target.value})}
                placeholder="Ex: 85.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idade">Idade</Label>
              <Input
                id="idade"
                type="number"
                value={formData.idade}
                onChange={(e) => setFormData({...formData, idade: e.target.value})}
                placeholder="Ex: 35"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                placeholder="(99) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero">Número do Piloto</Label>
              <Input
                id="numero"
                type="number"
                value={formData.numero}
                onChange={(e) => setFormData({...formData, numero: e.target.value})}
                placeholder="Ex: 77"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData({...formData, categoria: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Master">Master</SelectItem>
                  <SelectItem value="Super Senior">Super Senior</SelectItem>
                  <SelectItem value="Light">Light</SelectItem>
                  <SelectItem value="Graduados">Graduados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="equipe">Equipe</Label>
              <Input
                id="equipe"
                value={formData.equipe}
                onChange={(e) => setFormData({...formData, equipe: e.target.value})}
                placeholder="Nome da equipe"
              />
            </div>

             <div className="flex items-center space-x-2">
                <Switch 
                  id="ativo" 
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                />
                <Label htmlFor="ativo">Piloto Ativo</Label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t mt-6">
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : piloto ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}