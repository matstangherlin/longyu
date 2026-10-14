# RC2.3.13R.3 — Physical & Operational Certification

## NO FEATURE WAVE
## NO LEARNER UI REDESIGN
## NO CURRICULUM CHANGE
## REAL DEVICE + OPERATIONS + DISTRIBUTION CERTIFICATION ONLY

## Parent

| Field | Value |
|-------|-------|
| PR | #343 |
| Title | RC2.3.13R.2.1 — Android Foundation Root-Cause & Hosted Closure |
| HEAD at scaffold | `8811deca936c30ab9eecad56fabcff9cfc9014eb` |
| Security | PASS · run `38003599469` |
| Android | PASS · run `38003599474` (foundation + runtime) |
| CI | IN_PROGRESS · run `38003599459` |
| Chromium | IN_PROGRESS |
| WebKit | IN_PROGRESS |
| Firefox | IN_PROGRESS |

**Physical certification is blocked until Chromium + cross-engine are terminal PASS.**

## Chromium failure on #343 (`38003599459`)

```text
120 failed / 951 passed / 2.2h
```

| Cluster | Classification | Fix direction |
|---------|----------------|---------------|
| Dual `h1` on `/jornada` | TEST_CONTRACT_STALE + a11y | HomeContinue demoted to `h2`; page `h1` = ProgressionShell |
| Multiple `aria-current=step` | PRODUCT_RUNTIME_REGRESSION | Core AULA ready nodes → `AVAILABLE` (not every ready = `CURRENT`) |
| Culture `N / 30` | TEST_CONTRACT_STALE | Path-relative `N de M` expectations |
| Conversation `Verificar` timeout | TEST_CONTRACT_STALE | GuidedDock portals CTA outside panel — use testids |

Runtime touch (JourneyInlineNode + HomeCognitiveBlocks) **invalidates** prior Owner QA APK for a rebuilt candidate after hosted green. Physical remains NOT_RUN until then.

## Artifact identity (preserved)

```text
RC = RC2.3.13-RC1
versionName = 0.2.0-rc.5
versionCode = 651
packageId = longyu.noba.com
learnerRuntimeSha = ce8b7cc82740d6c05d080c462f8403e7d91b1a90
artifactSourceSha = 5c27be365ed276ce7694c15769dd7f9997ec1989
APK = longyu-android-debug-0.2.0-rc.5-3be0ade.apk
APK SHA256 = fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8
fingerprint = fea5455e1461
```

## Device results

All physical rows: **NOT_RUN** (no real-device execution in agent environment; no adb device).

## Operations

| Check | Status | Reason |
|-------|--------|--------|
| Sentry | NOT_RUN | SENTRY_* credentials unset in agent |
| Rollback | NOT_RUN | NETLIFY_* credentials unset |
| Cloud smoke #1 | NOT_RUN | SUPABASE_* unset |
| Cloud smoke #2 | NOT_RUN | SUPABASE_* unset |
| OAuth | NOT_RUN | requires owner device interaction |
| Migration truth | NOT_RUN | no cloud credentials |

## Play

```text
SIGNING_CONFIG = BLOCKED_SIGNING_SECRETS
SIGNED_AAB = NOT_BUILT
PLAY_INSTALL_PROOF = NOT_RUN
```

See `docs/release/PLAY_SIGNING_HANDOFF.md`. Debug AAB is not a Play release.

## Entry (honest intermediate — Part 114)

```text
OWNER_QA_ENTRY = OWNER_ACTION_REQUIRED
PLAY_CLOSED_BETA_ENTRY = OWNER_ACTION_REQUIRED
PUBLIC_BETA_ENTRY = HOLD
Wave 1 invited = 0
```

## Gate

`gate:rc2-3-13r3-physical-operational-go` — GO honesty (≥100 mutations).

## Next

1. Wait #343 E2E terminal green; stamp hosted run IDs.
2. Owner installs exact APK SHA256 and runs physical matrix (`OWNER_R3_PHYSICAL_OPERATIONAL_PACK.md`).
3. Configure ops/signing secrets where missing; re-run automatable checks.
4. Evaluate GO only from evidence.
