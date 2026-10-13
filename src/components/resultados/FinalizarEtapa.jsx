import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle, Lock, Unlock, FileText, AlertTriangle } from "lucide-react";
import PdfEtapa from "./PdfEtapa";

const Etapa = base44.entities.Etapa;
const LogAlteracao = base44.entities.LogAlteracao;

export default function FinalizarEtapa({ etapas, resultados, campeonato, onEtapaFinalizada, userPermissions, userInfo }) {
  const [showPdf, setShowPdf] = useState(false);
  const [loading, setLoading] = useState(null);

  const etapasComResultados = etapas.filter(e => resultados.some(r => r.etapa_id === e.id));

  const handleFinalizar = async (etapa) => {
    setLoading(etapa.id);
    await Etapa.update(etapa.id, { finalizada: true });

    // Registrar no log
    await LogAlteracao.create({
      entidade: "Etapa",
      entidade_id: etapa.id,
      operacao: "finalizar_etapa",
      usuario_nome: userInfo?.full_name || userPermissions?.nome || "Sistema",
      usuario_email: userInfo?.email || userPermissions?.email || "",
      campeonato_id: campeonato?.id || "",
      etapa_id: etapa.id,
      piloto_nome: "",
      valor_anterior: JSON.stringify({ finalizada: false }),
      valor_novo: JSON.stringify({ finalizada: true }),
      descricao: `Etapa ${etapa.numero_etapa}ª finalizada e travada por ${userInfo?.full_name || userPermissions?.nome || "Sistema"}`
    });

    setLoading(null);
    setShowPdf(true);
    onEtapaFinalizada?.();
  };

  const handleReabrir = async (etapa) => {
    setLoading(etapa.id);
    await Etapa.update(etapa.id, { finalizada: false });

    await LogAlteracao.create({
      entidade: "Etapa",
      entidade_id: etapa.id,
      operacao: "editar",
      usuario_nome: userInfo?.full_name || userPermissions?.nome || "Sistema",
      usuario_email: userInfo?.email || userPermissions?.email || "",
      campeonato_id: campeonato?.id || "",
      etapa_id: etapa.id,
      piloto_nome: "",
      descricao: `Etapa ${etapa.numero_etapa}ª reaberta para edição por ${userInfo?.full_name || userPermissions?.nome || "Sistema"}`
    });

    setLoading(null);
    onEtapaFinalizada?.();
  };

  if (!userPermissions || userPermissions.permissao !== 'admin') return null;

  return (
    <Card className="border-2 border-indigo-200 shadow-sm">
      <CardHeader className="py-3 px-4 bg-indigo-50">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-indigo-800">
          <CheckCircle className="w-4 h-4" />
          Finalizar / Reabrir Etapas
          <span className="text-xs font-normal text-indigo-500 ml-1">— Apenas admins</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2">
          {etapasComResultados.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">Nenhuma etapa com resultados lançados</p>
          )}
          {etapasComResultados.sort((a, b) => a.numero_etapa - b.numero_etapa).map(etapa => {
            const qtdResultados = resultados.filter(r => r.etapa_id === etapa.id).length;
            return (
              <div key={etapa.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white border border-gray-100">
                <div className="flex items-center gap-2">
                  {etapa.finalizada
                    ? <Lock className="w-4 h-4 text-red-500 flex-shrink-0" />
                    : <Unlock className="w-4 h-4 text-green-500 flex-shrink-0" />
                  }
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      {etapa.numero_etapa}ª Etapa
                    </span>
                    {etapa.local && <span className="text-xs text-gray-400 ml-1">· {etapa.local}</span>}
                  </div>
                  <Badge className={`text-xs ${etapa.finalizada ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {etapa.finalizada ? "Fechada" : "Aberta"}
                  </Badge>
                  <span className="text-xs text-gray-400">{qtdResultados} resultados</span>
                </div>

                <div className="flex items-center gap-2">
                  {etapa.finalizada ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-orange-400 text-orange-600 hover:bg-orange-50"
                        onClick={() => setShowPdf(true)}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-xs border-blue-400 text-blue-600 hover:bg-blue-50" disabled={loading === etapa.id}>
                            <Unlock className="w-3 h-3 mr-1" />
                            Reabrir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-orange-500" />
                              Reabrir {etapa.numero_etapa}ª Etapa?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta etapa será reaberta para edição. A ação ficará registrada no histórico de alterações.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleReabrir(etapa)} className="bg-blue-600 hover:bg-blue-700">
                              Reabrir Etapa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading === etapa.id}>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {loading === etapa.id ? "Finalizando..." : "Finalizar"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-indigo-600" />
                            Finalizar {etapa.numero_etapa}ª Etapa?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong>Esta etapa será travada:</strong> nenhum resultado poderá ser editado ou excluído após a finalização. 
                            Um PDF com o resumo será gerado automaticamente.<br /><br />
                            <strong>{qtdResultados} resultados</strong> serão finalizados. Esta ação fica registrada no histórico.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleFinalizar(etapa)} className="bg-indigo-600 hover:bg-indigo-700">
                            <Lock className="w-3 h-3 mr-1" />
                            Finalizar e Gerar PDF
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showPdf && (
          <div className="mt-4">
            <PdfEtapa
              etapas={etapasComResultados}
              resultados={resultados}
              campeonato={campeonato}
              onClose={() => setShowPdf(false)}
              autoSelect={etapasComResultados.find(e => e.finalizada)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}