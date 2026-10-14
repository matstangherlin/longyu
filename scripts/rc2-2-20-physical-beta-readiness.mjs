#!/usr/bin/env node
/**
 * RC2.2.20 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-20-physical-beta-readiness.mjs validate <área>
 *   node scripts/rc2-2-20-physical-beta-readiness.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação é pega com o código certo.
 * Os números [n] são as 24 mutações obrigatórias da spec RC2.2.20.
 * Gates em scripts/lib/rc2-2-20-gates.mjs.
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-20-gates.mjs";

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
  "physical-evidence": [
    ["[1] PASS físico automático na matriz", "FAKE_PHYSICAL_PASS", json((s) => { s.matrix.tests.guidedTryAudioDevice.status = "PASS"; })],
    ["[1b] registro nasce PASS", "PHYSICAL_PASS_AUTOMATIC", src("deviceQa", '[id, { status: "NOT_RUN" as DeviceQaStatus }]', '[id, { status: "PASS" as DeviceQaStatus }]')],
    ["[1c] código grava resultado físico fora do /qa/device", "PHYSICAL_PASS_AUTOMATIC", src("steps", "export const STALL_GUARD_MS = 2000;", 'export const STALL_GUARD_MS = 2000;\nsaveDeviceQaRegistry({});')],
    ["[1d] PASS sem evidência aceito", "PASS_WITHOUT_EVIDENCE", src("deviceQa", '    if (!result.evidenceType || !DEVICE_QA_EVIDENCE_TYPES.includes(result.evidenceType)) errors.push("PASS_WITHOUT_EVIDENCE");\n', "")],
    ["[1e] manifesto marca área como PHYSICAL PASS", "FAKE_PHYSICAL_PASS", json((s) => { s.manifest.areas.deviceQaSurface.physical = "PASS"; })],
    ["[1f] manifesto marca teste PASS sem a matriz", "FAKE_PHYSICAL_PASS", json((s) => { s.manifest.physicalTests.mobileSignupDevice = "PASS"; })],
    ["navegador/emulador vira PASS físico", "WEB_OR_EMULATOR_PASS", src("deviceQa", '    if (context.native === false || context.emulator === true) errors.push("PASS_ON_WEB_OR_EMULATOR");\n', "")],
    ["nota com PII aceita", "PII_STORED", src("deviceQa", "  if (/(^|\\D)\\d{6}(\\D|$)/.test(value)) return true;\n", "")],
    ["/qa/device na Production Beta", "QA_SURFACE_IN_PRODUCTION", src("deviceQa", '  return appEnv === "preview" || appEnv === "qa_candidate";', "  return true;")],
    ["página sem redirecionamento", "QA_SURFACE_IN_PRODUCTION", src("qaPage", '  if (!deviceQaEnabled()) return <Navigate to="/" replace />;\n', "")],
    ["segundo aparelho fingido", "FAKE_SECOND_DEVICE", json((s) => { s.matrix.deviceClasses.SECOND_ANDROID.available = true; })],
    ["base ambígua", "BASE_SHA_AMBIGUOUS", json((s) => { s.manifest.RC2_2_20_BASE_SHA = "main"; })],
    ["estados colapsados", "STATES_COLLAPSED", json((s) => { s.manifest.states = ["CODE_PASS"]; })],
    ["matriz crítica PASS com teste NOT_RUN", "FAKE_PHYSICAL_PASS", json((s) => { s.matrix.physicalCriticalMatrix = "PASS"; })],
  ],
  "device-contracts": [
    ["[2] orientação SHOWN sem render visível", "GUIDANCE_SHOWN_WITHOUT_RENDER", src("guidanceHost", "visibleSince + GUIDANCE_RENDER_EVIDENCE_MS - Date.now()", "visibleSince - Date.now()")],
    ["[2b] AUTO_SEEDED vira SHOWN na migração", "GUIDANCE_SHOWN_WITHOUT_RENDER", src("orchestrator", 'records[id] = { status: "AUTO_SEEDED", at, evidence: "migration" };', 'records[id] = { status: "SHOWN", at, evidence: "migration" };')],
    ["[3] conta madura re-tranca", "MATURE_RELOCKED", src("discoveryHook", "[...confirmed, ...remembered]", "[...confirmed]")],
    ["[3b] memória de disponibilidade encolhe", "MATURE_RELOCKED", src("orchestrator", "const merged = new Set([...state.availabilityMemory, ...add]);", "const merged = new Set([...add]);")],
    ["[4] clique conta como início do áudio", "AUDIO_CLICK_AS_START", src("steps", 'if (state === "STARTING") setListen((prev) => (prev === "HEARD" ? prev : "STARTING"));', 'if (state === "STARTING") setListen("PLAYING");')],
    ["[5] Continuar sem evento advanced", "CONTINUE_WITHOUT_ADVANCE", src("player", 'event: "advanced"', 'event: "completed"')],
    ["[5b] etapa travada pula sozinha", "STALL_AUTO_SKIP", src("steps", "onDone(last?.correct, last?.meta);", "onSkip?.();")],
    ["[6] permissão conta como reconhecimento", "PERMISSION_AS_RECOGNITION", src("speechDiagnostics", 'return recognitionProven(d) && d.recognitionStarted === "yes" && d.speechDetected === "yes" && d.recognitionResult === "yes";', 'return d.microphonePermission === "granted";')],
    ["[7] gravação provada sem arquivo", "RECORDING_WITHOUT_FILE", src("speechDiagnostics", '    d.temporaryFileCreated === "yes" &&\n    // RC2.2.20 — arquivo vazio nunca é gravação; reprodução que não começou não terminou.\n    d.fileBytes !== 0 &&', "    // sem arquivo")],
    ["[8] gravação provada sem reprodução", "RECORDING_WITHOUT_PLAYBACK", src("speechDiagnostics", '    d.playbackStarted !== "no" &&\n    d.playbackPlayed === "yes"', "    true")],
    ["[13] orientação durante o exercício", "POPUP_DURING_EXERCISE", src("orchestrator", "if (ctx.activeLearning || ctx.inputFocused || ctx.otherCeremonyActive) return null;", "if (ctx.inputFocused || ctx.otherCeremonyActive) return null;")],
    ["[13b] player ativo não conta como exercício", "POPUP_DURING_EXERCISE", src("guidanceHost", "activeLearning: Boolean(document.documentElement.dataset.lessonPlayer)", "activeLearning: false")],
    ["trilha de passo fora do APK de QA", "TRACE_NOT_ON_DEVICE", src("trace", "  if (deviceQaEnabled()) return true;\n", "")],
    ["trilha de áudio fora do APK de QA", "TRACE_NOT_ON_DEVICE", src("audio", "    if (deviceQaEnabled()) return true;\n", "")],
    ["etapa travada sem Recarregar", "STALL_FALLBACK_MISSING", src("steps", 'data-testid="step-stalled-reload"', 'data-testid="step-stalled-other"')],
    ["SelfCompare sem Preparando…", "SELF_COMPARE_STATE_MISSING", src("selfCompare", 't("player.selfComparePreparing")', 't("player.selfCompareRecord")')],
  ],
  "review-auth": [
    ["[9] mesmo alvo volta colado na Revisão", "REVIEW_SAME_TARGET_CLOSE", src("composer", "export const MIN_TARGET_GAP = 2;", "export const MIN_TARGET_GAP = 1;")],
    ["[10] Revisão ignora formatShift", "REVIEW_IGNORES_FORMAT_SHIFT", src("review", "formatShift: reviewOccurrenceAt(queue, pos, reviewTargetOf),", "formatShift: 0,")],
    ["[10b] construtor ignora formatShift", "REVIEW_IGNORES_FORMAT_SHIFT", src("reviewBuilder", "const reps = input.item.reps + (input.formatShift ?? 0);", "const reps = input.item.reps;")],
    ["alvo por ID (repetição semântica cega)", "SEMANTIC_REPETITION_BLIND", src("composer", "return surface ? `surface:${surface}` : fallbackKey;", "return fallbackKey;")],
    ["[14] cadastro sem prazo", "SIGNUP_INFINITE_SPINNER", src("signupTrace", "export const SIGNUP_REQUEST_TIMEOUT_MS = 25_000;", "export const SIGNUP_REQUEST_TIMEOUT_MS = Number.POSITIVE_INFINITY;")],
    ["[14b] cadastro ignora o prazo", "SIGNUP_INFINITE_SPINNER", src("comecar", "isSignupTimeout(outcome)", "false")],
    ["categoria de cadastro colapsada", "SIGNUP_CATEGORY_WRONG", src("signupTrace", '  if (/FAILED_TO_FETCH|NETWORK|OFFLINE|LOAD_FAILED|FETCH/.test(c)) return "NETWORK";\n', "")],
    ["[15] OTP persistido", "OTP_PERSISTED", src("forgot", "    const result = await verifyRecoveryCode(email, code);", '    localStorage.setItem("recovery", code);\n    const result = await verifyRecoveryCode(email, code);')],
    ["[16] OTP logado", "OTP_LOGGED", src("authService", '    const { data, error } = await client.auth.verifyOtp({ email: email.trim(), token, type: "recovery" });', '    console.info("otp", token);\n    const { data, error } = await client.auth.verifyOtp({ email: email.trim(), token, type: "recovery" });')],
    ["[17] código errado aceito", "RECOVERY_ACCEPTS_INVALID_OTP", src("authService", "    if (error || !data?.session) {", "    if (false) {")],
    ["falhas de fala com a mesma categoria", "SPEECH_FAILURE_COLLAPSED", src("speechFailure", '    case "timeout":\n      return "TIMEOUT";\n', "")],
    ["sem zh-CN sem Baixar suporte", "SPEECH_DEAD_END", src("speechFailure", '      if (opts.canDownload) actions.push("download_support");\n', "")],
  ],
  pedagogy: [
    ["[11] tom explicado pela língua", "TONGUE_FOR_TONE", json((s) => { s.src.toneContour += '\nexport const TONE_HINT = "posição da língua";\n'; })],
    ["[11b] contraste de articulação fala de tom", "TONGUE_FOR_TONE", src("coreBr", 'notePt: "g é um k sem sopro.', 'notePt: "g é um k sem sopro no 1º tom.')],
    ["[12] XP volta ao CTA principal da Jornada", "REWARD_IN_PRIMARY_CTA", src("lessonDetail", "            {primaryLabel}\n          </span>", "            {`${primaryLabel} +${maxXp} XP`}\n          </span>")],
    ["contraste zh/ch/sh some", "CORE_BR_CONTRAST_MISSING", src("coreBr", 'id: "zh-ch-sh",', 'id: "zh-ch-sh-removed",')],
    ["drill começa pelo quiz", "QUIZ_BEFORE_PERCEPTION", src("contrastDrill", 'useState<ContrastDrillStage>("see")', 'useState<ContrastDrillStage>("identify")')],
    ["identificar antes de ouvir", "QUIZ_BEFORE_PERCEPTION", src("contrastDrill", "disabled={!heardOrFailed || picked != null}", "disabled={picked != null}")],
    ["relatório V5A ausente", "V5A_REPORT_MISSING", json((s) => { s.docs.lexicalRecycling = false; })],
    ["exceção de freeze ausente", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "RC2_2_20_PHYSICAL_BETA_READINESS_EXCEPTION", "RC2_2_20_UNREGISTERED")],
  ],
  release: [
    ["[18] Perfil/Mais esconde Sair", "LOGOUT_HIDDEN", src("more", '{canSignOut ? <SignOutControl testId="more-sign-out" /> : null}', "{null}")],
    ["[18b] Sair com cara de Excluir", "LOGOUT_STYLED_AS_DELETE", src("conta", '{canSignOut ? <SignOutControl testId="conta-sign-out" /> : null}', '{canSignOut ? <button type="button" variant="danger" className="bg-wrong" data-testid="conta-sign-out">Sair</button> : null}')],
    ["[19] update reseta orientação (comparação cega)", "GUIDANCE_RESET", src("upgrade", '    violations.push("GUIDANCE_RESET");', "    void 0;")],
    ["[19b] reabrir o app reseta orientações vistas", "GUIDANCE_RESET", src("orchestrator", 'if (legacy && r.status === "SEEN") {', 'if (legacy || r.status === "SHOWN") {')],
    ["[20] update duplica recompensa (comparação cega)", "REWARD_DUPLICATED", src("upgrade", '    violations.push("REWARD_DUPLICATED");', "    void 0;")],
    ["[20b] XP duplicado passa", "XP_DUPLICATED", src("upgrade", '  if (after.points > before.points) violations.push("XP_DUPLICATED");\n', "")],
    ["[21] package muda", "PACKAGE_CHANGED", src("capacitorConfig", 'appId: "longyu.noba.com"', 'appId: "longyu.outro.app"')],
    ["[22] compras Android ligadas", "PURCHASES_ENABLED", src("subscription", 'export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;', 'export const ANDROID_IN_APP_PURCHASE = "ENABLED" as const;')],
    ["[23] #273 tocada", "TOUCHED_273", json((s) => { s.rc2CandidateSha256 = "0".repeat(64); })],
    ["[24] Production Play automático", "PRODUCTION_PLAY_ENABLED", src("releaseIdentity", 'export const MAX_AUTOMATIC_CHANNEL = "internal";', 'export const MAX_AUTOMATIC_CHANNEL = "production";')],
    ["[24b] manifesto habilita Production", "PRODUCTION_PLAY_ENABLED", json((s) => { s.manifest.regression.productionPlay = "ENABLED"; })],
    ["Closed Beta pronto sem Play", "CLOSED_BETA_PREMATURE", json((s) => { s.manifest.closedBeta.CLOSED_BETA_READY = true; })],
    ["Public Beta GO antecipado", "PUBLIC_BETA_PREMATURE", json((s) => { s.manifest.PUBLIC_BETA = "GO"; })],
    ["modelo de e-mail 'aplicado' pelo código", "OWNER_ACTION_HIDDEN", json((s) => { s.manifest.recoveryTemplate.ownerApplied = "PASS"; })],
    ["resíduo de release 'concluído'", "RESIDUAL_HIDDEN", json((s) => { s.manifest.releaseResidual.signedAab = "PASS"; })],
    ["segredo na evidência do owner", "SECRET_STORED", json((s) => { s.ownerActions.actions[4].evidence = "storePassword=abc"; })],
    ["Excluir ao lado de Sair", "DELETE_NOT_SEPARATED", json((s) => { s.src.more += "\n<DangerZone />\n"; })],
    ["PR automático", "AUTO_PR", json((s) => { s.manifest.prOpenedAutomatically = true; })],
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
