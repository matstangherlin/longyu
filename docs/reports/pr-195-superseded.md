# PR #195 — auditoria V4.7.1

**Veredito: `CLOSE_SAFE`**

Nao mergear a branch `cursor/fix-progress-percent-loading-f053`.
A main atual (`11ee35aced812e50757663e5b97a536a9db52663`) ja incorporou semanticamente o delta.

## O que #195 tentava entregar

PR: https://github.com/matstangherlin/longyu/pull/195

- Player nao fica em "Preparando atividades…" infinito (planner fallback + lock de sessao)
- Sync da nuvem com timeout de 12s
- ProgressBar ignora `NaN`
- Testes `test:progress-loading`, `test:session-plan-lock`, e2e `progress-loading.spec.ts`

## Delta restante contra main

Arquivos do PR:

| Arquivo | Na main V4.7? |
| --- | --- |
| `src/features/lesson/LessonPlayer.tsx` planner fallback / `setPlanReady` / watchdog | Sim |
| `src/services/cloudSyncCoordinator.ts` `CLOUD_SYNC_TIMEOUT_MS = 12_000` | Sim |
| `src/components/ui/primitives.tsx` ProgressBar | Sim |
| `src/features/lesson/LessonFocusHeader.tsx` | Sim |
| `scripts/test-progress-loading.mjs` | Sim |
| `scripts/test-session-plan-lock.mjs` | Sim |
| `e2e/progress-loading.spec.ts` | Sim |

A branch antiga esta dezenas de commits atras de V4.7 (onboarding cloud-first, Placement 2.0, RequireCloudSession). Rebase/merge reintroduziria conflito e risco de reverter o funil.

## Acao

Fechar #195 sem merge. Qualquer regressao de barra/sync deve abrir PR novo a partir de `main`.
