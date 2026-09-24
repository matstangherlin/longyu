#!/usr/bin/env node
/** test:android-release-safety — keystore, base64, senhas e service account nunca no Git, em log ou em artifact. */
import { validateAndroidReleaseSafety } from "./lib/delivery-pipeline-gates.mjs";
import { runDeliveryMutations, swap } from "./lib/delivery-mutation-runner.mjs";

const R = (s, from, to) => { s.workflows["android-release.yml"] = swap(s.workflows["android-release.yml"], from, to); };

runDeliveryMutations("test:android-release-safety", validateAndroidReleaseSafety, [
  ["#6 keystore rastreado", (s) => { s.trackedFiles.push("android/app/longyu-upload.jks"); }, "KEYSTORE_TRACKED"],
  ["keystore.properties rastreado", (s) => { s.trackedFiles.push("android/keystore.properties"); }, "KEYSTORE_TRACKED"],
  ["#7 keystore temporário vai para o artifact", (s) => R(s, "            release-artifacts/*.aab\n", "            release-artifacts/*.aab\n            ${{ runner.temp }}/longyu-upload.jks\n"), "KEYSTORE_BASE64_EXPOSED"],
  ["#7 keystore decodificado dentro do workspace", (s) => R(s, 'ks="$RUNNER_TEMP/longyu-upload.jks"', 'ks="release-artifacts/longyu-upload.jks"'), "KEYSTORE_BASE64_EXPOSED"],
  ["base64 do keystore impresso no log", (s) => R(s, "          umask 077\n", '          umask 077\n          echo "$KS_B64"\n'), "KEYSTORE_BASE64_EXPOSED"],
  ["keystore temporário não é apagado", (s) => R(s, '        if: always()\n        run: rm -f "$RUNNER_TEMP/longyu-upload.jks"', '        run: echo "mantém"'), "KEYSTORE_BASE64_EXPOSED"],
  ["#8 store password logada", (s) => R(s, '          [ -n "$KS_PASS" ] ||', '          echo "store=$KS_PASS"\n          [ -n "$KS_PASS" ] ||'), "PASSWORD_LOGGED"],
  ["set -x no passo de assinatura", (s) => R(s, "        run: node scripts/android-cli.mjs bundle:release", "        run: |\n          set -x\n          node scripts/android-cli.mjs bundle:release"), "PASSWORD_LOGGED"],
  ["#9 key password logada", (s) => R(s, '          [ -n "$KEY_PASS" ] ||', '          printf "%s" "${{ secrets.LONGYU_ANDROID_KEY_PASSWORD }}"\n          [ -n "$KEY_PASS" ] ||'), "KEY_PASSWORD_LOGGED"],
  ["#10 service account JSON commitado (nome)", (s) => { s.trackedFiles.push("ops/google-play-service-account.json"); }, "SERVICE_ACCOUNT_COMMITTED"],
  ["#10 service account JSON commitado (conteúdo)", (s) => { s.secretContentHits.push("docs/release/play.json"); }, "SERVICE_ACCOUNT_COMMITTED"],
  ["service account impressa no log", (s) => R(s, "          play=blocked\n", '          play=blocked\n          echo "$PLAY_JSON"\n'), "SERVICE_ACCOUNT_LOGGED"],
  ["play-upload loga o token", (s) => { s.playUpload = swap(s.playUpload, "  const token = await accessToken(account);\n", "  const token = await accessToken(account);\n  console.log(token);\n"); }, "SERVICE_ACCOUNT_LOGGED"],
  ["#11 release usa debug keystore (Gradle)", (s) => { s.foundation.signingGradle = swap(s.foundation.signingGradle, "signingConfig longyuReleaseSigningReady ? signingConfigs.longyuRelease : null", "signingConfig longyuReleaseSigningReady ? signingConfigs.longyuRelease : signingConfigs.debug"); }, "RELEASE_USES_DEBUG_KEY"],
  ["#11 release usa debug keystore (workflow)", (s) => R(s, 'ks="$RUNNER_TEMP/longyu-upload.jks"', 'ks="$HOME/.android/debug.keystore"'), "RELEASE_USES_DEBUG_KEY"],
  [".gitignore sem padrão de service account", (s) => { s.rootGitignore = s.rootGitignore.replace("*service-account*.json\n", ""); }, "SECRET_NOT_IGNORED"],
  ["Play sem contrato BLOCKED_PLAY_CREDENTIALS", (s) => { s.playUpload = s.playUpload.replace(/BLOCKED_PLAY_CREDENTIALS/g, "SKIPPED"); }, "PLAY_CONTRACT"],
]);
