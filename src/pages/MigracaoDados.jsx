import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, Database } from "lucide-react";

const Campeonato = base44.entities.Campeonato;
const Etapa = base44.entities.Etapa;
const ResultadoEtapa = base44.entities.ResultadoEtapa;
const Penalidade = base44.entities.Penalidade;
const TabelaPontos = base44.entities.TabelaPontos;
const TabelaPontosCampeonato = base44.entities.TabelaPontosCampeonato;
const InscricaoPiloto = base44.entities.InscricaoPiloto;
const Piloto = base44.entities.Piloto;

export default function MigracaoDadosPage({ userPermissions }) {
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [log, setLog] = useState([]);
  const [campeonatoId, setCampeonatoId] = useState(null);

  const canRun = userPermissions?.permissao === 'admin';

  const addLog = (msg, type = "info") => {
    setLog(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const executarMigracao = async () => {
    setStatus("running");
    setLog([]);

    // 1. Criar (ou encontrar) o campeonato Copa Motor Pocado
    addLog("🔍 Verificando se campeonato já existe...");
    const existing = await Campeonato.list();
    let camp = existing.find(c => c.nome === "Copa Motor Pocado");

    if (!camp) {
      addLog("🏆 Criando campeonato 'Copa Motor Pocado'...");
      camp = await Campeonato.create({
        nome: "Copa Motor Pocado",
        descricao: "Campeonato original migrado automaticamente",
        ano: 2026,
        ativo: true,
        numero_etapas_planejadas: 14,
        descarte_ativo: false,
        descarte_min_etapas: 10,
        pontos_melhor_volta: 1,
      });
      addLog(`✅ Campeonato criado com ID: ${camp.id}`, "success");
    } else {
      addLog(`✅ Campeonato existente encontrado: ${camp.id}`, "success");
    }
    setCampeonatoId(camp.id);

    // 2. Migrar Etapas sem campeonato_id
    addLog("📅 Buscando etapas sem campeonato_id...");
    const etapas = await Etapa.list();
    const etapasSemCamp = etapas.filter(e => !e.campeonato_id);
    addLog(`   Encontradas: ${etapasSemCamp.length} etapas para migrar`);
    for (const etapa of etapasSemCamp) {
      await Etapa.update(etapa.id, { campeonato_id: camp.id });
    }
    addLog(`✅ ${etapasSemCamp.length} etapas migradas`, "success");

    // 3. Migrar ResultadoEtapa sem campeonato_id
    addLog("🏁 Buscando resultados sem campeonato_id...");
    const resultados = await ResultadoEtapa.list();
    const resultadosSemCamp = resultados.filter(r => !r.campeonato_id);
    addLog(`   Encontrados: ${resultadosSemCamp.length} resultados para migrar`);
    let countRes = 0;
    for (const res of resultadosSemCamp) {
      await ResultadoEtapa.update(res.id, { campeonato_id: camp.id });
      countRes++;
      if (countRes % 20 === 0) addLog(`   Progresso: ${countRes}/${resultadosSemCamp.length}`);
    }
    addLog(`✅ ${resultadosSemCamp.length} resultados migrados`, "success");

    // 4. Migrar Penalidades sem campeonato_id
    addLog("⚠️ Buscando penalidades sem campeonato_id...");
    const penalidades = await Penalidade.list();
    const penalidadesSemCamp = penalidades.filter(p => !p.campeonato_id);
    addLog(`   Encontradas: ${penalidadesSemCamp.length} penalidades para migrar`);
    for (const pen of penalidadesSemCamp) {
      await Penalidade.update(pen.id, { campeonato_id: camp.id });
    }
    addLog(`✅ ${penalidadesSemCamp.length} penalidades migradas`, "success");

    // 5. Copiar TabelaPontos global para TabelaPontosCampeonato
    addLog("🎯 Copiando tabela de pontos global para o campeonato...");
    const tabelaGlobal = await TabelaPontos.list();
    const tabelaCampExisting = await TabelaPontosCampeonato.filter({ campeonato_id: camp.id });
    if (tabelaCampExisting.length === 0 && tabelaGlobal.length > 0) {
      for (const item of tabelaGlobal) {
        await TabelaPontosCampeonato.create({ campeonato_id: camp.id, posicao: item.posicao, pontos: item.pontos });
      }
      addLog(`✅ ${tabelaGlobal.length} posições da tabela de pontos copiadas`, "success");
    } else {
      addLog(`ℹ️ Tabela de pontos do campeonato já existe (${tabelaCampExisting.length} entradas), pulando.`);
    }

    // 6. Inscrever pilotos ativos no campeonato
    addLog("👥 Inscrevendo pilotos no campeonato...");
    const pilotos = await Piloto.filter({ ativo: true });
    const inscricoesExisting = await InscricaoPiloto.filter({ campeonato_id: camp.id });
    let inscricoesAdicionadas = 0;
    for (const piloto of pilotos) {
      const already = inscricoesExisting.find(i => i.piloto_nome === piloto.nome);
      if (!already) {
        await InscricaoPiloto.create({ campeonato_id: camp.id, piloto_nome: piloto.nome, ativo: true });
        inscricoesAdicionadas++;
      }
    }
    addLog(`✅ ${inscricoesAdicionadas} pilotos inscritos no campeonato`, "success");

    addLog("🎉 Migração concluída com sucesso!", "success");
    setStatus("done");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔄 Migração de Dados</h1>
        <p className="text-gray-600">Vincule os dados existentes ao novo modelo de campeonatos</p>
      </div>

      <Card className="border-2 border-orange-400 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Migração para Multi-Campeonato
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800">O que esta migração faz:</p>
                <ul className="text-sm text-orange-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Cria o campeonato "Copa Motor Pocado" (se não existir)</li>
                  <li>Vincula todas as etapas existentes a este campeonato</li>
                  <li>Vincula todos os resultados existentes a este campeonato</li>
                  <li>Vincula todas as penalidades existentes a este campeonato</li>
                  <li>Copia a tabela de pontos global para o campeonato</li>
                  <li>Inscreve todos os pilotos ativos no campeonato</li>
                </ul>
                <p className="text-sm text-orange-700 mt-3 font-medium">
                  ⚡ Esta operação é segura e pode ser executada múltiplas vezes sem duplicar dados.
                </p>
              </div>
            </div>
          </div>

          {!canRun && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              Apenas administradores podem executar a migração.
            </div>
          )}

          {canRun && status === "idle" && (
            <Button onClick={executarMigracao} className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
              <Database className="w-4 h-4 mr-2" />
              Executar Migração
            </Button>
          )}

          {status === "running" && (
            <Button disabled className="bg-orange-400 text-white font-bold">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Migrando...
            </Button>
          )}

          {status === "done" && (
            <div className="flex items-center gap-3">
              <Badge className="bg-green-100 text-green-800 text-base py-1 px-3">
                <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                Migração concluída!
              </Badge>
              {campeonatoId && (
                <a href={`/Campeonatos`} className="text-blue-600 underline text-sm">Ver Campeonatos →</a>
              )}
            </div>
          )}

          {/* Log */}
          {log.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm space-y-1">
              {log.map((entry, idx) => (
                <div key={idx} className={`${entry.type === 'success' ? 'text-green-400' : entry.type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                  <span className="text-gray-500 mr-2">[{entry.time}]</span>
                  {entry.msg}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}