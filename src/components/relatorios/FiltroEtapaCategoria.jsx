import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Tag } from "lucide-react";

export default function FiltroEtapaCategoria({
  etapas = [],
  categorias = [],
  etapaValue,
  onEtapaChange,
  categoriaValue,
  onCategoriaChange,
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 mb-4">
      <Select value={etapaValue} onValueChange={onEtapaChange}>
        <SelectTrigger className="min-w-0 w-full sm:w-40 h-11 sm:h-8 text-sm sm:text-xs">
          <Filter className="w-3.5 h-3.5 mr-1 text-gray-500 flex-shrink-0" />
          <SelectValue placeholder="Etapa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as Etapas</SelectItem>
          {[...etapas].sort((a, b) => a.numero_etapa - b.numero_etapa).map(etapa => (
            <SelectItem key={etapa.id} value={etapa.id}>
              {etapa.numero_etapa}ª Etapa{etapa.local ? ` - ${etapa.local}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {categorias.length > 0 && (
        <Select value={categoriaValue} onValueChange={onCategoriaChange}>
          <SelectTrigger className="min-w-0 w-full sm:w-36 h-11 sm:h-8 text-sm sm:text-xs">
            <Tag className="w-3.5 h-3.5 mr-1 text-blue-600 flex-shrink-0" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Categorias</SelectItem>
            {categorias.map(cat => (
              <SelectItem key={cat.id} value={cat.nome}>{cat.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}