# RC1 — Launch readiness

**Verdict: NO-GO.**

This remessa freezes the curriculum that already shipped and proves the
product can be *prepared* for launch. It does not authorize production
launch. Green CI is `CODE_READY`, not `READY_TO_LAUNCH`.

## Identity

| Field | Value |
| --- | --- |
| Freeze | `CURRICULUM_FREEZE=RC1` |
| Base fingerprint | `38e70062857d` |
| Real merge SHA (#254 on `main`) | `c4441b68ae2388027d72e3af748417ef7caf2bb6` |
| Forbidden SHA | `241386c8fc814ebdfa166dde1035bc3d7ca195f5` (9B feature-branch tip, never a release SHA) |
| Lessons | 134 |
| Teaching topics (`!isReview && !reviewMasteryMode`) | 113 |
| New lessons / chunks / arcs in this remessa | 0 |
| Health plans | `saudeSurvivalPlanFor` / `saudePlan` only |

The Journey fingerprint is the curriculum identity. It did not move with
the #254 hotfix (persist/SRS/PWA). If it ever moves, stop and document a
BLOCKER — do not silently retarget `RC_BASE_FINGERPRINT`.

## What this remessa adds

- Freeze contract in `src/lib/curriculumFreeze.ts`
- `npm run validate:production-no-fixtures`
- `npm run validate:release-candidate` (wired into `validate:beta`)
- `docs/release/rc1-operational-checks.json` — every check starts `false`
- `e2e/rc1-launch.spec.ts` plus the 134-lesson crawler
- This report and `docs/release/RC1_MANUAL_RUNBOOK.md`

## What this remessa does not do

No new lesson, chunk, character, conversation scene, Culture system,
`StepKind`, player mechanic, or gamification. Health copy stays
non-clinical. `LONGYU_I18N_VERSION` stays `v4.8.8`.

## Operational scoreboard (human evidence only)

Automation **must not** flip these to `true`. `validate:release-candidate`
rejects `pass: true` without a real evidence file, and rejects `verdict: GO`
while any check is false.

| Check | Pass | Evidence |
| --- | --- | --- |
| Stripe live (real Test Mode first, Live for launch) | false | — |
| Android real device | false | — |
| iOS real device | false | — |
| Rollback drill | false | — |
| Cloud auth | false | — |
| Cloud sync | false | — |
| Feedback backend | false | — |

Until every row has a human evidence path, the only honest verdict is
**NO-GO**.

## Code gates that already exist

These are necessary and not sufficient:

- `validate:beta` (now includes the RC1 freeze)
- `validate:frontend-secrets` after `npm run build`
- Playwright Chromium / Firefox; WebKit remains informative
- Hotfix #254: null SRS/persist no longer crash `/jornada`; stale PWA chunk reloads once

## After #254 is on production

Close every Longyu tab and hard-refresh so the new service worker can
claim. “Recarregar o app” on the old worker is not enough.
