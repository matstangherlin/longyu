# RC2.2.5 — Journey Dragon Teacher Layer + Pedagogical Explanation UX

## Wait gate / merge provenance

| Field | Value |
|---|---|
| #276 state | **MERGED** (2026-09-18T20:00:47Z) |
| #276 title | RC2.2.4 — Public Beta Trust & Operations (NO-GO) |
| FINAL_276_HEAD / MAIN_BASE_SHA | `e7baf0f33b88e57be7224264ce63a2cc4f537fcc` |
| Ancestor check | `git merge-base --is-ancestor FINAL_276_HEAD HEAD` → **0** |
| Branch | `cursor/rc2-2-5-journey-dragon-teacher-5b4f` |
| Base | `main` (not stacked on #276 / #273 / prior open PRs) |
| CURRICULUM_FREEZE | `RC2_CONTENT_FREEZE` |
| Fingerprint before | `516692632525` |
| Fingerprint after | `516692632525` |

Public Beta remains **NO-GO** — #273 / candidate cloud still pending. This remessa does not invent operational PASS.

---

## Idea

The Longyu dragon is the **teacher**, not decoration. On Journey, it speaks only when there is a pedagogical function (handoff / explanation / system guidance). Graded prompts, XP, buttons, and headers stay normal UI.

---

## JOURNEY_EXPLANATION_SURFACES (audit)

| Surface | Class | Action |
|---|---|---|
| `HANDOFF_LINES` (4 boosters) | PEDAGOGICAL_HANDOFF | **Converted** → `JourneyGuideExplanation` → `GuideDialogue` |
| Lesson `StepIntro` / `guideMessagesFromExistingBody` | PEDAGOGICAL_EXPLANATION | **Preserved** (already GuideDialogue) |
| `lockedHint` / `lockedLessonMessage` | SYSTEM_GUIDANCE | **Aligned** visually (Mascot + bubble toast); still temporary, non-blocking, no Continuar machine |
| `currentObjective` / theme checkpoints | SYSTEM_GUIDANCE / NORMAL_UI_COPY | **Not converted** (noise if dragon speaks on every open) |
| Culture Moment card (eyebrow/title/summary/CTA) | NORMAL_UI_COPY (+ light explanation) | **Not converted** — culture lesson already uses GuideDialogue |
| Inline labels, XP, badges, CTAs | NORMAL_UI_COPY | **Not converted** |

### Surfaces intentionally NOT converted

- Journey header objective
- All Culture Moment summaries as dragon speech
- Graded questions / exercise prompts
- Capsule / booster page intros (out of trail Teacher Layer scope)

---

## Implementation

| Piece | Path |
|---|---|
| Thin wrapper | `src/features/journey/JourneyGuideExplanation.tsx` |
| Handoffs | `src/features/journey/JourneyInlineNode.tsx` (`HANDOFF_LINES` authority) |
| Canonical dialogue | `src/components/guide/GuideDialogue.tsx` |
| Machine / motion | `src/lib/guideDialogueMachine.ts`, `src/lib/guideDialogueMotion.ts` |
| Canonical mascot | `src/components/brand/Mascot.tsx` + `public/longyu-mascot.png` |

### Converted handoffs (PT + EN preserved)

1. Tone Trainer (`booster:tone-contour-1-3:v1`)
2. Pinyin Practice (`booster:pinyin-practice:v1`)
3. Hànzì Builder (`booster:hanzi-builder-foundations:v1`)
4. First Conversation (`booster:first-conversation:v1`)

### Behavior contract

- `size="compact"` · existing entrance + typewriter
- Continuar while TYPING → complete text only
- Continuar while COMPLETE → DONE → collapse bubble only
- Rapid double-click guarded (`GUIDE_ADVANCE_GUARD_MS`)
- Activity card remains a sibling `Link` (clickable during typing)
- No auto-navigation into Tone / Pinyin / Hanzi / Conversation
- Reduced motion → instant text, no entrance/typewriter
- AT: full sentence via `aria-label` + polite live region (not char-by-char)

### Forbidden (not created)

`GuideDialogue2`, `DragonDialogue`, `TeacherMascot`, `MascotTeacher`, `GuideEngineV2`, `DialogueMachine2`, second mascot asset.

---

## Pedagogy gap baseline

Created: `docs/reports/public-beta-pedagogy-gap-baseline.md`

| Snapshot | Value |
|---|---|
| Conversation capabilities | 31 total · 20 READY · 11 PARTIAL |
| PARTIAL list | talk_family, order_food, order_drink, negotiate_basic, pay, use_metro, use_train, ask_for_help, ask_repeat, express_preference, make_simple_plan |
| Tone tasks | 190 · awareness 32 · contour 85 · number 42 · mark 13 · production 5 · **transfer 0** |

No capability status flipped. No Tone Transfer content added.

---

## Frozen counts

| Metric | Before | After |
|---|---|---|
| Core lessons | 134 | 134 |
| Teaching topics | 113 | 113 |
| CultureItems | 30 | 30 |
| Culture Native Lessons | 30 | 30 |
| Journey Culture nodes | 20 | 20 |
| Culture Moments | 5 | 5 |
| Fingerprint | 516692632525 | 516692632525 |

---

## Gates / tests

| Script | Role |
|---|---|
| `validate:journey-guide-explanations` | Static Teacher Layer contract |
| `test:journey-guide-explanations` | HANDOFF_LINES + machine + fingerprint + PARTIAL honesty |
| `validate:guide-dialogue-contract` | Extended to assert Journey reuses GuideDialogue |
| E2E `e2e/guided-journey-culture.spec.ts` | Tone handoff Continuar×2, EN+reduced motion, Pinyin/Hanzi/Conversation, WebKit |

Also expected in CI: `typecheck`, `validate:beta`, `build`, `test:guide-dialogue`, `validate:journey-culture-moments`, `gate:mobile-pwa-preflight`, `gate:human-qa-prebeta`, `gate:public-beta-operations`, Security.

---

## Verdict

**Public Beta: NO-GO** (unchanged).  
Reason: candidate cloud / #273 still pending. RC2.2.5 is presentation-only pedagogy UX.
