/**
 * RC2.2.16 — Android Release Identity, Signed AAB & Play Internal Beta.
 *
 * Cinco gates sobre o estado real do repositório:
 *   validateAndroidReleaseIdentity  (A–S, CO, mutações 1–9)
 *   validateSignedAab               (W–AH, CP, mutações 10–17)
 *   validatePlayInternalBeta        (C–D, AI–AW, AR, CQ, mutações 18–24 e 31–37)
 *   validatePlayPolicyReadiness     (BP–CG, CR, mutações 25–30)
 *   validatePlayBetaRegression      (#273, freeze, CK–CL, mutações 38–44)
 * Cada um devolve [{ code, where, why }] (vazio = passa).
 *
 * Os módulos executáveis (inspetor do bundle, verificador de assinatura,
 * identidade de release, deep links) são carregados A PARTIR DO TEXTO do
 * estado: uma mutação no código-fonte é realmente executada.
 *
 * Code-only: nada aqui exige upload ao Play. Mas nenhum estado de Play
 * (upload, instalação, QA físico) passa sem a evidência real correspondente.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { loadTsModule } from "./android-foundation-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256, CLOUD_CHECKS } from "./rc2-2-12-gates.mjs";
import { LEGACY_ANDROID_APPLICATION_IDS } from "./android-package-identity.mjs";

const ROOT = process.cwd();

/**
 * Package congelado. Está AQUI, e não só em android-package-identity.mjs, de
 * propósito: um PR que troque o id nos dois lugares ao mesmo tempo ainda
 * precisa mexer neste gate, e isso é visível na revisão.
 */
export const FROZEN_ANDROID_APPLICATION_ID = "longyu.noba.com";
export const LEGACY_IDS = LEGACY_ANDROID_APPLICATION_IDS;
export const RC2_2_16_BASE_SHA = "96539372";
export const BETA_BASELINE = {
  lessons: 134,
  teachingTopics: 113,
  cultureItems: 30,
  cultureNativeLessons: 30,
  journeyCultureNodes: 20,
  cultureMoments: 5,
  toneTransferPlayable: 12,
  conversationCapabilitiesRuntimeReady: 31,
};
export const BETA_FINGERPRINT = "c48b008c9c1e";
export const RELEASE_STATES = [
  "PACKAGE_ALIGNED",
  "SIGNING_READY",
  "SIGNED_AAB_READY",
  "PLAY_APP_SIGNING_READY",
  "INTERNAL_UPLOAD_COMPLETE",
  "PLAY_INSTALL_COMPLETE",
  "PHYSICAL_QA_COMPLETE",
  "CLOSED_BETA_READY",
];
export const BACKUP_ITEMS = ["keystoreLocal", "backup1", "backup2", "aliasSaved", "storePasswordSaved", "keyPasswordSaved", "gitIgnoreConfirmed", "gitStatusClean"];
export const CORE_PLAY_TESTS = ["firstLaunch", "safeArea", "tts", "speech", "haptics", "notifications", "backgroundResume", "processDeath"];
export const PASS_WITHOUT_TEST_CODE = {
  tts: "TTS_PASS_WITHOUT_TEST",
  speech: "SPEECH_PASS_WITHOUT_TEST",
  haptics: "HAPTICS_PASS_WITHOUT_TEST",
  hapticsToggleOff: "HAPTICS_PASS_WITHOUT_TEST",
  notifications: "NOTIFICATION_PASS_WITHOUT_TEST",
};
export const DATA_SAFETY_KEYS = [
  "email",
  "username",
  "displayName",
  "country",
  "birthDate",
  "learningProgress",
  "srsReviewState",
  "streak",
  "achievements",
  "diagnostics",
  "feedback",
  "purchases",
  "entitlementStatus",
  "microphoneAudio",
  "localNotifications",
];
export const DATA_SAFETY_FIELDS = ["collected", "shared", "purpose", "required", "optional", "encryptedInTransit", "deletable", "evidence"];
const PLAY_STORE_INSTALLER = "com.android.vending";
const UPLOAD_SOURCES = ["MANUAL_INTERNAL_UPLOAD", "PLAY_API_UPLOAD"];
const OWNER_PENDING = "OWNER_CONFIRMATION_REQUIRED";
const SHA_RE = /^[0-9a-f]{40}$/;
const HEX64_RE = /^[0-9a-f]{64}$/;
const CERT_RE = /^[0-9A-F]{2}(?::[0-9A-F]{2}){31}$/;
const EMULATOR_MODEL_RE = /sdk_gphone|Android SDK built for|google_sdk|emulator|generic/i;
const AD_SDK_RE = /admob|google-mobile-ads|play-services-ads|applovin|unity-ads|ironsource|facebook-audience|\/ads$/i;
const ENTITLEMENT_FILES = ["src/lib/entitlements.ts", "src/lib/entitlementStatus.ts", "src/commercial/entitlements.ts", "src/services/entitlementService.ts"];

// ---------------------------------------------------------------- estado

const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");
const readJson = (rel) => JSON.parse(read(rel) || "null");

function listFiles(rel, filter) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["build", ".gradle", "node_modules"].includes(entry.name)) walk(full);
      } else if (filter(entry.name)) out.push(path.relative(ROOT, full).split(path.sep).join("/"));
    }
  };
  walk(abs);
  return out.sort();
}

/** Ocorrências do package antigo em arquivos rastreados + novos (respeita .gitignore). */
export function legacySweep(root = ROOT, legacyIds = LEGACY_IDS) {
  const hits = new Map();
  for (const id of legacyIds) {
    let out = "";
    try {
      out = execFileSync("git", ["grep", "-n", "-I", "--untracked", "-F", id], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch (error) {
      out = error.status === 1 ? "" : String(error.stdout ?? "");
    }
    for (const line of out.split("\n").filter(Boolean)) {
      const [file, lineNo, ...rest] = line.split(":");
      if (!hits.has(file)) hits.set(file, []);
      hits.get(file).push(`${lineNo}:${rest.join(":").trim().slice(0, 160)}`);
    }
  }
  return [...hits.entries()].map(([file, lines]) => ({
    file,
    lines,
    text: /\.(md|json)$/.test(file) ? fs.readFileSync(path.join(root, file), "utf8") : null,
  }));
}

function releaseArtifacts() {
  const dir = path.join(ROOT, "release-artifacts");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".provenance.json"))
    .map((name) => ({ name, ...JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) }));
}

export async function loadState() {
  const pkg = readJson("package.json");
  const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  const java = Object.fromEntries(listFiles("android/app/src", (name) => /\.(java|kt)$/.test(name)).map((rel) => [rel, read(rel)]));
  return {
    scripts: pkg.scripts,
    dependencies: { ...pkg.dependencies, ...pkg.devDependencies },
    tracked,
    java,
    legacySweep: legacySweep(),
    artifacts: releaseArtifacts(),
    freeze: loadBetaPedagogyFreezeState(),
    rc2CandidateSha256: createHash("sha256").update(read("docs/release/rc2-candidate.json")).digest("hex"),
    json: {
      packageIdentity: readJson("docs/release/android-package-identity.json"),
      nativeFoundation: readJson("docs/release/android-native-foundation.json"),
      readiness: readJson("docs/release/android-release-readiness.json"),
      ledger: readJson("docs/release/android-release-ledger.json"),
      playConsole: readJson("docs/release/play-console-status.json"),
      playInternal: readJson("docs/release/google-play-internal.json"),
      physicalQa: readJson("docs/release/android-physical-qa.json"),
      dataSafety: readJson("docs/release/play-data-safety.json"),
      billingAudit: readJson("docs/release/android-billing-audit.json"),
      operational: readJson("docs/release/rc1-operational-checks.json"),
    },
    src: {
      identityLib: read("scripts/lib/android-package-identity.mjs"),
      capacitorConfig: read("capacitor.config.ts"),
      appGradle: read("android/app/build.gradle"),
      signingGradle: read("android/app/longyu-signing.gradle"),
      stringsXml: read("android/app/src/main/res/values/strings.xml"),
      manifestXml: read("android/app/src/main/AndroidManifest.xml"),
      deepLinks: read("src/lib/platform/deepLinks.ts"),
      reminderPlan: read("src/lib/studyReminderPlan.ts"),
      devices: read("scripts/android-devices.mjs"),
      playUpload: read("scripts/play-upload.mjs"),
      androidCli: read("scripts/android-cli.mjs"),
      inspector: read("scripts/android-inspect-bundle.mjs"),
      verifySignature: read("scripts/android-verify-signature.mjs"),
      keystoreInit: read("scripts/android-keystore-init.mjs"),
      releaseIdentity: read("scripts/lib/release-identity.mjs"),
      releaseWorkflow: read(".github/workflows/android-release.yml"),
      buildWorkflow: read(".github/workflows/android-build.yml"),
      subscription: read("src/services/subscriptionService.ts"),
      proPage: read("src/features/pro/ProPage.tsx"),
      shopData: read("src/data/shop.ts"),
      billing: read("src/commercial/billing.ts"),
      routes: read("src/routes.tsx"),
      privacyPage: read("src/features/privacy/PrivacyPage.tsx"),
      accountPage: read("src/features/account/AccountPage.tsx"),
      deleteAccountFn: read("supabase/functions/delete-account/index.ts"),
      speech: read("src/lib/speech.ts"),
      speechPlugin: read("android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java"),
      playChecklist: read("docs/PLAY_CONSOLE_CHECKLIST.md"),
      signingDoc: read("docs/ANDROID_SIGNING.md"),
      physicalQaDoc: read("docs/ANDROID_PHYSICAL_QA.md"),
      report: read("docs/reports/rc2-2-16-play-internal-beta.md"),
      username: read("src/lib/username.ts"),
      envProduction: read(".env.production"),
      entitlements: Object.fromEntries(ENTITLEMENT_FILES.map((rel) => [rel, read(rel)])),
      srcCheckoutUsers: listFiles("src", (name) => /\.(ts|tsx)$/.test(name))
        .filter((rel) => rel !== "src/services/subscriptionService.ts")
        .filter((rel) => /invoke[^\n]*["'](create-checkout-session|create-billing-portal)["']|(checkout|buy|billing)\.stripe\.com/.test(read(rel))),
    },
  };
}

// ---------------------------------------------------------------- helpers

/** Importa um módulo ESM a partir do TEXTO; imports relativos viram URLs absolutas de scripts/. */
let importSeq = 0;
export async function importText(text, fromDir = path.join(ROOT, "scripts")) {
  const rewritten = String(text).replace(/from\s+"(\.\.?\/[^"]+)"/g, (_, rel) => `from "${pathToFileURL(path.resolve(fromDir, rel)).href}"`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2216-"));
  const file = path.join(dir, `m${importSeq++}.mjs`);
  fs.writeFileSync(file, rewritten);
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
const ownerConfirmed = (field) =>
  field && typeof field === "object" && (field.value === true || field.value === "VERIFIED" || field.value === "REGISTERED" || field.value === "CONFIGURED" || field.value === "CREATED");

// ---- protobuf/zip mínimos para bundles sintéticos (self-test do inspetor)

function varint(n) {
  const out = [];
  do {
    let byte = n & 0x7f;
    n = Math.floor(n / 128);
    if (n) byte |= 0x80;
    out.push(byte);
  } while (n);
  return Buffer.from(out);
}
const pbBytes = (field, bytes) => Buffer.concat([varint(field * 8 + 2), varint(bytes.length), bytes]);
const pbStr = (field, text) => pbBytes(field, Buffer.from(text, "utf8"));
const ANDROID_NS = "http://schemas.android.com/apk/res/android";
const pbAttr = (name, value, ns = "") => pbBytes(4, Buffer.concat([ns ? pbStr(1, ns) : Buffer.alloc(0), pbStr(2, name), pbStr(3, value)]));
const pbNode = (name, attrs, children = []) =>
  pbBytes(1, Buffer.concat([pbStr(3, name), ...attrs, ...children.map((child) => pbBytes(5, child))]));

export function syntheticManifest({ packageName, versionCode = 7, versionName = "0.0.0-test", authority }) {
  const provider = pbNode("provider", [pbAttr("authorities", authority ?? `${packageName}.fileprovider`, ANDROID_NS)]);
  const application = pbNode("application", [], [provider]);
  return pbNode("manifest", [pbAttr("package", packageName), pbAttr("versionCode", String(versionCode), ANDROID_NS), pbAttr("versionName", versionName, ANDROID_NS)], [application]);
}

export function syntheticZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

// ---------------------------------------------------------------- 1. identidade

export async function validateAndroidReleaseIdentity(s) {
  const { failures, fail } = collector();
  const ID = FROZEN_ANDROID_APPLICATION_ID;
  const legacy = LEGACY_IDS[0];

  // R/S — constante canônica + manifesto congelado.
  const libId = s.src.identityLib.match(/export const ANDROID_APPLICATION_ID = "([^"]+)"/)?.[1];
  if (libId !== ID) fail("PACKAGE_ID_CHANGED", "scripts/lib/android-package-identity.mjs", `${libId ?? "ausente"} ≠ ${ID} (package congelado)`);
  if (!new RegExp(`LEGACY_ANDROID_APPLICATION_IDS = Object\\.freeze\\(\\["${legacy.replace(/\./g, "\\.")}"\\]\\)`).test(s.src.identityLib)) {
    fail("PACKAGE_FREEZE_REMOVED", "android-package-identity.mjs", "lista de ids superseded removida");
  }
  const pi = s.json.packageIdentity;
  if (!pi || pi.frozen !== true) fail("PACKAGE_FREEZE_REMOVED", "docs/release/android-package-identity.json", "frozen precisa ser true");
  for (const key of ["applicationId", "namespace", "capacitorAppId", "javaPackage", "customUrlScheme"]) {
    if (pi?.[key] !== ID) fail("PACKAGE_ID_CHANGED", `android-package-identity.json:${key}`, `${pi?.[key]} ≠ ${ID}`);
  }
  if (pi?.fileProviderAuthority !== `${ID}.fileprovider`) fail("PACKAGE_ID_CHANGED", "android-package-identity.json:fileProviderAuthority", String(pi?.fileProviderAuthority));
  if (!(pi?.superseded ?? []).some((row) => row.applicationId === legacy && row.status === "SUPERSEDED")) {
    fail("PACKAGE_FREEZE_REMOVED", "android-package-identity.json:superseded", `${legacy} precisa constar como SUPERSEDED`);
  }

  // E/F — Capacitor, Gradle, namespace.
  const capId = s.src.capacitorConfig.match(/\bappId\s*:\s*["']([^"']+)["']/)?.[1];
  if (capId !== ID) fail("CAPACITOR_APP_ID_MISMATCH", "capacitor.config.ts", `${capId} ≠ ${ID}`);
  const gradleId = s.src.appGradle.match(/applicationId\s+["']([^"']+)["']/)?.[1];
  const namespace = s.src.appGradle.match(/namespace\s*=?\s*["']([^"']+)["']/)?.[1];
  if (gradleId !== ID) fail("GRADLE_APPLICATION_ID_MISMATCH", "android/app/build.gradle", `applicationId ${gradleId} ≠ ${ID}`);
  if (namespace !== ID || namespace !== gradleId) fail("NAMESPACE_MISMATCH", "android/app/build.gradle", `namespace ${namespace} ≠ applicationId ${gradleId}`);
  if (/applicationIdSuffix|productFlavors/.test(stripComments(s.src.appGradle))) {
    fail("GRADLE_APPLICATION_ID_MISMATCH", "android/app/build.gradle", "suffix/flavor mudaria o package do bundle final");
  }

  // G — package Java.
  const javaDir = ID.split(".").join("/");
  const javaFiles = Object.keys(s.java);
  for (const rel of javaFiles) {
    const declared = s.java[rel].match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
    if (!new RegExp(`^android/app/src/[^/]+/java/${javaDir}/`).test(rel) || declared !== ID) {
      fail("JAVA_PACKAGE_MISMATCH", rel, `package ${declared ?? "ausente"} / diretório precisa ser ${ID} em java/${javaDir}/`);
    }
  }
  for (const name of ["MainActivity.java", "LongyuSpeechPlugin.java"]) {
    if (!javaFiles.includes(`android/app/src/main/java/${javaDir}/${name}`)) fail("JAVA_PACKAGE_MISMATCH", name, `ausente de android/app/src/main/java/${javaDir}/`);
  }

  // J/K — strings e manifesto.
  for (const key of ["package_name", "custom_url_scheme"]) {
    const value = s.src.stringsXml.match(new RegExp(`name="${key}">([^<]*)<`))?.[1];
    if (value !== ID) fail("STRINGS_PACKAGE_MISMATCH", `strings.xml:${key}`, `${value} ≠ ${ID}`);
  }
  const authorities = [...s.src.manifestXml.matchAll(/android:authorities="([^"]+)"/g)].map((match) => match[1]);
  if (!authorities.includes("${applicationId}.fileprovider") || authorities.some((value) => !value.startsWith("${applicationId}"))) {
    fail("PROVIDER_AUTHORITY_HARDCODED", "AndroidManifest.xml", "authority do FileProvider = ${applicationId}.fileprovider, nunca literal");
  }
  if (!/android:scheme="@string\/custom_url_scheme"/.test(s.src.manifestXml) || /android:scheme="(?!@string)[^"]+"/.test(s.src.manifestXml)) {
    fail("DEEP_LINK_SCHEME_MISMATCH", "AndroidManifest.xml", "esquema do intent-filter vem de @string/custom_url_scheme");
  }

  // H/I — deep links e lembretes (executados).
  try {
    const links = loadTsModule(s.src.deepLinks, {});
    if (links.LONGYU_APP_SCHEME !== ID) fail("DEEP_LINK_SCHEME_MISMATCH", "deepLinks.ts", `LONGYU_APP_SCHEME ${links.LONGYU_APP_SCHEME} ≠ ${ID}`);
    if (links.resolveDeepLink(`${ID}://revisao`) !== "/revisao") fail("DEEP_LINK_SCHEME_MISMATCH", "resolveDeepLink", `${ID}://revisao não abre /revisao`);
    for (const old of LEGACY_IDS) {
      if (links.resolveDeepLink(`${old}://revisao`) !== null) fail("DEEP_LINK_SCHEME_MISMATCH", "resolveDeepLink", `esquema antigo ${old}:// ainda abre rota`);
    }
  } catch (error) {
    fail("DEEP_LINK_SCHEME_MISMATCH", "deepLinks.ts", String(error?.message ?? error));
  }
  for (const [, name, url] of s.src.reminderPlan.matchAll(/export const (REMINDER_URL_\w+) = "([^"]+)"/g)) {
    if (!url.startsWith(`${ID}://`)) fail("DEEP_LINK_SCHEME_MISMATCH", `studyReminderPlan.ts:${name}`, `${url} não usa ${ID}://`);
  }

  // Ferramentas.
  if (s.src.devices.match(/export const PACKAGE_ID = "([^"]+)"/)?.[1] !== ID) fail("TOOL_PACKAGE_MISMATCH", "scripts/android-devices.mjs", "PACKAGE_ID ≠ package congelado");
  if (!/const PACKAGE_NAME = ANDROID_APPLICATION_ID;/.test(s.src.playUpload) || !/PACKAGE_MISMATCH/.test(s.src.playUpload)) {
    fail("TOOL_PACKAGE_MISMATCH", "scripts/play-upload.mjs", "upload usa o package canônico e recusa AAB com package diferente");
  }
  if (!/requireBundleIdentity\(source, identity\)/.test(s.src.androidCli) || !/bundleVerdict\(inspection, ANDROID_APPLICATION_ID\)/.test(s.src.androidCli) || !/process\.exit\(EXIT_PACKAGE_MISMATCH\)/.test(s.src.androidCli)) {
    fail("BUNDLE_CHECK_REMOVED", "scripts/android-cli.mjs", "todo APK/AAB é inspecionado depois do Gradle");
  }

  // L — manifests de release.
  const j = s.json;
  const manifestIds = {
    "android-native-foundation.json:appId": j.nativeFoundation?.appId,
    "android-release-readiness.json:applicationId": j.readiness?.applicationId,
    "google-play-internal.json:packageName": j.playInternal?.packageName,
    "google-play-internal.json:releaseIdentity.packageName": j.playInternal?.releaseIdentity?.packageName,
    "play-console-status.json:packageName.expected": j.playConsole?.packageName?.expected,
    "android-physical-qa.json:playBuild.packageName": j.physicalQa?.playBuild?.packageName,
  };
  for (const [where, value] of Object.entries(manifestIds)) {
    if (value !== ID) fail("RELEASE_MANIFEST_OLD_PACKAGE", where, `${value} ≠ ${ID}`);
  }
  for (const row of j.ledger?.releases ?? []) {
    if (row.packageName !== ID) fail("PLAY_PACKAGE_MISMATCH", "android-release-ledger.json", `upload ${row.versionCode} com package ${row.packageName}: o package do Play não muda`);
  }

  // N — varredura do id antigo.
  const allowed = new Set(["scripts/lib/android-package-identity.mjs", "docs/release/android-package-identity.json", "docs/release/android-native-foundation.json"]);
  for (const hit of s.legacySweep) {
    const file = hit.file;
    if (allowed.has(file)) continue;
    if (/\.md$/.test(file) && (file.startsWith("docs/") || !file.includes("/"))) {
      if (!/SUPERSEDED/.test(hit.text ?? "")) fail("OLD_PACKAGE_IN_DOCS", file, `${hit.lines.length} ocorrência(s) sem marcação SUPERSEDED: ${hit.lines[0]}`);
      continue;
    }
    const code = file.startsWith("src/")
      ? "OLD_PACKAGE_IN_RUNTIME"
      : /^android\/app\/src\/[^/]+\/java\//.test(file)
        ? "OLD_PACKAGE_IN_ANDROID_SOURCE"
        : file.startsWith("android/") || file.startsWith(".github/") || /^capacitor\.config\./.test(file) || file.startsWith("public/")
          ? "OLD_PACKAGE_IN_CONFIG"
          : file.startsWith("docs/release/")
            ? "RELEASE_MANIFEST_OLD_PACKAGE"
            : file.startsWith("scripts/") || file.startsWith("e2e/")
              ? "OLD_PACKAGE_IN_TESTS"
              : "OLD_PACKAGE_UNCLASSIFIED";
    fail(code, file, hit.lines.slice(0, 3).join(" | "));
  }

  // O — bundles finais presentes (local/CI) + self-test do inspetor.
  for (const artifact of s.artifacts) {
    if (artifact.packageName !== ID || artifact.bundleInspection?.packageName !== ID) {
      fail("BUNDLE_PACKAGE_MISMATCH", `release-artifacts/${artifact.name}`, `package do bundle ${artifact.bundleInspection?.packageName ?? artifact.packageName ?? "não inspecionado"}`);
    }
    if (artifact.bundleInspection?.legacyIdFound !== false) fail("BUNDLE_LEGACY_ID", `release-artifacts/${artifact.name}`, "bundle final contém o id antigo (ou não foi inspecionado)");
  }
  try {
    const inspector = await importText(s.src.inspector);
    const verdictOf = (entries) => inspector.bundleVerdict(inspector.inspectAndroidArtifact(syntheticZip(entries), "synthetic.aab"), ID).code;
    const good = [["base/manifest/AndroidManifest.xml", syntheticManifest({ packageName: ID })], ["base/dex/classes.dex", Buffer.from(`dex\nL${ID.split(".").join("/")}/MainActivity;`)]];
    const cases = [
      [good, "PACKAGE_OK"],
      [[["base/manifest/AndroidManifest.xml", syntheticManifest({ packageName: legacy })]], "PACKAGE_MISMATCH"],
      [[good[0], ["base/dex/classes.dex", Buffer.from(`dex\nL${legacy.split(".").join("/")}/MainActivity;`)]], "LEGACY_ID_IN_BUNDLE"],
      [[["base/manifest/AndroidManifest.xml", syntheticManifest({ packageName: ID, authority: `${legacy}.fileprovider` })]], "LEGACY_ID_IN_BUNDLE"],
      [[["base/manifest/AndroidManifest.xml", syntheticManifest({ packageName: ID, authority: "outro.app.fileprovider" })]], "PROVIDER_AUTHORITY_MISMATCH"],
    ];
    for (const [entries, expected] of cases) {
      const got = verdictOf(entries);
      if (got !== expected) fail("INSPECTOR_BROKEN", "scripts/android-inspect-bundle.mjs", `bundle sintético → ${got} ≠ ${expected}`);
    }
    const summary = inspector.inspectAndroidArtifact(syntheticZip(good), "synthetic.aab");
    if (summary.versionCode !== 7 || summary.versionName !== "0.0.0-test" || summary.kind !== "aab") fail("INSPECTOR_BROKEN", "android-inspect-bundle.mjs", "versionCode/versionName do manifesto protobuf não lidos");
  } catch (error) {
    fail("INSPECTOR_BROKEN", "scripts/android-inspect-bundle.mjs", String(error?.message ?? error));
  }
  return failures;
}

// ---------------------------------------------------------------- 2. AAB assinado

export async function validateSignedAab(s) {
  const { failures, fail } = collector();
  const signing = s.src.signingGradle;
  const releaseWf = s.src.releaseWorkflow;

  // 10 — release sem keystore nunca passa.
  if (!/signingConfig\s+longyuReleaseSigningReady\s*\?\s*signingConfigs\.longyuRelease\s*:\s*null/.test(signing) || !/throw new GradleException\(\s*\n?\s*"BLOCKED_SIGNING_SECRETS/.test(signing)) {
    fail("RELEASE_WITHOUT_KEYSTORE", "android/app/longyu-signing.gradle", "tarefa de release sem os quatro valores termina em BLOCKED_SIGNING_SECRETS");
  }
  if (!/"bundle:release":\s*\(\)\s*=>\s*\{\s*\n(?:\s*\/\/[^\n]*\n)*\s*requireSigning\(\);/.test(s.src.androidCli)) fail("RELEASE_WITHOUT_KEYSTORE", "scripts/android-cli.mjs", "bundle:release começa por requireSigning()");
  if (!/node scripts\/android-cli\.mjs bundle:release\s*\n\s*code=\$\?[\s\S]*?"\$code" -ne 4/.test(s.src.buildWorkflow)) fail("RELEASE_WITHOUT_KEYSTORE", "android-build.yml", "CI prova que release sem segredos = exit 4");

  // 11 — debug key / sem assinatura / upload key trocada (executado).
  try {
    const sig = await importText(s.src.verifySignature);
    const cert = (byte) => Array(32).fill(byte).join(":");
    const debug = sig.signatureVerdict(sig.parsePrintcert(`Owner: CN=Android Debug, O=Android, C=US\nSHA256: ${cert("AB")}`));
    const unsigned = sig.signatureVerdict(sig.parsePrintcert("jar is unsigned.\nNot a signed jar file"));
    const upload = sig.signatureVerdict(sig.parsePrintcert(`Owner: CN=Longyu Upload\nSHA256: ${cert("CD")}`), cert("CD"));
    const wrongKey = sig.signatureVerdict(sig.parsePrintcert(`Owner: CN=Outra\nSHA256: ${cert("EF")}`), cert("CD"));
    if (debug.ok || debug.code !== "DEBUG_KEY_IN_RELEASE") fail("DEBUG_KEY_ACCEPTED", "android-verify-signature.mjs", `debug key → ${debug.code}`);
    if (unsigned.ok) fail("DEBUG_KEY_ACCEPTED", "android-verify-signature.mjs", "AAB sem assinatura aceito");
    if (!upload.ok || upload.code !== "SIGNED_WITH_UPLOAD_KEY") fail("UPLOAD_CERT_PIN_BROKEN", "android-verify-signature.mjs", `upload key registrada → ${upload.code}`);
    if (wrongKey.ok) fail("UPLOAD_CERT_PIN_BROKEN", "android-verify-signature.mjs", "chave diferente da upload key registrada aceita");
  } catch (error) {
    fail("DEBUG_KEY_ACCEPTED", "android-verify-signature.mjs", String(error?.message ?? error));
  }
  if (/signingConfigs\.debug/.test(stripComments(`${s.src.appGradle}\n${signing}`))) fail("DEBUG_KEY_ACCEPTED", "android/app", "release nunca referencia signingConfigs.debug");
  if (!/--expect-cert/.test(s.src.androidCli) || !/registeredUploadCert\(\)/.test(s.src.androidCli)) fail("UPLOAD_CERT_PIN_BROKEN", "scripts/android-cli.mjs", "depois de registrada, só a upload key assina");

  // 12 — keystore rastreado (inclusive android/app/keys/).
  const secretFiles = s.tracked.filter((file) => /\.(jks|keystore|p12|pfx)$|(^|\/)(keystore|key)\.properties$|^android\/app\/keys\//.test(file));
  if (secretFiles.length) fail("KEYSTORE_TRACKED", "git", secretFiles.join(", "));

  // 13 — senha / base64 / chave privada em log.
  const scriptsText = [s.src.androidCli, s.src.keystoreInit, s.src.verifySignature, s.src.playUpload, s.src.devices, s.src.inspector].join("\n");
  if (/console\.(log|error|info|warn)\([^)]*(PASSWORD|storePassword|keyPassword|private_key|KEYSTORE_BASE64)/i.test(scriptsText)) fail("PASSWORD_LOGGED", "scripts", "valor de assinatura/credencial impresso");
  for (const [name, wf] of [["android-release.yml", releaseWf], ["android-build.yml", s.src.buildWorkflow]]) {
    if (/echo[^\n]*\$\{?\{?\s*(secrets\.)?(LONGYU_ANDROID_(KEYSTORE_PASSWORD|KEY_PASSWORD|KEYSTORE_BASE64)|KS_PASS|KEY_PASS|KS_B64|GOOGLE_PLAY_SERVICE_ACCOUNT_JSON|PLAY_JSON)\b/.test(wf) || /^\s*set -x/m.test(wf) || /cat [^\n]*\.jks/.test(wf)) {
      fail("PASSWORD_LOGGED", name, "workflow imprime segredo");
    }
  }

  // 14 — keystore/base64 nunca vira artifact.
  const uploadPaths = [...releaseWf.matchAll(/uses: actions\/upload-artifact@\S+\s*\n\s*with:\s*\n[\s\S]*?path:\s*\|?\s*\n?([\s\S]*?)(?:\n\s*if-no-files-found|\n\s*retention-days)/g)].map((match) => match[1]).join("\n");
  if (!uploadPaths || /jks|keystore|base64|RUNNER_TEMP|\.pw\b/i.test(uploadPaths)) fail("KEYSTORE_BASE64_ARTIFACT", "android-release.yml", "artifact só leva .aab/.provenance/.signature/registro do Play");
  if (!/ks="\$RUNNER_TEMP\/longyu-upload\.jks"/.test(releaseWf) || !/if: always\(\)\s*\n\s*run: rm -f "\$RUNNER_TEMP\/longyu-upload\.jks"/.test(releaseWf)) {
    fail("KEYSTORE_BASE64_ARTIFACT", "android-release.yml", "keystore decodificado só em $RUNNER_TEMP e apagado sempre");
  }

  // 15 — alias obrigatório.
  if (!/'LONGYU_ANDROID_KEY_ALIAS'/.test(signing) || !/\[ -n "\$KEY_ALIAS" \] \|\| missing="\$missing LONGYU_ANDROID_KEY_ALIAS"/.test(releaseWf) || !/LONGYU_ANDROID_KEY_ALIAS: \$\{\{ secrets\.LONGYU_ANDROID_KEY_ALIAS \}\}/.test(releaseWf) || !/MISSING_ALIAS/.test(s.src.keystoreInit)) {
    fail("SIGNING_ALIAS_MISSING", "signing/workflow/keystore-init", "alias faz parte do contrato de quatro valores");
  }
  if (!/--alias longyu-upload/.test(s.src.signingDoc)) fail("SIGNING_ALIAS_MISSING", "docs/ANDROID_SIGNING.md", "alias sugerido longyu-upload");

  // 16 / AH — evidência do certificado e proveniência completa.
  if (!/recorded\.signingCertificateSha256 = signature\.certificateSha256/.test(s.src.androidCli) || !/SIGNATURE_EVIDENCE_MISSING/.test(s.src.playUpload)) {
    fail("CERT_EVIDENCE_MISSING", "android-cli/play-upload", "proveniência do release leva o SHA-256 do certificado; upload recusa sem ele");
  }
  if (!/packageName: bundleInspection\.packageName/.test(s.src.androidCli) || !/sha256: sha256\(target\)/.test(s.src.androidCli) || !/builtAt: builtAt \|\| null/.test(s.src.releaseIdentity) || !/identity\.versionCode = versionCode/.test(s.src.releaseIdentity)) {
    fail("PROVENANCE_INCOMPLETE", "android-cli/release-identity", "proveniência = package + SHA + versionName/Code + builtAt + SHA-256 do arquivo + certificado");
  }
  for (const artifact of s.artifacts.filter((row) => row.buildType === "release")) {
    if (!CERT_RE.test(String(artifact.signingCertificateSha256 ?? "")) || artifact.signatureResult !== "SIGNED_WITH_UPLOAD_KEY" || !SHA_RE.test(String(artifact.sha ?? "")) || !artifact.builtAt || !(artifact.files ?? []).every((file) => HEX64_RE.test(file.sha256))) {
      fail("PROVENANCE_INCOMPLETE", `release-artifacts/${artifact.name}`, "release sem certificado/SHA/builtAt/hash do arquivo");
    }
  }
  const pi = s.json.playInternal;
  if (pi.states?.SIGNED_AAB_READY === true) {
    const aab = pi.signedAab ?? {};
    if (!CERT_RE.test(String(pi.uploadCertificateSha256 ?? "")) || !HEX64_RE.test(String(aab.artifactSha256 ?? "")) || !SHA_RE.test(String(pi.sha ?? "")) || !aab.provenance || aab.status !== "SIGNED_WITH_UPLOAD_KEY") {
      fail("CERT_EVIDENCE_MISSING", "google-play-internal.json", "SIGNED_AAB_READY exige upload cert SHA-256, SHA-256 do AAB, SHA do commit e proveniência");
    }
  } else if (pi.signedAab?.status !== "BLOCKED_SIGNING_SECRETS") {
    fail("CERT_EVIDENCE_MISSING", "google-play-internal.json:signedAab", "sem AAB assinado real, o status é BLOCKED_SIGNING_SECRETS");
  }

  // 17 — versionCode estritamente crescente.
  try {
    const ri = await importText(s.src.releaseIdentity);
    let threw = false;
    try {
      ri.assertVersionCodeIncreases(10, [10]);
    } catch {
      threw = true;
    }
    if (!threw) fail("VERSION_CODE_NOT_INCREASING", "release-identity.mjs", "versionCode igual ao último aceito");
    if (ri.computeVersionCode({ floor: 1, firstParentCount: 536 }) !== 537) fail("VERSION_CODE_NOT_INCREASING", "release-identity.mjs", "modelo floor + first-parent alterado");
  } catch (error) {
    fail("VERSION_CODE_NOT_INCREASING", "release-identity.mjs", String(error?.message ?? error));
  }
  const codes = (s.json.ledger?.releases ?? []).map((row) => row.versionCode);
  if (codes.some((code, i) => i > 0 && !(code > codes[i - 1]))) fail("VERSION_CODE_NOT_INCREASING", "android-release-ledger.json", "cada upload tem versionCode maior que o anterior");
  const next = pi.versionCode;
  if (Number.isInteger(next) && pi.internalUploaded !== true && codes.length && !(next > Math.max(...codes))) {
    fail("VERSION_CODE_NOT_INCREASING", "google-play-internal.json", `candidato ${next} ≤ último enviado ${Math.max(...codes)}`);
  }
  return failures;
}

// ---------------------------------------------------------------- 3. Play internal

function ledgerRow(ledger, versionCode) {
  return (ledger?.releases ?? []).find((row) => row.versionCode === versionCode && row.track === "internal");
}

export async function validatePlayInternalBeta(s) {
  const { failures, fail } = collector();
  const ID = FROZEN_ANDROID_APPLICATION_ID;
  const pc = s.json.playConsole;
  const pi = s.json.playInternal;
  const ledger = s.json.ledger;
  const qa = s.json.physicalQa;
  const pb = qa.playBuild ?? {};
  const wf = s.src.releaseWorkflow;

  // 18/19 — production nunca automática; production exige confirmação + environment.
  const onBlock = wf.match(/^on:\n([\s\S]*?)\n\S/m)?.[1] ?? "";
  if (!/workflow_dispatch/.test(onBlock) || /\b(push|pull_request|pull_request_target|schedule|release|workflow_run)\s*:/.test(onBlock) || !/default: internal/.test(wf)) {
    fail("AUTO_PRODUCTION_BY_PUSH", "android-release.yml", "publicação só por workflow_dispatch, canal padrão internal");
  }
  if (/play-upload\.mjs/.test(s.src.buildWorkflow.replace(/node scripts\/play-upload\.mjs --probe/g, ""))) fail("AUTO_PRODUCTION_BY_PUSH", "android-build.yml", "workflow de PR/push nunca envia ao Play");
  if (!/\[ "\$CHANNEL" = "production" \] && \[ "\$CONFIRM" != "PUBLICAR-PRODUCAO" \]/.test(wf) || !/inputs\.channel == 'production' && 'android-production' \|\| 'android-internal'/.test(wf)) {
    fail("PRODUCTION_WITHOUT_CONFIRMATION", "android-release.yml", "production exige PUBLICAR-PRODUCAO e o environment android-production");
  }
  try {
    const ri = await importText(s.src.releaseIdentity);
    let threw = false;
    try {
      ri.resolveReleaseTarget({ channel: "production", ref: "refs/heads/main", event: "workflow_dispatch", confirmProduction: "" });
    } catch {
      threw = true;
    }
    if (!threw) fail("PRODUCTION_WITHOUT_CONFIRMATION", "release-identity.mjs", "production sem confirmação aceita");
    if (ri.MAX_AUTOMATIC_CHANNEL !== "internal" || ri.PLAY_TRACK_BY_CHANNEL.internal !== "internal") fail("AUTO_PRODUCTION_BY_PUSH", "release-identity.mjs", "internal → track internal");
  } catch (error) {
    fail("PRODUCTION_WITHOUT_CONFIRMATION", "release-identity.mjs", String(error?.message ?? error));
  }

  // C/D/22–24 — estados do Play Console só com o owner.
  if (!pc) {
    fail("PLAY_STATUS_MISSING", "docs/release/play-console-status.json", "ausente");
    return failures;
  }
  const fields = ["appCreated", "packageName", "developerIdentityVerified", "packageRegistered", "playAppSigningConfigured", "internalTrackCreated", "closedTrackCreated", "productionAccess"];
  for (const key of fields) if (!pc[key] || !("checkedBy" in pc[key]) || !("checkedAt" in pc[key])) fail("PLAY_STATUS_MISSING", `play-console-status.json:${key}`, "campo com value/checkedBy/checkedAt");
  if (!("checkedAt" in pc) || !("checkedBy" in pc)) fail("PLAY_STATUS_MISSING", "play-console-status.json", "checkedAt/checkedBy");
  if (pc.packageName?.value !== ID || pc.packageName?.expected !== ID) fail("PLAY_PACKAGE_MISMATCH", "play-console-status.json:packageName", `Play mostra ${pc.packageName?.value}: STOP, não enviar`);
  const humanCheck = (field) => Boolean(field?.checkedBy && field?.checkedAt && !/agent|automa|bot|ci/i.test(field.checkedBy));
  const verifiedClaims = [
    ["developerIdentityVerified", "DEVELOPER_VERIFICATION_INVENTED"],
    ["packageRegistered", "PACKAGE_REGISTRATION_INVENTED"],
    ["playAppSigningConfigured", "APP_SIGNING_EVIDENCE_MISSING"],
    ["internalTrackCreated", "INTERNAL_UPLOAD_WITHOUT_EVIDENCE"],
  ];
  for (const [key, code] of verifiedClaims) {
    const field = pc[key];
    if (field?.value !== OWNER_PENDING && !(ownerConfirmed(field) && humanCheck(field))) fail(code, `play-console-status.json:${key}`, `${JSON.stringify(field?.value)} sem conferência do owner (checkedBy/checkedAt)`);
    const mirror = pi[key === "playAppSigningConfigured" ? "playAppSigning" : key];
    const mirrorOk = mirror === OWNER_PENDING ? field?.value === OWNER_PENDING : ownerConfirmed(field) && humanCheck(field);
    if (!mirrorOk) fail(code, `google-play-internal.json:${key}`, "espelho diverge do play-console-status.json");
  }
  const pkgConfirmed = pc.packageName?.ownerConfirmed;
  if (pkgConfirmed !== OWNER_PENDING && !(pkgConfirmed?.confirmed === true && pkgConfirmed.checkedBy && pkgConfirmed.checkedAt && !/agent|automa/i.test(pkgConfirmed.checkedBy))) {
    fail("PACKAGE_NOT_OWNER_CONFIRMED", "play-console-status.json:packageName.ownerConfirmed", "confirmação visual do owner com checkedBy/checkedAt");
  }

  // AR — modelo de estados (ordem + evidência de cada um).
  const st = pi.states ?? {};
  for (const name of RELEASE_STATES) if (typeof st[name] !== "boolean") fail("STATE_ORDER_VIOLATION", `states.${name}`, "estado ausente");
  RELEASE_STATES.forEach((name, index) => {
    if (st[name] === true && RELEASE_STATES.slice(0, index).some((prev) => st[prev] !== true)) fail("STATE_ORDER_VIOLATION", `states.${name}`, "estado anterior ainda false");
  });
  if (st.PACKAGE_ALIGNED === true && pkgConfirmed?.confirmed !== true) fail("PACKAGE_NOT_OWNER_CONFIRMED", "states.PACKAGE_ALIGNED", "exige confirmação visual do package no Play Console");
  const backup = pi.backupChecklist ?? {};
  const backupMissing = BACKUP_ITEMS.filter((item) => backup[item] !== true);
  if ((st.SIGNING_READY === true || pi.internalUploaded === true) && (backupMissing.length || !backup.checkedBy || !backup.checkedAt)) {
    fail("FIRST_UPLOAD_WITHOUT_BACKUP", "backupChecklist", `STOP FIRST PLAY UPLOAD: faltando ${backupMissing.join(", ") || "checkedBy/checkedAt"}`);
  }
  if (st.PLAY_APP_SIGNING_READY === true && (!CERT_RE.test(String(pi.appSigningCertificateSha256 ?? "")) || pi.appSigningCertificateSha256 === pi.uploadCertificateSha256)) {
    fail("APP_SIGNING_EVIDENCE_MISSING", "google-play-internal.json", "app signing cert SHA-256 (Play) registrado e diferente do upload cert");
  }

  // 20/21 — upload real ≠ artifact.
  const uploaded = pi.internalUploaded === true || st.INTERNAL_UPLOAD_COMPLETE === true;
  if (uploaded) {
    const up = pi.internalUpload ?? {};
    if (!UPLOAD_SOURCES.includes(up.source)) fail("ARTIFACT_IS_NOT_PLAY_UPLOAD", "google-play-internal.json:internalUpload.source", `${up.source}: AAB gerado/artifact do CI não é upload ao Play`);
    const row = ledgerRow(ledger, pi.versionCode);
    if (!row || row.packageName !== ID || !SHA_RE.test(String(row.sha ?? "")) || row.sha !== pi.sha || !row.uploadedAt || row.versionName !== pi.versionName || !UPLOAD_SOURCES.includes(row.source)) {
      fail("INTERNAL_UPLOAD_WITHOUT_EVIDENCE", "android-release-ledger.json", "upload declarado exige linha real (package, SHA, versionName/Code, track internal, uploadedAt, source)");
    }
  }
  for (const row of ledger?.releases ?? []) {
    if (!UPLOAD_SOURCES.includes(row.source) || !row.uploadedAt || row.track !== "internal") fail("ARTIFACT_IS_NOT_PLAY_UPLOAD", `ledger:${row.versionCode}`, "linha do ledger = upload real ao track internal");
    if (/password|secret|token|base64|private/i.test(JSON.stringify(row))) fail("PASSWORD_LOGGED", `ledger:${row.versionCode}`, "ledger sem credencial");
  }
  if (!uploaded && (ledger?.releases ?? []).length === 0 && st.INTERNAL_UPLOAD_COMPLETE !== false) fail("INTERNAL_UPLOAD_WITHOUT_EVIDENCE", "states", "sem upload, INTERNAL_UPLOAD_COMPLETE = false");

  // 31–37 — instalação e QA no build da Play.
  const device = Boolean(qa.deviceModel && qa.isEmulator === false && !EMULATOR_MODEL_RE.test(String(qa.deviceModel)) && qa.tester && qa.androidVersion);
  const fromPlay = pb.installSource === "PLAY" && pb.installEvidence?.installer === PLAY_STORE_INSTALLER && pb.installEvidence?.result === "INSTALLED_FROM_PLAY" && pb.installEvidence?.packageName === ID;
  if (isPass(pb.installedFromPlay) || isPass(pb.firstPlayInstall) || st.PLAY_INSTALL_COMPLETE === true || pi.installedFromPlay === true) {
    if (!fromPlay || !device || !ledgerRow(ledger, pb.playVersionCode) || pb.playTrack !== "internal") {
      fail("PLAY_INSTALL_WITHOUT_PLAY", "android-physical-qa.json:playBuild", "instalação pela Play exige installer com.android.vending (android:play-install:verify), aparelho físico e versionCode enviado ao internal");
    }
    if (pb.playSigningFingerprint && pb.playSigningFingerprint === pb.uploadSigningFingerprint) fail("PLAY_INSTALL_WITHOUT_PLAY", "playSigningFingerprint", "o app vindo da Play é assinado pela app signing key do Google, não pela upload key");
  }
  const tests = pb.tests ?? {};
  for (const [key, value] of Object.entries(tests)) {
    if (!isPass(value?.result)) continue;
    if (!fromPlay) fail("PHYSICAL_PASS_ADB_ONLY", `playBuild.tests.${key}`, "PASS do build da Play exige instalação pela Play (adb/debug não conta)");
    if (!value.testedAt || !value.evidence || !device) fail(PASS_WITHOUT_TEST_CODE[key] ?? "PLAY_BUILD_TEST_WITHOUT_EVIDENCE", `playBuild.tests.${key}`, "PASS exige testedAt + evidência + aparelho físico");
  }
  for (const key of ["tts", "speech", "haptics", "notifications"]) if (!tests[key]) fail(PASS_WITHOUT_TEST_CODE[key], `playBuild.tests.${key}`, "campo ausente");
  if (isPass(pb.playUpgrade)) {
    const from = pb.playUpgradeFromVersionCode;
    const to = pb.playUpgradeToVersionCode;
    if (!Number.isInteger(from) || !Number.isInteger(to) || !(to > from) || !ledgerRow(ledger, from) || !ledgerRow(ledger, to) || !fromPlay || !device) {
      fail("UPGRADE_WITHOUT_N_PLUS_1", "playBuild.playUpgrade", "upgrade PASS exige N e N+1 enviados ao internal e atualização pela Play");
    }
  }
  if (st.PHYSICAL_QA_COMPLETE === true) {
    const missing = CORE_PLAY_TESTS.filter((key) => !isPass(tests[key]?.result));
    if (missing.length || pb.p0Open !== 0 || pb.p1Open !== 0 || !fromPlay) fail("PHYSICAL_QA_INCOMPLETE", "states.PHYSICAL_QA_COMPLETE", `faltando ${missing.join(", ") || "P0/P1 = 0 ou instalação pela Play"}`);
  }
  if (st.CLOSED_BETA_READY === true && (!isPass(pb.playUpgrade) || pi.closedBetaReady !== true)) fail("UPGRADE_WITHOUT_N_PLUS_1", "states.CLOSED_BETA_READY", "Closed Beta exige upgrade N→N+1 pela Play");
  if (pi.closedBetaReady === true && st.CLOSED_BETA_READY !== true) fail("STATE_ORDER_VIOLATION", "closedBetaReady", "espelha states.CLOSED_BETA_READY");
  if (s.scripts["android:play-install:verify"] !== "node scripts/android-devices.mjs play-install") fail("PLAY_INSTALL_WITHOUT_PLAY", "package.json", "android:play-install:verify ausente");
  try {
    const devices = await importText(s.src.devices);
    const cert = (byte) => Array(32).fill(byte).join(":");
    const adbInstall = devices.playInstallVerdict({ packageId: ID, installer: "com.google.android.packageinstaller", installedCertSha256: cert("AA") });
    const uploadSigned = devices.playInstallVerdict({ packageId: ID, installer: PLAY_STORE_INSTALLER, installedCertSha256: cert("AA"), uploadCertSha256: cert("AA") });
    const play = devices.playInstallVerdict({ packageId: ID, installer: PLAY_STORE_INSTALLER, installedCertSha256: cert("BB"), uploadCertSha256: cert("AA") });
    if (adbInstall.ok || uploadSigned.ok || !play.ok) fail("PLAY_INSTALL_WITHOUT_PLAY", "android-devices.mjs", `veredito: adb ${adbInstall.code}, upload ${uploadSigned.code}, play ${play.code}`);
    if (devices.parseInstaller("InstallingPackageName: com.android.vending\n") !== PLAY_STORE_INSTALLER) fail("PLAY_INSTALL_WITHOUT_PLAY", "android-devices.mjs", "parse do instalador");
  } catch (error) {
    fail("PLAY_INSTALL_WITHOUT_PLAY", "android-devices.mjs", String(error?.message ?? error));
  }
  if (qa.formalPass !== true && pi.states?.PHYSICAL_QA_COMPLETE === true) fail("PHYSICAL_QA_INCOMPLETE", "android-physical-qa.json", "formalPass");
  if (pi.releaseCandidateCloudCertification !== false) fail("CLOUD_273_TOUCHED", "google-play-internal.json", "PRODUCTION_BACKEND_SMOKE ≠ certificação cloud do candidate (#273)");
  return failures;
}

// ---------------------------------------------------------------- 4. política da Play

function listingText(checklist) {
  const section = checklist.split("## 2.")[1]?.split("\n## 3.")[0] ?? "";
  return section
    .split("\n")
    .filter((line) => line.startsWith(">"))
    .join("\n");
}

export async function validatePlayPolicyReadiness(s) {
  const { failures, fail } = collector();
  const ID = FROZEN_ANDROID_APPLICATION_ID;
  const pi = s.json.playInternal;
  const ds = s.json.dataSafety;
  const ba = s.json.billingAudit;

  // BP — privacidade pública.
  const urls = [s.json.playConsole?.privacyPolicyUrl, pi.privacyPolicyUrl];
  if (urls.some((url) => !/^https:\/\/[^/\s]+\/privacidade$/.test(String(url ?? ""))) || urls[0] !== urls[1]) fail("PRIVACY_URL_INVALID", "play-console-status/google-play-internal", "URL HTTPS pública de /privacidade, igual nos dois");
  const publicBlock = s.src.routes.split("element: <PublicAuthLayout />")[1]?.split("],")[0] ?? "";
  if (!/path: "privacidade", element: <PrivacyPage \/>/.test(publicBlock)) fail("PRIVACY_REQUIRES_LOGIN", "src/routes.tsx", "/privacidade fica no layout público (sem login)");
  for (const key of ["microphone", "identity", "account", "deletionSteps"]) {
    if (!s.src.privacyPage.includes(`privacyNotice.${key}`)) fail("PRIVACY_URL_INVALID", "PrivacyPage.tsx", `política sem ${key}`);
  }

  // BQ — exclusão de conta (app + web + backend).
  if (!/requestAccountDeletion\(/.test(s.src.accountPage) || !/id="excluir-conta"/.test(s.src.privacyPage) || !/auth\.admin\.deleteUser\(/.test(s.src.deleteAccountFn) || pi.accountDeletionStatus !== "IN_APP_AND_WEB") {
    fail("ACCOUNT_DELETION_WITHOUT_PATH", "account/privacy/delete-account", "exclusão no app, na web (/privacidade#excluir-conta) e no backend");
  }

  // BR — App Access.
  if (!/## 6\. Acesso para revisores/.test(s.src.playChecklist) || !/Nunca\*\* coloque essa credencial no Git/.test(s.src.playChecklist) || pi.appAccess !== "INSTRUCTIONS_READY_OWNER_CREATES_REVIEW_ACCOUNT") {
    fail("APP_ACCESS_MISSING", "docs/PLAY_CONSOLE_CHECKLIST.md", "instruções para a conta de revisor, credencial fora do Git");
  }
  if (/senha:\s*\S{6,}|password:\s*\S{6,}/i.test(s.src.playChecklist)) fail("APP_ACCESS_MISSING", "PLAY_CONSOLE_CHECKLIST.md", "credencial de revisor no Git");

  // BS–BU — Data Safety.
  const byKey = new Map((ds?.items ?? []).map((item) => [item.data, item]));
  const missing = DATA_SAFETY_KEYS.filter((key) => !byKey.has(key));
  if (missing.length) fail("DATA_SAFETY_INCOMPLETE", "play-data-safety.json", `faltando: ${missing.join(", ")}`);
  for (const item of ds?.items ?? []) {
    const absent = DATA_SAFETY_FIELDS.filter((field) => !(field in item));
    if (absent.length || typeof item.collected !== "boolean" || typeof item.shared !== "boolean" || !String(item.evidence ?? "").trim()) {
      fail("DATA_SAFETY_ENTRY_INCOMPLETE", item.data, `campos ausentes: ${absent.join(", ") || "tipos/evidência"}`);
    }
    if (item.collected && (item.encryptedInTransit !== true || typeof item.deletable !== "boolean" || !item.purpose?.length || typeof item.required !== "boolean" || typeof item.optional !== "boolean")) {
      fail("DATA_SAFETY_ENTRY_INCOMPLETE", item.data, "dado coletado declara finalidade, required/optional, criptografia e exclusão");
    }
  }
  const mic = byKey.get("microphoneAudio");
  if (!mic || mic.collected !== false || mic.audioStored !== false || mic.microphoneUsed !== true || !/reconhecimento de fala do dispositivo/.test(String(mic.speechRecognitionService ?? ""))) {
    fail("AUDIO_PRIVACY_WRONG", "play-data-safety.json:microphoneAudio", "microfone usado, áudio NÃO armazenado, reconhecimento pelo serviço do dispositivo");
  }
  if (/MediaRecorder\s*\(|FileOutputStream|AudioRecord\s*\(/.test(stripComments(`${s.src.speech}\n${s.src.speechPlugin}`)) && mic?.audioStored === false) {
    fail("AUDIO_PRIVACY_WRONG", "speech", "código grava áudio mas a declaração diz que não");
  }

  // BV — anúncios.
  const adDeps = Object.keys(s.dependencies).filter((dep) => AD_SDK_RE.test(dep));
  if (adDeps.length || /com\.google\.android\.gms\.permission\.AD_ID/.test(s.src.manifestXml) || ds?.ads?.containsAds !== false || !ds?.ads?.evidence || pi.adsDeclaration !== "NO_ADS") {
    fail("ADS_DECLARATION_WRONG", "play-data-safety.json:ads", `declaração de anúncios sem evidência (${adDeps.join(", ") || "sem SDK"})`);
  }

  // BW/BX — classificação e público-alvo: só o owner.
  if (!["OWNER_REVIEW_REQUIRED", "OWNER_SUBMITTED"].includes(pi.contentRating)) fail("CONTENT_RATING_AUTOMATED", "google-play-internal.json", "questionário IARC é do owner");
  if (pi.targetAudience !== "OWNER_DECISION_REQUIRED" && !(pi.targetAudience?.decidedBy && pi.targetAudience?.ages)) fail("TARGET_AUDIENCE_CHILDREN_UNREVIEWED", "targetAudience", "decisão do owner");
  if (/child|crian|under ?13|menor/i.test(JSON.stringify(pi.targetAudience ?? "")) && pi.targetAudience?.familiesPolicyReviewed !== true) {
    fail("TARGET_AUDIENCE_CHILDREN_UNREVIEWED", "targetAudience", "crianças só com projeto/política Famílias revisados");
  }

  // BY–CE — monetização (25–30).
  const bodyOf = (fn) => s.src.subscription.split(`export async function ${fn}(`)[1]?.split("\nexport ")[0] ?? "";
  const guard = /^\s*if \(isNativeApp\(\)\) return \{ status: "not_implemented", message: ANDROID_CHECKOUT_UNAVAILABLE_MESSAGE \};/m;
  if (!guard.test(bodyOf("createCheckoutSession")) || !guard.test(bodyOf("openBillingPortal"))) fail("ANDROID_EXTERNAL_CHECKOUT", "subscriptionService.ts", "Android não abre Stripe/portal sem decisão de billing");
  for (const rel of s.src.srcCheckoutUsers) fail("ANDROID_EXTERNAL_CHECKOUT", rel, "checkout/portal Stripe fora do subscriptionService (sem guard nativo)");
  if (!/^export type ShopCurrency = "qi" \| "pearl";$/m.test(s.src.shopData) || (ba?.realMoneyCurrencies ?? [null]).length !== 0 || JSON.stringify(ba?.shopCurrencies) !== '["qi","pearl"]') {
    fail("PAID_CURRENCY_WITHOUT_BILLING", "src/data/shop.ts", "Qi/Pérolas só se ganham; moeda paga exige Play Billing");
  }
  if (!/export type CheckoutPlan = Extract<ProductPlan, "pro" \| "family">;/.test(s.src.billing)) fail("PAID_CURRENCY_WITHOUT_BILLING", "src/commercial/billing.ts", "checkout só vende Pro/Família (web)");
  if (!/export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;/.test(s.src.subscription) || !/export function isInAppPurchaseAvailable\(\): boolean \{\s*return !isNativeApp\(\);\s*\}/.test(s.src.subscription)) {
    fail("ANDROID_PRO_EXTERNAL_PURCHASE", "subscriptionService.ts", "isInAppPurchaseAvailable() = !isNativeApp() enquanto DISABLED_FOR_BETA");
  }
  const pro = s.src.proPage;
  const proGuards = [
    /const purchasesAvailable = isInAppPurchaseAvailable\(\);/,
    /\) : sellable && purchasesAvailable \? \(/,
    /\{purchasesAvailable && isBillingPortalAvailable\(\) && \(/,
    /\{!purchasesAvailable \? \(\s*<Card className="p-4" data-android-purchase-disabled>/,
  ];
  if (proGuards.some((re) => !re.test(pro))) fail("ANDROID_PRO_EXTERNAL_PURCHASE", "src/features/pro/ProPage.tsx", "no Android: sem preço, sem Assinar, sem portal; aviso honesto");
  const decisionOk = ba?.decision === "ANDROID_IN_APP_PURCHASE=DISABLED_FOR_BETA" || (ba?.decision === "PLAY_BILLING" && ba?.playBillingContract);
  if (!decisionOk) fail("BILLING_CONTRACT_MISSING", "android-billing-audit.json", "DISABLED_FOR_BETA ou Play Billing com contrato");
  for (const surface of ba?.surfaces ?? []) {
    if (surface.realMoney && surface.androidAvailable !== false && ba.decision !== "PLAY_BILLING") fail("BILLING_CONTRACT_MISSING", `surface:${surface.id}`, "compra com dinheiro disponível no Android sem Play Billing");
    for (const key of ["androidAvailable", "realMoney", "digitalGood", "androidBehavior"]) if (!(key in surface)) fail("BILLING_CONTRACT_MISSING", `surface:${surface.id}`, `${key} ausente`);
  }
  for (const id of ["subscribe_pro", "subscribe_family", "billing_portal", "buy_qi", "buy_pearls", "focus_pass", "cosmetics"]) {
    if (!(ba?.surfaces ?? []).some((surface) => surface.id === id)) fail("BILLING_CONTRACT_MISSING", "android-billing-audit.json", `superfície ${id} não catalogada`);
  }
  for (const [rel, text] of Object.entries(s.src.entitlements)) {
    if (/\b(isNativeApp|isAndroid|getPlatform|isNativePlatform)\s*\(|window\.Capacitor/.test(stripComments(text))) fail("WEB_ENTITLEMENT_BROKEN_ON_ANDROID", rel, "o plano vale em qualquer plataforma");
  }
  if (ba?.webEntitlementOnAndroid !== "RECOGNIZED_VIA_BACKEND") fail("WEB_ENTITLEMENT_BROKEN_ON_ANDROID", "android-billing-audit.json", "Pro web reconhecido no Android");
  if (!/ANDROID_IN_APP_PURCHASE/.test(s.src.report) || !/DISABLED_FOR_BETA/.test(s.src.report) || pi.billingDecision !== ba?.decision) {
    fail("MONETIZATION_STATUS_OMITTED", "docs/reports/rc2-2-16-play-internal-beta.md", "relatório e manifesto declaram ANDROID_IN_APP_PURCHASE");
  }

  // CF — verdade do produto na listagem.
  const listing = listingText(s.src.playChecklist);
  if (!listing) fail("STORE_LISTING_OVERCLAIM", "PLAY_CONSOLE_CHECKLIST.md §2", "texto da listagem ausente");
  const overclaims = [
    [/avalia\w* perfeita|pron[uú]ncia perfeita|corre\w* perfeita de tons/i, "avaliação perfeita de tons"],
    [/roleplay|intelig[eê]ncia artificial|chatbot/i, "IA/roleplay"],
    [/\b(IA|AI)\b/, "IA/roleplay"],
    [/caligrafia|escrita [àa] m[aã]o|handwriting|desenhe/i, "escrita à mão"],
    [/100% offline|offline total|sem internet/i, "offline total"],
    [/em breve|coming soon|futuramente/i, "feature futura"],
    [/compr\w* no app|assinatura no app|in-app purchase/i, "compra no app Android"],
    [/pr[aá]tica de fala|fale mandarim|corrige sua (fala|pron[uú]ncia)|reconhecimento de voz|speaking practice/i, "prática de fala (ANDROID_SPEECH_RECOGNITION_UNVERIFIED)"],
  ];
  for (const [re, label] of overclaims) if (re.test(listing)) fail("STORE_LISTING_OVERCLAIM", "PLAY_CONSOLE_CHECKLIST.md §2", `promete ${label}`);
  if (pi.packageName !== ID) fail("PLAY_PACKAGE_MISMATCH", "google-play-internal.json", pi.packageName);
  return failures;
}

// ---------------------------------------------------------------- 5. regressão da Beta

export async function validatePlayBetaRegression(s) {
  const { failures, fail } = collector();
  // 38 — #273 congelada.
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("CLOUD_273_TOUCHED", "docs/release/rc2-candidate.json", "candidate/releaseCandidateSha da #273 não muda");
  for (const id of CLOUD_CHECKS) if (s.json.operational?.checks?.[id]?.pass !== false) fail("CLOUD_273_TOUCHED", id, "cloud segue adiada (#273)");
  if (s.json.playInternal.releaseCandidateCloudCertification !== false || s.json.readiness?.cloudDeferred !== true) fail("CLOUD_273_TOUCHED", "manifests", "PRODUCTION_BACKEND_SMOKE ≠ RELEASE_CANDIDATE_CLOUD_CERTIFICATION");
  // 39–42 — freeze pedagógico.
  for (const failure of validateBetaPedagogyFreeze(s.freeze)) {
    const code = failure.code === "FINGERPRINT_DRIFT" || failure.code === "FREEZE_FINGERPRINT" ? "FINGERPRINT_DRIFT" : failure.code === "CAPABILITY_READY_DRIFT" ? "CAPABILITY_READY_DRIFT" : failure.code === "NEW_SRS" ? "NEW_SRS" : "CURRICULUM_COUNT_DRIFT";
    fail(code, failure.where, failure.why);
  }
  if (s.freeze.fingerprint !== BETA_FINGERPRINT) fail("FINGERPRINT_DRIFT", "journey", `${s.freeze.fingerprint} ≠ ${BETA_FINGERPRINT}`);
  for (const [key, expected] of Object.entries(BETA_BASELINE)) {
    if (s.freeze.counts[key] !== expected) fail(key === "conversationCapabilitiesRuntimeReady" ? "CAPABILITY_READY_DRIFT" : "CURRICULUM_COUNT_DRIFT", key, `${s.freeze.counts[key]} ≠ ${expected}`);
  }
  if (s.json.playInternal.dailyVocabulary === "DAILY_VOCABULARY_DEFERRED" && s.freeze.systemModules.some((file) => /daily.*(vocab|word)|vocab.*daily/i.test(file))) {
    fail("NEW_SRS", "src/lib", "Daily Vocabulary deferida não pode entrar como sistema novo");
  }
  // 43/44 — contratos de locale/curso e de progressão da lição continuam no gate.
  const gate = s.scripts["gate:rc2-2-16-play-internal-beta"] ?? "";
  for (const [script, code] of [
    ["gate:rc2-2-14b-locale-course-direction", "LOCALE_COURSE_GATE_REMOVED"],
    ["validate:course-direction", "LOCALE_COURSE_GATE_REMOVED"],
    ["validate:interface-locale-resolution", "LOCALE_COURSE_GATE_REMOVED"],
    ["gate:rc2-2-14-mobile-learning-polish", "LESSON_PROGRESSION_CONTRACT_REMOVED"],
    ["validate:lesson-step-progression", "LESSON_PROGRESSION_CONTRACT_REMOVED"],
    ["test:lesson-step-progression", "LESSON_PROGRESSION_CONTRACT_REMOVED"],
  ]) {
    if (!s.scripts[script]) fail(code, "package.json", `${script} ausente`);
  }
  const beta = s.scripts["validate:beta"] ?? "";
  const ciGates = s.src.buildWorkflow.match(/run: (npm run gate:android-native-foundation[^\n]*)/)?.[1] ?? "";
  for (const [where, chain] of [["validate:beta", beta], ["android-build.yml", ciGates]]) {
    if (!chain.includes("gate:rc2-2-14b-locale-course-direction")) fail("LOCALE_COURSE_GATE_REMOVED", where, "gate de locale/CourseDirection fora da cadeia");
    if (!chain.includes("gate:rc2-2-14-mobile-learning-polish")) fail("LESSON_PROGRESSION_CONTRACT_REMOVED", where, "gate de progressão da lição fora da cadeia");
    if (!chain.includes("gate:rc2-2-16-play-internal-beta")) fail("GATE_INCOMPLETE", where, "gate:rc2-2-16-play-internal-beta fora da cadeia");
  }
  if (!/npm run validate:lesson-step-progression(?= |$)/.test(s.scripts["gate:rc2-2-14-mobile-learning-polish"] ?? "")) fail("LESSON_PROGRESSION_CONTRACT_REMOVED", "gate:rc2-2-14-mobile-learning-polish", "contrato de progressão removido do gate");
  const localeGate = s.scripts["gate:rc2-2-14b-locale-course-direction"] ?? "";
  for (const part of ["validate:course-direction", "test:course-direction", "validate:interface-locale-resolution"]) {
    if (!new RegExp(`npm run ${part}(?= |$)`).test(localeGate)) fail("LOCALE_COURSE_GATE_REMOVED", "gate:rc2-2-14b-locale-course-direction", `${part} removido do gate`);
  }
  for (const part of ["validate:android-release-identity", "validate:signed-aab", "validate:play-internal-readiness", "validate:play-policy-readiness", "gate:android-native-foundation", "validate:beta-pedagogy-freeze"]) {
    if (!gate.includes(part)) fail("GATE_INCOMPLETE", "gate:rc2-2-16-play-internal-beta", `falta ${part}`);
  }
  // CL — login por username continua desligado.
  if (/VITE_USERNAME_LOGIN_ENABLED\s*[=:]\s*["']?true/.test(`${s.src.envProduction}\n${s.src.releaseWorkflow}`) || s.json.playInternal.usernameLoginEnabled !== false || !/env\.VITE_USERNAME_LOGIN_ENABLED === "true"/.test(s.src.username)) {
    fail("USERNAME_FLAG_ENABLED", "flag", "VITE_USERNAME_LOGIN_ENABLED fica false sem smoke formal");
  }
  if (s.json.playInternal.publicBetaVerdict !== "NO-GO" || s.json.readiness?.publicBetaVerdict !== "NO-GO") fail("PUBLIC_BETA_VERDICT", "manifests", "PUBLIC_BETA_FORMAL segue NO-GO");
  return failures;
}

export const GATES = {
  "android-release-identity": validateAndroidReleaseIdentity,
  "signed-aab": validateSignedAab,
  "play-internal-readiness": validatePlayInternalBeta,
  "play-policy-readiness": validatePlayPolicyReadiness,
  "play-beta-regression": validatePlayBetaRegression,
};

export function report(name, failures) {
  if (!failures.length) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`;
}
