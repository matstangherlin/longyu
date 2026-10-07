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

## AFTER — measured
| Metric | Value |
|---|---|
| Hosted quality path (release-truth start → quality end) | NOT_RUN — filled from the first hosted run of the RC2.3.9 PR |
| Hosted wall clock to last required check | NOT_RUN |
| Sequential command count in the critical path | 1 job of ≤ 15 min instead of 1 job of 65.6 min |
| Canonical gate entry points | 12 suites / 440 steps |
| Duplicate executions inside one validate:beta run | 29 → 0 |
| Duplicate executions across parallel CI jobs | 25 (typecheck in 4 jobs, a few shared tests) — parallel, not wall clock |
| Android workflow re-run of 26 Android gates | kept (see gate-retirements.json `keptDuplicates`) |

Exit criterion `CI_TIME_AFTER <= CI_TIME_BEFORE`: judged on the hosted numbers above once measured; never estimated as PASS.
