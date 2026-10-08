/**
 * RC2.2.22 — CLOSED BETA CANDIDATE.
 *
 * O gate não decide que a Beta está pronta: ele prova que a MÁQUINA que decide
 * não pode ser enganada. Sete áreas:
 *   security            triagem do npm audit com package/severidade/caminho/
 *                       decisão; nada de audit fix --force, limiar mantido,
 *                       workflow de segurança intacto
 *   readiness           NOT_READY → PRE_CANDIDATE → CANDIDATE → CLOSED_BETA_READY
 *                       só com evidência do tipo certo; estado declarado =
 *                       estado calculado; Public/Closed NO_GO
 *   device-compatibility falha classificada com evidência (nunca automática
 *                       para nenhum lado), resumo por fabricante só do que foi
 *                       testado, 23 testes importados sem reset, sem hack por marca
 *   beta-feedback       relato e sessão humana sem e-mail/OTP/transcrição/token;
 *                       entrada só no build de tester; sem nuvem nova
 *   product-lint        uma ação principal, orçamento de popups, repetição ruim
 *                       detectada, auditoria das 20 primeiras atualizada
 *   stability           um dono de áudio, player/gravação liberados, fala
 *                       nunca bloqueia a lição, offline não bloqueia lição
 *                       local, update não reseta orientação nem duplica recompensa
 *   release-truth       base empilhada, painel de bugs honesto, relatórios com
 *                       OBSERVED/INFERRED/NOT_TESTED, package/compras/#273/Production
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
import { headCarriesStackedWave } from "./stack-ancestry.mjs";

const ROOT = process.cwd();
export const RC2_2_22_BASE_SHA = "cc66db9dd5cfed9800dc4d6d1a60167f66902ed6";
export const RC2_2_22_PARENT_BRANCH = "claude/rc2-2-21-mobile-native-stability";
const RC2_2_21_TESTS = 23;
const TRIAGE_FIELDS = ["package", "currentVersion", "affectedRange", "severity", "dependencyType", "dependencyPath", "fixAvailable", "breakingRisk", "decision"];
const READINESS_SECTIONS = ["code", "security", "androidBuild", "physicalOwnerDevice", "physicalSecondaryDevices", "playInternal", "auth", "audio", "speech", "upgrade", "humanQa"];
const EVIDENCE_LABELS = ["OBSERVED", "INFERRED", "NOT_TESTED"];

export const FILES = {
  readiness: "src/lib/closedBetaReadiness.ts",
  compat: "src/lib/deviceCompatibility.ts",
  betaQa: "src/lib/betaQa.ts",
  lint: "src/lib/screenComplexity.ts",
  arbiter: "src/lib/audioArbiter.ts",
  techEvents: "src/lib/techEvents.ts",
  diagnostics: "src/lib/mobileDiagnostics.ts",
  deviceQa: "src/lib/deviceQa.ts",
  speechFailure: "src/lib/speechFailure.ts",
  upgrade: "src/lib/upgradeContract.ts",
  orchestrator: "src/lib/guidanceOrchestrator.ts",
  resources: "src/lib/resourceCounters.ts",
  reporter: "src/features/qa/BetaIssueReporter.tsx",
  betaConsole: "src/features/qa/BetaQaConsole.tsx",
  qaPage: "src/features/qa/QaDevicePage.tsx",
  appShell: "src/components/layout/AppShell.tsx",
  selfCompare: "src/features/lesson/SelfComparePractice.tsx",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
  player: "src/features/lesson/LessonPlayer.tsx",
  plugin: "android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java",
  nativeSpeech: "src/lib/platform/nativeSpeech.ts",
  securityWorkflow: ".github/workflows/security.yml",
  subscription: "src/services/subscriptionService.ts",
  releaseIdentity: "scripts/lib/release-identity.mjs",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const optionalJson = (rel) => (exists(rel) ? JSON.parse(read(rel)) : null);
const optionalText = (rel) => (exists(rel) ? read(rel) : "");
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx?|mjs|java|ya?ml|json)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  src.capacitorConfig = read(exists("capacitor.config.ts") ? "capacitor.config.ts" : "capacitor.config.json");
  const appFiles = walk("src").filter((rel) => /\.tsx?$/.test(rel));
  return {
    src,
    appSources: Object.fromEntries(appFiles.map((rel) => [rel, read(rel)])),
    scriptsAndWorkflows: [...walk(".github/workflows"), ...walk("scripts").filter((rel) => !/rc2-2-22/.test(rel))].map((rel) => [rel, read(rel)]),
    packageJson: JSON.parse(read("package.json")),
    base: optionalJson("docs/release/rc2-2-22-base.json"),
    triage: optionalJson("docs/release/rc2-2-22-security-triage.json"),
    readiness: optionalJson("docs/release/rc2-2-22-closed-beta-readiness.json"),
    deviceQa: optionalJson("docs/release/rc2-2-22-device-qa.json"),
    previousDeviceQa: optionalJson("docs/release/rc2-2-21-device-qa.json"),
    bugs: optionalJson("docs/release/rc2-2-22-beta-bugs.json"),
    manifest: optionalJson("docs/release/rc2-2-22-manifest.json"),
    first20: optionalJson("docs/reports/rc2-2-22-first-20-lesson-audit.json"),
    reports: {
      human: optionalText("docs/reports/rc2-2-22-human-learning-validation.md"),
      compat: optionalText("docs/reports/rc2-2-22-device-compatibility.md"),
      burndown: optionalText("docs/reports/rc2-2-22-beta-bug-burndown.md"),
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

// ── Módulos puros executados a partir do TEXTO ─────────────────────────────

const MODULE_KEYS = ["readiness", "compat", "betaQa", "lint", "arbiter", "techEvents", "diagnostics", "deviceQa", "speechFailure", "upgrade", "orchestrator", "resources"];
const bundleCache = new Map();

export async function loadModules(s) {
  const cacheKey = MODULE_KEYS.map((key) => s.src[key]).join("\u0000");
  if (bundleCache.has(cacheKey)) return bundleCache.get(cacheKey);
  const overrides = new Map(MODULE_KEYS.map((key) => [path.join(ROOT, FILES[key]), s.src[key]]));
  const result = await build({
    stdin: { contents: MODULE_KEYS.map((key) => `export * as ${key} from "./${FILES[key]}";`).join("\n"), resolveDir: ROOT, loader: "ts", sourcefile: "rc2-2-22-entry.ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": '{"DEV":true}' },
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty", ".webp": "empty", ".mp3": "empty" },
    plugins: [
      {
        name: "rc2-2-22-overrides",
        setup(pluginBuild) {
          pluginBuild.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
            const text = overrides.get(args.path);
            return text === undefined ? undefined : { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2222-"));
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

// ── Cenário de prontidão (tudo verde/PASS) para testar cada bloqueio isolado ─

const PHYS = { status: "PASS", evidenceType: "OWNER_OBSERVED", buildChannel: "QA_APK", testedAt: "2026-10-01T12:00:00.000Z", versionCode: 42 };
const PLAY = { ...PHYS, buildChannel: "PLAY_INTERNAL" };
export function greenScenario() {
  return {
    code: "PASS",
    security: { productionAudit: "PASS", fullAudit: "PASS", gitleaks: "PASS", codeql: "PASS" },
    androidBuild: "PASS",
    bugs: { p0Open: 0, releaseBlockingP1: 0 },
    criticalLessonDeadEnd: false,
    physical: { selfPlaybackAudible: PHYS, ttsCritical: PHYS, lessonAdvance: PHYS, mobileSignup: PHYS, passwordRecovery: PHYS, guidance: PHYS, lifecycle: PHYS },
    play: { internalInstall: PLAY, nToNPlus1: PLAY },
    criticalPhysicalMatrix: "PASS",
  };
}

// ── 1. Segurança ───────────────────────────────────────────────────────────

export async function validateSecurity(s) {
  const { failures, fail } = collector();
  const triage = s.triage;
  if (!triage) fail("SECURITY_TRIAGE_MISSING", "docs/release/rc2-2-22-security-triage.json", "triagem do npm audit");
  else {
    if (!Array.isArray(triage.findings) || triage.findings.length === 0) fail("SECURITY_TRIAGE_MISSING", "triage.findings", "cada vulnerabilidade listada (mesmo corrigida)");
    for (const finding of triage.findings ?? []) {
      for (const field of TRIAGE_FIELDS) if (finding[field] === undefined || finding[field] === null || finding[field] === "") fail("SECURITY_TRIAGE_INCOMPLETE", `triage.${finding.package ?? "?"}`, `campo ${field}`);
      if (!/FIXED|MITIGATED|ACCEPTED_WITH_REASON|OVERRIDE/.test(String(finding.decision))) fail("SECURITY_SILENTLY_IGNORED", `triage.${finding.package}`, "decisão explícita");
      if (/ACCEPTED/.test(String(finding.decision)) && !finding.realImpact) fail("SECURITY_SILENTLY_IGNORED", `triage.${finding.package}`, "aceitar exige impacto real avaliado");
    }
    if (triage.policy?.npmAuditFixForce !== "NEVER_AUTOMATIC") fail("AUDIT_FIX_FORCE", "triage.policy", "npm audit fix --force nunca automático");
    const green = triage.securityGreen ?? {};
    if ((triage.state?.afterFix?.full?.total ?? 1) !== 0 && green.fullAudit === "PASS") fail("SECURITY_RED_HIDDEN", "triage.state", "full audit PASS só com 0 vulnerabilidades");
  }
  for (const [rel, text] of s.scriptsAndWorkflows) if (/npm audit fix[^\n]*--force/.test(text)) fail("AUDIT_FIX_FORCE", rel, "npm audit fix --force automático");
  const wf = s.src.securityWorkflow;
  if (!wf) fail("SECURITY_WORKFLOW_REMOVED", FILES.securityWorkflow, "workflow de segurança");
  else {
    if (!/npm audit --omit=dev --audit-level=moderate/.test(wf) || !/npm audit --audit-level=moderate/.test(wf)) fail("AUDIT_THRESHOLD_LOWERED", FILES.securityWorkflow, "prod + full com --audit-level=moderate");
    if (/continue-on-error:\s*true/.test(wf) || /\|\|\s*true/.test(wf)) fail("AUDIT_DISABLED", FILES.securityWorkflow, "auditoria não pode ser ignorada");
    if (!/codeql/i.test(wf)) fail("SECURITY_WORKFLOW_REMOVED", FILES.securityWorkflow, "CodeQL");
  }
  const overrides = s.packageJson.overrides ?? {};
  for (const [pkg, value] of Object.entries(overrides)) if (value === "*" || value === "latest") fail("UNSAFE_OVERRIDE", `package.json overrides.${pkg}`, "override com versão fixa");
  return failures;
}

// ── 2. Prontidão ───────────────────────────────────────────────────────────

export async function validateReadiness(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.readiness, (mods) => {
    const r = mods.readiness;
    const evaluate = (patch) => r.evaluateReadiness({ ...greenScenario(), ...patch });
    const green = greenScenario();
    if (evaluate({}).state !== "CLOSED_BETA_READY") fail("READINESS_UNREACHABLE", "evaluateReadiness", "tudo PASS com evidência → CLOSED_BETA_READY");
    const expectState = (patch, wantMax, code, why) => {
      const order = r.READINESS_STATES;
      const got = evaluate(patch).state;
      if (order.indexOf(got) > order.indexOf(wantMax)) fail(code, "evaluateReadiness", `${why}: veio ${got}`);
    };
    expectState({ security: { ...green.security, fullAudit: "FAIL" } }, "NOT_READY", "SECURITY_RED_CANDIDATE", "segurança vermelha nunca vira candidato");
    expectState({ security: { ...green.security, gitleaks: "FAIL" } }, "NOT_READY", "SECURITY_RED_CANDIDATE", "gitleaks vermelho");
    expectState({ code: "FAIL" }, "NOT_READY", "CODE_RED_CANDIDATE", "código vermelho");
    expectState({ androidBuild: "FAIL" }, "NOT_READY", "ANDROID_BUILD_RED_CANDIDATE", "build Android vermelho");
    expectState({ bugs: { p0Open: 0, releaseBlockingP1: 1 } }, "PRE_CANDIDATE", "P1_IGNORED", "P1 que bloqueia release");
    expectState({ bugs: { p0Open: 1, releaseBlockingP1: 0 } }, "PRE_CANDIDATE", "P0_IGNORED", "P0 aberto");
    expectState({ physical: { ...green.physical, selfPlaybackAudible: { status: "NOT_RUN" } } }, "PRE_CANDIDATE", "SELF_PLAYBACK_NOT_REQUIRED", "voz própria NOT_RUN");
    expectState({ physical: { ...green.physical, ttsCritical: { status: "NOT_RUN" } } }, "PRE_CANDIDATE", "TTS_NOT_REQUIRED", "TTS crítico NOT_RUN");
    expectState({ physical: { ...green.physical, mobileSignup: { status: "NOT_RUN" } } }, "PRE_CANDIDATE", "SIGNUP_NOT_REQUIRED", "cadastro NOT_RUN");
    expectState({ physical: { ...green.physical, passwordRecovery: { status: "NOT_RUN" } } }, "PRE_CANDIDATE", "RECOVERY_NOT_REQUIRED", "recuperação NOT_RUN");
    expectState({ criticalLessonDeadEnd: true }, "PRE_CANDIDATE", "DEAD_END_IGNORED", "beco sem saída em lição crítica");
    expectState({ play: { ...green.play, internalInstall: { status: "NOT_RUN" } } }, "CANDIDATE", "PLAY_INSTALL_NOT_REQUIRED", "instalação pela Play NOT_RUN");
    expectState({ play: { ...green.play, nToNPlus1: { status: "NOT_RUN" } } }, "CANDIDATE", "N_TO_N_PLUS_1_NOT_REQUIRED", "N→N+1 NOT_RUN");
    expectState({ physical: { ...green.physical, lifecycle: { status: "NOT_RUN" } } }, "CANDIDATE", "LIFECYCLE_NOT_REQUIRED", "ciclo de vida NOT_RUN");
    expectState({ criticalPhysicalMatrix: "NOT_PASS" }, "CANDIDATE", "PHYSICAL_MATRIX_NOT_REQUIRED", "matriz física crítica");
    // Tipo de evidência errado nunca vira PASS físico.
    const as = (evidenceType) => ({ physical: { ...green.physical, selfPlaybackAudible: { ...PHYS, evidenceType } } });
    expectState(as("HUMAN_FEEDBACK_FORM"), "PRE_CANDIDATE", "FEEDBACK_AS_PHYSICAL", "formulário de feedback");
    expectState(as("AUTOMATED_SCREENSHOT"), "PRE_CANDIDATE", "SCREENSHOT_AS_PHYSICAL", "screenshot automatizado");
    expectState(as("CODE"), "PRE_CANDIDATE", "CODE_AS_PHYSICAL", "CODE PASS");
    expectState(as("SINGLE_FUNCTION_CALL"), "PRE_CANDIDATE", "FUNCTION_CALL_AS_FEATURE", "uma chamada que deu certo");
    expectState({ physical: { ...green.physical, selfPlaybackAudible: { ...PHYS, testedAt: null } } }, "PRE_CANDIDATE", "PASS_WITHOUT_DATE", "PASS sem data");
    expectState({ play: { ...green.play, internalInstall: { ...PLAY, buildChannel: "DEBUG_APK" } } }, "CANDIDATE", "DEBUG_APK_AS_PLAY", "APK de debug");
    expectState({ play: { ...green.play, nToNPlus1: { ...PLAY, buildChannel: "QA_APK" } } }, "CANDIDATE", "DEBUG_APK_AS_PLAY", "APK de QA");
    // O documento: estado declarado = calculado a partir dele.
    const doc = s.readiness;
    if (!doc) {
      fail("READINESS_DOC_MISSING", "docs/release/rc2-2-22-closed-beta-readiness.json", "prontidão formal");
      return;
    }
    for (const section of READINESS_SECTIONS) if (!(section in doc)) fail("READINESS_SECTION_MISSING", `readiness.${section}`, "seções separadas");
    const computed = r.evaluateReadiness({
      code: doc.code?.status,
      security: doc.security,
      androidBuild: doc.androidBuild?.status,
      bugs: doc.bugs,
      criticalLessonDeadEnd: doc.criticalLessonDeadEnd,
      physical: doc.physical,
      play: doc.play,
      criticalPhysicalMatrix: s.deviceQa?.physicalCriticalMatrix === "PASS" ? "PASS" : "NOT_PASS",
    });
    if (doc.declaredState !== computed.state) fail("READINESS_STATE_INFLATED", "readiness.declaredState", `${doc.declaredState} ≠ calculado ${computed.state}`);
    if (doc.bugs?.releaseBlockingP1 !== s.bugs?.releaseBlockingOpen) fail("P1_IGNORED", "readiness.bugs.releaseBlockingP1", `${doc.bugs?.releaseBlockingP1} ≠ manifesto ${s.bugs?.releaseBlockingOpen}`);
    if (doc.CLOSED_BETA !== "NO_GO" && computed.state !== "CLOSED_BETA_READY") fail("CLOSED_BETA_PREMATURE", "readiness.CLOSED_BETA", "NO_GO até CLOSED_BETA_READY");
    if (doc.PUBLIC_BETA !== "NO_GO") fail("PUBLIC_BETA_PREMATURE", "readiness.PUBLIC_BETA", "NO_GO");
    for (const [key, check] of Object.entries(doc.physical ?? {}))
      if (check?.status === "PASS" && !r.physicalPass(check)) fail("FAKE_PHYSICAL_PASS", `readiness.physical.${key}`, "PASS sem evidência física");
    for (const [key, check] of Object.entries(doc.play ?? {}))
      if (check?.status === "PASS" && !r.playPass(check)) fail("DEBUG_APK_AS_PLAY", `readiness.play.${key}`, "PASS da Play só com build da Play");
    const sec = s.triage?.securityGreen ?? {};
    for (const key of ["productionAudit", "fullAudit", "gitleaks", "codeql"]) if (doc.security?.[key] !== sec[key]) fail("SECURITY_RED_HIDDEN", `readiness.security.${key}`, "igual à triagem");
  });
  return failures;
}

// ── 3. Compatibilidade por aparelho ────────────────────────────────────────

export async function validateDeviceCompatibility(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.compat, (mods) => {
    const c = mods.compat;
    const classify = c.classifyFailure;
    // Limite do aparelho, com evidência, não é bug do Longyu.
    if (classify({ area: "speech", code: "LANGUAGE_NOT_SUPPORTED", probe: { recognitionServiceAvailable: true, zhCnSupported: false } }) !== "DEVICE_CAPABILITY_LIMITATION")
      fail("CAPABILITY_AS_LONGYU_BUG", "classifyFailure", "sem zh-CN (com probe) = limite do aparelho");
    if (classify({ area: "speech", code: "RECOGNITION_UNAVAILABLE", probe: { recognitionServiceAvailable: false, onDeviceAvailable: false } }) !== "ANDROID_SERVICE_LIMITATION")
      fail("CAPABILITY_AS_LONGYU_BUG", "classifyFailure", "sem serviço = limite do Android");
    if (classify({ area: "speech", code: "NETWORK", probe: { recognitionServiceAvailable: true, zhCnSupported: true, online: false } }) !== "NETWORK_DEPENDENCY")
      fail("CAPABILITY_AS_LONGYU_BUG", "classifyFailure", "offline = dependência de rede");
    if (classify({ area: "tts", code: "TTS_LANGUAGE_MISSING_DATA", probe: { ttsZhCnInstalled: false } }) !== "DEVICE_CAPABILITY_LIMITATION")
      fail("CAPABILITY_AS_LONGYU_BUG", "classifyFailure", "voz zh-CN não instalada = limite do aparelho");
    // Bug do Longyu nunca vira limite do aparelho.
    if (classify({ area: "speech", code: "CLIENT", probe: null }) !== "LONGYU_BUG") fail("LONGYU_BUG_HIDDEN", "classifyFailure", "sem evidência = bug do Longyu");
    if (classify({ area: "speech", code: "CLIENT", probe: { recognitionServiceAvailable: true, zhCnSupported: true, online: true } }) !== "LONGYU_BUG") fail("LONGYU_BUG_HIDDEN", "classifyFailure", "aparelho capaz + falha = bug do Longyu");
    for (const area of ["self_compare", "auth", "lesson", "navigation", "lifecycle"])
      if (classify({ area, code: "RECOGNITION_UNAVAILABLE", probe: { recognitionServiceAvailable: false, onDeviceAvailable: false, zhCnSupported: false } }) !== "LONGYU_BUG")
        fail("LONGYU_BUG_HIDDEN", "classifyFailure", `${area} precisa funcionar em qualquer Android suportado`);
    if (classify({ area: "self_compare", code: "MEDIA_VOLUME_ZERO", probe: { mediaVolumeZero: true } }) !== "CONFIGURATION_ERROR") fail("CONFIG_AS_BUG", "classifyFailure", "volume zerado = configuração");
    const states = [
      [{ recognitionServiceAvailable: false, onDeviceAvailable: false }, "UNAVAILABLE"],
      [{ recognitionServiceAvailable: true, onDeviceAvailable: true, zhCnInstalledOnDevice: true, zhCnSupported: true }, "FULL"],
      [{ recognitionServiceAvailable: true, onDeviceAvailable: false, zhCnSupported: true }, "NETWORK_ONLY"],
      [{ recognitionServiceAvailable: true, onDeviceAvailable: true, zhCnInstalledOnDevice: false, zhCnSupported: true }, "NETWORK_ONLY"],
      [{ recognitionServiceAvailable: true, zhCnSupported: false }, "NO_ZH_CN"],
    ];
    for (const [probe, want] of states) if (c.recognizerMatrixState(probe) !== want) fail("RECOGNIZER_MATRIX_WRONG", "recognizerMatrixState", `${JSON.stringify(probe)} → ${want}`);
    const summary = c.manufacturerSummary([
      { deviceId: "D01", tested: true, manufacturer: "samsung", classes: ["OWNER_DEVICE"], capabilities: {} },
      { deviceId: "D02", tested: false, manufacturer: "motorola", classes: ["SMALL_ANDROID"], capabilities: {} },
    ]);
    if (summary.length !== 1 || summary[0].manufacturer !== "samsung" || summary[0].scope !== "TESTED_DEVICES_ONLY") fail("OEM_GENERALIZED", "manufacturerSummary", "só fabricantes realmente testados, com escopo explícito");
    const qa = s.deviceQa;
    if (!qa) {
      fail("DEVICE_QA_MISSING", "docs/release/rc2-2-22-device-qa.json", "matriz física da onda");
      return;
    }
    for (const device of qa.devices ?? []) {
      if (c.GENERALIZED_MANUFACTURER.test(String(device.manufacturer ?? ""))) fail("OEM_GENERALIZED", `device-qa.devices.${device.deviceId}`, "fabricante genérico");
      if (!/^D\d{2,3}$/.test(String(device.deviceId ?? ""))) fail("DEVICE_PII", `device-qa.devices.${device.deviceId}`, "ID opaco (D01…)");
    }
    for (const row of qa.recognizerMatrix ?? []) {
      if (c.GENERALIZED_MANUFACTURER.test(String(row.manufacturer ?? "")) || row.scope === "ALL_ANDROID") fail("OEM_GENERALIZED", "device-qa.recognizerMatrix", "resultado de um aparelho não vale para todos");
      if (!(qa.devices ?? []).some((device) => device.deviceId === row.deviceId && device.tested)) fail("DEVICE_INVENTED", "device-qa.recognizerMatrix", `linha sem aparelho testado (${row.deviceId})`);
    }
    // Import sem reset dos 23 testes da RC2.2.21.
    const prev = s.previousDeviceQa?.tests ?? {};
    const imported = Object.entries(qa.tests ?? {}).filter(([, t]) => t.importedFrom === "RC2.2.21");
    if (Object.keys(prev).length !== RC2_2_21_TESTS || imported.length !== RC2_2_21_TESTS) fail("RC2_2_21_TESTS_NOT_IMPORTED", "device-qa.tests", `${imported.length}/${RC2_2_21_TESTS} importados`);
    for (const [id, test] of Object.entries(prev))
      if (qa.tests?.[id] && test.status !== "NOT_RUN" && qa.tests[id].status === "NOT_RUN") fail("HISTORY_RESET", `device-qa.${id}`, "resultado anterior não pode voltar a NOT_RUN");
    if (qa.importedFrom?.historyReset !== false) fail("HISTORY_RESET", "device-qa.importedFrom", "historyReset = false");
    for (const id of ["selfPlaybackAudible", "selfPlaybackAfterPermissionDialog", "nativeSpeechZhCnRecognized", "lessonAdvanceDevice", "mobileSignupDevice", "passwordRecoveryDevice", "smallScreen360"])
      if (!(qa.priorityOrder ?? []).includes(id)) fail("PRIORITY_MISSING", "device-qa.priorityOrder", id);
    const physicalTypes = ["OWNER_OBSERVED", "TESTER_OBSERVED", "SCREEN_RECORDING", "MANUAL_SCREENSHOT", "DIAGNOSTIC_TRACE"];
    for (const [id, test] of Object.entries(qa.tests ?? {})) {
      if (test.status !== "PASS") continue;
      if (!physicalTypes.includes(String(test.evidenceType)) || !test.testedAt || !test.buildSha || !test.deviceClass) fail("FAKE_PHYSICAL_PASS", `device-qa.${id}`, "PASS físico com evidência completa");
      if (test.group === "play" && !["PLAY_INTERNAL", "PLAY_CLOSED"].includes(String(test.buildChannel))) fail("DEBUG_APK_AS_PLAY", `device-qa.${id}`, "teste de Play só com build da Play");
    }
    if (qa.physicalCriticalMatrix === "PASS" && Object.values(qa.tests ?? {}).some((t) => t.critical && t.status !== "PASS")) fail("FAKE_PHYSICAL_PASS", "device-qa.physicalCriticalMatrix", "matriz só com todos os críticos PASS");
  });
  // Sem hack por marca no app.
  for (const [rel, text] of Object.entries(s.appSources)) {
    const code = stripComments(text);
    if (/(brand|manufacturer|MANUFACTURER)\s*===?\s*["'](samsung|xiaomi|motorola|google|huawei|oppo|vivo|oneplus)/i.test(code)) fail("OEM_HACK", rel, "decidir por capacidade/serviço, nunca por marca");
  }
  if (/Build\.(MANUFACTURER|BRAND)\s*\.\s*equals|"(samsung|xiaomi|motorola)"\.equals/i.test(s.src.plugin)) fail("OEM_HACK", FILES.plugin, "decidir por capacidade/serviço, nunca por marca");
  return failures;
}

// ── 4. Feedback / sessão humana ────────────────────────────────────────────

export async function validateBetaFeedback(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.betaQa, (mods) => {
    const b = mods.betaQa;
    if ((b.BETA_ISSUE_CATEGORIES ?? []).length !== 9) fail("FEEDBACK_CATEGORIES_WRONG", "BETA_ISSUE_CATEGORIES", "9 categorias");
    // JWT de teste montado em partes — literal contíguo dispara gitleaks (generic-api-key).
    const fakeJwt = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxIn0", "abcdefghij"].join(".");
    const events = [
      { at: 1, name: "route_changed", route: "/licao/l1/player", detail: { from: "/jornada" } },
      { at: 2, name: "speech_result", route: "/licao/l1/player", detail: { transcript: "你好", text: "resposta do aluno", note: "ana@exemplo.com", token: fakeJwt } },
    ];
    const context = { route: "/licao/l1/player", lessonId: "l1", stepKind: "listen", build: "b43ca4465319", viewport: "360x640", platform: "android", email: "ana@exemplo.com", password: "x", otp: "123456", answerText: "resposta digitada" };
    const ok = b.buildIssuePacket({ category: "AUDIO", comment: "o áudio não tocou no passo 2", context, events });
    const text = JSON.stringify(ok.packet ?? {});
    if (!ok.packet) fail("FEEDBACK_REJECTS_VALID", "buildIssuePacket", "relato válido aceito");
    if (/exemplo\.com/.test(text)) fail("FEEDBACK_PII", "buildIssuePacket", "e-mail nunca entra no relato");
    if (/123456|"otp"|"password"/.test(text)) fail("FEEDBACK_OTP", "buildIssuePacket", "OTP/senha nunca entram");
    if (/你好|transcript|resposta do aluno|resposta digitada/.test(text)) fail("FEEDBACK_TRANSCRIPT", "buildIssuePacket", "transcrição/texto do aluno nunca entram");
    if (/eyJhbGci/.test(text)) fail("BUG_PACKET_SECRET", "buildIssuePacket", "token nunca entra");
    if (ok.packet && (ok.packet.context.lessonId !== "l1" || ok.packet.context.stepKind !== "listen")) fail("FEEDBACK_CONTEXT_MISSING", "buildIssuePacket", "rota/lição/passo/build/viewport/plataforma");
    if (ok.packet?.physicalPass !== false) fail("FEEDBACK_AS_PHYSICAL", "buildIssuePacket", "relato nunca é PASS físico");
    if (b.buildIssuePacket({ category: "AUDIO", comment: "meu email é ana@exemplo.com", context: {} }).packet) fail("FEEDBACK_PII", "buildIssuePacket", "comentário com e-mail recusado");
    if (b.buildIssuePacket({ category: "AUDIO", comment: "o código era 482913", context: {} }).packet) fail("FEEDBACK_OTP", "buildIssuePacket", "comentário com OTP recusado");
    const session = { sessionId: "S01", testerId: "T01", testerCategory: "BEGINNER", build: "cc66db9dd5cf", deviceClass: "OWNER_DEVICE", courseDirection: "pt-zh", lessonIds: ["l1"], resultCategories: ["COMPLETED_ALONE"], sessionLoad: { coachmarks: 1, unlockReveals: 0, ceremonies: 0, permissions: 1 } };
    if (b.validateHumanQaSession(session).length) fail("HUMAN_SESSION_REJECTS_VALID", "validateHumanQaSession", b.validateHumanQaSession(session).join(","));
    const bad = (patch, code, why) => {
      if (!b.validateHumanQaSession({ ...session, ...patch }).includes(code)) fail(code === "SESSION_CLAIMS_PHYSICAL_PASS" ? "FEEDBACK_AS_PHYSICAL" : "HUMAN_SESSION_PII", "validateHumanQaSession", why);
    };
    bad({ testerId: "ana@exemplo.com" }, "TESTER_ID_NOT_OPAQUE", "tester só por ID (T01)");
    bad({ email: "ana@exemplo.com" }, "FORBIDDEN_FIELD", "sessão sem e-mail");
    bad({ otp: "123456" }, "FORBIDDEN_FIELD", "sessão sem OTP");
    bad({ transcript: "你好" }, "FORBIDDEN_FIELD", "sessão sem transcrição");
    bad({ comment: "falei com ana@exemplo.com" }, "SESSION_HAS_PII", "comentário sem PII");
    bad({ physicalPass: true }, "SESSION_CLAIMS_PHYSICAL_PASS", "sessão humana não marca PASS físico");
    bad({ status: "PASS" }, "SESSION_CLAIMS_PHYSICAL_PASS", "sessão humana não marca PASS físico");
    if (b.betaQaEnabled({})) fail("FEEDBACK_IN_PRODUCTION", "betaQaEnabled", "desligado na Production Beta");
    if (!b.betaQaEnabled({ VITE_BETA_QA: "true" })) fail("FEEDBACK_ENTRY_MISSING", "betaQaEnabled", "ligado no build de tester");
  });
  const reporter = stripComments(s.src.reporter);
  if (!/buildIssuePacket\(/.test(reporter)) fail("FEEDBACK_UNSANITIZED", FILES.reporter, "relato passa pela sanitização");
  if (/supabase|fetch\(|sendBeacon|XMLHttpRequest|feedbackService|submitFeedback/i.test(reporter)) fail("NEW_CLOUD_FEEDBACK", FILES.reporter, "#273 congelada: sem nuvem nova; exportação manual");
  if (/Encontrou um problema\?/.test(reporter) === false) fail("FEEDBACK_ENTRY_MISSING", FILES.reporter, "“Encontrou um problema?”");
  const shell = stripComments(s.src.appShell);
  if (/<BetaIssueReporter/.test(shell) && !/import\.meta\.env\.VITE_BETA_QA === "true" && \(/.test(shell)) fail("FEEDBACK_IN_PRODUCTION", FILES.appShell, "entrada só no build de tester");
  if (!/<BetaIssueReporter \/>/.test(s.src.qaPage)) fail("FEEDBACK_ENTRY_MISSING", FILES.qaPage, "relato também no /qa/device");
  return failures;
}

// ── 5. Lint de produto ─────────────────────────────────────────────────────

export async function validateProductLint(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.lint, (mods) => {
    const l = mods.lint;
    if (l.GUIDED_PRIMARY_CTA_LIMIT !== 1) fail("MULTIPLE_PRIMARY_CTAS", "GUIDED_PRIMARY_CTA_LIMIT", "sessão guiada: uma ação principal");
    const screen = { paragraphs: 1, chips: 0, interactiveControls: 2, instructionChars: 60 };
    if (!(l.complexityScore({ ...screen, ctas: 2 }) > l.complexityScore({ ...screen, ctas: 1 }))) fail("MULTIPLE_PRIMARY_CTAS", "complexityScore", "duas ações principais pesam na complexidade");
    if (l.complexityLevel({ ctas: 3, paragraphs: 4, chips: 6, interactiveControls: 8, instructionChars: 400 }) !== "OVERLOADED") fail("COMPLEXITY_LINT_BLIND", "complexityLevel", "tela lotada = OVERLOADED");
    const same = { kind: "comprehend", hanzi: "你好", answer: "Olá" };
    if (l.badRepetitions([same, { kind: "listen", text: "你好" }, same]).length === 0) fail("REPETITION_AUDIT_BYPASSED", "badRepetitions", "mesma pergunta/resposta/forma perto = repetição ruim");
    if (l.badRepetitions([same, { kind: "tone", hanzi: "你好" }, { kind: "reverse_recall", pt: "Olá", answer: "你好" }]).length !== 0) fail("REPETITION_FALSE_ALARM", "badRepetitions", "mesmo alvo com ação cognitiva diferente é repetição válida");
    if (!(l.MIN_SAME_QUESTION_GAP >= 3)) fail("REPETITION_AUDIT_BYPASSED", "MIN_SAME_QUESTION_GAP", "distância mínima ≥ 3");
    const b = mods.betaQa;
    const budget = b.FIRST_SESSION_LOAD_BUDGET ?? {};
    if (!(budget.coachmarks <= 2 && budget.ceremonies <= 1 && budget.permissions <= 1 && budget.unlockReveals <= 1)) fail("POPUP_BUDGET_REMOVED", "FIRST_SESSION_LOAD_BUDGET", "primeira sessão leve");
    const over = b.sessionLoadExceeded(b.sessionLoad([{ name: "coachmark_shown" }, { name: "coachmark_shown" }, { name: "coachmark_shown" }]));
    if (!over.includes("coachmarks")) fail("POPUP_BUDGET_REMOVED", "sessionLoadExceeded", "3 orientações estouram o orçamento");
    const o = mods.orchestrator;
    if (!(o.GUIDANCE_SESSION_BUDGET >= 1 && o.GUIDANCE_SESSION_BUDGET <= 1 && o.GUIDANCE_FIRST_SESSION_BUDGET <= 2)) fail("POPUP_BUDGET_REMOVED", "guidanceOrchestrator", "orçamento de orientações por sessão (1; 2 na primeira)");
  });
  const audit = s.first20;
  if (!audit) fail("FIRST20_AUDIT_MISSING", "docs/reports/rc2-2-22-first-20-lesson-audit.json", "auditoria das 20 primeiras");
  else {
    if (audit.sessions?.length !== 20) fail("FIRST20_AUDIT_MISSING", "first20.sessions", "20 sessões");
    for (const session of audit.sessions ?? []) {
      for (const field of ["objective", "newMaterial", "reviewMaterial", "stepCount", "interactionFamilies", "targetRepetition", "visualSupportSteps", "realLifeTransfer"])
        if (session[field] === undefined) fail("FIRST20_AUDIT_INCOMPLETE", `first20.session${session.session}`, field);
      if (session.observedDurationMedianMin != null && !s.reports.human.includes("OBSERVED")) fail("DURATION_INVENTED", `first20.session${session.session}`, "duração observada só com sessão humana registrada");
    }
    const lintBugs = (s.bugs?.bugs ?? []).filter((bug) => bug.discovery === "PRODUCT_LINT");
    if ((audit.totals?.sessionsWithoutTransfer ?? []).length && !lintBugs.some((bug) => /TRANSFER/.test(bug.id))) fail("LINT_FINDING_HIDDEN", "rc2-2-22-beta-bugs.json", "sessões sem transferência viram achado");
    if ((audit.totals?.badRepetitions ?? 0) > 0 && !lintBugs.some((bug) => /REPETITION/.test(bug.id))) fail("LINT_FINDING_HIDDEN", "rc2-2-22-beta-bugs.json", "repetição ruim vira achado");
  }
  if (s.src.betaConsole && !/sessionLoadExceeded\(/.test(s.src.betaConsole)) fail("POPUP_BUDGET_REMOVED", FILES.betaConsole, "console mostra a carga da sessão contra o orçamento");
  return failures;
}

// ── 6. Estabilidade ────────────────────────────────────────────────────────

export async function validateStability(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.arbiter, (mods) => {
    const a = mods.arbiter;
    a.resetAudioArbiterForTests?.();
    let stops = 0;
    a.claimAudio("TTS", () => (stops += 1));
    a.claimAudio("SELF_PLAYBACK", () => (stops += 1));
    a.claimAudio("RECORDING", () => (stops += 1));
    a.claimAudio("TTS");
    a.claimAudio("RECOGNITION");
    if (stops !== 3 || a.currentAudioOwner() !== "RECOGNITION") fail("AUDIO_TWO_OWNERS", "claimAudio", `cadeia TTS→self→gravar→TTS→reconhecer para o anterior sempre (paradas=${stops})`);
    a.resetAudioArbiterForTests?.();
    const f = mods.speechFailure;
    for (const category of f.SPEECH_FAILURE_CATEGORIES ?? [])
      for (const opts of [{ canRecord: false, canDownload: false }, { canRecord: true, canDownload: true }])
        if (!f.speechFallbackActions(category, opts).includes("continue_without_speaking")) fail("SPEECH_BLOCKS_LESSON", "speechFallbackActions", `${category} sem Continuar sem falar`);
    const u = mods.upgrade;
    const account = {
      completedLessons: ["l1", "l2"],
      points: 300,
      dragonPearls: 20,
      rewardHistory: [1],
      pearlMilestonesClaimed: { a: 1 },
      journeyChestsOpened: ["c1"],
      medals: ["m1"],
      achievementsUnlocked: { x: 1 },
      srs: { a: { reps: 2 } },
      cultureCompletedIds: [],
      guidance: { enabled: true, records: { a: { status: "SHOWN" }, b: { status: "DISMISSED" } }, availabilityMemory: ["practice"] },
      dailyGoalMinutes: 10,
      courseDirection: "pt-zh",
    };
    const before = u.takeUpgradeSnapshot(account, { versionCode: 10, buildSha: "a" });
    const after = (patch) => u.takeUpgradeSnapshot({ ...account, ...patch }, { versionCode: 11, buildSha: "b" });
    if (!u.compareUpgradeSnapshots(before, after({ guidance: { ...account.guidance, records: { a: { status: "AUTO_SEEDED" }, b: { status: "AUTO_SEEDED" } } } })).includes("GUIDANCE_RESET"))
      fail("GUIDANCE_RESET", "compareUpgradeSnapshots", "update que reapresenta dicas antigas é violação");
    if (!u.compareUpgradeSnapshots(before, after({ rewardHistory: [1, 2] })).includes("REWARD_DUPLICATED")) fail("REWARD_DUPLICATED", "compareUpgradeSnapshots", "recompensa duplicada");
    if (!u.compareUpgradeSnapshots(before, after({ points: 400 })).includes("XP_DUPLICATED")) fail("REWARD_DUPLICATED", "compareUpgradeSnapshots", "XP duplicado");
    const o = mods.orchestrator;
    const v2 = { version: 2, enabled: true, initialized: true, availabilityMemory: ["practice"], records: { a: { status: "SHOWN", at: 1, evidence: "render" }, b: { status: "DISMISSED", at: 2 } } };
    const again = o.normalizeGuidanceState(v2);
    if (again.records.a?.status !== "SHOWN" || again.records.b?.status !== "DISMISSED") fail("GUIDANCE_RESET", "normalizeGuidanceState", "reabrir/atualizar preserva orientações vistas");
    const r = mods.resources;
    r.resetResourceCountersForTests?.();
    const release = r.trackObserver();
    release();
    release();
    if (r.jsResourceCounters().activeObservers !== 0) fail("RESOURCE_LEAK", "trackObserver", "liberar duas vezes não vaza nem fica negativo");
    if (r.idleLeaks({ activeMediaPlayers: 1, activeRecorders: 0 }).join() !== "activeMediaPlayers") fail("RESOURCE_LEAK", "idleLeaks", "player vivo em repouso é vazamento");
  });
  const java = stripComments(s.src.plugin);
  const play = body(java, "public void playPracticeRecording(PluginCall call)");
  const finishAt = play.indexOf('if (practicePlayCall != null) finishPracticePlay("STOPPED");');
  const releaseAt = play.indexOf("releasePracticePlayer();");
  const newAt = play.indexOf("practicePlayer = new MediaPlayer();");
  if (finishAt < 0 || releaseAt < 0 || newAt < 0 || releaseAt > newAt) fail("AUDIO_PLAYER_LEAK", "playPracticeRecording", "toque repetido libera o player anterior antes de criar outro");
  if (!/public void getResourceCounters\(PluginCall call\)/.test(java) || !/activeMediaPlayers/.test(java) || !/activeRecognizers/.test(java)) fail("RESOURCE_COUNTERS_MISSING", FILES.plugin, "contadores de recurso para o QA");
  const ui = stripComments(s.src.selfCompare);
  const cleanup = /useEffect\(\s*\(\) => \(\) => \{([\s\S]*?)\},\s*\[native\]\s*\);/.exec(ui)?.[1] ?? "";
  if (!/nativeDeletePracticeRecording\(\)/.test(cleanup) || !/URL\.revokeObjectURL\(webUrlRef\.current\)/.test(cleanup)) fail("RECORDING_KEPT", FILES.selfCompare, "sair apaga a gravação (nativa e web)");
  if (!/onClick=\{onContinue\}/.test(stripComments(s.src.pronunciation)) || !/onCannotSpeak=\{onContinue\}/.test(s.src.pronunciation)) fail("SPEECH_BLOCKS_LESSON", FILES.pronunciation, "sempre há Continuar sem falar");
  const player = stripComments(s.src.player);
  const onlineUses = player.match(/\bonline\b/g) ?? [];
  if (/disabled=\{[^}]*!online/.test(player) || /if \(!online\)\s*(return|\{)/.test(player) || onlineUses.length > 2) fail("OFFLINE_BLOCKS_LESSON", FILES.player, "offline só avisa; lição local continua");
  return failures;
}

// ── 7. Verdade de release ──────────────────────────────────────────────────

export async function validateReleaseTruth(s) {
  const { failures, fail } = collector();
  const base = s.base;
  if (!base) fail("BASE_MISSING", "docs/release/rc2-2-22-base.json", "base da onda empilhada");
  else {
    if (base.RC2_2_22_BASE_SHA !== RC2_2_22_BASE_SHA || base.parentWave !== "RC2.2.21" || base.strategy !== "STACKED") fail("BASE_SHA_AMBIGUOUS", "rc2-2-22-base.json", `STACKED sobre ${RC2_2_22_BASE_SHA}`);
    if (base.prTargetWhileParentOpen !== RC2_2_22_PARENT_BRANCH || base.doNotDuplicateParentCommits !== true) fail("PARENT_COMMITS_DUPLICATED", "rc2-2-22-base.json", "PR mira a RC2.2.21; nunca recriar commits");
    if (!headCarriesStackedWave(ROOT, RC2_2_22_BASE_SHA)) {
      if (!process.env.RC2_2_22_SKIP_ANCESTRY) fail("BASE_SHA_AMBIGUOUS", "git", `${RC2_2_22_BASE_SHA} precisa ser ancestral do HEAD`);
    }
  }
  const bugs = s.bugs;
  if (!bugs) fail("BUGS_MISSING", "docs/release/rc2-2-22-beta-bugs.json", "manifesto de bugs");
  else {
    if (bugs.importedFrom?.historyReset !== false) fail("HISTORY_RESET", "beta-bugs.importedFrom", "sem reset");
    const list = bugs.bugs ?? [];
    for (const id of ["SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID", "NATIVE_SPEECH_NOT_PROVEN", "ANDROID_TTS_NOT_PROVEN_ACROSS_SURFACES", "LESSON_ADVANCE_DEVICE_REGRESSION_RISK", "MOBILE_SIGNUP_NOT_PHYSICALLY_PROVEN", "PASSWORD_RECOVERY_NOT_PHYSICALLY_PROVEN", "GUIDANCE_NOT_PHYSICALLY_PROVEN", "ANDROID_LIFECYCLE_STATE_LOSS"]) {
      const bug = list.find((item) => item.id === id);
      if (!bug || bug.severity !== "P1" || bug.releaseBlocking !== true) fail("P1_IGNORED", `beta-bugs.${id}`, "P1 continua P1 enquanto bloquear fluxo crítico");
    }
    for (const bug of list) {
      if (bug.severity === "P1" && (!bug.owner || !bug.reproduction || !bug.status)) fail("P1_WITHOUT_OWNER", `beta-bugs.${bug.id}`, "P1 precisa de owner, reprodução e status");
      if (bug.status === "PHYSICAL_PASS" && !(bug.physicalEvidence?.testedAt && bug.physicalEvidence?.evidenceType)) fail("FAKE_PHYSICAL_PASS", `beta-bugs.${bug.id}`, "PHYSICAL_PASS com evidência");
      if (bug.discovery === "PHYSICAL_TEST" && bug.status !== "PHYSICAL_PASS")
        for (const field of ["build", "deviceClass", "reproduction", "diagnosticSnapshot"]) if (!bug[field]) fail("PHYSICAL_FAIL_UNSTRUCTURED", `beta-bugs.${bug.id}`, `falha física precisa de ${field}`);
      const snapshot = JSON.stringify(bug.diagnosticSnapshot ?? "");
      if (/eyJ[A-Za-z0-9_-]{10,}\.|[A-Za-z0-9_-]{40,}|@[^\s"]+\.[a-z]{2,}|access_token|refresh_token|password/i.test(snapshot)) fail("BUG_PACKET_SECRET", `beta-bugs.${bug.id}`, "snapshot sem token/e-mail/senha");
    }
    for (const rc of bugs.rootCauses ?? []) if ((rc.bugs ?? []).length < 2) fail("ROOT_CAUSE_NOT_SHARED", `beta-bugs.rootCauses.${rc.id}`, "causa comum agrupa ≥ 2 bugs");
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
      if (JSON.stringify(panel[sev]) !== JSON.stringify(bugs.panel?.[sev])) fail("BUG_COUNTER_DRIFT", `beta-bugs.panel.${sev}`, `${JSON.stringify(bugs.panel?.[sev])} ≠ ${JSON.stringify(panel[sev])}`);
    }
    const blocking = list.filter((b) => b.releaseBlocking && !["PHYSICAL_PASS", "WONT_FIX_WITH_REASON"].includes(b.status)).length;
    if (bugs.releaseBlockingOpen !== blocking) fail("BUG_COUNTER_DRIFT", "beta-bugs.releaseBlockingOpen", `${bugs.releaseBlockingOpen} ≠ ${blocking}`);
  }
  const man = s.manifest;
  if (!man) fail("MANIFEST_MISSING", "docs/release/rc2-2-22-manifest.json", "manifesto da onda");
  else {
    if (man.PUBLIC_BETA !== "NO_GO" || man.CLOSED_BETA !== "NO_GO") fail("CLOSED_BETA_PREMATURE", "manifest", "PUBLIC/CLOSED NO_GO");
    if (man.readinessState !== s.readiness?.declaredState) fail("READINESS_STATE_INFLATED", "manifest.readinessState", "igual ao documento de prontidão");
    if (man.regression?.package !== "longyu.noba.com") fail("PACKAGE_CHANGED", "manifest.regression.package", "longyu.noba.com");
    if (man.regression?.androidInAppPurchase !== "DISABLED_FOR_BETA") fail("PURCHASES_ENABLED", "manifest.regression", "DISABLED_FOR_BETA");
    if (man.regression?.productionPlay !== "NOT_ENABLED") fail("PRODUCTION_PLAY_ENABLED", "manifest.regression", "NOT_ENABLED");
    if (man.prOpenedAutomatically !== false) fail("AUTO_PR", "manifest", "PR nunca automático");
    if (/@[^\s"]+\.[a-z]{2,}/i.test(JSON.stringify(man.humanQa ?? {}))) fail("HUMAN_SESSION_PII", "manifest.humanQa", "testers só por ID");
  }
  const human = s.reports.human;
  if (!human) fail("REPORT_MISSING", "docs/reports/rc2-2-22-human-learning-validation.md", "validação humana");
  else {
    for (const label of EVIDENCE_LABELS) if (!human.includes(label)) fail("REPORT_EVIDENCE_COLLAPSED", "human-learning-validation", `seção ${label}`);
    if (/@[^\s)]+\.[a-z]{2,}/i.test(human)) fail("HUMAN_SESSION_PII", "human-learning-validation", "sem e-mail de tester");
    const observed = /## OBSERVED([\s\S]*?)(## |$)/.exec(human)?.[1] ?? "";
    if (/\bT\d{2}\b/.test(observed) && !(s.manifest?.humanQa?.sessions > 0)) fail("HUMAN_SESSION_INVENTED", "human-learning-validation", "OBSERVED só com sessão registrada");
  }
  if (!s.reports.compat) fail("REPORT_MISSING", "docs/reports/rc2-2-22-device-compatibility.md", "compatibilidade");
  else if (/\|\s*(PASS)\s*\|/.test(s.reports.compat) && !(s.deviceQa?.devices ?? []).some((d) => d.tested)) fail("FAKE_PHYSICAL_PASS", "device-compatibility", "PASS só com aparelho testado");
  if (!s.reports.burndown) fail("REPORT_MISSING", "docs/reports/rc2-2-22-beta-bug-burndown.md", "burndown");
  if (!/appId: "longyu\.noba\.com"/.test(s.src.capacitorConfig)) fail("PACKAGE_CHANGED", "capacitor.config", "appId continua longyu.noba.com");
  if (!/export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;/.test(s.src.subscription)) fail("PURCHASES_ENABLED", FILES.subscription, "compras Android desligadas na Beta");
  if (!/MAX_AUTOMATIC_CHANNEL = "internal"/.test(stripComments(s.src.releaseIdentity))) fail("PRODUCTION_PLAY_ENABLED", FILES.releaseIdentity, "automático = internal");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("TOUCHED_273", "docs/release/rc2-candidate.json", "#273 congelada");
  if (!/export const RC2_2_22_CLOSED_BETA_CANDIDATE_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-22-closed-beta-candidate"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_22_CLOSED_BETA_CANDIDATE_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze)) fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
  return failures;
}

export const VALIDATORS = {
  security: validateSecurity,
  readiness: validateReadiness,
  "device-compatibility": validateDeviceCompatibility,
  "beta-feedback": validateBetaFeedback,
  "product-lint": validateProductLint,
  stability: validateStability,
  "release-truth": validateReleaseTruth,
};
