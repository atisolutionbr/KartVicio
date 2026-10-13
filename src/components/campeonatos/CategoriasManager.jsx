import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, Trash2, Edit2, Check, X, Users } from "lucide-react";

const Campeonato = base44.entities.Campeonato;
const InscricaoPiloto = base44.entities.InscricaoPiloto;

const CORES_PREDEFINIDAS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#0f172a", "#64748b", "#84cc16", "#14b8a6"
];

export default function CategoriasManager({ campeonato, inscricoes, canEdit, onRefresh }) {
  const [novaCategoria, setNovaCategoria] = useState("");
  const [novaCor, setNovaCor] = useState("#3b82f6");
  const [editandoId, setEditandoId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editCor, setEditCor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const categorias = campeonato?.categorias || [];

  const handleAddCategoria = async () => {
    if (!novaCategoria.trim()) return;
    if (categorias.find(c => c.nome.toLowerCase() === novaCategoria.trim().toLowerCase())) {
      alert("Já existe uma categoria com este nome.");
      return;
    }
    setSalvando(true);
    const novasLista = [
      ...categorias,
      { id: crypto.randomUUID(), nome: novaCategoria.trim(), cor: novaCor }
    ];
    await Campeonato.update(campeonato.id, { categorias: novasLista });
    setNovaCategoria("");
    setNovaCor("#3b82f6");
    setSalvando(false);
    onRefresh();
  };

  const handleRemoveCategoria = async (catId) => {
    const cat = categorias.find(c => c.id === catId);
    const usada = inscricoes.some(i => (i.categorias || []).includes(cat?.nome));
    if (usada && !confirm(`A categoria "${cat?.nome}" está em uso por pilotos. Remover mesmo assim?`)) return;
    const novasLista = categorias.filter(c => c.id !== catId);
    await Campeonato.update(campeonato.id, { categorias: novasLista });
    onRefresh();
  };

  const handleEditSave = async () => {
    if (!editNome.trim()) return;
    const nomeAntigo = categorias.find(c => c.id === editandoId)?.nome;
    const novasLista = categorias.map(c =>
      c.id === editandoId ? { ...c, nome: editNome.trim(), cor: editCor } : c
    );
    await Campeonato.update(campeonato.id, { categorias: novasLista });

    // Atualizar inscrições se o nome mudou
    if (nomeAntigo && nomeAntigo !== editNome.trim()) {
      const inscricoesParaAtualizar = inscricoes.filter(i => (i.categorias || []).includes(nomeAntigo));
      await Promise.all(inscricoesParaAtualizar.map(insc =>
        InscricaoPiloto.update(insc.id, {
          categorias: (insc.categorias || []).map(c => c === nomeAntigo ? editNome.trim() : c)
        })
      ));
    }

    setEditandoId(null);
    onRefresh();
  };

  const pilotosDaCategoria = (nomeCategoria) =>
    inscricoes.filter(i => (i.categorias || []).includes(nomeCategoria));

  const handleVincularCategoria = async (inscricaoId, nomeCategoria, adicionar) => {
    const insc = inscricoes.find(i => i.id === inscricaoId);
    if (!insc) return;
    const cats = insc.categorias || [];
    const novas = adicionar
      ? [...new Set([...cats, nomeCategoria])]
      : cats.filter(c => c !== nomeCategoria);
    await InscricaoPiloto.update(inscricaoId, { categorias: novas });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Gerenciar Categorias */}
      <Card className="shadow-lg">
        <CardHeader className="copa-gradient-navy text-white py-3 px-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="w-5 h-5 text-yellow-400" />
            Categorias do Campeonato
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {canEdit && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Nova Categoria</p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-40">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nome</label>
                  <Input
                    value={novaCategoria}
                    onChange={e => setNovaCategoria(e.target.value)}
                    placeholder="Ex: Categoria A, Júnior..."
                    onKeyDown={e => e.key === "Enter" && handleAddCategoria()}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Cor</label>
                  <div className="flex gap-1 flex-wrap max-w-52">
                    {CORES_PREDEFINIDAS.map(cor => (
                      <button
                        key={cor}
                        onClick={() => setNovaCor(cor)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${novaCor === cor ? "scale-125 border-gray-800" : "border-transparent hover:scale-110"}`}
                        style={{ backgroundColor: cor }}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleAddCategoria}
                  disabled={salvando || !novaCategoria.trim()}
                  className="copa-gradient-gold text-white h-9"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {salvando ? "Salvando..." : "Adicionar"}
                </Button>
              </div>
            </div>
          )}

          {categorias.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma categoria cadastrada</p>
              <p className="text-xs mt-1">Adicione categorias para segmentar os pilotos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categorias.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                  {editandoId === cat.id ? (
                    <>
                      <div className="flex gap-1 flex-wrap">
                        {CORES_PREDEFINIDAS.map(cor => (
                          <button
                            key={cor}
                            onClick={() => setEditCor(cor)}
                            className={`w-5 h-5 rounded-full border-2 transition-transform ${editCor === cor ? "scale-125 border-gray-800" : "border-transparent"}`}
                            style={{ backgroundColor: cor }}
                          />
                        ))}
                      </div>
                      <Input
                        value={editNome}
                        onChange={e => setEditNome(e.target.value)}
                        className="flex-1 h-8 text-sm"
                        onKeyDown={e => e.key === "Enter" && handleEditSave()}
                        autoFocus
                      />
                      <Button size="sm" onClick={handleEditSave} className="bg-green-500 hover:bg-green-600 text-white h-8 px-2">
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditandoId(null)} className="h-8 px-2">
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.cor }} />
                      <span className="flex-1 font-semibold text-gray-800">{cat.nome}</span>
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {pilotosDaCategoria(cat.nome).length} pilotos
                      </Badge>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            size="sm" variant="outline"
                            onClick={() => { setEditandoId(cat.id); setEditNome(cat.nome); setEditCor(cat.cor); }}
                            className="h-7 px-2"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRemoveCategoria(cat.id)} className="h-7 px-2">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vincular Pilotos às Categorias */}
      {categorias.length > 0 && inscricoes.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="copa-gradient-navy text-white py-3 px-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-yellow-400" />
              Vínculos Pilotos × Categorias
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="text-left font-bold text-gray-700 px-4 py-3 min-w-40">Piloto</th>
                    {categorias.map(cat => (
                      <th key={cat.id} className="text-center font-bold px-3 py-3 min-w-28">
                        <div className="flex items-center justify-center gap-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                          <span>{cat.nome}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inscricoes.map((insc, idx) => (
                    <tr key={insc.id} className={`border-b transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-yellow-50`}>
                      <td className="px-4 py-3 font-semibold text-gray-800">{insc.piloto_nome}</td>
                      {categorias.map(cat => {
                        const temCategoria = (insc.categorias || []).includes(cat.nome);
                        return (
                          <td key={cat.id} className="text-center px-3 py-3">
                            {canEdit ? (
                              <button
                                onClick={() => handleVincularCategoria(insc.id, cat.nome, !temCategoria)}
                                className={`w-8 h-8 rounded-full border-2 mx-auto flex items-center justify-center transition-all hover:scale-110 ${
                                  temCategoria
                                    ? "text-white border-transparent"
                                    : "bg-white border-gray-300 hover:border-gray-400"
                                }`}
                                style={temCategoria ? { backgroundColor: cat.cor, borderColor: cat.cor } : {}}
                                title={temCategoria ? `Remover de ${cat.nome}` : `Adicionar a ${cat.nome}`}
                              >
                                {temCategoria ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-gray-400" />}
                              </button>
                            ) : (
                              temCategoria ? (
                                <div className="w-5 h-5 rounded-full mx-auto" style={{ backgroundColor: cat.cor }} />
                              ) : (
                                <span className="text-gray-300">—</span>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}