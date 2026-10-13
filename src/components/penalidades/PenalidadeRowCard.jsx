import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';

export default function PenalidadeRowCard({ pen, etapaNome, canEdit, onEdit, onDelete }) {
  return (
    <article className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-lg font-extrabold leading-tight text-gray-900">{pen.piloto_nome}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-xs">{etapaNome}</Badge>
            <Badge className={`text-xs ${pen.tipo === 'tempo' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>{pen.tipo}</Badge>
            <Badge variant="destructive" className="text-xs">-{pen.pontos_penalidade || 0} pts</Badge>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t pt-3">
        <div><dt className="mb-1 text-xs text-muted-foreground">Posição inicial</dt><dd className="text-sm font-semibold">{pen.posicao_inicial || '—'}</dd></div>
        <div><dt className="mb-1 text-xs text-muted-foreground">Posição final</dt><dd className="text-sm font-semibold">{pen.posicao_final || '—'}</dd></div>
        {pen.observacao && (
          <div className="col-span-2"><dt className="mb-1 text-xs text-muted-foreground">Observação</dt><dd className="break-words text-sm">{pen.observacao}</dd></div>
        )}
      </dl>
      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={() => onEdit(pen)} className="min-h-[40px]">
            <Edit className="mr-1 h-4 w-4" />Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(pen)} className="min-h-[40px]">
            <Trash2 className="mr-1 h-4 w-4" />Excluir
          </Button>
        </div>
      )}
    </article>
  );
}