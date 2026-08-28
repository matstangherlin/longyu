# V4.7.8B FASE B — live evidence (pre-flight STOP)

Captured **2026-08-28T05:45:10Z**. This FASE B prompt is **not**
`APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`. Production writes: **ZERO**.
Hosted scoreboard keys stay `NOT_RUN`. No inferred PASS from ephemeral CI.

| Campo | Valor |
| --- | --- |
| MAIN_SHA | `3223d4379b5ab4af118a8d88773186e965c504b5` |
| PR | #208 |
| PR_HEAD_SHA | `3587fd06a559a1fad8dffaf6be1af05c6340b40b` |
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
| profiles / progress / economy / subscriptions | 11 / 10 / 9 / 1 |
| `placement_attempts` | absent |
| Edges missing | `commit-placement`, `finalize-onboarding`, `submit-business-lead` |
| MAIN_SHA Firefox | **PASS** (run 33143685565) |
| #208 Portão | **IN_PROGRESS** |
| backup/PITR available | **not confirmed** (`BLOCKED_BACKUP_NOT_CONFIRMED`) |
| wal_level / archive_mode | logical / on |
| archiver failed_count | 0 |
| approval token | **absent** (this prompt forbids inference) |
| deploy lock | `DECLARED_NOT_ARMED` |
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
2. BACKUP-004: MCP has no Backups API; WAL archive on is not a PITR id.
3. PRE-003: #208 HEAD Portão still IN_PROGRESS at capture.

Next human message must contain exactly `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`
and a Dashboard PITR/backup confirmation. Then apply one-by-one per
`docs/reports/v478b-fase-b-runbook.md`.
