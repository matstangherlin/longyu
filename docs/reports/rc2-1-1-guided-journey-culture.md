# RC2.1.1 — Guided Journey UX + Culture Moments

## Stack

| Field | Value |
|---|---|
| STACK_BASE_SHA | `7acd074fc3a66b247d53eb039ccd248ac5a70837` (#268 inherited HEAD) |
| Branch | `cursor/guided-journey-culture-5b4f` |
| PR base | `cursor/rc2-candidate-cloud-5b4f` (not `main`) |
| CURRICULUM_FREEZE | `RC2_CONTENT_FREEZE` |
| Fingerprint before | `516692632525` |
| Fingerprint after | `516692632525` |

#268 remains Candidate cloud = BLOCKED / `release_candidate_sha=""`. This remessa is presentation-only and does not invent cloud PASS.

## P0 — Canonical guide asset

| Field | Value |
|---|---|
| CANONICAL_GUIDE_ASSET | `public/longyu-mascot.png` via `src/components/brand/Mascot.tsx` |
| Decision | REUSE — no Mascot2 / GuideDragon |

Audited: `src/assets`, `public/`, branding, onboarding, Journey empty states. Existing Longyu mascot is the guide character.

## GuideDialogue

- Machine: `src/lib/guideDialogueMachine.ts`
- Component: `src/components/guide/GuideDialogue.tsx` (reusable; not a LessonPlayer)
- Phases: `idle → typing → complete → (next | done)`
- Continue while typing → complete current message only
- Continue while complete → next message / done
- Advance guard (`GUIDE_ADVANCE_GUARD_MS=80`) blocks double-skip / rapid click
- Typewriter ~28ms/grapheme + punctuation pauses; `Intl.Segmenter` grapheme-safe
- `prefers-reduced-motion: reduce` → instant complete
- AT: visual span `aria-hidden`; full sentence via `aria-label` + polite live region on complete
- Keyboard: Enter/Space when not focused on input/button (buttons use native activation)

### LessonPlayer integration

- `StepIntro` consumes `GuideDialogue` when `step.body` exists (existing content only; paragraphs → messages)
- Title / tone contrast / Mandarin audio stay immediately visible
- Graded questions unchanged (no typewriter gate)
- Continue label on intro: `player.gotIt` (Entendi / Got it)

## Journey Culture Moments

- Registry: `src/data/journeyCultureMoments.ts` (presentation; **not** in `CURRICULUM_SOURCES`)
- Card: `src/features/journey/JourneyCultureMomentCard.tsx`
- Opens canonical culture lesson via `cultureLessonPlayerPath` + `from=/jornada?focus=culture-moment:…`
- Optional; does not block Mandarin progress
- Shared completion: `completedLessons` + `cultureCompletedIds` (existing authority)
- No JourneyCultureQuiz; no new CultureItems / lessons / JOURNEY_NODES

### Placements (5)

| cultureItemId | afterTopicId | reason |
|---|---|---|
| `chinese-dragon` | `l26` | Meal/host unit — symbol décor context; kind=symbol |
| `lantern-festival` | `l25` | Closes lunisolar New Year period next to Spring Festival node |
| `sun-wukong` | `l9` | Early school/titles; literature (not history) |
| `journey-to-the-west` | `l24` | Family/home near Mid-Autumn; literature |
| `china-history-timeline` | `p1-o-que-e-mandarim` | Early Atlas doorway; dynasty lessons stay hub-only |

Spring Festival stays on its existing journey explore node (no duplicate moment).

### Counts

| Metric | Before | After |
|---|---|---|
| Core lessons | 134 | 134 |
| Teaching topics | 113 | 113 |
| CultureItems | 30 | 30 |
| Culture native lessons | 30 | 30 |
| Journey CULTURE_LESSON nodes | 20 | 20 |
| Culture Moments (presentation) | 0 | 5 |

## Gates / tests

- `validate:guide-dialogue-contract` / `test:guide-dialogue`
- `validate:journey-culture-moments` / `test:journey-culture-moments`
- Wired into `validate:beta`
- E2E: `e2e/guided-journey-culture.spec.ts` (Chromium + WebKit)

## Locales / viewport

- PT-BR + EN via existing culture item fields + `player.gotIt` / explore chrome
- Culture Moment card: `w-[min(100%,320px)]` for 390×844
- GuideDialogue: column on mobile, row on `sm+`

## Candidate status

Future candidate SHA = HEAD of this stack (or later release-config-only commit). Do not set `release_candidate_sha` or cloud PASS until RC2.1 cloud execution with real QA evidence.
