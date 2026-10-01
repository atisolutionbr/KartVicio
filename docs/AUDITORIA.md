# Auditoria e evolução

## Origem e arquitetura

Base: ZIP enduro-race-app-main fornecido pelo usuário, originalmente associado a pdr606/enduro-race-app. A arquitetura Next.js App Router, TypeScript, Tailwind, Recharts e os módulos de regras, estratégia e análise foram preservados. Os componentes visuais existentes continuam sendo usados.

A base tinha cockpit com dados simulados, persistência parcial no navegador, ingestão em memória e ferramentas de captura de páginas. Esta versão conecta as telas ao estado persistente do servidor, valida operações e identifica manual/simulação/replay/live. O código legado permanece para rastreabilidade; a captura não autorizada foi desativada.

## Modelo ativo

`src/domain/race/session.ts`: configuração da prova, equipes, pilotos, voltas normalizadas, stints, paradas, eventos e playback. Tempos em milissegundos e identificadores estáveis distinguem inscrição, kart físico e piloto.

`src/domain/race/engine.ts`: transições, troca de piloto, entrada/saída do box, verificações, limites e auditoria. `src/server/race-store.ts`: fila de transações, cópia antes de alteração, persistência atômica, importação, restauração e replay. Uma sessão ativa por instância.

`src/domain/pace/performance.ts` e `race/analytics.ts`: mediana, MAD, dispersão, tendência, janelas e agregação por piloto/stint. Dados excluídos ou inválidos não sustentam recomendações de ritmo.

`src/domain/strategy/endurance.ts` e `legal-plan.ts`: prioridades regulamentares, obrigações de pilotos, cenários e busca limitada de sequências. Projeções mostram insuficiência de dados quando necessário.

`src/domain/timing/providers.ts` e `simulation.ts`: validação de snapshots/voltas, CSV/JSON, replay e simulação determinística. O adaptador LapTime autorizado exige contrato externo antes de ativação.

## Interface e APIs

As telas Cockpit, Monitoramento, Box, Estratégia, Pilotos, Equipes, Setup, Parâmetros, Análise, Stints, Histórico, Replay, Command Center, iPad e Karts usam o servidor. `RaceProvider` centraliza atualização e comandos. `/api/race` concentra operações e backup; `/api/timing` recebe ingestão autenticada; `/api/health` permite verificar disponibilidade.

`src/proxy.ts` protege telas/APIs. Login usa cookie HttpOnly e limite de tentativas inválidas por IP em memória. Em produção HTTPS, o cookie é Secure e restrito ao prefixo. O modelo é acesso compartilhado da equipe; não há perfis individuais ou auditoria por conta pessoal.

Manifesto, ícones, worker e controle de escala adicionam PWA. A escala inicial de 70% é ajustável. A interface móvel usa navegação horizontal, painéis com largura limitada e rolagem interna de tabelas. Verificação automatizada: scripts/responsive-pwa.mjs.

## Verificação e limites

A suíte de domínio contém 130 testes. A validação de navegador inclui cadastro, troca de piloto, checklist de box, persistência após recarga, replay de backup, simulação completa e rotas. O script substitui dados e deve rodar exclusivamente em validação.

As regras configuradas devem ser conferidas contra o regulamento vigente pelo responsável da prova. Uma regra específica escrita em texto não vira automaticamente uma condição executável. Não há integração oficial LapTime funcionando sem autorização, nem homologação em prova real. Supabase é um esquema de referência; a implementação ativa usa arquivo persistente. O PWA não envia comandos offline.

## Implantação

Docker e Compose publicam somente 127.0.0.1:15300. Nginx encaminha /kart, sem alterar navegação do United. O volume de dados é persistente, e o script salva a configuração Nginx antes de incluir o caminho e valida nginx -t. Segredos, dados de corrida e artefatos de validação são ignorados pelo Git.
