# RC1.4 — Generated Learning Integrity

Planner Truth + Zero Known Answer Mismatches + Mastery Preservation (#261).

| Campo | Valor |
| --- | --- |
| BASE_SHA_REAL | `0b88ba9b888e0e9b38b2d5729add49c7bbce77eb` (#261 no mesmo branch) |
| Merge SHA #261 | n/a — RC1.4 continua no branch `cursor/fix-lab-mastery-pass4-stuck-1f8b` |
| Fingerprint **antes** | `2ccc484e1f75` (estado em `0b88ba9`; freeze legado ainda citava `38e70062857d`) |
| Fingerprint **depois** | `7c054f2255e7` |
| Lessons before/after | 134 / 134 |
| Teaching topics before/after | 113 / 113 |
| Chunks / Hanzi | sem growth (M18–M20) |

## Problema

RC1.3 detectava em runtime (`ANSWER_INTEGRITY_MISMATCH`) quatro itens gerados em que prompt, resposta e explicação falavam de alvos diferentes. Eles ficaram em `KNOWN_FROZEN_ANSWER_MISMATCHES` porque o planejador estava no fingerprint.

RC1.4 corrige a **origem**: o bônus genérico de mastery escolhe um `GeneratedTaskObjective` (target canônico + relationType) **antes** de montar superfícies.

## Quatro mismatches

| Ref | Antes | Depois | Root cause |
| --- | --- | --- | --- |
| `p2-comparar-tom-2-3#4:1` | prompt 你/好 · answer 麻 · expl 你好 | prompt “Qual sílaba sobe (2º tom)?” · 麻 · expl 麻 | `canonicalExamples` só pinyin + `passObjectives[4]` de transfer; núcleo = 1º hànzì da lição |
| `p4-num-910#4:1` | prompt 十 · answer 九 · expl 十 | prompt/answer/expl 十 | 1º example (`九`) ≠ numeral pedido no pass text |
| `p4-char-zhong#2:0` | “vizinhos de 中” · answer 人 | “Qual é o hànzì 中?” · 中 | `defaultSpec` + `extractExample` pegava revisão `人` |
| `l19-logica-ma#2:0` | “vizinhos” · answer 妈 · 马 no título | “pista sonora” · 妈 (âncora 马) | `defaultSpec` colava o título longo em “vizinhos” |

**Root cause estrutural:** `genericFidelityBonus` escolhia um hànzì “núcleo” e colava textos de `TopicMasterySpec` sem garantir que prompt/answer/explanation compartilhassem o mesmo `targetRef`.

## Objective model

`src/data/generatedTaskObjective.ts`:

- `GeneratedTaskObjective` com `targetRef`, `anchorRefs?`, `relationType?`
- `resolveGeneratedTaskObjective` — sem `if (lesson.id === …)`
- `surfacesForObjective` — prompt/explanation/hint/audio/distractors
- `buildGeneratedBonusStep` — usado por `genericFidelityBonus`
- `generatedTaskTrace` no step (não renderizado ao aluno)

Relações: `tone_contrast`, `phonetic_component`, `numeric_value`, `hanzi_form`, `lexical_core`.

## Sweep

| Métrica | Valor |
| --- | --- |
| Planos (lesson × pass) | 452 |
| Tasks | 3727 |
| Com semantic trace | 354 |
| Known mismatches | **0** |
| Allowlist | `[]` (P15 / M14) |

## #261 preservation

`validate:mastery-planner-integrity` + `test:lab-mastery-pass4`:

- todos `perception_lab` / `hanzi_lab` Pass 4 → **4/4**
- aquisição sem produção/transferência → **3/4** (regra pedagógica)

## Gates (em `validate:beta`)

- `validate/test:generated-task-integrity`
- `validate:mastery-planner-integrity`
- `test:generated-task-regressions`
- `validate:generated-answer-ref-consistency`
- `validate:generated-explanation-integrity`
- `validate:generated-help-integrity`
- `validate:generated-audio-integrity`
- `validate:generated-option-integrity`
- `validate:generated-semantic-diff`
- `validate:rc14-curriculum-topology`
- `validate:rc14-no-vocab-growth`
- `test:generated-task-objective`
- `test:lab-mastery-pass4`

## Mutations

M1–M22 cobertas em `test:generated-task-integrity` (13 kills nomeados, incluindo allowlist, fail-closed, labs, topologia, shuffle).

## E2E

`e2e/rc1-4-generated-learning-integrity.spec.ts` (Chromium, 6/6 passed):

- lab 3/4 → Continuar; lab 4/4 → Praticar novamente + refresh
- quatro fixtures abrem o player sem `data-review-integrity`
- review smoke em zhong + ma

Avanço Pass 4 → 4/4 no lab: `test:lab-mastery-pass4` / `validate:mastery-planner-integrity`.

## Fail-closed

`ANSWER_INTEGRITY_MISMATCH` / `checkAnswerIntegrity` / `CanonicalResponse` preservados (P20 / M15).

## Fingerprint

Planner (`topicMasteryBonus.ts`) + tipo `generatedTaskTrace` em `journey.ts` entram no hash. Freeze atualizado para `7c054f2255e7` com justificativa acima — não se falsificou o valor antigo.

Contratos `docs/backend/v478-backend-rc.json` / `v489-backend-rc.json` regenerados (`generate:backend-contracts`) para o mesmo fingerprint live (antes `38e70062857d`).

## First-20 EN overlay

Copy nova do planner RC1.4 (item central / contorno-alvo / prompts de tom / pista sonora) quebra `validate:first-20-en` sem gloss. Cobertura via padrões em `instructionGloss.ts` (`applyPatterns`), com `targetRef` CJK preservado — sem map por `lessonId`.

## Mastery depth

Pass 3 de `tone_contrast` / `numeric_value` não reemite o `dialogue_choice` do Pass 2 (mesmo `targetRef`); só produção (`reverse_recall`). Evita overlap 1.00 em `validate:topic-mastery-depth` (ex.: `p2-ma-primeiro-tom`, `l6`, `l8`).

Quando `mustProduce` é choice-like (“escolher qual…”), o body do `reverse_recall` usa `Diga {target}` — não o texto de escolha — para `validate:exercise-feasibility`.
