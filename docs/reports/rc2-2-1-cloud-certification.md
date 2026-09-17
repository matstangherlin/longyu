# RC2.2.1 — Cloud Certification (in progress / blocked)

**Status: `BLOCKED_CREDENTIALS` after QA topology discovery.**

No candidate published. No `cloud_auth` / `cloud_sync` / `feedback_backend` marked PASS.
No invent-deploy. Zero product features.

## Stack

| | |
|---|---|
| PR base | #272 / #271 RC2.2 candidate infra |
| `STACK_BASE_SHA` | `4b6c42d3d98fb0a3926d293b2ff3450ed07ecfd6` |
| Branch | `cursor/rc2-cloud-certification-5b4f` |
| #271/#272 inherited tip | `b651265` / `4b6c42d` (dd68415 ancestral) |
| Fingerprint | `516692632525` |
| FEATURE_FREEZE | `PUBLIC_BETA` |

## P0 — Credential audit (no secrets printed)

| Credential | Purpose | Status |
|---|---|---|
| Supabase org `Noba` (`cwvlptpndrekubhhtoln`) | MCP access | AVAILABLE |
| QA project `longyu-preview` (`wpnmygzxqvmpdlcuwrjp`) | Candidate backend | DISCOVERED · **INACTIVE** |
| Restore `longyu-preview` | Activate QA DB | **BLOCKED** — free plan 2/2 active projects |
| Active slots | — | `MandarimProject` (prod) + `atomurus` |
| Supabase branching (Pro) | Alternate QA | **BLOCKED** — Pro plan required (`PaymentRequiredException`) |
| `SUPABASE_ACCESS_TOKEN` env | CLI migrate/deploy | MISSING in agent env (MCP works for management) |
| Netlify auth / candidate site | Publish SHA C | MISSING |
| `RC2_CANDIDATE_URL` | Identity verify | MISSING |

## P2 — Production isolation

| Check | Result |
|---|---|
| Preferred QA ref | `wpnmygzxqvmpdlcuwrjp` |
| Production ref | `drjcfalvlbbeblmmyhwj` |
| QA ≠ production | **PASS** |
| `.env.production` in agent | points at production — must not be used as QA |

## What advanced this turn

1. Reused existing QA topology (`longyu-preview`) — no duplicate project created.
2. Attempted restore → free-tier limit.
3. Attempted development branch off production → Pro plan required.
4. Confirmed production isolation for the preferred QA ref.
5. Still **no** `candidateSha`, **no** operational `pass=true`.

## Exact human actions to unblock (then continue on this branch)

1. Free one Supabase free-tier slot (owner pauses/deletes unused `atomurus`, **or** upgrades org).
2. Restore/activate `longyu-preview` (`wpnmygzxqvmpdlcuwrjp`).
3. Provide agent secrets: `RC2_QA_PROJECT_REF`, QA URL, QA anon key, `SUPABASE_ACCESS_TOKEN` (migrate + Edge).
4. Provide Netlify candidate deploy access (`NETLIFY_AUTH_TOKEN` + site, or CI secrets).
5. Configure Auth redirects + Turnstile QA on that project.

Then this remessa resumes: migrate → Edge core functions → capture C → deploy → identity → cloud_auth/sync/feedback.

## Curriculum (unchanged)

134 / 113 / 30 / 30 / 20 · fingerprint `516692632525`.

## Next after unblock

RC2.2.1 completion → RC2.2.2 devices/PWA/rollback → RC2.2.3 human QA → RC2.3 final candidate → V5.0.

Generated: 2026-09-17T20:01:07Z
