# Longyu — Platform Responsibility Map (RC2.3.4A)

Rule: **one platform per problem unless there is a written reason.** Numbers and account reads:
[`platform-budget-registry.json`](platform-budget-registry.json) (each with `verifiedAt` + source).
Status vocabulary: PASS · CODE_READY · ACCOUNT_VERIFIED · NOT_RUN · OWNER_ACTION_REQUIRED · BLOCKED · PAID_PLAN_REQUIRED.

| Platform | Owns (only this) | Explicitly NOT | Today | Status |
|---|---|---|---|---|
| **Supabase** (`MandarimProject`) | PostgreSQL, Auth, entitlement state, progress sync, small server functions (account creation, checkout session, webhook, onboarding, admin audit) | Static hosting, media CDN, email delivery engine, analytics warehouse | Free, 20 MB DB, 8 Edge Functions, no Storage, no Realtime | ACCOUNT_VERIFIED |
| **Netlify** | Web/PWA build, deploy previews, production frontend | Server logic (no Netlify Functions in use), media origin | Free, 300-credit pool **shared with atomurus.com and tefilot.app** | ACCOUNT_VERIFIED (usage UNKNOWN) |
| **Cloudflare** | Turnstile (signup bot protection) today; DNS/CDN only if the domain moves there | A second dynamic proxy in front of Netlify/Supabase; R2 before there is a measured need | 0 Workers, R2 not enabled, Turnstile in use | ACCOUNT_VERIFIED (plan UNKNOWN) |
| **Resend** | Transactional email: auth confirmation, recovery, payment, security; later onboarding/reminder | Marketing blasts at launch | Free 100/day · 3 000/month, **0 domains**, not integrated | OWNER_ACTION_REQUIRED |
| **Sentry** | Production errors; low-volume performance evidence; release diagnostics | 100 % tracing or session replay | Org exists, **0 projects**, no SDK in app | NOT_RUN |
| **Stripe** | Web payments, subscriptions, webhook payment truth → entitlement | Billing inside the Android app (Play policy — RC2.3.11 compliance decision) | Connected account: test mode only, 0 products, 0 webhooks | ACCOUNT_VERIFIED (live NOT visible) |
| **TypeSafe / Jev** | Dev-time semantic audit (admin feedback triage); future offline ranking experiments | Any learner runtime dependency at launch (`JEV_RUNTIME_ENABLED=false`) | Key in Supabase Vault; credits/quota not readable | CODE_READY (account UNKNOWN) |

## Overlaps found and resolved

| Overlap | Decision |
|---|---|
| Netlify CDN **and** a Cloudflare Worker proxy **and** Supabase as origin for media | Do **not** add a Worker. Static media (8.5 MB `public/`, 4.3 MB audio, 676 files) stays on Netlify, immutable-cached by the PWA. Re-evaluate R2 only when Netlify bandwidth > 70 % for two cycles. |
| Supabase built-in mailer **and** Resend | Resend becomes Supabase Auth's custom SMTP (one sending path). Until a domain is verified, real-launch email is `OWNER_ACTION_REQUIRED`. |
| Telemetry in Supabase (`beta_pedagogy_events`) **and** Sentry performance | Pedagogy events stay in Supabase (product truth, consented). Sentry gets errors only; traces sampled at 2 %, replay off. |
| Stripe entitlement **and** client flags | Server is the only authority (`get_server_entitlement`); client never writes `subscriptions`/premium. Guarded by `test:free-tier-guardrails`. |

## Netlify — deploy cost

- Credits (public pricing, 2026): production deploy **15**, bandwidth **20/GB**, requests **2/10 k**, compute **10/GB-h**; deploy previews, branch deploys and failed deploys **0**.
- Before RC2.3.4A every merge to `main` was a production deploy → ≤ 20 merges/month would exhaust the shared pool and **pause all three sites**.
- Now: `netlify.toml` → `ignore = "node scripts/netlify-ignore-build.mjs"`:
  - `deploy-preview` / `branch-deploy`: always build (free).
  - `production`: builds only if the commit message contains `[release]` or `[deploy]`, or the site env `LONGYU_FORCE_PRODUCTION_DEPLOY=1` is set for one build.
- Flow: **PR → CI**; **PR → preview when needed**; **release candidate (`[release]`) → production**.

## Cloudflare — R2 decision for media

| Measure | Value | Source |
|---|---|---|
| `public/` total | ≈ 8.5 MB (audio 4.3 MB, logos/mascot ≈ 4 MB) | `du -sh` on this branch |
| Files | 676 | `find public -type f` |
| Main JS chunk | 2.7 MB | `dist/assets` |
| Cacheability | immutable, fingerprinted; PWA precache | Vite build |

Total media is two orders of magnitude below any free bandwidth limit; requests are cacheable. **No R2 migration this wave** — no real benefit, and enabling R2 requires a dashboard opt-in the owner has not made.

## Resend — email budget

| Class | Templates | Free-tier behaviour |
|---|---|---|
| CRITICAL | signup confirmation, password recovery, payment, account security | Never degraded, deduped by idempotency key, not per-user capped |
| IMPORTANT | onboarding, progress reminder | Off only when the monthly quota is exhausted; ≤ 5 mails/user/24 h |
| OPTIONAL | marketing, campaigns | `MARKETING_EMAIL_ENABLED=false`; first to go at ≥ 95 % |

Budget: 3 000/month ⇒ at ~2 critical mails per new user and ~1 reminder/MAU/month the free tier covers roughly ≤ 1 000 MAU. A bug cannot send 20 identical mails: `decideEmail` (dedupe window 24 h + per-user cap), tested.

## Sentry — strategy (when a project + DSN exist)

`errors > traces > replays`: `sampleRate 1.0`, `tracesSampleRate 0.02`, `replaysSessionSampleRate 0`, `replaysOnErrorSampleRate 0.1` (only if `HIGH_VOLUME_REPLAY_ENABLED`), `environment` = `VITE_APP_ENV`, `release` = build SHA, `beforeSend` drops events from `qa_candidate`/`preview` and scrubs `password`, `token`, `authorization`, `apikey`, form values, and any audio/speech payload. Never capture recorded speech. Not wired this wave (no project exists) — `NOT_RUN`.

## Stripe — architecture validation (no live objects created)

`Customer → Subscription → Price → Webhook → Entitlement`:
- Webhook: signature verified (`constructEventAsync`), idempotent by `stripe_event_id`, ordered by `(event.created, event.id)`.
- Entitlement: server RPC `get_server_entitlement` is the only source; a Supabase outage keeps the session's last server answer instead of downgrading (RC2.3.4A fix).
- TEST vs LIVE: separate keys and price IDs per mode; never reuse IDs across modes. The connected account exposes only test mode with 0 products — live configuration is unverified (`stripe_live` stays false in `rc1-operational-checks.json`).

## TypeSafe / Jev — budget policy

- Pricing (public, Sept 2026): $0.042 / 1 M input tokens, output free; 1 200 req/min; no documented free allowance → **UNKNOWN_REQUIRES_ACCOUNT_VERIFICATION** for credits.
- Allowed now: DEV_AUDIT (admin "Triar com IA"). `JEV_RUNTIME_ENABLED=false` (learner runtime refused in `askJev`).
- Guardrails: 3 s timeout, circuit breaker (3 failures → 60 s), input-hash dedupe, reuse of identical already-triaged messages, batch ≤ 25, kill switch `JEV_DEV_AUDIT_ENABLED=false` (Edge env).
