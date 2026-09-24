# RC2.2.10B — Main → Web / Android Release Pipeline

> Public Beta continua **NO-GO**. Esta remessa automatiza build, versão e
> entrega. Não publica nada em produção e não certifica cloud, aparelho
> físico, upgrade de PWA, rollback nem Play Console.

Depois desta remessa podemos dizer: *"A main é a fonte única do Longyu Web e
Android. Todo novo código mergeado entra automaticamente no próximo build de
ambas as plataformas."* **Não** podemos dizer: *"Todo commit atualiza
instantaneamente o app Android instalado."* O app instalado só recebe novo
frontend quando uma nova versão Android é publicada e o aparelho atualiza.

Guia operacional: [`docs/RELEASE_PIPELINE.md`](../RELEASE_PIPELINE.md).
Manifesto: [`docs/release/delivery-pipeline.json`](../release/delivery-pipeline.json).

## Base e branch

| Item | Valor |
| --- | --- |
| Base | `a0ea2802` = head final do RC2.2.10 (PR [matstangherlin/longyu#283](https://github.com/matstangherlin/longyu/pull/283), que já contém `main` `887a078a` com o #282 mergeado) |
| Branch | `claude/rc2-2-10b-main-delivery-pipeline` (empilhada sobre o RC2.2.10; o #283 continua só com o RC2.2.10) |
| PR | **não aberto** (o owner abre depois). Nada foi mergeado. |
| RC2.2.10 | intacto: Capacitor, `android/`, API 36, camada de plataforma, BACK, lifecycle, deep links, contrato de assinatura, keystore safety. Nada refeito. |

## Workflows

| Workflow | Situação | Gatilho | Faz |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | **modificado** | PR + push `main` | + identidade web com o SHA (`release-identity.mjs web`, confere `dist/version.json` = HEAD) + artefato `longyu-web-<shortSha>` (dist, 30 dias, só push na main). Nada mais mudou; nenhum `continue-on-error`. |
| `.github/workflows/android-build.yml` | **renomeado** de `android.yml` (RC2.2.10) e ampliado; não é duplicado | PR + push `main` + manual | gates Android + pipeline; prova `BLOCKED_SIGNING_SECRETS` (exit 4); sonda do Play; `npm run build` + `cap sync` + Gradle → APK + AAB debug com nome identificável e `.provenance.json`; artefato 7 dias (PR) / 30 dias (main); resumo com o status de cada etapa. **Nunca publica.** |
| `.github/workflows/android-release.yml` | **novo** | **só `workflow_dispatch`** | guard `main` + manual + opt-in de produção; guard de SHA esperado; gates; checa credenciais (só nomes); keystore base64 → `$RUNNER_TEMP` (`umask 077`) → `bundleRelease` → keystore apagado (`if: always()`); upload para o Play (internal por padrão) ou `BLOCKED_PLAY_CREDENTIALS`; artefato AAB + proveniência + registro (90 dias). |

## Web

- **Build:** `ci.yml` em PR e em push na main: `npm ci` → `validate:beta`
  (typecheck + todos os gates, agora com `gate:android-native-foundation` e
  `gate:main-delivery-pipeline`) → `build` → `validate:frontend-secrets` →
  identidade com SHA → artefato. Passos sequenciais: build quebrado =
  nenhum artefato web.
- **Deploy:** já existe e é do **Netlify** (integração Git + `netlify.toml`;
  deploy previews aparecem como checks nos PRs, por exemplo no #283). **Não** foi
  criado um segundo sistema de deploy, e `validate:delivery-pipeline` recusa um
  workflow com `netlify deploy`. O manifesto registra `webAutoDeploy: false`
  (este repositório não faz deploy) e `webHostingDeploy.mode:
  netlify-git-integration`, com `productionBranchVerifiedFromRepo: false`: a
  configuração de branch de produção do painel do Netlify não é visível a
  partir desta sessão.
- **PWA:** inalterado (autoUpdate, banner, proteção de bundle antigo).
  `pwa_upgrade` continua `false`: build verde não prova upgrade de produção.

## Android

- **Build automático:** `android-build.yml`, em PR e push na main. Na
  primeira execução real, no #283 (nome antigo `android.yml`,
  [run 35956823842](https://github.com/matstangherlin/longyu/actions/runs/35956823842)),
  `assembleDebug` + `bundleDebug` deram BUILD SUCCESSFUL. A versão ampliada
  deste workflow roda quando o PR desta branch for aberto.
- **Artefatos:** `release-artifacts/longyu-android-debug-<versionName>-<shortSha>.apk`,
  `.aab` e `.provenance.json`; release:
  `longyu-android-<versionName>-<shortSha>.aab` + `.provenance.json` +
  `play-upload-record.json`. Nunca só `app-release.aab`. `release-artifacts/`
  é gitignored.
- **Local (este ambiente):** `android:sync` PASS; `android:debug` →
  `BLOCKED_LOCAL_ANDROID_SDK` (exit 3, SDK/Google Maven bloqueados pela rede
  do ambiente); `android:bundle:release` → `BLOCKED_SIGNING_SECRETS` (exit 4).

## versionCode / versionName

- **versionName** = `package.json` `version` (`0.2.0-beta.1`). Legível,
  nunca SHA (`assertVersionName` recusa hash). `netlify.toml` fixa
  `VITE_APP_VERSION` e o validator exige que seja igual ao `package.json`.
- **versionCode** = floor (`android/version.properties`, hoje `1`) + `git
  rev-list --count --first-parent HEAD`. Determinístico (mesmo SHA, mesmo
  código) e crescente a cada merge na main (squash mantém a main linear).
  Hoje, a `main` `887a078a` tem 52 commits first-parent, então um build dela
  sairia com **versionCode 53**.
- Gradle: `LONGYU_ANDROID_VERSION_CODE` (exportado pelo `android-cli`) nunca
  abaixo do floor; sem env vale o floor (dev).
- **Sem colisão silenciosa:** `play-upload.mjs` lê todos os versionCodes já
  nas tracks do Play e recusa `VERSION_CODE_NOT_INCREASING`; o ledger
  `docs/release/android-release-ledger.json` exige ordem estritamente
  crescente (vazio: nenhum upload aconteceu).

## Proveniência de SHA

- Identidade canônica: `scripts/lib/release-identity.mjs`, com `authority:
  "sha"`. O timestamp é só informativo.
- Web: `dist/version.json` agora tem `schema`, `authority`, `commitSha`,
  `shortSha`, `branch`, `appVersion`, `platform: "web"`, `environment`,
  `builtAt`.
- Android: `.provenance.json` com SHA, shortSha, branch, versão,
  versionName, versionCode, plataforma, buildType, environment, workflow run,
  `dirtyTree`, `official` e sha256 de cada arquivo. `buildProvenance` recusa
  qualquer campo com nome de segredo.
- **Stale build:** `bundle:release` confere HEAD = SHA embutido no bundle web
  = `LONGYU_RELEASE_SHA`, e o workflow ainda confere `expected_sha`.
- **Árvore suja:** release oficial local recusa (`DIRTY_TREE`, exit 6); só
  `--allow-dirty` passa e marca `official: false`; o upload recusa build não
  oficial (`UNOFFICIAL_BUILD`). Verificado localmente: com valores de
  assinatura presentes e árvore suja → exit 6; com `--allow-dirty` → segue
  até o próximo bloqueio honesto (SDK).
- No app: *Sobre* mostra `v0.x.x` + `Web · build abc1234` ou
  `Android · build abc1234 · versionCode N`. O versionCode vem do próprio APK
  instalado (`App.getInfo()`).

## Assinatura, Play, canais

| Item | Status |
| --- | --- |
| Contrato de assinatura CI | pronto: `LONGYU_ANDROID_KEYSTORE_BASE64` + `_KEYSTORE_PASSWORD` + `_KEY_ALIAS` + `_KEY_PASSWORD` (secrets do GitHub) |
| Secrets de assinatura | **NOT CONFIGURED** → release assinado `BLOCKED_SIGNING_SECRETS` |
| Contrato Play | pronto: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`; `scripts/play-upload.mjs` (Android Publisher API v3, sem dependências: JWT RS256 via `node:crypto` + `fetch`) |
| Credencial Play | **NOT CONFIGURED** → `BLOCKED_PLAY_CREDENTIALS` (exit 5). Nenhuma credencial inventada. |
| Internal Testing | **preparado, não executado** (nenhum upload; ledger vazio) |
| Production | **NOT_REQUESTED**. Só manual + `main` + `confirm_production=PUBLICAR-PRODUCAO` + environment `android-production`, e sobe como **rascunho** (rollout humano no Play Console) |
| Destino automático | **só artefato** (`ARTIFACT_ONLY`); nem Internal Testing é automático |
| GitHub Environments | `android-internal` / `android-production` referenciados; **NOT CONFIGURED** (o owner define os aprovadores; nenhuma aprovação fingida) |
| Tags | convenção `android-v<versionName>+<versionCode>` documentada; **nenhuma tag criada** |
| Release notes | input manual no workflow (pt-BR, ≤ 500 caracteres) + receita de rascunho via `git log --first-parent` desde a última tag; nenhum texto genérico gerado |

A política do Play foi exercitada localmente sem credencial. `push` →
`AUTO_RELEASE_FORBIDDEN`; branch ≠ main → `SOURCE_NOT_MAIN`; production sem
opt-in → `PRODUCTION_NOT_CONFIRMED` (os três com exit 6); internal válido sem
credencial → `BLOCKED_PLAY_CREDENTIALS` (exit 5), com registro sem nenhum
segredo. **O caminho de upload real (OAuth + edits + bundles + tracks +
commit) nunca rodou contra o Google**, porque não existe credencial.
Primeiro upload: o Play exige que o app exista no Console e que o primeiro
AAB seja enviado manualmente pela interface.

## OTA / live update

`LIVE_UPDATE = DEFERRED_POST_BETA`. Nada instalado. `validate:delivery-pipeline`
recusa dependências de OTA (`@capgo/capacitor-updater`,
`@capacitor/live-updates`, code-push…), updater no `capacitor.config.ts` e
código que baixe ou execute JS remoto (`eval`, `new Function`, `import("https…")`,
script dinâmico). As duas exceções existentes foram conferidas e
restringidas: JSON-LD de SEO (dado, não executa) e o widget Turnstile de
origem fixa (anti-bot da Cloudflare). O Android continua empacotando o
`dist/` local.

## Auditoria de segredos

Busca no diff contra `a0ea2802` por `BEGIN PRIVATE KEY`, `storePassword`,
`keyPassword`, `private_key`, `.jks`, `.keystore`, `service role`, tokens
(`eyJhbGci`, `ghp_`, `github_pat_`, `AIza`, `ya29.`). Só apareceram **nomes
de variável e código de validação**, nenhum valor. Nenhum arquivo
`.jks/.keystore/.p12/keystore.properties/service-account*.json` rastreado.
`.gitignore` agora também cobre `*service-account*.json`,
`*service_account*.json`, `google-play*.json`, `play-credentials*.json` e
`release-artifacts/`. O workflow de release nunca faz `echo` de secret,
decodifica o keystore só em `$RUNNER_TEMP`, apaga-o com `if: always()` e
envia como artefato apenas `*.aab`, `*.provenance.json` e o registro do Play.

## Mutações

| Suite | Mortas | Obrigatórias cobertas |
| --- | --- | --- |
| `test:delivery-pipeline` | 28 | #1 produção auto em push · #2 source ≠ main (workflow e política) · #12 production padrão · #13 PR tenta upload · #14 WebView remota · #15 OTA · #16 JS remoto · #17 cloud PASS · #18 android_real_device por CI · #19 PWA upgrade por build · #20 Public Beta GO · #21 freeze removido · #22 fingerprint · #23 currículo |
| `test:release-identity` | 19 | #3 SHA ausente da metadata · #4 web/Android "mesma release" com SHA diferente · #5 versionCode não cresce · #24 Android compila commit ≠ release · #25 árvore suja aceita sem flag |
| `test:android-release-safety` | 17 | #6 keystore rastreado · #7 keystore/base64 no artifact · #8 store password logada · #9 key password logada · #10 service account commitado · #11 release com debug keystore |
| **Total** | **64** | **25/25** |

Extras mortos incluem: produção subindo publicada (não rascunho), release manual ganhando
gatilho de push, segundo sistema de deploy web, manifesto declarando upload
ou release assinado sem prova, doc escondendo que commit não atualiza o app,
override de versionCode abaixo do floor, upload sem conferir versionCodes do
Play, versionName = SHA, `netlify.toml` com versão divergente, build não
oficial subindo ao Play, `set -x`, token do Play em log, keystore não apagado
e `.gitignore` sem padrão de service account.

## Validação

| Comando | Resultado |
| --- | --- |
| `gate:main-delivery-pipeline` | **PASS**: 3 validators + 64 mutações |
| `gate:android-native-foundation` (RC2.2.10) | **PASS**: 74 mutações + freeze |
| `gate:rc2-2-9-capability-closure` | **PASS** |
| `gate:rc2-2-8-learning-gamification` | **PASS** |
| `typecheck` · `build` · `validate:frontend-secrets` | **PASS** |
| `validate:i18n` · `test:i18n` · `validate:en-core-surfaces` · `test:stale-bundle` · `validate:pwa-release-readiness` · `test:pwa-upgrade-preflight` · `validate:mobile-beta-readiness` · `test:mobile-beta-readiness` · `test:rc-hardening` · `validate:security-boundaries` · `validate:product-claims` · `validate:ghost-features` · `validate:feature-truth` · `validate:public-beta-feature-freeze` · `validate:rc2-content-freeze` · `validate:operational-evidence` · `validate:release-evidence-freshness` · `validate:release-candidate` · `validate:human-qa-prebeta` · `validate:public-beta-trust` | **PASS** (execução local direcionada) |
| `validate:beta` completo | não rodado localmente de ponta a ponta nesta remessa (≈ 1 h; a execução anterior foi interrompida pelo owner). Roda no job "Portão de qualidade" quando o PR desta branch for aberto. |
| `android:sync` | **PASS** |
| Android debug local | `BLOCKED_LOCAL_ANDROID_SDK` (exit 3) |
| Signed release | `BLOCKED_SIGNING_SECRETS` (exit 4) |
| Play internal upload | `BLOCKED_PLAY_CREDENTIALS` |
| Play production | `NOT_REQUESTED` |

## Fingerprint e contagens

Fingerprint `c48b008c9c1e` (inalterado). 134 lições · 113 teaching topics ·
30 CultureItems · 30 Culture Native Lessons · 20 Journey Culture nodes ·
5 Culture Moments · 12 Tone Transfers · 52 conversation scenes ·
31 READY / 0 PARTIAL. `BETA_PEDAGOGY_FREEZE` preservado; nenhum
`CURRICULUM_SOURCE` tocado. #273 intocada; `cloud_auth`/`cloud_sync`/
`feedback_backend`/`android_real_device`/`pwa_upgrade` continuam `false`.

## Bloqueios que continuam

| Bloqueio | Quem destrava |
| --- | --- |
| Secrets de assinatura (`LONGYU_ANDROID_*`) | owner: criar upload key (docs/ANDROID_SIGNING.md) e cadastrar os 4 secrets |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` + app no Play Console + primeiro AAB manual | owner |
| Aprovadores do environment `android-production` | owner (Settings → Environments) |
| Branch de produção do Netlify = `main` (não verificável daqui) | owner confirma no painel |
| Caminho de upload real nunca executado contra o Google | primeiro run do `android-release.yml` com credencial |
| Compilação Android local | rede do ambiente (Google Maven/SDK); o CI compila |
| Aparelho físico, upgrade N → N+1, rollback | RC2.2.11 (roteiro em RELEASE_PIPELINE.md §9) |
| Cloud real, Web ↔ Android sync, Human QA, iOS | #273 e ondas seguintes |

## Veredito

**PUBLIC BETA: NO-GO.** A RC2.2.10B melhora distribuição e automação. Ela
não comprova cloud real, QA candidate, Web ↔ Android sync, Human QA,
Android ou iOS físico, upgrade de PWA em produção, rollback de produção nem
aprovação de produção no Play Console.
