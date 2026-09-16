# RC1.5 — Product Truth & Learning Telemetry Closure

> ## O que esta remessa resolve
>
> As RC1.1–RC1.4 fecharam a verdade **pedagógica**: o que a tarefa pergunta é o
> que ela avalia e o que ela corrige. Faltavam duas.
>
> **Verdade do produto** — o que a interface diz que existe é o que existe. A
> `/fala` vendia "Fala com IA · Pro" com "correção de pronúncia frase por
> frase" e abria paywall no usuário grátis, para um recurso que o assinante
> também não tinha: quem pagasse recebia o mesmo botão dizendo "Em breve".
>
> **Verdade da telemetria** — o que a métrica diz que aconteceu é o que
> aconteceu. Clicar "Já sabia" num flashcard gravava `phrasesSpoken`, que
> alimentava medalha de "Fale 50 frases em voz alta", missão de frases e
> contagem de produção. Ninguém tinha falado.
>
> Nenhuma lição mudou. Nenhum passo. Nenhum caractere.

| Campo | Valor |
| --- | --- |
| BASE_SHA_REAL | `edd3e191a70206eee6f76f675644ca5c09d762dc` |
| Base conhecida no planejamento | `edd3e191a70206eee6f76f675644ca5c09d762dc` — confere |
| Merge de origem | PR #261 — RC1.4 Generated Learning Integrity |
| Fingerprint antes / depois | `7c054f2255e7` / `7c054f2255e7` — **inalterado** |
| Lições / temas | 134 / 113 — **inalterados** |
| Escopo | PRODUCT TRUTH · LEARNING TELEMETRY · CLAIM AUDIT · GATES |
| Fora de escopo | IA conversacional, Tone Analyzer, Pronunciation Score, Stripe, Groups / Programs / Reports |

---

## Sumário

| # | Sintoma | Causa-raiz | Correção |
| --- | --- | --- | --- |
| 1 | `/fala` cobra paywall de IA que ninguém pode usar | Card de feature futura escrito à mão, sem fonte de verdade sobre capacidades | Registro `FEATURE_TRUTH` + card de roadmap sem CTA |
| 2 | Assinante clica e recebe "Em breve no Pro" | `isPro` tratado como se implicasse "recurso existe" | Eixos separados: `status` (existe) × `requiresPro` (entitlement) |
| 3 | `PaywallKind: "speech"` cobra por recurso inexistente | Nenhum gate ligava paywall a capacidade | `PAYWALL_CAPABILITY` + gate; o kind `speech` deixou de existir |
| 4 | "Já sabia" registra `phrasesSpoken` | Nome do evento não descrevia o que acontecia | `phrasesReviewed` nasce; `phrasesSpoken` sai de `DailyTaskKey` |
| 5 | Medalha "Fale 50 frases em voz alta" por 50 cliques | Métrica de revisão sob promessa de fala | Copy passou a dizer o que o número sempre mediu |
| 6 | Tentativa real de fala **não** era contada | `PronunciationPractice` nunca escrevia no store | `recordSpeechAttempt` com captura obrigatória e idempotência |
| 7 | Copy Pro prometia recurso inexistente em PT-BR e EN | Copy de plano escrita antes da capacidade | Copy alinhada nos dois idiomas + gate de paridade |

---

## P0 / P0.1 — Matriz de claims auditados

Varredura em `src/features`, `src/components`, `src/data`, `src/locales`,
`src/lib/seo.ts`, `index.html` e `public/`. Termos: IA, AI, Pro, pronúncia,
pronunciation, correção de áudio, audio correction, feedback de fala, speech
feedback, tone analysis/analyzer, conversation AI, roleplay, personalized,
adaptive, real-time, intelligent, coming soon, em breve.

| Superfície | Claim | Capacidade | Realidade | Status | Ação |
| --- | --- | --- | --- | --- | --- |
| `FalaPage.tsx:86` | "Fala com IA · Pro" | `ai_roleplay` | Nenhum modelo, nenhum backend de diálogo | FALSE_OR_GHOST | Removido |
| `FalaPage.tsx:88` | "Roleplays guiados e correção de pronúncia frase por frase." | `ai_roleplay`, `pronunciation_feedback` | Nenhum analisador acústico | FALSE_OR_GHOST | Removido |
| `FalaPage.tsx:100` | CTA "Praticar com IA" → `ProPaywall kind="speech"` | `ai_roleplay` | — | FALSE_OR_GHOST | Removido (CTA e paywall) |
| `FalaPage.tsx:94` | "Em breve no Pro" atrás de botão | `ai_roleplay` | — | FALSE_OR_GHOST | Removido; virou card sem CTA |
| `planFeatures.ts:491` | `PAYWALL_COPY.speech` — "Fala com IA" / "Pratique conversas com feedback" | `ai_roleplay` | — | FALSE_OR_GHOST | Kind `speech` eliminado |
| `pt-BR.ts` `proFalaFeatures` | "roleplays · feedback de pronúncia · chunks ilimitados" | `ai_roleplay`, `pronunciation_feedback` | Só chunks ilimitados é verdade | FALSE_OR_GHOST | Reescrito |
| `en.ts` `proFalaFeatures` | "roleplays · pronunciation feedback · unlimited chunks" | idem | idem | FALSE_OR_GHOST | Reescrito |
| `pt-BR.ts` `proSomFeatures` | "áudio lento **neural** · mapa de tons fracos" | `tone_scoring` | Web Speech, não rede neural; não existe mapa de tons | FALSE_OR_GHOST | Reescrito |
| `en.ts` `proSomFeatures` | "slow **neural** audio · weak-tone map" | idem | idem | FALSE_OR_GHOST | Reescrito |
| `pt-BR.ts` / `en.ts` `proLeituraFeatures` | "shadowing por linha" / "line-by-line shadowing" | — | Não existe shadowing | FALSE_OR_GHOST | "áudio linha a linha" |
| `achievements.ts` `fala-*` | "Fale 1/10/50 frases em voz alta" | `speech_recognition` | Progresso vinha de revisão | FALSE_OR_GHOST | Copy honesta |
| `missions.ts` `daily-phrases` | "Use 3 frases aprendidas" | `phrase_chunk_training` | Métrica era `phrasesSpoken` | TRUE_AVAILABLE (métrica errada) | Passou a ler `phrasesReviewed` |
| `PronunciationPractice.tsx` | "Caracteres ok. Para afinar o tom, use o Treino de tons." | `speech_recognition` | Comparação de texto, declarada | TRUE_AVAILABLE | Mantido (decisão RC1.3) |
| `index.html`, `src/lib/seo.ts` | "som primeiro, fala em blocos, caracteres em camadas" | `journey_learning` | É o que o app faz | TRUE_AVAILABLE | Mantido |
| `ProPage`, `BusinessPage` | Disponibilidade das ofertas | — | Lido do `PRODUCT_TRUTH` | TRUE_PILOT / planned | Intocado |

**Ghost features encontrados: 11. Restantes: 0.**

O SEO estava limpo: nenhuma meta description, título, OG ou schema prometia IA,
pronúncia ou tom. Esse achado foi verificado, não assumido — e agora é varrido
por gate a cada CI.

---

## P1 — Feature Truth Registry

`src/product/featureTruth.ts` — 22 capacidades, cinco estados:

| Estado | O que significa | Quantas |
| --- | --- | --- |
| `available` | Está no ar, qualquer pessoa elegível usa hoje | 16 |
| `beta` | Está no ar, mas depende de plataforma ou provisionamento | 3 |
| `coming_soon` | Não existe. Pode ser roadmap, nunca entitlement | 3 |
| `internal` | Existe só para operação/QA | 0 |
| `disabled` | Desligada de propósito | 0 |

As três que não existem, e por quê:

| Capacidade | `because` |
| --- | --- |
| `ai_roleplay` | Nenhum modelo, nenhum backend de diálogo, nenhuma sessão |
| `pronunciation_feedback` | Não existe analisador acústico; comparar texto reconhecido não é avaliar pronúncia |
| `tone_scoring` | Não existe Tone Analyzer; nada mede f0, contorno ou duração |

As três que dependem de plataforma ou contrato:

| Capacidade | `because` |
| --- | --- |
| `speech_recognition` | Web Speech nativa: existe em Chrome/Edge com HTTPS e mic autorizado, e não existe em vários navegadores. Devolve **texto** |
| `family_management` | Assentos e entitlement funcionam no servidor; a assinatura ainda não pode ser comprada |
| `business_dashboard` | Painel e licença funcionam, mas a organização entra por provisionamento |

### P1.1 / P11 — `PRODUCT_TRUTH` preservado

Nenhuma linha de `src/commercial/productTruth.ts` foi tocada. Os estados
continuam: `journey=available`, `free_plan=available`,
`pro_individual=planned`, `family_plan=planned`,
`business_workspace=pilot`, `enterprise_plan=planned`, com
`stripe_test_mode_e2e` ainda `false`.

Não há duplicação. `FEATURE_TRUTH` descreve **capacidades**; `PRODUCT_TRUTH`
descreve **ofertas**. Quando uma capacidade tem contraparte comercial, ela
aponta para lá por `offer`, e o gate recusa uma referência a oferta
inexistente — a autoridade sobre o estado comercial continua sendo do
`PRODUCT_TRUTH`.

---

## P2 — `/fala` antes e depois

### Antes

```tsx
<div>Fala com IA · Pro</div>
<h2>Converse sem medo de errar</h2>
<p>Roleplays guiados e correção de pronúncia frase por frase.</p>
<Button onClick={() => {
  if (isPremium) { setSpeechNotice("Em breve, você poderá praticar conversas com IA…"); return; }
  setPaywallKind("speech");          // ← usuário grátis leva paywall
}}>
  {isPremium ? "Em breve no Pro" : "Praticar com IA"}
</Button>
```

O usuário grátis via um paywall. O assinante via um aviso. Os dois recebiam a
mesma coisa: nada.

### Depois

```tsx
<div>Treino de frases</div>
<h2>O que este treino faz</h2>
<p>Hànzì, pinyin e áudio de cada bloco, com significado na hora e revisão
   espaçada a partir da sua própria avaliação.</p>
…
<FeatureRoadmapNote capability="ai_roleplay" />   // sem CTA, sem paywall
```

`FeatureRoadmapNote` lê o registro e só renderiza para `coming_soon`. No dia em
que `ai_roleplay` entrar no ar, o card some sozinho — ninguém precisa lembrar
de apagar copy.

---

## P3 — Auditoria de paywalls

Treze `PaywallKind`, cada um ligado a uma capacidade em `PAYWALL_CAPABILITY`:

| Kind | Capacidade | Status |
| --- | --- | --- |
| `qi` | `qi_economy` | available |
| `energy` | `daily_energy` | available |
| `immersion` | `immersion_audio` | available |
| `hanzi` | `hanzi_lab` | available |
| `pinyin` | `pinyin_lab` | available |
| `reports` | `progress_reports` | available |
| `content` | `journey_learning` | available |
| `review` | `review_remediation` | available |
| `errors` | `error_insights` | available |
| `weak_spots` | `weak_spot_plan` | available |
| `story` | `interactive_stories` | available |
| `training` | `focused_training` | available |
| `leagues` | `leagues` | available |
| ~~`speech`~~ | ~~`ai_roleplay`~~ | **removido** |

Além dos gates, o `ProPaywall` faz a checagem em runtime: um paywall cujo
`kind` não resolve para capacidade no ar simplesmente não abre. Preferimos a
tela sem modal à tela cobrando por algo que não existe.

---

## P4 / P7 — Telemetria: causa-raiz e correção

### Causa-raiz de `phrasesSpoken`

```tsx
function grade(knew: boolean) {          // "Já sabia" ou "Ainda não"
  gradeReviewDomain({ … });
  recordDailyTask("phrasesSpoken");      // ← nenhum microfone envolvido
}
```

Um clique de autoavaliação incrementava um contador de fala. O mesmo acontecia
na imersão, em passos de escolha e de digitação
(`storyStepCountsAsPhrasePractice`). E a única tela que **realmente** escuta —
`PronunciationPractice` — não incrementava nada.

O contador estava exatamente invertido.

### Inventário de eventos (`src/lib/learningEvents.ts`)

| Evento | Significado | Gatilho | Superfícies |
| --- | --- | --- | --- |
| `audioHeard` | Áudio realmente reproduzido | TTS conclui, ou sessão de imersão | SpeakButton, Som, Pinyin Lab, Imersão |
| `phrasesReviewed` | Frase útil revisada | Autoavaliação de chunk, passo de frase | Fala, Imersão |
| `phrasesSpoken` | **Fala realmente tentada** | `recordSpeechAttempt({ captured: true })` | PronunciationPractice |
| `reviewsDone` | Item de revisão resolvido | Atividade concluída na fila | Revisão, LessonPlayer |
| `hanziDecomposed` | Caractere decomposto/montado | Decomposição ou HanziBuilder | Hànzì |
| `microtextsRead` | Microtexto lido até o fim | Conclusão de leitura | Leitura, Imersão |
| `errorsCorrected` | Erro pendente acertado | Acerto de item na lista de erros | Revisão, LessonPlayer |
| `threeStarLessons` | Lição com 3 estrelas hoje | Conclusão idempotente | LessonPlayer |
| `tonesTrained` | Tom acertado | Passo tonal, Pinyin Lab, Tone Trainer | LessonPlayer, Pinyin Lab |

### A trava é de tipo, não de convenção

`phrasesSpoken` **saiu** de `DailyTaskKey`. `recordDailyTask("phrasesSpoken")`
deixou de compilar — a mutação morre no `tsc` antes de morrer no gate. Foi
assim que os três call-sites antigos foram encontrados, e não por busca de
texto.

### P4.2 / P4.3 — Migração

- `phrasesReviewed` nasce em **0** para todo snapshot anterior.
- O valor antigo de `phrasesSpoken` **não é copiado** para `phrasesReviewed`
  (seria inventar revisão) nem lido como fala comprovada (seria inventar fala).
- Onde o número antigo ainda importa para não tirar nada de ninguém — pérolas
  de produção e medalhas de frase — ele entra como **piso histórico**,
  documentado como `legacySemantics`, nunca como evidência de fala.
- Nenhuma conversão automática. Nenhuma reescrita de histórico.

---

## P5 / P6 — Contrato de tentativa de fala

```ts
export interface SpeechAttempt {
  id: string;        // chave idempotente DA TENTATIVA, não da frase
  captured: boolean; // houve captura real de voz
  target?: string;
}
```

Conta quando: o microfone abriu **e** o reconhecedor devolveu transcrição não
vazia. O acerto não importa — tentar é falar.

Não conta (P5.1, verificado por gate): clicar SpeakButton, ouvir TTS, mostrar
significado, "Já sabia", "Ainda não", montar frase digitando, selecionar opção,
replay de áudio.

P5.2 — sem microfone, sem suporte, ou permissão negada: o aluno continua
aprendendo normalmente e **nada** é registrado.

A chave da tentativa é opaca (`speech:<timestamp>:<nonce>`), sem o texto
praticado. `dailyTasks` entra no snapshot de progresso e é sincronizado, e não
há motivo para mandar conteúdo junto só para desduplicar uma tentativa. Nenhuma
transcrição é persistida em lugar nenhum — ela vive no estado do componente
durante o resultado e morre com ele.

P6 — a decisão da RC1.3 continua de pé: `SpeechRecognition` devolve **texto**.
Não é Tone Analyzer, não é Pronunciation Scoring Engine. A copy permitida
continua sendo "caracteres ok / compare com o áudio / tente de novo", nunca
"87% correto" ou "seu tom está errado".

---

## P8 / P9 — Efeitos em missões e adaptativo

| Consumidor | Antes | Depois |
| --- | --- | --- |
| `daily-phrases` ("Use 3 frases") | `phrasesToday` ← `phrasesSpoken` | `phrasesToday` ← `phrasesReviewed` |
| `daily-speak` ("Fale 1 frase em voz alta") | não existia | `spokenToday` ← `phrasesSpoken`, exige microfone |
| Medalhas `fala-*` | "Fale N frases em voz alta" por revisão | Copy honesta: "Pratique N frases úteis" |
| Pérola de produção | `lifetimeStats.phrasesSpoken` | `phrasesReviewed`, com o valor antigo como piso |
| Loja (`productionCount`) | idem | idem |

**P8.2** — `missionDefsFor` consulta a plataforma por padrão
(`detectMissionPlatform`), então as sete telas que montam missão ficam
capability-aware sem que nenhuma precise lembrar de perguntar. Em navegador sem
`SpeechRecognition`, `daily-speak` não é oferecida: meta impossível fixa no
topo da tela ensina o aluno a ignorar missões.

**P9.1** — nenhum consumidor conclui "o aluno produz fala" a partir do
histórico antigo. Onde o número legado sobrevive, ele é piso de recompensa já
conquistada, nunca sinal de produção.

---

## P17 / P18 — PT-BR, EN e SEO

A verdade da capacidade é comum aos idiomas; só a copy é localizada. O gate
`validate:product-claims` varre PT-BR e EN contra o mesmo registro, então um
EN otimista ("AI pronunciation feedback available now") reprova mesmo com o
PT-BR já honesto.

SEO auditado e limpo: `index.html` (title, description, OG, Twitter, JSON-LD
`EducationalApplication`), `src/lib/seo.ts` (12 rotas públicas) e
`public/sitemap.xml` não prometem IA, pronúncia nem tom. Agora isso é gate.

Seis classes de claim (P12.1):

| Classe | O que caça |
| --- | --- |
| `AI_CLAIM` | "com IA", "AI conversation", "roleplays" |
| `PRONUNCIATION_CLAIM` | "correção de pronúncia", "pronunciation feedback", e a forma que mais engana — a **nota**: "sua pronúncia: 87% correta" |
| `TONE_SCORE_CLAIM` | "Tone Analyzer", "análise dos seus tons", "nota de tom", "mapa de tons fracos" |
| `REALTIME_CLAIM` | "fala em tempo real" / "real-time voice", nas duas ordens |
| `AVAILABLE_CLAIM` | "já disponível" / "available now" **na mesma linha** que um termo da capacidade fantasma |
| `PRO_CLAIM` | o selo "Pro" **na mesma linha** que o recurso inexistente — o "Fala com IA · Pro" literal |

As duas últimas exigem a proximidade (`near`) de propósito: "Pro" e
"disponível" aparecem em centenas de lugares legítimos, e um gate que reprovasse
toda menção ao plano seria desligado na primeira semana.

**P18.1** — "IA" continua podendo aparecer em contexto de roadmap declarado. O
gate lê o contexto (a linha e as duas vizinhas) e aceita marcadores como "Em
desenvolvimento" / "Ainda não existe no app". O que não passa é o meio-termo:
a frase que soa disponível para um recurso que não está no ar.

---

## P22 — Gates novos

| Gate | O que trava |
| --- | --- |
| `validate:feature-truth` | Paywall para capacidade fora do ar; capacidade que se declara pronta sem motor; tela derivando disponibilidade de `isPro` |
| `test:feature-truth` | 16 mutações (inclui fingerprint e escopo) |
| `validate:product-claims` | Afirmação pública sem capacidade, em PT-BR e EN, em 21 superfícies |
| `test:product-claims` | 9 mutações + controle de roadmap permitido |
| `validate:ghost-features` | CTA de aquisição, paywall fantasma, handler "em breve", tela decidindo sozinha — em 173 telas |
| `test:ghost-features` | 5 mutações + controle de comentário histórico |
| `validate:learning-event-semantics` | Evento sem significado declarado; fala emitida por caminho de clique |
| `test:learning-event-semantics` | 7 mutações |
| `validate:speech-attempt-integrity` | Captura opcional, tentativa não idempotente, migração que reescreve histórico |
| `test:speech-attempt-integrity` | 10 mutações + contrato executado |
| `validate:mission-speech-integrity` | Missão que promete fala sem métrica de fala; missão impossível |
| `test:mission-speech-integrity` | 6 mutações |
| `validate:rc15-freeze` | Fingerprint, contagens e escopo |

Todos encadeados em `validate:beta`.

### Nota de implementação dos gates

Os scanners removem comentário antes de varrer. Sem isso, a prosa que
**documenta** o bug removido — o comentário no topo da `FalaPage` que explica
que a tela vendia "Praticar com IA" — seria lida como a tela ainda vendendo, e
a punição por escrever a história seria apagá-la. Há um controle positivo
explícito para isso em `test:ghost-features`.

Quem tokeniza é o parser do próprio TypeScript. A primeira versão era uma
máquina de estados escrita à mão, e ela derivava: uma regex como `/['"]/` abre
uma string que nunca fecha, e dali em diante o resto do arquivo vira "conteúdo
de string" — comentário deixa de ser removido (falso positivo) e código real
deixa de ser lido (**falso negativo**, que é o que deixaria um claim passar).
Medido sobre os 503 arquivos de `src`: 17 arquivos derivavam, incluindo
`ImmersionPage.tsx`, que é superfície varrida. Com o parser: 0 arquivos com
comentário remanescente, 0 divergência de tamanho, 0 divergência de linhas — os
achados continuam citando `arquivo:linha` corretamente.

---

## P23 — Mutações

| # | Mutação | Gate que mata | Código |
| --- | --- | --- | --- |
| 1 | `coming_soon` AI → "Praticar com IA" | `test:ghost-features` | `GHOST_CTA` |
| 2 | `coming_soon` AI → `ProPaywall` | `test:ghost-features`, `test:feature-truth` | `GHOST_PAYWALL`, `PAYWALL_FOR_GHOST` |
| 3 | Pro → "usar agora" → handler "em breve" | `test:ghost-features` | `COMING_SOON_HANDLER` |
| 4 | `SpeechRecognition` → nota de pronúncia | `test:product-claims`, `test:feature-truth` | `PRONUNCIATION_CLAIM` |
| 5 | TTS playback → `phrasesSpoken++` | `test:learning-event-semantics` | `SPEECH_VIA_DAILY_TASK` |
| 6 | "Já sabia" → `phrasesSpoken++` | `tsc` + `test:learning-event-semantics` | `SPEECH_VIA_DAILY_TASK` |
| 7 | "Ainda não" → `phrasesSpoken++` | `tsc` + `test:learning-event-semantics` | `SPEECH_VIA_DAILY_TASK` |
| 8 | `phrasesReviewed` não incrementa em revisão | `test:speech-attempt-integrity` | `FALA_WITHOUT_REVIEW_METRIC` |
| 9 | Missão "falar" aceita `phrasesReviewed` | `test:mission-speech-integrity` | `SPEAKING_MISSION_WITHOUT_SPEECH_METRIC` |
| 10 | `phrasesSpoken` sem `speechAttempt` | `test:speech-attempt-integrity` | `NO_CAPTURE_REQUIREMENT` |
| 11 | Mesmo `speechAttempt` conta duas vezes | `test:speech-attempt-integrity` + E2E | `NOT_IDEMPOTENT` |
| 12 | Pro força `coming_soon` a `available` | `test:feature-truth` | `CLAIMS_BEYOND_IMPLEMENTATION`, `PRO_IMPLIES_FEATURE` |
| 13 | UI hardcode ignora registro | `test:ghost-features` | `HARDCODED_AVAILABILITY` |
| 14 | `pro_individual` → available com Stripe false | `test:commercial-product-truth` (RC anterior) | `CLAIMS_BEYOND_EVIDENCE` |
| 15 | `family_plan` → available com Stripe false | `test:commercial-product-truth` (RC anterior) | `CLAIMS_BEYOND_EVIDENCE` |
| 16 | Claim EN diverge do PT-BR | `test:product-claims` | `LOCALE_PRONUNCIATION_CLAIM` |
| 17 | SEO anuncia correção de pronúncia | `test:product-claims` | `PRONUNCIATION_CLAIM` |
| 18 | Novo Tone Score | `test:product-claims`, `test:feature-truth` | `TONE_SCORE_CLAIM` |
| 19 | Fingerprint de currículo muda | `test:feature-truth`, `validate:rc15-freeze` | `FINGERPRINT` |
| 20 | Planner gerado muda | idem (o fingerprint cobre) | `FINGERPRINT` |

---

## P15 / P16 — E2E

`e2e/rc1-5-product-truth.spec.ts`, seis cenários, todos verdes:

| Cenário | Assert |
| --- | --- |
| P15 · `/fala` como Free | Sem "Praticar com IA", sem "Fala com IA", sem "correção de pronúncia", sem roleplay, sem `pro-paywall-speech` |
| P15.1 · `/fala` como Pro | Sem "Em breve no Pro"; se houver roadmap, ele é `coming_soon`, sem botão |
| P15.2 · 6 × "Já sabia" | `phrasesReviewed += 6`, `phrasesSpoken += 0` |
| P15.3 · tentativa real | `phrasesSpoken += 1`, uma única vez, e `phrasesReviewed` intacto |
| P16 · missão de fala | Três revisões não movem `daily-speak` |
| P8.2 · sem microfone | `daily-speak` não é oferecida |

O P15.3 dubla a **plataforma** (`SpeechRecognition`), não o contrato: o dublê
emite `onresult` duas vezes para o mesmo "Falar" — o caso real do Chrome — e o
contador sobe exatamente 1. Tudo do lado do Longyu roda como em produção.

---

## P20 / P21 — Congelamento e preservação

| Verificação | Antes | Depois |
| --- | --- | --- |
| Fingerprint | `7c054f2255e7` | `7c054f2255e7` |
| Lições | 134 | 134 |
| Teaching topics | 113 | 113 |
| Vocabulário / Hànzì | — | sem adição |
| Planner gerado (RC1.4) | — | intocado |

Gates da RC1.3 e RC1.4 reexecutados e verdes: revisão finita, resposta
canônica, paridade de tarefa e de ajuda, contraste tonal, transparência
visual, layout de conclusão, integridade de tarefa gerada, integridade do
planner de maestria, lab mastery Pass 4, allowlist de mismatch vazia.

---

## Limitações declaradas

- **`phrasesSpoken` só cresce onde há `SpeechRecognition`.** Em Safari e em
  navegadores sem a API, o contador fica em zero para sempre. Isso é correto —
  é a verdade — mas significa que as medalhas de fala continuariam
  inalcançáveis se dependessem dele. Por isso as medalhas `fala-*` tiveram a
  **promessa** corrigida em vez da métrica trocada: mudar a métrica tiraria
  medalhas já conquistadas de quem nunca pôde falar.
- **Números legados não foram reinterpretados.** Um snapshot antigo com
  `phrasesSpoken: 40` continua com 40. Esse número não vira `phrasesReviewed`,
  não vira prova de fala, e só é usado como piso para não tirar recompensa de
  ninguém.
- **A tentativa de fala não pontua qualidade.** Ela registra que houve fala.
  Quanto a pronúncia foi boa continua sendo uma pergunta que o Longyu não
  responde — e não finge responder.

---

## Próximo estágio

RC2 — Release Candidate / Operational Evidence. Congelar SHA candidata,
preencher `release_candidate_sha`, deploy real, cloud auth, cloud sync,
feedback backend, Stripe Test Mode, Android/iOS reais, rollback drill,
`gate:public-beta`, WebKit obrigatório, segurança final, QA humano, e só então
decidir GO/NO-GO.
