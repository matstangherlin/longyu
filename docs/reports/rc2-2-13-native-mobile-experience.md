# RC2.2.13: Android Native UX, Voice, Permissions & Notifications

| Campo | Valor |
|---|---|
| Branch | `claude/rc2-2-13-native-mobile-experience` |
| Base | empilhada sobre `claude/rc2-2-12-android-physical-release` (#286 aberta). Nada do RC2.2.11/RC2.2.12 foi duplicado ou recriado |
| PR | **não aberto**. O owner abre; nada foi mergeado |
| #273 | **intocada** (gate `CLOUD_273_TOUCHED`: hash do candidate congelado, `cloud_*` = false) |
| Username cloud login | **desligado** (`VITE_USERNAME_LOGIN_ENABLED` segue false; gate `USERNAME_FLAG_WITHOUT_CLOUD`) |
| Exceção ao freeze | `RC2_2_13_ANDROID_NATIVE_UX_EXCEPTION` (`src/lib/curriculumFreeze.ts`) |
| Status Android | **`ANDROID_CODE_READY`**. `ANDROID_RUNTIME_READY` exige os PASS físicos da seção 22–24 |
| Public Beta | **NO-GO** |

Não há feature pedagógica. Nenhuma lição, tópico, CultureItem, StepKind, SRS,
mastery, moeda ou regra de ofensiva mudou. Esta onda é shell mobile, voz,
permissões e lembretes sobre sistemas que já existem. Contrato completo:
[`docs/ANDROID_NATIVE_UX.md`](../ANDROID_NATIVE_UX.md).

## 1–4. Base e aparelho

| Item | Valor |
|---|---|
| 1. Base SHA | `c6cc995d` (head da #286 no início). A branch também absorveu `636ed851`, só o report do RC2.2.12 com o `validate:beta` PASS da CI |
| 2. #286 merge SHA | **ainda não mergeada.** Quando #285/#286 entrarem em `main`, mergear `main` nesta branch antes do PR |
| 3. Aparelho testado | **nenhum.** O container não tem adb nem aparelho (`android:devices` → `NO_ADB`) |
| 4. Versão do Android | — |

## 5–9. Mobile UI

**5. Safe area.** Tokens únicos em `src/index.css`:

```css
--app-safe-top: max(var(--safe-area-inset-top, 0px), env(safe-area-inset-top, 0px));
--app-safe-bottom: max(var(--safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px));
```

(e também `left`/`right`.) `--safe-area-inset-*` é o que o Capacitor injeta no
Android edge-to-edge, onde o WebView pode devolver `env()` = 0. Nenhum
componente lê `env(safe-area-inset-*)` direto: todos os usos foram migrados para os
tokens (TopBar, TabBar, sheets, modais de celebração, player, header de foco,
landing, onboarding, conta). O toast da Loja agora fica abaixo de
`--app-header-height`. O E2E força as insets top/bottom 0/0, 24/24, 32/34 e
48/48 e mede TopBar, TabBar e sheet.

**6. Header, antes → depois.**

| | Antes (c6cc995d) | Depois |
|---|---|---|
| < 390px | logo + Fôlego + **Qi** + Ofensiva + Avatar (pílulas de 44px) | logo + Fôlego + Ofensiva + Avatar (Qi escondido) |
| ≥ 390px | igual | + Qi (contadores compactos) |
| Alvos | 44px | **48px** (pílulas, avatar, logo) |
| Perfil | avatar sem estado | avatar com `aria-current` em /perfil, /conta e /amigos |

**7. Navegação mobile, antes → depois.**

| | Antes | Depois |
|---|---|---|
| TabBar | Jornada · Praticar · Missões · **Perfil** · Mais | Jornada · Praticar · **Cultura** · Missões · Mais |
| Perfil | aba com sheet | avatar da TopBar (sem aba e sem sheet) |
| Cultura | escondida no sheet Mais; Mais acendia em /cultura | aba própria, ativa em /cultura. Fora do sheet Mais |
| Sheet Praticar | ordem Hànzì…Biblioteca, Imersão; itens de 56px | Revisão, Hànzì, Pinyin, Fala, Leitura, Imersão, Biblioteca. 2 colunas, itens de 48px |
| Itens | 5 | 5 (gate `TABBAR_TOO_MANY`) |

**8. Visibilidade da Cultura.** É aba primária. No hub, o passaporte
compactado junta o título, a contagem e os selos em duas linhas. Em 390×844, o
primeiro card de Destaques aparece na primeira dobra (E2E), inclusive com o
dragão de boas-vindas.

**9. Auditoria de densidade.**
- `HubPage compact` usa `space-y-3.5` no celular e `space-y-5` no desktop, em Cultura e Imersão.
- Imersão: "Sessões de hoje" cabe numa linha no celular (antes empilhava).
- Perfil: cabeçalho horizontal (avatar 64px ao lado do nome), cerca de 95px a menos no celular.
- `StatTile`: o rótulo quebra em vez de cortar ("DIAS DE SEQUÊ…" em 360px).
- Interruptores de Configurações com 48px.
- Não há scroll horizontal em 360, 390 nem 412px (E2E).

Screenshots mobile (inset top 32 / bottom 24): `docs/screenshots/rc2-2-13/`.

## 10–15. Voz e permissões

| Item | Valor |
|---|---|
| 10. TTS | Plugin interno `LongyuSpeech` (`android/app/src/main/java/com/longyu/app/LongyuSpeechPlugin.java`, registrado em `MainActivity`). Usa `android.speech.tts.TextToSpeech`, zh-CN, `QUEUE_FLUSH`, com `UtteranceProgressListener`. `speak()` de `src/lib/tts.ts` roteia para o adapter `src/lib/platform/nativeSpeech.ts`. Nenhuma tela ganhou motor próprio (gate `PARALLEL_TTS_ENGINE`). `stopSpeaking()`, autoplay (respeita `autoPlayAudio`), velocidade e modo lento são os mesmos. Background → `tts.stop()` |
| 11. Disponibilidade do TTS | `getTtsStatus` consulta `isLanguageAvailable`. Voz ausente → `TTS_LANGUAGE_MISSING_DATA` / `TTS_LANGUAGE_NOT_SUPPORTED`; o SpeakButton mostra "Voz mandarim indisponível… instale a voz chinesa". O botão **não** é desativado por falta de `speechSynthesis` no WebView. Configurações → Áudio e fala mostra o estado e "Abrir ajustes de voz" |
| 12. Reconhecimento | `SpeechRecognizer` (`createOnDeviceSpeechRecognizer` quando API ≥ 31 e disponível). `recognizeOnce()` de `src/lib/speech.ts` roteia para o nativo; a mesma `PronunciationPractice` recebe o texto. Uma escuta por toque (sem ditado nem parciais), timeout de 3–20s (padrão 10s), `destroy()` ao fim, cancelamento no background e ao sair da tela, single-flight em Java e em JS (`RECOGNIZER_BUSY`). A voz para antes de ouvir. Erros mapeados e localizados (NO_MATCH, SPEECH_TIMEOUT, AUDIO, NETWORK, BUSY, INSUFFICIENT_PERMISSIONS, LANGUAGE_*) |
| 13. Serviço de reconhecimento | `<queries>` com `android.speech.RecognitionService` e `TTS_SERVICE` (visibilidade do Android 11+). `getRecognitionStatus` informa `available` e `onDevice`. Sem serviço → "Nenhum serviço de reconhecimento no aparelho" (honesto, não esconde a Fala) |
| 14. Microfone | `RECORD_AUDIO`. Pedido só no toque em Falar ou no intro (`@PermissionCallback`). Negado de vez → "Abrir configurações do Android". Estados: "Ouvindo…", "Permitir microfone", "Abrir configurações do Android". Verdade do produto: o reconhecedor devolve texto e o app não afirma precisão de tom (gate `TONE_ACCURACY_CLAIM`) |
| 15. Notificações | `POST_NOTIFICATIONS` (Android 13+; em versões anteriores é concedida sem diálogo). Intro "Prepare o Longyu" no primeiro launch, uma vez (`nativePermissionIntroVersion = 1`): Continuar pede notificações e depois microfone; "Agora não" e qualquer recusa seguem para o app. Configurações → Permissões do app / Notificações / Áudio e fala sempre leem o SO e releem ao voltar ao app |

Sem localização, câmera ou contatos. `SCHEDULE_EXACT_ALARM` e `USE_EXACT_ALARM`,
que vêm do plugin, são removidas com `tools:node="remove"`. Sem Firebase.

**Compilação Java.** O container não tem Android SDK (dl.google.com
bloqueado). `LongyuSpeechPlugin` e `MainActivity` compilam com `javac`
(OpenJDK 21) contra o `android-all` do Robolectric (API 36) + Capacitor real:
exit 0, com 1 aviso de API depreciada (`onError(String)`, override
obrigatório). O APK/AAB debug de verdade sai no workflow `android-build.yml`
quando o PR for aberto.

## 16–21. Lembretes locais

| Item | Valor |
|---|---|
| 16. Plugin | `@capacitor/local-notifications` **8.3.1** (consumidor: `src/lib/platform/nativeNotifications.ts`) |
| 17. Canais | `streak` "Ofensiva" e `study` "Lembretes de estudo" (importância 3). Ícone monocromático `res/drawable/ic_stat_longyu.xml` |
| 18. Política de pendentes | Plano puro em `src/lib/studyReminderPlan.ts` (a partir de `streak` + `lastStudyDate`; mesma regra de `streak.ts`: estudou em D, quebra na virada para D+2). IDs fixos (risco 7001; retorno 7102/7103/7104): cada aplicação cancela e reagenda o conjunto, e nunca empilha. Reconcilia ao abrir e ao voltar ao app, a cada estudo e a cada mudança de preferência. Sem permissão ou com o toggle desligado, cancela tudo. Agendamento inexato (`isExactNotification: false`, `allowWhileIdle: false`). Toque → `resolveDeepLink` (allowlist do RC2.2.10) → `/jornada` ou `/revisao`. Um único listener. DEV/QA: "Testar lembrete em 60 s" (fora de production_beta) |
| 19. Cópias da ofensiva | 1 "Sua chama começou" · 2 "2 dias seguidos" · 3 "3 dias de ofensiva" · 4 "4 dias seguidos" · 5–6 "N dias seguidos". Marcos: 7 "Uma semana de ofensiva", 14 "Duas semanas seguidas", 30 "Um mês de ofensiva", 50 e 100. Genérico: "🔥 Sua ofensiva de N dias está em risco". Também em EN |
| 20. Cópias de retorno | D+2 "Dois dias longe do mandarim" · D+3 "Faz 3 dias" · D+4 "O Longyu está te esperando". Depois do dia 4, silêncio |
| 21. Silêncio | 22:00–08:00 no fuso do aparelho. No máximo 1 lembrete a cada 24h. Aviso de risco só antes da quebra (D+1 às 21:00, cerca de 3h antes). Se o app abrir depois das 21:00 de D+1 e fora do silêncio, o aviso sai em +10 min |

Limitação documentada: os lembretes são **só locais**. São inexatos (Doze e
economia de bateria podem atrasar), somem se os dados forem limpos e só são
reagendados quando o app abre. Não há push de servidor, por decisão.

## 22–25. Resultado físico e P1

| Item | Valor |
|---|---|
| 22. TTS físico | **NOT_RUN** (`nativeTts`), sem aparelho |
| 23. Fala física | **NOT_RUN** (`nativeSpeech`), sem aparelho |
| 24. Notificação física | **NOT_RUN** (`notificationPermission`, `streakNotification`, `notificationDeepLink`, `permissionFirstRun`), sem aparelho |
| 25. P1 da #286 (`ANDROID_SPEECH_RECOGNITION_UNVERIFIED`) | **Resolvido no código, aberto no aparelho.** A causa (Fala dependia da Web Speech API, ausente no WebView) foi removida: o Android usa o SpeechRecognizer nativo. O risco segue no manifesto até `nativeSpeech` = PASS num aparelho real |

`docs/release/android-physical-qa.json` ganhou 11 campos: `safeAreaTop`,
`safeAreaBottom`, `mobileNav`, `culturePrimaryNav`, `nativeTts`,
`nativeSpeech`, `notificationPermission`, `microphonePermission`,
`streakNotification`, `notificationDeepLink` e `permissionFirstRun`. Todos
estão `NOT_RUN`. Só um humano com aparelho real escreve PASS (gate
`PHYSICAL_PASS_WITHOUT_EVIDENCE`). Roteiro: `docs/ANDROID_PHYSICAL_QA.md` +
`docs/ANDROID_NATIVE_UX.md` §6.

## 26. E2E

`e2e/rc2-2-13-native-mobile-experience.spec.ts`: **17 testes** (51/51 em
`--repeat-each=3`). Cobrem:
- TabBar em 360, 390 e 412px (rótulos, alvos ≥ 48px, sem scroll horizontal);
- Cultura primária e fora de Mais; Perfil pelo avatar;
- sheet Praticar em 2 colunas, na ordem certa;
- TopBar compacta abaixo e acima de 390px;
- harness de safe-area (0/0, 24/24, 32/34, 48/48);
- densidade de Cultura, Perfil e Imersão;
- Web sem intro e sem seções nativas;
- política de privacidade.

`e2e/progressive-nav.spec.ts` foi atualizado para o novo contrato da barra.

Suíte Chromium completa (local, 6 workers): **686 passed, 9 failed, 6 skipped**.
Rodei de novo as 9 falhas com 2 workers:
- **6 passam.** Eram timeouts de carga local.
- **1 é real e anterior a esta onda.** `cloud-first-onboarding` TEST-033:
  `getByPlaceholder("Ex.: Matheus")` também casava com o campo de username do
  RC2.2.11 ("ex.: matheus_li"). Foi corrigida na #285 (`400a763e`) e subiu
  para a #286 e para esta branch. Era a única falha real da CI da #285
  (Chromium e Firefox).
- **2 são só locais.** Em `journey-redesign` (largura do CTA 64.125px vs < 64,
  322px vs < 300), falham igual na base da #286 (`636ed851`) sem nenhuma
  mudança desta onda, e passam na CI: diferença de fonte do container, que não
  alcança o Google Fonts.

## 27. Mutações

`gate:rc2-2-13-native-mobile-experience`: 7 pares `validate:*` / `test:*`,
**107 mutações**, todas mortas com o código certo:

| Área | Mutações |
|---|---|
| `android-safe-area` | 10 |
| `mobile-navigation-density` | 11 |
| `mobile-visual-density` | 9 |
| `native-tts` | 11 |
| `native-speech-recognition` | 18 |
| `native-permissions` | 26 |
| `streak-notifications` | 22 |

O gate de lembretes **executa** o plano transpilado a partir do texto mutado.
Ele varre "agora" hora a hora de D a D+6 e verifica: silêncio, 1 por 24h,
aviso antes da quebra, fim no dia 4, reagendamento depois de estudar, cópias
e allowlist de deep link. O gate entrou no `validate:beta`, no
`android-build.yml` e no `android-release.yml`.

**Regressão global.**

| Comando | Resultado |
|---|---|
| `typecheck` | PASS |
| `build` | PASS |
| `validate:beta` | VALIDATE_BETA_RESULT |
| `validate:frontend-secrets` | FRONTEND_SECRETS_RESULT |
| gate RC2.2.8 / 2.2.9 / 2.2.10 (android-native-foundation) / 2.2.10B (main-delivery-pipeline) / 2.2.11 / 2.2.12 | GATES_RESULT |
| gate RC2.2.13 | PASS (107 mutações) |

## Supabase (autorizado pelo owner nesta onda)

O owner autorizou mexer no Supabase ("aplicar a migration só em produção").
Pendente no Supabase das ondas anteriores estava só o login por username do
RC2.2.11.

| Item | Resultado |
|---|---|
| Migration | `supabase/pending/rc2-2-11-username-identifier.sql` aplicada em **produção** (MandarimProject) como migration remota `rc2_2_11_username_identifier_login`, mesmo corpo |
| Estado anterior | produção tinha a coluna `profiles.username`, mas sem constraint, sem índice único, sem nenhum username preenchido e sem as funções: a mudança é só aditiva |
| Verificação | `resolve_login_identity` e `check_and_record_login_rate` executáveis só por `service_role`; `claim_own_username` só por `authenticated`; RLS ligada em `reserved_usernames` e `login_rate_events`; 80 reservados; índice único + constraint v2. Chamadas SQL: nome inexistente → null; rate limit → `allowed`; entrada inválida → `invalid_input`. Linhas de teste apagadas |
| Advisors | nada novo exposto a `anon`. As 2 tabelas sem policy são intencionais (só servidor, como `signup_rate_events`) |
| Edge | `sign-in-identifier` publicada em produção (v1, `verify_jwt = true`: o app chama com a anon key JWT). O código publicado é igual ao do repositório |
| Teste HTTP ao vivo | **não feito daqui**: a rede do container bloqueia `*.supabase.co`. Fica para o owner, junto com a verificação ao vivo do README |
| App | `VITE_USERNAME_LOGIN_ENABLED` segue **false**. Status do código: `USERNAME_LOGIN_CLOUD_STATUS = "CLOUD_APPLIED_FLAG_OFF"` |
| Não feito, de propósito | QA/#273 (projeto inativo; nada reativado, nada pago). Promover o SQL para `supabase/migrations/`: mudaria as 52 migrations do candidate congelado da #273 e os hashes de identidade v478/v489; fica para quando a #273 reabrir |
| Compatibilidade | o app que está em `main` hoje aceita username de até 24 caracteres. A constraint nova aceita 3–20. Como ninguém tem username, nada quebra agora; um nome de 21–24 salvo pelo app antigo seria recusado pelo banco |

## 28–29. Fingerprint e contagens

| | Esperado | Atual |
|---|---|---|
| Fingerprint | `c48b008c9c1e` | `c48b008c9c1e` |
| Lições | 134 | 134 |
| Tópicos de ensino | 113 | 113 |
| CultureItems | 30 | 30 |
| Lições nativas de Cultura | 30 | 30 |
| Nós de Cultura na Jornada | 20 | 20 |
| Culture Moments | 5 | 5 |
| Tone Transfers | 12 | 12 |
| Cenas | 52 | 52 |
| Capacidades | 31 READY / 0 PARTIAL | 31 READY / 0 PARTIAL |

## 30. Veredito

- **Android: `ANDROID_CODE_READY`.** O código de runtime nativo (safe area,
  navegação, TTS, fala, permissões e lembretes) está pronto e protegido por
  gates. `ANDROID_RUNTIME_READY` exige, **em aparelho real**: native TTS PASS,
  native speech PASS, permissions PASS, notifications PASS, mobile UI PASS e
  safe area PASS. Nenhum foi executado.
- **`ANDROID_BETA_READY`**: depende também dos bloqueios do RC2.2.12
  (`BLOCKED_SIGNING_SECRETS`, `CODE_READY_AWAITING_PHYSICAL_DEVICE`,
  `BLOCKED_PLAY_CONSOLE_SETUP`, `BLOCKED_PLAY_CREDENTIALS`).
- **Public Beta: NO-GO**, por #273 (cloud QA), cloud auth/sync e Human QA global.

**Bloqueios honestos:** nenhum aparelho físico (`CODE_READY_AWAITING_PHYSICAL_DEVICE`),
sem Android SDK no container (APK real só na CI do PR) e #285/#286 ainda não
mergeadas.

**Próxima onda:** RC2.2.14, Human QA & Beta Release Drill: L1–L20 em aparelho
real, upgrade, Play Internal e burn-down de P0/P1.
