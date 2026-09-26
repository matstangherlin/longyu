# RC2.2.19 — Guided · Simple · Physically Verified Learning Product

Status formal: **NO-GO para Public Beta.** Ainda dependem de QA físico em aparelho real (build da Play), de passos do owner e da #273.
Status desta onda: **código pronto e validado na Web/E2E; confirmação física pendente.** Nenhum campo físico foi marcado PASS.

> **AUTOMATED PASS ≠ PRODUCT PASS.** Este relatório separa sempre quatro estados:
> **CODE PASS** (gate + mutações) · **WEB/E2E PASS** (Playwright) · **PHYSICAL PASS** (aparelho real — nenhum nesta onda) · **OWNER ACTION REQUIRED**.

## 1. Base

| | |
|---|---|
| `RC2_2_19_BASE_SHA` | `231adff6` = `main` depois do #291 (RC2.2.18 squash, que inclui o #290 / RC2.2.17) |
| RC2.2.17B | `d76432b5` (branch `claude/rc2-2-17b-guided-journey-parity`), aplicado sobre a base em `6cb96e54` |
| Branch | `claude/rc2-2-19-guided-simple-verified` |
| PR | **não aberto** (o owner abre o PR e decide merge e release) |

A base não é ambígua: começou do `main` depois do merge do #291.

O RC2.2.17B, feito sobre o head do #290, foi trazido por cherry-pick do commit único, não por merge. O merge-base antigo via duplicatas do squash.

Conflitos resolvidos:
- os dois gates em `validate:beta` e nos workflows Android;
- as duas exceções de freeze;
- os dois conjuntos de campos de QA e riscos;
- a linha de pré-permissão do microfone, que ficou acima do dock guiado.

O #290 continua aberto no GitHub, mas o conteúdo dele já está no `main` pelo squash do #291. O owner pode fechá-lo.

## 2. Matriz P1 / P2

Legenda: ✅ passa · ⏳ `NOT_RUN` (sem aparelho) · 👤 passo do owner.

| Problema | CODE | WEB/E2E | PHYSICAL | OWNER | O que mudou |
|---|---|---|---|---|---|
| GUIDANCE_NEVER_ACTUALLY_SHOWN | ✅ | ✅ | ⏳ | — | `SHOWN` só com **evidência de render** (visível ≥ 1,2 s). Escolher uma orientação não gasta a sessão; se ela não aparecer em 4 s, desiste sem gastar |
| GUIDANCE_UNLOCK_AUTO_MARKED_AS_SEEN | ✅ | ✅ | ⏳ | — | A semente grava `AUTO_SEEDED` (elegível). O `SEEN` v1 migra para `AUTO_SEEDED`. Sair da tela não grava nada |
| GUIDED_TRY_AUDIO_NOT_PLAYING_ON_DEVICE | ✅ | ✅ | ⏳ | — | Trilha DEV/QA `audio_requested` → `audio_started` no passo da tela (contrato honesto de áudio da RC2.2.17) |
| CONVERSATION_CONTINUE_STALL_ON_DEVICE | ✅ | ✅ | ⏳ | — | Trilha `step_visible` → `continue_pressed` → `completion_started` → `completion_finished` → `advanced` |
| NATIVE_SPEECH_RECOGNITION_NOT_WORKING | ✅ | ✅ | ⏳ | — | Diagnóstico de fala por elo. `recognitionProven` nunca vem só da permissão. Fallback com 4 saídas |
| SELF_COMPARE_RECORDING_NOT_PROVEN | ✅ | ✅ | ⏳ | — | `recordingProven` = gravou + duração + arquivo temporário (o plugin informa `fileExists`/`fileBytes`) + reprodução concluída |
| MOBILE_SIGNUP_FAILURE | ✅ | ✅ | ⏳ | — | 8 estágios rastreados. Falha registra só estágio/código/plataforma/build. Prazos de 25 s e 30 s |
| PASSWORD_RECOVERY_FLOW_BROKEN_ON_MOBILE | ✅ | ✅ (tela) | ⏳ | 👤 | Código de 6 dígitos dentro do app (`verifyOtp` recovery → `updateUser` → Login). Modelo de e-mail aplicado pelo owner |
| JOURNEY_NOT_USING_GUIDED_TRY_PRESENTATION | ✅ | ✅ | ⏳ | — | RC2.2.17B integrado (`GuidedLessonShell`, `STEP_PRESENTATION_CONTRACTS`, 47 mutações) |
| REVIEW_TOO_DENSE | ✅ | ✅ | ⏳ | — | Rodadas de 5 a 8 itens. Feedback de acerto enxuto |
| REVIEW_MONOTONOUS_REPETITION | ✅ | ✅ | ⏳ | — | O mesmo alvo nunca aparece colado. Repetir o alvo pede outro formato (`formatShift`) |
| HANZI_TOO_SMALL_IN_REVIEW | ✅ | ✅ | ⏳ | — | Tamanhos: principal 64–80 px, opções 48–60 px, pares 44–52 px |
| TONE_LESSONS_VISUALLY_DENSE | ✅ | ✅ | ⏳ | — | Tom plano (17B). Articulação num sistema separado: a língua nunca ensina tom |
| PROFILE_ACCOUNT_DISCOVERABILITY | ✅ | ✅ | ⏳ | — | Avatar → `/perfil` + coachmark. Primeira dobra com 🏅, Editar e Amigos. Bloco "Você" no Mais |
| LOGOUT_DISCOVERABILITY | ✅ | ✅ | ⏳ | — | Sair no Mais › Você e em Conta. Excluir conta fica separado |
| IMMERSION_TOO_STATIC | ✅ | ✅ | ⏳ | — | StorySceneShell: ONDE / COM QUEM / OBJETIVO, quem fala em destaque, "Você conseguiu" |

Manifesto: `docs/release/rc2-2-19-manifest.json`. QA físico: `docs/release/android-physical-qa.json`, com 12 campos novos `NOT_RUN`, o risco `ANDROID_RC2_2_19_PRODUCT_UNVERIFIED` e `extendedBy = RC2.2.19`.

## 3. Orientação: estados explícitos

Estados de uma orientação:

| Estado | Significado |
|---|---|
| `AUTO_SEEDED` | Disponível, nunca vista. Continua elegível |
| `SHOWN` | Ficou visível na tela (`evidence: "render"`) |
| `DISMISSED` | Aluno tocou em Entendi / CTA |
| `SNOOZED` | "Agora não", volta em 24 h |
| `SKIPPED` | "Pular dica" |

- **Disponível ≠ mostrada.** A superfície só reporta "visível" com tamanho > 0, dentro da viewport e sem `invisible`/opacidade zero. O coachmark só reporta depois de posicionado. O DOM expõe `data-guidance-render-evidence=pending|visible|shown`.
- **Conta madura:** nada tranca de novo.
  - `availabilityMemory` guarda por conta o que já esteve disponível; só cresce.
  - Contas com 12+ lições nunca têm áreas HARD (Cultura, Imersão) trancadas.
  - O que ela nunca viu continua elegível, **uma por sessão**, e nunca no lote "Novos recursos".
- **Conta nova:** até 2 orientações na primeira sessão; a segunda só depois da primeira atividade (regra da RC2.2.18).
- **Lote "Novos recursos":** cobre **só** as áreas que lista (no máximo 2). O resto continua elegível.
- **Saídas em toda orientação:** Entendi · Agora não · **Pular dica** · Pular dicas.
- **Jornada ↔ Cultura:** `SUGGESTION` (momento cultural), `RECOMMENDED` (aula CORE do tópico) e `CURRICULUM_GATE` (marco com selo). Depois de uma aula cuja próxima etapa é a Cultura recomendada, a tela diz isso e oferece "Agora não, voltar à Jornada". A Cultura aberta pela Jornada sempre volta para a Jornada.
- **Primeiro uso:** `profile_entry_v1` (avatar), `immersion_first_use_v1` e `review_session_intro_v1` (inline na Revisão), além dos da RC2.2.18.
- **Navegação inicial:** Jornada · Praticar · Mais (E2E).

## 4. Áudio, fala e gravação (DEV/QA)

- **Trilha do passo** (`window.__longyuLessonTrace`, só DEV/fixtures): `step_visible`, `audio_requested`, `audio_started`, `continue_pressed`, `completion_started`, `completion_finished`, `advanced`. Leva só lição, índice, tipo e tentativa.
- **Diagnóstico de fala** (`window.__longyuSpeechDiagnostics` + painel "Speech diagnostics"). Aparece em DEV/fixtures, ou num build que não é `production_beta` com `localStorage longyu:qa-diagnostics=on`. Campos:
  - `microphonePermission`, `recognitionService`, `zhCnSupport`;
  - `modelDownloadAvailable`, `modelDownloadState`;
  - `recordingEngine`, `recordingStarted`, `recordingDuration`, `temporaryFileCreated`;
  - `playbackReady`, `playbackPlayed`, `lastErrorCode`.
- **Plugin Android:** `stopPracticeRecording` devolve `fileExists`/`fileBytes`, nunca o caminho nem o conteúdo.
- **Sem transcrição:** Tentar novamente · Baixar suporte (quando o Android oferece) · Gravar e comparar · Continuar sem falar.
- **Teclado:** com o teclado aberto, o campo focado rola para cima do dock. Corrige o DF da 17B: a superfície é re-chaveada por passo, então é resolvida na hora do evento.

## 5. Cadastro e recuperação de senha

**Cadastro.** Estágios: `signup_started` → `signup_request_success` → `confirmation_required` → `session_available` → `draft_restore_started` → `profile_bootstrap_started` → `finalize_started` → `journey_entered`.
- Cada falha registra estágio, código seguro (sem `@`, sem texto livre), plataforma e SHA do build. Nunca e-mail, senha ou token.
- Prazos: pedido de 25 s e finalização de 30 s, com mensagem acionável em vez de spinner eterno.

**Recuperação de senha.** Fluxo: e-mail → **código de 6 dígitos** → nova senha → sai da sessão → Login, tudo no app.
- Mensagem única: "Se este email estiver cadastrado, enviaremos as instruções."
- Só "sem conexão" e "muitas tentativas" viram erro, porque não revelam a conta.
- Código errado e código vencido têm a mesma resposta.
- O código vive só no estado do formulário. Nunca vai para store, URL, log ou analytics (o gate verifica).

**Modelo de e-mail — 👤 owner.** `supabase/templates/recovery.html` (com `{{ .Token }}` e o link) está só **versionado**. Nem o template de produção nem o `supabase/config.toml` foram alterados. Passos em `docs/release/rc2-2-19-recovery-template.md`.

| Campo | Status |
|---|---|
| `RECOVERY_TEMPLATE_CODE_READY` | ✅ |
| `OWNER_APPLIED` | `NOT_RUN` |
| `PHYSICALLY_VERIFIED` | `NOT_RUN` |

## 6. Revisão (ReviewSessionComposer)

- Compõe a **mesma** fila do SRS (`dueItems` → `buildReviewQueue`). Não agenda, não gradua e não cria SRS novo; o gate verifica.
- Rodadas de 5 a 8, sem sobra anêmica no fim.
- O mesmo alvo (tipo + id) nunca fica colado quando existe alternativa; sem alternativa, mantém tudo.
- A 2ª aparição do alvo desloca a alternância de formatos do builder (`formatShift`).
- Hànzì: principal `text-[64px] sm:text-[80px]`, opções `text-[48px] sm:text-[60px]`, pares `text-[44px] sm:text-[52px]`.
- Feedback: no acerto, confirmação + o item; explicação, motivo provável e sugestão de nota só no erro.
- Primeira revisão: uma dica inline orquestrada (rodadas curtas; o erro volta depois, de outro jeito). O link do Atlas no glossário já existia.

## 7. Tom, articulação e imagens

- **ToneContour** continua só com altura da voz. O gate falha se "língua" aparecer no código do tom.
- **`ArticulationDiagram`** (corte lateral: lábios, dentes, céu da boca, língua) no Pinyin Lab › Iniciais, para j/q/x, zh/ch/sh, z/c/s, r, ü, e e i apical. Cada um tem uma frase curta e exemplos com áudio (hànzì + pinyin).
- **Escolha por imagem ensina:** depois da resposta, mostra a imagem + hànzì · pinyin · sentido · áudio.

## 8. Cena de história, perfil e conta

- **StorySceneShell.** É o próprio `InteractiveStoryPlayer`; nenhum StoryEngineV2 foi criado.
  - Pré-tela com rótulos **Onde / Com quem / Objetivo**.
  - Quem fala agora ganha anel (`data-active-speaker`).
  - Glossário e áudio como antes.
  - Final "**Você conseguiu**" + objetivo cumprido, com o recap **antes** das recompensas.
- **Perfil.**
  - O avatar do topo abre `/perfil` e ganhou coachmark.
  - A primeira dobra traz avatar, nome, @username e uma linha com 🏅 medalhas · Editar · Amigos (cabe em 360 px; teste de 200 px da RC2.2.13 passa).
  - Amigos leva à página real, que mostra o próprio estado honesto.
- **Mais.** Bloco "Você" no topo com Perfil, Conta, Aparência (`/config/aparencia`) e Sair. **Excluir conta não entra** ali: continua separado em Conta, atrás de confirmação.
- **Conclusão da lição no shell guiado.** Um único CTA, "Continuar", que também resgata as recompensas (secundárias). O recap vem antes, como na 17B.

## 9. Nomes de exemplo

A spec pede Mariana/Matheus (PT) e Alex/Emily (EN).

- Os placeholders do formulário seguem **Mariana** e **Alex**. A regra da RC2.2.17 (`PLACEHOLDER_PERSONAL_NAME`) proíbe "Matheus" como placeholder, por risco de nome real, e o gate da RC2.2.17 continua valendo.
- Matheus/Emily **não** foram inseridos no conteúdo didático, que está congelado.
- 👤 Se o owner aprovar, entram em copy nova numa próxima onda.

## 10. Gate

`gate:rc2-2-19-guided-simple-verified` tem 5 pares validate/test e **65 mutações**, todas mortas. A spec pede ≥ 29.

| Área | Mutações | Exemplos de código de falha |
|---|---|---|
| `guidance-truth` | 16 | `AUTO_SEEDED_AS_SEEN`, `LEGACY_SEEN_TRUSTED`, `SHOWN_WITHOUT_EVIDENCE`, `LEAVE_MARKS_SEEN`, `SELECTION_COUNTS_AS_SHOWN`, `BATCH_MARKS_UNLISTED`, `RELOCKED`, `MATURE_BATCH_AS_NEW` |
| `device-traces` | 10 | `TRACE_EVENT_MISSING`, `SPEECH_FROM_PERMISSION`, `RECORDING_WITHOUT_PLAYBACK`, `RECORDING_WITHOUT_FILE`, `RECORDING_PATH_LEAK`, `DIAGNOSTICS_IN_PRODUCTION` |
| `auth-recovery` | 11 | `RECOVERY_ENUMERATION`, `RECOVERY_NOT_CANONICAL`, `OTP_LOGGED`, `TEMPLATE_SILENTLY_APPLIED`, `SIGNUP_PII_LOGGED`, `SIGNUP_INFINITE_LOADING` |
| `review-composer` | 10 | `ROUND_SIZE_OUT_OF_RANGE`, `CONSECUTIVE_SAME_TARGET`, `COMPOSER_DROPS_ITEMS`, `HANZI_TOO_SMALL`, `REPETITION_NOT_TRANSFORMED`, `NEW_SRS` |
| `product-release` | 18 | `STORY_SHELL_INCOMPLETE`, `PROFILE_NOT_DISCOVERABLE`, `DELETE_NOT_SEPARATED`, `REWARD_PRIMARY`, `TONGUE_FOR_TONE`, `FAKE_PHYSICAL_PASS`, `OWNER_ACTION_HIDDEN`, `RESIDUAL_HIDDEN`, `BASE_SHA_AMBIGUOUS`, `AUTO_PR`, `PURCHASES_ENABLED`, `TOUCHED_273` |

Os módulos puros (orquestrador, descoberta, composer, diagnóstico, recuperação, trilha de cadastro e trilha de passo) são **empacotados a partir do texto** (esbuild). As mutações executam de verdade, não são só regex.

Outros gates e o CI:
- O gate entra em `validate:beta` e nos workflows `android-build` / `android-release`.
- O gate da RC2.2.18 foi atualizado para a semântica nova. O "conta antiga não recebe anúncio" virou "não recebe lote do que já usa"; `DISMISSED` substitui `SEEN`.
- Os gates 2.2.17, 2.2.17B e 2.2.18 continuam passando.

## 11. E2E (chromium)

| Suíte | Resultado |
|---|---|
| `rc2-2-19-guided-simple.spec.ts` (novo): render evidence em conta madura v1, sair antes da evidência, 4 saídas, barra da conta nova, Mais/Perfil, hànzì da revisão, articulação, trilha da lição | 8/8 |
| `rc2-2-18-progressive-discovery` + `progressive-nav` (seeds convertidos para v2 `DISMISSED`) | 32/32 |
| `rc2-2-17-guided-learning` + `rc2-2-17b-guided-journey-parity` | 28/29 na rodada conjunta; o DF (teclado) foi corrigido e passa isolado |
| auth-surface, beta-smoke, cloud-first-onboarding | 38/38 |
| revisão (5 specs), imagem | 19/19 |
| topic-pass-return, culture-hub, learning-loop, unified-lesson-ux, en-core-surfaces, app-shell-mobile, RC2.2.11, RC2.2.13 | todos passam |

A suíte completa em todos os projetos (mobile-chrome, tablets, webkit, firefox) roda no CI do PR.

## 12. Evidência visual (antes = `main 231adff6`, depois = esta branch)

`docs/reports/rc2-2-19-screenshots/{before,after}/`: mesmo arquivo de spec, mesmas sementes, 390×844.

| # | Tela | Antes (golden-negative) | Depois |
|---|---|---|---|
| 01 | Conta madura com `SEEN` do RC2.2.18 | nenhuma orientação, nunca | uma orientação orquestrada (o coachmark do perfil) com as 4 saídas |
| 02 | Revisão (opções de hànzì) | opções em 30–36 px | opções 48–60 px (principal 64–80, pares 44–52); rodadas de 5–8 |
| 03 | Perfil 360×740 | só "Editar perfil" no cabeçalho | 🏅 · Editar · Amigos no cabeçalho |
| 04 | Mais | começa por Aprender; Perfil/Conta só no fim, sem Sair | bloco Você no topo (Perfil, Conta, Aparência, Sair) |
| 05 | Imersão, antes da cena | texto solto + "Objetivo:" | Onde / Com quem / Objetivo |
| 06 | Pinyin Lab › Iniciais | só a tabela | + "Como a boca faz" (j/q/x etc.) |

## 13. Resíduos da RC2.2.16 (carregados, sem inventar conclusão)

`RC2_2_16_RESIDUAL = OWNER_ACTION_REQUIRED`:
- upload key real, backups da keystore, GitHub Environments, AAB assinado com a chave real;
- instalação pela Play (`com.android.vending`), atualização N→N+1, confirmação do package e da verificação de desenvolvedor, artes da loja.

Nenhuma senha ou material secreto foi criado.

## 14. Regressão e restrições

- Package `longyu.noba.com`; compras Android `DISABLED_FOR_BETA`; sem Production Play; `rc2-candidate.json` (#273) intacto.
- Fingerprint `c48b008c9c1e` e contagens congeladas inalteradas. Exceção registrada: `RC2_2_19_GUIDED_SIMPLE_VERIFIED_EXCEPTION`.
- Não foi criado SRS, Lesson Engine, Story Engine nem Profile Engine novo; o gate verifica.
- Nenhum PR aberto; merge e release são decisão do owner.

## 15. O que falta (físico / owner)

1. **Aparelho real com o build da Play.** Preencher os 12 campos RC2.2.19 de `android-physical-qa.json`:
   - orientação vista e conta madura sem re-tranca;
   - áudio do Guided Try; Continuar na conversa;
   - zh-CN no SpeechRecognizer; gravar + ouvir;
   - cadastro no celular; recuperação por código;
   - rodadas da revisão; cena; perfil/conta/sair; desenhos de articulação.
2. **Owner:** aplicar o modelo de e-mail de recuperação (seção 5) e marcar `OWNER_APPLIED`.
3. **Owner:** resíduos da RC2.2.16 (seção 13).
4. **Owner:** fechar o #290 (conteúdo já no `main`) e abrir/mergear o PR desta branch quando quiser.
