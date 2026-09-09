# V4.9.6B — Núcleo de aprendizagem integrada

Hànzì Memory + Tone Learning + Dialogue Coherence.

## Base

| Campo | Valor |
|-------|-------|
| PR de origem | #239 — V4.9.6A Rotina e Tempo (ainda aberto) |
| SHA de origem | `da28321` (`Separar M1-M4 de rotina e tempo por papel cognitivo`) |
| `main` antiga | **não usada** (`95330f8`) |
| Fingerprint 4.9.6A (contratos) | `828e7db33813` |
| Fingerprint 4.9.6B | `7f4a081846d3` |
| Branch | `cursor/v496b-integrated-learning-6ae2` |

Quando #239 mergear, rebasear esta remessa no SHA real do merge — não na `main` antiga.

`cultureItemId` existe em `Lesson` só para não bloquear V4.9.6C. Culture Hub não foi construído.

## Inconsistências de conversa encontradas

Auditoria completa: `reports/conversation-coherence.md` (47 cenas, 139 turnos com interação).

Classificação de turnos (um turno pode ter mais de um rótulo):

| Classe | Turnos |
|--------|-------:|
| OK | 42 |
| ANSWER_TOO_NARROW | 83 |
| QUESTION_NOT_USING_PREVIOUS_CONTEXT | 35 |
| GENERIC_REPAIR | 13 |
| UNNATURAL_ENDING | 3 |
| INTENT_MISMATCH | 0 |
| BROKEN_CONTINUITY | 0 |

O P0 concreto do #239:

- NPC `你做什么工作？` (profissão)
- prompt “Onde você trabalha?”
- resposta `我在公司上班` (lugar)

Isso é `INTENT_MISMATCH`. Não havia profissão ensinada para corrigir pelo lado da profissão.

Outras dívidas do catálogo (não são as três cenas da V4.9.6): `请再说一遍` genérico em cenas antigas; `falar-de-estudo` fecha com o padrão `好！谢谢！`; várias cenas geradas ainda são pergunta → resposta sem eco.

O gate **não** é um juiz LLM. Ele só falha o catálogo inteiro em `INTENT_MISMATCH` estrutural, e aplica continuidade / reparo / fechamento / `produce_reply` final nas cenas importantes:

`encontro-amanha`, `que-horas-sao`, `rotina-e-trabalho`.

## Inconsistências corrigidas

Rotina: intenção = lugar de trabalho, vocabulário já ensinado.

- NPC `你在哪里工作？`
- prompt “Você trabalha numa empresa. Diga onde trabalha.”
- resposta `我在公司上班`
- `speechAct` `ask_location` → `tell_location`

A lição ainda **ouve** `你做什么工作？` (chunk já ensinado). A cena não cobra profissão nova.

Continuidade autoral:

| Cena | Eco | Fechamento |
|------|-----|------------|
| `encontro-amanha` | `好。` / `好！明天见。` | `明天见！` |
| `que-horas-sao` | `八点半？好。` / `现在？好。` | `好，八点见！` |
| `rotina-e-trabalho` | `七点？` → `八点见？` → `上班？好。` | `好。` |

Reparos (não é mais `请再说一遍` universal):

- horário incompatível → `七点吗？` / `八点吗？` / `八点半吗？`
- não entendeu → `什么？`
- fora do assunto → reask contextual (`你好？`, `明天见？`, `你在哪里工作？`)

Limites de cena comum (6–10 falas, 2–3 interações) preservados. Relógio ficou com 2 interações (sem turno de agradecimento forçado).

Glifos só-gloss (`公`/`司`/`早`) não entram como leftover. `见` em `八点见` cobre via `chunk:zaijian`.

## Cenas auditadas

47/47. As três da V4.9.6 estão `OK` em todos os turnos do caminho principal, com `speechAct` declarado.

Cenas da amostra P4: `encontro-amanha`, `que-horas-sao`, `rotina-e-trabalho`, `pedir-agua`, `primeiro-cumprimento`.

## Explicações de tom adicionadas/refinadas

`p1-o-que-e-tom` (planos autorais M1–M4):

- Tom faz parte da sílaba; mesma base + outro contorno pode ser outra palavra; pinyin marca o tom; contorno ≠ volume.
- Áudio imediatamente depois da explicação (`妈` / `马` / `麻` / `骂` / `吗`).
- Quatro contornos nomeados em M2, depois dos guiados 1/3 (M1) e 2/4 (M2).
- Contrastes 1º × 4º (`妈`/`骂`) e 2º × 3º (`麻`/`马`).
- 3º tom: vale isolado; na fala real a subida muitas vezes não completa.
- Neutro em M3, depois dos quatro: `吗` — curto, sem contorno próprio; não é 5º tom cheio.
- Sem sandhi avançado.

Microaulas P2: o mesmo texto de contorno; `p2-comparar-tom-1-4` e `p2-comparar-tom-2-3` ouvem os dois lados **antes** do quiz.

Fallback da Jornada (`PHASE1_BOOTSTRAP`) ganhou a frase conceitual; o plano autoral continua sendo o que o mastery loop serve.

## Aulas de tom antes/depois

| Superfície | Antes | Depois |
|------------|-------|--------|
| M1 `p1-o-que-e-tom` | intro curta + guiados 1/3 | intro “o que é tom” + listen + guiado + vale + listen + guiado |
| M2 | listen_select 2/4 e diálogo 1×2 / 3×4 | listen 2/4 + mapa dos quatro + 1×4 e 2×3 |
| M3 | quatro quizzes + marcas | + neutro `吗` |
| P2 comparar 1–4 / 2–3 | quiz direto | listen dos dois lados, depois quiz |
| Fora do P2 | pouco ou nada na V4.9.6 | `p6-horarios` e `p6-clima` (vocabulário da aula) |

`validate:tone-teach-before-test`: 172 tarefas; violações número/marca/produção 0/0/0.

`test:tone-learning-ladder`: M1 1/3 · M2 2/4 · M3 reconhecimento/marcas · M4 palavra real · neutro explícito.

## Hanzi CORE auditados

`newHanzi` ≠ memória produtiva. CORE em `src/data/hanziMemoryTargets.ts`:

| Glifo | Intro | Recuperação tardia |
|-------|-------|--------------------|
| 点 | `p6-rotina-trabalho` | `p6-horarios` |
| 明 | `p6-horarios` | `p6-clima` |
| 天 | `p6-horarios` | `p6-natureza`, `p6-clima` |
| 今 | `p6-horarios` | `p6-clima` |
| 昨 | `p6-horarios` | `p6-clima` |
| 现 | `p6-horarios` | `p6-clima` |

**Não** CORE nesta remessa: `半` (uso in-lesson + tom, sem slot natural 1–3 aulas depois), `候` (só gloss), `午`, rotina gloss-only (`起床上班…`).

Escada na prática para `明天`:

1. listen `明天` / `míngtiān` / amanhã
2. `recognize("ming")` — 明 dentro de 明天
3. tom: discriminação `明天` × `今天`, depois “qual começa com 1º tom?”
4. uso em frase / conversa (`明天见`, `我明天去`)
5. delayed: clima (`明天天气很好` + `recognize("ming")` de novo)
6. `reviewItems` / SRS (`char:ming`, chunks)

Um reconhecimento + uma recuperação posterior por aula relevante. Sem série de `hanzi_build`.

## Delayed recalls adicionados

- `p6-horarios`: `recognize("ming")`; `char:ming` / `char:tian_sky` / `char:dian_point` em library/review
- `p6-clima`: listen `昨天很冷` / `现在很冷` / `明天天气很好`; `recognize("ming")`; tom 1º em `今天`
- `p6-natureza`: `char:tian_sky` em review (天上 já usa 天)
- `p6-rotina-trabalho`: listen `你在哪里工作？`; `char:dian_point` em review

## Aulas com integração de tom

Elegibilidade: vocabulário da própria aula (ou antigo), nunca palavra nova só para o drill.

- `p6-horarios`: `audio_discrimination` 明天 × 今天 (2º+1º × 1º+1º); `listen_select` “Qual começa com 1º tom?” (`今天` / `明天` / `昨天`). Não pergunta “qual começa com 2º” — 昨天 e 明天 empatariam.
- `p6-clima`: o mesmo contraste perceptivo, depois que 昨天/现在/明天 reaparecem.

`p6-rotina-trabalho` não forçou tom: o valor pedagógico está em rotina + conversa + 点, não num drill de contorno.

## Aulas com integração de hànzì

- `p6-rotina-trabalho`: CORE `点` (não os 11 `newHanzi` técnicos)
- `p6-horarios`: CORE `明 天 今 昨 现`
- `p6-clima` / `p6-natureza`: recuperação, não primeira apresentação

## Depth antes/depois

`validate:exercise-depth -- --beta` — média global **92** nos dois lados (portão ≥ 78).

| Lição | 4.9.6A | 4.9.6B |
|-------|-------:|-------:|
| `p1-o-que-e-tom` | 68 | 68 (aviso; fundação < 70, acima do fail 50) |
| `p6-rotina-trabalho` | 100 | 90 |
| `p6-horarios` | 100 | 98 |
| `p6-clima` | — | 100 |

A queda da rotina vem da cena mais curta e mais coerente (menos respostas únicas no plano default: 16 → 10; conversas 2 → 1). Continua acima do portão.

## P4 — QA humano (currículo)

Perguntas: por que esta atividade; ligação com o que acabou de aprender; o diálogo parece conversa; recuperação antiga; chinês vs interface.

Walk dos passos autorais em `/opt/cursor/artifacts/v496b-p4-qa-walk.md`.

| Amostra | Veredito |
|---------|----------|
| 5 iniciais (`p1-o-que-e-mandarim` … `p1-primeira-conversa`) | Conceito → som → uso. Tom e hànzì não são forçados onde não cabem. |
| 5 tons (P2 ma 1–4 + comparar 1×4) | Explicação + áudio antes do quiz. 1×4 ouve os dois lados. Contorno, não só número. |
| 5 hànzì (`p1-o-que-e-hanzi`, `p1-primeiros-hanzi`, `l16`, `p5-nv-zi-hao`, `p6-horarios`) | Forma depois do som. CORE de rotina/tempo não empilha `hanzi_build`. `p1-primeiros-hanzi` ainda monta vários glifos na mesma aula — isso é o laboratório de peças, não o contrato CORE. |
| 5 frases (`l9`, `l11-falo-pouco`, `l13-dialogo-ola`, `l23`, `l27`) | Ouvir → montar → diálogo. `l27` fecha em conversa de compra. |
| V4.9.6 (`p6-rotina-trabalho`, `p6-horarios`) | Progressão contexto → ouvir → (tom/hànzì se cabe) → compreender → produzir → conversa → retorno. |
| 5 cenas | As três da 4.9.6 soam conversa (eco + reparo + fechamento). `pedir-agua` e `primeiro-cumprimento` continuam no modelo antigo (lista de falas / `choose_meaning`); o gate não as promove a “importantes”. |

O aluno em `p6-horarios` recupera 点 da rotina e logo em seguida distingue tom em palavras que acabou de ouvir. Isso é acumulação, não quiz isolado.

## Fingerprint

`7f4a081846d3`

`CURRICULUM_SOURCES` inclui `src/data/hanziMemoryTargets.ts`. Contratos `docs/backend/v478-backend-rc.json` e `v489-backend-rc.json` regenerados.

## Gates

Novos (dentro de `validate:beta`):

- `validate:conversation-coherence` / `test:conversation-coherence`
- `validate:hanzi-memory-integration` / `test:hanzi-memory-integration`
- `validate:tone-integration` / `test:tone-integration`

Pedidos da remessa, todos verdes nesta máquina:

- `validate:tone-teach-before-test`
- `test:tone-learning-ladder`
- `validate:tone-progression`
- `validate:hanzi-builder-coverage`
- `test:hanzi-builder-integrity`
- `validate:conversation-scenes`
- `validate:conversation-pedagogy`
- `validate:conversation-loop`
- `validate:lesson-novelty`
- `validate:exercise-depth -- --beta`
- `validate:production-transfer`
- `validate:modality-contract`
- `validate:listening-affordance`
- `validate:i18n`
- `validate:journey-en`
- `validate:beta`
- `npm run build`

Gates da #239 (`validate:routine-time`, `test:routine-time` 10 mutações + fingerprint) preservados.

## Mutações

| # | Mutação | Código | Resultado |
|---|---------|--------|-----------|
| 1 | `ask_job` com resposta de lugar | `INTENT_MISMATCH` | morta |
| 2 | todos os reparos = `请再说一遍` | `GENERIC_REPAIR` | morta |
| 3 | remover recuperação tardia de um CORE | `DELAYED_RECALL` | morta |
| 4 | cobrar Hanzi CORE antes da exposição | `TEACH_BEFORE_TEST` | morta |
| 5 | remover explicação antes do primeiro contraste | `EXPLAIN_BEFORE_TEST` | morta |
| 6 | palavra não ensinada no tone drill | `UNTAUGHT_TONE_VOCAB` | morta |
| 7 | empilhar hànzì CORE só na intro, zero depois | `DELAYED_RECALL` | morta |
| 8 | produção final da conversa vira múltipla escolha | `FINAL_NOT_PRODUCTION` | morta |

A mutação 7 não destrói `p6-horarios` quando essa lição é intro de outro CORE.

## Fora desta remessa

Culture Hub, Pronunciation Score, Tone Analyzer, Shadowing, handwriting, AI Conversation, Story Mode, V4.9.7.
