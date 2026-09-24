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
 * Só NOMES de variáveis são impressos; valores de senha nunca.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { missingSigningValues } from "./lib/android-signing.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "android");
const isWindows = process.platform === "win32";

export const EXIT_BLOCKED_SDK = 3;
export const EXIT_BLOCKED_SIGNING = 4;

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
    const sdkDir = match?.[1]?.trim().replace(/\\\\/g, "\\").replace(/\\:/g, ":");
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
    sync();
    gradle("assembleDebug");
    console.log("android: APK debug em android/app/build/outputs/apk/debug/");
  },
  "bundle:debug": () => {
    requireSdk();
    sync();
    gradle("bundleDebug");
    console.log("android: AAB debug em android/app/build/outputs/bundle/debug/");
  },
  "bundle:release": () => {
    // Assinatura primeiro: sem segredos não vale nem gastar o build.
    requireSigning();
    requireSdk();
    sync();
    gradle("bundleRelease");
    console.log("android: AAB release assinado em android/app/build/outputs/bundle/release/");
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
