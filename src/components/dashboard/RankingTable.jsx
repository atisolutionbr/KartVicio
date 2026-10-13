import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RankingTable({ ranking, loading }) {
  const getPosicaoIcon = (posicao) => {
    switch (posicao) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-orange-500" />;
      default: return <span className="font-bold text-gray-600">#{posicao}</span>;
    }
  };

  const getRowClass = (index) => {
    if (index === 0) return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500";
    if (index === 1) return "bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400";
    if (index === 2) return "bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-500";
    return index % 2 === 0 ? "bg-gray-50" : "bg-white";
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Ranking Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Ranking Geral - Copa Motor Pocado
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold">Pos</TableHead>
                <TableHead className="font-bold">Piloto</TableHead>
                <TableHead className="font-bold text-center">Pontos Totais</TableHead>
                <TableHead className="font-bold text-center">Etapas</TableHead>
                <TableHead className="font-bold text-center">Melhor Posição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((piloto, index) => (
                <TableRow key={piloto.nome} className={`${getRowClass(index)} hover:bg-blue-50 transition-colors`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getPosicaoIcon(index + 1)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-gray-900">{piloto.nome}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="secondary" 
                      className={`font-bold px-3 py-1 ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                        index === 1 ? 'bg-gray-100 text-gray-800 border-gray-300' :
                        index === 2 ? 'bg-orange-100 text-orange-800 border-orange-300' :
                        'bg-blue-100 text-blue-800 border-blue-300'
                      }`}
                    >
                      {piloto.pontos_total} pts
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {piloto.etapas_disputadas}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-medium">
                      {piloto.melhor_posicao < 99 ? `${piloto.melhor_posicao}º` : "-"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {ranking.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Nenhuma pontuação registrada ainda
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}