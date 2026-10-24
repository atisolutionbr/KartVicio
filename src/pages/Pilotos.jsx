import React, { useState } from "react";
import usePilotosCadastro from '@/components/pilotos/usePilotosCadastro';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Search, Filter, Link2, CheckCircle } from "lucide-react";
import ExcluirPiloto from '@/components/pilotos/ExcluirPiloto';
import PilotoForm from '@/components/pilotos/PilotoForm';

export default function PilotosPage({ userPermissions }) {
  const [deletingPilot,setDeletingPilot]=useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPiloto, setEditingPiloto] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const { pilotos: filteredPilotos, campeonatos, total, cursor, loading, ocupado, msgVinculo, erro, salvarPiloto, toggleVinculo, isVinculado, vincularTodosAtivos, loadMore, excluirPiloto } = usePilotosCadastro(searchTerm, statusFilter);
  const vinculando = ocupado === 'todos';
  const handleSubmit = async (pilotoData) => {
    if (await salvarPiloto(editingPiloto, pilotoData)) {
      setShowForm(false);
      setEditingPiloto(null);
    }
  };
  const handleEdit = (piloto) => { setEditingPiloto(piloto); setShowForm(true); };

  const canEdit = userPermissions?.permissao === 'admin';
  const canCreate = canEdit || userPermissions?.permissao === 'operador';

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Pilotos</h1>
            <p className="text-gray-600">Cadastro, gerenciamento e vínculos com campeonatos</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canCreate && (
              <Button
                onClick={vincularTodosAtivos}
                disabled={Boolean(ocupado)}
                variant="outline"
                className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
              >
                <Link2 className="w-4 h-4 mr-2" />
                {vinculando ? "Vinculando..." : "Vincular Ativos a Campeonatos"}
              </Button>
            )}
            {canCreate && (
              <Button
                onClick={() => { setEditingPiloto(null); setShowForm(true); }}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Piloto
              </Button>
            )}
          </div>
        </div>

        {msgVinculo && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-lg p-3 text-green-800">
            <CheckCircle className="w-4 h-4" />
            {msgVinculo}
          </div>
        )}

        {erro && <p role="alert" className="text-destructive">{erro}</p>}

        <ExcluirPiloto pilot={deletingPilot} onClose={()=>setDeletingPilot(null)} onDelete={excluirPiloto} busy={ocupado==='excluir'}/>
        {/* Search and Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou equipe..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-gray-500 hidden sm:block" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativos">Apenas Ativos</SelectItem>
                    <SelectItem value="inativos">Apenas Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {showForm && canCreate && (
          <PilotoForm
            piloto={editingPiloto}
            saving={ocupado === 'piloto'}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingPiloto(null); }}
          />
        )}

        {/* Tabela com vínculos */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <Users className="w-6 h-6" />
              Lista de Pilotos ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-bold px-4 py-3">Nome</TableHead>
                    <TableHead className="font-bold text-center px-4 py-3">Status</TableHead>
                    {campeonatos.map(c => (
                      <TableHead key={c.id} className="font-bold text-center px-2 py-3 text-xs">
                        {c.nome.length > 15 ? c.nome.substring(0, 15) + '…' : c.nome}
                        <div className="text-gray-400 font-normal">{c.ano}</div>
                      </TableHead>
                    ))}
                    {canEdit && <TableHead className="font-bold text-center px-4 py-3">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPilotos.map((piloto, index) => (
                    <TableRow
                      key={piloto.id}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                    >
                      <TableCell className="font-semibold text-gray-900 px-4 py-3">
                        {piloto.nome}
                      </TableCell>
                      <TableCell className="text-center px-4 py-3">
                        <Badge className={piloto.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {piloto.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      {campeonatos.map(c => (
                        <TableCell key={c.id} className="text-center px-2 py-3">
                          {canCreate ? (
                            <button
                              type="button"
                              onClick={() => toggleVinculo(piloto, c.id)}
                              disabled={Boolean(ocupado) || piloto.ativo !== true}
                              aria-pressed={isVinculado(piloto.nome, c.id)}
                              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${
                                isVinculado(piloto.nome, c.id)
                                  ? 'bg-green-500 border-green-600 text-white'
                                  : 'bg-white border-gray-300 text-gray-400 hover:border-yellow-400'
                              }`}
                              title={piloto.ativo !== true ? 'Piloto inativo: sem vínculo' : isVinculado(piloto.nome, c.id) ? 'Desvincular' : 'Vincular'}
                            >
                              {ocupado === `${piloto.id}:${c.id}` ? '…' : isVinculado(piloto.nome, c.id) ? '✓' : '○'}
                            </button>
                          ) : (
                            <span className={`text-lg ${isVinculado(piloto.nome, c.id) ? 'text-green-500' : 'text-gray-300'}`}>
                              {isVinculado(piloto.nome, c.id) ? '✓' : '—'}
                            </span>
                          )}
                        </TableCell>
                      ))}
                      {canEdit && (
                        <TableCell className="text-center px-4 py-3">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(piloto)}>
                            Editar
                          </Button>
                          <Button variant="destructive" size="sm" className="ml-2" disabled={Boolean(ocupado)} onClick={()=>setDeletingPilot(piloto)}>Excluir</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filteredPilotos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3 + campeonatos.length + (canEdit ? 1 : 0)} className="text-center py-8 text-gray-500">
                        {searchTerm ? "Nenhum piloto encontrado" : "Nenhum piloto cadastrado"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {loading && <p className="p-4 text-center text-muted-foreground">Carregando pilotos...</p>}
            {cursor && <div className="p-4 text-center"><Button variant="outline" onClick={loadMore} disabled={loading}>Carregar mais pilotos</Button></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}