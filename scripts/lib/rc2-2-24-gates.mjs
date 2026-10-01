/**
 * RC2.2.24 — ANDROID LEARNING PARITY.
 *
 * O gate prova, no código, o contrato que o APK precisa seguir — e mantém a
 * verdade física: nenhum item do aparelho do owner vira PASS sem evidência.
 *
 *   native-tts-correlation   CTA só com STARTED/DONE da MESMA requestId; ponte
 *                            no bootstrap e aguardada antes do speak; sem texto
 *   guided-try-advance       ouvir libera; falha explícita com 3 saídas; nunca STARTING eterno
 *   conversation-transition  goTo sem TTS; DOM do nó esperado em 800 ms; V1 e V2
 *   step-render-truth        avançou = etapa nova no DOM
 *   journey-return-anchor    âncora semântica; nunca topo; progresso → nó atual
 *   cross-feature-handoff    "Você veio da Jornada" + [Voltar à Jornada] nas abas-destino
 *   guided-activity-shell    focus mode tira TopBar/TabBar
 *   tone-trainer-focus       hub ≠ rodada; sem stats/packs/atalhos na resposta
 *   tone-trace               Pointer Events; níveis de ajuda; nunca mede pitch
 *   all-lessons-guided-parity 134 aulas inventariadas, Pro incluído, todo StepKind com contrato
 *   single-account-production sem perfis locais na produção; logout → Landing
 *   release-truth            base, bugs P1 físicos, relatório, package/compras/#273/Production
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256 } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
export const RC2_2_24_BASE_SHA = "d843f1d3ed43b1b1d541ee849f1644c60170c033";
export const RC2_2_24_PARENT_BRANCH = "claude/rc2-2-23-product-convergence";
const REQUIRED_NEW_P1 = ["ANDROID_TTS_HEARD_BUT_UI_NOT_ACKNOWLEDGED", "ANDROID_CONVERSATION_NODE_STALL", "STEP_RENDER_STALL_ANDROID", "LOCAL_PROFILES_VISIBLE"];
const CARRIED_P1 = ["MOBILE_SIGNUP_NOT_PHYSICALLY_PROVEN", "PASSWORD_RECOVERY_NOT_PHYSICALLY_PROVEN", "SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID", "NATIVE_SPEECH_NOT_PROVEN", "GUIDANCE_DELIVERY_NOT_VISIBLE_OWNER_DEVICE"];
const OWNER_PHYSICAL = ["guidedTryAudioAdvance", "guidedTryAllSevenSteps", "conversationV1MultiLine", "conversationV2MultiNode", "conversationWithAudio", "conversationWrongBranch", "conversationRevealContinue", "lessonAfterConversation", "toneTrainerNoScroll", "toneTraceTouch", "journeyReturnAnchor", "cultureReturnAnchor", "toneReturnAnchor", "logoutNoLocalProfile", "coldStartTts", "firstAudioAfterColdStart"];
const HANDOFF_PAGES = { culture: "CULTURE", som: "TONE_TRAINER", review: "REVIEW", pinyin: "PINYIN", hanzi: "HANZI", immersion: "IMMERSION" };

export const FILES = {
  ttsCorrelation: "src/lib/ttsCorrelation.ts",
  nativeSpeech: "src/lib/platform/nativeSpeech.ts",
  tts: "src/lib/tts.ts",
  plugin: "android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java",
  bootstrap: "src/components/native/NativeExperienceBootstrap.tsx",
  audioPlayback: "src/lib/audioPlayback.ts",
  guidedTry: "src/features/landing/GuidedTryPage.tsx",
  conversation: "src/features/lesson/ConversationSceneStep.tsx",
  conversationTransition: "src/lib/conversationTransition.ts",
  stepRenderTruth: "src/lib/stepRenderTruth.ts",
  stepTrace: "src/lib/lessonStepTrace.ts",
  player: "src/features/lesson/LessonPlayer.tsx",
  anchor: "src/lib/journeyReturnAnchor.ts",
  journey: "src/features/journey/JourneyPage.tsx",
  handoff: "src/components/journey/JourneyHandoffBanner.tsx",
  culture: "src/features/culture/CultureHubPage.tsx",
  som: "src/features/som/SomPage.tsx",
  review: "src/features/revisao/RevisaoPage.tsx",
  pinyin: "src/features/pinyin/PinyinLabPage.tsx",
  hanzi: "src/features/hanzi/HanziPage.tsx",
  immersion: "src/features/immersion/ImmersionPage.tsx",
  focus: "src/lib/focusActivity.ts",
  appShell: "src/components/layout/AppShell.tsx",
  toneTrace: "src/lib/toneTrace.ts",
  toneTraceUi: "src/components/tone/ToneTrace.tsx",
  toneMicrolesson: "src/lib/toneMicrolesson.ts",
  guidedPresentation: "src/lib/guidedPresentation.ts",
  dados: "src/features/dados/DadosLocaisPage.tsx",
  settings: "src/features/settings/SettingsPage.tsx",
  account: "src/features/account/AccountPage.tsx",
  signOut: "src/hooks/useCloudSignOut.ts",
  store: "src/lib/store.ts",
  subscription: "src/services/subscriptionService.ts",
  releaseIdentity: "scripts/lib/release-identity.mjs",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  e2e: "e2e/rc2-2-24-android-learning-parity.spec.ts",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const optionalJson = (rel) => (exists(rel) ? JSON.parse(read(rel)) : null);
const optionalText = (rel) => (exists(rel) ? read(rel) : "");
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  src.capacitorConfig = read(exists("capacitor.config.ts") ? "capacitor.config.ts" : "capacitor.config.json");
  return {
    src,
    base: optionalJson("docs/release/rc2-2-24-base.json"),
    bugs: optionalJson("docs/release/rc2-2-24-android-parity-bugs.json"),
    previousBugs: optionalJson("docs/release/rc2-2-23-product-convergence-bugs.json"),
    parity: optionalJson("docs/reports/rc2-2-24-native-step-parity.json"),
    parityReport: optionalText("docs/reports/rc2-2-24-native-step-parity.md"),
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

function body(text, signature) {
  const source = String(text);
  const start = source.indexOf(signature);
  if (start < 0) return "";
  const open = source.indexOf("{", start + signature.length - 1);
  let depth = 1;
  let index = open + 1;
  while (index < source.length && depth > 0) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") depth -= 1;
    index += 1;
  }
  return source.slice(open + 1, index - 1);
}

const MODULE_KEYS = ["ttsCorrelation", "conversationTransition", "stepRenderTruth", "anchor", "toneTrace", "toneMicrolesson", "guidedPresentation"];
const bundleCache = new Map();

export async function loadModules(s) {
  const cacheKey = MODULE_KEYS.map((key) => s.src[key]).join("\u0000");
  if (bundleCache.has(cacheKey)) return bundleCache.get(cacheKey);
  const overrides = new Map(MODULE_KEYS.map((key) => [path.join(ROOT, FILES[key]), s.src[key]]));
  const result = await build({
    stdin: { contents: MODULE_KEYS.map((key) => `export * as ${key} from "./${FILES[key]}";`).join("\n"), resolveDir: ROOT, loader: "ts", sourcefile: "rc2-2-24-entry.ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": '{"DEV":true}' },
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty", ".webp": "empty", ".mp3": "empty" },
    plugins: [
      {
        name: "rc2-2-24-overrides",
        setup(pluginBuild) {
          pluginBuild.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
            const text = overrides.get(args.path);
            return text === undefined ? undefined : { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2224-"));
  const file = path.join(dir, "bundle.mjs");
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    const mod = await import(pathToFileURL(file).href);
    bundleCache.set(cacheKey, mod);
    return mod;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function withModules(s, fail, where, fn) {
  let mods;
  try {
    mods = await loadModules(s);
  } catch (error) {
    fail("MODULE_NOT_EXECUTABLE", where, String(error?.message ?? error).slice(0, 200));
    return;
  }
  try {
    fn(mods);
  } catch (error) {
    fail("MODULE_NOT_EXECUTABLE", where, String(error?.message ?? error).slice(0, 200));
  }
}

const ev = (type, requestId, extra = {}) => ({ type, requestId, utteranceId: "u", timestamp: 1, engineState: "x", ...extra });

// ── 1. TTS correlacionado ─────────────────────────────────────────────────

export async function validateNativeTtsCorrelation(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.ttsCorrelation, (mods) => {
    const c = mods.ttsCorrelation;
    const a = c.beginTtsPlayback("A");
    if (c.ttsCtaEnabled(c.applyTtsEvent(a, ev("TTS_STARTED", "B")))) fail("TTS_FOREIGN_EVENT_RELEASES", "applyTtsEvent", "START de outra fala não libera esta");
    if (c.sanitizeTtsEvent({ type: "TTS_STARTED", requestId: "" }) !== null || c.sanitizeTtsEvent({ type: "TTS_STARTED" }) !== null) fail("TTS_START_WITHOUT_REQUEST_ID", "sanitizeTtsEvent", "evento sem requestId é descartado");
    const started = c.applyTtsEvent(a, ev("TTS_STARTED", "A"));
    if (!c.ttsCtaEnabled(started)) fail("TTS_HEARD_CTA_BLOCKED", "ttsCtaEnabled", "START da mesma fala libera o CTA");
    const doneOnly = c.applyTtsEvent(c.applyTtsEvent(a, ev("TTS_QUEUED", "A")), ev("TTS_DONE", "A"));
    if (!c.ttsCtaEnabled(doneOnly) || doneOnly.startEventMissed !== true || c.ttsCtaReason(doneOnly) !== "START_EVENT_MISSED_DONE") fail("TTS_DONE_WITHOUT_START_BLOCKS", "applyTtsEvent", "DONE sem START = TTS_START_EVENT_MISSED e conta como tocada");
    if (c.ttsCtaEnabled(c.applyTtsEvent(a, ev("TTS_ERROR", "A", { code: "TTS_SPEAK_FAILED" })))) fail("TTS_ERROR_RELEASES", "applyTtsEvent", "erro não libera");
    if (c.ttsCtaEnabled(a)) fail("TTS_TAP_RELEASES", "beginTtsPlayback", "pedido (toque) não é áudio");
    const raw = c.sanitizeTtsEvent({ type: "TTS_STARTED", requestId: "A", text: "你好", utterance: "你好" });
    if (!raw || JSON.stringify(raw).includes("你好")) fail("TTS_EVENT_CARRIES_TEXT", "sanitizeTtsEvent", "evento nunca carrega o texto falado");
    for (const type of ["TTS_REQUESTED", "TTS_QUEUED", "TTS_STARTED", "TTS_DONE", "TTS_STOPPED", "TTS_ERROR"]) if (!c.TTS_EVENT_TYPES.includes(type)) fail("TTS_CONTRACT_INCOMPLETE", "TTS_EVENT_TYPES", type);
  });
  const ns = stripComments(s.src.nativeSpeech);
  const trackedAt = ns.indexOf("export async function nativeSpeakTracked(");
  const tracked = trackedAt < 0 ? "" : ns.slice(trackedAt, ns.indexOf("\n}\n", trackedAt));
  const awaitAt = tracked.indexOf("await initNativeTtsEventBridge();");
  const speakAt = tracked.indexOf("LongyuSpeech.speak(");
  if (awaitAt < 0 || speakAt < 0 || awaitAt > speakAt) fail("TTS_LISTENER_AFTER_SPEAK", "nativeSpeakTracked", "a ponte existe ANTES do pedido ao motor");
  if (!/ttsSubscribers\.get\(event\.requestId\)/.test(ns)) fail("TTS_FOREIGN_EVENT_RELEASES", FILES.nativeSpeech, "evento entregue só ao assinante da requestId");
  if (/onNativeTtsStart|ttsStartWaiters/.test(ns + stripComments(s.src.tts))) fail("TTS_GLOBAL_CALLBACK", FILES.nativeSpeech, "sem callback global sem identidade");
  if (!/useEffect\(\(\) => \{\s*void initNativeTtsEventBridge\(\);\s*\}, \[\]\);/.test(stripComments(s.src.bootstrap))) fail("TTS_LISTENER_AFTER_SPEAK", FILES.bootstrap, "ponte instalada no NativeExperienceBootstrap");
  const java = stripComments(s.src.plugin);
  for (const type of ["TTS_QUEUED", "TTS_STARTED", "TTS_DONE", "TTS_STOPPED", "TTS_ERROR"]) if (!java.includes(`emitTts("${type}"`)) fail("TTS_CONTRACT_INCOMPLETE", "LongyuSpeechPlugin", type);
  const emit = body(java, "private void emitTts(String type, String requestId, String utteranceId, String engineState, String code)");
  if (!/event\.put\("requestId", requestId\)/.test(emit) || !/event\.put\("timestamp"/.test(emit) || !/event\.put\("engineState"/.test(emit) || /text/.test(emit)) fail("TTS_EVENT_CARRIES_TEXT", "emitTts", "requestId/utteranceId/timestamp/engineState, nunca texto");
  if (!/ret\.put\("started", started\)/.test(java)) fail("TTS_DONE_WITHOUT_START_BLOCKS", "finishSpeak", "o retorno prova se o motor começou ESTA fala");
  const native = body(stripComments(s.src.tts), "function speakNative(text: string, opts: SpeakOptions): void");
  if (!/if \(!ttsPlaybackConfirmed\(playback\) && \(result\.started \|\| !result\.interrupted\)\)/.test(native)) fail("TTS_ONDONE_WAIT_FOREVER", "speakNative", "retorno do plugin confirma DONE quando o evento não chegou");
  if (!/PLAYBACK_START_TIMEOUT_MS = \d+/.test(s.src.audioPlayback)) fail("TTS_ONDONE_WAIT_FOREVER", FILES.audioPlayback, "sem início no prazo = falha perceptível");
  return failures;
}

// ── 2. Teste Guiado ───────────────────────────────────────────────────────

export async function validateGuidedTryAdvance(s) {
  const { failures, fail } = collector();
  const g = stripComments(s.src.guidedTry);
  const play = body(g, "function playNihao()");
  if (!/const requestId = newTtsRequestId\(\);/.test(play) || !/activeRequest\.current !== requestId/.test(play)) fail("GUIDED_TRY_UNCORRELATED", "playNihao", "cada toque é uma reprodução com identidade");
  if (!/setListen\(\(prev\) => \(prev === "STARTING" \? "IDLE" : prev\)\)/.test(play)) fail("GUIDED_TRY_DEAD_BUTTON", "playNihao", "substituída sem começar volta a IDLE (nunca STARTING eterno)");
  if (!/if \(outcome\.started\) \{\s*setAudioResult\("AUDIO_HEARD"\)/.test(play)) fail("TTS_HEARD_CTA_BLOCKED", "playNihao", "começou = ouvido, mesmo substituída depois");
  if (!/data-testid="guided-audio-retry"/.test(g) || !/guided-audio-settings|guided-audio-install/.test(g) || !/testId: "listen-continue-degraded"/.test(g)) fail("GUIDED_TRY_DEAD_BUTTON", FILES.guidedTry, "[Tentar novamente] [Configurar voz chinesa] [Continuar sem áudio]");
  if (!/audioResult === "AUDIO_HEARD" \|\| heard/.test(g)) fail("TTS_HEARD_CTA_BLOCKED", "listenAction", "ouviu → Continuar livre");
  const choose = body(g, "function choose(choice: Choice)");
  if (/await|then\(/.test(choose)) fail("AUDIO_GATES_LAST_STEP", "choose", "último passo: áudio só acompanha");
  return failures;
}

// ── 3. Transição de conversa ──────────────────────────────────────────────

export async function validateConversationTransition(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.conversationTransition, (mods) => {
    const t = mods.conversationTransition;
    if (t.resolveConversationTarget("n2", (id) => id === "n2", 1).kind !== "node") fail("CONVERSATION_TARGET_UNRESOLVED", "resolveConversationTarget", "alvo válido → nó");
    if (t.resolveConversationTarget("x", () => false, 1).kind !== "finish" || t.resolveConversationTarget("n2", () => true, 99).kind !== "finish") fail("CONVERSATION_LOOP_TRAP", "resolveConversationTarget", "grafo quebrado/loop termina a cena");
    if (!(t.CONVERSATION_DOM_STALL_MS <= 800)) fail("CONVERSATION_DOM_STALL_UNDETECTED", "CONVERSATION_DOM_STALL_MS", "nó esperado visível em até 800 ms");
    for (const event of ["conversation_continue_tap", "conversation_state_before", "conversation_target_resolved", "conversation_state_committed", "conversation_dom_next_visible", "conversation_audio_requested", "conversation_audio_started"]) if (!t.CONVERSATION_TRACE_EVENTS.includes(event)) fail("CONVERSATION_TRACE_INCOMPLETE", "CONVERSATION_TRACE_EVENTS", event);
  });
  const c = stripComments(s.src.conversation);
  const goTo = body(c, "function goTo(targetId: string | undefined, _speakTarget?: ConversationNode)");
  if (!goTo) fail("CONVERSATION_GOTO_SPEAKS", FILES.conversation, "goTo existe com o contrato novo");
  if (/speak|playMandarinAudio|then\(|await/.test(goTo)) fail("CONVERSATION_GOTO_SPEAKS", "goTo", "goTo não chama TTS nem espera áudio");
  if (!/setNodeId\(target\.id\);\s*setAnswering\(false\);\s*setSpokenCount/.test(goTo)) fail("TTS_FAILURE_BLOCKS_NODE", "goTo", "valida → setNodeId → setAnswering(false) → spokenCount");
  if (/onend\s*[:=][^;]*setNodeId|onstart\s*[:=][^;]*setNodeId|\.then\([^)]*setNodeId|\.then\([^)]*setLineIndex/.test(c)) fail("AUDIO_DRIVES_NODE", FILES.conversation, "proibido: onend/onstart/promise de áudio → nó");
  if (!/setStall\(expected\)/.test(c) || !/data-testid="conversation-dom-stall"/.test(c)) fail("CONVERSATION_DOM_STALL_UNDETECTED", FILES.conversation, "nó esperado ausente → CONVERSATION_DOM_STALL com retry");
  if (!/data-conversation-current-node=\{node\.id\}/.test(c)) fail("CONVERSATION_DOM_STALL_UNDETECTED", FILES.conversation, "V2 marca o nó visível");
  if (!/data-conversation-current-node=\{`line-\$\{lineIndex\}`\}/.test(c)) fail("CONVERSATION_DOM_STALL_UNDETECTED", FILES.conversation, "V1 marca a fala visível");
  const v1 = body(c, "function advanceDialogue()");
  if (/speak/.test(v1) || !/setLineIndex\(\(index\) => index \+ 1\)/.test(v1)) fail("CONVERSATION_V1_STUCK", "advanceDialogue", "V1 avança sem TTS no toque");
  if (!/if \(wrongHere >= 2\) \{/.test(c)) fail("CONVERSATION_WRONG_LOOP", FILES.conversation, "2º erro na mesma fala mostra a resposta e segue");
  return failures;
}

// ── 4. Verdade de render da etapa ─────────────────────────────────────────

export async function validateStepRenderTruth(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.stepRenderTruth, (mods) => {
    const r = mods.stepRenderTruth;
    const stall = r.stepRenderStalls([{ event: "next_step_selected", stepIndex: 3, lessonId: "l" }]);
    if (stall.length !== 1) fail("STEP_RENDER_STALL_IGNORED", "stepRenderStalls", "selecionada sem render = stall");
    if (r.stepRenderStalls([{ event: "next_step_selected", stepIndex: 3, lessonId: "l" }, { event: "next_step_rendered", stepIndex: 3, lessonId: "l" }]).length !== 0) fail("STEP_RENDER_FALSE_STALL", "stepRenderStalls", "render da MESMA etapa fecha");
    if (r.stepRenderStalls([{ event: "next_step_selected", stepIndex: 3, lessonId: "l" }, { event: "next_step_rendered", stepIndex: 2, lessonId: "l" }]).length !== 1) fail("STEP_RENDER_STALL_IGNORED", "stepRenderStalls", "render de outra etapa não conta");
  });
  const p = stripComments(s.src.player);
  const select = body(p, "function selectNextStep(kind: string)");
  if (!/event: "completion_committed"/.test(select) || !/event: "next_step_selected"/.test(select) || !/STEP_RENDER_STALL_MS/.test(select)) fail("STEP_RENDER_STALL_IGNORED", "selectNextStep", "commit → seleção → watchdog");
  if (!/\[data-lesson-step-frame\]\[data-current-step-index="\$\{idx\}"\]/.test(p) || !/event: "next_step_rendered"/.test(p)) fail("ADVANCE_WITHOUT_DOM", FILES.player, "advanced só com a etapa nova no DOM");
  if ((p.match(/selectNextStep\(/g) ?? []).length < 3) fail("ADVANCE_WITHOUT_DOM", FILES.player, "os dois caminhos de avanço usam selectNextStep");
  if (/\n\s*setIdx\(idx \+ 1\);/.test(p.replace(body(p, "function selectNextStep(kind: string)"), ""))) fail("ADVANCE_WITHOUT_DOM", FILES.player, "nenhum setIdx(idx + 1) fora do contrato");
  return failures;
}

// ── 5. Âncora de volta à Jornada ──────────────────────────────────────────

const anchorOf = (lessonId, completedAtLeave = 3) => ({ phaseId: "p", unitId: "u", lessonId, nodeId: null, activitySource: "CULTURE", returnReason: "REQUIRED_ACTIVITY", completedAtLeave, createdAt: Date.now() });

export async function validateJourneyReturnAnchor(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.anchor, (mods) => {
    const a = mods.anchor;
    const exists = () => true;
    if (a.resolveJourneyReturnTarget(null, { completedNow: 3, currentLessonId: "cur", lessonExists: exists })?.lessonId !== "cur") fail("RETURN_GOES_TOP", "resolveJourneyReturnTarget", "sem âncora → nó atual, nunca topo");
    if (a.resolveJourneyReturnTarget(anchorOf("l7"), { completedNow: 3, currentLessonId: "cur", lessonExists: exists })?.lessonId !== "l7") fail("CULTURE_RETURN_LOSES_UNIT", "resolveJourneyReturnTarget", "sem progresso novo → a âncora");
    if (a.resolveJourneyReturnTarget(anchorOf("l7", 2), { completedNow: 3, currentLessonId: "cur", lessonExists: exists })?.lessonId !== "cur") fail("NEW_NODE_NOT_PREFERRED", "resolveJourneyReturnTarget", "progresso novo → nó atual");
    if (a.journeyReturnSourceForPath("/som") !== "TONE_TRAINER" || a.journeyReturnSourceForPath("/cultura/x") !== "CULTURE") fail("TONE_RETURN_LOSES_UNIT", "journeyReturnSourceForPath", "origem pela rota");
  });
  const j = stripComments(s.src.journey);
  if (!/setJourneyReturnAnchor\(\{/.test(j) || !/completedAtLeave: completedCountRef\.current/.test(j)) fail("RETURN_GOES_TOP", FILES.journey, "sair da Jornada grava a âncora");
  if (!/consumeJourneyReturnAnchor\(\)/.test(j) || !/resolveJourneyReturnTarget\(anchor/.test(j) || !/scrollIntoView\(\{ block: "center"/.test(j)) fail("RETURN_GOES_TOP", FILES.journey, "voltar centraliza o nó resolvido");
  if (!/activitySource: interacted \? journeyReturnSourceForPath\(window\.location\.pathname\) : "TAB_SWITCH"/.test(j)) fail("TONE_RETURN_LOSES_UNIT", FILES.journey, "troca de aba sem progresso restaura a região");
  return failures;
}

// ── 6. Handoff entre abas ─────────────────────────────────────────────────

export async function validateCrossFeatureHandoff(s) {
  const { failures, fail } = collector();
  const h = stripComments(s.src.handoff);
  if (!/data-testid="journey-handoff-back"/.test(h) || !/to="\/jornada"/.test(h)) fail("HANDOFF_NO_RETURN_CTA", FILES.handoff, "[Voltar à Jornada]");
  if (!/journey\.handoffComplete/.test(h) || !/returnReason === "REQUIRED_ACTIVITY"/.test(h)) fail("HANDOFF_UNGUIDED", FILES.handoff, "'Você veio da Jornada. Complete esta atividade…'");
  for (const [key, source] of Object.entries(HANDOFF_PAGES)) if (!s.src[key].includes(`<JourneyHandoffBanner source="${source}" />`)) fail("HANDOFF_UNGUIDED", FILES[key], `banner de handoff (${source})`);
  return failures;
}

// ── 7. Shell de atividade (focus) ─────────────────────────────────────────

export async function validateGuidedActivityShell(s) {
  const { failures, fail } = collector();
  const shell = stripComments(s.src.appShell);
  if (!/const focusMode = ownsViewport \|\| focusActivity \|\|/.test(shell)) fail("ACTIVITY_KEEPS_CHROME", FILES.appShell, "atividade pede focus mode");
  if (!/\{!focusMode && <TopBar \/>\}/.test(shell)) fail("TOPBAR_DURING_ACTIVITY", FILES.appShell, "sem TopBar em atividade");
  if (!/\{!focusMode && <TabBar \/>\}/.test(shell)) fail("TABBAR_DURING_ACTIVITY", FILES.appShell, "sem TabBar em atividade");
  const f = stripComments(s.src.focus);
  if (!/active = Math\.max\(0, active - 1\)/.test(f) || !/if \(released\) return;/.test(f)) fail("FOCUS_COUNTER_LEAK", FILES.focus, "liberar duas vezes não deixa o app preso em foco");
  return failures;
}

// ── 8. Tone Trainer em foco ───────────────────────────────────────────────

export async function validateToneTrainerFocus(s) {
  const { failures, fail } = collector();
  const som = stripComments(s.src.som);
  const round = som.slice(som.indexOf("data-tone-trainer-focus"), som.indexOf("function TonePackList("));
  if (!round || som.indexOf("data-tone-trainer-focus") < 0) fail("TONE_ROUND_NOT_FOCUSED", FILES.som, "rodada em focus mode");
  if (/ToneMiniStat|Melhor|Fraco|"Nota"/.test(round)) fail("TONE_STATS_MID_ROUND", "ToneTrainer.round", "sem Nota/Melhor/Fraco durante a resposta");
  if (/TonePackList/.test(round)) fail("TONE_PACKS_MID_ROUND", "ToneTrainer.round", "lista de packs fora da rodada");
  if (/Atalhos|ShortcutBadge|shortcutKeyForIndex|pack\.focus|minimumCorrect/.test(round)) fail("TONE_CLUTTER_MID_ROUND", "ToneTrainer.round", "sem atalhos, descrição longa nem mínimo na rodada");
  if (!/useFocusActivity\(started && !done\)/.test(som)) fail("TONE_ROUND_NOT_FOCUSED", FILES.som, "rodada liga o focus mode (TopBar/TabBar somem)");
  if (!/if \(!started\) \{/.test(som) || !/data-testid="tone-trainer-start"/.test(som)) fail("TONE_HUB_MIXED", FILES.som, "hub (escolher + Começar) separado da rodada");
  if (!/\{!focus && <PinyinReference \/>\}/.test(som)) fail("TONE_HUB_MIXED", FILES.som, "referência de pinyin fora do foco");
  return failures;
}

// ── 9. Tone Trace ─────────────────────────────────────────────────────────

export async function validateToneTrace(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.toneTrace, (mods) => {
    const t = mods.toneTrace;
    if (JSON.stringify([...t.TONE_TRACE_LEVELS]) !== JSON.stringify(["FULL_LINE", "PARTIAL_LINE", "GUIDE_DOTS", "NO_LINE"])) fail("TRACE_PROGRESSION_BROKEN", "TONE_TRACE_LEVELS", "linha → parcial → pontos → sem linha");
    if (t.advanceTraceProgress(0.6, 2, 10) !== 0.6) fail("TRACE_PROGRESSION_BROKEN", "advanceTraceProgress", "voltar o dedo não desfaz");
    if (!t.traceComplete(0.95) || t.traceComplete(0.5)) fail("TRACE_PROGRESSION_BROKEN", "traceComplete", "completo só perto do fim");
    if (t.TONE_TRACE_MEASURES_PITCH !== false || /correto|pitch|voz/i.test(t.traceFeedback("NO_LINE", true))) fail("TRACE_CLAIMS_PITCH", "toneTrace", "nunca afirma medir o tom");
  });
  const ui = stripComments(s.src.toneTraceUi);
  if (!/onPointerDown=\{onPointerDown\}/.test(ui) || !/onPointerMove=\{onPointerMove\}/.test(ui) || !/onPointerUp=\{onPointerUp\}/.test(ui)) fail("TRACE_MOUSE_ONLY", FILES.toneTraceUi, "Pointer Events (mouse, toque, caneta)");
  if (/onMouse(Down|Move|Up)|onTouch(Start|Move|End)/.test(ui)) fail("TRACE_MOUSE_ONLY", FILES.toneTraceUi, "um único caminho de ponteiro");
  if (!/touch-none/.test(ui) || !/setPointerCapture/.test(ui)) fail("TRACE_TOUCH_BROKEN", FILES.toneTraceUi, "toque não rola a página e segue o dedo");
  if (/seu tom (ficou|est[áa]) (correto|certo)|\d+\s*%/i.test(ui)) fail("TRACE_CLAIMS_PITCH", FILES.toneTraceUi, "sem nota de pitch");
  if (!/"TRACE"/.test(s.src.toneMicrolesson)) fail("TRACE_NOT_IN_SEQUENCE", FILES.toneMicrolesson, "RASTREAR na sequência VER→OUVIR→RASTREAR→…");
  return failures;
}

// ── 10. Todas as aulas na apresentação guiada ─────────────────────────────

export async function validateAllLessonsGuidedParity(s) {
  const { failures, fail } = collector();
  const parity = s.parity;
  if (!parity) fail("PARITY_INVENTORY_MISSING", "docs/reports/rc2-2-24-native-step-parity.json", "inventário");
  else {
    if (parity.totals?.lessons !== 134) fail("LESSONS_NOT_ALL_AUDITED", "parity.totals.lessons", "as 134 aulas, sem amostragem");
    if (!(parity.totals?.premiumLessons > 0) || !(parity.totals?.premiumConversationScenes >= 0)) fail("PREMIUM_NOT_AUDITED", "parity.totals", "aulas Pro incluídas");
    if ((parity.stepKinds ?? []).some((row) => row.androidApk !== "NOT_RUN" && row.androidApk !== "PHYSICAL_PASS")) fail("FAKE_APK_PASS", "parity.stepKinds", "APK só NOT_RUN ou PHYSICAL_PASS com evidência");
    await withModules(s, fail, FILES.guidedPresentation, (mods) => {
      const contracts = mods.guidedPresentation.STEP_PRESENTATION_CONTRACTS;
      for (const row of parity.stepKinds ?? []) if (!contracts[row.kind]) fail("STEPKIND_ESCAPES_GUIDED", `STEP_PRESENTATION_CONTRACTS.${row.kind}`, "todo StepKind jogável tem contrato guiado");
    });
  }
  const shellSig = /export function resolveLessonShellMode\(input: ShellFlagInput\): LessonShellMode \{([\s\S]*?)\n\}/.exec(stripComments(s.src.guidedPresentation))?.[1] ?? "";
  if (/premium|isPro|pro\b/i.test(shellSig) || !/if \(input\.productionBeta\) return "GUIDED";/.test(shellSig)) fail("PREMIUM_LEGACY_PRESENTATION", "resolveLessonShellMode", "aula Pro usa o mesmo shell guiado");
  if (!/\| STEP KIND \| AULAS \| WEB MOBILE \| ANDROID APK \| AUDIO \| ADVANCE \| RESULT \|/.test(s.parityReport)) fail("PARITY_REPORT_MISSING", "rc2-2-24-native-step-parity.md", "matriz STEP KIND × WEB × APK × AUDIO × ADVANCE × RESULT");
  return failures;
}

// ── 11. Conta única ───────────────────────────────────────────────────────

export async function validateSingleAccountProduction(s) {
  const { failures, fail } = collector();
  const dados = stripComments(s.src.dados);
  if (/localProfilesHere|switchAccount|useProfile|hub\.localProfile/.test(dados)) fail("LOCAL_PROFILES_VISIBLE", FILES.dados, "Dados e backup sem perfis locais");
  const settings = stripComments(s.src.settings);
  if (!/\{isDevLocalAuthAllowed\(\) && \(\s*<div className="grid gap-2">\s*\{accountList\.map/.test(settings)) fail("SWITCH_ACCOUNT_IN_PRODUCTION", FILES.settings, "troca de perfil só em DEV/E2E");
  const account = stripComments(s.src.account);
  if (!/\{isDevLocalAuthAllowed\(\) && \(\s*<div>\s*<Card className="border-line\/80 p-5 sm:p-6">\s*<h3[^>]*>\{t\("hub\.localProfilesHere"\)\}/.test(account)) fail("LOCAL_PROFILES_VISIBLE", FILES.account, "'Perfis neste dispositivo' só em DEV/E2E");
  const so = stripComments(s.src.signOut);
  if ((so.match(/navigate\("\/", \{ replace: true \}\)/g) ?? []).length < 2) fail("LOGOUT_TO_LOCAL_PROFILE", FILES.signOut, "logout → Landing/Login");
  const store = stripComments(s.src.store);
  const end = /endCloudSession: \(\) =>\s*set\(\(s\) => \{([\s\S]*?)\}\),/.exec(store)?.[1] ?? "";
  if (!/return wipeToGuestShell\(\);/.test(end)) fail("LOGOUT_TO_LOCAL_PROFILE", "endCloudSession", "encerra a sessão em casca de visitante, nunca Aluno local");
  if (!/cacheLiveProgressForCloudUser\(s\);/.test(end)) fail("MIGRATION_LOSES_PROGRESS", "endCloudSession", "progresso guardado antes de limpar");
  if (!/if \(!email && !isDevLocalAuthAllowed\(\)\)/.test(store)) fail("LOCAL_ACCOUNT_CREATABLE", FILES.store, "nova conta real sem identidade local");
  if (!/@deprecated RC2\.2\.24/.test(s.src.store)) fail("SWITCH_ACCOUNT_IN_PRODUCTION", "store.switchAccount", "marcado deprecated");
  return failures;
}

// ── 12. Verdade de release ────────────────────────────────────────────────

export async function validateReleaseTruth(s) {
  const { failures, fail } = collector();
  const base = s.base;
  if (!base) fail("BASE_MISSING", "docs/release/rc2-2-24-base.json", "base");
  else {
    if (base.RC2_2_24_BASE_SHA !== RC2_2_24_BASE_SHA || base.parentWave !== "RC2.2.23" || base.strategy !== "STACKED") fail("BASE_SHA_AMBIGUOUS", "rc2-2-24-base.json", `STACKED sobre ${RC2_2_24_BASE_SHA}`);
    if (base.prTargetWhileParentOpen !== RC2_2_24_PARENT_BRANCH || base.doNotDuplicateParentCommits !== true) fail("PARENT_COMMITS_DUPLICATED", "rc2-2-24-base.json", "mira a RC2.2.23; nunca recriar commits");
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", RC2_2_24_BASE_SHA, "HEAD"], { cwd: ROOT, stdio: "ignore" });
    } catch {
      if (!process.env.RC2_2_24_SKIP_ANCESTRY) fail("BASE_SHA_AMBIGUOUS", "git", `${RC2_2_24_BASE_SHA} ancestral do HEAD`);
    }
  }
  const bugs = s.bugs;
  if (!bugs) fail("BUGS_MISSING", "docs/release/rc2-2-24-android-parity-bugs.json", "manifesto");
  else {
    const list = bugs.bugs ?? [];
    if (bugs.importedFrom?.historyReset !== false || list.length < (s.previousBugs?.bugs?.length ?? 0)) fail("HISTORY_RESET", "bugs.importedFrom", "importa a RC2.2.23 sem reset");
    for (const id of [...REQUIRED_NEW_P1, ...CARRIED_P1]) {
      const bug = list.find((item) => item.id === id);
      if (!bug || bug.severity !== "P1" || bug.releaseBlocking !== true) fail("P1_IGNORED", `bugs.${id}`, "P1 bloqueante até PASS físico");
    }
    for (const bug of list) if (bug.status === "PHYSICAL_PASS" && !(bug.physicalEvidence?.testedAt && bug.physicalEvidence?.evidenceType)) fail("FAKE_PHYSICAL_PASS", `bugs.${bug.id}`, "CODE/WEB PASS não é APK PASS");
    for (const name of OWNER_PHYSICAL) if (!(name in (bugs.ownerDevicePhysical ?? {})) || (bugs.ownerDevicePhysical[name] !== "NOT_RUN" && !bugs.physicalEvidence?.[name])) fail("FAKE_PHYSICAL_PASS", `ownerDevicePhysical.${name}`, "NOT_RUN até haver evidência");
    const panel = {};
    for (const sev of ["P0", "P1", "P2"]) {
      const items = list.filter((bug) => bug.severity === sev);
      panel[sev] = {
        open: items.filter((b) => !["PHYSICAL_PASS", "WONT_FIX_WITH_REASON"].includes(b.status)).length,
        new: items.filter((b) => b.status === "OPEN").length,
        reproduced: items.filter((b) => b.status === "REPRODUCED").length,
        fixed: items.filter((b) => ["FIXED_CODE", "AUTOMATED_REGRESSION"].includes(b.status)).length,
        awaitingPhysical: items.filter((b) => b.status === "PHYSICAL_RETEST_PENDING").length,
        physicalPass: items.filter((b) => b.status === "PHYSICAL_PASS").length,
      };
      if (JSON.stringify(panel[sev]) !== JSON.stringify(bugs.panel?.[sev])) fail("BUG_COUNTER_DRIFT", `bugs.panel.${sev}`, `${JSON.stringify(bugs.panel?.[sev])} ≠ ${JSON.stringify(panel[sev])}`);
    }
    if (bugs.release?.PUBLIC_BETA !== "NO_GO" || bugs.release?.CLOSED_BETA !== "NO_GO") fail("CLOSED_BETA_PREMATURE", "bugs.release", "NO_GO");
    if (bugs.prOpenedAutomatically !== false) fail("AUTO_PR", "bugs", "PR nunca automático");
  }
  if (!/NOT_TESTED/.test(s.parityReport) || !/OBSERVED/.test(s.parityReport)) fail("REPORT_EVIDENCE_COLLAPSED", "rc2-2-24-native-step-parity.md", "OBSERVED/INFERRED/NOT_TESTED");
  if (!/appId: "longyu\.noba\.com"/.test(s.src.capacitorConfig)) fail("PACKAGE_CHANGED", "capacitor.config", "longyu.noba.com");
  if (!/export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;/.test(s.src.subscription)) fail("PURCHASES_ENABLED", FILES.subscription, "DISABLED_FOR_BETA");
  if (!/MAX_AUTOMATIC_CHANNEL = "internal"/.test(stripComments(s.src.releaseIdentity))) fail("PRODUCTION_PLAY_ENABLED", FILES.releaseIdentity, "internal");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("TOUCHED_273", "docs/release/rc2-candidate.json", "#273 congelada");
  if (!/export const RC2_2_24_ANDROID_LEARNING_PARITY_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-24-android-learning-parity"/.test(s.src.curriculumFreeze)) fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_24_ANDROID_LEARNING_PARITY_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze)) fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
  if (!/toBeLessThanOrEqual\(viewport\.height\)|toBeInViewport/.test(s.src.e2e)) fail("FOLD_NOT_TESTED", FILES.e2e, "E2E mede opções e CTA dentro da dobra (390×844, 375×667)");
  return failures;
}

export const VALIDATORS = {
  "native-tts-correlation": validateNativeTtsCorrelation,
  "guided-try-advance": validateGuidedTryAdvance,
  "conversation-transition": validateConversationTransition,
  "step-render-truth": validateStepRenderTruth,
  "journey-return-anchor": validateJourneyReturnAnchor,
  "cross-feature-handoff": validateCrossFeatureHandoff,
  "guided-activity-shell": validateGuidedActivityShell,
  "tone-trainer-focus": validateToneTrainerFocus,
  "tone-trace": validateToneTrace,
  "all-lessons-guided-parity": validateAllLessonsGuidedParity,
  "single-account-production": validateSingleAccountProduction,
  "release-truth": validateReleaseTruth,
};
