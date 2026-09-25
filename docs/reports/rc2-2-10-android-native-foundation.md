# RC2.2.10 — Android Native Foundation & Signing Readiness

> **SUPERSEDED (RC2.2.16):** este relatório é histórico. O package Android
> `com.longyu.app` citado abaixo foi substituído por `longyu.noba.com`, o package
> do app no Google Play Console (`docs/release/android-package-identity.json`).

> Public Beta continua **NO-GO**. Esta remessa cria a fundação Android
> (Capacitor) do MESMO Longyu. Não certifica aparelho físico, release assinado,
> Play Console nem nada de cloud (#273 intocada).

O Longyu deixou de ser só um site/PWA. O mesmo frontend React/Vite agora tem
uma plataforma Android Capacitor com projeto nativo versionado, identidade de
app e target API 36. Também tem a base de lifecycle e navegação (BACK, deep
links, links externos) e um contrato seguro de assinatura: keystore, key alias
e as duas senhas, pronto para receber os segredos do owner. **O Android ainda
não está pronto para produção.**

## 1–4. Base, herança e branch

| Item | Valor |
| --- | --- |
| Base SHA usada | `e65b527e2078acd7879768ccac5fd4e0020d662d` (head do #282, que contém integralmente o RC2.2.9) |
| `origin/main` no preflight | `700aa83264cee8429313ad0e52881e90b09fa2e8` (#281 mergeado; #282 ainda **não** mergeado) |
| #281 herdado | sim — `700aa83` é ancestral da base; `gate:rc2-2-8-learning-gamification` roda dentro do `validate:beta` |
| #282 herdado | sim — trabalho sobre o head `e65b527e`; RC2.2.9 não foi recriado nem mergeado manualmente |
| Branch | `claude/rc2-2-10-android-native-foundation` (criada a partir de `e65b527e`) |
| PR | **não aberto** (o owner abre depois); nada foi mergeado |

Preflight: `git status` limpo; nenhuma implementação Capacitor/Android anterior
no repositório; nenhum `applicationId`/package Android canônico anterior
declarado em lugar nenhum (busca em `src/`, `scripts/`, `docs/`, `index.html`,
`package.json`), então `com.longyu.app` não conflita com nada.

Durante esta remessa o check-in agendado que faria o merge do #282 foi
cancelado, e a sessão deixou de acompanhar o PR, conforme a instrução "NÃO
fazer merge do #282".

## 5–12. Runtime e projeto nativo

| Item | Valor |
| --- | --- |
| Capacitor | `@capacitor/core` / `@capacitor/android` / `@capacitor/cli` **8.5.2** (versões exatas) |
| Android package ID | `com.longyu.app` (`capacitor.config.ts`, `applicationId`, `namespace`, `custom_url_scheme`) |
| appName | `Longyu` |
| targetSdk | **36** (Android 16) |
| compileSdk | **36** |
| minSdk | **24** (mínimo do Capacitor 8; não alterado) |
| Android Gradle Plugin | 8.13.0 |
| Gradle (wrapper) | 8.14.3 (`gradlew` + `gradlew.bat` versionados) |
| Java | 21 (exigido pelo `capacitor.build.gradle`) |
| webDir | `dist` (o APK empacota o build; **sem** `server.url`) |
| Plugins | `@capacitor/app` 8.1.1, `@capacitor/browser` 8.0.4, `@capacitor/keyboard` 8.0.5, `@capacitor/network` 8.0.1, `@capacitor/splash-screen` 8.0.2 |
| Plugin avaliado e **não** instalado | `@capacitor/status-bar`: o Capacitor 8 já traz `SystemBars` no core (insets edge-to-edge + estilo das barras); o plugin ficaria sem consumidor |

Cada plugin tem consumidor real em `src/lib/platform/`
(`validate:android-platform-boundaries` recusa plugin sem consumidor).

`npm audit --audit-level=moderate` (o job do CI) acusava 3 moderadas vindas de
`@capacitor/cli` → `xcode` → `uuid@7` (ferramenta de iOS, só dev). Correção
sem downgrade: `overrides: { xcode: { uuid: "11.1.1" } }` — o `uuid@11` mantém
o `require("uuid").v4()` CommonJS que o `xcode` usa (conferido). Resultado:
0 vulnerabilidades.

### Versionamento (Parte D)

- `versionName` = `package.json` `version` (`0.2.0-beta.1`), lido pelo Gradle
  em tempo de configuração (`android/app/build.gradle`). Sem literal.
- `versionCode` = `android/version.properties` (`1`). Fonte única.
- `docs/release/android-native-foundation.json` espelha os dois;
  `validate:android-native-foundation` falha em qualquer divergência entre
  package.json ↔ Android ↔ manifesto de release.

### Scripts (Parte E) — wrapper Node cross-platform

`scripts/android-cli.mjs` escolhe `gradlew.bat` no Windows e `./gradlew` no
Unix (com `shell` no Windows para `.bat`, exigência do Node ≥ 18.20).

| Script | Faz |
| --- | --- |
| `android:sync` | `npm run build` + `cap sync android` |
| `android:open` | sync + abre no Android Studio |
| `android:run` | exige SDK → sync + `cap run android` |
| `android:debug` | exige SDK → sync + `assembleDebug` (APK debug) |
| `android:bundle:debug` | exige SDK → sync + `bundleDebug` (AAB debug) |
| `android:bundle:release` | exige os 4 valores de assinatura → exige SDK → sync + `bundleRelease` |
| `android:brand-assets` | regenera ícones/splash a partir de `public/logo.png` |

Saídas honestas: `BLOCKED_LOCAL_ANDROID_SDK` (exit 3) e
`BLOCKED_SIGNING_SECRETS` (exit 4), sempre só com NOMES.

## 13. Platform abstraction (Parte I)

`src/lib/platform/` é o único lugar que conhece o Capacitor
(`validate:android-platform-boundaries`: 0 usos fora dela).

| Módulo | Papel |
| --- | --- |
| `nativePlatform.ts` | `isNativeApp()`, `isAndroid()`, `isWeb()`, `getPlatform()` via `Capacitor.isNativePlatform()` |
| `serviceWorkerPolicy.ts` | SW só no web |
| `backNavigation.ts` | decisão pura do BACK |
| `deepLinks.ts` | URL nativa → rota interna (allowlist) |
| `externalLinks.ts` | interno / externo / sistema / bloqueado |
| `appLifecycle.ts` | foreground/background (visibilitychange + `App.appStateChange`) |
| `networkStatus.ts` | online/offline (+ plugin Network no Android) |
| `buildIdentity.ts` | versão · plataforma · build (SHA) · ambiente |
| `nativeShell.ts` | liga tudo ao router; **no-op no web** |

Web continua de primeira classe: `initNativeShell` retorna na hora fora do
app; plugins são `import()` dinâmicos só no nativo; `useOnline`, o Quiet Sync
e o banner do PWA seguem o mesmo caminho web de antes.

## 14. Service Worker (Parte K)

- Web/PWA: registra como antes (`PwaUpdateBanner`, `autoUpdate`).
- Nativo: `shouldRegisterServiceWorker("android") === false`, então o
  `virtual:pwa-register` nem é importado, e `unregisterNativeServiceWorkers()`
  remove qualquer registro/cache Workbox que tenha sobrado. Os assets vêm do
  APK; update chega pela loja. Não há cache duplo nem app preso em bundle
  anterior.
- `vite.config.ts` não injeta registro no HTML (conferido: 0 `registerSW` em
  `dist/index.html`). Testado por mutação (policy forçada, gate removido do
  banner, `injectRegister: "script"`).

## 15. BACK (Parte M)

Ordem, testada por tabela em `validate:android-platform-boundaries`:

1. modal/overlay/sheet/popover aberto (`aria-modal`, `role="dialog"`, trava de
   scroll de modal) → fecha via Escape, o mesmo caminho do teclado;
2. há histórico no app (`history.state.idx > 0`) → volta uma rota;
3. rota interna sem histórico (ex.: aberta por deep link) → `/jornada`;
4. **só** em `/` ou `/jornada` → `App.minimizeApp()` (não mata o processo).

`exitApp()` não existe na camada de plataforma (mutação "BACK chama
exitApp()" morta). Diálogo sem handler de Escape: BACK não faz nada. Nunca
navega por baixo de um diálogo aberto.

## 16. Lifecycle (Parte L)

`subscribeAppLifecycle` junta `visibilitychange` e `App.appStateChange`
(deduplicados). Consumidor: o Quiet Sync (`CloudSyncBootstrap`) empurra o
progresso quando o app vai para background, antes de o Android poder
encerrar o processo. **Nada é resetado** em background/resume: lição, Review,
Culture, Phase Challenge e estado não concluído continuam no store
persistente de sempre. O validator recusa `reset*/clear*` na camada de
lifecycle/shell.

## 17. Deep links (Parte N)

- Intent-filter `com.longyu.app://…` (`@string/custom_url_scheme`) no
  `AndroidManifest.xml`.
- `resolveDeepLink` é o ponto canônico: aceita só o esquema do app ou https em
  host Longyu aprovado, só rotas da allowlist (`/jornada`, `/revisao`,
  `/cultura`, `/hanzi/atlas`, `/licao`, …; sem admin/qa/dev/auth), segmentos
  seguros e query com chave/valor limitados. Todo o resto vira `null`, e o
  app fica onde está.
- `appUrlOpen` (app aberto) e `App.getLaunchUrl()` (cold start) passam pelo
  mesmo resolver.
- App Links https com `autoVerify` + `assetlinks.json` e o callback de e-mail
  do Supabase ficam para depois (domínio definitivo / #273).

## Links externos (Parte O)

Clique em `<a>` no app nativo: rota Longyu → router; https externo →
`Browser.open` (navegador do sistema, fora da WebView principal);
`mailto:`/`tel:` → app do sistema; `javascript:`, `data:`, `file:`, `http:` →
bloqueado. `<Link>` do react-router continua cuidando dos próprios cliques.

## Status bar / safe area / splash / ícones / teclado (Partes P–S)

- **Safe area:** `SystemBars.insetsHandling: "css"` +
  `initialViewportFitValueHint: "cover"`. O `index.html` já declara
  `viewport-fit=cover`, e os tokens `--app-safe-top/bottom` de `index.css` já
  usam `env(safe-area-inset-*)`. **Nenhum CSS Android duplicado.** O estilo
  das barras acompanha `data-theme` (dark → ícones claros).
- **Splash:** nativa, curta (`launchAutoHide`, 800 ms no máximo; escondida no
  primeiro frame pintado). Imagem derivada de `public/logo.png` sobre a cor do
  próprio fundo do logo (`#FEFDFE`, amostrada).
- **Ícones:** launcher, round e adaptive (foreground no safe zone + background
  `#FEFDFE`) derivados de `public/logo.png` por
  `scripts/android-brand-assets.mjs` (reprodutível). O ícone e a splash do
  template Capacitor foram removidos. **Não gerados:** ícone monocromático
  (themed icon do Android 13) e assets da loja: `ANDROID_BRAND_ASSET_REQUIRED`
  (não existe glifo monocromático canônico; derivar um por threshold seria
  inventar arte). Assets de loja **não** são PASS.
- **Teclado:** `Keyboard.resizeOnFullScreen: true` (edge-to-edge), então a
  WebView redimensiona e os hooks de `visualViewport` que o Lesson Player já
  usa fazem o resto; no `keyboardDidShow` o campo focado é rolado para o
  centro e `data-native-keyboard="open"` fica disponível ao CSS. Sem redesign.

## 18. Áudio (Parte T)

Nenhuma engine nova. Lesson audio, blips do Guide Dialogue, áudio de Culture e
TTS (`speechSynthesis`) são as mesmas superfícies web dentro da WebView.
**Não há HUMAN PASS de áudio Android** — exige aparelho (RC2.2.11).

## 19. Microfone (Parte U)

- Permissões declaradas: `INTERNET`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`.
  Nada além disso: sem localização, câmera, contatos ou storage amplo.
  `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS` são exatamente o par que o
  `BridgeWebChromeClient` do Capacitor pede para `getUserMedia({audio})`
  (conferido no fonte).
- O pedido acontece **só** no toque em "Falar" (`ensureMicPermission`), nunca
  no startup. Se o aluno recusa, a tela mostra "Mic bloqueado…" e o Longyu
  segue utilizável, sem loop de permissão.
- Limitação honesta: `SpeechRecognition` (Web Speech API) não é garantido na
  Android System WebView. Sem ele, o player já mostra "Voz não disponível
  aqui. Ouça e repita em voz alta." + Continuar. Confirmar em aparelho real é
  tarefa do RC2.2.11.

## 20–22. Assinatura

- Arquitetura: **Google Play App Signing** + upload key local do owner.
  Documentação completa em `docs/ANDROID_SIGNING.md` (keystore, upload key,
  alias, store/key password, onde guardar, backup, `keytool` com senha
  interativa, preenchimento local, AAB assinado, CI, Play Console).
- Nomes canônicos: `LONGYU_ANDROID_KEYSTORE_PATH`,
  `LONGYU_ANDROID_KEYSTORE_PASSWORD`, `LONGYU_ANDROID_KEY_ALIAS`,
  `LONGYU_ANDROID_KEY_PASSWORD` (env tem precedência) ou
  `android/keystore.properties` (**gitignored**; modelo sem segredos em
  `android/keystore.properties.example`).
- `android/app/longyu-signing.gradle`: valida os quatro valores e a existência
  do keystore; assina o release só se tudo existir. Sem assinatura, o release
  fica com `signingConfig null` (**nunca** a debug key) e qualquer tarefa
  `*Release*` falha com `BLOCKED_SIGNING_SECRETS` listando só os nomes. Debug
  segue funcionando sem segredo nenhum.
- Lógica exercitada de verdade com o Gradle 8.14.3 local e um stub do DSL
  `android {}` (o AGP não é baixável aqui): debug sem segredos → ok; release
  sem segredos → `BLOCKED_SIGNING_SECRETS` com os 4 nomes; env completo →
  `signingConfig=longyuRelease`; `keystore.properties` relativo → idem; keystore
  inexistente → bloqueado "(arquivo não encontrado)"; só a key password
  faltando → bloqueado com esse nome. Em nenhum cenário um valor de senha
  apareceu na saída (grep = 0).
- `.gitignore`: `*.jks`, `*.keystore`, `*.p12`, `*.pfx`, `keystore.properties`,
  `key.properties`, `android/keystore.properties`, `android/key.properties`,
  `android/local.properties`, `local.properties`, saídas de build. Provado com
  `git check-ignore` em 7 caminhos sonda, e o exemplo **não** é ignorado.
- **Keystore rastreado? NÃO.** Nenhum `.jks`/`.keystore`/`.p12`/senha no Git
  (varredura do diff + `SECRET_FILE_TRACKED`/`PASSWORD_LITERAL`).

## 23–28. O que foi (e não foi) gerado

| Pergunta | Resposta |
| --- | --- |
| Signed release gerado? | **FALSE** — `BLOCKED_SIGNING_SECRETS` (sem keystore/senhas do owner; nenhum keystore fake foi criado) |
| Android SDK disponível neste ambiente? | **FALSE** — `dl.google.com` (SDK e Google Maven/AGP) negado pela política de rede do ambiente (HTTP 403). JDK 21 e Gradle 8.14.3 existem. |
| Debug build (APK) gerado? | **TRUE no CI** ([run 35956823842](https://github.com/matstangherlin/longyu/actions/runs/35956823842), `assembleDebug` BUILD SUCCESSFUL, commit `8149bf5d`); localmente `BLOCKED_LOCAL_ANDROID_SDK` (exit 3) |
| AAB debug gerado? | **TRUE no CI** (mesmo run, `bundleDebug` BUILD SUCCESSFUL; artifact `longyu-android-debug` com APK + AAB, 7 dias); localmente mesmo bloqueio |
| `cap sync android` | **PASS** (web build + cópia de assets + 5 plugins) |
| Aparelho Android físico testado? | **FALSE** |
| `android_real_device` formal PASS? | **FALSE** — continua `pass: false` em `docs/release/rc1-operational-checks.json` |

Novo workflow `.github/workflows/android.yml` (sem segredos): gates
estáticos; prova que `bundle:release` sem segredos sai com exit 4; compila
**APK e AAB debug** com o Android SDK do runner do GitHub e anexa os artefatos
por 7 dias. Primeira execução real, no PR
[matstangherlin/longyu#283](https://github.com/matstangherlin/longyu/pull/283):
job "Android foundation (contratos + debug APK/AAB)" **success** — AGP 8.13.0
+ Gradle 8.14.3 + SDK 36 compilaram o projeto, inclusive o
`longyu-signing.gradle` e o versionamento lido do `package.json`. Build verde
ali continua não sendo `android_real_device`.

## 29. Cloud

#273 intocada. `cloud_auth`, `cloud_sync` e `feedback_backend` continuam
`false` (o validator recusa promoção). O Android usa **o mesmo** código de
auth/sync do web; Web ↔ Android sync **não** está certificado. Nenhuma
credencial, projeto Supabase ou config Netlify foi tocado.

## 30–31. Fingerprint e contagens

| Métrica | Esperado | Real |
| --- | --- | --- |
| Fingerprint | `c48b008c9c1e` | `c48b008c9c1e` |
| lessons | 134 | 134 |
| teaching topics | 113 | 113 |
| CultureItems | 30 | 30 |
| Culture Native Lessons | 30 | 30 |
| Journey Culture nodes | 20 | 20 |
| Culture Moments | 5 | 5 |
| Tone Transfers | 12 | 12 |
| conversation scenes | 52 | 52 |
| capabilities | 31 READY / 0 PARTIAL | 31 READY / 0 PARTIAL |

Nenhum arquivo de `CURRICULUM_SOURCES` foi tocado. `BETA_PEDAGOGY_FREEZE`
continua ativo e sem alteração.

## 32. Gates

<!-- resultados:inicio -->
| Gate / comando | Resultado | Onde |
| --- | --- | --- |
| `npm run typecheck` | **PASS** | local |
| `npm run build` (web/PWA) | **PASS**: SW gerado, 0 `registerSW` injetado no HTML | local |
| `npm run android:sync` | **PASS**: 5 plugins | local |
| `gate:android-native-foundation` | **PASS**: 3 validators + 74 mutações + `validate:beta-pedagogy-freeze` | local + CI (job Android) |
| `validate:beta-pedagogy-freeze` | **PASS**: 134 · 113 · 30 · 30 · 20 · 5 · 12 · 31/31 READY · fp `c48b008c9c1e` | local |
| `validate:public-beta-feature-freeze`, `validate:rc15-freeze`, `validate:mobile-beta-readiness`, `validate:pwa-release-readiness`, `test:pwa-upgrade-preflight` e demais | **PASS**: 182 linhas PASS, 0 FAIL até o ponto em que a execução local de `validate:beta` foi interrompida pelo owner | local (parcial) |
| `validate:beta` completo (inclui `gate:rc2-2-8-learning-gamification`, `gate:rc2-2-9-capability-closure`, `gate:android-native-foundation`) + `build` + `validate:frontend-secrets` | em execução no job "Portão de qualidade" do PR [matstangherlin/longyu#283](https://github.com/matstangherlin/longyu/pull/283); o resultado vale de lá | CI |
| Android debug APK + AAB | **PASS**: `assembleDebug` + `bundleDebug` | CI ([run 35956823842](https://github.com/matstangherlin/longyu/actions/runs/35956823842)) |
| `android:bundle:release` sem segredos | **BLOCKED_SIGNING_SECRETS** (exit 4), como esperado | local + CI |
| `npm audit --audit-level=moderate` · gitleaks · CodeQL | **PASS** | CI |
| E2E Chromium + mobile-chrome (7 specs: beta-smoke, en-core-surfaces, i18n-shell, journey-redesign, mobile-device, topic-mastery-hardening, rc2-2-9-capability-closure) | **87 passed**, 4 skipped, 2 failed. As 2 falhas (`journey-redesign`: botão 64.125 px vs `< 64`, 322 px vs `< 300`) **reproduzem idênticas no commit base `e65b527e`**: métrica de fonte deste sandbox, não regressão do RC2.2.10 | local |
<!-- resultados:fim -->

## 33. Mutações

| Suite | Mutações mortas | Obrigatórias cobertas |
| --- | --- | --- |
| `test:android-native-foundation` | 28 | #1 appId removido · #2 appName · #3 webDir · #4 targetSdk < 36 · #5 compileSdk · #15 cloud_auth PASS · #16 android_real_device PASS sem evidência · #20 WebView → produção · #22 fingerprint · #23 BETA_PEDAGOGY_FREEZE removido · #24 curriculum source modificado |
| `test:android-signing-contract` | 24 | #6 `.jks` · #7 `.keystore` · #8 keystore.properties commitável · #9 senha literal · #10 key alias · #11 key password · #12 store password · #13 store path · #14 release com debug key |
| `test:android-platform-boundaries` | 22 | #17 SW no nativo · #18 segundo SRS · #19 segundo account store · #21 BACK fecha o app em qualquer rota |
| **Total** | **74** | **24/24** |

Extras mortos incluem: `gradlew.bat` ausente, versionName/versionCode
literais, divergência package.json ↔ manifesto, cloud_sync/feedback_backend
PASS, emulador contado como aparelho, Public Beta GO, `.jks` rastreado, valor
literal em workflow, senha impressa no log, `bundle:release` sem pré-checagem,
Capacitor espalhado em componente, plugin sem consumidor, deep link para
admin/host arbitrário, link externo dentro da WebView, permissão de
localização, reset em background, shell nativo rodando no web.

## 34. Bloqueios que continuam

| Bloqueio | Estado |
| --- | --- |
| Compilação Android local | `BLOCKED_LOCAL_ANDROID_SDK` (rede do ambiente); CI de PR compila debug |
| Release assinado | `BLOCKED_SIGNING_SECRETS` até o owner criar a upload key (docs/ANDROID_SIGNING.md) |
| Aparelho físico (`android_real_device`) | NOT_RUN: RC2.2.11 |
| Play Console / Internal testing | não configurado |
| Ícone monocromático + assets de loja | `ANDROID_BRAND_ASSET_REQUIRED` |
| App Links https verificados | precisa de domínio definitivo + `assetlinks.json` |
| SpeechRecognition na WebView | não garantido; confirmar em aparelho |
| Cloud auth/sync/feedback real, Web ↔ Android sync | #273 (adiada por custo/credenciais) |
| iOS físico, Human QA, PWA production upgrade, rollback | inalterados |

## 35. Veredito

**PUBLIC BETA: NO-GO.**

Esta remessa entrega a fundação de código (status
`CODE_READY_AWAITING_SIGNING_AND_PHYSICAL_QA` em
`docs/release/android-native-foundation.json`). Não certifica QA Supabase,
cloud auth/sync/feedback reais, Android ou iOS físico, Human QA, upgrade de
PWA em produção, rollback, Play Console nem AAB de produção assinado.

## Próxima onda — RC2.2.11 Android Device UX & Release Hardening

Instalar em Android físico; startup, background/resume, BACK, teclado, áudio
e microfone reais; recusa/nova tentativa de permissão; deep links reais;
ícones/splash finais; performance; crash/recovery; upgrade N → N+1; AAB
assinado quando o owner fornecer a upload key; Internal Testing no Google
Play. Ainda sem tocar a #273.
