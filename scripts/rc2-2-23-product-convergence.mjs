#!/usr/bin/env node
/**
 * RC2.2.23 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-23-product-convergence.mjs validate <área>
 *   node scripts/rc2-2-23-product-convergence.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação é pega com o código certo.
 * Os números [n] seguem as mutações obrigatórias da spec RC2.2.23.
 * Gates em scripts/lib/rc2-2-23-gates.mjs.
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-23-gates.mjs";

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
  "guidance-delivery": [
    ["[1] orientação descartada em silêncio", "GUIDANCE_DROPPED_SILENTLY", src("host", "        setCurrentGuidance({ ...current, anchorFallback: true });\n        return;", "        setCurrentGuidance(null);\n        return;")],
    ["[2] AUTO_SEEDED contado como visto", "AUTO_SEEDED_COUNTED_AS_SEEN", src("orchestrator", '  return record?.status === "SHOWN" || record?.status === "DISMISSED" || record?.status === "SKIPPED";', '  return record?.status === "SHOWN" || record?.status === "DISMISSED" || record?.status === "SKIPPED" || record?.status === "AUTO_SEEDED";')],
    ["[2b] semeada bloqueada como vista", "AUTO_SEEDED_COUNTED_AS_SEEN", src("orchestrator", '  if (record.status === "AUTO_SEEDED") return false;\n  if (record.status === "SNOOZED")', '  if (record.status === "SNOOZED")')],
    ["[3] build de QA/nativo suprime orientação", "QA_BUILD_SUPPRESSED", src("suppression", "  if (input.native || input.deviceQaBuild) return false;\n", "")],
    ["[4] âncora ausente mata a orientação", "ANCHOR_MISSING_KILLS_GUIDANCE", src("orchestrator", " || (ctx.session.anchorMisses ?? []).includes(definition.id);", ";")],
    ["[5] sem card de fallback", "NO_FALLBACK_CARD", src("orchestrator", "...(anchorFallback ? { anchorFallback: true } : {})", "")],
    ["[5b] card sem âncora some da tela", "NO_FALLBACK_CARD", src("host", 'placement: "fallback", arrowLeft: -100', 'placement: "below", arrowLeft: -100')],
    ["[6] spam de orientação", "GUIDANCE_SPAM", src("orchestrator", "  if (ctx.session.shownIds.length >= sessionBudget(ctx)) return null;\n", "")],
    ["[7] orientação durante a lição", "GUIDANCE_DURING_LESSON", src("orchestrator", "  if (ctx.activeLearning || ctx.inputFocused || ctx.otherCeremonyActive) return null;\n  if (ctx.session.shownIds", "  if (ctx.otherCeremonyActive) return null;\n  if (ctx.session.shownIds")],
    ["[8] orientação por cima de modal", "GUIDANCE_OVER_MODAL", src("orchestrator", "  if (ctx.activeLearning || ctx.inputFocused || ctx.otherCeremonyActive) return null;\n  if (ctx.session.shownIds", "  if (ctx.activeLearning || ctx.inputFocused) return null;\n  if (ctx.session.shownIds")],
    ["gravação não conta como aula ativa", "GUIDANCE_DURING_LESSON", src("host", '["RECORDING", "RECOGNITION"].includes(currentAudioOwner())', "false")],
    ["reason code some", "REASON_CODE_MISSING", src("orchestrator", '  "ANCHOR_MISSING",\n', "")],
    ["painel de QA em produção", "QA_PANEL_IN_PRODUCTION", src("qaPage", "if (!deviceQaEnabled()) return <Navigate", "if (false) return <Navigate")],
    ["ponte da Cultura sem volta", "CULTURE_BRIDGE_NO_RETURN", src("cultureHub", 'data-testid="culture-back-to-journey"', 'data-testid="culture-link"')],
    ["monetização acima da pedagogia", "GUIDANCE_PRIORITY", src("orchestrator", "  CRITICAL_UX: 0,", "  CRITICAL_UX: 9,")],
  ],
  "energy-soft-landing": [
    ["[9] zero Cargas bloqueia Revisão/Perfil/Cultura", "ZERO_CHARGE_BLOCKS_FREE_STUDY", src("energy", '  "/revisao",\n  "/praticar",', '  "/praticar",')],
    ["[9b] treino extra volta a cobrar", "ZERO_CHARGE_BLOCKS_FREE_STUDY", src("energy", '["lesson", "module_challenge", "immersion_session", "premium_preview"]', '["lesson", "module_challenge", "immersion_session", "premium_preview", "extra_training"]')],
    ["[10] replay cobra Carga", "REPLAY_CHARGES", src("energy", "  return !input.lessonCompleted;", "  return true;")],
    ["[11] Pro como único caminho", "PRO_ONLY_PATH", src("energy", "  return lanes.length > 0 ? lanes : [ZERO_CHARGE_FREE_LANES[0]];", "  return lanes;")],
    ["[11b] Pro antes dos caminhos grátis", "PRO_ONLY_PATH", src("softLanding", 'data-testid="energy-free-lanes"', 'data-testid="energy-lanes-moved"')],
    ["[12] erros seguidos tiram Carga", "MISTAKE_COSTS_CHARGE", src("economy", "export const CONSECUTIVE_MISTAKE_CHARGE_COST = 0;", "export const CONSECUTIVE_MISTAKE_CHARGE_COST = 1;")],
    ["[12b] erro confirmado consome Carga", "MISTAKE_COSTS_CHARGE", src("player", "    errorStreakRef.current += 1;\n  }", '    errorStreakRef.current += 1;\n    if (errorStreakRef.current >= 4) consumeCharge("lesson");\n  }')],
    ["[13] copy mistura Vidas e Cargas", "ENERGY_COPY_MIXED", src("localePt", 'body: "Ainda dá para continuar estudando.",', 'body: "Sem Cargas e sem Vidas, espere.",')],
    ["paywall de energia em loop", "PAYWALL_LOOP", src("paywall", 'if (kind === "energy") return <EnergySoftLanding onClose={onClose} />;', "")],
  ],
  "progressive-navigation": [
    ["[14] Praticar visível cedo", "PRACTICE_VISIBLE_EARLY", src("nav", '"/treino": 1', '"/treino": 0')],
    ["[15] barra densa demais", "TAB_BAR_TOO_DENSE", src("nav", "export const EARLY_NAV_MAX_ITEMS = 3;", "export const EARLY_NAV_MAX_ITEMS = 5;")],
    ["barra ignora abas conquistadas", "TAB_BAR_TOO_DENSE", src("tabBar", "earnedTabBar(mobileNavForStage(profile.stage, visibility), learner.completedLessons.length)", "mobileNavForStage(profile.stage, visibility)")],
    ["[26] perfil escondido no Mais", "PROFILE_HIDDEN", src("nav", "const you = [NAV.perfil, NAV.conta, NAV.aparencia]", "const you = [NAV.aparencia]")],
    ["[28] aparência escondida", "APPEARANCE_HIDDEN", src("nav", "const you = [NAV.perfil, NAV.conta, NAV.aparencia]", "const you = [NAV.perfil, NAV.conta]")],
  ],
  "mobile-density": [
    ["duas ações principais no detalhe", "MULTIPLE_PRIMARY_CTA", src("lessonDetail", '<span className="block min-w-0 break-words text-center leading-snug" data-lesson-primary-cta="">', '<span data-lesson-primary-cta="">x</span><span className="block min-w-0 break-words text-center leading-snug" data-lesson-primary-cta="">')],
    ["[21] feedback duplica a resposta", "FEEDBACK_DUPLICATES_ANSWER", src("review", '        <details className="mt-2 text-left" data-review-answer-more>', '        <div className="mt-2 text-left" data-review-answer-more>')],
    ["fim da revisão sem saída clara", "REVIEW_END_UNCLEAR", src("review", 'data-testid="review-end-continue"', 'data-testid="review-more"')],
  ],
  "review-repetition": [
    ["[16] saturação do alvo", "TARGET_SATURATION", src("repetition", "export const MAX_TARGET_PER_ROUND = 2;", "export const MAX_TARGET_PER_ROUND = 4;")],
    ["[17] mesma operação repetida passa", "SAME_OPERATION_REPEATED", src("repetition", 'return index - previous > window ? "INTERLEAVED" : "REDUNDANT";', 'return "INTERLEAVED";')],
    ["[18] densidade da rodada", "REVIEW_ROUND_DENSITY", src("reviewComposer", "export const REVIEW_ROUND_MAX = 8;", "export const REVIEW_ROUND_MAX = 12;")],
    ["'0 ruim' com saturação", "FAKE_CLEAN_REPETITION", src("repetition", "    clean: redundant === 0 && saturated.length === 0 && dominated.length === 0,", "    clean: redundant === 0,")],
    ["teto da rodada não ligado", "COMPOSER_CAP_NOT_WIRED", src("review", "return capTargetPerRound(spaced, reviewTargetOf, reviewRoundSize(spaced.length));", "return spaced;")],
    ["teto descarta itens do SRS", "SRS_ITEMS_DROPPED", src("repetition", "    pending.unshift(...deferred);", "    void deferred;")],
    ["auditoria declara sessão dominada limpa", "FAKE_CLEAN_REPETITION", json((s) => { const dominated = s.repetitionAudit.sessions.find((session) => session.dominated.length > 0); dominated.clean = true; })],
  ],
  "review-hanzi": [
    ["[19] Hànzì principal < 64", "HANZI_TOO_SMALL", src("reviewComposer", 'main: "text-[64px] leading-tight sm:text-[80px]",', 'main: "text-[40px] leading-tight sm:text-[80px]",')],
    ["[20] Hànzì de opção < 48", "HANZI_TOO_SMALL", src("reviewComposer", "  option: { min: 48, max: 60 },", "  option: { min: 32, max: 60 },")],
    ["[20b] Hànzì de par < 44", "HANZI_TOO_SMALL", src("reviewComposer", 'pair: "text-[44px] leading-tight sm:text-[52px]",', 'pair: "text-[28px] leading-tight sm:text-[52px]",')],
    ["peça de montagem escapa do contrato", "HANZI_TOO_SMALL", src("review", 'isHanziText(piece.value) ? REVIEW_HANZI_CLASS.pair : "",', 'isHanziText(piece.value) ? "text-2xl sm:text-3xl" : "",')],
    ["papel de Hànzì sem marca", "HANZI_ROLE_UNMARKED", src("review", 'isHanziText(option.label) ? "option" : undefined', "undefined")],
  ],
  "guided-tones": [
    ["[22] tela de tom com vários conceitos", "TONE_SCREEN_MULTIPLE_CONCEPTS", src("toneMicrolesson", '{ stage: "IMITATE", concept: "imitation"', '{ stage: "IMITATE", concept: "sound"')],
    ["[22b] tela de tom vira bloco", "TONE_SCREEN_MULTIPLE_CONCEPTS", src("toneMicrolesson", "line: `${label}: ${firstSentence(guidance.guidedPt)}`", "line: `${label}: ${guidance.guidedPt} ${guidance.gesturePt} ${toneKnowledge(tone).learnerDescriptionPt}`")],
    ["[23] pitch explicado por língua", "PITCH_EXPLAINED_BY_TONGUE", src("toneKnowledge", 'guidedPt: "Cai firme."', 'guidedPt: "A língua cai firme."')],
    ["sequência de tom fora de ordem", "TONE_SEQUENCE_BROKEN", src("toneMicrolesson", '["SEE", "HEAR", "IMITATE", "DISCRIMINATE"', '["HEAR", "SEE", "IMITATE", "DISCRIMINATE"')],
    ["nota falsa de pitch", "FAKE_PITCH_SCORE", src("toneMicrolessonUi", '`✓ ${TONE_SHORT_LABEL[tone]}`', '`✓ seu tom ficou correto (92%)`')],
    ["microaula não ligada", "TONE_MICROLESSON_NOT_WIRED", src("som", "tonesNeedingMicrolesson(pack.options, toneTrainer)", "[]")],
  ],
  "immersion-depth": [
    ["[24] sem falante", "NO_SPEAKER", src("immersion", "function StorySpeakerLabel", "function StoryHeaderLabel")],
    ["[25] sem reação à escolha", "NO_REACTION", src("immersion", "storyReaction(story.steps, currentIndex, Boolean(lastCorrect))", "null")],
    ["reação pelo narrador/aluno", "REACTION_BY_WRONG_SPEAKER", src("storyReaction", "  return Boolean(cast && !cast.learner && !cast.narrator);", "  return Boolean(cast);")],
    ["fala sem áudio", "NO_LINE_AUDIO", src("immersion", "<SpeakButton text={reaction.hanzi}", "<span data-x={reaction.hanzi}")],
    ["sem recap", "NO_RECAP", src("immersion", 'data-testid="story-recap"', 'data-testid="story-end"')],
  ],
  "profile-account": [
    ["[26b] perfil sem primeira dobra", "PROFILE_HIDDEN", src("profile", 'data-testid="profile-friends-link"', 'data-testid="profile-link"')],
    ["[27] logout só no fundo", "LOGOUT_DEEP_ONLY", src("more", 'data-testid="more-sign-out"', 'data-testid="more-x"')],
  ],
  "physical-truth": [
    ["[29] fala bloqueia a lição", "SPEECH_BLOCKS_LESSON", src("pronunciation", "onCannotSpeak={onContinue}", "onCannotSpeak={() => undefined}")],
    ["[30] Self Compare sem replay", "SELF_COMPARE_NO_REPLAY", src("selfCompare", 'data-testid="self-compare-play-mine"', 'data-testid="self-compare-x"')],
    ["[31] Continuar congela", "CONTINUE_FREEZES", src("steps", 'data-testid="step-stalled-retry"', 'data-testid="step-x"')],
    ["[32] cadastro gira para sempre", "SIGNUP_INFINITE_SPINNER", src("finalizeSignup", "withSignupTimeout(", "(")],
    ["[33] recuperação só por link externo", "RECOVERY_LINK_ONLY", src("authService", 'verifyOtp({ email: email.trim(), token, type: "recovery" })', 'resetPasswordForEmail(email.trim())')],
    ["[34] #273 tocada", "TOUCHED_273", json((s) => { s.rc2CandidateSha256 = "0".repeat(64); })],
    ["[35] package muda", "PACKAGE_CHANGED", src("capacitorConfig", 'appId: "longyu.noba.com"', 'appId: "longyu.outro.app"')],
    ["[36] compras Android ligadas", "PURCHASES_ENABLED", src("subscription", 'export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;', 'export const ANDROID_IN_APP_PURCHASE = "ENABLED" as const;')],
    ["[37] Production Play automático", "PRODUCTION_PLAY_ENABLED", src("releaseIdentity", 'export const MAX_AUTOMATIC_CHANNEL = "internal";', 'export const MAX_AUTOMATIC_CHANNEL = "production";')],
    ["P1 de orientação rebaixado", "P1_IGNORED", json((s) => { bug(s, "GUIDANCE_DELIVERY_NOT_VISIBLE_OWNER_DEVICE").severity = "P2"; })],
    ["P1 físico carregado some", "P1_IGNORED", json((s) => { s.bugs.bugs = s.bugs.bugs.filter((item) => item.id !== "MOBILE_SIGNUP_NOT_PHYSICALLY_PROVEN"); })],
    ["bug formal ausente", "BUG_MISSING", json((s) => { s.bugs.bugs = s.bugs.bugs.filter((item) => item.id !== "ENERGY_DEPLETION_FEELS_LIKE_APP_LOCK"); })],
    ["CODE PASS vira PHYSICAL PASS", "FAKE_PHYSICAL_PASS", json((s) => { bug(s, "REVIEW_HANZI_PHYSICAL_TOO_SMALL").status = "PHYSICAL_PASS"; })],
    ["painel maquiado", "BUG_COUNTER_DRIFT", json((s) => { s.bugs.panel.P1.open = 0; })],
    ["Closed Beta GO", "CLOSED_BETA_PREMATURE", json((s) => { s.bugs.release.CLOSED_BETA = "GO"; })],
    ["Play marcado feito sem evidência", "PLAY_ACTIONS_DROPPED", json((s) => { s.bugs.playOwnerActions.internalUpload = true; })],
    ["relatório sem NOT_TESTED", "REPORT_EVIDENCE_COLLAPSED", json((s) => { s.reports["guidance-delivery"] = s.reports["guidance-delivery"].split("NOT_TESTED").join("PENDENTE"); })],
    ["base ambígua", "BASE_SHA_AMBIGUOUS", json((s) => { s.base.RC2_2_23_BASE_SHA = "a2a43a86"; })],
    ["histórico resetado", "HISTORY_RESET", json((s) => { s.bugs.importedFrom.historyReset = true; })],
    ["exceção de freeze ausente", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "RC2_2_23_PRODUCT_CONVERGENCE_EXCEPTION", "RC2_2_23_UNREGISTERED")],
    ["PR automático", "AUTO_PR", json((s) => { s.bugs.prOpenedAutomatically = true; })],
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
