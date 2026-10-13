import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, X, Save } from "lucide-react";
import { ConfiguracaoTemporada } from "@/entities/ConfiguracaoTemporada";

export default function EtapaForm({ etapa, onSubmit, onCancel, categoriasCampeonato = [] }) {
  const [maxEtapas, setMaxEtapas] = useState(14);
  const temCategorias = categoriasCampeonato.length > 0;
  const [formData, setFormData] = useState(etapa || {
    ano: new Date().getFullYear(),
    numero_etapa: 1,
    mes: new Date().getMonth() + 1,
    data_hora: "",
    local: "",
    categoria: categoriasCampeonato[0]?.nome || "",
    finalizada: false,
    dobrar_pontos: false,
  });

  useEffect(() => {
    const loadConfiguracao = async () => {
      const configs = await ConfiguracaoTemporada.filter({ ano: formData.ano });
      if (configs.length > 0) {
        setMaxEtapas(configs[0].numero_etapas);
      } else {
        setMaxEtapas(14);
      }
    };
    loadConfiguracao();
  }, [formData.ano]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (temCategorias && !formData.categoria) {
      alert("Selecione a categoria da etapa.");
      return;
    }
    onSubmit({
      ...formData,
      ano: parseInt(formData.ano),
      numero_etapa: parseInt(formData.numero_etapa),
      mes: parseInt(formData.mes)
    });
  };

  const meses = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" }
  ];
  
  const years = Array.from({length: 27}, (_, i) => 2024 + i);

  return (
    <Card className="mb-6 shadow-lg border-2 border-yellow-200">
      <CardHeader className="copa-gradient-gold text-white">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {etapa ? "Editar Etapa" : "Cadastrar Nova Etapa"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ano">Ano *</Label>
              <Select
                value={formData.ano.toString()}
                onValueChange={(value) => setFormData({...formData, ano: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                     <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="numero_etapa">Número da Etapa *</Label>
              <Select
                value={formData.numero_etapa.toString()}
                onValueChange={(value) => setFormData({...formData, numero_etapa: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({length: maxEtapas}, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}ª Etapa
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mes">Mês *</Label>
              <Select
                value={formData.mes.toString()}
                onValueChange={(value) => setFormData({...formData, mes: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map(mes => (
                    <SelectItem key={mes.value} value={mes.value.toString()}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria (para campeonatos com categorias) */}
            {temCategorias && (
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={formData.categoria || ""}
                  onValueChange={(value) => setFormData({...formData, categoria: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
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
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_hora">Data e Hora *</Label>
              <Input
                id="data_hora"
                type="datetime-local"
                value={formData.data_hora}
                onChange={(e) => setFormData({...formData, data_hora: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="local">Local da Etapa</Label>
              <Input
                id="local"
                value={formData.local}
                onChange={(e) => setFormData({...formData, local: e.target.value})}
                placeholder="Local onde será realizada a etapa"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="finalizada"
              checked={formData.finalizada}
              onCheckedChange={(checked) => setFormData({ ...formData, finalizada: checked })}
            />
            <Label htmlFor="finalizada">Etapa Finalizada</Label>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="dobrar_pontos"
              checked={formData.dobrar_pontos}
              onCheckedChange={(checked) => setFormData({ ...formData, dobrar_pontos: checked })}
            />
            <Label htmlFor="dobrar_pontos">Dobrar Pontos nesta Etapa (2X)</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              {etapa ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}