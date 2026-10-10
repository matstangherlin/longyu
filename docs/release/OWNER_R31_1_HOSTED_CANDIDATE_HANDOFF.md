# Owner handoff — RC2.3.13R.3.1.2 Candidate

## USE THIS APK

```text
Artifact:     NOT_BUILT (waiting exact-head hosted green on #346 / R.3.1.2)
Version:      pending Android mint
versionCode:  pending (floor + firstParent at build)
Source:       pending artifactSourceSha
SHA256:       pending
Fingerprint:  cc66373bb602
Channel:      DEVICE_QA
```

## DO NOT USE

```text
fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8
```

That hash is **STALE_FOR_CURRENT_RUNTIME** (pre-R.3.1 / #344 candidate).

---

## Status (engineering)

| Item | State |
| --- | --- |
| R.3.1 + R.3.1.1 learner fixes in source | YES |
| Parent #346 HEAD | `5e2519fe…` |
| Hosted green on exact HEAD | **PENDING** (Release Truth + Security PASS; beta/Android/E2E in flight) |
| New Owner QA APK | **NOT_BUILT** |
| New SHA256 | unknown until build |
| Old APK `fb835ce8…` | **STALE — do not install** |
| `learnerRuntimeSha` | `719ce024…` (pure audio helper + EN overlays) |
| `R31_TARGETED_PHYSICAL_RETEST` | **NOT_RUN** |
| OWNER_QA_ENTRY | HOLD |
| PLAY_CLOSED_BETA_ENTRY | HOLD (signing secrets still blocked) |
| PUBLIC_BETA_ENTRY | HOLD |
| Wave 1 invite | **0** |

## Targeted physical retest (only on the new APK)

1. **Zero `EXERCÍCIO PULADO`** — early/core/review paths.
2. **`我叫` + account name** — prefix + name audible, no clipping (Matheus / Ana / João / André / Maria Clara).
3. **Dialogue audio** — including `不客气`; complete + replay.
4. **Personalized MCQ** — correct answer not sole name-bearing option.
5. **Visual variety** — no purposeless same-person reuse.
6. **Hànzì mobile fit** — 360-class; pieces + CTA reachable.
7. **Audio ×20** — 5+5+5+5; pass = human hears complete utterance.

Only owner/real-device evidence may set `R31_TARGETED_PHYSICAL_RETEST = PASS`.

## After targeted PASS

Resume full RC2.3.13R.3 physical & operational certification — not Wave 1 yet.
