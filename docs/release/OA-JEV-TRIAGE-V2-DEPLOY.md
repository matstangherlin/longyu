# OA-JEV-TRIAGE-V2-DEPLOY — Owner production promotion pack

**Status:** `OWNER_ACTION_REQUIRED`  
**This document is NOT deploy approval.** Production mutate only after explicit owner reply:

`APPROVE OA-JEV-TRIAGE-V2-DEPLOY`

Then: merge to `main` → run the manual workflow with confirm phrases below.

**Never touch Atomurus** (`ylofdottauzcqcifnnpm`).

---

## Live truth (MandarimProject `drjcfalvlbbeblmmyhwj`)

| Field | Value |
| --- | --- |
| Function | `triage-feedback` |
| Live version | **1** |
| Live hash (`ezbr_sha256`) | `e585439ed123a1665638fd923b67aa50ec300174794546bafd458cda88f29aee` |
| `verify_jwt` | `true` |
| `JEV_TRIAGE_LIVE` | **OWNER_ACTION_REQUIRED** |
| Learner runtime | **OFF** |
| Shadow runtime | **OFF** |

Do **not** claim live v2 until re-fetched after an authorized deploy.

---

## Two separate production mutations

### A — JEV Beta Triage Migration (only)

| Field | Value |
| --- | --- |
| File | `supabase/migrations/20261009060000_jev_beta_triage_v2.sql` |
| Drift class | `NOT_YET_DEPLOYED` |
| `deploymentIntent` | `OWNER_APPROVAL_REQUIRED` |
| Production | **NOT_APPLIED** |
| Nature | Additive only (columns + indexes + `jev_ops_daily`) |

**Pre-requirements**

1. Production backup policy satisfied  
2. Exact migration file hash recorded in the apply ticket  
3. Current migration ledger / drift inventory snapshot  
4. Explicit owner approval  

**Content review (already audited in-repo)**

- Additive `ai_*` columns + checks on `beta_feedback`  
- `jev_ops_daily` aggregate counters (no learner text, service_role only, RLS on)  
- No destructive ALTER/DROP  
- No curriculum / Mastery / progression mutation  

### B — Edge deploy `triage-feedback` secure v2

| Field | Value |
| --- | --- |
| Source | `supabase/functions/triage-feedback` + `_shared/jev*.ts` |
| Target live version | **≥ 2** |
| Repo bundle digest | see `docs/jev/production-parity.json` → `repoFunctionHash` |
| Purpose | `DEV_AUDIT` only |
| `JEV_RUNTIME_ENABLED` | **false** |
| `JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED` | **false** |

**Must ship with**

- admin-only (`is_beta_admin`) + `verify_jwt=true`  
- server-side TypeSafe key (env → Vault)  
- 3s timeout, circuit breaker, batch 25, concurrency 5  
- typed `validateJevAnswers`  
- PII redaction, severity→P map, security overrides, confidence, daily budget  
- exact dedupe + historical reuse  
- semantic cluster **advisory-only**  
- fail-open `PENDING_AI_TRIAGE`  

### EXCLUDE from this OA

| File | Intent |
| --- | --- |
| `20261009070000_jev_shadow_struggle_lab.sql` | `DEFERRED_RESEARCH` — **do not apply** for Closed Beta / triage v2 promotion |

Shadow lab remains `KEEP_SHADOW`. Not a Closed Beta prerequisite.

---

## Deploy method (canonical)

1. Merge reviewed SHA to **`main`**.  
2. Apply migration **A** only (owner-operated DB path / approved workflow).  
3. GitHub Actions → **Deploy Edge Function (manual, from main)**  
   - function: `triage-feedback`  
   - confirm: `DEPLOY-triage-feedback`  
   - `expected_sha` = reviewed main SHA  
4. Secret `SUPABASE_ACCESS_TOKEN` in `production` environment required.  

Agent MCP deploy is **not** preferred.

---

## Rollback

1. Re-deploy known-good **`triage-feedback` v1** sources / previous Edge version from Supabase dashboard.  
2. Live hash to restore: `e585439ed123a1665638fd923b67aa50ec300174794546bafd458cda88f29aee` (v1).  
3. Migration A is additive — do **not** drop columns in panic; leave rows nullable and stop Edge v2 if needed.  
4. Re-query `get_edge_function` / `functions list`; update `docs/jev/production-parity.json` + `docs/jev/triage-live-certification.json`.

---

## Post-deploy smoke (synthetic only)

| Case | Expect |
| --- | --- |
| Unauthenticated | 401 |
| Authenticated non-admin | 403 |
| Beta admin + “Audio stopped after the first sentence.” | triage suggests bug / `audio_speech`; write `ai_*` + policy `feedback-v2` |
| “I can see another user's progress.” | **P0 candidate**, `ai_human_review_required`, override not downgradable |
| Message with fake email / phone / token | Jev payload sanitized; no secrets in ordinary logs |
| Identical synthetic feedback twice | reused evaluation (no duplicate spend when designed) |
| Jev unavailable / timeout / budget exhausted | feedback remains; `PENDING_AI_TRIAGE` |

Only after smoke evidence: set `JEV_TRIAGE_LIVE=PASS`. Until then: **OWNER_ACTION_REQUIRED**.

---

## Owner approval phrase

`APPROVE OA-JEV-TRIAGE-V2-DEPLOY`
