/**
 * RC2.2.10B — gates da pipeline main → Web / Android.
 *
 *   validateDeliveryPipeline   — main como fonte, nada automático em produção,
 *                                sem OTA/JS remoto, honestidade formal, freeze;
 *   validateReleaseIdentity    — SHA como autoridade, versionCode crescente,
 *                                versionName legível, stale/dirty guards;
 *   validateAndroidReleaseSafety — keystore/base64/senhas/service account nunca
 *                                no Git, em log ou em artifact; release nunca
 *                                com debug key.
 *
 * O estado é recarregado do disco a cada mutação (tem funções da lib de
 * identidade, que não se clonam); os test:* trocam partes dele.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  loadAndroidFoundationState,
  validateAndroidNativeFoundation,
  validateAndroidSigningContract,
} from "./android-foundation-gates.mjs";
import * as identityLib from "./release-identity.mjs";

export const LIVE_UPDATE_DEPS = /^(@capacitor\/live-updates|@capgo\/capacitor-updater|capacitor-updater|cordova-plugin-code-push|@revopush\/.*|react-native-code-push|@ionic\/appflow.*|capacitor-live-update.*|@capawesome\/capacitor-live-update)$/;
const FOUNDATION_CODES_REUSED = new Set([
  "REMOTE_WEBVIEW",
  "CLOUD_CHECK_PROMOTED",
  "ANDROID_DEVICE_PASS_WITHOUT_EVIDENCE",
  "FINGERPRINT_DRIFT",
  "BETA_PEDAGOGY_FREEZE_REMOVED",
  "CURRICULUM_SOURCE_MODIFIED",
  "PUBLIC_BETA_VERDICT",
]);

function read(root, rel) {
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

function listSrc(root, dir) {
  const out = [];
  const walk = (abs) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const full = path.join(abs, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  };
  walk(path.join(root, dir));
  return out;
}

function gitGrep(root, pattern) {
  try {
    return execFileSync("git", ["grep", "-l", "-I", "-E", pattern], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function loadDeliveryState(root = process.cwd()) {
  const foundation = loadAndroidFoundationState(root);
  const workflowDir = path.join(root, ".github", "workflows");
  const workflows = Object.fromEntries(
    fs.readdirSync(workflowDir).filter((name) => /\.ya?ml$/.test(name)).map((name) => [name, read(root, `.github/workflows/${name}`)])
  );
  const srcTexts = Object.fromEntries(listSrc(root, "src").map((rel) => [rel, read(root, rel)]));
  return {
    root,
    foundation,
    workflows,
    delivery: JSON.parse(read(root, "docs/release/delivery-pipeline.json") ?? "null"),
    ledger: JSON.parse(read(root, "docs/release/android-release-ledger.json") ?? "null"),
    releaseDoc: read(root, "docs/RELEASE_PIPELINE.md") ?? "",
    packageJson: foundation.packageJson,
    capacitorConfig: foundation.capacitorConfig,
    netlifyToml: read(root, "netlify.toml") ?? "",
    viteBuild: read(root, "scripts/vite-build.mjs") ?? "",
    androidCli: read(root, "scripts/android-cli.mjs") ?? "",
    playUpload: read(root, "scripts/play-upload.mjs") ?? "",
    appBuildGradle: foundation.appBuildGradle,
    buildIdentityTs: read(root, "src/lib/platform/buildIdentity.ts") ?? "",
    buildIdentityLabel: read(root, "src/components/system/BuildIdentityLabel.tsx") ?? "",
    rootGitignore: foundation.rootGitignore,
    srcTexts,
    trackedFiles: foundation.trackedFiles,
    secretContentHits: gitGrep(root, 'BEGIN (RSA |EC )?PRIVATE KEY|"type"[[:space:]]*:[[:space:]]*"service_account"'),
    lib: { ...identityLib },
  };
}

function workflowTriggers(text) {
  const onBlock = String(text).match(/^on:\s*\n((?:[ \t]+.*\n|\s*\n)+)/m)?.[1] ?? String(text).match(/^on:\s*(.+)$/m)?.[1] ?? "";
  return {
    push: /(^|\n)\s{2}push:/.test(onBlock) || /\bpush\b/.test(onBlock.split("\n")[0] ?? ""),
    pullRequest: /(^|\n)\s{2}pull_request(_target)?:/.test(onBlock),
    dispatch: /(^|\n)\s{2}workflow_dispatch:/.test(onBlock),
    schedule: /(^|\n)\s{2}schedule:/.test(onBlock),
    other: /(^|\n)\s{2}(release|workflow_run|repository_dispatch|create):/.test(onBlock),
  };
}

function throws(fn) {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------- 1. delivery pipeline

export function validateDeliveryPipeline(s) {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  const d = s.delivery;
  if (!d) {
    fail("DELIVERY_MANIFEST_MISSING", "docs/release/delivery-pipeline.json", "ausente");
    return failures;
  }

  // Nenhum workflow automático publica no Play; produção nunca por push.
  for (const [name, text] of Object.entries(s.workflows)) {
    const t = workflowTriggers(text);
    const automatic = t.push || t.pullRequest || t.schedule || t.other;
    const uploads = /play-upload\.mjs(?![^\n]*--probe)/.test(text) || /upload-google-play|r0adkll|gradle-play-publisher|publishBundle|fastlane\s+supply/.test(text);
    if (automatic && uploads) fail("AUTO_PRODUCTION", name, "workflow com gatilho automático publica no Google Play");
    if (automatic && /--channel\s+production|track:\s*production/.test(text)) fail("AUTO_PRODUCTION", name, "produção referenciada em workflow automático");
    if (t.pullRequest && /secrets\.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/.test(text)) fail("PR_PRODUCTION_UPLOAD", name, "workflow de PR não recebe credencial do Play");
    if (t.pullRequest && uploads) fail("PR_PRODUCTION_UPLOAD", name, "workflow de PR tenta upload no Play");
  }
  const release = s.workflows["android-release.yml"];
  if (!release) fail("RELEASE_WORKFLOW_MISSING", "android-release.yml", "workflow manual de release ausente");
  else {
    const t = workflowTriggers(release);
    if (!t.dispatch || t.push || t.pullRequest || t.schedule || t.other) fail("AUTO_PRODUCTION", "android-release.yml", "release só por workflow_dispatch");
    if (!/"\$GITHUB_REF" != "refs\/heads\/main"/.test(release) || !/SOURCE_NOT_MAIN/.test(release)) {
      fail("SOURCE_NOT_MAIN", "android-release.yml", "release precisa recusar ref ≠ refs/heads/main");
    }
    const defaultChannel = release.match(/channel:\s*\n(?:\s+.*\n)*?\s+default:\s*(\w+)/)?.[1];
    if (defaultChannel !== "internal") fail("PRODUCTION_DEFAULT", "android-release.yml", `canal padrão ${defaultChannel} ≠ internal`);
    if (!/PUBLICAR-PRODUCAO/.test(release) || !/android-production/.test(release)) {
      fail("PRODUCTION_DEFAULT", "android-release.yml", "produção exige opt-in PUBLICAR-PRODUCAO + environment android-production");
    }
  }
  const build = s.workflows["android-build.yml"];
  if (!build) fail("ANDROID_BUILD_WORKFLOW_MISSING", "android-build.yml", "ausente");
  else {
    const t = workflowTriggers(build);
    if (!t.pullRequest || !t.push) fail("ANDROID_BUILD_TRIGGERS", "android-build.yml", "build Android roda em PR e em push na main");
    if (!/android-cli\.mjs debug/.test(build) || !/bundle:debug/.test(build) || !/fetch-depth:\s*0/.test(build)) {
      fail("ANDROID_BUILD_TRIGGERS", "android-build.yml", "debug APK + AAB com histórico completo (versionCode)");
    }
  }
  const ci = s.workflows["ci.yml"] ?? "";
  const ciT = workflowTriggers(ci);
  if (!ciT.push || !ciT.pullRequest || !/validate:beta/.test(ci) || !/npm run build/.test(ci) || !/release-identity\.mjs web/.test(ci) || !/longyu-web|steps\.web\.outputs\.artifact/.test(ci)) {
    fail("WEB_PIPELINE", "ci.yml", "web: PR + main, validate:beta, build, identidade com SHA e artefato longyu-web-<sha>");
  }
  const deployWorkflows = Object.entries(s.workflows).filter(([, text]) => /netlify\s+deploy|nwtgck\/actions-netlify|netlify-cli/.test(text));
  for (const [name] of deployWorkflows) fail("SECOND_WEB_DEPLOY", name, "o deploy web é do Netlify (integração Git); não criar um segundo sistema");

  // Resolver de canal (comportamento).
  const lib = s.lib;
  if (!throws(() => lib.resolveReleaseTarget({ channel: "production", ref: "refs/heads/main", event: "workflow_dispatch", confirmProduction: "" }))) {
    fail("PRODUCTION_DEFAULT", "resolveReleaseTarget", "produção sem opt-in foi aceita");
  }
  if (!throws(() => lib.resolveReleaseTarget({ channel: "internal", ref: "refs/heads/feature", event: "workflow_dispatch" }))) {
    fail("SOURCE_NOT_MAIN", "resolveReleaseTarget", "release de branch ≠ main foi aceita");
  }
  if (!throws(() => lib.resolveReleaseTarget({ channel: "internal", ref: "refs/heads/main", event: "push" }))) {
    fail("AUTO_PRODUCTION", "resolveReleaseTarget", "release por push foi aceita");
  }
  const prod = (() => {
    try {
      return lib.resolveReleaseTarget({ channel: "production", ref: "refs/heads/main", event: "workflow_dispatch", confirmProduction: "PUBLICAR-PRODUCAO" });
    } catch {
      return null;
    }
  })();
  if (!prod || prod.status !== "draft") fail("AUTO_PRODUCTION", "resolveReleaseTarget", "produção precisa subir como draft (rollout humano)");
  if (lib.MAX_AUTOMATIC_CHANNEL !== "internal" || d.defaultChannel !== "internal") fail("PRODUCTION_DEFAULT", "canal padrão", "internal é o máximo automático/padrão na Beta");
  if (!/resolveReleaseTarget\(/.test(s.playUpload) || !/process\.env\.GITHUB_REF/.test(s.playUpload) || !/process\.env\.GITHUB_EVENT_NAME/.test(s.playUpload)) {
    fail("AUTO_PRODUCTION", "scripts/play-upload.mjs", "upload precisa passar pela política de canal com ref/evento reais");
  }

  // OTA / live update / JS remoto.
  const deps = { ...(s.packageJson?.dependencies ?? {}), ...(s.packageJson?.devDependencies ?? {}) };
  for (const dep of Object.keys(deps)) if (LIVE_UPDATE_DEPS.test(dep)) fail("LIVE_UPDATE_ENABLED", dep, "LIVE_UPDATE = DEFERRED_POST_BETA");
  if (/LiveUpdates?\s*:|CapacitorUpdater\s*:|autoUpdate\s*:\s*true/.test(s.capacitorConfig ?? "")) fail("LIVE_UPDATE_ENABLED", "capacitor.config.ts", "updater OTA configurado");
  if (d.liveUpdate !== "DEFERRED_POST_BETA") fail("LIVE_UPDATE_ENABLED", "delivery-pipeline.json", `liveUpdate ${d.liveUpdate}`);
  for (const [rel, text] of Object.entries(s.srcTexts)) {
    if (/\beval\s*\(|new Function\s*\(|import\(\s*[`'"]https?:|import\(\s*\/\*\s*@vite-ignore|importScripts\s*\(/.test(text)) {
      fail("REMOTE_JS", rel, "o app não baixa nem executa JS remoto");
    }
    if (/createElement\(\s*["']script["']\s*\)/.test(text)) {
      // Únicos permitidos: JSON-LD (dado, não executa) e o widget Turnstile de
      // origem fixa (anti-bot da Cloudflare, não é código do app).
      const jsonLd = /\.type\s*=\s*"application\/ld\+json"/.test(text) && !/\.src\s*=/.test(text);
      const turnstile = /SCRIPT_SRC\s*=\s*"https:\/\/challenges\.cloudflare\.com\/turnstile\//.test(text) && /\.src\s*=\s*SCRIPT_SRC;/.test(text) && (text.match(/\.src\s*=/g) ?? []).length === 1;
      if (!jsonLd && !turnstile) fail("REMOTE_JS", rel, "script dinâmico com origem não aprovada");
    }
  }

  // Honestidade do manifesto.
  if (d.sourceOfTruth !== "main" || d.sameShaForWebAndAndroid !== true) fail("SOURCE_NOT_MAIN", "delivery-pipeline.json", "main é a fonte única; web e Android do mesmo SHA");
  if (d.androidAutoProduction !== false || d.androidAutoUpload !== false || d.androidAutomaticDestination !== "ARTIFACT_ONLY") {
    fail("AUTO_PRODUCTION", "delivery-pipeline.json", "nada automático além de artefato");
  }
  const uploads = s.ledger?.releases ?? [];
  if (d.androidInternalUpload === true && !uploads.some((entry) => entry.result === "UPLOADED" && entry.channel === "internal")) {
    fail("UNPROVEN_CLAIM", "androidInternalUpload", "upload declarado sem registro real no ledger");
  }
  if (d.playCredentialsConfigured === false && (d.androidInternalUpload === true || uploads.length > 0)) fail("UNPROVEN_CLAIM", "Play", "upload sem credencial configurada");
  if (d.signingCredentialsConfigured === false && d.androidSignedReleaseReady === true) fail("UNPROVEN_CLAIM", "signing", "release assinado pronto sem credencial");
  const checks = s.foundation.operationalChecks?.checks ?? {};
  if (d.pwaProductionUpgradeVerified !== false && checks.pwa_upgrade?.pass !== true) {
    fail("PWA_UPGRADE_PASS_BY_BUILD", "delivery-pipeline.json", "upgrade PWA de produção não se prova com build (só com o check formal pwa_upgrade)");
  }
  if (checks.pwa_upgrade?.pass !== false) fail("PWA_UPGRADE_PASS_BY_BUILD", "pwa_upgrade", "check formal só sai de false com drill real de upgrade N → N+1");
  if (d.androidRealDevice !== false) fail("ANDROID_DEVICE_PASS_WITHOUT_EVIDENCE", "delivery-pipeline.json", "CI/AAB ≠ aparelho físico");
  if (d.cloudDeferred !== true) fail("CLOUD_CHECK_PROMOTED", "delivery-pipeline.json", "#273 segue adiada");
  if (d.publicBetaVerdict !== "NO-GO") fail("PUBLIC_BETA_VERDICT", "delivery-pipeline.json", `${d.publicBetaVerdict} — pipeline não transforma NO-GO em GO`);
  for (const [name, text] of Object.entries(s.workflows)) {
    if (/publicBetaVerdict|PUBLIC_BETA[^\n]*=\s*GO\b|Public Beta \| GO\b/.test(text)) fail("PUBLIC_BETA_VERDICT", name, "workflow não declara GO");
  }

  // Regressões RC2.2.9/RC2.2.10 (freeze, fingerprint, currículo, WebView remota, cloud, device).
  for (const item of validateAndroidNativeFoundation(s.foundation)) {
    if (FOUNDATION_CODES_REUSED.has(item.code)) failures.push(item);
  }

  // Documentação do modelo de entrega.
  const doc = s.releaseDoc;
  for (const needle of ["Commit na main NÃO atualiza", "LIVE_UPDATE = DEFERRED_POST_BETA", "LONGYU_ANDROID_KEYSTORE_BASE64", "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "android-production", "rollback", "N → N+1"]) {
    if (!doc.includes(needle)) fail("RELEASE_DOC", "docs/RELEASE_PIPELINE.md", `falta: ${needle}`);
  }
  return failures;
}

// ---------------------------------------------------------------- 2. release identity

const SAMPLE_SHA = "0123456789abcdef0123456789abcdef01234567";

export function validateReleaseIdentity(s) {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  const lib = s.lib;

  // SHA é obrigatório e vai para a proveniência.
  let provenance = null;
  try {
    const identity = lib.buildIdentity({ sha: SAMPLE_SHA, branch: "main", version: "0.2.0-beta.2", versionName: "0.2.0-beta.2", versionCode: 42, platform: "android", buildType: "release", environment: "production_beta" });
    provenance = lib.buildProvenance(identity, [{ name: `${lib.artifactBaseName(identity)}.aab`, sha256: "x", bytes: 1 }]);
    if (identity.shortSha !== "0123456" || identity.authority !== "sha") fail("SHA_MISSING", "buildIdentity", "shortSha/authority incorretos");
    if (lib.artifactBaseName(identity) !== "longyu-android-0.2.0-beta.2-0123456") fail("ARTIFACT_NAME", "artifactBaseName", lib.artifactBaseName(identity));
  } catch (error) {
    fail("SHA_MISSING", "buildIdentity", String(error.message));
  }
  if (!provenance || provenance.sha !== SAMPLE_SHA || !provenance.shortSha || !provenance.version || !provenance.platform || !provenance.buildType || !("workflowRun" in provenance)) {
    fail("SHA_MISSING", "buildProvenance", "proveniência precisa de sha, versão, plataforma, buildType e workflow run");
  }
  if (!throws(() => lib.buildIdentity({ sha: "", version: "0.2.0", platform: "web", buildType: "release" }))) fail("SHA_MISSING", "buildIdentity", "identidade sem SHA foi aceita");
  if (!throws(() => lib.buildProvenance({ platform: "web", sha: SAMPLE_SHA, storePassword: "x" }, []))) fail("SECRET_IN_METADATA", "buildProvenance", "campo de segredo aceito na proveniência");

  // Web ↔ Android: a mesma release tem o mesmo SHA.
  for (const entry of s.ledger?.releases ?? []) {
    if (entry.sameReleaseAsWeb === true && entry.webSha !== entry.sha) fail("WEB_ANDROID_SHA_MISMATCH", `ledger ${entry.versionCode}`, `web ${entry.webSha} ≠ android ${entry.sha}`);
    if (!/^[0-9a-f]{40}$/.test(String(entry.sha ?? ""))) fail("SHA_MISSING", `ledger ${entry.versionCode}`, "entrada sem SHA completo");
  }

  // versionCode determinístico e crescente; sem colisão silenciosa.
  try {
    const a = lib.computeVersionCode({ floor: 1, firstParentCount: 10 });
    const b = lib.computeVersionCode({ floor: 1, firstParentCount: 11 });
    const again = lib.computeVersionCode({ floor: 1, firstParentCount: 10 });
    if (!(b > a) || a !== again) fail("VERSION_CODE_NOT_INCREASING", "computeVersionCode", `${a} → ${b} (repetição ${again})`);
  } catch (error) {
    fail("VERSION_CODE_NOT_INCREASING", "computeVersionCode", String(error.message));
  }
  if (!throws(() => lib.assertVersionCodeIncreases(42, [42])) || !throws(() => lib.assertVersionCodeIncreases(41, [40, 42]))) {
    fail("VERSION_CODE_NOT_INCREASING", "assertVersionCodeIncreases", "colisão/regressão aceita");
  }
  const codes = (s.ledger?.releases ?? []).map((entry) => entry.versionCode);
  codes.forEach((code, index) => {
    if (index > 0 && !(code > codes[index - 1])) fail("VERSION_CODE_NOT_INCREASING", "android-release-ledger.json", `${code} depois de ${codes[index - 1]}`);
  });
  const lastLedger = codes.length ? codes[codes.length - 1] : null;
  if ((s.delivery?.lastUploadedVersionCode ?? null) !== lastLedger) fail("VERSION_CODE_NOT_INCREASING", "delivery-pipeline.json", "lastUploadedVersionCode ≠ último do ledger");
  const gradle = s.appBuildGradle ?? "";
  if (!/LONGYU_ANDROID_VERSION_CODE/.test(gradle) || !/longyuVersionCode < longyuVersionFloor/.test(gradle)) {
    fail("VERSION_CODE_NOT_INCREASING", "android/app/build.gradle", "override de versionCode precisa respeitar o floor");
  }
  if (!/exportVersionCode\(git\)/.test(s.androidCli) || !/assertVersionCodeIncreases\(provenance\.versionCode, published\)/.test(s.playUpload)) {
    fail("VERSION_CODE_NOT_INCREASING", "scripts", "build exporta versionCode e o upload confere contra o Play");
  }

  // versionName legível (package.json), igual em todo lugar.
  const version = s.packageJson?.version;
  if (throws(() => lib.assertVersionName(version)) || !throws(() => lib.assertVersionName(SAMPLE_SHA))) fail("VERSION_NAME", "assertVersionName", `${version}`);
  for (const match of s.netlifyToml.matchAll(/VITE_APP_VERSION\s*=\s*"([^"]+)"/g)) {
    if (match[1] !== version) fail("VERSION_NAME", "netlify.toml", `VITE_APP_VERSION ${match[1]} ≠ package.json ${version}`);
  }
  if (!/commitSha/.test(s.viteBuild) || !/platform:\s*"web"/.test(s.viteBuild) || !/authority:\s*"sha"/.test(s.viteBuild)) {
    fail("SHA_MISSING", "scripts/vite-build.mjs", "dist/version.json precisa do SHA como autoridade");
  }
  if (!/App\.getInfo\(\)/.test(s.buildIdentityTs) || !/getNativeAppVersion/.test(s.buildIdentityLabel)) {
    fail("BUILD_INFO", "src/lib/platform/buildIdentity.ts", "Android mostra versionCode do APK instalado");
  }

  // Stale build: o compilado é o SHA da release.
  if (!throws(() => lib.assertBuildMatchesRelease({ headSha: SAMPLE_SHA, bundleSha: SAMPLE_SHA.replace(/^0/, "f"), expectedSha: "" }))) {
    fail("STALE_BUILD", "assertBuildMatchesRelease", "bundle de outro commit aceito");
  }
  if (!throws(() => lib.assertBuildMatchesRelease({ headSha: SAMPLE_SHA, bundleSha: SAMPLE_SHA, expectedSha: "f".repeat(40) }))) {
    fail("STALE_BUILD", "assertBuildMatchesRelease", "HEAD ≠ SHA esperado aceito");
  }
  const releaseBlock = s.androidCli.match(/"bundle:release":\s*\(\)\s*=>\s*\{([\s\S]*?)\n  \},/)?.[1] ?? "";
  const guardAt = releaseBlock.indexOf("requireBuildMatchesRelease(git)");
  const gradleAt = releaseBlock.indexOf('gradle("bundleRelease")');
  if (guardAt < 0 || gradleAt < 0 || guardAt > gradleAt) fail("STALE_BUILD", "android-cli bundle:release", "guard de SHA antes do Gradle");
  if (!/LONGYU_RELEASE_SHA/.test(s.workflows["android-release.yml"] ?? "")) fail("STALE_BUILD", "android-release.yml", "release precisa fixar LONGYU_RELEASE_SHA");

  // Dirty tree: release oficial recusa; só a flag explícita aceita.
  if (!throws(() => lib.assertCleanTreeForRelease({ dirty: true, allowDirty: false }))) fail("DIRTY_TREE_ACCEPTED", "assertCleanTreeForRelease", "árvore suja aceita sem flag");
  const allowed = (() => {
    try {
      return lib.assertCleanTreeForRelease({ dirty: true, allowDirty: true });
    } catch {
      return null;
    }
  })();
  if (!allowed || allowed.official !== false) fail("DIRTY_TREE_ACCEPTED", "assertCleanTreeForRelease", "--allow-dirty precisa marcar official=false");
  const cleanAt = releaseBlock.indexOf("requireCleanTree(git)");
  if (cleanAt < 0 || cleanAt > gradleAt || !/allowDirty:\s*args\.includes\("--allow-dirty"\)/.test(s.androidCli)) {
    fail("DIRTY_TREE_ACCEPTED", "android-cli bundle:release", "release oficial precisa checar a árvore antes do build");
  }
  if (!/UNOFFICIAL_BUILD/.test(s.playUpload)) fail("DIRTY_TREE_ACCEPTED", "play-upload.mjs", "build não oficial não sobe para o Play");
  return failures;
}

// ---------------------------------------------------------------- 3. android release safety

const SECRET_FILE = /(\.(jks|keystore|p12|pfx)$)|((^|\/)(keystore|key)\.properties$)|(service[-_]?account.*\.json$)|(google-play.*\.json$)|(play-credentials.*\.json$)/i;

export function validateAndroidReleaseSafety(s) {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });

  for (const file of s.trackedFiles ?? []) {
    if (/\.(jks|keystore|p12|pfx)$/i.test(file) || /(^|\/)(keystore|key)\.properties$/.test(file)) fail("KEYSTORE_TRACKED", file, "keystore/propriedades de assinatura no Git");
    else if (SECRET_FILE.test(file)) fail("SERVICE_ACCOUNT_COMMITTED", file, "credencial do Play no Git");
  }
  for (const file of s.secretContentHits ?? []) fail("SERVICE_ACCOUNT_COMMITTED", file, "chave privada / service account em arquivo rastreado");
  for (const pattern of ["*service-account*.json", "google-play*.json", "*.jks", "*.keystore"]) {
    if (!String(s.rootGitignore ?? "").split(/\r?\n/).map((line) => line.trim()).includes(pattern)) fail("SECRET_NOT_IGNORED", ".gitignore", `falta ${pattern}`);
  }

  for (const [name, text] of Object.entries(s.workflows)) {
    const lines = String(text).split(/\r?\n/);
    lines.forEach((line, index) => {
      const where = `${name}:${index + 1}`;
      const code = line.replace(/^\s*#.*$/, "");
      const printing = /\b(echo|printf|cat|tee)\b|::(debug|notice|warning|error)::|set\s+-x/.test(code);
      if (/set\s+-x/.test(code)) fail("PASSWORD_LOGGED", where, "set -x expõe variáveis de assinatura no log");
      if (printing && /\$\{?(KS_PASS|STORE_PASS|LONGYU_ANDROID_KEYSTORE_PASSWORD)\b|secrets\.LONGYU_ANDROID_KEYSTORE_PASSWORD/.test(code)) fail("PASSWORD_LOGGED", where, "store password em log");
      if (printing && /\$\{?(KEY_PASS|LONGYU_ANDROID_KEY_PASSWORD)\b|secrets\.LONGYU_ANDROID_KEY_PASSWORD/.test(code)) fail("KEY_PASSWORD_LOGGED", where, "key password em log");
      if (printing && /\$\{?(PLAY_JSON|GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)\b|secrets\.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/.test(code)) fail("SERVICE_ACCOUNT_LOGGED", where, "credencial do Play em log");
      if (printing && /\$\{?(KS_B64|LONGYU_ANDROID_KEYSTORE_BASE64)\b|secrets\.LONGYU_ANDROID_KEYSTORE_BASE64/.test(code)) {
        if (!/\|\s*base64\s+(--decode|-d)\s*>\s*"?\$(RUNNER_TEMP|ks)\b/.test(code)) fail("KEYSTORE_BASE64_EXPOSED", where, "base64 do keystore só pode ir direto para o arquivo temporário");
      }
      if (/debug\.keystore|signingConfigs\.debug/.test(code)) fail("RELEASE_USES_DEBUG_KEY", where, "release nunca com debug keystore");
    });
    // Artefatos: só APK/AAB + proveniência/registro. Nada de keystore, properties, RUNNER_TEMP.
    for (const match of String(text).matchAll(/uses:\s*actions\/upload-artifact@[^\n]*\n(?:\s+.*\n)*?\s+path:\s*([\s\S]*?)(?=\n\s+[a-z-]+:\s|\n\s*-\s|$)/g)) {
      const paths = match[1];
      if (/runner[._]temp|\.jks|keystore|\.properties|secrets\.|(^|\s)\.\/?\s*$|\*\*\/\*\s*$/im.test(paths)) fail("KEYSTORE_BASE64_EXPOSED", name, `artifact inclui caminho sensível: ${paths.trim().split("\n")[0]}`);
    }
    if (/KEYSTORE_BASE64/.test(text)) {
      const decode = String(text).match(/base64\s+(--decode|-d)\s*>\s*"?([^"\s]+)/)?.[2] ?? "";
      if (!/^\$(RUNNER_TEMP|ks)\b/.test(decode) || !/ks="\$RUNNER_TEMP\//.test(text)) fail("KEYSTORE_BASE64_EXPOSED", name, "keystore decodificado fora de $RUNNER_TEMP");
      if (!/if:\s*always\(\)\s*\n\s*run:\s*rm -f "\$RUNNER_TEMP\/[^"]+\.jks"/.test(text)) fail("KEYSTORE_BASE64_EXPOSED", name, "keystore temporário precisa ser removido com if: always()");
      if (!/umask 077/.test(text)) fail("KEYSTORE_BASE64_EXPOSED", name, "keystore temporário com umask 077");
    }
  }

  // Scripts nunca imprimem credenciais.
  const play = s.playUpload ?? "";
  if (/console\.\w+\([^)]*\b(account|private_key|token|assertion|raw)\b[^)]*\)/.test(play)) {
    fail("SERVICE_ACCOUNT_LOGGED", "scripts/play-upload.mjs", "credencial/token do Play nunca vai para log");
  }
  if (!/BLOCKED_PLAY_CREDENTIALS/.test(play) || !/EXIT_BLOCKED_PLAY = 5/.test(play)) fail("PLAY_CONTRACT", "scripts/play-upload.mjs", "sem credencial = BLOCKED_PLAY_CREDENTIALS");
  if (!/GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/.test(play)) fail("PLAY_CONTRACT", "scripts/play-upload.mjs", "credencial única GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");

  // Reusa o contrato de assinatura do RC2.2.10 (debug key, senha literal, keystore ignorado).
  for (const item of validateAndroidSigningContract(s.foundation)) {
    failures.push(item.code === "RELEASE_USES_DEBUG_KEY" ? item : { ...item, code: item.code === "SECRET_FILE_TRACKED" ? "KEYSTORE_TRACKED" : item.code });
  }
  return failures;
}
