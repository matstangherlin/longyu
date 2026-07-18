# Longyu — Relatório de release `0.2.0-beta.1`

**Data (UTC):** 2026-07-18  
**Branch:** `cursor/beta-public-prep-fbab`  
**Versão:** `0.2.0-beta.1`  
**Ambiente alvo:** Production Beta (`VITE_APP_ENV=production_beta`)

## Veredito

**PRONTO para publicar a beta pública**, com os critérios automatizados abaixo em verde.

## Critérios de publicação

| # | Critério | Resultado | Evidência |
|---|---|---|---|
| 1 | `validate:beta` | ✅ | Typecheck + validadores pedagógicos + entitlements + app-environment |
| 2 | `build` | ✅ | `npm run build` → `dist/` |
| 3 | Testes E2E | ✅ | `39 passed` (`smoke` + `pedagogy` + `beta-smoke`) |
| 4 | Nenhuma lição comum &lt; 60 | ✅ | `validate:exercise-depth -- --beta` — portão OK (média 91) |
| 5 | Nenhuma revisão &lt; 70 | ✅ | Mesmo validador (fail review = 70) |
| 6 | Feedback chega ao banco | ✅ | `npm run verify:beta-feedback` — `submit_beta_feedback` retornou id |
| 7 | Pro expira corretamente | ✅ | `npm run test:entitlements` (trial/cancel/past_due) |
| 8 | Nenhum segredo no frontend | ✅ | `npm run validate:frontend-secrets` |
| 9 | Mobile 360 px | ✅ | Suíte e2e `mobile` / `beta smoke — mobile 360` |
| 10 | Relatório salvo | ✅ | Este arquivo |

## O que entrou nesta preparação

- Versionamento `0.2.0-beta.1` na UI (Sobre, landing, feedback, admin)
- Ambientes **Development / Preview / Production Beta** com guardrails Netlify
- Feature flags de rollback (`CONVERSATION_V2`, `TELEMETRY`, `BETA_FEEDBACK`)
- Aviso discreto de beta (landing + Sobre)
- Smoke E2E ampliado (`e2e/beta-smoke.spec.ts`)
- Checklist + rollback em `docs/BETA_RELEASE_CHECKLIST.md`
- Correção: `useExerciseHotkeys` na Revisão não pode ficar depois de early returns (React #300)
- Correção: `EntitlementBootstrap` não zera `serverIsPro` sem sessão cloud

## Funcionalidades mantidas

Todas as funcionalidades atuais permanecem: jornada, Hànzì Builder, imagens reais, conversation_scene V2, revisão, paywall, feedback Supabase, sync, ligas, etc.

## Rollback rápido (resumo)

Ver `docs/BETA_RELEASE_CHECKLIST.md`:

1. Netlify → publicar deploy anterior  
2. Flags: `VITE_ENABLE_CONVERSATION_V2=false`, `VITE_ENABLE_TELEMETRY=false`, `VITE_ENABLE_BETA_FEEDBACK=false`  
3. Progresso do usuário permanece (localStorage + snapshot Supabase)

## Comandos executados

```bash
npm run validate:beta
npm run build
npm run validate:frontend-secrets
CI=true npx playwright test   # 39 passed
npm run verify:beta-feedback
npm run test:entitlements
```

## Pendências manuais (não bloqueiam o GO automatizado)

- Smoke visual em dispositivo iOS Safari / Chrome Android reais antes do anúncio amplo
- Confirmar deploy Netlify production com `VITE_APP_ENV=production_beta` e flags de preview/fixtures em `false`
