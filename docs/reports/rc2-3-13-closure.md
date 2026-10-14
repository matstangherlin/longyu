# RC2.3.13 — Closure (entry blocked)

## Entry

| Field | Value |
|---|---|
| Parent | PR #329 |
| Artifact source SHA | `2d64f0d7b59f38d761e4970a1770cbf703b8c1d8` |
| Certification HEAD | `2a4082160fb5f0abff6c954f0076c586fbc91f67` |
| Beta ops HEAD (parent tip) | `870a71a4d6f7faae801304344c9e1d915533b273` |
| APK SHA256 | `dc99c03bd803a17d1ff55ab82964df2db820ce316f02568c7887a47a414cc492` |
| AAB SHA256 | `c9f8f0981f4d3abdf10efe7b45e5dee30539afce352fe9f62ebc39fbaae29a85` |
| `gate:closed-beta-entry` | **OWNER_ACTION_REQUIRED** |

## Hosted (#329)

Security SUCCESS · Android foundation+runtime SUCCESS · Release truth SUCCESS · quality gate SUCCESS.

Chromium E2E initially **FAIL** (4): `beta-smoke` hardcoded `v0.2.0-beta.1` after package/`VITE_APP_VERSION` became `0.2.0-rc.1`. Fixed on #329 (`2a408216`, read version from `package.json`). Speech produce case was flaky (not counted as hard fail). WebKit step also failed once (known P2 `WEBKIT-E2E-FLAKES-10B`) — reconsult after re-run. Pending/failed ≠ PASS. `PARENT_HOSTED_TRUTH_PASS` stays PENDING until CI completes SUCCESS.

## Product truth

Regenerated on ops branch after dual-SHA stamp (`PRODUCT_TRUTH_FRESH=PASS`). Local `release-truth` PASS.

## Partial cloud probe (not full smoke)

Site `200` + `/version.json` readable + Supabase auth health `200`. Live web still `0.2.0-beta.1` / `ec26ffcb…` (not RC1). Full `smoke:cloud` blocked: no `LONGYU_QA_*` in this environment. `CLOUD_BETA_REQUIRED_PASS` remains NOT_RUN.

## JEV HOSTED CLOSURE

| Wave | Status |
| --- | --- |
| Wave 1 — production parity | Repo guards **PASS** · Live **OWNER_ACTION_REQUIRED** (v1) |
| Wave 2 — beta triage intelligence | **VERIFIED** (`gate:jev-beta-triage-v2`) |
| Wave 3 — shadow struggle lab | **VERIFIED_SHADOW_ONLY** / **KEEP_SHADOW** |
| Learner runtime | **OFF** |
| Shadow runtime | **OFF** |
| Migration `20261009060000_jev_beta_triage_v2` | `NOT_YET_DEPLOYED` · `OWNER_APPROVAL_REQUIRED` · cloud ledger `REPO_ONLY` |
| Migration `20261009070000_jev_shadow_struggle_lab` | `NOT_YET_DEPLOYED` · `DEFERRED_RESEARCH` · cloud ledger `REPO_ONLY` · **not** beta-required |
| Local `release-truth` | **PASS** (ledger regen + R23/gitleaks allowlist precision + Wave2 PII mutation retarget) |
| Local `gate:jev-hosted-closure` | **PASS** · 23/23 kills |
| Hosted CI / Security / Android / E2E | **PENDING** exact tip SHA (do not carry prior greens) |
| `JEV_TRIAGE_LIVE` | **OWNER_ACTION_REQUIRED** until OA deploy + smoke |
| Gate | `gate:jev-hosted-closure` |

Causal fixes on this tip: regenerate RC2.3.10 cloud ledger for 060000/070000; construct Stripe kill-8 fixture at runtime; narrow historical gitleaks allowlist via one-char-class regexes (no contiguous `{24,}` literals); retarget `PII_SENT_TO_JEV` to `buildSanitizedFeedbackState`.

Do **not** create JEV Wave 4. Next JEV step is owner `OA-JEV-TRIAGE-V2-DEPLOY` only.

## Wave 1 / 2 / 3 testers

Inviting testers while entry ≠ GO is forbidden (`gate:rc2-3-13-closed-beta` kill: `TESTERS_BEFORE_ENTRY_GO`). Tester registry empty (0).

## Residual human / credential actions

1. Confirm E2E green on #329 (or fix causal failure) → ingest hosted PASS
2. Install **exact** RC1 APK → `OWNER_RC1_DEVICE_TEST.md` → physical Speech/Hànzì/OAuth → `OWNER_RC_PHYSICAL_ACCEPTANCE=PASS`
3. Reply **RC1 distributed** after first sideload (`RC1_DISTRIBUTED=true`)
4. Sentry project + DSN + synthetic event proving release/SHA/env (`OBSERVABILITY_PASS`) — MCP auth timed out here
5. Netlify rollback drill evidence (candidate → previous → smoke → candidate)
6. Full cloud smoke ×2 with synthetic `LONGYU_QA_*` (no duplicate progress/rewards)
7. Android OAuth physical for configured providers

## Observability / billing

Sentry: CONFIG_REQUIRED. Stripe live OFF. Play purchase OFF. Commercial: FREE_ONLY. Learner Jev OFF.

## Exit

`BETA_EXIT_GATE` = **HOLD_BETA** (entry never GO).  
No `CLOSED_BETA_GO.md`. No Wave 1 invites. No RC2.3.14 handoff.

## Next

Resolve the list above **directly** on the RC stack — do not open another preparation mega-wave. After `CLOSED_BETA_ENTRY=GO`, activate Wave 1 (10).
