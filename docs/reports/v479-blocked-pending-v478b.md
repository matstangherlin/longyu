# V4.7.9 — not started (blocked on V4.7.8B / #208)

Requested 2026-08-28T05:30Z. **Not started.** No `LONGYU_CLOSED_BETA_RC`, no
physical-QA scoreboard PASS, no Stripe Test execution, no V4.7.9 PR.

V4.7.9 may begin only after #208 hosted keys are all **PASS**:

| Key | Current |
| --- | --- |
| `MANDARINPROJECT_SCHEMA_READY` | `NOT_RUN` |
| `MANDARINPROJECT_GRANTS_READY` | `NOT_RUN` |
| `MANDARINPROJECT_RLS_READY` | `NOT_RUN` |
| `MANDARINPROJECT_EDGE_READY` | `NOT_RUN` |
| `HOSTED_AUTH_READY` | `NOT_RUN` |
| `HOSTED_PLACEMENT_READY` | `NOT_RUN` |
| `HOSTED_SYNC_READY` | `NOT_RUN` |
| `HOSTED_RECOVERY_READY` | `NOT_RUN` |
| `HOSTED_SECURITY_READY` | `NOT_RUN` |

Also still blocking FASE B of #208:

- no `APPROVE_MANDARINPROJECT_BACKEND_UPGRADE`
- `BLOCKED_BACKUP_NOT_CONFIRMED`
- Firefox/WebKit on MAIN_SHA `3223d43` **IN_PROGRESS**

Continue https://github.com/matstangherlin/longyu/pull/208.
