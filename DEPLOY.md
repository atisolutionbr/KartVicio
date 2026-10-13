# Publicação KartVicio

Publicado em 13/10/2026: https://kartvicio.atisolution.com.br.
Repositório: https://github.com/atisolutionbr/KartVicio, branch main.

VPS: 143.95.167.97, SSH 22022. Diretório /opt/kartvicio-platform.
Docker Compose: compose.production.yaml; projeto kartvicio-platform.
Aplicação restrita no host a 127.0.0.1:16300, servida por Nginx com HTTPS.
PostgreSQL sem porta pública; volumes postgres_data e uploads persistentes.
O serviço antigo /opt/kart-vicio e os demais projetos foram preservados.

O banco recebeu a cópia local com 828 registros e a conta administrativa existente.
Sessões locais não foram mantidas no servidor. O dump inicial, fora do Git, está
em /opt/kartvicio-platform/kartvicio-migration.dump, com acesso restrito.
Antes de qualquer atualização, gerar um novo pg_dump; não restaurar o dump inicial
sobre um banco que já recebeu alterações de produção.

Para atualizar, transferir apenas o código e executar no diretório da VPS:

```sh
docker compose -f compose.production.yaml build app
docker compose -f compose.production.yaml up -d app
```

A configuração inicial do proxy está em deploy/kartvicio.nginx.conf. Na VPS,
Certbot adicionou o certificado e redirecionamento HTTPS, com renovação automática.
Não substituir o arquivo ativo pelo modelo HTTP após emitir o certificado.

O PWA instalado usa escala de 70%, com convite nativo em navegadores compatíveis
e instrução para Adicionar à Tela de Início no iOS. Requer internet para dados.

Pendências externas: GOOGLE_CLIENT_ID/SECRET e MICROSOFT_CLIENT_ID/SECRET ainda
não configurados. As URLs de retorno em produção são:
- https://kartvicio.atisolution.com.br/api/auth/google/callback
- https://kartvicio.atisolution.com.br/api/auth/microsoft/callback

Os cadastros e permissões foram preservados, mas as credenciais de autenticação
do Base44 não são transferíveis. Convites por e-mail dependem de configuração SMTP.
Consulte OAUTH.md para o vínculo inicial de contas Microsoft.

Validação somente leitura do domínio: node server/verify-production.mjs.
Esse script usa a credencial local em private-data e compara a origem; alterações
legítimas feitas posteriormente em produção podem causar divergência.
