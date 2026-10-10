# RC2.3.13R.3.1.2 — Hosted Finalization, New Candidate Mint & Owner Regression Certification

```text
NO FEATURE WAVE.
NO CURRICULUM EXPANSION.
NO UI REDESIGN.

HOSTED → ARTIFACT → PHYSICAL PROOF ONLY.
```

## Parent

| Field | Value |
| --- | --- |
| PR | https://github.com/matstangherlin/longyu/pull/346 |
| Title | RC2.3.13R.3.1.1 — Hosted Closure, Candidate Rebuild & Targeted Physical Retest |
| Exact HEAD at R.3.1.2 start | `5e2519fe1b762f50887041f43b3aac7c969183ad` |
| Branch | `cursor/rc2-3-13r3-1-2-artifact-targeted-retest-af1a` |

## Hosted (re-query)

| Check | State at scaffold |
| --- | --- |
| Release Truth | PASS |
| Security (gitleaks / npm audit / CodeQL Build / Analysis) | PASS |
| CI beta suites | IN_PROGRESS |
| Android foundation | IN_PROGRESS |
| Chromium / WebKit / Firefox | not started until beta green |
| Overall | **HOSTED_PENDING** — do not mint Owner QA APK yet |

Run IDs (HEAD `5e2519fe`):

- Security `38020180274`
- CI `38020180279`
- Android `38020180280`

## Learner runtime SHA

| Commit | Role |
| --- | --- |
| `c68dc428…` | R.3.1 product fixes (skips, distractors, PERSONAL audio, Hanzi, visuals) |
| `719ce024…` | R.3.1.1 pure `personalizedUtterance` helper + EN overlays |
| `b6fe9153…` | **Final learnerRuntimeSha** — `violatesImageRepeat` same-kind only (compare_with_image + image_choice may share concept; fingerprint `cc66373bb602`) |
| `3c847a1b` / `5e2519fe` | Gates/docs only — do not move learnerRuntimeSha |

## Local unblock (pre-push)

Parent #346 HEAD `5e2519fe` hosted red on:

- `Beta suite pedagogy-progression` → `validate:compare-with-image` (authored compare blocked by same-concept image_choice)
- `Beta suite android-foundation` / Android foundation → stale `audit:rc2-2-24-native-step-parity` inventory

R.3.1.2 local proof before mint:

- `validate:compare-with-image` PASS
- `pedagogy-progression` PASS (858s)
- `gate:android-native-foundation` PASS · fp `cc66373bb602`
- R.3.1 = 88 kills · R.3.1.1 = 61 kills · R.3.1.2 = 72 kills

## Fingerprint / counts

- fingerprint `cc66373bb602` (typed advance 57a848ef9ef9 → cc66373bb602 via `PRE_BETA_FREEZE_EXCEPTION_R312`)
- lessons 134 · topics 113 · CultureItems 36 · Culture paths 12


## Learning integrity (exact-head local)

| Gate | Result |
| --- | --- |
| `validate:canonical-activity-integrity` | PASS · lessons=134 · personalizedChecks=137960 · invalid=0 |
| `validate:distractor-quality` | PASS · nameLeak=0 |
| R.3.1 / R.3.1.1 / R.3.1.2 kills | 88 / 61 / 72 |

## Artifact

| Field | Value |
| --- | --- |
| Old Owner QA APK | `STALE` `fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8` |
| New Owner QA APK | **NOT_BUILT** until exact-head hosted green |
| RC identity | Deferred until Android mint (`distributed=false` allows RC1 draft regen; versionCode computed at build) |

## Targeted physical

`R31_TARGETED_PHYSICAL_RETEST = NOT_RUN`

All seven checks default NOT_RUN. PASS requires owner/device evidence on the **new** APK only.

## Gate

`gate:rc2-3-13r3-1-2-artifact-targeted-retest` — ≥70 mutation kills.

## Next

1. Exact-head hosted green (all beta + Android + Chromium + WebKit + Firefox)
2. Mint ONE Owner QA APK + SHA256 + provenance
3. Update `/qa/device` + owner handoff
4. Owner targeted retest (NOT auto-PASS)
5. Resume full R.3 only after targeted PASS
