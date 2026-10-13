import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Star, Save, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const TipoPontoEntity = base44.entities.TipoPonto;

const emptyForm = { descricao: "", valor: "", ativo: true };

export default function TipoPontoPage({ userPermissions }) {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const canEdit = userPermissions?.permissao === "admin";
  const canCreate = canEdit || userPermissions?.permissao === "operador";

  const load = async () => {
    setLoading(true);
    const data = await TipoPontoEntity.list();
    setTipos(data.sort((a, b) => a.descricao.localeCompare(b.descricao)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (tipo) => {
    setEditing(tipo);
    setForm({ descricao: tipo.descricao, valor: tipo.valor, ativo: tipo.ativo !== false });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, valor: parseFloat(form.valor) };
    if (isNaN(payload.valor)) { alert("Informe um valor numérico válido."); return; }
    if (editing) {
      await TipoPontoEntity.update(editing.id, payload);
    } else {
      await TipoPontoEntity.create(payload);
    }
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    await TipoPontoEntity.delete(id);
    load();
  };

  const formatValor = (v) => {
    if (v === undefined || v === null) return "—";
    const n = parseFloat(v);
    return (n >= 0 ? "+" : "") + n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⭐ Tipos de Ponto</h1>
          <p className="text-gray-600">Defina tipos extras de pontuação que podem ser atribuídos a pilotos nos resultados</p>
        </div>
        {canCreate && (
          <Button onClick={openNew} className="copa-gradient-gold hover:opacity-90 text-white shadow-lg">
            <Plus className="w-5 h-5 mr-2" />
            Novo Tipo de Ponto
          </Button>
        )}
      </div>

      {showForm && canCreate && (
        <Card className="border-2 border-yellow-300 shadow-lg">
          <CardHeader className="copa-gradient-gold text-white py-3 px-5">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              {editing ? "Editar Tipo de Ponto" : "Novo Tipo de Ponto"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input
                    placeholder="Ex: Pole Position, Sprint Race, Bônus Especial"
                    value={form.descricao}
                    onChange={e => setForm({ ...form, descricao: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor dos Pontos *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 1, -0.5, 0.25"
                    value={form.valor}
                    onChange={e => setForm({ ...form, valor: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500">Positivo soma, negativo desconta. Aceita decimais (ex: 0.25).</p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={form.ativo}
                    onCheckedChange={v => setForm({ ...form, ativo: v })}
                  />
                  <Label>Ativo (disponível para seleção nos resultados)</Label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4 mr-2" /> Cancelar
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                  <Save className="w-4 h-4 mr-2" /> {editing ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader className="copa-gradient-navy text-white py-3 px-5">
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Tipos de Ponto Cadastrados ({tipos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-bold px-4">Descrição</TableHead>
                    <TableHead className="font-bold text-center px-4">Valor</TableHead>
                    <TableHead className="font-bold text-center px-4">Status</TableHead>
                    {canCreate && <TableHead className="font-bold text-center px-4">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tipos.map((tipo, idx) => (
                    <TableRow key={tipo.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <TableCell className="font-semibold px-4 py-3">{tipo.descricao}</TableCell>
                      <TableCell className="text-center px-4 py-3">
                        <Badge className={parseFloat(tipo.valor) >= 0
                          ? "bg-green-100 text-green-800 font-bold text-base"
                          : "bg-red-100 text-red-800 font-bold text-base"}>
                          {formatValor(tipo.valor)} pts
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center px-4 py-3">
                        <Badge className={tipo.ativo !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                          {tipo.ativo !== false ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      {canCreate && (
                        <TableCell className="text-center px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <Button variant="outline" size="sm" onClick={() => openEdit(tipo)}>
                              <Edit className="w-3 h-3 mr-1" /> Editar
                            </Button>
                            {canEdit && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="w-3 h-3 mr-1" /> Excluir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Excluir o tipo <strong>{tipo.descricao}</strong>? Resultados já registrados com este tipo não serão afetados.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(tipo.id)} className="bg-red-600 hover:bg-red-700">
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {tipos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canCreate ? 4 : 3} className="text-center py-10 text-gray-500">
                        Nenhum tipo de ponto cadastrado. Clique em "Novo Tipo de Ponto" para começar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-blue-800 text-sm font-medium">
            <strong>Como funciona:</strong> Os tipos de ponto criados aqui ficam disponíveis para seleção ao registrar um resultado de piloto.
            Podem ser positivos (ex: Pole Position +1pt) ou negativos (ex: Saída dos pits incorreta -0,5pt).
            Os pontos são somados/subtraídos automaticamente no total do piloto na etapa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}