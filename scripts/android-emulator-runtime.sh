#!/usr/bin/env bash
# RC2.2.31D — runtime do APK no emulador (job android-runtime-emulator).
# O android-emulator-runner executa cada linha de `script:` num `sh -c` separado
# (dash, sem pipefail, sem heredoc nem `cd` que sobreviva à linha seguinte):
# por isso o roteiro inteiro mora aqui e o workflow chama `bash` uma vez só.
set -euo pipefail

cd android
chmod +x ./gradlew
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest --stacktrace
adb install -r app/build/outputs/apk/debug/app-debug.apk
./gradlew :app:connectedDebugAndroidTest --stacktrace
mkdir -p ../runtime-evidence
adb logcat -d -s LongyuMedia:I LongyuGesture:I LongyuConversation:I > ../runtime-evidence/logcat-sanitized.txt || true
if [ -d app/build/outputs/androidTest-results ]; then
  cp -R app/build/outputs/androidTest-results ../runtime-evidence/ || true
fi
if [ -d app/build/reports/androidTests ]; then
  cp -R app/build/reports/androidTests ../runtime-evidence/ || true
fi
printf '%s\n' "{\"sourceHead\":\"${SOURCE_HEAD:-}\",\"workflowSha\":\"${WORKFLOW_SHA:-}\",\"lane\":\"ANDROID_EMULATOR_RUNTIME\"}" > ../runtime-evidence/build-identity.json
