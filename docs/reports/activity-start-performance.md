# Activity start performance (PERF-012)

Generated as part of Pedagogia V3.5 hotfix.

## Status

- `LessonPlayer` already opens with authored shell first and builds the adaptive plan in `startTransition` (PERF-011).
- `prewarmLessonPlanner` runs from lesson detail idle.
- Long-task observer is wired via `observeLessonLongTasks` when perf marks are enabled.

## Targets

| Metric | Target | Notes |
| --- | ---: | --- |
| plannerMs | < 50ms warm / < 200ms cold | Structure-exposure index is the cold path |
| renderMs (shell) | < 100ms | Authored steps first paint |
| firstInteractiveMs | < 300ms after click Continuar | Manual device QA still required |

## Worst paths to watch

- First lesson open without detail prewarm (cold `ensureStructureExposureIndex`)
- High-mastery passes with large bonus injection + conversation loop

## Device QA (PERF-013)

Manual freeze reproduction is still required on desktop / Android / iPhone before closing PERF-011 as done. Automated E2E green is necessary but not sufficient.

Instrumentation marks:

- `lesson_activity_open_start` / routeMounted
- `lesson_plan_start` / plan effect
- `lesson_plan_ready` / dataReady
- `first_step_rendered` / interactive
