import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRowColorClass } from "@/utils/rankingColors";

const posColor = (pos) => {
  if (pos === 1) return "bg-yellow-400 text-gray-900";
  if (pos === 2) return "bg-gray-300 text-gray-900";
  if (pos === 3) return "bg-orange-400 text-white";
  return "bg-gray-100 text-gray-600";
};

export default function RankingResumoTable({ ranking }) {
  return (
    <>
      {/* Mobile: cards */}
      <div className="block sm:hidden divide-y divide-gray-100 landscape-hide">
        {ranking.map((item) => (
          <div key={item.piloto} className={`flex items-center gap-3 px-4 py-4 ${getRowColorClass(item.posicao)}`}>
            <div className="w-12 flex-shrink-0 text-center font-extrabold text-xl text-gray-900">{item.posicao}º</div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-lg leading-tight text-gray-900 line-clamp-2">{item.piloto}</div>
              <div className="flex items-center gap-1 mt-1.5">
                {item.recentes.map((r, i) => (
                  <span key={i} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${r ? posColor(r.posicao) : "bg-gray-100 text-gray-300"}`}>
                    {r ? r.posicao : "–"}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="inline-flex flex-col items-end rounded-xl px-3 py-1.5" style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)" }}>
                <span className="font-extrabold text-3xl leading-none text-gray-900">{item.pontos_totais.toFixed(1)}</span>
                <span className="text-[11px] font-bold text-gray-800/80 mt-0.5">pts</span>
              </div>
            </div>
          </div>
        ))}
        {ranking.length === 0 && (
          <div className="text-center py-10 text-gray-500">Nenhum resultado registrado</div>
        )}
      </div>
      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto landscape-expand">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="font-bold text-center w-14">Pos</TableHead>
              <TableHead className="font-bold">Piloto</TableHead>
              <TableHead className="font-bold text-center">Pts</TableHead>
              <TableHead className="font-bold text-center">Recentes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map((item) => (
              <TableRow key={item.piloto} className={`${getRowColorClass(item.posicao)} hover:shadow-md transition-all`}>
                <TableCell className="text-center font-bold">{item.posicao}º</TableCell>
                <TableCell className="font-semibold">{item.piloto}</TableCell>
                <TableCell className="text-center font-bold">{item.pontos_totais.toFixed(1)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {item.recentes.map((r, i) => (
                      <span
                        key={i}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${r ? posColor(r.posicao) : "bg-gray-50 text-gray-300"}`}
                        title={r ? `${r.posicao}º lugar` : "Não disputou"}
                      >
                        {r ? `${r.posicao}º` : "–"}
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {ranking.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-gray-500">Nenhum resultado registrado</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}