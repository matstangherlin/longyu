# V4.7.8B FASE B — live evidence (READY_FOR_HUMAN_APPLY_APPROVAL, pre-flight STOP)

Captured **2026-08-28T11:00:47Z**. This remessa is **not**
`APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`. Production writes: **ZERO**.
Hosted scoreboard keys stay `NOT_RUN`. No inferred hosted PASS.

| Campo | Valor |
| --- | --- |
| MAIN_SHA | `3223d4379b5ab4af118a8d88773186e965c504b5` |
| PR | #208 |
| PR_HEAD_SHA | `1e3622cd1bfe69491b9219f8e75adf44584812d1` |
| LONGYU_BACKEND_RC | `v4.7.8-rc.1` |
| journey fingerprint | `fb7ac3c5d18a` |
| migration chain sha256 | `813306e1cc6954a5f146ebfb15f82db978ace322ba0ce20e424b3cace8c81c72` |
| migration manifest sha256 | `ee034b085e6483328a279034212dc598c7fa2d95ad478620ec33c90dcf0ff938` |
| RPC contract sha256 | `7d5415a63bbbf1e2b1be16be47844f3928f9be6365ea217ba7c1bd23953d7650` |
| Edge contract sha256 | `8c1965106ffaafbe61b1e20a2a6f9c1b9c365ff08b9410e26cb4b996e5e26c5d` |
| grant surface sha256 | `80aa874369b6201a05ec6f522bc14e338e4e628633e2a9c9899d968810ba7960` |
| canonical schema hash | `NOT_RUN` |
| pre-watermark | `20260810175737` `beta_experience_telemetry` |
| post-watermark | **not applied** |
| pending migrations | **11** (unchanged vs runbook) |
| pending match | yes |
| project health | ACTIVE_HEALTHY |
| profiles / progress / srs / economy / subscriptions / transactions | 11 / 10 / 0 / 9 / 1 / 0 |
| `placement_attempts` | absent |
| Edges missing | `commit-placement`, `finalize-onboarding`, `submit-business-lead` |
| MAIN_SHA Firefox | **PASS** (run 33143685565) |
| #208 Portão | **PASS** (run 33147329539) |
| #208 Chromium | **PASS** |
| #208 Firefox | **PASS** (cross-engine job) |
| #208 Security / CodeQL | **PASS** (run 33147329547) |
| `CI_HEAD_READY` | **PASS** |
| backup type | `MANUAL_LOGICAL` (not PITR; RPO = dump date 2026-08-28) |
| `MANUAL_LOGICAL_BACKUP_CREATED` | **PASS** |
| `MANUAL_LOGICAL_BACKUP_VERIFIED` | **PASS** |
| `BACKUP_RECOVERY_GATE` | `PASS_WITH_MANUAL_LOGICAL_BACKUP` |
| `AUTH_RECOVERY` | `OUT_OF_SCOPE_THIS_MIGRATION` |
| `BACKUP_STILL_VALID` | **PASS** |
| `PRODUCTION_DELTA_REFRESHED` | **PASS** |
| wal_level / archive_mode | logical / on |
| approval token | **absent** (this prompt forbids inference) |
| deploy lock | `DECLARED_NOT_ARMED` |
| remessa status | `READY_FOR_HUMAN_APPLY_APPROVAL` |
| public onboarding flag | `false` |
| V4.7.9 | not started |

## Outcomes (live hosted)

| Campo | Valor |
| --- | --- |
| migration outcome | NOT_RUN |
| Edge outcome | NOT_RUN |
| Auth outcome | NOT_RUN |
| Placement outcome | NOT_RUN |
| Sync outcome | NOT_RUN |
| Recovery outcome | NOT_RUN |
| Security outcome (post-upgrade advisors) | NOT_RUN |
| QA IDs | none created |

## Why FASE B did not apply

1. APPROVAL-005: this prompt is not the token.
2. Backup is ready (`PASS_WITH_MANUAL_LOGICAL_BACKUP`; not PITR).
3. CI on `1e3622c` is terminal green. Still **STOP** until
   `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.

A **later** message must contain exactly `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`.
Then apply one-by-one per `docs/reports/v478b-fase-b-runbook.md`.
