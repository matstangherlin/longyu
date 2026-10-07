# RC2.3.4A — Stack Truth & CI Closure

Machine-readable: [`rc2-3-4a-stack-truth.json`](rc2-3-4a-stack-truth.json)

## Identity (read live, 2026-10-07)

| | |
|---|---|
| Parent PR | [matstangherlin/longyu#314](https://github.com/matstangherlin/longyu/pull/314) (draft, open, `mergeable_state: blocked`) |
| Parent head (exact) | `9819607ba90648ebd68fdaf757a84e360ad63b89` — same SHA the PR body cites; no newer commit |
| Parent base | `main` @ `d6339330df5e19dddc8a8977015fc7cc8bb5620d` (= merge-base) |
| #313 tip (stack below #314) | `6d6a4101b426242a479f8438b671d18ba648fc82` |
| This change | stacked on `9819607`, branch `claude/quirky-sagan-vzpuaa` |

## Hosted workflow evidence on `9819607`

| Check | Conclusion | Run / job |
|---|---|---|
| Portão de qualidade (validate:beta + build) | **failure** | run 37098442286 / job 111133039588 |
| Testes E2E (Playwright) · E2E cross-engine | skipped (needs quality) | run 37098442286 |
| Ephemeral backend contract | success | run 37098442290 / job 111133039742 |
| Android foundation (contratos + debug APK/AAB) | success | run 37098442288 / job 111133039697 |
| Android runtime (emulator + connectedDebugAndroidTest) | success | run 37098442288 / job 111135349954 |
| CodeQL · Secret scan (gitleaks) · npm audit | success | run 37098442302 |
| Netlify deploy preview (redirect/header rules) | success | deploy `6ac08c0adc77a10008dd43d3` |
| Supabase Preview | skipped | — |

The same quality gate was already **red on #313** (`6d6a410`, run 37085557345) together with Android foundation — the failure is inherited from the RC2.3.x stack, not introduced by #314.

## Failures — first real cause of each

`validate:beta` is an `&&` chain of 427 steps; CI only ever showed the first failure. Every step after it was run independently here (34/34) to surface hidden failures.

| # | Gate | First cause | Introduced | Fix (causal) |
|---|---|---|---|---|
| F1 | `validate:release-candidate` | Hard-coded `FINGERPRINT = "c48b008c9c1e"` (RC2.2.9) never updated when RC2.3.0 advanced the Journey fingerprint (c48b→99cb). Two consumers then disagreed on `rc1-operational-checks.base_fingerprint`: `rc1-2-gates` (tracks current) vs this validator (stale literal). | `ba00438` RC2.3.0 (#309 stack) | Validator now reads `RC_BASE_FINGERPRINT` (single authority) and **requires an unbroken chain of typed `EXPECTED_FINGERPRINT_ADVANCE` records** from the last certified anchor `c48b008c9c1e` to the live fingerprint (`scripts/lib/fingerprint-chain.mjs`). Forks, cycles, orphan records, undocumented jumps and non-existent gates fail. 8/8 mutations killed (`test:fingerprint-chain`). |
| F1b | (same gate, revealed by the stricter check) | `RC2_3_4_HANZI_WRITING_CONTENT_EXCEPTION.gate = "gate:rc2-3-4-hanzi-writing"` — script never existed | #314 `6270214` | Gate created for real (Prompt 2) and wired into `validate:beta`. |
| F2 | `gate:rc2-2-9-capability-closure` → `test:capability-runtime-evidence` mutation 6 | The plan now delivers a **second** independent listening of 便宜一点 (`p6-compras` M2, `listen_select`); the mutation removed only steps whose `audioText` matched, so listening evidence survived and the expected `DECLARED_READY_WITHOUT_EVIDENCE` did not fire. More evidence, weaker mutation — not a regression. | RC2.3.x stack (present at `6d6a410`, absent on `main`) | Mutation now removes every audio channel the evidence reads (`audioText`, `audioTextB`, `audioSequence`). |
| F3 | same test, mutation 11 | `talk_family` gained transfer evidence in `l25` M4 (`packet-exchange-family`); removing only the `p7` step left the dimension alive. | RC2.3.x stack (present at `6d6a410`, absent on `main`) | Mutation removes exactly the steps the real evidence attributes to `talk_family.transfer`. 19/19 mutations killed. |

No validator was disabled, no tolerance raised, no mutation removed, no snapshot blanket-updated, no content changed to satisfy a fingerprint, no frozen count changed (134 lessons / 113 topics / 30 CultureItems).

## Fingerprint / identity matrix

| Authority | Previous | Current | Why changed | Expected? | Consumers | Status |
|---|---|---|---|---|---|---|
| Journey fingerprint (`journeyFingerprint()` over `CURRICULUM_SOURCES`) | `c48b008c9c1e` (main) | `5a64821d0b7d` | RC2.3.0 pedagogy annotations → `99cbc002710c`; RC2.3.1 `visualConceptId` → `c3861b5fb65f`; RC2.3.2 everyday metadata → `e566a250c5a6`; RC2.3.3 & RC2.3.4 writing: unchanged; #314 planner budget fix → `5a64821d0b7d` | **EXPECTED_FINGERPRINT_ADVANCE** ×4, each a typed record in `curriculumFreeze.ts` | `validate:release-candidate` (chain), `rc1-2/rc1-3/rc1-5/v410a1/rc2-*` gates, wave matrices | **PASS** (chain `c48b → 99cb → c386 → e566 → 5a64` verified) |
| `RC_BASE_FINGERPRINT` (curriculumFreeze.ts) | `e566a250c5a6` (#313) | `5a64821d0b7d` | follows the Journey fingerprint (#314 `RC2_3_4_CI_BUDGET_CORRECTION`) | EXPECTED | every current-identity gate | PASS |
| Mastery planner identity (`lessonTasks.ts` budget) | RC2.3.0 budgets | bonus + capability-closure budget reserved inside the pass ceiling | #314 bug fix (appending beyond the ceiling) | EXPECTED (same record as above, gate `validate:topic-mastery-depth`) | `validate:topic-mastery-depth`, 113-topic depth, generated-task fixtures | PASS (CI on `9819607` passed those steps) |
| `rc1-operational-checks.base_fingerprint` | `c48b008c9c1e` (main) | `5a64821d0b7d` | tracks current identity (`rc1-2-gates`); the stale validator was the outlier | EXPECTED | `rc1-2-gates`, `validate:release-candidate` | PASS — note text restored to the true V4.11A.3 history (`516692632525`), which `d2f9319` had rewritten to `5a64…` |
| Backend contract Journey identity (`docs/backend/v478-backend-rc.json`) | `c3861b5fb65f` (stale since RC2.3.2) | `5a64821d0b7d` | refreshed by #314 `9819607`; schema/contract hashes unchanged | EXPECTED (current identity) | backend-contract offline gate | PASS (hosted job success) |
| Generated runtime inventories (`rc2-2-25-surface-inventory.json`, `rc2-2-24-native-step-parity.json`) | pre-budget plan | regenerated | derived from the planner | EXPECTED (derived) | rc2-2-24/25 gates | PASS (sweep) |
| Capability closure evidence (`rc2-capability-closure.json`, `rc2-2-9-capability-closure.md`) | generated at `c48b…` | regenerated at `5a64…` | derived artifact never regenerated since RC2.3.0 because CI never got past F1 | EXPECTED (derived) | `validate:capability-runtime-evidence` | PASS |
| Wave matrices `rc2-3-0…rc2-3-4-*-matrix.json` `curriculumFingerprint` | each wave's own value | all `5a64821d0b7d` | rewritten by `d2f9319` string replacement; the RC2.3.x gates read them as *current identity* | **DESIGN DEBT** — historical wave records double as current-identity checks and must be rewritten on every advance | `gate:rc2-3-0…3` | PASS today; consolidate in RC2.3.9 (read `RC_BASE_FINGERPRINT` instead) |
| Historical RC records (`rc2-2-19/22/23…27` manifests/bug ledgers `c48b…`, `device-preflight.json` `516692632525`, `rc2-candidate.json` `c48b…`) | — | unchanged | historical evidence | n/a | historical gates | PASS — intentionally untouched |
| `RC2_2_31D_APK_RUNTIME_PROOF_EXCEPTION.fingerprint = "a91d31d0c0de"` | — | unchanged | on `main` the live fingerprint was `c48b…`; this record has no `previousFingerprint`, so it is not an advance | **HISTORICAL_RECORD_ANOMALY** (not a chain member) | none | recorded, not rewritten |

## Derived-report drift observed (not committed)

Running the RC2.3.0–2.3.3 gates locally regenerates their wave reports. Against the committed copies
(generated at #313/#314 time) the current planner yields, e.g. `rc2-3-0-first-20-v6.json`
`saturationWarnings` 11 → 16 and `rc2-3-1-full-visual-coverage.json` `visualConceptsCovered` 56 → 55
(`concreteConcepts` 280 → 278). The gates **pass** with the new values. These regenerations are left out of
this PR (they would also reset hand-stamped statuses such as `WEB_PASS`) and are listed for RC2.3.9
Stack Convergence; the new `rc2-3-stack-gates` CI job recomputes them on every run.

## CI wiring gaps closed

- `gate:rc2-3-0-pedagogy-v6`, `gate:rc2-3-1-visual-first`, `gate:rc2-3-2-human-everyday`, `gate:rc2-3-3-culture-deep` existed but **no workflow ran them**. All four pass locally; added as a parallel CI job `rc2-3-stack-gates` (public repo — standard runners are free).
- New in `validate:beta` (right after `validate:release-candidate`): `test:fingerprint-chain`, `gate:rc2-3-4-hanzi-writing`, `test:free-tier-guardrails`.

## Release truth (PR #314 body vs hosted reality)

| PR #314 claim | Hosted reality on `9819607` | Corrected status |
|---|---|---|
| CI "being rerun" | quality gate **failure** (F1) | FAIL on parent → fixed in this PR, pending hosted run |
| Security | CodeQL, gitleaks, npm audit success | PASS |
| backend-contract | success | PASS |
| `ANDROID_BUILD_PASS: NOT_RUN` | Android foundation **success**, debug APK/AAB artifact produced | ANDROID_BUILD_PASS = PASS (parent) |
| `APK_PASS: NOT_RUN` | APK exists, nobody installed it | stays **NOT_RUN** (build ≠ APK acceptance) |
| `OWNER_HANZI_ACCEPTANCE: NOT_RUN` | — | stays **NOT_RUN** |
| `CURRICULUM_LEAK_PASS: PASS` | gate referenced in freeze record did not exist; Hànzì hub + Lab offered graded memory writing to learners who were never taught the character | was **not** true → fixed (see `rc2-3-4a-hanzi-eligibility.md`) |

## Remaining NOT_RUN / blockers

- Hosted CI for this PR's head (pending push).
- `OWNER_PHYSICAL_PASS`, `APK_PASS` — owner on device.
- Full `validate:beta` local run: see closure report for the final result.
