# RC2.3.9 — validate:beta audit (before vs after)

Measured, not estimated. "Leaf" = a `node scripts/…` command the chain actually executes.

| Metric | BEFORE (#319 @ 8a1b763) | AFTER (RC2.3.9) |
|---|---|---|
| `validate:beta` definition | 434-step `&&` string, 17 089 chars | `node scripts/run-canonical-beta-gates.mjs` |
| package.json scripts | 1 130 | 1 138 (+8 RC2.3.9 entry points) |
| Top-level steps | 434 | 440 in 12 suites (434 legacy + 6 added coverage) |
| Leaf executions per full run | 936 | 953 |
| Unique leaves | 907 | 953 (907 legacy + 46 from gates that previously never ran) |
| Same command executed again in one run | **29** (typecheck ×6, pedagogy freeze ×5, Android contracts ×2 …) | **0** (runner dedupes by exact command; 162 repeated references skipped) |
| Nested script visits > 1 | 17 scripts | dedup at leaf level |
| Local sequential wall clock | **4 920 s (82.0 min)**, of which **209 s** were repeats (typecheck 180 s) | see ci-performance (suites in parallel) |
| Canonical gate entry points (`gate:*` in suites) | 40 wired, 1 orphan (`gate:rc2-2-32`) + 4 side-job | 40 + 5 now canonical |
| Release invariants with an owner | not recorded | 23 / 23 |

## Test-count truth
| | Count |
|---|---|
| Commands (leaves executed) | 953 |
| Mutation/test scripts (`test:*`) in suites | 438 |
| `gate:rc2-3-9-stack-convergence` mutations | 24 (all killed) |
| Unique release invariants | 23 |
| Canonical suites | 12 |

"N checks passed" is never used as a quality claim: many legacy tests assert the same invariant; the invariant count is the honest number.
