/**
 * RC2.2.12 — Android Physical QA, Signed Release & Play Internal Readiness.
 *
 * Quatro gates sobre um estado carregado do repositório real:
 *   validateAndroidPhysicalReadiness   (E–S, AY–BC)
 *   validateAndroidReleaseCandidate    (A–C, T–Z, AV, AX, freeze, #273)
 *   validatePlayInternalReadiness      (AC–AO)
 *   validateAndroidUpgradeContract     (AA–AB)
 * Cada um devolve [{ code, where, why }] (vazio = passa). Os `test:*` mutam
 * o estado e exigem o código de falha certo.
 *
 * Os módulos de runtime (classificador de adb, verificador de assinatura,
 * guard de versionCode) são carregados A PARTIR DO TEXTO do estado, para que
 * uma mutação no código-fonte seja realmente executada.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { ANDROID_APPLICATION_ID } from "./android-package-identity.mjs";

const ROOT = process.cwd();

/** #273: o candidate de cloud fica congelado nesta onda (hash do arquivo). */
export const RC2_CANDIDATE_FROZEN_SHA256 = "6a1d612ff2a24dfbf0c3a138c103b4555358c172b0c6fe2f924f4910d7639799";
export const CLOUD_CHECKS = ["cloud_auth", "cloud_sync", "feedback_backend"];
export const CORE_PHYSICAL_TESTS = ["coldStart", "backNavigation", "keyboard", "audio", "microphone", "backgroundResume"];
export const DATA_SAFETY_REQUIRED = [
  "email",
  "username",
  "displayName",
  "birthDate",
  "country",
  "learningProgress",
  "srsReviewState",
  "pedagogyTelemetry",
  "diagnostics",
  "feedback",
  "purchases",
  "microphoneAudio",
];
export const STATUS_ORDER = [
  "ANDROID_CODE_READY",
  "SIGNED_AAB_READY",
  "PHYSICAL_QA_PASS",
  "PLAY_CONSOLE_READY",
  "INTERNAL_TESTING_READY",
  "INTERNAL_TESTING_UPLOADED",
  "CLOSED_TESTING_READY",
  "PRODUCTION_READY",
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

export async function loadState() {
  const freeze = loadBetaPedagogyFreezeState();
  const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  const pkg = readJson("package.json");
  return {
    qa: readJson("docs/release/android-physical-qa.json"),
    readiness: readJson("docs/release/android-release-readiness.json"),
    dataSafety: readJson("docs/release/play-data-safety.json"),
    ledger: readJson("docs/release/android-release-ledger.json"),
    operational: readJson("docs/release/rc1-operational-checks.json"),
    rc2CandidateSha256: await sha256(read("docs/release/rc2-candidate.json")),
    scripts: pkg.scripts,
    dependencies: { ...pkg.dependencies, ...pkg.devDependencies },
    tracked,
    freeze,
    src: {
      variablesGradle: read("android/variables.gradle"),
      appGradle: read("android/app/build.gradle"),
      signingGradle: read("android/app/longyu-signing.gradle"),
      manifest: read("android/app/src/main/AndroidManifest.xml"),
      versionProperties: read("android/version.properties"),
      capacitorConfig: read("capacitor.config.ts"),
      devices: read("scripts/android-devices.mjs"),
      keystoreInit: read("scripts/android-keystore-init.mjs"),
      verifySignature: read("scripts/android-verify-signature.mjs"),
      versionCheck: read("scripts/android-version-check.mjs"),
      androidCli: read("scripts/android-cli.mjs"),
      playUpload: read("scripts/play-upload.mjs"),
      releaseIdentity: read("scripts/lib/release-identity.mjs"),
      releaseWorkflow: read(".github/workflows/android-release.yml"),
      envProduction: fs.existsSync(path.join(ROOT, ".env.production")) ? read(".env.production") : "",
      username: read("src/lib/username.ts"),
      speech: read("src/lib/speech.ts"),
      syncUx: read("src/lib/syncUx.ts"),
      cloudSync: read("src/services/cloudSyncCoordinator.ts"),
      nativeShell: read("src/lib/platform/nativeShell.ts"),
      backNavigation: read("src/lib/platform/backNavigation.ts"),
      store: read("src/lib/store.ts"),
      privacyPage: read("src/features/privacy/PrivacyPage.tsx"),
      accountPage: read("src/features/account/AccountPage.tsx"),
      subscription: read("src/services/subscriptionService.ts"),
      ptBR: read("src/locales/pt-BR.ts"),
      physicalQaDoc: read("docs/ANDROID_PHYSICAL_QA.md"),
      upgradeDoc: read("docs/ANDROID_UPGRADE.md"),
      signingDoc: read("docs/ANDROID_SIGNING.md"),
      playChecklist: read("docs/PLAY_CONSOLE_CHECKLIST.md"),
    },
  };
}

/**
 * Importa um módulo ESM a partir do TEXTO (para mutações serem executadas de
 * verdade). Vai para um arquivo temporário porque os scripts usam
 * `import.meta.url` (URL data: não serve). Só módulos sem import relativo.
 */
let importSeq = 0;
async function importText(text) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2212-"));
  const file = path.join(dir, `m${importSeq++}.mjs`);
  fs.writeFileSync(file, text);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function collector() {
  const failures = [];
  return { failures, fail: (code, where, why) => failures.push({ code, where, why }) };
}

const isPass = (value) => value === "PASS" || value === true;
const SHA_RE = /^[0-9a-f]{40}$/;
const CERT_RE = /^[0-9A-F]{2}(?::[0-9A-F]{2}){31}$/;
const EMULATOR_MODEL_RE = /sdk_gphone|Android SDK built for|google_sdk|emulator|generic/i;

// ── E–S, AY–BC — QA físico ──────────────────────────────────────────────────
export async function validateAndroidPhysicalReadiness(s) {
  const { failures, fail } = collector();
  const qa = s.qa;
  const anyPass = [...CORE_PHYSICAL_TESTS, "deepLinks", "networkLoss", "upgrade", "playInstall"].some((key) => isPass(qa[key]));
  const claims = qa.formalPass === true || anyPass;
  if (claims) {
    if (!SHA_RE.test(String(qa.sha ?? ""))) fail("PHYSICAL_PASS_WITHOUT_SHA", "android-physical-qa.json", "PASS exige o SHA completo da build testada");
    if (!qa.deviceModel) fail("PHYSICAL_PASS_WITHOUT_DEVICE_MODEL", "android-physical-qa.json", "PASS exige modelo do aparelho");
    if (!qa.tester || !qa.testedAt || !qa.androidVersion || !qa.versionName || !Number.isInteger(qa.versionCode) || !qa.debugOrRelease) {
      fail("PHYSICAL_PASS_WITHOUT_EVIDENCE", "android-physical-qa.json", "PASS exige tester, data, versão do Android, versionName/versionCode e tipo de build");
    }
    if (qa.isEmulator !== false || EMULATOR_MODEL_RE.test(String(qa.deviceModel ?? ""))) {
      fail("EMULATOR_COUNTED_AS_PHYSICAL", "android-physical-qa.json", "emulador não é QA físico (isEmulator precisa ser false)");
    }
  }
  if (qa.formalPass === true) {
    const missing = CORE_PHYSICAL_TESTS.filter((key) => !isPass(qa[key]));
    if (missing.length) fail("PHYSICAL_PASS_WITHOUT_EVIDENCE", "formalPass", `testes centrais sem PASS: ${missing.join(", ")}`);
    if (qa.p0Open !== 0 || qa.p1Open !== 0) fail("PHYSICAL_PASS_WITH_OPEN_BUGS", "formalPass", "P0 = 0 e P1 = 0 antes do PASS");
  }
  if (qa.formalPass !== true && qa.status !== "CODE_READY_AWAITING_PHYSICAL_DEVICE") {
    fail("PHYSICAL_STATUS_DISHONEST", "status", `sem PASS formal o status é CODE_READY_AWAITING_PHYSICAL_DEVICE (veio ${qa.status})`);
  }
  const device = s.operational.checks?.android_real_device;
  if (device?.pass === true && qa.formalPass !== true) {
    fail("PHYSICAL_PASS_WITHOUT_EVIDENCE", "rc1-operational-checks.json", "android_real_device=true sem o manifesto físico formal");
  }
  if (s.readiness.status?.PHYSICAL_QA_PASS === true && qa.formalPass !== true) {
    fail("PHYSICAL_PASS_WITHOUT_EVIDENCE", "android-release-readiness.json", "PHYSICAL_QA_PASS sem manifesto físico formal");
  }

  // Classificador de adb executado a partir do texto (emulador nunca vira físico).
  try {
    const devices = await importText(s.src.devices);
    const emuOnly = devices.classifyDevices(devices.parseAdbDevices("List of devices attached\nemulator-5554 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:1\n"));
    const phys = devices.classifyDevices(devices.parseAdbDevices("List of devices attached\nR58N12ABCD device product:a52q model:SM_A525F device:a52q transport_id:2\n"));
    const unauth = devices.classifyDevices(devices.parseAdbDevices("List of devices attached\nR58N12ABCD unauthorized transport_id:3\n"));
    if (emuOnly.status !== "EMULATOR_ONLY") fail("EMULATOR_COUNTED_AS_PHYSICAL", "android-devices.mjs", `emulador classificado como ${emuOnly.status}`);
    if (phys.status !== "DEVICE_READY") fail("DEVICE_CLASSIFIER", "android-devices.mjs", `aparelho físico classificado como ${phys.status}`);
    if (unauth.status !== "UNAUTHORIZED") fail("DEVICE_CLASSIFIER", "android-devices.mjs", `não autorizado classificado como ${unauth.status}`);
    if (devices.maskSerial("R58N12ABCD").includes("R58N")) fail("SERIAL_NOT_MASKED", "android-devices.mjs", "serial precisa ser mascarado");
  } catch (error) {
    fail("DEVICE_CLASSIFIER", "android-devices.mjs", String(error?.message ?? error));
  }
  if (!/process\.exit\(7\)/.test(s.src.devices) || !/result\.status !== "DEVICE_READY"/.test(s.src.devices)) {
    fail("EMULATOR_COUNTED_AS_PHYSICAL", "android-devices.mjs", "instalação só em aparelho físico autorizado");
  }
  if (s.scripts["android:devices"] !== "node scripts/android-devices.mjs list") fail("ADB_HELPER_MISSING", "package.json", "android:devices ausente");

  // Permissões (P) e microfone (O).
  if (/android\.permission\.(CAMERA|ACCESS_(FINE|COARSE)_LOCATION|READ_CONTACTS|READ_MEDIA_\w+|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE)/.test(s.src.manifest)) {
    fail("UNNEEDED_PERMISSION", "AndroidManifest.xml", "permissão sem consumidor real");
  }
  if (/getUserMedia/.test(s.src.speech) && !/android\.permission\.RECORD_AUDIO/.test(s.src.manifest)) {
    fail("RECORD_AUDIO_MISSING", "AndroidManifest.xml", "a prática de fala usa o microfone");
  }
  if (!/catch \{\s*return "denied";\s*\}/.test(s.src.speech)) {
    fail("PERMISSION_DENIAL_BLOCKS", "src/lib/speech.ts", "recusa do microfone precisa virar 'denied' e o app seguir");
  }
  // Rede (Q): falha transitória é silenciosa e re-tentada.
  if (!/return \{ status: "pending", surface: "silent", message: null, retry: true/.test(s.src.syncUx) || !/scheduleTransientRetry\(\)/.test(s.src.cloudSync)) {
    fail("NETWORK_LOSS_BREAKS_SYNC_UX", "syncUx/cloudSyncCoordinator", "perda de rede precisa seguir a política calma");
  }
  // BACK (J).
  const shellCode = stripComments(s.src.nativeShell);
  if (/exitApp\s*\(/.test(`${shellCode}\n${stripComments(s.src.backNavigation)}`) || (shellCode.match(/minimizeApp\s*\(/g) ?? []).length !== 1) {
    fail("BACK_EXITS_APP", "nativeShell", "BACK só minimiza na raiz; exitApp proibido");
  }
  // Runbook (G–AU).
  for (const part of ["Cold start", "Splash e ícone", "Safe area", "BACK", "Process death", "Teclado", "Microfone", "Deep link", "Links externos", "TalkBack"]) {
    if (!s.src.physicalQaDoc.includes(part)) fail("PHYSICAL_RUNBOOK_INCOMPLETE", "docs/ANDROID_PHYSICAL_QA.md", `falta a parte "${part}"`);
  }
  return failures;
}

// ── A–C, T–Z, AV, AX, freeze, #273 — candidato de release ───────────────────
export async function validateAndroidReleaseCandidate(s) {
  const { failures, fail } = collector();
  const num = (re) => Number(s.src.variablesGradle.match(re)?.[1]);
  if (!(num(/targetSdkVersion\s*=\s*(\d+)/) >= 36) || !(num(/compileSdkVersion\s*=\s*(\d+)/) >= 36) || num(/minSdkVersion\s*=\s*(\d+)/) !== 24) {
    fail("TARGET_SDK_REDUCED", "android/variables.gradle", "compile/target 36 e min 24; nunca baixar target");
  }
  if (/release\s*\{[^}]*signingConfig\s+signingConfigs\.debug/.test(`${s.src.appGradle}\n${s.src.signingGradle}`) || !/signingConfigs\.longyuRelease : null/.test(s.src.signingGradle)) {
    fail("RELEASE_USES_DEBUG_KEY", "longyu-signing.gradle", "release nunca cai na debug key");
  }
  const secretFiles = s.tracked.filter((file) => /\.(jks|keystore|p12)$|(^|\/)(keystore|key)\.properties$/.test(file));
  if (secretFiles.length) fail("KEYSTORE_TRACKED", "git", secretFiles.join(", "));
  const scriptsText = [s.src.androidCli, s.src.keystoreInit, s.src.verifySignature, s.src.playUpload, s.src.versionCheck].join("\n");
  if (/console\.(log|error|info)\([^)]*(PASSWORD|storePassword|keyPassword|private_key)/i.test(scriptsText) || /echo[^\n]*\$\{?\{?\s*(secrets\.)?LONGYU_ANDROID_(KEYSTORE_PASSWORD|KEY_PASSWORD)/.test(s.src.releaseWorkflow)) {
    fail("PASSWORD_LOGGED", "scripts/workflow", "senha nunca é impressa");
  }
  if (!/CONFIRM_TOKEN = "CRIAR-UPLOAD-KEY"/.test(s.src.keystoreInit) || !/PASSWORD_ON_COMMAND_LINE/.test(s.src.keystoreInit) || /randomBytes|generatePassword|Math\.random/.test(s.src.keystoreInit)) {
    fail("KEYSTORE_HELPER_UNSAFE", "android-keystore-init.mjs", "exige confirmação, recusa senha por argumento e nunca gera senha");
  }
  try {
    const ks = await importText(s.src.keystoreInit);
    const repoPlan = ks.planKeystoreInit({ argv: ["--path", path.join(ROOT, "android/x.jks"), "--alias", "a"], repoRoot: ROOT, exists: () => false });
    const passPlan = ks.planKeystoreInit({ argv: ["--path", "/tmp/x.jks", "--alias", "a", "-storepass", "x"], repoRoot: ROOT, exists: () => false });
    if (repoPlan.ok || passPlan.ok) fail("KEYSTORE_HELPER_UNSAFE", "planKeystoreInit", "keystore no repo ou senha por argumento aceitos");
  } catch (error) {
    fail("KEYSTORE_HELPER_UNSAFE", "android-keystore-init.mjs", String(error?.message ?? error));
  }
  // Assinatura (X/Y) executada a partir do texto.
  try {
    const sig = await importText(s.src.verifySignature);
    const debug = sig.signatureVerdict(sig.parsePrintcert("Owner: CN=Android Debug, O=Android, C=US\nSHA256: " + "AB:".repeat(31) + "AB"));
    const unsigned = sig.signatureVerdict(sig.parsePrintcert("Not a signed jar file"));
    if (debug.ok || unsigned.ok) fail("RELEASE_USES_DEBUG_KEY", "android-verify-signature.mjs", "debug key ou AAB sem assinatura aceitos");
  } catch (error) {
    fail("SIGNATURE_VERIFY_BROKEN", "android-verify-signature.mjs", String(error?.message ?? error));
  }
  if (!/android-verify-signature\.mjs/.test(s.src.androidCli) || !/SIGNED_WITH_UPLOAD_KEY/.test(s.src.releaseWorkflow)) {
    fail("SIGNED_AAB_WITHOUT_EVIDENCE", "android-cli/workflow", "release precisa verificar a assinatura antes do upload");
  }
  const r = s.readiness;
  if (r.status?.SIGNED_AAB_READY === true) {
    const ev = r.signatureEvidence ?? {};
    if (!CERT_RE.test(String(ev.certificateSha256 ?? "")) || ev.result !== "SIGNED_WITH_UPLOAD_KEY" || !SHA_RE.test(String(r.signedAab?.sha ?? ""))) {
      fail("SIGNED_AAB_WITHOUT_EVIDENCE", "android-release-readiness.json", "SIGNED_AAB_READY exige SHA, certificado SHA-256 e SIGNED_WITH_UPLOAD_KEY");
    }
  } else if (r.blockers?.signing !== "BLOCKED_SIGNING_SECRETS") {
    fail("SIGNED_AAB_WITHOUT_EVIDENCE", "android-release-readiness.json", "sem AAB assinado, o bloqueio é BLOCKED_SIGNING_SECRETS");
  }
  // versionCode (Z) — guard executado a partir do texto + ledger.
  try {
    const ri = await importText(s.src.releaseIdentity);
    let threw = false;
    try {
      ri.assertVersionCodeIncreases(10, [10]);
    } catch {
      threw = true;
    }
    if (!threw) fail("VERSION_CODE_REPEATED", "release-identity.mjs", "versionCode repetido aceito");
  } catch (error) {
    fail("VERSION_CODE_REPEATED", "release-identity.mjs", String(error?.message ?? error));
  }
  const codes = (s.ledger.releases ?? []).map((row) => row.versionCode);
  if (codes.some((code, i) => i > 0 && !(code > codes[i - 1]))) fail("VERSION_CODE_REPEATED", "android-release-ledger.json", "versionCode precisa ser estritamente crescente");
  // AX — sem OTA; AV — flag de username desligada sem cloud.
  const otaDeps = Object.keys(s.dependencies).filter((dep) => /live-?update|capgo|appflow|code-?push|@capawesome\/capacitor-live/i.test(dep));
  if (otaDeps.length || /server\s*:\s*\{[^}]*url\s*:/.test(s.src.capacitorConfig) || r.ota !== false) {
    fail("OTA_ENABLED", "deps/capacitor.config", `atualização só pela Play (${otaDeps.join(", ")})`);
  }
  if (/VITE_USERNAME_LOGIN_ENABLED\s*[=:]\s*["']?true/.test(`${s.src.envProduction}\n${s.src.releaseWorkflow}`) || r.usernameLoginCloudEnabled !== false || !/env\.VITE_USERNAME_LOGIN_ENABLED === "true"/.test(s.src.username)) {
    fail("USERNAME_FLAG_WITHOUT_CLOUD", "flag", "VITE_USERNAME_LOGIN_ENABLED fica false até o cloud apply");
  }
  // Freeze (fingerprint + contagens).
  for (const failure of validateBetaPedagogyFreeze(s.freeze)) fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
  if (r.fingerprint !== "c48b008c9c1e") fail("FINGERPRINT_DRIFT", "android-release-readiness.json", r.fingerprint);
  // #273 intocada.
  const checks = s.operational.checks ?? {};
  for (const id of CLOUD_CHECKS) if (checks[id]?.pass !== false) fail("CLOUD_273_TOUCHED", id, "cloud segue adiada (#273)");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("CLOUD_273_TOUCHED", "docs/release/rc2-candidate.json", "o candidate da #273 não muda nesta onda");
  if (r.cloudDeferred !== true) fail("CLOUD_273_TOUCHED", "android-release-readiness.json", "cloudDeferred=true");
  if (r.publicBetaVerdict !== "NO-GO") fail("PUBLIC_BETA_VERDICT", "android-release-readiness.json", "Public Beta segue NO-GO");
  return failures;
}

// ── AC–AO — Play Internal ───────────────────────────────────────────────────
export async function validatePlayInternalReadiness(s) {
  const { failures, fail } = collector();
  const wf = s.src.releaseWorkflow;
  const onBlock = wf.match(/^on:\n([\s\S]*?)\n\S/m)?.[1] ?? "";
  if (!/workflow_dispatch/.test(onBlock) || /\b(push|pull_request|schedule|release)\s*:/.test(onBlock) || !/default: internal/.test(wf) || !/PRODUCTION_NOT_CONFIRMED/.test(wf)) {
    fail("PRODUCTION_AUTOMATIC", "android-release.yml", "release só manual; padrão internal; production com confirmação");
  }
  try {
    const ri = await importText(s.src.releaseIdentity);
    if (ri.MAX_AUTOMATIC_CHANNEL !== "internal" || ri.PLAY_TRACK_BY_CHANNEL.internal !== "internal" || ri.PLAY_TRACK_BY_CHANNEL.production === "internal") {
      fail("INTERNAL_CONFUSED_WITH_PRODUCTION", "release-identity.mjs", "internal → track internal; production nunca é internal");
    }
  } catch (error) {
    fail("INTERNAL_CONFUSED_WITH_PRODUCTION", "release-identity.mjs", String(error?.message ?? error));
  }
  const st = s.readiness.status ?? {};
  const requires = {
    INTERNAL_TESTING_READY: ["SIGNED_AAB_READY", "PLAY_CONSOLE_READY"],
    INTERNAL_TESTING_UPLOADED: ["INTERNAL_TESTING_READY"],
    CLOSED_TESTING_READY: ["INTERNAL_TESTING_UPLOADED", "PHYSICAL_QA_PASS"],
    PRODUCTION_READY: ["CLOSED_TESTING_READY"],
  };
  for (const [status, needs] of Object.entries(requires)) {
    if (st[status] === true && needs.some((need) => st[need] !== true)) {
      fail("INTERNAL_CONFUSED_WITH_PRODUCTION", "android-release-readiness.json", `${status} sem ${needs.join(" + ")}`);
    }
  }
  if (st.PRODUCTION_READY === true || s.readiness.productionManual !== true || s.readiness.internalTrackOnly !== true) {
    fail("PRODUCTION_AUTOMATIC", "android-release-readiness.json", "production segue manual e fora desta onda");
  }
  if (st.INTERNAL_TESTING_UPLOADED === true) {
    const up = s.readiness.playUpload ?? {};
    const inLedger = (s.ledger.releases ?? []).some((row) => row.versionCode === up.versionCode && row.track === "internal");
    if (!SHA_RE.test(String(up.sha ?? "")) || !Number.isInteger(up.versionCode) || up.track !== "internal" || !up.result || !inLedger) {
      fail("PLAY_UPLOAD_WITHOUT_RESULT", "android-release-readiness.json", "upload declarado exige SHA, versionCode, track internal, resultado da Play e linha no ledger");
    }
  } else if (s.readiness.blockers?.playCredentials !== "BLOCKED_PLAY_CREDENTIALS") {
    fail("PLAY_UPLOAD_WITHOUT_RESULT", "android-release-readiness.json", "sem upload real, o bloqueio é BLOCKED_PLAY_CREDENTIALS");
  }
  // Exclusão de conta (AH).
  const ds = s.dataSafety;
  if (ds.userCanRequestDeletion === true) {
    const ok =
      /Excluir conta/.test(ds.deletionPaths?.inApp ?? "") &&
      /#excluir-conta/.test(ds.deletionPaths?.web ?? "") &&
      /id="excluir-conta"/.test(s.src.privacyPage) &&
      /requestAccountDeletion\(/.test(s.src.accountPage);
    if (!ok) fail("ACCOUNT_DELETION_WITHOUT_PATH", "play-data-safety.json", "exclusão declarada exige caminho no app e na web (/privacidade#excluir-conta)");
  }
  // Data Safety (AG).
  const present = new Set((ds.items ?? []).map((item) => item.data));
  const missing = DATA_SAFETY_REQUIRED.filter((key) => !present.has(key));
  if (missing.length) fail("DATA_SAFETY_INCOMPLETE", "play-data-safety.json", `faltando: ${missing.join(", ")}`);
  for (const item of ds.items ?? []) {
    if (typeof item.collected !== "boolean" || typeof item.shared !== "boolean") fail("DATA_SAFETY_INCOMPLETE", item.data, "collected/shared precisam ser declarados");
    if (item.collected && (!item.purpose?.length || item.deletion == null)) fail("DATA_SAFETY_INCOMPLETE", item.data, "dado coletado precisa de finalidade e comportamento de exclusão");
  }
  if (ds.encryptedInTransit !== true) fail("DATA_SAFETY_INCOMPLETE", "encryptedInTransit", "HTTPS em trânsito");
  // Privacidade (AI).
  for (const key of ["microphone:", "identity:", "account:", "deletionSteps:"]) {
    if (!s.src.ptBR.includes(key) || !s.src.privacyPage.includes(`privacyNotice.${key.replace(":", "")}`)) {
      fail("PRIVACY_POLICY_GAP", "PrivacyPage", `política sem ${key.replace(":", "")}`);
    }
  }
  // Pagamentos da Play.
  const guardRe = /^\s*if \(isNativeApp\(\)\) return \{ status: "not_implemented", message: ANDROID_CHECKOUT_UNAVAILABLE_MESSAGE \};/m;
  const bodyOf = (fn) => s.src.subscription.split(`export async function ${fn}(`)[1]?.split("\nexport ")[0] ?? "";
  if (!guardRe.test(bodyOf("createCheckoutSession")) || !guardRe.test(bodyOf("openBillingPortal"))) {
    fail("PLAY_BILLING_POLICY", "subscriptionService.ts", "sem Google Play Billing, o app Android não abre checkout externo");
  }
  // Checklist (AC–AF, AJ).
  for (const field of ["App name", "Package", "Idioma padrão", "categoria", "Contato do desenvolvedor", "Política de privacidade", "Acesso ao app", "Anúncios", "Classificação de conteúdo", "Público-alvo", "Data Safety", "Exclusão de conta", "Países", "Tracks", "PLAY_STORE_FEATURE_GRAPHIC_REQUIRED", "Acesso para revisores"]) {
    if (!s.src.playChecklist.includes(field)) fail("PLAY_CHECKLIST_INCOMPLETE", "docs/PLAY_CONSOLE_CHECKLIST.md", `falta "${field}"`);
  }
  if (/senha:\s*\S{6,}|password:\s*\S{6,}/i.test(s.src.playChecklist)) fail("PASSWORD_LOGGED", "docs/PLAY_CONSOLE_CHECKLIST.md", "credencial de revisor no Git");
  return failures;
}

// ── AA–AB — upgrade ─────────────────────────────────────────────────────────
export async function validateAndroidUpgradeContract(s) {
  const { failures, fail } = collector();
  // RC2.2.16 — o package permanente é o do Play Console (android-package-identity.json).
  const capId = s.src.capacitorConfig.match(/appId:\s*"([^"]+)"/)?.[1];
  const gradleId = s.src.appGradle.match(/applicationId "([^"]+)"/)?.[1];
  if (capId !== ANDROID_APPLICATION_ID || gradleId !== ANDROID_APPLICATION_ID) {
    fail("APP_ID_CHANGED", "capacitor/gradle", `${ANDROID_APPLICATION_ID} é permanente (veio ${capId} / ${gradleId})`);
  }
  if (/\bhostname\s*:|androidScheme\s*:|server\s*:\s*\{/.test(s.src.capacitorConfig)) {
    fail("WEBVIEW_ORIGIN_CHANGED", "capacitor.config.ts", "mudar a origem do WebView perde o localStorage no update");
  }
  if (!/name: "longyu-v1",\s*\n\s*version: \d+/.test(s.src.store) || !/\bmigrate\s*[:(]/.test(s.src.store)) {
    fail("UPGRADE_LOSES_PERSISTENCE", "src/lib/store.ts", "persistência longyu-v1 com version + migrate");
  }
  const floor = Number(s.src.versionProperties.match(/^versionCode=(\d+)$/m)?.[1]);
  if (!Number.isInteger(floor) || floor < (s.readiness.versionCodeFloor ?? 1)) fail("VERSION_CODE_REPEATED", "android/version.properties", "piso do versionCode nunca desce");
  if (/clearTaskOnLaunch|android:allowClearUserData="false"/.test(s.src.manifest)) fail("UPGRADE_LOSES_PERSISTENCE", "AndroidManifest.xml", "nada limpa estado na abertura");
  for (const needle of ["N → N+1", "INSTALL_FAILED_UPDATE_INCOMPATIBLE", "Downgrade não é rollback", "Rollback Android"]) {
    if (!s.src.upgradeDoc.includes(needle)) fail("UPGRADE_RUNBOOK_INCOMPLETE", "docs/ANDROID_UPGRADE.md", `falta "${needle}"`);
  }
  if (isPass(s.qa.upgrade) && (!SHA_RE.test(String(s.qa.sha ?? "")) || !s.qa.deviceModel || s.qa.isEmulator !== false)) {
    fail("PHYSICAL_PASS_WITHOUT_EVIDENCE", "android-physical-qa.json", "upgrade PASS exige evidência física");
  }
  return failures;
}

export const GATES = {
  "android-physical-readiness": validateAndroidPhysicalReadiness,
  "android-release-candidate": validateAndroidReleaseCandidate,
  "play-internal-readiness": validatePlayInternalReadiness,
  "android-upgrade-contract": validateAndroidUpgradeContract,
};

export function report(name, failures) {
  if (!failures.length) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`;
}
