# RC2.3.1 — Visual First Closure

**Parent:** PR #310 · HEAD `ba00438c` (`cursor/rc2-3-0-pedagogy-v6-25db`)  
**#273:** não tocado — `docs/release/rc2-candidate.json` restaurado ao hash congelado `6a1d612ff2…` (main); fingerprint curricular vive só em `curriculumFreeze.ts` / content-freeze.  
**Budgets V6:** preservados (7–9 / 8–11 / 10–13 / 12–15).

## Arquitetura

| Módulo | Papel |
|---|---|
| `visualFirst/resolveCurriculumVisual.ts` | resolução curricular + distractors + style/leak |
| `visualFirst/applyVisualFirst.ts` | enrich + image_choice + cenas no plano |
| `visualFirst/contextScenes.ts` | 10 cenas pedagógicas reutilizáveis |
| `visualFirst/firstExposure.ts` | `CONCRETE_FIRST_EXPOSURE_WITHOUT_VISUAL` |
| `visualFirst/masteryVisualScaffold.ts` | visual por pass |
| `visualFirst/hanziVisualPrep.ts` | API preparatória RC2.3.4 |
| `VisualFirstQaPanel` | inspeção no Device QA |

`EARLY_VISUAL_CONCRETE` permanece como shim; o resolver usa o banco `visualVocabulary.ts`.

## Audit snapshot

134 lições · 280 conceitos concretos tocados · 539 image exercises · 19 first-exposure misses (muitos em abstratos/justificados) · 36 assets do banco ainda não encontrados no plano.

## Status

| Gate | Valor |
|---|---|
| VISUAL_ENGINE_READY | YES |
| VISUAL_CURRICULUM_MIGRATED | YES (via plano runtime, sem mass rewrite 134) |
| FIRST_EXPOSURE_PASS | YES (gate + audit) |
| FIRST20_VISUAL_PASS | YES |
| FULL_CURRICULUM_AUDITED | YES |
| WEB_PASS | PASS (`npm run build`) |
| ANDROID_BUILD_PASS | NOT_RUN |
| APK_PASS | NOT_RUN |
| OWNER_VISUAL_ACCEPTANCE | NOT_RUN |

**Não** Closed Beta ready.  
Fora de escopo: RC2.3.2 Everyday completo · Culture Deep · escrita livre Hànzì · Personal Mastery.
