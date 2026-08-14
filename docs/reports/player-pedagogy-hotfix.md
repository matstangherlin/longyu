# Player Pedagogy Hotfix (V3.5)

Branch: `cursor/pedagogy-v35-hotfix-ca32`  
Base: `main` @ `475b9cac1727ba6f72233d52ba079e8124fef30e`

## Problem

Mastery V3–V3.4 certified 46/46 eligible normal lessons, but perceived UX still showed:

- Ambiguous / impossible Hànzì sentence fills (你__ with 女/子/木/口)
- Possible state leakage between builders
- Hànzì builder stacks
- Tone UI overloaded before answer
- Conversation rotation stuck on 你好 / 再见
- Autoplay silence without feedback

## What shipped

### P0 — Hànzì integrity

- `hb-hao-sentence`, `hb-ni-sentence`, `hb-ming-sentence` now use **whole-character selection** (option A), not component montage disguised as fill-blank.
- `hb-hao-components` remains the explicit 女+子 composition exercise.
- Integrity helpers: `requiredPieceIds`, `renderedPieceBankIds`, `validateHanziBuilderIntegrity`.
- `npm run test:hanzi-builder-integrity` (wired into `validate:beta`).
- Remount `key` on `HanziBuilderExercise` + pool keyed by `builder.id`.

### P1 — Variety

- Planner: max same kind consecutive = 1; hanzi family ≤2 / window of 5; tone spacing.
- `balanceLessonPlan()` post-process on base plans and mastery passes.
- Reports: `docs/reports/stepkind-runtime-distribution.md`
- Runtime QA: `npm run test:pedagogy-runtime-qa`

### Tone

- Initial UI: big listen + “Qual tom?” + numbered choices only.
- Curves / translation / theory behind progressive disclosure (“Entender o tom”).
- Guided default: 2-tone contrast (1 vs 4 style).

### Conversation + audio

- Stronger penalties for seed intents / repeated mainAnswer (CONV-026).
- Existing richer scenes (`me-apresentando`, `como-se-chama`, food/shop/survival) promoted by scoring instead of unused catalog stubs.
- Autoplay highlight (“Toque para ouvir”) when browser blocks TTS.
- Report: `docs/reports/conversation-runtime-progression.md`

### Perf

- Documented status: `docs/reports/activity-start-performance.md`
- Existing shell-first + `startTransition` plan kept; device freeze still needs manual QA.

## Acceptance checklist

| # | Criterion | Status |
| --- | --- | --- |
| 1 | Activity open freeze | Partial — shell-first exists; **manual device QA still required** |
| 2 | 好 never gets impossible bank | Done (integrity test) |
| 3 | Consecutive builders don’t inherit pieces | Done (remount key + reset) |
| 4 | No 3× same family streak (non-dedicated) | Done (planner + runtime QA) |
| 5 | Tone exercise simple first interaction | Done |
| 6 | conversation_scene tries autoplay | Done (+ blocked highlight) |
| 7 | Richer early dialogues | Improved (new scene + scoring) |
| 8 | 你好/再见 dominance reduced | Improved (penalties + report gate) |
| 9 | New StepKinds appear in runtime | Report generated |
| 10 | Manual QA desktop+Android+iPhone | **Pending human QA** |

## Follow-ups (V3.6 if needed)

- More authored conversation content beyond selection fixes
- Persist/precompute structure-exposure index for cold open
- Gradual tone levels 2–4 wired to mastery pass
