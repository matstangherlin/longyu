#!/usr/bin/env node
/** test:android-native-foundation — mutações de identidade, SDK, versão, honestidade formal e freeze. */
import { loadAndroidFoundationState, validateAndroidNativeFoundation } from "./lib/android-foundation-gates.mjs";
import { runMutations, swap } from "./lib/android-mutation-runner.mjs";

const base = loadAndroidFoundationState();
const check = (s) => s.operationalChecks.checks;

runMutations("test:android-native-foundation", base, validateAndroidNativeFoundation, [
  ["#1 appId removido", (s) => { s.capacitorConfig = swap(s.capacitorConfig, 'appId: "com.longyu.app",', ""); }, "APP_ID_MISSING"],
  ["appId divergente", (s) => { s.capacitorConfig = swap(s.capacitorConfig, 'appId: "com.longyu.app"', 'appId: "br.com.longyu"'); }, "APP_ID_DIVERGENT"],
  ["applicationId Gradle divergente", (s) => { s.appBuildGradle = swap(s.appBuildGradle, 'applicationId "com.longyu.app"', 'applicationId "com.longyu.beta"'); }, "APP_ID_DIVERGENT"],
  ["#2 appName diferente de Longyu", (s) => { s.capacitorConfig = swap(s.capacitorConfig, 'appName: "Longyu"', 'appName: "Longyu Android"'); }, "APP_NAME"],
  ["#3 webDir diferente de dist", (s) => { s.capacitorConfig = swap(s.capacitorConfig, 'webDir: "dist"', 'webDir: "build"'); }, "WEB_DIR"],
  ["#4 targetSdk < 36", (s) => { s.variablesGradle = swap(s.variablesGradle, "targetSdkVersion = 36", "targetSdkVersion = 35"); }, "TARGET_SDK"],
  ["#5 compileSdk incompatível", (s) => { s.variablesGradle = swap(s.variablesGradle, "compileSdkVersion = 36", "compileSdkVersion = 34"); }, "COMPILE_SDK"],
  ["minSdk abaixo do Capacitor", (s) => { s.variablesGradle = swap(s.variablesGradle, "minSdkVersion = 24", "minSdkVersion = 21"); }, "MIN_SDK"],
  ["gradlew.bat ausente (Windows)", (s) => { s.gradlewWindows = false; }, "GRADLE_WRAPPER"],
  ["#20 WebView aponta para a produção", (s) => { s.capacitorConfig = swap(s.capacitorConfig, 'webDir: "dist",', 'webDir: "dist",\n  server: { url: "https://singular-meringue-7838cd.netlify.app" },'); }, "REMOTE_WEBVIEW"],
  ["versionName literal no Gradle", (s) => { s.appBuildGradle = swap(s.appBuildGradle, "versionName longyuVersionName", 'versionName "1.0"'); }, "VERSION_DIVERGENCE"],
  ["versionCode literal no Gradle", (s) => { s.appBuildGradle = swap(s.appBuildGradle, "versionCode longyuVersionCode", "versionCode 7"); }, "VERSION_DIVERGENCE"],
  ["package.json ≠ manifesto", (s) => { s.packageJson.version = "0.3.0-beta.1"; }, "VERSION_DIVERGENCE"],
  ["versionCode ≠ manifesto", (s) => { s.versionProperties = swap(s.versionProperties, "versionCode=1", "versionCode=2"); }, "VERSION_DIVERGENCE"],
  ["#15 cloud_auth marcado PASS", (s) => { check(s).cloud_auth.pass = true; }, "CLOUD_CHECK_PROMOTED"],
  ["cloud_sync marcado PASS", (s) => { check(s).cloud_sync.pass = true; }, "CLOUD_CHECK_PROMOTED"],
  ["feedback_backend marcado PASS", (s) => { check(s).feedback_backend.pass = true; }, "CLOUD_CHECK_PROMOTED"],
  ["#16 android_real_device PASS sem evidência", (s) => { check(s).android_real_device.pass = true; }, "ANDROID_DEVICE_PASS_WITHOUT_EVIDENCE"],
  ["android_real_device PASS só com data (emulador)", (s) => { Object.assign(check(s).android_real_device, { pass: true, testedAt: "2026-09-24", environment: "emulator" }); }, "ANDROID_DEVICE_PASS_WITHOUT_EVIDENCE"],
  ["manifesto declara dispositivo físico", (s) => { s.releaseManifest.physicalDevicePass = true; }, "ANDROID_DEVICE_PASS_WITHOUT_EVIDENCE"],
  ["manifesto declara release assinado", (s) => { s.releaseManifest.releaseSigningEvidence = true; }, "UNPROVEN_CLAIM"],
  ["manifesto declara Play Console", (s) => { s.releaseManifest.playConsoleConfigured = true; }, "UNPROVEN_CLAIM"],
  ["Public Beta GO", (s) => { s.releaseManifest.publicBetaVerdict = "GO"; }, "PUBLIC_BETA_VERDICT"],
  ["#22 fingerprint pedagógico muda (freeze)", (s) => { s.curriculumFreezeSource = swap(s.curriculumFreezeSource, 'RC_BASE_FINGERPRINT = "c48b008c9c1e"', 'RC_BASE_FINGERPRINT = "d00000000000"'); }, "FINGERPRINT_DRIFT"],
  ["fingerprint do manifesto muda", (s) => { s.releaseManifest.fingerprint = "d00000000000"; }, "FINGERPRINT_DRIFT"],
  ["#23 BETA_PEDAGOGY_FREEZE removido", (s) => { s.curriculumFreezeSource = swap(s.curriculumFreezeSource, "export const BETA_PEDAGOGY_FREEZE", "const LEGACY_PEDAGOGY_FREEZE"); }, "BETA_PEDAGOGY_FREEZE_REMOVED"],
  ["#24 curriculum source modificado", (s) => { s.curriculumSources["src/data/journey.ts"] += "\n// ajuste mobile\n"; }, "CURRICULUM_SOURCE_MODIFIED"],
  ["curriculum source de closure modificado", (s) => { s.curriculumSources["src/data/capabilityClosureSteps.ts"] += "\n"; }, "CURRICULUM_SOURCE_MODIFIED"],
]);
