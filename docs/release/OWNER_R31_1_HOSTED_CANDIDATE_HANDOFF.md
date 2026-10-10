# Owner handoff — RC2.3.13R.3.1.1 Hosted Candidate

## Status (engineering)

| Item | State |
| --- | --- |
| R.3.1 learner fixes in source | YES |
| Hosted green on exact R.3.1.1 HEAD | PENDING until CI completes |
| New Owner QA APK | **NOT_BUILT** |
| New SHA256 | unknown until build |
| Old APK `fb835ce8…` | **STALE — do not install for this retest** |
| `R31_TARGETED_PHYSICAL_RETEST` | **NOT_RUN** |
| OWNER_QA_ENTRY | HOLD |
| PLAY_CLOSED_BETA_ENTRY | HOLD (signing secrets still blocked) |
| PUBLIC_BETA_ENTRY | HOLD |
| Wave 1 invite | **0** |

## When the new APK lands

1. Install **only** the APK whose SHA256 is recorded in `/qa/device` and `docs/release/rc2-3-13r3-1-1-hosted-candidate-rebuild.json` (`newOwnerQaApk`).
2. Reject any build still hashing to `fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8`.

## Targeted physical retest (before full R.3 matrix)

1. **Zero `EXERCÍCIO PULADO`** — sample early/core/review paths (not only one lesson).
2. **`我叫` + account name** — Chinese prefix + name both audible, no clipping (try Matheus / Ana / João / André / Maria Clara when possible).
3. **Dialogue audio** — including `不客气`; complete playback + replay.
4. **Personalized MCQ** — correct answer not identifiable solely as the only option with the learner name.
5. **Visual variety** — sequential visual-association; no purposeless same-person reuse.
6. **Hànzì mobile fit** — 360-class viewport; pieces + primary CTA reachable without large empty canvas scroll.
7. **Audio ×20** — 5 words + 5 phrases + 5 dialogue lines + 5 personalized/complex; pass = human hears the complete utterance (not button-only).

Only owner/real-device evidence may set `R31_TARGETED_PHYSICAL_RETEST = PASS`.

## After targeted PASS

Resume full RC2.3.13R.3 physical & operational certification (Guided Try ×10, Speech ×5, Conversation ×5, Hànzì, Review, Dynamic Aula, a11y, session, OAuth, Play signed AAB, then 10 testers).
