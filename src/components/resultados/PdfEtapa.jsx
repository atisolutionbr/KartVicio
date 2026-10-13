import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Printer, X, Trophy } from "lucide-react";

const LOGO_URL = "/media/621866bf89891ec2.jpg";

function PdfPreview({ etapa, resultados, campeonato }) {
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <div id="pdf-etapa-content" className="relative bg-white p-6 space-y-4 text-gray-900" style={{ position: "relative" }}>
      {/* Marca d'água de fundo — mix-blend-mode: multiply remove o fundo branco do JPEG */}
      <img
        src={LOGO_URL}
        alt=""
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", opacity: 0.08, mixBlendMode: "multiply", pointerEvents: "none" }}
      />
      {/* Cabeçalho */}
      <div className="relative text-center border-b-2 border-gray-800 pb-4">
        <img src={LOGO_URL} alt="KartVicio" className="w-16 h-16 rounded-full object-cover mx-auto mb-2" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", margin: "0 auto 8px" }} />
        <h1 className="text-2xl font-bold">🏁 KartVicio — Resultados da Etapa</h1>
        {campeonato && <p className="text-gray-600 mt-1">{campeonato.nome} — {campeonato.ano}</p>}
        {etapa && (
          <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm">
            <span className="font-bold">{etapa.numero_etapa}ª Etapa</span>
            {etapa.local && <span>📍 {etapa.local}</span>}
            <span>📅 {new Date(etapa.data_hora).toLocaleDateString("pt-BR")}</span>
            {etapa.dobrar_pontos && (
              <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">⚡ Pontos Dobrados</span>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">Gerado em {hoje}</p>
      </div>

      {/* Tabela */}
      <div>
        <h2 className="text-lg font-bold mb-2">🏆 Classificação Final</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ backgroundColor: "#1a202c", color: "white" }}>
              <th className="px-3 py-2 text-center border border-gray-300">Pos</th>
              <th className="px-3 py-2 text-left border border-gray-300">Piloto</th>
              <th className="px-3 py-2 text-center border border-gray-300">Base</th>
              <th className="px-3 py-2 text-center border border-gray-300">MV</th>
              <th className="px-3 py-2 text-center border border-gray-300">Extra</th>
              <th className="px-3 py-2 text-center border border-gray-300">Pen.</th>
              <th className="px-3 py-2 text-center border border-gray-300 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((res, idx) => {
              const temPenalidade = (res.pontos_penalidade || 0) > 0;
              const bgColor = res.descartado ? "#e5e7eb" : res.posicao <= 3 ? "#fffbeb" : idx % 2 === 0 ? "#ffffff" : "#f9fafb";
              return (
                <tr key={res.id} style={{ backgroundColor: bgColor }}>
                  <td className="px-3 py-2 text-center border border-gray-200 font-bold">
                    {res.status === "NC" ? "NC" : res.status === "DQ" ? "DQ" : res.posicao === 1 ? "🥇" : res.posicao === 2 ? "🥈" : res.posicao === 3 ? "🥉" : `${res.posicao}º`}
                    {res.descartado && <span className="text-xs text-gray-500 ml-1">(d)</span>}
                  </td>
                  <td className="px-3 py-2 text-left border border-gray-200 font-medium">
                    {res.piloto_nome}
                    {temPenalidade && <span className="text-red-500 ml-1">⚠️</span>}
                  </td>
                  <td className="px-3 py-2 text-center border border-gray-200">{res.pontos}</td>
                  <td className="px-3 py-2 text-center border border-gray-200">
                    {(res.pontos_melhor_volta || 0) > 0 ? `+${res.pontos_melhor_volta}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-center border border-gray-200">
                    {(res.pontos_tipo_extra || 0) !== 0
                      ? `${(res.pontos_tipo_extra || 0) >= 0 ? "+" : ""}${res.pontos_tipo_extra}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-center border border-gray-200 text-red-600">
                    {(res.pontos_penalidade || 0) > 0 ? `-${res.pontos_penalidade}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-center border border-gray-200 font-bold text-base">
                    {res.pontos_totais}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Destaques */}
      <div className="grid grid-cols-3 gap-4 pt-2">
        {resultados.find(r => r.posicao === 1) && (
          <div className="border rounded-lg p-3 text-center" style={{ background: "#fffbeb" }}>
            <p className="text-xs text-gray-500 mb-1">🥇 Vencedor</p>
            <p className="font-bold text-sm">{resultados.find(r => r.posicao === 1)?.piloto_nome}</p>
            <p className="text-sm text-gray-600">{resultados.find(r => r.posicao === 1)?.pontos_totais} pts</p>
          </div>
        )}
        {resultados.find(r => (r.pontos_melhor_volta || 0) > 0) && (
          <div className="border rounded-lg p-3 text-center" style={{ background: "#faf5ff" }}>
            <p className="text-xs text-gray-500 mb-1">⚡ Melhor Volta</p>
            <p className="font-bold text-sm">{resultados.find(r => (r.pontos_melhor_volta || 0) > 0)?.piloto_nome}</p>
          </div>
        )}
        {resultados.filter(r => (r.pontos_penalidade || 0) > 0).length > 0 && (
          <div className="border rounded-lg p-3 text-center" style={{ background: "#fff5f5" }}>
            <p className="text-xs text-gray-500 mb-1">⚠️ Penalidades</p>
            <p className="font-bold text-sm text-red-700">
              {resultados.filter(r => (r.pontos_penalidade || 0) > 0).length} piloto(s)
            </p>
          </div>
        )}
      </div>

      <div className="relative border-t pt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
        <img src={LOGO_URL} alt="KartVicio" className="w-6 h-6 rounded-full object-cover" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
        KartVicio — Sistema de Gestão de Campeonatos • {hoje}
      </div>
    </div>
  );
}

export default function PdfEtapa({ etapas, resultados, campeonato, onClose }) {
  const [etapaSelecionada, setEtapaSelecionada] = useState(etapas.length > 0 ? etapas[0].id : "");
  const [imprimindo, setImprimindo] = useState(false);

  const etapa = etapas.find(e => e.id === etapaSelecionada);
  const resultadosEtapa = resultados
    .filter(r => r.etapa_id === etapaSelecionada)
    .sort((a, b) => {
      const aSC = a.status === "NC" || a.status === "DQ";
      const bSC = b.status === "NC" || b.status === "DQ";
      if (aSC && !bSC) return 1;
      if (!aSC && bSC) return -1;
      return a.posicao - b.posicao;
    });

  const handlePrint = () => {
    setImprimindo(true);
    const conteudo = document.getElementById("pdf-etapa-content");
    if (!conteudo) { setImprimindo(false); return; }

    const janelaImpressao = window.open("", "_blank", "width=850,height=700");
    janelaImpressao.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Resultados — ${etapa?.numero_etapa}ª Etapa</title>
<style>
body{font-family:Arial,sans-serif;margin:20px;color:#111;}
table{width:100%;border-collapse:collapse;}
th,td{border:1px solid #ccc;padding:6px 10px;}
.font-bold{font-weight:bold;}
@media print{body{margin:0;}}
</style></head><body>${conteudo.innerHTML}</body></html>`);
    janelaImpressao.document.close();
    janelaImpressao.focus();
    setTimeout(() => {
      janelaImpressao.print();
      janelaImpressao.close();
      setImprimindo(false);
    }, 1200);
  };

  return (
    <Card className="mb-6 shadow-lg border-2 border-orange-200">
      <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Resumo PDF / Impressão da Etapa
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Etapa:</label>
          <Select value={etapaSelecionada} onValueChange={setEtapaSelecionada}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Selecione uma etapa" />
            </SelectTrigger>
            <SelectContent>
              {etapas.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.numero_etapa}ª Etapa {e.local ? `— ${e.local}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge className={resultadosEtapa.length > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
            {resultadosEtapa.length} resultado(s)
          </Badge>
        </div>

        {resultadosEtapa.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum resultado registrado para esta etapa.</p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden shadow-sm">
            <PdfPreview etapa={etapa} resultados={resultadosEtapa} campeonato={campeonato} />
          </div>
        )}

        {resultadosEtapa.length > 0 && (
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" /> Fechar
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              disabled={imprimindo}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              {imprimindo ? "Abrindo..." : "Imprimir / Salvar PDF"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}