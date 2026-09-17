# RC2.1 — Public Beta Candidate · Stack Closure · Cloud Backend Evidence

> **Verdict: NO-GO** (expected — RC2.2 Stripe/devices/PWA still open).
>
> Partial: CodeQL build blocker fixed; content freeze guards shipped; candidate
> manifesto `BLOCKED` awaiting QA Supabase + Netlify candidate credentials.
> `release_candidate_sha` remains `""` — correct until a production-like
> candidate is published and identity-verified.

## Identity

| Field | Value |
|-------|-------|
| STACK_BASE_SHA / #267 HEAD inherited | `281094de6f6897dd68b4cb0786197b9399ecf370` |
| Branch | `cursor/rc2-candidate-cloud-5b4f` |
| PR base | `cursor/culture-history-essentials-5b4f` (#267) |
| CONTENT_FREEZE_SHA | `24ba129d79e61124c7d6dd3aaa3756eb9a6adf40` |
| Fingerprint | `516692632525` |
| Core / topics | 134 / 113 |
| CultureItems / native / History / Journey culture | 30 / 30 / 6 / 20 |
| `CURRICULUM_FREEZE` | `RC2_CONTENT_FREEZE` |
| Candidate code SHA | **not captured** — deploy blocked |
| `release_candidate_sha` | `""` |

## P0 — CodeQL build blocker (root cause + fix)

| Item | Detail |
|------|--------|
| Symptom | Security → CodeQL → Build step exit 2 |
| Root cause | `e2e/culture-hub.spec.ts` accessed `persist.weakWords` which does not exist on `CulturePersistSlice` — typecheck fails inside `npm run build` |
| Fix | Assert dynasty labels stay out of Mandarin `srs` + culture memory home (`281094d` on #267) |
| Reproduce | `npm run typecheck` / `npm run build` |

## Candidate status

`docs/release/rc2-candidate.json` → **`BLOCKED`**

Reason: this agent environment has no QA Supabase access token / project, no
Netlify auth for a dedicated candidate site, and deploy-preview is explicitly
`VITE_BACKEND_MODE=local` (see `netlify.toml`). Using preview as “cloud
candidate” would violate P3/P29.

## Cloud evidence (this remessa)

| Check | Result |
|-------|--------|
| cloud_auth | **NOT_RUN / BLOCKED** — no QA candidate |
| cloud_sync | **NOT_RUN / BLOCKED** |
| feedback_backend | **NOT_RUN / BLOCKED** |
| league_cloud_smoke | **NOT_RUN / BLOCKED** |
| family_plan_live | **NOT_RUN / BLOCKED** |
| business_seats_live | **NOT_RUN / BLOCKED** |
| stripe_* / devices / rollback / pwa | **NOT_RUN** (RC2.2) |

No false PASS. Runbooks under `docs/release/evidence/` reused, not rewritten.

## Gates added

- `validate:rc2-content-freeze` / `test:rc2-content-freeze`
- `validate:rc2-candidate-config` / `test:rc2-candidate-config`
- `validate:rc2-candidate-drift` / `test:rc2-candidate-drift`
- `gate:rc2-candidate` (freeze + config + drift + validate:beta + build)

## Deploy identity (prep)

`scripts/vite-build.mjs` writes `dist/version.json` with `{ commitSha, appVersion, environment, builtAt }` and accepts `VITE_COMMIT_SHA` / `VITE_APP_ENV=rc2-candidate` when a real candidate build is configured.

## What unblocks RC2.1 completion

1. Provision QA Supabase (not production) + anon URL/key in secret store  
2. Netlify (or equivalent) site/context with `VITE_BACKEND_MODE=supabase`, `VITE_USE_TEST_FIXTURES=false`, `VITE_APP_ENV=rc2-candidate`, `VITE_COMMIT_SHA=<C>`  
3. Deploy code SHA `C`, confirm `/version.json`  
4. Docs-only commit: `release_candidate_sha=C` + manifesto `DEPLOYED`  
5. Execute existing runbooks; set `pass=true` only with testedAt/environment/commitSha  



## Validation evidence (this agent)

| Gate | Result |
|------|--------|
| `npm run typecheck` / `npm run build` | PASS (post CodeQL fix) |
| Security on #267 | PASS (gitleaks, npm audit, CodeQL) |
| `validate:beta` (local, pre-RC2-gate wiring) | PASS · ~41 min · fingerprint `516692632525` |
| `validate:rc2-content-freeze` + mutations | PASS |
| `validate:rc2-candidate-config` + mutations | PASS (status BLOCKED) |
| `validate:rc2-candidate-drift` + mutations | PASS |
| Chromium `e2e/culture-hub.spec.ts` | **17/17 PASS** (History shelf, timeline mobile 390×844, Culture Review) |
| WebKit Culture Hub | see log / CI |
| Cloud evidence | BLOCKED — no QA candidate credentials |

## Stop

Do not invent cloud PASS. Do not fill `release_candidate_sha` early. Next stack:
**RC2.2 — Commercial + Device + PWA** from this branch tip when credentials arrive — or continue evidence here first.
