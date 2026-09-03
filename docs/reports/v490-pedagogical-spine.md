# V4.9.0 — Pedagogical spine

Relatório computado pelo gate `npm run validate:teach-before-test`. A camada V4.9 adiciona evidência e orquestração; não renomeia nenhuma identidade canônica.

## Métricas

- totalKnowledgeTargets: 430
- targetsWithPrerequisiteMetadata: 430
- firstGradedBeforeExposure: 0
- insufficientScaffoldBeforeFirstGrade: 0
- unknownDistractorCount: 0
- hiddenSkillDistractorCount: 0
- first20TeachBeforeTestViolations: 0
- first20HiddenSkillViolations: 0
- first20AbruptDifficultyJumps: 0
- first20ViolationsBefore: 8
- first20ViolationsAfter: 0
- lessonCapsules: 1
- journeyIntegratedBoosters: 1
- themeCount: 15
- topicsWithoutTheme: 0
- topicsWithBrokenPrerequisite: 0

## Baseline V4.8.9 reconciliada

- mandarin:m1:single-flash-before-grade
- mandarin:m1:unknown-distractor:xiexie
- mandarin:m1:unknown-distractor:zaijian
- pinyin:m1:text-only-before-first-grade
- hanzi:m1:text-only-before-first-grade
- first-hanzi:m2:no-authored-progression
- first-hanzi:m3:no-authored-progression
- first-hanzi:m4:no-authored-progression

## First-introduction evidence

| target | first seen | first exposed | first graded | first recalled | first produced | first transferred |
| --- | --- | --- | --- | --- | --- | --- |
| concept:mandarin-language | S1/M1/step1 | S1/M1/step2 | S1/M1/step3 | S3/M3/step2 | S3/M3/step4 | S4/M4/step1 |
| chunk:nihao | S1/M1/step1 | S1/M1/step2 | S1/M1/step3 | S3/M3/step2 | S3/M3/step4 | S4/M4/step1 |
| intent:greeting | S1/M1/step1 | S1/M1/step2 | S1/M1/step3 | S3/M3/step2 | S3/M3/step4 | S4/M4/step1 |
| char:ni | S1/M1/step2 | S1/M1/step2 | S1/M1/step3 | S3/M3/step2 | S3/M3/step4 | — |
| char:hao | S1/M1/step2 | S1/M1/step2 | S1/M1/step3 | S3/M3/step2 | S3/M3/step4 | — |
| concept:pinyin-map | S5/M1/step1 | S5/M1/step2 | S5/M1/step3 | S7/M3/step2 | — | — |
| concept:tone-contour | S9/M1/step1 | S9/M1/step2 | S9/M1/step4 | S11/M3/step2 | — | — |
| char:ma2 | S9/M1/step2 | S9/M1/step2 | S10/M2/step3 | S11/M3/step5 | — | — |
| char:ma_horse | S9/M1/step3 | S9/M1/step3 | S9/M1/step4 | S11/M3/step2 | — | — |
| concept:hanzi-writing | S13/M1/step1 | S13/M1/step2 | S13/M1/step3 | S15/M3/step3 | S15/M3/step2 | — |
| concept:hanzi-components | S17/M1/step1 | S17/M1/step2 | S17/M1/step4 | S19/M3/step9 | S17/M1/step4 | — |
| char:mu | S17/M1/step1 | S17/M1/step2 | S17/M1/step4 | — | S17/M1/step4 | — |
| char:ren | S17/M1/step5 | S17/M1/step5 | S17/M1/step7 | — | S17/M1/step7 | — |
| char:kou | S18/M2/step1 | S18/M2/step2 | S18/M2/step4 | — | S18/M2/step4 | — |
| char:ri | S18/M2/step1 | S18/M2/step5 | S18/M2/step7 | S19/M3/step9 | S18/M2/step7 | — |
| char:shan | S19/M3/step1 | S19/M3/step6 | S19/M3/step8 | S19/M3/step9 | S19/M3/step8 | — |
| char:yue | S19/M3/step1 | S19/M3/step3 | S19/M3/step5 | S19/M3/step9 | S19/M3/step5 | — |
| char:shui | S20/M4/step2 | S20/M4/step2 | S20/M4/step4 | S20/M4/step14 | S20/M4/step4 | — |
| char:huo | S20/M4/step5 | S20/M4/step5 | S20/M4/step7 | S20/M4/step14 | S20/M4/step7 | — |
| char:da | S20/M4/step8 | S20/M4/step8 | S20/M4/step10 | S20/M4/step14 | S20/M4/step10 | — |
| char:xiao | S20/M4/step11 | S20/M4/step11 | S20/M4/step13 | S20/M4/step14 | S20/M4/step13 | — |

## Scoreboard

- TEACH_BEFORE_TEST: **PASS**
- FIRST_20_SCAFFOLD: **PASS**
- FOUNDATION_PEDAGOGY: **PASS**
- KNOWLEDGE_GRAPH: **PASS**
- THEME_PROGRESSION: **PASS**
- LESSON_CAPSULE_ARCHITECTURE: **PASS**
- PINYIN_CAPSULE_PILOT: **PASS**
- JOURNEY_ORCHESTRATOR: **PASS**
- BLITZ_BOUNDED_SESSION: **PASS**
- BLITZ_JOURNEY_PILOT: **PASS**
- PROGRESS_IDENTITY_PRESERVED: **PASS**
- PT_EN_PARITY: **PASS**
- CHINESE_IDENTITY_PRESERVED: **PASS**

## Escopo e invariância

- `LessonCapsule` e boosters usam IDs próprios e armazenamento separado; não entram em `completedLessons`, mastery, SRS, mistakes, XP ou Qi.
- O Blitz integrado usa o mesmo engine standalone, somente com itens já desbloqueados, e termina no primeiro limite: 45 segundos ou 8 respostas.
- Conteúdo profundo fora das primeiras 20 sessões permanece como auditoria progressiva, não foi reescrito em massa nesta remessa.

