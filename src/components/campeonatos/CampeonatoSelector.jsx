import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";

export default function CampeonatoSelector({ campeonatos, value, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Trophy className="w-5 h-5 text-yellow-500 hidden sm:block" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue placeholder="Selecione o campeonato..." />
        </SelectTrigger>
        <SelectContent>
          {campeonatos.map(c => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome} ({c.ano})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}