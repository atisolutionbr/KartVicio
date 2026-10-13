import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, CheckCircle, AlertTriangle, FileText, Download } from "lucide-react";

/**
 * Importa resultados de uma etapa via CSV.
 * Formato esperado: posicao,piloto_nome,pontos_melhor_volta
 * Exemplo:
 * 1,João Silva,1
 * 2,Pedro Costa,0
 */
export default function ImportarCSV({ pilotos, etapa, onImport, onCancel }) {
  const [preview, setPreview] = useState(null);
  const [erros, setErros] = useState([]);
  const [arquivo, setArquivo] = useState(null);
  const inputRef = useRef();

  const parseCSV = (texto) => {
    const linhas = texto.trim().split("\n").map(l => l.trim()).filter(Boolean);
    const rows = [];
    const errosLocal = [];
    const posicoesUsadas = new Set();
    const pilotosUsados = new Set();

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      // Ignora cabeçalho se presente
      if (i === 0 && isNaN(parseInt(linha.split(",")[0]))) continue;

      const partes = linha.split(",").map(p => p.trim());
      if (partes.length < 2) {
        errosLocal.push(`Linha ${i + 1}: formato inválido (mínimo: posicao,piloto_nome)`);
        continue;
      }

      const posicao = parseInt(partes[0]);
      const piloto_nome = partes[1];
      const pontos_melhor_volta = parseFloat(partes[2] || "0") || 0;

      if (isNaN(posicao) || posicao < 1 || posicao > 30) {
        errosLocal.push(`Linha ${i + 1}: posição inválida "${partes[0]}"`);
        continue;
      }
      if (!piloto_nome) {
        errosLocal.push(`Linha ${i + 1}: nome do piloto vazio`);
        continue;
      }
      if (posicoesUsadas.has(posicao)) {
        errosLocal.push(`Linha ${i + 1}: posição ${posicao} duplicada`);
        continue;
      }
      if (pilotosUsados.has(piloto_nome.toLowerCase())) {
        errosLocal.push(`Linha ${i + 1}: piloto "${piloto_nome}" duplicado`);
        continue;
      }

      // Verificar se o piloto existe (aviso, não erro bloqueante)
      const pilotoExiste = pilotos.some(p => p.nome.toLowerCase() === piloto_nome.toLowerCase());
      if (!pilotoExiste) {
        errosLocal.push(`Linha ${i + 1}: ⚠️ Piloto "${piloto_nome}" não encontrado no cadastro (será importado mesmo assim)`);
      }

      // Normaliza nome para o nome exato do cadastro se encontrar
      const pilotoCadastro = pilotos.find(p => p.nome.toLowerCase() === piloto_nome.toLowerCase());
      
      posicoesUsadas.add(posicao);
      pilotosUsados.add(piloto_nome.toLowerCase());
      rows.push({
        posicao,
        piloto_nome: pilotoCadastro ? pilotoCadastro.nome : piloto_nome,
        pontos_melhor_volta,
      });
    }

    return { rows: rows.sort((a, b) => a.posicao - b.posicao), erros: errosLocal };
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArquivo(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const { rows, erros: errosLocal } = parseCSV(evt.target.result);
      setPreview(rows);
      setErros(errosLocal);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = () => {
    if (!preview || preview.length === 0) return;
    onImport(preview);
  };

  const downloadModelo = () => {
    const conteudo = "posicao,piloto_nome,pontos_melhor_volta\n1,João Silva,1\n2,Pedro Costa,0\n3,Carlos Souza,0";
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_resultados.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const errosBlockers = erros.filter(e => !e.includes("⚠️"));
  const avisos = erros.filter(e => e.includes("⚠️"));
  const podeImportar = preview && preview.length > 0 && errosBlockers.length === 0;

  return (
    <Card className="mb-6 shadow-lg border-2 border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-800 text-white">
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importar Resultados via CSV
          {etapa && (
            <Badge className="ml-auto bg-white/20 text-white">
              {etapa.numero_etapa}ª Etapa — {etapa.local || ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadModelo}
            className="text-blue-700 border-blue-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar modelo CSV
          </Button>
          <span className="text-sm text-gray-500">
            Formato: <code className="bg-gray-100 px-1 rounded text-xs">posicao,piloto_nome,pontos_melhor_volta</code>
          </span>
        </div>

        <div
          className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <FileText className="w-10 h-10 mx-auto text-blue-400 mb-3" />
          <p className="text-gray-700 font-medium mb-1">{arquivo || "Clique para selecionar o arquivo CSV"}</p>
          <p className="text-sm text-gray-400">ou arraste e solte aqui</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {errosBlockers.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
            <p className="font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Erros que impedem a importação:
            </p>
            {errosBlockers.map((e, i) => (
              <p key={i} className="text-sm text-red-600 ml-6">{e}</p>
            ))}
          </div>
        )}

        {avisos.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-1">
            <p className="font-bold text-yellow-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Avisos (não bloqueantes):
            </p>
            {avisos.map((e, i) => (
              <p key={i} className="text-sm text-yellow-700 ml-6">{e}</p>
            ))}
          </div>
        )}

        {preview && preview.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
              <span className="font-bold text-gray-700 text-sm">Pré-visualização — {preview.length} registro(s)</span>
              {podeImportar && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" /> Pronto para importar
                </Badge>
              )}
            </div>
            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-bold">Pos</th>
                    <th className="px-4 py-2 text-left font-bold">Piloto</th>
                    <th className="px-4 py-2 text-center font-bold">MV</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-2 font-bold">{row.posicao}º</td>
                      <td className="px-4 py-2">{row.piloto_nome}</td>
                      <td className="px-4 py-2 text-center">
                        {row.pontos_melhor_volta > 0 ? (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">+{row.pontos_melhor_volta}</Badge>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" /> Cancelar
          </Button>
          <Button
            type="button"
            disabled={!podeImportar}
            onClick={handleImport}
            className="bg-blue-700 hover:bg-blue-800 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar {preview?.length || 0} resultado(s)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}