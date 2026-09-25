/**
 * RC2.2.17 — Guided Journey, Native Media Reliability & Release Completion.
 *
 * Nove gates sobre um estado carregado do repositório real:
 *   validateAudioPlaybackTruth        clique ≠ ouviu; nenhuma falha de áudio muda
 *   validateLessonAdvanceIntegrity    Continuar sempre avança; +1 passo por toque
 *   validateSpeechCapability          idioma ≠ permissão; fala nunca bloqueia
 *   validateSingleOnboarding          um fluxo; meta diária uma vez; placement opt-in
 *   validateGuidedLessonLayer         camada de apresentação, sem motor novo
 *   validateToneTruth                 contornos corretos; sem língua; sem nota falsa
 *   validateSettingsVisibility        Excluir conta em Conta; Aparência na Home
 *   validateReleaseResidual           package, assinatura, Play, #273, compras
 *   validateMobileInformationBudget   pílulas, cards aninhados, CTAs, campos
 * Cada um devolve [{ code, where, why }] (vazio = passa). Os `test:*` mutam o
 * estado e exigem o código de falha certo.
 *
 * Módulos puros (guia, capacidade de fala, contornos) são EXECUTADOS a partir
 * do texto do estado, para que uma mutação no código seja de fato executada.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256, CLOUD_CHECKS } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
export const RC2_2_17_BASE = { mainSha: "0c5ad5ae", pr289Head: "d3971c14", pr288Head: "22885244" };
export const RC2_2_17_QA_FIELDS = [
  "guidedTryAudioHeard",
  "guidedTryDegradedAudio",
  "ttsInstallFlow",
  "conversationAdvanceDevicePath",
  "recognitionSupportCheck",
  "recognitionModelDownload",
  "selfCompareRecording",
  "selfComparePrivacyDeletion",
  "singleOnboardingFirstRun",
  "dailyGoalOnce",
  "experiencedPlacementOptIn",
  "toneGuidedVisual",
  "deleteAccountVisible",
  "appearanceSystemMode",
];
const RESIDUAL_STATES = ["COMPLETE", "OWNER_ACTION_REQUIRED", "PHYSICAL_ACTION_REQUIRED"];
const FORBIDDEN_ENGINE_FILES = /(LessonEngineV2|GuidedJourneyEngine|OnboardingV3Engine|ToneEngineV2)\.(tsx?|mjs)$/;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

const FILES = {
  guided: "src/features/landing/GuidedTryPage.tsx",
  audio: "src/lib/audioPlayback.ts",
  tts: "src/lib/tts.ts",
  speakButton: "src/components/ui/SpeakButton.tsx",
  nativeSpeech: "src/lib/platform/nativeSpeech.ts",
  comecar: "src/features/onboarding/ComecarPage.tsx",
  draft: "src/lib/onboardingDraft.ts",
  postAuth: "src/services/postAuthOnboarding.ts",
  player: "src/features/lesson/LessonPlayer.tsx",
  steps: "src/features/lesson/steps.tsx",
  scene: "src/features/lesson/ConversationSceneStep.tsx",
  token: "src/components/hanzi/MandarinToken.tsx",
  trace: "src/lib/lessonStepTrace.ts",
  capability: "src/lib/recognitionCapability.ts",
  speech: "src/lib/speech.ts",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
  selfCompare: "src/features/lesson/SelfComparePractice.tsx",
  guidedLesson: "src/lib/guidedLesson.ts",
  guideLine: "src/components/guide/GuideLine.tsx",
  toneKnowledge: "src/data/toneKnowledge.ts",
  toneContour: "src/components/tone/ToneContour.tsx",
  articulation: "src/data/articulationTargets.ts",
  settingsPage: "src/features/settings/SettingsPage.tsx",
  categories: "src/features/settings/settingsCategories.ts",
  dangerZone: "src/components/account/DangerZone.tsx",
  resolvedTheme: "src/lib/useResolvedTheme.ts",
  password: "src/components/auth/PasswordField.tsx",
  store: "src/lib/store.ts",
  routes: "src/routes.tsx",
  subscription: "src/services/subscriptionService.ts",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  ptBR: "src/locales/pt-BR.ts",
  en: "src/locales/en.ts",
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx?|mjs)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, read(rel)]));
  src.plugin = read("android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java");
  src.buildGradle = read("android/app/build.gradle");
  src.capacitorConfig = read(fs.existsSync(path.join(ROOT, "capacitor.config.ts")) ? "capacitor.config.ts" : "capacitor.config.json");
  src.sceneSpec = read("e2e/conversation-scene-advance.spec.ts");
  src.onboardingSpec = read("e2e/rc2-2-17-guided-learning.spec.ts");
  return {
    srcFileNames: walk("src"),
    src,
    dataSafety: readJson("docs/release/play-data-safety.json"),
    residual: readJson("docs/release/rc2-2-16-residual.json"),
    billing: readJson("docs/release/android-billing-audit.json"),
    readiness: readJson("docs/release/android-release-readiness.json"),
    qa: readJson("docs/release/android-physical-qa.json"),
    operational: readJson("docs/release/rc1-operational-checks.json"),
    rc2CandidateSha256: await sha256(read("docs/release/rc2-candidate.json")),
    freeze: loadBetaPedagogyFreezeState(),
  };
}

function collector() {
  const failures = [];
  return { failures, fail: (code, where, why) => failures.push({ code, where, why }) };
}

export function report(name, failures) {
  if (!failures.length) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`;
}

let importSeq = 0;
const importCache = new Map();
/** Executa um módulo TS puro a partir do TEXTO (só `import type` é permitido). */
async function importTs(text) {
  if (importCache.has(text)) return importCache.get(text);
  const js = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2217-"));
  const file = path.join(dir, `m${importSeq++}.mjs`);
  fs.writeFileSync(file, js);
  try {
    const mod = await import(pathToFileURL(file).href);
    importCache.set(text, mod);
    return mod;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Corpo `{…}` de uma função a partir da assinatura (conta chaves). */
function fnBody(text, signature) {
  const start = String(text).indexOf(signature);
  if (start < 0) return "";
  // Assinatura que já termina em "{" (arrow/objeto): o corpo começa ali.
  const head = signature.trimEnd().endsWith("{") ? { index: signature.length, 0: "" } : /\)\s*(?::\s*[^{=]+)?\{/.exec(text.slice(start));
  if (!head) return "";
  let index = start + head.index + head[0].length;
  let depth = 1;
  const begin = index;
  while (index < text.length && depth > 0) {
    const ch = text[index];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    index += 1;
  }
  return text.slice(begin, index - 1);
}

function localeBlock(text, ns) {
  const start = String(text).indexOf(`\n  ${ns}: {`);
  if (start < 0) return "";
  const end = String(text).indexOf("\n  },", start);
  return String(text).slice(start, end < 0 ? undefined : end);
}
const localeValue = (text, ns, key) => new RegExp(`\\n    ${key}: "([^"]*)"`).exec(localeBlock(text, ns))?.[1];

function sectionBlock(text, id) {
  const start = String(text).indexOf(`\n    ${id}: (`);
  if (start < 0) return "";
  const end = String(text).indexOf("\n    ),", start);
  return String(text).slice(start, end < 0 ? undefined : end);
}

function freezeInvariants(s, fail) {
  if (!/export const RC2_2_17_GUIDED_LEARNING_RELIABILITY_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-17-guided-learning-reliability"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_17_GUIDED_LEARNING_RELIABILITY_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze))
    fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
}

// ── 1. Áudio ──────────────────────────────────────────────────────────────

export async function validateAudioPlaybackTruth(s) {
  const { failures, fail } = collector();
  const guided = stripComments(s.src.guided);
  const audio = stripComments(s.src.audio);
  const button = stripComments(s.src.speakButton);
  const tts = stripComments(s.src.tts);
  const plugin = stripComments(s.src.plugin);

  // A1 — o passo "Ouça" só vira ouvido depois do motor confirmar.
  const play = fnBody(guided, "function playNihao(");
  const heardAt = play.indexOf('setAudioResult("AUDIO_HEARD")');
  const startedAt = play.indexOf("if (outcome.started)");
  if (!/playMandarinAudio\(NIHAO\.hanzi/.test(play) || startedAt < 0 || heardAt < startedAt || /setHeard\(true\)/.test(guided))
    fail("GUIDED_HEARD_ON_CLICK", "GuidedTryPage.tsx playNihao()", "AUDIO_HEARD só depois de outcome.started (clique ≠ ouviu)");
  if (!/const heard = listen === "HEARD" \|\| listen === "PLAYING";/.test(guided))
    fail("GUIDED_HEARD_ON_CLICK", "GuidedTryPage.tsx", "heard deriva do estado real de reprodução");

  // A2 — falha nunca libera o Continuar em silêncio.
  if (!/state === "FAILED"\) setListen\(\(prev\) => \(prev === "HEARD" \? prev : "FAILED"\)\)/.test(guided) || !/state === "UNAVAILABLE"\) setListen\(\(prev\) => \(prev === "HEARD" \? prev : "UNAVAILABLE"\)\)/.test(guided))
    fail("TTS_FAIL_ENABLES_CONTINUE", "GuidedTryPage.tsx applyPlayback()", "FAILED/UNAVAILABLE não viram HEARD");
  if (!/: \{ label: t\("guidedTry\.continue"\), disabled: true, onClick: \(\) => undefined, testId: "listen-continue" \}/.test(guided) || !/setAudioResult\("DEGRADED_AUDIO"\);\s*go\("explain"\);/.test(guided))
    fail("TTS_FAIL_ENABLES_CONTINUE", "GuidedTryPage.tsx listenAction", "Continuar só com áudio real OU 'Continuar sem áudio' explícito");
  if (!/if \(!outcome\.started\) \{\s*\/\/[^\n]*\n\s*onError\(outcome\.reason \?\? "ENDED_WITHOUT_START"\);/.test(s.src.audio) && !/if \(!outcome\.started\) \{\s*onError\(outcome\.reason \?\? "ENDED_WITHOUT_START"\);/.test(audio))
    fail("TTS_FAIL_ENABLES_CONTINUE", "audioPlayback.ts onEnd", "terminar sem começar = falha, não 'ouvido'");
  if (!/NO_START_TIMEOUT/.test(audio)) fail("AUDIO_SILENT_FAILURE", "audioPlayback.ts", "sem início no prazo = falha perceptível");

  // A3 — botão de áudio nunca falha calado.
  if (!/if \(outcome\.started\) return;[\s\S]{0,200}setFailed\(true\);\s*setFailReason\(outcome\.reason\);/.test(button) || !/role="status"\s+data-testid="speak-status"/.test(button))
    fail("AUDIO_SILENT_FAILURE", "SpeakButton.tsx", "toque que não tocou mostra status");

  // A4 — voz chinesa ausente oferece instalação e reconsulta.
  if (!/return usesNativeVoice\(\) && isVoiceMissingReason\(reason\);/.test(audio) || !/reason === "TTS_LANGUAGE_MISSING_DATA"/.test(audio))
    fail("TTS_INSTALL_MISSING", "audioPlayback.ts canOfferVoiceInstall()", "TTS_LANGUAGE_MISSING_DATA oferece instalar");
  if (!/ACTION_INSTALL_TTS_DATA/.test(plugin) || !/public void installTtsData\(PluginCall call\)/.test(plugin) || !/data-testid="guided-audio-install"/.test(guided) || !/refreshNativeTtsStatus\(\)/.test(button))
    fail("TTS_INSTALL_MISSING", "LongyuSpeechPlugin/GuidedTry/SpeakButton", "Instalar voz chinesa + refresh do status");

  // A5 — placement não pune falha técnica de áudio.
  const skip = fnBody(stripComments(s.src.comecar), "function skipTechnical(");
  if (!skip || /appendPendingAnswer\(/.test(skip) || !/<PlacementAudio key=\{question\.id\} text=\{question\.audioText\} onTechnicalSkip=\{onTechnicalSkip\} \/>/.test(s.src.comecar))
    fail("PLACEMENT_AUDIO_PENALIZED", "ComecarPage.tsx", "áudio que falhou = TECHNICAL_SKIP, nunca resposta errada");

  // A6 — tarefa diária "ouviu áudio" só com reprodução real.
  for (const match of button.matchAll(/recordDailyTask\("audioHeard"\)/g)) {
    const before = button.slice(Math.max(0, match.index - 90), match.index);
    if (!/state === "PLAYING"\)\s*$/.test(before) && !/onstart: \(\) => $/.test(before))
      fail("DAILY_AUDIO_WITHOUT_PLAYBACK", "SpeakButton.tsx", "audioHeard só no início real da fala (PLAYING/onstart)");
  }
  if (!/onStart\(String utteranceId\) \{[\s\S]{0,300}notifyListeners\("ttsState", event\)/.test(plugin) || !/utteranceId\.equals\(currentUtteranceId\)/.test(plugin))
    fail("TTS_START_UNCONFIRMED", "LongyuSpeechPlugin.java", "onStart do motor emite ttsState; só a fala corrente resolve");
  if (!/u\.onstart = \(\) => opts\.onstart\?\.\(\);/.test(tts)) fail("TTS_START_UNCONFIRMED", "tts.ts", "Web: onstart da utterance");
  freezeInvariants(s, fail);
  return failures;
}

// ── 2. Avanço da lição ────────────────────────────────────────────────────

export async function validateLessonAdvanceIntegrity(s) {
  const { failures, fail } = collector();
  const scene = stripComments(s.src.scene);
  const steps = stripComments(s.src.steps);
  const player = stripComments(s.src.player);
  const token = stripComments(s.src.token);
  const spec = s.src.sceneSpec;

  // 7 — a cena termina chamando onDone e o teste cobre o caminho da captura.
  if (!/function finish\(\) \{[\s\S]{0,400}onDone\(!hadMistakeRef\.current, \{/.test(scene))
    fail("SCENE_NOT_ADVANCING", "ConversationSceneStep.tsx finish()", "fim da cena chama onDone");
  if (!/p1-primeira-conversa", masteryLevel: 2, stage: "Etapa 4\/6"/.test(spec) || !/after === target\.index \+ 1/.test(spec) || !/SCENE_LESSONS/.test(spec))
    fail("SCENE_NOT_ADVANCING", "e2e/conversation-scene-advance.spec.ts", "integração: caminho da captura + todas as cenas");

  // 8 — o latch do StepRenderer entrega a conclusão ao player.
  if (!/completionSentRef\.current = true;\s*lastCompletionRef\.current = \{ correct, meta \};\s*try \{\s*parentOnDoneRef\.current\(correct, meta\);/.test(steps))
    fail("LATCH_DROPS_ONDONE", "steps.tsx StepRenderer", "latch repassa onDone ao player");

  // 9 — a chave de conclusão nunca prende o passo.
  if (!/catch \(error\) \{[\s\S]{0,400}completedStepKeyRef\.current = null;[\s\S]{0,600}setIdx\(idx \+ 1\);/.test(player) || !/safeSideEffect\("conversation"/.test(player) || !/safeSideEffect\("pedagogy"/.test(player))
    fail("COMPLETION_KEY_BLOCKS", "LessonPlayer.tsx handleDone()", "efeito colateral isolado; falha libera a chave e avança");

  // 10 — um toque = +1 passo.
  if (!/if \(completedStepKeyRef\.current === completionKey\) \{[\s\S]{0,260}return;\s*\}/.test(player) || !/um toque = \+1 passo/.test(spec))
    fail("DOUBLE_ADVANCE", "LessonPlayer.tsx", "conclusão duplicada não avança de novo");

  // 11 — ramo de erro não repete a mesma fala para sempre.
  if (!/wrongByNodeRef\.current\.set\(node\.id, wrongHere\);/.test(scene) || !/if \(wrongHere >= 2\) \{[\s\S]{0,300}setRevealPending\(/.test(scene) || !/data-testid="conversation-reveal-continue"/.test(scene))
    fail("SAME_TEXT_LOOP", "ConversationSceneStep.tsx", "2º erro na mesma fala mostra a resposta e segue");

  // 12 — voltar do background não trava a cena.
  const advance = fnBody(scene, "function advance(");
  if (!advance || /visibilityState|document\.hidden|isPlaying|playingRef/.test(advance))
    fail("RESUME_BLOCKS_SCENE", "ConversationSceneStep.tsx advance()", "Continuar não depende de visibilidade/áudio");

  // 13 — tentar de novo mantém a interação completável.
  if (!/onClick=\{retry\}/.test(scene) || !/function retry\(\) \{[\s\S]{0,300}setFeedback\(null\);/.test(scene))
    fail("RETRY_UNCOMPLETABLE", "ConversationSceneStep.tsx InteractionPanel", "Tentar de novo reabre a interação");

  // 14 — toque na opção chega ao botão (hànzì aninhado não sequestra).
  if (!/const effectiveActivation: MandarinTokenActivation = activation === "default" && nestedInButton \? "hover-hold" : activation;/.test(token) || !/if \(effectiveActivation === "hover-hold"\)/.test(token))
    fail("TAP_NOT_REACHING_HANDLER", "MandarinToken.tsx", "termo dentro de botão: tocar = botão; segurar = glossário");

  // R — rastro do toque ao avanço (DEV/E2E, sem PII).
  for (const event of ["scene_continue_pressed", "scene_onDone", "renderer_onDone", "player_handleDone", "completion_key", "side_effect_failed"]) {
    if (!new RegExp(`"${event}"`).test(s.src.trace)) fail("ADVANCE_TRACE_MISSING", "lessonStepTrace.ts", event);
  }
  if (!/return env\.DEV === true \|\| env\.VITE_USE_TEST_FIXTURES === "true";/.test(stripComments(s.src.trace)))
    fail("ADVANCE_TRACE_MISSING", "lessonStepTrace.ts", "rastro só em DEV/E2E");
  if (!/import\.meta\.env\.VITE_USE_TEST_FIXTURES === "true" \? answer : undefined/.test(scene))
    fail("QA_ANSWER_LEAK", "ConversationSceneStep.tsx", "data-qa-expected só em build de fixtures");
  freezeInvariants(s, fail);
  return failures;
}

// ── 3. Fala ───────────────────────────────────────────────────────────────

const SUPPORT = (patch = {}) => ({
  checked: true,
  serviceAvailable: true,
  onDeviceAvailable: true,
  installedOnDevice: false,
  pendingOnDevice: false,
  supportedOnDevice: false,
  online: false,
  sdk: 34,
  ...patch,
});

export async function validateSpeechCapability(s) {
  const { failures, fail } = collector();
  const plugin = stripComments(s.src.plugin);
  const practice = stripComments(s.src.pronunciation);
  const selfCompare = stripComments(s.src.selfCompare);
  let cap = null;
  try {
    cap = await importTs(s.src.capability);
  } catch (error) {
    fail("CAPABILITY_MODEL_BROKEN", "recognitionCapability.ts", String(error?.message ?? error));
  }
  if (cap) {
    const derive = (input) => cap.deriveRecognitionCapability({ native: true, recognizerPresent: true, microphone: "granted", support: SUPPORT(), ...input });
    // 15 — permissão concedida NÃO significa mandarim suportado.
    if (derive({}) !== "LANGUAGE_UNSUPPORTED" || derive({ lastErrorCode: "LANGUAGE_NOT_SUPPORTED", support: SUPPORT({ installedOnDevice: true }) }) !== "LANGUAGE_UNSUPPORTED" || derive({ lastErrorCode: "LANGUAGE_UNAVAILABLE", support: SUPPORT({ online: true }) }) !== "LANGUAGE_TEMP_UNAVAILABLE")
      fail("PERMISSION_AS_LANGUAGE", "recognitionCapability.ts", "microfone ok + zh-CN ausente = LANGUAGE_*, nunca READY");
    if (derive({ support: SUPPORT({ installedOnDevice: true }), microphone: "denied" }) !== "PERMISSION_REQUIRED" || derive({ support: SUPPORT({ online: true }) }) !== "READY")
      fail("PERMISSION_AS_LANGUAGE", "recognitionCapability.ts", "permissão é estado próprio (PERMISSION_REQUIRED / READY)");
    if (derive({ support: SUPPORT({ checked: false, sdk: 30 }) }) !== "UNKNOWN_SUPPORT" || derive({ support: SUPPORT({ serviceAvailable: false, onDeviceAvailable: false }) }) !== "SERVICE_UNAVAILABLE")
      fail("CAPABILITY_MODEL_BROKEN", "recognitionCapability.ts", "UNKNOWN_SUPPORT (API < 33) / SERVICE_UNAVAILABLE");
    // 16 — zh-CN indisponível nunca bloqueia a lição.
    for (const state of ["LANGUAGE_UNSUPPORTED", "LANGUAGE_TEMP_UNAVAILABLE", "SERVICE_UNAVAILABLE", "MODEL_DOWNLOAD_REQUIRED"]) {
      if (cap.speakingModeFor(state, true) !== "self_compare" || cap.speakingModeFor(state, false) !== "model_only")
        fail("ZH_UNSUPPORTED_BLOCKS", `speakingModeFor(${state})`, "gravar e comparar; sem gravação, modelo + seguir");
    }
    // 17 — modelo ausente = download.
    if (derive({ support: SUPPORT({ supportedOnDevice: true }) }) !== "MODEL_DOWNLOAD_REQUIRED" || !cap.canOfferModelDownload("MODEL_DOWNLOAD_REQUIRED", SUPPORT({ supportedOnDevice: true })))
      fail("MODEL_DOWNLOAD_MISSING", "recognitionCapability.ts", "supportedOnDevice sem instalado = MODEL_DOWNLOAD_REQUIRED + oferta");
  }
  if (!/SpeechRecognizer\.createOnDeviceSpeechRecognizer[\s\S]{0,200}checkRecognitionSupport\(recognitionIntent\(language\)/.test(plugin) || !/Build\.VERSION_CODES\.TIRAMISU/.test(plugin))
    fail("SUPPORT_CHECK_MISSING", "LongyuSpeechPlugin.java", "API 33+: checkRecognitionSupport antes da fala");
  if (!/void checkMandarinRecognitionSupport\(\)\.then/.test(practice))
    fail("SUPPORT_CHECK_MISSING", "PronunciationPractice.tsx", "checa suporte ao montar (antes da primeira fala)");
  if (!/triggerModelDownload\(recognitionIntent\(language\), getContext\(\)\.getMainExecutor\(\), new ModelDownloadListener\(\)/.test(plugin) || !/data-testid="speech-model-download-start"/.test(practice) || !/t\("player\.speechScheduled"\)/.test(practice))
    fail("MODEL_DOWNLOAD_MISSING", "plugin/PronunciationPractice", "Baixar suporte + Preparando/Baixando/Pronto/agendado");
  // 18 — sem reconhecedor: autoavaliação, sem insistir.
  if (!/if \(recognitionErrorForcesFallback\(code\)\) \{[\s\S]{0,160}setForcedFallback\(true\);/.test(practice) || !/<SelfComparePractice /.test(practice))
    fail("RECOGNIZER_NO_FALLBACK", "PronunciationPractice.tsx", "idioma/serviço indisponível → self-compare");
  // 19 — gravação nunca sai do aparelho.
  const recordingCode = `${selfCompare}\n${fnBody(plugin, "public void startPracticeRecording(")}\n${fnBody(plugin, "public void playPracticeRecording(")}`;
  if (/\bfetch\(|supabase|upload|trackPedagogyEvent|trackFunnelEvent|analytics|sendBeacon|XMLHttpRequest/i.test(recordingCode))
    fail("RECORDING_UPLOADED", "SelfComparePractice/plugin", "gravação de prática nunca vai para nuvem/analytics");
  // 20 — gravação não fica persistida.
  if (!/discardPracticeRecording\(\);/.test(fnBody(plugin, "protected void handleOnPause(")) || !/discardPracticeRecording\(\);/.test(fnBody(plugin, "protected void handleOnDestroy(")) || !/new File\(getContext\(\)\.getCacheDir\(\), "longyu-practice\.m4a"\)/.test(plugin) || !/URL\.revokeObjectURL\(webUrlRef\.current\)/.test(selfCompare) || !/void nativeDeletePracticeRecording\(\)/.test(selfCompare))
    fail("RECORDING_PERSISTED", "plugin/SelfComparePractice", "cache temporário, apagado ao sair/background/nova gravação");
  // 21 — autoavaliação não dá nota.
  if (/toneScore|pronunciationAccuracy|perfectTone|accuracy\s*[:=]|\d+\s*%/.test(`${selfCompare}\n${stripComments(s.src.capability)}`))
    fail("SELF_COMPARE_SCORES", "SelfComparePractice/recognitionCapability", "sem toneScore/acurácia/tom perfeito");
  // 22 — Continuar sozinho não é tentativa de fala.
  if ((selfCompare.match(/recordSpeechAttempt\(/g) ?? []).length !== 1 || (selfCompare.match(/countAttempt\(\);/g) ?? []).length !== 2)
    fail("FAKE_SPEECH_ATTEMPT", "SelfComparePractice.tsx", "tentativa só após gravação real concluída");
  // 23 — reconhecedor sempre destruído.
  if (!/private void releaseRecognizer\(\) \{[\s\S]{0,400}recognizer\.destroy\(\);/.test(plugin) || !/supportProbe\.destroy\(\);/.test(plugin))
    fail("RECOGNIZER_NOT_DESTROYED", "LongyuSpeechPlugin.java", "releaseRecognizer/probe destroem o SpeechRecognizer");
  // 24 — nunca dois reconhecedores.
  if (!/if \(recognitionInFlight\) return \{ ok: false, code: "RECOGNIZER_BUSY" \};/.test(s.src.nativeSpeech) || !/if \(recognitionCall != null\) \{\s*\/\/[^\n]*\n\s*call\.reject\("recognizer busy", "RECOGNIZER_BUSY"\);/.test(s.src.plugin))
    fail("SECOND_RECOGNIZER", "nativeSpeech/plugin", "uma escuta por vez (RECOGNIZER_BUSY)");
  if (!/Sua gravação fica temporariamente neste aparelho e não é enviada ao Longyu\./.test(s.src.ptBR))
    fail("RECORDING_PRIVACY_COPY", "pt-BR.ts", "aviso de privacidade da gravação");
  freezeInvariants(s, fail);
  return failures;
}

// ── 4. Onboarding ─────────────────────────────────────────────────────────

export async function validateSingleOnboarding(s) {
  const { failures, fail } = collector();
  const comecar = stripComments(s.src.comecar);
  const guided = stripComments(s.src.guided);
  const stepsFor = fnBody(comecar, "function stepsFor(");
  // 25 — iniciante nunca cai no placement obrigatório.
  const beginnerLine = /\n\s*return (\[[^\]]*\]);\s*$/.exec(stepsFor)?.[1] ?? "";
  if (!beginnerLine || /"quiz"|"level"|"result"/.test(beginnerLine) || !/navigate\("\/teste-guiado"\);/.test(comecar))
    fail("BEGINNER_MANDATORY_PLACEMENT", "ComecarPage.tsx stepsFor()", "iniciante: welcome → Teste guiado → meta → conta");
  // 26 — meta diária aparece uma vez.
  if ((comecar.match(/<DailyGoalStep /g) ?? []).length !== 1 || !/export const CANONICAL_DAILY_GOAL_STEP = "dailyGoal" as const;/.test(comecar) || /dailyGoal/i.test(guided))
    fail("DAILY_GOAL_TWICE", "ComecarPage.tsx", "CANONICAL_DAILY_GOAL_STEP uma única vez");
  const draft = stripComments(s.src.draft);
  if (!/export const DAILY_GOAL_OPTIONS = \[5, 10, 15, 20\] as const;/.test(draft))
    fail("DAILY_GOAL_TWICE", "onboardingDraft.ts", "opções canônicas 5/10/15/20");
  // 27 — Teste guiado não dá domínio.
  const apply = fnBody(stripComments(s.src.postAuth), "export function applyOnboardingDraft(");
  if (!apply || /completedLessons|lessonMastery|markLearned|gradeSrs|ensureSrs|addXp|recordStudyDay|completeLesson|setLessonStars/i.test(apply) || !/recordGuidedTryExposure\(/.test(apply))
    fail("GUIDED_TRY_MASTERY", "postAuthOnboarding.ts applyOnboardingDraft()", "só GUIDED_TRY_EXPOSURE + meta diária");
  // 28 — Teste guiado não dá XP.
  if (/useStore|addXp|grantPracticeRoundXp|claimReward|recordStudyDay|points|markLearned|gradeSrs|ensureSrs/.test(guided))
    fail("GUIDED_TRY_XP", "GuidedTryPage.tsx", "sem XP, Qi, SRS ou ofensiva");
  // 29 — Teste guiado não conclui lição.
  const exposure = fnBody(stripComments(s.src.store), "recordGuidedTryExposure: ({ at, audio }) => {");
  if (!exposure || /completedLessons|lessonStarsById|lessonMasteryById|xpTotal/.test(exposure))
    fail("GUIDED_TRY_COMPLETES_LESSON", "store.ts recordGuidedTryExposure", "exposição não conclui lição");
  // 30 — experiente mantém o teste de nível.
  if (!/if \(path === "experienced" && wantsPlacement\) return \["welcome", "dailyGoal", "placementOffer", "level", "quiz", "result", "account"\];/.test(comecar) || !/data-testid="placement-offer-test"/.test(comecar) || !/chooseNextQuestion\(level, \[\], \[\]\)/.test(comecar))
    fail("EXPERIENCED_LOSES_PLACEMENT", "ComecarPage.tsx", "Já estudo → Fazer teste de nível (opt-in)");
  // 31 — idioma não é perguntado de novo.
  if (/LanguageSelect|LocalePicker|InterfaceLanguage|setInterfaceLocale|LanguageSheet/.test(`${comecar}\n${guided}`))
    fail("LOCALE_ASKED_AGAIN", "ComecarPage/GuidedTry", "idioma vem do sistema; curso só pelo picker");
  // 32 — curso escolhido antes do Teste guiado e do onboarding.
  if (!/if \(!hasCourseDirection\(\)\) return <Navigate to="\/curso\?next=%2Fteste-guiado" replace \/>;/.test(guided) || !/if \(!hasCourseDirection\(\)\) return <Navigate to="\/curso\?next=%2Fcomecar" replace \/>;/.test(comecar))
    fail("COURSE_PICKER_REGRESSED", "GuidedTryPage/ComecarRoute", "curso (uma vez) antes do Teste guiado e do onboarding");
  if (!/markGuidedTryCompleted\(audioResult \?\? "DEGRADED_AUDIO"\);\s*navigate\("\/comecar"\);/.test(guided) || !/draft\.guidedTryCompleted \? "dailyGoal" : "welcome"/.test(comecar))
    fail("GUIDED_TRY_HANDOFF", "GuidedTry → ComecarPage", "fim do Teste guiado → meta diária");
  if (!/applyOnboardingDraft\(\);\s*useStore\.getState\(\)\.setAccountSetupComplete\(true\);/.test(s.src.postAuth))
    fail("GUIDED_TRY_HANDOFF", "postAuthOnboarding.ts", "rascunho aplicado depois da conta");
  if (!/Fresh PT|fresh PT|beginner/.test(s.src.onboardingSpec) || !/e\.g\. Alex/.test(s.src.onboardingSpec) || !/placement-offer-test/.test(s.src.onboardingSpec))
    fail("ONBOARDING_E2E_MISSING", "e2e/rc2-2-17-guided-learning.spec.ts", "E2E PT, EN e experiente");
  freezeInvariants(s, fail);
  return failures;
}

// ── 5. Camada guiada ──────────────────────────────────────────────────────

export async function validateGuidedLessonLayer(s) {
  const { failures, fail } = collector();
  const player = stripComments(s.src.player);
  // 33 — nada de segundo motor.
  const engines = s.srcFileNames.filter((rel) => FORBIDDEN_ENGINE_FILES.test(rel));
  if (engines.length || /StepRenderer|LessonPlayer/.test(stripComments(s.src.guidedLesson)) || !/<StepRenderer\s/.test(player))
    fail("SECOND_ENGINE", engines.join(", ") || "guidedLesson.ts", "camada de apresentação sobre o LessonPlayer atual");
  let guide = null;
  try {
    guide = await importTs(s.src.guidedLesson);
  } catch (error) {
    fail("GUIDANCE_BROKEN", "guidedLesson.ts", String(error?.message ?? error));
  }
  if (guide) {
    const max = guide.GUIDE_LINE_MAX_CHARS ?? 0;
    // 34 — primeiras lições não viram parede de texto.
    for (const [text, where] of [
      [localeValue(s.src.ptBR, "player", "guidedPrepare"), "pt player.guidedPrepare"],
      [localeValue(s.src.ptBR, "player", "guidedBridgeNihao"), "pt player.guidedBridgeNihao"],
      [localeValue(s.src.en, "player", "guidedPrepare"), "en player.guidedPrepare"],
      [localeValue(s.src.ptBR, "guidedTry", "introLine"), "pt guidedTry.introLine"],
    ]) {
      if (!text || text.length > max || max > 160) fail("WALL_OF_TEXT", where, `fala do Dragão ≤ ${max} caracteres`);
    }
    const level = (input) => guide.guidanceLevelForLesson({ position: 0, ...input });
    // 36 — prova continua prova.
    if (level({ assessment: true }) !== "NONE" || guide.showsPrepareLine("NONE"))
      fail("ASSESSMENT_GUIDED", "guidanceLevelForLesson", "Placement/desafios/transferência pontuada: NONE");
    // 37 — revisão curta.
    if (level({ isReview: true }) !== "LOW" || guide.showsPrepareLine("LOW"))
      fail("REVIEW_BECAME_TUTORIAL", "guidanceLevelForLesson", "revisão = LOW (feedback + próxima ação)");
    // 38 — imersão natural.
    if (level({ curriculumRole: "immersion" }) !== "LOW")
      fail("IMMERSION_LOST_NATURALNESS", "guidanceLevelForLesson", "imersão = LOW");
    if (level({ position: 0 }) !== "HIGH" || level({ position: 30 }) !== "MEDIUM" || level({ position: 100 }) !== "LOW" || level({ position: 0, priorMastery: 2 }) !== "MEDIUM")
      fail("GUIDANCE_DOES_NOT_FADE", "guidanceLevelForLesson", "HIGH (≤20) → MEDIUM → LOW; domínio anterior reduz");
    if (guide.guidedPhaseForStep("intro", 0) !== "PREPARE" || guide.guidedPhaseForStep("conversation_scene", 3) !== "USE" || guide.guidedPhaseForStep("listen_select", 2) !== "TRY")
      fail("GUIDANCE_BROKEN", "guidedPhaseForStep", "PREPARE → NOTICE → TRY → USE");
    if (!guide.guidedTryBridgeApplies("l2", true) || guide.guidedTryBridgeApplies("l2", false))
      fail("GUIDED_TRY_BRIDGE", "guidedLesson.ts", "l2 reconhece o 你好 do Teste guiado, sem pular avaliação");
  }
  // 35 — Dragão não repete a abertura.
  if (!/const opening = idx === 0 && showsPrepareLine\(guidance\) && \(bridge \|\| lesson\.steps\[0\]\?\.kind !== "intro"\);/.test(player))
    fail("DRAGON_REPEATS", "LessonPlayer.tsx", "fala de abertura só sem intro do Dragão no 1º passo");
  if (!/data-guidance-level=\{guidance\}/.test(player) || !/data-guided-phase=\{guidedPhaseForStep\(step\.kind, idx\)\}/.test(player))
    fail("GUIDANCE_BROKEN", "LessonPlayer.tsx", "fase e nível guiado expostos no quadro do passo");
  freezeInvariants(s, fail);
  return failures;
}

// ── 6. Tons ───────────────────────────────────────────────────────────────

export async function validateToneTruth(s) {
  const { failures, fail } = collector();
  let tones = null;
  try {
    tones = await importTs(s.src.toneKnowledge);
  } catch (error) {
    fail("TONE_MODEL_BROKEN", "toneKnowledge.ts", String(error?.message ?? error));
  }
  if (tones) {
    const h = (n) => tones.toneGuidance(n).heights;
    const increasing = (xs) => xs.every((x, i) => i === 0 || x > xs[i - 1]);
    const decreasing = (xs) => xs.every((x, i) => i === 0 || x < xs[i - 1]);
    if (!h(1).every((x) => x === 5)) fail("TONE1_NOT_LEVEL", "toneGuidance(1)", "alto e estável");
    if (!increasing(h(2))) fail("TONE2_NOT_RISING", "toneGuidance(2)", "a voz sobe");
    const t3 = h(3);
    const third = tones.toneGuidance(3);
    if (Math.min(...t3) > 1 || t3[t3.length - 1] > 3 || t3[t3.length - 1] >= t3[0] + 2 || /sempre|always|por completo sempre|fully rises/i.test(`${third.guidedPt} ${third.guidedEn}`.replace(/não sobe por completo|does not fully rise/g, "")))
      fail("TONE3_FULL_DIP", "toneGuidance(3)", "baixo; na fala natural o final muitas vezes não sobe por completo");
    if (!/na fala natural/.test(tones.toneKnowledge(3).learnerDescriptionPt)) fail("TONE3_FULL_DIP", "toneKnowledge(3)", "cópia honesta do 3º tom preservada");
    if (!decreasing(h(4))) fail("TONE4_NOT_FALLING", "toneGuidance(4)", "alto → baixo, firme");
    const neutral = tones.toneGuidance(5);
    if (neutral.heights.length !== 1 || neutral.durationMs >= 500 || /quinto|5º tom|fifth/i.test(`${neutral.guidedPt} ${neutral.guidedEn}`))
      fail("NEUTRAL_AS_CONTOUR", "toneGuidance(5)", "curto e leve; nunca 'quinto contorno'");
    // 45 — sem nota de pitch.
    if (tones.TONE_PRODUCTION_EVIDENCE_STATUS !== "NO_PITCH_MEASUREMENT")
      fail("FAKE_PITCH_SCORE", "toneKnowledge.ts", "ToneProductionEvidence = NO_PITCH_MEASUREMENT");
  }
  // 44 — língua não explica tom.
  const toneCopy = stripComments(`${s.src.toneContour}\n${s.src.toneKnowledge}`);
  if (/l[ií]ngua|tongue|\bboca\b|mouth|l[aá]bio|\blips?\b/i.test(toneCopy))
    fail("TONGUE_EXPLAINS_PITCH", "ToneContour/toneKnowledge", "tom = contorno de altura; articulação é outro sistema");
  if (!/ArticulationContrastId/.test(s.src.articulation) || /ToneContour|toneGuidance/.test(stripComments(s.src.articulation)))
    fail("TONGUE_EXPLAINS_PITCH", "articulationTargets.ts", "articulação separada de tom");
  if (/toneScore|pitchAccuracy|\d+\s*%\s*(correto|correct)|tom perfeito|perfect tone/i.test(stripComments(`${s.src.toneContour}\n${s.src.steps}\n${s.src.pronunciation}`)))
    fail("FAKE_PITCH_SCORE", "ToneContour/steps/PronunciationPractice", "sem percentual de tom sem analisador");
  const contour = stripComments(s.src.toneContour);
  if (!/<animateMotion /.test(contour) || !/prefers-reduced-motion: reduce/.test(contour) || !/data-tone-gesture/.test(contour) || !/data-tone-dot="static"/.test(contour))
    fail("TONE_VISUAL_MISSING", "ToneContour.tsx", "ponto animado, gesto, estado final estático com reduced motion");
  if (!/guided\s+gesture\s+heightScale\s+playKey=\{listenCount\}/.test(s.src.steps))
    fail("TONE_VISUAL_MISSING", "steps.tsx StepTone", "passo de tom usa o contorno guiado sincronizado ao áudio");
  freezeInvariants(s, fail);
  return failures;
}

// ── 7. Ajustes ────────────────────────────────────────────────────────────

export async function validateSettingsVisibility(s) {
  const { failures, fail } = collector();
  const page = stripComments(s.src.settingsPage);
  // 46 — Excluir conta no fim de Conta, não em Avançado.
  const conta = sectionBlock(page, "conta");
  if (!/<DangerZone \/>\s*$/.test(conta.trimEnd().replace(/\n\s*<\/>$/, "")) && !/<DangerZone \/>\s*<\/>/.test(conta + "\n      </>"))
    fail("DELETE_ACCOUNT_HIDDEN", "SettingsPage.tsx conta", "Zona de perigo no FIM de Conta");
  if (!/<DangerZone \/>/.test(conta) || /DangerZone|requestAccountDeletion/.test(sectionBlock(page, "avancado")))
    fail("DELETE_ACCOUNT_HIDDEN", "SettingsPage.tsx", "Excluir minha conta visível em Conta, fora de Avançado");
  const danger = stripComments(s.src.dangerZone);
  if (!/phrase\.trim\(\) === ACCOUNT_DELETION_CONFIRMATION_TEXT/.test(danger) || !/requestAccountDeletion\(phrase\.trim\(\)\)/.test(danger) || !/disabled=\{!ready \|\| busy\}/.test(danger))
    fail("DELETE_WITHOUT_CONFIRMATION", "DangerZone.tsx", "tela de confirmação + frase exata + backend atual");
  // 47 — Aparência na Home de Ajustes.
  if (!/\{ id: "aparencia", titleKey: "settings\.catAppearance"/.test(s.src.categories) || !/data-testid="appearance-mode"/.test(sectionBlock(page, "aparencia")) || !/\(\["system", "light", "dark"\] as AppearanceMode\[\]\)/.test(page))
    fail("APPEARANCE_HIDDEN", "Settings", "Aparência (Sistema/Claro/Escuro) direto na Home de Ajustes");
  // 48–49 — exemplos localizados.
  const ptName = localeValue(s.src.ptBR, "onboarding", "namePlaceholder");
  const ptUser = localeValue(s.src.ptBR, "auth", "usernamePlaceholder");
  const enName = localeValue(s.src.en, "onboarding", "namePlaceholder");
  const enUser = localeValue(s.src.en, "auth", "usernamePlaceholder");
  if (/matheus/i.test(`${ptName} ${ptUser} ${enName} ${enUser}`) || ptName !== "Ex.: Mariana" || ptUser !== "ex.: mariana_zh")
    fail("PLACEHOLDER_PERSONAL_NAME", "pt-BR.ts", 'Nome "Ex.: Mariana", usuário "ex.: mariana_zh" (nunca nome real)');
  if (!/^e\.g\. /.test(enName ?? "") || !/^e\.g\. /.test(enUser ?? "") || /Ex\.:|ex\.:/.test(`${enName} ${enUser}`))
    fail("EN_PLACEHOLDER_NOT_LOCALIZED", "en.ts", 'Name "e.g. Alex", username "e.g. alex_zh"');
  // 50 — requisitos de senha progressivos.
  if (!/<PasswordRequirements password=\{password\} confirmation=\{passwordConfirm\} className="mt-2" progressive focused=\{passwordFocused\} \/>/.test(s.src.comecar) || !/const expanded = focused \|\| \(password\.length > 0 && !requiredOk\);/.test(s.src.password))
    fail("PASSWORD_CARD_ALWAYS", "ComecarPage/PasswordField", "requisitos só com foco ou faltando; depois compactos");
  freezeInvariants(s, fail);
  return failures;
}

// ── 8. Release (resíduo RC2.2.16) ─────────────────────────────────────────

export async function validateReleaseResidual(s) {
  const { failures, fail } = collector();
  // 51 — package.
  if (!/appId: "longyu\.noba\.com"/.test(s.src.capacitorConfig) || !/applicationId "longyu\.noba\.com"/.test(s.src.buildGradle) || /com\.longyu\.app/.test(`${s.src.capacitorConfig}\n${s.src.buildGradle}`) || s.residual?.regression?.packageName !== "longyu.noba.com")
    fail("PACKAGE_CHANGED", "capacitor/build.gradle", "package segue longyu.noba.com");
  // 52 — assinatura debug nunca vale release.
  const release = /release \{([\s\S]*?)\n\s{8}\}/.exec(s.src.buildGradle)?.[1] ?? "";
  if (/signingConfigs\.debug/.test(release) || (s.residual?.items?.realSignedAab?.status === "SIGNED_AAB_READY" && s.residual.items.realSignedAab.uploadKeyReal !== true) || (s.readiness?.status?.SIGNED_AAB_READY === true && !s.readiness?.signatureEvidence))
    fail("DEBUG_SIGNING_ACCEPTED", "build.gradle/residual", "SIGNED_AAB_READY só com upload key real");
  // 53 — instalação Play só com evidência.
  const items = s.residual?.items ?? {};
  for (const key of ["internalPlay", "playUpdateNtoN1"]) {
    if (items[key]?.status === "COMPLETE" && !items[key]?.evidence) fail("FAKE_PLAY_INSTALL", `residual.${key}`, "COMPLETE exige evidência do aparelho/Play");
  }
  if (s.qa?.playInstall === "PASS" && !s.qa?.deviceModel) fail("FAKE_PLAY_INSTALL", "android-physical-qa.json", "PASS de instalação sem aparelho");
  // 54 — resíduo não vira COMPLETE sem evidência.
  const overall = s.residual?.RC2_2_16_RESIDUAL;
  const allComplete = Object.values(items).every((item) => item?.status === "COMPLETE" && item?.evidence);
  if (!RESIDUAL_STATES.includes(overall) || (overall === "COMPLETE" && !allComplete))
    fail("RESIDUAL_FAKE_COMPLETE", "rc2-2-16-residual.json", "COMPLETE só com todos os itens evidenciados");
  for (const key of ["playPackageConfirmation", "developerVerification"]) {
    if (items[key]?.status === "COMPLETE" && !items[key]?.evidence) fail("RESIDUAL_FAKE_COMPLETE", `residual.${key}`, "confirmação do owner exige evidência");
  }
  // 55 — #273 intocada.
  for (const id of CLOUD_CHECKS) if (s.operational.checks?.[id]?.pass !== false) fail("CLOUD_273_TOUCHED", id, "cloud segue adiada (#273)");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("CLOUD_273_TOUCHED", "rc2-candidate.json", "o candidate da #273 não muda");
  // 56 — compras Android seguem desligadas.
  if (s.billing?.decision !== "ANDROID_IN_APP_PURCHASE=DISABLED_FOR_BETA" || !/export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;/.test(s.src.subscription) || !/export function isInAppPurchaseAvailable\(\): boolean \{\s*return !isNativeApp\(\);\s*\}/.test(s.src.subscription) || s.residual?.regression?.androidInAppPurchase !== "DISABLED_FOR_BETA")
    fail("ANDROID_CHECKOUT_REACTIVATED", "billing", "ANDROID_IN_APP_PURCHASE=DISABLED_FOR_BETA");
  if (s.residual?.regression?.productionPlay !== false || s.residual?.regression?.track !== "internal")
    fail("PRODUCTION_PLAY", "rc2-2-16-residual.json", "só Internal; nada de Production automático");
  // Data Safety: gravação local declarada.
  const mic = (s.dataSafety?.items ?? []).find((item) => item.data === "microphoneAudio");
  if (!mic || mic.collected !== false || mic.temporaryLocalRecording?.transmitted !== false)
    fail("AUDIO_PRIVACY_WRONG", "play-data-safety.json", "gravação de prática declarada como local e não transmitida");
  // QA físico nunca marcado sem aparelho.
  for (const field of RC2_2_17_QA_FIELDS) {
    if (!(field in (s.qa ?? {}))) fail("QA_FIELDS_MISSING", "android-physical-qa.json", field);
    else if (s.qa[field] === "PASS" && !s.qa.deviceModel) fail("FAKE_PHYSICAL_PASS", `android-physical-qa.json:${field}`, "PASS só com aparelho real");
  }
  freezeInvariants(s, fail);
  return failures;
}

// ── 9. Orçamento de informação no celular ─────────────────────────────────

export async function validateMobileInformationBudget(s) {
  const { failures, fail } = collector();
  const comecar = stripComments(s.src.comecar);
  const quiz = fnBody(comecar, "function QuizCard(");
  if (/categoryLabel\(|difficultyLabel\(|quizLayerLabel\(/.test(quiz) || !/t\("placement\.questionOf", \{ n: index \+ 1, total:/.test(quiz))
    fail("PLACEMENT_METADATA_PILLS", "ComecarPage.tsx QuizCard", "Pergunta N de M + enunciado; sem 3 pílulas de metadado");
  const guided = stripComments(s.src.guided);
  if (/<Card\b/.test(guided) || (guided.match(/data-guided-action(?![-\w])/g) ?? []).length !== 1)
    fail("NESTED_CARDS_OR_CTAS", "GuidedTryPage.tsx", "uma superfície e UMA ação principal por passo");
  const identity = /phase === "identity" \? \(([\s\S]*?)\) : \(/.exec(comecar)?.[1] ?? "";
  const fields = (identity.match(/<input\b/g) ?? []).length + (identity.match(/<UsernameField\b/g) ?? []).length;
  if (!identity || fields > 3 || /PasswordField|ProfileDetailsFields|PasswordRequirements/.test(identity))
    fail("SIGNUP_TOO_LONG", "ComecarPage.tsx", "etapa 1: Nome, Email, Username (≤ 3 campos)");
  if (!/<details className="mt-3 rounded-xl border border-line\/70 px-3 py-2" data-testid="signup-more-details">/.test(comecar))
    fail("SIGNUP_TOO_LONG", "ComecarPage.tsx", "campos extras recolhidos (opcional) na etapa 2");
  if (/setTheme|IconSun|ThemeToggle/.test(stripComments(read("src/features/landing/MobileWelcome.tsx"))))
    fail("THEME_CLUTTER", "MobileWelcome.tsx", "tema só em Ajustes, não na landing");
  freezeInvariants(s, fail);
  return failures;
}

export const GATES = {
  "audio-playback-truth": validateAudioPlaybackTruth,
  "lesson-advance-integrity": validateLessonAdvanceIntegrity,
  "speech-capability": validateSpeechCapability,
  "single-onboarding": validateSingleOnboarding,
  "guided-lesson-layer": validateGuidedLessonLayer,
  "tone-truth": validateToneTruth,
  "settings-visibility": validateSettingsVisibility,
  "release-residual": validateReleaseResidual,
  "mobile-information-budget": validateMobileInformationBudget,
};
