import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRowColorClass } from "@/utils/rankingColors";
import {calcularDiferencasPontos} from '@/utils/pointGaps.mjs';
import { TrendingUp } from "lucide-react";

// Relatório de diferença de pontos entre pilotos: mostra o gap de cada piloto
// para o líder e para o piloto imediatamente acima, evidenciando disputas próximas.
export default function DiferencaPontosPilotos({ resultados, etapas, campeonato, categoria = 'todas' }) {
  const [aplicarDescarte,setAplicarDescarte]=useState(false);
  const dados = useMemo(()=>calcularDiferencasPontos({resultados,etapas,campeonato,categoria,aplicarDescarte}),[resultados,etapas,campeonato,categoria,aplicarDescarte]);

  const difBadge = (dif) => {
    if (dif === null || dif === undefined) return <span className="text-gray-300">—</span>;
    const abs = Math.abs(dif);
    // Disputa muito próxima (≤ 3 pts): vermelho — briga direta por posição.
    // Gap médio (≤ 10 pts): laranja. Demais: neutro.
    let cls = "bg-gray-100 text-gray-700";
    if (dif === 0) cls = "bg-green-100 text-green-800";
    else if (abs <= 3) cls = "bg-red-100 text-red-800";
    else if (abs <= 10) cls = "bg-orange-100 text-orange-800";
    return (
      <Badge className={`font-bold ${cls}`}>
        {dif > 0 ? `-${dif.toFixed(1)}` : dif === 0 ? "—" : `+${Math.abs(dif).toFixed(1)}`}
      </Badge>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="copa-gradient-navy text-white">
        <CardTitle className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6" />
          Diferença de Pontos entre Pilotos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <p className="text-xs text-gray-500 mb-3">
          Mostra o quanto cada piloto está atrás do líder e do piloto imediatamente acima. Gaps em
          <span className="text-red-700 font-semibold"> vermelho</span> indicam disputa direta (≤ 3 pts).
        </p>
        <div className="mb-4 rounded-lg bg-slate-50 border p-3 space-y-2">
          <label className="flex items-center gap-2 font-semibold cursor-pointer">
            <input type="checkbox" className="h-5 w-5 accent-yellow-500" checked={aplicarDescarte} disabled={!campeonato} onChange={e=>setAplicarDescarte(e.target.checked)}/>
            Aplicar descartes na diferença de pontos
          </label>
          <p className="text-xs text-gray-600">{!campeonato?'Selecione um campeonato específico para aplicar sua regra de descarte.':aplicarDescarte?`Com ${campeonato.descarte_quantidade??1} descarte(s): faltas consomem descartes e resultados penalizados não são descartados. Classificação e diferenças recalculadas pela mesma regra do simulador.`:'Sem descarte automático: mostra os pontos acumulados, excluindo resultados descartados manualmente.'}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="font-bold text-center w-14">Pos</TableHead>
              <TableHead className="font-bold">Piloto</TableHead>
              <TableHead className="font-bold text-center hidden sm:table-cell">Etapas</TableHead>
              <TableHead className="font-bold text-center">Pontos</TableHead>
              <TableHead className="font-bold text-center">Dif. Líder</TableHead>
              <TableHead className="font-bold text-center">Dif. Anterior</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((item) => (
              <TableRow key={item.piloto} className={`${getRowColorClass(item.posicao)} hover:shadow-md transition-all`}>
                <TableCell className="text-center font-bold">{item.posicao}º</TableCell>
                <TableCell className="font-semibold whitespace-nowrap">{item.piloto}</TableCell>
                <TableCell className="text-center hidden sm:table-cell text-gray-500">{item.etapas}</TableCell>
                <TableCell className="text-center font-bold">{item.pontos.toFixed(1)}</TableCell>
                <TableCell className="text-center">{difBadge(item.difLider)}</TableCell>
                <TableCell className="text-center">{difBadge(item.difAnterior)}</TableCell>
              </TableRow>
            ))}
            {dados.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-500">Nenhum resultado registrado</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}