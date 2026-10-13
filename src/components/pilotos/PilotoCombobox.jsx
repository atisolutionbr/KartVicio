import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PilotoCombobox({ pilotos, value, onChange, placeholder = "Buscar e selecionar piloto..." }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center w-full h-9 sm:h-10 px-3 py-2 text-sm border border-input bg-background rounded-md hover:bg-accent text-left transition-colors"
        >
          <Search className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className={cn("flex-1 truncate text-left", !value && "text-gray-400")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Digite o nome do piloto..." />
          <CommandList>
            <CommandEmpty>Nenhum piloto encontrado.</CommandEmpty>
            <CommandGroup>
              {pilotos.map(p => (
                <CommandItem
                  key={p.id}
                  value={p.nome}
                  onSelect={() => { onChange(p.nome); setOpen(false); }}
                  className={value === p.nome ? "bg-accent" : ""}
                >
                  <Check className={cn("w-4 h-4 mr-2", value === p.nome ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{p.nome}</span>
                  {!p.ativo && <span className="text-xs text-gray-400 ml-1">(inativo)</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}