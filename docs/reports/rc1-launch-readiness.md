# RC1 — Launch readiness

**Verdict: NO-GO.**

> **Atualizado na RC1.2 (P23).** O que mudou desde que este relatório foi
> escrito:
>
> - **#255 mergeado** (`f661ad0`) e **#257 mergeado** (`06d6bcb`, RC1.1 —
>   Learning Loop Hardening). O PR #256 foi fechado sem merge; o #257 é o que
>   entrou.
> - O loop de aprendizagem foi corrigido: coerência de modalidade, Reforço +,
>   áudio de feedback, TTS com nome próprio, avanço de revisão e Victory.
> - A dívida de E2E conhecida (`goForward`) foi **corrigida na raiz** na RC1.2:
>   era uma folha de estilo externa render-blocking travando o boot do app.
>   Não há mais E2E vermelho conhecido.
> - Os checks operacionais foram reestruturados (onze, com runbook cada) e
>   `stripe_live` virou `stripe_test_mode_e2e` + `stripe_production_config`.
>
> O verdict continua **NO-GO**, e pela mesma razão de sempre: **nenhum** check
> operacional foi executado. Estado atual e caminho para GO em
> [`rc1-2-release-closure.md`](./rc1-2-release-closure.md).

This remessa freezes the curriculum that already shipped and proves the
product can be *prepared* for launch. It does not authorize production
launch. Green CI is `CODE_READY`, not `READY_TO_LAUNCH`.

## Identity

| Field | Value |
| --- | --- |
| Freeze | `CURRICULUM_FREEZE=RC2_CONTENT_FREEZE` |
| Base fingerprint | `516692632525` |
| Real merge SHA (#254 on `main`) | `c4441b68ae2388027d72e3af748417ef7caf2bb6` |
| Forbidden SHA | `241386c8fc814ebdfa166dde1035bc3d7ca195f5` (9B feature-branch tip, never a release SHA) |
| Lessons | 134 |
| Teaching topics (`!isReview && !reviewMasteryMode`) | 113 |
| New lessons / chunks / arcs in this remessa | 0 |
| Health plans | `saudeSurvivalPlanFor` / `saudePlan` only |

The Journey fingerprint is the curriculum identity. **V4.11A.3** advanced it
from `943a8f9fb720` → `516692632525` because the History essentials wave landed in
`cultureNative.ts` / `cultureLessons.ts` (`CURRICULUM_SOURCES`); core Mandarin
134 / teaching topics 113 unchanged; CultureItems 30; Journey Culture nodes 20.
Earlier, **V4.11A.2** advanced `7c054f2255e7` → `943a8f9fb720` (hub-only flagship
wave), and **RC1.4** retargeted `RC_BASE_FINGERPRINT` from `38e70062857d` →
`7c054f2255e7` because the generated-task planner enters `CURRICULUM_SOURCES` —
documented in [`rc1-4-generated-learning-integrity.md`](./rc1-4-generated-learning-integrity.md).
`CURRICULUM_FREEZE` is now `RC2_CONTENT_FREEZE`. Do not invent `release_candidate_sha`
without a real deploy candidate. Docs that treated `40be45d` as a current RC2
candidate are superseded.

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
