# Índice de evidência operacional — RC1.2

Este diretório existe para responder uma pergunta só: **isto foi executado de
verdade, ou alguém achou que ia funcionar?**

Cada arquivo aqui é um **runbook**. Enquanto ninguém executar, ele diz
`STATUS: NÃO EXECUTADO` e o check correspondente em
`../rc1-operational-checks.json` fica `pass: false`.

O gate `validate:operational-evidence` recusa `pass: true` sem `testedAt`,
`environment` e `commitSha`, e recusa também um `pass: true` cujo runbook ainda
se declare `NOT_RUN`. O `validate:release-evidence-freshness` recusa evidência
de um SHA diferente do candidate.

## Estado atual

| Check | Status | Data | Ambiente | Evidência | Testado por |
| --- | --- | --- | --- | --- | --- |
| `cloud_auth` | **NOT_RUN** | — | — | [cloud-auth.md](./cloud-auth.md) | — |
| `cloud_sync` | **NOT_RUN** | — | — | [cloud-sync.md](./cloud-sync.md) | — |
| `feedback_backend` | **NOT_RUN** | — | — | [feedback-backend.md](./feedback-backend.md) | — |
| `stripe_test_mode_e2e` | **NOT_RUN** | — | — | [stripe-test-mode.md](./stripe-test-mode.md) | — |
| `stripe_production_config` | **NOT_RUN** | — | — | [stripe-production-config.md](./stripe-production-config.md) | — |
| `android_real_device` | **NOT_RUN** | — | — | [android-real-device.md](./android-real-device.md) | — |
| `ios_real_device` | **NOT_RUN** | — | — | [ios-real-device.md](./ios-real-device.md) | — |
| `rollback_drill` | **NOT_RUN** | — | — | [rollback-drill.md](./rollback-drill.md) | — |
| `pwa_upgrade` | **NOT_RUN** | — | — | [pwa-upgrade.md](./pwa-upgrade.md) | — |
| `league_cloud_smoke` | **NOT_RUN** | — | — | [league-cloud.md](./league-cloud.md) | — |
| `family_plan_live` | **NOT_RUN** | — | — | [family-plan-live.md](./family-plan-live.md) | — |
| `business_seats_live` | **NOT_RUN** | — | — | [business-seats-live.md](./business-seats-live.md) | — |

**Zero de treze executados.** O verdict é NO-GO e não há "quase GO" (P24.1).

> **RC2.1:** manifesto em `../rc2-candidate.json` está `BLOCKED` — sem credentials
> de candidate QA production-like neste ambiente. Deploy-preview continua
> inelegível (`VITE_BACKEND_MODE=local`). `release_candidate_sha` permanece vazio.
> Ver `../../reports/rc2-1-candidate-cloud-evidence.md`.

Os dois últimos entraram na V4.10A.1. Family e a licença Business foram
verificados contra um PostgreSQL 16 local, com as migrations aplicadas e duas
sessões concorrentes disputando o último assento de verdade — o resultado está
em [v410a1-commercial-closure.md](../../reports/v410a1-commercial-closure.md).
Banco local não é deploy: RLS real, `auth.uid()` real e pool de conexões real
mudam o que dá para afirmar. Por isso os dois continuam `NOT_RUN`.

## Por que nada está preenchido

Estes treze checks exigem, nesta ordem: um projeto Supabase de QA com
credenciais, uma conta Stripe em Test Mode com webhook apontando para um
candidate publicado, um Android físico, um iPhone físico, permissão de publicar
e reverter deploy, e um backend de feedback no ar.

O agente que preparou os runbooks não tem acesso a nada disso. Preencher aqui
seria inventar evidência — exatamente o que o P29 do contrato proíbe e o que os
gates novos recusam.

## O deploy preview do PR não fecha estes checks

Cada PR ganha um deploy preview do Netlify, e é tentador tratá-lo como
candidate. Ele não é, e o `netlify.toml` diz por quê:

| Contexto | `VITE_BACKEND_MODE` | Supabase |
| --- | --- | --- |
| `context.production` | `supabase` | url e anon key reais |
| `context.deploy-preview` | `local` | vazios |

Um deploy preview roda **sem backend**. Então `cloud_auth`, `cloud_sync`,
`feedback_backend`, `stripe_test_mode_e2e`, `stripe_production_config` e
`league_cloud_smoke` não podem sequer ser exercitados ali: não há servidor do
outro lado. Evidência colhida num preview para esses seis seria falsa por
construção, não por descuido.

O preview serve para duas coisas legítimas:

- conferir os **headers reais** — a CSP do `netlify.toml` vale no preview, e o
  `npm run preview` local não a aplica (foi essa lacuna que deixou passar a
  primeira correção de fonte da RC1.2);
- abrir o app num Android ou iPhone de verdade, pelo QR code do comentário do
  Netlify, para render e gestos — sem login, sem sync, sem compra.

O ambiente do agente não alcança `*.netlify.app` (a política de rede recusa a
conexão), então nem a conferência de headers foi feita daqui.

## Como fechar um check

1. Executar os passos do runbook contra o **candidate publicado**.
2. Preencher o bloco `RESULTADO` do runbook: `date`, `environment`, `result`,
   `commitSha`, `tester`. Registrar também o que falhou, não só o que passou.
3. Atualizar o check em `../rc1-operational-checks.json` com `pass`,
   `testedAt`, `environment` e `commitSha`.
4. Preencher a linha correspondente nesta tabela.
5. Rodar `npm run validate:operational-evidence` e
   `npm run validate:release-evidence-freshness`.

## Regras que os gates aplicam

- **Nunca versionar segredo.** Chave de API, token, `service_role`, webhook
  secret. IDs de teste vão mascarados (`cus_***4242`).
- **Test Mode não é produção.** `stripe_test_mode_e2e` e
  `stripe_production_config` são checks separados de propósito (P9.1). Test Mode
  passando não autoriza marcar `stripe_live`.
- **Device real precisa se identificar.** Evidência de Android/iOS sem modelo e
  versão é recusada.
- **Rollback precisa do antes e do depois.** Sem os dois SHAs, é recusado.
- **Evidência envelhece.** Se o candidate mudar, auth, sync, Stripe, device,
  rollback e PWA precisam ser refeitos ou declarados compatíveis.
