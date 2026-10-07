# RC2.3.4A — Hànzì Android / Physical Acceptance Contract

Goal: hand the owner a ready APK + checklist. **Nothing here promotes a level automatically.**

## Status model (each level is independent; none implies the next)

| Level | Status | Evidence |
|---|---|---|
| `CODE_PASS` | **PASS** | `gate:rc2-3-4-hanzi-writing` — eligibility validator + 12/12 mutations, geometry, pointer state-machine unit tests |
| `WEB_PASS` | **PASS** (Chromium, local) | `e2e/rc2-3-4a-hanzi-writing-acceptance.spec.ts` — 9/9 green at 360×640, 375×667, 390×844 (run 2026-10-07 in the audit container; CI will re-run on the PR) |
| `ANDROID_BUILD_PASS` | **PASS for #314 parent** · pending for this PR | Workflow "Android foundation (contratos + debug APK/AAB)" SUCCESS on `9819607` (run 37098442288, job 111133039697) |
| `APK_GENERATED` | **PASS for #314 parent** · candidate for this PR comes from its own Android run | artifact `longyu-android-debug-0.2.0-beta.1-ff5ae88` (id 11264584668, 43.6 MB, expires 2026-10-10) |
| `EMULATOR_PASS` | **PASS (generic runtime) for #314 parent** — not Hànzì-specific | "Android runtime (emulator + connectedDebugAndroidTest)" SUCCESS on `9819607` (job 111135349954). It does not exercise the writing canvas. |
| `OWNER_PHYSICAL_PASS` | **NOT_RUN** | Requires the owner on a real device with the checklist below |

`APK_PASS` and `OWNER_PHYSICAL_ACCEPTANCE` are **not** promoted by Android Build passing.

## Automated coverage (what is proven, what is not)

| Item | Covered by | Result |
|---|---|---|
| pointer down / move / up, multi-event stroke | E2E (mouse → pointer events, 16 move steps) | PASS ×3 viewports |
| clear, second stroke after clear (no pointer lock / stale overlay) | E2E | PASS ×3 |
| undo | Button present (`hanzi-writing-undo`); behaviour only in the pointer unit test | PARTIAL |
| guide / guide fading | `guideLevelForStage` unit logic; visual fade not asserted | PARTIAL |
| completion | `HanziWritingExercise.finishCharacter` → `onComplete`; not reachable by a synthetic straight stroke | NOT_RUN (owner checklist) |
| wrong / incomplete interaction | E2E straight stroke yields feedback (`hanzi-writing-feedback`) | PASS ×3 |
| orientation / safe area | canvas fully inside viewport width asserted; rotation not tested | PARTIAL |
| scroll containment | `touch-action: none` on the canvas wrapper + `window.scrollY` unchanged during the stroke | PASS ×3 |
| Memory: glyph really hidden | `hanzi-writing-glyph` count 0 at `MEMORY_WRITE` | PASS ×3 |
| Memory: prompt understandable | `hanzi-memory-prompt` visible | PASS ×3 |
| Memory: canvas responds, clear | E2E | PASS ×3 |
| Memory: progression | locked without a recorded correct trace; open with one (seeded evidence) | PASS |
| Eligibility (no premature writing) | fresh learner sees no writing exercise; taught-but-untraced learner sees memory locked | PASS |

Note: the pre-existing `test:hanzi-writing-pointer` validates a **mirror state machine**, not the React canvas. It is kept, but WEB evidence comes from the E2E above.

## Android WebView — not automatable here

Cold start, resume, background/foreground, canvas after resume, touch after audio, touch after modal, no page scroll while writing, no pointer lock, no stale overlay — **NOT_RUN** on a device. The emulator job proves the app boots and the generic WebView runtime contracts; it does not drive the writing canvas.

## Haptics (existing `haptic()` infrastructure)

| Event | Haptic | Policy |
|---|---|---|
| stroke accepted | `piecePlaced` | allowed |
| character complete | `answerCorrect` | allowed (meaningful success) |
| stroke rejected | `answerWrong` (once per pointer-up) | owner judgement — feedback on a wrong stroke, not per pointer event |
| pointer move / drawing | none | ✔ (`HanziWritingCanvas.tsx` has no haptic import) |
| scroll / navigation | none | ✔ |

Observation for the owner: the last accepted stroke fires `piecePlaced` and then `answerCorrect` back-to-back.

## Device QA panel

`HanziWritingQaPanel` lives under `/qa/device`, which renders only when `deviceQaEnabled()` (DEV, fixtures, `VITE_DEVICE_QA=true`, or `preview`/`qa_candidate`). Netlify production sets `VITE_APP_ENV=production_beta` → **not visible to learners**.

## Owner checklist (real Android device)

Install the APK from this PR's "Android foundation" run (or the parent artifact above while it lasts). Complete *Montando primeiros hànzì* first — writing is locked before that, by design.

### TRACE (Ideogramas → Traçar)
- [ ] 人
- [ ] 口
- [ ] 木
- [ ] 水
- [ ] a multi-stroke character (中 or 火)
- [ ] guide is readable; ghost fades on the second attempt
- [ ] a wrong stroke gives feedback; Undo removes it

### MEMORY (Ideogramas → Memória, after one correct trace)
- [ ] glyph hidden, meaning prompt understandable
- [ ] draw
- [ ] clear / retry
- [ ] completion visible

### UX
- [ ] no page scroll while drawing
- [ ] Hànzì large and legible
- [ ] haptics sensible (no buzz while drawing)
- [ ] completion visible
- [ ] app background → foreground: canvas still draws
- [ ] after playing audio / closing a modal: canvas still accepts touch

Record device model, Android version, APK artifact id and date next to each box. Only then can `OWNER_PHYSICAL_PASS` be claimed.
