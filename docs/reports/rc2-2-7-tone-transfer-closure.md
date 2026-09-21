# RC2.2.7 — Tone Transfer Closure

| Campo | Valor |
| --- | --- |
| Base | `#279` (RC2.2.6) — não esperou merge |
| Branch | `cursor/rc2-2-7-tone-transfer-5b4f` |
| Fingerprint antes | `516692632525` |
| Fingerprint depois | **`ef3d300ef2b9`** |
| Lições / tópicos / CultureItems | 134 / 113 / 30 — **inalterados** |
| Exceção de freeze | `CONTROLLED_PEDAGOGY_CONTENT_EXCEPTION` |
| Verdict Public Beta | **NO-GO** (inalterado) |

## O buraco que esta remessa fecha

O currículo tinha **190 tarefas com consciência tonal** e **zero transferência**:

| categoria | antes | depois |
| --- | --- | --- |
| `toneAwarenessTasks` | 32 | 32 |
| `toneContourTasks` | 85 | 85 |
| `toneNumberTasks` | 42 | 42 |
| `toneMarkTasks` | 13 | 13 |
| `toneProductionTasks` | 5 | 5 |
| **`toneTransferTasks`** | **0** | **12** |
| `toneTasksTotal` | 190 | 202 |

As cinco primeiras linhas ficaram **intactas de propósito**. Se elas tivessem
mexido, significaria que a remessa reclassificou conteúdo existente em vez de
criar transferência — e a métrica estaria comprada, não conquistada.

O diagnóstico por trás do número: o aluno percebia contorno, escolhia número e
marcava marca — sempre dentro de um exercício cujo **assunto** era o tom. Ele
nunca usava o tom para **dizer alguma coisa a alguém**. Tom era matéria, não
ferramenta.

## Arquitetura

### Fonte única: `src/data/toneTransfer.ts`

Frase-alvo, situação, tons, sandhi e lembrete tonal em PT e EN moram no
registro. `journey.ts` apenas materializa. Não existe segunda lista, e o gate
recusa divergência entre registro e Jornada (`REGISTRY_DRIFT`).

O registro entrou em `CURRICULUM_SOURCES`. Sem isso, mexer na copy dessas
tarefas não moveria o fingerprint e o relatório mentiria por omissão.

### Reuso, não motor novo

Cada passo é um `free_production` — mesmo renderer, mesma mecânica, mesma
entrada por voz do `FreeAnswerField` (`speechAsAlternative`). **Zero StepKind
novo.** O gate recusa qualquer outro `kind` (`NEW_ENGINE`).

Duas decisões de implementação que valem registro:

- **`productionGoal` fica de fora.** O enum `CommunicativeGoal` é de
  sobrevivência (`request_item`, `refuse_drink`, `count_possession`…) e nenhum
  valor descreve cumprimentar, agradecer ou pedir reparo. Inventar um rótulo
  que não serve seria pior do que não ter rótulo — e `exerciseValidation` só o
  exige em produção **aberta**.
- **A evidência é montada inline, não via `withPedagogicalEvidence`.** Esse
  helper mora em `pedagogicalSpine.ts`, que importa `ALL_LESSONS` de
  `journey.ts`. Chamá-lo de dentro de `journey.ts` criaria ciclo de runtime. O
  objeto produzido é idêntico ao que o helper produziria.

## As 12 tarefas

| lição | tarefa | alvo | tons | sandhi | contexto |
| --- | --- | --- | --- | --- | --- |
| `p1-ate-logo` | `tt-p1ate-ate-logo` | 再见 | 4 | — | **conversa** |
| `p1-qingwen-cortesia` | `tt-p1qw-com-licenca` | 请问 | 3,4 | — | **conversa** |
| `l3` | `tt-l3-estou-bem` | 我很好 | 3 | 3º+3º | **conversa** |
| `l4` | `tt-l4-de-nada` | 不客气 | 2,4 | 不 | **conversa** |
| `p3-wobuhui-shuo-zhongwen` | `tt-p3wbh-nao-sei-falar` | 我不会说中文 | 1,2,3,4 | 不 | **conversa** |
| `p3-qing-zai-shuo-yibian` | `tt-p3qzs-repita` | 请再说一遍 | 1,3,4 | 一 | **conversa** |
| `l9` | `tt-l9-sente-se` | 请坐 | 3,4 | — | **conversa** |
| `l9-tudo-bem` | `tt-l9tb-pergunte-de-volta` | 你好吗？ | 3 | 3º+3º | **conversa** |
| `l10` | `tt-l10-sou-brasileiro` | 我是巴西人 | 1,2,3,4 | — | **conversa** |
| `l11` | `tt-l11-repita` | 请再说一遍 | 1,3,4 | 一 | **conversa** |
| `l11-falo-pouco` | `tt-l11fp-falo-um-pouco` | 我会说一点中文 | 1,3,4 | 一 | situação |
| `l11-falo-pouco` | `tt-l11fp-estudo-chines` | 我学习中文 | 1,2,3 | — | situação |

**12 tarefas · 11 lições · 10 em conversa** — contra os mínimos de 12 / 6 / 4.
E, o que importa mais: **as 12 são jogadas**. Ver a seção de alcançabilidade.

Cobertura: tons **1, 2, 3, 4** · sandhi **3º+3º**, **不**, **一**.

### Contexto de conversa é verificado, não declarado

`context: "conversation"` obriga o passo anterior em `ALL_LESSONS` a ser a
própria `conversation_scene` que a tarefa diz retomar. O gate compara o
`sceneId` dos dois (`NOT_AFTER_CONVERSATION`, `SCENE_MISMATCH`). Declarar
contexto de conversa sem estar depois de uma conversa é erro de build.

## Alcançabilidade: o número quase saiu falso

Esta é a correção mais importante da remessa, e ela veio do E2E reprovando.

Estar em `ALL_LESSONS` **não significa ser jogado**. Lições de mastery loop
passam por `applyMasteryPassToPlan`, que pontua cada passo e corta pelo
orçamento da passada. E há uma regra explícita em `lessonTasks.ts:7154`:

```ts
if (pass <= 1 && isProductionOrTransferKind(step.kind)) score -= 1;
```

Produção e transferência são penalizadas nas passadas iniciais. Isso está
**certo**: TRANSFER é o degrau mais alto da espinha, e cobrá-lo na estreia
contradiria o próprio "ensinar antes de cobrar". O planner não é o defeito.

O defeito era meu: eu havia autorado **duas** tarefas por lição de loop. O
orçamento guarda uma e descarta a outra — para sempre, em todos os níveis. A
medição contra o runtime foi esta:

| | autoradas | jogadas | nunca jogadas |
| --- | ---: | ---: | ---: |
| Primeira tentativa (2 por lição) | 14 | **8** | **6** |
| Depois da correção (1 por lição de loop) | 12 | **12** | **0** |

Ou seja: o relatório teria anunciado `0 → 14` enquanto o aluno encontraria 8.
Seis tarefas seriam conteúdo morto — presentes no arquivo, contadas pelo gate
estático, invisíveis na prática.

A correção foi reduzir para uma tarefa por lição de loop e **espalhar por mais
lições** (7 → 11) em vez de empilhar na mesma. Como efeito colateral bom, todas
as 10 âncoras de conversa passaram a sobreviver, contra 4 de 6 antes.

E a proteção permanente: `validate:tone-transfer-coverage` agora **executa o
planner** (`lessonRoundStepsFor`) nos níveis 0–3 de cada lição e falha com
`NEVER_PLAYED` se qualquer tarefa registrada não aparecer em nenhum plano. Os
mínimos (12 / 6 / 4) passaram a ser aferidos sobre o que é **jogado**, não sobre
o que está escrito — senão o gate seria um contador de linhas.

Consequência honesta que fica registrada: as 10 tarefas ancoradas em conversa
só aparecem a partir da **terceira passada** (`masteryLevel` 2 e 3). Duas
(`l11-falo-pouco`) aparecem desde a primeira. Isso não é limitação disfarçada —
é o degrau TRANSFER chegando quando deve chegar, e há caso de teste que afirma
exatamente isso.

## Honestidade de fala (P0)

`analyzePronunciation` (`src/lib/speech.ts:331`) compara sílabas reconhecidas em
ordem. **Não há análise de pitch em lugar nenhum do caminho** — nem altura, nem
contorno, nem duração.

Por isso nenhuma tela afirma que o tom do aluno saiu certo. O lembrete tonal é
**lembrete do alvo**, mostrado em `explanation` (depois da tentativa), e todos
terminam com a mesma ressalva explícita:

> O app confere as sílabas, não o tom — ouça o modelo e compare.

`validate:tone-transfer-honesty` recusa oito padrões de reivindicação (`seu
tom`, `tom correto`, `your tone is`, `tone accuracy`…) varrendo o registro, as
**134 lições** e os dois locales; e exige que todo lembrete carregue a ressalva.

O gate ainda carrega um **tripwire estrutural**: se alguém implementar análise
de pitch de verdade (`AnalyserNode`, `getFloatFrequencyData`, autocorrelação…),
ele falha — avisando que a copy ficou modesta demais e precisa ser revista de
propósito, em vez de envelhecer errada em silêncio.

## Classificação tonal: de texto para metadado

`validate:tone-teach-before-test` classificava transferência procurando a
palavra “transfer” na copy do aluno. Isso era frágil dos dois lados: a copy não
deve anunciar “esta é uma transferência tonal” (quebraria a ilusão de
comunicação real), e qualquer texto que mencionasse transferência passava a
contar sem ser transferência.

Agora quem decide é o degrau pedagógico + o alvo de conhecimento:

```js
if (step.pedagogicalEvidence?.rung === "TRANSFER" && hasToneKnowledgeTarget(step))
  return "TONE_TRANSFER";
```

A troca foi verificada como **preservadora de comportamento** antes de a autoria
começar: com a regra nova e nenhuma tarefa nova, as métricas continuaram
190/32/85/42/13/5/0. Há caso de teste para os dois lados (copy com a palavra
“transferência” e degrau errado **não** conta; degrau certo sem alvo tonal
**não** conta).

## Fingerprint: `516692632525` → `ef3d300ef2b9`

Não foi mantido artificialmente. Congelar identidade é registrar o que mudou,
não fingir que nada mudou.

A propagação separou **gate** de **evidência**, e essa distinção é o ponto:

| | tratamento |
| --- | --- |
| Gates de freeze, fixtures, manifests de release | retargetados para `ef3d300ef2b9` |
| `docs/release/human-qa-prebeta.json` | retargetado — ver abaixo |
| **`docs/release/device-preflight.json`** | **intocado** |
| Relatórios históricos (`docs/reports/*`) | **intocados** |

- **`human-qa-prebeta.json` pôde ser retargetado** porque nada do QA humano
  começou: `founderQa: NOT_STARTED`, `l1ToL20: NOT_STARTED`,
  `externalTesterCount: 0`, `verdict: NO-GO`. Não existe evidência a invalidar —
  é um plano pendente, e apontá-lo para o currículo atual não afirma nada falso.
- **`device-preflight.json` NÃO foi retargetado** porque ali há execução real e
  datada (`testedAt: 2026-09-17`, quatro `PREFLIGHT_PASS`) contra
  `516692632525`. Trocar o fingerprint afirmaria que o preflight foi refeito
  contra o currículo novo. Não foi. Nenhum gate compara esse campo com o
  fingerprint vivo, então o arquivo permanece verdadeiro e o build segue verde.

  `test:pwa-upgrade-preflight` reescreve `testedAt` a cada execução, e essa
  churn foi **descartada de propósito**: commitá-la produziria um arquivo que
  diz ter rodado hoje enquanto atribui o resultado ao currículo antigo. Um
  gate estrutural que roda de novo não é evidência de dispositivo nova — o
  próprio arquivo avisa que `PREFLIGHT_*` não é PASS operacional.
- **Relatórios históricos mantêm `516692632525`** porque descrevem o que era
  verdade quando foram escritos. Reescrevê-los seria falsificar registro.

## Gates novos

| gate | o que recusa |
| --- | --- |
| `validate:tone-transfer-coverage` | menos de 12 tarefas / 6 lições / 4 em conversa; tom ou sandhi sem cobertura; registro e Jornada divergentes; StepKind novo; apoio vazando; hànzì na situação; contexto de conversa não ancorado na cena |
| `validate:tone-transfer-honesty` | copy que reivindica avaliação de tom (registro + 134 lições + 2 locales); lembrete sem a ressalva; análise de pitch surgindo sem revisão da copy |
| `test:tone-transfer` | 24 casos — registro, materialização, ancoragem, honestidade, classificação semântica e ensinar-antes-de-cobrar |

Os três foram encadeados no `validate:beta`, para o CI executá-los de fato.

## Ensinar antes de cobrar

Cada alvo já é ensinado **antes** do ponto onde é cobrado, e há teste que
percorre a Jornada inteira desde a primeira lição até o passo da tarefa para
provar isso (`nenhuma tarefa cobra uma frase antes de a Jornada tê-la
apresentado`).

Duas colocações minhas foram **corrigidas por essa verificação**, antes de
qualquer commit:

- `我是巴西人` estava logo depois de `conversationScene("me-apresentando")` em
  `l9` — mas a lição só ensina essa frase **depois** da cena. Virou tarefa de
  situação, e o posto de conversa ficou com `我叫…`, que já fora ensinado.
- `我听不懂` seria o contraste natural de 不 em `p3-qing-zai-shuo-yibian`, mas
  essa lição vem **antes** de `l11`, onde a frase é ensinada. Foi trocada.

Uma terceira foi corrigida na releitura adversarial do próprio diff, antes do
push: `l9` tinha uma tarefa ancorada na conversa cujo alvo era `我叫Matheus`. A
situação dizia “alguém quer saber **o seu** nome”, mas a tarefa só aceitaria um
nome fixo — e, em modo de fala, o trecho latino não sobreviveria ao
reconhecimento em `zh-CN`. A âncora de conversa de `l9` passou a ser `请坐`
(módulo 1, cabe na cena, sem nome pessoal), e a tarefa do nome saiu. Por isso
são 14 tarefas, não 15.

Esse segundo caso tinha ainda um problema de honestidade: em `听不懂`, 不 é um
complemento potencial e costuma sair átono (`tīngbudǒng`), não “bù que não sobe
porque 懂 é 3º tom”. Afirmar a regra ali seria ensinar algo contestável — e a
remessa cujo P0 é honestidade não vai comprar cobertura de sandhi com uma
meia-verdade.

## Não verificado — declarado, não presumido

- **Nenhum PASS operacional novo.** `cloud_auth`, `cloud_sync`,
  `feedback_backend`, `android_real_device`, `ios_real_device`, `pwa_upgrade`,
  `rollback_drill` seguem sem evidência nova.
- **QA humano do fluxo tonal não foi feito.** Se as 15 situações “soam como
  conversa de verdade” é julgamento humano. O que está provado é contrato:
  ancoragem, ausência de apoio, honestidade de copy, fallbacks de fala.
- **O preflight de dispositivo agora é anterior ao currículo atual.** Ele
  permanece verdadeiro sobre `516692632525` e **não** cobre `ef3d300ef2b9`.
- **Reconhecimento de fala é falsificado no E2E.** O navegador do CI não tem
  microfone. Prova-se a affordance e os fallbacks, nunca a qualidade do
  reconhecedor.

## Verdict

Public Beta continua **NO-GO**.
