# Closed Beta — operations (RC2.3.13)

## Hard rule

**No real testers until `npm run gate:closed-beta-entry` prints `CLOSED_BETA_ENTRY=GO`.**

`OWNER_ACTION_REQUIRED`, `NO_GO`, and `CODE_READY` are **not** GO.

## Dual SHA

| Identity | Field | Meaning |
|---|---|---|
| Artifact | `artifactSourceSha` | Code inside the RC1 APK/AAB |
| Certification | `certificationHeadSha` | Docs/gates/hashes on the orchestration commit |

See `docs/release/rc-dual-sha.json`. Do not confuse them.

## Cohorts

| Wave | Size | Gate |
|---|---|---|
| 1 | 10 | requires Beta Entry GO |
| 2 | 50 total | `gate:beta-wave2-entry` |
| 3 | 200 total | `gate:beta-wave3-entry` |

Commercial mode: **FREE_ONLY**. Live billing / Play purchase: **OFF**.

## Owner physical

`docs/release/OWNER_DOWNLOAD.md` + `docs/release/OWNER_RC1_DEVICE_TEST.md`
