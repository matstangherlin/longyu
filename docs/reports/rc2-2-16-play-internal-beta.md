# RC2.2.16 — Android Release Identity, Signed AAB & Play Internal Beta

> **Veredito:** `ANDROID_PACKAGE_FINAL` no código e no bundle; **nenhum** estado
> de Play avançou sem evidência do owner. `PUBLIC_BETA_FORMAL` continua **NO-GO**.
> #273 intocada. Feature freeze respeitado (nenhuma feature pública nova).
>
> **SUPERSEDED:** o package de desenvolvimento `com.longyu.app` citado neste
> relatório foi substituído por `longyu.noba.com` e só aparece aqui como histórico.

## 1–2. Base

| Item | Valor |
|---|---|
| `RC2_2_16_BASE_SHA` | `96539372` (head do #288, `claude/admiring-cray-4fx10i`), sobre `main` `0c5ad5ae` |
| #288 merge SHA | **PENDENTE**: #288 aberto. O owner autorizou começar sem esperar ("NÃO PRECISA ESPERAR O #288"). Esta branch está empilhada sobre o #288 e é retargetada para `main` quando ele entrar |
| CI do #288 no início | Security, backend-rehearsal, CodeQL: SUCCESS; CI e Android build: IN_PROGRESS. Não foi dado como verde |
| RC2.2.15 Daily Vocabulary | não existe na base → `DAILY_VOCABULARY_DEFERRED` (não bloqueia esta onda) |

## 3–10. Identidade do package

| # | Item | Resultado |
|---|---|---|
| 3 | package antigo | `com.longyu.app` (SUPERSEDED, só builds de dev/CI, nunca enviado ao Play) |
| 4 | package novo | `longyu.noba.com` (informado pelo owner a partir do Play Console) |
| 5 | varredura do id antigo | runtime 0 · config 0 · fonte Android 0 · testes 0 (fora a lista explícita de rejeição `LEGACY_ANDROID_APPLICATION_IDS`) · docs: só histórico marcado SUPERSEDED (`docs/reports/rc2-2-10-…`, este relatório, `android-package-identity.json`, `android-native-foundation.json.appIdHistory`). Validado por `validate:android-release-identity` (`git grep --untracked`) |
| 6 | Capacitor `appId` | `longyu.noba.com` |
| 7 | Gradle `applicationId` | `longyu.noba.com` (sem suffix/flavor) |
| 8 | `namespace` | `longyu.noba.com` (= applicationId) |
| 9 | package Java | `android/app/src/{main,test,androidTest}/java/longyu/noba/com/` · `package longyu.noba.com;` |
| 10 | esquema de deep link | `longyu.noba.com://` (`custom_url_scheme`, `deepLinks.ts`, lembretes). `com.longyu.app://` não abre mais nada (testado) |

Congelamento: `scripts/lib/android-package-identity.mjs` + `docs/release/android-package-identity.json` (`frozen: true`) + cópia congelada em `scripts/lib/rc2-2-16-gates.mjs`. Qualquer ledger com outro package falha.

**QA (Part Q):** um APK `com.longyu.app` instalado é outro app para o Android. Desinstale e instale `longyu.noba.com` do zero; ausência de upgrade do antigo não é bug.

## 11–13. Bundle final e versão

| # | Item | Resultado |
|---|---|---|
| 11 | package do AAB final | `longyu.noba.com`, lido do `base/manifest/AndroidManifest.xml` compilado por `scripts/android-inspect-bundle.mjs` e conferido de forma independente por `bundletool dump manifest` (AAB) e `aapt2 dump badging` (APK). Providers: `longyu.noba.com.fileprovider`, `longyu.noba.com.localnotifications.fileprovider`, `longyu.noba.com.androidx-startup`. Id antigo ausente em todas as entradas |
| 12 | versionName | `0.2.0-beta.1` (package.json) |
| 13 | versionCode | modelo mantido: floor 1 + commits first-parent de `main`. Na `main` atual (`0c5ad5ae`, 536): **537**. Esperado após #288 e esta onda (dois squash-merges): **539**. O oficial é recalculado pelo `android-release.yml` no SHA da `main`; registrar em `google-play-internal.json` antes do upload |

`android-cli` agora inspeciona todo APK/AAB depois do Gradle e recusa package/versão divergentes ou id antigo (exit 10).

## 14–19. Assinatura

| # | Item | Resultado |
|---|---|---|
| 14 | upload key | **OWNER_ACTION_REQUIRED**. Nada criado pela automação, nenhuma senha gerada. Comando: `npm run android:keystore:init -- --path <fora do repo>/longyu-upload.jks --alias longyu-upload --confirm CRIAR-UPLOAD-KEY` |
| 15 | backup checklist | todos `false` exceto `gitIgnoreConfirmed` → **STOP FIRST PLAY UPLOAD** até o owner completar |
| 16 | upload cert SHA-256 | não registrado (sem upload key) |
| 17 | Play App Signing | `OWNER_CONFIRMATION_REQUIRED` (esperado: chave do app gerada e gerenciada pelo Google) |
| 18 | app signing cert SHA-256 | não registrado. Quando existir: diferente do upload cert (esperado). App Links futuros usam **este** |
| 19 | AAB assinado | `BLOCKED_SIGNING_SECRETS` para release real. O caminho foi exercitado no VM com uma chave de **teste descartável** (não é a upload key, não entra em nenhum manifesto): `bundleRelease` OK → inspeção `PACKAGE_OK` → `SIGNED_WITH_UPLOAD_KEY` com proveniência completa (package, SHA, versionName/Code, builtAt, SHA-256 do arquivo e do certificado). O mesmo AAB reassinado com a debug key do SDK → `DEBUG_KEY_IN_RELEASE` (exit 8); sem assinatura → `UNSIGNED` (exit 8); pin de upload cert diferente → `UPLOAD_CERT_MISMATCH` (exit 8) |

Depois de registrado `uploadCertificateSha256`, `android:bundle:release` só aceita aquele certificado.

## 20–25. Play

| # | Item | Status |
|---|---|---|
| 20 | app no Play | `OWNER_REPORTED` (package `longyu.noba.com`; confirmação visual `OWNER_CONFIRMATION_REQUIRED`) |
| 21 | developer identity | `OWNER_CONFIRMATION_REQUIRED` |
| 22 | package registration | `OWNER_CONFIRMATION_REQUIRED` |
| 23 | Internal track | `OWNER_CONFIRMATION_REQUIRED` |
| 24 | Internal upload | **não feito** (ledger vazio). Manual é permitido (`MANUAL_INTERNAL_UPLOAD`) |
| 25 | instalação pela Play | **não feita**. Verificador pronto: `npm run android:play-install:verify` (installer `com.android.vending`, certificado do app ≠ upload) |

Automação da Play: `PLAY_API_AUTOMATION_BLOCKED` (não `APP_RELEASE_BLOCKED`). GitHub environments `android-internal` e `android-production`: **não existem** (API → 404); o owner cria, `android-production` com required reviewer e sem uso nesta onda.

## 26–31. QA físico no build da Play

| # | Item | Status |
|---|---|---|
| 26 | aparelho físico | NOT_RUN |
| 27 | TTS | NOT_RUN |
| 28 | fala | NOT_RUN (`ANDROID_SPEECH_RECOGNITION_UNVERIFIED` segue P1 candidato; obrigatório antes do Closed Beta) |
| 29 | haptics | NOT_RUN |
| 30 | notificações | NOT_RUN (Daily Vocabulary: `DAILY_VOCABULARY_DEFERRED`) |
| 31 | upgrade N→N+1 | NOT_RUN (exige dois uploads internal e update pela Play) |

Roteiro: `docs/ANDROID_PHYSICAL_QA.md` §6. Nenhum PASS vale sem `installSource = PLAY`, evidência do instalador, aparelho físico e `testedAt` + evidência por teste. Emulador não conta.

## 32–36. Política

| # | Item | Status |
|---|---|---|
| 32 | privacidade | `PUBLIC_HTTPS_NO_LOGIN`: `https://singular-meringue-7838cd.netlify.app/privacidade` → HTTP 200, viewport mobile, rota no layout público |
| 33 | exclusão de conta | `IN_APP_AND_WEB`: Conta → Excluir conta · `/privacidade#excluir-conta` · Edge Function `delete-account` + trigger que apaga feedback e telemetria |
| 34 | Data Safety | `INVENTORY_READY_OWNER_SUBMITS`: cada entrada com collected/shared/purpose/required/optional/encryptedInTransit/deletable/evidence. Microfone usado, áudio **não** armazenado, reconhecimento pelo serviço do dispositivo |
| 35 | App Access | instruções prontas; o owner cria a conta de revisor (credencial nunca no Git) |
| 36 | billing | **`ANDROID_IN_APP_PURCHASE = DISABLED_FOR_BETA`** (opção B) |

Anúncios: `NO_ADS` (sem SDK, sem AD_ID). Classificação de conteúdo e público-alvo: decisão do owner (não marcar crianças).

### Auditoria de monetização

Única venda por dinheiro: Pro e Família (Stripe, só web). No Android: `createCheckoutSession`/`openBillingPortal` recusam no nativo, e a página de planos não mostra preço, ciclo, região, "Assinar agora" nem portal. Mostra só "Nesta Beta, o app Android não vende assinaturas nem itens pagos". Quem já é Pro vê "Gerencie seu plano na plataforma onde ele foi adquirido". Qi, Pérolas, passes, cosméticos e Pro-por-Pérolas usam só moeda **ganha** no app. Pro comprado na web continua valendo no Android (`serverIsPro`). Catálogo: `docs/release/android-billing-audit.json`.

## 37–38. Bugs

- **P0:** 0.
- **P1:** 0 novos. Segue aberto o candidato `ANDROID_SPEECH_RECOGNITION_UNVERIFIED` (herdado; só fecha no aparelho). Corrigido nesta onda: CTA "Assinar agora" habilitado no Android sem caminho de compra válido (compliance).

## 39–40. Freeze

Fingerprint `c48b008c9c1e`. 134 lições · 113 tópicos · 30 CultureItems · 30 aulas nativas · 20 nós de Cultura · 5 Culture Moments · 12 Tone Transfers · 31 capacidades READY · 0 PARTIAL.

## Gates

`gate:rc2-2-16-play-internal-beta` (novo, em `validate:beta` e nos dois workflows Android):

| Gate | Mutações |
|---|---|
| `validate/test:android-release-identity` | 27 (package 1–9 + varredura + provider + helper) |
| `validate/test:signed-aab` | 18 (assinatura 10–17) |
| `validate/test:play-internal-readiness` | 10 (RC2.2.12) + 25 (Play 18–24, físico 31–37, estados) |
| `validate/test:play-policy-readiness` | 23 (billing 25–30 + privacidade, exclusão, Data Safety, anúncios, listagem) |
| `validate/test:play-beta-regression` | 12 (regressão 38–44, username, Public Beta) |

Também passam: RC2.2.8, RC2.2.9, RC2.2.10 (foundation), RC2.2.10B (pipeline), RC2.2.11, RC2.2.12, RC2.2.13, RC2.2.14, RC2.2.14B.

## 41. Próximos bloqueios (owner)

1. Confirmar **visualmente** o package `longyu.noba.com` no Play Console (hard stop).
2. Conferir identidade de desenvolvedor e registro de package; preencher `play-console-status.json`.
3. Criar a upload key e completar os dois backups.
4. Criar os environments `android-internal` e `android-production` e cadastrar os secrets.
5. Gerar o AAB release na `main` e registrar SHA/versionName/versionCode.
6. Primeiro upload ao **Internal** (manual permitido), com Play App Signing gerenciado pelo Google; registrar os dois fingerprints e a linha do ledger.
7. Instalar pela Play Store e repetir o QA essencial (§6) num aparelho físico.
8. Publicar N+1 e testar o upgrade pela Play.
9. Feature graphic 1024×500 e screenshots reais (`PLAY_STORE_FEATURE_GRAPHIC_REQUIRED`, `STORE_SCREENSHOTS_REQUIRED_FROM_PLAY_BUILD`).
10. #273 (cloud do candidate) segue congelada; `PRODUCTION_BACKEND_SMOKE` ≠ certificação cloud.
