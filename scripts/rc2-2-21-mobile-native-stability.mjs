#!/usr/bin/env node
/**
 * RC2.2.21 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-21-mobile-native-stability.mjs validate <área>
 *   node scripts/rc2-2-21-mobile-native-stability.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação é pega com o código certo.
 * Gates em scripts/lib/rc2-2-21-gates.mjs.
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-21-gates.mjs";

const [mode, area] = process.argv.slice(2);
const gate = VALIDATORS[area];
if (!gate || !["validate", "test"].includes(mode)) {
  console.error(`uso: validate|test <${Object.keys(VALIDATORS).join("|")}>`);
  process.exit(2);
}
const name = `${mode}:${area}`;
const base = await loadState();

if (mode === "validate") {
  const failures = await gate(base);
  console.log(report(name, failures));
  process.exit(failures.length ? 1 : 0);
}

function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: trecho não encontrado → ${from.slice(0, 90)}`);
  return String(text).split(from).join(to);
}
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
};
const json = (mutate) => (s) => mutate(s);

const MUTATIONS = {
  "native-voice-playback": [
    ["[1] reprodução sem USAGE_MEDIA", "PLAYBACK_WRONG_AUDIO_ATTRIBUTES", src("plugin", "                .setUsage(AudioAttributes.USAGE_MEDIA)\n                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)\n                .build();\n            practicePlayCall = call;", "                .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)\n                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)\n                .build();\n            practicePlayCall = call;")],
    ["[2] AudioAttributes depois do prepare", "PLAYBACK_WRONG_AUDIO_ATTRIBUTES", src("plugin", "                practicePlayer.setAudioAttributes(attributes);\n                practicePlayer.setDataSource(practiceFile.getAbsolutePath());", "                practicePlayer.setDataSource(practiceFile.getAbsolutePath());")],
    ["[3] sem foco de áudio", "AUDIO_FOCUS_MISSING", src("plugin", "            if (!requestPracticeFocus(attributes)) {\n                finishPracticePlay(\"AUDIO_FOCUS_FAILED\");\n                return;\n            }\n", "")],
    ["[4] foco permanente (não transitório)", "AUDIO_FOCUS_MISSING", src("plugin", "new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)", "new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)")],
    ["[5] foco nunca devolvido ao terminar", "AUDIO_FOCUS_LEAK", src("plugin", "        releasePracticePlayer();\n        abandonPracticeFocus();\n        practicePlaybackStarted = false;", "        releasePracticePlayer();\n        practicePlaybackStarted = false;")],
    ["[6] PLAYING sem isPlaying()", "PLAYING_WITHOUT_PROOF", src("plugin", "                        if (practicePlayer.isPlaying()) markPracticePlaying(route, volume);", "                        markPracticePlaying(route, volume);")],
    ["[7] player que não tocou vira PLAYED", "PLAYING_WITHOUT_PROOF", src("plugin", "finishPracticePlay(practicePlaybackStarted ? null : \"PLAYBACK_START_FAILED\")", "finishPracticePlay(null)")],
    ["[8] volume zerado some", "VOLUME_ZERO_SILENT", src("plugin", "            if (volume.getInteger(\"mediaVolumeCurrent\", 1) == 0 || volume.getBoolean(\"mediaMuted\", false)) {", "            if (false) {")],
    ["[9] código estável removido", "PLAYBACK_CODE_MISSING", src("selfPlayback", '  "OUTPUT_UNAVAILABLE",\n', "")],
    ["[10] prova aceita PLAYED sem PLAYING", "PLAYING_WITHOUT_PROOF", src("selfPlayback", "return prepared >= 0 && playing > prepared && played > playing;", "return prepared >= 0 && played > prepared;")],
    ["[11] volume zerado com mensagem genérica", "VOLUME_ZERO_SILENT", src("selfPlayback", '    case "MEDIA_VOLUME_ZERO":\n      return "player.selfPlaybackVolumeZero";\n', "")],
    ["[12] sem Ouvir novamente", "PLAYBACK_BUTTON_FLOW", src("selfCompare", 't("player.selfCompareListenAgain")', 't("player.selfCompareListenMine")')],
    ["[13] sem amplitude da captura", "CAPTURE_SIGNAL_MISSING", src("plugin", "practiceRecorder.getMaxAmplitude()", "0")],
    ["[14] duração só pelo relógio", "METADATA_DURATION_MISSING", src("plugin", "MediaMetadataRetriever.METADATA_KEY_DURATION", "0")],
    ["[15] Parar não existe no nativo", "PLAYBACK_NOT_STOPPABLE", src("plugin", "            if (practicePlayCall != null || practicePlayer != null) finishPracticePlay(\"STOPPED\");\n            call.resolve();", "            call.resolve();")],
    ["[16] gravar sem pedir o microfone", "MIC_NOT_REQUESTED", src("selfCompare", "const permission = await ensureMicPermission();", "const permission = \"granted\" as const;")],
    ["gravação enviada para fora", "RECORDING_UPLOADED", json((s) => { s.src.selfCompare += "\nvoid fetch('/api/upload');\n"; })],
    ["'Reproduzindo…' some do pt-BR", "PLAYBACK_BUTTON_FLOW", src("ptBR", 'selfComparePlayingMine: "Reproduzindo…"', 'selfComparePlayingMine: "Tocando a sua voz"')],
  ],
  "native-speech": [
    ["[17] on-device sempre (sem zh-CN)", "RECOGNIZER_WRONG_STRATEGY", src("plugin", "if (onDevice && (preferOnDevice || !service)) {", "if (onDevice) {")],
    ["[18] estratégia on-device sem modelo instalado", "RECOGNIZER_WRONG_STRATEGY", src("capability", "if (support && support.onDeviceAvailable && support.installedOnDevice) return \"ON_DEVICE\";", "if (support && support.onDeviceAvailable) return \"ON_DEVICE\";")],
    ["[19] JS não passa a estratégia", "RECOGNIZER_WRONG_STRATEGY", src("speech", "nativeRecognize(Math.min(timeoutMs, 15_000), { preferOnDevice })", "nativeRecognize(Math.min(timeoutMs, 15_000))")],
    ["[20] sem sinal RMS", "RMS_SIGNAL_MISSING", src("plugin", "            if (rmsdB > recognitionPeakRms) recognitionPeakRms = rmsdB;\n", "")],
    ["[21] CLIENT vira UNKNOWN", "SPEECH_CATEGORY_MISSING", src("speechFailure", '    case "CLIENT":\n      return "CLIENT";\n', "")],
    ["[22] repetição infinita", "SPEECH_RETRY_LOOP", src("speechFailure", "export const SPEECH_RETRY_LIMIT = 2;", "export const SPEECH_RETRY_LIMIT = Number.POSITIVE_INFINITY;")],
    ["[23] tela ignora o limite", "SPEECH_RETRY_LOOP", src("pronunciation", "} else if (shouldLeaveRecognition(failuresRef.current, category)) {", "} else if (false) {")],
    ["[24] TTS sem AudioAttributes", "TTS_AUDIO_ATTRIBUTES_MISSING", src("plugin", "                    tts.setAudioAttributes(new AudioAttributes.Builder()", "                    tts.setSpeechRate(1f); new AudioAttributes.Builder()")],
    ["[25] motor TTS não recriado após instalar voz", "TTS_NOT_RECHECKED", src("speakButton", "refreshNativeTtsStatus({ reinit: true })", "refreshNativeTtsStatus()")],
    ["ERROR_CLIENT sem código", "SPEECH_CATEGORY_MISSING", json((s) => { s.src.plugin = s.src.plugin.replace(/(ERROR_CLIENT[\s\S]{0,60})"CLIENT"/, '$1"ERROR"'); })],
    ["tela sem Continuar sem falar", "SPEECH_DEAD_END", json((s) => { s.src.pronunciation = s.src.pronunciation.split("onClick={onContinue}").join("onClick={start}"); })],
    ["sem tipo de reconhecedor no diagnóstico", "RMS_SIGNAL_MISSING", src("pronunciation", "recognizerKind: diag.recognizer ?? null,", "recognizerKind: null,")],
  ],
  "mobile-lifecycle": [
    ["[26] pausa apaga a gravação", "PAUSE_DELETES_RECORDING", src("plugin", "        // RC2.2.21 — diálogo de permissão/painel também pausam: não apaga aqui.\n        interruptPractice();", "        discardPracticeRecording();")],
    ["[27] pausa deixa o áudio tocando", "PAUSE_KEEPS_AUDIO", src("plugin", "        // RC2.2.21 — diálogo de permissão/painel também pausam: não apaga aqui.\n        interruptPractice();\n", "")],
    ["[28] sair do app deixa a gravação", "RECORDING_LEFT_ON_EXIT", src("plugin", "        // RC2.2.17 · AB — sair do app apaga a gravação de prática.\n        discardPracticeRecording();\n", "")],
    ["[29] pausa/retomada não observadas", "LIFECYCLE_NOT_OBSERVED", src("nativeShell", '    await App.addListener("pause", () => recordTechEvent("app_paused", { via: "native" }));\n', "")],
  ],
  "mobile-layout": [
    ["[30] varredura sem 360", "LAYOUT_SWEEP_MISSING", src("e2e", "{ width: 360, height: 640 }", "{ width: 414, height: 896 }")],
    ["[31] fundo do modal fecha no mousedown (tap-through)", "TAP_THROUGH", src("modalOverlay", "        downOnBackdropRef.current = event.target === event.currentTarget;", "        if (event.target === event.currentTarget) onBackdropClick?.();")],
    ["[32] alvo de toque pequeno", "TOUCH_TARGET_SMALL", json((s) => { s.src.selfCompare = s.src.selfCompare.split("min-h-11").join("min-h-8"); })],
    ["safe area por env() cru no diagnóstico", "SAFE_AREA_NOT_DIAGNOSED", src("console", 'paddingTop: "var(--app-safe-top, 0px)"', 'paddingTop: "0px"')],
  ],
  "mobile-navigation": [
    ["[33] VOLTAR ignora o teclado", "BACK_PRIORITY_WRONG", src("back", '  if (input.keyboardOpen) return "close-keyboard";\n', "")],
    ["[34] orientação antes do modal", "BACK_PRIORITY_WRONG", src("back", '  if (input.overlayOpen) return "dismiss-overlay";\n  if (input.guidanceOpen) return "dismiss-guidance";', '  if (input.guidanceOpen) return "dismiss-guidance";\n  if (input.overlayOpen) return "dismiss-overlay";')],
    ["[35] rota interna minimiza o app", "BACK_EXITS_APP", src("back", '  return "navigate-home";\n}', '  return "minimize-app";\n}')],
    ["[36] um VOLTAR fecha todos os modais", "MODAL_STACK_BROKEN", src("modalStack", "return stack.length > 0 && stack[stack.length - 1] === id;", "return stack.includes(id);")],
    ["[37] ModalOverlay fora da pilha", "MODAL_STACK_BROKEN", src("modalOverlay", "        if (stackIdRef.current != null && !isTopModal(stackIdRef.current)) return;\n", "")],
    ["guarda da subtela antes do teclado", "BACK_PRIORITY_WRONG", src("nativeShell", "if (!keyboardOpen && !overlayOpen && !guidanceOpen && runBackGuard()) {", "if (runBackGuard()) {")],
    ["exitApp no VOLTAR", "BACK_EXITS_APP", json((s) => { s.src.nativeShell += "\nvoid App.exitApp();\n"; })],
  ],
  "auth-resilience": [
    ["[38] cadastro sem prazo", "SIGNUP_INFINITE_SPINNER", src("signupTrace", "export const SIGNUP_REQUEST_TIMEOUT_MS = 25_000;", "export const SIGNUP_REQUEST_TIMEOUT_MS = 999_999;")],
    ["[39] OTP persistido", "OTP_PERSISTED", src("forgot", "    const result = await verifyRecoveryCode(email, code);", '    sessionStorage.setItem("otp", code);\n    const result = await verifyRecoveryCode(email, code);')],
    ["OTP logado", "OTP_LOGGED", src("authService", '    const { data, error } = await client.auth.verifyOtp({ email: email.trim(), token, type: "recovery" });', '    console.debug("otp", token);\n    const { data, error } = await client.auth.verifyOtp({ email: email.trim(), token, type: "recovery" });')],
  ],
  "state-integrity": [
    ["[40] buffer técnico sem limite", "TECH_BUFFER_UNBOUNDED", src("techEvents", "  if (buffer.length > TECH_EVENT_LIMIT) buffer.splice(0, buffer.length - TECH_EVENT_LIMIT);\n", "")],
    ["[41] buffer técnico persistido", "TECH_EVENTS_PERSISTED", src("techEvents", "  if (buffer.length > TECH_EVENT_LIMIT)", '  localStorage.setItem("tech", JSON.stringify(buffer));\n  if (buffer.length > TECH_EVENT_LIMIT)')],
    ["[42] buffer ligado na produção", "DIAGNOSTICS_IN_PRODUCTION", src("techEvents", "void {\n  if (!deviceQaEnabled()) return;\n  buffer.push(", "void {\n  buffer.push(")],
    ["[43] transcrição no evento técnico", "DIAGNOSTIC_PII", src("techEvents", "    if (/transcript|text|email|password|senha|otp|token|name|nome/i.test(key)) continue;\n", "")],
    ["[44] diagnóstico vira PASS físico", "FAKE_PHYSICAL_PASS", src("diagnostics", "    physicalPass: false,", "    physicalPass: true,")],
    ["e-mail passa no diagnóstico", "DIAGNOSTIC_PII", src("diagnostics", '  if (typeof value === "string") return looksLikePiiOrSecret(value) ? "[redigido]" : value.slice(0, 120);', '  if (typeof value === "string") return value.slice(0, 120);')],
    ["captura fora do boot", "TECH_CAPTURE_MISSING", src("main", "installTechCapture();\n", "")],
    ["console sem Copiar diagnóstico", "DIAGNOSTIC_INCOMPLETE", src("console", 'data-testid="qa-mobile-copy"', 'data-testid="qa-mobile-hidden"')],
  ],
  "resource-cleanup": [
    ["[45] dois áudios ao mesmo tempo", "AUDIO_OVERLAP", src("arbiter", "      stopPrevious?.();", "      void stopPrevious;")],
    ["[46] posse velha libera a nova", "AUDIO_OWNER_STOLEN", src("arbiter", "  if (claimToken != null && claimToken !== token) return;\n", "")],
    ["[47] microfone aberto ao sair da fala", "RESOURCE_LEAK", src("pronunciation", "      handleRef.current?.stop();\n      releaseRecognitionAudio();", "      handleRef.current?.stop();")],
    ["[48] URL da gravação não revogada", "RESOURCE_LEAK", src("selfCompare", "      if (webUrlRef.current) URL.revokeObjectURL(webUrlRef.current);\n", "")],
    ["[49] ouvintes duplicados", "LISTENER_LEAK", src("techEvents", "  if (installed) return installed;\n", "")],
    ["TTS fora do árbitro", "AUDIO_OVERLAP", src("audioPlayback", 'claimAudio("TTS", () => stopSpeaking())', "0")],
    ["segundo plugin de voz", "DUPLICATE_ENGINE", json((s) => { s.fileNames.push("android/app/src/main/java/longyu/noba/com/LongyuVoicePlugin.java"); })],
  ],
  "release-truth": [
    ["[50] PASS físico sem evidência", "FAKE_PHYSICAL_PASS", json((s) => { s.deviceQa.tests.selfPlaybackAudible.status = "PASS"; })],
    ["[51] bug P1 PHYSICAL_PASS sem evidência", "FAKE_PHYSICAL_PASS", json((s) => { s.bugs.bugs[0].status = "PHYSICAL_PASS"; })],
    ["[52] contadores maquiados", "BUG_COUNTER_DRIFT", json((s) => { s.bugs.counters.releaseBlockingOpen = 0; })],
    ["[53] P1 escondido", "P1_HIDDEN", json((s) => { s.bugs.bugs = s.bugs.bugs.filter((bug) => bug.id !== "SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID"); })],
    ["[54] Closed Beta GO com P1 aberto", "CLOSED_BETA_PREMATURE", json((s) => { s.bugs.release.CLOSED_BETA = "GO"; })],
    ["[55] Public Beta GO", "PUBLIC_BETA_PREMATURE", json((s) => { s.bugs.release.PUBLIC_BETA = "GO"; })],
    ["[56] base ambígua", "BASE_SHA_AMBIGUOUS", json((s) => { s.base.baseSha = "main"; })],
    ["[57] commits da RC2.2.20 recriados", "PARENT_COMMITS_DUPLICATED", json((s) => { s.base.doNotDuplicateParentCommits = false; })],
    ["[58] exceção de freeze ausente", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "RC2_2_21_MOBILE_NATIVE_STABILITY_EXCEPTION", "RC2_2_21_UNREGISTERED")],
    ["[59] relatório colapsa os estados", "REPORT_STATES_COLLAPSED", json((s) => { s.report = s.report.split("ANDROID QA BUILD PASS").join("PASS"); })],
    ["[60] package muda", "PACKAGE_CHANGED", src("capacitorConfig", 'appId: "longyu.noba.com"', 'appId: "longyu.outro.app"')],
    ["[61] compras Android ligadas", "PURCHASES_ENABLED", src("subscription", 'export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;', 'export const ANDROID_IN_APP_PURCHASE = "ENABLED" as const;')],
    ["[62] #273 tocada", "TOUCHED_273", json((s) => { s.rc2CandidateSha256 = "0".repeat(64); })],
    ["[63] Production Play automático", "PRODUCTION_PLAY_ENABLED", src("releaseIdentity", 'export const MAX_AUTOMATIC_CHANNEL = "internal";', 'export const MAX_AUTOMATIC_CHANNEL = "production";')],
    ["voz própria 'audível' sem prova", "FAKE_PHYSICAL_PASS", json((s) => { s.bugs.selfVoiceAudibleOnAndroid = "PASS"; })],
    ["REPRODUCED sem reprodução", "FAKE_REPRODUCTION", json((s) => { s.bugs.bugs[1].status = "REPRODUCED"; })],
    ["voz humana liberada no repo", "VOICE_IN_REPO", json((s) => { s.deviceQa.evidenceRules.voiceRecordingInRepo = "ALLOWED"; })],
    ["matriz crítica PASS com NOT_RUN", "FAKE_PHYSICAL_PASS", json((s) => { s.deviceQa.physicalCriticalMatrix = "PASS"; })],
    ["relatório declara PLAY PHYSICAL PASS", "FAKE_PHYSICAL_PASS", json((s) => { s.report += "\nPLAY PHYSICAL PASS: PASS\n"; })],
    ["PR automático", "AUTO_PR", json((s) => { s.bugs.release.prOpenedAutomatically = true; })],
  ],
};

const cases = MUTATIONS[area] ?? [];
const clean = await gate(base);
assert.deepEqual(clean, [], `${area}: estado real falhou\n${report(name, clean)}`);
let killed = 0;
for (const [label, code, mutate] of cases) {
  const state = structuredClone(base);
  mutate(state);
  const failures = await gate(state);
  const codes = failures.map((f) => f.code);
  assert.ok(codes.includes(code), `${label}: esperava ${code}, veio ${codes.join(", ") || "nenhuma falha"}`);
  console.log(`KILLED ${label}: ${code}`);
  killed += 1;
}
console.log(`PASS ${name} (${killed} mutações)`);
