# RC2.3.4A — #273 reopened as a FREE-TIER-FIRST cloud launch audit

Audit date: 2026-10-07 · Machine-readable companion: [`platform-budget-registry.json`](platform-budget-registry.json)
Historical #273 evidence: [`docs/reports/rc2-2-1-cloud-certification.md`](../reports/rc2-2-1-cloud-certification.md) (kept unchanged; an addendum points here).

**Nothing was bought, upgraded, restored, paused, deleted or migrated.** All provider reads were read-only.
`atomurus` was not touched. No production migration was executed in this wave.

## 1. Why #273 stopped (re-validated today, not copied from September)

| Fact (Sept 2026, #273) | Re-checked 2026-10-07 through the connected Supabase integration |
|---|---|
| Free plan, 2/2 active projects | **Still true** — org `Noba` `plan=free`; `MandarimProject` + `atomurus` ACTIVE_HEALTHY |
| `longyu-preview` (`wpnm…wrjp`) INACTIVE, restore blocked | **Still true** — status `INACTIVE`; restoring needs a free slot |
| Branching requires Pro | Not re-attempted (would be a paid-resource probe) — `NOT_RUN_REQUIRES_OWNER_APPROVAL` |
| Netlify candidate access missing | **Now available** — Netlify connector reads the team and the Longyu site |

So #273's blocker was never technical. It was: *"the only way to get a cloud QA database is to free a slot (pause/delete atomurus) or pay"*. The owner has authorised neither, and asked whether a cloud QA project is needed at all.

## 2. Proposed architecture — no paid cloud QA

```text
LOCAL DEVELOPMENT ──► LOCAL SUPABASE (supabase start, Docker)
        │                     │  all repo migrations applied from zero
        ▼                     ▼
   unit / gates        MIGRATION + CONTRACT REHEARSAL  (backend-contract.yml, already in CI)
        │                     │  RLS negative matrix · auth · recovery · Edge Functions
        ▼                     ▼  multi-device sync · economy/mastery concurrency
       CI  ◄──────────────────┘
        │
        ▼
 RELEASE CANDIDATE  (commit marked [release]; Netlify publishes only then)
        │
        ▼
 CONTROLLED PRODUCTION MIGRATION  (owner-run, after export + schema diff)
        │
        ▼
 POST-DEPLOY SMOKE  (read-only + synthetic test account, never real users)
```

### What already exists and is proven in CI (evidence)

| Requirement | Status | Evidence |
|---|---|---|
| Migrations apply from scratch locally | **PASS (CI)** | `backend-contract.yml` → `supabase start`; job "Ephemeral backend contract" SUCCESS on #314 head `9819607` (run 37098442290) |
| RLS tests | **PASS (CI)** | `scripts/rehearse-backend-contract.mjs` → `runRlsNegativeMatrix` |
| Auth tests | **PASS (CI)** | `runLocalAuthFlow`, `runPasswordRecoveryFlow` |
| Edge Function tests | **PASS (CI)** | `runCreateAccountEdge`, `runOnboardingEdgeFlow` (local Edge runtime, skip-captcha only in the ephemeral stack) |
| Idempotence / concurrency | **PASS (CI)** | `runConcurrentMastery`, `runEconomyConcurrency`, `runMonotonicityMatrix`; Stripe webhook idempotent by `stripe_event_id` |
| Zero pollution of real users | **PASS (design)** | rehearsal "Never links MandarimProject" (script header); production ref is refused by `validate:rc2-candidate-infra` (`PRODUCTION_REF`) |

### What is missing before this architecture can replace cloud QA

| Gap | Why it matters | Proposed fix (next wave, free) | Status |
|---|---|---|---|
| **Migration history drift** | Production has 35 rows in `supabase_migrations` whose names/versions do not match the 52 files in `supabase/migrations/` (many were applied through the dashboard/MCP under new names). Local == repo is proven; repo == production is **not**. | Owner-run `supabase db diff --linked` (read-only schema diff) and a reconciliation migration-history map; gate that compares `list_migrations` names against a checked-in ledger | **BLOCKED until reconciled** |
| Schema diff prod ↔ local | Without it a "tested" migration can still hit a different schema | Same as above; diff artifact attached to every release candidate | NOT_RUN |
| Backup / export | Free plan has **no backups / PITR** | Scheduled `pg_dump --schema-only` + data export of `user_progress`, `subscriptions`, `economy_ledger` to a private GitHub Actions artifact or owner storage before each production migration (owner holds the DB password; never in repo) | NOT_RUN — `OWNER_ACTION_REQUIRED` |
| Rollback strategy | Migrations are forward-only today | Each production migration ships with a reviewed down-script or an explicit "irreversible — restore from export" note; additive-only migrations preferred during beta | CODE_READY (policy), NOT_RUN |
| Post-deploy smoke | No cloud smoke today | Read-only RPC/health checks + one synthetic account, run after a `[release]` deploy | NOT_RUN |

**No production migration was run to demonstrate this flow** (owner rule). The RC2.3.4A Jev migration earlier in this session was applied before this wave's rules and is additive (new function + nullable columns); it is listed in the closure report.

## 3. Current usage (account reads, 2026-10-07)

| Supabase `MandarimProject` | Value | vs free limit |
|---|---|---|
| Database size | 20.4 MB | 500 MB → **4 % GREEN** |
| Auth users / MAU (30 d) / signups (30 d) | 15 / 4 / 2 | 50 000 MAU → GREEN |
| File storage / buckets | 0 B / 0 | 1 GB → GREEN |
| Realtime published tables | 0 | Realtime not used |
| Edge Functions deployed | 8 | invocations: **UNKNOWN** (not exposed) |
| Egress | **UNKNOWN** (dashboard only) | 5 GB |
| Active projects | 2 / 2 | **EXHAUSTED** |

Largest tables: `beta_pedagogy_events` 1 851 rows / 3.0 MB; `user_progress` 14 rows / 1.3 MB (avg row 19 KB compressed, max 66 KB).

## 4. Projection model (assumptions are explicit — no false precision)

Assumptions (A1–A7), measured where possible:

- A1 `user_progress`: one row per account, ≤ 66 KB (today's max), accounts ≈ 2 × MAU.
- A2 pedagogy telemetry: testers produce ~240 events/actor/month (measured); assume **120/MAU/month** for real learners, 418 B/event (measured), ×2 for indexes.
- A3 sync egress ≈ **3 MB/MAU/month** (≈30 sessions × pull+push of a ~30 KB compressed blob + entitlement/league RPCs). Unmeasured — the largest uncertainty.
- A4 Edge invocations ≈ 5/MAU/month (create-account, anon ingestion session, occasional checkout).
- A5 Web share 60 %; first load ≈ 3 MB (2.7 MB main chunk), then ≈ 1 MB/month with PWA caching; Android users load from the APK.
- A6 Netlify: 4 `[release]` production deploys/month (60 credits); credit pool shared with two other sites (their usage UNKNOWN).
- A7 6-month horizon for DB size; raw telemetry kept forever (today's behaviour).

| MAU | DB after 6 mo (A1+A2+A7) | Sync egress / mo (A3) | Edge inv. / mo | Auth MAU | Netlify credits / mo (A5+A6) | Verdict |
|---|---|---|---|---|---|---|
| 100 | ≈ 0.09 GB (18 %) | ≈ 0.3 GB (6 %) | 500 | GREEN | ≈ 65 (22 %) | GREEN |
| 500 | ≈ 0.39 GB (**77 % WARN**) | ≈ 1.5 GB (30 %) | 2 500 | GREEN | ≈ 85 (28 %) | WARN on DB |
| 1 000 | ≈ 0.75 GB (**EXCEEDS**) | ≈ 3 GB (60 %) | 5 000 | GREEN | ≈ 110 (37 %) | DB over unless telemetry retention |
| 5 000 | ≈ 3.6 GB (**EXCEEDS**) | ≈ 15 GB (**EXCEEDS**) | 25 000 | GREEN | ≈ 300 (**EXHAUSTED**) | Paid tiers needed |
| 10 000 | ≈ 7 GB (**EXCEEDS**) | ≈ 30 GB (**EXCEEDS**) | 50 000 | GREEN | > 300 | Paid tiers needed |

With **30-day raw-telemetry retention** (aggregate to the existing daily metrics, delete raw): 1 000 MAU → ≈ 0.25 GB (50 %), 5 000 MAU → ≈ 1.2 GB (still over).
Storage and Realtime stay at 0 (not used). Auth MAU is never the binding constraint below 50 000.

## 5. Decision for #273

### **OPTION B — FREE_TIER_VIABLE_WITH_ARCHITECTURAL_CHANGES**

- A single cloud project (`MandarimProject`) + local Supabase/CI as QA is **viable for closed beta (≈ ≤ 500–1 000 MAU)** without buying anything and without touching `atomurus`.
- It is **not** Option A because three things must change first: (1) migration-history reconciliation + schema diff, (2) an owner-held export before every production migration (free plan has no backups), (3) telemetry retention / progress-sync egress control — otherwise the DB crosses 500 MB around 1 000 MAU.
- It is **not** Option C because nothing in the closed-beta range requires a paid plan; the binding constraints at 5 000+ MAU (egress, DB, Netlify credits) are a **public-launch** decision (RC2.3.10/RC2.3.11), not a beta blocker.

**No upgrade now.** Any paid step stays `NOT_RUN_REQUIRES_OWNER_APPROVAL`.

## 6. Owner actions (none required for this PR to be reviewed)

1. Read Supabase **Usage** (egress, Edge invocations) and Netlify **Team → Usage** (credits) — the two numbers the connectors cannot see — and paste them into the registry.
2. Decide whether the Netlify `[release]` rule should go live as merged (it does on merge).
3. Approve the schema-diff + export runbook for the first controlled production migration (RC2.3.10).
