# OWNER_RC_LEARNING_FLOW_TEST — Physical device checklist

## Install this build (read first)

| Field | Value |
| --- | --- |
| **APK label** | **DEVICE-QA — NOT FINAL BETA** |
| **What this is** | Internal physical QA APK for RC2.3.13D |
| **What this is NOT** | Not RC2 · Not RC3 · Not RC4 · Not final beta · Not Play production |
| **RC4 designated** | `RC2.3.12-RC4` / `0.2.0-rc.4` — canonical artifacts still **NOT_BUILT** |
| **APK to install** | _(fill after DEVICE-QA is built)_ workflow artifact name + download URL |
| **sourceSha** | _(fill)_ exact git SHA of #334 DEVICE-QA build |
| **buildSha** | _(fill)_ |
| **version / versionCode** | _(fill)_ |
| **APK SHA256** | _(fill)_ |
| **Install mode** | Prefer **clean install** (uninstall Longyu first). Also run one **upgrade** from prior usable RC. |

Until `docs/release/rc2-3-13d-device-qa.json` → `artifact.status = BUILT`, **do not install an older RC and call it DEVICE-QA.**

**Waves:** RC2.3.13C learning flow · **RC2.3.13D** device UX  
**Do not mark `OWNER_DEVICE_UX_ACCEPTANCE=PASS` from browser, emulator, or CI alone.**

## Setup

1. Uninstall Longyu completely  
2. Install **DEVICE-QA — NOT FINAL BETA** (record SHA / versionCode)  
3. Launch → create/login → basic smoke  
4. Separately: upgrade path from previous RC → same QA build (account/progress/Mastery/Review preserved; no duplicate rewards)  
5. Network on; then repeat key paths offline  
6. Device classes: SMALL 360 · COMPACT 375 · TARGET 390 (see `docs/ux/mobile-device-matrix.md`)

## Audio (20 plays)

Record each as PASS/FAIL (not “seems okay”).

1–20. Include first play, replay, rapid replay, lesson, Guided Try, conversation, background/resume. Confirm:
- Visual STARTING / PLAYING / ready-replay / failure-recovery
- Continuar disabled reason until heard (Guided Try)
- No dead button
- On technical audio failure: recovery UI; not scored as wrong

## Guided Try (10)

1–10. Full flows: audio → Continuar becomes available correctly. Target 10/10. Progression block = P1.

## Conversations (5)

1–5. Complete entire conversations (not only first turn). Confirm phase chrome, Turn N of M, audio, input, keyboard, Check, Continue, next turn, completion. Target 5/5.

Background one conversation → return must preserve turn.

## Speech (5)

1–5. Model audio → record → stop → self playback → retry → continue.  
Mic: Allow / Deny / Deny permanently / re-enable via Settings — learner never trapped.  
Technical failure: no mastery penalty, no “pronunciation wrong”, recovery available.

## Hànzì (stages)

Recognize · Components · Assemble · Complete · Trace · Produce.  
Canvas large enough; `touch-action: none` (no page pan while drawing); tools secondary; Continuar does not cover canvas.  
Stroke tests: slow, fast, edge, multi-segment.

## Review

Hub Start → grade with semantic labels (Errei / Difícil / Bom / Fácil) → next → completion → return.

## Victory / Completion

Ability-first message · one dominant next CTA · gamification secondary · no Store/League interrupt.

## Home (physical)

Continue visible · one dominant CTA · Today for You subordinate · bottom nav reachable · no safe-area overlap · no horizontal scroll.

## Safe area / Keyboard / Back

- Top: status bar / cutout / toolbar  
- Bottom: gesture bar or 3-button · TabBar · fixed learning CTA  
- Keyboard: login, text answer, conversation, feedback — field + primary CTA visible; Back closes IME first  
- Back: modal → dismiss; sheet → dismiss; step 0 → exit contract; mid-lesson → confirm; speech recording → no corruption; completion → no duplicate reward

## More Options / Account

13A redesign: tappable rows, clear grouping, Logout secondary + confirm, Back closes sheet.  
Account: Profile · Security · Notifications · Appearance · Language · Help · Privacy · Terms · Logout · Danger zone — Logout ≠ Delete Account.

## Font / display scale

Default · large · largest practical on Home, More Options, Conta, Lesson, Speech, Conversation, Hànzì, Review, Victory. Flag clipping. Larger display scale: critical actions reachable.

## TalkBack / reduced motion / theme

Meaningful labels (not bare “button”). Focus order logical; no trap behind overlays. Reduced motion: flow understandable. Dark mode + system theme switch if supported.

## Offline / background / long session

Online → airplane → safe local → reconnect (progress retained, sync resumes, no duplicate rewards).  
Background/resume: Home, lesson, audio, Speech, conversation, Hànzì.  
~30 min normal use: note jank/heat/latency qualitatively — do not invent metrics.

## Result matrix

| Item | Result | Evidence / notes |
| --- | --- | --- |
| CLEAN_INSTALL | | |
| UPGRADE | | |
| Audio ×20 | | |
| Guided Try ×10 | | |
| Conversations ×5 + bg | | |
| Speech ×5 + mic | | |
| Hànzì stages + gesture | | |
| Review | | |
| Victory | | |
| Safe area / keyboard / Back | | |
| Font / display scale | | |
| TalkBack / reduced motion | | |
| Offline / resume / 30min | | |
| OWNER_DEVICE_UX_ACCEPTANCE | NOT_RUN until owner executes | |

Owner: ________  Date: ________  Device class: ________  Android: ________  
APK SHA256: ________  sourceSha: ________
