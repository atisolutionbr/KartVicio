import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, Save, Shield, Check } from "lucide-react";

export default function UsuarioForm({ usuario, campeonatos = [], onSubmit, onCancel }) {
  const [formData, setFormData] = useState(usuario || {
    nome: "",
    email: "",
    permissao: "visualizador",
    ativo: true,
    campeonatos_ids: []
  });

  const toggleCampeonato = (id) => {
    const atual = formData.campeonatos_ids || [];
    const novo = atual.includes(id) ? atual.filter(c => c !== id) : [...atual, id];
    setFormData({ ...formData, campeonatos_ids: novo });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="mb-6 shadow-xl border-2 border-yellow-200">
      <CardHeader className="copa-gradient-gold text-white">
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          {usuario ? "Editar Configuração de Acesso" : "Nova Configuração de Acesso"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
          <p className="text-sm text-yellow-800">
            <strong>Nota:</strong> O email deve corresponder exatamente à conta Google que o usuário usa para entrar.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                placeholder="Nome do usuário"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Google *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="email@gmail.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="permissao">Nível de Permissão</Label>
              <Select
                value={formData.permissao}
                onValueChange={(value) => setFormData({...formData, permissao: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-500" />
                      Administrador — Acesso total
                    </div>
                  </SelectItem>
                  <SelectItem value="operador">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      Operador — Lançar resultados e penalidades
                    </div>
                  </SelectItem>
                  <SelectItem value="visualizador">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-500" />
                      Visualizador — Apenas leitura
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {formData.permissao === "visualizador" && "Acessa: Ranking, Simulador, Relatórios, Perfil do Piloto"}
                {formData.permissao === "operador" && "Acessa: tudo do Visualizador + Resultados, Penalidades, Pilotos"}
                {formData.permissao === "admin" && "Acesso total: todas as funcionalidades do sistema"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.ativo ? "true" : "false"}
                onValueChange={(v) => setFormData({...formData, ativo: v === "true"})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vínculo com Campeonatos */}
          {formData.permissao !== "admin" && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Campeonatos Vinculados
                <span className="text-xs font-normal text-red-600 ml-2 font-medium">
                  * obrigatório — sem vínculo o usuário não vê nada
                </span>
              </Label>
              {campeonatos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg bg-gray-50">
                  {campeonatos.map(camp => {
                    const selecionado = (formData.campeonatos_ids || []).includes(camp.id);
                    return (
                      <button
                        key={camp.id}
                        type="button"
                        onClick={() => toggleCampeonato(camp.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                          selecionado
                            ? 'bg-blue-600 border-blue-700 text-white font-semibold'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                        }`}
                      >
                        {selecionado && <Check className="w-4 h-4 flex-shrink-0" />}
                        {!selecionado && <div className="w-4 h-4 rounded border border-gray-400 flex-shrink-0" />}
                        <span>{camp.nome} ({camp.ano})</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Nenhum campeonato cadastrado</p>
              )}
              {(formData.campeonatos_ids || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(formData.campeonatos_ids || []).map(id => {
                    const c = campeonatos.find(c => c.id === id);
                    return c ? (
                      <Badge key={id} className="bg-blue-100 text-blue-800 gap-1">
                        {c.nome}
                        <button type="button" onClick={() => toggleCampeonato(id)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              {usuario ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}