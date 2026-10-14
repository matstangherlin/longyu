# RC2.3.12C — Closure

## Parent

PR **#328** · HEAD at branch create: `2d64f0d7b59f38d761e4970a1770cbf703b8c1d8`  
This PR: stacked `cursor/rc2-3-12c-beta-entry-execution-af1a`

## Hosted

Re-query at final push. Security on parent HEAD was SUCCESS before stack. CI + Android were still RUNNING at wave start — do not claim PASS until completed.

## Artifacts

| Item | Value |
|---|---|
| Source SHA | `2d64f0d7b59f38d761e4970a1770cbf703b8c1d8` |
| Android run | [37877291018](https://github.com/matstangherlin/longyu/actions/runs/37877291018) |
| versionCode | `570` |
| APK SHA256 | `dc99c03bd803a17d1ff55ab82964df2db820ce316f02568c7887a47a414cc492` |
| AAB SHA256 | `c9f8f0981f4d3abdf10efe7b45e5dee30539afce352fe9f62ebc39fbaae29a85` |
| Embedded | `version.json.sourceHeadSha` matches source SHA · `deviceQaBuild=true` |
| Secret scan | JS chunks: no `sk_live_` / service_role / private key |
| Owner package | `docs/release/OWNER_DOWNLOAD.md` |

Candidate status: **BUILT** (not BETA_READY).
## Physical

`OWNER_RC1_DEVICE_TEST.md` — 20 human checkpoints. **NOT_RUN**.

## Cloud beta

Partial smoke (anon only): site_reachable, release_sha, security_headers, supabase_auth_health, edge_triage_requires_auth **PASS**. Login/progress/feedback **FAIL** — `LONGYU_QA_*` missing. Full cloud smoke **NOT_RUN**.
## OAuth

Redirect merge + Android OAuth physical: **OWNER_ACTION_REQUIRED** / **NOT_RUN**.

## Observability

Sentry MCP `needsAuth` (auth timed out). `OA-SENTRY-PROJECT` remains. **CONFIG_REQUIRED** → GO blocked without approved exception.

## Rollback

Netlify deploy ID drill: **NOT_RUN** (no Netlify token in agent).

## Known blockers (beta-real only)

1. Hosted Android/CI must finish green + artifact consume  
2. Owner physical acceptance (device checklist)  
3. Sentry project/DSN + synthetic event receipt  
4. Netlify rollback drill evidence  
5. Cloud smoke with synthetic QA account  
6. Android OAuth physical (configured providers)

P0: none declared. Curriculum/fingerprint unchanged (`5a64821d0b7d`).

## Closed Beta Entry

# OWNER_ACTION_REQUIRED

Not GO. Not inventing PASS. No RC2.3.12D — next code after GO is **RC2.3.13 Closed Beta**, or fix the listed blockers directly.

## Inevitable human actions (only)

1. Finish/confirm hosted green if still running; install APK from `OWNER_DOWNLOAD.md`  
2. Complete `OWNER_RC1_DEVICE_TEST.md` (20 items)  
3. Create/authorize Sentry project + set `VITE_SENTRY_DSN` (or approve written exception — high risk)  
4. Authorize Netlify rollback drill (or run it)  
5. Provide/confirm synthetic QA credentials for cloud smoke + OAuth redirects in Supabase  
6. Say “RC1 distributed” once sideloaded → immutability lock
