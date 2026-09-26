/**
 * RC2.2.19 — GUIDED · SIMPLE · PHYSICALLY VERIFIED LEARNING PRODUCT.
 *
 * Cinco gates sobre o estado real do repositório:
 *   validateGuidanceTruth     disponível ≠ mostrado: AUTO_SEEDED, migração do
 *                             SEEN v1, SHOWN só com evidência de render, lote
 *                             cobre só o listado, nunca re-trancar, 4 saídas
 *   validateDeviceTraces      trilha áudio/avanço, diagnóstico de fala e
 *                             gravação (prova = arquivo + duração + reprodução),
 *                             fallback de 4 saídas, nada disso em production_beta
 *   validateAuthRecovery      código de 6 dígitos (verifyOtp recovery),
 *                             anti-enumeração, OTP nunca logado, estágios do
 *                             cadastro, prazos, modelo de e-mail só versionado
 *   validateReviewComposer    rodadas 5–8, sem alvo colado, repetição
 *                             transformada, hànzì grandes, mesma fila do SRS
 *   validateProductRelease    cena de história, perfil/conta/sair, recompensa
 *                             secundária, articulação ≠ tom, manifesto com
 *                             CODE / WEB-E2E / PHYSICAL / OWNER ACTION honestos
 * Cada um devolve [{ code, where, why }]. Os `test:*` mutam o estado e exigem
 * o código certo. Módulos puros são EMPACOTADOS a partir do texto (esbuild).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256 } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
export const RC2_2_19_BASE_SHA = "231adff6";
export const RC2_2_19_QA_FIELDS = [
  "guidanceShownOnDevice",
  "guidanceMatureAccountNoRelock",
  "guidedTryAudioDevice",
  "conversationContinueDevice",
  "nativeSpeechRecognitionZhCn",
  "selfCompareRecordingPlayback",
  "mobileSignupDevice",
  "passwordRecoveryOtpDevice",
  "reviewRoundsDevice",
  "storySceneDevice",
  "profileAccountLogoutDevice",
  "articulationDiagramsDevice",
];
export const RC2_2_19_P1 = [
  "GUIDANCE_NEVER_ACTUALLY_SHOWN",
  "GUIDANCE_UNLOCK_AUTO_MARKED_AS_SEEN",
  "GUIDED_TRY_AUDIO_NOT_PLAYING_ON_DEVICE",
  "CONVERSATION_CONTINUE_STALL_ON_DEVICE",
  "NATIVE_SPEECH_RECOGNITION_NOT_WORKING",
  "SELF_COMPARE_RECORDING_NOT_PROVEN",
  "MOBILE_SIGNUP_FAILURE",
  "PASSWORD_RECOVERY_FLOW_BROKEN_ON_MOBILE",
  "JOURNEY_NOT_USING_GUIDED_TRY_PRESENTATION",
];
const SIGNUP_STAGES = [
  "signup_started",
  "signup_request_success",
  "confirmation_required",
  "session_available",
  "draft_restore_started",
  "profile_bootstrap_started",
  "finalize_started",
  "journey_entered",
];
const TRACE_EVENTS = ["step_visible", "audio_requested", "audio_started", "continue_pressed", "completion_started", "completion_finished", "advanced"];
const FORBIDDEN_ENGINE_FILES = /(SrsV2|SRSEngineV2|LessonEngineV2|StoryEngineV2|ProfileEngine|ReviewEngineV2)\.(tsx?|mjs)$/;

export const FILES = {
  orchestrator: "src/lib/guidanceOrchestrator.ts",
  discovery: "src/lib/progressiveDiscovery.ts",
  hook: "src/hooks/useProgressiveDiscovery.ts",
  host: "src/components/guidance/GuidanceHost.tsx",
  runtime: "src/components/guidance/guidanceRuntime.ts",
  trace: "src/lib/lessonStepTrace.ts",
  audio: "src/lib/audioPlayback.ts",
  player: "src/features/lesson/LessonPlayer.tsx",
  speechDiagnostics: "src/lib/speechDiagnostics.ts",
  speech: "src/lib/speech.ts",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
  selfCompare: "src/features/lesson/SelfComparePractice.tsx",
  nativeSpeech: "src/lib/platform/nativeSpeech.ts",
  plugin: "android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java",
  recovery: "src/lib/passwordRecovery.ts",
  authService: "src/services/authService.ts",
  forgot: "src/features/auth/ForgotPasswordPage.tsx",
  signupTrace: "src/lib/signupTrace.ts",
  comecar: "src/features/onboarding/ComecarPage.tsx",
  finalize: "src/features/auth/FinalizeCadastroPage.tsx",
  confirm: "src/features/auth/ConfirmEmailPage.tsx",
  postAuth: "src/services/postAuthOnboarding.ts",
  template: "supabase/templates/recovery.html",
  composer: "src/lib/reviewSessionComposer.ts",
  review: "src/features/revisao/RevisaoPage.tsx",
  reviewBuilder: "src/features/revisao/reviewExerciseBuilder.ts",
  immersion: "src/features/immersion/ImmersionPage.tsx",
  profile: "src/features/perfil/ProfilePage.tsx",
  more: "src/features/more/MorePage.tsx",
  topBar: "src/components/layout/TopBar.tsx",
  victory: "src/features/lesson/LessonVictory.tsx",
  articulation: "src/data/articulationTargets.ts",
  articulationDiagram: "src/components/pronunciation/ArticulationDiagram.tsx",
  toneContour: "src/components/tone/ToneContour.tsx",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  ptBR: "src/locales/pt-BR.ts",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx?|mjs)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  src.capacitorConfig = read(exists("capacitor.config.ts") ? "capacitor.config.ts" : "capacitor.config.json");
  src.supabaseConfig = exists("supabase/config.toml") ? read("supabase/config.toml") : "";
  return {
    srcFileNames: walk("src"),
    src,
    manifest: exists("docs/release/rc2-2-19-manifest.json") ? readJson("docs/release/rc2-2-19-manifest.json") : null,
    qa: readJson("docs/release/android-physical-qa.json"),
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

function fnBody(text, signature) {
  const start = String(text).indexOf(signature);
  if (start < 0) return "";
  const head = /\)\s*(?::\s*[^{=]+)?\{/.exec(String(text).slice(start));
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

// ── Execução dos módulos puros a partir do TEXTO ──────────────────────────

const bundleCache = new Map();
export async function loadModules(s) {
  const keys = ["orchestrator", "discovery", "composer", "speechDiagnostics", "recovery", "signupTrace", "trace"];
  const cacheKey = keys.map((key) => s.src[key]).join("\u0000");
  if (bundleCache.has(cacheKey)) return bundleCache.get(cacheKey);
  const overrides = new Map(keys.map((key) => [path.join(ROOT, FILES[key]), s.src[key]]));
  const result = await build({
    stdin: {
      contents: [
        `export * as orchestrator from "./${FILES.orchestrator}";`,
        `export * as discovery from "./${FILES.discovery}";`,
        `export * as composer from "./${FILES.composer}";`,
        `export * as speechDiagnostics from "./${FILES.speechDiagnostics}";`,
        `export * as recovery from "./${FILES.recovery}";`,
        `export * as signupTrace from "./${FILES.signupTrace}";`,
        `export * as trace from "./${FILES.trace}";`,
      ].join("\n"),
      resolveDir: ROOT,
      loader: "ts",
      sourcefile: "rc2-2-19-entry.ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": "{}" },
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty", ".webp": "empty" },
    plugins: [
      {
        name: "rc2-2-19-overrides",
        setup(pluginBuild) {
          pluginBuild.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
            const text = overrides.get(args.path);
            return text === undefined ? undefined : { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2219-"));
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

async function modulesOrFail(s, fail, where) {
  try {
    return await loadModules(s);
  } catch (error) {
    fail("MODULE_NOT_EXECUTABLE", where, String(error?.message ?? error).slice(0, 200));
    return null;
  }
}

function freezeInvariants(s, fail) {
  if (!/export const RC2_2_19_GUIDED_SIMPLE_VERIFIED_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-19-guided-simple-verified"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_19_GUIDED_SIMPLE_VERIFIED_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze))
    fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
}

// ── 1. Verdade da orientação ──────────────────────────────────────────────

export async function validateGuidanceTruth(s) {
  const { failures, fail } = collector();
  const mods = await modulesOrFail(s, fail, FILES.orchestrator);
  if (!mods) return failures;
  const { orchestrator: o, discovery: r } = mods;
  const NOW = 1_700_000_000_000;
  const lessons = (n) => r.EMPTY_DISCOVERY_STATE.completedLessons.concat(Array.from({ length: n }, (_, i) => `x${i}`));
  const mature = {
    ...r.EMPTY_DISCOVERY_STATE,
    completedLessons: lessons(12),
    srsItemCount: 10,
    learnedChars: "一二三四五六七八九十".split(""),
    economyIntroduced: true,
  };
  const vis = r.featureVisibilityMap(mature);
  const ctx = (state, extra = {}) => ({
    now: NOW,
    pathname: "/jornada",
    visibility: vis,
    learner: mature,
    state,
    session: o.EMPTY_GUIDANCE_SESSION,
    activeLearning: false,
    inputFocused: false,
    otherCeremonyActive: false,
    // Sem a âncora do perfil: a escolha tem de vir de um anúncio SEMEADO.
    anchorsPresent: new Set(["journey-continue"]),
    isNative: false,
    notificationPermissionPromptable: false,
    recentToneConfusions: 0,
    ...extra,
  });

  // Semente: AUTO_SEEDED, nunca "visto".
  const seeded = o.initializeGuidanceState({ ...o.DEFAULT_GUIDANCE_STATE }, vis, mature, NOW);
  const seededStatuses = Object.values(seeded.records).map((record) => record.status);
  if (!seededStatuses.length || seededStatuses.some((status) => status !== "AUTO_SEEDED"))
    fail("AUTO_SEEDED_AS_SEEN", "initializeGuidanceState", "disponível ≠ mostrado: a semente grava AUTO_SEEDED");
  // Migração do RC2.2.18.
  const migrated = o.normalizeGuidanceState({ enabled: true, initialized: true, records: { practice_unlocked_v1: { status: "SEEN", at: 5 }, culture_unlocked_v1: { status: "SKIPPED", at: 5 } } });
  if (migrated.records.practice_unlocked_v1?.status !== "AUTO_SEEDED" || migrated.records.culture_unlocked_v1?.status !== "SKIPPED" || migrated.version !== 2)
    fail("LEGACY_SEEN_TRUSTED", "normalizeGuidanceState", "SEEN v1 (sem evidência) volta a AUTO_SEEDED; Pular/Agora não ficam");
  // Conta madura continua vendo o que nunca viu — uma por sessão.
  const pick = o.selectGuidance(ctx(seeded));
  if (!pick) fail("MATURE_GUIDANCE_SUPPRESSED", "selectGuidance", "orientação nunca vista continua elegível em conta madura");
  else {
    if (pick.definition.id === "new_features_v1") fail("MATURE_BATCH_AS_NEW", "selectGuidance", "o que a conta já usa não vira 'Novos recursos'");
    const afterShown = o.selectGuidance(ctx(seeded, { session: o.recordShownInSession(o.EMPTY_GUIDANCE_SESSION, pick) }));
    if (afterShown) fail("SESSION_BUDGET_EXCEEDED", "selectGuidance", "conta madura: 1 por sessão");
  }
  // SHOWN só por evidência; nunca rebaixa um toque.
  const rendered = o.recordGuidanceRendered(seeded, { coveredIds: ["practice_unlocked_v1"] }, NOW);
  if (rendered.records.practice_unlocked_v1?.status !== "SHOWN" || rendered.records.practice_unlocked_v1?.evidence !== "render")
    fail("SHOWN_WITHOUT_EVIDENCE", "recordGuidanceRendered", "SHOWN com evidence=render");
  const dismissed = o.applyGuidanceAction(seeded, { coveredIds: ["practice_unlocked_v1"] }, "primary", NOW);
  if (o.recordGuidanceRendered(dismissed, { coveredIds: ["practice_unlocked_v1"] }, NOW + 1).records.practice_unlocked_v1?.status !== "DISMISSED")
    fail("SHOWN_WITHOUT_EVIDENCE", "recordGuidanceRendered", "evidência de render não rebaixa DISMISSED");
  // Lote cobre só o que lista.
  const fresh = { ...o.DEFAULT_GUIDANCE_STATE, initialized: true, records: { welcome_journey_v1: { status: "DISMISSED", at: 1 } } };
  const batch = o.selectGuidance(ctx(fresh, { learner: { ...mature, completedLessons: lessons(12) } }));
  if (batch?.definition.id === "new_features_v1" && batch.coveredIds.length !== batch.listedFeatures.length)
    fail("BATCH_MARKS_UNLISTED", "selectGuidance", "o lote só cobre as áreas que mostra");
  // Nunca re-trancar.
  const remembered = o.rememberAvailability({ ...o.DEFAULT_GUIDANCE_STATE, availabilityMemory: ["culture"] }, r.featureVisibilityMap(r.EMPTY_DISCOVERY_STATE));
  if (!remembered.availabilityMemory.includes("culture")) fail("RELOCKED", "rememberAvailability", "memória de disponibilidade só cresce");
  const merged = r.mergeStickyVisibility(r.featureVisibilityMap(r.EMPTY_DISCOVERY_STATE), remembered.availabilityMemory);
  if (merged.culture !== "AVAILABLE") fail("RELOCKED", "mergeStickyVisibility", "o que já esteve disponível não tranca de novo");
  if (r.featureVisibility("immersion", mature) !== "AVAILABLE" || r.featureVisibility("culture", mature) !== "AVAILABLE")
    fail("RELOCKED", "featureVisibility", "conta madura: nenhuma área HARD trancada");
  if (!/mergeStickyVisibility\(derived, \[\.\.\.confirmed, \.\.\.remembered\]\)/.test(stripComments(s.src.hook))) fail("RELOCKED", FILES.hook, "a navegação lê a memória de disponibilidade");
  // Host: escolher ≠ mostrar; sair da tela não grava.
  const host = stripComments(s.src.host);
  const choose = host.slice(host.indexOf("const fresh = selectGuidance("), host.indexOf("}, SETTLE_MS);"));
  if (/recordShownInSession|guidance_shown/.test(choose)) fail("SELECTION_COUNTS_AS_SHOWN", FILES.host, "escolher não gasta a sessão nem registra 'mostrada'");
  const leaveAt = host.indexOf("if (!shown || shown.definition.surfaces.includes(pathname)) return;");
  const leave = leaveAt < 0 ? "" : host.slice(leaveAt, host.indexOf("}, [pathname]);", leaveAt));
  if (!leave || /applyGuidanceAction|updateGuidance/.test(leave)) fail("LEAVE_MARKS_SEEN", FILES.host, "sair da tela sem evidência não grava nada");
  if (!/GUIDANCE_RENDER_EVIDENCE_MS/.test(host) || !/recordGuidanceRendered\(state, current/.test(host) || !/useRenderEvidence\(presentation, cardRef, position !== null\)/.test(host))
    fail("SHOWN_WITHOUT_EVIDENCE", FILES.host, "SHOWN só depois de visível; coachmark só depois de posicionado");
  if ((o.GUIDANCE_RENDER_EVIDENCE_MS ?? 0) < 800) fail("SHOWN_WITHOUT_EVIDENCE", "GUIDANCE_RENDER_EVIDENCE_MS", "evidência exige tempo real na tela");
  // Quatro saídas.
  for (const action of ["primary", "now_not", "skip", "skip_all"])
    if (!new RegExp(`data-guidance-action="${action}"`).test(host)) fail("GUIDANCE_ACTION_MISSING", FILES.host, `saída ${action}`);
  if (!/skip: "Pular dica"/.test(s.src.ptBR) || !/skipAll: "Pular dicas"/.test(s.src.ptBR)) fail("GUIDANCE_ACTION_MISSING", "pt-BR guidance.common", "Pular dica · Pular dicas");
  return failures;
}

// ── 2. Trilhas de aparelho: áudio/avanço, fala, gravação ──────────────────

export async function validateDeviceTraces(s) {
  const { failures, fail } = collector();
  const mods = await modulesOrFail(s, fail, FILES.speechDiagnostics);
  if (!mods) return failures;
  const { speechDiagnostics: d, trace: t } = mods;
  for (const event of TRACE_EVENTS)
    if (!(t.AUDIO_ADVANCE_TRACE_EVENTS ?? []).includes(event)) fail("TRACE_EVENT_MISSING", FILES.trace, event);
  const player = stripComments(s.src.player);
  for (const event of ["step_visible", "continue_pressed", "completion_started", "completion_finished"])
    if (!new RegExp(`event: "${event}"`).test(player)) fail("TRACE_EVENT_MISSING", FILES.player, event);
  const audio = stripComments(s.src.audio);
  if (!/traceCurrentLessonStep\("audio_requested"\)/.test(audio) || !/traceCurrentLessonStep\("audio_started"\)/.test(audio))
    fail("TRACE_EVENT_MISSING", FILES.audio, "audio_requested/audio_started no mesmo passo");
  if (/console\.(log|info)\(/.test(stripComments(s.src.trace))) fail("TRACE_IN_PRODUCTION", FILES.trace, "sem console.log fora do DEV");
  if (!/env\.DEV === true \|\| env\.VITE_USE_TEST_FIXTURES === "true"/.test(s.src.trace)) fail("TRACE_IN_PRODUCTION", FILES.trace, "só DEV/fixtures");
  // Diagnóstico de fala: campos e vereditos.
  for (const field of ["microphonePermission", "recognitionService", "zhCnSupport", "modelDownloadAvailable", "modelDownloadState", "recordingEngine", "recordingStarted", "recordingDuration", "temporaryFileCreated", "playbackReady"])
    if (!(d.SPEECH_DIAGNOSTIC_FIELDS ?? []).includes(field)) fail("DIAGNOSTIC_FIELD_MISSING", FILES.speechDiagnostics, field);
  const base = { ...d.EMPTY_SPEECH_DIAGNOSTICS };
  if (d.recognitionProven({ ...base, microphonePermission: "granted" }))
    fail("SPEECH_FROM_PERMISSION", "recognitionProven", "permissão sozinha nunca prova reconhecimento");
  const recorded = { ...base, recordingStarted: "yes", recordingDuration: 900, temporaryFileCreated: "yes", playbackReady: "yes" };
  if (d.recordingProven(recorded)) fail("RECORDING_WITHOUT_PLAYBACK", "recordingProven", "gravação só provada com reprodução concluída");
  if (d.recordingProven({ ...recorded, temporaryFileCreated: "no", playbackPlayed: "yes" })) fail("RECORDING_WITHOUT_FILE", "recordingProven", "sem arquivo temporário não há gravação");
  if (!d.recordingProven({ ...recorded, playbackPlayed: "yes" })) fail("RECORDING_WITHOUT_PLAYBACK", "recordingProven", "arquivo + duração + reprodução = provado");
  if (!/if \(isProductionBetaEnv\(\)\) return false;/.test(s.src.speechDiagnostics)) fail("DIAGNOSTICS_IN_PRODUCTION", FILES.speechDiagnostics, "nunca em production_beta");
  const selfCompare = stripComments(s.src.selfCompare);
  if (!/playbackPlayed: "yes"/.test(selfCompare) || !/temporaryFileCreated:/.test(selfCompare)) fail("RECORDING_WITHOUT_PLAYBACK", FILES.selfCompare, "reprodução e arquivo alimentam o diagnóstico");
  if (!/ret\.put\("fileExists", exists\)/.test(s.src.plugin)) fail("RECORDING_WITHOUT_FILE", FILES.plugin, "o plugin prova o arquivo temporário (sem caminho, sem conteúdo)");
  if (/getAbsolutePath\(\)\);\s*\n\s*ret\.put\("path"/.test(s.src.plugin) || /ret\.put\("path"/.test(s.src.plugin)) fail("RECORDING_PATH_LEAK", FILES.plugin, "nunca devolve o caminho do áudio");
  // Fallback de 4 saídas.
  const pronunciation = stripComments(s.src.pronunciation);
  for (const testId of ["speech-fallback-retry", "speech-fallback-download", "speech-fallback-record", "speech-fallback-continue"])
    if (!pronunciation.includes(`data-testid="${testId}"`)) fail("SPEECH_FALLBACK_MISSING", FILES.pronunciation, testId);
  return failures;
}

// ── 3. Cadastro e recuperação ─────────────────────────────────────────────

export async function validateAuthRecovery(s) {
  const { failures, fail } = collector();
  const mods = await modulesOrFail(s, fail, FILES.recovery);
  if (!mods) return failures;
  const { recovery: r, signupTrace: st } = mods;
  if (r.RECOVERY_NEUTRAL_MESSAGE !== "Se este email estiver cadastrado, enviaremos as instruções.")
    fail("RECOVERY_ENUMERATION", FILES.recovery, "mensagem neutra exata");
  if (r.classifyRecoveryRequestError({ status: 400, message: "User not found" }) !== "SENT_NEUTRAL" || r.classifyRecoveryRequestError({ message: "Email not confirmed" }) !== "SENT_NEUTRAL")
    fail("RECOVERY_ENUMERATION", "classifyRecoveryRequestError", "conta inexistente/não confirmada → resposta neutra");
  if (r.classifyRecoveryRequestError({ status: 429 }) !== "RATE_LIMITED") fail("RECOVERY_ENUMERATION", "classifyRecoveryRequestError", "limite continua acionável");
  if (r.normalizeRecoveryCode("123 456") !== "123456" || r.isRecoveryCodeComplete("12345") || !r.isRecoveryCodeComplete("123456") || r.RECOVERY_CODE_LENGTH !== 6)
    fail("RECOVERY_CODE_SHAPE", FILES.recovery, "código de 6 dígitos");
  const auth = stripComments(s.src.authService);
  const requestBody = fnBody(auth, "export async function requestPasswordReset(");
  if (/return \{ status: "error", message: error\.message \}/.test(requestBody) || !/RECOVERY_NEUTRAL_MESSAGE/.test(requestBody))
    fail("RECOVERY_ENUMERATION", "requestPasswordReset", "nunca devolve o erro cru do servidor");
  const verifyBody = fnBody(auth, "export async function verifyRecoveryCode(");
  if (!/verifyOtp\(\{ email: email\.trim\(\), token, type: "recovery" \}\)/.test(verifyBody)) fail("RECOVERY_NOT_CANONICAL", "verifyRecoveryCode", "verifyOtp type=recovery (canônico do Supabase)");
  const completeBody = fnBody(auth, "export async function completePasswordRecovery(");
  if (!/updatePasswordAfterRecovery\(password\)/.test(completeBody) || !/signOut\(\)/.test(completeBody)) fail("RECOVERY_NOT_CANONICAL", "completePasswordRecovery", "updateUser e depois Login");
  // OTP nunca logado/guardado/rastreado.
  for (const [key, text] of [["forgot", s.src.forgot], ["authService", verifyBody], ["recovery", s.src.recovery]]) {
    const clean = stripComments(text);
    if (/console\.\w+\([^)]*(code|token)/i.test(clean) || /trackFunnelEvent\([^)]*(code|token)/i.test(clean) || /(localStorage|sessionStorage)\.setItem\([^)]*(code|token)/i.test(clean) || /noteOps\([^)]*(code|token)/i.test(clean))
      fail("OTP_LOGGED", FILES[key] ?? key, "o código nunca vai para log, analytics ou storage");
  }
  const forgot = stripComments(s.src.forgot);
  if (!/navigate\("\/login", \{ replace: true \}\)/.test(forgot) || !/autoComplete="one-time-code"/.test(forgot)) fail("RECOVERY_NOT_CANONICAL", FILES.forgot, "código no app e volta ao Login");
  // Modelo de e-mail só versionado; produção não é tocada.
  if (!/\{\{ \.Token \}\}/.test(s.src.template)) fail("RECOVERY_TEMPLATE_MISSING", FILES.template, "modelo com {{ .Token }}");
  if (/\[auth\.email\.template\.recovery\]/.test(s.src.supabaseConfig)) fail("TEMPLATE_SILENTLY_APPLIED", "supabase/config.toml", "o agente não aplica modelo de e-mail");
  // Estágios do cadastro.
  for (const stage of SIGNUP_STAGES) if (!(st.SIGNUP_STAGES ?? []).includes(stage)) fail("SIGNUP_STAGE_MISSING", FILES.signupTrace, stage);
  const wired = [s.src.comecar, s.src.finalize, s.src.confirm, s.src.postAuth].map(stripComments).join("\n");
  for (const stage of SIGNUP_STAGES) if (!new RegExp(`"${stage}"`).test(wired)) fail("SIGNUP_STAGE_MISSING", "cadastro", `${stage} não é marcado no fluxo`);
  if (st.safeSignupErrorCode("ana@x.com") !== "UNKNOWN" || /@|\s/.test(st.safeSignupErrorCode("Email already registered: a@b.c")))
    fail("SIGNUP_PII_LOGGED", "safeSignupErrorCode", "nunca e-mail ou texto livre no log");
  if (/email|password|token/i.test(fnBody(stripComments(s.src.signupTrace), "export function reportSignupFailure(").replace(/safeSignupErrorCode/g, "")))
    fail("SIGNUP_PII_LOGGED", FILES.signupTrace, "falha registra estágio, código, plataforma e build — só");
  if (!/withSignupTimeout\(/.test(stripComments(s.src.comecar)) || !/withSignupTimeout\(/.test(stripComments(s.src.finalize)) || (st.SIGNUP_REQUEST_TIMEOUT_MS ?? 0) > 60_000)
    fail("SIGNUP_INFINITE_LOADING", "cadastro", "pedido e finalização têm prazo com mensagem acionável");
  return failures;
}

// ── 4. Revisão em rodadas ─────────────────────────────────────────────────

export async function validateReviewComposer(s) {
  const { failures, fail } = collector();
  const mods = await modulesOrFail(s, fail, FILES.composer);
  if (!mods) return failures;
  const { composer: c } = mods;
  for (let total = 9; total <= 60; total += 1) {
    const size = c.reviewRoundSize(total);
    if (size < 5 || size > 8) {
      fail("ROUND_SIZE_OUT_OF_RANGE", "reviewRoundSize", `total ${total} → rodada de ${size}`);
      break;
    }
  }
  if (c.reviewRoundSize(20) > 8 || c.reviewRoundSize(4) !== 4) fail("ROUND_SIZE_OUT_OF_RANGE", "reviewRoundSize", "sessão curta = 1 rodada; longa em 5–8");
  const entries = ["a", "a", "a", "b", "c", "b"].map((target, index) => ({ target, index }));
  const composed = c.composeReviewQueue(entries, (entry) => entry.target);
  if (composed.length !== entries.length || new Set(composed.map((entry) => entry.index)).size !== entries.length)
    fail("COMPOSER_DROPS_ITEMS", "composeReviewQueue", "só reordena: nada some, nada duplica");
  if (c.hasConsecutiveSameTarget(composed, (entry) => entry.target)) fail("CONSECUTIVE_SAME_TARGET", "composeReviewQueue", "mesmo alvo nunca colado quando há alternativa");
  // Sem alternativa (só o mesmo alvo sobrou): mantém tudo, nunca descarta.
  if (c.composeReviewQueue(["a", "a", "a"], (entry) => entry).length !== 3) fail("COMPOSER_DROPS_ITEMS", "composeReviewQueue", "sem alternativa, mantém a fila inteira");
  if (c.reviewOccurrenceAt(composed, composed.findLastIndex((entry) => entry.target === "a"), (entry) => entry.target) < 1)
    fail("REPETITION_NOT_TRANSFORMED", "reviewOccurrenceAt", "2ª aparição do alvo conta");
  const px = c.REVIEW_HANZI_SIZE_PX ?? {};
  if (px.main?.min < 64 || px.main?.max > 80 || px.option?.min < 48 || px.option?.max > 60 || px.pair?.min < 44 || px.pair?.max > 52)
    fail("HANZI_TOO_SMALL", FILES.composer, "principal 64–80 · opções 48–60 · pares 44–52");
  const cls = c.REVIEW_HANZI_CLASS ?? {};
  if (!/text-\[64px\]/.test(cls.main) || !/sm:text-\[80px\]/.test(cls.main) || !/text-\[48px\]/.test(cls.option) || !/text-\[44px\]/.test(cls.pair))
    fail("HANZI_TOO_SMALL", "REVIEW_HANZI_CLASS", "classes materializam os tamanhos");
  const review = stripComments(s.src.review);
  if (!/composeReviewQueue\(/.test(review) || !/reviewRoundPosition\(pos, queue\.length\)/.test(review)) fail("COMPOSER_NOT_WIRED", FILES.review, "fila composta e rodadas 5–8 na tela");
  if (!/formatShift: reviewOccurrenceAt\(queue, pos, reviewTargetOf\)/.test(review) || !/input\.item\.reps \+ \(input\.formatShift \?\? 0\)/.test(stripComments(s.src.reviewBuilder)))
    fail("REPETITION_NOT_TRANSFORMED", FILES.reviewBuilder, "repetição pede outro formato");
  for (const key of ["main", "option", "pair"]) if (!new RegExp(`REVIEW_HANZI_CLASS\\.${key}`).test(review)) fail("HANZI_TOO_SMALL", FILES.review, `hànzì ${key} usa o tamanho do composer`);
  if (/text-5xl leading-tight text-ink sm:text-6xl|isHanziText\(option\.label\) \? "text-3xl/.test(review)) fail("HANZI_TOO_SMALL", FILES.review, "tamanhos antigos voltaram");
  if (!/\{correct !== true && <p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">\{exercise\.explanation\}<\/p>\}/.test(review))
    fail("FEEDBACK_TOO_DENSE", FILES.review, "acerto = confirmação; explicação só no erro");
  if (!/<GuidanceInlineSlot surface="\/revisao" \/>/.test(review)) fail("REVIEW_FIRST_USE_MISSING", FILES.review, "primeira revisão explica as rodadas (orquestrado)");
  // Mesmo SRS: nenhum motor novo, nada de agenda no composer.
  if (/\b(gradeSrs|review\(|dueItems|newItem)\b/.test(stripComments(s.src.composer))) fail("NEW_SRS", FILES.composer, "composer não agenda nem gradua");
  const engines = s.srcFileNames.filter((rel) => FORBIDDEN_ENGINE_FILES.test(rel));
  if (engines.length) fail("NEW_SRS", engines.join(", "), "nada de SRS/Lesson/Story/Profile Engine novo");
  return failures;
}

// ── 5. Produto e release honesto ──────────────────────────────────────────

export async function validateProductRelease(s) {
  const { failures, fail } = collector();
  const immersion = stripComments(s.src.immersion);
  for (const attr of ["data-story-where", "data-story-who", "data-story-objective", "data-active-speaker=\"true\"", "data-story-scene-shell"])
    if (!immersion.includes(attr)) fail("STORY_SHELL_INCOMPLETE", FILES.immersion, attr);
  const victoryAt = immersion.indexOf('data-testid="story-victory-headline"');
  if (victoryAt < 0 || !/Você conseguiu/.test(immersion.slice(victoryAt, victoryAt + 200)) || immersion.indexOf("<StoryRecap", victoryAt) > immersion.indexOf('label="Acertos"', victoryAt))
    fail("STORY_SHELL_INCOMPLETE", FILES.immersion, "recap 'Você conseguiu' antes das recompensas");
  // Perfil / Conta / Sair.
  if (!/to="\/perfil"[\s\S]{0,80}data-coachmark-target="topbar-profile"/.test(s.src.topBar)) fail("PROFILE_NOT_DISCOVERABLE", FILES.topBar, "avatar → /perfil com coachmark");
  const profile = stripComments(s.src.profile);
  const fold = profile.slice(profile.indexOf('data-testid="profile-header"'), profile.indexOf('data-testid="profile-first-fold-actions"') + 900);
  for (const needle of ['data-testid="profile-avatar"', 'data-testid="profile-username"', 'data-testid="profile-medal-count"', 'to="/conta"', 'to="/amigos"'])
    if (!fold.includes(needle)) fail("PROFILE_NOT_DISCOVERABLE", FILES.profile, `primeira dobra: ${needle}`);
  const more = stripComments(s.src.more);
  const you = fnBody(more, "function MoreYouBlock(");
  for (const needle of ['to="/perfil"', 'to="/conta"', 'to="/config/aparencia"', "signOut()"])
    if (!you.includes(needle)) fail("LOGOUT_NOT_DISCOVERABLE", FILES.more, `Mais › Você: ${needle}`);
  if (/excluir|delete|DangerZone/i.test(you)) fail("DELETE_NOT_SEPARATED", FILES.more, "Excluir conta fica separado, nunca no bloco rápido");
  if (more.indexOf("<MoreYouBlock />") < 0 || more.indexOf("<MoreYouBlock />") > more.indexOf("{sections.map("))
    fail("PROFILE_NOT_DISCOVERABLE", FILES.more, "Você no topo do Mais");
  // Recompensa secundária (shell guiado).
  if (!/if \(!guidedShell\) return;/.test(stripComments(s.src.player)) || !/hasUnclaimedRewards && !guidedShell \? t\("player\.claimRewards"\) : journeyCta/.test(s.src.player))
    fail("REWARD_PRIMARY", FILES.player, "no shell guiado o CTA é Continuar; recompensa secundária");
  // Articulação ≠ tom.
  if (/tongue|língua|TONGUE/i.test(stripComments(s.src.toneContour))) fail("TONGUE_FOR_TONE", FILES.toneContour, "tom é altura da voz, nunca língua");
  const diagrams = (s.src.articulation.match(/\{\s*id: "(j-q-x|zh-ch-sh|z-c-s|r-retroflex|u-umlaut|e|apical-i)",\s*sounds:/g) ?? []).length;
  if (diagrams < 7 || !/ArticulationDiagram/.test(s.src.articulationDiagram)) fail("ARTICULATION_MISSING", FILES.articulation, "j/q/x, zh/ch/sh, z/c/s, r, ü, e, i apical com desenho");
  // Manifesto com estados honestos.
  const m = s.manifest;
  if (!m) fail("MANIFEST_MISSING", "docs/release/rc2-2-19-manifest.json", "manifesto da onda");
  else {
    if (m.RC2_2_19_BASE_SHA !== RC2_2_19_BASE_SHA) fail("BASE_SHA_AMBIGUOUS", "manifest.RC2_2_19_BASE_SHA", RC2_2_19_BASE_SHA);
    for (const id of RC2_2_19_P1) {
      const row = m.p1?.[id];
      if (!row) fail("P1_UNTRACKED", `manifest.p1.${id}`, "todo P1 com estado");
      else if (row.physical !== "NOT_RUN") fail("FAKE_PHYSICAL_PASS", `manifest.p1.${id}.physical`, "nenhum campo físico vira PASS automaticamente");
    }
    for (const [id, row] of Object.entries(m.p2 ?? {})) if (row.physical !== "NOT_RUN") fail("FAKE_PHYSICAL_PASS", `manifest.p2.${id}.physical`, "NOT_RUN sem aparelho");
    if (m.p1?.PASSWORD_RECOVERY_FLOW_BROKEN_ON_MOBILE?.ownerAction !== "REQUIRED") fail("OWNER_ACTION_HIDDEN", "manifest.p1.PASSWORD_RECOVERY", "modelo de e-mail é passo do owner");
    if (m.recoveryTemplate?.status !== "RECOVERY_TEMPLATE_CODE_READY" || m.recoveryTemplate?.ownerApplied !== "NOT_RUN" || m.recoveryTemplate?.physicallyVerified !== "NOT_RUN" || m.recoveryTemplate?.productionTemplateChangedByAgent !== false)
      fail("OWNER_ACTION_HIDDEN", "manifest.recoveryTemplate", "CODE_READY; OWNER_APPLIED/PHYSICALLY_VERIFIED só com evidência");
    if (m.rc2_2_16_residual?.status !== "OWNER_ACTION_REQUIRED" || m.rc2_2_16_residual?.items?.uploadKey?.status !== "OWNER_ACTION_REQUIRED")
      fail("RESIDUAL_HIDDEN", "manifest.rc2_2_16_residual", "resíduos da RC2.2.16 carregados sem inventar conclusão");
    if (m.prOpenedAutomatically !== false) fail("AUTO_PR", "manifest.prOpenedAutomatically", "PR nunca automático");
    if (m.regression?.androidInAppPurchase !== "DISABLED_FOR_BETA") fail("PURCHASES_ENABLED", "manifest.regression", "compras Android desligadas na Beta");
  }
  // QA físico.
  for (const field of RC2_2_19_QA_FIELDS) {
    if (!(field in s.qa)) fail("QA_FIELD_MISSING", `android-physical-qa.json:${field}`, "campo físico da RC2.2.19");
    else if (s.qa[field] === "PASS" && !s.qa.deviceModel) fail("FAKE_PHYSICAL_PASS", `android-physical-qa.json:${field}`, "PASS só com aparelho real");
  }
  if (!(s.qa.knownRisks ?? []).some((risk) => risk.id === "ANDROID_RC2_2_19_PRODUCT_UNVERIFIED")) fail("QA_FIELD_MISSING", "android-physical-qa.json knownRisks", "risco aberto até o QA físico");
  if (!/appId: "longyu\.noba\.com"/.test(s.src.capacitorConfig)) fail("PACKAGE_CHANGED", "capacitor.config", "appId continua longyu.noba.com");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("TOUCHED_273", "docs/release/rc2-candidate.json", "o candidate da #273 não muda");
  freezeInvariants(s, fail);
  return failures;
}

export const VALIDATORS = {
  "guidance-truth": validateGuidanceTruth,
  "device-traces": validateDeviceTraces,
  "auth-recovery": validateAuthRecovery,
  "review-composer": validateReviewComposer,
  "product-release": validateProductRelease,
};
