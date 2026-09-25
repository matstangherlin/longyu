#!/usr/bin/env node
/**
 * RC2.2.12 · D/F — dispositivos Android conectados (adb) e instalação do APK debug.
 *
 *   npm run android:devices            → adb devices -l, classificado
 *   npm run android:install:debug      → adb install -r do APK debug mais novo
 *                                        de release-artifacts/, SÓ em aparelho físico
 *   npm run android:play-install:verify → RC2.2.16 · AU/AV: lê do aparelho físico o
 *                                        package, versionName/versionCode, o INSTALADOR
 *                                        (Google Play = com.android.vending) e o SHA-256
 *                                        do certificado que assinou o APK entregue pela Play.
 *                                        Grava evidência sem serial (--out <arquivo>).
 *
 * Classificação (a única que os relatórios aceitam):
 *   NO_ADB         adb não encontrado (sem Android SDK platform-tools)
 *   NO_DEVICE      nenhum dispositivo
 *   UNAUTHORIZED   aparelho físico conectado, mas sem autorizar a depuração USB
 *   EMULATOR_ONLY  só emulador(es) — NÃO conta como QA físico
 *   DEVICE_READY   pelo menos um aparelho FÍSICO autorizado
 *
 * O serial é mascarado na saída (evidência pode ir para o Git; serial não).
 * Nada aqui marca `android_real_device` — isso é humano (docs/ANDROID_PHYSICAL_QA.md).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const DEVICE_STATES = ["NO_ADB", "NO_DEVICE", "UNAUTHORIZED", "EMULATOR_ONLY", "DEVICE_READY"];
// Espelho de scripts/lib/android-package-identity.mjs (este arquivo é carregado
// isolado pelos gates, sem import relativo); validate:android-release-identity compara.
export const PACKAGE_ID = "longyu.noba.com";
export const PLAY_STORE_INSTALLER = "com.android.vending";

/** Emulador: serial `emulator-NNNN`, ou modelo/produto de imagem de SDK. */
export function isEmulator(device) {
  return (
    /^emulator-\d+$/.test(device.serial) ||
    /^(sdk_|gphone|generic)/i.test(device.product ?? "") ||
    /^(sdk_gphone|Android_SDK_built_for|google_sdk)/i.test(device.model ?? "") ||
    /^(generic|emu|emulator|vbox|ranchu|goldfish)/i.test(device.device ?? "")
  );
}

export function maskSerial(serial) {
  const value = String(serial ?? "");
  if (/^emulator-\d+$/.test(value)) return value;
  return value.length <= 4 ? "****" : `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}

/** Faz o parse de `adb devices -l`. */
export function parseAdbDevices(output) {
  const devices = [];
  for (const raw of String(output ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("List of devices") || line.startsWith("*")) continue;
    const [serial, state, ...rest] = line.split(/\s+/);
    if (!serial || !state) continue;
    const props = {};
    for (const token of rest) {
      const eq = token.indexOf(":");
      if (eq > 0) props[token.slice(0, eq)] = token.slice(eq + 1);
    }
    devices.push({ serial, state, model: props.model, product: props.product, device: props.device, transportId: props.transport_id });
  }
  return devices;
}

export function classifyDevices(devices, { adbAvailable = true } = {}) {
  if (!adbAvailable) return { status: "NO_ADB", physical: [], emulators: [], unauthorized: [] };
  const emulators = devices.filter(isEmulator);
  const physicalAll = devices.filter((device) => !isEmulator(device));
  const physical = physicalAll.filter((device) => device.state === "device");
  const unauthorized = physicalAll.filter((device) => device.state === "unauthorized" || device.state === "no permissions");
  let status = "NO_DEVICE";
  if (physical.length) status = "DEVICE_READY";
  else if (unauthorized.length) status = "UNAUTHORIZED";
  else if (emulators.length) status = "EMULATOR_ONLY";
  return { status, physical, emulators, unauthorized };
}

/** `dumpsys package` → versionName/versionCode instalados. */
export function parseInstalledVersion(dumpsys) {
  const text = String(dumpsys ?? "");
  const versionName = text.match(/versionName=([^\s]+)/)?.[1] ?? null;
  const versionCode = Number(text.match(/versionCode=(\d+)/)?.[1] ?? NaN);
  return { installed: Boolean(versionName), versionName, versionCode: Number.isFinite(versionCode) ? versionCode : null };
}

/** Instalador: `pm get-install-source` (Android 11+) ou `dumpsys package` (installerPackageName=). */
export function parseInstaller(text) {
  const value = String(text ?? "");
  return (
    value.match(/InstallingPackageName:\s*(\S+)/i)?.[1] ??
    value.match(/installerPackageName=(\S+)/)?.[1] ??
    value.match(/InstallerPackageName:\s*(\S+)/i)?.[1] ??
    null
  );
}

/** `apksigner verify --print-certs` → SHA-256 dos certificados (formato AA:BB:…). */
export function parseApksignerCerts(output) {
  return [...String(output ?? "").matchAll(/certificate SHA-256 digest:\s*([0-9a-f]{64})/gi)].map((match) =>
    match[1].toUpperCase().match(/.{2}/g).join(":")
  );
}

/** `pm list packages longyu` → outros packages Longyu (builds antigas de desenvolvimento). */
export function otherLongyuPackages(listOutput, packageId = PACKAGE_ID) {
  return String(listOutput ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^package:/, ""))
    .filter((name) => name && name !== packageId && /longyu/i.test(name));
}

/**
 * Veredito de instalação pela Play (puro). PASS só com o package certo,
 * instalado pela Play Store, com certificado lido do aparelho e diferente da
 * upload key (a Play entrega o app assinado com a app signing key do Google).
 */
export function playInstallVerdict({ packageId, installer, installedCertSha256, uploadCertSha256 }) {
  if (packageId !== PACKAGE_ID) return { ok: false, code: "WRONG_PACKAGE" };
  if (installer !== PLAY_STORE_INSTALLER) return { ok: false, code: "NOT_INSTALLED_FROM_PLAY" };
  if (!/^[0-9A-F]{2}(?::[0-9A-F]{2}){31}$/.test(String(installedCertSha256 ?? ""))) return { ok: false, code: "INSTALLED_CERT_UNKNOWN" };
  if (uploadCertSha256 && installedCertSha256 === uploadCertSha256) return { ok: false, code: "SIGNED_WITH_UPLOAD_KEY_NOT_PLAY" };
  return { ok: true, code: "INSTALLED_FROM_PLAY" };
}

function apksignerPath() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk) return null;
  const dir = path.join(sdk, "build-tools");
  if (!fs.existsSync(dir)) return null;
  const versions = fs.readdirSync(dir).sort().reverse();
  for (const version of versions) {
    const file = path.join(dir, version, process.platform === "win32" ? "apksigner.bat" : "apksigner");
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

function verifyPlayInstall() {
  const result = listDevices();
  printDevices(result);
  if (result.status !== "DEVICE_READY") {
    console.error(`android:play-install:verify recusado: ${result.status} (só aparelho físico autorizado).`);
    process.exit(7);
  }
  const serialArgs = process.env.ANDROID_SERIAL ? ["-s", process.env.ANDROID_SERIAL] : [];
  const others = otherLongyuPackages(adb([...serialArgs, "shell", "pm", "list", "packages", "longyu"]).stdout);
  if (others.length) console.warn(`aviso: outro(s) package(s) Longyu instalado(s): ${others.join(", ")} — é outro app; desinstale (docs/ANDROID_PHYSICAL_QA.md).`);
  const dumpsys = adb([...serialArgs, "shell", "dumpsys", "package", PACKAGE_ID]).stdout;
  const version = parseInstalledVersion(dumpsys);
  if (!version.installed) {
    console.error(`${PACKAGE_ID} não está instalado neste aparelho.`);
    process.exit(7);
  }
  const installer = parseInstaller(adb([...serialArgs, "shell", "pm", "get-install-source", PACKAGE_ID]).stdout) ?? parseInstaller(dumpsys);
  let installedCertSha256 = null;
  const apkPath = adb([...serialArgs, "shell", "pm", "path", PACKAGE_ID]).stdout.match(/package:(\S+base\.apk)/)?.[1];
  const apksigner = apksignerPath();
  if (apkPath && apksigner) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "longyu-play-"));
    const local = path.join(tmp, "base.apk");
    if (adb([...serialArgs, "pull", apkPath, local]).ok) {
      const printed = spawnSync(apksigner, ["verify", "--print-certs", local], { encoding: "utf8", shell: process.platform === "win32" });
      installedCertSha256 = parseApksignerCerts(`${printed.stdout ?? ""}\n${printed.stderr ?? ""}`)[0] ?? null;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const uploadCertSha256 = process.env.LONGYU_UPLOAD_CERT_SHA256?.trim().toUpperCase() || null;
  const verdict = playInstallVerdict({ packageId: PACKAGE_ID, installer, installedCertSha256, uploadCertSha256 });
  const evidence = {
    schema: "longyu-android-play-install/1",
    packageName: PACKAGE_ID,
    versionName: version.versionName,
    versionCode: version.versionCode,
    installer,
    installedCertSha256,
    uploadCertSha256,
    result: verdict.code,
    checkedAt: new Date().toISOString(),
  };
  const out = arg("out");
  if (out) fs.writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
  if (!apksigner) console.warn("apksigner não encontrado (ANDROID_HOME/build-tools): certificado instalado não lido.");
  process.exit(verdict.ok ? 0 : 9);
}

function adb(args) {
  const result = spawnSync("adb", args, { encoding: "utf8" });
  if (result.error) return { ok: false, missing: result.error.code === "ENOENT", stdout: "", stderr: String(result.error.message) };
  return { ok: result.status === 0, missing: false, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function listDevices() {
  const out = adb(["devices", "-l"]);
  if (out.missing) return classifyDevices([], { adbAvailable: false });
  return classifyDevices(parseAdbDevices(out.stdout));
}

function printDevices(result) {
  console.log(`android:devices → ${result.status}`);
  for (const device of result.physical) console.log(`  físico   ${maskSerial(device.serial)}  ${device.model ?? "?"}`);
  for (const device of result.unauthorized) console.log(`  sem autorização ${maskSerial(device.serial)} (aceite a depuração USB no aparelho)`);
  for (const device of result.emulators) console.log(`  emulador ${device.serial}  ${device.model ?? ""} (não conta como QA físico)`);
  if (result.status === "NO_ADB") console.log("  adb não encontrado: instale as platform-tools do Android SDK (docs/ANDROID_PHYSICAL_QA.md).");
}

function newestDebugApk(root) {
  const dir = path.join(root, "release-artifacts");
  if (!fs.existsSync(dir)) return null;
  const apks = fs
    .readdirSync(dir)
    .filter((name) => /-debug\.apk$/.test(name) || (/\.apk$/.test(name) && /debug/.test(name)))
    .map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return apks[0] ? path.join(dir, apks[0].name) : null;
}

function install(root) {
  const result = listDevices();
  printDevices(result);
  if (result.status !== "DEVICE_READY") {
    console.error(`android:install:debug recusado: ${result.status} (só aparelho físico autorizado).`);
    process.exit(7);
  }
  if (result.physical.length > 1 && !process.env.ANDROID_SERIAL) {
    console.error("Mais de um aparelho físico: defina ANDROID_SERIAL para escolher.");
    process.exit(7);
  }
  const apk = newestDebugApk(root);
  if (!apk) {
    console.error("Nenhum APK debug em release-artifacts/ (rode npm run android:debug ou baixe o artifact do CI).");
    process.exit(7);
  }
  const serialArgs = process.env.ANDROID_SERIAL ? ["-s", process.env.ANDROID_SERIAL] : [];
  const installed = adb([...serialArgs, "install", "-r", apk]);
  if (!installed.ok) {
    console.error(`adb install falhou: ${installed.stderr.trim() || installed.stdout.trim()}`);
    process.exit(1);
  }
  const version = parseInstalledVersion(adb([...serialArgs, "shell", "dumpsys", "package", PACKAGE_ID]).stdout);
  console.log(`instalado ${PACKAGE_ID} · versionName ${version.versionName} · versionCode ${version.versionCode} · ${path.basename(apk)}`);
  console.log("Registre em docs/release/android-physical-qa.json (SHA, versão, aparelho) — nada é marcado automaticamente.");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const command = process.argv[2] ?? "list";
  if (command === "list") {
    const result = listDevices();
    printDevices(result);
    // Diagnóstico, não gate: sair 0 sempre (NO_DEVICE não é falha de código).
  } else if (command === "install") {
    install(root);
  } else if (command === "play-install") {
    verifyPlayInstall();
  } else {
    console.error("uso: android-devices.mjs [list|install|play-install]");
    process.exit(2);
  }
}
