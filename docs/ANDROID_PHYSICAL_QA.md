# QA físico do Android (RC2.2.12 · RC2.2.16)

> **Status:** `CODE_READY_AWAITING_PHYSICAL_DEVICE`. Nenhum teste deste
> documento foi executado ainda. `android_real_device` continua `false` em
> `docs/release/rc1-operational-checks.json` até um humano executar tudo abaixo
> num aparelho **físico** e registrar em `docs/release/android-physical-qa.json`.

Emulador, Playwright, Gradle e CI verde **não** são QA físico.

## 0. Identidade da build (obrigatório; sem isso a evidência é inválida)

Registre antes de qualquer teste:

| Campo | De onde vem |
|---|---|
| `sha` | SHA completo do commit (proveniência `release-artifacts/*.provenance.json`) |
| `versionName` / `versionCode` | `npm run android:install:debug` imprime; ou a proveniência |
| `artifact` | nome do APK/AAB (ex.: `longyu-android-debug-0.2.0-beta.1-abc1234.apk`) |
| `deviceModel`, `androidVersion` | Ajustes → Sobre o telefone |
| `deviceSerialMasked` | o que `npm run android:devices` imprime (já mascarado) |
| `tester`, `testedAt` | quem testou e quando (ISO 8601) |
| `debugOrRelease` | `debug` (adb) ou `release` (assinado / Play) |

## 1. Preparar o aparelho

1. Ajustes → Sobre o telefone → toque 7× em "Número da versão" → Opções do desenvolvedor → **Depuração USB**.
2. Conecte por USB e aceite a chave RSA no aparelho.
3. `npm run android:devices` precisa responder **`DEVICE_READY`**:
   - `NO_ADB`: instale as platform-tools do Android SDK (vêm com o Android Studio);
   - `NO_DEVICE`: cabo/porta/modo de transferência;
   - `UNAUTHORIZED`: aceite o diálogo de depuração no aparelho;
   - `EMULATOR_ONLY`: só emulador. **Não vale** para este QA.
4. APK debug: `npm run android:debug` (com SDK) ou o artifact `longyu-android-debug` do CI.
5. `npm run android:install:debug`: instala com `adb install -r`, **só** em aparelho físico, e imprime o `versionName`/`versionCode` instalados de `longyu.noba.com`.

## 2. Roteiro

Cada linha é PASS / FAIL / N/A, com nota curta. Qualquer FAIL vira bug classificado (§3).

| Parte | Teste | Como |
|---|---|---|
| G | **Cold start** | Force stop → abrir pelo launcher → splash → Longyu abre sem tela branca e sem crash |
| H | **Splash e ícone** | Ícone no launcher; ícone adaptativo em 2 formatos; ícone redondo; splash; sistema claro e escuro; status bar legível. Monocromático segue `ANDROID_BRAND_ASSET_REQUIRED` (não inventar) |
| I | **Safe area** | Status bar, navegação por gestos e notch/cutout. Header, tab bar, diálogos e Lesson Player não ficam sob as barras |
| J | **BACK** | Jornada → BACK minimiza. Atlas → BACK → Hànzì. Conquistas → BACK → Perfil. Aula de Cultura → BACK → Cultura/Jornada de origem. Modal aberto → BACK fecha só o modal. Phase Challenge em andamento → pergunta antes de sair. Lição → sai pela saída da lição. O processo nunca é morto |
| K | **Background / resume** | Lição com respostas → Home → esperar 1 min → voltar: mesmo passo. Repetir com Revisão, Imersão, Cultura e Phase Challenge |
| L | **Process death** | Com o app em background: `adb shell am kill longyu.noba.com` (ou Opções do desenvolvedor → "Não manter atividades") → voltar. Nada corrompido, progresso salvo, conclusão e recompensa **não** duplicam |
| M | **Teclado** | Login (email/usuário), senha, @nome de usuário no cadastro, resposta curta, campos do Perfil. CTA visível, dá para rolar, a tela não pula, modal inteiro. Teclado latino; se possível, também o chinês (pinyin) |
| N | **Áudio** | Áudio da lição, pronúncia em mandarim, blips do dragão, Cultura, Imersão. Alto-falante; fone se houver; Bluetooth opcional (registrar se testou) |
| O | **Microfone** | 1ª vez em "Falar" → pedido de RECORD_AUDIO. Aceitar: a fala funciona. Negar: o app segue navegável. Ajustes do Android → conceder → voltar: funciona. **Risco conhecido:** o WebView pode não expor `SpeechRecognition`. Se "Falar" não existir ou não funcionar, é **P1** (`ANDROID_SPEECH_RECOGNITION_UNVERIFIED`) |
| P | **Permissões** | Ajustes → Apps → Longyu → Permissões: só Microfone. Sem câmera, localização, contatos ou arquivos |
| Q | **Rede** | Abrir → modo avião → continuar numa tela local (Revisão, Atlas, lição já aberta) → religar. Sem crash, aviso de sync calmo (sem faixa em loop), nenhuma ação duplicada. Sync real na nuvem **não** é PASS sem #273 |
| R | **Deep link** | `adb shell am start -W -a android.intent.action.VIEW -d "longyu.noba.com://jornada"`, depois `…://hanzi/atlas` e `…://cultura`: o app abre na rota. `longyu.noba.com://admin/feedback` é ignorado: o app abre, mas não navega para a rota proibida |
| S | **Links externos** | https abre no navegador do sistema (nunca dentro do app). mailto abre o email. tel abre o discador. `javascript:` é bloqueado |
| AP | **Desempenho** | Cronômetro simples: cold start até a Jornada interativa, abrir lição, Imersão e Atlas (ms). Anotar o aparelho |
| AQ | **Crash/ANR** | Zero crash nos caminhos acima. `adb logcat` só quando necessário; **não** commitar log com dado pessoal |
| AR | **Pressão de memória** | Telas pesadas (Atlas, Imersão, lição) → Home → abrir 3–4 apps pesados → voltar. Estável |
| AS | **Orientação** | O Longyu é portrait-first e não força orientação (o manifesto não trava). Girar não pode quebrar nem perder estado. Landscape não é alvo de design |
| AT | **Tamanho da fonte** | 100% e 130–150% (Ajustes → Tela → Tamanho da fonte): botões, navegação, diálogos e formulários utilizáveis, sem bloqueio grave |
| AU | **TalkBack** | Smoke: Login, Jornada, uma lição, BACK e o nome de quem fala na Imersão são anunciados. Não é certificação WCAG |

## 3. Classificação de bugs

- **P0:** app não abre; crash recorrente; perda de progresso; auth quebrado; atividade impossível.
- **P1:** microfone inutilizável; BACK quebra a lição; teclado bloqueia o CTA; deep link crítico falha; upgrade perde estado.

`android_real_device = PASS` exige **P0 = 0 e P1 = 0** nos caminhos centrais.

## 4. Critério formal (AZ)

Só marque `formalPass: true` e o check `android_real_device` quando **todos** forem PASS no mesmo SHA:
aparelho físico, cold start, navegação, lição, áudio, microfone, teclado, BACK,
background/resume, zero P0, e evidência com o SHA exato. Se faltar um, fica `false`.

Depois de preencher `docs/release/android-physical-qa.json`, copie o resumo para
`docs/release/evidence/android-real-device.md` e só então atualize o check em
`docs/release/rc1-operational-checks.json` (`testedAt`, `environment`, `commitSha`, `evidence`).

## 5. Upgrade e Play

- Upgrade N → N+1: [`docs/ANDROID_UPGRADE.md`](ANDROID_UPGRADE.md).
- Instalar pela Play (Internal Testing) é um teste **separado** do `adb install`: [`docs/PLAY_CONSOLE_CHECKLIST.md`](PLAY_CONSOLE_CHECKLIST.md) §8.

## 6. Build distribuído pela Play (RC2.2.16)

O QA essencial é **repetido** no build que veio do Google Play (Internal
testing). Debug via `adb` não substitui. Resultado vai em
`docs/release/android-physical-qa.json` → `playBuild` (um objeto por teste, com
`result`, `testedAt` e `evidence`).

**Antes de tudo (Part Q):** se o aparelho tem um Longyu de desenvolvimento
antigo, desinstale-o. Builds antigos usavam o package `com.longyu.app`
(SUPERSEDED): para o Android é outro app, não recebe upgrade para
`longyu.noba.com`, e isso **não** é bug. `npm run android:play-install:verify`
avisa se encontrar outro package Longyu instalado.

1. Aceite o convite de tester do Internal testing com a conta Google autorizada.
2. Instale pela **Play Store** (nunca `adb install`).
3. `npm run android:play-install:verify -- --out /tmp/play-install.json` (com
   `LONGYU_UPLOAD_CERT_SHA256=<upload cert>` no ambiente). O resultado precisa ser
   `INSTALLED_FROM_PLAY`: package `longyu.noba.com`, installer
   `com.android.vending`, versionName/versionCode da release e certificado
   instalado = **app signing key da Play**, diferente da upload key. Copie o JSON
   para `playBuild.installEvidence`.

| Teste (`playBuild.tests.*`) | O que conferir |
|---|---|
| `firstLaunch` | Instalação nova: splash → locale automático → boas-vindas → escolha de curso → Guided Try → cadastro/login |
| `safeArea` | Status bar, barra de gestos, notch/cutout, TabBar |
| `keyboard` | Login, cadastro, resposta curta: CTA visível |
| `tts` | Áudio em Jornada, Revisão, Cultura, Imersão, Hànzì, Guided Try |
| `speech` | Permissão do microfone → SpeechRecognizer → resposta em mandarim → resultado do exercício. **Obrigatório antes do Closed Beta** |
| `haptics` / `hapticsToggleOff` | Acerto, erro, peça de Hànzì, conclusão, conquista; depois desligar em Configurações e confirmar que para |
| `notifications` | POST_NOTIFICATIONS, lembrete de ofensiva e de retorno (Daily Vocabulary: `DAILY_VOCABULARY_DEFERRED`) |
| `courseDirection` | Android em PT → interface PT, curso pt-zh; trocar para en-zh sem perder progresso |
| `culture`, `review`, `hanzi` | Abrem, tocam áudio, voltam com BACK |
| `backgroundResume` | Lição, Revisão, Cultura, Builder → Home → voltar: mesmo passo |
| `processDeath` | Estado persistido; sem recompensa dupla, perda de progresso ou lição corrompida |
| `offline` | Modo avião: sem crash, estado honesto |
| `crashFree`, `anr` | Zero crash nos caminhos centrais; nenhum congelamento longo (startup, Jornada, lição, Atlas, Cultura, fala) |

**Upgrade pela Play (N → N+1):** depois do primeiro Internal, publique um build
com versionCode maior (pode ser só uma release de QA), atualize pela Play Store e
confira lição, SRS, Cultura, Configurações, CourseDirection, preferências de
notificação e Hànzì. Registre `playUpgrade`, `playUpgradeFromVersionCode` e
`playUpgradeToVersionCode`. Rollback nunca é instalar versionCode menor.
