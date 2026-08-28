# V4.7.8B — MandarimProject pre-apply live state (read-only)

Captured **2026-08-28T05:14:56Z** via MCP `get_project`, `list_migrations`,
`list_edge_functions`, `list_tables`, `list_extensions`, `get_advisors`
(security + performance), and `execute_sql` (counts, objects, RLS, grants,
WAL). Project: MandarimProject `drjcfalvlbbeblmmyhwj`. **Zero writes.**
No emails, JWTs, service-role secrets, or row payloads in this file.

This file replaces any assumption that the V4.7.8 snapshot
(`docs/reports/v478-predeployment-snapshot.md`, 2026-08-28T03:22Z) is still
current. Counts and watermark **match** that snapshot; the capture is still
independent.

Refresh **2026-08-28T11:00:47Z** (read-only): counts, watermark, remote
migration count, and missing objects **unchanged**. Backup record now
`PASS_WITH_MANUAL_LOGICAL_BACKUP`. `BACKUP_STILL_VALID=PASS`.

## 0 — origin/main identity (recalculated)

| Campo | Valor |
| --- | --- |
| expected MAIN_SHA (remessa) | `3223d4379b5ab4af118a8d88773186e965c504b5` |
| `origin/main` after `git fetch` | `3223d4379b5ab4af118a8d88773186e965c504b5` |
| match | **yes** — freeze hashes from `v4.7.8-rc.1` reused, not reinvented |
| `LONGYU_BACKEND_RC` | `v4.7.8-rc.1` |
| product `LONGYU_RC_VERSION` | `v4.7.4-rc.1` (unchanged) |
| Placement | v2 |
| journey fingerprint | `fb7ac3c5d18a` |
| migration chain sha256 | `813306e1cc6954a5f146ebfb15f82db978ace322ba0ce20e424b3cace8c81c72` |
| migration manifest sha256 | `ee034b085e6483328a279034212dc598c7fa2d95ad478620ec33c90dcf0ff938` |
| RPC contract sha256 | `7d5415a63bbbf1e2b1be16be47844f3928f9be6365ea217ba7c1bd23953d7650` |
| Edge contract sha256 | `8c1965106ffaafbe61b1e20a2a6f9c1b9c365ff08b9410e26cb4b996e5e26c5d` |
| grant surface sha256 | `80aa874369b6201a05ec6f522bc14e338e4e628633e2a9c9899d968810ba7960` |
| canonical schema hash | `NOT_RUN` (filled only by ephemeral `rehearse:backend-contract`) |

## Project health

| Campo | Valor |
| --- | --- |
| name | MandarimProject |
| status | ACTIVE_HEALTHY |
| region | us-west-2 |
| postgres | 17.6.1.155 |
| host | db.drjcfalvlbbeblmmyhwj.supabase.co |
| created_at | 2026-07-08T01:19:14Z |

## Migration history / watermark

Remote migrations: **34**. Watermark:

| version | name |
| --- | --- |
| `20260810175737` | `beta_experience_telemetry` |

Drift vs repo (48 local files): LOCAL_AND_REMOTE **26**, REMOTE_ONLY **8**,
LOCAL_ONLY **22**. Remote-only timestamps stay classified in
`V477_REMOTE_ONLY_CLASS`. **Do not** add empty SQL files named after those
versions (GitHub Supabase Preview fail-closed is expected).

LOCAL_ONLY `NOT_YET_DEPLOYED` (apply chain) is listed in
`docs/reports/v478b-pending-delta.md`. The older
`V476_OPERATIONAL_MIGRATIONS` list is a **subset** (7 files) and must not be
used as the V4.7.8B apply order.

## Exact counts (no PII)

| table | count |
| --- | ---: |
| profiles | 11 |
| user_progress | 10 |
| user_economy | 9 |
| subscriptions | 1 |
| user_srs | 0 |
| transactions | 0 |

`list_tables` MCP often reports 0 rows under RLS; counts above are from
`execute_sql`. Eleven real profiles exist. Apply must treat this as live
learner data.

## Schema vs `v4.7.8-rc.1` (absent on hosted)

| class | names |
| --- | --- |
| tables | `placement_attempts`, `placement_onboarding_drafts`, `business_leads`, `pearl_milestone_catalog`, `organizations`, `organization_members` |
| profiles columns | `country_code`, `interface_locale`, `instruction_locale` |
| user_economy columns | `pearl_ledger` (**column**, not a table) |
| RPCs | `commit_placement_result`, `save_placement_onboarding_draft`, `merge_progress_mastery_monotonic`, `claim_pearl_milestone` |
| trigger | `trg_progress_mastery_monotonic` **absent** |

Present RPCs (sample): `ensure_own_profile`, `grant_lesson_reward`,
`submit_beta_pedagogy_event`, `_edge_get_turnstile_secret`.

RLS **on** for existing user-owned tables: profiles, user_progress, user_srs,
user_economy, subscriptions, transactions.

## Grants (live)

anon still has ALL (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) on
profiles, user_progress, user_srs, subscriptions, transactions, user_economy.

authenticated still has DELETE/TRUNCATE on profiles, user_progress, user_srs,
subscriptions, transactions. user_economy authenticated is SELECT +
REFERENCES/TRIGGER/TRUNCATE (writes already closed except TRUNCATE leftover).

service_role still has ALL on those tables (platform default).

## Edge Functions (hosted)

| slug | status | version | verify_jwt | class vs repo |
| --- | --- | ---: | --- | --- |
| create-checkout-session | ACTIVE | 10 | true | OUTDATED (source identity not compared; present) |
| create-billing-portal | ACTIVE | 9 | true | OUTDATED (source identity not compared; present) |
| stripe-webhook | ACTIVE | 11 | false | OUTDATED (source identity not compared; present) |
| delete-account | ACTIVE | 10 | true | OUTDATED (source identity not compared; present) |
| create-account | ACTIVE | 8 | false | OUTDATED (source identity not compared; present) |
| issue-anon-ingestion-session | ACTIVE | 3 | false | OUTDATED (source identity not compared; present) |
| commit-placement | — | — | true (repo) | **MISSING** |
| finalize-onboarding | — | — | true (repo) | **MISSING** |
| submit-business-lead | — | — | false (repo) | **MISSING** |

Canonical list: `LONGYU_EDGE_FUNCTIONS` in `scripts/lib/edge-functions.mjs`.

## Secrets (presence only, names, no values)

Read 2026-08-28T05:39Z: `SELECT name FROM vault.secrets` (no secret payloads).

| name | in `vault.secrets` |
| --- | --- |
| `TURNSTILE_SECRET_KEY` | present |
| `STRIPE_SECRET_KEY` | **not** in this table |
| `STRIPE_WEBHOOK_SECRET` | **not** in this table |

Service-role keys are platform credentials, not vault rows. Stripe may live
in Edge Function secrets (no names-only MCP in this session). Do not treat
this as `HOSTED_SECURITY_READY`. Do not print values.

## Advisors (pre-apply, this capture)

| type | ERROR | WARN | INFO |
| --- | ---: | ---: | ---: |
| security | 0 | 44 | 13 |
| performance | 0 | 24 | 37 |

Same ERROR/WARN/INFO totals as V4.7.8. No new ERROR in this refresh.

## WAL / archive (not a PITR confirmation)

| setting | value |
| --- | --- |
| wal_level | logical |
| archive_mode | on |
| archive_command | present (wal-push) |

WAL archive **on** is not a confirmed PITR window or backup id. MandarimProject
is on **FREE**; the V4.7.8B recovery path is a **manual logical dump** (see
`docs/reports/v478b-backup-record.md`). That dump is **not** PITR. RPO is the
dump `created_at`. Paid upgrade is not required to finish this remessa.

## Installed extensions (subset)

pgcrypto, supabase_vault, pg_cron, uuid-ossp, plpgsql, pg_stat_statements.

## Production frontend flag

`netlify.toml` `[context.production.environment]` keeps
`VITE_CLOUD_ONBOARDING_V2_ENABLED = "false"`. This remessa must not flip it.
