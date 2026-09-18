# Public Beta — Observability Map

**No automatic Sentry (or other heavy APM) in this remessa.** Reuse what exists.

| Signal | Where to inspect |
| --- | --- |
| Client runtime errors | User feedback + `clientDiagnostics` (sessionStorage → only if user includes technical context) |
| Blank / crash UI | `ErrorBoundary` paths (Retry / Report / Journey / Reload) — no stack in production UI |
| Feedback delivery | Supabase feedback RPC / table · local feedback queue flush · UI `data-feedback-delivery` |
| Pedagogy telemetry | Only if consent = true · queue key cleared on revoke · RPC consent gate |
| Auth failures | Supabase Auth logs · user-facing auth copy (no raw Supabase/SQL) |
| Sync issues | Cloud sync bootstrap logs · user reports · ops correlation on Edge ops |
| Account deletion | `delete-account` Edge Function logs · correlation ID (no PII in ID) |
| Deploy / CDN | Netlify deploy logs · `sw.js` / manifest cache headers |
| Version identity | `AppVersionLabel` · `/version.json` · `VITE_COMMIT_SHA` when set |

## Correlation IDs

- Allowed: opaque ops correlation for Edge operations (delete-account, backend errors).
- Forbidden: email, password, tokens, free-answer text, raw audio inside correlation IDs.
