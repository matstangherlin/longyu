# RC2.2.21 — Mobile Native Stability

Onda **empilhada** sobre o HEAD da RC2.2.20, sem esperar o merge.

- `RC2_2_21_BASE_SHA` = `b43ca4465319cb9632c68982de9ebbbba6dbb003` (branch `claude/rc2-2-20-physical-beta-readiness`)
- `main` no início = `3eb7df133f2826ce70bc9e347a7d4cc705fccbc4`
- Branch: `claude/rc2-2-21-mobile-native-stability`
- PR: mira a branch da RC2.2.20 enquanto ela estiver aberta; depois do merge, é redirecionado para `main`. Nenhum commit da RC2.2.20 foi recriado ou cherry-pickado (`docs/release/rc2-2-21-base.json`).
- Features novas congeladas. A onda só procura, reproduz (quando possível) e elimina bugs mobile.

> **Prioridade máxima:** GRAVAR A VOZ E CONSEGUIR ESCUTAR A PRÓPRIA VOZ no Android.
> Isso **não** foi provado fisicamente nesta onda. Se o owner ainda não ouvir a própria voz no aparelho, a RC2.2.21 **NÃO está concluída**.

## Resumo honesto

| Estado | Resultado |
| --- | --- |
| CODE PASS | Sim: typecheck, encoding, fronteiras de plataforma, gates antigos e o gate novo (9 áreas) |
| E2E PASS | Sim, no navegador: 6 testes novos + 110 testes existentes afetados |
| ANDROID QA BUILD PASS | NOT_RUN: sem Android SDK no container. O Java do plugin só compilou contra stubs (`javac`). |
| PLAY PHYSICAL PASS | NOT_RUN: nenhum teste em aparelho físico |
| OWNER ACTION REQUIRED | Sim (lista abaixo) |

**PUBLIC BETA: NO-GO.**
**CLOSED BETA: NO-GO** até os P1 mobile terem PHYSICAL PASS com evidência (`docs/release/rc2-2-21-mobile-bugs.json`: 8 P1 bloqueantes em aberto).

## CODE PASS

O que mudou no código (sem plugin novo, sem segundo motor de áudio):

### Voz própria (SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID)

As causas abaixo são **candidatas encontradas no código**. Nenhuma foi reproduzida num aparelho.

1. `handleOnPause` apagava a gravação em **qualquer** pausa. O diálogo de permissão e o painel de notificações também pausam a Activity, então a primeira gravação podia sumir antes de tocar.
   - Agora a pausa só interrompe a gravação e a reprodução.
   - `onStop` e `onDestroy` apagam o arquivo temporário.
2. "Gravar e comparar" nunca pedia o microfone. Agora mostra a explicação e chama `ensureMicPermission()` antes de gravar.
3. A reprodução usava `MediaPlayer` sem `AudioAttributes`, sem foco de áudio e sem prova de que tocou. Agora:
   - `USAGE_MEDIA` + `CONTENT_TYPE_SPEECH` são definidos **antes** de `setDataSource`/`prepare`;
   - o foco é **transitório** e sempre devolvido;
   - PLAYING só é marcado depois de `isPlaying()`;
   - "terminou sem tocar" vira `PLAYBACK_START_FAILED`.
4. Volume de mídia zerado aparecia como falha genérica. Agora vira `MEDIA_VOLUME_ZERO`, com a mensagem própria: "O volume de mídia está zerado…".
5. Diagnóstico da gravação e da reprodução:
   - amplitude (`getMaxAmplitude`);
   - duração lida do arquivo (`MediaMetadataRetriever`);
   - rota de saída (alto-falante, fone com fio, USB, Bluetooth);
   - volume;
   - códigos estáveis: `NO_RECORDING`, `INVALID_FILE`, `PLAYER_PREPARE_FAILED`, `AUDIO_FOCUS_FAILED`, `PLAYBACK_START_FAILED`, `OUTPUT_UNAVAILABLE`, `MEDIA_VOLUME_ZERO`, `PLAYBACK_INTERRUPTED`, `PLAYBACK_ERROR`.
6. Fluxo do botão: [Ouvir minha voz] → [Reproduzindo… ■ Parar] → [Ouvir novamente].

### Fala nativa (NATIVE_SPEECH_NOT_PROVEN)

- O reconhecedor on-device era escolhido sempre que existia, mesmo sem zh-CN instalado. Agora:
  - on-device só com o mandarim instalado nele (`recognizerStrategyFor`);
  - caso contrário, o serviço do aparelho.
- Sinal de voz (pico de RMS), tipo de reconhecedor e locale entram no diagnóstico e nos erros. Os eventos created, ready, begin, end e destroyed também.
- Categorias estáveis: `NO_SPEECH`, `AUDIO_CAPTURE`, `NETWORK`, `BUSY`, `PERMISSION`, `LANGUAGE_UNAVAILABLE`, `SERVICE_UNAVAILABLE`, `TIMEOUT`, `CLIENT`, `UNKNOWN`.
- Sem loop: depois de 2 falhas seguidas, a atividade troca para Gravar e comparar (ou modelo + Continuar). Toda lição continua tendo saída sem falar.

### TTS (ANDROID_TTS_NOT_PROVEN_ACROSS_SURFACES)

- Voz modelo com `AudioAttributes` de mídia/fala.
- Ao voltar do instalador de voz, o motor é **recriado** (`reinit`). Antes, ele continuava dizendo `LANG_MISSING_DATA`.
- Árbitro de áudio: um dono por vez (`IDLE`, `TTS`, `SELF_PLAYBACK`, `RECORDING`, `RECOGNITION`). Quem começa para o anterior.

### Navegação e layout

- VOLTAR do Android: teclado → modal/sheet → orientação → subtela (guarda da tela) → rota → minimizar só na raiz.
- **Bug confirmado no código:** com dois modais empilhados, um VOLTAR fechava os dois (cada `ModalOverlay` ouvia Escape no documento). Agora há uma pilha e só o modal do topo reage.
- **Bug confirmado no código:** o fundo do modal fechava no `mousedown`, e o click do mesmo toque atravessava para o que estava embaixo (tap-through). Agora fecha no click, e só se o toque começou no fundo.

### Diagnóstico (/qa/device → Diagnóstico mobile)

- **Build:** SHA, versionName, versionCode, package.
- **Aparelho:** Android, WebView, viewport, DPR, safe areas (pelos tokens `--app-safe-*`).
- **Estado:** teclado, rede, ciclo de vida, rota, última navegação.
- **Áudio e fala:** dono do áudio, TTS, microfone, serviço de fala, zh-CN, reconhecedor, gravação, reprodução, rota de saída, volume de mídia.
- **Eventos técnicos:**
  - no máximo 150, só em memória e só em builds de QA;
  - erros JS entram só pela classe do erro;
  - capturados no boot, em todas as rotas.
- **[Copiar diagnóstico]:** gera JSON sanitizado, sem e-mail, nome, senha, OTP, token, texto do aluno, gravação ou transcrição. `physicalPass` é sempre `false`.

### Gate `gate:rc2-2-21-mobile-native-stability`

- **Áreas:** native-voice-playback, native-speech, mobile-lifecycle, mobile-layout, mobile-navigation, auth-resilience, state-integrity, resource-cleanup, release-truth.
- **Mutações:** 83 no total (63 numeradas [1]–[63] mais 20 extras). Cada uma precisa ser pega com o código de falha certo.
- **Módulos puros** executados a partir do texto (esbuild): árbitro, buffer técnico, sanitizador, pilha de modais, prioridade do VOLTAR, estratégia do reconhecedor, categorias e limite de repetição.
- **Gates antigos:** ajustados só onde fixavam o comportamento antigo (apagar na pausa, texto exato do guard do VOLTAR e do `refreshNativeTtsStatus()`). Todos continuam matando as suas mutações.
- **Freeze:** exceção `RC2_2_21_MOBILE_NATIVE_STABILITY`. Fingerprint `c48b008c9c1e` inalterado; nenhuma lição, id, ordem, tópico ou StepKind mudou.

## E2E PASS

No navegador (Chromium, preview com fixtures). **Não é prova física.**

- `e2e/rc2-2-21-mobile-native-stability.spec.ts` (6 testes):
  - console de diagnóstico com os campos e JSON sanitizado;
  - erro JS capturado só pela classe;
  - sem rolagem horizontal em 360×640, 375×667 e 390×844 nas rotas principais;
  - VOLTAR no meio da troca de rota e toque duplo sem erro JS.
- Specs existentes afetados pelos modais, autoavaliação e fala: 110 testes passaram.

## ANDROID QA BUILD PASS

NOT_RUN.

- O container não tem Android SDK (`dl.google.com` bloqueado).
- O plugin Java foi verificado só com `javac` contra stubs das APIs Android/Capacitor.
- O workflow `android-build` roda em PR, push na `main` ou disparo manual. Nenhum desses aconteceu nesta onda.

## PLAY PHYSICAL PASS

NOT_RUN. `docs/release/rc2-2-21-device-qa.json` tem 23 testes físicos, todos `NOT_RUN`. Mocks, E2E e emulador não contam como prova física.

## OWNER ACTION REQUIRED

1. Gerar um build de QA (`VITE_DEVICE_QA=true`) desta branch e instalar no aparelho.
2. Rodar os testes críticos de `rc2-2-21-device-qa.json`, começando por:
   - `selfRecordingCaptured`;
   - `selfPlaybackAudible` (**ouvir a própria voz**);
   - `selfPlaybackStopAndReplay`;
   - `selfPlaybackVolumeZeroMessage`;
   - `selfPlaybackAfterPermissionDialog`;
   - `nativeSpeechZhCnRecognized`.
3. Em cada falha, abrir `/qa/device` → **Copiar diagnóstico** e anexar o JSON (sem PII) ao bug.
4. Registrar PASS/FAIL em `/qa/device` com testedAt, buildSha, versionCode, classe do aparelho e tipo de evidência.
5. Não subir gravação com voz pessoal para o repositório sem decisão explícita.
6. Decidir o merge da RC2.2.20 e, depois dele, redirecionar o PR desta onda para `main`.

## Não alterado

- package `longyu.noba.com`
- compras Android `DISABLED_FOR_BETA`
- Production Play (automático só `internal`)
- #273
- nenhum PR aberto automaticamente
