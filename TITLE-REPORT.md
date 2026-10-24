# Relatório Chances de Título

Disponível em Relatórios → selecionar campeonato/ano/categoria → Analisar disputa pelo título. Clique no piloto para abrir limites, exemplos e conquista antecipada.

O relatório é somente leitura, utiliza as mesmas APIs autenticadas e respeita os campeonatos vinculados. Não exige migração de banco ou novas credenciais. Cálculo em Web Worker carregado sob demanda; cancelado ao recolher ou trocar seleção.

Base: resultados recalculados com tabela específica (ou global), penalidades atuais, melhor volta e extras existentes; duplicidades piloto/etapa consolidadas pelo maior total e sinalizadas. Etapas finalizadas ou com resultados contam como realizadas. Registros descartados manualmente não pontuam. Calendário do ano e categoria selecionados; sem categoria na etapa significa etapa comum. Etapas planejadas sem cadastro são projetadas sem dobro e sinalizadas. Em disputas por categoria, não se extrapola o total global do campeonato.

6.000 simulações determinísticas, seed 174241. Plackett–Luce via corridas exponenciais: força exp(4*score), score=(soma de 1-(posição-1)/N + 2)/(classificações+4). Presença classificada=(classificações+3)/(etapas realizadas+4), limitada a [0,15;0,98]. NC/DQ futuros não são modelados separadamente de ausência. Melhor volta uniforme entre classificados. Outros bônus opcionais assumem zero ou o teto informado com probabilidades iguais. Cada etapa usa posições exclusivas e tabela correta. Sem previsão de novas penalidades.

Pontuação com descarte replica a regra atual do simulador: faltas consomem descartes; resultados com penalidade não são elegíveis. A seleção de descartes é explícita, iniciada a partir de descarte_ativo. Como o simulador atual, não aplica descarte_min_etapas. Empates dividem peso probabilístico; sem regra de desempate não se declara campeão isolado por igualdade.

Limites matemáticos conservadores: piso mínimo entre k participações futuras com zero pontos e ausências; teto com máximo em todas as provas futuras. Garantia somente se piso próprio > todos os tetos rivais; eliminação somente se teto próprio < algum piso rival. Provas condicionadas ao calendário, teto de bônus e ausência de novas penalidades. Disputa aberta não prova existência de solução. Conquista antecipada busca um prefixo que garante título em até 200 trajetórias; não prova a primeira etapa possível. Exemplos mostram posições e pontos recebidos por piloto em cada corrida, com pontuação final.

A frequência simulada não é probabilidade oficial ou calibrada. Erro Monte Carlo máximo aproximado ±1,3 pp; incerteza das premissas pode ser maior. Zero vitórias observadas não prova impossibilidade. Percentuais e exemplos não alteram resultados oficiais.

Validação: node server/title-model-test.mjs. Inclui bônus/dobro, descartes protegidos por penalidades, faltas, encerramento, empates, soma de probabilidades, exclusividade de posições, reprodutibilidade e limites confrontados com enumeração de pequenos casos. Benchmark com snapshot de 18 pilotos/14 realizadas/4 restantes: cerca de 1,5 s no ambiente de desenvolvimento (não é garantia para todo dispositivo).

Publicação em 24/10/2026: cálculo validado com dados atuais do domínio (18 pilotos, 14 etapas realizadas, 4 pendentes; soma de chances 100%; aproximadamente 1 s no teste Node). O snapshot antigo da migração já difere por alterações legítimas de updated_date; ele não é usado para restaurar ou substituir cadastros atuais. Validação atual: node server/verify-title-production.mjs.

## Seleção de piloto e plano de colocações

A atualização de 24/10/2026 acrescenta seletor explícito de piloto, melhor/pior classificação final observada e um plano de chegada por etapa. O usuário escolhe uma posição exata a repetir nas próximas corridas até cada marco, com ou sem melhor volta. O relatório calcula o piso final próprio e o maior teto rival (excluindo a posição ocupada pelo piloto em cada prova do plano), permitindo ao piloto zerar/faltar após o marco. Os rivais recebem seus tetos independentemente: garantia é conservadora e condicionada às premissas, não uma previsão de chegada simultânea de todos na mesma posição. Empates não garantem título. Outros bônus próprios no plano são zero; os rivais podem atingir o teto configurado.

Para cada marco, busca-se também a maior posição numérica exata que basta quando repetida desde a próxima corrida. Não se afirma que seja a pior colocação possível em qualquer combinação ou que uma colocação superior sempre baste em tabelas não monotônicas. A melhor classificação final observada é extraída das 6.000 simulações, admitindo melhor desempate, e não é um limite matemático provado.
