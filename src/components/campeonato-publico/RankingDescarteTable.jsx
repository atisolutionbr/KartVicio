import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Info, CalendarX } from "lucide-react";
import { getRowColorClass } from "@/utils/rankingColors";

export default function RankingDescarteTable({ ranking, etapas, campeonato, temCategorias }) {
  const getEtapaLabel = (etapaId) => {
    const e = etapas.find(x => x.id === etapaId);
    if (!e) return "—";
    const data = e.data_hora ? new Date(e.data_hora).toLocaleDateString("pt-BR") : "";
    const local = e.local || "";
    return `${e.numero_etapa}ª${local ? ` · ${local}${data ? ` (${data})` : ""}` : data ? ` · ${data}` : ""}`;
  };
  const getEtapaNumero = (etapaId) => {
    const e = etapas.find(x => x.id === etapaId);
    return e ? `${e.numero_etapa}ª` : "—";
  };

  const descarteQuantidade = campeonato?.descarte_quantidade ?? 1;
  if (descarteQuantidade <= 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Info className="w-7 h-7 mx-auto mb-2 text-gray-400" />
        <p className="font-semibold">Descarte não configurado</p>
        <p className="text-xs mt-1">Defina a quantidade de descartes nas configurações do campeonato para visualizar o ranking com descarte.</p>
      </div>
    );
  }

  const infoText = (
    <div className="p-3 bg-gray-50 border-t text-xs text-gray-600">
      Descarte: {descarteQuantidade} etapa(s). As <b>faltas</b> consomem os descartes primeiro.
      Se o piloto faltou mais (ou igual) que o total de descartes, nenhuma etapa real é descartada.
      Se sobram descartes, descarta a pior etapa (sem penalidade). Etapas com penalidade nunca são descartadas.
    </div>
  );

  return (
    <>
      {/* Mobile: cards */}
      <div className="block sm:hidden divide-y divide-gray-100 landscape-hide">
        {ranking.map(item => {
          const cat = temCategorias
            ? (campeonato.categorias || []).find(c => (c.nome || "").trim() === (item.categoria || "").trim())
            : null;
          return (
            <div key={item.piloto} className={`px-4 py-4 ${getRowColorClass(item.posicao)}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-extrabold text-xl text-gray-900 w-10 text-center">{item.posicao}º</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-gray-900 truncate">{item.piloto}</div>
                  {cat && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-white text-xs font-bold mt-1" style={{ backgroundColor: cat.cor }}>
                      {cat.nome}
                    </span>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-extrabold text-xl text-gray-900">{item.pontos_totais} pts</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.etapas_disputadas} etapas</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {item.etapas_descartadas?.length > 0 && item.etapas_descartadas.map(eid => (
                  <Badge key={`d-${eid}`} variant="destructive" className="font-bold text-sm px-2 py-1" title={`Descartada: ${getEtapaLabel(eid)}`}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />{getEtapaNumero(eid)}
                  </Badge>
                ))}
                {item.etapas_ausentes?.length > 0 && item.etapas_ausentes.map(eid => (
                  <Badge key={`a-${eid}`} variant="outline" className="font-bold text-sm px-2 py-1 text-amber-700 border-amber-300 bg-amber-50" title={`Ausência: ${getEtapaLabel(eid)}`}>
                    <CalendarX className="w-3.5 h-3.5 mr-1" />{getEtapaNumero(eid)}
                  </Badge>
                ))}
                {(!item.etapas_descartadas || item.etapas_descartadas.length === 0) &&
                 (!item.etapas_ausentes || item.etapas_ausentes.length === 0) && (
                  <Badge variant="outline" className="text-sm px-2 py-1">Nenhuma descartada</Badge>
                )}
              </div>
            </div>
          );
        })}
        {ranking.length === 0 && (
          <div className="text-center py-10 text-gray-500">Nenhum resultado registrado</div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto landscape-expand">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="font-bold text-center w-12">Pos</TableHead>
              <TableHead className="font-bold">Piloto</TableHead>
              {temCategorias && <TableHead className="font-bold text-center">Cat</TableHead>}
              <TableHead className="font-bold text-center">Descartada</TableHead>
              <TableHead className="font-bold text-center hidden md:table-cell">Melhor Volta</TableHead>
              <TableHead className="font-bold text-center">Pontos</TableHead>
              <TableHead className="font-bold text-center">Etapas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map(item => {
              const cat = temCategorias
                ? (campeonato.categorias || []).find(c => (c.nome || "").trim() === (item.categoria || "").trim())
                : null;
              return (
                <TableRow key={item.piloto} className={`${getRowColorClass(item.posicao)} hover:shadow-md transition-all`}>
                  <TableCell className="text-center font-bold">{item.posicao}º</TableCell>
                  <TableCell className="font-semibold whitespace-nowrap">{item.piloto}</TableCell>
                  {temCategorias && (
                    <TableCell className="text-center">
                      {cat ? (
                        <span className="px-2 py-0.5 rounded-full text-white text-xs font-bold" style={{ backgroundColor: cat.cor }}>
                          {cat.nome}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">{item.categoria || "—"}</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      {item.etapas_descartadas?.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {item.etapas_descartadas.map(eid => (
                            <Badge key={`d-${eid}`} variant="destructive" className="font-bold text-xs" title={`Descartada: ${getEtapaLabel(eid)}`}>
                              <Trash2 className="w-3 h-3 mr-1" />{getEtapaNumero(eid)}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {item.etapas_ausentes?.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {item.etapas_ausentes.map(eid => (
                            <Badge key={`a-${eid}`} variant="outline" className="font-bold text-xs text-amber-700 border-amber-300 bg-amber-50" title={`Ausência: ${getEtapaLabel(eid)}`}>
                              <CalendarX className="w-3 h-3 mr-1" />{getEtapaNumero(eid)}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {(!item.etapas_descartadas || item.etapas_descartadas.length === 0) &&
                       (!item.etapas_ausentes || item.etapas_ausentes.length === 0) && (
                        <Badge variant="outline" className="text-xs">Nenhuma</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    <Badge className="bg-blue-100 text-blue-800 font-bold">+{item.pontos_melhor_volta} pts</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-green-100 text-green-800 font-bold text-base px-3 py-1">{item.pontos_totais} pts</Badge>
                  </TableCell>
                  <TableCell className="text-center font-semibold">{item.etapas_disputadas}</TableCell>
                </TableRow>
              );
            })}
            {ranking.length === 0 && (
              <TableRow>
                <TableCell colSpan={temCategorias ? 7 : 6} className="text-center py-10 text-gray-500">
                  Nenhum resultado registrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {infoText}
    </>
  );
}