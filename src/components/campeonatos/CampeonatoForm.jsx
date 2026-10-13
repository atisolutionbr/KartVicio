import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trophy, X, Plus, Trash2, Tag } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CORES_CATEGORIA = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"
];

export default function CampeonatoForm({ campeonato, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    nome: campeonato?.nome || "",
    descricao: campeonato?.descricao || "",
    ano: campeonato?.ano || new Date().getFullYear(),
    ativo: campeonato?.ativo ?? true,
    numero_etapas_planejadas: campeonato?.numero_etapas_planejadas || 14,
    descarte_ativo: campeonato?.descarte_ativo ?? false,
    descarte_min_etapas: campeonato?.descarte_min_etapas || 10,
    descarte_quantidade: campeonato?.descarte_quantidade || 1,
    pontos_melhor_volta: campeonato?.pontos_melhor_volta || 1,
    categorias: campeonato?.categorias || [],
    logo_url: campeonato?.logo_url || "",
  });

  const [novaCategoria, setNovaCategoria] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setForm(prev => ({ ...prev, logo_url: file_url }));
    } catch (err) {
      console.error("Erro ao fazer upload da logo:", err);
    }
    setUploadingLogo(false);
  };

  const addCategoria = () => {
    const nome = novaCategoria.trim();
    if (!nome) return;
    if (form.categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase())) return;
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const cor = CORES_CATEGORIA[form.categorias.length % CORES_CATEGORIA.length];
    setForm(prev => ({ ...prev, categorias: [...prev.categorias, { id, nome, cor }] }));
    setNovaCategoria("");
  };

  const removeCategoria = (id) => {
    setForm(prev => ({ ...prev, categorias: prev.categorias.filter(c => c.id !== id) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Card className="shadow-xl border-2 border-yellow-400">
      <CardHeader className="copa-gradient-navy text-white py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            {campeonato ? "Editar Campeonato" : "Novo Campeonato"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/20">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Logo do Campeonato */}
            <div className="space-y-2">
              <Label>Logo do Campeonato</Label>
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="w-20 h-20 rounded-xl object-cover shadow-md border-2 border-yellow-400" />
                ) : (
                  <div className="w-20 h-20 rounded-xl copa-gradient-navy flex items-center justify-center shadow-md">
                    <Trophy className="w-8 h-8 text-yellow-400" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="text-sm max-w-xs"
                  />
                  {form.logo_url && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, logo_url: "" })}>
                      <Trash2 className="w-4 h-4 mr-1" /> Remover logo
                    </Button>
                  )}
                  {uploadingLogo && <p className="text-xs text-blue-600">Enviando...</p>}
                </div>
              </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome do Campeonato *</Label>
              <Input
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Copa Motor Pocado 2026"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>
            <div className="space-y-2">
              <Label>Ano *</Label>
              <Input
                type="number"
                value={form.ano}
                onChange={e => setForm({ ...form, ano: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nº de Etapas Planejadas</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={form.numero_etapas_planejadas}
                onChange={e => setForm({ ...form, numero_etapas_planejadas: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pontos pela Melhor Volta</Label>
              <Input
                type="number"
                min="0"
                value={form.pontos_melhor_volta}
                onChange={e => setForm({ ...form, pontos_melhor_volta: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Categorias */}
          <div className="border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />
              <Label className="text-base font-semibold text-blue-800">Categorias</Label>
              <span className="text-xs text-blue-600">(opcional — sem categorias, todos os pilotos competem juntos)</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={novaCategoria}
                onChange={e => setNovaCategoria(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCategoria(); } }}
                placeholder="Ex: Categoria A, Júnior, Sênior..."
                className="bg-white"
              />
              <Button type="button" onClick={addCategoria} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            {form.categorias.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.categorias.map(cat => (
                  <div key={cat.id} className="flex items-center gap-1 px-3 py-1 rounded-full text-white text-sm font-bold shadow" style={{ backgroundColor: cat.cor }}>
                    {cat.nome}
                    <button type="button" onClick={() => removeCategoria(cat.id)} className="ml-1 hover:opacity-70">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {form.categorias.length === 0 && (
              <p className="text-sm text-blue-500 italic">Nenhuma categoria definida — campeonato sem categorias.</p>
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-4 bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Regra de Descarte</Label>
                <p className="text-sm text-gray-500">Descartar a pior etapa de cada piloto</p>
              </div>
              <Switch
                checked={form.descarte_ativo}
                onCheckedChange={v => setForm({ ...form, descarte_ativo: v })}
              />
            </div>
            {form.descarte_ativo && (
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-2">
                  <Label>Mínimo de etapas para ativar descarte</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.descarte_min_etapas}
                    onChange={e => setForm({ ...form, descarte_min_etapas: parseInt(e.target.value) })}
                    className="w-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade de etapas descartáveis</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.descarte_quantidade}
                    onChange={e => setForm({ ...form, descarte_quantidade: parseInt(e.target.value) })}
                    className="w-32"
                  />
                </div>
                <p className="text-xs text-gray-500 sm:self-end sm:pb-2">
                  O descarte só é aplicado quando o campeonato tiver pelo menos o mínimo de etapas finalizadas. Etapas em que o piloto não participou contam como descarte automaticamente (sem alterar pontuação) e etapas com penalidade nunca são descartadas.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.ativo}
              onCheckedChange={v => setForm({ ...form, ativo: v })}
            />
            <Label>Campeonato Ativo</Label>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" className="copa-gradient-gold text-white">
              {campeonato ? "Salvar Alterações" : "Criar Campeonato"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}