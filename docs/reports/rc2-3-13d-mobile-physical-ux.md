# RC2.3.13D — Mobile Accessibility & Physical UX Hardening

## Status

**CODE + EMULATED proof ready.** Physical DEVICE-QA blocked until parent **#333** Chromium E2E + cross-engine are SUCCESS, then #334 hosted green on exact SHA.

| Check | SHA | Truth |
| --- | --- | --- |
| Parent #333 | `e8f4090ba81d84b8a8a1cb92787135c502f1457b` | Security/Android/beta/quality green; **Chromium E2E + cross-engine still pending** |
| #334 | (this branch) | Security/Release truth green; beta suite flake on ffmpeg CDN 500 mitigated; physical **NOT_STARTED** |

## Hosted

- Do not treat #333 green as #334 evidence.
- Exact SHA only for DEVICE-QA minting.

## DEVICE-QA artifact

| Field | Value |
| --- | --- |
| Label | `DEVICE-QA — NOT FINAL BETA` |
| Status | **NOT_BUILT** |
| sourceSha / APK SHA256 | null until real pipeline |

## RC4 truth

| Item | Value |
| --- | --- |
| Designated identity | `RC2.3.12-RC4` / `0.2.0-rc.4` (13C) |
| Canonical artifacts | **NOT_BUILT** — `docs/release/rc2-3-12-rc4-identity.json` |
| Live candidate | still `RC2.3.12-RC2` / `0.2.0-rc.2` |

QA artifact ≠ RC artifact. Do not mint RC4 for DEVICE-QA.

## Vocabulary

`CODE_PASS` · `EMULATED_PASS` · `PHYSICAL_PASS` — never promote code → physical.

## Automated proof (Phase 1)

- `gate:rc2-3-13d-mobile-physical-ux` → **20/20** mutation kills
- Emulated E2E `e2e/rc2-3-13d-mobile-physical-ux.spec.ts` → **4/4** (360×640, 375×667, 390×844, 390×420 keyboard-like)
- Cert matrix: CODE_* → **PASS**; VIEWPORT_* → **EMULATED_PASS**; all `*_PHYSICAL_*` / `OWNER_DEVICE_UX_ACCEPTANCE` → **NOT_RUN**
- CI hardening: `scripts/ci/install-ffmpeg.sh` (BtbN latest → pinned → johnvansickle → apt)

## Devices / Safe areas / Keyboard / Back / Touch / Font / TalkBack

Physical rows: **NOT_RUN**. Code contracts: safe-area, conversation dock, Back confirm, touch targets, Hànzì canvas — gate-covered.

## Audio / Guided Try / Conversation / Speech / Hànzì / Review / Lifecycle / Offline / Long session

Physical: **NOT_RUN**. Owner pack: `docs/release/OWNER_RC_LEARNING_FLOW_TEST.md`.

## Bugs found

| Id | Severity | Notes |
| --- | --- | --- |
| HOSTED_FFMPEG_CDN_500 | P2 infra | pedagogy-mastery failed on BtbN HTTP 500; mitigated in workflow |

## Bugs fixed

- Workflow ffmpeg install resilience (no learner code change).

## Remaining known issues

- #333 E2E not terminal → no DEVICE-QA mint yet
- All physical matrix rows open
- `OWNER_DEVICE_UX_ACCEPTANCE` requires owner/device execution

## Exit

Current: **OWNER_ACTION_REQUIRED** for parent E2E terminal + DEVICE-QA build + physical checklist. Not **PASS**.

## Freeze

Curriculum · Mastery math · SRS · JEV OFF · billing · sibling projects unchanged. No #335 / 13E until 13D physical closure.
