import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, ChevronDown, ChevronUp, User, Clock, Edit, Plus, Trash2, CheckCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const LogAlteracao = base44.entities.LogAlteracao;

const OPERACAO_CONFIG = {
  criar: { label: "Criado", color: "bg-green-100 text-green-800", icon: Plus },
  editar: { label: "Editado", color: "bg-blue-100 text-blue-800", icon: Edit },
  excluir: { label: "Excluído", color: "bg-red-100 text-red-800", icon: Trash2 },
  descartar: { label: "Descartado", color: "bg-orange-100 text-orange-800", icon: RotateCcw },
  finalizar_etapa: { label: "Etapa Finalizada", color: "bg-purple-100 text-purple-800", icon: CheckCircle },
};

export default function HistoricoAlteracoes({ campeonatoId, etapaId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    if (!expanded || !campeonatoId) return;
    setLoading(true);
    const filtro = { campeonato_id: campeonatoId };
    if (etapaId && etapaId !== "all") filtro.etapa_id = etapaId;
    LogAlteracao.filter(filtro, "-created_date", 50).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, [expanded, campeonatoId, etapaId]);

  const formatData = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch { return dateStr; }
  };

  const parseValor = (str) => {
    if (!str) return null;
    try { return JSON.parse(str); } catch { return str; }
  };

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="flex items-center justify-between text-sm font-semibold text-gray-700">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            Histórico de Alterações
            {logs.length > 0 && (
              <Badge className="bg-indigo-100 text-indigo-800 text-xs">{logs.length}</Badge>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma alteração registrada
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {logs.map(log => {
                const cfg = OPERACAO_CONFIG[log.operacao] || OPERACAO_CONFIG.editar;
                const Icon = cfg.icon;
                const isOpen = expandedLog === log.id;
                const anterior = parseValor(log.valor_anterior);
                const novo = parseValor(log.valor_novo);

                return (
                  <div key={log.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{log.descricao}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Badge className={`${cfg.color} text-xs px-1.5 py-0`}>{cfg.label}</Badge>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <User className="w-2.5 h-2.5" />{log.usuario_nome}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />{formatData(log.created_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {(anterior || novo) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2 flex-shrink-0"
                          onClick={() => setExpandedLog(isOpen ? null : log.id)}
                        >
                          {isOpen ? "Ocultar" : "Detalhe"}
                        </Button>
                      )}
                    </div>

                    {isOpen && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {anterior && (
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <p className="text-xs font-bold text-red-700 mb-1">Antes</p>
                            <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">
                              {typeof anterior === "object" ? JSON.stringify(anterior, null, 2) : anterior}
                            </pre>
                          </div>
                        )}
                        {novo && (
                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <p className="text-xs font-bold text-green-700 mb-1">Depois</p>
                            <pre className="text-xs text-green-600 whitespace-pre-wrap break-all">
                              {typeof novo === "object" ? JSON.stringify(novo, null, 2) : novo}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}