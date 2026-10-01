#!/usr/bin/env node
/**
 * RC2.2.27 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-27-android-tts-root-cause.mjs validate <área>
 *   node scripts/rc2-2-27-android-tts-root-cause.mjs test <área>
 *
 * Os números [n] são as 35 mutações obrigatórias da spec RC2.2.27 (as sem
 * número reforçam a mesma área). Gates em scripts/lib/rc2-2-27-gates.mjs.
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-27-gates.mjs";

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
  // Timers de limpeza do adaptador (12 s) não seguram o processo.
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
const bug = (s, id) => s.bugs.bugs.find((item) => item.id === id);

const MUTATIONS = {
  "build-identity": [
    ["[20] build SHA instalado diverge e teste é aceito", "BUILD_MISMATCH_ACCEPTED", src("forensics", '  for (const value of present) if (!shaMatches(value, known[0])) return "TEST_INVALID";\n', "")],
    ["UNKNOWN aceito como resultado físico", "BUILD_MISMATCH_ACCEPTED", src("forensics", 'return verdict === "MATCH";', 'return verdict !== "TEST_INVALID";')],
  ],
  "native-tts-engine-truth": [
    ["[1] query usa apenas callback snapshot", "QUERY_SNAPSHOT_ONLY", src("plugin", 'result.put("engineSpeakingNow", isCurrent && safeIsSpeaking());', 'result.put("engineSpeakingNow", request.engineSpeaking);')],
    ["[8] tts.stop é chamado sempre", "UNCONDITIONAL_STOP", src("plugin", '|| ("CONDITIONAL".equals(ttsStopMode) && engineSpeakingNow);', '|| "CONDITIONAL".equals(ttsStopMode);')],
    ["[9] previous DONE ainda recebe stop", "STOP_AFTER_DONE", src("plugin", "            if (safeIsSpeaking() && tts != null) tts.stop();\n            finishSpeak(true);", "            if (tts != null) tts.stop();\n            finishSpeak(true);")],
    ["LongyuTTS registra o texto falado", "TTS_LOG_CARRIES_TEXT", src("plugin", '+ " src=" + (request == null ? "-" : request.source)', '+ " src=" + (request == null ? "-" : request.source) + " text=" + text')],
  ],
  "is-speaking-probe": [
    ["[2] isSpeaking ignorado", "IS_SPEAKING_IGNORED", src("nativeSpeech", ' || state.state === "ENGINE_SPEAKING" || state.engineSpeakingNow === true)) {', ")) {")],
    ["[3] polling roda apenas uma vez", "POLLING_SINGLE_SHOT", src("nativeSpeech", "while (!confirmed && !terminal && Date.now() - pollStartedAt < TTS_STATE_POLL_DEADLINE_MS) {", "for (let once = 0; once < 1 && !confirmed && !terminal && Date.now() - pollStartedAt < TTS_STATE_POLL_DEADLINE_MS; once += 1) {")],
    ["[4] polling encerra cedo sem confirmação", "POLLING_ENDS_EARLY", src("nativeSpeech", "export const TTS_STATE_POLL_DEADLINE_MS = 4000;", "export const TTS_STATE_POLL_DEADLINE_MS = 500;")],
    ["watchdog nativo não confirma", "IS_SPEAKING_IGNORED", src("plugin", '                    ackRequest(request, "isSpeaking", false);\n', "")],
  ],
  "sequential-tts": [
    ["[15] fala 2 não toca depois da fala 1", "SECOND_UTTERANCE_SILENT", src("nativeSpeech", "  ttsSubscribers.set(requestId, subscribed);\n  const requested", "  if (!ttsSubscribers.size) ttsSubscribers.set(requestId, subscribed);\n  const requested")],
    ["[16] fala 5 falha em sequência", "SEQUENCE_BREAKS", src("forensics", 'result: rows.length === expected && passed === expected ? "PASS" : "FAIL"', 'result: passed >= expected - 1 ? "PASS" : "FAIL"')],
    ["teste de 20 falas some do painel", "FORENSICS_TEST_MISSING", src("panel", '"qa-tts-twenty"', '"qa-tts-many"')],
  ],
  "request-lifecycle": [
    ["[5] request antiga confirma nova", "FOREIGN_REQUEST_CONFIRMS", src("nativeSpeech", "    ttsSubscribers.get(event.requestId)?.(event);", "    for (const subscriber of ttsSubscribers.values()) subscriber(event);")],
    ["[6] startCall anterior é sobrescrito", "START_CALL_OVERWRITTEN", src("plugin", "            supersede(previous, rid);\n", "")],
    ["[7] superseded request não recebe terminal", "SUPERSEDED_NOT_TERMINAL", src("plugin", '        settleRequest(previous, true, "TTS_SUPERSEDED");\n', "")],
    ["correlação aceita evento alheio", "FOREIGN_REQUEST_CONFIRMS", src("correlation", "  if (!state.requestId || event.requestId !== state.requestId) return", "  if (!state.requestId) return")],
  ],
  "request-cancellation": [
    ["[13] unmount não cancela própria request", "UNMOUNT_KEEPS_OWN_REQUEST", src("mandarin", "    if (own && mandarinSpeechActive(own.requestId)) own.cancel();\n", "")],
    ["[14] cleanup cancela request alheia", "CLEANUP_CANCELS_FOREIGN", src("playback", "  if (stillNewest) stopSpeaking();", "  stopSpeaking();")],
    ["cancelar request encerrada para a fala atual", "CLEANUP_CANCELS_FOREIGN", src("mandarin", "  if (!slot || slot.settled) return;\n", "")],
  ],
  "auto-speak-unification": [
    ["[10] autoplay bypassa runtime unificado", "AUTOPLAY_BYPASSES_RUNTIME", src("autoSpeak", 'import { scheduleAutoSpeak, type AutoSpeakOptions } from "./mandarinSpeech";', 'import { scheduleAutoSpeak, type AutoSpeakOptions } from "./tts";')],
    ["[11] conversation node 2 não cria nova requestId", "NODE_REUSES_REQUEST_ID", src("mandarin", "const requestId = request.requestId ?? newTtsRequestId();", 'const requestId = request.requestId ?? "autoplay";')],
    ["[12] mesmo texto em novo node não toca", "SAME_TEXT_NEW_NODE_SILENT", src("autoSpeak", "[opts.speechKey, text,", "[text,")],
  ],
  "conversation-sequence": [
    ["[17] áudio falha e bloqueia conversa", "AUDIO_BLOCKS_CONVERSATION", src("conversation", 'feedback === "correct" || (isOrder ? ordered.length === 0 : !picked)', 'feedback === "correct" || audioPlaying || (isOrder ? ordered.length === 0 : !picked)')],
    ["onend some quando a fala falha", "AUDIO_BLOCKS_CONVERSATION", src("mandarin", "    void handle.done.then(() => opts.onend?.());\n", "")],
  ],
  "guided-try": [
    ["[18] Guided Try permanece disabled após engineSpeaking", "GUIDED_TRY_IGNORES_ENGINE", src("correlation", '    case "TTS_ENGINE_SPEAKING":\n    case "TTS_STARTED":', '    case "TTS_STARTED":')],
    ["[19] Guided Try fica disabled indefinidamente", "GUIDED_TRY_DISABLED_FOREVER", src("guidedTry", '      setFailReason("TTS_UI_DEADLINE");\n', "")],
    ["prazo de UI infinito", "GUIDED_TRY_DISABLED_FOREVER", src("guidedTry", "export const GUIDED_LISTEN_DEADLINE_MS = 5500;", "export const GUIDED_LISTEN_DEADLINE_MS = 600000;")],
    ["prazo só arma em STARTING (APK do owner)", "GUIDED_TRY_DISABLED_FOREVER", src("guidedTry", "    setListenTap((count) => count + 1);\n", "")],
    ["substituída volta a IDLE cinza", "GUIDED_TRY_DISABLED_FOREVER", src("guidedTry", '        setFailReason("TTS_SUPERSEDED");\n        setListen((prev) => (prev === "PLAYING" || prev === "HEARD" ? prev : "FAILED"));', '        setListen((prev) => (prev === "STARTING" ? "IDLE" : prev));')],
    ["WebView sem speechSynthesis: gesto estoura antes do startSpeak (APK dbe7439b)", "WEBVIEW_GESTURE_THROWS", (st) => {
      src("tts", "  const synth = webSpeechSynthesis();\n  if (synth?.paused) synth.resume();", "  if (!isTTSAvailable()) return;\n  const synth = window.speechSynthesis;\n  if (synth.paused) synth.resume();")(st);
      src("tts", "  try {\n    resumeSpeechSynthesis();\n    // Mesmo gesto desbloqueia SFX (AudioContext) — sem isso o 1º efeito some no iOS.\n    unlockAudio();\n  } catch {\n    // desbloqueio de áudio é opcional; o toque segue\n  }", "  resumeSpeechSynthesis();\n  unlockAudio();")(st);
    }],
  ],
  "lesson-audio-gates": [
    ["Ouça sem saída sem áudio", "AUDIO_GATE_NO_EXIT", src("steps", 'tr("player.cannotListenNow")', 'tr("player.listen")')],
    ["auditoria marca passo físico como PASS", "FAKE_PHYSICAL_PASS", json((s) => { s.audioGated.steps[0].physicalStatus = "PASS"; })],
    ["passo com trava sem fallback", "AUDIO_GATE_NO_EXIT", json((s) => { s.audioGated.steps.find((item) => item.kind === "listen").canFallback = false; })],
  ],
  "audio-arbiter-recovery": [
    ["árbitro volta a parar tudo", "ARBITER_GLOBAL_STOP", src("playback", 'claim = claimAudio("TTS", () => cancelOwnSpeech(requestId, token));', 'claim = claimAudio("TTS", () => stopSpeaking());')],
    ["recuperação TTS↔gravação some", "RECOVERY_DEBT_DROPPED", json((s) => { s.bugs.bugs = s.bugs.bugs.filter((item) => item.id !== "AUDIO_OWNER_RECOVERY_FAIL"); })],
  ],
  "completion-sequence": [
    ["[21] completion concede XP novamente", "COMPLETION_GRANTS_XP", src("victory", "    cancelAllMandarinSpeech();\n", '    cancelAllMandarinSpeech();\n    useStore.getState().addXp(xp, "completion");\n')],
    ["[22] completion concede Qi novamente", "COMPLETION_GRANTS_QI", src("victory", "    cancelAllMandarinSpeech();\n", '    cancelAllMandarinSpeech();\n    useStore.getState().addQi(qi ?? 0, "completion");\n')],
    ["[23] completion toca som com soundEffects off", "SOUND_WHEN_OFF", src("completion", "sound: prefs.soundEffects ? sound : null", "sound")],
    ["[24] completion vibra com haptics off", "HAPTIC_WHEN_OFF", src("completion", "haptic: prefs.hapticsEnabled ? haptic : null", "haptic")],
    ["[25] reduced motion ignorado", "REDUCED_MOTION_IGNORED", src("completion", "if (reducedMotion || stages.length <= 1)", "if (stages.length <= 1)")],
    ["[29] reward sem mudança é exibido", "UNCHANGED_REWARD_SHOWN", src("completion", "if (input.qiDelta > 0)", "if (input.qiDelta >= 0)")],
    ["[30] voltar à tela repete celebração", "CELEBRATION_REPEATS", src("completion", "    if (list.includes(key)) return false;\n", "")],
    ["Continuar sequestrado pela animação", "CONTINUE_HIJACKED", src("victory", "data-lesson-victory-actions", "data-lesson-victory-actions disabled={stageIndex < stages.length - 1}")],
  ],
  "celebration-queue": [
    ["[26] duas cerimônias aparecem juntas", "CEREMONIES_STACKED", src("victory", "    return holdCelebration(`completion:", "    void holdCelebration;\n    return void (`completion:")],
    ["[27] coachmark aparece por cima da conclusão", "COACHMARK_OVER_COMPLETION", src("guidanceHost", "  if (isCelebrationActive(GUIDANCE_CEREMONY_ID)) return true;\n", "")],
    ["[28] SFX interrompe TTS pedagógico", "SFX_OVER_TTS", src("victory", "    cancelAllMandarinSpeech();\n", "")],
  ],
  "physical-truth": [
    ["[31] activity 390×844 exige scroll", "ACTIVITY_REQUIRES_SCROLL", src("e2e", "width: 390, height: 844", "width: 390, height: 1400")],
    ["[32] #273 alterada", "TOUCHED_273", json((s) => { s.rc2CandidateSha256 = "0".repeat(64); })],
    ["[33] package alterado", "PACKAGE_CHANGED", (s) => { s.src.capacitorConfig = s.src.capacitorConfig.replace('appId: "longyu.noba.com"', 'appId: "longyu.noba.beta"'); }],
    ["[34] Android billing ativado", "PURCHASES_ENABLED", src("subscription", 'export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;', 'export const ANDROID_IN_APP_PURCHASE = "ENABLED" as const;')],
    ["[35] Production Play ativado", "PRODUCTION_PLAY_ENABLED", src("releaseIdentity", 'MAX_AUTOMATIC_CHANNEL = "internal"', 'MAX_AUTOMATIC_CHANNEL = "production"')],
    ["Closed Beta GO com áudio FAIL", "CLOSED_BETA_PREMATURE", json((s) => { s.bugs.release.CLOSED_BETA = "GO"; })],
    ["P1 de TTS sequencial rebaixado", "P1_IGNORED", json((s) => { bug(s, "ANDROID_SEQUENTIAL_TTS_STOPS_AFTER_FIRST_UTTERANCE").severity = "P2"; })],
    ["check físico vira PASS sem build MATCH", "FAKE_PHYSICAL_PASS", json((s) => { s.matrix.checks.ttsFiveSequential = "PASS"; })],
    ["causa raiz declarada provada sem aparelho", "ROOT_CAUSE_CLAIMED", json((s) => { s.bugs.rootCauseProven = true; })],
    ["base ambígua (SHA do APK do corpo do #299)", "BASE_SHA_AMBIGUOUS", json((s) => { s.base.RC2_2_27_BASE_SHA = "e54ca366"; })],
    ["painel maquiado", "BUG_COUNTER_DRIFT", json((s) => { s.bugs.panel.P1.open = 0; })],
    ["exceção de freeze ausente", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "RC2_2_27_ANDROID_TTS_ROOT_CAUSE_EXCEPTION", "RC2_2_27_UNREGISTERED")],
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
process.exit(0);
