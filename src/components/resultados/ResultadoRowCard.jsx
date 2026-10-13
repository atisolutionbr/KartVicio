import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, RefreshCw, Undo, Lock, AlertTriangle } from 'lucide-react';

export default function ResultadoRowCard({ res, etapa, categoriasCampeonato, temCategorias, canEdit, onDescartar, onRecalcular, onEdit, onDelete }) {
  const temPenalidade = (res.pontos_penalidade || 0) > 0;
  const catCor = categoriasCampeonato.find(c => c.nome === res.categoria)?.cor;
  return (
    <article className={`rounded-lg border p-4 ${res.descartado ? 'opacity-60 bg-gray-100' : temPenalidade ? 'bg-red-50 border-l-4 border-l-red-400' : 'bg-white'}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className="w-12 shrink-0 text-center">
          {res.status === 'NC' ? (
            <Badge className="bg-orange-200 text-orange-900 font-bold">NC</Badge>
          ) : res.status === 'DQ' ? (
            <Badge className="bg-red-200 text-red-900 font-bold">DQ</Badge>
          ) : (
            <span className={`text-xl font-extrabold text-gray-900 ${res.descartado ? 'line-through' : ''}`}>{res.posicao}º</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-lg font-extrabold leading-tight text-gray-900">{res.piloto_nome}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {temCategorias && res.categoria && (
              <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: catCor || '#6b7280' }}>{res.categoria}</span>
            )}
            <Badge variant="outline" className="text-xs">{etapa ? `${etapa.numero_etapa}ª Etapa` : 'N/A'}</Badge>
            {temPenalidade && !res.descartado && (
              <Badge className="bg-red-100 text-red-700 text-xs font-bold"><AlertTriangle className="mr-1 h-3 w-3" />Pen.</Badge>
            )}
            {(res.status === 'NC' || res.status === 'DQ') && (
              <Badge variant="outline" className="text-xs text-gray-500">No grid</Badge>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="inline-flex flex-col items-end rounded-xl px-3 py-1.5" style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)" }}>
            <span className="text-3xl font-extrabold leading-none text-gray-900">{res.pontos_totais}</span>
            <span className="text-[11px] font-bold text-gray-800/80 mt-0.5">pts</span>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-4">
        <div><dt className="mb-1 text-xs text-muted-foreground">Base</dt><dd><Badge className="bg-green-100 text-green-800">+{res.pontos}</Badge></dd></div>
        <div><dt className="mb-1 text-xs text-muted-foreground">Melhor volta</dt><dd><Badge className="bg-purple-100 text-purple-800">+{res.pontos_melhor_volta || 0}</Badge></dd></div>
        <div><dt className="mb-1 text-xs text-muted-foreground">Penalidade</dt><dd><Badge variant="destructive">-{res.pontos_penalidade || 0}</Badge></dd></div>
        <div><dt className="mb-1 text-xs text-muted-foreground">Extra</dt><dd className="text-sm font-medium">{res.pontos_tipo_extra || 0}</dd></div>
      </dl>
      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          {etapa?.finalizada && (
            <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-300"><Lock className="mr-1 h-3 w-3" />Travado</Badge>
          )}
          <Button variant={res.descartado ? 'default' : 'secondary'} size="sm" onClick={() => onDescartar(res)} className={`min-h-[40px] ${res.descartado ? 'bg-green-600 hover:bg-green-700' : ''}`}>
            {res.descartado ? <Undo className="mr-1 h-4 w-4" /> : <Trash2 className="mr-1 h-4 w-4" />}
            {res.descartado ? 'Reativar' : 'Descartar'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onRecalcular(res)} className="min-h-[40px] border-indigo-500 text-indigo-700 hover:bg-indigo-50">
            <RefreshCw className="mr-1 h-4 w-4" />Recalcular
          </Button>
          {!etapa?.finalizada && (
            <>
              <Button variant="outline" size="sm" onClick={() => onEdit(res)} className="min-h-[40px]">
                <Edit className="mr-1 h-4 w-4" />Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(res)} className="min-h-[40px]">
                <Trash2 className="mr-1 h-4 w-4" />Excluir
              </Button>
            </>
          )}
        </div>
      )}
    </article>
  );
}