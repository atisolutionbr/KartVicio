import React, { useState, useEffect } from "react";
import { Pontuacao, Piloto } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import PontuacaoForm from "../components/pontuacoes/PontuacaoForm";

export default function PontuacoesPage() {
  const [pontuacoes, setPontuacoes] = useState([]);
  const [pilotos, setPilotos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPontuacao, setEditingPontuacao] = useState(null);
  const [filtroEtapa, setFiltroEtapa] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [pontuacoesData, pilotosData] = await Promise.all([
      Pontuacao.list("-etapa"),
      Piloto.list()
    ]);
    setPontuacoes(pontuacoesData);
    setPilotos(pilotosData);
  };

  const handleSubmit = async (pontuacaoData) => {
    if (editingPontuacao) {
      await Pontuacao.update(editingPontuacao.id, pontuacaoData);
    } else {
      await Pontuacao.create(pontuacaoData);
    }
    setShowForm(false);
    setEditingPontuacao(null);
    loadData();
  };

  const handleEdit = (pontuacao) => {
    setEditingPontuacao(pontuacao);
    setShowForm(true);
  };

  const etapasDisponiveis = [...new Set(pontuacoes.map(p => p.etapa))].sort((a, b) => a - b);
  const pontuacoesFiltradas = filtroEtapa === "all" ? 
    pontuacoes : pontuacoes.filter(p => p.etapa === parseInt(filtroEtapa));

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Pontuações</h1>
            <p className="text-gray-600">Registrar e acompanhar pontuações por etapa</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Pontuação
          </Button>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <Select value={filtroEtapa} onValueChange={setFiltroEtapa}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Etapas</SelectItem>
                  {etapasDisponiveis.map(etapa => (
                    <SelectItem key={etapa} value={etapa.toString()}>
                      Etapa {etapa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-500">
                {pontuacoesFiltradas.length} registros
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {showForm && (
          <PontuacaoForm
            pontuacao={editingPontuacao}
            pilotos={pilotos}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingPontuacao(null);
            }}
          />
        )}

        {/* Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
            <CardTitle className="flex items-center gap-3">
              <Target className="w-6 h-6" />
              Pontuações Registradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-bold">Etapa</TableHead>
                    <TableHead className="font-bold">Piloto</TableHead>
                    <TableHead className="font-bold text-center">Posição</TableHead>
                    <TableHead className="font-bold text-center">Pontos</TableHead>
                    <TableHead className="font-bold">Observação</TableHead>
                    <TableHead className="font-bold text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pontuacoesFiltradas.map((pontuacao, index) => (
                    <TableRow 
                      key={pontuacao.id} 
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                    >
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800 font-bold">
                          Etapa {pontuacao.etapa}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{pontuacao.piloto_nome}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-bold">
                          {pontuacao.posicao || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-800 font-bold">
                          {pontuacao.pontos} pts
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {pontuacao.observacao || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(pontuacao)}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pontuacoesFiltradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhuma pontuação registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}