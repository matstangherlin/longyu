# RC2.3.13 — Closure (entry blocked)

## Entry

| Field | Value |
|---|---|
| Parent | PR #329 |
| Artifact source SHA | `2d64f0d7b59f38d761e4970a1770cbf703b8c1d8` |
| Certification HEAD | `aca759cb179d9ce1aedaa9c7baa4a7165c6cf2cb` |
| APK SHA256 | `dc99c03bd803a17d1ff55ab82964df2db820ce316f02568c7887a47a414cc492` |
| AAB SHA256 | `c9f8f0981f4d3abdf10efe7b45e5dee30539afce352fe9f62ebc39fbaae29a85` |
| `gate:closed-beta-entry` | **OWNER_ACTION_REQUIRED** |

## Hosted (#329)

At wave start: Android foundation+runtime SUCCESS, Security SUCCESS, quality gate SUCCESS; Chromium + WebKit/Firefox E2E still **IN_PROGRESS**. Pending ≠ PASS.

## Wave 1 / 2 / 3

**Not started.** Inviting testers while entry ≠ GO is forbidden (`gate:rc2-3-13-closed-beta` kill: `TESTERS_BEFORE_ENTRY_GO`).

## Residual human actions (only)

1. Confirm E2E green on #329 (or fix causal failure)  
2. Install RC1 APK → `OWNER_RC1_DEVICE_TEST.md` → physical acceptance  
3. Reply **RC1 distributed** after first sideload  
4. Sentry project + DSN + synthetic event (`OBSERVABILITY_PASS`)  
5. Netlify rollback drill evidence  
6. Full cloud smoke with synthetic `LONGYU_QA_*`  
7. Android OAuth physical for configured providers  

## Exit

`BETA_EXIT_GATE` = **HOLD_BETA** (entry never GO).  
No `CLOSED_BETA_GO.md`. No Wave 1 invites. No RC2.3.14 handoff.

## Next

Resolve the list above **directly** on the RC stack — do not open another preparation mega-wave. After `CLOSED_BETA_ENTRY=GO`, activate Wave 1 (10).
