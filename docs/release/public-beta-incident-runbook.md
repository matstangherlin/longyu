# Public Beta — Incident Response Runbook

**Scope:** small public beta — not a corporate on-call org chart.  
**LEGAL_REVIEW_RECOMMENDED** for privacy/terms claims lives in docs, not end-user UI.

## Severities

| Sev | Meaning | Examples |
| --- | --- | --- |
| **SEV0** | Security / cross-account data | Data leak, auth bypass, cross-account progress |
| **SEV1** | Login impossible / progress loss / app unavailable | Auth down, sync wipe, blank app, widespread 5xx |
| **SEV2** | Major feature degraded | Feedback submit failing, review broken, Culture hub down |
| **SEV3** | Minor / polish | Copy, layout, non-blocking UX |

## Actions (SEV0 / SEV1)

1. **Freeze deployment** — stop promoting new builds.
2. **Capture SHA** — `git rev-parse HEAD` / Netlify deploy SHA / `version.json`.
3. **Disable affected public surface** if a feature flag exists (do not invent new flags mid-incident).
4. **Rollback** when appropriate (Netlify previous deploy / known-good candidate).
5. **Preserve evidence** — Netlify logs, Supabase logs, feedback rows, client diagnostics reports, ops correlation IDs.
6. **Communicate** via canonical channel `beta@longyu.app` responses / in-app notice if needed.

SEV2/SEV3: triage in feedback + bug log; no deployment freeze unless spreading.

## Signals → inspect

See [`public-beta-observability-map.md`](./public-beta-observability-map.md).

## After restore

- Confirm formal checks before claiming GO (cloud/device/PWA/rollback still gated separately).
- Do **not** mark `cloud_*` PASS from production evidence.
- File follow-ups in `docs/BETA_BUG_LOG.md` with severity P0–P3.
