#!/usr/bin/env node
/**
 * RC2.2.18 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-18-progressive-discovery.mjs validate <área>
 *   node scripts/rc2-2-18-progressive-discovery.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação é pega com o código certo.
 * Gates em scripts/lib/rc2-2-18-gates.mjs. As mutações 1–38 seguem a lista
 * DZ da especificação RC2.2.18; M39+ cobrem permissões, inventário, promoção,
 * ordem da barra, cópia e evidência física.
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-18-gates.mjs";

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
  "feature-registry": [
    ["1. Cultura visível na conta nova", "CULTURE_VISIBLE_FRESH", src("registry", '      return "HIDDEN";\n    }\n    case "missions":', '      return "AVAILABLE";\n    }\n    case "missions":')],
    ["2. Cultura nunca libera", "CULTURE_NEVER_UNLOCKS", src("registry", "if (state.cultureTouched || state.completedLessons.includes(FIRST_CULTURE_JOURNEY_TOPIC_ID)) return \"AVAILABLE\";", 'if (false) return "AVAILABLE";')],
    ["4. Cultura exige Pro", "PRO_BYPASSES_PEDAGOGY", src("registry", '    case "culture": {\n', '    case "culture": {\n      if (!(state as { isPremium?: boolean }).isPremium) return "HIDDEN";\n')],
    ["5. Revisão visível com zero itens", "REVIEW_VISIBLE_EMPTY", src("registry", 'return state.srsItemCount > 0 ? "AVAILABLE" : "HIDDEN";', 'return "AVAILABLE";')],
    ["6. Atlas antes de qualquer Hànzì", "ATLAS_BEFORE_HANZI", src("registry", 'if (chars >= rules.atlasMinLearnedChars) return "AVAILABLE";', 'if (chars >= 0) return "AVAILABLE";')],
    ["7. Loja antes da economia", "SHOP_BEFORE_ECONOMY", src("registry", 'return state.economyIntroduced ? "AVAILABLE" : "HIDDEN";', 'return "AVAILABLE";')],
    ["8. Liga logo após o cadastro", "LEAGUE_IMMEDIATE", src("registry", 'if (state.leagueJoined || lessons >= rules.leagueMinCompletedLessons) return "AVAILABLE";', 'if (true) return "AVAILABLE";')],
    ["9. Configurações trancadas", "SETTINGS_LOCKED", src("routes", '{ path: "config", element: <SettingsPage /> },', '{ path: "config", element: <FeatureRouteGate><SettingsPage /></FeatureRouteGate> },')],
    ["10. Excluir conta trancado", "DELETE_ACCOUNT_LOCKED", src("settingsPage", "          <DangerZone />", "          {completedLessons.length > 3 && <DangerZone />}")],
    ["11. Aparência trancada", "APPEARANCE_LOCKED", src("routes", '{ path: "config/:category", element: <SettingsPage /> },', '{ path: "config/:category", element: <FeatureRouteGate><SettingsPage /></FeatureRouteGate> },')],
    ["22. Pro fura o desbloqueio pedagógico", "PRO_BYPASSES_PEDAGOGY", src("registry", '    case "culture": {\n', '    case "culture": {\n      if ((state as { isPremium?: boolean }).isPremium) return "AVAILABLE";\n')],
    ["34. conta madura perde recursos", "MATURE_LOSES_FEATURES", src("registry", 'return state.learnedChunks.length >= rules.immersionMinKnownChunks ? "AVAILABLE" : "PREVIEW";', 'return "PREVIEW";')],
    ["36. estado de desbloqueio duplicado", "FEATURE_STATE_DUPLICATED", src("store", "  guidance: GuidanceState;\n  completedLessons: string[];", "  guidance: GuidanceState;\n  cultureUnlocked: boolean;\n  completedLessons: string[];")],
    ["M49. Cultura por número de lição", "CULTURE_RULE_NOT_SEMANTIC", src("registry", 'CULTURE_JOURNEY_PLACEMENT.filter((row) => row.track === "core")', 'CULTURE_JOURNEY_PLACEMENT.filter((row) => row.track === "explore")')],
    ["M50. desbloqueio aleatório", "NONDETERMINISTIC_UNLOCK", src("registry", "if (state.leagueJoined || lessons", "if (Math.random() > 2 || state.leagueJoined || lessons")],
    ["M51. limiar espalhado no código", "THRESHOLD_SCATTERED", src("registry", 'return lessons >= rules.missionsMinCompletedLessons ? "AVAILABLE" : "HIDDEN";', 'return lessons >= 5 ? "AVAILABLE" : "HIDDEN";')],
    ["M54. motor de descoberta paralelo", "DUPLICATE_DISCOVERY_ENGINE", json((s) => { s.srcFileNames.push("src/components/system/FeatureDiscoveryCard.tsx"); })],
  ],
  "guidance-orchestrator": [
    ["3. popup de Cultura repete ao recarregar", "UNLOCK_POPUP_REPEATS", src("orchestrator", '  if (record.status === "SNOOZED") return (record.snoozedUntil ?? 0) > ctx.now;\n  return true;', '  if (record.status === "SNOOZED") return (record.snoozedUntil ?? 0) > ctx.now;\n  return false;')],
    ["12. popup durante a lição", "GUIDANCE_DURING_LESSON", src("orchestrator", "if (ctx.activeLearning || ctx.inputFocused || ctx.otherCeremonyActive) return null;", "if (ctx.inputFocused || ctx.otherCeremonyActive) return null;")],
    ["13. duas orientações ao mesmo tempo", "GUIDANCE_STACKED", src("host", "if (!fresh || getCurrentGuidance()) {", "if (!fresh) {")],
    ["14. três popups numa sessão", "SESSION_BUDGET_EXCEEDED", src("orchestrator", "if (ctx.session.shownIds.length >= sessionBudget(ctx)) return null;", "if (false) return null;")],
    ["15. dispensar ignorado", "DISMISS_IGNORED", src("orchestrator", '    else records[id] = { status: "DISMISSED", at: now, evidence: "action" };', "    else void 0;")],
    ["16. 'Pular dicas' ignorado", "SKIP_ALL_IGNORED", src("orchestrator", 'enabled: action === "skip_all" ? false : state.enabled', "enabled: state.enabled")],
    ["17. dicas OFF ainda mostram coachmark", "GUIDANCE_OFF_SHOWS", src("orchestrator", "(ctx.state.enabled || definition.essential) && candidateEligible(definition, ctx)", "candidateEligible(definition, ctx)")],
    ["18. área não libera com dicas OFF", "UNLOCK_NEEDS_TIPS", src("registry", "if (state.cultureTouched || state.completedLessons.includes(FIRST_CULTURE_JOURNEY_TOPIC_ID)) return \"AVAILABLE\";", "if ((state as { guidanceEnabled?: boolean }).guidanceEnabled !== false && (state.cultureTouched || state.completedLessons.includes(FIRST_CULTURE_JOURNEY_TOPIC_ID))) return \"AVAILABLE\";")],
    ["19. 'Agora não' repete na sessão", "NOW_NOT_REPEATS", src("orchestrator", "  if (ctx.session.snoozedIds.includes(id)) return true;\n", "")],
    ["23. desbloqueio dá XP", "UNLOCK_GRANTS_XP", src("host", '      trackFunnelEvent("guidance_dismissed", { guidance_id: shown.definition.id, action });', '      trackFunnelEvent("guidance_dismissed", { guidance_id: shown.definition.id, action });\n      useStore.getState().addXp(5);')],
    ["24. coachmark dá conquista", "COACHMARK_GRANTS_ACHIEVEMENT", src("host", '      trackFunnelEvent("guidance_dismissed", { guidance_id: shown.definition.id, action });', '      trackFunnelEvent("guidance_dismissed", { guidance_id: shown.definition.id, action });\n      useStore.getState().unlockAchievement("first-tip");')],
    ["25. desbloqueio muda domínio", "UNLOCK_CHANGES_MASTERY", src("orchestrator", "  return { ...state, records, enabled: action === \"skip_all\" ? false : state.enabled };", "  return { ...state, records, enabled: action === \"skip_all\" ? false : state.enabled, lessonMasteryById: {} };")],
    ["30. teclado + coachmark", "KEYBOARD_COLLISION", src("orchestrator", "if (ctx.activeLearning || ctx.inputFocused || ctx.otherCeremonyActive) return null;", "if (ctx.activeLearning || ctx.otherCeremonyActive) return null;")],
    ["35. rever dicas reseta progresso", "RESET_RESETS_PROGRESS", src("settingsCard", "              updateGuidance((state) => resetGuidanceState(state));", "              updateGuidance((state) => resetGuidanceState(state));\n              useStore.getState().resetProgress();")],
    ["M57. ofensiva empilha sobre a orientação", "GUIDANCE_STACKED", src("streakWatcher", 'useOtherCelebrationActive("streak")', "false")],
    ["M58. cooldown de 1 minuto", "NOW_NOT_REPEATS", src("orchestrator", "GUIDANCE_SNOOZE_MS = 24 * 60 * 60 * 1000", "GUIDANCE_SNOOZE_MS = 60 * 1000")],
  ],
  "navigation-disclosure": [
    ["20. deep link fura desbloqueio", "DEEP_LINK_BYPASS", src("routes", '{ path: "cultura", element: <FeatureRouteGate><CultureHubPage /></FeatureRouteGate> },', '{ path: "cultura", element: <CultureHubPage /> },')],
    ["21. deep link em tela branca", "DEEP_LINK_BLANK", src("routeGate", "if (access.blocked) return <FeatureUnavailablePage feature={access.feature} />;", "if (access.blocked) return null;")],
    ["26. área re-tranca no carregamento do sync", "FEATURE_RELOCKS_DURING_SYNC", src("hook", "return mergeStickyVisibility(derived, [...confirmed, ...remembered]);", "return derived;")],
    ["M43. parede de cadeados", "WALL_OF_LOCKS", src("nav", "limit = 2", "limit = 12")],
    ["M44. Cultura troca de posição", "TABBAR_ORDER_UNSTABLE", src("nav", "    NAV.cultura,\n    NAV.missoes,\n    NAV.mais,\n  ].filter", "    NAV.missoes,\n    NAV.cultura,\n    NAV.mais,\n  ].filter")],
    ["M45. Qi/Loja antes da economia", "SHOP_BEFORE_ECONOMY", src("topBar", "{shopAvailable && (", "{true && (")],
    ["M1b. barra ignora o registro", "CULTURE_VISIBLE_FRESH", src("tabBar", "mobileNavForStage(profile.stage, visibility)", "mobileNavForStage(profile.stage)")],
  ],
  "guidance-surfaces": [
    ["27. VOLTAR sai do app em vez de fechar o coachmark", "BACK_EXITS_APP", src("host", "      data-coachmark-placement={position?.placement}\n      data-native-back-dismiss\n", "      data-coachmark-placement={position?.placement}\n")],
    ["28. coachmark fora da tela", "COACHMARK_OUTSIDE_VIEWPORT", src("position", "  top = Math.min(Math.max(top, minTop), Math.max(minTop, maxBottom - card.height));\n", "")],
    ["29. tooltip cobre o alvo", "TOOLTIP_COVERS_TARGET", src("position", 'let top = placement === "below" ? target.bottom + COACHMARK_GAP : target.top - COACHMARK_GAP - card.height;', "let top = target.top;")],
    ["31. movimento reduzido ignorado", "REDUCED_MOTION_IGNORED", src("css", "  .longyu-guidance-in,\n  .longyu-unlock-reveal,\n  .longyu-tab-appear {\n    animation: longyu-fade-in 150ms linear both !important;\n  }\n", "")],
    ["32. foco de acessibilidade quebrado", "A11Y_FOCUS_BROKEN", src("host", "    if (position) focusPrimary(cardRef.current);", "    if (position) void 0;")],
    ["M52. haptic em todo coachmark", "HAPTIC_SPAM", src("host", '      if (action === "now_not") setGuidanceSession', '      hapticOnce(`dismiss:${action}`, "selection");\n      if (action === "now_not") setGuidanceSession')],
    ["M56. orientação montada no modo foco", "GUIDANCE_DURING_LESSON", src("appShell", "{!focusMode && <GuidanceHost />}", "<GuidanceHost />")],
  ],
  "guidance-copy-settings": [
    ["33. texto fixo em PT", "GUIDANCE_HARDCODED_PT", src("host", '{t("guidance.common.skipAll")}', "Pular dicas")],
    ["M46. Cultura como recompensa", "CULTURE_AS_REWARD", src("ptBR", 'title: "✨ Cultura desbloqueada",', 'title: "Você ganhou Cultura",')],
    ["M47. Missões com pressão", "MANIPULATIVE_COPY", src("ptBR", 'body: "As Missões ajudam você a manter uma rotina.",', 'body: "Complete agora para não perder!",')],
    ["M48. Dicas guiadas some de Ajustes", "SETTINGS_TOGGLE_MISSING", src("settingsPage", "          <GuidanceSettingsCard />\n", "")],
    ["M53. anúncio abre a Loja sozinho", "SHOP_AUTO_OPEN", src("orchestrator", '    primaryKey: "guidance.shopIntroduction.primary",\n', '    primaryKey: "guidance.shopIntroduction.primary",\n    primaryTo: "/loja",\n')],
    ["M33b. chave sem EN", "GUIDANCE_HARDCODED_PT", src("en", '      skipAll: "Skip tips",\n', "")],
  ],
  "discovery-release": [
    ["37. #273 tocada", "ISSUE_273_TOUCHED", json((s) => { s.rc2CandidateSha256 = "0".repeat(64); })],
    ["38. package sai de longyu.noba.com", "PACKAGE_CHANGED", src("capacitorConfig", 'appId: "longyu.noba.com"', 'appId: "longyu.outro.app"')],
    ["M39. permissão pedida no primeiro launch", "PERMISSIONS_ON_FIRST_LAUNCH", src("bootstrap", "  return null;\n}", "  void requestNotificationPermission();\n  return null;\n}")],
    ["M39b. notificação e microfone juntos", "PERMISSIONS_TOGETHER", src("host", "        void requestNotificationPermission();\n        return;", "        void requestNotificationPermission();\n        void requestNativeMicrophone();\n        return;")],
    ["M40. microfone sem pré-permissão", "MIC_WITHOUT_PRE_PERMISSION", src("pronunciation", 'data-testid="speech-mic-pre-permission"', 'data-testid="speech-mic-note"')],
    ["M41. popup fora do inventário", "POPUP_NOT_INVENTORIED", json((s) => { s.inventory.entries = s.inventory.entries.filter((entry) => !entry.file.endsWith("StreakWatcher.tsx")); })],
    ["M42. promoção nas primeiras sessões", "PROMO_IN_FIRST_SESSIONS", src("proOffer", "PROMO_MIN_COMPLETED_LESSONS = 3", "PROMO_MIN_COMPLETED_LESSONS = 0")],
    ["M55. PASS físico sem aparelho", "PHYSICAL_PASS_WITHOUT_EVIDENCE", json((s) => { s.qa.freshAccountMinimalSurface = "PASS"; s.qa.deviceModel = null; })],
    ["M59. evento com PII", "ANALYTICS_PII", src("host", "{ guidance_id: current.definition.id, kind: current.definition.kind, render_evidence: true }", '{ guidance_id: current.definition.id, kind: current.definition.kind, render_evidence: true, email: "x" }')],
    ["M60. E2E sem o cenário de Cultura", "E2E_MISSING", src("e2e", 'test("CV:', 'test("XX:')],
    ["M61. fingerprint muda", "FINGERPRINT_DRIFT", json((s) => { s.freeze.fingerprint = "000000000000"; })],
  ],
};

const list = MUTATIONS[area] ?? [];
const baseline = await gate(base);
assert.equal(baseline.length, 0, `${name}: o estado real precisa passar antes das mutações\n${report(name, baseline)}`);
let killed = 0;
for (const [label, code, mutate] of list) {
  const state = structuredClone({ ...base, dialogFiles: [...base.dialogFiles], srcFileNames: [...base.srcFileNames] });
  mutate(state);
  const failures = await gate(state);
  assert.ok(
    failures.some((failure) => failure.code === code),
    `${name}: mutação "${label}" deveria falhar com ${code}; veio ${failures.map((f) => f.code).join(", ") || "nada"}`
  );
  killed += 1;
  console.log(`KILLED ${label}: ${code}`);
}
console.log(`PASS ${name} (${killed} mutações)`);
