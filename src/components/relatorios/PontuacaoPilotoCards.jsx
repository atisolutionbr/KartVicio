import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function PontuacaoPilotoCards({ linhas, etapas, ano }) {
  return (
    <div className="space-y-4 p-4 md:hidden">
      {linhas.map(linha => (
        <details key={linha.nome} className="group min-w-0 rounded-lg border bg-card text-card-foreground">
          <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="shrink-0 text-base font-bold">{linha.posicao}º</span>
            <span className="min-w-0 flex-1 break-words text-base font-semibold">{linha.nome}</span>
            <span className="shrink-0 text-right text-base font-bold">{linha.totalGeral} pts</span>
            <ChevronDown className="h-5 w-5 shrink-0 group-open:rotate-180" />
          </summary>
          <div className="grid grid-cols-1 gap-3 border-t p-4 sm:grid-cols-2">
            {etapas.map(etapa => {
              const dados = linha.dados[etapa.numero_etapa];
              return (
                <section key={etapa.id} className="min-w-0 rounded-md bg-muted/40 p-4">
                  <h3 className="mb-3 text-base font-semibold">{etapa.numero_etapa}ª Etapa</h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="mb-1 text-muted-foreground">Posição</dt><dd className="font-semibold">{dados?.posicao ? `${dados.posicao}º` : '—'}</dd></div>
                    <div><dt className="mb-1 text-muted-foreground">Pontos</dt><dd className="font-semibold">{dados ? dados.pontos : '—'}</dd></div>
                    <div><dt className="mb-1 text-muted-foreground">Melhor volta</dt><dd className="font-semibold">{dados?.mv > 0 ? `+${dados.mv}` : '—'}</dd></div>
                    <div><dt className="mb-1 text-muted-foreground">Penalidade</dt><dd className="font-semibold">{dados?.penalidade > 0 ? `-${dados.penalidade}` : '—'}</dd></div>
                  </dl>
                </section>
              );
            })}
          </div>
        </details>
      ))}
      {linhas.length === 0 && <p className="py-8 text-center text-base text-muted-foreground">Nenhum resultado registrado para {ano}</p>}
    </div>
  );
}