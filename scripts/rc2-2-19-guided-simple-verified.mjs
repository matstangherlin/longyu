#!/usr/bin/env node
/**
 * RC2.2.19 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-19-guided-simple-verified.mjs validate <área>
 *   node scripts/rc2-2-19-guided-simple-verified.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação é pega com o código certo.
 * Gates em scripts/lib/rc2-2-19-gates.mjs.
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-19-gates.mjs";

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
  "guidance-truth": [
    ["1. semente grava 'visto'", "AUTO_SEEDED_AS_SEEN", src("orchestrator", 'if (!records[id]) records[id] = { status: "AUTO_SEEDED", at: now, evidence: "seed" };', 'if (!records[id]) records[id] = { status: "SHOWN", at: now, evidence: "seed" };')],
    ["2. SEEN do RC2.2.18 continua valendo", "LEGACY_SEEN_TRUSTED", src("orchestrator", 'if (legacy && r.status === "SEEN") {', "if (false) {")],
    ["3. AUTO_SEEDED bloqueia (conta madura nunca vê)", "MATURE_GUIDANCE_SUPPRESSED", src("orchestrator", '  if (record.status === "AUTO_SEEDED") return false;\n', '  if (record.status === "AUTO_SEEDED") return true;\n')],
    ["4. o que a conta já usa vira 'Novos recursos'", "MATURE_BATCH_AS_NEW", json((s) => {
      s.src.orchestrator = swap(s.src.orchestrator, ' && definition.feature && !isAutoSeeded(definition.id, ctx))', " && definition.feature)");
      s.src.orchestrator = swap(s.src.orchestrator, "top.feature && !isAutoSeeded(top.id, ctx) && reveals.length > 1", "top.feature && reveals.length > 1");
    })],
    ["5. várias orientações por sessão", "SESSION_BUDGET_EXCEEDED", src("orchestrator", "if (ctx.session.shownIds.length >= sessionBudget(ctx)) return null;", "if (false) return null;")],
    ["6. SHOWN sem evidência de render", "SHOWN_WITHOUT_EVIDENCE", src("orchestrator", 'records[id] = { status: "SHOWN", at: now, evidence: "render" };', 'records[id] = { status: "SHOWN", at: now, evidence: "seed" };')],
    ["7. evidência rebaixa um 'Entendi'", "SHOWN_WITHOUT_EVIDENCE", src("orchestrator", '    if (previous && previous.status !== "AUTO_SEEDED" && previous.status !== "SNOOZED") continue;\n', "")],
    ["8. lote marca áreas que não mostrou", "BATCH_MARKS_UNLISTED", src("orchestrator", "coveredIds: listed.map((definition) => definition.id),", "coveredIds: reveals.map((definition) => definition.id),")],
    ["9. memória de disponibilidade apagada", "RELOCKED", src("orchestrator", "const merged = new Set([...state.availabilityMemory, ...add]);", "const merged = new Set(add);")],
    ["10. conta madura trancada em Imersão/Cultura", "RELOCKED", src("discovery", '  if (FEATURE_AVAILABILITY[id].lockedBehavior === "HARD" && isMatureDiscoveryAccount(state)) return "AVAILABLE";\n', "")],
    ["11. navegação ignora a memória", "RELOCKED", src("hook", "return mergeStickyVisibility(derived, [...confirmed, ...remembered]);", "return mergeStickyVisibility(derived, confirmed);")],
    ["12. escolher conta como mostrada", "SELECTION_COUNTS_AS_SHOWN", src("host", "      setCurrentGuidance(fresh);\n      if (fresh.definition.priority", "      setGuidanceSession(recordShownInSession(getGuidanceSession(), fresh));\n      setCurrentGuidance(fresh);\n      if (fresh.definition.priority")],
    ["13. sair da tela grava 'visto'", "LEAVE_MARKS_SEEN", src("host", "    if (!shown || shown.definition.surfaces.includes(pathname)) return;\n    setCurrentGuidance(null);", "    if (!shown || shown.definition.surfaces.includes(pathname)) return;\n    updateGuidance((state) => applyGuidanceAction(state, shown, \"primary\", Date.now()));\n    setCurrentGuidance(null);")],
    ["14. coachmark conta antes de posicionar", "SHOWN_WITHOUT_EVIDENCE", src("host", "useRenderEvidence(presentation, cardRef, position !== null);", "useRenderEvidence(presentation, cardRef, true);")],
    ["15. sem 'Pular dicas'", "GUIDANCE_ACTION_MISSING", src("host", 'data-guidance-action="skip_all" onClick', "onClick")],
    ["16. evidência instantânea", "SHOWN_WITHOUT_EVIDENCE", src("orchestrator", "export const GUIDANCE_RENDER_EVIDENCE_MS = 1200;", "export const GUIDANCE_RENDER_EVIDENCE_MS = 0;")],
  ],
  "device-traces": [
    ["17. Continuar sem rastro", "TRACE_EVENT_MISSING", src("player", '      if (primary) traceLessonStep({ ...context, event: "continue_pressed" });\n', "")],
    ["18. áudio 'começou' sem rastro", "TRACE_EVENT_MISSING", src("audio", '  else if (entry.event === "start") traceCurrentLessonStep("audio_started");', "")],
    ["19. fala 'funciona' só com permissão", "SPEECH_FROM_PERMISSION", src("speechDiagnostics", 'return d.microphonePermission === "granted" && d.recognitionService === "yes" && d.zhCnSupport === "SUPPORTED";', 'return d.microphonePermission === "granted";')],
    ["20. gravação 'provada' sem reprodução", "RECORDING_WITHOUT_PLAYBACK", src("speechDiagnostics", '    d.temporaryFileCreated === "yes" &&\n    d.playbackPlayed === "yes"', '    d.temporaryFileCreated === "yes"')],
    ["21. gravação 'provada' sem arquivo", "RECORDING_WITHOUT_FILE", src("speechDiagnostics", '    d.temporaryFileCreated === "yes" &&\n', "")],
    ["22. diagnóstico em production_beta", "DIAGNOSTICS_IN_PRODUCTION", src("speechDiagnostics", "    if (isProductionBetaEnv()) return false;\n", "")],
    ["23. plugin devolve o caminho do áudio", "RECORDING_PATH_LEAK", src("plugin", 'ret.put("fileBytes", exists ? practiceFile.length() : 0);', 'ret.put("fileBytes", exists ? practiceFile.length() : 0);\n            ret.put("path", practiceFile.getAbsolutePath());')],
    ["24. sem 'Gravar e comparar' no fallback", "SPEECH_FALLBACK_MISSING", src("pronunciation", 'data-testid="speech-fallback-record"', 'data-testid="speech-fallback-other"')],
    ["25. trilha ligada em produção", "TRACE_IN_PRODUCTION", src("trace", 'return env.DEV === true || env.VITE_USE_TEST_FIXTURES === "true";', "return true;")],
    ["26. reprodução não alimenta o diagnóstico", "RECORDING_WITHOUT_PLAYBACK", src("selfCompare", 'playbackPlayed: "yes"', 'playbackPlayed: "unknown"')],
  ],
  "auth-recovery": [
    ["27. conta inexistente responde diferente", "RECOVERY_ENUMERATION", src("recovery", '  return "SENT_NEUTRAL";\n}\n\n/** Código errado', '  return error.message ? ("USER_NOT_FOUND" as RecoveryRequestOutcome) : "SENT_NEUTRAL";\n}\n\n/** Código errado')],
    ["28. erro cru do servidor na tela", "RECOVERY_ENUMERATION", src("authService", '  return { status: "ok", message: RECOVERY_NEUTRAL_MESSAGE };', '  return { status: "error", message: error.message };')],
    ["29. verifyOtp com tipo errado", "RECOVERY_NOT_CANONICAL", src("authService", 'token, type: "recovery" })', 'token, type: "email" })')],
    ["30. OTP no console", "OTP_LOGGED", src("forgot", "    const result = await verifyRecoveryCode(email, code);", '    console.info("otp", code);\n    const result = await verifyRecoveryCode(email, code);')],
    ["31. OTP no storage", "OTP_LOGGED", src("forgot", "onChange={(event) => setCode(normalizeRecoveryCode(event.target.value))}", 'onChange={(event) => { localStorage.setItem("code", event.target.value); setCode(normalizeRecoveryCode(event.target.value)); }}')],
    ["32. modelo de e-mail aplicado em silêncio", "TEMPLATE_SILENTLY_APPLIED", json((s) => { s.src.supabaseConfig += '\n[auth.email.template.recovery]\ncontent_path = "./supabase/templates/recovery.html"\n'; })],
    ["33. modelo sem o código", "RECOVERY_TEMPLATE_MISSING", json((s) => { s.src.template = s.src.template.split("{{ .Token }}").join("{{ .ConfirmationURL }}"); })],
    ["34. estágio do cadastro sem marco", "SIGNUP_STAGE_MISSING", src("comecar", '    markSignupStage("confirmation_required");\n', "")],
    ["35. e-mail no log de falha", "SIGNUP_PII_LOGGED", src("signupTrace", '  if (!text || /@/.test(text)) return "UNKNOWN";', '  if (!text) return "UNKNOWN";')],
    ["36. finalização gira para sempre", "SIGNUP_INFINITE_LOADING", src("finalize", "const outcome = await withSignupTimeout(", "const outcome = await ((p: Promise<unknown>, _ms: number) => p)(")],
    ["37. recuperação sem voltar ao Login", "RECOVERY_NOT_CANONICAL", src("authService", "    await client?.auth.signOut();", "    void client;")],
  ],
  "review-composer": [
    ["38. sessão longa em um bloco", "ROUND_SIZE_OUT_OF_RANGE", src("composer", "  if (safe <= REVIEW_ROUND_MAX) return Math.max(1, safe);", "  return safe;")],
    ["39. mesmo alvo colado", "CONSECUTIVE_SAME_TARGET", src("composer", "    let pick = remaining.findIndex((entry) => targetOf(entry) !== previous);", "    let pick = 0;")],
    ["40. composer descarta itens", "COMPOSER_DROPS_ITEMS", src("composer", "    out.push(chosen);", "    if (targetOf(chosen) !== previous) out.push(chosen);")],
    ["41. hànzì principal pequeno", "HANZI_TOO_SMALL", src("composer", 'main: "text-[64px] leading-tight sm:text-[80px]",', 'main: "text-5xl leading-tight sm:text-6xl",')],
    ["42. alvo de tamanho abaixo do piso", "HANZI_TOO_SMALL", src("composer", "main: { min: 64, max: 80 },", "main: { min: 48, max: 60 },")],
    ["43. repetição sempre igual", "REPETITION_NOT_TRANSFORMED", src("reviewBuilder", "const reps = input.item.reps + (input.formatShift ?? 0);", "const reps = input.item.reps;")],
    ["44. revisão ignora o composer", "COMPOSER_NOT_WIRED", src("review", "() => composeReviewQueue(advancedReviewAccess.limited ? modeQueue.slice(0, FREE_REVIEW_LIMIT) : modeQueue, reviewTargetOf),", "() => (advancedReviewAccess.limited ? modeQueue.slice(0, FREE_REVIEW_LIMIT) : modeQueue),")],
    ["45. feedback denso no acerto", "FEEDBACK_TOO_DENSE", src("review", '{correct !== true && <p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">{exercise.explanation}</p>}', '<p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">{exercise.explanation}</p>')],
    ["46. composer agenda SRS", "NEW_SRS", json((s) => { s.src.composer += '\nexport const scheduleVia = "dueItems";\n'; })],
    ["47. motor de SRS novo", "NEW_SRS", json((s) => { s.srcFileNames.push("src/lib/SrsV2.ts"); })],
  ],
  "product-release": [
    ["48. cena sem objetivo", "STORY_SHELL_INCOMPLETE", src("immersion", "data-story-objective", "data-story-goal-hidden")],
    ["49. sem destaque de quem fala", "STORY_SHELL_INCOMPLETE", src("immersion", '      data-active-speaker="true"\n', "")],
    ["50. Amigos fora da primeira dobra", "PROFILE_NOT_DISCOVERABLE", src("profile", '<ActionButton to="/amigos"', '<ActionButton to="/ligas"')],
    ["51. Sair escondido", "LOGOUT_NOT_DISCOVERABLE", src("more", "onClick={() => void signOut()}", "onClick={() => undefined}")],
    ["52. Excluir conta no bloco rápido", "DELETE_NOT_SEPARATED", src("more", '{t("navigation.appearance")}\n        </Link>', '{t("navigation.appearance")}\n        </Link>\n        <Link to="/conta#excluir">Excluir conta</Link>')],
    ["53. recompensa volta a ser o CTA", "REWARD_PRIMARY", src("player", "        if (!guidedShell) return;", "        return;")],
    ["54. tom ensinado com a língua", "TONGUE_FOR_TONE", json((s) => { s.src.toneContour += '\nexport const TONE_HINT = "posição da língua";\n'; })],
    ["55. PASS físico automático no manifesto", "FAKE_PHYSICAL_PASS", json((s) => { s.manifest.p1.MOBILE_SIGNUP_FAILURE.physical = "PASS"; })],
    ["56. PASS físico sem aparelho no QA", "FAKE_PHYSICAL_PASS", json((s) => { s.qa = { ...s.qa, nativeSpeechRecognitionZhCn: "PASS", deviceModel: null }; })],
    ["57. passo do owner escondido", "OWNER_ACTION_HIDDEN", json((s) => { s.manifest.recoveryTemplate.ownerApplied = "PASS"; })],
    ["58. resíduo da RC2.2.16 'concluído'", "RESIDUAL_HIDDEN", json((s) => { s.manifest.rc2_2_16_residual.items.uploadKey.status = "COMPLETE"; })],
    ["59. base ambígua", "BASE_SHA_AMBIGUOUS", json((s) => { s.manifest.RC2_2_19_BASE_SHA = "HEAD"; })],
    ["60. PR automático", "AUTO_PR", json((s) => { s.manifest.prOpenedAutomatically = true; })],
    ["61. compras Android ligadas", "PURCHASES_ENABLED", json((s) => { s.manifest.regression.androidInAppPurchase = "ENABLED"; })],
    ["62. package muda", "PACKAGE_CHANGED", src("capacitorConfig", 'appId: "longyu.noba.com"', 'appId: "com.longyu.app"')],
    ["63. #273 tocada", "TOUCHED_273", json((s) => { s.rc2CandidateSha256 = "0".repeat(64); })],
    ["64. exceção de freeze ausente", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "RC2_2_19_GUIDED_SIMPLE_VERIFIED_EXCEPTION", "RC2_2_19_UNREGISTERED")],
    ["65. desenhos de articulação somem", "ARTICULATION_MISSING", src("articulation", '    id: "j-q-x",\n    sounds:', '    id: "j-q-x-removed",\n    sounds:')],
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
