# Longyu — Relatório de release `0.2.0-beta.1`

**Data (UTC):** 2026-07-21  
**Commit base auditado:** `7d12997` (+ correções de corpus da auditoria)  
**Branch da auditoria:** `cursor/beta-readiness-audit-0157`  
**Versão:** `0.2.0-beta.1`  
**Ambiente alvo:** Production Beta (`VITE_APP_ENV=production_beta`)  
**Auditoria completa:** [`BETA_READINESS_AUDIT.md`](./BETA_READINESS_AUDIT.md)

## Veredito

**NO-GO** para anunciar a beta pública como pronta.

Motivo: critérios automatizados de conteúdo/build locais estão fortes, mas **CI GitHub está inoperante (billing)**, **E2E WebKit falhou no offline PWA**, e a **RPC `submit_beta_pedagogy_event` está ausente** no Supabase remoto. Detalhes e percentuais: auditoria completa.

Percentual geral desta rodada: **78%**.

## Critérios de publicação

| # | Critério | Resultado | Evidência |
|---|---|---|---|
| 1 | `validate:beta` | ✅ executado | Typecheck + cadeia pedagógica + economy + entitlements + privacy |
| 2 | `build` | ✅ executado | `npm run build` → `dist/` + PWA |
| 3 | Testes E2E Chromium | ✅ executado | `89 passed`, 2 skipped (`test:e2e`) |
| 3b | E2E Firefox | ✅ executado | `56 passed`, 3 skipped |
| 3c | E2E WebKit | ❌ executado | `61 passed`, **2 failed** (offline PWA) |
| 4 | Nenhuma lição comum &lt; 60 | ✅ | `validate:exercise-depth -- --beta` — média 91 |
| 5 | Nenhuma revisão &lt; 70 | ✅ | Mesmo validador |
| 6 | Feedback chega ao banco | ⚠️ parcial | `submit_beta_feedback` ok; `submit_beta_pedagogy_event` **ausente** |
| 7 | Pro expira corretamente | ✅ | `test:entitlements` + `test:subscription-webhook` |
| 8 | Nenhum segredo no frontend | ✅ | `validate:frontend-secrets` |
| 9 | Mobile 360 px | ✅ Chromium | Suite e2e mobile; WebKit offline falhou |
| 10 | Relatório salvo | ✅ | Este arquivo + `BETA_READINESS_AUDIT.md` |
| 11 | CI verde | ❌ operacional | GitHub Actions blocked by spending/billing |
| 12 | Stripe Test Mode live | ❌ não executado | Sem credenciais Stripe neste ambiente |

## Instalação limpa desta rodada

```bash
rm -rf node_modules dist
npm ci
npm run validate:beta
npm run build
npm run validate:frontend-secrets
CI=true npm run test:e2e
CI=true npm run test:e2e:firefox
CI=true npm run test:e2e:webkit   # falhou: offline PWA
npm run test:subscription-webhook
npm run test:economy-server
npm run validate:sync-merge
npm run validate:conversation-loop
npm run validate:conversation-vocabulary-srs
npm run verify:beta-feedback      # parcial
```

## Correções feitas na auditoria

- Catálogo: caracteres `多`, `少`, `饿` em `CHARACTERS`
- Jornada: distractores sem antecipar `多少钱` em `l24`/`l26b`; `饿` declarado em `l26b`
- `validate-corpus.mjs`: exit code duro em erro (antes podia mascarar falha)

## Rollback rápido (resumo)

Ver `docs/BETA_RELEASE_CHECKLIST.md`:

1. Netlify → publicar deploy anterior  
2. Flags: `VITE_ENABLE_CONVERSATION_V2=false`, `VITE_ENABLE_TELEMETRY=false`, `VITE_ENABLE_BETA_FEEDBACK=false`  
3. Progresso do usuário permanece (localStorage + snapshot Supabase)

## Pendências manuais (explícitas)

- [ ] Restaurar billing / spending limit do GitHub Actions  
- [ ] Aplicar migrações de pedagogia no Supabase (`submit_beta_pedagogy_event`)  
- [ ] Reexecutar E2E WebKit após deps/CI (ou aceitar job informativo com falha conhecida documentada)  
- [ ] Stripe Test Mode (runbook em `SUBSCRIPTION_E2E_REPORT.md`)  
- [ ] Smoke iOS Safari + Android Chrome reais / PWA standalone  
- [ ] Confirmar variáveis Netlify production no painel  

## Próxima remessa recomendada

1. Operacional: CI + RPC pedagogia  
2. Produto: review/merge #43 (player longo) e #39 (migrations Preview)  
3. Limpeza: fechar PRs obsoletas (`OPEN_PRS_CLASSIFICATION.md`)  
4. Só então reavaliar GO
