import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useEntitySubscriptions } from '@/hooks/useEntitySubscriptions';
import { atualizarVinculos, definirVinculo, valoresDistintos } from '@/components/pilotos/vinculosPilotos';

export default function usePilotosCadastro(searchTerm, statusFilter) {
  const [pilotos, setPilotos] = useState([]), [campeonatos, setCampeonatos] = useState([]), [inscricoes, setInscricoes] = useState([]);
  const [cursor, setCursor] = useState(null), [total, setTotal] = useState(0), [loading, setLoading] = useState(false);
  const [ocupado, setOcupado] = useState(''), [msgVinculo, setMsgVinculo] = useState(''), [erro, setErro] = useState('');
  const lock = useRef(false), version = useRef(0), loaded = useRef([]);
  const loadAll = useCallback(async (nextCursor) => {
    const request = ++version.current;
    setLoading(true);
    const query = {};
    if (statusFilter !== 'todos') query.ativo = statusFilter === 'ativos';
    if (searchTerm.trim()) {
      const term = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ nome: { $regex: term, $options: 'i' } }, { nome_equipe: { $regex: term, $options: 'i' } }];
    }
    const [page, camps, count] = await Promise.all([
      base44.entities.Piloto.filter(query, { sort: '-created_date', limit: 50, cursor: nextCursor }),
      base44.entities.Campeonato.list({ sort: '-ano', limit: 50 }), base44.entities.Piloto.count(query),
    ]);
    const displayed = nextCursor ? [...loaded.current, ...page.items] : page.items;
    const links = await base44.entities.InscricaoPiloto.aggregate({
      query: { ativo: true, piloto_nome: { $in: displayed.map(p => p.nome) }, campeonato_id: { $in: camps.items.map(c => c.id) } },
      groupBy: ['piloto_nome', 'campeonato_id'], limit: 1000,
    });
    if (links.truncated) throw new Error('Não foi possível carregar todos os vínculos.');
    if (request !== version.current) return;
    loaded.current = displayed;
    setPilotos(displayed); setCampeonatos(camps.items);
    setInscricoes(links.rows.map(row => ({ ...row, ativo: true })));
    setCursor(page.has_more ? page.next_cursor : null); setTotal(count); setLoading(false);
  }, [searchTerm, statusFilter]);
  useEffect(() => { loadAll(); }, [loadAll]);
  useEntitySubscriptions(() => loadAll(), ['Piloto', 'InscricaoPiloto', 'Campeonato']);
  const executar = async (key, fn) => {
    if (lock.current) return false;
    lock.current = true; setOcupado(key); setErro(''); setMsgVinculo('');
    try { await fn(); await loadAll(); return true; }
    catch (error) { setErro(error.message || 'Não foi possível salvar a alteração.'); return false; }
    finally { lock.current = false; setOcupado(''); }
  };
  const salvarPiloto = (editing, data) => executar('piloto', async () => {
    if (editing) await base44.entities.Piloto.update(editing.id, data);
    else await base44.entities.Piloto.create(data);
    if (editing && editing.nome !== data.nome) await atualizarVinculos({ piloto_nome: editing.nome }, { piloto_nome: data.nome });
    if (data.ativo === false) await atualizarVinculos({ piloto_nome: data.nome, ativo: { $ne: false } }, { ativo: false });
  });
  const isVinculado = (nome, id) => pilotos.some(p => p.nome === nome && p.ativo === true) && inscricoes.some(i => i.piloto_nome === nome && i.campeonato_id === id);
  const toggleVinculo = (piloto, id) => executar(`${piloto.id}:${id}`, async () => {
    const ativo = !isVinculado(piloto.nome, id);
    await definirVinculo(piloto, id, ativo);
    setMsgVinculo(ativo ? 'Piloto vinculado.' : 'Piloto desvinculado.');
  });
  const vincularTodosAtivos = () => executar('todos', async () => {
    const nomes = await valoresDistintos('Piloto', { ativo: true }, 'nome');
    const camps = await base44.entities.Campeonato.filter({ ativo: true }, { limit: 50 });
    const records = camps.items.flatMap(c => nomes.map(nome => ({ campeonato_id: c.id, piloto_nome: nome, ativo: true })));
    for (let i = 0; i < records.length; i += 500) await base44.entities.InscricaoPiloto.upsert(records.slice(i, i + 500), { key: ['campeonato_id', 'piloto_nome'] });
    if (nomes.length && camps.items.length) await atualizarVinculos({ piloto_nome: { $in: nomes }, campeonato_id: { $in: camps.items.map(c => c.id) }, ativo: { $ne: true } }, { ativo: true });
    setMsgVinculo('Pilotos ativos vinculados aos campeonatos ativos.');
  });
  return { pilotos, campeonatos, total, cursor, loading, ocupado, msgVinculo, erro, salvarPiloto, toggleVinculo, isVinculado, vincularTodosAtivos, loadMore: () => loadAll(cursor) };
}