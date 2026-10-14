> **SUPERSEDED by RC2.3.13R.3.2.3** — use `docs/release/OWNER_R32_3_JOURNEY_SVG_HANDOFF.md`.
> No R.3.2.2 / #353 Device-QA APK was minted; the next and only candidate is the R.3.2.3 APK.

# USE THIS APK

```text
File:         NOT_BUILT (waiting exact-head hosted green on R.3.2.2)
RC:           pending Android mint
Version:      0.2.0-rc.5 (package.json; confirm at mint)
versionCode:  pending (floor + firstParent at build; local preview ≈ 683)
Source:       pending artifactSourceSha
SHA256:       pending
Fingerprint:  29bb02ec0336
Channel:      DEVICE_QA
learnerRuntimeSha: 053983abf3b12463d0f3471368c99d8ccb2dbb2e (advanced by R.3.2.3, then R.3.2.4)
```

# DO NOT USE

```text
fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af
fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8
```

Those hashes are **STALE_FOR_CURRENT_RUNTIME** (predate Culture topic hierarchy + visual polish + R.3.2.2.1 harden).

---

## Status (engineering)

| Item | State |
| --- | --- |
| Tip | PR **#353** @ `01f9ff17…` |
| Parent framework | PR #352 |
| `learnerRuntimeSha` | `0357f824…` (R.3.2.2.1 Journey/Culture runtime harden) |
| Fingerprint | `29bb02ec0336` |
| Hosted green on exact HEAD | **PENDING** (E2E contracts + runtime harden landed; waiting tip CI) |
| New Device-QA APK | **NOT_BUILT** |
| Targeted physical | **NOT_RUN** |
| Final visual owner acceptance | **NOT_RUN** |
| `JOURNEY_CULTURE_VISUAL_FREEZE` | pending owner acceptance |
| OWNER_QA_ENTRY | HOLD |
| PLAY_CLOSED_BETA_ENTRY | HOLD |
| PUBLIC_BETA_ENTRY | HOLD |
| Wave 1 invite | **0 / 10** |

## Owner physical + visual retest (after install of the exact new APK)

### Previous R.3.1 blockers

1. Zero normal `EXERCÍCIO PULADO`
2. Full `我叫 + name` audible
3. Full dialogue audio incl. `不客气`
4. Fair personalized distractors
5. Visual variety (no same-image loop)
6. Hànzì small-screen fit
7. Audio ×20 (human-audible complete playback)

### Final visual acceptance

1. Culture root: rectangular cards, consistent icons, no root bubbles / chips / Trocar
2. Topic detail: header, progress, Continue, subtopics, bubbles
3. Progression: single vertical axis, connectors meet centers
4. Ornaments: left/right alternate, subtle, non-interactive, reduced-motion calm
5. Journey: learning-first; ornaments not distracting
6. Reduced motion: ornaments stop/minimize; layout intact
7. Navigation: Culture root ↔ topic ↔ back; Journey ↔ Culture restore

**Playwright / emulator cannot set `FINAL_VISUAL_OWNER_ACCEPTANCE = PASS`.**
