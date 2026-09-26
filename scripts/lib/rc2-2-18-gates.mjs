/**
 * RC2.2.18 — Progressive Discovery, Guided Coachmarks & Feature Unlocks.
 *
 * Seis gates sobre um estado carregado do repositório real:
 *   validateFeatureRegistry         disponibilidade derivada, pura, sem Pro/relógio, essenciais livres
 *   validateGuidanceOrchestrator    1 por vez, orçamento, pular/agora não/pular dicas, nada de XP
 *   validateNavigationDisclosure    TabBar/Sidebar/Mais/Praticar derivados, ordem estável, deep links
 *   validateGuidanceSurfaces        posição, VOLTAR/Escape, foco, 48px, movimento reduzido
 *   validateGuidanceCopyAndSettings PT/EN, frases curtas, sem manipulação, Ajustes (liga/desliga/revê)
 *   validateDiscoveryRelease        permissões progressivas, inventário de popups, promo, #273, package, freeze
 * Cada um devolve [{ code, where, why }] (vazio = passa). Os `test:*` mutam o
 * estado e exigem o código de falha certo.
 *
 * Os módulos puros (registro, orquestrador, posição do coachmark) são
 * EMPACOTADOS a partir do TEXTO do estado (esbuild), então uma mutação no
 * código é executada de verdade — não só procurada por regex.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256 } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
export const RC2_2_18_BASE = { pr290Head: "09041950", mainSha: "8594baa5" };
export const RC2_2_18_QA_FIELDS = [
  "freshAccountMinimalSurface",
  "welcomeGuidanceOnce",
  "firstLessonUnlockReveal",
  "cultureUnlockReveal",
  "guidanceNoRepeatAfterRestart",
  "guidanceSkipAll",
  "guidanceOffNoPopup",
  "coachmarkSmallDevice",
  "coachmarkAndroidBack",
  "lockedFeatureDeepLink",
  "micPrePermission",
  "notificationOfferAfterSession",
];
const FORBIDDEN_ENGINE_FILES = /(FeatureEngine|UnlockEngine|TutorialEngine|OnboardingTourEngine|FeatureDiscoveryCard|useFeatureDiscovery)\.(tsx?|mjs)$/;
const ESSENTIAL_ROUTE_PREFIXES = ["/conta", "/config", "/privacidade", "/sobre", "/mais"];
const REWARD_CALLS = /\b(addXp|grantPracticeRoundXp|addPoints|unlockAchievement|awardMedal|recordDailyTask|recordStudyDay|addDragonPearls|claimMission|setLessonMastery|lessonMasteryById)\b/;

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

export const FILES = {
  registry: "src/lib/progressiveDiscovery.ts",
  orchestrator: "src/lib/guidanceOrchestrator.ts",
  position: "src/lib/coachmarkPosition.ts",
  hook: "src/hooks/useProgressiveDiscovery.ts",
  host: "src/components/guidance/GuidanceHost.tsx",
  runtime: "src/components/guidance/guidanceRuntime.ts",
  routeGate: "src/components/guidance/FeatureRouteGate.tsx",
  settingsCard: "src/components/guidance/GuidanceSettingsCard.tsx",
  nav: "src/components/layout/nav.tsx",
  tabBar: "src/components/layout/TabBar.tsx",
  sidebar: "src/components/layout/Sidebar.tsx",
  topBar: "src/components/layout/TopBar.tsx",
  appShell: "src/components/layout/AppShell.tsx",
  hubLayout: "src/components/layout/HubLayout.tsx",
  more: "src/features/more/MorePage.tsx",
  treino: "src/features/treino/TreinoPage.tsx",
  journey: "src/features/journey/JourneyPage.tsx",
  cultureHub: "src/features/culture/CultureHubPage.tsx",
  atlas: "src/features/hanzi/HanziAtlasPage.tsx",
  routes: "src/routes.tsx",
  store: "src/lib/store.ts",
  settingsPage: "src/features/settings/SettingsPage.tsx",
  bootstrap: "src/components/native/NativeExperienceBootstrap.tsx",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
  speech: "src/lib/speech.ts",
  streakWatcher: "src/components/achievements/StreakWatcher.tsx",
  streakRecovery: "src/components/achievements/StreakRecoveryWatcher.tsx",
  achievementsWatcher: "src/components/achievements/AchievementsWatcher.tsx",
  proOffer: "src/lib/proOfferEngine.ts",
  useProOffer: "src/hooks/useProOffer.ts",
  funnel: "src/services/funnelEvents.ts",
  css: "src/index.css",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  ptBR: "src/locales/pt-BR.ts",
  en: "src/locales/en.ts",
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx?|mjs)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, read(rel)]));
  src.capacitorConfig = read(fs.existsSync(path.join(ROOT, "capacitor.config.ts")) ? "capacitor.config.ts" : "capacitor.config.json");
  src.buildGradle = read("android/app/build.gradle");
  src.e2e = read("e2e/rc2-2-18-progressive-discovery.spec.ts");
  const srcFileNames = walk("src");
  const dialogFiles = srcFileNames.filter((rel) => /\.tsx$/.test(rel) && /role="dialog"|role="alertdialog"|aria-modal|<ModalOverlay/.test(read(rel)));
  return {
    srcFileNames,
    dialogFiles,
    src,
    inventory: readJson("docs/release/rc2-2-18-guidance-inventory.json"),
    qa: readJson("docs/release/android-physical-qa.json"),
    rc2CandidateSha256: await sha256(read("docs/release/rc2-candidate.json")),
    freeze: loadBetaPedagogyFreezeState(),
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

/** Corpo `{…}` de uma função a partir da assinatura (conta chaves). */
function fnBody(text, signature) {
  const start = String(text).indexOf(signature);
  if (start < 0) return "";
  const head = signature.trimEnd().endsWith("{") ? { index: signature.length, 0: "" } : /\)\s*(?::\s*[^{=]+)?\{/.exec(String(text).slice(start));
  if (!head) return "";
  let index = start + head.index + head[0].length;
  let depth = 1;
  const begin = index;
  while (index < text.length && depth > 0) {
    const ch = text[index];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    index += 1;
  }
  return text.slice(begin, index - 1);
}

/** Bloco de uma definição no array GUIDANCE_DEFINITIONS (`id: "x"` até o `},`). */
function definitionBlock(text, id) {
  const start = String(text).indexOf(`id: "${id}"`);
  if (start < 0) return "";
  const end = String(text).indexOf("\n  },", start);
  return String(text).slice(start, end < 0 ? undefined : end);
}

/** Valor de uma chave `a.b.c` num catálogo de locale (texto). */
function localeValue(text, key) {
  const parts = key.split(".");
  let cursor = 0;
  for (let depth = 0; depth < parts.length; depth += 1) {
    const indent = "  ".repeat(depth + 1);
    const isLeaf = depth === parts.length - 1;
    const needle = isLeaf ? `\n${indent}${parts[depth]}: "` : `\n${indent}${parts[depth]}: {`;
    const at = String(text).indexOf(needle, cursor);
    if (at < 0) return undefined;
    cursor = at + needle.length;
    if (isLeaf) {
      const end = String(text).indexOf('",', cursor);
      return String(text).slice(cursor, end);
    }
  }
  return undefined;
}

// ── Execução dos módulos puros a partir do TEXTO ──────────────────────────

const bundleCache = new Map();
/**
 * Empacota os módulos puros com o texto do estado no lugar do arquivo real
 * (plugin do esbuild), e importa o resultado. Dados da Jornada vêm do repo.
 */
export async function loadModules(s) {
  const key = `${s.src.registry}\u0000${s.src.orchestrator}\u0000${s.src.position}`;
  if (bundleCache.has(key)) return bundleCache.get(key);
  const overrides = new Map([
    [path.join(ROOT, FILES.registry), s.src.registry],
    [path.join(ROOT, FILES.orchestrator), s.src.orchestrator],
    [path.join(ROOT, FILES.position), s.src.position],
  ]);
  const result = await build({
    stdin: {
      contents: `export * as registry from "./${FILES.registry}";\nexport * as orchestrator from "./${FILES.orchestrator}";\nexport * as position from "./${FILES.position}";\n`,
      resolveDir: ROOT,
      loader: "ts",
      sourcefile: "rc2-2-18-entry.ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty" },
    plugins: [
      {
        name: "rc2-2-18-overrides",
        setup(pluginBuild) {
          pluginBuild.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
            const text = overrides.get(args.path);
            return text === undefined ? undefined : { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2218-"));
  const file = path.join(dir, "bundle.mjs");
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    const mod = await import(pathToFileURL(file).href);
    bundleCache.set(key, mod);
    return mod;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function freezeInvariants(s, fail) {
  if (!/export const RC2_2_18_PROGRESSIVE_DISCOVERY_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-18-progressive-discovery"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_18_PROGRESSIVE_DISCOVERY_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze))
    fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
}

/** Estados de aluno usados nas execuções (sem relógio, sem sorteio). */
function learners(registry) {
  const base = registry.EMPTY_DISCOVERY_STATE;
  const cultureTopic = registry.FIRST_CULTURE_JOURNEY_TOPIC_ID;
  return {
    fresh: base,
    firstLesson: { ...base, completedLessons: ["p1-o-que-e-mandarim"] },
    atCulture: { ...base, completedLessons: ["p1-o-que-e-mandarim", "l1", cultureTopic] },
    mature: {
      completedLessons: ["p1-o-que-e-mandarim", "l1", "l2", "l3", "l4", "l5", "l5-rev"],
      srsItemCount: 24,
      learnedChars: ["你", "好", "我", "是", "中", "国", "人", "大", "小", "不"],
      learnedChunks: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
      cultureTouched: true,
      achievementsCount: 3,
      leagueJoined: true,
      economyIntroduced: true,
      conversationsDone: 4,
      phaseChallengeEligible: true,
    },
  };
}

// ── 1. Registro ───────────────────────────────────────────────────────────

export async function validateFeatureRegistry(s) {
  const { failures, fail } = collector();
  const registrySrc = stripComments(s.src.registry);
  let registry;
  try {
    ({ registry } = await loadModules(s));
  } catch (error) {
    fail("REGISTRY_NOT_EXECUTABLE", FILES.registry, String(error?.message ?? error).slice(0, 200));
    return failures;
  }
  const L = learners(registry);
  const vis = (id, state) => registry.featureVisibility(id, state);

  // DZ1/2 — Cultura: escondida na conta nova; libera no primeiro nó de Cultura da Jornada.
  if (vis("culture", L.fresh) !== "HIDDEN") fail("CULTURE_VISIBLE_FRESH", "progressiveDiscovery.ts", "conta nova não vê Cultura");
  if (vis("culture", L.atCulture) !== "AVAILABLE" || vis("culture", { ...L.fresh, cultureTouched: true }) !== "AVAILABLE")
    fail("CULTURE_NEVER_UNLOCKS", "progressiveDiscovery.ts", "Cultura libera no primeiro nó de Cultura da Jornada (ou com progresso cultural)");
  // PART BX — marco semântico derivado dos dados, não "lição 10".
  if (!/CULTURE_JOURNEY_PLACEMENT\.filter\(\(row\) => row\.track === "core"\)/.test(registrySrc) || /completedLessons\.length\s*>=\s*\d+[\s\S]{0,40}culture/i.test(fnBody(registrySrc, "export function featureVisibility(")))
    fail("CULTURE_RULE_NOT_SEMANTIC", "progressiveDiscovery.ts", "Cultura segue firstCultureEligibleJourneyNode, não um número de lição");
  // DZ5–8 — nada de vazio ou de competição/loja para quem acabou de chegar.
  if (vis("review", L.fresh) !== "HIDDEN" || vis("review", { ...L.fresh, srsItemCount: 1 }) !== "AVAILABLE")
    fail("REVIEW_VISIBLE_EMPTY", "progressiveDiscovery.ts", "Revisão só com itens revisáveis");
  if (vis("atlas", L.fresh) === "AVAILABLE" || vis("atlas", { ...L.fresh, learnedChars: ["你"] }) === "AVAILABLE")
    fail("ATLAS_BEFORE_HANZI", "progressiveDiscovery.ts", "Atlas só com corpus mínimo de Hànzì");
  if (vis("shop", L.fresh) !== "HIDDEN" || vis("shop", { ...L.fresh, economyIntroduced: true }) !== "AVAILABLE")
    fail("SHOP_BEFORE_ECONOMY", "progressiveDiscovery.ts", "Loja só depois da introdução da economia");
  if (vis("league", L.fresh) === "AVAILABLE" || vis("league", L.firstLesson) === "AVAILABLE")
    fail("LEAGUE_IMMEDIATE", "progressiveDiscovery.ts", "Liga depois de progresso de estudo significativo");
  if (vis("missions", L.fresh) === "AVAILABLE" || vis("missions", L.firstLesson) !== "AVAILABLE")
    fail("MISSIONS_RULE_WRONG", "progressiveDiscovery.ts", "Missões com a primeira lição concluída");
  if (vis("phaseChallenge", { ...L.fresh, phaseChallengeEligible: true }) === "AVAILABLE")
    fail("PHASE_CHALLENGE_FROM_ONBOARDING", "progressiveDiscovery.ts", "sem botão de desafio desde o onboarding");
  if (vis("journey", L.fresh) !== "AVAILABLE" || vis("practice", L.fresh) !== "AVAILABLE")
    fail("JOURNEY_NOT_PRIMARY", "progressiveDiscovery.ts", "Jornada e Praticar sempre disponíveis");
  // DZ34 — conta madura não perde nada.
  for (const id of registry.DISCOVERY_FEATURE_ORDER)
    if (vis(id, L.mature) !== "AVAILABLE") fail("MATURE_LOSES_FEATURES", `progressiveDiscovery.ts ${id}`, "conta madura mantém o app completo");
  // DZ4/22 — Pro nunca entra na regra; DZ BZ — sem relógio, sorteio, dia da semana.
  const stateType = /export interface DiscoveryLearnerState \{([\s\S]*?)\n\}/.exec(registrySrc)?.[1] ?? "";
  if (/premium|isPro|plan|subscription/i.test(stateType) || /isPremium|isPro\b|useIsPro/.test(fnBody(registrySrc, "export function featureVisibility(")))
    fail("PRO_BYPASSES_PEDAGOGY", "progressiveDiscovery.ts", "plano Pro não antecipa desbloqueio pedagógico");
  if (/Math\.random|Date\.now|new Date|getDay\(|performance\.now/.test(registrySrc))
    fail("NONDETERMINISTIC_UNLOCK", "progressiveDiscovery.ts", "sem relógio, sorteio ou dia da semana");
  // CR — números centralizados.
  const body = fnBody(registrySrc, "export function featureVisibility(");
  if (/[<>]=?\s*(?:[2-9]|\d{2,})\b/.test(body)) fail("THRESHOLD_SCATTERED", "progressiveDiscovery.ts featureVisibility", "limiares só em PROGRESSIVE_DISCOVERY_RULES");
  // PART D — controles do usuário nunca trancados.
  const blankVis = registry.featureVisibilityMap(L.fresh);
  for (const route of ["/config", "/config/conta", "/config/aparencia", "/config/privacidade", "/conta", "/privacidade", "/mais", "/sobre"])
    if (registry.routeAccess(route, blankVis).blocked) fail("ESSENTIAL_LOCKED", `routeAccess(${route})`, "controles do usuário sempre acessíveis");
  for (const prefix of ESSENTIAL_ROUTE_PREFIXES)
    if (!registry.ESSENTIAL_ROUTES.includes(prefix)) fail("ESSENTIAL_LOCKED", "ESSENTIAL_ROUTES", `${prefix} fora da lista de essenciais`);
  const routes = stripComments(s.src.routes);
  if (/path: "config", element: <FeatureRouteGate|path: "ajustes", element: <FeatureRouteGate/.test(routes))
    fail("SETTINGS_LOCKED", "routes.tsx", "Configurações nunca passam pelo portão de descoberta");
  if (/path: "config\/:category", element: <FeatureRouteGate/.test(routes) || !/aparencia: \(/.test(s.src.settingsPage))
    fail("APPEARANCE_LOCKED", "routes.tsx/SettingsPage", "Aparência sempre acessível");
  const conta = /\n    conta: \(([\s\S]*?)\n    \),/.exec(s.src.settingsPage)?.[1] ?? "";
  if (!/\n\s*<DangerZone \/>/.test(conta) || /&&\s*<DangerZone|\?\s*<DangerZone/.test(conta) || /path: "conta", element: <FeatureRouteGate/.test(routes))
    fail("DELETE_ACCOUNT_LOCKED", "SettingsPage.tsx conta", "Excluir conta sempre no fim de Conta, sem condição de progresso");
  // DZ36 — nada de estado de desbloqueio salvo (duplicaria o progresso).
  const snapshot = /interface AccountSnapshot extends XpBuckets \{([\s\S]*?)\n\}/.exec(s.src.store)?.[1] ?? "";
  if (/\b(cultureUnlocked|unlockedFeatures|featureUnlocked|featuresUnlocked|availableFeatures|leagueUnlocked|shopUnlocked)\b/.test(snapshot))
    fail("FEATURE_STATE_DUPLICATED", "store.ts AccountSnapshot", "disponibilidade é derivada; só a descoberta é salva");
  const guidanceShape = /export interface GuidanceState \{([\s\S]*?)\n\}/.exec(stripComments(s.src.orchestrator))?.[1] ?? "";
  if (/completedLessons|unlocked|available|xp|mastery/i.test(guidanceShape))
    fail("FEATURE_STATE_DUPLICATED", "guidanceOrchestrator.ts GuidanceState", "GuidanceState guarda só visto/dispensado/ligado");
  // Um motor só.
  const extra = s.srcFileNames.filter((name) => FORBIDDEN_ENGINE_FILES.test(name));
  if (extra.length) fail("DUPLICATE_DISCOVERY_ENGINE", extra.join(", "), "um registro canônico, sem motor paralelo");
  return failures;
}

// ── 2. Orquestrador ───────────────────────────────────────────────────────

export async function validateGuidanceOrchestrator(s) {
  const { failures, fail } = collector();
  let registry, orchestrator;
  try {
    ({ registry, orchestrator } = await loadModules(s));
  } catch (error) {
    fail("ORCHESTRATOR_NOT_EXECUTABLE", FILES.orchestrator, String(error?.message ?? error).slice(0, 200));
    return failures;
  }
  const L = learners(registry);
  const NOW = 1_700_000_000_000;
  const fresh = { version: 2, enabled: true, records: {}, initialized: true, availabilityMemory: [] };
  const ctx = (over = {}) => {
    const learner = over.learner ?? L.fresh;
    return {
      now: NOW,
      pathname: "/jornada",
      visibility: registry.featureVisibilityMap(learner),
      learner,
      state: fresh,
      session: orchestrator.EMPTY_GUIDANCE_SESSION,
      activeLearning: false,
      inputFocused: false,
      otherCeremonyActive: false,
      anchorsPresent: new Set(["journey-continue", "practice-recommended", "practice-review", "culture-recommended", "atlas-first-char"]),
      isNative: false,
      notificationPermissionPromptable: false,
      recentToneConfusions: 0,
      ...over,
    };
  };
  const pick = (c) => orchestrator.selectGuidance(c);

  const welcome = pick(ctx());
  if (welcome?.definition.id !== "welcome_journey_v1") fail("WELCOME_MISSING", "selectGuidance", "conta nova recebe UMA orientação de boas-vindas");
  // DZ12/30 + DQ — nunca no meio da aprendizagem, com teclado ou sobre outra cerimônia.
  if (pick(ctx({ activeLearning: true }))) fail("GUIDANCE_DURING_LESSON", "selectGuidance", "nada durante lição/revisão/fala/tom/conversa/prova");
  if (pick(ctx({ inputFocused: true }))) fail("KEYBOARD_COLLISION", "selectGuidance", "teclado aberto / campo focado → nenhuma orientação");
  if (pick(ctx({ otherCeremonyActive: true }))) fail("GUIDANCE_STACKED", "selectGuidance", "medalha/selo/ofensiva na tela → espera a vez");
  // DZ17 — dicas desligadas não mostram nada não essencial.
  if (pick(ctx({ state: { ...fresh, enabled: false } }))) fail("GUIDANCE_OFF_SHOWS", "selectGuidance", "Dicas guiadas OFF → nenhuma dica não essencial");
  // DZ14 — orçamento da sessão.
  const afterWelcome = { shownIds: ["welcome_journey_v1"], snoozedIds: [] };
  const welcomeSeen = { ...fresh, records: { welcome_journey_v1: { status: "DISMISSED", at: NOW } } };
  if (pick(ctx({ session: afterWelcome, state: welcomeSeen })))
    fail("SESSION_BUDGET_EXCEEDED", "selectGuidance", "2ª orientação da 1ª sessão só depois da primeira atividade");
  if (pick(ctx({ session: { shownIds: ["x", "y"], snoozedIds: [] }, learner: L.firstLesson, state: welcomeSeen })))
    fail("SESSION_BUDGET_EXCEEDED", "selectGuidance", "nunca 3 orientações na mesma sessão");
  if (pick(ctx({ session: { shownIds: ["practice_first_use_v1"], snoozedIds: [] }, learner: L.firstLesson, state: welcomeSeen })))
    fail("SESSION_BUDGET_EXCEEDED", "selectGuidance", "sessão normal: no máximo 1");
  // DZ13 + BD — vários desbloqueios → UM anúncio listando no máximo 2.
  const batch = pick(ctx({ learner: L.firstLesson, state: welcomeSeen }));
  if (!batch || batch.definition.id !== "new_features_v1" || batch.coveredIds.length < 2 || batch.listedFeatures.length > 2)
    fail("GUIDANCE_STACKED", "selectGuidance", "desbloqueios simultâneos viram um único 'Novos recursos disponíveis' (máx. 2 listados)");
  // DZ15/3 — dispensar vale; não repete depois de recarregar.
  if (batch) {
    const done = orchestrator.applyGuidanceAction(welcomeSeen, batch, "primary", NOW);
    for (const id of batch.coveredIds)
      if (done.records[id]?.status !== "DISMISSED") fail("DISMISS_IGNORED", "applyGuidanceAction", `${id} não ficou marcado como dispensado`);
    const again = pick(ctx({ learner: L.firstLesson, state: done }));
    if (again && batch.coveredIds.includes(again.coveredIds[0])) fail("UNLOCK_POPUP_REPEATS", "selectGuidance", "anúncio visto não volta ao recarregar");
    // DZ19 — Agora não: não volta na sessão; 24h de cooldown.
    const snoozed = orchestrator.applyGuidanceAction(welcomeSeen, batch, "now_not", NOW);
    const session = orchestrator.recordSnoozedInSession(orchestrator.EMPTY_GUIDANCE_SESSION, batch);
    const sameSession = pick(ctx({ learner: L.firstLesson, state: welcomeSeen, session }));
    const soon = pick(ctx({ learner: L.firstLesson, state: snoozed, now: NOW + 60 * 60 * 1000 }));
    const later = pick(ctx({ learner: L.firstLesson, state: snoozed, now: NOW + orchestrator.GUIDANCE_SNOOZE_MS + 1 }));
    if (sameSession || soon) fail("NOW_NOT_REPEATS", "selectGuidance", "'Agora não' não volta na mesma sessão nem antes do cooldown");
    if (!later) fail("NOW_NOT_FOREVER", "selectGuidance", "'Agora não' pode voltar depois do cooldown ('Pular' é que é para sempre)");
    if ((orchestrator.GUIDANCE_SNOOZE_MS ?? 0) < 24 * 60 * 60 * 1000) fail("NOW_NOT_REPEATS", "GUIDANCE_SNOOZE_MS", "cooldown mínimo de 24h");
  }
  // DZ16 — Pular dicas desliga as não essenciais.
  const skipAll = orchestrator.applyGuidanceAction(fresh, { coveredIds: ["welcome_journey_v1"] }, "skip_all", NOW);
  if (skipAll.enabled !== false) fail("SKIP_ALL_IGNORED", "applyGuidanceAction", "'Pular dicas' desliga as orientações não essenciais");
  const skipOne = orchestrator.applyGuidanceAction(fresh, { coveredIds: ["culture_first_use_v1"] }, "skip", NOW);
  if (skipOne.records.culture_first_use_v1?.status !== "SKIPPED" || skipOne.enabled !== true)
    fail("DISMISS_IGNORED", "applyGuidanceAction", "'Pular' = só esta dica, para sempre");
  // DZ18 — dicas desligadas não impedem a área de liberar.
  if (registry.featureVisibility("culture", L.atCulture) !== "AVAILABLE" || /state\.enabled|guidance/.test(fnBody(stripComments(s.src.registry), "export function featureVisibility(")))
    fail("UNLOCK_NEEDS_TIPS", "progressiveDiscovery.ts", "área libera com ou sem dicas");
  // DI (revisto no RC2.2.19) — conta antiga: nada de enxurrada nem de lote
  // "Novos recursos" do que já usa; a orientação nunca vista continua
  // elegível, uma por sessão (ver gate:rc2-2-19).
  const legacy = orchestrator.initializeGuidanceState({ ...fresh, initialized: false }, registry.featureVisibilityMap(L.mature), L.mature, NOW);
  const legacyPick = pick(ctx({ learner: L.mature, state: legacy }));
  if (legacyPick && (legacyPick.definition.id === "new_features_v1" || legacyPick.coveredIds.length > 1))
    fail("UNLOCK_POPUP_REPEATS", "initializeGuidanceState", "conta antiga não recebe lote 'Novos recursos' do que já usa");
  // DZ35 — rever dicas não mexe em progresso.
  const reset = orchestrator.resetGuidanceState({ ...legacy, enabled: false });
  if (Object.keys(reset.records).length !== 0 || reset.enabled !== true) fail("RESET_BROKEN", "resetGuidanceState", "zera o visto e religa");
  const resetBody = fnBody(stripComments(s.src.settingsCard), "export function GuidanceSettingsCard(");
  if (/reset(Progress|Account|Store|AllProgress)|completedLessons|clearProgress|localStorage\.clear/.test(resetBody) || !/updateGuidance\(\(state\) => resetGuidanceState\(state\)\)/.test(resetBody))
    fail("RESET_RESETS_PROGRESS", "GuidanceSettingsCard.tsx", "Rever dicas nunca reseta progresso");
  // DZ23/24/25 — nada de XP, medalha, Qi ou domínio por abrir/ler/desbloquear.
  for (const [key, label] of [["orchestrator", FILES.orchestrator], ["host", FILES.host], ["runtime", FILES.runtime], ["settingsCard", FILES.settingsCard], ["registry", FILES.registry], ["routeGate", FILES.routeGate]]) {
    const match = REWARD_CALLS.exec(stripComments(s.src[key]));
    if (match) {
      const code = /mastery/i.test(match[1]) ? "UNLOCK_CHANGES_MASTERY" : /Achievement|Medal/.test(match[1]) ? "COACHMARK_GRANTS_ACHIEVEMENT" : "UNLOCK_GRANTS_XP";
      fail(code, label, `${match[1]} fora de lugar: desbloquear/ler dica não recompensa`);
    }
  }
  // Uma orientação por vez na tela.
  const host = stripComments(s.src.host);
  if (!/if \(current \|\| !context\) return undefined;/.test(host) || !/if \(!fresh \|\| getCurrentGuidance\(\)\)/.test(host))
    fail("GUIDANCE_STACKED", "GuidanceHost.tsx", "nunca uma segunda orientação enquanto outra está na tela");
  if (!/holdCelebration\(GUIDANCE_CEREMONY_ID\)/.test(host) || !/useOtherCelebrationActive\("streak"\)/.test(s.src.streakWatcher) || !/useOtherCelebrationActive\("streak-recovery"\)/.test(s.src.streakRecovery))
    fail("GUIDANCE_STACKED", "GuidanceHost/Streak watchers", "medalha + desbloqueio + ofensiva nunca empilham");
  return failures;
}

// ── 3. Navegação ──────────────────────────────────────────────────────────

export async function validateNavigationDisclosure(s) {
  const { failures, fail } = collector();
  const nav = stripComments(s.src.nav);
  const tab = stripComments(s.src.tabBar);
  // BR/BU — barra derivada, ordem final estável.
  const bar = fnBody(nav, "export function mobileNavForStage(");
  const order = [...bar.matchAll(/NAV\.(\w+)/g)].map((m) => m[1]);
  if (JSON.stringify(order) !== JSON.stringify(["jornada", "treino", "cultura", "missoes", "mais"]))
    fail("TABBAR_ORDER_UNSTABLE", "nav.tsx mobileNavForStage", `ordem final Jornada · Praticar · Cultura · Missões · Mais (${order.join(",")})`);
  if (!/\]\.filter\(\(item\) => isNavItemDiscovered\(item, visibility\)\)/.test(bar) || !/mobileNavForStage\(profile\.stage, visibility\)/.test(tab))
    fail("CULTURE_VISIBLE_FRESH", "nav.tsx/TabBar.tsx", "a barra filtra pelo registro (conta nova: Jornada · Praticar · Mais)");
  const mapping = /export const NAV_DISCOVERY_FEATURE[^=]*= \{([\s\S]*?)\};/.exec(nav)?.[1] ?? "";
  for (const [route, feature] of [["/cultura", "culture"], ["/revisao", "review"], ["/ligas", "league"], ["/loja", "shop"], ["/conquistas", "achievements"], ["/missoes", "missions"], ["/imersao", "immersion"], ["/ideogramas", "hanzi"]])
    if (!new RegExp(`"${route}": "${feature}"`).test(mapping)) fail("NAV_NOT_DERIVED", "nav.tsx NAV_DISCOVERY_FEATURE", `${route} → ${feature}`);
  if (/"\/(config|conta|ajustes|perfil|sobre|mais|privacidade)"\s*:/.test(mapping)) fail("ESSENTIAL_LOCKED", "nav.tsx NAV_DISCOVERY_FEATURE", "controles do usuário nunca entram no filtro");
  if (!/desktopNavForStage\(profile\.stage, visibility\)/.test(s.src.sidebar) || !/practiceFlyoutItems\(visibility\)/.test(s.src.sidebar) || !/moreFlyoutGroups\(items, visibility\)/.test(s.src.sidebar))
    fail("NAV_NOT_DERIVED", "Sidebar.tsx", "sidebar e flyouts derivam do registro");
  if (!/practiceMobileSheetItems\(items, visibility\)/.test(tab) || !/moreMobileSheetGroups\(items, visibility\)/.test(tab))
    fail("NAV_NOT_DERIVED", "TabBar.tsx", "sheets Praticar/Mais derivam do registro");
  // Z — aba nova entra discreta.
  if (!/longyu-tab-appear/.test(tab)) fail("NAV_TRANSITION_MISSING", "TabBar.tsx", "aba recém-descoberta entra com animação discreta");
  // AO — sem parede de cadeados.
  const preview = fnBody(nav, "export function previewNavItems(");
  if (!/limit = 2/.test(nav) || !/\.slice\(0, limit\)/.test(preview) || !/previewNavItems\(visibility\)/.test(s.src.more))
    fail("WALL_OF_LOCKS", "nav.tsx/MorePage.tsx", "no máximo 2 próximos recursos, discretos");
  if (!/isNavItemDiscovered\(nav, visibility\)/.test(s.src.more) || !/featureAvailability\(feature, completedLessons\)\.locked/.test(s.src.more))
    fail("WALL_OF_LOCKS", "MorePage.tsx", "Mais esconde o que não foi descoberto / está trancado");
  // S/T — Praticar sem modo vazio.
  if (!/if \(item\.to\?\.startsWith\("\/revisao"\)\) return reviewAvailable;/.test(s.src.treino) || !/data-coachmark-target="practice-recommended"/.test(s.src.treino))
    fail("REVIEW_VISIBLE_EMPTY", "TreinoPage.tsx", "Revisão só com itens; recomendado primeiro");
  // AI — Qi/Loja só depois da economia.
  if (!/\{shopAvailable && \(\s*<StatPill\s+to="\/loja"/.test(s.src.topBar)) fail("SHOP_BEFORE_ECONOMY", "TopBar.tsx", "atalho de Qi/Loja só depois da introdução");
  // DJ/DK — sem re-trancar durante o carregamento do sync.
  const hook = stripComments(s.src.hook);
  if (!/mergeStickyVisibility\(derived, \[\.\.\.confirmed, \.\.\.remembered\]\)/.test(hook) || !/if \(ready\) \{\s*for \(const id of DISCOVERY_FEATURE_ORDER\) if \(derived\[id\] === "AVAILABLE"\) confirmed\.add\(id\);/.test(hook))
    fail("FEATURE_RELOCKS_DURING_SYNC", "useProgressiveDiscovery.ts", "área liberada nesta sessão não some enquanto o sync carrega");
  try {
    const { registry } = await loadModules(s);
    const merged = registry.mergeStickyVisibility(registry.featureVisibilityMap(registry.EMPTY_DISCOVERY_STATE), new Set(["culture"]));
    if (merged.culture !== "AVAILABLE") fail("FEATURE_RELOCKS_DURING_SYNC", "mergeStickyVisibility", "última disponibilidade confirmada vence o vazio momentâneo");
    // AP/AQ — deep link: HARD bloqueia com página; SOFT abre a própria página.
    const blank = registry.featureVisibilityMap(registry.EMPTY_DISCOVERY_STATE);
    for (const route of ["/cultura", "/cultura/greetings-nihao", "/imersao"])
      if (!registry.routeAccess(route, blank).blocked) fail("DEEP_LINK_BYPASS", `routeAccess(${route})`, "URL manual não pula desbloqueio pedagógico");
  } catch (error) {
    fail("REGISTRY_NOT_EXECUTABLE", FILES.registry, String(error?.message ?? error).slice(0, 200));
  }
  const routes = stripComments(s.src.routes);
  for (const path of ["cultura", "cultura/revisao", "cultura/colecao/:collectionId", "cultura/:id", "imersao"])
    if (!new RegExp(`path: "${path.replace(/[/:]/g, (c) => `\\${c}`)}", element: <FeatureRouteGate>`).test(routes))
      fail("DEEP_LINK_BYPASS", `routes.tsx ${path}`, "rota de área HARD passa pelo FeatureRouteGate");
  const gate = stripComments(s.src.routeGate);
  if (!/if \(access\.blocked\) return <FeatureUnavailablePage feature=\{access\.feature\} \/>;/.test(gate) || !/to="\/jornada"/.test(gate) || !/discovery\.unavailable\.cta/.test(gate))
    fail("DEEP_LINK_BLANK", "FeatureRouteGate.tsx", "página simples com 'Continuar Jornada', nunca tela branca");
  if (/Pague|assine|subscribe|checkout|\/pro\b/i.test(gate)) fail("DEEP_LINK_BLANK", "FeatureRouteGate.tsx", "sem 'pague para desbloquear'");
  return failures;
}

// ── 4. Superfícies (posição, VOLTAR, foco, movimento) ─────────────────────

export async function validateGuidanceSurfaces(s) {
  const { failures, fail } = collector();
  const host = stripComments(s.src.host);
  let position;
  try {
    ({ position } = await loadModules(s));
  } catch (error) {
    fail("POSITION_NOT_EXECUTABLE", FILES.position, String(error?.message ?? error).slice(0, 200));
    return failures;
  }
  const viewport = { width: 360, height: 740 };
  const cases = [
    { target: { top: 110, bottom: 158, left: 16, width: 328 }, card: { width: 328, height: 170 }, name: "alvo no topo" },
    { target: { top: 560, bottom: 608, left: 16, width: 328 }, card: { width: 328, height: 170 }, name: "alvo perto da barra inferior" },
    { target: { top: 300, bottom: 348, left: 250, width: 100 }, card: { width: 328, height: 170 }, name: "alvo à direita" },
    { target: { top: 280, bottom: 330, left: 16, width: 328 }, card: { width: 328, height: 420 }, name: "balão maior que o espaço (fonte 150%)" },
  ];
  const safeTop = 24;
  const safeBottom = 64 + 48;
  for (const { target, card, name } of cases) {
    const pos = position.computeCoachmarkPosition({ target, card, viewport, safeTop, safeBottom });
    const bottom = pos.top + card.height;
    if (pos.top < safeTop || bottom > viewport.height - safeBottom || pos.left < 0 || pos.left + card.width > viewport.width)
      fail("COACHMARK_OUTSIDE_VIEWPORT", `computeCoachmarkPosition (${name})`, "dentro da tela, fora da status bar e da barra inferior/navegação");
    const room = viewport.height - safeBottom - 8;
    const fits = room - (target.bottom + 10) >= card.height || target.top - 10 - (safeTop + 8) >= card.height;
    const overlaps = pos.top < target.bottom && bottom > target.top;
    if (fits && overlaps) fail("TOOLTIP_COVERS_TARGET", `computeCoachmarkPosition (${name})`, "o balão nunca cobre o alvo quando há espaço");
  }
  // DE — VOLTAR (Android) = Escape: fecha a orientação primeiro.
  const surfaces = (host.match(/data-native-back-dismiss/g) ?? []).length;
  if (surfaces < 2 || !/if \(event\.key !== "Escape"\) return;[\s\S]{0,120}onAction\(secondary\)/.test(host))
    fail("BACK_EXITS_APP", "GuidanceHost.tsx", "VOLTAR/Escape fecha o coachmark antes de navegar");
  // DD — acessibilidade.
  if ((host.match(/role="dialog"/g) ?? []).length < 2 || (host.match(/aria-describedby=\{bodyId\}/g) ?? []).length < 2 || (host.match(/focusPrimary\(cardRef\.current\)/g) ?? []).length < 2)
    fail("A11Y_FOCUS_BROKEN", "GuidanceHost.tsx", "dialog rotulado, descrito e com foco no botão principal");
  if ((host.match(/className="min-h-12/g) ?? []).length < 3 || /aria-label="(Fechar|Close)"[^>]*>\s*×/.test(host))
    fail("A11Y_FOCUS_BROKEN", "GuidanceHost.tsx", "botões ≥48px e nunca um X minúsculo como única saída");
  // CI — movimento reduzido: fade simples; desbloqueio ≤ 500 ms.
  const css = s.src.css;
  const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
  if (!/\.longyu-guidance-in,\s*\.longyu-unlock-reveal,\s*\.longyu-tab-appear \{\s*animation: longyu-fade-in/.test(reduced))
    fail("REDUCED_MOTION_IGNORED", "index.css", "movimento reduzido → fade simples");
  const unlockMs = Number(/\.longyu-unlock-reveal \{\s*animation: longyu-unlock-reveal (\d+)ms/.exec(css)?.[1] ?? "9999");
  if (unlockMs > 500) fail("REDUCED_MOTION_IGNORED", "index.css", "animação de desbloqueio ≤ 500 ms");
  // CJ — 1 haptic só no desbloqueio; coachmark comum e dispensar: nenhum.
  const hapticCalls = (host.match(/hapticOnce\(/g) ?? []).length;
  if (hapticCalls !== 1 || !/if \(fresh\.definition\.priority === "FEATURE_UNLOCK"\) \{[\s\S]{0,300}hapticOnce\(/.test(host))
    fail("HAPTIC_SPAM", "GuidanceHost.tsx", "1 haptic por desbloqueio; nenhum em coachmark ou dispensar");
  // Nunca em modo foco (lição, prova, treino ativo).
  if (!/\{!focusMode && <GuidanceHost \/>\}/.test(s.src.appShell)) fail("GUIDANCE_DURING_LESSON", "AppShell.tsx", "orientação não é montada em modo foco");
  if (!/document\.documentElement\.dataset\.lessonPlayer/.test(host)) fail("GUIDANCE_DURING_LESSON", "GuidanceHost.tsx", "confere o player no instante de mostrar");
  if (!/isTypingTarget\(document\.activeElement\)/.test(host)) fail("KEYBOARD_COLLISION", "GuidanceHost.tsx", "confere teclado/campo focado no instante de mostrar");
  return failures;
}

// ── 5. Texto e Ajustes ────────────────────────────────────────────────────

export async function validateGuidanceCopyAndSettings(s) {
  const { failures, fail } = collector();
  const orchestrator = stripComments(s.src.orchestrator);
  const keys = new Set();
  for (const match of orchestrator.matchAll(/(?:titleKey|bodyKey|primaryKey): "([\w.]+)"/g)) keys.add(match[1]);
  for (const key of ["guidance.common.gotIt", "guidance.common.nowNot", "guidance.common.skip", "guidance.common.skipAll", "guidance.settings.title", "guidance.settings.description", "guidance.settings.reset", "discovery.unavailable.culture", "discovery.unavailable.cta", "discovery.previewHint", "player.micPrePermission"]) keys.add(key);
  for (const key of keys) {
    const pt = localeValue(s.src.ptBR, key);
    const en = localeValue(s.src.en, key);
    if (!pt || !en) {
      fail("GUIDANCE_HARDCODED_PT", `locales ${key}`, "toda orientação existe em PT-BR e EN");
      continue;
    }
    // AU — 1–2 frases.
    const sentences = pt.split(/[.!?](?:\s|$)/).filter((part) => part.trim().length > 0).length;
    if (sentences > 2 || pt.length > 160) fail("GUIDANCE_TOO_LONG", `pt-BR ${key}`, "máximo 1–2 frases curtas");
  }
  // Sem texto PT solto nas superfícies.
  const surfaces = `${stripComments(s.src.host)}\n${stripComments(s.src.settingsCard)}\n${stripComments(s.src.routeGate)}`;
  const jsxText = [...surfaces.matchAll(/>\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?: [a-záéíóúâêôãõç]+)+)\s*</g)].map((m) => m[1]);
  if (jsxText.length) fail("GUIDANCE_HARDCODED_PT", "GuidanceHost/SettingsCard/FeatureRouteGate", `texto fixo: ${jsxText.slice(0, 3).join(" | ")}`);
  if (/"(Entendi|Agora não|Pular dicas|Pular)"/.test(surfaces)) fail("GUIDANCE_HARDCODED_PT", "superfícies de orientação", "rótulos via t()");
  // AB/AD/CE — sem moeda, sem pressão.
  const culture = `${localeValue(s.src.ptBR, "guidance.cultureUnlocked.title")} ${localeValue(s.src.ptBR, "guidance.cultureUnlocked.body")}`;
  if (/ganhou|recompensa|prêmio/i.test(culture)) fail("CULTURE_AS_REWARD", "pt-BR guidance.cultureUnlocked", "Cultura é descoberta, não moeda");
  const missions = `${localeValue(s.src.ptBR, "guidance.missionsUnlocked.body")}`;
  if (/agora|perder|antes que|última chance|corra/i.test(missions)) fail("MANIPULATIVE_COPY", "pt-BR guidance.missionsUnlocked", "sem urgência/manipulação");
  const league = `${localeValue(s.src.ptBR, "guidance.leagueUnlocked.body")}`;
  if (!/XP de estudo/.test(league) || !/Pro não muda o ranking/.test(league)) fail("LEAGUE_COPY_WRONG", "pt-BR guidance.leagueUnlocked", "Liga usa XP de estudo; Pro não muda ranking");
  const shop = definitionBlock(orchestrator, "shop_introduction_v1");
  if (/primaryTo:/.test(shop)) fail("SHOP_AUTO_OPEN", "guidanceOrchestrator.ts shop_introduction_v1", "nunca abre a Loja sozinho");
  // H/I — Ajustes › Aprendizagem.
  const learning = /\n    aprendizagem: \(([\s\S]*?)\n    \),/.exec(s.src.settingsPage)?.[1] ?? "";
  if (!/<GuidanceSettingsCard \/>/.test(learning)) fail("SETTINGS_TOGGLE_MISSING", "SettingsPage.tsx aprendizagem", "Dicas guiadas em Ajustes › Aprendizagem");
  const card = stripComments(s.src.settingsCard);
  if (!/role="switch"/.test(card) || !/updateGuidance\(\(state\) => \(\{ \.\.\.state, enabled: !enabled \}\)\)/.test(card) || !/data-testid="guidance-reset"/.test(card))
    fail("SETTINGS_TOGGLE_MISSING", "GuidanceSettingsCard.tsx", "liga/desliga + Rever dicas do aplicativo");
  // AZ/BA — as três saídas.
  if (!/secondary: "now_not" \| "skip";/.test(orchestrator) || !/GUIDANCE_ACTIONS: readonly GuidanceAction\[\] = \["primary", "now_not", "skip", "skip_all"\]/.test(orchestrator))
    fail("DISMISS_IGNORED", "guidanceOrchestrator.ts", "Entendi · Agora não · Pular · Pular dicas");
  return failures;
}

// ── 6. Release, permissões, inventário ────────────────────────────────────

export async function validateDiscoveryRelease(s) {
  const { failures, fail } = collector();
  freezeInvariants(s, fail);
  // DZ37 — #273 intocada.
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("ISSUE_273_TOUCHED", "docs/release/rc2-candidate.json", "candidate/cloud congelados (#273)");
  // DZ38 — package.
  if (!/appId: "longyu\.noba\.com"/.test(s.src.capacitorConfig) || !/applicationId "longyu\.noba\.com"/.test(s.src.buildGradle))
    fail("PACKAGE_CHANGED", "capacitor/build.gradle", "package segue longyu.noba.com");
  // BM–BQ — permissões progressivas.
  const boot = stripComments(s.src.bootstrap);
  if (/NativePermissionIntro|requestNotificationPermission|requestNativeMicrophone/.test(boot))
    fail("PERMISSIONS_ON_FIRST_LAUNCH", "NativeExperienceBootstrap.tsx", "nada pedido no primeiro launch");
  const host = stripComments(s.src.host);
  if (/requestNativeMicrophone/.test(host) || !/if \(shown\.definition\.id === "notifications_offer_v1"\) \{\s*void requestNotificationPermission\(\);\s*return;/.test(host))
    fail("PERMISSIONS_TOGETHER", "GuidanceHost.tsx", "notificação só pela oferta; microfone nunca junto");
  const offer = definitionBlock(stripComments(s.src.orchestrator), "notifications_offer_v1");
  if (!/nativeOnly: true/.test(offer) || !/case "notifications_offer_v1":\s*[\s\S]{0,200}ctx\.notificationPermissionPromptable && ctx\.learner\.completedLessons\.length > 0/.test(stripComments(s.src.orchestrator)))
    fail("PERMISSIONS_ON_FIRST_LAUNCH", "guidanceOrchestrator.ts", "notificação: só Android, só depois da 1ª sessão, só se ainda não decidida");
  if (!/micNeedsAsk && \(\s*<p[^>]*data-testid="speech-mic-pre-permission"/.test(s.src.pronunciation) || !/data-testid="speech-open-settings"/.test(s.src.pronunciation))
    fail("MIC_WITHOUT_PRE_PERMISSION", "PronunciationPractice.tsx", "pré-permissão antes do diálogo; negado → Ajustes, sem pedir de novo");
  // DO — inventário de popups.
  const listed = new Set((s.inventory.entries ?? []).map((entry) => entry.file));
  const classes = new Set(s.inventory.classes ?? []);
  for (const file of s.dialogFiles) if (!listed.has(file)) fail("POPUP_NOT_INVENTORIED", file, "todo modal/popover/coachmark classificado no inventário");
  for (const entry of s.inventory.entries ?? [])
    if (!classes.has(entry.class)) fail("POPUP_NOT_INVENTORIED", entry.file, `classe inválida: ${entry.class}`);
  const guidanceHost = (s.inventory.entries ?? []).find((entry) => entry.file === FILES.host);
  if (!guidanceHost || guidanceHost.class !== "GUIDANCE" || guidanceHost.orchestrated !== true)
    fail("POPUP_NOT_INVENTORIED", FILES.host, "orientação = GUIDANCE, orquestrada");
  // DP — promoção nunca nas primeiras sessões.
  const promo = stripComments(s.src.proOffer);
  if (!/PROMO_MIN_COMPLETED_LESSONS = [3-9]/.test(promo) || !/if \(\(input\.completedLessonsCount \?\? Number\.POSITIVE_INFINITY\) < PROMO_MIN_COMPLETED_LESSONS\) \{\s*return deny\("first_sessions", cls\);/.test(promo) || !/completedLessonsCount \}/.test(s.src.useProOffer))
    fail("PROMO_IN_FIRST_SESSIONS", "proOfferEngine.ts/useProOffer.ts", "promoção não solicitada nunca nas primeiras sessões");
  // CD/CE — eventos sem PII.
  for (const event of ["guidance_shown", "guidance_dismissed", "feature_unlocked", "feature_opened_after_unlock"])
    if (!s.src.funnel.includes(`"${event}"`)) fail("ANALYTICS_MISSING", "funnelEvents.ts", event);
  for (const match of host.matchAll(/trackFunnelEvent\("[\w_]+", \{([^}]*)\}/g))
    if (/email|name|user|account|phone/i.test(match[1])) fail("ANALYTICS_PII", "GuidanceHost.tsx", "eventos só com ids de orientação/área");
  // Compras Android seguem desligadas; nenhum streak novo.
  if (/Streak(Engine|V2)|newStreak|streakV2/.test(stripComments(`${s.src.host}\n${s.src.orchestrator}\n${s.src.registry}`)))
    fail("NEW_STREAK", "guidance", "nada de nova ofensiva");
  // QA físico honesto.
  for (const field of RC2_2_18_QA_FIELDS) {
    const value = s.qa[field];
    if (value === undefined) fail("QA_FIELD_MISSING", "android-physical-qa.json", field);
    else if (value === "PASS" && !s.qa.deviceModel) fail("PHYSICAL_PASS_WITHOUT_EVIDENCE", `android-physical-qa.json ${field}`, "PASS só com aparelho real");
  }
  if (!(s.qa.knownRisks ?? []).some((risk) => risk.id === "ANDROID_RC2_2_18_DISCOVERY_UNVERIFIED"))
    fail("QA_FIELD_MISSING", "android-physical-qa.json knownRisks", "risco da descoberta sem aparelho");
  // E2E cobre a matriz CT–DC.
  for (const id of ["CT", "CU", "CV", "CW", "CX", "CY", "CZ", "DA", "DB", "DC", "DE", "CN"])
    if (!new RegExp(`${id}[:)]`).test(s.src.e2e)) fail("E2E_MISSING", "e2e/rc2-2-18-progressive-discovery.spec.ts", `cenário ${id}`);
  return failures;
}

export const VALIDATORS = {
  "feature-registry": validateFeatureRegistry,
  "guidance-orchestrator": validateGuidanceOrchestrator,
  "navigation-disclosure": validateNavigationDisclosure,
  "guidance-surfaces": validateGuidanceSurfaces,
  "guidance-copy-settings": validateGuidanceCopyAndSettings,
  "discovery-release": validateDiscoveryRelease,
};
