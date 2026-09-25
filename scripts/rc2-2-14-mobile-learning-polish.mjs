#!/usr/bin/env node
/**
 * RC2.2.14 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-14-mobile-learning-polish.mjs validate <área>
 *   node scripts/rc2-2-14-mobile-learning-polish.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação é pega com o código certo.
 * Gates em scripts/lib/rc2-2-14-gates.mjs.
 */
import assert from "node:assert/strict";
import { GATES, loadState, report } from "./lib/rc2-2-14-gates.mjs";

const [mode, area] = process.argv.slice(2);
const gate = GATES[area];
if (!gate || !["validate", "test"].includes(mode)) {
  console.error(`uso: validate|test <${Object.keys(GATES).join("|")}>`);
  process.exit(2);
}
const name = `${mode}:${area}`;
const base = await loadState({ crawl: area === "lesson-step-progression" });

if (mode === "validate") {
  const failures = await gate(base);
  console.log(report(name, failures));
  process.exit(failures.length ? 1 : 0);
}

function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: trecho não encontrado → ${from.slice(0, 90)}`);
  return String(text).split(from).join(to);
}
const SRC_PATH = {
  store: "src/lib/store.ts",
};
/** Muta s.src[key] (e o espelho em s.srcFiles, quando existir). */
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
  const rel = SRC_PATH[key];
  if (rel) s.srcFiles[rel] = s.src[key];
};
const file = (rel, from, to) => (s) => {
  s.srcFiles[rel] = swap(s.srcFiles[rel], from, to);
};
const both = (...mutations) => (s) => mutations.forEach((mutate) => mutate(s));

const MUTATIONS = {
  "mobile-landing-focus": [
    ["DY1. app Android volta à landing de desktop", "NATIVE_WELCOME_MISSING", src("landing", "if (isNativeApp() || !wide) return <MobileWelcome />;", "if (!wide) return <MobileWelcome />;")],
    ["DY2. cabeçalho sem safe-area", "SAFE_TOP_MISSING", src("welcome", "pt-[calc(var(--app-safe-top)+0.5rem)]", "pt-3")],
    ["DY3. CTA principal volta a criar conta", "GUIDED_TRY_CTA_MISSING", src("welcome", '"/teste-guiado" : "/curso?next=%2Fteste-guiado"', '"/comecar" : "/comecar"')],
    ["DY4. rótulo do teste guiado some", "GUIDED_TRY_CTA_MISSING", src("ptBR", 'ctaGuidedTry: "Fazer teste guiado · 2 min"', 'ctaGuidedTry: "Começar"')],
    ["DY5. Já tenho uma conta vira botão grande", "HAS_ACCOUNT_NOT_DISCREET", src("welcome", '<Link\n            to="/login"\n            data-testid="landing-has-account"', '<ButtonLink\n            to="/login"\n            data-testid="landing-has-account"')],
    ["DY6. cards de benefício na primeira dobra", "FIRST_FOLD_CLUTTER", src("welcome", '{t("marketing.heroPromise")}</p>', '{t("marketing.heroPromise")}</p>\n          <p>{t("marketing.bulletBasics")}</p>')],
    ["DY7. seletor de idioma volta ao cabeçalho do celular", "LANDING_LANGUAGE_CONTROL", src("welcome", "<span aria-hidden=\"true\">🐉</span> Longyu\n          </span>", "<span aria-hidden=\"true\">🐉</span> Longyu\n          </span>\n          <LanguageSwitcher compact id=\"landing-interface-locale\" />")],
    ["DY8. dragão some da primeira dobra", "FIRST_FOLD_ORDER", src("welcome", '<Mascot size={132} variant="wave"', '<span data-size={132} data-variant="wave"')],
    ["DY9. rodapé sobe para a primeira dobra", "FIRST_FOLD_ORDER", src("welcome", 'className="flex min-h-dvh flex-col"', 'className="flex flex-col"')],
  ],
  "guided-learning-try": [
    ["DZ9. rota /teste-guiado removida", "GUIDED_ROUTE_MISSING", src("routes", '{ path: "/teste-guiado", element: <GuidedTryPage /> },', "")],
    ["DZ10. teste com 7 passos", "GUIDED_STEPS_RANGE", src("guided", '["listen", "explain", "meaning", "tones", "build"]', '["listen", "explain", "meaning", "tones", "build", "quiz2", "quiz3"]')],
    ["DZ11. teste paga XP", "GUIDED_PERSISTS", src("guided", '  function finish() {\n    haptic("practiceComplete");', '  function finish() {\n    useStore.getState().addXp(5, "guided");\n    haptic("practiceComplete");')],
    ["DZ12. teste cria aluno", "GUIDED_PERSISTS", src("guided", "  function listen() {", "  function listen() {\n    createAccount(\"Visitante\");")],
    ["DZ13. fim leva direto à Jornada", "GUIDED_END_MISSING", src("guided", '<ButtonLink to="/comecar"', '<ButtonLink to="/jornada"')],
    ["DZ14. conteúdo inventado fora da Lição 1", "GUIDED_NOT_LESSON1_DATA", src("guided", "const NIHAO = chunkById.nihao;", 'const NIHAO = { hanzi: "谢谢", pinyin: "xièxie" };')],
    ["DZ15. sem vibração na resposta", "GUIDED_HAPTICS_MISSING", src("guided", 'haptic(choice.correct ? "answerCorrect" : "answerWrong");', "")],
  ],
  "lesson-step-progression": [
    ["EA16. StepKind sem contrato", "UNKNOWN_ADVANCE_CONTRACT", src("contract", '  schedule_reading: choice("StepDialogueChoice"),\n', "")],
    ["EA17. contrato aponta renderer errado", "RENDERER_MISMATCH", src("contract", 'tone_pair: choice("StepTonePair", "pairs")', 'tone_pair: choice("StepMatchPairs", "pairs")')],
    ["EA18. passo quebrado novo no currículo", "BROKEN_STEP_IN_CURRICULUM", (s) => {
      s.crawl.steps.push({ lessonId: "l2", source: "pass2", index: 3, kind: "fill_blank", valid: false, reason: "fill_blank sem blankAnswer" });
    }],
    ["EA19. tipo desconhecido nas lições", "UNKNOWN_ADVANCE_CONTRACT", (s) => {
      s.crawl.steps.push({ lessonId: "l3", source: "authored", index: 0, kind: "mystery_kind", valid: true, reason: "" });
    }],
    ["EA20. plano não trava no começo", "PLAN_LOCK_MISSING", src("player", "      steps: authored,\n    };", "      steps: [],\n    };")],
    ["EA21. planner troca passos no meio", "PLAN_SWAP_MID_STEP", src("player", "if (idxRef.current > 0 || stepInteractedRef.current) {", "if (false) {")],
    ["EA22. chave de conclusão sem conteúdo", "COMPLETION_KEY_WEAK", src("player", ':${currentStep ? stepIdentity(currentStep) : "none"}`;', "`;")],
    ["EA23. StepRenderer não remonta com conteúdo novo", "STEP_KEY_WEAK", src("player", "key={`${planNonce}:${idx}:${stepAttempt}:${stepIdentity(step)}`}", "key={`${planNonce}:${idx}:${stepAttempt}`}")],
    ["EA24. toque duplo pula dois passos", "TAP_THROUGH_UNGUARDED", src("player", 'useTapThroughGuard(`${planNonce}:${idx}:${stepAttempt}`, "[data-lesson-step-frame], [data-lesson-action-region]");', "")],
    ["EA25. fail-safe pula sozinho", "STALL_AUTO_SKIP", src("steps", "onDone(last?.correct, last?.meta);", "onSkip?.();")],
    ["EA26. latch do StepRenderer removido", "LATCH_MISSING", src("steps", "    if (completionSentRef.current) return;\n    completionSentRef.current = true;", "    completionSentRef.current = true;")],
    ["EA27. rastro em produção", "TRACE_IN_PRODUCTION", src("trace", 'return env.DEV === true || env.VITE_USE_TEST_FIXTURES === "true";', "return true;")],
    ["EA28. rastro com resposta do aluno", "TRACE_PII", src("trace", "  event: LessonStepTraceEvent;\n}", "  event: LessonStepTraceEvent;\n  answer?: string;\n}")],
    ["EA29. E2E cobre só um tipo", "E2E_COVERAGE_PARTIAL", src("progressionSpec", "const KINDS = Object.keys(STEP_ADVANCE_CONTRACT)", 'const KINDS = ["intro"]')],
    ["EA30. exceção do freeze removida", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "export const RC2_2_14_MOBILE_LEARNING_POLISH_EXCEPTION", "export const RC2_2_14_REMOVED")],
  ],
  "hanzi-mobile-focus": [
    ["EB26. hub sem Treinar agora", "HUB_TRAIN_NOW_MISSING", src("hub", 'data-testid="hanzi-train-now"', 'data-testid="hanzi-hero"')],
    ["EB27. modos em 1 coluna", "MODES_GRID_NOT_COMPACT", src("hub", 'className="grid grid-cols-2 gap-2" data-testid="hanzi-mode-grid"', 'className="grid grid-cols-1 gap-2" data-testid="hanzi-mode-grid"')],
    ["EB28. Atlas antes do treino", "ATLAS_PRIMARY", src("hub", '<h1 className="font-serif text-2xl font-semibold text-ink">{t("hanziHub.title")}</h1>', '<h1 className="font-serif text-2xl font-semibold text-ink">{t("hanziHub.title")}</h1>\n      <Link to="/hanzi/atlas" data-testid="hanzi-atlas-link">Atlas</Link>')],
    ["EB29. rodada de 12", "ROUND_SIZE", src("rounds", "export const HANZI_PRACTICE_ROUND = 8;", "export const HANZI_PRACTICE_ROUND = 12;")],
    ["EB30. treino com TopBar/TabBar", "FOCUS_CHROME_VISIBLE", src("appShell", "const ownsViewport = isLessonPlayer || isHanziTraining;", "const ownsViewport = isLessonPlayer;")],
    ["EB31. carta de 320px", "CANVAS_SIZE", src("builder", "w-[min(76vw,260px)]", "w-[min(86vw,320px)]")],
    ["EB32. Verificar rola junto", "VERIFY_NOT_STICKY", src("session", "<div ref={setRegion} data-lesson-action-region data-hanzi-action-region", "<div ref={setRegion} data-hanzi-action-region")],
    ["EB33. card dentro de card", "CARD_NESTING", src("session", "          <HanziBuilderExercise\n", "          <Card><HanziBuilderExercise\n")],
    ["EB34. sem progresso 1/8", "PROGRESS_MISSING", src("session", "{progress.value}/{progress.max}", "{progress.value}")],
    ["EB35. Atlas perde a rota", "ROUTES_WRONG", src("routes", 'path: "hanzi/atlas", element: <HanziAtlasPage />', 'path: "atlas", element: <HanziAtlasPage />')],
  ],
  "practice-reward-integrity": [
    ["EC36. mesma rodada paga duas vezes", "XP_NOT_IDEMPOTENT", src("store", "          if (seen.includes(key)) return {};\n          granted = true;", "          granted = true;")],
    ["EC37. sem limite diário (farm)", "XP_FARMING", src("rounds", "  if (paidToday >= HANZI_PRACTICE_XP_ROUNDS_PER_DAY) return 0;\n", "")],
    ["EC38. missão que não andou aparece", "FAKE_REWARD", src("session", "return prev != null && mission.progress > prev.progress && !mission.claimed;", "return true;")],
    ["EC39. Pérola inventada na tela", "FAKE_REWARD", src("completion", "...(pearls > 0 ? [{ kind: \"pearl\"", "...(true ? [{ kind: \"pearl\"")],
    ["EC40. treino cria moeda", "NEW_CURRENCY", src("session", "    addMinutes(\"hanzi\", 4);\n", "    addMinutes(\"hanzi\", 4);\n    useStore.getState().addQi(5, \"practice\");\n")],
    ["EC41. chave sem conta", "ROUND_KEY_FORMAT", src("rounds", "return `hanzi-practice:${accountId}:${mode}:${date}:`;", "return `hanzi-practice:${mode}:${date}:`;")],
    ["EC42. farm por placar volta", "XP_FARMING", src("hanziPage", "function recordBuilderActivityError(", "const FARM = `${todayKey()}:builder:${ns}`;\nfunction recordBuilderActivityError(")],
  ],
  "native-haptics": [
    ["ED41. Web usa navigator.vibrate", "WEB_VIBRATE_USED", file("src/lib/platform/nativeHaptics.ts", "export function hasNativeHaptics(): boolean {", "export function hasNativeHaptics(): boolean {\n  navigator.vibrate(10);")],
    ["ED42. todo botão vibra", "HAPTIC_ON_EVERY_TAP", file("src/components/ui/primitives.tsx", "import ", 'import { haptic } from "../../lib/haptics";\nimport ')],
    ["ED43. vibração desligada por padrão", "HAPTICS_PREF_MISSING", src("store", "      hapticsEnabled: true,", "      hapticsEnabled: false,")],
    ["ED44. sem orçamento por ação", "HAPTIC_BUDGET_MISSING", src("haptics", "  if (now - lastAt < HAPTIC_GESTURE_WINDOW_MS && weight <= lastWeight) return;\n", "")],
    ["ED45. PASS físico inventado", "FAKE_PHYSICAL_PASS", (s) => {
      s.qa.hapticCorrect = "PASS";
    }],
    ["ED46. som e vibração acoplados", "SOUND_HAPTIC_COUPLED", src("haptics", "export function haptic(", "const coupled = useStore.getState().soundEffects;\nexport function haptic(")],
    ["ED47. conquista vibra toda vez", "ACHIEVEMENT_REPEATS", src("achievements", "hapticOnce(`achievement:${current.id}`, \"achievementReveal\")", "haptic(\"achievementReveal\")")],
    ["ED48. plugin importado fora do adapter", "HAPTICS_OUTSIDE_ADAPTER", file("src/lib/haptics.ts", "export function haptic(", 'import { Haptics } from "@capacitor/haptics";\nexport function haptic(')],
  ],
  "mobile-settings-density": [
    ["ED49. 8ª categoria no índice", "SETTINGS_INDEX_TOO_LONG", src("categories", '  { id: "avancado", titleKey: "settings.catAdvanced", descKey: "settings.catAdvancedDesc" },', '  { id: "avancado", titleKey: "settings.catAdvanced", descKey: "settings.catAdvancedDesc" },\n  { id: "extra", titleKey: "settings.catAdvanced", descKey: "settings.catAdvancedDesc" },')],
    ["ED50. subpágina sem rota", "SETTINGS_SUBPAGE_ROUTE", src("routes", '{ path: "config/:category", element: <SettingsPage /> },', "")],
    ["ED51. teste de sons volta para Som", "DIAGNOSTICS_IN_MAIN", src("settingsPage", "        {hapticsSection}\n", "        {hapticsSection}\n        {SOUND_TEST_ITEMS.map((item) => item.kind)}\n")],
    ["ED52. desktop perde a página única", "SETTINGS_DESKTOP_CHANGED", src("settingsPage", "SETTINGS_CATEGORIES.map((item) => <Fragment key={item.id}>{sections[item.id]}</Fragment>)", "<SettingsIndex />")],
    ["ED53. linhas do índice pequenas", "INDEX_TARGETS", src("settingsPage", 'className="flex min-h-14 items-center justify-between gap-3 px-4 py-3', 'className="flex min-h-9 items-center justify-between gap-3 px-4 py-1')],
    ["ED54. Vibração some de Som e vibração", "HAPTICS_TOGGLE_MISSING", src("settingsPage", "        {hapticsSection}\n", "")],
    ["ED55. subpágina com cabeçalho grande", "HEADER_NOT_MINIMAL", src("settingsPage", '<h1 className="font-serif text-2xl font-semibold text-ink" data-testid="settings-category-title">', '<HubHeader data-testid="settings-category-title">')],
  ],
};

const real = await gate(base);
assert.deepEqual(real, [], `${name}: o estado real precisa passar\n${report(name, real)}`);
let killed = 0;
for (const [label, code, mutate] of MUTATIONS[area]) {
  const state = structuredClone(base);
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
