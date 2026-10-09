# RC2.3.10 — Verdade do CI pai (#321)

- **Base:** `main` @ `7d1890adf8350d839463a290aaa01dd604e4618f` (= #320 + #321). Conferido com `git fetch` no início da wave: a `main` não tinha andado.
- **Branch:** `cursor/rc2-3-10-cloud-launch-certification` · PR [matstangherlin/longyu#322](https://github.com/matstangherlin/longyu/pull/322)

## Resultado hospedado do #321 (head `e34757b`) e da `main` `7d1890a`

| Job | #321 head | main 7d1890a |
|---|---|---|
| Security (CodeQL, gitleaks, npm audit) | PASS | PASS |
| Android foundation + runtime | PASS | PASS |
| Release truth + 9 canonical suites | PASS | PASS |
| Playwright E2E (Chromium) | PASS | PASS |
| Cross-engine: **Firefox** | **PASS** (1 flaky) | **PASS** |
| Cross-engine: **WebKit** | **FAIL** (3 failed, 6 flaky) | **FAIL** (3 failed, 2 flaky) |

## A falha

- **Teste:** `e2e/rc2-3-5-speech-contrast.spec.ts` › "contrast → record → hear myself → continue; evidence has no audio".
- **Browser:** `[webkit]`. **Viewports:** 360×640, 375×667 e 390×844 (todas). Mesma falha no retry.
- **Erro:** `expect(getByTestId('self-compare-recording-label')).toBeVisible()`: elemento não encontrado em 15 s (linha 186). "Gravando…" nunca aparece.
- **Os flaky** (`rc2-2-17b` reduced-motion, `rc2-2-24` tone trace, `tone-transfer`, `v492b` vídeo, `pedagogy`) passaram no retry. Não são deste problema e não foram mexidos.

## Causa

- **Não é** timeout, autoplay, WebAudio, layout ou toque.
- O build de WebKit do CI **não expõe motor de captura** ao app. O próprio micro-passo da aula mostra "Voz não disponível aqui" nesse motor, conforme registrado no `f7aba39`.
- O dublê do #321 começava com `if (!navigator.mediaDevices) return;`, então no WebKit **nada** era instalado: nem `getUserMedia`, nem o `MediaRecorder` sintético. O #321 resolveu o caso do Firefox (`AudioContext.resume()` pendente) e revelou este.
- **Bug real do app no mesmo caminho:** `PronunciationContrastDrill` renderizava `SelfComparePractice` sem checar `selfCompareRecordingAvailable()`. Num navegador ou WebView sem `mediaDevices`/`MediaRecorder`, o aluno via um botão "Gravar" que só levava a erro. O passo de fala da aula já checava isso; o drill não.

## Reprodução (sem WebKit nesta sessão; Chromium sem `navigator.mediaDevices`)

| Combinação | Resultado |
|---|---|
| app antigo + spec antiga (`7d1890a`) | **FAIL**, exatamente o erro do CI: `self-compare-recording-label` não encontrado, linha 186 |
| app novo + spec antiga | FAIL diferente: `self-compare` não aparece (o drill agora não oferece gravação sem motor), como esperado |
| app novo + spec nova | **PASS** (record, ouvir, continuar e o teste novo do caminho sem captura) |

## Correção (`a47a7b4`)

- **App:** o drill só oferece gravação quando `selfCompareRecordingAvailable()`. Sem motor, mostra a mesma saída honesta da aula (Continuar + "Voz não disponível aqui").
- **Teste:** o dublê instala `navigator.mediaDevices` quando o motor não tem e devolve um `MediaStream` vazio (sem WebAudio); o `MediaRecorder` sintético entrega um WAV válido no stop. O Chromium continua usando o dispositivo fake do motor e o `MediaRecorder` real. Nenhum assert removido, nenhum skip, nenhum timeout aumentado.
- **Teste novo:** "no capture engine: honest exit, never a record button that can only fail", nos 3 viewports e em todos os motores.

## Comandos executados (local)

| Comando | Resultado |
|---|---|
| `playwright test e2e/rc2-3-5-speech-contrast.spec.ts --project=chromium` (caminho real) | 9/9 PASS |
| mesma spec com o dublê forçado e `mediaDevices` removido (simulação do WebKit do CI) | 3/3 PASS no app novo; FAIL reproduzido no app antigo |
| `node scripts/typecheck.mjs` | PASS |
| `npm run gate:rc2-3-9-stack-convergence` | PASS (441 passos, 24/24 mutações) |

## Hosted no #322

### `0e5e528` e `b0713016`

| Job | `0e5e528` | `b0713016` |
|---|---|---|
| Security (CodeQL, gitleaks, npm audit) | PASS | PASS |
| Android foundation + provenance do APK | PASS | PASS ([job](https://github.com/matstangherlin/longyu/actions/runs/37860116220/job/113593564356)) |
| Android runtime (emulador) | PASS | PASS |
| Release truth + 9 suites beta + `validate:beta` | PASS | PASS |
| Playwright E2E (Chromium) | PASS | PASS |
| Cross-engine: Firefox | PASS | PASS (943 passed) |
| Cross-engine: **WebKit** | **FAIL** (fala ×3 + `lesson-step-progression`) | **FAIL**: 3 failed, 3 flaky, 948 passed ([job](https://github.com/matstangherlin/longyu/actions/runs/37860116157/job/113599799310)) |

### O que `b0713016` mudou e mostrou

- `lesson-step-progression` passou no WebKit.
- O teste de gravação continua vermelho nos 3 viewports, mas agora com diagnóstico: `recording never started (phase=failed, failure=RECORDING_FAILURE)`.
  - Leitura: o app chega ao `getUserMedia`/`MediaRecorder` e algo lança.
  - `RECORDING_FAILURE` sem `PERMISSION_DENIED` é o que se espera se o WebKit continuar respondendo com a **própria** captura (sem dispositivo) em vez do dublê. A atribuição `navigator.mediaDevices.getUserMedia = …` sobre o objeto do motor não se mantém nesse WebKit.
- Os 3 flaky (`tone-transfer` T4/T5/T6) são do `p1-primeira-conversa` e já apareciam antes. Não são desta wave.

### Correção seguinte (head depois de `b0713016`)

- O dublê troca o **acessor** `Navigator.prototype.mediaDevices`, não um método do objeto do motor.
- `MediaRecorder` é instalado com `defineProperty`.
- O dublê grava em `window.__syntheticMic` quais partes o app alcançou: instalação, `getUserMedia`, construtor e `start`. A mensagem de falha passa a trazer isso.
- Local (Chromium):
  - com o dublê forçado: 9/9;
  - caminho real com `rc2-2-20`: 15/15.

Nenhum assert removido, nenhum skip, nenhum timeout aumentado.

`PARENT_HOSTED_TRUTH_PASS` e `WEBKIT_CROSS_ENGINE_PASS` ficam `BLOCKED` na matriz até um run hospedado do WebKit sair verde.
