# Longyu — Launch Roadmap (rebased in RC2.3.4A, 2026-10-07)

Goal: **launch**. Each wave closes something a learner or the owner can see; no open-ended lab work on the critical path.
Status vocabulary: PASS · CODE_READY · ACCOUNT_VERIFIED · NOT_RUN · OWNER_ACTION_REQUIRED · BLOCKED · PAID_PLAN_REQUIRED.

## Critical path

| Wave | Scope | Exit criteria |
|---|---|---|
| **RC2.3.4A — now** | Hànzì truth (eligibility contract) · CI / release truth (fingerprint chain) · #273 free-tier audit · platform budget registry · cost guardrails | [`rc2-3-4a-closure.md`](../reports/rc2-3-4a-closure.md) |
| RC2.3.5 | Speech & Contrast Training: tone contrasts, minimal pairs, record → playback → compare, ASR non-blocking, speech evidence | owner audio acceptance on device |
| RC2.3.6 | Personal Mastery: Learner Evidence Record, Knowledge Graph *foundation* (data model only) | evidence record feeds review, no new UI system |
| RC2.3.7 | Sensory & Guidance Polish — perceptible product only, no new architecture | owner UX pass |
| RC2.3.8 | Account Access & Identity: Google, Sign in with Apple, Microsoft, existing email; identity linking, local-progress claim, recovery, logout, deep links, Capacitor callback | real-device sign-in for each provider |
| RC2.3.9 | Stack Convergence: consolidate waves, remove duplicated historical gates, Product Truth Manifest | one manifest, CI time ≤ today |
| **RC2.3.10** | **Cloud Launch Certification** — #273 stops being a blocker. Architecture chosen in RC2.3.4A (Option B). Certify Supabase, Netlify, Cloudflare, Resend, Sentry; real auth, real sync, production build, rollback, backup/export, domain, email deliverability, rate limits, security headers, RLS, Edge Functions, cloud smoke | every row PASS with evidence, still free-tier where technically safe |
| **RC2.3.11** | **Monetization, Entitlements & Final Pricing** (see below) | pricing decision + Play compliance decision |
| RC2.3.12 | Release Candidate / Pre-launch Ops: full device QA, new/returning, free/paid, offline, bad network, payment, restore entitlement, recovery, social login, email delivery, monitoring, rate limits, Play listing, privacy, terms, support, delete account, data export, crash-free sessions, performance | RC checklist PASS |
| RC2.3.13 | Closed Beta (small real group): activation, lesson completion, D1/D7, weak points, crashes, speech failures, cost/user, email volume, support load | beta report |
| RC2.3.14 | Launch Candidate — beta blockers only, no large features | GO from owner |
| **LAUNCH** | only after RC2.3.14 | |

## RC2.3.10 status (2026-10-08, PR #322)

Measured, not assumed: production `MandarimProject` read-only via MCP. `cloud.certification = BLOCKED` — see [`rc2-3-10-closure.md`](../reports/rc2-3-10-closure.md) and `docs/release/rc2-3-10-cloud-matrix.json`. Production history now has **36** rows vs **56** repo files (19 content `MATCH`); social/family/business/pearl backends the client calls are absent in production. **#273** stays a governance/history record (its org preview project is INACTIVE and untouched); it closes only when every RC2.3.10 gate is PASS with evidence.

## RC2.3.4A → RC2.3.10 hand-off (from the free-tier audit)

Before the first controlled production migration: migration-history reconciliation (prod has 35 differently-named rows vs 52 repo files), read-only schema diff, owner-held export (free plan has no backups), telemetry retention (30-day raw → daily aggregates), Resend domain + Supabase custom SMTP, Sentry project + DSN with the sampling in `platform-responsibility-map.md`.

## RC2.3.11 — monetization truth (decide nothing in advance)

- **Market research (current, cited):** HelloChinese, SuperChinese, Du Chinese, Skritter and other relevant competitors — monthly, annual, lifetime, trial, regional (BR) prices, feature restrictions.
- **Unit economics:** Stripe fees, Google Play fees, possible future Apple fees, tax assumptions, infrastructure/user (from `platform-budget-registry.json`), AI/user (Jev is $0 at runtime while `JEV_RUNTIME_ENABLED=false`), email/user, support/user → FREE USER COST, PAID USER COST, GROSS MARGIN.
- **Plans:** re-evaluate FREE / PRO / FAMILY / BUSINESS. Per feature: cost? acquisition? retention? moat? premium?
- **Do not paywall basic learning destructively.** Free must let a learner genuinely experience the method; premium sells depth, adaptation, scale, convenience, advanced modes.
- **Stripe (web):** separate Products / Prices / Entitlements; one canonical pricing catalog — no prices in components.
- **Android:** before any Stripe checkout inside the APK, audit the *current* Google Play policy for digital educational subscriptions in Brazil (Play Billing, alternative billing, user choice billing, external purchase links, fees) and record a compliance decision. Technically working ≠ allowed.

## Innovation track — does NOT block launch

Limited budget, in parallel:
- **LAB-A Jev Semantic Quality** — offline/dev-only first: ambiguity, naturalness, answer leaks, intent fit, culture risk. Uses the DEV_AUDIT path and its guardrails; never learner runtime before launch.
- After launch / when safe: RC2.4.0 Knowledge Graph · RC2.4.1 Adaptive Mastery · RC2.4.2 Adaptive Remediation · RC2.4.3 Invisible Personalization · RC2.4.4 Adaptive Challenges · RC2.4.5 Learning Passport.

These must not delay the first launch.
