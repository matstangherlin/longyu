# RC2.2.20 — Physical Beta Readiness

> **CODE PASS ≠ PHYSICAL PASS. WEB/E2E PASS ≠ PHYSICAL PASS. Screenshot automatizado e emulador ≠ PHYSICAL PASS.**
> Esta onda entrega as ferramentas e os contratos para provar no aparelho o que o #292 implementou. Nenhum teste físico foi executado por automação: **todos os 12 continuam `NOT_RUN`** até o owner registrar a evidência num Android físico.

- `RC2_2_20_BASE_SHA = 3eb7df133f2826ce70bc9e347a7d4cc705fccbc4` (`main` depois do merge do matstangherlin/longyu#292; `main` não avançou depois dele).
- Fingerprint pedagógico: **`c48b008c9c1e`, inalterado**. Nenhum conteúdo congelado mudou, então não há `CONTROLLED_PEDAGOGY_CONTENT_EXCEPTION`. A exceção de escopo é `RC2_2_20_PHYSICAL_BETA_READINESS_EXCEPTION`.
- Manifesto: `docs/release/rc2-2-20-manifest.json` · Matriz: `docs/release/rc2-2-20-device-matrix.json` · Owner: `docs/release/rc2-2-20-owner-actions.json` · Evidência: `docs/reports/rc2-2-20-physical-evidence/`.

## Estado honesto

| Camada | Estado |
|---|---|
| CODE PASS | `gate:rc2-2-20-physical-beta-readiness` (5 áreas, contratos) |
| WEB/E2E PASS | `e2e/rc2-2-20-physical-readiness.spec.ts` (superfície, contratos e estados na web) |
| PHYSICAL PASS | **NOT_RUN** — nenhum dos 12 testes |
| OWNER ACTION REQUIRED | modelo de e-mail de recuperação, package/verificação/upload key/backups, AAB assinado, Play App Signing, trilha interna, instalação pela Play, N→N+1, assets da loja |
| CLOSED_BETA_READY | **false** |
| PUBLIC_BETA | **NO_GO** |

## 1. A superfície única do QA físico: `/qa/device`

**Onde existe:**
- DEV, Preview, QA Candidate e builds de fixtures;
- qualquer build com `VITE_DEVICE_QA=true` (ex.: `VITE_DEVICE_QA=true npm run android:debug`);
- **nunca** na Production Beta comum.

O link "QA físico no aparelho" aparece no fim de **Mais** só nesses builds, e o Voltar do Android volta para Mais.

**O que mostra:**
- **Build e aparelho:**
  - BUILD SHA, versionName e versionCode do APK instalado;
  - package;
  - native/web;
  - versão do Android e modelo, sanitizados a partir do user agent do WebView (nunca serial, IMEI ou nome do aparelho);
  - aviso de emulador.
- **Os 12 testes**, cada um com passos curtos e o que precisa ser visto ou ouvido:
  - `guidanceShownOnDevice`, `guidanceMatureAccountNoRelock`;
  - `guidedTryAudioDevice`, `conversationContinueDevice`;
  - `nativeSpeechRecognitionZhCn`, `selfCompareRecordingPlayback`;
  - `mobileSignupDevice`, `passwordRecoveryOtpDevice`;
  - `reviewRoundsDevice`, `storySceneDevice`;
  - `profileAccountLogoutDevice`, `articulationDiagramsDevice`.
- **Estados:** `NOT_RUN` / `PASS` / `FAIL` / `BLOCKED` / `NOT_APPLICABLE`.
  - **PASS exige** testedAt, buildSha, versionCode, deviceClass e evidenceType. Nunca vale no navegador ou no emulador.
  - **FAIL exige** uma nota que reproduza o problema.
  - Nota com cara de e-mail, código de 6 dígitos ou token é recusada.
- **Evidência:** `OWNER_OBSERVED`, `SCREENSHOT`, `SCREEN_RECORDING`, `DIAGNOSTIC_TRACE`, `PLAY_INSTALL_EVIDENCE`.
- **Classes de aparelho:** `OWNER_DEVICE`, `SECOND_ANDROID` (não existe hoje e nunca é fingido), `PLAY_BUILD`, `DEBUG_DIAGNOSTIC_BUILD`.
- **Matriz crítica:** só PASS quando **todo** teste crítico é PASS válido. `NOT_APPLICABLE` não conta.
- **Tempos neste aparelho:**
  - marcos: `first_interactive`, `journey_open`, `lesson_open`, `review_open`, `immersion_open`, `atlas_open`;
  - "Guardar como base" grava a base do aparelho do owner;
  - regressão = pior que 1,5× a base **e** mais de 300 ms, sem SLA universal inventado.
- **Update N→N+1:** "Guardar retrato (antes)" → atualizar pela Play sem estudar no meio → "Comparar (depois)".
  - O retrato só tem contagens: lições, XP, Pérolas, recompensas, baús, medalhas, conquistas, SRS, orientações por estado, áreas liberadas e ajustes.
  - Aponta:
    - `JOURNEY_RESET`;
    - `XP_DUPLICATED` / `XP_LOST`;
    - `PEARLS_*`;
    - `REWARD_DUPLICATED`;
    - `SRS_RESET`;
    - `MEDALS_LOST`;
    - `ACHIEVEMENTS_LOST`;
    - `GUIDANCE_RESET`;
    - `FEATURE_RELOCKED`;
    - `SETTINGS_RESET`;
    - `SAME_BUILD`.
- **Trilhas (sem PII):**
  - avanço do passo: `step_visible → audio_requested → audio_started → continue_pressed → completion_started → completion_finished → advanced`;
  - áudio: caminho nativo/web, voz disponível, request/start/end/error/timeout/unavailable com motivo;
  - fala: todos os elos;
  - cadastro: estágio, código e categoria;
  - observações automáticas (etapa travada, falha de áudio/fala/cadastro): **pistas, nunca status**.
- **Copiar JSON** → cole em `docs/release/rc2-2-20-device-matrix.json`.

**Correção que viabiliza o QA físico:** as trilhas de passo, áudio e fala só existiam em DEV/E2E. O APK que o owner instala (production_beta por padrão) não registrava nada, e a prova física era impossível. Agora elas também ligam com `deviceQaEnabled()`. A Production Beta comum continua sem trilha.

## 2. Correções derivadas do plano físico

- **Etapa que não avança (P1 CONVERSATION_CONTINUE_STALL).** O recuo existente só reoferecia "Continuar". Agora:
  - **QA:** "Esta etapa não avançou corretamente." com [Tentar continuar] [Recarregar etapa] [Reportar problema]. Reportar vira observação em `/qa/device`.
  - **Produção:** texto simples, sem termo técnico, com [Tentar continuar] e [Recarregar etapa].
  - "Recarregar etapa" remonta **só** o exercício, no mesmo passo. Nunca pula conteúdo (mesma regra da RC2.2.14).
- **Fala: categorias diferentes para problemas diferentes.**
  - `speechFailure.ts` classifica cada falha em uma categoria:
    - `PERMISSION_DENIED`, `NO_SERVICE`, `NO_ZH_CN`;
    - `TIMEOUT` (código novo `timeout`: o prazo da sessão web acabou sem ouvir nada, ≠ `no-speech` do motor);
    - `NO_SPEECH`, `RECORDING_FAILURE`, `NETWORK`, `BUSY`, `INTERRUPTED`.
  - Cada categoria tem a sua saída, e "Continuar sem falar" existe em todas.
  - O diagnóstico ganhou os elos da **tentativa**: `recognitionStarted`, `speechDetected`, `recognitionResult` (sim/não, nunca o texto), `fileBytes`, `playbackStarted` e `failureCategory`.
  - `recognitionAttemptProven` exige capacidade + início + fala detectada + resultado. `recordingProven` recusa arquivo vazio e reprodução que nem começou.
- **Gravar e comparar:**
  - estados claros: **Preparando… → Gravando… → Ouvir minha voz / Gravar novamente**, e "Tocando sua voz…" durante a reprodução;
  - gravação curta demais mostra aviso (antes voltava ao início em silêncio);
  - microfone bloqueado tem mensagem própria;
  - arquivo vazio vira falha, nunca gravação.
- **Cadastro:**
  - categorias seguras: `NETWORK`, `RATE_LIMIT`, `SUPABASE_AUTH`, `EMAIL_CONFIRMATION`, `SESSION_RESTORE`, `PROFILE_BOOTSTRAP`, `ONBOARDING_DRAFT`, `TIMEOUT`, `UNKNOWN_SAFE`;
  - `signupRetryStage` diz de onde "Tentar novamente" retoma sem recriar perfil, username, conta ou recompensa;
  - a falha entra na trilha e nas observações.
- **Sair neutro.** "Sair" no bloco Você do Mais e "Sair da conta" em Conta estavam em vermelho, iguais ao "Excluir conta". Agora são neutros, e "Excluir conta" continua separado e destrutivo, na zona de perigo de Ajustes.
- **Cultura liberada.** A cópia segue a spec: "Agora você já tem repertório para entender como essas frases são usadas no dia a dia." [Conhecer]. Saiu o ✨ (nada de celebração gigante).

## 3. Revisão: repetição semântica

- **`MIN_TARGET_GAP = 2`:** o mesmo alvo só volta depois de pelo menos dois outros alvos.
  - Com fila pequena, o composer degrada para o alvo que está há mais tempo sem aparecer. Nada some.
- **Alvo pela FORMA (`reviewSurfaceTarget`):** 你好 como vocabulário e 你好 como frase eram "alvos diferentes" (IDs diferentes). Agora são o mesmo alvo.
- **`semanticRepetitionViolations`:** mesmo alvo + mesma família de exercício a menos de `MIN_TARGET_GAP`. Usado pelo gate.
- O `formatShift` da RC2.2.19 continua trocando o eixo quando o alvo volta.
- Não mexe no SRS: só a ordem de apresentação.

## 4. Pedagogical Consolidation V5A (baixo risco)

- **Pronunciation Core BR** no Pinyin Lab, seção "Sons que confundem quem fala português".
  - 11 contrastes: b/p, d/t, g/k, z/c/s, zh/ch/sh, j/q/x, u/ü, r/l, an/ang, en/eng, in/ing.
  - Pares reais no **mesmo tom**, e os que o TTS lê errado sozinhos foram trocados (耕 em vez de 更, 肉/漏 em vez de 热/乐).
  - Ordem: **ver articulação → ouvir A → ouvir B → comparar → identificar → produzir (opcional, gravar e comparar sem nota)**.
  - Nunca começa por quiz, e identificar só libera depois de ouvir.
  - Explicação curta em relação ao português. Reusa `ARTICULATION_DIAGRAMS`.
  - Fica fora das fontes congeladas, por isso o fingerprint não muda.
- **Reciclagem lexical** (`npm run report:lexical-recycling` → `docs/reports/rc2-2-20-lexical-recycling.md/.json`).
  - Cobre as primeiras 40 lições: 83 lexemas, 59% com 2ª exposição, 34% com exposição em conversa, 52% elegíveis para Revisão, 18% na Imersão e 20% na Cultura.
  - **17 órfãs** (sem 2ª exposição em até 10 lições), listadas como prioridade de reciclagem.
  - Só mede: não altera o SRS nem o conteúdo.
- **Progressão das aulas iniciais de tom** (`npm run report:tone-progression` → `docs/reports/rc2-2-20-tone-progression.md`).
  - **7 de 9** aulas iniciais cobram reconhecer o tom antes de um passo só de ouvir ou discriminar. A intro sozinha não conta como percepção.
  - Nenhuma tem intro longa.
  - Reordenar esses planos mexe no currículo congelado e nos contratos de progressão das 20 primeiras lições. Fica como **prioridade V5A com decisão do owner**; não foi alterado nesta onda.
- Microleituras e pragmática: **não iniciadas** nesta onda (sem conteúdo novo sem justificativa).

## 5. Gate `gate:rc2-2-20-physical-beta-readiness`

| Área | Valida |
|---|---|
| `physical-evidence` | contrato do PASS físico, PII, superfície só em QA, matriz e manifesto honestos |
| `device-contracts` | orientação só com render, sem re-trancar, clique ≠ áudio, Continuar → advanced, etapa travada nunca pula, permissão ≠ reconhecimento, gravação = arquivo + reprodução, sem popup em exercício, trilhas no APK de QA |
| `review-auth` | `MIN_TARGET_GAP`, formatShift, alvo pela forma, prazos e categorias do cadastro, OTP só em memória e nunca logado, código errado recusado, categorias de fala |
| `pedagogy` | tom ≠ língua, 11 contrastes BR com percepção antes de quiz, CTA sem XP, relatórios V5A, freeze |
| `release` | Sair visível e neutro, Excluir separado, update não reseta orientação nem duplica recompensa, package, compras, #273, Production Play, Closed/Public Beta honestos |

**68 mutações, todas mortas:**

| Área | Mutações |
|---|--:|
| `physical-evidence` | 14 |
| `device-contracts` | 16 |
| `review-auth` | 12 |
| `pedagogy` | 8 |
| `release` | 18 |

As 24 mutações obrigatórias da spec estão numeradas `[1]`…`[24]` em `scripts/rc2-2-20-physical-beta-readiness.mjs`; o resto são variações e extras. O gate entra em `validate:beta` e nos workflows Android (build e release).

## 6. O que o owner faz agora

1. Gerar o APK de diagnóstico com `VITE_DEVICE_QA=true npm run android:debug` e instalar no aparelho.
2. Rodar a matriz em `/qa/device` com a **Conta A** (nova) e a **Conta B** (madura, criada antes do Guidance v2).
3. Colar o JSON exportado em `docs/release/rc2-2-20-device-matrix.json` e a evidência em `docs/reports/rc2-2-20-physical-evidence/`.
4. Cumprir as ações de `docs/release/rc2-2-20-owner-actions.json`:
   - aplicar o modelo de e-mail de recuperação;
   - upload key e backups;
   - AAB assinado;
   - Play App Signing;
   - trilha interna;
   - instalar pela Play;
   - N→N+1 com o retrato de update.
5. Repetir os testes críticos **no build da Play** (`deviceClass = PLAY_BUILD`). O APK de diagnóstico não fecha a certificação.

Qualquer "continua igual", "não apareceu", "travou", "não tocou", "não reconheceu" ou "não avançou" vira **FAIL com nota** e **TASK = NOT_DONE**, mesmo com o gate verde. O bug corrigido depois precisa de reprodução, causa, correção, regressão automatizada quando possível, reteste físico e evidência antes/depois.

## Intocados

- #273;
- package `longyu.noba.com`;
- `ANDROID_IN_APP_PURCHASE = DISABLED_FOR_BETA`;
- Production Play só com confirmação explícita;
- sem SRS, Lesson, Story, Guidance, Profile ou Auth Engine novo;
- sem economia, moeda, scheduler ou sistema de progresso novos;
- nenhuma lição reescrita;
- PR não aberto automaticamente; merge e release são decisão do owner.

## Próximo

Se a RC2.2.20 fechar (matriz crítica PASS, AUTH físico PASS, AAB assinado, instalação pela Play, N→N+1 PASS, P0 = 0, P1 bloqueante = 0): **RC2.2.21 — Closed Beta & Human Learning Validation**.
