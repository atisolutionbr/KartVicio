# KartVicio — operação e implantação

## Acesso local

Execute `npm ci`, depois `npm run dev`. Abra http://localhost:5300.
Usuário de desenvolvimento: **admin**. Senha: **kart123**.
Essas credenciais são exclusivas do ambiente local. Em produção, configure `APP_USER` e uma senha forte em `APP_PASSWORD`; a aplicação rejeita a senha padrão em produção.

## Uso

1. Configure evento, duração, janela de box, paradas obrigatórias, limites de stint, peso e limites individuais.
2. Cadastre pilotos e equipes, vincule os pilotos às equipes e selecione sua equipe.
3. Selecione o piloto inicial e inicie o relógio. Registre voltas na tela de monitoramento ou importe JSON/CSV.
4. Para uma parada, registre entrada no box, selecione próximo piloto e kart, complete as verificações e registre saída. O servidor valida duração, janela e regras configuradas.
5. Consulte estratégia, análise, stints e histórico. Recomendações apresentam motivos e confiança; a equipe continua responsável pelas decisões.
6. Exporte um backup antes e depois do evento. Replay e simulação permitem treinar sem cronometragem externa.

O estado é persistido atomicamente em `data/race-control/session.json`, ou no diretório `KART_DATA_DIR`. Use somente uma instância do servidor por arquivo. Backups contêm cadastros e histórico; proteja-os como dados da equipe. O sistema mantém uma sessão ativa, e não um catálogo de múltiplos eventos.

## Dados e limitações

Tempos são armazenados em milissegundos. Voltas ausentes não são inventadas. Voltas de box, incidentes, inválidas e excluídas não entram no cálculo de ritmo. Mediana, dispersão, tendência e histórico por piloto sustentam a análise. Simulação é identificada como estimativa. Projeções exigem amostras e não garantem resultado de corrida.

O planejador procura sequências viáveis dentro das regras representadas, com limite de busca. Não encontrar uma sequência não prova impossibilidade matemática. O planejamento de pilotos compartilhados considera ocupação atual; a coordenação futura entre equipes exige revisão do operador. Não há homologação por organizador nem validação em uma prova real nesta entrega.

## LapTime

A integração automática permanece bloqueada até autorização escrita e documentação oficial. Os [termos do fornecedor](https://sisecom.com.br/laptime/term/LivetimeTermsOfUse.html) restringem automação e integração. O código legado de captura não deve ser usado para contornar essas condições. O sistema funciona com registro manual, importação, replay e simulação.

`POST /api/timing` aceita dados normalizados com sessão autenticada ou `Authorization: Bearer <TIMING_API_KEY>`. Configure a chave exclusivamente no servidor. Integrações autorizadas devem adaptar o payload ao normalizador de `src/domain/timing/providers.ts`, preservar origem e qualidade, e enviar o tempo decorrido da prova. Não use credenciais de terceiros no repositório.

## Validação

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
`node scripts/smoke.mjs` testa login e operação pelo navegador e **substitui a sessão local por dados de teste**. Execute em ambiente de validação, nunca durante uma prova. `QA_URL`, `QA_BASE_PATH`, `QA_PASSWORD` e `CHROME_PATH` permitem selecionar ambiente e navegador.

## VPS do United

A implantação usa `/kart`, serviço independente e porta interna 15300. Não exige alteração de menus do United. O prefixo é definido durante a compilação por `NEXT_PUBLIC_BASE_PATH=/kart`.

1. Copie o projeto para um diretório separado na VPS.
2. Copie `.env.production.example` para `.env.production` e preencha os segredos.
3. Execute `docker compose -f docker-compose.production.yml up -d --build`.
4. Inclua `infra/nginx/kart.locations.conf` dentro do bloco `server` já responsável por `united.atisolution.com.br`, revise a configuração completa, execute `nginx -t` e recarregue o Nginx.
5. Verifique https://united.atisolution.com.br/kart/login e `/kart/api/health`, login, persistência após reinício e restauração de backup.

O volume `kart_data` deve ser preservado nas atualizações. Nunca execute `docker compose down -v` sem backup. A implantação deve ser confirmada pela verificação de saúde HTTPS e login após executar scripts/deploy-vps.sh. O script preserva uma cópia da configuração Nginx e valida a sintaxe antes de recarregar.

O esquema Supabase legado permanece como referência; a persistência ativa desta versão é em arquivo. Para escala ou múltiplas instâncias, implemente um repositório transacional compartilhado antes de aumentar réplicas.
