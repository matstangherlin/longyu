# RC2.3.4A — Closure

Parent: [matstangherlin/longyu#314](https://github.com/matstangherlin/longyu/pull/314) @ `9819607ba90648ebd68fdaf757a84e360ad63b89` · Branch `claude/quirky-sagan-vzpuaa` · 2026-10-07

Allowed statuses: PASS · CODE_READY · ACCOUNT_VERIFIED · NOT_RUN · OWNER_ACTION_REQUIRED · BLOCKED · PAID_PLAN_REQUIRED.

| Area | Status | Evidence | Blocker | Next action |
|---|---|---|---|---|
| #314 CI | **CODE_READY** | F1 (stale RC1 fingerprint literal → typed chain, 8/8 mutations), F1b (missing Hànzì gate created), F2/F3 (capability mutations made exact, 19/19); all 34 post-failure gates pass locally; RC2.3.0–2.3.3 gates pass locally — [`rc2-3-4a-stack-truth.md`](rc2-3-4a-stack-truth.md) | hosted run on this PR's head not yet observed | push → watch "Portão de qualidade" + new `rc2-3-stack-gates` job |
| Hànzì eligibility | **PASS** | `HANZI_PEDAGOGICAL_ELIGIBILITY_PASS`: `validate:hanzi-writing-eligibility` (0 failures, 11 refs, 3 Journey writing steps all eligible) + 12/12 mutations; E2E 9/9 — [`rc2-3-4a-hanzi-eligibility.md`](rc2-3-4a-hanzi-eligibility.md) | — | owner sees the lock copy on device |
| Android build | **PASS** (parent) | "Android foundation" success on `9819607` (run 37098442288) | this PR's own run pending | observe Android workflow on PR head |
| APK | **NOT_RUN** | artifact `longyu-android-debug-0.2.0-beta.1-ff5ae88` exists (id 11264584668) — generated ≠ accepted | nobody installed it | owner installs the PR's APK |
| Physical Hànzì | **OWNER_ACTION_REQUIRED** | checklist in [`rc2-3-4a-hanzi-physical-acceptance.md`](rc2-3-4a-hanzi-physical-acceptance.md); CODE/WEB PASS, emulator generic only | real device | run the checklist, record device + APK id |
| #273 architecture | **CODE_READY** | Option B — single cloud project + local Supabase/CI QA; RLS/auth/Edge/idempotence already PASS in `backend-contract` CI — [`../launch/rc2-3-4a-cloud-free-tier-audit.md`](../launch/rc2-3-4a-cloud-free-tier-audit.md) | migration-history drift (35 prod rows vs 52 repo files), no backups on free | schema diff + export runbook (RC2.3.10) |
| Supabase | **ACCOUNT_VERIFIED** | org `Noba` plan free; DB 20.4 MB / 500 MB; 4 MAU; 0 storage; 2/2 projects | egress + Edge invocations not readable | owner reads Usage page into the registry |
| Netlify | **ACCOUNT_VERIFIED** | free team, 4 sites share 300 credits; `[release]`-only production deploys (`netlify.toml` `ignore`) | credits used: UNKNOWN | owner reads Team → Usage; merge = rule goes live |
| Cloudflare | **ACCOUNT_VERIFIED** | 0 Workers; R2 not enabled; Turnstile in use; media 8.5 MB → no R2 now | plan/DNS not readable via connector | none this wave |
| Resend | **OWNER_ACTION_REQUIRED** | free 100/day · 3 000/mo, 0 sent, **0 domains**, not integrated; Supabase Auth has no custom SMTP | real-launch auth mail depends on Supabase built-in mailer | verify a sending domain; set Resend as Supabase SMTP (RC2.3.10) |
| Sentry | **NOT_RUN** | org `noba-2r`, 0 projects, no SDK; sampling strategy written | no project/DSN | create project when RC2.3.10 starts |
| Stripe | **ACCOUNT_VERIFIED** | connected account test-mode only: 0 products, 0 webhooks; webhook signature + `stripe_event_id` idempotency + server entitlement verified in code; outage no longer downgrades entitlement | live mode not visible; account behind Edge `STRIPE_SECRET_KEY` unverified | RC2.3.11 (no live products created) |
| TypeSafe/Jev | **CODE_READY** | DEV_AUDIT only, `JEV_RUNTIME_ENABLED=false`, 3 s timeout, breaker, dedupe, kill switch; key only in Supabase Vault | credits/quota: UNKNOWN_REQUIRES_ACCOUNT_VERIFICATION; `typesafe.ai` unreachable from the audit container, no live call verified | owner checks console.typesafe.ai; redeploy `triage-feedback` after merge (prod v1 predates the guardrails) |
| Free-tier launch viability | **CODE_READY** | Option B: viable for closed beta (≈ ≤ 500–1 000 MAU) with telemetry retention + export + migration reconciliation; 5 000+ MAU needs paid tiers — decision deferred to RC2.3.10/11 | — | no upgrade now |

## Guarantees for this wave

- **No paid resources created.** No plan bought, no auto-recharge, no branch, no R2 enable, no Stripe live object.
- **No destructive cloud operation.** No project paused/deleted/restored; **`atomurus` untouched**.
- **No production migration during RC2.3.4A.** Earlier in this session (before this wave's rules) the additive `jev_feedback_triage` migration and the `triage-feedback` Edge Function v1 were applied, and the `TYPESAFE_API_KEY` Vault secret was stored.
- **No secret in repo, report or log.** The TypeSafe key is referenced only by its Vault name.
- **No gate weakened.** Every fix is causal and covered by mutations (`test:fingerprint-chain` 8/8, `test:hanzi-writing-eligibility` 12/12, `test:capability-runtime-evidence` 19/19, `test:free-tier-guardrails` 144 checks).

## Deliverables

[`rc2-3-4a-stack-truth.md`](rc2-3-4a-stack-truth.md) · [`.json`](rc2-3-4a-stack-truth.json) · [`rc2-3-4a-hanzi-eligibility.md`](rc2-3-4a-hanzi-eligibility.md) · [`rc2-3-4a-hanzi-physical-acceptance.md`](rc2-3-4a-hanzi-physical-acceptance.md) · [`../launch/rc2-3-4a-cloud-free-tier-audit.md`](../launch/rc2-3-4a-cloud-free-tier-audit.md) · [`../launch/platform-budget-registry.json`](../launch/platform-budget-registry.json) · [`../launch/platform-responsibility-map.md`](../launch/platform-responsibility-map.md) · [`../launch/free-tier-guardrails.md`](../launch/free-tier-guardrails.md) · [`../launch/ROADMAP.md`](../launch/ROADMAP.md)
