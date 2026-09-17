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
| QA project `qa-candidate-project` (`wpnm…wrjp`) | Candidate backend | DISCOVERED · **INACTIVE** |
| Restore `qa-candidate-project` | Activate QA DB | **BLOCKED** — free plan 2/2 active projects |
| Active slots | — | `MandarimProject` (prod) + `sibling-free-tier-project` |
| Supabase branching (Pro) | Alternate QA | **BLOCKED** — Pro plan required (`PaymentRequiredException`) |
| `SUPABASE_ACCESS_TOKEN` env | CLI migrate/deploy | MISSING in agent env (MCP works for management) |
| Netlify auth / candidate site | Publish SHA C | MISSING |
| `RC2_CANDIDATE_URL` | Identity verify | MISSING |

## P2 — Production isolation

| Check | Result |
|---|---|
| Preferred QA ref | `wpnm…wrjp` |
| Production ref | `drjcfalvlbbeblmmyhwj` |
| QA ≠ production | **PASS** |
| `.env.production` in agent | points at production — must not be used as QA |

## What advanced this turn

1. Reused existing QA topology (`qa-candidate-project`) — no duplicate project created.
2. Attempted restore → free-tier limit.
3. Attempted development branch off production → Pro plan required.
4. Confirmed production isolation for the preferred QA ref.
5. Still **no** `candidateSha`, **no** operational `pass=true`.

## Exact human actions to unblock (then continue on this branch)

1. Free one Supabase free-tier slot (owner pauses/deletes unused `sibling-free-tier-project`, **or** upgrades org).
2. Restore/activate `qa-candidate-project` (`wpnm…wrjp`).
3. Provide agent secrets: `RC2_QA_PROJECT_REF`, QA URL, QA anon key, `SUPABASE_ACCESS_TOKEN` (migrate + Edge).
4. Provide Netlify candidate deploy access (`NETLIFY_AUTH_TOKEN` + site, or CI secrets).
5. Configure Auth redirects + Turnstile QA on that project.

Then this remessa resumes: migrate → Edge core functions → capture C → deploy → identity → cloud_auth/sync/feedback.

## Curriculum (unchanged)

134 / 113 / 30 / 30 / 20 · fingerprint `516692632525`.

## Next after unblock

RC2.2.1 completion → RC2.2.2 devices/PWA/rollback → RC2.2.3 human QA → RC2.3 final candidate → V5.0.

Generated: 2026-09-17T20:01:07Z

## RC2.2.1B — QA UNBLOCK attempt (2026-09-17T20:05:44Z)

**STOP — human authorization required before any slot action.**

Re-checked via Supabase MCP on tip `c9adeed`:

| Project | Ref | Status |
|---|---|---|
| MandarimProject (production) | `drjcfalvlbbeblmmyhwj` | ACTIVE_HEALTHY |
| sibling-free-tier-project | `ylof…nnpm` | ACTIVE_HEALTHY |
| qa-candidate-project (preferred QA) | `wpnm…wrjp` | INACTIVE |

Free plan still **2/2**. Restore of `qa-candidate-project` still impossible without freeing a slot.
Branching still Pro-only. Netlify candidate access still MISSING.
Agent env secrets still MISSING (`RC2_QA_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `NETLIFY_*`).

Per remessa A1/A2: **did not** pause or delete `sibling-free-tier-project` / `MandarimProject` — no explicit owner authorization in this message.
No local backend, no production QA, no invent-deploy, no cloud PASS, no new scaffolding PR.

### Authorization needed (reply with one)

1. **PAUSE `sibling-free-tier-project`** (preferred) — then agent restores `qa-candidate-project` and continues B→L on this same #273 branch  
2. **DELETE `sibling-free-tier-project`** — only if you explicitly authorize delete  
3. **Upgrade Supabase org** — then restore `qa-candidate-project`  
4. **Provide Netlify candidate access** in parallel (still required for publish C even after QA restore)

After (1) or (2)/(3): same path — restore QA → migrate → Edge core → Netlify C → identity → cloud_auth → cloud_sync → feedback → NO-GO remaining device checks.

