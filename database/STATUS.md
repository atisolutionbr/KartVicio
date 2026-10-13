# Migração local

Configuração criada para PostgreSQL 16 no projeto Docker `kartvicio-local`, banco `kartvicio`, porta local 55432 e volume persistente exclusivo.

Banco criado no Docker em 08/10/2026. PostgreSQL 16.15 com 828 registros importados de 13 entidades. `base44_import.records` preserva a origem e `kartvicio.records` alimenta a aplicação local na porta 6300. A comparação completa dos registros com os JSONs exportados passou, assim como autenticação, filtros, paginação, agregação e CRUD.

Dados exportados pela API oficial com token pessoal autorizado, restrito ao KartVicio e somente leitura, armazenado no .env local. Todas as páginas e arquivos do inventário foram recuperados. Duas imagens e três ícones PWA copiados para public/. Compilação de produção passou. Ranking local conferido: André Heiderich 263, Felipe Pravatto 232 e Joanir Smarçaro 196.

Após o Docker ficar disponível:

```powershell
docker compose up -d db
docker compose exec -T db psql -U kartvicio -d kartvicio -c '\dt base44_import.*'
```

O script `database/import-json.mjs` aceita arrays JSON exportados, exige IDs únicos, preserva todos os campos e registra hash SHA256 e contagem em uma transação. As exportações devem ficar em `private-data/`, excluído do Git. Os arquivos originais e as contagens no Base44 precisam ser conferidos antes de declarar a migração completa.

Limites: autenticação Google, convites por e-mail e MCP/OAuth da plataforma não configurados localmente. Os 124 registros Usuario são permissões da aplicação; o endpoint de entidades rejeitou a exportação de User, que exige outro acesso da plataforma. Nenhuma senha original foi recuperada. Credenciais próprias do administrador local em private-data/local-access.txt. Leia LOCAL.md para iniciar novamente.
