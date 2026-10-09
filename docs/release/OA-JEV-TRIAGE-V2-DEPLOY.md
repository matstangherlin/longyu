# OA-JEV-TRIAGE-V2-DEPLOY — Production Edge deploy (owner mutation)

**Status:** `OWNER_ACTION_REQUIRED`  
**Do not deploy** from this document alone. Production mutate only with explicit owner confirmation (`DEPLOY-triage-feedback`) after merge to `main`.

## Current live (MandarimProject `drjcfalvlbbeblmmyhwj`)

| Field | Value |
|---|---|
| Function | `triage-feedback` |
| Version | **1** |
| `ezbr_sha256` | `e585439ed123a1665638fd923b67aa50ec300174794546bafd458cda88f29aee` |
| `verify_jwt` | `true` |
| Observed | 2026-10-09 (JEV Wave 1 Phase 0) |

### Live behavior (v1)

- Admin: JWT + `is_beta_admin` ✓  
- Secret: env → Vault RPC ✓  
- Batch 25 / concurrency 5 ✓  
- Timeout **8s** (repo target **3s**)  
- **Missing:** `jevAllowed`, circuit breaker, input dedupe, historical reuse, purpose arg, typed answer schema  

## Target (repo)

| Field | Value |
|---|---|
| Source of truth | `supabase/functions/triage-feedback` + `_shared/{jev,jevAnswers,budgetPolicy,opsCorrelation}.ts` |
| Bundle hash | see `docs/jev/production-parity.json` → `repoFunctionHash` |
| Expected next version | **≥ 2** |
| Learner runtime | **OFF** (`JEV_RUNTIME_ENABLED=false`) |

### Expected changes after deploy

1. 3s AbortController timeout  
2. `jevAllowed("DEV_AUDIT")` → 503 when kill switch off  
3. Circuit breaker 3 failures → 60s open  
4. `jevInputHash` + in-batch `inFlight` dedupe  
5. Historical reuse only on exact `message`+`category`+`route`  
6. `askJev(..., "DEV_AUDIT")` purpose  
7. `validateJevAnswers` (choice / score / noul)  

**No DB schema mutation** required for this deploy.

## Deploy method (canonical)

1. Merge the secure Edge sources to **`main`**.  
2. GitHub Actions → **Deploy Edge Function (manual, from main)**  
   - function: `triage-feedback`  
   - confirm: `DEPLOY-triage-feedback`  
   - `expected_sha` = reviewed main SHA  
3. Workflow runs `validate:rc2-3-10-cloud` / Jev guardrails before deploy.  
4. Secret `SUPABASE_ACCESS_TOKEN` must exist in the `production` environment.

Agent MCP `deploy_edge_function` is **not** the preferred path (transcription risk). Prefer the workflow above.

## Rollback

1. Re-deploy the v1 sources recorded in Phase 0 / `docs/reports/rc2-3-10-jev-production-certification.md` (timeout 8s, no breaker/dedupe).  
2. Or restore previous Edge version from Supabase dashboard if retained.  
3. Confirm `functions list` shows version rollback; re-run `get_edge_function` and update `docs/jev/production-parity.json`.

## Smoke plan (post-deploy, synthetic only)

1. Anonymous POST → `401`/`403` (`edge_triage_requires_auth`).  
2. Non-admin JWT → `403`.  
3. Beta admin + synthetic feedback:  
   > Audio stopped playing after I returned to the lesson.  
4. Assert columns: `ai_kind`, `ai_area`, `ai_severity`, `ai_needs_human`, `ai_confidence`, `ai_model`, `ai_triaged_at`.  
5. Insert identical row → classification reused (`reused ≥ 1`), no second TypeSafe charge when policy says so.  
6. With `JEV_DEV_AUDIT_ENABLED=false` (or breaker open): feedback insert still succeeds; triage returns controlled error / pending rows remain.  

## Owner approval phrase

Reply exactly:

`APPROVE OA-JEV-TRIAGE-V2-DEPLOY`  
and after merge: run workflow with `DEPLOY-triage-feedback`.

Until then: **`JEV_TRIAGE_LIVE = OWNER_ACTION_REQUIRED`**.
