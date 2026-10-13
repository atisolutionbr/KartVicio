import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Trash2, Target, ChevronLeft, Tag, TrendingUp } from "lucide-react";
import CategoriasManager from "@/components/campeonatos/CategoriasManager";
import EvolucaoPontosPanel from "@/components/resultados/EvolucaoPontosPanel";
import { Link, useLocation } from "react-router-dom";
import { definirVinculo, valoresDistintos } from '@/components/pilotos/vinculosPilotos';
import { useEntitySubscriptions } from '@/hooks/useEntitySubscriptions';

const Campeonato = base44.entities.Campeonato;
const Piloto = base44.entities.Piloto;
const InscricaoPiloto = base44.entities.InscricaoPiloto;
const TabelaPontosCampeonato = base44.entities.TabelaPontosCampeonato;
const TabelaPontosGlobal = base44.entities.TabelaPontos;
const ResultadoEtapa = base44.entities.ResultadoEtapa;
const Etapa = base44.entities.Etapa;

export default function CampeonatoDetalhePage({ userPermissions }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const campeonatoId = params.get("id");

  const [campeonato, setCampeonato] = useState(null);
  const [pilotos, setPilotos] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [tabelaPontos, setTabelaPontos] = useState([]);
  const [novoPilotoNome, setNovoPilotoNome] = useState("");
  const [novasCategorias, setNovasCategorias] = useState([]);
  const [novaPosicao, setNovaPosicao] = useState("");
  const [novosPontos, setNovosPontos] = useState("");
  const [tab, setTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [etapasCamp, setEtapasCamp] = useState([]);
  const [resultadosCamp, setResultadosCamp] = useState([]);
  const [alterandoVinculo, setAlterandoVinculo] = useState(false);
  const [vinculoError, setVinculoError] = useState('');
  const vinculoLock = React.useRef(false);

  const canEdit = userPermissions?.permissao === 'admin' || userPermissions?.permissao === 'operador';

  useEffect(() => {
    if (!campeonatoId) return;
    loadData();
  }, [campeonatoId]);

  useEffect(() => {
    if (tab === null && campeonato) {
      // Se tem categorias e pilotos, mostrar categorias como padrão
      setTab((campeonato?.categorias || []).length > 0 ? "categorias" : "pilotos");
    }
  }, [campeonato, tab]);

  const loadData = async () => {
    setLoading(true);
    const nomesAtivos = await valoresDistintos('Piloto', { ativo: true }, 'nome');
    const [camp, pilotosData, inscricoesData, tabelaData, etapasData, resultadosData] = await Promise.all([
      Campeonato.filter({ id: campeonatoId }),
      Piloto.filter({ ativo: true }),
      InscricaoPiloto.filter({ campeonato_id: campeonatoId, ativo: true, piloto_nome: { $in: nomesAtivos } }),
      TabelaPontosCampeonato.filter({ campeonato_id: campeonatoId }),
      Etapa.filter({ campeonato_id: campeonatoId }),
      ResultadoEtapa.filter({ campeonato_id: campeonatoId }),
    ]);
    setCampeonato(camp[0] || null);
    setPilotos(pilotosData);
    setInscricoes(inscricoesData);
    setTabelaPontos(tabelaData.sort((a, b) => a.posicao - b.posicao));
    setEtapasCamp(etapasData.sort((a, b) => (a.numero_etapa || 0) - (b.numero_etapa || 0)));
    setResultadosCamp(resultadosData.filter(r => !r.descartado));
    setLoading(false);
  };

  useEntitySubscriptions(loadData, ['Piloto', 'InscricaoPiloto'], !!campeonatoId);

  const toggleCategoria = (nome) => {
    setNovasCategorias(prev =>
      prev.includes(nome) ? prev.filter(c => c !== nome) : [...prev, nome]
    );
  };

  const handleAddPiloto = async () => {
    if (!novoPilotoNome) return;
    const temCats = (campeonato?.categorias || []).length > 0;
    if (temCats && novasCategorias.length === 0) {
      alert("Selecione ao menos uma categoria para o piloto.");
      return;
    }
    const already = inscricoes.find(i => i.piloto_nome === novoPilotoNome);
    if (already) { alert("Piloto já inscrito neste campeonato."); return; }
    if (vinculoLock.current) return;
    vinculoLock.current = true;
    setAlterandoVinculo(true);
    setVinculoError('');
    try {
      const piloto = pilotos.find(p => p.nome === novoPilotoNome);
      if (!piloto) throw new Error('Selecione um piloto ativo.');
      await definirVinculo(piloto, campeonatoId, true, { categorias: novasCategorias });
      setNovoPilotoNome('');
      setNovasCategorias([]);
      await loadData();
    } catch (error) {
      setVinculoError(error.message || 'Não foi possível vincular o piloto.');
    } finally {
      vinculoLock.current = false;
      setAlterandoVinculo(false);
    }
  };

  const handleRemovePiloto = async (inscricao) => {
    if (vinculoLock.current) return;
    vinculoLock.current = true;
    setAlterandoVinculo(true);
    setVinculoError('');
    try {
      const piloto = pilotos.find(p => p.nome === inscricao.piloto_nome);
      if (!piloto) throw new Error('Atualize a lista de pilotos antes de desvincular.');
      await definirVinculo(piloto, campeonatoId, false);
      await loadData();
    } catch (error) {
      setVinculoError(error.message || 'Não foi possível desvincular o piloto.');
    } finally {
      vinculoLock.current = false;
      setAlterandoVinculo(false);
    }
  };

  const handleAddPontuacao = async () => {
    if (!novaPosicao || !novosPontos) return;
    const pos = parseInt(novaPosicao);
    const existing = tabelaPontos.find(t => t.posicao === pos);
    if (existing) {
      await TabelaPontosCampeonato.update(existing.id, { pontos: parseInt(novosPontos) });
    } else {
      await TabelaPontosCampeonato.create({ campeonato_id: campeonatoId, posicao: pos, pontos: parseInt(novosPontos) });
    }
    setNovaPosicao("");
    setNovosPontos("");
    loadData();
  };

  const handleRemovePontuacao = async (item) => {
    await TabelaPontosCampeonato.delete(item.id);
    loadData();
  };

  const handleImportarTabelaGlobal = async () => {
    const global = await TabelaPontosGlobal.list();
    if (global.length === 0) { alert("Nenhuma tabela global encontrada."); return; }
    for (const item of global) {
      const existing = tabelaPontos.find(t => t.posicao === item.posicao);
      if (existing) {
        await TabelaPontosCampeonato.update(existing.id, { pontos: item.pontos });
      } else {
        await TabelaPontosCampeonato.create({ campeonato_id: campeonatoId, posicao: item.posicao, pontos: item.pontos });
      }
    }
    loadData();
  };

  const pilotosNaoInscritos = pilotos.filter(p => !inscricoes.find(i => i.piloto_nome === p.nome));

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
    </div>
  );

  if (!campeonato) return (
    <div className="text-center py-16 text-gray-500">Campeonato não encontrado.</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/Campeonatos">
          <Button variant="outline" size="sm"><ChevronLeft className="w-4 h-4 mr-1" />Voltar</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{campeonato.nome}</h1>
          <p className="text-gray-500 text-sm">{campeonato.ano} · {campeonato.ativo ? "Ativo" : "Inativo"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        <button
          onClick={() => setTab("pilotos")}
          className={`px-3 sm:px-4 py-2 font-semibold text-sm transition-colors whitespace-nowrap ${tab === "pilotos" ? "border-b-2 border-yellow-500 text-yellow-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Users className="w-4 h-4 inline mr-1" />Pilotos ({inscricoes.length})
        </button>
        <button
          onClick={() => setTab("categorias")}
          className={`px-3 sm:px-4 py-2 font-semibold text-sm transition-colors whitespace-nowrap ${tab === "categorias" ? "border-b-2 border-yellow-500 text-yellow-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Tag className="w-4 h-4 inline mr-1" />Categorias ({(campeonato?.categorias || []).length})
        </button>
        <button
          onClick={() => setTab("pontos")}
          className={`px-3 sm:px-4 py-2 font-semibold text-sm transition-colors whitespace-nowrap ${tab === "pontos" ? "border-b-2 border-yellow-500 text-yellow-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Target className="w-4 h-4 inline mr-1" />Tabela de Pontos ({tabelaPontos.length})
        </button>
        <button
          onClick={() => setTab("historico")}
          className={`px-3 sm:px-4 py-2 font-semibold text-sm transition-colors whitespace-nowrap ${tab === "historico" ? "border-b-2 border-yellow-500 text-yellow-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <TrendingUp className="w-4 h-4 inline mr-1" />Histórico
        </button>
      </div>

      {/* Pilotos */}
      {tab === "pilotos" && (
        <Card className="shadow-lg">
          <CardHeader className="copa-gradient-navy text-white py-3 px-5">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-400" />
              Pilotos Inscritos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {vinculoError && <p role="alert" className="text-destructive">{vinculoError}</p>}
            {canEdit && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Select value={novoPilotoNome} onValueChange={(v) => { setNovoPilotoNome(v); setNovasCategorias([]); }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecionar piloto para inscrever..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pilotosNaoInscritos.map(p => (
                        <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddPiloto} disabled={alterandoVinculo} className="copa-gradient-gold text-white">
                    <Plus className="w-4 h-4 mr-1" />Inscrever
                  </Button>
                </div>
                {novoPilotoNome && (campeonato?.categorias || []).length > 0 && (
                  <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Categorias para <span className="text-yellow-600">{novoPilotoNome}</span>:</p>
                    <div className="flex flex-wrap gap-2">
                      {campeonato.categorias.map(cat => {
                        const selected = novasCategorias.includes(cat.nome);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => toggleCategoria(cat.nome)}
                            className={`px-3 py-1 rounded-full text-sm font-semibold border-2 transition-all ${selected ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                            style={selected ? { backgroundColor: cat.cor, borderColor: cat.cor } : {}}
                          >
                            {selected ? "✓ " : ""}{cat.nome}
                          </button>
                        );
                      })}
                    </div>
                    {novasCategorias.length === 0 && (
                      <p className="text-xs text-red-500">Selecione ao menos uma categoria</p>
                    )}
                  </div>
                )}
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold">Piloto</TableHead>
                  {(campeonato?.categorias || []).length > 0 && <TableHead className="font-bold">Categorias</TableHead>}
                  <TableHead className="font-bold text-center">Status</TableHead>
                  {canEdit && <TableHead className="font-bold text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscricoes.map((insc, idx) => (
                  <TableRow key={insc.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <TableCell className="font-semibold">{insc.piloto_nome}</TableCell>
                    {(campeonato?.categorias || []).length > 0 && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(insc.categorias || []).length > 0
                            ? (insc.categorias || []).map(catNome => {
                                const cat = campeonato.categorias.find(c => c.nome === catNome);
                                return (
                                  <span key={catNome} className="px-2 py-0.5 rounded-full text-white text-xs font-bold" style={{ backgroundColor: cat?.cor || "#6b7280" }}>
                                    {catNome}
                                  </span>
                                );
                              })
                            : <span className="text-gray-400 text-xs">—</span>
                          }
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Badge className={insc.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {insc.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-center">
                        <Button variant="destructive" size="sm" disabled={alterandoVinculo} onClick={() => handleRemovePiloto(insc)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {inscricoes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      Nenhum piloto inscrito
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Histórico — evolução da pontuação acumulada */}
      {tab === "historico" && (
        <EvolucaoPontosPanel
          resultados={resultadosCamp}
          etapas={etapasCamp}
          campeonatoNome={campeonato?.nome}
        />
      )}

      {/* Categorias */}
      {tab === "categorias" && (
        <CategoriasManager
          campeonato={campeonato}
          inscricoes={inscricoes}
          canEdit={canEdit}
          onRefresh={loadData}
        />
      )}

      {/* Tabela de Pontos */}
      {tab === "pontos" && (
        <Card className="shadow-lg">
          <CardHeader className="copa-gradient-navy text-white py-3 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-yellow-400" />
                Tabela de Pontos
              </CardTitle>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={handleImportarTabelaGlobal} className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                  Importar Tabela Global
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {canEdit && (
              <div className="flex gap-2 items-end">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Posição</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Ex: 1"
                    value={novaPosicao}
                    onChange={e => setNovaPosicao(e.target.value)}
                    className="w-24"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Pontos</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex: 25"
                    value={novosPontos}
                    onChange={e => setNovosPontos(e.target.value)}
                    className="w-24"
                  />
                </div>
                <Button onClick={handleAddPontuacao} className="copa-gradient-gold text-white">
                  <Plus className="w-4 h-4 mr-1" />Adicionar
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold text-center">Posição</TableHead>
                  <TableHead className="font-bold text-center">Pontos</TableHead>
                  {canEdit && <TableHead className="font-bold text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tabelaPontos.map((item, idx) => (
                  <TableRow key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <TableCell className="text-center font-bold text-lg">{item.posicao}º</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-100 text-green-800 font-bold text-base">{item.pontos} pts</Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-center">
                        <Button variant="destructive" size="sm" onClick={() => handleRemovePontuacao(item)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {tabelaPontos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      Nenhuma pontuação cadastrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}