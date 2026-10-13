import { base44 } from "@/api/base44Client";

/**
 * Carrega penalidades e tabela de pontos de um campeonato.
 * Retorna mapas de lookup para recálculo rápido dos pontos_totais.
 */
export async function carregarDadosRanking(campeonatoId) {
  const [penalidades, tabelaGlobal, tabelaCamp] = await Promise.all([
    base44.entities.Penalidade.aggregate({ query: { campeonato_id: campeonatoId }, groupBy: ['piloto_nome', 'etapa_id'], sum: 'pontos_penalidade', limit: 1000 }),
    base44.entities.TabelaPontos.list({ sort: 'posicao', limit: 50 }),
    base44.entities.TabelaPontosCampeonato.filter({ campeonato_id: campeonatoId }, { sort: 'posicao', limit: 50 }),
  ]);
  if (penalidades.truncated) throw new Error('A consulta de penalidades excedeu o limite; não é seguro exibir um ranking incompleto.');
  const tabelaEfetiva = tabelaCamp.items.length ? tabelaCamp.items : tabelaGlobal.items;
  const tabelaMap = Object.fromEntries(tabelaEfetiva.map(t => [t.posicao, t]));
  const penalidadesPorChave = Object.fromEntries(penalidades.rows.map(p => [`${p.piloto_nome}||${p.etapa_id}`, Number(p.sum_pontos_penalidade) || 0]));
  return { penalidadesPorChave, tabelaMap, tabelaEfetiva };
}

/**
 * Recalcula os pontos de um resultado a partir dos componentes + penalidades ao vivo.
 * Mais robusto que o valor armazenado no banco (que pode estar desatualizado).
 */
export function computarPontos(resultado, etapaInfo, tabelaMap, penalidadesPorChave) {
  const isSemColocacao = resultado.status === "NC" || resultado.status === "DQ";
  if (isSemColocacao) {
    return {
      pontos: 0,
      pontos_penalidade: 0,
      pontos_melhor_volta: 0,
      pontos_tipo_extra: 0,
      pontos_totais: 0,
    };
  }

  const chavePen = `${resultado.piloto_nome}||${resultado.etapa_id}`;
  const penalidadeTotal = penalidadesPorChave[chavePen] || 0;

  // Sem entrada na tabela para a posição => 0 pontos (nunca reusa resultado.pontos
  // que pode estar desatualizado ou já dobrado, causando dupla contagem).
  const tabelaEntry = tabelaMap[resultado.posicao];
  const pontosBase = Number(tabelaEntry?.pontos) || 0;
  const pontosMultiplicados = etapaInfo?.dobrar_pontos ? pontosBase * 2 : pontosBase;

  const tiposExtra = Array.isArray(resultado.tipos_ponto_aplicados)
    ? resultado.tipos_ponto_aplicados.reduce((s, t) => s + (Number(t.valor) || 0), 0)
    : Number(resultado.pontos_tipo_extra) || 0;

  const pontosMelhorVolta = Number(resultado.pontos_melhor_volta) || 0;

  return {
    pontos: pontosMultiplicados,
    pontos_penalidade: penalidadeTotal,
    pontos_melhor_volta: pontosMelhorVolta,
    pontos_tipo_extra: tiposExtra,
    pontos_totais: pontosMultiplicados + pontosMelhorVolta + tiposExtra - penalidadeTotal,
  };
}

/**
 * Recalcula pontos_totais de uma lista de resultados usando penalidades + tabela ao vivo.
 * Retorna uma nova lista com os campos de pontos atualizados.
 */
export function recalcularResultados(resultados, etapas, penalidadesPorChave, tabelaMap) {
  const etapasMap = {};
  etapas.forEach(e => { etapasMap[e.id] = e; });

  return resultados.map(r => {
    const etapaInfo = etapasMap[r.etapa_id];
    const calculado = computarPontos(r, etapaInfo, tabelaMap, penalidadesPorChave);
    return { ...r, ...calculado };
  });
}