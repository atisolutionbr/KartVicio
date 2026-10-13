import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Trophy, Medal, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LOGO_URL = "/media/621866bf89891ec2.jpg";

function getInitial(nome) {
  return (nome || "?").trim().charAt(0).toUpperCase();
}

function getAvatarColor(posicao) {
  if (posicao === 1) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-gray-900";
  if (posicao === 2) return "bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900";
  if (posicao === 3) return "bg-gradient-to-br from-orange-400 to-orange-600 text-white";
  return "bg-gradient-to-br from-blue-800 to-blue-950 text-white";
}

function getRowBg(posicao) {
  if (posicao === 1) return "bg-yellow-50";
  if (posicao === 2) return "bg-gray-50";
  if (posicao === 3) return "bg-orange-50";
  return "bg-white";
}

function posColor(pos) {
  if (pos === 1) return "bg-yellow-400 text-gray-900";
  if (pos === 2) return "bg-gray-300 text-gray-900";
  if (pos === 3) return "bg-orange-400 text-white";
  return "bg-gray-100 text-gray-600";
}

export default function RankingCard({
  ranking,
  titulo,
  logoUrl,
  categorias = [],
  categoriaAtiva = "todas",
  onCategoriaChange,
  etapas = [],
  modoDescarte = false,
  onModoDescarteChange,
  onExport,
  exporting,
  mostrarPenalidade = true,
  mostrarEtapas = true,
  etapasDescartadasPorPiloto = {},
}) {
  const [showAll, setShowAll] = useState(false);
  const displayRanking = showAll ? ranking : ranking.slice(0, 50);

  const temCategorias = categorias.length > 0;

  return (
    <Card className="shadow-xl border-0 overflow-hidden rounded-2xl">
      {/* Cabeçalho navy com logo e título */}
      <div
        className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap"
        style={{ background: "linear-gradient(135deg, #0a1628 0%, #1e3a5c 100%)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logoUrl || LOGO_URL}
            alt="Logo"
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-yellow-400/40"
          />
          <div className="min-w-0">
            <h2 className="text-white font-bold text-base sm:text-lg truncate">{titulo || "Ranking"}</h2>
            <p className="text-blue-300 text-xs">{ranking.length} pilotos</p>
          </div>
        </div>
        {onExport && (
          <Button
            onClick={onExport}
            disabled={exporting}
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold flex-shrink-0"
          >
            <Download className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{exporting ? "Exportando..." : "PDF"}</span>
          </Button>
        )}
      </div>

      {/* Tabs de categoria + toggle de descarte */}
      {(temCategorias || onModoDescarteChange) && (
        <div className="px-4 sm:px-6 py-3 border-b bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
          {temCategorias && onCategoriaChange && (
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                size="sm"
                variant={categoriaAtiva === "todas" ? "default" : "ghost"}
                onClick={() => onCategoriaChange("todas")}
                className={`h-8 text-xs font-bold ${categoriaAtiva === "todas" ? "bg-[#0a1628] text-white" : "text-gray-600"}`}
              >
                Todas
              </Button>
              {categorias.map(cat => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={categoriaAtiva === cat.nome ? "default" : "ghost"}
                  onClick={() => onCategoriaChange(cat.nome)}
                  className="h-8 text-xs font-bold"
                  style={categoriaAtiva === cat.nome ? { backgroundColor: cat.cor, color: "#fff" } : {}}
                >
                  {cat.nome}
                </Button>
              ))}
            </div>
          )}
          {onModoDescarteChange && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onModoDescarteChange(false)}
                className={`text-sm font-bold px-3 py-1 rounded-lg transition-colors ${!modoDescarte ? "text-[#0a1628] bg-yellow-100" : "text-gray-400 hover:text-gray-600"}`}
              >
                Sem descarte
              </button>
              <button
                onClick={() => onModoDescarteChange(true)}
                className={`text-sm font-bold px-3 py-1 rounded-lg transition-colors ${modoDescarte ? "text-red-700 bg-red-100" : "text-gray-400 hover:text-gray-600"}`}
              >
                Com descarte
              </button>
            </div>
          )}
        </div>
      )}

      <CardContent className="p-0">
        {/* Mobile: card list (sem scroll horizontal) */}
        <div className="block sm:hidden divide-y divide-gray-100">
          {displayRanking.map((item) => {
            const catInfo = categorias.find(c => c.nome === item.categoria);
            return (
              <div key={item.piloto} className={`flex items-center gap-3 px-4 py-4 ${getRowBg(item.posicao)}`}>
                <div className="flex items-center gap-1 w-12 flex-shrink-0 justify-center">
                  {item.posicao === 1 && <Crown className="w-5 h-5 text-yellow-500" />}
                  {item.posicao === 2 && <Trophy className="w-5 h-5 text-gray-400" />}
                  {item.posicao === 3 && <Medal className="w-5 h-5 text-orange-500" />}
                  <span className="font-extrabold text-xl text-gray-900">{item.posicao}º</span>
                </div>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 ${getAvatarColor(item.posicao)}`}>
                  {getInitial(item.piloto)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-lg leading-tight text-gray-900 line-clamp-2">{item.piloto}</div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {catInfo && temCategorias && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-white text-xs font-bold" style={{ backgroundColor: catInfo.cor }}>
                        {catInfo.nome}
                      </span>
                    )}
                    {item.recentes && item.recentes.length > 0 && (
                      <div className="flex items-center gap-1">
                        {item.recentes.slice(-3).map((r, i) => (
                          <span key={i} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${r ? posColor(r.posicao) : "bg-gray-100 text-gray-300"}`}>
                            {r ? r.posicao : "–"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {etapasDescartadasPorPiloto[item.piloto]?.length > 0 && (
                    <div className="text-xs text-red-500 font-semibold mt-1">descarte aplicado</div>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="inline-flex flex-col items-end rounded-xl px-3 py-1.5" style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)" }}>
                    <span className="font-extrabold text-3xl leading-none text-gray-900">{item.pontos_totais}</span>
                    <span className="text-[11px] font-bold text-gray-800/80 mt-0.5">pts</span>
                  </div>
                  {mostrarEtapas && (
                    <div className="text-xs text-gray-500 mt-1 font-semibold">{item.etapas_disputadas} etapas</div>
                  )}
                </div>
              </div>
            );
          })}
          {ranking.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-sm">Nenhum resultado registrado</p>
            </div>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                <TableHead className="font-bold text-gray-700 text-center w-16 p-3">#</TableHead>
                <TableHead className="font-bold text-gray-700 p-3">Piloto</TableHead>
                {mostrarPenalidade && <TableHead className="font-bold text-gray-700 text-center p-3 hidden sm:table-cell">Pen.</TableHead>}
                <TableHead className="font-bold text-gray-700 text-center p-3 hidden md:table-cell">MV</TableHead>
                <TableHead className="font-bold text-gray-700 text-center p-3">Pts</TableHead>
                {etapas.length > 0 && (
                  <TableHead className="font-bold text-gray-700 text-center p-3 hidden lg:table-cell">Últimas Etapas</TableHead>
                )}
                {mostrarEtapas && (
                  <TableHead className="font-bold text-gray-700 text-center p-3 hidden sm:table-cell">Etapas</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRanking.map((item) => {
                const catInfo = categorias.find(c => c.nome === item.categoria);
                const descartadas = etapasDescartadasPorPiloto[item.piloto] || [];
                return (
                  <TableRow key={item.piloto} className={`${getRowBg(item.posicao)} border-b border-gray-100 hover:bg-blue-50/50 transition-colors`}>
                    <TableCell className="text-center p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.posicao === 1 && <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                        {item.posicao === 2 && <Trophy className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                        {item.posicao === 3 && <Medal className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                        <span className="font-extrabold text-base text-gray-900">{item.posicao}º</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${getAvatarColor(item.posicao)}`}>
                          {getInitial(item.piloto)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-gray-900 truncate">{item.piloto}</div>
                          {catInfo && temCategorias && categoriaAtiva === "todas" && (
                          <span className="sm:hidden inline-block px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: catInfo.cor }}>
                            {catInfo.nome}
                          </span>
                          )}
                          {descartadas.length > 0 && (
                            <div className="text-[10px] text-red-500 font-semibold">descarte: {descartadas.length}ª</div>
                          )}
                        </div>
                        {catInfo && temCategorias && categoriaAtiva === "todas" && (
                          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: catInfo.cor }}>
                            {catInfo.nome}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {mostrarPenalidade && (
                      <TableCell className="text-center p-3 hidden sm:table-cell">
                        {(item.pontos_penalidades || 0) > 0 ? (
                          <Badge variant="destructive" className="font-bold text-xs">-{item.pontos_penalidades}</Badge>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-center p-3 hidden md:table-cell">
                      {(item.pontos_melhor_volta || 0) > 0 ? (
                        <Badge className="bg-blue-100 text-blue-800 font-bold text-xs">+{item.pontos_melhor_volta}</Badge>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-center p-3">
                      <span className={`font-extrabold text-lg ${item.posicao <= 3 ? "text-gray-900" : "text-gray-800"}`}>
                        {item.pontos_totais}
                      </span>
                    </TableCell>
                    {etapas.length > 0 && (
                      <TableCell className="text-center p-3 hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          {item.recentes && item.recentes.length > 0 ? (
                            item.recentes.map((r, i) => (
                              <span
                                key={i}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${r ? posColor(r.posicao) : "bg-gray-50 text-gray-300"}`}
                                title={r ? `${r.posicao}º lugar` : "Não disputou"}
                              >
                                {r ? r.posicao : "–"}
                              </span>
                            ))
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {etapas.slice(-4).map(e => {
                                const res = item.porEtapa?.[e.id];
                                return (
                                  <span
                                    key={e.id}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${res ? posColor(res.posicao) : "bg-gray-50 text-gray-300"}`}
                                    title={res ? `${res.posicao}º na ${e.numero_etapa}ª` : "Não disputou"}
                                  >
                                    {res ? res.posicao : "–"}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {mostrarEtapas && (
                      <TableCell className="text-center p-3 hidden sm:table-cell">
                        <span className="font-semibold text-sm text-gray-600">{item.etapas_disputadas}</span>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {ranking.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-semibold">Nenhum resultado registrado</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {ranking.length > 50 && (
          <div className="p-3 text-center border-t">
            <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Mostrar menos" : `Ver todos os ${ranking.length} pilotos`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}