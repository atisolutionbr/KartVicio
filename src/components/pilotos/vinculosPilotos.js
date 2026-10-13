import { base44 } from '@/api/base44Client';

export async function valoresDistintos(entidade, query, field) {
  const values = [];
  let cursor;
  do {
    const page = await base44.entities[entidade].filter(query, { distinct: field, limit: 1000, cursor });
    values.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return values;
}

export async function carregarNomesVinculados(campeonatoId, categoria = 'todas') {
  const query = { campeonato_id: campeonatoId, ativo: true };
  if (categoria !== 'todas') query.$or = [{ categorias: categoria }, { categoria }];
  const inscritos = await valoresDistintos('InscricaoPiloto', query, 'piloto_nome');
  if (!inscritos.length) return [];
  return valoresDistintos('Piloto', { ativo: true, nome: { $in: inscritos } }, 'nome');
}

export async function atualizarVinculos(query, data) {
  let result;
  do {
    result = await base44.entities.InscricaoPiloto.updateMany(query, { $set: data });
  } while (result.has_more);
}

export async function definirVinculo(piloto, campeonatoId, ativo, dados = {}) {
  const atual = await base44.entities.Piloto.get(piloto.id);
  if (ativo && atual.ativo !== true) throw new Error('Ative o piloto antes de vinculá-lo a um campeonato.');
  const query = { piloto_nome: atual.nome, campeonato_id: campeonatoId };
  if (ativo) {
    await base44.entities.InscricaoPiloto.upsert([{ ...query, ...dados, ativo: true }], { key: ['piloto_nome', 'campeonato_id'] });
  }
  // Atualiza TODOS os vínculos da mesma dupla, inclusive duplicados antigos.
  await atualizarVinculos({ ...query, ativo: { $ne: ativo } }, { ativo, ...dados });
}