#!/usr/bin/env node
/**
 * RC2.2.22 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-22-closed-beta-candidate.mjs validate <área>
 *   node scripts/rc2-2-22-closed-beta-candidate.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação é pega com o código certo.
 * Os números [n] são as 32 mutações obrigatórias da spec RC2.2.22.
 * Gates em scripts/lib/rc2-2-22-gates.mjs.
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-22-gates.mjs";

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
const both = (...mutations) => (s) => mutations.forEach((mutate) => mutate(s));

const PHYSICAL_TYPES = 'export const PHYSICAL_EVIDENCE_TYPES = ["OWNER_OBSERVED", "TESTER_OBSERVED", "SCREEN_RECORDING", "MANUAL_SCREENSHOT", "DIAGNOSTIC_TRACE"] as const;';

const MUTATIONS = {
  security: [
    ["triagem sem decisão", "SECURITY_TRIAGE_INCOMPLETE", json((s) => { s.triage.findings[0].decision = ""; })],
    ["triagem sem caminho de dependência", "SECURITY_TRIAGE_INCOMPLETE", json((s) => { delete s.triage.findings[1].dependencyPath; })],
    ["vulnerabilidade ignorada em silêncio", "SECURITY_SILENTLY_IGNORED", json((s) => { s.triage.findings[0].decision = "IGNORED"; })],
    ["audit fix --force automático", "AUDIT_FIX_FORCE", json((s) => { s.scriptsAndWorkflows.push([".github/workflows/fix.yml", "run: npm audit fix --force"]); })],
    ["política permite --force", "AUDIT_FIX_FORCE", json((s) => { s.triage.policy.npmAuditFixForce = "ALLOWED"; })],
    ["limiar do audit rebaixado", "AUDIT_THRESHOLD_LOWERED", src("securityWorkflow", "npm audit --audit-level=moderate", "npm audit --audit-level=critical")],
    ["audit desligado com continue-on-error", "AUDIT_DISABLED", src("securityWorkflow", "      - name: Audit all dependencies\n", "      - name: Audit all dependencies\n        continue-on-error: true\n")],
    ["workflow de segurança removido", "SECURITY_WORKFLOW_REMOVED", json((s) => { s.src.securityWorkflow = ""; })],
    ["full audit vermelho dito verde", "SECURITY_RED_HIDDEN", json((s) => { s.triage.state.afterFix.full.total = 2; })],
  ],
  readiness: [
    ["[1] segurança vermelha vira candidato", "SECURITY_RED_CANDIDATE", src("readiness", '  if (!securityGreen(input.security)) engineering.push("SECURITY_NOT_GREEN");\n', "")],
    ["[2] P1 físico ignorado", "P1_IGNORED", src("readiness", '  if (!(input.bugs.releaseBlockingP1 === 0)) candidate.push("RELEASE_BLOCKING_P1_OPEN");\n', "")],
    ["[3] voz própria NOT_RUN vira candidato", "SELF_PLAYBACK_NOT_REQUIRED", src("readiness", '  if (!physicalPass(input.physical.selfPlaybackAudible)) candidate.push("SELF_PLAYBACK_NOT_PROVEN");\n', "")],
    ["[4] cadastro NOT_RUN vira candidato", "SIGNUP_NOT_REQUIRED", src("readiness", '  if (!physicalPass(input.physical.mobileSignup)) candidate.push("MOBILE_SIGNUP_NOT_PROVEN");\n', "")],
    ["[5] recuperação NOT_RUN vira candidato", "RECOVERY_NOT_REQUIRED", src("readiness", '  if (!physicalPass(input.physical.passwordRecovery)) candidate.push("PASSWORD_RECOVERY_NOT_PROVEN");\n', "")],
    ["[6] beco sem saída ignorado", "DEAD_END_IGNORED", src("readiness", '  if (input.criticalLessonDeadEnd) candidate.push("CRITICAL_LESSON_DEAD_END");\n', "")],
    ["[7] Play install NOT_RUN vira Closed Beta Ready", "PLAY_INSTALL_NOT_REQUIRED", src("readiness", '  if (!playPass(input.play.internalInstall)) ready.push("PLAY_INTERNAL_INSTALL_NOT_PROVEN");\n', "")],
    ["[8] N→N+1 NOT_RUN vira Closed Beta Ready", "N_TO_N_PLUS_1_NOT_REQUIRED", src("readiness", '  if (!playPass(input.play.nToNPlus1)) ready.push("N_TO_N_PLUS_1_NOT_PROVEN");\n', "")],
    ["[26] feedback humano vira PASS físico", "FEEDBACK_AS_PHYSICAL", src("readiness", PHYSICAL_TYPES, PHYSICAL_TYPES.replace('"DIAGNOSTIC_TRACE"]', '"DIAGNOSTIC_TRACE", "HUMAN_FEEDBACK_FORM"]'))],
    ["[27] screenshot automatizado vira PASS físico", "SCREENSHOT_AS_PHYSICAL", src("readiness", PHYSICAL_TYPES, PHYSICAL_TYPES.replace('"DIAGNOSTIC_TRACE"]', '"DIAGNOSTIC_TRACE", "AUTOMATED_SCREENSHOT"]'))],
    ["[28] APK de debug vira PASS da Play", "DEBUG_APK_AS_PLAY", src("readiness", '  return check!.buildChannel === "PLAY_INTERNAL" || check!.buildChannel === "PLAY_CLOSED";', "  return true;")],
    ["PASS sem data", "PASS_WITHOUT_DATE", src("readiness", "  if (!check || check.status !== \"PASS\" || !check.testedAt) return false;", "  if (!check || check.status !== \"PASS\") return false;")],
    ["build Android vermelho vira candidato", "ANDROID_BUILD_RED_CANDIDATE", src("readiness", '  if (input.androidBuild !== "PASS") engineering.push("ANDROID_BUILD_NOT_GREEN");\n', "")],
    ["estado declarado inflado", "READINESS_STATE_INFLATED", json((s) => { s.readiness.declaredState = "CANDIDATE"; })],
    ["Closed Beta GO no documento", "CLOSED_BETA_PREMATURE", json((s) => { s.readiness.CLOSED_BETA = "GO"; })],
    ["PASS físico por E2E no documento", "FAKE_PHYSICAL_PASS", json((s) => { s.readiness.physical.selfPlaybackAudible = { status: "PASS", evidenceType: "E2E", testedAt: "2026-10-01", buildChannel: "QA_APK" }; })],
    ["P1 do documento divergente do manifesto", "P1_IGNORED", json((s) => { s.readiness.bugs.releaseBlockingP1 = 0; })],
    ["seção de prontidão faltando", "READINESS_SECTION_MISSING", json((s) => { delete s.readiness.physicalSecondaryDevices; })],
  ],
  "device-compatibility": [
    ["[13] resultado de um aparelho generalizado (resumo)", "OEM_GENERALIZED", src("compat", "    if (!device.tested || !device.manufacturer) continue;", "    if (!device.manufacturer) continue;")],
    ["[13b] linha 'todos os Androids' na matriz", "OEM_GENERALIZED", json((s) => { s.deviceQa.recognizerMatrix.push({ deviceId: "D01", manufacturer: "ALL", recognizer: "service", zhCn: true, result: "NETWORK_ONLY" }); })],
    ["[14] limite do aparelho vira bug do Longyu", "CAPABILITY_AS_LONGYU_BUG", src("compat", '  if (probe.zhCnSupported === false && /LANGUAGE/.test(code)) return "DEVICE_CAPABILITY_LIMITATION";\n', "")],
    ["[15] bug do Longyu vira limite do aparelho", "LONGYU_BUG_HIDDEN", src("compat", '  if (!probe) return "LONGYU_BUG";', '  if (!probe) return "DEVICE_CAPABILITY_LIMITATION";')],
    ["[15b] Gravar e comparar vira limite do aparelho", "LONGYU_BUG_HIDDEN", src("compat", '  if (evidence.area !== "speech" && evidence.area !== "tts") {', '  if (evidence.area === "auth") {')],
    ["hack por marca no app", "OEM_HACK", json((s) => { s.appSources["src/lib/fake.ts"] = 'if (manufacturer === "samsung") useOnDevice = false;'; })],
    ["aparelho inventado na matriz", "DEVICE_INVENTED", json((s) => { s.deviceQa.recognizerMatrix.push({ deviceId: "D07", manufacturer: "google", recognizer: "on_device", zhCn: true, result: "FULL" }); })],
    ["testes da RC2.2.21 não importados", "RC2_2_21_TESTS_NOT_IMPORTED", json((s) => { delete s.deviceQa.tests.selfPlaybackAudible; })],
    ["histórico resetado", "HISTORY_RESET", json((s) => { s.deviceQa.importedFrom.historyReset = true; })],
    ["prioridade sem voz própria", "PRIORITY_MISSING", json((s) => { s.deviceQa.priorityOrder = s.deviceQa.priorityOrder.filter((id) => id !== "selfPlaybackAudible"); })],
    ["teste de Play PASS com APK de debug", "DEBUG_APK_AS_PLAY", json((s) => { Object.assign(s.deviceQa.tests.playInternalInstall, { status: "PASS", evidenceType: "OWNER_OBSERVED", testedAt: "2026-10-01", buildSha: "abc", deviceClass: "OWNER_DEVICE", buildChannel: "DEBUG_APK" }); })],
    ["matriz de reconhecimento com estado errado", "RECOGNIZER_MATRIX_WRONG", src("compat", '  if (probe.onDeviceAvailable && probe.zhCnInstalledOnDevice) return "FULL";', '  if (probe.onDeviceAvailable) return "FULL";')],
  ],
  "beta-feedback": [
    ["[9] relato captura e-mail", "FEEDBACK_PII", both(
      src("betaQa", 'export const ISSUE_CONTEXT_FIELDS = ["route", "lessonId", "stepKind", "build", "viewport", "platform", "deviceClass"] as const;', 'export const ISSUE_CONTEXT_FIELDS = ["route", "lessonId", "stepKind", "build", "viewport", "platform", "deviceClass", "email"] as const;'),
      src("betaQa", "    if (typeof value === \"string\" && value && !looksLikePiiOrSecret(value)) context[field] = value.slice(0, 80);", "    if (typeof value === \"string\" && value) context[field] = value.slice(0, 80);")
    )],
    ["[10] relato captura OTP", "FEEDBACK_OTP", src("betaQa", '  if (comment && looksLikePiiOrSecret(comment)) errors.push("COMMENT_HAS_PII");\n', "")],
    ["[11] relato captura transcrição", "FEEDBACK_TRANSCRIPT", src("betaQa", "  const events = sanitizeMobileDiagnostic(\n    (input.events ?? [])", "  const events = (\n    (input.events ?? [])")],
    ["[11b] texto digitado entra no contexto", "FEEDBACK_TRANSCRIPT", src("betaQa", '"platform", "deviceClass"] as const;', '"platform", "deviceClass", "answerText"] as const;')],
    ["[26b] sessão humana marca PASS físico", "FEEDBACK_AS_PHYSICAL", src("betaQa", '  if ("physicalPass" in session || "status" in session || "evidenceType" in session) errors.push("SESSION_CLAIMS_PHYSICAL_PASS");\n', "")],
    ["tester por e-mail", "HUMAN_SESSION_PII", src("betaQa", '  if (!/^T\\d{2,3}$/.test(String(session.testerId ?? ""))) errors.push("TESTER_ID_NOT_OPAQUE");\n', "")],
    ["relato vira PASS físico", "FEEDBACK_AS_PHYSICAL", src("betaQa", "      physicalPass: false,\n    },", "      physicalPass: true as false,\n    },")],
    ["relato manda para nuvem nova", "NEW_CLOUD_FEEDBACK", json((s) => { s.src.reporter += "\nvoid fetch('/api/beta-issue');\n"; })],
    ["entrada aparece na produção", "FEEDBACK_IN_PRODUCTION", src("appShell", 'import.meta.env.VITE_BETA_QA === "true" && (', "true && (")],
    ["Beta QA ligado na Production Beta", "FEEDBACK_IN_PRODUCTION", src("betaQa", '  return env.VITE_BETA_QA === "true" || deviceQaEnabled(env);', "  return true;")],
  ],
  "product-lint": [
    ["[16] repetição de alvo escapa da auditoria", "REPETITION_AUDIT_BYPASSED", src("lint", "export const MIN_SAME_QUESTION_GAP = 3;", "export const MIN_SAME_QUESTION_GAP = 1;")],
    ["[17] sessão guiada com várias ações principais", "MULTIPLE_PRIMARY_CTAS", src("lint", "export const GUIDED_PRIMARY_CTA_LIMIT = 1;", "export const GUIDED_PRIMARY_CTA_LIMIT = 3;")],
    ["[18] orçamento de popups removido (sessão)", "POPUP_BUDGET_REMOVED", src("betaQa", "{ coachmarks: 2, unlockReveals: 1, ceremonies: 1, permissions: 1 }", "{ coachmarks: 99, unlockReveals: 99, ceremonies: 99, permissions: 99 }")],
    ["[18b] orçamento de orientações removido", "POPUP_BUDGET_REMOVED", src("orchestrator", "export const GUIDANCE_SESSION_BUDGET = 1;", "export const GUIDANCE_SESSION_BUDGET = 99;")],
    ["lint cego para tela lotada", "COMPLEXITY_LINT_BLIND", src("lint", "  if (score >= 4) return \"OVERLOADED\";", "  if (score >= 99) return \"OVERLOADED\";")],
    ["repetição válida marcada como ruim", "REPETITION_FALSE_ALARM", src("lint", "  return `${taskFamily(step.kind)}|${prompt}|${answer}`;", "  return `X|${text(step.hanzi) || text(step.answer)}|`;")],
    ["auditoria das 20 primeiras incompleta", "FIRST20_AUDIT_MISSING", json((s) => { s.first20.sessions.pop(); })],
    ["duração observada inventada", "DURATION_INVENTED", json((s) => { s.first20.sessions[0].observedDurationMedianMin = 4.5; s.reports.human = s.reports.human.split("OBSERVED").join("OBS"); })],
    ["achado do lint escondido", "LINT_FINDING_HIDDEN", json((s) => { s.bugs.bugs = s.bugs.bugs.filter((bug) => !/TRANSFER/.test(bug.id)); })],
  ],
  stability: [
    ["[19] update reseta orientação", "GUIDANCE_RESET", src("upgrade", '    violations.push("GUIDANCE_RESET");', "    void 0;")],
    ["[20] update duplica recompensa", "REWARD_DUPLICATED", src("upgrade", '    violations.push("REWARD_DUPLICATED");', "    void 0;")],
    ["[21] offline bloqueia lição local", "OFFLINE_BLOCKS_LESSON", json((s) => { s.src.player += "\nfunction Gate(){ const online = useOnline(); if (!online) return null; }\n"; })],
    ["[22] toque rápido vaza o player", "AUDIO_PLAYER_LEAK", src("plugin", "            releasePracticePlayer();\n            JSObject volume = mediaVolume();", "            JSObject volume = mediaVolume();")],
    ["[23] árbitro com dois donos", "AUDIO_TWO_OWNERS", src("arbiter", "      stopPrevious?.();", "      void stopPrevious;")],
    ["[24] gravação fica depois de sair", "RECORDING_KEPT", src("selfCompare", "      if (native) void nativeDeletePracticeRecording();\n", "")],
    ["[25] falha de fala bloqueia a lição", "SPEECH_BLOCKS_LESSON", src("speechFailure", '  actions.push("continue_without_speaking");', "")],
    ["contadores de recurso somem", "RESOURCE_COUNTERS_MISSING", src("plugin", "public void getResourceCounters(PluginCall call)", "public void getCounters(PluginCall call)")],
    ["liberar duas vezes deixa contador negativo", "RESOURCE_LEAK", src("resources", "    if (released) return;\n    released = true;\n    dec();", "    released = true;\n    dec();\n    observers -= 1;")],
    ["reabrir reseta orientações vistas", "GUIDANCE_RESET", src("orchestrator", 'if (legacy && r.status === "SEEN") {', 'if (legacy || r.status === "SHOWN") {')],
  ],
  "release-truth": [
    ["[12] pacote de bug com token", "BUG_PACKET_SECRET", json((s) => { s.bugs.bugs[0].diagnosticSnapshot = { detail: ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxIn0", "abcdefghij"].join(".") }; })],
    ["[29] package muda", "PACKAGE_CHANGED", src("capacitorConfig", 'appId: "longyu.noba.com"', 'appId: "longyu.outro.app"')],
    ["[30] compras Android ligadas", "PURCHASES_ENABLED", src("subscription", 'export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;', 'export const ANDROID_IN_APP_PURCHASE = "ENABLED" as const;')],
    ["[31] Production Play automático", "PRODUCTION_PLAY_ENABLED", src("releaseIdentity", 'export const MAX_AUTOMATIC_CHANNEL = "internal";', 'export const MAX_AUTOMATIC_CHANNEL = "production";')],
    ["[32] #273 tocada", "TOUCHED_273", json((s) => { s.rc2CandidateSha256 = "0".repeat(64); })],
    ["P1 rebaixado para liberar Beta", "P1_IGNORED", json((s) => { s.bugs.bugs.find((bug) => bug.id === "SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID").severity = "P2"; })],
    ["P1 sem owner", "P1_WITHOUT_OWNER", json((s) => { s.bugs.bugs[0].owner = null; })],
    ["falha física sem estrutura", "PHYSICAL_FAIL_UNSTRUCTURED", json((s) => { s.bugs.bugs.push({ id: "NEW_FAIL", severity: "P1", releaseBlocking: true, status: "OPEN", discovery: "PHYSICAL_TEST", owner: "OWNER", reproduction: "x" }); })],
    ["painel maquiado", "BUG_COUNTER_DRIFT", json((s) => { s.bugs.panel.P1.open = 0; })],
    ["causa comum de um bug só", "ROOT_CAUSE_NOT_SHARED", json((s) => { s.bugs.rootCauses[0].bugs = ["SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID"]; })],
    ["Closed Beta GO no manifesto", "CLOSED_BETA_PREMATURE", json((s) => { s.manifest.CLOSED_BETA = "GO"; })],
    ["sessão humana inventada no relatório", "HUMAN_SESSION_INVENTED", json((s) => { s.reports.human = s.reports.human.replace("## OBSERVED\n", "## OBSERVED\n\nT01 concluiu a primeira lição sozinho.\n"); })],
    ["e-mail de tester no relatório", "HUMAN_SESSION_PII", json((s) => { s.reports.human += "\ntester: ana@exemplo.com\n"; })],
    ["relatório sem NOT_TESTED", "REPORT_EVIDENCE_COLLAPSED", json((s) => { s.reports.human = s.reports.human.split("NOT_TESTED").join("PENDENTE"); })],
    ["base ambígua", "BASE_SHA_AMBIGUOUS", json((s) => { s.base.RC2_2_22_BASE_SHA = "579f65275c1e6e145e667700f3c256fffc4f2eec"; })],
    ["exceção de freeze ausente", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "RC2_2_22_CLOSED_BETA_CANDIDATE_EXCEPTION", "RC2_2_22_UNREGISTERED")],
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
