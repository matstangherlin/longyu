# Public Beta — Observability Map

**Sentry is optional and off by default.** RC2.3.10 decided `@sentry/browser` may exist as a lazy chunk that loads only when `VITE_SENTRY_DSN` is set in a production-like env. Without the DSN, the SDK is never downloaded. See `docs/reports/rc2-3-10-observability.md`.

| Signal | Where to inspect |
| --- | --- |
| Client runtime errors | Optional Sentry (DSN required) · user feedback · `clientDiagnostics` (sessionStorage → only if user includes technical context) |
| Blank / crash UI | `ErrorBoundary` paths (Retry / Report / Journey / Reload) — no stack in production UI |
| Feedback delivery | Supabase feedback RPC / table · local feedback queue flush · UI `data-feedback-delivery` |
| Pedagogy telemetry | Only if consent = true · queue key cleared on revoke · RPC consent gate |
| Auth failures | Supabase Auth logs · user-facing auth copy (no raw Supabase/SQL) |
| Sync issues | Cloud sync bootstrap logs · user reports · ops correlation on Edge ops |
| Account deletion | `delete-account` Edge Function logs · correlation ID (no PII in ID) |
| Deploy / CDN | Netlify deploy logs · `sw.js` / manifest cache headers |
| Version identity | `AppVersionLabel` · `/version.json` · `VITE_COMMIT_SHA` when set |

## Sentry rules (when enabled)

- Errors only (tracing 0, session replay 0).
- `sendDefaultPii: false` + `scrubEvent` (no email, JWT, tokens, learner answers, speech, Hànzì strokes).
- Failure of Sentry must never break learning (`captureError` is best-effort).

## Correlation IDs

- Allowed: opaque ops correlation for Edge operations (delete-account, backend errors).
- Forbidden: email, password, tokens, free-answer text, raw audio inside correlation IDs.
