/**
 * RC2.2.10 — gates da fundação Android (Capacitor).
 *
 * Três validadores PUROS sobre um estado lido do disco:
 *   validateAndroidNativeFoundation  — identidade, SDK, versão, manifesto,
 *                                      honestidade formal, freeze pedagógico;
 *   validateAndroidSigningContract   — keystore/senhas fora do Git, contrato de
 *                                      quatro valores, release nunca com debug key;
 *   validateAndroidPlatformBoundaries — um só frontend/store/SRS, SW só no web,
 *                                      BACK, deep links, links externos, permissões.
 * O validate:* passa o estado real; o test:* passa estados mutados.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { CURRICULUM_SOURCES } from "./report-meta.mjs";

export const EXPECTED_FINGERPRINT = "c48b008c9c1e";
export const EXPECTED_APP_ID = "com.longyu.app";
export const MIN_TARGET_SDK = 36;
export const CAPACITOR_MIN_SDK = 24;
export const SIGNING_ENV = [
  "LONGYU_ANDROID_KEYSTORE_PATH",
  "LONGYU_ANDROID_KEYSTORE_PASSWORD",
  "LONGYU_ANDROID_KEY_ALIAS",
  "LONGYU_ANDROID_KEY_PASSWORD",
];
export const SIGNING_PROPS = ["storeFile", "storePassword", "keyAlias", "keyPassword"];
const SIGNING_MISSING_CODE = {
  LONGYU_ANDROID_KEYSTORE_PATH: "SIGNING_STORE_PATH_MISSING",
  LONGYU_ANDROID_KEYSTORE_PASSWORD: "SIGNING_STORE_PASSWORD_MISSING",
  LONGYU_ANDROID_KEY_ALIAS: "SIGNING_KEY_ALIAS_MISSING",
  LONGYU_ANDROID_KEY_PASSWORD: "SIGNING_KEY_PASSWORD_MISSING",
  storeFile: "SIGNING_STORE_PATH_MISSING",
  storePassword: "SIGNING_STORE_PASSWORD_MISSING",
  keyAlias: "SIGNING_KEY_ALIAS_MISSING",
  keyPassword: "SIGNING_KEY_PASSWORD_MISSING",
};
export const CLOUD_CHECKS = ["cloud_auth", "cloud_sync", "feedback_backend"];
export const ALLOWED_PERMISSIONS = [
  "android.permission.INTERNET",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
  // RC2.2.13 — lembretes locais de estudo (Android 13+).
  "android.permission.POST_NOTIFICATIONS",
  // RC2.2.14 — @capacitor/haptics (vibração curta; sem dado coletado).
  "android.permission.VIBRATE",
];
/** Plugins nativos que só existem se houver consumidor em src/lib/platform/. */
export const RUNTIME_ONLY_PACKAGES = ["@capacitor/core", "@capacitor/android", "@capacitor/cli"];
/** Dependências que seriam uma segunda persistência/autoridade no nativo. */
export const FORBIDDEN_NATIVE_STORE_DEPS = /^(@capacitor\/preferences|@capacitor-community\/sqlite|@capacitor\/filesystem|@ionic\/storage|capacitor-sqlite|@capawesome\/.*storage.*|localforage)$/;

// ---------------------------------------------------------------- helpers

function read(root, rel) {
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

function listFiles(root, rel, filter) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", "build", ".gradle", "public"].includes(entry.name)) walk(full);
      } else if (!filter || filter(entry.name)) {
        out.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  };
  walk(abs);
  return out.sort();
}

export function fingerprintOf(curriculumSources) {
  const hash = createHash("sha256");
  for (const rel of CURRICULUM_SOURCES) {
    const source = curriculumSources[rel];
    if (source == null) hash.update(`ausente:${rel}`);
    else hash.update(source.replace(/\r\n?/g, "\n"), "utf8");
  }
  return hash.digest("hex").slice(0, 12);
}

function configString(text, key) {
  const match = String(text ?? "").match(new RegExp(`\\b${key}\\s*:\\s*["']([^"']*)["']`));
  return match ? match[1] : null;
}

function gradleInt(text, key) {
  const match = String(text ?? "").match(new RegExp(`\\b${key}\\s*=\\s*(\\d+)`));
  return match ? Number(match[1]) : null;
}

function properties(text) {
  const out = {};
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([^=:\s]+)\s*[=:]\s*(.*)$/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

/** Transpila um módulo TS da camada de plataforma e o executa com stubs. */
export function loadTsModule(source, stubs = {}) {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const requireStub = (name) => {
    if (name in stubs) return stubs[name];
    throw new Error(`import não permitido na avaliação isolada: ${name}`);
  };
  new Function("require", "module", "exports", js)(requireStub, module, module.exports);
  return module.exports;
}

// ---------------------------------------------------------------- estado real

export function loadAndroidFoundationState(root = process.cwd()) {
  const platformDir = "src/lib/platform";
  const platformSources = Object.fromEntries(
    listFiles(root, platformDir, (name) => /\.tsx?$/.test(name)).map((rel) => [rel, read(root, rel)])
  );
  const capacitorUsers = listFiles(root, "src", (name) => /\.(ts|tsx)$/.test(name))
    .filter((rel) => !rel.startsWith(`${platformDir}/`))
    .map((rel) => ({ path: rel, text: read(root, rel) }))
    .filter((file) => /@capacitor\/|window\.Capacitor|\bCapacitor\./.test(file.text));

  let trackedFiles = [];
  try {
    trackedFiles = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split("\0")
      .filter(Boolean);
  } catch {
    trackedFiles = [];
  }
  // Arquivos a varrer por senha literal: tudo o que é config Android/Capacitor/CI
  // (rastreado OU prestes a ser: o working tree conta).
  const scanned = [
    ...listFiles(root, "android", (name) => /\.(gradle|properties|xml|example|json|kts|pro)$/.test(name)),
    ...listFiles(root, ".github/workflows", (name) => /\.ya?ml$/.test(name)),
    "capacitor.config.ts",
  ].filter((rel) => !/^android\/app\/src\/main\/assets\//.test(rel) && !/(^|\/)(keystore|key|local)\.properties$/.test(rel));
  const scannedTexts = Object.fromEntries(scanned.map((rel) => [rel, read(root, rel)]).filter(([, text]) => text != null));

  const curriculumSources = Object.fromEntries(CURRICULUM_SOURCES.map((rel) => [rel, read(root, rel)]));
  const pkg = JSON.parse(read(root, "package.json"));
  const javaSources = Object.fromEntries(
    listFiles(root, "android/app/src/main/java", (name) => /\.(java|kt)$/.test(name)).map((rel) => [rel, read(root, rel)])
  );

  return {
    root,
    capacitorConfig: read(root, "capacitor.config.ts"),
    variablesGradle: read(root, "android/variables.gradle"),
    rootBuildGradle: read(root, "android/build.gradle"),
    appBuildGradle: read(root, "android/app/build.gradle"),
    signingGradle: read(root, "android/app/longyu-signing.gradle"),
    versionProperties: read(root, "android/version.properties"),
    androidManifestXml: read(root, "android/app/src/main/AndroidManifest.xml"),
    stringsXml: read(root, "android/app/src/main/res/values/strings.xml"),
    gradlewUnix: fs.existsSync(path.join(root, "android/gradlew")),
    gradlewWindows: fs.existsSync(path.join(root, "android/gradlew.bat")),
    gradleWrapperJar: fs.existsSync(path.join(root, "android/gradle/wrapper/gradle-wrapper.jar")),
    packageJson: pkg,
    releaseManifest: JSON.parse(read(root, "docs/release/android-native-foundation.json") ?? "null"),
    operationalChecks: JSON.parse(read(root, "docs/release/rc1-operational-checks.json") ?? "null"),
    evidenceFiles: listFiles(root, "docs/release/evidence"),
    curriculumFreezeSource: read(root, "src/lib/curriculumFreeze.ts"),
    curriculumSources,
    rootGitignore: read(root, ".gitignore"),
    androidGitignore: read(root, "android/.gitignore"),
    keystoreExample: read(root, "android/keystore.properties.example"),
    signingDoc: read(root, "docs/ANDROID_SIGNING.md"),
    androidCli: read(root, "scripts/android-cli.mjs"),
    signingLib: read(root, "scripts/lib/android-signing.mjs"),
    trackedFiles,
    scannedTexts,
    platformSources,
    capacitorUsers,
    javaSources,
    pwaBanner: read(root, "src/components/system/PwaUpdateBanner.tsx"),
    mainTsx: read(root, "src/main.tsx"),
    viteConfig: read(root, "vite.config.ts"),
  };
}

// ---------------------------------------------------------------- 1. foundation

export function validateAndroidNativeFoundation(s) {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  const cfg = s.capacitorConfig ?? "";
  if (!cfg) fail("CAPACITOR_CONFIG_MISSING", "capacitor.config.ts", "arquivo ausente");

  const appId = configString(cfg, "appId");
  if (!appId) fail("APP_ID_MISSING", "capacitor.config.ts", "appId ausente");
  else if (appId !== EXPECTED_APP_ID) fail("APP_ID_DIVERGENT", "capacitor.config.ts", `${appId} ≠ ${EXPECTED_APP_ID}`);
  const appName = configString(cfg, "appName");
  if (appName !== "Longyu") fail("APP_NAME", "capacitor.config.ts", `appName ${appName ?? "ausente"} ≠ Longyu`);
  const webDir = configString(cfg, "webDir");
  if (webDir !== "dist") fail("WEB_DIR", "capacitor.config.ts", `webDir ${webDir ?? "ausente"} ≠ dist`);
  if (/\bserver\s*:\s*\{[\s\S]*?\burl\s*:/.test(cfg) || /\burl\s*:\s*["']https?:\/\//.test(cfg)) {
    fail("REMOTE_WEBVIEW", "capacitor.config.ts", "server.url transforma o app numa WebView remota do site");
  }

  const gradle = s.appBuildGradle ?? "";
  if (!gradle) fail("ANDROID_PROJECT_MISSING", "android/app/build.gradle", "projeto Android ausente");
  const gradleAppId = gradle.match(/applicationId\s+["']([^"']+)["']/)?.[1];
  if (gradleAppId !== EXPECTED_APP_ID) fail("APP_ID_DIVERGENT", "android/app/build.gradle", `applicationId ${gradleAppId} ≠ ${EXPECTED_APP_ID}`);
  const namespace = gradle.match(/namespace\s*=?\s*["']([^"']+)["']/)?.[1];
  if (namespace !== EXPECTED_APP_ID) fail("APP_ID_DIVERGENT", "android/app/build.gradle", `namespace ${namespace} ≠ ${EXPECTED_APP_ID}`);
  const appNameXml = String(s.stringsXml ?? "").match(/name="app_name">([^<]*)</)?.[1];
  if (appNameXml !== "Longyu") fail("APP_NAME", "strings.xml", `app_name ${appNameXml} ≠ Longyu`);
  if (!s.gradlewUnix || !s.gradlewWindows || !s.gradleWrapperJar) {
    fail("GRADLE_WRAPPER", "android/", "gradlew + gradlew.bat + gradle-wrapper.jar são obrigatórios (Windows e Unix)");
  }

  const target = gradleInt(s.variablesGradle, "targetSdkVersion");
  const compile = gradleInt(s.variablesGradle, "compileSdkVersion");
  const min = gradleInt(s.variablesGradle, "minSdkVersion");
  if (!(target >= MIN_TARGET_SDK)) fail("TARGET_SDK", "android/variables.gradle", `targetSdk ${target} < ${MIN_TARGET_SDK}`);
  if (!(compile >= MIN_TARGET_SDK) || !(compile >= target)) fail("COMPILE_SDK", "android/variables.gradle", `compileSdk ${compile} incompatível com targetSdk ${target}`);
  if (!(min >= CAPACITOR_MIN_SDK)) fail("MIN_SDK", "android/variables.gradle", `minSdk ${min} abaixo do suporte do Capacitor (${CAPACITOR_MIN_SDK})`);
  if (!/compileSdk\s*=\s*rootProject\.ext\.compileSdkVersion/.test(gradle) || !/targetSdkVersion\s+rootProject\.ext\.targetSdkVersion/.test(gradle)) {
    fail("COMPILE_SDK", "android/app/build.gradle", "SDKs devem vir de variables.gradle (fonte única)");
  }

  // Versão: package.json ↔ Android ↔ manifesto de release.
  const pkgVersion = s.packageJson?.version;
  if (/versionName\s+["']/.test(gradle) || !/versionName\s+longyuVersionName/.test(gradle) || !/longyuPackageJson\.version/.test(gradle)) {
    fail("VERSION_DIVERGENCE", "android/app/build.gradle", "versionName precisa vir do package.json, sem literal");
  }
  if (/versionCode\s+\d/.test(gradle) || !/versionCode\s+longyuVersionCode/.test(gradle)) {
    fail("VERSION_DIVERGENCE", "android/app/build.gradle", "versionCode precisa vir de android/version.properties, sem literal");
  }
  const versionCode = Number(properties(s.versionProperties).versionCode);
  if (!Number.isInteger(versionCode) || versionCode < 1) fail("VERSION_CODE", "android/version.properties", `versionCode ${versionCode} inválido`);
  const m = s.releaseManifest;
  if (!m) {
    fail("RELEASE_MANIFEST_MISSING", "docs/release/android-native-foundation.json", "ausente");
  } else {
    if (m.versionName !== pkgVersion) fail("VERSION_DIVERGENCE", "release manifest", `versionName ${m.versionName} ≠ package.json ${pkgVersion}`);
    if (m.versionCode !== versionCode) fail("VERSION_DIVERGENCE", "release manifest", `versionCode ${m.versionCode} ≠ version.properties ${versionCode}`);
    if (m.id !== "android-native-foundation") fail("RELEASE_MANIFEST", "id", m.id);
    if (m.appId !== appId) fail("APP_ID_DIVERGENT", "release manifest", `${m.appId} ≠ ${appId}`);
    if (m.appName !== "Longyu") fail("APP_NAME", "release manifest", m.appName);
    if (m.targetSdk !== target || m.compileSdk !== compile || m.minSdk !== min) fail("RELEASE_MANIFEST", "sdk", "SDKs do manifesto ≠ variables.gradle");
    if (m.fingerprint !== EXPECTED_FINGERPRINT) fail("FINGERPRINT_DRIFT", "release manifest", `${m.fingerprint} ≠ ${EXPECTED_FINGERPRINT}`);
    if (m.pedagogyFrozen !== true || m.cloudDeferred !== true || m.signingContractReady !== true) {
      fail("RELEASE_MANIFEST", "flags", "pedagogyFrozen/cloudDeferred/signingContractReady precisam ser true");
    }
    if (m.publicBetaVerdict !== "NO-GO") fail("PUBLIC_BETA_VERDICT", "release manifest", `${m.publicBetaVerdict} — RC2.2.10 não certifica a Public Beta`);
    if (m.keystoreTracked !== false) fail("RELEASE_MANIFEST", "keystoreTracked", "precisa ser false");
    if (m.playConsoleConfigured !== false) fail("UNPROVEN_CLAIM", "playConsoleConfigured", "sem evidência de Play Console");
    if (m.releaseSigningEvidence !== false && !(s.evidenceFiles ?? []).includes("docs/release/evidence/android-signed-release.md")) {
      fail("UNPROVEN_CLAIM", "releaseSigningEvidence", "release assinado declarado sem evidência");
    }
  }

  // Honestidade formal: #273 bloqueada, dispositivo físico ≠ build/emulador.
  const checks = s.operationalChecks?.checks ?? {};
  for (const id of CLOUD_CHECKS) {
    if (checks[id]?.pass !== false) fail("CLOUD_CHECK_PROMOTED", id, "cloud segue adiada (#273); o check não pode sair de false nesta remessa");
  }
  const device = checks.android_real_device;
  const deviceEvidence = device?.evidence && (s.evidenceFiles ?? []).includes(device.evidence);
  const deviceEvidenceComplete = Boolean(deviceEvidence && device.testedAt && device.environment && device.commitSha);
  if (!device) fail("ANDROID_DEVICE_CHECK_MISSING", "android_real_device", "check formal ausente");
  else if (device.pass === true && !deviceEvidenceComplete) {
    fail("ANDROID_DEVICE_PASS_WITHOUT_EVIDENCE", "android_real_device", "PASS exige dispositivo físico + evidência humana (testedAt/environment/commitSha/arquivo)");
  }
  if (m?.physicalDevicePass === true && !(device?.pass === true && deviceEvidenceComplete)) {
    fail("ANDROID_DEVICE_PASS_WITHOUT_EVIDENCE", "release manifest", "physicalDevicePass sem check formal com evidência");
  }

  // Freeze pedagógico herdado do RC2.2.9.
  const freezeSrc = s.curriculumFreezeSource ?? "";
  if (!/export const BETA_PEDAGOGY_FREEZE\b/.test(freezeSrc)) fail("BETA_PEDAGOGY_FREEZE_REMOVED", "src/lib/curriculumFreeze.ts", "BETA_PEDAGOGY_FREEZE precisa continuar ativo");
  const frozenFp = freezeSrc.match(/RC_BASE_FINGERPRINT\s*=\s*"([0-9a-f]{12})"/)?.[1];
  if (frozenFp !== EXPECTED_FINGERPRINT) fail("FINGERPRINT_DRIFT", "RC_BASE_FINGERPRINT", `${frozenFp} ≠ ${EXPECTED_FINGERPRINT}`);
  const fp = fingerprintOf(s.curriculumSources ?? {});
  if (fp !== EXPECTED_FINGERPRINT) {
    fail("CURRICULUM_SOURCE_MODIFIED", "CURRICULUM_SOURCES", `fingerprint ${fp} ≠ ${EXPECTED_FINGERPRINT}: RC2.2.10 não é pedagógica`);
  }
  return failures;
}

// ---------------------------------------------------------------- 2. signing

const SECRET_FILE = /(\.(jks|keystore|p12|pfx)$)|((^|\/)(keystore|key)\.properties$)|((^|\/)local\.properties$)/;

function gitignoreCovers(text, pattern) {
  const lines = String(text ?? "").split(/\r?\n/).map((line) => line.trim());
  return lines.includes(pattern);
}

function gitignoreNegates(text, re) {
  return String(text ?? "").split(/\r?\n/).some((line) => line.trim().startsWith("!") && re.test(line.trim().slice(1)));
}

export function validateAndroidSigningContract(s) {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  const gi = s.rootGitignore ?? "";

  if (!gitignoreCovers(gi, "*.jks") || gitignoreNegates(gi, /\.jks$|^\*\.jks$/)) fail("JKS_NOT_IGNORED", ".gitignore", "*.jks precisa ser ignorado");
  if (!gitignoreCovers(gi, "*.keystore") || gitignoreNegates(gi, /\.keystore$/)) fail("KEYSTORE_NOT_IGNORED", ".gitignore", "*.keystore precisa ser ignorado");
  if (!gitignoreCovers(gi, "android/keystore.properties") || !gitignoreCovers(gi, "keystore.properties") || gitignoreNegates(gi, /keystore\.properties$/)) {
    fail("KEYSTORE_PROPERTIES_COMMITTABLE", ".gitignore", "keystore.properties precisa ser ignorado");
  }
  if (!gitignoreCovers(gi, "android/key.properties")) fail("KEYSTORE_PROPERTIES_COMMITTABLE", ".gitignore", "android/key.properties precisa ser ignorado");
  if (!gitignoreCovers(gi, "android/local.properties") || gitignoreNegates(gi, /local\.properties$/)) fail("LOCAL_PROPERTIES_COMMITTABLE", ".gitignore", "local.properties (caminho de SDK da máquina) precisa ser ignorado");

  for (const file of s.trackedFiles ?? []) {
    if (SECRET_FILE.test(file)) fail("SECRET_FILE_TRACKED", file, "keystore/segredo/caminho local rastreado no Git");
  }

  // Senha/segredo literal em config rastreada.
  for (const [rel, text] of Object.entries(s.scannedTexts ?? {})) {
    const lines = String(text).split(/\r?\n/);
    lines.forEach((line, index) => {
      const where = `${rel}:${index + 1}`;
      const code = line.replace(/\/\/.*$/, "").replace(/^\s*#.*$/, "");
      if (/(storePassword|keyPassword|password)(\s*[=:]\s*|\s+)["'][^"'$]{1,}["']/i.test(code)) fail("PASSWORD_LITERAL", where, "senha literal em arquivo rastreado");
      if (/^\s*(storePassword|keyPassword)\s*[=:]\s*(?!CHANGE_ME\s*$)\S+/.test(code) && /\.(properties|example)$/.test(rel)) {
        fail("PASSWORD_LITERAL", where, "senha literal em properties rastreado (só CHANGE_ME é aceito)");
      }
      const envAssign = code.match(/LONGYU_ANDROID_(KEYSTORE_PASSWORD|KEY_PASSWORD|KEY_ALIAS|KEYSTORE_BASE64)\s*[:=]\s*(.+)$/);
      if (envAssign && !/^\s*\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}\s*$/.test(envAssign[2]) && /\.ya?ml$/.test(rel)) {
        fail("PASSWORD_LITERAL", where, "workflow define valor de assinatura sem ${{ secrets.* }}");
      }
    });
  }

  // Contrato de quatro valores (Gradle + Node + exemplo + doc).
  const signing = s.signingGradle ?? "";
  for (const name of SIGNING_ENV) {
    if (!signing.includes(`'${name}'`) && !signing.includes(`"${name}"`)) fail(SIGNING_MISSING_CODE[name], "longyu-signing.gradle", `${name} ausente do contrato`);
    if (!String(s.signingLib ?? "").includes(`"${name}"`)) fail(SIGNING_MISSING_CODE[name], "scripts/lib/android-signing.mjs", `${name} ausente do contrato Node`);
    if (!String(s.signingDoc ?? "").includes(name)) fail(SIGNING_MISSING_CODE[name], "docs/ANDROID_SIGNING.md", `${name} não documentado`);
  }
  for (const prop of SIGNING_PROPS) {
    if (!new RegExp(`prop:\\s*'${prop}'`).test(signing)) fail(SIGNING_MISSING_CODE[prop], "longyu-signing.gradle", `${prop} ausente do keystore.properties suportado`);
    if (!new RegExp(`\\b${prop}\\s+longyu`).test(signing)) fail(SIGNING_MISSING_CODE[prop], "longyu-signing.gradle", `signingConfig não aplica ${prop}`);
  }
  const example = properties(s.keystoreExample);
  for (const prop of SIGNING_PROPS) {
    if (!(prop in example)) fail(SIGNING_MISSING_CODE[prop], "keystore.properties.example", `${prop} ausente do modelo`);
  }
  for (const prop of ["storePassword", "keyPassword", "keyAlias"]) {
    if (prop in example && example[prop] !== "CHANGE_ME") fail("PASSWORD_LITERAL", "keystore.properties.example", `${prop} precisa ser placeholder CHANGE_ME`);
  }

  // Release nunca com debug key; bloqueio honesto sem segredos.
  const gradles = `${s.appBuildGradle ?? ""}\n${signing}`;
  if (/signingConfigs\.debug|signingConfig\s*=?\s*signingConfigs\.getByName\(["']debug["']\)/.test(gradles)) {
    fail("RELEASE_USES_DEBUG_KEY", "android/app", "release não pode cair na debug key");
  }
  if (!/apply from:\s*'longyu-signing\.gradle'/.test(s.appBuildGradle ?? "")) fail("SIGNING_NOT_APPLIED", "android/app/build.gradle", "longyu-signing.gradle não aplicado");
  if (!/signingConfig\s+longyuReleaseSigningReady\s*\?\s*signingConfigs\.longyuRelease\s*:\s*null/.test(signing)) {
    fail("RELEASE_USES_DEBUG_KEY", "longyu-signing.gradle", "release sem segredos precisa ficar SEM assinatura (null), nunca com outra chave");
  }
  if (!/BLOCKED_SIGNING_SECRETS/.test(signing) || !/taskGraph\.whenReady/.test(signing) || !/throw new GradleException/.test(signing)) {
    fail("RELEASE_NOT_BLOCKED", "longyu-signing.gradle", "tarefa de release sem segredos precisa terminar em BLOCKED_SIGNING_SECRETS");
  }
  if (!/BLOCKED_SIGNING_SECRETS/.test(s.androidCli ?? "") || !/"bundle:release":\s*\(\)\s*=>\s*\{[^}]*?\brequireSigning\(\);[^}]*?gradle\("bundleRelease"\)/.test(s.androidCli ?? "")) {
    fail("RELEASE_NOT_BLOCKED", "scripts/android-cli.mjs", "android:bundle:release precisa pré-checar a assinatura");
  }
  if (/(println|logger\.\w+|console\.\w+)\([^)]*(PASSWORD|Password|password)[^)]*\)/.test(`${signing}\n${s.androidCli ?? ""}\n${s.signingLib ?? ""}`) &&
      /(println|logger\.\w+)\([^)]*longyuSigning\./.test(signing)) {
    fail("SECRET_PRINTED", "signing", "valores de assinatura nunca são impressos");
  }
  if (/(println|logger\.\w+)\([^)]*longyuSigning\[/.test(signing) || /(println|logger\.\w+)\([^)]*longyuSigning\.LONGYU/.test(signing)) {
    fail("SECRET_PRINTED", "longyu-signing.gradle", "valores de assinatura nunca são impressos");
  }
  const doc = s.signingDoc ?? "";
  for (const needle of ["keytool", "upload key", "Play App Signing", "keystore.properties", "backup"]) {
    if (!doc.toLowerCase().includes(needle.toLowerCase())) fail("SIGNING_DOC", "docs/ANDROID_SIGNING.md", `falta explicar: ${needle}`);
  }
  return failures;
}

// ---------------------------------------------------------------- 3. boundaries

function stripComments(text) {
  return String(text ?? "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function evaluatePlatformModules(platformSources, platform = "android") {
  const src = (name) => platformSources[`src/lib/platform/${name}.ts`];
  const nativeStub = {
    getPlatform: () => platform,
    isNativeApp: () => platform !== "web",
    isAndroid: () => platform === "android",
    isWeb: () => platform === "web",
    isNativePluginAvailable: () => false,
  };
  const deepLinks = loadTsModule(src("deepLinks") ?? "", {});
  const externalLinks = loadTsModule(src("externalLinks") ?? "", { "./deepLinks": deepLinks });
  const back = loadTsModule(src("backNavigation") ?? "", {});
  const sw = loadTsModule(src("serviceWorkerPolicy") ?? "", { "./nativePlatform": nativeStub });
  return { deepLinks, externalLinks, back, sw };
}

export function validateAndroidPlatformBoundaries(s) {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  const sources = s.platformSources ?? {};
  const required = ["nativePlatform", "serviceWorkerPolicy", "backNavigation", "deepLinks", "externalLinks", "appLifecycle", "networkStatus", "buildIdentity", "nativeShell"];
  for (const name of required) {
    if (!sources[`src/lib/platform/${name}.ts`]) fail("PLATFORM_LAYER_MISSING", `src/lib/platform/${name}.ts`, "camada de plataforma incompleta");
  }
  if (failures.length) return failures;

  const nativePlatform = sources["src/lib/platform/nativePlatform.ts"];
  if (!/Capacitor\.isNativePlatform\(\)/.test(nativePlatform)) fail("PLATFORM_DETECTION", "nativePlatform.ts", "use Capacitor.isNativePlatform()");
  for (const fn of ["isNativeApp", "isAndroid", "isWeb", "getPlatform"]) {
    if (!new RegExp(`export function ${fn}\\(`).test(nativePlatform)) fail("PLATFORM_DETECTION", "nativePlatform.ts", `${fn}() ausente`);
  }
  for (const file of s.capacitorUsers ?? []) {
    fail("CAPACITOR_OUTSIDE_PLATFORM", file.path, "Capacitor/window.Capacitor só dentro de src/lib/platform/");
  }

  // Um só Longyu: nada de segundo store/SRS/conta no nativo.
  const deps = { ...(s.packageJson?.dependencies ?? {}), ...(s.packageJson?.devDependencies ?? {}) };
  for (const dep of Object.keys(deps)) {
    if (FORBIDDEN_NATIVE_STORE_DEPS.test(dep)) fail("NATIVE_SECOND_ACCOUNT_STORE", dep, "persistência nativa paralela ao store do Longyu");
  }
  for (const [rel, text] of Object.entries(sources)) {
    const base = path.basename(rel);
    if (/srs|review|mastery|spaced/i.test(base) || /from\s+["'][./]*\/(srs|reviewPlan|reviewSession|conversationVocabularySrs)["']/.test(text) || /\b(dueAt|easeFactor|nextReview|intervalDays)\b/.test(text)) {
      fail("NATIVE_SECOND_SRS", rel, "o SRS é um só (src/lib/srs.ts); a plataforma não agenda revisão");
    }
    if (/store|account|progress/i.test(base) || /from\s+["']zustand/.test(text) || /\b(localStorage|sessionStorage|indexedDB)\b/.test(text) || /\bpersist\(/.test(text) || /from\s+["'][./]*\/store["']/.test(text)) {
      fail("NATIVE_SECOND_ACCOUNT_STORE", rel, "conta/progresso vivem só no store do Longyu");
    }
  }
  for (const [rel, text] of Object.entries(s.javaSources ?? {})) {
    // RC2.2.13 — além da BridgeActivity, só plugins Capacitor internos (sem estado próprio).
    const isBridge = /extends BridgeActivity/.test(text);
    const isPlugin = /@CapacitorPlugin\(/.test(text) && /extends Plugin\b/.test(text);
    if (/SharedPreferences|SQLite|Room|DataStore|FileOutputStream/.test(text) || !(isBridge || isPlugin)) {
      fail("NATIVE_SECOND_ACCOUNT_STORE", rel, "código Java/Kotlin não guarda estado próprio; é só a BridgeActivity ou plugin interno");
    }
  }

  // Plugins: só com consumidor real na camada de plataforma.
  const platformText = Object.values(sources).map(stripComments).join("\n");
  for (const dep of Object.keys(s.packageJson?.dependencies ?? {})) {
    if (!dep.startsWith("@capacitor/") || RUNTIME_ONLY_PACKAGES.includes(dep)) continue;
    if (!platformText.includes(`"${dep}"`)) fail("PLUGIN_WITHOUT_CONSUMER", dep, "plugin instalado sem consumidor em src/lib/platform/");
  }

  // Service Worker: só web.
  let modules;
  try {
    modules = evaluatePlatformModules(sources);
  } catch (error) {
    fail("PLATFORM_EVAL", "src/lib/platform", String(error?.message ?? error));
    return failures;
  }
  if (modules.sw.shouldRegisterServiceWorker("android") !== false || modules.sw.shouldRegisterServiceWorker("ios") !== false) {
    fail("SW_IN_NATIVE", "serviceWorkerPolicy.ts", "SW do PWA não pode registrar no runtime nativo");
  }
  if (modules.sw.shouldRegisterServiceWorker("web") !== true) fail("PWA_REGRESSION", "serviceWorkerPolicy.ts", "web/PWA precisa continuar registrando o SW");
  const banner = s.pwaBanner ?? "";
  const gateAt = banner.indexOf("shouldRegisterServiceWorker()");
  const registerAt = banner.indexOf('import("virtual:pwa-register")');
  if (gateAt < 0 || registerAt < 0 || gateAt > registerAt) fail("SW_IN_NATIVE", "PwaUpdateBanner.tsx", "registerSW precisa ficar atrás de shouldRegisterServiceWorker()");
  if (/injectRegister\s*:\s*["'](script|inline|script-defer)["']/.test(s.viteConfig ?? "")) {
    fail("SW_IN_NATIVE", "vite.config.ts", "injectRegister no HTML registraria o SW também no app nativo");
  }

  // BACK: nunca sai do app fora da raiz.
  const decide = modules.back.decideBackAction;
  const backCases = [
    [{ overlayOpen: true, canGoBack: true, pathname: "/licao/l1/player" }, "dismiss-overlay"],
    [{ overlayOpen: true, canGoBack: false, pathname: "/jornada" }, "dismiss-overlay"],
    [{ overlayOpen: false, canGoBack: true, pathname: "/revisao" }, "history-back"],
    [{ overlayOpen: false, canGoBack: false, pathname: "/revisao" }, "navigate-home"],
    [{ overlayOpen: false, canGoBack: false, pathname: "/licao/l1/player" }, "navigate-home"],
    [{ overlayOpen: false, canGoBack: false, pathname: "/teste/fase/p1" }, "navigate-home"],
    [{ overlayOpen: false, canGoBack: false, pathname: "/cultura/c1" }, "navigate-home"],
    [{ overlayOpen: false, canGoBack: false, pathname: "/jornada" }, "minimize-app"],
    [{ overlayOpen: false, canGoBack: false, pathname: "/" }, "minimize-app"],
  ];
  for (const [input, expected] of backCases) {
    const got = decide(input);
    if (got !== expected) fail("BACK_EXITS_APP", `decideBackAction(${input.pathname})`, `${got} ≠ ${expected}`);
  }
  const shell = stripComments(sources["src/lib/platform/nativeShell.ts"]);
  if (/exitApp\s*\(/.test(platformText)) fail("BACK_EXITS_APP", "src/lib/platform", "exitApp() proibido: BACK minimiza só na raiz");
  if ((shell.match(/minimizeApp\s*\(/g) ?? []).length !== 1 || !/addListener\(\s*"backButton"/.test(shell) || !/decideBackAction\(/.test(shell)) {
    fail("BACK_EXITS_APP", "nativeShell.ts", "backButton precisa passar por decideBackAction e minimizar só no ramo da raiz");
  }
  if (!/if\s*\(\s*installed\s*\|\|\s*!isNativeApp\(\)\s*\)\s*return/.test(shell)) fail("WEB_REGRESSION", "nativeShell.ts", "initNativeShell precisa ser no-op fora do app nativo");
  if (!/initNativeShell\(/.test(s.mainTsx ?? "")) fail("NATIVE_SHELL_NOT_WIRED", "src/main.tsx", "initNativeShell não é chamado");
  if (/\b(reset|clear)[A-Z]\w*\(/.test(`${shell}\n${stripComments(sources["src/lib/platform/appLifecycle.ts"])}`)) {
    fail("BACKGROUND_RESETS_STATE", "nativeShell/appLifecycle", "background/resume não pode resetar sessão, Review, Culture ou Challenge");
  }

  // Deep links e links externos.
  const resolve = modules.deepLinks.resolveDeepLink;
  const linkCases = [
    ["com.longyu.app://revisao", "/revisao"],
    ["com.longyu.app://jornada", "/jornada"],
    ["com.longyu.app://cultura", "/cultura"],
    ["com.longyu.app://hanzi/atlas?char=%E4%BD%A0", "/hanzi/atlas?char=%E4%BD%A0"],
    ["https://singular-meringue-7838cd.netlify.app/revisao", "/revisao"],
    ["com.longyu.app://admin/feedback", null],
    ["com.longyu.app://qa/player", null],
    ["https://evil.example/revisao", null],
    ["http://singular-meringue-7838cd.netlify.app/revisao", null],
    ["javascript:alert(1)", null],
    ["file:///data/data/com.longyu.app/revisao", null],
    ["com.longyu.app://revisao/..%2F..%2Fadmin", null],
    ["intent://revisao#Intent;scheme=com.longyu.app;end", null],
  ];
  for (const [url, expected] of linkCases) {
    const got = resolve(url);
    if (got !== expected) fail("DEEP_LINK_UNSAFE", url, `${got} ≠ ${expected}`);
  }
  const classify = modules.externalLinks.classifyLink;
  const origin = "https://localhost";
  const classifyCases = [
    ["/revisao", "internal"],
    ["https://localhost/jornada", "internal"],
    ["https://example.org/artigo", "external"],
    ["https://singular-meringue-7838cd.netlify.app/revisao", "internal"],
    ["mailto:oi@longyu.app", "system"],
    ["javascript:alert(1)", "blocked"],
    ["http://example.org", "blocked"],
    ["data:text/html,<b>x</b>", "blocked"],
  ];
  for (const [href, expected] of classifyCases) {
    const got = classify(href, origin).kind;
    if (got !== expected) fail("EXTERNAL_LINK_IN_WEBVIEW", href, `${got} ≠ ${expected}`);
  }
  if (!/@capacitor\/browser/.test(shell) || !/Browser\.open/.test(shell)) fail("EXTERNAL_LINK_IN_WEBVIEW", "nativeShell.ts", "https externo abre no navegador do sistema");
  if (!/App\.getLaunchUrl\(\)/.test(shell) || !/"appUrlOpen"/.test(shell) || (shell.match(/resolveDeepLink\(/g) ?? []).length < 2) {
    fail("DEEP_LINK_UNSAFE", "nativeShell.ts", "appUrlOpen e launch URL precisam passar por resolveDeepLink");
  }
  if (!/android:scheme="@string\/custom_url_scheme"/.test(s.androidManifestXml ?? "") || !/name="custom_url_scheme">com\.longyu\.app</.test(s.stringsXml ?? "")) {
    fail("DEEP_LINK_UNSAFE", "AndroidManifest.xml", "intent-filter do esquema com.longyu.app ausente");
  }

  // Permissões: mínimo necessário.
  // `tools:node="remove"` é uma remoção (ex.: SCHEDULE_EXACT_ALARM trazida por plugin), não um pedido.
  const permissions = [...String(s.androidManifestXml ?? "").matchAll(/<uses-permission\s+android:name="([^"]+)"([^>]*)>/g)]
    .filter((match) => !/tools:node="remove"/.test(match[2]))
    .map((match) => match[1]);
  for (const permission of permissions) {
    if (!ALLOWED_PERMISSIONS.includes(permission)) fail("UNNEEDED_PERMISSION", permission, "permissão sem necessidade real");
  }
  if (!permissions.includes("android.permission.RECORD_AUDIO")) fail("MIC_CONTRACT", "AndroidManifest.xml", "RECORD_AUDIO é necessário para getUserMedia da prática de fala");
  return failures;
}
