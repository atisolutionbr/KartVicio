import { base44 } from '@/api/base44Client';

// Componentes consolidados no servidor por piloto/etapa, sem limite de leitura
// de registros individuais. Se a agregação truncar, divide o conjunto de etapas.
export default async function carregarResultadosRanking(campeonatoId, etapas, filtros = {}) {
  if (!etapas.length) return [];
  const campos = ['posicao', 'pontos', 'pontos_melhor_volta', 'pontos_tipo_extra', 'pontos_totais'];
  const consultar = async (ids) => {
    const result = await base44.entities.ResultadoEtapa.aggregate({
      query: { campeonato_id: campeonatoId, etapa_id: { $in: ids }, descartado: { $ne: true }, ...filtros },
      groupBy: ['piloto_nome', 'etapa_id', 'categoria', 'status'],
      max: campos,
      limit: 1000,
    });
    if (result.truncated) {
      if (ids.length === 1) throw new Error('Esta etapa excedeu o limite de consolidação; o ranking não pode ser exibido parcialmente.');
      const half = Math.ceil(ids.length / 2);
      return [...await consultar(ids.slice(0, half)), ...await consultar(ids.slice(half))];
    }
    return result.rows.map(row => ({
      piloto_nome: row.piloto_nome, etapa_id: row.etapa_id,
      categoria: row.categoria || '', status: row.status || 'regular',
      descartado: false,
      ...Object.fromEntries(campos.map(campo => [campo, Number(row[`max_${campo}`]) || 0])),
    }));
  };
  return consultar(etapas.map(etapa => etapa.id));
}