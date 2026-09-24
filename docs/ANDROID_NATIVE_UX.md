# Android — experiência nativa (RC2.2.13)

Contrato do app Android sobre o mesmo frontend. Nada aqui cria conteúdo,
tópico, lição, SRS, mastery ou regra de ofensiva: é shell, voz, permissões e
lembretes sobre os sistemas que já existem
(`RC2_2_13_ANDROID_NATIVE_UX_EXCEPTION` em `src/lib/curriculumFreeze.ts`).

Gate: `npm run gate:rc2-2-13-native-mobile-experience`.

## 1. Safe area

- Tokens únicos em `src/index.css`: `--app-safe-top|bottom|left|right` =
  `max(var(--safe-area-inset-*), env(safe-area-inset-*))`. O Capacitor injeta
  `--safe-area-inset-*` no Android edge-to-edge (onde `env()` pode vir 0); na
  Web/iOS vale `env()`.
- Nenhum componente lê `env(safe-area-inset-*)` direto.
- TopBar (topo), TabBar e sheets (base), intro de permissões, modais de
  celebração, player e header de foco usam os tokens.
- Harness: E2E força `--safe-area-inset-top` 0/24/32/48 e `--safe-area-inset-bottom`
  0/24/34/48 e mede sobreposição.

## 2. Navegação e densidade mobile

- TabBar: exatamente **Jornada · Praticar · Cultura · Missões · Mais** (nunca 6+).
- Perfil: pelo avatar da TopBar (sem aba). Cultura é aba (não se repete no sheet Mais).
- TopBar < 390px: logo + Fôlego + Ofensiva + Avatar; ≥ 390px: + Qi.
- Sheet Praticar em 2 colunas: Revisão, Hànzì, Pinyin, Fala, Leitura, Imersão, Biblioteca.
- Alvos de toque ≥ 48dp (pílulas da TopBar, avatar, itens do sheet, interruptores).

## 3. Voz

- **TTS**: `speak()` de `src/lib/tts.ts` → `LongyuSpeech.speak` (TextToSpeech,
  zh-CN, `QUEUE_FLUSH`). Voz chinesa ausente = erro honesto
  (`TTS_LANGUAGE_MISSING_DATA` / `TTS_LANGUAGE_NOT_SUPPORTED`) e aviso para
  instalar a voz. O botão de áudio não é desativado por falta de
  `speechSynthesis` no WebView.
- **Reconhecimento**: `recognizeOnce()` de `src/lib/speech.ts` →
  `LongyuSpeech.startRecognition` (SpeechRecognizer; on-device quando API ≥ 31
  e disponível). Uma escuta por vez (`RECOGNIZER_BUSY`), timeout, sem escuta
  contínua, reconhecedor destruído ao fim, cancelado no background e ao sair
  da tela. A voz do app para antes de ouvir.
- Estados: "Ouvindo…", "Permitir microfone", "Abrir configurações do Android".
- Verdade do produto: o reconhecedor devolve texto; o Longyu não afirma
  precisão de tom.
- Privacidade: "Longyu não armazena a gravação. O reconhecimento pode ser
  processado pelo serviço de fala configurado no dispositivo."

## 4. Permissões

- Declaradas: INTERNET, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, POST_NOTIFICATIONS.
- `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` que vêm do plugin são removidas
  (`tools:node="remove"`). Sem localização, câmera ou contatos. Sem Firebase.
- Primeiro launch: "Prepare o Longyu" (uma vez, `nativePermissionIntroVersion = 1`).
  Continuar pede **notificações** e depois **microfone**; "Agora não" e
  qualquer recusa seguem para o app.
- Configurações → Permissões do app / Notificações / Áudio e fala: sempre o
  estado REAL do Android, relido ao voltar ao app. Negado → atalho para os
  ajustes do sistema.

## 5. Lembretes locais

- Plano puro em `src/lib/studyReminderPlan.ts` a partir de `streak` e
  `lastStudyDate` (mesma regra de `src/lib/streak.ts`: estudou em D, quebra na
  virada para D+2).
- Risco: D+1 às 21:00 (~3 h antes de perder), cópia pelo tamanho da ofensiva
  (1, 2, 3, 4, 5–6, marcos 7/14/30/50/100, risco genérico com N).
- Retorno: D+2, D+3, D+4 às 21:00 com cópias diferentes; depois, silêncio.
- No máximo 1 por 24 h; silêncio 22:00–08:00; IDs fixos (reagendar substitui).
- Reconciliação ao abrir/voltar ao app e a cada mudança de ofensiva,
  atividade ou preferência; sem permissão ou com o toggle desligado, tudo é
  cancelado.
- Toque → `resolveDeepLink` (allowlist do RC2.2.10) → `/jornada` ou `/revisao`.
- Canais `streak` (Ofensiva) e `study`; ícone monocromático `ic_stat_longyu`.
- DEV/QA: "Testar lembrete em 60 s" em Configurações (fora de production_beta).

### Limitação: lembretes são só locais

Sem push de servidor (sem Firebase, por decisão). Os lembretes existem só
neste aparelho: são inexatos (sem alarme exato; Doze e economia de bateria
podem atrasar), somem se os dados do app forem limpos, e estudar em outro
aparelho só reagenda este quando o app abrir de novo. Reiniciar o aparelho:
o plugin reagenda os pendentes.

## 6. QA físico

Campos em `docs/release/android-physical-qa.json`: `safeAreaTop`,
`safeAreaBottom`, `mobileNav`, `culturePrimaryNav`, `nativeTts`,
`nativeSpeech`, `notificationPermission`, `microphonePermission`,
`streakNotification`, `notificationDeepLink`, `permissionFirstRun`. Só um
humano com aparelho real escreve PASS (com SHA, modelo e `isEmulator: false`).
