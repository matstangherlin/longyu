# RC2.3.9 — Cloud Handoff to RC2.3.10

Machine-readable: [`../launch/rc2-3-10-cloud-handoff.json`](../launch/rc2-3-10-cloud-handoff.json) · dependencies: [`../release/external-dependencies.json`](../release/external-dependencies.json) · owner actions: [`../release/owner-actions.json`](../release/owner-actions.json)

Statuses: PASS · CODE_READY · ACCOUNT_VERIFIED · CONFIG_REQUIRED · OWNER_ACTION_REQUIRED · NOT_RUN · BLOCKED · PAID_PLAN_REQUIRED.

**Destructive actions in RC2.3.9: NONE.** This wave made no cloud reads or writes. Nothing was migrated, no provider was changed, nothing was paused, deleted or restored, no paid resource was created and no secret was written. The facts below come from the read-only checks in RC2.3.4A ([`../launch/rc2-3-4a-cloud-free-tier-audit.md`](../launch/rc2-3-4a-cloud-free-tier-audit.md)) and RC2.3.8 ([`rc2-3-8-auth-system-truth.md`](rc2-3-8-auth-system-truth.md)). Only the repo migration count and Edge Function count were recounted in this wave.

## Handoff items (16)

| # | Item | Current truth | Required action | Owner approval | Status |
|---|---|---|---|---|---|
| CH-01 | Migration history | Production had **35** `supabase_migrations` rows at the RC2.3.4A read. Their names and versions do not match the repo. Repo recount: **53** files (22 `NNN_` + 31 timestamped). The audit's figure of 52 predates `20261007120000_jev_feedback_triage.sql`. Whether the 35 rows include that migration was not re-read. | Owner decides (OA-MIGRATION-RECONCILIATION-DECISION). Recommended first step: a checked-in ledger mapping each production row to a repo file, plus a comparison gate (non-destructive). Any repair of the history table happens only after the export and the schema diff. | yes | **BLOCKED** |
| CH-02 | Schema diff | CI proves local == repo. Nobody has proven repo == production. | Owner runs a read-only, schema-only diff from their own machine (OA-SCHEMA-DIFF). The DB password never leaves that machine. | yes | NOT_RUN |
| CH-03 | Export / backup | The free plan has no backups and no PITR, and no export exists. | Owner-held export before every production migration (OA-DATA-EXPORT). | yes | OWNER_ACTION_REQUIRED |
| CH-04 | Telemetry retention | Raw telemetry is kept forever. Largest table: `beta_pedagogy_events` (1 851 rows). Projected to cross 500 MB near 1 000 MAU. | Owner approves a retention window (OA-TELEMETRY-RETENTION-DECISION). Then a job aggregates to daily metrics and deletes old raw rows. | yes | OWNER_ACTION_REQUIRED |
| CH-05 | Resend / domain | Free plan, 0 domains, 0 sent, not integrated. | Verify a sending domain (OA-RESEND-DOMAIN). | no | OWNER_ACTION_REQUIRED |
| CH-06 | Supabase SMTP | Auth uses the built-in mailer and has no custom SMTP. Whether the recovery template was applied is unconfirmed. | Put Resend SMTP credentials only into Supabase Auth, apply the template, then send test e-mails (OA-SUPABASE-SMTP, OA-AUTH-RECOVERY-TEMPLATE). | no | CONFIG_REQUIRED |
| CH-07 | Sentry | Org exists with 0 projects. There is no SDK, and CSP has no Sentry host. | Create the project (OA-SENTRY-PROJECT). Add the SDK, the CSP host and the DSN via build env in RC2.3.10. Verify one test error arrives. | no | CONFIG_REQUIRED |
| CH-08 | Auth providers | E-mail auth on. google/apple/azure off, anonymous off, autoconfirm off. Social code CODE_READY. Manual linking off. | Redirect allowlist, provider config, `VITE_AUTH_PROVIDERS`, linking decision and a real Android OAuth test (OA-AUTH-*). | yes | CONFIG_REQUIRED |
| CH-09 | RLS | The RLS negative matrix passes in CI on a local stack. Production RLS has not been independently certified. | After CH-02: run read-only security advisors and the RLS matrix against the reconciled schema. | no | CODE_READY |
| CH-10 | Edge Functions | Repo has 11 functions. Production had 8 at the last read. `triage-feedback` v1 in production predates the Jev guardrails. Invocation counts are UNKNOWN. | Reconcile the deployed list against the repo (read-only). Redeploy `triage-feedback` after merge and read usage. | yes | CODE_READY |
| CH-11 | Rate limits | Sign-up limits, abuse controls, Turnstile and anti-cheat are in code and pass local CI. Dashboard Auth rate limits have not been read. | Read the dashboard limits (no change). Include them in the cloud smoke. | no | CODE_READY |
| CH-12 | Security headers | `netlify.toml` sets CSP, X-Frame-Options DENY, nosniff, Referrer-Policy and Permissions-Policy. Preview header check PASS. No explicit HSTS. | Verify headers on production after the next `[release]` deploy and decide on HSTS. Add the Sentry host when CH-07 lands. | no | CODE_READY |
| CH-13 | Rollback | The policy is written. The rollback drill runbook has never been executed. | Run the drill once (OA-ROLLBACK-DRILL). | no | NOT_RUN |
| CH-14 | Cloud smoke | None exists. | Read-only RPC/health smoke plus one synthetic account after each `[release]` deploy. | no | NOT_RUN |
| CH-15 | Free-tier budget | DB 4 %, MAU < 0.1 %. Egress, Edge invocations and Netlify credits are UNKNOWN. | Owner reads them from the dashboards (OA-USAGE-READINGS). No upgrade. | no | OWNER_ACTION_REQUIRED |
| CH-16 | #273 | Option B was chosen in RC2.3.4A: one cloud project plus local Supabase/CI QA, no paid plan, sibling project untouched. Still blocked by CH-01 to CH-04. | Owner approves the runbook (OA-273-RUNBOOK-APPROVAL). Close #273 only when every row above is PASS. | yes | **BLOCKED** |

Summary: 2 BLOCKED · 4 OWNER_ACTION_REQUIRED · 3 CONFIG_REQUIRED · 3 NOT_RUN · 4 CODE_READY · 0 PASS. Seven items need explicit owner approval: CH-01, 02, 03, 04, 08, 10, 16.

Suggested order: CH-03 export → CH-02 diff → CH-01 reconciliation → CH-04 retention → CH-09/10 → CH-05/06 e-mail → CH-07 Sentry → CH-08 providers → CH-12/13/14 → CH-15 → CH-16 close #273.

## External dependencies

| Dependency | Purpose | Status | Tier | Secret required | Production dependency | Launch blocker | Owner action |
|---|---|---|---|---|---|---|---|
| Supabase (MandarimProject) | Auth, Postgres, Edge Functions, Vault | ACCOUNT_VERIFIED | free | yes | yes | **yes** (repo == prod not proven, no backups) | reconciliation, diff, export, redirects, retention, usage |
| Netlify | Web/PWA hosting | ACCOUNT_VERIFIED | free | no | yes | no | read credits; confirm `[release]` rule |
| Resend | Auth/transactional e-mail (planned SMTP) | CONFIG_REQUIRED | free | yes | no (not integrated) | **yes** | domain + Supabase SMTP |
| Sentry | Error monitoring (planned) | CONFIG_REQUIRED | free (plan unverified) | no (DSN is public; a source-map token would be a CI secret) | no | **yes** (RC2.3.10 certification) | create project |
| Cloudflare | Turnstile on sign-up; 0 Workers, R2 not enabled | ACCOUNT_VERIFIED | free | yes (Turnstile secret in Vault) | yes | no | none now |
| Google OAuth | Continuar com Google | CONFIG_REQUIRED | free | yes | no | no* | OAuth client → Supabase |
| Sign in with Apple | Continuar com Apple | CONFIG_REQUIRED | paid (Developer Program) | yes | no | no* | Services ID + key → Supabase |
| Microsoft Entra | Continuar com Microsoft | CONFIG_REQUIRED | free | yes | no | no* | app registration → Supabase |
| Google Play | Android distribution | OWNER_ACTION_REQUIRED | n/a | yes (upload key, owner-held) | yes | **yes** (never installed from Play) | identity, upload key, internal release |
| Stripe | Web checkout and webhook (test mode only, 0 products) | ACCOUNT_VERIFIED | n/a (per-transaction fees) | yes | no | no (only for a paid launch, RC2.3.11) | confirm account; no live products |
| TypeSafe / Jev | Feedback triage (server-side, live) + DEV_AUDIT; `JEV_RUNTIME_ENABLED=false` | CODE_READY | paid (usage-based) | yes (Vault) | no | no | check credits; redeploy `triage-feedback` |

\* Social providers become launch blockers only if the owner keeps social login in launch scope (ROADMAP RC2.3.12 lists it). E-mail is the working sign-in path today.

**Launch blockers: 4** — Supabase, Resend, Sentry, Google Play.

## Not done here

- No cloud verification. RC2.3.10 re-reads every "current truth" before acting.
- No secret is named by value anywhere. Only Vault/env secret names appear.
