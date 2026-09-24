#!/usr/bin/env node
/**
 * RC2.2.12 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-12-android-release.mjs validate <área>
 *   node scripts/rc2-2-12-android-release.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação é pega com o código certo.
 * Gates em scripts/lib/rc2-2-12-gates.mjs.
 */
import assert from "node:assert/strict";
import { GATES, loadState, report } from "./lib/rc2-2-12-gates.mjs";

const [mode, area] = process.argv.slice(2);
const gate = GATES[area];
if (!gate || !["validate", "test"].includes(mode)) {
  console.error(`uso: validate|test <${Object.keys(GATES).join("|")}>`);
  process.exit(2);
}
const name = `${mode}:${area}`;
const base = await loadState();

if (mode === "validate") {
  const failures = await gate(base);
  console.log(report(name, failures));
  process.exit(failures.length ? 1 : 0);
}

function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: trecho não encontrado → ${from.slice(0, 80)}`);
  return String(text).split(from).join(to);
}
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
};
const SHA = "a".repeat(40);
const fullEvidence = (s) =>
  Object.assign(s.qa, {
    status: "PHYSICAL_QA_PASS",
    formalPass: true,
    sha: SHA,
    versionName: "0.2.0-beta.1",
    versionCode: 70,
    deviceModel: "SM-A525F",
    androidVersion: "14",
    isEmulator: false,
    testedAt: "2026-09-24T10:00:00Z",
    tester: "owner",
    debugOrRelease: "debug",
    coldStart: "PASS",
    backNavigation: "PASS",
    keyboard: "PASS",
    audio: "PASS",
    microphone: "PASS",
    backgroundResume: "PASS",
    p0Open: 0,
    p1Open: 0,
  });

const MUTATIONS = {
  "android-physical-readiness": [
    ["1. PASS físico sem evidência", "PHYSICAL_PASS_WITHOUT_EVIDENCE", (s) => Object.assign(s.qa, { formalPass: true, coldStart: "PASS", sha: SHA, deviceModel: "Pixel 8", isEmulator: false })],
    ["2. emulador contado como físico (manifesto)", "EMULATOR_COUNTED_AS_PHYSICAL", (s) => { fullEvidence(s); s.qa.isEmulator = true; }],
    ["2b. emulador contado como físico (classificador)", "EMULATOR_COUNTED_AS_PHYSICAL", src("devices", "export function isEmulator(device) {\n  return (", "export function isEmulator(device) {\n  return false && (")],
    ["3. PASS sem modelo do aparelho", "PHYSICAL_PASS_WITHOUT_DEVICE_MODEL", (s) => { fullEvidence(s); s.qa.deviceModel = null; }],
    ["4. PASS sem SHA", "PHYSICAL_PASS_WITHOUT_SHA", (s) => { fullEvidence(s); s.qa.sha = null; }],
    ["PASS formal com P1 aberto", "PHYSICAL_PASS_WITH_OPEN_BUGS", (s) => { fullEvidence(s); s.qa.p1Open = 1; }],
    ["android_real_device=true sem manifesto", "PHYSICAL_PASS_WITHOUT_EVIDENCE", (s) => { s.operational.checks.android_real_device.pass = true; }],
    ["13. BACK usa exitApp", "BACK_EXITS_APP", src("nativeShell", "else void App.minimizeApp();", "else void App.exitApp();")],
    ["14. RECORD_AUDIO removida", "RECORD_AUDIO_MISSING", src("manifest", '<uses-permission android:name="android.permission.RECORD_AUDIO" />', "")],
    ["15. recusa do microfone trava o app", "PERMISSION_DENIAL_BLOCKS", src("speech", 'catch {\n    return "denied";\n  }', "catch (error) {\n    throw error;\n  }")],
    ["16. perda de rede quebra o sync UX", "NETWORK_LOSS_BREAKS_SYNC_UX", src("syncUx", 'return { status: "pending", surface: "silent", message: null, retry: true', 'return { status: "error", surface: "global", message: null, retry: false')],
    ["permissão de câmera sem consumidor", "UNNEEDED_PERMISSION", src("manifest", '<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.CAMERA" />')],
  ],
  "android-release-candidate": [
    ["5. targetSdk reduzido", "TARGET_SDK_REDUCED", src("variablesGradle", "targetSdkVersion = 36", "targetSdkVersion = 34")],
    ["6. release assina com a debug key (gradle)", "RELEASE_USES_DEBUG_KEY", src("signingGradle", "signingConfigs.longyuRelease : null", "signingConfigs.longyuRelease : signingConfigs.debug")],
    ["6b. verificador aceita a debug key", "RELEASE_USES_DEBUG_KEY", src("verifySignature", 'if (parsed.debugKey) return { ok: false, code: "DEBUG_KEY_IN_RELEASE" };', "")],
    ["7. keystore rastreado", "KEYSTORE_TRACKED", (s) => s.tracked.push("android/app/longyu-upload.jks")],
    ["8. senha logada", "PASSWORD_LOGGED", src("androidCli", "function requireSigning() {", "function requireSigning() {\n  console.log(process.env.LONGYU_ANDROID_KEYSTORE_PASSWORD);")],
    ["9. versionCode repetido aceito", "VERSION_CODE_REPEATED", src("releaseIdentity", "if (!(Number.isInteger(candidate) && candidate > max)) {", "if (!(Number.isInteger(candidate) && candidate >= max)) {")],
    ["9b. ledger com versionCode repetido", "VERSION_CODE_REPEATED", (s) => { s.ledger.releases = [{ versionCode: 70 }, { versionCode: 70 }]; }],
    ["11. flag de username ligada sem cloud", "USERNAME_FLAG_WITHOUT_CLOUD", (s) => { s.src.envProduction += "\nVITE_USERNAME_LOGIN_ENABLED=true\n"; }],
    ["12. OTA ligado", "OTA_ENABLED", (s) => { s.dependencies["@capawesome/capacitor-live-update"] = "7.0.0"; }],
    ["18. AAB assinado sem evidência", "SIGNED_AAB_WITHOUT_EVIDENCE", (s) => { s.readiness.status.SIGNED_AAB_READY = true; }],
    ["18b. release sem verificação antes do upload", "SIGNED_AAB_WITHOUT_EVIDENCE", src("releaseWorkflow", "SIGNED_WITH_UPLOAD_KEY", "SIGNED")],
    ["23. fingerprint muda", "FINGERPRINT_DRIFT", (s) => { s.freeze.fingerprint = "000000000000"; }],
    ["24. contagem muda", "CURRICULUM_COUNT_DRIFT", (s) => { s.freeze.counts.lessons += 1; }],
    ["25. #273 tocada (candidate)", "CLOUD_273_TOUCHED", (s) => { s.rc2CandidateSha256 = "f".repeat(64); }],
    ["25b. #273 tocada (cloud check promovido)", "CLOUD_273_TOUCHED", (s) => { s.operational.checks.cloud_sync.pass = true; }],
    ["helper do keystore gera senha", "KEYSTORE_HELPER_UNSAFE", src("keystoreInit", 'const confirmed = arg(argv, "confirm") === CONFIRM_TOKEN;', 'const confirmed = arg(argv, "confirm") === CONFIRM_TOKEN;\n  const generated = Math.random().toString(36);')],
    ["helper do keystore aceita caminho no repo", "KEYSTORE_HELPER_UNSAFE", src("keystoreInit", 'problems.push("KEYSTORE_INSIDE_REPO: guarde o .jks fora do repositório")', "void 0")],
  ],
  "play-internal-readiness": [
    ["10. Play production automático", "PRODUCTION_AUTOMATIC", src("releaseWorkflow", "on:\n  workflow_dispatch:", "on:\n  push:\n    branches: [main]\n  workflow_dispatch:")],
    ["10b. production marcada pronta", "PRODUCTION_AUTOMATIC", (s) => { s.readiness.status.PRODUCTION_READY = true; }],
    ["19. upload declarado sem resultado", "PLAY_UPLOAD_WITHOUT_RESULT", (s) => { Object.assign(s.readiness.status, { SIGNED_AAB_READY: true, PLAY_CONSOLE_READY: true, INTERNAL_TESTING_READY: true, INTERNAL_TESTING_UPLOADED: true }); }],
    ["20. internal confundido com production (track)", "INTERNAL_CONFUSED_WITH_PRODUCTION", src("releaseIdentity", 'export const PLAY_TRACK_BY_CHANNEL = { internal: "internal", closed: "alpha", production: "production" };', 'export const PLAY_TRACK_BY_CHANNEL = { internal: "production", closed: "alpha", production: "production" };')],
    ["20b. closed pronto sem internal", "INTERNAL_CONFUSED_WITH_PRODUCTION", (s) => { s.readiness.status.CLOSED_TESTING_READY = true; }],
    ["21. exclusão declarada sem caminho", "ACCOUNT_DELETION_WITHOUT_PATH", src("privacyPage", 'id="excluir-conta"', 'id="politica-extra"')],
    ["22. Data Safety omite username", "DATA_SAFETY_INCOMPLETE", (s) => { s.dataSafety.items = s.dataSafety.items.filter((item) => item.data !== "username"); }],
    ["política sem microfone", "PRIVACY_POLICY_GAP", src("privacyPage", '{t("privacyNotice.microphone")}', "")],
    ["checkout externo no Android", "PLAY_BILLING_POLICY", src("subscription", 'if (isNativeApp()) return { status: "not_implemented", message: ANDROID_CHECKOUT_UNAVAILABLE_MESSAGE };\n  if (!isSupabaseBackendEnabled())', "if (!isSupabaseBackendEnabled())")],
    ["credencial de revisor no checklist", "PASSWORD_LOGGED", (s) => { s.src.playChecklist += "\nsenha: Revisor2026!\n"; }],
  ],
  "android-upgrade-contract": [
    ["17. upgrade remove a persistência", "UPGRADE_LOSES_PERSISTENCE", src("store", 'name: "longyu-v1",', 'name: "longyu-v2",')],
    ["appId trocado", "APP_ID_CHANGED", src("capacitorConfig", 'appId: "com.longyu.app"', 'appId: "com.longyu.app2"')],
    ["origem do WebView trocada", "WEBVIEW_ORIGIN_CHANGED", src("capacitorConfig", 'webDir: "dist",', 'webDir: "dist",\n  server: { hostname: "app.longyu.com", androidScheme: "https" },')],
    ["piso do versionCode desce", "VERSION_CODE_REPEATED", src("versionProperties", "versionCode=1", "versionCode=0")],
    ["upgrade PASS sem aparelho", "PHYSICAL_PASS_WITHOUT_EVIDENCE", (s) => { s.qa.upgrade = "PASS"; }],
    ["runbook sem aviso da debug key", "UPGRADE_RUNBOOK_INCOMPLETE", src("upgradeDoc", "INSTALL_FAILED_UPDATE_INCOMPATIBLE", "falha")],
  ],
};

const real = await gate(base);
assert.deepEqual(real, [], `${name}: o estado real precisa passar\n${report(name, real)}`);
let killed = 0;
for (const [label, code, mutate] of MUTATIONS[area]) {
  const state = structuredClone(base);
  mutate(state);
  const failures = await gate(state);
  assert.ok(
    failures.some((failure) => failure.code === code),
    `${name}: mutação "${label}" deveria falhar com ${code}; veio ${failures.map((f) => f.code).join(", ") || "nada"}`
  );
  killed += 1;
  console.log(`KILLED ${label}: ${code}`);
}
console.log(`PASS ${name} (${killed} mutações)`);
