# RC2.2.12: Android Physical QA, Signed Release & Play Internal Readiness

| Campo | Valor |
|---|---|
| Branch | `claude/rc2-2-12-android-physical-release` |
| Base | empilhada sobre `claude/rc2-2-11-experience-coherence` (#285 aberta), por instrução do owner: "não precisa esperar mergear" |
| PR | **não aberto**. O owner abre; nada foi mergeado. |
| #273 | **intocada** (gate `CLOUD_273_TOUCHED`, hash do candidate congelado) |
| Public Beta | **NO-GO** |

Esta é uma onda de release-hardening. Não há feature nova de produto: nenhuma
lição, tópico, CultureItem, personagem, conquista, moeda, SRS, aba ou economia.

## 1–2. Base

| Item | Valor |
|---|---|
| 1. `main` no início | `e7fd8bf796938e062ebb078885ca6a0f030bf8b0` (RC2.2.10B, #284) |
| Base efetiva | `0523fd8e817904534dfa819e46378adcb10388ca` (head do RC2.2.11) |
| 2. #285 merge SHA | **ainda não mergeado.** Quando #285 entrar, mergear `main` nesta branch (ou rebasear) antes do PR |

**CI na base (`0523fd8e`, #285):**
- Android build (contratos + APK/AAB debug), CodeQL, gitleaks e npm audit: success.
- Portão `validate:beta` + build e backend-contract/rehearsal: estavam rodando no fim desta sessão.

Nenhuma falha foi classificada como REGRESSION ou INFRA_EXTERNAL.

## 3–6. Versão, API e toolchain

| Item | Valor |
|---|---|
| 3. versionName | `0.2.0-beta.1` (package.json) |
| 4. versionCode | piso `1` (`android/version.properties`) + commits first-parent. Nesta branch dá **66** (`npm run android:version:check`). O ledger não tem nenhum upload real, e o guard passa |
| 5. API levels | compileSdk **36** · targetSdk **36** · minSdk **24** (inalterados) |
| 6. Java/Gradle | OpenJDK **21.0.10** · Gradle **8.14.3** · AGP **8.13.0** (inalterados) |

## 7–8. APK e AAB debug

**Local:** `BLOCKED_LOCAL_ANDROID_SDK`. O container não tem Android SDK, e
`dl.google.com` recusa a conexão pela política de rede (403 no proxy).
`maven.google.com` responde, mas os pacotes de plataforma do SDK só vêm de
`dl.google.com`.

**CI (evidência real):** workflow *Android build*, run
[35998693380](https://github.com/matstangherlin/longyu/actions/runs/35998693380),
na base `0523fd8e` (merge ref do PR `01ddb52`):

- `assembleDebug` + `bundleDebug`: **success**;
- artifact `longyu-android-debug-0.2.0-beta.1-01ddb52` (APK + AAB + `.provenance.json`), 25,9 MB,
  digest `sha256:76bc0adeb2e5b30049e5a5d7c5caf0eb588efe2ecca0f71f4d3d0a720b86e6d1`.

Os commits desta onda rodam a mesma pipeline quando o PR existir. O workflow
Android agora também roda `gate:rc2-2-12-android-release-readiness`.

## 9–12. Assinatura

| Item | Status |
|---|---|
| 9. Keystore | **não criado.** `npm run android:keystore:init` está pronto e é seguro (ver abaixo) |
| 10. Segredos de assinatura | **`BLOCKED_SIGNING_SECRETS`**: os 4 valores não existem no ambiente nem nos secrets |
| 11. AAB assinado | não gerado (`bundle:release` para em `BLOCKED_SIGNING_SECRETS`, exit 4) |
| 12. Fingerprint da assinatura | — (sem AAB assinado). Pipeline pronta: `android-verify-signature` grava o SHA-256 público do certificado |

**Novo nesta onda:**

- **`android:keystore:init`**:
  - só explica por padrão; exige `--confirm CRIAR-UPLOAD-KEY`;
  - o `keytool` pede as senhas no terminal;
  - recusa senha por argumento, caminho dentro do repo e sobrescrita;
  - nunca gera senha.
- **`android-verify-signature`**:
  - usa `keytool -printcert -jarfile`;
  - `SIGNED_WITH_UPLOAD_KEY`, ou falha com `DEBUG_KEY_IN_RELEASE` / `UNSIGNED`;
  - testado localmente com chaves descartáveis no scratchpad, fora do repo: upload key aceita, debug key e AAB sem assinatura recusados.
- **`bundle:release`** grava `*.signature.json`. O workflow de release **não envia** à Play sem `SIGNED_WITH_UPLOAD_KEY`.
- **`docs/ANDROID_SIGNING.md`** ganhou o checklist de backup (8 itens), a diferença upload key ≠ Play App Signing key, a verificação e o versionCode.

## 13–17. Aparelho físico

| Item | Valor |
|---|---|
| 13. Aparelho conectado? | **não.** `npm run android:devices` → `NO_ADB` (sem platform-tools neste container) |
| 14. Modelo | — |
| 15. Versão do Android | — |
| 16. Testes físicos | **nenhum executado**: `CODE_READY_AWAITING_PHYSICAL_DEVICE` |
| 17. Upgrade N → N+1 | **não executado.** Runbook em `docs/ANDROID_UPGRADE.md` |

**Preparado:**

- **`android:devices`**: classifica `NO_ADB`, `NO_DEVICE`, `UNAUTHORIZED`, `EMULATOR_ONLY` e `DEVICE_READY`, mascara o serial, e emulador nunca conta.
- **`android:install:debug`**: `adb install -r` só em aparelho físico autorizado, e imprime o `versionName`/`versionCode` instalados.
- **`docs/ANDROID_PHYSICAL_QA.md`** cobre as partes G–S e AP–AU:
  - cold start, splash e ícones, safe area;
  - BACK (7 casos), background/resume, process death;
  - teclado, áudio, microfone, permissões;
  - rede, deep links, links externos;
  - desempenho, crash/ANR, memória, orientação, fonte e TalkBack.
- **`docs/release/android-physical-qa.json`**: todos os campos da parte BA, tudo `NOT_RUN`, `formalPass: false`.
- **Contrato de upgrade:**
  - `appId` fixo;
  - sem `server.hostname`/`androidScheme` (a origem do WebView não muda);
  - `longyu-v1` + `migrate`;
  - piso do versionCode.

**Riscos que o QA físico precisa fechar:**

- **`ANDROID_SPEECH_RECOGNITION_UNVERIFIED` (candidato a P1).** A prática de fala
  usa a Web Speech API, e o Android System WebView costuma não expor
  `SpeechRecognition`. Nesse caso "Falar" não funciona dentro do app Android.
  Precisa ser verificado no aparelho. Se confirmar, é P1: a correção seria um
  plugin nativo de fala, uma feature nova a decidir, ou esconder a prática no Android.
- **`DEBUG_UPGRADE_KEY_MISMATCH`.** APKs debug de runs diferentes do CI têm debug
  keys diferentes, então o `adb install -r` N → N+1 falha com
  `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. O teste usa builds da mesma máquina ou builds release assinados.

## 18–21. Play

| Item | Status |
|---|---|
| 18. Play Console | **`BLOCKED_PLAY_CONSOLE_SETUP`**: o app não existe no Play Console |
| 19. Service account | **`BLOCKED_PLAY_CREDENTIALS`**: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ausente |
| 20. Upload internal | **não houve upload** (ledger vazio). Nada foi inventado |
| 21. Store listing | texto pt-BR/en pronto, não publicado. Plano de 8 screenshots. Feature graphic: `PLAY_STORE_FEATURE_GRAPHIC_REQUIRED`. Ícone monocromático: `ANDROID_BRAND_ASSET_REQUIRED` |

`docs/PLAY_CONSOLE_CHECKLIST.md` cobre:

- campos do app;
- texto da listagem, sem prometer pitch analysis, professor humano, offline total, compra no Android ou fala;
- screenshots e feature graphic;
- pagamentos;
- acesso de revisores: conta dedicada, credencial só no Play Console, nunca no Git;
- Internal Testing passo a passo, incluindo o primeiro AAB manual;
- instalar pela Play e upgrade pela Play;
- production manual.

**Política de Pagamentos da Play (correção nesta onda):** o app Android abriria o
checkout Stripe e o portal de cobrança, o que viola a regra de bem digital sem
Google Play Billing. Agora, no runtime nativo, `createCheckoutSession` e
`openBillingPortal` devolvem "Assinar pelo app Android ainda não está
disponível". Assinantes Pro continuam Pro, porque o plano é verificado no servidor.
A web não muda.

## 22. Inventário Data Safety

`docs/release/play-data-safety.json` tem 17 itens, cada um com collected, shared,
finalidade, opcional/obrigatório e exclusão.

**Coletados** (todos por HTTPS):
- email, @username (visível a outros alunos), nome de exibição;
- data de nascimento e país (**opcionais**);
- opt-in de marketing e origem do cadastro;
- progresso e estado de revisão;
- telemetria pedagógica (só com consentimento);
- feedback;
- desafio anti-abuso do Turnstile (compartilhado com a Cloudflare).

**Não coletados:**
- áudio do microfone (reconhecimento do próprio navegador/aparelho; gravação só em memória);
- funnel events (só no aparelho);
- diagnósticos (locais);
- compras (nenhuma no Android);
- crash logs e advertising ID.

Sem anúncios. Não foi preenchido no Play Console.

## 23. Exclusão de conta

| Caminho | Status |
|---|---|
| No app | **existe**: Conta → "Excluir conta na nuvem" e Ajustes → Privacidade e dados (Edge `delete-account`, confirmação obrigatória) |
| Web, sem o app | **adicionado**: seção pública `/privacidade#excluir-conta` com os passos e o email de suporte |
| Backend | `delete-account` já existe; username/identifier login continuam `CODE_READY_AWAITING_CLOUD_APPLY` |

## 24. Privacidade

Auditoria política × código. A página `/privacidade` agora cobre também:

- **dados da conta**: email e nome obrigatórios; o resto opcional. Não afirma
  verificação de idade, que o app não faz;
- **@nome de usuário** como identidade social: visível a outros, email nunca;
- **microfone**: pedido só em "Falar"; o Longyu não envia nem guarda áudio;
- **exclusão fora do app**.

Os parágrafos anteriores continuam valendo: progresso, telemetria, feedback,
diagnósticos, exportação e nuvem.

## 25–26. Bugs e P0/P1

| Bug | Severidade | Status |
|---|---|---|
| Checkout Stripe dentro do app Android (política de Pagamentos da Play) | bloqueador de review | **corrigido** (guard nativo + gate `PLAY_BILLING_POLICY`) |
| Política de privacidade sem microfone, username e dados da conta | bloqueador de Data Safety | **corrigido** |
| Sem caminho web de exclusão de conta | bloqueador de Play Console | **corrigido** (`#excluir-conta`) |
| Fala possivelmente indisponível no WebView Android | **P1 candidato** | aberto até o QA físico |

P0 abertos: 0 conhecidos. P1: 1 candidato não verificado. Sem aparelho não há
como afirmar "P0 = 0 / P1 = 0" no Android real.

## 27. Gates

| Gate | Resultado |
|---|---|
| `gate:rc2-2-12-android-release-readiness` | **PASS**: 4 validate + 4 test, **45 mutações** pegas |
| `gate:android-native-foundation` (RC2.2.10) | PASS |
| `gate:main-delivery-pipeline` (RC2.2.10B) | PASS |
| `gate:rc2-2-11-experience-coherence` | PASS |
| `gate:rc2-2-8-learning-gamification` / `gate:rc2-2-9-capability-closure` | PASS (dentro do `validate:beta`) |
| typecheck / build | PASS |
| `validate:beta` | PASS — CI "Portão de qualidade (validate:beta + build)" on PR head `c6cc995d` (job 107636849053, 2026-09-24) |

As 45 mutações, por área:

| Área | Mutações |
|---|---|
| physical-readiness | 12 |
| release-candidate | 17 |
| play-internal | 10 |
| upgrade | 6 |

Elas cobrem as 25 pedidas:

1. PASS sem evidência
2. emulador contado como físico (manifesto e classificador)
3. PASS sem modelo
4. PASS sem SHA
5. targetSdk reduzido
6. debug key no release (gradle e verificador)
7. keystore rastreado
8. senha logada
9. versionCode repetido (guard e ledger)
10. production automático
11. flag de username ligada
12. OTA
13. `exitApp`
14. sem `RECORD_AUDIO`
15. recusa de permissão trava o app
16. perda de rede quebra o sync UX
17. upgrade sem persistência
18. AAB assinado sem evidência
19. upload sem resultado
20. internal confundido com production
21. exclusão sem caminho
22. Data Safety sem username
23. fingerprint muda
24. contagem muda
25. #273 tocada

Os módulos de runtime rodam **a partir do texto mutado**: classificador de adb,
verificador de assinatura, guard de versionCode e plano do keystore.

## 28–29. Contagens e fingerprint

134 lições · 113 tópicos · 30 CultureItems · 30 aulas nativas · 20 nós culturais ·
5 momentos · 12 tone transfers · 52 cenas · 31/31 READY · 0 PARTIAL.
Fingerprint **`c48b008c9c1e`**, inalterado.

## Modelo de status da Play

| Status | Valor |
|---|---|
| `ANDROID_CODE_READY` | **true** |
| `SIGNED_AAB_READY` | false (`BLOCKED_SIGNING_SECRETS`) |
| `PHYSICAL_QA_PASS` | false (`CODE_READY_AWAITING_PHYSICAL_DEVICE`) |
| `PLAY_CONSOLE_READY` | false (`BLOCKED_PLAY_CONSOLE_SETUP`) |
| `INTERNAL_TESTING_READY` | false |
| `INTERNAL_TESTING_UPLOADED` | false (`BLOCKED_PLAY_CREDENTIALS`) |
| `CLOSED_TESTING_READY` | false |
| `PRODUCTION_READY` | false (sempre manual) |

Fonte: `docs/release/android-release-readiness.json`. Os gates recusam status fora
de ordem (por exemplo, UPLOADED sem SIGNED + PLAY_CONSOLE, ou CLOSED sem QA físico).

## 30. Veredito

- **Public Beta: NO-GO**, por #273/cloud e pelo Human QA global.
- **Android: `ANDROID_CODE_READY`**, ainda **não** `ANDROID_BETA_READY`.

O que falta, na ordem:

1. `npm run android:keystore:init` + checklist de backup;
2. secrets do GitHub;
3. criar o app no Play Console e fazer o primeiro AAB manual;
4. service account;
5. QA físico completo, com o risco de fala resolvido;
6. Internal upload, instalar pela Play e upgrade pela Play.

Não foi feito:
- ativar o login por username;
- tocar na #273;
- gerar senha ou keystore;
- publicar qualquer coisa;
- declarar QA físico ou upload.
