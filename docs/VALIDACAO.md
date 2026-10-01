# Validação e implantação — 01/10/2026

Aplicativo publicado em https://united.atisolution.com.br/kart. Repositório: https://github.com/atisolutionbr/KartVicio, branch codex/endurance-system. Código de aplicativo validado: 784a3e7.

## Evidências

- 23 suítes e 130 testes passaram, incluindo gravação em arquivo, rejeição de transação sem alteração parcial e replay de uma troca de kart exportada.
- ESLint e compilação com TypeScript passaram. Produção compilada em Linux na própria VPS, com Next.js standalone.
- Fluxo completo no navegador passou nas versões local e compilada com /kart: login, ingestão protegida, pilotos, equipes, troca de piloto, checklist de box, persistência após recarga, replay de backup e simulação até o fim. 15 rotas, nenhum erro JavaScript.
- 14 telas verificadas com dados carregados em 320, 390, 768 e 1440 pixels. Sem transbordamento horizontal da página; tabelas mantêm rolagem interna.
- PWA validado em HTTPS: manifesto, PNGs, escala 70%/100%, preferência persistente, service worker ativo e tela offline. Escopo /kart inclui a raiz canônica sem barra final; o worker usa cache kart-offline-v2 e não guarda dados de corrida.
- /kart redireciona para /kart/login quando não há sessão. /kart/api/health responde 200. O container kart-vicio-kart-1 ficou saudável.
- Volume kart-vicio_kart_data montado em /data/race-control, leitura e escrita habilitadas; o usuário do aplicativo passou na conferência de permissão de gravação.
- United permaneceu atendendo na raiz, com seus containers e menus preservados. A única integração de infraestrutura foi o encaminhamento /kart no Nginx do host, validado com nginx -t e backup da configuração.

## Dados e acesso

O ambiente de produção foi iniciado sem importar os cadastros de teste. A senha de produção está em .env.production, fora do Git, e deve ser tratada como segredo. Acesso compartilhado da equipe: usuário admin. Local: http://localhost:5300, admin / kart123, demonstração de 4 horas com 15 equipes e 4 pilotos por equipe, pausada para análise.

A gravação de teste na sessão de produção não foi executada: a revisão automática exigiu autorização específica. A validação de persistência usou ambiente isolado, complementada pela conferência somente de leitura do volume da VPS. Não foi feita homologação em corrida real.

## Operação

Projeto na VPS: /opt/kart-vicio. Serviço Docker separado, porta 127.0.0.1:15300. Configuração Nginx adicional: /etc/nginx/snippets/kart-vicio.conf. Atualizações e reversão devem preservar o volume de dados e .env.production; para reverter o aplicativo, reconstrua o commit anterior. Consulte OPERACAO.md antes de executar scripts de teste, pois o smoke substitui a sessão selecionada.

A integração automática LapTime continua condicionada à autorização e documentação oficial. Registro manual, importação, replay e simulação estão disponíveis.
