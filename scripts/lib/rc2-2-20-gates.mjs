/**
 * RC2.2.20 — PHYSICAL BETA READINESS.
 *
 * O gate valida CONTRATOS, nunca finge estado físico. Cinco áreas:
 *   validatePhysicalEvidence  /qa/device: PASS só com testedAt/buildSha/
 *                             versionCode/deviceClass/evidenceType, nunca no
 *                             navegador/emulador, nunca automático; sem PII;
 *                             matriz e manifesto honestos (NOT_RUN sem aparelho)
 *   validateDeviceContracts   orientação só com render; conta madura não
 *                             re-tranca; áudio: clique ≠ início; Continuar tem
 *                             "advanced"; etapa travada nunca pula; permissão ≠
 *                             reconhecimento; gravação = arquivo + reprodução;
 *                             nada de popup em exercício; trilhas no APK de QA
 *   validateReviewAuth        Revisão: MIN_TARGET_GAP, formatShift, alvo pela
 *                             forma; cadastro com prazo e categorias; OTP só em
 *                             memória, nunca logado, código errado recusado
 *   validatePedagogy          tom ≠ língua; Pronunciation Core BR (11
 *                             contrastes, percepção antes de quiz); CTA sem XP;
 *                             relatórios V5A presentes
 *   validateRelease           Sair visível e neutro, Excluir separado; update
 *                             não reseta orientação nem duplica recompensa;
 *                             package, compras, #273, Production Play; freeze
 * Cada um devolve [{ code, where, why }]. Módulos puros são EMPACOTADOS a partir
 * do texto (esbuild), então as mutações do `test:*` valem de verdade.
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
export const RC2_2_20_BASE_SHA = "3eb7df133f2826ce70bc9e347a7d4cc705fccbc4";
export const RC2_2_20_TESTS = [
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
const EVIDENCE_TYPES = ["OWNER_OBSERVED", "SCREENSHOT", "SCREEN_RECORDING", "DIAGNOSTIC_TRACE", "PLAY_INSTALL_EVIDENCE"];
const DEVICE_CLASSES = ["OWNER_DEVICE", "SECOND_ANDROID", "PLAY_BUILD", "DEBUG_DIAGNOSTIC_BUILD"];
const CORE_BR_CONTRASTS = ["b-p", "d-t", "g-k", "z-c-s", "zh-ch-sh", "j-q-x", "u-umlaut", "r-retroflex", "an-ang", "en-eng", "in-ing"];
const FORBIDDEN_ENGINE_FILES = /(SrsV2|SRSEngineV2|LessonEngineV2|StoryEngineV2|GuidanceEngineV3|ProfileEngineV2|AuthEngineV2)\.(tsx?|mjs)$/;

export const FILES = {
  deviceQa: "src/lib/deviceQa.ts",
  upgrade: "src/lib/upgradeContract.ts",
  devicePerf: "src/lib/devicePerf.ts",
  speechDiagnostics: "src/lib/speechDiagnostics.ts",
  speechFailure: "src/lib/speechFailure.ts",
  signupTrace: "src/lib/signupTrace.ts",
  composer: "src/lib/reviewSessionComposer.ts",
  orchestrator: "src/lib/guidanceOrchestrator.ts",
  discovery: "src/lib/progressiveDiscovery.ts",
  trace: "src/lib/lessonStepTrace.ts",
  audio: "src/lib/audioPlayback.ts",
  speech: "src/lib/speech.ts",
  guidanceHost: "src/components/guidance/GuidanceHost.tsx",
  discoveryHook: "src/hooks/useProgressiveDiscovery.ts",
  qaPage: "src/features/qa/QaDevicePage.tsx",
  routes: "src/routes.tsx",
  player: "src/features/lesson/LessonPlayer.tsx",
  steps: "src/features/lesson/steps.tsx",
  selfCompare: "src/features/lesson/SelfComparePractice.tsx",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
  review: "src/features/revisao/RevisaoPage.tsx",
  reviewBuilder: "src/features/revisao/reviewExerciseBuilder.ts",
  comecar: "src/features/onboarding/ComecarPage.tsx",
  finalize: "src/features/auth/FinalizeCadastroPage.tsx",
  forgot: "src/features/auth/ForgotPasswordPage.tsx",
  authService: "src/services/authService.ts",
  toneContour: "src/components/tone/ToneContour.tsx",
  coreBr: "src/data/pronunciationCoreBr.ts",
  contrastDrill: "src/features/pinyin/PronunciationContrastDrill.tsx",
  pinyinLab: "src/features/pinyin/PinyinLabPage.tsx",
  lessonDetail: "src/features/lesson/LessonDetailPage.tsx",
  more: "src/features/more/MorePage.tsx",
  conta: "src/features/conta/ContaPage.tsx",
  settings: "src/features/settings/SettingsPage.tsx",
  subscription: "src/services/subscriptionService.ts",
  releaseIdentity: "scripts/lib/release-identity.mjs",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
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
  const optionalJson = (rel) => (exists(rel) ? readJson(rel) : null);
  return {
    srcFileNames: walk("src"),
    src,
    manifest: optionalJson("docs/release/rc2-2-20-manifest.json"),
    matrix: optionalJson("docs/release/rc2-2-20-device-matrix.json"),
    ownerActions: optionalJson("docs/release/rc2-2-20-owner-actions.json"),
    qa: readJson("docs/release/android-physical-qa.json"),
    docs: {
      report: exists("docs/reports/rc2-2-20-physical-beta-readiness.md") ? read("docs/reports/rc2-2-20-physical-beta-readiness.md") : "",
      evidenceReadme: exists("docs/reports/rc2-2-20-physical-evidence/README.md"),
      lexicalRecycling: exists("docs/reports/rc2-2-20-lexical-recycling.md"),
      toneProgression: exists("docs/reports/rc2-2-20-tone-progression.md"),
    },
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

const MODULE_KEYS = ["deviceQa", "upgrade", "devicePerf", "speechDiagnostics", "speechFailure", "signupTrace", "composer", "orchestrator", "discovery"];
const bundleCache = new Map();

export async function loadModules(s) {
  const cacheKey = MODULE_KEYS.map((key) => s.src[key]).join("\u0000");
  if (bundleCache.has(cacheKey)) return bundleCache.get(cacheKey);
  const overrides = new Map(MODULE_KEYS.map((key) => [path.join(ROOT, FILES[key]), s.src[key]]));
  const result = await build({
    stdin: {
      contents: MODULE_KEYS.map((key) => `export * as ${key} from "./${FILES[key]}";`).join("\n"),
      resolveDir: ROOT,
      loader: "ts",
      sourcefile: "rc2-2-20-entry.ts",
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
        name: "rc2-2-20-overrides",
        setup(pluginBuild) {
          pluginBuild.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
            const text = overrides.get(args.path);
            return text === undefined ? undefined : { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2220-"));
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
  if (!/export const RC2_2_20_PHYSICAL_BETA_READINESS_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-20-physical-beta-readiness"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_20_PHYSICAL_BETA_READINESS_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze))
    fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
}

const PASS_EVIDENCE = {
  status: "PASS",
  testedAt: "2026-10-01T12:00:00.000Z",
  buildSha: "3eb7df133f2826ce70bc9e347a7d4cc705fccbc4",
  versionCode: 42,
  deviceClass: "OWNER_DEVICE",
  evidenceType: "OWNER_OBSERVED",
  note: "ouvi o áudio e avancei",
};

// ── 1. Evidência física ────────────────────────────────────────────────────

export async function validatePhysicalEvidence(s) {
  const { failures, fail } = collector();
  const mods = await modulesOrFail(s, fail, FILES.deviceQa);
  if (mods) {
    const q = mods.deviceQa;
    const ids = q.DEVICE_QA_TEST_IDS ?? [];
    for (const id of RC2_2_20_TESTS) if (!ids.includes(id)) fail("PHYSICAL_TEST_MISSING", FILES.deviceQa, id);
    for (const type of EVIDENCE_TYPES) if (!(q.DEVICE_QA_EVIDENCE_TYPES ?? []).includes(type)) fail("EVIDENCE_TYPE_MISSING", FILES.deviceQa, type);
    for (const cls of DEVICE_CLASSES) if (!(q.DEVICE_QA_DEVICE_CLASSES ?? []).includes(cls)) fail("DEVICE_CLASS_MISSING", FILES.deviceQa, cls);
    // PASS sem cada uma das evidências → recusado.
    for (const field of ["testedAt", "buildSha", "versionCode", "deviceClass", "evidenceType"]) {
      const errors = q.validateDeviceQaResult({ ...PASS_EVIDENCE, [field]: null }, { native: true, emulator: false });
      if (!errors.length) fail("PASS_WITHOUT_EVIDENCE", "validateDeviceQaResult", `PASS aceito sem ${field}`);
    }
    if (q.validateDeviceQaResult(PASS_EVIDENCE, { native: true, emulator: false }).length) fail("VALID_PASS_REJECTED", "validateDeviceQaResult", "PASS completo num Android físico precisa ser aceito");
    if (!q.validateDeviceQaResult(PASS_EVIDENCE, { native: false }).length) fail("WEB_OR_EMULATOR_PASS", "validateDeviceQaResult", "navegador nunca é PHYSICAL PASS");
    if (!q.validateDeviceQaResult(PASS_EVIDENCE, { native: true, emulator: true }).length) fail("WEB_OR_EMULATOR_PASS", "validateDeviceQaResult", "emulador nunca é PHYSICAL PASS");
    if (!q.validateDeviceQaResult({ status: "FAIL", note: "" }).length) fail("FAIL_WITHOUT_REPRO", "validateDeviceQaResult", "FAIL precisa de nota que reproduza");
    for (const pii of ["meu email é ana@exemplo.com", "código 482913", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkw.abc"]) {
      if (!q.validateDeviceQaResult({ ...PASS_EVIDENCE, note: pii }, { native: true }).includes("NOTE_HAS_PII")) fail("PII_STORED", "validateDeviceQaResult", `nota com PII aceita: ${pii.slice(0, 18)}…`);
    }
    // Registro: um PASS inválido nunca entra; nada começa como PASS.
    const empty = q.emptyDeviceQaRegistry();
    if (Object.values(empty).some((result) => result.status !== "NOT_RUN")) fail("PHYSICAL_PASS_AUTOMATIC", "emptyDeviceQaRegistry", "tudo começa NOT_RUN");
    const attempt = q.recordDeviceQaResult(empty, "guidedTryAudioDevice", { status: "PASS" }, { native: true });
    if (attempt.registry.guidedTryAudioDevice?.status === "PASS") fail("PHYSICAL_PASS_AUTOMATIC", "recordDeviceQaResult", "PASS sem evidência gravado");
    if (q.physicalCriticalMatrixPass(empty)) fail("PHYSICAL_PASS_AUTOMATIC", "physicalCriticalMatrixPass", "matriz vazia não passa");
    const allButOne = Object.fromEntries(RC2_2_20_TESTS.map((id) => [id, { ...PASS_EVIDENCE }]));
    allButOne.mobileSignupDevice = { status: "NOT_APPLICABLE" };
    if (q.physicalCriticalMatrixPass(allButOne)) fail("PHYSICAL_PASS_AUTOMATIC", "physicalCriticalMatrixPass", "NOT_APPLICABLE não conta como PASS crítico");
    // Onde a superfície existe.
    if (q.deviceQaEnabled({ VITE_APP_ENV: "production_beta", MODE: "production" })) fail("QA_SURFACE_IN_PRODUCTION", "deviceQaEnabled", "production_beta sem VITE_DEVICE_QA nunca");
    if (!q.deviceQaEnabled({ VITE_APP_ENV: "production_beta", VITE_DEVICE_QA: "true" }) || !q.deviceQaEnabled({ VITE_APP_ENV: "qa_candidate" }))
      fail("QA_SURFACE_UNREACHABLE", "deviceQaEnabled", "APK de diagnóstico (VITE_DEVICE_QA) e QA Candidate precisam da superfície");
    const ua = "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.004; wv) AppleWebKit/537.36";
    const device = q.sanitizeDeviceFromUserAgent(ua);
    if (device.androidVersion !== "14" || device.model !== "Pixel 7") fail("DEVICE_INFO_WRONG", "sanitizeDeviceFromUserAgent", JSON.stringify(device));
  }
  // Nenhum caminho de código grava PASS sozinho (só a ação do owner em /qa/device).
  for (const rel of s.srcFileNames) {
    if (rel === FILES.deviceQa || rel === FILES.qaPage || /\.test\.|__tests__/.test(rel)) continue;
    const key = Object.entries(FILES).find(([, file]) => file === rel)?.[0];
    const content = key ? s.src[key] : fs.readFileSync(path.join(ROOT, rel), "utf8");
    if (/recordDeviceQaResult\(|saveDeviceQaRegistry\(/.test(content)) fail("PHYSICAL_PASS_AUTOMATIC", rel, "só /qa/device grava resultado físico");
  }
  const page = stripComments(s.src.qaPage);
  if (!/if \(!deviceQaEnabled\(\)\) return <Navigate to="\/" replace \/>;/.test(page)) fail("QA_SURFACE_IN_PRODUCTION", FILES.qaPage, "página redireciona fora do QA");
  if (!/recordDeviceQaResult\(/.test(page) || !/native: build\.runtime === "native", emulator: build\.emulator/.test(page))
    fail("PHYSICAL_PASS_AUTOMATIC", FILES.qaPage, "gravar passa pelo contrato com runtime/emulador reais");
  if (/status:\s*"PASS"/.test(page)) fail("PHYSICAL_PASS_AUTOMATIC", FILES.qaPage, "a página nunca escolhe PASS sozinha");
  if (!/path: "qa\/device"/.test(s.src.routes)) fail("QA_SURFACE_UNREACHABLE", FILES.routes, "/qa/device registrada");
  // Matriz física e manifestos honestos.
  const m = s.matrix;
  if (!m) fail("DEVICE_MATRIX_MISSING", "docs/release/rc2-2-20-device-matrix.json", "matriz de aparelhos");
  else {
    if (m.RC2_2_20_BASE_SHA !== RC2_2_20_BASE_SHA) fail("BASE_SHA_AMBIGUOUS", "device-matrix.RC2_2_20_BASE_SHA", RC2_2_20_BASE_SHA);
    for (const id of RC2_2_20_TESTS) {
      const row = m.tests?.[id];
      if (!row) {
        fail("PHYSICAL_TEST_MISSING", `device-matrix.tests.${id}`, "todo teste físico listado");
        continue;
      }
      if (row.status === "PASS") {
        const missing = ["testedAt", "buildSha", "versionCode", "deviceClass", "evidenceType"].filter((field) => !row[field]);
        if (missing.length) fail("FAKE_PHYSICAL_PASS", `device-matrix.tests.${id}`, `PASS sem ${missing.join(", ")}`);
        if (!EVIDENCE_TYPES.includes(row.evidenceType)) fail("FAKE_PHYSICAL_PASS", `device-matrix.tests.${id}`, "tipo de evidência inválido");
      }
    }
    if (m.deviceClasses?.SECOND_ANDROID?.available === true && !m.deviceClasses?.SECOND_ANDROID?.model) fail("FAKE_SECOND_DEVICE", "device-matrix.deviceClasses.SECOND_ANDROID", "nunca fingir segundo aparelho");
    const allPass = RC2_2_20_TESTS.every((id) => m.tests?.[id]?.status === "PASS");
    if (m.physicalCriticalMatrix === "PASS" && !allPass) fail("FAKE_PHYSICAL_PASS", "device-matrix.physicalCriticalMatrix", "PASS só com todos os testes PASS");
  }
  const man = s.manifest;
  if (!man) fail("MANIFEST_MISSING", "docs/release/rc2-2-20-manifest.json", "manifesto da onda");
  else {
    if (man.RC2_2_20_BASE_SHA !== RC2_2_20_BASE_SHA) fail("BASE_SHA_AMBIGUOUS", "manifest.RC2_2_20_BASE_SHA", RC2_2_20_BASE_SHA);
    for (const [id, status] of Object.entries(man.physicalTests ?? {}))
      if (status === "PASS" && m?.tests?.[id]?.status !== "PASS") fail("FAKE_PHYSICAL_PASS", `manifest.physicalTests.${id}`, "PASS só se a matriz física tem a evidência");
    for (const [area, row] of Object.entries(man.areas ?? {}))
      if (row.physical === "PASS") fail("FAKE_PHYSICAL_PASS", `manifest.areas.${area}.physical`, "área só vira PHYSICAL PASS pela matriz");
    const states = man.states ?? [];
    for (const state of ["CODE_PASS", "WEB_E2E_PASS", "PHYSICAL_PASS", "OWNER_ACTION_REQUIRED"]) if (!states.includes(state)) fail("STATES_COLLAPSED", "manifest.states", state);
  }
  if (!s.docs.evidenceReadme) fail("EVIDENCE_DIR_MISSING", "docs/reports/rc2-2-20-physical-evidence/README.md", "pasta de evidência física");
  // Os 12 campos do QA físico legado seguem NOT_RUN sem aparelho.
  for (const id of RC2_2_20_TESTS) if (s.qa[id] === "PASS" && !s.qa.deviceModel) fail("FAKE_PHYSICAL_PASS", `android-physical-qa.json:${id}`, "PASS só com aparelho real");
  return failures;
}

// ── 2. Contratos de aparelho ───────────────────────────────────────────────

export async function validateDeviceContracts(s) {
  const { failures, fail } = collector();
  const mods = await modulesOrFail(s, fail, "device-contracts");
  if (mods) {
    const o = mods.orchestrator;
    // 2 — orientação só vira SHOWN por render (no host, depois do tempo visível).
    const seeded = { ...o.DEFAULT_GUIDANCE_STATE, records: { welcome_journey_v1: { status: "AUTO_SEEDED", at: 1, evidence: "seed" } } };
    const normalized = o.normalizeGuidanceState(seeded);
    if (normalized.records.welcome_journey_v1?.status !== "AUTO_SEEDED") fail("GUIDANCE_SHOWN_WITHOUT_RENDER", "normalizeGuidanceState", "AUTO_SEEDED não vira SHOWN sozinho");
    const legacy = o.normalizeGuidanceState({ version: 1, enabled: true, initialized: true, records: { culture_unlocked_v1: { status: "SEEN", at: 5 } } });
    if (legacy.records.culture_unlocked_v1?.status !== "AUTO_SEEDED") fail("GUIDANCE_SHOWN_WITHOUT_RENDER", "normalizeGuidanceState", "SEEN v1 sem render volta a AUTO_SEEDED");
    // 3 — conta madura: o que já esteve disponível nunca some.
    const remembered = o.rememberAvailability({ ...o.DEFAULT_GUIDANCE_STATE, availabilityMemory: ["practice"] }, { culture: "AVAILABLE" });
    if (!remembered.availabilityMemory.includes("practice") || !remembered.availabilityMemory.includes("culture")) fail("MATURE_RELOCKED", "rememberAvailability", "memória de disponibilidade só cresce");
    const d = mods.discovery;
    if (typeof d.mergeStickyVisibility === "function") {
      const merged = d.mergeStickyVisibility({ culture: "LOCKED", practice: "AVAILABLE" }, ["culture"]);
      if (merged.culture !== "AVAILABLE") fail("MATURE_RELOCKED", "mergeStickyVisibility", "área lembrada nunca re-tranca");
    } else fail("MATURE_RELOCKED", FILES.discovery, "mergeStickyVisibility");
    // 6/7/8 — permissão ≠ reconhecimento; gravação = arquivo + reprodução.
    const sd = mods.speechDiagnostics;
    const base = { ...sd.EMPTY_SPEECH_DIAGNOSTICS };
    for (const field of ["recognitionStarted", "speechDetected", "recognitionResult", "fileBytes", "playbackStarted", "failureCategory"])
      if (!(sd.SPEECH_DIAGNOSTIC_FIELDS ?? []).includes(field)) fail("DIAGNOSTIC_FIELD_MISSING", FILES.speechDiagnostics, field);
    const capable = { ...base, microphonePermission: "granted", recognitionService: "yes", zhCnSupport: "SUPPORTED" };
    if (typeof sd.recognitionAttemptProven !== "function" || sd.recognitionAttemptProven({ ...base, microphonePermission: "granted" }) || sd.recognitionAttemptProven(capable))
      fail("PERMISSION_AS_RECOGNITION", "recognitionAttemptProven", "permissão/capacidade sem tentativa real não prova reconhecimento");
    if (typeof sd.recognitionAttemptProven === "function" && !sd.recognitionAttemptProven({ ...capable, recognitionStarted: "yes", speechDetected: "yes", recognitionResult: "yes" }))
      fail("PERMISSION_AS_RECOGNITION", "recognitionAttemptProven", "tentativa completa precisa passar");
    const recorded = { ...base, recordingStarted: "yes", recordingDuration: 1500, temporaryFileCreated: "yes", fileBytes: 12000, playbackStarted: "yes", playbackPlayed: "yes" };
    if (!sd.recordingProven(recorded)) fail("RECORDING_PROOF_BROKEN", "recordingProven", "arquivo + duração + reprodução = provado");
    if (sd.recordingProven({ ...recorded, fileBytes: 0 }) || sd.recordingProven({ ...recorded, temporaryFileCreated: "no" })) fail("RECORDING_WITHOUT_FILE", "recordingProven", "arquivo vazio/ausente não é gravação");
    if (sd.recordingProven({ ...recorded, playbackPlayed: "no" }) || sd.recordingProven({ ...recorded, playbackStarted: "no" })) fail("RECORDING_WITHOUT_PLAYBACK", "recordingProven", "sem reprodução concluída não há prova");
  }
  // 2 — o host só grava SHOWN depois de GUIDANCE_RENDER_EVIDENCE_MS visível.
  const host = stripComments(s.src.guidanceHost);
  if (!/const wait = Math\.max\(0, visibleSince \+ GUIDANCE_RENDER_EVIDENCE_MS - Date\.now\(\)\);/.test(host) || !/recordGuidanceRendered\(state, current, Date\.now\(\)\)/.test(host))
    fail("GUIDANCE_SHOWN_WITHOUT_RENDER", FILES.guidanceHost, "SHOWN só com a superfície visível pelo tempo mínimo");
  if (!/\[\.\.\.confirmed, \.\.\.remembered\]/.test(s.src.discoveryHook)) fail("MATURE_RELOCKED", FILES.discoveryHook, "visibilidade mescla confirmadas + lembradas");
  // 13 — nada de popup em cima de exercício, teclado ou outra cerimônia.
  const select = stripComments(fnBody(s.src.orchestrator, "export function selectGuidance("));
  if (!/if \(ctx\.activeLearning \|\| ctx\.inputFocused \|\| ctx\.otherCeremonyActive\) return null;/.test(select))
    fail("POPUP_DURING_EXERCISE", "selectGuidance", "exercício, teclado ou cerimônia bloqueiam orientação");
  if (!/activeLearning: Boolean\(document\.documentElement\.dataset\.lessonPlayer\)/.test(host)) fail("POPUP_DURING_EXERCISE", FILES.guidanceHost, "player ativo conta como exercício");
  // 4 — clique ≠ áudio começou.
  const steps = stripComments(s.src.steps);
  if (!/if \(state === "STARTING"\) setListen\(\(prev\) => \(prev === "HEARD" \? prev : "STARTING"\)\);/.test(steps) || !/const heard = listen === "PLAYING" \|\| listen === "HEARD";/.test(steps))
    fail("AUDIO_CLICK_AS_START", FILES.steps, "só o início confirmado pelo motor conta como ouvido");
  const audio = stripComments(s.src.audio);
  if (!/deviceQaEnabled\(\)/.test(audio)) fail("TRACE_NOT_ON_DEVICE", FILES.audio, "trilha de áudio também no APK de QA");
  // 5 — Continuar precisa gerar "advanced"; etapa travada nunca pula.
  const player = stripComments(s.src.player);
  if ((player.match(/event: "advanced"/g) ?? []).length < 2 || !/event: "continue_pressed"/.test(player) || !/event: "completion_finished"/.test(player))
    fail("CONTINUE_WITHOUT_ADVANCE", FILES.player, "continue_pressed → completion_finished → advanced");
  const stalled = /const stalledAction = stalled \?([\s\S]*?) : null;/.exec(steps)?.[1] ?? "";
  if (!stalled || !/onDone\(last\?\.correct, last\?\.meta\)/.test(stalled) || /onSkip/.test(stalled) || !/setReloadNonce/.test(stalled))
    fail("STALL_AUTO_SKIP", FILES.steps, "etapa travada: tentar de novo / recarregar a etapa; nunca pular");
  if (!/Esta etapa não avançou corretamente\./.test(steps) || !/data-testid="step-stalled-reload"/.test(steps)) fail("STALL_FALLBACK_MISSING", FILES.steps, "texto de QA + Recarregar etapa");
  // Trilhas no APK de diagnóstico (nunca na Production Beta comum).
  if (!/if \(deviceQaEnabled\(\)\) return true;/.test(stripComments(s.src.trace))) fail("TRACE_NOT_ON_DEVICE", FILES.trace, "trilha de passo no APK de QA");
  if (!/if \(deviceQaEnabled\(\)\) return true;\s*if \(isProductionBetaEnv\(\)\) return false;/.test(stripComments(s.src.speechDiagnostics))) fail("TRACE_NOT_ON_DEVICE", FILES.speechDiagnostics, "diagnóstico de fala no APK de QA, nunca na Beta comum");
  // SelfCompare: estados claros e prova real.
  const self = stripComments(s.src.selfCompare);
  for (const key of ["selfComparePreparing", "selfCompareRecording", "selfCompareTooShort", "selfComparePermissionDenied"]) if (!self.includes(`t("player.${key}")`)) fail("SELF_COMPARE_STATE_MISSING", FILES.selfCompare, key);
  if (!/fileBytes: typeof result\.fileBytes === "number"/.test(self) || !/playbackStarted: "yes", playbackPlayed: "yes"/.test(self)) fail("RECORDING_WITHOUT_FILE", FILES.selfCompare, "bytes do arquivo e reprodução registrados");
  return failures;
}

// ── 3. Revisão e autenticação ──────────────────────────────────────────────

export async function validateReviewAuth(s) {
  const { failures, fail } = collector();
  const mods = await modulesOrFail(s, fail, "review-auth");
  if (mods) {
    const c = mods.composer;
    // 9 — o mesmo alvo só volta depois de MIN_TARGET_GAP outros alvos.
    if (!(c.MIN_TARGET_GAP >= 2)) fail("REVIEW_SAME_TARGET_CLOSE", "MIN_TARGET_GAP", "pelo menos 2 alvos entre repetições");
    const queue = ["a1", "a2", "b1", "c1", "d1", "a3", "b2"].map((id) => ({ id, target: id[0] }));
    const composed = c.composeReviewQueue(queue, (entry) => entry.target);
    if (composed.length !== queue.length || new Set(composed.map((entry) => entry.id)).size !== queue.length) fail("COMPOSER_DROPS_ITEMS", "composeReviewQueue", "só reordena");
    for (let index = 1; index < composed.length; index += 1)
      for (let back = 1; back <= 2 && index - back >= 0; back += 1)
        if (composed[index].target === composed[index - back].target) fail("REVIEW_SAME_TARGET_CLOSE", "composeReviewQueue", `alvo ${composed[index].target} volta a ${back} item(ns)`);
    if (c.hasConsecutiveSameTarget(composed, (entry) => entry.target)) fail("REVIEW_SAME_TARGET_CLOSE", "composeReviewQueue", "alvo colado");
    if (c.composeReviewQueue(["a", "a", "a"], (entry) => entry).length !== 3) fail("COMPOSER_DROPS_ITEMS", "composeReviewQueue", "fila pequena degrada sem perder item");
    if (typeof c.semanticRepetitionViolations !== "function" || c.semanticRepetitionViolations([{ t: "你好", f: "choice" }, { t: "你好", f: "choice" }], (e) => e.t, (e) => e.f).length !== 1)
      fail("SEMANTIC_REPETITION_BLIND", "semanticRepetitionViolations", "mesmo alvo + mesma família perto = violação");
    if (typeof c.reviewSurfaceTarget !== "function" || c.reviewSurfaceTarget("vocab:x", "你好") !== c.reviewSurfaceTarget("chunk:y", "你好"))
      fail("SEMANTIC_REPETITION_BLIND", "reviewSurfaceTarget", "你好 com IDs diferentes é o mesmo alvo");
    // Cadastro: categorias seguras.
    const st = mods.signupTrace;
    const cases = [
      ["signup_started", "SIGNUP_REQUEST_TIMEOUT", "TIMEOUT"],
      ["signup_started", "FAILED_TO_FETCH", "NETWORK"],
      ["signup_started", "OVER_EMAIL_SEND_RATE_LIMIT", "RATE_LIMIT"],
      ["signup_started", "USER_ALREADY_EXISTS", "SUPABASE_AUTH"],
      ["confirmation_required", "X", "EMAIL_CONFIRMATION"],
      ["session_available", "X", "SESSION_RESTORE"],
      ["profile_bootstrap_started", "X", "PROFILE_BOOTSTRAP"],
      ["draft_restore_started", "X", "ONBOARDING_DRAFT"],
    ];
    for (const [stage, code, expected] of cases)
      if (st.classifySignupError?.(stage, code) !== expected) fail("SIGNUP_CATEGORY_WRONG", "classifySignupError", `${stage}/${code} → ${expected}`);
    if (!(st.SIGNUP_REQUEST_TIMEOUT_MS > 0 && st.SIGNUP_REQUEST_TIMEOUT_MS <= 30_000) || !(st.SIGNUP_FINALIZE_TIMEOUT_MS > 0 && st.SIGNUP_FINALIZE_TIMEOUT_MS <= 45_000))
      fail("SIGNUP_INFINITE_SPINNER", FILES.signupTrace, "prazos finitos para cadastro e finalização");
    if (st.safeSignupErrorCode("ana@exemplo.com") !== "UNKNOWN") fail("PII_STORED", "safeSignupErrorCode", "e-mail nunca vira código");
    // Fala: categorias diferentes para problemas diferentes.
    const sf = mods.speechFailure;
    const speech = [
      ["not-allowed", "PERMISSION_DENIED"],
      ["unsupported", "NO_SERVICE"],
      ["language-unavailable", "NO_ZH_CN"],
      ["timeout", "TIMEOUT"],
      ["no-speech", "NO_SPEECH"],
      ["audio-capture", "RECORDING_FAILURE"],
    ];
    for (const [code, expected] of speech) if (sf.classifySpeechFailure(code) !== expected) fail("SPEECH_FAILURE_COLLAPSED", "classifySpeechFailure", `${code} → ${expected}`);
    if (new Set(speech.map(([code]) => sf.classifySpeechFailure(code))).size !== speech.length) fail("SPEECH_FAILURE_COLLAPSED", "classifySpeechFailure", "seis categorias distintas");
    for (const category of ["PERMISSION_DENIED", "NO_SERVICE", "NO_ZH_CN", "TIMEOUT", "NO_SPEECH", "RECORDING_FAILURE"])
      if (!sf.speechFallbackActions(category, { canRecord: true, canDownload: true }).includes("continue_without_speaking")) fail("SPEECH_DEAD_END", "speechFallbackActions", `${category} sem "Continuar sem falar"`);
    if (!sf.speechFallbackActions("NO_ZH_CN", { canRecord: true, canDownload: true }).includes("download_support")) fail("SPEECH_DEAD_END", "speechFallbackActions", "sem zh-CN oferece Baixar suporte");
  }
  // 10 — formatShift chega ao construtor e muda o formato.
  const review = stripComments(s.src.review);
  if (!/formatShift: reviewOccurrenceAt\(queue, pos, reviewTargetOf\)/.test(review)) fail("REVIEW_IGNORES_FORMAT_SHIFT", FILES.review, "2ª aparição do alvo pede outro formato");
  if (!/const reps = input\.item\.reps \+ \(input\.formatShift \?\? 0\);/.test(stripComments(s.src.reviewBuilder))) fail("REVIEW_IGNORES_FORMAT_SHIFT", FILES.reviewBuilder, "formatShift entra na escolha do formato");
  if (!/reviewSurfaceTarget\(key, resolveReviewEntity\(entry\.item\)\?\.hanzi\)/.test(review)) fail("SEMANTIC_REPETITION_BLIND", FILES.review, "alvo pela forma do hànzì");
  if (!/composeReviewQueue\(/.test(review)) fail("COMPOSER_NOT_WIRED", FILES.review, "fila composta");
  // 14 — cadastro nunca gira para sempre.
  for (const [key, timeout] of [["comecar", "SIGNUP_REQUEST_TIMEOUT_MS"], ["finalize", "SIGNUP_FINALIZE_TIMEOUT_MS"]]) {
    const text = stripComments(s.src[key]);
    if (!new RegExp(`withSignupTimeout\\([\\s\\S]*?${timeout}\\s*\\)`).test(text) || !/isSignupTimeout\(outcome\)/.test(text)) fail("SIGNUP_INFINITE_SPINNER", FILES[key], "pedido com prazo e saída para o prazo");
  }
  if (!/recordDeviceQaObservation\("signup_failed"/.test(s.src.signupTrace) || !/category/.test(fnBody(s.src.signupTrace, "export function reportSignupFailure("))) fail("SIGNUP_CATEGORY_WRONG", FILES.signupTrace, "falha registra categoria");
  // 15/16/17 — OTP só em memória, nunca logado; código errado recusado.
  const forgot = stripComments(s.src.forgot);
  if (/localStorage|sessionStorage|indexedDB|searchParams|history\.(push|replace)State|navigate\([^)]*code/.test(forgot)) fail("OTP_PERSISTED", FILES.forgot, "código só no estado do formulário");
  if (/console\.|trackFunnelEvent\([^)]*code|trackPedagogyEvent\([^)]*code/.test(forgot)) fail("OTP_LOGGED", FILES.forgot, "código nunca em log/analytics");
  const verify = stripComments(fnBody(s.src.authService, "export async function verifyRecoveryCode("));
  if (!verify) fail("RECOVERY_ACCEPTS_INVALID_OTP", FILES.authService, "verifyRecoveryCode");
  else {
    if (!/type: "recovery"/.test(verify) || !/if \(error \|\| !data\?\.session\) \{/.test(verify)) fail("RECOVERY_ACCEPTS_INVALID_OTP", "verifyRecoveryCode", "verifyOtp recovery; erro ou sem sessão = recusado");
    if (/console\.|track[A-Z]\w*\(/.test(verify)) fail("OTP_LOGGED", "verifyRecoveryCode", "código nunca em log/analytics");
    if (/localStorage|sessionStorage/.test(verify)) fail("OTP_PERSISTED", "verifyRecoveryCode", "nada persistido");
  }
  return failures;
}

// ── 4. Pedagogia ───────────────────────────────────────────────────────────

export async function validatePedagogy(s) {
  const { failures, fail } = collector();
  // 11 — tom é altura da voz, nunca língua.
  if (/tongue|língua|TONGUE/i.test(stripComments(s.src.toneContour))) fail("TONGUE_FOR_TONE", FILES.toneContour, "tom é altura da voz");
  const core = stripComments(s.src.coreBr);
  for (const id of CORE_BR_CONTRASTS) if (!new RegExp(`id: "${id}"`).test(core)) fail("CORE_BR_CONTRAST_MISSING", FILES.coreBr, id);
  if (/\btom\b|\btone\b|\btons\b/i.test(core)) fail("TONGUE_FOR_TONE", FILES.coreBr, "contraste de articulação nunca explica tom");
  if (!/CONTRAST_DRILL_STAGES = \["see", "hear_a", "hear_b", "compare", "identify", "produce"\]/.test(core)) fail("QUIZ_BEFORE_PERCEPTION", FILES.coreBr, "ver → ouvir → comparar → identificar → produzir");
  const drill = stripComments(s.src.contrastDrill);
  if (!/useState<ContrastDrillStage>\("see"\)/.test(drill)) fail("QUIZ_BEFORE_PERCEPTION", FILES.contrastDrill, "drill começa por ver, não por quiz");
  if (!/disabled=\{!heardOrFailed \|\| picked != null\}/.test(drill)) fail("QUIZ_BEFORE_PERCEPTION", FILES.contrastDrill, "identificar só depois de ouvir");
  if (!/PronunciationCoreBrSection/.test(s.src.pinyinLab)) fail("CORE_BR_NOT_WIRED", FILES.pinyinLab, "seção no Pinyin Lab");
  // 12 — CTA principal do detalhe sem "+N XP".
  const cta = s.src.lessonDetail.match(/data-lesson-primary-cta=""\>([\s\S]*?)<\/span>/);
  if (!cta || /XP|maxXp|xp/.test(cta[1])) fail("REWARD_IN_PRIMARY_CTA", FILES.lessonDetail, "CTA é a ação; XP fica secundário");
  // V5A medido, não inventado.
  if (!s.docs.lexicalRecycling) fail("V5A_REPORT_MISSING", "docs/reports/rc2-2-20-lexical-recycling.md", "npm run report:lexical-recycling");
  if (!s.docs.toneProgression) fail("V5A_REPORT_MISSING", "docs/reports/rc2-2-20-tone-progression.md", "npm run report:tone-progression");
  freezeInvariants(s, fail);
  return failures;
}

// ── 5. Release ─────────────────────────────────────────────────────────────

export async function validateRelease(s) {
  const { failures, fail } = collector();
  // 18 — Sair visível; Excluir separado. RC2.3.13A — SignOutControl compact
  // (destructive-text OK; filled danger remains Excluir only).
  const more = stripComments(s.src.more);
  if (!/SignOutControl[\s\S]{0,80}?testId="more-sign-out"/.test(more) && !/data-testid="more-sign-out"/.test(more) && !/testId="more-sign-out"/.test(more)) {
    fail("LOGOUT_HIDDEN", FILES.more, "Sair no bloco Você do Mais");
  }
  if (/variant=["']danger["'][\s\S]{0,120}more-sign-out|bg-wrong[\s\S]{0,80}more-sign-out/.test(more)) {
    fail("LOGOUT_STYLED_AS_DELETE", FILES.more, "Sair não pode parecer Excluir");
  }
  const conta = stripComments(s.src.conta);
  if (!/SignOutControl[\s\S]{0,80}?testId="conta-sign-out"/.test(conta) && !/data-testid="conta-sign-out"/.test(conta) && !/testId="conta-sign-out"/.test(conta)) {
    fail("LOGOUT_HIDDEN", FILES.conta, "Sair da conta em Conta");
  }
  if (/variant=["']danger["'][\s\S]{0,120}conta-sign-out|bg-wrong[\s\S]{0,80}conta-sign-out/.test(conta)) {
    fail("LOGOUT_STYLED_AS_DELETE", FILES.conta, "Sair não pode parecer Excluir");
  }
  if (!/<DangerZone \/>/.test(s.src.settings)) fail("DELETE_NOT_SEPARATED", FILES.settings, "Excluir conta na zona de perigo, separado");
  if (/DangerZone|deleteAccount/.test(more)) fail("DELETE_NOT_SEPARATED", FILES.more, "Excluir não mora ao lado de Sair");
  // 19/20 — update N→N+1 não reseta orientação nem duplica recompensa.
  const mods = await modulesOrFail(s, fail, FILES.upgrade);
  if (mods) {
    const u = mods.upgrade;
    const account = {
      completedLessons: ["l1", "l2", "l3"],
      points: 420,
      dragonPearls: 30,
      rewardHistory: [1, 2],
      pearlMilestonesClaimed: { a: 1 },
      journeyChestsOpened: ["c1"],
      medals: ["m1"],
      achievementsUnlocked: { x: 1 },
      srs: { a: { reps: 3 }, b: { reps: 1 } },
      cultureCompletedIds: ["k"],
      guidance: { enabled: true, records: { a: { status: "SHOWN" }, b: { status: "DISMISSED" }, c: { status: "AUTO_SEEDED" } }, availabilityMemory: ["practice", "culture"] },
      dailyGoalMinutes: 10,
      courseDirection: "pt-zh",
    };
    const before = u.takeUpgradeSnapshot(account, { versionCode: 10, buildSha: "a" });
    const same = u.takeUpgradeSnapshot(account, { versionCode: 11, buildSha: "b" });
    if (u.compareUpgradeSnapshots(before, same).length) fail("UPGRADE_FALSE_ALARM", "compareUpgradeSnapshots", "update sem mudança não é violação");
    const snap = (patch) => u.takeUpgradeSnapshot({ ...account, ...patch }, { versionCode: 11, buildSha: "b" });
    const expect = (patch, code, why) => {
      if (!u.compareUpgradeSnapshots(before, snap(patch)).includes(code)) fail(code, "compareUpgradeSnapshots", why);
    };
    expect({ guidance: { ...account.guidance, records: { a: { status: "AUTO_SEEDED" }, b: { status: "AUTO_SEEDED" }, c: { status: "AUTO_SEEDED" } } } }, "GUIDANCE_RESET", "orientações vistas voltando é violação");
    expect({ rewardHistory: [1, 2, 3] }, "REWARD_DUPLICATED", "recompensa entregue de novo");
    expect({ points: 520 }, "XP_DUPLICATED", "XP extra só com o update");
    expect({ completedLessons: ["l1"] }, "JOURNEY_RESET", "Jornada voltou");
    expect({ srs: { a: { reps: 0 } } }, "SRS_RESET", "SRS perdeu itens");
    expect({ guidance: { ...account.guidance, availabilityMemory: ["practice"] } }, "FEATURE_RELOCKED", "área liberada trancou");
    // A migração real das orientações preserva o que o aluno já decidiu.
    const o = mods.orchestrator;
    const v2 = { version: 2, enabled: true, initialized: true, availabilityMemory: ["practice"], records: { a: { status: "SHOWN", at: 1, evidence: "render" }, b: { status: "DISMISSED", at: 2 }, c: { status: "SKIPPED", at: 3 } } };
    const again = o.normalizeGuidanceState(v2);
    if (["a", "b", "c"].some((id) => again.records[id]?.status !== v2.records[id].status) || !again.availabilityMemory.includes("practice"))
      fail("GUIDANCE_RESET", "normalizeGuidanceState", "SHOWN/DISMISSED/SKIPPED e memória sobrevivem ao reabrir/atualizar");
  }
  // 21/22/23/24 — package, compras, #273, Production Play.
  if (!/appId: "longyu\.noba\.com"/.test(s.src.capacitorConfig)) fail("PACKAGE_CHANGED", "capacitor.config", "appId continua longyu.noba.com");
  if (!/export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;/.test(s.src.subscription)) fail("PURCHASES_ENABLED", FILES.subscription, "compras Android desligadas na Beta");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("TOUCHED_273", "docs/release/rc2-candidate.json", "o candidate da #273 não muda");
  const ri = stripComments(s.src.releaseIdentity);
  if (!/if \(channel === "production" && confirmProduction !== "PUBLICAR-PRODUCAO"\)/.test(ri) || !/MAX_AUTOMATIC_CHANNEL = "internal"/.test(ri)) fail("PRODUCTION_PLAY_ENABLED", FILES.releaseIdentity, "Production só com confirmação explícita; automático = internal");
  const man = s.manifest;
  if (man) {
    if (man.regression?.androidInAppPurchase !== "DISABLED_FOR_BETA") fail("PURCHASES_ENABLED", "manifest.regression", "DISABLED_FOR_BETA");
    if (man.regression?.productionPlay !== "NOT_ENABLED") fail("PRODUCTION_PLAY_ENABLED", "manifest.regression.productionPlay", "NOT_ENABLED");
    if (man.regression?.package !== "longyu.noba.com") fail("PACKAGE_CHANGED", "manifest.regression.package", "longyu.noba.com");
    if (man.prOpenedAutomatically !== false) fail("AUTO_PR", "manifest.prOpenedAutomatically", "PR nunca automático");
    if (man.PUBLIC_BETA !== "NO_GO") fail("PUBLIC_BETA_PREMATURE", "manifest.PUBLIC_BETA", "NO_GO até matriz física, AAB, Play install e N→N+1");
    const req = man.closedBeta?.requires ?? {};
    const ready = req.SIGNED_AAB_READY === true && req.PLAY_INSTALL_COMPLETE === true && req.N_TO_N_PLUS_1 === "PASS" && req.P0 === 0 && req.releaseBlockingP1 === 0 && req.PHYSICAL_CRITICAL_MATRIX === "PASS" && req.AUTH_PHYSICAL === "PASS";
    if (man.closedBeta?.CLOSED_BETA_READY === true && !ready) fail("CLOSED_BETA_PREMATURE", "manifest.closedBeta", "CLOSED_BETA_READY só com todos os requisitos");
    if (man.recoveryTemplate?.ownerApplied === "PASS" || man.recoveryTemplate?.physicallyVerified === "PASS") fail("OWNER_ACTION_HIDDEN", "manifest.recoveryTemplate", "só o owner aplica e verifica");
    for (const [key, status] of Object.entries(man.releaseResidual ?? {})) if (status === "PASS" || status === "COMPLETE") fail("RESIDUAL_HIDDEN", `manifest.releaseResidual.${key}`, "nenhum resíduo vira PASS por código");
    if (man.fingerprint !== "cc66373bb602" && !man.pedagogyContentException) fail("FINGERPRINT_DRIFT", "manifest.fingerprint", "fingerprint honesto ou exceção registrada");
  } else fail("MANIFEST_MISSING", "docs/release/rc2-2-20-manifest.json", "manifesto");
  const owner = s.ownerActions;
  if (!owner) fail("OWNER_ACTION_HIDDEN", "docs/release/rc2-2-20-owner-actions.json", "ações do owner");
  else {
    for (const id of ["recoveryTemplateOwnerApplied", "uploadKey", "signedAab", "playInstall", "nToNPlus1"])
      if (!owner.actions?.some((action) => action.id === id)) fail("OWNER_ACTION_HIDDEN", `owner-actions.${id}`, "listada");
    for (const action of owner.actions ?? []) {
      if (action.status !== "OWNER_ACTION_REQUIRED" && !action.evidence) fail("RESIDUAL_HIDDEN", `owner-actions.${action.id}`, "concluída só com evidência");
      if (/senha|password|BEGIN (RSA|PRIVATE)|storePassword|keyPassword/i.test(JSON.stringify(action.evidence ?? ""))) fail("SECRET_STORED", `owner-actions.${action.id}`, "nunca segredo no repositório");
    }
  }
  const engines = s.srcFileNames.filter((rel) => FORBIDDEN_ENGINE_FILES.test(rel));
  if (engines.length) fail("DUPLICATE_ENGINE", engines.join(", "), "evoluir o sistema existente");
  if (!s.docs.report) fail("REPORT_MISSING", "docs/reports/rc2-2-20-physical-beta-readiness.md", "relatório da onda");
  freezeInvariants(s, fail);
  return failures;
}

export const VALIDATORS = {
  "physical-evidence": validatePhysicalEvidence,
  "device-contracts": validateDeviceContracts,
  "review-auth": validateReviewAuth,
  pedagogy: validatePedagogy,
  release: validateRelease,
};
