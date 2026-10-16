/**
 * Calcula descartes de um piloto conforme a configuração do campeonato.
 *
 * Regra:
 * 1. totalEtapasRealizadas = total de etapas que aconteceram para o conjunto
 *    de resultados em análise (derivado dos próprios resultados, sem depender
 *    do campo `categoria` da entidade Etapa, que pode estar inconsistente).
 * 2. descarteQtd = descarte_quantidade configurado (default 1 se não definido).
 * 3. Faltas do piloto = totalEtapasRealizadas - etapasDisputadas.
 *    Cada falha conta automaticamente como descarte.
 * 4. Se faltas >= descarteQtd -> descartes restantes = 0 (NINGUÉM descarta etapa real:
 *    as faltas já consumiram todo o descarte; mesmo se faltou MAIS que o permitido,
 *    considera apenas as etapas que correu).
 * 5. Se sobram descartes (faltas < descarteQtd) -> descartar as piores etapas
 *    (menor pontos_totais) que NÃO tenham penalidade.
 *    Se a pior tem penalidade, passa para a próxima sem penalidade.
 */
export const calcularDescartesPiloto = (
  resultadosFinalizadosPiloto,
  totalEtapasRealizadas,
  _minEtapasIgnorado,
  descarteQtd
) => {
  if (!descarteQtd || descarteQtd <= 0) {
    return { etapasDescartadas: [], descartesAutomaticos: 0, faltas: 0 };
  }

  // Participações únicas por etapa_id (evita contar a mesma etapa duas vezes
  // caso o piloto tenha resultados duplicados).
  const etapaIdsDisputados = new Set(
    (resultadosFinalizadosPiloto || []).map(r => r.etapa_id)
  );
  const participou = etapaIdsDisputados.size;

  const faltas = Math.max(0, totalEtapasRealizadas - participou);

  // Cada descarte configurado é consumido primeiro pelas faltas.
  // Excesso de faltas não gera descarte de etapa real (o piloto perde as etapas que faltou).
  const descartesAutomaticos = Math.min(faltas, descarteQtd);
  const descartesRestantes = Math.max(0, descarteQtd - faltas);

  let etapasDescartadas = [];
  if (descartesRestantes > 0) {
    // Considera apenas etapas sem penalidade como candidatas a descarte, e
    // desempata por menor pontos_totais. Mantemos apenas a melhor (menor) das
    // etapas por etapa_id para não descartar a mesma etapa mais de uma vez.
    const porEtapa = {};
    (resultadosFinalizadosPiloto || []).forEach(r => {
      if (!r.pontos_penalidade || r.pontos_penalidade === 0) {
        const atual = porEtapa[r.etapa_id];
        if (!atual || (r.pontos_totais || 0) < (atual.pontos_totais || 0)) {
          porEtapa[r.etapa_id] = r;
        }
      }
    });
    const candidatos = Object.values(porEtapa)
      .sort((a, b) => (a.pontos_totais || 0) - (b.pontos_totais || 0));
    etapasDescartadas = candidatos
      .slice(0, descartesRestantes)
      .map(r => r.etapa_id);
  }

  return { etapasDescartadas, descartesAutomaticos, faltas };
};

/**
 * Calcula o ranking aplicando as regras de descarte (mesma lógica do Simulador).
 * Retorna array ordenado por pontos_totais (já com descartes aplicados).
 * `categoriaFiltro` controla o filtro por categoria ("todas" para tudo).
 *
 * IMPORTANTE: as "etapas realizadas" são derivadas diretamente dos resultados
 * (etapa_ids únicos dentro do conjunto filtrado), sem depender do campo
 * `categoria` da entidade Etapa. Isso garante o cálculo correto para qualquer
 * campeonato, com ou sem categorias, e indenpendente de como as etapas foram
 * cadastradas.
 */
export const calcularRankingComDescarte = ({
  resultados,
  etapas,
  campeonato,
  categoriaFiltro = "todas"
}) => {
  const categorias = campeonato?.categorias || [];
  const temCategorias = categorias.length > 0;
  // Default 1 descarte se não definido — funciona para todos campeonatos.
  const descarteQtd = campeonato?.descarte_quantidade ?? 1;

  let resultadosValidos = resultados.filter(r => !r.descartado);
  if (temCategorias && categoriaFiltro !== "todas") {
    resultadosValidos = resultadosValidos.filter(
      r => (r.categoria || "").trim() === categoriaFiltro.trim()
    );
  }

  // Etapas realizadas = etapa_ids únicos que têm ao menos um resultado dentro
  // do conjunto filtrado. Independente de estado `finalizada` ou de
  // etapa.categoria (que pode não estar preenchido de forma confiável).
  const etapasRealizadasIds = new Set(resultadosValidos.map(r => r.etapa_id));
  const totalEtapasRealizadas = etapasRealizadasIds.size;

  const porPiloto = {};
  resultadosValidos.forEach(r => {
    if (!porPiloto[r.piloto_nome]) porPiloto[r.piloto_nome] = [];
    porPiloto[r.piloto_nome].push(r);
  });

  const descartesPorPiloto = {};
  Object.keys(porPiloto).forEach(nome => {
    descartesPorPiloto[nome] = calcularDescartesPiloto(
      porPiloto[nome],
      totalEtapasRealizadas,
      0,
      descarteQtd
    );
  });

  const etapaMap = new Map((etapas || []).map(e => [e.id, e]));

  const ranking = {};
  resultadosValidos.forEach(r => {
    const nome = r.piloto_nome;
    const d = descartesPorPiloto[nome];
    const etapasDescartadas = d?.etapasDescartadas || [];

    if (!ranking[nome]) {
      ranking[nome] = {
        piloto: nome,
        categoria: r.categoria || "",
        pontos_totais: 0,
        pontos_penalidades: 0,
        pontos_melhor_volta: 0,
        pontos_tipo_extra: 0,
        etapas_disputadas: 0,
        etapas_descartadas: etapasDescartadas,
        descartes_automaticos: d?.descartesAutomaticos || 0,
        faltas: d?.faltas || 0
      };
    }
    if (etapasDescartadas.includes(r.etapa_id)) return;
    ranking[nome].pontos_totais += Number(r.pontos_totais) || 0;
    ranking[nome].pontos_penalidades += Number(r.pontos_penalidade) || 0;
    ranking[nome].pontos_melhor_volta += Number(r.pontos_melhor_volta) || 0;
    ranking[nome].pontos_tipo_extra += Number(r.pontos_tipo_extra) || 0;
    ranking[nome].etapas_disputadas += 1;
  });

  // etapas_disputadas deve refletir etapas únicas disputadas, não linhas de
  // resultado (há campeonatos com mais de um resultado na mesma etapa por
  // categoria — desconsiderar aqui para a coluna "Etapas").
  Object.keys(ranking).forEach(nome => {
    const ids = new Set(
      (porPiloto[nome] || []).map(r => r.etapa_id)
    );
    ranking[nome].etapas_disputadas = ids.size;
    // etapas_ausentes = etapa_ids realizadas em que o piloto não participou
    // (permite mostrar exatamente quais etapas ele perdeu como descarte)
    ranking[nome].etapas_ausentes = [...etapasRealizadasIds]
      .filter(id => !ids.has(id));
  });

  return Object.values(ranking)
    .sort((a, b) => b.pontos_totais - a.pontos_totais)
    .map((item, i) => ({ ...item, posicao: i + 1 }));
};