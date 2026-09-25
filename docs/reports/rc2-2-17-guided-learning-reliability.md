# RC2.2.17 — Guided Journey, Native Media Reliability & Release Completion

Status formal: **NO-GO para Public Beta** (continua dependendo de #273, Closed Beta, QA humano e release drill).
Status desta onda: **código pronto e validado; confirmação física pendente** (nenhum PASS físico foi marcado).

## 1–2. Base

| | |
|---|---|
| main | `0c5ad5ae` (RC2.2.13, #287) |
| #289 (RC2.2.16, Cursor) | **aberto**, head `d3971c14` |
| #288 (RC2.2.14/14B) | **aberto**, head `22885244` |
| Base desta onda | `28798067` = head do #289 + merge do head do #288 (conflito resolvido em `e2e/mobile-device.spec.ts` e `smartBack.ts`) |
| #289 merge SHA | **ainda não existe** (PR aberto) |

O owner pediu o PR da RC2.2.17 antes do merge de #288/#289. Por isso a estratégia é de **PR empilhado** (Precondition da spec). Os commits de #288/#289 **não foram duplicados**: são os mesmos objetos git. Mergear este PR na `main` leva junto #288 e #289.

## 3–5. RC2.2.16 — resíduo (sem falsificar)

Manifesto: `docs/release/rc2-2-16-residual.json` → **`RC2_2_16_RESIDUAL = OWNER_ACTION_REQUIRED`**.

| Item | Status | Por quê |
|---|---|---|
| 0A relatório RC2.2.16 | COMPLETE | `docs/reports/rc2-2-16-play-internal-beta.md` (#289) |
| 0B validação | PARTIAL_AGENT_RUN | gate:rc2-2-16 (validate+test, 5 áreas) verde aqui; `validate:beta` completo: ver Gates |
| 0C package no Play | OWNER_CONFIRMATION_REQUIRED | só o owner vê o Play Console |
| 0D verificação de dev | OWNER_CONFIRMATION_REQUIRED | idem |
| 0E upload key | OWNER_ACTION_REQUIRED | nunca senha automática, nunca commit |
| 0F backups | OWNER_ACTION_REQUIRED | checklist no manifesto (tudo `false` exceto gitignore) |
| 0G GitHub environments | OWNER_ACTION_REQUIRED | não verificável pelo agente |
| 0H AAB assinado real | NOT_READY | a chave descartável do #289 não conta |
| 0I Play Internal | PHYSICAL_ACTION_REQUIRED | instalação pela Play (`com.android.vending`) |
| 0J Play N→N+1 | PHYSICAL_ACTION_REQUIRED | |

Regressões guardadas pelo gate `release-residual`: package `longyu.noba.com` (FE), `ANDROID_IN_APP_PURCHASE=DISABLED_FOR_BETA` (FF), só Internal, sem Production (FG).

## 6–8. P1-01 — áudio do Teste guiado

- **Bug exato:** `GuidedTryPage.listen()` fazia `speak(...); setHeard(true);`. O clique virava "ouviu", mesmo sem som.
- **Causa raiz:** o resultado do motor (`onerror`/`onend`) era ignorado. No Android, o plugin já rejeitava honestamente (`TTS_LANGUAGE_MISSING_DATA`, `TTS_UNAVAILABLE`…), mas ninguém ouvia a rejeição. Achado extra no plugin: o `onStop` atrasado da fala anterior resolvia a fala **nova** como "interrompida" (sem checagem de utterance id).
- **Correção:**
  - `src/lib/audioPlayback.ts`: `playMandarinAudio()` com os estados IDLE → STARTING → PLAYING → ENDED / FAILED / UNAVAILABLE, mais `started / ended / failed / unavailable / reason`.
  - PLAYING só com `onstart` (Web) ou evento nativo `ttsState:start` (`UtteranceProgressListener.onStart`).
  - Terminar sem ter começado conta como falha. Sem início em 6 s: `NO_START_TIMEOUT`.
  - O Guided Try só marca `AUDIO_HEARD` depois de `outcome.started`.
  - Na falha, a tela mostra "Não conseguimos reproduzir o áudio.", com os botões [Tentar novamente] e [Configurar voz chinesa] (quando faltam dados da voz), além de 你好 · nǐ hǎo · olá e **"Continuar sem áudio"** explícito (`DEGRADED_AUDIO`).
  - O SpeakButton nunca falha calado (bolha de status + "Instalar voz chinesa").
  - "audioHeard" (tarefa diária) só conta quando a fala começa de verdade.
  - Plugin: `installTtsData` (ACTION_INSTALL_TTS_DATA), diagnóstico `initStatus/requestedLocale/engine` (sem PII) e checagem de utterance id.
  - Assets canônicos (Part G): nenhum no repositório para 你好 谢谢 再见 我 你 好 妈 麻 马 骂, então segue o TTS (`CANONICAL_AUDIO_ASSETS` vazio). Nenhum áudio baixado da internet.

## 9–11. P1-02 — conversa que não avança

- **Lição exata:** no plano **real**, `conversationScene("como-se-chama")` (p1-primeira-conversa e l9-qual-nome) é rotacionado:
  - p1, a partir da 3ª passada (**"Etapa 4/6"**, o mesmo da captura), usa a cena `me-apresentando`;
  - l9 usa a troca gerada `packet-exchange-*`.
  - Todas perguntam "Como você se chama?".
- **Causas encontradas no código (não reproduzidas na Web com o toque do teste):**
  1. **Latch + completionKey.** Em `LessonPlayer.handleDone`, a chave de conclusão era gravada *antes* dos efeitos colaterais da cena (histórico, SRS da conversa via `manifestFromConversationStep`, que monta um stub para `packet-exchange-*`, e telemetria). Se algum deles lançasse erro no aparelho, o StepRenderer liberava o latch, mas a chave ficava gravada. Todo toque seguinte, **inclusive o "Continuar" de recuperação do stall guard**, virava `duplicate_completion` silencioso: a cena congelava para sempre. **Corrigido:** efeitos colaterais isolados (`safeSideEffect`) e, se algo ainda falhar, a chave é liberada e o passo avança (o toque foi a confirmação do aluno).
  2. **Laço de mesma fala.** Ramo de erro 6 → 5 com o mesmo texto ("你叫什么？ · Como você se chama?"): parecia "toquei Continuar e nada mudou". **Corrigido:** no 2º erro na mesma fala, a cena mostra a resposta e segue pelo ramo certo (o erro continua registrado).
  3. **Toque na opção sequestrado.** Hànzì dentro da opção (MandarinToken padrão) abria a "Ajuda de leitura" no toque e a opção não ficava marcada. Isso se reproduziu no E2E de toque (l3, l11, p1-ate-logo, p3). **Corrigido:** termo dentro de botão usa o contrato da Revisão (tocar = botão; segurar = glossário).
  4. Mapa de nós da cena preso à 1ª personalização (`useMemo` só por `sceneId`) → agora segue `step.nodes`.
- **Rastro (Part R, DEV/E2E, sem PII):** `scene_continue_pressed → scene_onDone → renderer_onDone → player_handleDone → completion_key → advanced` (+ `renderer_latched`, `side_effect_failed`, `handle_done_failed`).
- **Auditoria de integração** (`e2e/conversation-scene-advance.spec.ts`, 390×844, toque, nome real "Ana"):
  - gancho de QA só em fixtures (`__longyuLessonQa`, plano REAL + `jumpTo`);
  - driver responde pelo grafo;
  - os 3 caminhos do aparelho passam (p1 domínio 2 = Etapa 4/6; l9 domínio 0 e 2), com trace completo e exatamente 1 `advanced`;
  - o caminho de erro (2 erros → resposta → avança) passa;
  - **todas as cenas de todas as lições com cena passam: 52/52 execuções.**

## 12–15. P1-03 — fala

- `src/lib/recognitionCapability.ts`: `RecognitionCapability` com os estados AVAILABLE, MODEL_DOWNLOAD_REQUIRED, SERVICE_UNAVAILABLE, LANGUAGE_UNSUPPORTED, LANGUAGE_TEMP_UNAVAILABLE, PERMISSION_REQUIRED, READY e UNKNOWN_SUPPORT.
  - **Idioma ≠ permissão:** microfone concedido com zh-CN ausente dá LANGUAGE_*, nunca READY.
  - `LANGUAGE_*` nunca mexe no estado do microfone.
- **API 33+:** `SpeechRecognizer.checkRecognitionSupport(zh-CN)` roda **antes** da primeira fala (installed / pending / supported on-device / online). Abaixo de 33: UNKNOWN_SUPPORT (tenta e aprende com o erro).
- **Modelo:**
  - `triggerModelDownload`: na API 34+ com `ModelDownloadListener` (progresso, agendado, pronto, erro); na API 33, só dispara.
  - UI: "Preparar reconhecimento em mandarim" [Baixar suporte] → Preparando… / Baixando… / Pronto / "O Android vai preparar o reconhecimento. Você pode continuar estudando."
- **Self-compare:** idioma/serviço indisponível leva à autoavaliação, sem 10 tentativas: modelo 🔊 → [Gravar minha voz] → [Ouvir modelo] [Ouvir minha voz] → "Compare ritmo e clareza." → [Repetir] [Continuar].
  - Gravação nativa temporária (`start/stop/play/deletePracticeRecording`): um arquivo em `getCacheDir()`, apagado ao gravar de novo, ao sair, no background e ao fechar. Na Web, um Blob revogado ao sair.
  - Nunca vai para Supabase, nuvem ou analytics. A cópia de privacidade é verdadeira pela implementação.
  - Sem gravação possível: modelo + "Não consigo falar agora". A lição continua.
  - Tentativa de fala só conta com reconhecimento com captura ou gravação real concluída.
  - **Nenhuma nota de tom** (`ToneProductionEvidence = NO_PITCH_MEASUREMENT`).
- **Data Safety:** `microphoneAudio.collected=false` mantido (processamento só no aparelho) + `temporaryLocalRecording` declarado. O validador da RC2.2.16 foi ajustado para exigir essa declaração e a prova de exclusão; gravar no módulo de reconhecimento continua reprovando.
- **Resultados no aparelho** (serviço, on-device, zh-CN, modelo, download): **NOT_RUN**, porque não há aparelho físico neste ambiente.

## 16–19. Onboarding

- **Antes:**
  - Guided Try → /comecar → objetivo (viagem, estudo…) → nível → quiz adaptativo de placement ("Pergunta 6" + SOM E PINYIN / FASE ATUAL / ÁUDIO E TOM) → resultado → formulário com 6+ campos e card de requisitos.
- **Depois (iniciante):** sistema → CourseDirection → **Teste guiado V2** → **meta diária** → conta (2 etapas) → Jornada.
- **Depois (experiente):**
  - "Já estudo mandarim" → meta diária → [Fazer teste de nível | Começar do início] → nível → quiz → resultado → conta.
  - Placement opt-in e limpo: "Pergunta N de M", enunciado, áudio e opções; as 3 pílulas saíram da UI.
  - O motor de placement, a evidência, o commit no servidor e o banco de perguntas ficaram intactos.
  - Áudio que falha no aparelho vira **TECHNICAL_SKIP**, nunca erro.
- **Meta diária — componente canônico:** **não existia** no código uma etapa "quantos minutos". O que havia era o objetivo motivacional e a constante 5 min × 4 trilhas = 20 min. Criei `CANONICAL_DAILY_GOAL_STEP` **dentro do ComecarPage**, sem motor novo:
  - opções 5 Leve / 10 Constante / 15 Focado / 20 Intenso;
  - persistida por conta (`dailyGoalMinutes`), usada no LessonPlayer e no Treino;
  - contas sem escolha continuam com 20.
  - O objetivo motivacional saiu do caminho (o placement aceita `goal: null`).
- **Handoff:**
  - `onboardingDraft` (local) guarda `guidedTryCompleted` + áudio + meta.
  - Depois da conta, `applyOnboardingDraft` grava **só** `GUIDED_TRY_EXPOSURE` + meta. Sem lição, domínio, XP, estrela ou ofensiva.
- **Replay:** Treino → "Rever o Teste guiado (sem recompensa)", fora da TabBar. Conta existente: login → Jornada, sem Teste guiado.

## 19. Teste guiado V2

Sete micro-passos (~3–5 min), cada um com uma ideia e uma ação:

1. Dragão: "Você já vai aprender sua primeira saudação."
2. Ouça 你好 (áudio real).
3. 你 = você / 好 = bom.
4. Tom de 好: `ToneContour` guiado, com ponto animado, mão e coluna ALTO/BAIXO; escolher o contorno.
5. Significado.
6. Montar 好 = 女 + 子.
7. Conversa: Chen Mei 你好！ → responder 你好！

No fim, o recap ("Você já consegue cumprimentar alguém.") leva à meta diária. Micro-transição de 180 ms (sem animação com reduced motion). A vibração segue a RC2.2.14: acerto/erro, sem vibrar no Continuar.

## 20. Jornada guiada — auditoria das 20 primeiras

A camada `src/lib/guidedLesson.ts` fica **sobre** o LessonPlayer; não é outro motor.

- `guidanceLevelForLesson()` é orientada a dados (posição, papel curricular, domínio anterior):
  - HIGH até a 20ª lição;
  - MEDIUM até a 60ª;
  - LOW depois;
  - NONE em avaliação;
  - revisão e imersão ficam em LOW.
- As fases PREPARE → NOTICE → TRY → FEEDBACK → USE → RECAP são expostas no quadro do passo.
- O Dragão abre com uma frase curta (≤ 140 caracteres) **só** quando o 1º passo não é uma intro que já traz o Dragão.
- A `l2` ("Olá") faz a ponte com o Teste guiado ("Você já usou 你好 no início…"), sem pular avaliação.

| # | Lição | Guia | Fases (autoradas) | Passos | Áudio | Abertura | Intro (máx. caracteres) |
|---:|---|---|---|---:|---|---|---:|
| 1 | p1-o-que-e-mandarim | HIGH | PREPARE → TRY → USE → NOTICE | 6 | sim | intro do Dragão | 163 |
| 2 | p1-o-que-e-pinyin | HIGH | PREPARE → TRY → USE | 5 | sim | intro | 109 |
| 3 | p1-o-que-e-tom | HIGH | PREPARE → TRY → NOTICE → USE | 9 | sim | intro | 183 |
| 4 | p1-o-que-e-hanzi | HIGH | PREPARE → USE → NOTICE → TRY | 11 | **não** | intro | 200 |
| 5 | p1-primeiros-hanzi | HIGH | PREPARE → NOTICE → TRY | 13 | sim | intro | 147 |
| 6 | p1-engine-2-lab | HIGH | TRY → USE | 8 | sim | fala curta | 0 |
| 7 | l1 | HIGH | PREPARE → NOTICE → TRY → USE | 8 | sim | intro | 142 |
| 8 | l2 | HIGH | NOTICE → TRY → USE | 12 | sim | fala curta / ponte 你好 | 80 |
| 9 | l3 | HIGH | NOTICE → TRY → USE | 10 | sim | fala curta | 0 |
| 10 | l1-rev | LOW | PREPARE → USE → TRY | 5 | sim | intro | 49 |
| 11 | l4 | HIGH | NOTICE → USE → TRY | 15 | sim | fala curta | 124 |
| 12 | p1-ate-logo | HIGH | NOTICE → TRY → USE | 16 | sim | fala curta | 0 |
| 13 | p1-primeira-conversa | HIGH | PREPARE → USE → NOTICE | 11 | sim | intro | 86 |
| 14 | p1-qingwen-cortesia | HIGH | NOTICE → TRY → USE | 12 | sim | fala curta | 0 |
| 15 | l2-rev | LOW | PREPARE → USE → TRY | 7 | sim | intro | 60 |
| 16 | p2-ma-primeiro-tom | HIGH | PREPARE → NOTICE → TRY → USE | 8 | sim | intro | 111 |
| 17 | p2-ma-segundo-tom | HIGH | PREPARE → NOTICE → TRY → USE | 5 | sim | intro | 115 |
| 18 | p3-wohenhao | HIGH | NOTICE → TRY → USE | 7 | sim | fala curta | 0 |
| 19 | p2-ma-terceiro-tom | HIGH | PREPARE → NOTICE → TRY → USE | 5 | sim | intro | 157 |
| 20 | p2-ma-quarto-tom | HIGH | PREPARE → NOTICE → TRY → USE | 7 | sim | intro | 107 |

Leitura honesta:

- Todas as 20 têm pelo menos uma ação por tela, e a primeira intro nunca passa de 200 caracteres.
- A `p1-o-que-e-hanzi` não tem passo de áudio no plano autorado (é um laboratório visual).
- Mudar a **ordem** das fases (ex.: USE antes de NOTICE em p1-o-que-e-mandarim) é conteúdo: move o fingerprint e ficou para a consolidação pedagógica.

**Estrutural das 134:**

| Indicador | Resultado |
|---|---|
| Lições com fase TRY | 133/134 |
| Lições com fase USE | 98/134 |
| Intro acima de 600 caracteres | nenhuma |
| Distribuição de guia | HIGH 18 · MEDIUM 37 · LOW 79 · NONE 0 (as avaliações ficam fora da Jornada) |
| Planos autorados sem passo de áudio | 47 (o planner adaptativo pode acrescentar) |

## 21–22. Tons

O `ToneContour` foi **evoluído**, sem componente paralelo:

- **Modo guiado:** linha de pitch em 5 níveis, ponto que percorre a curva a cada áudio (`animateMotion`) e mão (✋) que imita o contorno.
- **Coluna ALTO/BAIXO** para mostrar onde a voz está.
- **Reduced motion:** o estado final fica estático.

`toneKnowledge.ts` ganhou `TONE_GUIDANCE`:

| Tom | Contorno | Cópia |
|---|---|---|
| 1º | 5-5-5 | "Alto e estável." |
| 2º | 3-4-5 | "A voz sobe." |
| 3º | 2-1-1-3 | "Fica baixo; sozinho pode fazer um vale. Na fala natural, muitas vezes o final não sobe por completo." |
| 4º | 5-3-1 | "Cai firme." |
| Neutro | um ponto de 300 ms | "Curto e leve." (nunca "quinto contorno") |

- O passo de tom da Jornada ("Conheça a curva", ouvir antes de testar) usa o contorno guiado sincronizado ao áudio.
- A cópia honesta do 3º tom foi preservada. A 3+3 e o 不 / 一 continuam no currículo, sem alteração.
- **Nada** de língua ou boca explicando o pitch. A articulação virou um sistema separado (`src/data/articulationTargets.ts`: b/p, d/t, g/k, z/c/s, zh/ch/sh, j/q/x, ü, r, an/ang, en/eng, in/ing, e, i apical), planejado para a RC2.2.18.
- Sem nota de tom: o gancho `ToneProductionEvidence` fica com o status `NO_PITCH_MEASUREMENT`.

## 23–26. Mobile UX

- **Cadastro:**
  - Etapa 1 (Nome, Email, Username) → etapa 2 (Senha, Confirmar).
  - Requisitos progressivos: aparecem com foco ou enquanto falta algo; depois ficam compactos.
  - Nascimento, país, marketing e origem ficam recolhidos em "Mais detalhes (opcional)".
- **Exemplos localizados pela interface:**
  - PT: "Ex.: Mariana" / "ex.: mariana_zh";
  - EN: "e.g. Alex" / "e.g. alex_zh";
  - nunca o nome real do owner.
- **Excluir conta:** "Zona de perigo" no **fim** de Configurações › Conta, com tela de confirmação (progresso, conta e dados) + frase exata + o backend atual (`requestAccountDeletion`). A Privacidade aponta para lá.
- **Aparência:** já estava na Home de Ajustes. Ganhou Sistema / Claro / Escuro (segmented; "Sistema" segue `prefers-color-scheme`). Nenhum botão de tema na landing.

## 27. Screenshots

`e2e/rc2-2-17-screenshots.spec.ts` gera a matriz visual (390×844 · 412×915 · 432×960), com `SHOT_PACK=1`:

- Teste guiado (ouvir, tom, conversa) e modo degradado;
- meta diária;
- cadastro nas etapas 1 e 2;
- Lição (l2 guiada) e conversa;
- tons 1–4;
- Ajustes › Conta e Ajustes › Aparência.

Imagens em `docs/reports/rc2-2-17-screenshots/`.

## 28. Aparelho físico

**NOT_RUN.** Não há aparelho neste ambiente. `android-physical-qa.json` ganhou 21 campos RC2.2.17 (`NOT_RUN`) e o risco `ANDROID_RC2_2_17_DEVICE_UNVERIFIED` (P1_CANDIDATE).

Para registrar ao rodar (modelo, versão do Android, SHA do build, package, origem da instalação):

- ouvir de verdade: Guided Try, Placement, Jornada, Tom, Cultura, Imersão, Revisão;
- matriz de fala;
- self-compare sem reconhecimento de mandarim;
- o cenário exato da captura.

## 29–31. P0 / P1 / P2

| Nível | Situação |
|---|---|
| P0 | nenhum conhecido |
| P1-01 | corrigido no código; **confirmação física pendente** |
| P1-02 | dois defeitos reais corrigidos (chave de conclusão presa; toque na opção sequestrado) + laço de mesma fala; **não reproduzido na Web com a sequência exata do aparelho**; confirmação física pendente |
| P1-03 | corrigido no código; confirmação física pendente |
| P2 | Palavra do dia (RC2.2.15) segue DEFERRED; tongue diagrams e Pronunciation Core ficam para a RC2.2.18 |

## 32–34. Fingerprint e contagens

| | |
|---|---|
| Fingerprint antes | `c48b008c9c1e` |
| Fingerprint depois | `c48b008c9c1e` (**sem mudança**: toda a onda é apresentação/confiabilidade) |
| Contagens | 134 lições · 113 tópicos · 30 CultureItems · 30 Culture Lessons · 20 nós · 5 Moments · 12 Tone Transfers · 52 cenas · 31 READY · 0 PARTIAL (sem mudança; verificado pelo freeze em todos os gates) |

## 35. Gates

- **`gate:rc2-2-17-guided-learning-reliability`** tem 9 áreas (validate + test) e **60 mutações**, todas mortas com o código certo:

  | Área | Mutações |
  |---|---:|
  | Áudio | 6 |
  | Avanço | 8 |
  | Fala | 10 |
  | Onboarding | 8 |
  | Camada guiada | 6 |
  | Tons | 7 |
  | Ajustes | 5 |
  | Release | 7 |
  | Orçamento de informação | 3 |

  As 56 da spec mais 4 extras.
- O gate entrou em `validate:beta` e nos workflows `android-build` / `android-release`.
- **Gates anteriores** ajustados só onde a RC2.2.17 mudou o contrato:
  - 2.2.13 `native-tts`: `onerror` agora leva o código do motor.
  - 2.2.14 `mobile-landing-focus`: rótulo "· 3 min".
  - 2.2.14 `guided-learning-try`: 5–9 micro-passos; o fim leva à meta.
  - 2.2.14 `lesson-step-progression`: o latch pode registrar o rastro.
  - 2.2.16 `play-policy-readiness`: gravação local declarada + exclusão provada.
- 2.2.13, 2.2.14, 2.2.14B, 2.2.16, 2.2.11 e android-native-foundation estão verdes nesta branch.
- **E2E:**
  - `conversation-scene-advance` (56 testes: 3 caminhos do aparelho + caminho de erro + 52 lições com cena);
  - `rc2-2-17-guided-learning` (PT do zero, áudio degradado, EN, experiente, l2 guiada, Ajustes);
  - `guided-learning-try` atualizado para o V2.

## 36. Bloqueios restantes

1. Aparelho físico: áudio real, caminho da captura, suporte zh-CN, download do modelo, self-compare.
2. RC2.2.16: package no Play, verificação de dev, upload key + backups, AAB assinado real, Play Internal e N→N+1 (owner/físico).
3. #273 intocada; Public Beta segue NO-GO.
4. Merge de #288 → #289 → este PR (empilhado), feito pelo owner.
