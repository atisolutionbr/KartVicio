import React, { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRowColorClass } from "@/utils/rankingColors";

export default function RankingDetalhadoTable({ ranking, etapas }) {
  // Deduplica colunas por número da etapa (campeonatos com categorias podem ter
  // múltiplas etapas distintas com o mesmo numero_etapa, gerando colunas repetidas).
  const etapasUnicas = useMemo(() => {
    const seen = new Set();
    return (etapas || [])
      .slice()
      .sort((a, b) => (a.numero_etapa || 0) - (b.numero_etapa || 0))
      .filter(e => {
        const key = e.numero_etapa;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [etapas]);

  // Mapeia numero_etapa -> lista de etapa_ids que compartilham esse número
  // (categorias diferentes da mesma rodada).
  const numToIds = useMemo(() => {
    const map = {};
    (etapas || []).forEach(e => {
      const key = e.numero_etapa;
      if (!map[key]) map[key] = [];
      map[key].push(e.id);
    });
    return map;
  }, [etapas]);

  const getResultado = (item, numeroEtapa) => {
    const ids = numToIds[numeroEtapa] || [];
    return ids.map(id => item.porEtapa?.[id]).find(Boolean);
  };

  return (
    <>
      {/* Mobile: cards com etapas em scroll horizontal */}
      <div className="block sm:hidden divide-y divide-gray-100 landscape-hide">
        {ranking.map((item) => (
          <div key={item.piloto} className={`px-4 py-4 ${getRowColorClass(item.posicao)}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-extrabold text-xl text-gray-900 w-10 text-center">{item.posicao}º</span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-lg leading-tight text-gray-900 line-clamp-2">{item.piloto}</div>
              </div>
              <div className="flex-shrink-0">
                <div className="inline-flex flex-col items-end rounded-xl px-3 py-1.5" style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)" }}>
                  <span className="font-extrabold text-2xl leading-none text-gray-900">{item.pontos_totais.toFixed(1)}</span>
                  <span className="text-[11px] font-bold text-gray-800/80 mt-0.5">pts</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {etapasUnicas.map((etapa) => {
                const res = getResultado(item, etapa.numero_etapa);
                const isSC = res && (res.status === "NC" || res.status === "DQ");
                return (
                  <div key={etapa.id} className="flex-shrink-0 text-center min-w-[64px] px-2 py-1.5 rounded-lg bg-white/70 border border-gray-200">
                    <div className="text-xs text-gray-400 font-semibold">{etapa.numero_etapa}ª</div>
                    <div className={`text-base font-bold ${isSC ? "text-orange-600" : "text-gray-900"}`}>
                      {res ? (res.status === "NC" ? "NC" : res.status === "DQ" ? "DQ" : `${res.posicao}º`) : "–"}
                    </div>
                    <div className="text-xs text-gray-500">{res ? `${res.pontos_totais}p` : ""}</div>
                  </div>
                );
              })}
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
              {etapasUnicas.map(etapa => (
                <TableHead key={etapa.id} className="font-bold text-center whitespace-nowrap">
                  {etapa.numero_etapa}ª Etapa
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map((item) => (
              <TableRow key={item.piloto} className={`${getRowColorClass(item.posicao)} hover:shadow-md transition-all`}>
                <TableCell className="text-center font-bold">{item.posicao}º</TableCell>
                <TableCell className="font-semibold whitespace-nowrap">{item.piloto}</TableCell>
                <TableCell className="text-center font-bold">{item.pontos_totais.toFixed(1)}</TableCell>
                {etapasUnicas.map(etapa => {
                  const res = getResultado(item, etapa.numero_etapa);
                  if (!res) return <TableCell key={etapa.id} className="text-center text-gray-300 text-xs">–</TableCell>;
                  const isSC = res.status === "NC" || res.status === "DQ";
                  return (
                    <TableCell key={etapa.id} className="text-center text-xs">
                      <div className={`font-bold ${isSC ? "text-orange-700" : ""}`}>
                        {res.status === "NC" ? "NC" : res.status === "DQ" ? "DQ" : `${res.posicao}º`}
                      </div>
                      <div className="text-gray-500">{res.pontos_totais} pts</div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {ranking.length === 0 && (
              <TableRow>
                <TableCell colSpan={3 + etapasUnicas.length} className="text-center py-10 text-gray-500">Nenhum resultado registrado</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}