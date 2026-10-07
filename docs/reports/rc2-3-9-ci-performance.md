# RC2.3.9 — CI performance

## BEFORE — hosted baseline (real runs, #319 @ 3c3aa81, run 37583491195)
| Job | Start → end | Duration |
|---|---|---|
| Portão de qualidade (validate:beta + build) — sequential 434-step chain | 06:47:42 → 07:53:16 | **65.6 min** |
| Testes E2E (Playwright) `needs: quality` | 07:53:18 → 09:01:54 | 68.6 min |
| E2E cross-engine `needs: quality` | 07:53:18 → 09:23:03 | 89.7 min |
| RC2.3 stack gates (side job, parallel) | 06:47:42 → 06:58:57 | 11.3 min |
| **Wall clock to last required check** | | **≈ 155 min** |

Local reproducible benchmark (this container, 4 vCPU, sequential, legacy chain): **4 920 s = 82.0 min**, of which 209 s are repeated executions (`typecheck` 6× = 180 s). File: `docs/release/beta-baseline-timing.json` (every leaf with its time).

## AFTER — design
| Job | Content | Local est. (from baseline) |
|---|---|---|
| Release truth (fast failure) | convergence + product truth, typecheck, security, freezes, fingerprint | 99 s measured (isolated) |
| Beta suite ×9 (parallel, `needs: release-truth`) | 11 suites, each on a fresh checkout | longest: pedagogy-progression ≈ 15 min |
| Portão de qualidade (aggregator, `needs` all suites) | build + frontend secrets + web identity | ≈ 3 min |
| E2E / cross-engine | unchanged, `needs: quality` | unchanged |

Expected critical path before E2E: release-truth (+setup) → longest suite → build ≈ **25 min instead of 65.6 min**. E2E itself is unchanged and stays the dominant term.

## AFTER — measured (hosted, #320 @ c876a22, run 37682199737)
| Job | Start → end | Duration |
|---|---|---|
| Release truth (fast failure) | 20:28:05 → 20:29:42 | 1.6 min |
| Beta suite learner-systems | 20:29:44 → 20:34:25 | 4.7 min |
| Beta suite android-runtime | 20:29:44 → 20:35:05 | 5.4 min |
| Beta suite culture-identity-v6 | 20:29:44 → 20:35:32 | 5.8 min |
| Beta suite experience | 20:29:44 → 20:36:45 | 7.0 min |
| Beta suite pedagogy-mastery | 20:29:44 → 20:38:08 | 8.4 min |
| Beta suite conversation-everyday | 20:29:44 → 20:38:39 | 8.9 min |
| Beta suite android-foundation | 20:29:45 → 20:39:55 | 10.2 min |
| Beta suite pedagogy-structure | 20:29:44 → 20:41:07 | 11.4 min |
| Beta suite pedagogy-progression (longest) | 20:29:44 → 20:50:08 | 20.4 min |
| Portão de qualidade (aggregator: build + secrets + identity) | 20:50:11 → 20:51:30 | 1.3 min |
| **Quality path (release-truth start → quality end)** | **20:28:05 → 20:51:30** | **23.4 min (before: 65.6 min)** |
| E2E start after push | 20:51:32 | **23.5 min after start (before: 65.6 min)** |
| Wall clock to last required check | — | E2E_PENDING |

| Metric | Value |
|---|---|
| Sequential critical path before E2E | 1.6 + 20.4 + 1.3 min (was one 65.6-min job) |
| Canonical gate entry points | 12 suites / 440 steps |
| Duplicate executions inside one validate:beta run | 29 → 0 |
| Duplicate executions across parallel CI jobs | 25 (typecheck in 4 jobs, a few shared tests) — parallel, not wall clock |
| Android workflow re-run of 26 Android gates | kept (see gate-retirements.json `keptDuplicates`) |

`CI_TIME_AFTER <= CI_TIME_BEFORE` for the quality path: **PASS (23.4 ≤ 65.6 min, −64%)**. Total runner minutes go UP (parallel jobs each pay checkout + npm ci); this wave optimises wall clock, as the roadmap asks.
