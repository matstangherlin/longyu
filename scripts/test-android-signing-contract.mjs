#!/usr/bin/env node
/** test:android-signing-contract — cada vazamento/atalho de assinatura precisa ser recusado. */
import { loadAndroidFoundationState, validateAndroidSigningContract } from "./lib/android-foundation-gates.mjs";
import { runMutations, swap } from "./lib/android-mutation-runner.mjs";

const base = loadAndroidFoundationState();
const SIGNING = "android/app/longyu-signing.gradle";

runMutations("test:android-signing-contract", base, validateAndroidSigningContract, [
  ["#6 .jks deixa de ser ignorado", (s) => { s.rootGitignore = swap(s.rootGitignore, "\n*.jks\n", "\n"); }, "JKS_NOT_IGNORED"],
  [".jks reincluído por negação", (s) => { s.rootGitignore += "\n!*.jks\n"; }, "JKS_NOT_IGNORED"],
  ["#7 .keystore deixa de ser ignorado", (s) => { s.rootGitignore = swap(s.rootGitignore, "\n*.keystore\n", "\n"); }, "KEYSTORE_NOT_IGNORED"],
  ["#8 keystore.properties commitável", (s) => { s.rootGitignore = swap(s.rootGitignore, "\nandroid/keystore.properties\n", "\n"); }, "KEYSTORE_PROPERTIES_COMMITTABLE"],
  ["keystore.properties reincluído", (s) => { s.rootGitignore += "\n!android/keystore.properties\n"; }, "KEYSTORE_PROPERTIES_COMMITTABLE"],
  ["local.properties commitável", (s) => { s.rootGitignore = swap(s.rootGitignore, "\nandroid/local.properties\n", "\n"); }, "LOCAL_PROPERTIES_COMMITTABLE"],
  [".jks rastreado", (s) => { s.trackedFiles.push("android/app/longyu-upload.jks"); }, "SECRET_FILE_TRACKED"],
  ["keystore.properties rastreado", (s) => { s.trackedFiles.push("android/keystore.properties"); }, "SECRET_FILE_TRACKED"],
  ["local.properties rastreado", (s) => { s.trackedFiles.push("android/local.properties"); }, "SECRET_FILE_TRACKED"],
  ["#9 senha literal no Gradle", (s) => { s.scannedTexts[SIGNING] += '\nandroid { signingConfigs { hard { storePassword "hunter22" } } }\n'; }, "PASSWORD_LITERAL"],
  ["senha literal no capacitor.config", (s) => { s.scannedTexts["capacitor.config.ts"] += '\nconst password = "hunter22";\n'; }, "PASSWORD_LITERAL"],
  ["senha real no exemplo", (s) => { s.keystoreExample = swap(s.keystoreExample, "storePassword=CHANGE_ME", "storePassword=hunter22"); s.scannedTexts["android/keystore.properties.example"] = s.keystoreExample; }, "PASSWORD_LITERAL"],
  ["workflow com valor literal", (s) => { s.scannedTexts[".github/workflows/android.yml"] = "env:\n  LONGYU_ANDROID_KEY_PASSWORD: hunter22\n"; }, "PASSWORD_LITERAL"],
  ["#10 key alias ausente do contrato", (s) => { s.signingGradle = swap(s.signingGradle, "[env: 'LONGYU_ANDROID_KEY_ALIAS', prop: 'keyAlias'],", ""); }, "SIGNING_KEY_ALIAS_MISSING"],
  ["#11 key password ausente", (s) => { s.signingGradle = swap(s.signingGradle, "keyPassword longyuSigning.LONGYU_ANDROID_KEY_PASSWORD", ""); }, "SIGNING_KEY_PASSWORD_MISSING"],
  ["#12 store password ausente", (s) => { s.signingGradle = swap(s.signingGradle, "[env: 'LONGYU_ANDROID_KEYSTORE_PASSWORD', prop: 'storePassword'],", ""); }, "SIGNING_STORE_PASSWORD_MISSING"],
  ["#13 store path ausente", (s) => { s.signingGradle = swap(s.signingGradle, "[env: 'LONGYU_ANDROID_KEYSTORE_PATH', prop: 'storeFile'],", ""); }, "SIGNING_STORE_PATH_MISSING"],
  ["alias ausente do contrato Node", (s) => { s.signingLib = swap(s.signingLib, '"LONGYU_ANDROID_KEY_ALIAS"', '"LONGYU_ANDROID_ALIAS"'); }, "SIGNING_KEY_ALIAS_MISSING"],
  ["#14 release usa debug key", (s) => { s.signingGradle = swap(s.signingGradle, "signingConfig longyuReleaseSigningReady ? signingConfigs.longyuRelease : null", "signingConfig longyuReleaseSigningReady ? signingConfigs.longyuRelease : signingConfigs.debug"); }, "RELEASE_USES_DEBUG_KEY"],
  ["release usa debug key no build.gradle", (s) => { s.appBuildGradle = swap(s.appBuildGradle, "minifyEnabled false", "signingConfig signingConfigs.debug\n            minifyEnabled false"); }, "RELEASE_USES_DEBUG_KEY"],
  ["release sem trava BLOCKED_SIGNING_SECRETS", (s) => { s.signingGradle = swap(s.signingGradle, "throw new GradleException", "logger.warn"); }, "RELEASE_NOT_BLOCKED"],
  ["android:bundle:release sem pré-checagem", (s) => { s.androidCli = swap(s.androidCli, "    requireSigning();\n", ""); }, "RELEASE_NOT_BLOCKED"],
  ["senha impressa no log", (s) => { s.signingGradle += "\nprintln(\"debug: ${longyuSigning.LONGYU_ANDROID_KEY_PASSWORD}\")\n"; }, "SECRET_PRINTED"],
  ["doc sem keytool", (s) => { s.signingDoc = s.signingDoc.replace(/keytool/gi, "ferramenta"); }, "SIGNING_DOC"],
]);
