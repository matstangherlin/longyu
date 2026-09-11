# V4.9.8B.2 — Unified Lesson UX

Última micro-remessa da V4.9.8. **Não** inicia V4.9.9.

Speaking First + diálogos com revelação automática + Cultura na Jornada + Victory mínima.

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 003cb0ed7858 |
| HEAD no instante da geração | ddc08aa57a7dad11a1033b3611e63618fd786a57 |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-09-11T02:29:12.051Z |
| Lições | 131 |

## Base

| Campo | Valor |
|-------|-------|
| SHA obrigatória (`main` após merge #250) | `ddc08aa57a7dad11a1033b3611e63618fd786a57` |
| #250 | V4.9.8B.1 — Conversation phrase builder + Hanzi fill + lexical bridge |
| Branch | `cursor/v498b2-unified-lesson-ux-6ae2` |
| Fingerprint da Jornada | `003cb0ed7858` |
| Tópicos de ensino | 113 (imersões continuam `isReview` + `curriculumRole: "immersion"`) |

## O que esta remessa não faz

Não inicia V4.9.9. Não reescreve a Jornada. Não cria LessonPlayer/CulturePlayer/ConversationPlayer novos. Não remove produção livre. Não esconde o Falar. Não copia o dashboard do Duolingo. Não reabre Culture playability / story audio / native lessons / rewards / Live Leagues, salvo regressão direta causada por esta UX.

## Antes / depois

| Superfície | Antes (#250) | Depois (8B.2) |
|------------|--------------|---------------|
| Falar | link `Ou falar a resposta` | botão primário `Falar` com `data-speech-state` idle/listening/processing |
| Peças | retângulo de montagem | chips de palavra (`rounded-full` + `conversation-chip-in`); guided = hànzì+pinyin; assisted = hànzì; independent = sem chips |
| Diálogo | `Ouça e toque para revelar` | NPC auto-revela; `audio_first` espera 700 ms ou revela se o autoplay bloquear |
| Victory | dashboard + Culture Mission card | `LessonVictory` mínima: headline, estrelas, XP, precisão, 1 highlight, 0–1 foco, 1 CTA |
| Cultura | card pós-aula + Salvar no player | aula normal na Jornada (`culture-{itemId}`); Hub e Jornada compartilham o id canônico |
| Continuar | sempre Jornada | se o próximo nó for Cultura CORE, abre essa aula; mastery de tópico continua `preferJourney` |

## Speaking hierarchy

- Falar é ação primária quando o reconhecedor existe (mesmo avaliador: `evaluateLearnerResponse`).
- Digitar permanece disponível; Montar aparece no guiado ou dentro de Preciso de ajuda no independent/transfer.
- Três blocos gigantes não competem: Falar é `primary`, Digitar/Montar são `ghost`/`soft`.
- Alvo de toque ≥ 44px (`min-h-11` / `--lesson-button-height: 2.75rem`).
- Após o transcript: `[Usar resposta]` (`player.useAnswer`).
- Falar continua visível com peças (`micOnly` + `data-testid="free-answer-mic"`).

## Cultura na Jornada

- CORE no caminho; EXPLORE como nó lateral. No máximo um CORE por `afterTopicId`.
- `canonicalLessonId` = `culture-{itemId}` no Hub (`CultureCard`) e no nó (`JourneyInlineNode`).
- Lanterna + rótulo CULTURA (`culture.journeyNodeCore` / `LessonKindLabel`).
- Títulos do nó com `line-clamp-2`.
- Victory **não** monta `CultureTouchpoint`. O card permanece só na ficha `/licao/{id}` (e2e de hotel/hub/shopping/mobilidade).
- Salvar para depois fica no Hub. LessonPlayer / Victory / ficha da aula não mostram o botão.

## Victory mínima

`buildLessonCompletionSummary()` é determinístico, sem LLM. Perfeito: ✨ Perfeito! e sem foco. Nunca emite `Continue estudando!`.

Animação 1–2s no mascote existente; respeita `soundEffects` e `prefers-reduced-motion`. `playedRef` impede replay de SFX/XP no shell. O grant de XP continua no `LessonPlayer` (`claimedRewardCards`).

Mesmo shell para culture / review / test / mission. CTA: `Receber recompensas` → `Continuar Jornada` / `Voltar à Jornada`. Opcional: Revisar erros.

## Prompts naturalizados

Reescrita só na exibição (`naturalizeConversationPrompt`). `conversationScenes.ts` não muda — fingerprint permanece `003cb0ed7858`.

- `O que X responde com 我叫…` → `Mei perguntou seu nome. Como você responde?`
- Nome do aluno vem de `currentUser.displayName` / `studentFirstName`. Mei / Wang / Lin continuam hardcoded.

## Gates novos

- `validate:lesson-ui-consistency` / `test:lesson-ui-consistency`
- `validate:conversation-auto-reveal` / `test:conversation-auto-reveal`
- `validate:culture-journey-placement` / `test:culture-journey-placement`
- `validate:completion-experience` / `test:completion-experience`

Preservados (#250 e anteriores): conversation-lexical-bridge, production-scaffolding, hanzi-fill-integration, china-survival hotel/airport/travel, culture-*, live-league, validate:beta, build.

## Mutations

| # | Mutação | Código | Resultado |
|---|---------|--------|-----------|
| 1 | Falar volta a ser link sublinhado | SPEAK_LINK | KILLED |
| 2 | Tokens de aula ausentes | TOKENS | KILLED |
| 3 | Sem rótulo compartilhado | KIND_LABEL | KILLED |
| 4 | Ouça e toque para revelar | TAP_REVEAL | KILLED |
| 5 | NPC esconde o texto de novo | AUTO_REVEAL | KILLED |
| 6 | CORE sem nó na Jornada | MISSING_NODE | KILLED |
| 7 | Dois CORE no mesmo âncora | CONSECUTIVE_CORE | KILLED |
| 8 | Culture card na Victory | POST_LESSON_CTA | KILLED |
| 9 | Salvar para depois na aula | SAVE_FOR_LATER | KILLED |
| 10 | Culture card / missions dashboard | CULTURE_CARD / DASHBOARD | KILLED |
| 11 | Dois CTAs primários | CTA_COUNT | KILLED |
| 12 | Continue estudando! | GENERIC_FOCUS | KILLED |


## E2E

`e2e/v498b2-unified-lesson-ux.spec.ts`: hotel Falar+peças sem tap-reveal; nó Cultura `culture-greetings-nihao`; Victory mínima sem card/save/nav; EN Type/Speak; viewport 390×844.



<!-- integridade:e67f3d11cb7db88c -->
