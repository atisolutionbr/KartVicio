# KartVicio Race Control

Sistema de operação e análise de kart endurance, evoluído a partir do ZIP enduro-race-app. Next.js, TypeScript, Tailwind e Recharts.

## Executar localmente

```bash
npm ci
npm run dev
```

Abra http://localhost:5300. Usuário **admin**, senha **kart123** em desenvolvimento.

## Recursos

- Configuração de regulamento, equipes e pilotos.
- Cockpit, monitoramento, box com verificações, troca de pilotos e karts.
- Ritmo por mediana, consistência, tendência, exclusão de voltas e histórico de stints.
- Recomendações explicadas, projeções e análise dos limites regulamentares.
- Registro manual, importação JSON/CSV, replay, simulação e backup persistente.
- PWA instalável, escala inicial de 70% com opção de 100%, navegação móvel.

A integração LapTime exige autorização escrita e documentação oficial. A captura automatizada legada foi desativada. Não use scraping para contornar essa restrição.

## Verificação

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`node scripts/smoke.mjs` valida o fluxo pelo navegador e substitui a sessão por dados de teste; use apenas em ambiente de validação.

## Documentação

- [Operação, persistência, integração e VPS](docs/OPERACAO.md)
- [PWA, escala e instalação](docs/PWA.md)

A implantação usa serviço independente em `/kart`, sem menus no United. Segredos e dados locais não são versionados. A senha padrão é recusada em produção; configure `.env.production` a partir do exemplo.
- [Auditoria, modelo e limitações](docs/AUDITORIA.md)
