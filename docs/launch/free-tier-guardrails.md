# Longyu must fail cheaply — free-tier guardrails (RC2.3.4A)

Single source: [`supabase/functions/_shared/budgetPolicy.ts`](../../supabase/functions/_shared/budgetPolicy.ts) (pure, no Deno/browser APIs).
Tests: `npm run test:free-tier-guardrails` (144 checks, part of `validate:beta`).

## Policy switches (server-side, Edge env — never `VITE_*`)

| Switch | Default | Notes |
|---|---|---|
| `FREE_TIER_FIRST` | `true` | forced `true` |
| `ALLOW_PAID_OVERAGE` | `false` | **cannot** be enabled by env — paid overage is a billing decision |
| `JEV_RUNTIME_ENABLED` | `false` | Jev inside the learner flow; `askJev(…, "LEARNER_RUNTIME")` throws while off |
| `JEV_DEV_AUDIT_ENABLED` | `true` | kill switch for admin triage (`triage-feedback` answers 503) |
| `MARKETING_EMAIL_ENABLED` | `false` | |
| `HIGH_VOLUME_REPLAY_ENABLED` | `false` | |

## Thresholds

| Usage / limit | Level | Effect |
|---|---|---|
| < 70 % | GREEN | — |
| ≥ 70 % | WARN | report |
| ≥ 85 % | CRITICAL | report, owner review |
| ≥ 95 % | DEGRADE_NONESSENTIAL | OPTIONAL capabilities off (marketing, optional AI, replay, tracing, non-critical analytics, enrichment) |
| ≥ 100 % | EXHAUSTED | IMPORTANT off too (onboarding/reminder mail, error capture) |
| unreadable | UNKNOWN | reported, never silently treated as an outage |

**Never degraded:** login, account recovery, payment and security mail, entitlement truth, progress sync, security.

## Provider outage ≠ learning outage

| Provider down | Behaviour | Evidence |
|---|---|---|
| Supabase | lessons run locally; feedback queues in `localStorage` and flushes later; pedagogy overlay failure never blocks a lesson | `enqueueFeedback`; `LessonPlayer` "Falha do V6 nunca bloqueia a sessão" |
| Supabase (entitlement RPC) | the session keeps the last server entitlement instead of downgrading a paying learner | `entitlementService.ts` `transportFailed` (RC2.3.4A) |
| Resend | not on any learning path | — |
| Sentry | not integrated; when added, SDK failures must stay fire-and-forget | — |
| TypeSafe / Jev | not on any learning path; deterministic pedagogy only | `test:free-tier-guardrails` "no learner runtime path calls Jev" |
| Stripe | entitlement lives in Supabase (written by the webhook), so a Stripe outage does not remove access | `stripe-webhook` → `subscriptions`; `get_server_entitlement` |
| Cloudflare Turnstile | signup is fail-closed in production by design (abuse control); learning for existing users unaffected | `create-account` `verifyTurnstile` |

## Jev

3 s timeout · circuit breaker (3 failures → 60 s open, half-open probe) · `jevInputHash` dedupe within a batch · reuse of an identical message already triaged (no re-evaluation) · batch ≤ 25 / concurrency 5 · purpose-tagged calls (`DEV_AUDIT` vs `LEARNER_RUNTIME`).

## Email

`decideEmail` = idempotency key `template:user:event` · 24 h dedupe window · ≤ 5 non-critical mails per user per 24 h · critical mail deduped but never capped · class gating by budget level and switches. Wire it in front of Resend when Resend becomes the SMTP/API path.

## Stripe

Signed webhook (`constructEventAsync`) · idempotent upsert on `stripe_event_id` · event ordering `(created, id)` · server-side entitlement only — the client never declares `isPremium=true` (checked statically).

## Netlify

Production publishes only `[release]` / `[deploy]` commits (or `LONGYU_FORCE_PRODUCTION_DEPLOY=1`); previews always build. `scripts/netlify-ignore-build.mjs` + `scripts/lib/netlify-deploy-policy.mjs`.

## Budget health

No new monitoring system. Budget health = the registry JSON (re-verified by hand or through the connectors) + provider dashboards; `budgetLevel(used, limit)` turns any reading into a level. A paid watcher would defeat the purpose.
