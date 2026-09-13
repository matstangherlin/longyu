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

**Zero de onze executados.** O verdict é NO-GO e não há "quase GO" (P24.1).

## Por que nada está preenchido

Estes onze checks exigem, nesta ordem: um projeto Supabase de QA com
credenciais, uma conta Stripe em Test Mode com webhook apontando para um
candidate publicado, um Android físico, um iPhone físico, permissão de publicar
e reverter deploy, e um backend de feedback no ar.

O agente que preparou os runbooks não tem acesso a nada disso. Preencher aqui
seria inventar evidência — exatamente o que o P29 do contrato proíbe e o que os
gates novos recusam.

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
