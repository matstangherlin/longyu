#!/usr/bin/env node
/**
 * RC2.2.25 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-25-product-experience-closure.mjs validate <área>
 *   node scripts/rc2-2-25-product-experience-closure.mjs test <área>
 *
 * Os números [n] são as 44 mutações obrigatórias da spec RC2.2.25 (as sem
 * número reforçam a mesma área). Gates em scripts/lib/rc2-2-25-gates.mjs.
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-25-gates.mjs";

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
const bug = (s, id) => s.bugs.bugs.find((item) => item.id === id);

const MUTATIONS = {
  "gold-standard": [
    ["[1] padrão-ouro perde 'sem cartão dentro de cartão'", "GOLD_STANDARD_INCOMPLETE", src("gold", '  { id: "NO_CARD_IN_CARD", rule: "sem cartão dentro de cartão" },\n', "")],
    ["[2] dashboard vira permitido", "GOLD_STANDARD_INCOMPLETE", src("gold", '{ id: "NO_DASHBOARD",', '{ id: "DASHBOARD_OK",')],
  ],
  "stepkind-classification": [
    ["[3] StepKind sem contrato promovido a nativo", "STEPKIND_CLASSIFIER_LIES", src("gold", '  if (!contract) return "LEGACY_PRESENTATION";', '  if (!contract) return "GUIDED_NATIVE";')],
    ["[4] conversa cai em apresentação legada", "STEPKIND_LEGACY", src("gold", 'if (contract.layout === "GUIDED_ADAPTER" || contract.layout === "COMPLEX_INLINE") return "GUIDED_COMPATIBLE";', 'if (contract.layout === "GUIDED_ADAPTER") return "GUIDED_COMPATIBLE";')],
  ],
  "all-lessons-audit": [
    ["[5] amostragem em vez de 134 aulas", "LESSONS_SAMPLED", json((s) => { s.inventory.totals.lessons = 20; })],
    ["[6] aulas Pro fora da auditoria", "PREMIUM_NOT_AUDITED", json((s) => { s.inventory.totals.premiumLessons = 0; for (const row of s.inventory.lessons) row.premium = false; })],
    ["[7] StepKind legado escondido", "STEPKIND_LEGACY", json((s) => { s.inventory.stepKinds.push({ kind: "legacy_card_only", guidedClass: "LEGACY_PRESENTATION", occurrences: 1, lessons: 1, premiumLessons: 0 }); })],
  ],
  "surface-inventory": [
    ["[8] Conta some do inventário", "SURFACE_MISSING", json((s) => { s.inventory.surfaces = s.inventory.surfaces.filter((row) => row.id !== "CONTA"); })],
    ["[9] APK PASS sem teste físico", "FAKE_APK_PASS", json((s) => { s.inventory.surfaces[0].apkState = "PASS"; })],
    ["aceite do owner inventado", "FAKE_OWNER_ACCEPTANCE", json((s) => { s.inventory.surfaces[0].ownerAccepted = true; })],
  ],
  "density-score": [
    ["[10] atividade BUSY aceita", "BUSY_ACTIVITY_ACCEPTED", src("gold", '  return density === "MINIMAL" || density === "GOOD";', '  return density !== "OVERLOADED";')],
    ["[11] cartão dentro de cartão de graça", "CARD_IN_CARD_FREE", src("gold", "    Math.max(0, input.cardDepth - 1) * 3 +", "    0 +")],
    ["[12] densidade não medida no E2E", "DENSITY_NOT_MEASURED", src("e2e", "activityDensityAccepted(metrics.density)", "true")],
  ],
  "hub-activity-modes": [
    ["[13] Revisão com TabBar na rodada", "ACTIVITY_KEEPS_CHROME", src("review", "useFocusActivity(sessionReadyForHotkeys && inRound);", "useFocusActivity(false);")],
    ["[14] Imersão com TabBar na história", "ACTIVITY_KEEPS_CHROME", src("immersion", "useFocusActivity(Boolean(selectedSession || selectedStory));", "useFocusActivity(false);")],
    ["[15] Fala dentro do hub", "ACTIVITY_INSIDE_HUB", src("fala", 'testId="fala-phrases"', 'testId="fala-inline"')],
    ["[16] logo/TopBar durante a atividade", "TABBAR_DURING_ACTIVITY", src("appShell", "{!focusMode && <TopBar />}", "<TopBar />")],
    ["Pinyin dentro do hub", "ACTIVITY_INSIDE_HUB", src("pinyin", 'testId="pinyin-accent"', 'testId="pinyin-inline"')],
  ],
  "review-round": [
    ["[17] Revisão sem hub", "REVIEW_NO_HUB", src("review", 'data-testid="review-start"', 'data-testid="review-go"')],
    ["[18] análise durante a rodada", "REVIEW_ANALYTICS_IN_ROUND", src("review", "{!inRound && detailedErrorsAllowed && (\n      <section", "{detailedErrorsAllowed && (\n      <section")],
    ["[19] `?modo` pula o hub", "REVIEW_HUB_SKIPPED", src("review", 'wantsCorrectionSession ||\n      searchParams.has("modulo") ||', 'wantsCorrectionSession ||\n      searchParams.has("modo") ||\n      searchParams.has("modulo") ||')],
    ["[20] rodada sem X", "REVIEW_ROUND_NO_EXIT", src("review", 'data-testid="review-exit"', 'data-testid="review-x"')],
  ],
  "focus-frame": [
    ["[21] VOLTAR sai do app em vez da atividade", "BACK_LEAVES_APP", src("frame", 'const id = pushModal("focus-activity");', "const id = 0;")],
    ["[22] atividade sem X", "ACTIVITY_NO_EXIT", src("frame", "data-testid={`${testId}-exit`}", "data-testid={testId}")],
    ["moldura não entra em focus", "ACTIVITY_KEEPS_CHROME", src("frame", "  useFocusActivity(true);\n", "")],
  ],
  "speaking-flow": [
    ["[23] motor exposto ao aluno", "ENGINE_TALK_TO_LEARNER", src("speech", 'return "Não consegui analisar sua fala agora.";', 'return "O SpeechRecognizer zh-CN não está instalado.";')],
    ["[24] estágios da fala fora de ordem", "SPEAKING_STAGES_WRONG", src("gold", 'export const SPEAKING_STAGES = ["OUCA", "GRAVE", "OUCA_VOCE", "COMPARE", "CONTINUE"] as const;', 'export const SPEAKING_STAGES = ["GRAVE", "OUCA", "OUCA_VOCE", "COMPARE", "CONTINUE"] as const;')],
    ["[25] trilha OUÇA→…→CONTINUE escondida", "SPEAKING_STAGES_HIDDEN", src("selfCompare", "<SpeakingStageStrip stage={speakingStageFor(", "<SpeakingStageHidden stage={speakingStageFor(")],
    ["fallback volta a falar de serviço", "ENGINE_TALK_TO_LEARNER", src("localePt", 'speechFallbackTitle: "Seu aparelho não conseguiu reconhecer mandarim agora."', 'speechFallbackTitle: "Sem serviço de reconhecimento."')],
  ],
  "tone-trace-memory": [
    ["[26] Tone Trace sem escolha de memória", "TRACE_NO_MEMORY_STAGE", src("toneTrace", 'return level === "NO_LINE" ? "MEMORY_CHOICE" : nextTraceLevel(level);', "return nextTraceLevel(level);")],
    ["[27] instrução antiga do traço", "TRACE_INSTRUCTION_WRONG", src("toneTrace", 'export const TONE_TRACE_INSTRUCTION = "Passe o dedo pelo caminho do tom.";', 'export const TONE_TRACE_INSTRUCTION = "Passe o dedo pela forma do tom.";')],
    ["memória afirma medir o tom", "TRACE_CLAIMS_PITCH", src("toneTrace", 'return correct ? "✓ Você lembrou o caminho." :', 'return correct ? "✓ Seu tom ficou correto." :')],
  ],
  "immersion-scene": [
    ["[28] Imersão sem ONDE", "IMMERSION_NO_CONTEXT", src("immersion", "text-ink-faint\">Onde</div>", "text-ink-faint\">Local</div>")],
  ],
  "culture-task-handoff": [
    ["[29] marco cultural sem explicação", "CULTURE_TASK_UNEXPLAINED", src("cultureGate", '"Antes de continuar, entenda este contexto."', '"Continue."')],
    ["[30] volta da Cultura genérica", "CULTURE_RETURN_GENERIC", src("player", 'const journeyCta = cultureReturnUnit\n      ? t("common.backTo", { target: cultureReturnUnit })', 'const journeyCta = cultureReturnUnit\n      ? t("player.backToJourney")')],
    ["CTA antigo 'Continuar pela Cultura'", "CULTURE_TASK_UNEXPLAINED", src("cultureGate", ': "Abrir Culture Moment";', ': "Continuar pela Cultura";')],
    ["handoff perde modo Jornada", "CULTURE_TASK_UNEXPLAINED", src("cultureGate", "&mode=journey", "&mode=deep")],
  ],
  "journey-return-pulse": [
    ["[31] pulso longo/piscando", "RETURN_PULSE_WRONG", src("anchor", "export const JOURNEY_RETURN_PULSE_MS = 1300;", "export const JOURNEY_RETURN_PULSE_MS = 4000;")],
  ],
  "progressive-discovery": [
    ["[32] Praticar antes da 1ª aula", "PRACTICE_BEFORE_FIRST_LESSON", src("nav", '"/treino": 1,', '"/treino": 0,')],
    ["[33] orientação automática demais", "GUIDANCE_BUDGET_EXCEEDED", src("guidance", "export const GUIDANCE_SESSION_BUDGET = 1;", "export const GUIDANCE_SESSION_BUDGET = 3;")],
  ],
  "conta-first-fold": [
    ["[34] Sair abaixo da dobra", "LOGOUT_BELOW_FOLD", src("conta", '{canSignOut ? <SignOutControl testId="conta-sign-out" /> : null}', "{null}")],
    ["[35] Excluir ao lado do Sair", "DELETE_NOT_SEPARATED", src("conta", 'data-testid="conta-danger-zone"', 'data-testid="conta-zone"')],
  ],
  "logout-discoverability": [
    ["[36] Sair vermelho no Mais", "LOGOUT_STYLED_AS_DELETE", src("more", '{canSignOut ? <SignOutControl testId="more-sign-out" /> : null}', '{canSignOut ? <button type="button" variant="danger" className="bg-wrong" data-testid="more-sign-out">{t("common.signOutAccount")}</button> : null}')],
    ["[37] sheet do Mais sem Sair", "LOGOUT_TOO_DEEP", src("tabBar", '<SignOutControl testId="more-sheet-sign-out" onBeforeSignOut={onClose} />', "")],
    ["[38] logout cai em perfil local", "LOGOUT_TO_LOCAL_PROFILE", src("signOut", '    logoutLocal();\n    navigate("/", { replace: true });\n    return null;', "    logoutLocal();\n    return null;")],
  ],
  "more-order": [
    ["[39] ordem do Mais trocada", "MORE_ORDER_WRONG", src("nav", '  groups.push({ id: "you", title: "Você", titleKey: "navigation.groupYou", items: you });', '  if (system.length) groups.push({ id: "system", title: "Sistema", titleKey: "navigation.groupSystem", items: system });\n  groups.push({ id: "you", title: "Você", titleKey: "navigation.groupYou", items: you });')],
    ["[40] Perfil repetido no catálogo", "MORE_DUPLICATES_YOU", src("nav", "items: [NAV.business, NAV.dados, NAV.ajustes, NAV.ajuda, NAV.sobre],", "items: [NAV.perfil, NAV.business, NAV.dados, NAV.ajustes, NAV.ajuda, NAV.sobre],")],
  ],
  appearance: [
    ["[41] Aparência sem Sistema", "APPEARANCE_MODES_MISSING", src("settings", '(["system", "light", "dark"] as AppearanceMode[])', '(["light", "dark"] as AppearanceMode[])')],
  ],
  "profile-first-fold": [
    ["[42] Conta fora do Perfil", "PROFILE_NO_ACCOUNT", src("profile", 'data-testid="profile-account-link"', 'data-testid="profile-x"')],
    ["data-testid descartado pelo ActionButton", "TESTID_DROPPED", src("page", "className={classes} data-testid={testId}>", "className={classes}>")],
  ],
  "cta-normalization": [
    ["[43] 'Continuar +20 XP' no botão", "CTA_CARRIES_REWARD", src("review", "                            {gradeEffect(g)}\n                          </span>", "                            {gradeEffect(g)} · +{reviewXpForGrade(g)} XP\n                          </span>")],
    ["detector de recompensa cego", "CTA_REWARD_UNDETECTED", src("gold", "  return /\\+\\s*\\d+\\s*(XP|Qi)\\b|\\bXP\\b|💎|moedas?/i.test(label);", "  return false;")],
  ],
  "owner-product-debt": [
    ["[44] aceite do owner automático", "FAKE_OWNER_ACCEPTANCE", json((s) => { s.debt.items[0].ownerAccepted = true; })],
    ["WEB_PASS sem E2E", "WEB_PASS_WITHOUT_E2E", json((s) => { s.debt.items[0].webEvidence = "e2e/nao-existe.spec.ts"; })],
    ["APK_PASS sem físico", "FAKE_PHYSICAL_PASS", json((s) => { s.debt.items[0].implementationState = "APK_PASS"; s.debt.totals.APK_PASS += 1; s.debt.totals.WEB_PASS -= 1; })],
    ["pedido do Sair some da dívida", "OWNER_DEBT_INCOMPLETE", json((s) => { s.debt.items = s.debt.items.filter((item) => !/Sair da conta/.test(item.description)); })],
  ],
  "goldens-human-script": [
    ["goldens viram aceite automático", "GOLDENS_AUTO_ACCEPT", src("goldens", "test.skip(!process.env.RC2225_GOLDENS", "test.skip(false")],
    ["viewport 360×640 some dos goldens", "GOLDENS_INCOMPLETE", src("goldens", "  { width: 360, height: 640 },\n", "")],
    ["roteiro pré-preenchido pelo agente", "HUMAN_SCRIPT_FAKE", json((s) => { s.humanScript = s.humanScript.replace(/(\| 23 \|[^\n]*)\| \|$/m, "$1| SIM |"); })],
  ],
  "release-truth": [
    ["P1 do Sair rebaixado", "P1_IGNORED", json((s) => { bug(s, "LOGOUT_DISCOVERABILITY_OWNER_FAIL").severity = "P2"; })],
    ["P1 herdado some", "P1_IGNORED", json((s) => { s.bugs.bugs = s.bugs.bugs.filter((item) => item.id !== "ANDROID_CONVERSATION_NODE_STALL"); })],
    ["WEB PASS vira APK PASS", "FAKE_PHYSICAL_PASS", json((s) => { s.bugs.ownerDevicePhysical.logoutWithinTwoLevels = "PASS"; })],
    ["painel maquiado", "BUG_COUNTER_DRIFT", json((s) => { s.bugs.panel.P1.open = 0; })],
    ["Closed Beta GO", "CLOSED_BETA_PREMATURE", json((s) => { s.bugs.release.CLOSED_BETA = "GO"; })],
    ["base ambígua", "BASE_SHA_AMBIGUOUS", json((s) => { s.base.RC2_2_25_BASE_SHA = "4018d548d9402521e12e4d4489e142108301a79b"; })],
    ["#273 alterada", "TOUCHED_273", json((s) => { s.rc2CandidateSha256 = "0".repeat(64); })],
    ["package alterado", "PACKAGE_CHANGED", src("capacitorConfig", 'appId: "longyu.noba.com"', 'appId: "longyu.outro.app"')],
    ["compras Android ligadas", "PURCHASES_ENABLED", src("subscription", 'export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;', 'export const ANDROID_IN_APP_PURCHASE = "ENABLED" as const;')],
    ["Production Play ligado", "PRODUCTION_PLAY_ENABLED", src("releaseIdentity", 'export const MAX_AUTOMATIC_CHANNEL = "internal";', 'export const MAX_AUTOMATIC_CHANNEL = "production";')],
    ["exceção de freeze ausente", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "RC2_2_25_PRODUCT_EXPERIENCE_CLOSURE_EXCEPTION", "RC2_2_25_UNREGISTERED")],
    ["PR automático", "AUTO_PR", json((s) => { s.bugs.prOpenedAutomatically = true; })],
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
  const failures = await gate(state);
  assert.ok(failures.some((failure) => failure.code === code), `SOBREVIVEU ${label}: esperado ${code}, veio ${failures.map((f) => f.code).join(",") || "nada"}`);
  console.log(`KILLED ${label}: ${code}`);
  killed += 1;
}
console.log(`PASS ${name} (${killed} mutações)`);
