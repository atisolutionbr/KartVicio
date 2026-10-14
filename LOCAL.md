# KartVicio local

Abra http://localhost:6300. E-mail e senha de administração estão em `private-data/local-access.txt`.

Para iniciar novamente, com Docker Desktop aberto, execute `./Start-KartVicio.ps1` no PowerShell. O script inicia o PostgreSQL e mantém o servidor Node em segundo plano. O acesso é restrito ao próprio computador, em 127.0.0.1:6300.

O banco PostgreSQL está em 127.0.0.1:55432, banco e usuário `kartvicio`. A senha está no `.env`. O volume Docker `kartvicio-local_postgres_data` preserva o banco. Não execute `docker compose down -v`, pois isso remove o volume.

## Cópia e validação

Os 164 arquivos do inventário original estão presentes. O ZIP `private-data/base44-source-original.zip` preserva o código anterior às adaptações. As 13 entidades foram exportadas com paginação e contagem da origem: 828 registros. Os JSONs originais e credenciais ficam em `private-data/` e `.env`, excluídos do Git.

`base44_import.records` preserva a cópia original; `kartvicio.records` contém os dados usados e alterados pelo app. Ambos usam PostgreSQL com JSONB para preservar todos os campos e IDs da origem. As regras de ranking e as telas continuam no código original; o adaptador local substitui chamadas ao Base44.

Teste de integridade inicial: `node server/smoke-test.mjs`. Compara os registros locais com a exportação e testa autenticação, paginação, agregação e CRUD usando um piloto temporário. Após alterações legítimas no sistema, a comparação com a origem poderá divergir.

## Limites da migração

O administrador local é jonatha.soares@atisolution.com.br, com a senha exata corrigida pelo proprietário. Google está publicado e testado na VPS; consulte DEPLOY.md. Microsoft ainda depende de credenciais. Os 124 registros originais de Usuario permanecem no snapshot da importação. Após a limpeza autorizada, há 18 usuários únicos no banco operacional e 106 duplicados recuperáveis em kartvicio.usuario_dedup_backup. Foram preservados status, permissões efetivas e campeonatos. Nenhuma senha dos demais usuários foi presumida a partir dos e-mails. O cadastro de autenticação User não pôde ser exportado pelo endpoint de entidades. Envio de convites por e-mail e MCP da plataforma ainda não estão configurados.

Código publicado no GitHub e aplicação publicada na VPS em 13/10/2026. Consulte DEPLOY.md. Não publicar o banco, exportações ou `.env` no Git. Os bancos local e de produção são independentes após a migração.
