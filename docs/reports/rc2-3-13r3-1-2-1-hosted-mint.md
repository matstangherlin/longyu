# RC2.3.13R.3.1.2.1 — Typecheck Closure, Hosted Green & New Owner QA Candidate Mint

```text
NO FEATURE WAVE.
SINGLE BUILD BLOCKER → HOSTED GREEN → ONE APK → OWNER RETEST.
```

## Parent

| Field | Value |
| --- | --- |
| PR | https://github.com/matstangherlin/longyu/pull/347 |
| Title | RC2.3.13R.3.1.2 — Hosted Finalization, New Candidate Mint & Owner Regression Certification |
| Exact HEAD at R.3.1.2.1 start | `86c6c77cb7596c36a4aa8b71cfd29d45ded17c9c` |
| Branch | `cursor/rc2-3-13r3-1-2-1-hosted-mint-af1a` |

## Root cause

| Field | Value |
| --- | --- |
| Symbol | `selectedImageConceptIds` |
| File | `src/features/lesson/lessonTasks.ts` |
| Error | `TS6133` (declared but never read) |
| Why introduced | Earlier R.3.1.2 visual-repeat accumulation; after same-kind scoping, `violatesImageRepeat` compares `kind + conceptId` inline |
| Resolution | **REMOVED_DEAD_HELPER** (Outcome B) |
| Compiler weakening | Forbidden / not used |

Blocked workflows before fix: Release Truth, CodeQL Build → skipped beta suites / E2E / quality.

## Runtime

| Field | Value |
| --- | --- |
| `learnerRuntimeSha` | `b6fe91536daf3a8bdebde66f92ec50a03155fb4b` |
| Moved by TS6133 fix? | **No** — unused helper had no emitted selection effect |
| Current fingerprint | `29bb02ec0336` |
| Fingerprint note | `lessonTasks.ts` is `CURRICULUM_SOURCE`; dead-helper removal advances Journey hash; counts unchanged |

## Historical truth audit

Principle: **current runtime must not rewrite historical artifact truth.**

| Record | Fingerprint |
| --- | --- |
| RC1 dual-sha / owner device test | `57a848ef9ef9` (restored) |
| RC2 dual-sha / owner device test | `57a848ef9ef9` (restored) |
| Current runtime / Product Truth / R.3.1.2.1 cert | `29bb02ec0336` |

Bulk-replacing historical APK records with `29bb02ec0336` is a gate kill (`HISTORICAL_FINGERPRINT_OVERWRITTEN`).

## Hosted

| Check | State |
| --- | --- |
| Overall | **HOSTED_PENDING** |
| New Owner QA APK | **NOT_BUILT** until exact-head green |
| Targeted physical | **NOT_RUN** |

## Artifact

| Field | Value |
| --- | --- |
| Old APK | `STALE` `fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8` |
| New APK | NOT_BUILT |
| Channel | DEVICE_QA |

## Entry

```text
OWNER_QA_ENTRY = HOLD
PLAY_CLOSED_BETA_ENTRY = HOLD
PUBLIC_BETA_ENTRY = HOLD
Wave1 invited = 0
```

## Next

1. Exact-head hosted green (Release Truth, Security/CodeQL analysis, all beta suites, Android complete, Chromium/WebKit/Firefox).
2. Mint **ONE** Owner QA APK → new SHA256 ≠ stale.
3. Owner targeted seven-check matrix on that exact hash.
4. Only then resume full R.3.
