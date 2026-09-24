/**
 * RC2.2.10 — wrapper cross-platform dos scripts Android (Windows + Unix).
 *
 *   npm run android:sync           build web + cap sync android
 *   npm run android:open           sync + abre o projeto no Android Studio
 *   npm run android:run            sync + cap run android (SDK + device/emulador)
 *   npm run android:debug          sync + gradle assembleDebug        (APK debug)
 *   npm run android:bundle:debug   sync + gradle bundleDebug          (AAB debug)
 *   npm run android:bundle:release sync + gradle bundleRelease        (AAB assinado)
 *
 * Saídas honestas (nunca PASS fingido):
 *   exit 3 BLOCKED_LOCAL_ANDROID_SDK  — sem Android SDK (ANDROID_HOME/ANDROID_SDK_ROOT/local.properties)
 *   exit 4 BLOCKED_SIGNING_SECRETS    — release sem os quatro valores de assinatura
 *   exit 6 DIRTY_TREE / STALE_BUILD   — release oficial com árvore suja ou SHA divergente
 * Só NOMES de variáveis são impressos; valores de senha nunca.
 *
 * RC2.2.10B — todo build Android passa a sair com identidade canônica
 * (scripts/lib/release-identity.mjs): versionCode = floor + commits
 * first-parent de main, artefato com nome identificável e .provenance.json
 * (SHA, versão, plataforma, buildType, workflow run) em release-artifacts/.
 * Release oficial recusa árvore suja (só `--allow-dirty` aceita, e marca
 * official=false) e compara HEAD ↔ bundle web ↔ LONGYU_RELEASE_SHA.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { missingSigningValues } from "./lib/android-signing.mjs";
import {
  artifactBaseName,
  assertBuildMatchesRelease,
  assertCleanTreeForRelease,
  buildIdentity,
  buildProvenance,
  computeVersionCode,
  readGitState,
  readVersionFloor,
} from "./lib/release-identity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "android");
const isWindows = process.platform === "win32";

export const EXIT_BLOCKED_SDK = 3;
export const EXIT_BLOCKED_SIGNING = 4;
export const EXIT_RELEASE_GUARD = 6;
const args = process.argv.slice(3);
const artifactsDir = path.join(root, "release-artifacts");

function run(command, args, options = {}) {
  // Node ≥ 18.20 exige shell para .bat/.cmd no Windows (CVE-2024-27980).
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    stdio: "inherit",
    env: process.env,
    shell: isWindows,
  });
  if (result.error) {
    console.error(`android-cli: falha ao executar ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

const npmCommand = isWindows ? "npm.cmd" : "npm";
const npxCommand = isWindows ? "npx.cmd" : "npx";

export function gradleWrapper(platform = process.platform) {
  return platform === "win32" ? "gradlew.bat" : "./gradlew";
}

export function androidSdkLocation(env = process.env, dir = androidDir) {
  for (const key of ["ANDROID_HOME", "ANDROID_SDK_ROOT"]) {
    const value = env[key]?.trim();
    if (value && fs.existsSync(value)) return value;
  }
  const localProps = path.join(dir, "local.properties");
  if (fs.existsSync(localProps)) {
    const match = fs.readFileSync(localProps, "utf8").match(/^sdk\.dir\s*=\s*(.+)$/m);
    // Escape de .properties numa passada só (C\:\\Users → C:\Users); duas passadas desescapam em dobro.
    const sdkDir = match?.[1]?.trim().replace(/\\(.)/g, "$1");
    if (sdkDir && fs.existsSync(sdkDir)) return sdkDir;
  }
  return null;
}

function requireSdk() {
  if (androidSdkLocation()) return;
  console.error(
    "BLOCKED_LOCAL_ANDROID_SDK: Android SDK não encontrado. Defina ANDROID_HOME (ou ANDROID_SDK_ROOT) " +
      "ou abra o projeto uma vez no Android Studio (gera android/local.properties, gitignored)."
  );
  process.exit(EXIT_BLOCKED_SDK);
}

function requireSigning() {
  const missing = missingSigningValues({ env: process.env, androidDir });
  if (missing.length === 0) return;
  console.error(
    `BLOCKED_SIGNING_SECRETS: faltando ${missing.join(", ")}. ` +
      "Preencha via variáveis de ambiente ou android/keystore.properties (gitignored). Guia: docs/ANDROID_SIGNING.md"
  );
  process.exit(EXIT_BLOCKED_SIGNING);
}

function sync() {
  run(npmCommand, ["run", "build"]);
  run(npxCommand, ["cap", "sync", "android"]);
}

function gradle(task) {
  run(gradleWrapper(), [task], { cwd: androidDir });
}

function releaseGuardFail(error) {
  console.error(String(error?.message ?? error));
  process.exit(EXIT_RELEASE_GUARD);
}

/** versionCode oficial exportado para o Gradle (android/app/build.gradle lê LONGYU_ANDROID_VERSION_CODE). */
function exportVersionCode(git) {
  const versionCode = computeVersionCode({ floor: readVersionFloor(root), firstParentCount: git.firstParentCount });
  process.env.LONGYU_ANDROID_VERSION_CODE = String(versionCode);
  return versionCode;
}

/** Release oficial: árvore limpa, salvo `--allow-dirty` explícito. */
function requireCleanTree(git) {
  try {
    return assertCleanTreeForRelease({ dirty: git.dirty, allowDirty: args.includes("--allow-dirty") });
  } catch (error) {
    return releaseGuardFail(error);
  }
}

/** Stale build: HEAD ↔ bundle web embutido ↔ SHA esperado da release. */
function requireBuildMatchesRelease(git) {
  const versionJson = path.join(root, "dist", "version.json");
  const bundleSha = fs.existsSync(versionJson) ? JSON.parse(fs.readFileSync(versionJson, "utf8")).commitSha : "";
  try {
    assertBuildMatchesRelease({ headSha: git.sha, bundleSha, expectedSha: process.env.LONGYU_RELEASE_SHA?.trim() || "" });
  } catch (error) {
    releaseGuardFail(error);
  }
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** Copia APK/AAB para release-artifacts/ com nome identificável + proveniência (sem segredo nenhum). */
function collectArtifacts(git, buildType, outputs, extra = {}) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const identity = buildIdentity({
    sha: git.sha,
    branch: git.branch,
    version: pkg.version,
    versionName: pkg.version,
    versionCode: Number(process.env.LONGYU_ANDROID_VERSION_CODE),
    platform: "android",
    buildType,
    environment: process.env.VITE_APP_ENV || "production_beta",
    workflowRun: process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
    builtAt: new Date().toISOString(),
  });
  fs.mkdirSync(artifactsDir, { recursive: true });
  const base = artifactBaseName(identity);
  const files = [];
  for (const [ext, rel] of outputs) {
    const source = path.join(androidDir, rel);
    if (!fs.existsSync(source)) continue;
    const name = `${base}.${ext}`;
    const target = path.join(artifactsDir, name);
    fs.copyFileSync(source, target);
    files.push({ name, sha256: sha256(target), bytes: fs.statSync(target).size });
  }
  if (files.length === 0) releaseGuardFail(new Error(`android-cli: nenhum artefato ${buildType} encontrado`));
  const provenance = { ...buildProvenance(identity, files), dirtyTree: git.dirty, ...extra };
  fs.writeFileSync(path.join(artifactsDir, `${base}.provenance.json`), `${JSON.stringify(provenance, null, 2)}\n`);
  console.log(`android: ${files.map((file) => file.name).join(" + ")} (+ ${base}.provenance.json) em release-artifacts/ · versionCode ${identity.versionCode} · ${identity.shortSha}`);
  return provenance;
}

const DEBUG_OUTPUTS = [
  ["apk", "app/build/outputs/apk/debug/app-debug.apk"],
  ["aab", "app/build/outputs/bundle/debug/app-debug.aab"],
];

const COMMANDS = {
  sync,
  // Clone novo não tem os arquivos gerados pelo sync (assets, plugins Cordova).
  open: () => {
    sync();
    run(npxCommand, ["cap", "open", "android"]);
  },
  run: () => {
    requireSdk();
    sync();
    run(npxCommand, ["cap", "run", "android"]);
  },
  debug: () => {
    requireSdk();
    const git = readGitState(root);
    exportVersionCode(git);
    sync();
    gradle("assembleDebug");
    collectArtifacts(git, "debug", DEBUG_OUTPUTS);
  },
  "bundle:debug": () => {
    requireSdk();
    const git = readGitState(root);
    exportVersionCode(git);
    sync();
    gradle("bundleDebug");
    collectArtifacts(git, "debug", DEBUG_OUTPUTS);
  },
  "bundle:release": () => {
    // Assinatura primeiro: sem segredos não vale nem gastar o build.
    requireSigning();
    const git = readGitState(root);
    const guard = requireCleanTree(git);
    requireSdk();
    exportVersionCode(git);
    sync();
    requireBuildMatchesRelease(git);
    gradle("bundleRelease");
    const provenance = collectArtifacts(git, "release", [["aab", "app/build/outputs/bundle/release/app-release.aab"]], guard);
    // RC2.2.12 · Y — AAB assinado sem evidência de assinatura não existe:
    // verifica (nunca debug key) e grava o SHA-256 público ao lado do AAB.
    for (const file of provenance.files ?? provenance.artifacts ?? []) {
      const aab = path.join(artifactsDir, file.name);
      run(process.execPath, [
        path.join(root, "scripts", "android-verify-signature.mjs"),
        aab,
        "--out",
        aab.replace(/\.aab$/, ".signature.json"),
      ]);
    }
  },
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const command = process.argv[2];
  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`android-cli: comando desconhecido "${command ?? ""}". Use: ${Object.keys(COMMANDS).join(" | ")}`);
    process.exit(2);
  }
  handler();
}
