# RC2.3.10 — Observabilidade (Sentry)

**Gate `SENTRY_PASS` = `CONFIG_REQUIRED`.** O código está pronto e desligado. Certificar exige ingest real de um `SENTRY_TEST_EVENT`.

## Estado auditado

- Antes desta wave: nenhum SDK; org Sentry existe, **0 projetos** (`docs/launch/platform-responsibility-map.md`).
- Agora: `@sentry/browser@10.75.3` (fixado, publicado em 2026-09-23), carregado como **chunk lazy** só quando `VITE_SENTRY_DSN` existe e o ambiente é de produção.

## Implementação (`src/lib/observability/`)

| Requisito | Como |
|---|---|
| DSN via env | `VITE_SENTRY_DSN`. Sem ela, `NO_DSN` e o SDK nunca é baixado. |
| environment | `VITE_APP_ENV`. `preview`/`qa_candidate`/`development`/`test` → `NON_PRODUCTION_ENV` (desligado). |
| release | SHA do build (`VITE_COMMIT_SHA`) |
| version / platform | tags `app_version`, `app_env`, `platform` (web/android) |
| error boundaries | `ErrorBoundary.componentDidCatch` → `captureError(error, area)` |
| sampling | erros 1.0; **tracing 0, replay 0** (mais restrito que o plano: só erros) |
| source maps | `vite.config` mantém `sourcemap: false`; nada publicado. Upload privado de source maps só com token de CI (`SENTRY_AUTH_TOKEN` fora do bundle, coberto pelo gate). |
| PII | `sendDefaultPii:false`; `scrubEvent` remove usuário, body, cookies e headers; URLs sem query/hash; e-mail/JWT/token longo mascarados; chaves `answer`, `transcript`, `recording`, `audio`, `speech`, `stroke`, `drawing`, `coord`, `points`, `token`, `password`, `email` descartadas; breadcrumbs `console` e `ui.input` descartados |

Testes (`npm run test:rc2-3-10-cloud`): "sem DSN", "preview", "vaza e-mail", "vaza resposta/traço/gravação", "vaza token/query" e "mantém breadcrumbs de console/input" são todas mutações mortas. O contexto não sensível (`lessonId`) é preservado.

## CSP

**Não** alterada nesta wave: o host de ingest exato só existe quando o projeto for criado. Abrir `*.ingest.sentry.io` agora ampliaria a CSP sem necessidade. Quando o owner informar o host, `connect-src` recebe **só** ele (`OA-SENTRY-PROJECT`).

## `SENTRY_TEST_EVENT`

`/qa/device › Release truth › Cloud` tem o botão "Enviar SENTRY_TEST_EVENT", que mostra "Sentry desligado neste build" quando não há DSN. Só vira `PASS` com o evento confirmado no painel do Sentry.
