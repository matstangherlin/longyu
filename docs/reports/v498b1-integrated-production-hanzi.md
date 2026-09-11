# V4.9.8B.1 — Integrated production scaffolding + Hanzi fill

Última micro-remessa da V4.9.8. **Não** inicia V4.9.9 (saúde / emergência).

Princípio: APRENDER → RECONHECER → PREENCHER → MONTAR → USAR COM AJUDA → FALAR/DIGITAR → CONVERSAR SEM AJUDA → TRANSFERIR.

## Base

| Campo | Valor |
|-------|-------|
| SHA obrigatória (`main` após merge #249) | `62871c6652c0979dcdba05b524044c97f7714fa6` |
| #249 | V4.9.8B — China Survival II: Hotel + Aeroporto |
| Branch | `cursor/v498b1-production-scaffold-6ae2` |
| Fingerprint da Jornada (8B) | `465390e64799` |
| Fingerprint da Jornada (esta remessa) | `003cb0ed7858` |
| Tópicos de ensino | 113 (imersões continuam `isReview` + `curriculumRole: "immersion"`) |

## O que esta remessa não faz

Não remove produção livre. Não transforma `produce_reply` em múltipla escolha. Não cria `ConversationPhraseBuilderV2`, novo Conversation Player, novo motor de Hànzì, handwriting, Tone Analyzer, Story Mode, nem reabre Culture Hub / Ligas. Não inicia V4.9.9.

## ConversationScene audit

Classificação de `produce_reply` de alto valor (P18). China Survival foi o foco de correção; arcos anteriores só entram no relatório.

| Cena | Arco | Classe | Hospedagem |
|------|------|--------|------------|
| checkin-hotel | Hotel | NEEDS_GUIDED_PREDECESSOR | p7-imersao-hotel |
| no-aeroporto | Aeroporto | GOOD_INDEPENDENT (TRANSFER) | p7-imersao-aeroporto |
| pedir-cardapio | Restaurante | GOOD_INDEPENDENT | l26b |
| revisao-restaurante | Restaurante | GOOD_INDEPENDENT | l10-rev |
| imersao-restaurante | Restaurante | GOOD_INDEPENDENT | l26c |
| comprar-itens | Compras | GOOD_INDEPENDENT | p7-imersao-mercado |
| imersao-mercado | Compras | GOOD_INDEPENDENT | p7-imersao-mercado |
| imersao-estacao | Mobilidade | GOOD_INDEPENDENT | p7-imersao-estacao |
| pegar-taxi | Mobilidade | GOOD_INDEPENDENT | p6-china-ruas, p7-imersao-estacao |
| identificar-pessoa | Identidade | GOOD_INDEPENDENT | l24 |
| sala-de-aula | First Contacts | GOOD_INDEPENDENT | l13-dialogo-nome |
| encontro-amanha | Routine | GOOD_INDEPENDENT | l13 |
| rotina-e-trabalho | Routine | GOOD_INDEPENDENT | p6-rotina-trabalho |
| que-horas-sao | Routine | GOOD_INDEPENDENT | p6-horarios |

Lacunas lexicais globais (não bloqueantes nesta PR): `agradecendo/chunk:bukeqi`, `como-se-chama/chunk:wojiao`, `pedir-repeticao/chunk:wojiao`, `o-que-e-isto/chunk:woxianghe`. Detalhe em `docs/reports/conversation-lexical-bridge.md`.

## Frases cobradas (China Survival)

| PHRASE | FIRST TEACH | FIRST RECOGNITION / GUIDED | FIRST ASSEMBLY | FIRST OPEN / CONVERSA | TRANSFER | Resultado |
|--------|-------------|----------------------------|----------------|-----------------------|----------|-----------|
| 这是我的护照 | p6-china-cidades-2 (listen) + p6-survival-mandarin (imagem + áudio) | fill `这是我的 ___` (áudio 护照) | sentence_build 这是/我的/护照 | checkin-hotel (`first` + peças) | no-aeroporto (`transfer`, sem peças iniciais) | PASS |
| 我有预订 | p6-survival-mandarin | fill `我有 ___` | conversation pieces no hotel | checkin-hotel + free_production | não reensinado no aeroporto | PASS |
| 我的房间在哪里？ | p6-survival-mandarin | fill `我的 ___ 在哪里？` | sentence_build 我的/房间/在哪里 | checkin-hotel (`first`) | — | PASS |
| 登机口在哪里？ | p6-china-cidades-2 | fill `___ 在哪里？` (áudio 登机口, word-level) | sentence_build 登机口/在哪里 | no-aeroporto (`first`) | — | PASS |
| 买单 | l26b | choose_reply predecessor | help bank sob demanda | produce_reply (`transfer`) | imersão / revisão | PASS |
| 多少钱？ | l26b / compras | choose + listening | help bank sob demanda | produce_reply (`transfer`) | mercado | PASS |
| 地铁站在哪里？ | mobilidade 8A | teach + map | help bank sob demanda | imersao-estacao (`transfer`) | — | PASS |

`登机 ___` → `口` **não** foi criado: `口` isolado é “boca”, não o chunk 登机口.

## Cenas que ganharam scaffold

| Cena | Kind | Banco | Vocab | Pinyin nas peças |
|------|------|-------|-------|------------------|
| checkin-hotel / 我有预订 | first | 我有 · 预订 · 房间 | sim | só no degrau mais guiado |
| checkin-hotel / 这是我的护照 | first | 这是 · 我的 · 护照 · 房间 | sim | só no degrau mais guiado |
| checkin-hotel / 我的房间在哪里？ | first | 我的 · 房间 · 在哪里 · 护照 | sim | só no degrau mais guiado |
| no-aeroporto / 这是我的护照 | transfer | mesmo banco, oculto | sob “Preciso de ajuda” | não no primeiro toque |
| no-aeroporto / 登机口在哪里？ | first | 登机口 · 在哪里 · 房卡 | sim | guiado |
| pedir-cardapio / revisao / imersao 买单 | transfer | 买单 · 谢谢 | sim | ajuda |
| comprar-itens / mercado 多少钱 | transfer | 多少 · 钱 · 这个 | sim | ajuda |
| imersao-mercado 便宜一点 | transfer | 便宜 · 一点 · 太贵了 | sim | ajuda |
| imersao-estacao 地铁站 / 票 / 我要这个 | transfer | bancos locais | sim | ajuda |
| pegar-taxi 在这里停车 | transfer | 在这里 · 停车 · 左转 | sim | ajuda |

## Phrase-piece interactions

Reuso, não motor novo:

- `productionHelpBuildBank` / `productionHelpVocab` / `productionHelpPiecePinyin`
- `resolveConversationProduceHelp` + `nextConversationHelpLevel` (0 → 1 frame → 3 vocab → 4 peças)
- `FreeAnswerField` (`micOnly` quando as peças estão visíveis)
- `evaluateLearnerResponse` único para montar / digitar / falar

Níveis:

| Exposição | initial | Peças | Pinyin | Falar | Digitar |
|-----------|---------|-------|--------|-------|---------|
| first + guided, 0 completions | 4 | sim | sim | sim (`micOnly`) | botão Digitar |
| first + assisted / 1 completion | 3 | não | não | sim | sim |
| independent / audio_first / 2+ | 0 | não | não | sim | sim + Preciso de ajuda |
| transfer | 0 | não | não | sim | sim + Preciso de ajuda (teto 4) |

Erro repetido sobe o teto e oferece o próximo degrau (frame → vocab → peças). Acerto independente sobe `conversationVariantLevelFor` (attempts + assistanceLevel). Pedir ajuda não marca erro e não retira XP; a evidência de mastery é mais fraca (helpLevel no `onDone`).

`conversationAssistanceFromHelp` grava no histórico a ajuda **usada**: peças → `guided`; frame/vocab → `assisted`; nenhuma ajuda → `independent` (ou `audio_first` se essa era a variante). A variante planejada sozinha não marca mais um acerto livre como guided.

Primeiro toque em “Preciso de ajuda” **não** revela a frase inteira.

## Hanzi fill audit

Relatório tabular: `docs/reports/hanzi-fill-integration.md`.

CORE elegíveis com recuperação ativa (fill / sentence_build / hanzi_build / dictation / reverse_recall): 菜, 点, 明/天/今/昨/现, 左/右, 买, e os fills de sobrevivência.

| Lesson | Classe | Notas |
|--------|--------|-------|
| p6-survival-mandarin | ENOUGH | 3 fill + 2 sentence_build + reverse_recall |
| p6-china-cidades-2 | ENOUGH | audio fill 登机口 + sentence_build |
| p6-horarios | ENOUGH | fills 今/昨 após listen 今天/昨天 |
| p6-clima | NOT_ELIGIBLE (delayed) | recuperação atrasada 昨天/今天 |
| l26b | ENOUGH | fill 菜 |
| p6-compras / p6-direcoes | ENOUGH | já tinham recuperação |
| p7-imersao-hotel / aeroporto | retrieval atrasado | fill de 护照 / 登机口, sem re-aquisição |

Não se exigiu fill em toda aula. Não se fingiu mastery de caractere isolado para 登机口.

O player de mastery de `p6-survival-mandarin` (pass 3) e `p6-china-cidades-2` (pass 4) recebe os mesmos fill/build como bônus, para a recuperação não ficar só no `journey.ts` autoral.

## Fills / builds / áudio+Hànzì adicionados

Fills:

- p6-survival-mandarin: `这是我的 ___` (护照 / 房间 / 菜单) com áudio `护照`
- p6-survival-mandarin: `我有 ___` (预订)
- p6-survival-mandarin: `我的 ___ 在哪里？` (房间)
- p6-china-cidades-2: `___ 在哪里？` (登机口 / 房卡 / 菜单) com áudio `登机口`
- p7-imersao-hotel: `这是我的 ___` (护照) — delayed
- p7-imersao-aeroporto: `___ 在哪里？` (登机口) — delayed, sem flash de 护照
- l26b: `我要 ___` (菜)
- p6-horarios: `___天` (今) e `___天` (昨)
- p6-clima: `___很冷` (昨天) e `北京___很冷` (今天)

Sentence builds:

- 这是 / 我的 / 护照
- 我的 / 房间 / 在哪里
- 登机口 / 在哪里

Áudio + Hànzì: fills de 护照 e 登机口. O enunciado não contém o hànzì-alvo (`TARGET_LEAK` / `LISTENING` gates). `fill_blank` com `audioText` conta como interação `audio` no contrato de factibilidade, para o enunciado “Ouça e complete…” não falhar `instruction_mismatch`.

## Scaffold levels / speaking / i18n / viewport

- Speaking permanece visível com peças (`FreeAnswerField micOnly` + `data-free-answer-mic`).
- PT-BR: `Montar com peças`, `Digitar`, `Preciso de ajuda`, `Monte sua resposta`, `Vocabulário útil`.
- EN: `Build with pieces`, `Type`, `I need help`, `Build your reply`, `Useful words`.
- Overlays EN dos novos enunciados + 2 strings de l26b que o gate de journey-en cobrou. O fill auditivo usa “Listen and fill…” (não “complete” + `hànzì`) para o overlay não ser classificado como vazamento de PT.
- Touch target das peças ≥ 44px; layout 390×844 exercitado no e2e.

## Fingerprint / backend

| Contrato | Fingerprint |
|----------|-------------|
| `docs/backend/v478-backend-rc.json` | `003cb0ed7858` |
| `docs/backend/v489-backend-rc.json` | `003cb0ed7858` |

Nenhuma mudança de schema / RPC / edge.

## Gates

Novos (nesta remessa):

- `validate:conversation-lexical-bridge` / `test:conversation-lexical-bridge`
- `validate:production-scaffolding` / `test:production-scaffolding`
- `validate:hanzi-fill-integration` / `test:hanzi-fill-integration`

Preservados (#249 e anteriores): china-survival hotel / airport / travel / mobility / shopping / restaurant; conversation-coherence / decisions / scenes / pedagogy / loop / vocabulary-srs; hanzi-memory-integration; tone-*; teach-before-test (+ journey); exercise-affordance; listening-affordance; modality-contract; production-transfer; transfer-integrity; exercise-depth --beta; lesson-novelty; cognitive-budget; culture-native-lessons / playability / story-audio / rewards; live-league; i18n / journey-en; sync-merge; backend-contract; validate:beta; npm run build.

`validate:report-freshness` passou com Jornada `003cb0ed7858`. A cauda `test:v478-hosted-gate` → `validate:seo` fechou com EXIT:0 após o fingerprint.

## Mutations

| # | Mutação | Código | Resultado |
|---|---------|--------|-----------|
| 1 | Conversation ref nunca ensinado | LEXICAL_GAP | KILLED |
| 2 | newRef só no diálogo | NEW_REF_NO_TEACH | KILLED |
| 3 | TEACH → OPEN sem degrau | NO_GUIDED | KILLED |
| 4 | Transferência com banco obrigatório | OVER_SCAFFOLD | KILLED |
| 5 | Guided hotel sem peças | GUIDED_CONTRACT | KILLED |
| 6 | Independent sempre mostra peças | coberto por transfer initial=0 | — |
| 7 | Primeiro help revela a frase | nextConversationHelpLevel 0→1 | KILLED em test:production-help |
| 8 | Speaking some com peças | SPEAKING | KILLED |
| 9 | CORE sem recuperação | HANZI_CORE_RETRIEVAL | KILLED |
| 10 | Hànzì cobrado antes da apresentação | TEACH_BEFORE_TEST | coberto pelo gate de fill + teach-before-test |
| 11 | Fill vaza resposta no enunciado | TARGET_LEAK | KILLED |
| 12 | Audio fill mostra hànzì alvo | LISTENING | KILLED |
| 13 | Aeroporto reensina 护照 | LEXICAL_NOVELTY | KILLED |
| 14 | Montar e digitar usam evaluators diferentes | EVALUATOR | KILLED |
| 15 | Scaffold quebra mobile | e2e 390×844 | KILLED (peças ≥44px) |

## Pronto para V4.9.9

A escada TEACH → LISTEN → HANZI FILL → SENTENCE BUILD → GUIDED DIALOGUE → OPEN DIALOGUE está no runtime. Frases como 我不舒服 / 我肚子疼 / 我发烧了 / 我需要帮助 podem nascer nela sem novo motor.
