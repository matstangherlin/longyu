#!/usr/bin/env node
/**
 * RC2.2.24 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-24-android-learning-parity.mjs validate <área>
 *   node scripts/rc2-2-24-android-learning-parity.mjs test <área>
 *
 * Os números [n] são as 38 mutações obrigatórias da spec RC2.2.24.
 * Gates em scripts/lib/rc2-2-24-gates.mjs.
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-24-gates.mjs";

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
  const source = String(text).replace(/\r\n/g, "\n");
  assert.ok(source.includes(from), `mutação vazia: trecho não encontrado → ${from.slice(0, 90)}`);
  return source.split(from).join(to);
}
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
};
const json = (mutate) => (s) => mutate(s);
const bug = (s, id) => s.bugs.bugs.find((item) => item.id === id);

const MUTATIONS = {
  "native-tts-correlation": [
    ["[1] TTS start sem requestId libera CTA", "TTS_START_WITHOUT_REQUEST_ID", src("ttsCorrelation", '  if (!requestId) return null;\n', "")],
    ["[2] evento antigo libera áudio novo", "TTS_FOREIGN_EVENT_RELEASES", src("ttsCorrelation", "  if (!state.requestId || event.requestId !== state.requestId) return { ...state, ignoredForeign: state.ignoredForeign + 1 };", "  if (!state.requestId) return { ...state, ignoredForeign: state.ignoredForeign + 1 };")],
    ["[3] listener instala depois do speak", "TTS_LISTENER_AFTER_SPEAK", src("nativeSpeech", "  await Promise.race([initNativeTtsEventBridge(), new Promise((resolve) => setTimeout(resolve, 500))]);", "  await Promise.resolve();")],
    ["[3b] ponte fora do bootstrap", "TTS_LISTENER_AFTER_SPEAK", src("bootstrap", "    void initNativeTtsEventBridge();\n", "")],
    ["[4] áudio ouvido mantém CTA bloqueado", "TTS_HEARD_CTA_BLOCKED", src("ttsCorrelation", '  return state.phase === "STARTED" || state.phase === "HEARD" || state.phase === "DONE";', '  return state.phase === "DONE" && !state.startEventMissed;')],
    ["[5] ACK direto perdido", "TTS_ONDONE_WAIT_FOREVER", src("nativeSpeech", '    subscribed({ type: "TTS_STARTED", requestId, utteranceId: result.utteranceId, timestamp: Date.now(), engineState: "native-direct", source: "direct" });', "    void result;")],
    ["evento carrega o texto falado", "TTS_EVENT_CARRIES_TEXT", src("ttsCorrelation", '    source: type === "TTS_ENGINE_SPEAKING" ? "engine" : "event",\n  };', '    source: type === "TTS_ENGINE_SPEAKING" ? "engine" : "event",\n    text: value.text,\n  } as TtsEvent;')],
    ["callback global volta", "TTS_GLOBAL_CALLBACK", src("nativeSpeech", "// ── RC2.2.24 — eventos de TTS correlacionados", "const ttsStartWaiters = new Set();\n// ── RC2.2.24 — eventos de TTS correlacionados")],
  ],
  "guided-try-advance": [
    ["Teste Guiado sem identidade da fala", "GUIDED_TRY_UNCORRELATED", src("guidedTry", "    const requestId = newTtsRequestId();\n", "    const requestId = \"fixed\";\n")],
    ["STARTING eterno (botão morto)", "GUIDED_TRY_DEAD_BUTTON", src("guidedTry", 'setFailReason("TTS_SUPERSEDED");\n        setListen((prev) => (prev === "PLAYING" || prev === "HEARD" ? prev : "FAILED"));', "void 0;")],
    ["falha sem [Configurar voz chinesa]", "GUIDED_TRY_DEAD_BUTTON", src("guidedTry", 'data-testid="guided-audio-retry"', 'data-testid="guided-audio-x"')],
    ["ouviu mas CTA bloqueado", "TTS_HEARD_CTA_BLOCKED", src("guidedTry", "audioResult === \"AUDIO_HEARD\" || heard", "audioResult === \"AUDIO_HEARD\" && heard && false")],
    ["último passo espera o áudio", "AUDIO_GATES_LAST_STEP", src("guidedTry", '    if (choice.correct && step === "conversation") void playMandarinAudio("你好");', '    if (choice.correct && step === "conversation") void playMandarinAudio("你好").then(() => go("done"));')],
  ],
  "conversation-transition": [
    ["[6] goTo depende do áudio", "CONVERSATION_GOTO_SPEAKS", src("conversation", "    truth.begin(nodeId, target.id);\n    setNodeId(target.id);", "    truth.begin(nodeId, target.id);\n    speak(String(_speakTarget?.hanzi ?? \"\"));\n    setNodeId(target.id);")],
    ["[7] falha do TTS impede setNodeId", "TTS_FAILURE_BLOCKS_NODE", src("conversation", "    setNodeId(target.id);\n    setAnswering(false);\n    setSpokenCount((count) => count + 1);\n  }", "    setAnswering(false);\n    setSpokenCount((count) => count + 1);\n  }")],
    ["[8] Continue registra toque mas DOM não muda (stall não detectado)", "CONVERSATION_DOM_STALL_UNDETECTED", src("conversation", "        setStall(expected);\n", "")],
    ["[9] V1 não avança", "CONVERSATION_V1_STUCK", src("conversation", "      setLineIndex((index) => index + 1);\n      return;", "      return;")],
    ["[10] V2 sem marca do nó visível", "CONVERSATION_DOM_STALL_UNDETECTED", src("conversation", "        <div data-conversation-current-node={node.id}>", "        <div>")],
    ["[11] ramo errado repete eternamente", "CONVERSATION_WRONG_LOOP", src("conversation", "if (wrongHere >= 2) {", "if (wrongHere >= 99) {")],
    ["[12] áudio do nó pode reverter o estado", "AUDIO_DRIVES_NODE", src("conversation", "function useConversationTransitionTruth(", "const revert = { onend: () => setNodeId(entry) };\nfunction useConversationTransitionTruth(")],
    ["grafo quebrado prende o aluno", "CONVERSATION_LOOP_TRAP", src("conversationTransition", "  if (!targetId || !known(targetId) || transitions > maxTransitions) return { kind: \"finish\" };", "  if (!targetId) return { kind: \"finish\" };")],
  ],
  "step-render-truth": [
    ["[8b] avançou sem DOM da etapa nova", "ADVANCE_WITHOUT_DOM", src("player", 'traceLessonStep({ ...context, event: "next_step_rendered" });', "void 0;")],
    ["render stall ignorado", "STEP_RENDER_STALL_IGNORED", src("stepRenderTruth", "    if (!landed) stalls.push(", "    if (false) stalls.push(")],
    ["setIdx direto fora do contrato", "ADVANCE_WITHOUT_DOM", src("player", "      selectNextStep(currentStep.kind);\n    }\n  }", "      setIdx(idx + 1);\n    }\n  }")],
  ],
  "journey-return-anchor": [
    ["[13] conclusão volta ao topo", "RETURN_GOES_TOP", src("anchor", '  if (state.currentLessonId) return { lessonId: state.currentLessonId, why: "CURRENT_NODE" };\n  return null;', "  return null;")],
    ["[14] volta da Cultura perde a unidade", "CULTURE_RETURN_LOSES_UNIT", src("anchor", '  if (anchor && state.lessonExists(anchor.lessonId)) return { lessonId: anchor.lessonId, why: "ANCHOR" };\n', "")],
    ["[15] volta dos Tons perde a unidade", "TONE_RETURN_LOSES_UNIT", src("anchor", '  if (/^\\/(som|tons)/.test(pathname)) return "TONE_TRAINER";\n', "")],
    ["nó novo não preferido", "NEW_NODE_NOT_PREFERRED", src("anchor", "  if (anchor && state.completedNow > anchor.completedAtLeave && state.currentLessonId)", "  if (false)")],
    ["Jornada não grava âncora", "RETURN_GOES_TOP", src("journey", "      setJourneyReturnAnchor({", "      void ({")],
  ],
  "cross-feature-handoff": [
    ["[16] aluno precisa procurar a aba", "HANDOFF_UNGUIDED", src("som", '<JourneyHandoffBanner source="TONE_TRAINER" />', "")],
    ["[17] atividade exigida sem CTA de volta", "HANDOFF_NO_RETURN_CTA", src("handoff", 'data-testid="journey-handoff-back"', 'data-testid="journey-handoff-x"')],
    ["Cultura sem handoff", "HANDOFF_UNGUIDED", src("culture", '<JourneyHandoffBanner source="CULTURE" />', "")],
  ],
  "guided-activity-shell": [
    ["atividade sem focus mode", "ACTIVITY_KEEPS_CHROME", src("appShell", "const focusMode = ownsViewport || focusActivity ||", "const focusMode = ownsViewport ||")],
    ["foco preso após sair", "FOCUS_COUNTER_LEAK", src("focus", "    if (released) return;\n", "")],
  ],
  "tone-trainer-focus": [
    ["[18] Tone Trainer mantém TopBar na rodada", "TONE_ROUND_NOT_FOCUSED", src("som", "useFocusActivity(started && !done);", "useFocusActivity(false);")],
    ["[19] Tone Trainer mantém TabBar na rodada (shell)", "TABBAR_DURING_ACTIVITY", json((s) => { s.src.appShell = s.src.appShell.replace("{!focusMode && <TabBar />}", "<TabBar />"); }), "guided-activity-shell"],
    ["[20] stats durante a resposta", "TONE_STATS_MID_ROUND", src("som", '      <header className="flex items-center gap-3">', '      <header className="flex items-center gap-3"><ToneMiniStat label="Nota" value="0" />')],
    ["[21] lista de packs na rodada", "TONE_PACKS_MID_ROUND", src("som", '      <Button size="lg" className="sticky bottom-3 mt-4 w-full shadow-lift" disabled={!answered}', '      <TonePackList selectedPackId={pack.id} onSelect={resetSession} />\n      <Button size="lg" className="sticky bottom-3 mt-4 w-full shadow-lift" disabled={!answered}')],
    ["atalhos visíveis na rodada", "TONE_CLUTTER_MID_ROUND", src("som", '        {!hasVoice && <p className="mt-3 text-xs leading-5 text-ink-faint">', '        <span>Atalhos: 1-9</span>{!hasVoice && <p className="mt-3 text-xs leading-5 text-ink-faint">')],
    ["hub misturado com a atividade", "TONE_HUB_MIXED", src("som", "  if (!started) {", "  if (false) {")],
  ],
  "tone-trace": [
    ["[26] Tone Trace só mouse", "TRACE_MOUSE_ONLY", src("toneTraceUi", "onPointerDown={onPointerDown}", "onMouseDown={onPointerDown as never}")],
    ["[27] Tone Trace sem toque", "TRACE_TOUCH_BROKEN", src("toneTraceUi", "touch-none select-none", "select-none")],
    ["[28] Tone Trace afirma medir pitch", "TRACE_CLAIMS_PITCH", src("toneTrace", 'return level === "NO_LINE" ? "✓ Você lembrou a forma." : "✓ Forma completa.";', 'return "✓ Seu tom ficou correto.";')],
    ["progressão de ajuda quebrada", "TRACE_PROGRESSION_BROKEN", src("toneTrace", 'export const TONE_TRACE_LEVELS = ["FULL_LINE", "PARTIAL_LINE", "GUIDE_DOTS", "NO_LINE"] as const;', 'export const TONE_TRACE_LEVELS = ["FULL_LINE", "NO_LINE"] as const;')],
  ],
  "all-lessons-guided-parity": [
    ["[24] aula Pro usa apresentação legada", "PREMIUM_LEGACY_PRESENTATION", src("guidedPresentation", '  if (input.productionBeta) return "GUIDED";', '  if (input.productionBeta && !(input as { premium?: boolean }).premium) return "GUIDED";')],
    ["[25] StepKind escapa da apresentação guiada", "STEPKIND_ESCAPES_GUIDED", json((s) => { s.parity.stepKinds.push({ kind: "legacy_card_only", occurrences: 1, lessons: 1, premiumLessons: 0, focus: false, webMobile: "x", androidApk: "NOT_RUN" }); })],
    ["amostragem em vez de 134 aulas", "LESSONS_NOT_ALL_AUDITED", json((s) => { s.parity.totals.lessons = 20; })],
    ["APK PASS sem teste físico", "FAKE_APK_PASS", json((s) => { s.parity.stepKinds[0].androidApk = "PASS"; })],
  ],
  "single-account-production": [
    ["[29] perfis locais aparecem em Dados", "LOCAL_PROFILES_VISIBLE", src("dados", '      {/* RC2.2.24 — "Dados e backup"', '      <div>{t("hub.localProfilesHere")}</div>\n      {/* RC2.2.24 — "Dados e backup"')],
    ["[30] 'Aluno local' na Conta em produção", "LOCAL_PROFILES_VISIBLE", src("account", "      {isDevLocalAuthAllowed() && (\n      <div>\n        <Card className=\"border-line/80 p-5 sm:p-6\">", "      {(\n      <div>\n        <Card className=\"border-line/80 p-5 sm:p-6\">")],
    ["[31] switchAccount em produção", "SWITCH_ACCOUNT_IN_PRODUCTION", src("settings", "              {isDevLocalAuthAllowed() && (\n              <div className=\"grid gap-2\">", "              {(\n              <div className=\"grid gap-2\">")],
    ["[32] logout cai em perfil local", "LOGOUT_TO_LOCAL_PROFILE", src("store", "          cacheLiveProgressForCloudUser(s);\n          return wipeToGuestShell();\n        }),\n      logout:", "          cacheLiveProgressForCloudUser(s);\n          return { accountSetupComplete: true };\n        }),\n      logout:")],
    ["[33] conta local criável em produção", "LOCAL_ACCOUNT_CREATABLE", src("store", "if (!email && !isDevLocalAuthAllowed())", "if (false)")],
    ["[34] migração legada apaga progresso", "MIGRATION_LOSES_PROGRESS", src("store", "          cacheLiveProgressForCloudUser(s);\n          return wipeToGuestShell();\n        }),\n      logout:", "          return wipeToGuestShell();\n        }),\n      logout:")],
  ],
  "release-truth": [
    ["[35] #273 alterada", "TOUCHED_273", json((s) => { s.rc2CandidateSha256 = "0".repeat(64); })],
    ["[36] package alterado", "PACKAGE_CHANGED", src("capacitorConfig", 'appId: "longyu.noba.com"', 'appId: "longyu.outro.app"')],
    ["[37] compras Android ligadas", "PURCHASES_ENABLED", src("subscription", 'export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;', 'export const ANDROID_IN_APP_PURCHASE = "ENABLED" as const;')],
    ["[38] Production Play ligado", "PRODUCTION_PLAY_ENABLED", src("releaseIdentity", 'export const MAX_AUTOMATIC_CHANNEL = "internal";', 'export const MAX_AUTOMATIC_CHANNEL = "production";')],
    ["[22/23] dobra não testada no E2E", "FOLD_NOT_TESTED", json((s) => { s.src.e2e = ""; })],
    ["P1 do TTS rebaixado", "P1_IGNORED", json((s) => { s.bugs.bugs.find((bug) => bug.id === "ANDROID_TTS_HEARD_BUT_UI_NOT_ACKNOWLEDGED").severity = "P2"; })],
    ["cadastro mobile sai da lista", "P1_IGNORED", json((s) => { s.bugs.bugs = s.bugs.bugs.filter((bug) => bug.id !== "MOBILE_SIGNUP_NOT_PHYSICALLY_PROVEN"); })],
    ["WEB PASS vira APK PASS", "FAKE_PHYSICAL_PASS", json((s) => { s.bugs.ownerDevicePhysical.guidedTryAudioAdvance = "PASS"; })],
    ["painel maquiado", "BUG_COUNTER_DRIFT", json((s) => { s.bugs.panel.P1.open = 0; })],
    ["base ambígua (#295)", "BASE_SHA_AMBIGUOUS", json((s) => { s.base.RC2_2_24_BASE_SHA = "3cb0ddd4f2e4c55d76771e6408e34f91a360ce51"; })],
    ["exceção de freeze ausente", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "RC2_2_24_ANDROID_LEARNING_PARITY_EXCEPTION", "RC2_2_24_UNREGISTERED")],
    ["Closed Beta GO", "CLOSED_BETA_PREMATURE", json((s) => { s.bugs.release.CLOSED_BETA = "GO"; })],
  ],
};

const cases = (MUTATIONS[area] ?? []).concat(Object.values(MUTATIONS).flat().filter((entry) => entry[3] === area));
const own = cases.filter((entry) => !entry[3] || entry[3] === area);
const clean = await gate(base);
assert.deepEqual(clean, [], `${area}: estado real falhou\n${report(name, clean)}`);
let killed = 0;
for (const [label, code, mutate, target] of own) {
  if (target && target !== area) continue;
  const state = structuredClone(base);
  mutate(state);
  const failures = await (target ? VALIDATORS[target] : gate)(state);
  const codes = failures.map((f) => f.code);
  assert.ok(codes.includes(code), `${label}: esperava ${code}, veio ${codes.join(", ") || "nenhuma falha"}`);
  console.log(`KILLED ${label}: ${code}`);
  killed += 1;
}
console.log(`PASS ${name} (${killed} mutações)`);
