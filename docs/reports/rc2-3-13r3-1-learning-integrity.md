# RC2.3.13R.3.1 — Physical Learning Integrity

NO FEATURE WAVE. NO CURRICULUM EXPANSION. REAL-DEVICE P1/P2 PRE-BETA CORRECTIONS ONLY.

## Freeze exception

`PRE_BETA_FREEZE_EXCEPTION` · reason `REAL_DEVICE_BETA_BLOCKER_FIX`

Counts preserved: 134 lessons · 113 topics · 36 CultureItems · 36 native · 20 Journey Culture nodes · 12 paths.

## Fingerprint

`fea5455e1461` → `29bb02ec0336` because `lessonTasks.ts` is a CURRICULUM_SOURCE (visual variety / plan selection). Counts unchanged.

## Root causes found

| Finding | Root cause | Fix |
|---------|------------|-----|
| `EXERCÍCIO PULADO` on review | `l14-char-rev` recognize steps lacked `charId` | Add `charId: wo/ni/shi` |
| Skip for learner named Ana | `["Ana","Matheus",…]` → duplicate after personalize | `personalizeChoiceList` collision alternate |
| Personalized MCQ leak | Only correct option contained learner name | `repairNameOnlyAnswerLeak` + name-carrying distractors |
| `我叫 Name` silent/cut | FIXED_CONTENT without exact asset → no TTS | `PERSONAL_UTTERANCE` → DYNAMIC before LESSON |
| Hanzi pieces below fold | 260×260 empty canvas @ 360×640 | `max-h-[min(42svh,220px)]` + auto-compact ≤667px |
| Visual repetition | authored image steps exempt from dedupe | `violatesImageRepeat` covers all visual steps |

## Gates

- `validate:canonical-activity-integrity`
- `validate:distractor-quality`
- `gate:rc2-3-13r3-1-learning-integrity` (≥80 mutations)

## Entry

`OWNER_QA_ENTRY` / `PUBLIC_BETA_ENTRY` / `PLAY_CLOSED_BETA_ENTRY` = **HOLD** until hosted green + new APK + physical retest.
