# V4.9.9B — Everyday conversation + China Survival capstone

Objetivo do aluno: *Consigo manter uma conversa cotidiana simples e usar o mandarim que aprendi em situações reais.*

Esta remessa **fecha V4.9.9** e fecha o ciclo curricular pré-RC. Não inicia Release Candidate.

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração.

| Campo | Valor |
|-------|-------|
| SHA **obrigatória** (`main` após #252) | `4e04b575625c5364134afbc35c126da183824767` |
| Fingerprint da Jornada **antes** (9A fechada) | `eb4baadf0579` |
| Fingerprint da Jornada **depois** | `ad803486351c` |
| Lições antes | 132 |
| Lições depois | 134 (`p7-conversa-cotidiana`, `p7-china-survival`) |
| Tópicos de ensino | **113** (as duas novas são `isReview` + `curriculumRole: "immersion"`) |
| Atlas items | 444 (zero chunks novos) |
| Chunks novos | 0 |
| Caracteres novos | 0 |
| Branch | `cursor/v499b-everyday-capstone-6ae2` |

## Não reabrir

Saúde, Hotel/Aeroporto, Mobility, Shopping, Restaurante, Culture architecture, Speaking First, Phrase Builder, Hanzi Fill, Minimal Victory, Live Leagues. Esta PR só referencia esses arcos.

## P0 — auditoria (em `4e04b57`)

### Capacidades cotidianas já no corpus

| CAPACIDADE | CHUNK / FRASE | JÁ ENSINADA? | FIRST TEACH | OPEN PRODUCTION? | CONVERSATION? | LISTENING? | DELAYED RECALL? | AÇÃO |
|---|---|---|---|---|---|---|---|---|
| greet | 你好 | sim | l2 | sim | First Contact | sim | sim | RECALL |
| respond_greeting / wellbeing | 你好吗 / 我很好 | sim | l3 | fraca | First Contact | sim | sim | RECALL + CONVERSA |
| unwell contrast | 我不舒服 | sim | p6-saude | sim | health | sim | sim | BRANCH (não clínica) |
| ask_name / introduce | 我叫 / 你叫什么 | sim | l9 | sim | Identity | sim | sim | NÃO REABRIR |
| origin | 我是巴西人 | sim | l10 | sim | Identity | sim | sim | NÃO REABRIR |
| study | 我是学生 | sim | estudo | fill só | Identity | sim | fill 是 | RECALL |
| work | 我要工作 | sim | p6-rotina-trabalho | sim | Routine | sim | sim | PLANO |
| family/friend | 朋友 / 家人 | sim | família | sim | People | sim | sim | NÃO REABRIR |
| today/tomorrow | 今天 / 明天 / 昨天 | sim | p6-horarios | sim | Routine | sim | fill 天 | RECALL |
| time | 几点 / 什么时候 | sim | Routine/Time | sim | que-horas-sao | sim | sim | NÃO REABRIR |
| weather | 今天很冷 / 今天很热 | sim | p6-clima | choose | como-esta-o-tempo | sim | listen | CONVERSA |
| reciprocal | 你呢 | sim | l3 | fraca | pontual | sim | build+speak | FUNÇÃO |
| also | 我也是 / 我也很好 | sim | l10 / chunks | sim | conhecer-alguem | — | NPC react | REUSE |
| close | 再见 / 明天见 | sim | despedida | sim | First Contact | listen_select | sim | CONVERSA |
| repair | 请再说一遍 / 请慢一点 | sim | l11 / airport | sim | airport/clinic | sim | ramos ≠ | TRANSFER |
| courtesy | 请问 / 谢谢 | sim | cortesia | sim | survival | warmup | sim | TRANSFER |

**0 chunks novos.** A conversa cotidiana fecha só com recall/transfer.

### Cultura

Não criar “como chineses conversam”. Reuso: cumprimentos e cortesia já nas Culture Lessons existentes. Nenhum `cultureItemId` novo. Culture Lesson continua nó real da Jornada.

## Everyday

- Lição: `p7-conversa-cotidiana` (`Imersão: conversa cotidiana`)
- Cena nova: `conversa-cotidiana` (street, Mei, `sceneRole: "immersion"`)
- Arco: `CHINA_SURVIVAL_EVERYDAY_ARC`
- Progressão: listen → listen_select (“O que ficou combinado?”) → fill 是 / 天 → build 你呢 → speak 我很好。你呢？ → listen clima → conversa
- Continuidade: cumprimento → bem-estar + 你呢 → Mei reage (também + frio) → plano de amanhã → reparo real → 再见
- NPC: 我很好 → 我也很好。我不舒服 → 不舒服？ (não “很好!”). 我要工作 → 明天？工作？
- Reparo: 请再说一遍 repete 明天见；请慢一点 divide 明天。 / 见。
- Speaking First: `productionOpen` + Falar primário. Independent sem chips no produce da lição.

## Capstone

- Lição: `p7-china-survival` (`Imersão: um dia na China`)
- Arcos: `CHINA_SURVIVAL_CAPSTONE` + `CHINA_SURVIVAL_GLOBAL_ARC`
- `newRefs`: 0. `newHanzi`: nenhum.
- Warm-up curto (listen 请问 + 3 fills). Mastery alta (pass ≥ 3) salta o warm-up.
- Variante = `attemptNumber % 3` (sem RNG)

| Variante | Episódios |
|---|---|
| A | conversa-cotidiana → restaurante → metrô → hotel (hotel só no plano runtime) |
| B | conversa-cotidiana → loja → táxi → aeroporto |
| C | conversa-cotidiana → rua/saúde → clínica |

Hotel não entra nos `steps` autorais para não reabrir a dívida `char:de` sob uma chave nova. O plano A injeta `checkin-hotel`.

Transferência: 我要 (restaurante + loja + produção), 在哪里 (hotel/aeroporto/saúde + produção), 请问 (warmup + estação).

Scoring: accuracy / assistance / stars / XP existentes. Victory = `LessonVictory`. Replay via `claimReward`. Resume via `lessonSessionStepById`. Checkpoint por passo = episódio.

Achievement existente (catálogo, sem motor novo): `jornada-china-survival`.

## Cenas

| Cena | Papel nesta remessa |
|---|---|
| `conversa-cotidiana` | **nova** — everyday + first contact do capstone |
| `imersao-restaurante` | reuso A |
| `conversa-na-loja` | reuso B |
| `imersao-estacao` / `pegar-taxi` | reuso A/B |
| `checkin-hotel` / `no-aeroporto` | reuso A/B |
| `nao-me-sinto-bem` / `na-clinica` | reuso C |

## QA naturalness (autorado)

| Superfície | Classificação | Nota |
|---|---|---|
| conversa-cotidiana | OK | tópicos ligados; NPC reage; 你呢 por função |
| First Contact / Identity / Routine | OK | não reescritos |
| Restaurant / Shopping / Mobility | OK | reuso |
| Hotel / Airport / Health | OK | reuso; hotel fora do authored do capstone |
| Capstone | reduz OVER_SCRIPTED | produce + decision + listen + repair |

## Gates novos

- `validate/test:china-survival-everyday`
- `validate/test:china-survival-capstone`
- `validate/test:capstone-no-new-vocabulary`
- `validate/test:capstone-transfer`

Mutations 1–16 cobertas nos testes acima (newRef, Hanzi novo, 你呢, speaking, naturalness, coerência, repair, listening, rotation, quiz-only, victory, transfer). 14 checkpoint e 18 mobile no E2E. 15 replay XP e 17 culture card: infraestrutura existente (`claimReward`, sem card pós-aula).

## Preservado

Todos os gates 9A listados em P34, inclusive `validate:beta` e `npm run build`.

## PT / EN / mobile

- Overlay EN para copy nova + título das duas lições
- E2E 390×844 mantém Falar
- E2E EN no player cotidiano

## QA e evidências

### E2E `e2e/v499b-everyday-capstone.spec.ts`

7/7 Chromium contra preview em 4173:

- listen / fill / montar 你+呢 / produção / cena
- Capstone A: rua → restaurante
- Capstone B: rua → loja
- Capstone C: rua → saúde
- Falar em 390×844
- Player EN
- refresh mantém o episódio

### QA humano (390×844, `/qa/conversation-scene`)

| Pergunta | Resultado |
|---|---|
| Parece conversa? | Sim. Cumprimento → bem-estar+你呢 → clima → amanhã → reparo → 再见 |
| Parece prova? | Não no caminho principal; opções de reparo são decisão, não quiz solto |
| NPC reage? | 我很好。你呢？ → 我也很好。今天很冷。 / 我不舒服 → 头疼吗？ (não 很好) |
| Consigo escolher? | Sim (bem-estar, plano, reparo) |
| Erro e recuperação? | 请再说一遍 repete 明天见; 请慢一点 divide (gate + cena) |
| Conteúdo antigo? | Sim. 0 chunks novos |
| Informação nova escondida? | Não |
| Falar confortável? | Sim na produção cotidiana e na saúde; turnos de escolha do restaurante usam Responder |
| PT/EN | PT no player; EN overlay + E2E |

`tell_when` agora aceita `ask_repeat` (mesmo contrato de `tell_gate` / `tell_direction`).

Imersão de revisão pode reusar hànzì já declarado em `newHanzi` anterior sem republicar vocabulário. Imersão não entra na cota visual de revisão de módulo.

## Gates / build

- Gates 9B: PASS (incluindo mutations)
- `e2e/v499b-everyday-capstone.spec.ts`: 7/7 PASS
- `validate:beta`: em fechamento da cauda (relatórios + seo)
- `npm run build`: a registrar após a cauda
