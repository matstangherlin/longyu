# RC2.2.9 — Conversation Capability Closure & Beta Pedagogy Freeze

> Public Beta continua **NO-GO**. Esta remessa fecha dívida pedagógica; não
> certifica nada operacional (ver "Não verificado").

## Base

```text
BASE_MAIN_SHA
700aa83264cee8429313ad0e52881e90b09fa2e8   (#281 mergeado)
```

Preflight: `main` estava exatamente em `700aa83`. A branch de trabalho é
`claude/admiring-cray-4fx10i` (a sessão só pode publicar nessa branch; o nome
`cursor/rc2-2-9-capability-closure-beta-freeze` do plano não foi usado),
recriada a partir de `origin/main` depois do merge do #281. #273 não foi
tocada; nenhum projeto Supabase, credencial Netlify ou check operacional foi
mexido.

## Antes

- 11 capacidades declaradas `PARTIAL` em `src/data/conversationCapabilities.ts`:
  talk_family, order_food, order_drink, negotiate_basic, pay, use_metro,
  use_train, ask_for_help, ask_repeat, express_preference, make_simple_plan.
- O mapa gerado (`conversation-capability-map.md`) mostrava **31/31 READY**:
  `scoreCapability` dava `listeningCoverage = journeyLessons.length > 0 ? 0.8 : 0`,
  `conversationCoverage = hasConversation ? 1 : 0`,
  `transferCoverage = transferScenarios.length > 0 ? 1 : 0`,
  `productiveCoverage = hasProductivePractice ? 1 : 0`, e READY saía de
  `readinessScore >= 0.85`. Metadado preenchido bastava.

## O que a auditoria de runtime encontrou

A evidência agora vem dos planos que `lessonRoundStepsFor` entrega a um aluno
que seguiu a Jornada (lições anteriores concluídas, chunks aprendidos, rodadas
de maestria M1–M4 como o LessonPlayer pede). Passo autoral que o planner
descarta não conta.

| Capacidade | Resultado da auditoria | Causa real |
| --- | --- | --- |
| talk_family | REAL GAP | 我没有… só exposto (sem produção/uso); nenhuma transferência fora da foto; 弟弟/妹妹 exigidos mas nunca ensinados; a cena `packet-exchange-family` existe em l25 mas o plano de maestria nunca a entrega |
| order_food | REAL GAP | 不要辣 nunca chegava ao aluno; 我想吃米饭 cobrado (l26c) sem ensino; 肉/鱼 cobrados sem ensino; `chunk:woyaofan` (我要饭) exigido — 要饭 é "pedir esmola" no uso corrente |
| order_drink | REAL GAP | 我想喝水 e 我要水 cobrados em l26b M3/M4 sem nenhum ensino em runtime |
| negotiate_basic | REAL GAP | 便宜一点 só ouvido: sem produção, sem escuta com decisão; 太贵了 produzido antes de ensinado |
| pay | REAL GAP | 微信支付 / 现金 / 可以刷卡吗 cobrados sem ensino (a apresentação de p6-survival-mandarin é descartada pelo recorte de maestria); 支付宝 nunca ensinado |
| use_metro | REAL GAP | 我坐地铁 sem produção; estrutura "我要一张票" usa 张, que nenhuma lição ensina |
| use_train | REAL GAP | nenhuma escuta; 我要票 nunca produzido num contexto de trem |
| ask_for_help | REAL GAP | 我需要帮助 cobrado em p6-survival-mandarin M4 antes do primeiro ensino (p7-imersao-aeroporto); nenhuma escuta |
| ask_repeat | **PASS existing content** | as seis dimensões já tinham evidência de runtime (escuta, reparo, conversa `pedir-repeticao`, transferência); só o status declarado estava errado |
| express_preference | REAL GAP | 我不喜欢… inexistente; nenhuma conversa e nenhuma escuta de preferência |
| make_simple_plan | REAL GAP | 我们走吧 cobrado por áudio em l28 antes do ensino; 我要去北京 cobrado sem ensino; plano só como despedida |

Também apareceram buracos nas 20 capacidades que já eram READY (dimensão
ausente, ou chunk exigido que nunca chega ao aluno): talk_routine (escuta 0;
我吃早饭 nunca ensinado), tell_time (下午三点 / 九点十分 nunca ensinados),
ask_directions (nenhuma conversa em que o aluno pede o caminho), use_taxi e
health_basic (escuta 0), airport_basic (我坐飞机 / 飞机场在哪里 / 我的航班在哪里
nunca ensinados), weather_smalltalk (天气很热/冷 nunca ensinados; transferência 0).
Foram fechados na mesma remessa, porque o Gate 1 vale para todo READY
declarado.

Achado registrado, não corrigido: o bônus de maestria autoral de `l24` em
`src/data/masteryPilot.ts` nunca roda — o plano de identidade tem precedência
em `lessonRoundStepsFor`. É conteúdo morto; não afeta nenhuma capacidade
(a família é provada pelo plano de identidade) e fica para limpeza posterior.

## O que mudou

Prioridade usada (parte H do plano): conectar conteúdo existente → corrigir
metadado → pequeno número de passos → conteúdo novo só se inevitável.

1. **Conteúdo existente conectado ao runtime.** 21 flashcards de chunks que já
   estavam no registry, cada um na lição que `lexicalLifecycleEntries.ts` já
   declarava como `introduceAt` (不要辣, 我想吃米饭, 我想喝水, 我要水, 我要肉,
   我要鱼 em l26b; 微信支付, 现金, 可以刷卡吗, 太贵了 em l27; 我们走吧 em l11; 我要去北京, 我坐飞机, 飞机场在哪里 em p6-cidade-lugares; …).
   Nenhum chunk novo.
2. **Metadado corrigido.** `talk_family` sem 弟弟/妹妹; `order_food` sem
   `chunk:woyaofan`; `pay` sem `chunk:zhifubao` (nenhum meio de pagamento é
   apresentado como universal); `use_metro` com a estrutura "我要票" no lugar de
   "我要一张票".
3. **Passos pequenos em lições existentes** (`src/data/capabilityClosureSteps.ts`):
   escutas `audio_to_action` sem a resposta escrita antes, montagens
   `sentence_build`, produções/transferências `reverse_recall` em situações
   novas, e as tarefas pós-conversa das cenas novas. Aplicados num ponto único
   de `lessonRoundStepsFor`, no fim da rodada, para qualquer tipo de plano.
4. **Conteúdo novo inevitável:** duas cenas dedicadas em
   `src/data/conversationScenes.ts` — `gostos-na-casa` (preferência: intenção,
   reação, progressão, fechamento) e `perguntar-o-caminho` (o aluno pede o
   caminho, entende a instrução e agradece). Só palavras já ensinadas; marcadas
   `dedicatedLesson` para não entrarem na seleção genérica de outras lições.

Nenhuma lição, tópico, CultureItem, StepKind, motor de capacidade ou motor de
conversa novo.

## Motor de capacidade (evoluído, não duplicado)

- `scoreCapability` / `computeCapabilityStatus` continuam em
  `src/data/conversationCapabilities.ts` e agora recebem
  `CapabilityRuntimeEvidence`. Sem evidência, a dimensão é 0. `journeyLessons`,
  `hasConversation`, `hasProductivePractice` e `transferScenarios` não entram
  mais na pontuação — viraram declarações que o gate G3 confere.
- READY não sai de média. Contrato **estrito** para as 11: léxico e estrutura
  em 1.00 (ensinado antes de cobrado) e produção, escuta, conversa e
  transferência com evidência. Contrato de **presença** para as 20 que já eram
  READY: nenhuma dimensão ausente e todo chunk exigido chega ao aluno.
- `src/lib/capabilityRuntimeEvidence.ts` só responde "qual lição, qual passo,
  qual cena, qual texto, é alcançável" para cada dimensão; não decide status.

## Depois

- **11/11** capacidades desta remessa READY em runtime no contrato estrito.
- **31/31** READY em runtime (11 no contrato estrito + 20 no contrato de
  presença). Declarado = calculado para todas (gate K1).
- China Survival: **9/9** cenários com todas as capacidades READY em runtime;
  os 10 passos do caminho simulado idem.

Dívida registrada (não escondida): 13 das 20 capacidades de presença ainda não
passariam no contrato estrito — ordem de ensino dentro das rodadas de
maestria ou estrutura sem as três fases. Os números por capacidade estão na
tabela de presença abaixo (colunas Léxico/Estrutura < 1.00). Nenhuma delas tem
dimensão ausente.

## Contagens

| Item | Antes | Depois |
| --- | ---: | ---: |
| Lições | 134 | 134 |
| Teaching topics | 113 | 113 |
| CultureItems | 30 | 30 |
| Culture Native Lessons | 30 | 30 |
| Journey Culture nodes | 20 | 20 |
| Culture Moments | 5 | 5 |
| Tone Transfer jogáveis | 12 | 12 |
| Cenas de conversa no catálogo | 50 | 52 |
| Capacidades declaradas READY | 20/31 | 31/31 |
| Capacidades READY em runtime (sem proxy) | não medido (o mapa usava proxies) | 31/31 |

## Fingerprint

`327de1df0f33` → `c48b008c9c1e`.

Mudaram `src/data/conversationScenes.ts` (duas cenas),
`src/features/lesson/lessonTasks.ts` (ponto único que aplica os passos de
fechamento) e o novo `src/data/capabilityClosureSteps.ts`, que passou a ser
`CURRICULUM_SOURCE` — sem isso, mudar essas tarefas não moveria o fingerprint.
O valor novo foi registrado em `RC_BASE_FINGERPRINT`, nos freezes e manifestos
de release; relatórios históricos mantêm o valor da época.

## Gates novos (em `validate:beta`, via `gate:rc2-2-9-capability-closure`)

| Script | O que prova |
| --- | --- |
| `validate:capability-runtime-evidence` | G1 READY sem dimensão · G3 metadado sem runtime · G4 passo inalcançável · G5 escuta com resposta escrita · G6 transferência só declarada · G7 conversa sem turno · K1 declarado ≠ calculado · A1 ensino depois da cobrança · A3 hànzì novo numa prova · U copy sem EN · J segundo motor / proxy de metadado. Regenera o JSON e o bloco abaixo |
| `test:capability-runtime-evidence` | 19 mutações (as 18 do plano + reintroduzir o proxy de escuta), todas mortas |
| `validate:partial-capability-closure` | auditoria G1–G11 capacidade a capacidade + China Survival exigindo READY de runtime |
| `test:partial-capability-closure` | 14 mutações (trem = metrô com outra palavra, plano que é só despedida, preferência sobre um objeto só, benchmark sem pagar…) |
| `validate:beta-pedagogy-freeze` / `test:beta-pedagogy-freeze` | BETA_PEDAGOGY_FREEZE + 12 mutações (lição, tópico, CultureItem, moeda, SRS, motor de desafio/conquista, progressão, feature pública, fingerprint) |

Artefato de máquina: `docs/release/rc2-capability-closure.json` (regenerado
pelo validator; nada preenchido à mão).

## BETA_PEDAGOGY_FREEZE

`src/lib/curriculumFreeze.ts` registra: 134 lições · 113 teaching topics · 30
CultureItems · 30 Culture Native Lessons · 20 Journey Culture nodes · 5 Culture
Moments · 12 Tone Transfers jogáveis · 31/31 capacidades READY em runtime
(11 estrito + 20 presença) · fingerprint `c48b008c9c1e`, além da lista de
módulos de progressão/economia/SRS/desafio/conquista, dos exports da economia e
das features públicas de `featureTruth.ts`. Bloqueia sem atualização explícita:
lição, tópico, CultureItem, sistema de progressão, moeda, SRS, motor de
desafio, motor de conquistas, feature pública. Livre: bug fix,
acessibilidade, performance, compatibilidade Android, segurança, engenharia de
release, correções de QA, copy.

## Evidência por capacidade

<!-- evidencia:inicio -->
Gerado por `npm run validate:capability-runtime-evidence` · fingerprint `c48b008c9c1e` · base `700aa83264ce`.

Runtime READY: **31/31** · capacidades desta remessa: **11/11** no contrato estrito.

### As 11 capacidades (contrato estrito)

#### talk_family — Falar da família

| Campo | Valor |
| --- | --- |
| Capability | `talk_family` |
| Declared status before | PARTIAL |
| Declared status after | READY |
| Lexical evidence | 6/6 chunks ensinados antes de cobrados · 5/5 palavras (这是我爸爸, 这是我妈妈, 我有姐姐, 我有一个哥哥, 我没有姐姐, 这是我家) |
| Structural evidence | 这是我… → ensino l18·M3, produção l24·M2, uso l24·M4; 我有… → ensino l13-dialogo-nome·M1, produção l13-dialogo-nome·M3, uso p3-ordem-das-palavras·M3; 我没有… → ensino l24·M1, produção l24·M2, uso p7-imersao-casa-amigo·M3 |
| Productive task | l24 · M2 · passo 7 · sentence_build — 这是我爸爸 (7 no total) |
| Listening task | l24 · M1 · passo 10 · audio_to_action — 我没有姐姐 (2 no total) |
| Conversation scene | l24 · M4 · passo 1 · conversation_scene · cena identificar-pessoa/pessoa-2 — 这是我妈妈 (1 turnos) |
| Transfer task | p7-imersao-casa-amigo · M3 · passo 10 · reverse_recall — 我有一个哥哥我没有姐姐 (1 no total) |
| Reachable | sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal |
| First teach position | l24 · M1 · passo 1 · flashcard — 这是我爸爸 |
| First test position | l24 · M1 · passo 10 · audio_to_action — 我没有姐姐 |
| Final verdict | **READY** |

#### order_food — Pedir comida

| Campo | Valor |
| --- | --- |
| Capability | `order_food` |
| Declared status before | PARTIAL |
| Declared status after | READY |
| Lexical evidence | 5/5 chunks ensinados antes de cobrados · 7/7 palavras (我要米饭, 我想吃米饭, 不要辣, 服务员！, 菜单) |
| Structural evidence | 我要… → ensino l26b·M1, produção l26b·M3, uso l26b·M1; 我想吃… → ensino l26b·M1, produção l26c·M1, uso l26b·M1; 不要辣 → ensino l26b·M1, produção l26b·M3, uso l26b·M4 |
| Productive task | l26b · M3 · passo 10 · sentence_build — 我要米饭不要辣 (17 no total) |
| Listening task | l26b · M2 · passo 9 · audio_to_action — 不要辣 (5 no total) |
| Conversation scene | l26b · M1 · passo 2 · conversation_scene · cena pedir-cardapio/cardapio-3 — 我要菜单 (26 turnos) |
| Transfer task | l26c · M1 · passo 8 · conversation_scene · cena imersao-restaurante — 服务员 (17 no total) |
| Reachable | sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal |
| First teach position | l26b · M1 · passo 2 · conversation_scene · cena pedir-cardapio — 我要米饭 |
| First test position | l26b · M2 · passo 9 · audio_to_action — 不要辣 |
| Final verdict | **READY** |

#### order_drink — Pedir bebida

| Campo | Valor |
| --- | --- |
| Capability | `order_drink` |
| Declared status before | PARTIAL |
| Declared status after | READY |
| Lexical evidence | 4/4 chunks ensinados antes de cobrados · 2/2 palavras (我想喝水, 我要水, 我要一杯茶, 一杯茶) |
| Structural evidence | 我想喝… → ensino p5-kou-ma-pergunta·M1, produção l26b·M3, uso p5-kou-ma-pergunta·M1; 我要一杯茶 → ensino l26b·M1, produção l27·M3, uso l26b·M1 |
| Productive task | l26b · M3 · passo 1 · sentence_build — 我想喝水 (31 no total) |
| Listening task | p7-imersao-casa-amigo · M1 · passo 1 · audio_to_action — 我想喝茶 (1 no total) |
| Conversation scene | p5-kou-ma-pergunta · M1 · passo 3 · conversation_scene · cena o-que-e-isto/isto-6 — 我想喝茶 (30 turnos) |
| Transfer task | l26c · M1 · passo 8 · conversation_scene · cena imersao-restaurante — 我要一杯茶 (32 no total) |
| Reachable | sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal |
| First teach position | l26b · M1 · passo 2 · conversation_scene · cena pedir-cardapio — 我要一杯茶 |
| First test position | l26b · M3 · passo 1 · sentence_build — 我想喝水 |
| Final verdict | **READY** |

#### negotiate_basic — Negociar preço básico

| Campo | Valor |
| --- | --- |
| Capability | `negotiate_basic` |
| Declared status before | PARTIAL |
| Declared status after | READY |
| Lexical evidence | 2/2 chunks ensinados antes de cobrados · 2/2 palavras (太贵了, 便宜一点) |
| Structural evidence | 太贵了 → ensino l27·M1, produção l27·M3, uso l27·M4; 便宜一点 → ensino l27·M1, produção l27·M3, uso l27·M4 |
| Productive task | l27 · M3 · passo 10 · sentence_build — 太贵了便宜一点 (13 no total) |
| Listening task | l27 · M2 · passo 9 · audio_to_action — 便宜一点 (1 no total) |
| Conversation scene | p6-compras · M1 · passo 2 · conversation_scene · cena conversa-na-loja/loja-3 — 太贵了 (19 turnos) |
| Transfer task | p6-compras · M1 · passo 2 · conversation_scene · cena conversa-na-loja — 太贵了 (24 no total) |
| Reachable | sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal |
| First teach position | l27 · M1 · passo 3 · listen — 便宜一点 |
| First test position | l27 · M2 · passo 9 · audio_to_action — 便宜一点 |
| Final verdict | **READY** |

#### pay — Pagar / pedir conta

| Campo | Valor |
| --- | --- |
| Capability | `pay` |
| Declared status before | PARTIAL |
| Declared status after | READY |
| Lexical evidence | 4/4 chunks ensinados antes de cobrados · 3/3 palavras (买单, 微信支付, 可以刷卡吗？, 现金) |
| Structural evidence | 买单 → ensino l26b·M1, produção l26c·M1, uso l26b·M1; 可以刷卡吗？ → ensino l27·M1, produção p6-survival-mandarin·M2, uso p6-survival-mandarin·M2 |
| Productive task | l26b · M1 · passo 2 · conversation_scene · cena pedir-cardapio/cardapio-6 — 买单 (23 no total) |
| Listening task | l26b · M1 · passo 4 · listen_select — 买单 (4 no total) |
| Conversation scene | l26b · M1 · passo 2 · conversation_scene · cena pedir-cardapio/cardapio-6 — 买单 (16 turnos) |
| Transfer task | l26c · M1 · passo 8 · conversation_scene · cena imersao-restaurante — 买单 (14 no total) |
| Reachable | sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal |
| First teach position | l26b · M1 · passo 2 · conversation_scene · cena pedir-cardapio — 买单 |
| First test position | l26b · M1 · passo 4 · listen_select — 买单 |
| Final verdict | **READY** |

#### use_metro — Usar metrô

| Campo | Valor |
| --- | --- |
| Capability | `use_metro` |
| Declared status before | PARTIAL |
| Declared status after | READY |
| Lexical evidence | 5/5 chunks ensinados antes de cobrados · 3/3 palavras (地铁, 我坐地铁, 地铁站, 地铁站在哪里？, 我要票) |
| Structural evidence | 我坐地铁 → ensino p6-china-cidades·M1, produção p6-china-cidades·M3, uso p6-china-cidades·M1; 地铁站在哪里？ → ensino p6-china-cidades·M1, produção p7-imersao-estacao·M3, uso p7-imersao-estacao·M3; 我要票 → ensino p7-imersao-estacao·M1, produção p7-imersao-estacao·M3, uso p7-imersao-estacao·M3 |
| Productive task | p6-china-cidades · M3 · passo 10 · sentence_build — 我坐地铁 (17 no total) |
| Listening task | p7-china-survival · M1 · passo 2 · listen_select — 请问地铁站在哪里 (2 no total) |
| Conversation scene | p6-china-cidades · M1 · passo 3 · conversation_scene · cena packet-exchange-transport/packet-exchange-transport-2 — 我坐地铁 (13 turnos) |
| Transfer task | p6-china-ruas · M4 · passo 2 · free_production — 我要去地铁站 (11 no total) |
| Reachable | sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal |
| First teach position | p6-cidade-lugares · M1 · passo 6 · listen — 地铁 |
| First test position | p6-china-cidades · M3 · passo 10 · sentence_build — 地铁 |
| Final verdict | **READY** |

#### use_train — Usar trem

| Campo | Valor |
| --- | --- |
| Capability | `use_train` |
| Declared status before | PARTIAL |
| Declared status after | READY |
| Lexical evidence | 4/4 chunks ensinados antes de cobrados · 3/3 palavras (火车, 火车站在哪里？, 我要票, 票多少钱？) |
| Structural evidence | 火车站在哪里？ → ensino p6-china-cidades·M1, produção p7-imersao-estacao·M3, uso p7-imersao-estacao·M3; 我要票 → ensino p7-imersao-estacao·M1, produção p7-imersao-estacao·M3, uso p7-imersao-estacao·M3 |
| Productive task | l29 · M3 · passo 8 · free_production — 我去火车站 (10 no total) |
| Listening task | p7-imersao-estacao · M2 · passo 13 · audio_to_action — 火车站在哪里 (1 no total) |
| Conversation scene | p7-imersao-estacao · M4 · passo 1 · conversation_scene · cena onde-esta-o-carro/carro-6 — 我要票 (8 turnos) |
| Transfer task | p7-imersao-estacao · M3 · passo 11 · free_production — 火车站在哪里 (6 no total) |
| Reachable | sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal |
| First teach position | p6-china-cidades · M1 · passo 3 · conversation_scene · cena packet-exchange-transport — 火车 |
| First test position | l29 · M3 · passo 8 · free_production — 火车 |
| Final verdict | **READY** |

#### ask_for_help — Pedir ajuda

| Campo | Valor |
| --- | --- |
| Capability | `ask_for_help` |
| Declared status before | PARTIAL |
| Declared status after | READY |
| Lexical evidence | 1/1 chunks ensinados antes de cobrados · 2/2 palavras (我需要帮助) |
| Structural evidence | 我需要帮助 → ensino l4·M1, produção p6-survival-mandarin·M4, uso p6-survival-mandarin·M4 |
| Productive task | p6-survival-mandarin · M4 · passo 2 · reverse_recall — 我需要帮助 (9 no total) |
| Listening task | l4 · M2 · passo 9 · audio_to_action — 我需要帮助 (1 no total) |
| Conversation scene | p7-imersao-aeroporto · M1 · passo 12 · conversation_scene · cena no-aeroporto/aero-close — 我需要帮助 (10 turnos) |
| Transfer task | p7-imersao-aeroporto · M1 · passo 4 · free_production — 我需要帮助 (18 no total) |
| Reachable | sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal |
| First teach position | l4 · M1 · passo 9 · flashcard — 我需要帮助 |
| First test position | l4 · M2 · passo 9 · audio_to_action — 我需要帮助 |
| Final verdict | **READY** |

#### ask_repeat — Pedir para repetir

| Campo | Valor |
| --- | --- |
| Capability | `ask_repeat` |
| Declared status before | PARTIAL |
| Declared status after | READY |
| Lexical evidence | 2/2 chunks ensinados antes de cobrados · 2/2 palavras (请再说一遍, 请慢一点) |
| Structural evidence | 请再说一遍 → ensino p2-sons-brasileiros·M1, produção l4-rev·M1, uso p2-sons-brasileiros·M1; 请慢一点 → ensino l11·M1, produção p7-imersao-aeroporto·M1, uso p7-imersao-estacao·M4 |
| Productive task | l4-rev · M1 · passo 11 · sentence_build — 请再说一遍 (176 no total) |
| Listening task | p3-qing-zai-shuo-yibian · M1 · passo 7 · audio_to_action — 请再说一遍 (5 no total) |
| Conversation scene | p2-sons-brasileiros · M1 · passo 4 · conversation_scene · cena pedir-repeticao/pedir-repeticao-2 — 请再说一遍 (107 turnos) |
| Transfer task | p3-wobuhui-shuo-zhongwen · M3 · passo 8 · conversation_repair — 请再说一遍 (144 no total) |
| Reachable | sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal |
| First teach position | p2-sons-brasileiros · M1 · passo 4 · conversation_scene · cena pedir-repeticao — 请再说一遍 |
| First test position | l4-rev · M1 · passo 11 · sentence_build — 请再说一遍 |
| Final verdict | **READY** |

#### express_preference — Expressar preferência

| Campo | Valor |
| --- | --- |
| Capability | `express_preference` |
| Declared status before | PARTIAL |
| Declared status after | READY |
| Lexical evidence | 1/1 chunks ensinados antes de cobrados · 1/1 palavras (我喜欢中文) |
| Structural evidence | 我喜欢… → ensino l26·M1, produção l26·M3, uso l26·M1; 我不喜欢… → ensino l28·M1, produção l28·M3, uso l28·M4 |
| Productive task | l26 · M3 · passo 1 · free_production — 我喜欢中文 (11 no total) |
| Listening task | l28 · M2 · passo 9 · audio_to_action — 我不喜欢茶 (1 no total) |
| Conversation scene | l28 · M4 · passo 10 · conversation_scene · cena gostos-na-casa/gosto-1 — 我喜欢茶 (2 turnos) |
| Transfer task | l28 · M4 · passo 5 · free_production — 我喜欢茶 (8 no total) |
| Reachable | sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal |
| First teach position | l26 · M1 · passo 3 · listen — 我喜欢中文 |
| First test position | l26 · M3 · passo 1 · free_production — 我喜欢中文 |
| Final verdict | **READY** |

#### make_simple_plan — Fazer plano simples

| Campo | Valor |
| --- | --- |
| Capability | `make_simple_plan` |
| Declared status before | PARTIAL |
| Declared status after | READY |
| Lexical evidence | 3/3 chunks ensinados antes de cobrados · 2/2 palavras (明天见, 我们走吧, 我要去北京。) |
| Structural evidence | 明天见 → ensino p1-ate-logo·M1, produção p2-tons-nihao·M1, uso p1-ate-logo·M1; 我们走吧 → ensino l11·M1, produção l28·M3, uso l28·M1; 我要去… → ensino p6-cidade-lugares·M1, produção p6-china-cidades·M3, uso p6-china-cidades·M3 |
| Productive task | p1-ate-logo · M1 · passo 2 · conversation_scene · cena encontro-amanha/amanha-2 — 明天见 (55 no total) |
| Listening task | l2-rev · M1 · passo 4 · listen_select — 明天见 (9 no total) |
| Conversation scene | p1-ate-logo · M1 · passo 2 · conversation_scene · cena encontro-amanha/amanha-2 — 明天见 (28 turnos) |
| Transfer task | l13 · M3 · passo 5 · free_production — 明天见 (33 no total) |
| Reachable | sim — todos os passos vêm de lessonRoundStepsFor na Jornada normal |
| First teach position | p1-ate-logo · M1 · passo 2 · conversation_scene · cena encontro-amanha — 明天见 |
| First test position | l2-rev · M1 · passo 4 · listen_select — 明天见 |
| Final verdict | **READY** |

### As 20 capacidades READY anteriores (contrato de presença)

| Capacidade | Antes | Depois | Léxico | Estrutura | Produção | Escuta | Conversa | Transferência | Veredito |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| greet | READY | READY | 1.00 | 1.00 | 197 | 52 | 123 | 169 | READY |
| introduce_self | READY | READY | 1.00 | 1.00 | 174 | 82 | 171 | 171 | READY |
| ask_name | READY | READY | 1.00 | 1.00 | 214 | 74 | 136 | 221 | READY |
| say_origin | READY | READY | 1.00 | 1.00 | 69 | 17 | 48 | 65 | READY |
| ask_origin | READY | READY | 1.00 | 1.00 | 57 | 9 | 48 | 65 | READY |
| talk_study | READY | READY | 0.83 | 0.67 | 102 | 11 | 50 | 83 | READY |
| talk_work | READY | READY | 0.93 | 0.25 | 14 | 1 | 10 | 11 | READY |
| talk_routine | READY | READY | 0.77 | 0.33 | 10 | 1 | 3 | 4 | READY |
| tell_time | READY | READY | 1.00 | 0.67 | 5 | 1 | 5 | 2 | READY |
| ask_time | READY | READY | 1.00 | 0.00 | 7 | 1 | 3 | 2 | READY |
| ask_price | READY | READY | 0.33 | 1.00 | 15 | 2 | 7 | 21 | READY |
| buy_item | READY | READY | 0.83 | 1.00 | 50 | 3 | 36 | 51 | READY |
| ask_location | READY | READY | 0.75 | 1.00 | 64 | 3 | 32 | 45 | READY |
| ask_directions | READY | READY | 0.92 | 0.25 | 21 | 14 | 1 | 20 | READY |
| use_taxi | READY | READY | 0.75 | 1.00 | 13 | 1 | 9 | 11 | READY |
| airport_basic | READY | READY | 0.75 | 0.75 | 39 | 4 | 16 | 33 | READY |
| hotel_checkin | READY | READY | 0.75 | 1.00 | 41 | 8 | 29 | 24 | READY |
| say_dont_understand | READY | READY | 1.00 | 1.00 | 64 | 11 | 14 | 22 | READY |
| health_basic | READY | READY | 1.00 | 1.00 | 77 | 1 | 31 | 57 | READY |
| weather_smalltalk | READY | READY | 1.00 | 0.67 | 8 | 8 | 4 | 4 | READY |

Léxico/estrutura abaixo de 1.00 nas capacidades de presença são dívida registrada (ordem de ensino dentro das rodadas de maestria), não dimensão ausente: toda dimensão tem evidência de runtime.
<!-- evidencia:fim -->

## E2E

`e2e/rc2-2-9-capability-closure.spec.ts` (Chromium, como o crawler da RC1 —
caminha por rodadas inteiras; a UI entre motores já é coberta pelos specs de
player/mobile). Por capacidade, uma interação produtiva e uma de conversa ou
transferência no player real; amostra de escuta em order_food,
negotiate_basic, use_train e ask_for_help. O seed só leva ao ponto pedagógico
(lições anteriores concluídas, rodada de maestria e o cursor de retomada que o
próprio player usa).

## Regressão do #281

`npm run gate:rc2-2-8-learning-gamification` — resultado na seção Validação.

## Validação

Ver a seção "Resultados" ao final (preenchida com o que foi de fato executado).

## Human QA (checklist — NÃO executado; nenhuma evidência humana é afirmada)

Para cada uma das 11: talk_family, order_food, order_drink, negotiate_basic,
pay, use_metro, use_train, ask_for_help, ask_repeat, express_preference,
make_simple_plan.

```text
[ ] parece natural?
[ ] está claro o que responder?
[ ] áudio ajuda?
[ ] produção é significativa?
[ ] conversa parece plausível?
[ ] transferência exige pensar?
[ ] há vocabulário surpresa?
[ ] tarefa ficou repetitiva?
```

Pontos de atenção para o julgamento humano: a ordem 我要米饭不要辣 montada sem
vírgula; o volume de flashcards em l26b M1 (quatro de uma vez); se
`gostos-na-casa` soa natural para quem não come carne; se 我要票 no guichê do
trem fica distinto o bastante do bilhete de metrô.

## Não verificado

```text
cloud real
QA candidate
sync real Supabase
Android physical
iOS physical
formal Human QA
PWA production upgrade
production rollback
```

Nenhum preflight foi promovido a PASS formal. Checks operacionais
(cloud_auth, cloud_sync, feedback_backend, android_real_device,
ios_real_device, pwa_upgrade, rollback_drill) continuam falsos.

## Public Beta

```text
PUBLIC BETA = NO-GO
```

enquanto os checks operacionais obrigatórios não forem certificados. Não é
falha desta remessa: o objetivo era fechar o lado pedagógico antes da
engenharia Android (RC2.2.10) e da certificação operacional.

## Resultados
