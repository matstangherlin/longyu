# RC2.3.9 — Gate parity (old chain vs converged suites)

## Structural parity (gate-enforced, every commit)
`gate:rc2-3-9-stack-convergence` re-expands the **frozen** legacy command (`docs/release/validate-beta-legacy.json`, captured at 8a1b763) against today's scripts and fails on:
- `SUITE_COVERAGE` — any of the 434 legacy steps not in exactly one suite (or retired with equivalence);
- `LEAF_PARITY` — any of the 907 legacy leaf commands no longer executed (catches a step deleted *inside* a nested gate);
- `MUTATION_NOT_CAUGHT` — any legacy `test:*` mutation script no longer executed;
- `RETIRED_WITHOUT_EQUIVALENCE` / `SUPERSEDED_STILL_MANDATORY` — retirement without proof.
Result: **434/434 steps, 907/907 leaves, 0 retirements** — nothing was removed from the critical path except exact repeated executions of the same command.

## Semantic parity
| Dimension | Old | Converged | Evidence |
|---|---|---|---|
| PASS/FAIL of the full chain | EXIT 0 (4 920 s, 936 executions, 8a1b763) | **EXIT 0 (4 810 s, 12/12 suites, 156 repeated executions skipped, 8bf7a2b)** | docs/release/beta-baseline-timing.json · runner JSON |
| Per-suite isolation (fresh checkout each) | n/a | **12/12 PASS** locally (clean reset between suites) and 9/9 hosted suite jobs PASS on #320 | isolation run · run 37682199737 |
| Mutations | every legacy `test:*` still runs | + 24 new (rc2-3-9) | test:rc2-3-9-stack-convergence |
| Invariants | implicit | 23 owned | invariant-ownership.json |
| Fingerprint | 5a64821d0b7d | 5a64821d0b7d (unchanged) | product-truth.json |
| Build | main chunk 2 823 886 B | main chunk 2 823 886 B (identical); `/qa/device` lazy chunk +5.9 KB | local vite build |
| E2E critical flows | hosted | hosted on the PR | CI |

## Dependency found by the isolation design
`validate:report-freshness` must run after the 15 report generators (it fails on a fresh checkout otherwise). The legacy chain hid this by ordering; the converged suites make it explicit: every generator and the freshness check live in `pedagogy-progression`, freshness last.

## Wiring checks re-pointed (same meaning)
Six gates asserted `scripts["validate:beta"].includes(X)`; they now ask `canonicalBetaChain()` ("is X reachable from a canonical suite"). `gate:rc2-2-16-play-internal-beta` mutation 43 now removes the locale gate from that chain and is still killed. All nine affected gates PASS.
