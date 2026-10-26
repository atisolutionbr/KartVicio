# Revisão do simulador — 26/10/2026

O simulador agora usa um único modelo para classificação atual e projetada. Os controles Com descarte e Sem descarte recalculam ambos, preservando as posições previstas. A edição é instantânea, com classificação, diferença de pontos e movimento de posição próximos dos campos.

Foram corrigidos: projeção sem descarte apesar do modo selecionado; padrão que transformava zero descartes em um; mutação de estado aninhado; soma duplicada em etapas com resultados; ausência de pilotos sem pontos; posições inválidas ou repetidas; carregamentos sem tratamento de erro. Etapas finalizadas ou que já possuem qualquer resultado ficam fora das etapas futuras. Digitação parcial permite escrever posições de dois dígitos sem aplicar um valor intermediário repetido.

Campos vazios em uma etapa parcialmente simulada representam ausência nessa etapa e podem consumir descarte. Etapas não simuladas não entram no cenário. Não são presumidos bônus de melhor volta. Empates em pontos são identificados e ordenados alfabeticamente; a projeção não determina desempate oficial. As simulações são temporárias e não gravam resultados no banco.

Validação: build local e na VPS; teste dedicado simulator-test.mjs cobrindo alternância de descarte, configuração zero, alteração/limpeza, empate, pontos dobrados, penalidades, NC, faltas, duplicidade, intervalos e etapas protegidas; regressões de ranking, identidade e diferença de pontos. Teste no domínio confirmou 214 → 239 pontos e 4º → 3º ao prever vitória; alternância de modo manteve a posição digitada e recalculou a projeção; reiniciar restaurou a classificação original.

A exportação expande as áreas roláveis anotadas para incluir todos os pilotos. Fonte anterior preservado nos backups da VPS. Nenhum resultado real foi alterado durante esta revisão.
