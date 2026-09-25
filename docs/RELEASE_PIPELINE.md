# Pipeline de release do Longyu: main → Web / Android (RC2.2.10B)

> **Resumo em uma frase:** a `main` é a fonte única do Longyu Web e Android.
> Todo código mergeado entra automaticamente no próximo build das duas
> plataformas. **Commit na main NÃO atualiza imediatamente o app instalado**:
> o Android só muda no aparelho quando uma nova versão é publicada no Google
> Play e o usuário recebe o update.

```
feature branch → PR → CI (validate:beta, build, gates Android, debug APK/AAB)
                  │
                merge (squash) na main
                  │
      ┌───────────┴────────────┐
      ▼                        ▼
   WEB (ci.yml)            ANDROID (android-build.yml)
   validate:beta + build   gates + cap sync + Gradle
   dist + version.json     APK/AAB debug + .provenance.json
   artifact longyu-web-<sha>   artifact longyu-android-debug-<ver>-<sha>
      │                        │
   Netlify (integração Git)    │  (nada é publicado automaticamente)
   publica o site              ▼
                           android-release.yml  ← AÇÃO HUMANA (workflow_dispatch)
                           AAB release assinado → Google Play Internal Testing
                                                   │
                                          validação em aparelho real
                                                   │
                           android-release.yml (production, opt-in + aprovação)
                           → Play como rascunho → rollout manual no Play Console
```

## 1. Fonte da verdade

- `origin/main` é a fonte canônica. Web e Android de uma mesma release saem
  do **mesmo commit SHA**. O SHA é a autoridade técnica; o horário do build
  (`builtAt`) é só informativo.
- Identidade canônica: `scripts/lib/release-identity.mjs` (`sha`, `shortSha`,
  `branch`, `version`, `platform`, `buildType`, `environment`, `versionCode`,
  `versionName`, `workflowRun`).
  - Web: `dist/version.json`.
  - Android: `release-artifacts/<nome>.provenance.json`.
- No app: *Sobre* mostra `v0.x.x` + `Web · build abc1234`. No Android mostra
  `Android · build abc1234 · versionCode N`, com versionCode lido do próprio
  APK instalado. Nada de segredo, token, assinatura ou caminho privado.
- Uma release só pode ser anunciada como "a mesma" em Web e Android se os dois
  SHAs forem iguais (`validate:release-identity`).

## 2. Web

| Etapa | Onde |
| --- | --- |
| PR e push na main: `npm ci` → `validate:beta` (typecheck + gates) → `build` → `validate:frontend-secrets` → identidade com SHA | `.github/workflows/ci.yml` (job *Portão de qualidade*) |
| Artefato `longyu-web-<shortSha>` (dist completo, 30 dias) | mesmo job, só em push na main |
| Deploy | **Netlify**, pela integração Git do próprio Netlify (`netlify.toml`). Não existe um segundo sistema de deploy neste repositório. |

Se o build web falha, não há artefato web: os passos são sequenciais.

A Web pode mudar a cada merge (A → B → C → D), e o PWA atualiza sozinho
(`autoUpdate`, banner de update, proteção de bundle antigo). Isso **não**
certifica o upgrade de PWA em produção: `pwa_upgrade` continua `false` até
existir o drill real N → N+1.

## 3. Android

| Etapa | Onde |
| --- | --- |
| PR e push na main: gates (`gate:android-native-foundation` + `gate:main-delivery-pipeline`) → prova de `BLOCKED_SIGNING_SECRETS` sem segredos → sonda do Play → `npm run build` + `cap sync` + Gradle → **APK + AAB debug** | `.github/workflows/android-build.yml` |
| Artefato `longyu-android-debug-<versionName>-<shortSha>` (APK + AAB + `.provenance.json`; 7 dias em PR, 30 na main) | mesmo workflow |
| Release assinado + upload no Play | `.github/workflows/android-release.yml`, **só manual** |

O Android **não** busca JS da main. O frontend dentro do APK é o `dist/` do
commit compilado. Modelo da Beta: main → build nativo → Play → update no
aparelho.

### Canais (não se misturam)

| Canal | Quem | Como chega |
| --- | --- | --- |
| DEV | desenvolvimento local | `npm run android:debug` / Android Studio; nunca vai ao Play |
| INTERNAL | equipe e aparelhos próprios | `android-release.yml` com `channel=internal` (padrão) → Internal Testing |
| CLOSED BETA | grupo de testers | `channel=closed` → track `alpha`, **rascunho** (o owner libera no Play Console) |
| PRODUCTION | usuários públicos | `channel=production` + `confirm_production=PUBLICAR-PRODUCAO` + environment `android-production` → **rascunho**; rollout final manual no Play Console |

Destino automático máximo enquanto o Longyu estiver em Beta: **só o
artefato**. Nem Internal Testing acontece sem alguém acionar o workflow.

### versionCode e versionName

- **versionName** = `version` do `package.json` (ex.: `0.2.0-beta.1`).
  Legível, nunca o SHA.
- **versionCode** = floor de `android/version.properties` + número de commits
  first-parent da `main` até o SHA compilado
  (`git rev-list --count --first-parent HEAD`). É determinístico (mesmo SHA,
  mesmo código) e cresce a cada merge (squash mantém a main linear).
- **Sem colisão silenciosa:** antes do upload, `scripts/play-upload.mjs`
  compara com todo versionCode já presente nas tracks do Play e recusa
  (`VERSION_CODE_NOT_INCREASING`) se o novo não for maior. O ledger
  `docs/release/android-release-ledger.json` também só aceita valores
  estritamente crescentes.
- Para reiniciar a contagem (ex.: histórico reescrito), suba o floor em
  `android/version.properties`. Ele nunca desce.

### Proveniência e guards

- Todo APK/AAB sai com nome identificável
  (`longyu-android-0.2.0-beta.2-abcdef1.aab`) e um `.provenance.json`: SHA,
  versão, versionCode, plataforma, buildType, workflow run e sha256 dos
  arquivos. Responde "qual código está dentro deste AAB?".
- **Stale build:** antes do `bundleRelease`, HEAD precisa ser igual ao SHA
  embutido no bundle web (`dist/version.json`) e ao `LONGYU_RELEASE_SHA`
  (e ao `expected_sha` informado no workflow). Divergência → `STALE_BUILD`.
- **Árvore suja:** release oficial local recusa mudanças rastreadas não
  commitadas (`DIRTY_TREE`, exit 6). Só `--allow-dirty` passa, e o artefato
  sai `official: false`. O upload recusa build não oficial.

## 4. Segredos do GitHub (nomes, nunca valores)

| Secret | Para quê | Status |
| --- | --- | --- |
| `LONGYU_ANDROID_KEYSTORE_BASE64` | upload key (`.jks`) em base64 | NOT CONFIGURED |
| `LONGYU_ANDROID_KEYSTORE_PASSWORD` | store password | NOT CONFIGURED |
| `LONGYU_ANDROID_KEY_ALIAS` | alias da upload key | NOT CONFIGURED |
| `LONGYU_ANDROID_KEY_PASSWORD` | key password | NOT CONFIGURED |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | service account com acesso à Google Play Android Developer API | NOT CONFIGURED |

A ausência deles **não** bloqueia o desenvolvimento: PR e main continuam
verdes, o debug build passa, o release assinado fica `BLOCKED_SIGNING_SECRETS`
e o upload fica `BLOCKED_PLAY_CREDENTIALS`.

No CI, o keystore é decodificado para `$RUNNER_TEMP/longyu-upload.jks`
(`umask 077`, fora do workspace), usado pelo Gradle e apagado num passo
`if: always()`. Nada disso vai para artefato, log, relatório ou metadata.

Para gerar o base64 da upload key localmente (sem colar a chave em lugar
nenhum além do secret):

```bash
base64 -w0 ~/secure/longyu/longyu-upload.jks > /tmp/longyu-upload.b64   # Linux
base64 -i ~/secure/longyu/longyu-upload.jks -o /tmp/longyu-upload.b64  # macOS
# Windows PowerShell:
# [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\secure\longyu\longyu-upload.jks")) | Set-Content $env:TEMP\longyu-upload.b64
```

Cole o conteúdo em *Settings → Secrets and variables → Actions → New
repository secret* e apague o arquivo temporário. Criação da upload key:
[`docs/ANDROID_SIGNING.md`](ANDROID_SIGNING.md).

## 5. GitHub Environments

`android-release.yml` usa `android-internal` (internal/closed) e
`android-production` (production). O GitHub cria o environment na primeira
execução, **sem** proteção. O owner deve configurar em *Settings →
Environments → android-production → Required reviewers* (e, se quiser,
restringir a branch `main`). Nenhuma aprovação é simulada aqui. Status atual:
**NOT CONFIGURED**.

## 6. Fluxo do owner

Rotina:

```bash
git checkout main && git pull
git checkout -b minha-feature
# ... commits ...
git push -u origin minha-feature   # abre o PR no GitHub
# CI verde → merge (squash) na main
```

Depois do merge, o CI cuida do build web, do build Android e dos artefatos.
O Netlify publica o site.

Release Android (quando houver secrets):

1. GitHub → *Actions* → **Android release (manual)** → *Run workflow* (branch `main`).
2. `channel = internal` (padrão), notas da versão e, opcional, o `expected_sha` validado.
3. Baixe o AAB do run ou teste pelo Internal Testing do Play em aparelho real.
4. Promoção: rode de novo com `channel = production` e
   `confirm_production = PUBLICAR-PRODUCAO`. Os aprovadores do environment
   `android-production` aprovam, e o rollout final é feito no Play Console.

Primeiro upload: o Google Play exige que o app exista no Play Console e que o
**primeiro** AAB seja enviado manualmente pela interface. Os seguintes podem
usar o workflow.

### Tags e release notes

- Convenção: `android-v<versionName>+<versionCode>` (ex.:
  `android-v0.2.0-beta.2+142`), criada **depois** de um upload real, apontando
  para o SHA do `.provenance.json`. Nenhuma tag foi criada nesta remessa.
- Notas da versão: texto escrito pelo owner no input `release_notes`
  (pt-BR, até 500 caracteres). Para rascunhar a partir do que entrou desde a
  última tag Android:
  `git log --first-parent --format='- %s' android-v<anterior>..origin/main`.
  Revise antes de colar: sem detalhes técnicos sensíveis, sem texto genérico.
- Depois de um upload real, copie o `play-upload-record.json` do run para
  `docs/release/android-release-ledger.json` e atualize `lastUploadedVersionCode`
  em `docs/release/delivery-pipeline.json`.

## 7. O que exige nova versão Android

| Mudança | Web | Android |
| --- | --- | --- |
| Backend/remoto (Supabase, Edge) | sem deploy do front | sem Play update |
| Código React/TS compartilhado | próximo deploy Netlify | entra no **próximo build Android**; chega ao aparelho só na próxima versão publicada |
| Capacitor, plugins, código nativo | — | novo build Android |
| AndroidManifest, permissões | — | novo build Android |
| Ícone, splash, nome | — | novo build Android |

Android não precisa publicar a cada merge. Main A → B → C → D pode ter Web em
A, B, C, D e Android Production em A e depois D. O D contém todo o estado
acumulado. Isso não é fork: os dois derivam da main.

Feature flags: reutilizar `src/lib/featureFlags.ts` quando fizer sentido,
nunca como desculpa para mandar código não testado. Flags de cloud ficam fora
enquanto a #273 estiver bloqueada.

## 8. Rollback

- **Web:** o Netlify pode republicar um deploy anterior (rollback de
  deployment). O PWA recebe o bundle anterior no próximo update.
- **Android:** não existe "desinstalar remotamente" uma versão publicada.
  Correção = **novo versionCode → nova release** (pode ser o SHA anterior
  recompilado com versionCode maior, ou um fix). O rollout pode ser
  pausado no Play Console. Por isso cada AAB guarda a proveniência (SHA,
  versionCode) e o artefato do run fica 90 dias.

## 9. Upgrade N → N+1 (fundação de teste, sem PASS)

Roteiro para o RC2.2.11, em aparelho físico:

```bash
adb install longyu-android-<N>.apk            # versão N
# no app: criar progresso (lições, Review, Culture, streak), anotar estado
adb install -r longyu-android-<N+1>.apk       # atualiza mantendo dados
# conferir: progresso, SRS, conta, pérolas preservados; sem tela em branco
adb shell dumpsys package longyu.noba.com | grep versionCode
```

Registrar em `docs/release/evidence/` com aparelho, Android, versionCodes e
SHAs. `android_real_device` e `pwa_upgrade` **continuam false** até isso
acontecer com evidência humana.

## 10. Live update / OTA

`LIVE_UPDATE = DEFERRED_POST_BETA` (`LIVE_UPDATE = OFF` na Beta).

Não há live update, OTA de bundle JS, troca remota de bundle, clone de
CodePush nem updater próprio. Motivos: reprodutibilidade da release, QA,
rollback, compatibilidade nativo/web, política do Play e redução de risco.
`validate:delivery-pipeline` recusa dependências de OTA, updater no
`capacitor.config.ts` e código que baixe ou execute JS remoto. Uma
investigação só depois da Beta estável, avaliando segurança, rollback,
compatibilidade de bundle/versão nativa, política do Play, staged rollout,
bundles assinados e kill switch.

## 11. O que esta pipeline NÃO prova

Build verde, AAB assinado ou upload no Internal Testing **não** transformam a
Public Beta em GO. Continuam dependendo de evidência própria: cloud real
(#273), QA candidate, Web ↔ Android sync real, Human QA, Android e iOS
físicos, upgrade de PWA em produção, rollback de produção e aprovação de
produção no Play Console. **Public Beta: NO-GO.**
