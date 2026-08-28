# V4.7.8 — MandarimProject pre-deployment snapshot (read-only)

Captured **2026-08-28T03:22:00Z** via MCP `get_project`, `list_migrations`,
`list_edge_functions`, `get_advisors` (security), and `execute_sql` counts.
Project: MandarimProject `drjcfalvlbbeblmmyhwj`. **Zero writes.** No emails,
tokens, or row payloads in this file.

| Campo | Valor |
| --- | --- |
| status | ACTIVE_HEALTHY |
| region | us-west-2 |
| postgres | 17.6.1.155 |
| host | db.drjcfalvlbbeblmmyhwj.supabase.co |
| remote migrations | 34 |
| watermark version | 20260810175737 |
| watermark name | beta_experience_telemetry |
| V4.7.7 parent | 1823d7d6a96c021eb7a55a5c94cf480ce4590a1d |
| origin/main at freeze | 0f2dfe453a10902449adaa262748d368839dce3a |

## Exact counts (no PII)

| table | count |
| --- | ---: |
| profiles | 11 |
| user_progress | 10 |
| user_economy | 9 |
| subscriptions | 1 |

Eleven real profiles exist. Any apply must treat this as live learner data,
not an empty project.

## Missing vs repo (read-only)

| class | names |
| --- | --- |
| tables | placement_attempts, placement_onboarding_drafts, business_leads, pearl_milestone_catalog, organizations, organization_members |
| profiles columns | country_code, interface_locale, instruction_locale |
| user_economy columns | pearl_ledger |
| RPCs | commit_placement_result, save_placement_onboarding_draft, merge_progress_mastery_monotonic, claim_pearl_milestone |
| trigger trg_progress_mastery_monotonic | false |
| Edge missing | commit-placement, finalize-onboarding, submit-business-lead |

`pearl_ledger` is a **column** on `user_economy`, not a table.

Present RPCs (sample): `ensure_own_profile`, `grant_lesson_reward`.
RLS disabled on listed public tables: none in this capture.

## Edges present (ACTIVE)

| slug | version | verify_jwt |
| --- | ---: | --- |
| create-checkout-session | 10 | true |
| create-billing-portal | 9 | true |
| stripe-webhook | 11 | false |
| delete-account | 10 | true |
| create-account | 8 | false |
| issue-anon-ingestion-session | 3 | false |

## Grants (anon / authenticated on user-owned tables)

anon still has ALL (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) on
profiles, user_progress, user_srs, subscriptions, transactions, user_economy.

authenticated still has DELETE/TRUNCATE on profiles, user_progress, user_srs,
subscriptions, transactions. user_economy authenticated is SELECT +
REFERENCES/TRIGGER/TRUNCATE (writes already closed except TRUNCATE leftover).

Planned (not applied): no anon table DML; authenticated SELECT/INSERT/UPDATE on
profiles/progress/srs; SELECT-only on subscriptions/transactions; economy writes
stay RPC-only.

## Advisors (pre-upgrade)

| type | ERROR | WARN | INFO |
| --- | ---: | ---: | ---: |
| security | 0 | 44 | 13 |

Performance advisors were previously 0 ERROR / 24 WARN / 37 INFO (V4.7.7
capture). HOST-031 later: no **new ERROR** after upgrade. This remessa did not
apply, so that check is NOT_RUN.

## Object hashes (repo, not production dump)

See `docs/backend/v478-backend-rc.json` after `npm run generate:backend-contracts`:
migration chain sha256, manifest/rpc/edge/grant hashes, journey fingerprint.
Canonical schema hash remains `NOT_RUN` until ephemeral CI.

Refresh this snapshot immediately before any future write. Do not treat this
file as a backup.
