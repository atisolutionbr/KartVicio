import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Table from '@/components/relatorios/ResponsiveReportTable';
import { Target, ListOrdered, Gauge } from "lucide-react";
import FiltroEtapaCategoria from "./FiltroEtapaCategoria";

export default function MediasRelatorios({ resultados, etapas = [], categorias = [] }) {
  const [etapaSel, setEtapaSel] = useState("todas");
  const [categoriaSel, setCategoriaSel] = useState("todas");

  let resultadosFiltrados = resultados;
  if (etapaSel !== "todas") resultadosFiltrados = resultadosFiltrados.filter(r => r.etapa_id === etapaSel);
  if (categoriaSel !== "todas") resultadosFiltrados = resultadosFiltrados.filter(r => (r.categoria || "").trim() === categoriaSel.trim());

  const porPiloto = {};
  resultadosFiltrados.forEach(r => {
    if (!porPiloto[r.piloto_nome]) {
      porPiloto[r.piloto_nome] = { piloto: r.piloto_nome, etapas: 0, pontos: 0, posicoes: 0, melhorPosicao: null, penalidades: 0 };
    }
    const p = porPiloto[r.piloto_nome];
    p.etapas += 1;
    p.pontos += r.pontos_totais || 0;
    p.posicoes += r.posicao || 0;
    p.penalidades += r.pontos_penalidade || 0;
    if (r.posicao != null && (p.melhorPosicao === null || r.posicao < p.melhorPosicao)) {
      p.melhorPosicao = r.posicao;
    }
  });
  const base = Object.values(porPiloto);

  const mediaPontos = base
    .map(p => ({ ...p, media_pontos: p.etapas > 0 ? p.pontos / p.etapas : 0 }))
    .sort((a, b) => b.media_pontos - a.media_pontos);

  const mediaColocacao = base
    .map(p => ({ ...p, media_posicao: p.etapas > 0 ? p.posicoes / p.etapas : 0 }))
    .sort((a, b) => a.media_posicao - b.media_posicao);

  const mediaGeral = base
    .map(p => ({
      ...p,
      media_posicao: p.etapas > 0 ? p.posicoes / p.etapas : 0,
      media_penalidade: p.etapas > 0 ? p.penalidades / p.etapas : 0
    }))
    .sort((a, b) => a.media_posicao - b.media_posicao);

  return (
    <div className="space-y-6 mt-6">
      <FiltroEtapaCategoria
        etapas={etapas}
        categorias={categorias}
        etapaValue={etapaSel}
        onEtapaChange={setEtapaSel}
        categoriaValue={categoriaSel}
        onCategoriaChange={setCategoriaSel}
      />

      {/* Relatório 1: Média de Pontos por Piloto */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
          <CardTitle className="flex items-center gap-3 text-lg">
            <Target className="w-5 h-5" />
            Média de Pontos por Piloto (por Etapa e Total)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Piloto</TableHead>
                <TableHead className="font-bold text-center">Etapas</TableHead>
                <TableHead className="font-bold text-center">Pontos Totais</TableHead>
                <TableHead className="font-bold text-center">Média por Etapa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mediaPontos.map((item, index) => (
                <TableRow key={item.piloto} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <TableCell className="font-semibold">{item.piloto}</TableCell>
                  <TableCell className="text-center">{item.etapas}</TableCell>
                  <TableCell className="text-center"><Badge className="bg-emerald-100 text-emerald-800">{item.pontos.toFixed(1)}</Badge></TableCell>
                  <TableCell className="text-center font-bold">{item.media_pontos.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {mediaPontos.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">Sem dados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Relatório 2: Média de Colocação por Piloto */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardTitle className="flex items-center gap-3 text-lg">
            <ListOrdered className="w-5 h-5" />
            Média de Colocação por Piloto
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Piloto</TableHead>
                <TableHead className="font-bold text-center">Etapas</TableHead>
                <TableHead className="font-bold text-center">Média de Colocação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mediaColocacao.map((item, index) => (
                <TableRow key={item.piloto} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <TableCell className="font-semibold">{item.piloto}</TableCell>
                  <TableCell className="text-center">{item.etapas}</TableCell>
                  <TableCell className="text-center"><Badge className="bg-blue-100 text-blue-800 font-bold">{item.media_posicao.toFixed(2)}º</Badge></TableCell>
                </TableRow>
              ))}
              {mediaColocacao.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-500">Sem dados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Relatório 3: Média Geral - Posição x Colocação x Penalidade */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
          <CardTitle className="flex items-center gap-3 text-lg">
            <Gauge className="w-5 h-5" />
            Média Geral: Posição x Melhor Colocação x Penalidade
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Piloto</TableHead>
                <TableHead className="font-bold text-center">Média de Posição</TableHead>
                <TableHead className="font-bold text-center">Melhor Colocação</TableHead>
                <TableHead className="font-bold text-center">Média de Penalidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mediaGeral.map((item, index) => (
                <TableRow key={item.piloto} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <TableCell className="font-semibold">{item.piloto}</TableCell>
                  <TableCell className="text-center font-bold">{item.media_posicao.toFixed(2)}º</TableCell>
                  <TableCell className="text-center"><Badge className="bg-yellow-100 text-yellow-800 font-bold">{item.melhorPosicao != null ? `${item.melhorPosicao}º` : "-"}</Badge></TableCell>
                  <TableCell className="text-center">
                    {item.media_penalidade > 0
                      ? <Badge variant="destructive">-{item.media_penalidade.toFixed(2)}</Badge>
                      : <span className="text-gray-400 text-xs">—</span>}
                  </TableCell>
                </TableRow>
              ))}
              {mediaGeral.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">Sem dados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}