/**
 * RC2.2.14 — Mobile Focus, Lesson Reliability, Hànzì Training, Rewards & Haptics.
 *
 * Sete gates sobre um estado carregado do repositório real:
 *   validateMobileLandingFocus        primeira dobra do celular/app
 *   validateGuidedLearningTry         teste guiado sem persistência
 *   validateLessonStepProgression     contrato de avanço + crawler das 134 lições
 *   validateHanziMobileFocus          hub de treino, rodadas de 8, modo foco
 *   validatePracticeRewardIntegrity   XP idempotente, sem farm, sem recompensa falsa
 *   validateNativeHaptics             @capacitor/haptics, preferência, orçamento
 *   validateMobileSettingsDensity     índice ≤ 7 + subpáginas, desktop intacto
 * Cada um devolve [{ code, where, why }] (vazio = passa). Os `test:*` mutam o
 * estado e exigem o código de falha certo.
 *
 * Módulos puros (rodadas, categorias, contrato) são executados A PARTIR DO
 * TEXTO do estado, para que uma mutação no código seja de fato executada.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256, CLOUD_CHECKS } from "./rc2-2-12-gates.mjs";
import { crawlLessonSteps } from "./rc2-2-14-step-crawl.mjs";

const ROOT = process.cwd();

export const RC2_2_14_BASE_SHA = "0c5ad5ae";
export const SETTINGS_CATEGORY_IDS = ["conta", "aprendizagem", "som", "notificacoes", "aparencia", "privacidade", "avancado"];
export const RC2_2_14_QA_FIELDS = [
  "hapticsEnabled",
  "hapticSelection",
  "hapticCorrect",
  "hapticWrong",
  "hapticCompletion",
  "hapticAchievement",
  "landingMobile",
  "guidedTry",
  "lessonProgression",
  "hanziHub",
  "hanziBuilder",
  "mobileSettings",
  "haptics",
  "practiceRewards",
];
/**
 * Passos gerados que o crawler encontrou inválidos e que dependem do owner
 * (corrigir mexe em CURRICULUM_SOURCE e move o fingerprint). O StepRenderer
 * mostra o passo pulado com Continuar — não trava. Qualquer passo inválido
 * FORA desta lista reprova.
 */
export const KNOWN_BROKEN_PLANNED_STEPS = [
  "l14-char-rev|pass1|0|recognize",
  "l14-char-rev|pass1|1|recognize",
  "l14-char-rev|pass1|2|recognize",
];
/** Onde uma vibração viraria "vibrar em todo toque": proibido importar haptics. */
export const NO_HAPTIC_FILES = [
  "src/components/ui/primitives.tsx",
  "src/components/layout/TabBar.tsx",
  "src/components/layout/TopBar.tsx",
  "src/components/layout/nav.tsx",
  "src/components/layout/Sidebar.tsx",
  "src/components/ui/SpeakButton.tsx",
  "src/lib/tts.ts",
  "src/lib/soundFx.ts",
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const FILES = {
  landing: "src/features/landing/LandingPage.tsx",
  welcome: "src/features/landing/MobileWelcome.tsx",
  guided: "src/features/landing/GuidedTryPage.tsx",
  routes: "src/routes.tsx",
  smartBack: "src/lib/navigation/smartBack.ts",
  contract: "src/lib/lessonStepContract.ts",
  trace: "src/lib/lessonStepTrace.ts",
  tapGuard: "src/lib/useTapThroughGuard.ts",
  steps: "src/features/lesson/steps.tsx",
  player: "src/features/lesson/LessonPlayer.tsx",
  journey: "src/data/journey.ts",
  hub: "src/features/hanzi/IdeogramasPage.tsx",
  hanziPage: "src/features/hanzi/HanziPage.tsx",
  session: "src/features/hanzi/HanziTrainingSession.tsx",
  modes: "src/features/hanzi/hanziTrainingModes.ts",
  rounds: "src/lib/hanziPracticeRounds.ts",
  builder: "src/components/hanzi/HanziBuilderExercise.tsx",
  completion: "src/components/hanzi/PracticeCompletion.tsx",
  appShell: "src/components/layout/AppShell.tsx",
  store: "src/lib/store.ts",
  haptics: "src/lib/haptics.ts",
  nativeHaptics: "src/lib/platform/nativeHaptics.ts",
  achievements: "src/components/achievements/AchievementsWatcher.tsx",
  settingsPage: "src/features/settings/SettingsPage.tsx",
  categories: "src/features/settings/settingsCategories.ts",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  ptBR: "src/locales/pt-BR.ts",
  en: "src/locales/en.ts",
};

/** Resultado do crawler em cache pelo hash das fontes .ts (validate + test não recrawleiam). */
async function cachedCrawl(srcFiles) {
  const crypto = await import("node:crypto");
  const hash = crypto.createHash("sha256");
  for (const rel of Object.keys(srcFiles).filter((file) => file.endsWith(".ts")).sort()) hash.update(rel).update(srcFiles[rel]);
  const key = hash.digest("hex").slice(0, 16);
  const cacheDir = path.join(ROOT, "node_modules", ".cache", "longyu");
  const cacheFile = path.join(cacheDir, `rc2-2-14-crawl-${key}.json`);
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  const crawl = await crawlLessonSteps();
  const slim = { lessonCount: crawl.lessonCount, steps: crawl.steps.map(({ step: _step, ...row }) => row) };
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(slim));
  return slim;
}

export async function loadState({ crawl: withCrawl = true } = {}) {
  const pkg = readJson("package.json");
  const srcFiles = Object.fromEntries(walk("src").map((rel) => [rel, read(rel)]));
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, srcFiles[rel] ?? read(rel)]));
  src.progressionSpec = read("e2e/lesson-step-progression.spec.ts");
  src.playerAdvanceSpec = read("e2e/lesson-player-advance.spec.ts");
  src.manifest = read("android/app/src/main/AndroidManifest.xml");
  const crawl = withCrawl ? await cachedCrawl(srcFiles) : { lessonCount: 134, steps: [] };
  return {
    freeze: loadBetaPedagogyFreezeState(),
    qa: readJson("docs/release/android-physical-qa.json"),
    operational: readJson("docs/release/rc1-operational-checks.json"),
    rc2CandidateSha256: await sha256(read("docs/release/rc2-candidate.json")),
    dependencies: { ...pkg.dependencies, ...pkg.devDependencies },
    srcFiles,
    src,
    crawl,
  };
}

function collector() {
  const failures = [];
  return { failures, fail: (code, where, why) => failures.push({ code, where, why }) };
}

export function report(name, failures) {
  if (!failures.length) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`;
}

let importSeq = 0;
async function importTs(text) {
  const js = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2214-"));
  const file = path.join(dir, `m${importSeq++}.mjs`);
  fs.writeFileSync(file, js);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Trecho de um objeto de locale (`  ns: {` até o `  },` do mesmo nível). */
function localeBlock(text, ns) {
  const start = String(text).indexOf(`\n  ${ns}: {`);
  if (start < 0) return "";
  const end = String(text).indexOf("\n  },", start);
  return String(text).slice(start, end < 0 ? undefined : end);
}
const localeValue = (text, ns, key) => new RegExp(`\\n    ${key}: "([^"]*)"`).exec(localeBlock(text, ns))?.[1];

/** Bloco `id: (` … `),` de um Record de JSX (seções de Configurações). */
function sectionBlock(text, id) {
  const start = String(text).indexOf(`\n    ${id}: (`);
  if (start < 0) return "";
  const end = String(text).indexOf("\n    ),", start);
  return String(text).slice(start, end < 0 ? undefined : end);
}

function freezeInvariants(s, fail) {
  if (!/export const RC2_2_14_MOBILE_LEARNING_POLISH_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-14-mobile-learning-polish"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_14_MOBILE_LEARNING_POLISH_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze))
    fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
  for (const id of CLOUD_CHECKS) if (s.operational.checks?.[id]?.pass !== false) fail("CLOUD_273_TOUCHED", id, "cloud segue adiada (#273)");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("CLOUD_273_TOUCHED", "rc2-candidate.json", "o candidate da #273 não muda");
}

// ── 1 · Landing mobile ────────────────────────────────────────────────────
export async function validateMobileLandingFocus(s) {
  const { failures, fail } = collector();
  const landing = stripComments(s.src.landing);
  const welcome = stripComments(s.src.welcome);
  if (!/if \(isNativeApp\(\) \|\| !wide\) return <MobileWelcome \/>;/.test(landing))
    fail("NATIVE_WELCOME_MISSING", "LandingPage.tsx", "app Android e celular usam a composição própria");
  if (!/data-testid="mobile-welcome-header"[\s\S]{0,160}pt-\[calc\(var\(--app-safe-top\)/.test(welcome))
    fail("SAFE_TOP_MISSING", "MobileWelcome.tsx", "cabeçalho respeita --app-safe-top");
  if (!/<BrandLockup\b/.test(welcome)) fail("BRAND_MISSING", "MobileWelcome.tsx", "logo oficial (mascote + Longyu) no cabeçalho");
  if (!/const guidedTo = hasCourseDirection\(\) \? "\/teste-guiado" : "\/curso\?next=%2Fteste-guiado";/.test(welcome) || !/<ButtonLink to=\{guidedTo\} size="lg"[^>]*data-testid="landing-guided-try"/.test(welcome) || !/t\("marketing\.ctaGuidedTry"\)/.test(welcome))
    fail("GUIDED_TRY_CTA_MISSING", "MobileWelcome.tsx", "CTA principal = teste guiado");
  if (localeValue(s.src.ptBR, "marketing", "ctaGuidedTry") !== "Fazer teste guiado · 2 min")
    fail("GUIDED_TRY_CTA_MISSING", "pt-BR.ts", 'rótulo "Fazer teste guiado · 2 min"');
  if (!/<Link\s+to="\/login"\s+data-testid="landing-has-account"/.test(welcome))
    fail("HAS_ACCOUNT_NOT_DISCREET", "MobileWelcome.tsx", '"Já tenho uma conta" é link discreto, não botão grande');
  const firstFold = welcome.slice(0, Math.max(0, welcome.indexOf("<footer")));
  if (/bulletBasics|bulletTones|<BetaNotice|setTheme|IconSun|marketing\.noCard/.test(firstFold))
    fail("FIRST_FOLD_CLUTTER", "MobileWelcome.tsx", "sem cards de benefício, BetaNotice, tema ou letra miúda na primeira dobra");
  // RC2.2.14B — sem seletor de idioma no celular/app: a interface segue o
  // sistema e muda em Configurações › Idioma do aplicativo.
  if (/LanguageSwitcher|<select|landing-locale|setLocale|interface-locale-select/.test(welcome))
    fail("LANDING_LANGUAGE_CONTROL", "MobileWelcome.tsx", "sem seletor de idioma na landing do celular/app");
  const order = ["<Mascot", "<h1", 't("marketing.heroPromise")', 'data-testid="landing-guided-try"', 'data-testid="landing-has-account"', "<footer"].map((token) => welcome.indexOf(token));
  if (order.some((index) => index < 0) || order.some((index, i) => i > 0 && index < order[i - 1]))
    fail("FIRST_FOLD_ORDER", "MobileWelcome.tsx", "marca → dragão → promessa → teste guiado → Já tenho conta → (dobra) rodapé");
  if (!/className="flex min-h-dvh flex-col"/.test(welcome)) fail("FIRST_FOLD_ORDER", "MobileWelcome.tsx", "primeira dobra ocupa a tela; rodapé abaixo");
  return failures;
}

// ── 2 · Teste guiado ──────────────────────────────────────────────────────
export async function validateGuidedLearningTry(s) {
  const { failures, fail } = collector();
  const guided = stripComments(s.src.guided);
  if (!/path: "\/teste-guiado", element: <GuidedTryPage \/>/.test(s.src.routes) || !/lazyNamed\(\(\) => import\("\.\/features\/landing\/GuidedTryPage"\), "GuidedTryPage"\)/.test(s.src.routes))
    fail("GUIDED_ROUTE_MISSING", "routes.tsx", "/teste-guiado (lazy)");
  const steps = /export const GUIDED_TRY_STEPS = \[([^\]]*)\]/.exec(guided)?.[1]?.split(",").filter((item) => item.trim()) ?? [];
  if (steps.length < 3 || steps.length > 5) fail("GUIDED_STEPS_RANGE", "GuidedTryPage.tsx", `3–5 micro-passos (tem ${steps.length})`);
  const persist = /useStore\b|addXp|addQi|completeLesson|gradeSrs|ensureSrs|recordDailyTask|claimPearl|\bcreateAccount\(|accountSetupComplete|localStorage|sessionStorage|recordSpeechAttempt|markLesson/.exec(guided);
  if (persist) fail("GUIDED_PERSISTS", "GuidedTryPage.tsx", `nada é gravado (achou ${persist[0]})`);
  if (/placement/i.test(guided)) fail("GUIDED_IS_PLACEMENT", "GuidedTryPage.tsx", "não é Placement");
  for (const ref of ["const NIHAO = chunkById.nihao;", "const NI = charById.ni;", "const HAO = charById.hao;", "const NV = charById.nv;", "const ZI = charById.zi;"])
    if (!guided.includes(ref)) fail("GUIDED_NOT_LESSON1_DATA", "GuidedTryPage.tsx", `reusar dados da Lição 1 (${ref})`);
  if (!/tc?\("guidedTry\.doneTitle"\)/.test(guided) || !/<ButtonLink to="\/comecar"/.test(guided) || !/t\("guidedTry\.createAccount"\)/.test(guided))
    fail("GUIDED_END_MISSING", "GuidedTryPage.tsx", '"O que você acabou de aprender" + "Criar conta e continuar"');
  if (localeValue(s.src.ptBR, "guidedTry", "doneTitle") !== "O que você acabou de aprender" || localeValue(s.src.ptBR, "guidedTry", "createAccount") !== "Criar conta e continuar")
    fail("GUIDED_END_MISSING", "pt-BR.ts", "cópia do fim do teste");
  if (!/haptic\(choice\.correct \? "answerCorrect" : "answerWrong"\)/.test(guided) || !/haptic\("practiceComplete"\)/.test(guided))
    fail("GUIDED_HAPTICS_MISSING", "GuidedTryPage.tsx", "leve na escolha, sucesso no acerto/fim");
  if (!localeBlock(s.src.en, "guidedTry")) fail("GUIDED_I18N_MISSING", "en.ts", "guidedTry em EN");
  return failures;
}

// ── 3 · Progressão da lição ───────────────────────────────────────────────
export async function validateLessonStepProgression(s) {
  const { failures, fail } = collector();
  const contract = stripComments(s.src.contract);
  const steps = stripComments(s.src.steps);
  const player = stripComments(s.src.player);
  const union = /export type StepKind =([\s\S]*?);/.exec(s.src.journey)?.[1] ?? "";
  const kinds = [...union.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
  const table = /export const STEP_ADVANCE_CONTRACT: Record<StepKind, StepAdvanceContract> = \{([\s\S]*?)\n\};/.exec(contract)?.[1] ?? "";
  const entries = new Map([...table.matchAll(/\n\s{2}([a-z_]+): ([^\n]+)/g)].map((m) => [m[1], m[2]]));
  for (const kind of kinds) if (!entries.has(kind)) fail("UNKNOWN_ADVANCE_CONTRACT", "lessonStepContract.ts", `${kind} sem contrato de avanço`);
  for (const kind of new Set(s.crawl.steps.map((row) => row.kind)))
    if (!entries.has(kind)) fail("UNKNOWN_ADVANCE_CONTRACT", "crawler", `passo "${kind}" nas lições sem contrato`);

  // O renderer declarado é o que o StepRenderer realmente usa para o tipo.
  const switchBody = steps.slice(steps.indexOf("switch (personalizedStep.kind)"));
  for (const [kind, line] of entries) {
    const renderer = /(?:reading|choice)\("([^"]+)"/.exec(line)?.[1] ?? /renderer: "([^"]+)"/.exec(line)?.[1] ?? "";
    const start = switchBody.indexOf(`case "${kind}":`);
    if (start < 0) {
      fail("RENDERER_MISMATCH", "steps.tsx", `${kind} sem case no StepRenderer`);
      continue;
    }
    let end = switchBody.indexOf("\n      case ", start + 5);
    if (end < 0) end = switchBody.indexOf("default:", start);
    let caseText = switchBody.slice(start, end);
    // Casos agrupados ("case a:\n case b: return …"): o corpo é o do próximo retorno.
    if (!/return|<Step|<Conversation/.test(caseText)) caseText = switchBody.slice(start, switchBody.indexOf("return", start) + 400);
    if (!renderer.split("|").some((name) => caseText.includes(`<${name}`)))
      fail("RENDERER_MISMATCH", "lessonStepContract.ts", `${kind}: contrato diz ${renderer}, o StepRenderer usa outro`);
  }

  // Crawler: todo passo das 134 lições (autoral + passes) valida no runtime.
  if (s.crawl.lessonCount !== 134) fail("CURRICULUM_COUNT_DRIFT", "crawler", `134 lições (veio ${s.crawl.lessonCount})`);
  for (const row of s.crawl.steps.filter((item) => !item.valid)) {
    const id = `${row.lessonId}|${row.source}|${row.index}|${row.kind}`;
    if (!KNOWN_BROKEN_PLANNED_STEPS.includes(id)) fail("BROKEN_STEP_IN_CURRICULUM", id, row.reason || "validateExercise reprovou");
  }

  if (!/sessionPlanRef\.current = \{\s*lessonId: foundLesson\.id,\s*nonce: planNonce,\s*masteryLevel: masteryLevelNow,\s*steps: authored,?\s*\};/.test(player))
    fail("PLAN_LOCK_MISSING", "LessonPlayer.tsx", "plano trava assim que o autoral fica pronto");
  if (!/if \(idxRef\.current > 0 \|\| stepInteractedRef\.current\) \{/.test(player))
    fail("PLAN_SWAP_MID_STEP", "LessonPlayer.tsx", "o planner não troca passos com o aluno no meio");
  if (!/const completionKey = `\$\{lesson\.id\}:\$\{planNonce\}:\$\{idx\}:\$\{stepAttempt\}:\$\{currentStep \? stepIdentity\(currentStep\) : "none"\}`;/.test(player))
    fail("COMPLETION_KEY_WEAK", "LessonPlayer.tsx", "chave de conclusão com a identidade do conteúdo");
  if (!/key=\{`\$\{planNonce\}:\$\{idx\}:\$\{stepAttempt\}:\$\{stepIdentity\(step\)\}`\}/.test(player))
    fail("STEP_KEY_WEAK", "LessonPlayer.tsx", "StepRenderer remonta quando o conteúdo muda");
  if (!/useTapThroughGuard\([^)]*"\[data-lesson-step-frame\], \[data-lesson-action-region\]"\)/.test(player))
    fail("TAP_THROUGH_UNGUARDED", "LessonPlayer.tsx", "toque duplo não conclui dois passos");
  const guard = stripComments(s.src.tapGuard);
  if (!/STEP_TAP_THROUGH_RADIUS_PX/.test(guard) || !/isTapThrough\(mountedAtRef\.current, now\)/.test(guard))
    fail("TAP_THROUGH_UNGUARDED", "useTapThroughGuard.ts", "janela + mesmo ponto");
  if (!/const onDone = useCallback<StepProps\["onDone"\]>\(\(correct, meta\) => \{\s*if \(completionSentRef\.current\) return;/.test(steps))
    fail("LATCH_MISSING", "steps.tsx", "StepRenderer conclui uma vez");
  const stalled = /const stalledAction = stalled \?([\s\S]*?) : null;/.exec(steps)?.[1] ?? "";
  if (!stalled || !/onDone\(last\?\.correct, last\?\.meta\)/.test(stalled) || /onSkip/.test(stalled))
    fail("STALL_AUTO_SKIP", "steps.tsx", "fail-safe reoferece a ação canônica; nunca pula sozinho");
  const trace = stripComments(s.src.trace);
  if (!/return env\.DEV === true \|\| env\.VITE_USE_TEST_FIXTURES === "true";/.test(trace))
    fail("TRACE_IN_PRODUCTION", "lessonStepTrace.ts", "rastro só em DEV/E2E");
  const entryFields = [.../export interface LessonStepTraceEntry \{([\s\S]*?)\}/.exec(trace)?.[1]?.matchAll(/(\w+)\??:/g) ?? []].map((m) => m[1]).sort();
  if (entryFields.join(",") !== ["at", "attempt", "event", "kind", "lessonId", "stepIndex"].sort().join(","))
    fail("TRACE_PII", "lessonStepTrace.ts", `sem PII nem resposta (campos: ${entryFields.join(", ")})`);
  if (!/const KINDS = Object\.keys\(STEP_ADVANCE_CONTRACT\)/.test(s.src.progressionSpec) || !/probeWrong\(page, contract\)/.test(s.src.progressionSpec))
    fail("E2E_COVERAGE_PARTIAL", "lesson-step-progression.spec.ts", "E2E cobre TODOS os StepKinds, certo e errado");
  if (!/toque duplo no Continuar não pula dois passos/.test(s.src.playerAdvanceSpec))
    fail("E2E_COVERAGE_PARTIAL", "lesson-player-advance.spec.ts", "toque duplo / retry / segundo plano no player real");
  freezeInvariants(s, fail);
  return failures;
}

// ── 4 · Hànzì: hub e treino em foco ───────────────────────────────────────
export async function validateHanziMobileFocus(s) {
  const { failures, fail } = collector();
  const hub = stripComments(s.src.hub);
  const session = stripComments(s.src.session);
  const trainAt = hub.indexOf('data-testid="hanzi-train-now"');
  const gridAt = hub.indexOf("<HanziModeGrid");
  const atlasAt = hub.indexOf('data-testid="hanzi-atlas-link"');
  const proAt = hub.indexOf('data-testid="hanzi-pro-lab"');
  if (trainAt < 0 || !/to=\{`\/hanzi\?mode=\$\{recommended\.id\}`\}/.test(hub) || !/t\("hanziHub\.trainNow"\)/.test(hub))
    fail("HUB_TRAIN_NOW_MISSING", "IdeogramasPage.tsx", '"Treinar agora" com o modo recomendado');
  if (!/className="grid grid-cols-2 gap-2" data-testid="hanzi-mode-grid"/.test(hub) || !/<Link key=\{mode\.id\} to=\{`\/hanzi\?mode=\$\{mode\.id\}`\}/.test(hub))
    fail("MODES_GRID_NOT_COMPACT", "IdeogramasPage.tsx", "2 colunas, card inteiro clicável");
  if (!(trainAt >= 0 && trainAt < gridAt && gridAt < atlasAt && atlasAt < proAt))
    fail("ATLAS_PRIMARY", "IdeogramasPage.tsx", "ordem: Treinar agora → modos → Atlas → Pro Lab");
  if (!/path: "ideogramas", element: <IdeogramasPage \/>/.test(s.src.routes) || !/path: "hanzi", element: <JourneyNodeGate><HanziPage \/><\/JourneyNodeGate>/.test(s.src.routes) || !/path: "hanzi\/atlas", element: <HanziAtlasPage \/>/.test(s.src.routes))
    fail("ROUTES_WRONG", "routes.tsx", "/ideogramas hub · /hanzi treino · /hanzi/atlas Atlas");
  const rounds = await importTs(s.src.rounds);
  if (rounds.HANZI_PRACTICE_ROUND !== 8 || rounds.practiceRoundSlice(Array.from({ length: 20 }, (_, i) => i), 1).length !== 8)
    fail("ROUND_SIZE", "hanziPracticeRounds.ts", "rodadas de no máximo 8");
  if (!/Array\.from\(\{ length: HANZI_PRACTICE_ROUND \}/.test(session) || !/practiceRoundSlice\(/.test(session))
    fail("ROUND_SIZE", "HanziTrainingSession.tsx", "quiz e montagem usam a rodada de 8");
  const shell = stripComments(s.src.appShell);
  if (!/const isHanziTraining =\s*location\.pathname === "\/hanzi" && isHanziPracticeMode\(/.test(shell) || !/const ownsViewport = isLessonPlayer \|\| isHanziTraining;/.test(shell) || !/const focusMode = ownsViewport \|\|/.test(shell))
    fail("FOCUS_CHROME_VISIBLE", "AppShell.tsx", "treino ativo sem TopBar/TabBar");
  const canvasPx = Number(/w-\[min\(76vw,(\d+)px\)\]/.exec(s.src.builder)?.[1] ?? 0);
  if (canvasPx < 220 || canvasPx > 280) fail("CANVAS_SIZE", "HanziBuilderExercise.tsx", `carta 220–280px no celular (tem ${canvasPx})`);
  if (!/<div ref=\{setRegion\} data-lesson-action-region data-hanzi-action-region/.test(session) || !/pb-\[var\(--app-safe-bottom\)\]/.test(session) || !/<LessonActionRegionProvider target=\{region\}>/.test(session))
    fail("VERIFY_NOT_STICKY", "HanziTrainingSession.tsx", "Verificar fixo acima da área segura");
  if (/<Card[\s>]/.test(session)) fail("CARD_NESTING", "HanziTrainingSession.tsx", "sem card dentro de card no treino");
  if (!/data-hanzi-progress>\s*\{progress\.value\}\/\{progress\.max\}/.test(session)) fail("PROGRESS_MISSING", "HanziTrainingSession.tsx", 'progresso "1/8"');
  if (!/density="compact"/.test(session)) fail("BUILDER_NOT_COMPACT", "HanziTrainingSession.tsx", "peças perto da carta");
  return failures;
}

// ── 5 · Recompensa de treino ──────────────────────────────────────────────
export async function validatePracticeRewardIntegrity(s) {
  const { failures, fail } = collector();
  const store = stripComments(s.src.store);
  const grant = /grantPracticeRoundXp: \(roundKey, amount\) => \{([\s\S]*?)\n      \},/.exec(store)?.[1] ?? "";
  if (!grant || !/if \(seen\.includes\(key\)\) return \{\};/.test(grant) || !/if \(granted\) get\(\)\.addXp\(inc, leagueXpKeyActivity\("practice", key\)\);/.test(grant))
    fail("XP_NOT_IDEMPOTENT", "store.ts", "uma vez por chave de rodada, pelo addXp de sempre");
  const rounds = await importTs(s.src.rounds);
  if (rounds.hanziPracticeRoundKey("acc", "meaning", "2026-09-25", 1) !== "hanzi-practice:acc:meaning:2026-09-25:1")
    fail("ROUND_KEY_FORMAT", "hanziPracticeRounds.ts", "hanzi-practice:<conta>:<modo>:<dia>:<n>");
  if (rounds.practiceRoundXp(8, rounds.HANZI_PRACTICE_XP_ROUNDS_PER_DAY) !== 0 || rounds.practiceRoundXp(8, 0) <= 0 || rounds.practiceRoundXp(0, 0) !== 0)
    fail("XP_FARMING", "hanziPracticeRounds.ts", "sem XP depois do limite diário nem com zero acertos");
  if (/:builder:\$\{ns\}/.test(s.src.hanziPage)) fail("XP_FARMING", "HanziPage.tsx", "XP por placar distinto (farm) removido");
  const session = stripComments(s.src.session);
  const completion = stripComments(s.src.completion);
  if (!/return prev != null && mission\.progress > prev\.progress && !mission\.claimed;/.test(session))
    fail("FAKE_REWARD", "HanziTrainingSession.tsx", "missão só aparece se andou nesta rodada");
  if (!/PEARL_HANZI_MILESTONES\.filter\(\(m\) => newPearlMilestones\.includes\(m\.id\)\)/.test(session))
    fail("FAKE_REWARD", "HanziTrainingSession.tsx", "Pérolas só de marco PEARL_HANZI_MILESTONES resgatado");
  if (!/\.\.\.\(xp > 0 \? \[\{ kind: "xp"/.test(completion) || !/\.\.\.\(pearls > 0 \? \[\{ kind: "pearl"/.test(completion) || !/xp: granted \? xpAmount : 0,/.test(session))
    fail("FAKE_REWARD", "PracticeCompletion.tsx", "só recompensa real");
  if (!/import \{ RewardReveal \} from "\.\.\/chests\/RewardReveal";/.test(completion)) fail("REWARD_REVEAL_NOT_REUSED", "PracticeCompletion.tsx", "reusa RewardReveal");
  for (const [where, text] of [["HanziTrainingSession.tsx", session], ["PracticeCompletion.tsx", completion], ["hanziPracticeRounds.ts", s.src.rounds]]) {
    const hit = /addQi|addPearls?\b|applyPearlEarn|\bcoins?\b|\bgems?\b|\bwallet\b|addChests?/.exec(stripComments(text));
    if (hit) fail("NEW_CURRENCY", where, `nenhuma moeda/recompensa nova (achou ${hit[0]})`);
  }
  return failures;
}

// ── 6 · Vibração ──────────────────────────────────────────────────────────
export async function validateNativeHaptics(s) {
  const { failures, fail } = collector();
  if (!s.dependencies["@capacitor/haptics"]) fail("HAPTICS_DEP_MISSING", "package.json", "@capacitor/haptics");
  if (!/from "@capacitor\/haptics"/.test(s.src.nativeHaptics)) fail("HAPTICS_DEP_MISSING", "nativeHaptics.ts", "adapter usa o plugin");
  for (const [rel, text] of Object.entries(s.srcFiles)) {
    if (rel !== "src/lib/platform/nativeHaptics.ts" && /from "@capacitor\/haptics"|import\("@capacitor\/haptics"\)/.test(text)) fail("HAPTICS_OUTSIDE_ADAPTER", rel, "só o adapter importa o plugin");
    if (/navigator\.vibrate/.test(stripComments(text))) fail("WEB_VIBRATE_USED", rel, "Web é no-op (sem navigator.vibrate)");
  }
  const haptics = stripComments(s.src.haptics);
  if (!/hapticsEnabled: true,/.test(s.src.store) || !/useStore\.getState\(\)\.hapticsEnabled !== false/.test(haptics))
    fail("HAPTICS_PREF_MISSING", "store.ts / haptics.ts", "hapticsEnabled (padrão ligado) respeitado");
  if (!/if \(now - lastAt < HAPTIC_GESTURE_WINDOW_MS && weight <= lastWeight\) return;/.test(haptics))
    fail("HAPTIC_BUDGET_MISSING", "haptics.ts", "uma vibração por ação");
  const map = /export const HAPTIC_MAP: Record<HapticEvent, NativeHapticPattern> = \{([\s\S]*?)\};/.exec(haptics)?.[1] ?? "";
  for (const event of ["selection", "piecePlaced", "answerCorrect", "answerWrong", "lessonComplete", "practiceComplete", "achievementReveal", "streakMilestone", "chestOpen"])
    if (!new RegExp(`\\b${event}: "`).test(map)) fail("HAPTIC_MAP_INCOMPLETE", "haptics.ts", `${event} no mapa central`);
  if (/soundEffects|playSoundFx/.test(haptics)) fail("SOUND_HAPTIC_COUPLED", "haptics.ts", "som e vibração independentes");
  for (const rel of NO_HAPTIC_FILES)
    if (/from "[./]*(?:lib\/)?haptics"|from "\.\.\/\.\.\/lib\/haptics"|platform\/nativeHaptics/.test(s.srcFiles[rel] ?? ""))
      fail("HAPTIC_ON_EVERY_TAP", rel, "botão, navegação, rolagem e áudio não vibram");
  if (!/hapticOnce\(`achievement:\$\{current\.id\}`, "achievementReveal"\)/.test(s.src.achievements))
    fail("ACHIEVEMENT_REPEATS", "AchievementsWatcher.tsx", "cada conquista vibra uma vez, em sequência");
  if (!/android\.permission\.VIBRATE/.test(s.src.manifest)) fail("VIBRATE_PERMISSION_MISSING", "AndroidManifest.xml", "VIBRATE (plugin)");
  if (localeValue(s.src.ptBR, "settings", "haptics") !== "Vibração" || localeValue(s.src.ptBR, "settings", "hapticsLead") !== "Feedback tátil em respostas e conquistas.")
    fail("HAPTICS_TOGGLE_MISSING", "pt-BR.ts", '"Vibração" · "Feedback tátil em respostas e conquistas."');
  const qa = s.qa;
  const evidence = qa.formalPass === true && /^[0-9a-f]{40}$/.test(qa.sha ?? "") && qa.deviceModel && qa.isEmulator === false;
  for (const field of RC2_2_14_QA_FIELDS) {
    if (!(field in qa)) fail("QA_FIELD_MISSING", "android-physical-qa.json", field);
    else if (qa[field] === "PASS" && !evidence) fail("FAKE_PHYSICAL_PASS", "android-physical-qa.json", `${field}=PASS sem aparelho físico`);
  }
  return failures;
}

// ── 7 · Configurações no celular ──────────────────────────────────────────
export async function validateMobileSettingsDensity(s) {
  const { failures, fail } = collector();
  const categories = await importTs(s.src.categories);
  const ids = categories.SETTINGS_CATEGORIES.map((item) => item.id);
  if (ids.length > categories.SETTINGS_INDEX_MAX || categories.SETTINGS_INDEX_MAX > 7 || ids.join(",") !== SETTINGS_CATEGORY_IDS.join(","))
    fail("SETTINGS_INDEX_TOO_LONG", "settingsCategories.ts", `≤ 7: ${SETTINGS_CATEGORY_IDS.join(", ")}`);
  if (!/path: "config\/:category", element: <SettingsPage \/>/.test(s.src.routes) || !/pattern: "\/config\/:category", parent: "\/config"/.test(s.src.smartBack))
    fail("SETTINGS_SUBPAGE_ROUTE", "routes.tsx / smartBack.ts", "/config/<categoria> com Voltar ao índice");
  const page = stripComments(s.src.settingsPage);
  if (!/SETTINGS_CATEGORIES\.map\(\(item\) => <Fragment key=\{item\.id\}>\{sections\[item\.id\]\}<\/Fragment>\)/.test(page) || !/const wide = useWideLayout\(\);/.test(page))
    fail("SETTINGS_DESKTOP_CHANGED", "SettingsPage.tsx", "desktop mantém a página única");
  if (!/SOUND_TEST_ITEMS\.map/.test(sectionBlock(page, "avancado")) || /SOUND_TEST_ITEMS\.map|testSoundSignature/.test(sectionBlock(page, "som")))
    fail("DIAGNOSTICS_IN_MAIN", "SettingsPage.tsx", "teste de sons e diagnóstico ficam em Avançado");
  if (!/\{hapticsSection\}/.test(sectionBlock(page, "som")) || !/hasNativeHaptics\(\) \? \(/.test(page) || !/label=\{t\("settings\.haptics"\)\}/.test(page))
    fail("HAPTICS_TOGGLE_MISSING", "SettingsPage.tsx", "Vibração em Som e vibração (só Android)");
  if (!/className="flex min-h-14 items-center justify-between gap-3 px-4 py-3/.test(page)) fail("INDEX_TARGETS", "SettingsPage.tsx", "linhas do índice ≥ 48px");
  if (!/activeCategory \? \(\s*<h1 className="font-serif text-2xl font-semibold text-ink" data-testid="settings-category-title">/.test(page))
    fail("HEADER_NOT_MINIMAL", "SettingsPage.tsx", "cabeçalho mínimo nas subpáginas");
  return failures;
}

export const GATES = {
  "mobile-landing-focus": validateMobileLandingFocus,
  "guided-learning-try": validateGuidedLearningTry,
  "lesson-step-progression": validateLessonStepProgression,
  "hanzi-mobile-focus": validateHanziMobileFocus,
  "practice-reward-integrity": validatePracticeRewardIntegrity,
  "native-haptics": validateNativeHaptics,
  "mobile-settings-density": validateMobileSettingsDensity,
};
