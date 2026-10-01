/**
 * RC2.2.23 — PRODUCT CONVERGENCE / OWNER PHYSICAL EXPERIENCE.
 *
 * Dez áreas. O gate prova a CONVERGÊNCIA no código (a orientação chega, zero
 * Cargas não trava, a barra é conquistada, a revisão não satura, Hànzì legível,
 * tom em micro-telas, cena que reage, perfil à mão) e que a verdade física
 * continua honesta: nada vira PHYSICAL_PASS sem evidência.
 *
 *   guidance-delivery     nunca descarte calado; card sem âncora; AUTO_SEEDED
 *                         pendente; build nativo/QA nunca suprimido; orçamento;
 *                         nada durante aula/modal; reason codes; painel só QA
 *   energy-soft-landing   erro custa só Vida; só progressão nova custa Carga;
 *                         zero Cargas deixa revisar/praticar/cultura/replay;
 *                         Pro nunca é o único caminho; copy sem mistura
 *   progressive-navigation abas conquistadas (≤ 3 cedo), Mais começa por Você
 *   mobile-density        uma ação principal; feedback curto sem bloco gigante
 *   review-repetition     ≤ 2 por alvo na rodada; REDUNDANT detectado; nunca
 *                         "limpo" com saturação; mesma fila do SRS
 *   review-hanzi          piso por papel (64/48/44) e todo papel marcado
 *   guided-tones          VER→…→CONTEXTO, um conceito por tela, sem língua
 *   immersion-depth       falante, reação à escolha, áudio, glossário, recap
 *   profile-account       primeira dobra do perfil, Sair visível, Aparência
 *   physical-truth        P1 físicos carregados, painel honesto, package,
 *                         compras, #273, Production, freeze
 * Cada um devolve [{ code, where, why }]. Módulos puros são EMPACOTADOS a partir
 * do texto (esbuild), então as mutações do `test:*` valem de verdade.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256 } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
export const RC2_2_23_BASE_SHA = "3b3d9222b695615c9fd59e2cf1aebf0336cb9c2e";
export const RC2_2_23_PARENT_BRANCH = "claude/rc2-2-22-closed-beta-candidate";
const EVIDENCE_LABELS = ["OBSERVED", "INFERRED", "NOT_TESTED"];
const REQUIRED_NEW_BUGS = ["GUIDANCE_DELIVERY_NOT_VISIBLE_OWNER_DEVICE", "ENERGY_DEPLETION_FEELS_LIKE_APP_LOCK", "REVIEW_SEMANTIC_REPETITION", "REVIEW_HANZI_PHYSICAL_TOO_SMALL", "MOBILE_INFORMATION_DENSITY", "IMMERSION_DEPTH_GAP"];
const CARRIED_PHYSICAL_P1 = ["SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID", "NATIVE_SPEECH_NOT_PROVEN", "ANDROID_TTS_NOT_PROVEN_ACROSS_SURFACES", "LESSON_ADVANCE_DEVICE_REGRESSION_RISK", "MOBILE_SIGNUP_NOT_PHYSICALLY_PROVEN", "PASSWORD_RECOVERY_NOT_PHYSICALLY_PROVEN"];
const REPORTS = ["guidance-delivery", "energy-soft-landing", "semantic-repetition", "mobile-simplification", "immersion-depth"];

export const FILES = {
  orchestrator: "src/lib/guidanceOrchestrator.ts",
  suppression: "src/lib/guidanceSuppression.ts",
  host: "src/components/guidance/GuidanceHost.tsx",
  runtime: "src/components/guidance/guidanceRuntime.ts",
  qaPanel: "src/features/qa/GuidanceDeliveryPanel.tsx",
  qaPage: "src/features/qa/QaDevicePage.tsx",
  cultureHub: "src/features/culture/CultureHubPage.tsx",
  energy: "src/lib/energyPolicy.ts",
  economy: "src/data/economy.ts",
  store: "src/lib/store.ts",
  player: "src/features/lesson/LessonPlayer.tsx",
  lessonDetail: "src/features/lesson/LessonDetailPage.tsx",
  softLanding: "src/components/pro/EnergySoftLanding.tsx",
  paywall: "src/components/pro/ProPaywall.tsx",
  localePt: "src/locales/pt-BR.ts",
  nav: "src/components/layout/nav.tsx",
  tabBar: "src/components/layout/TabBar.tsx",
  more: "src/features/more/MorePage.tsx",
  repetition: "src/lib/semanticRepetition.ts",
  reviewComposer: "src/lib/reviewSessionComposer.ts",
  review: "src/features/revisao/RevisaoPage.tsx",
  toneMicrolesson: "src/lib/toneMicrolesson.ts",
  toneKnowledge: "src/data/toneKnowledge.ts",
  toneMicrolessonUi: "src/components/tone/ToneMicrolesson.tsx",
  som: "src/features/som/SomPage.tsx",
  storyReaction: "src/lib/storyReaction.ts",
  immersion: "src/features/immersion/ImmersionPage.tsx",
  profile: "src/features/perfil/ProfilePage.tsx",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
  selfCompare: "src/features/lesson/SelfComparePractice.tsx",
  steps: "src/features/lesson/steps.tsx",
  signupTrace: "src/lib/signupTrace.ts",
  finalizeSignup: "src/features/auth/FinalizeCadastroPage.tsx",
  authService: "src/services/authService.ts",
  subscription: "src/services/subscriptionService.ts",
  releaseIdentity: "scripts/lib/release-identity.mjs",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const optionalJson = (rel) => (exists(rel) ? JSON.parse(read(rel)) : null);
const optionalText = (rel) => (exists(rel) ? read(rel) : "");
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  src.capacitorConfig = read(exists("capacitor.config.ts") ? "capacitor.config.ts" : "capacitor.config.json");
  return {
    src,
    base: optionalJson("docs/release/rc2-2-23-base.json"),
    bugs: optionalJson("docs/release/rc2-2-23-product-convergence-bugs.json"),
    previousBugs: optionalJson("docs/release/rc2-2-22-beta-bugs.json"),
    repetitionAudit: optionalJson("docs/reports/rc2-2-23-semantic-repetition.json"),
    reports: Object.fromEntries(REPORTS.map((name) => [name, optionalText(`docs/reports/rc2-2-23-${name}.md`)])),
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

function body(text, signature) {
  const source = String(text);
  const start = source.indexOf(signature);
  if (start < 0) return "";
  const open = source.indexOf("{", start + signature.length - 1);
  let depth = 1;
  let index = open + 1;
  while (index < source.length && depth > 0) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") depth -= 1;
    index += 1;
  }
  return source.slice(open + 1, index - 1);
}

// ── Módulos puros executados a partir do TEXTO ─────────────────────────────

const MODULE_KEYS = ["orchestrator", "suppression", "energy", "repetition", "reviewComposer", "toneMicrolesson", "storyReaction"];
const OVERRIDE_KEYS = [...MODULE_KEYS, "toneKnowledge"];
const bundleCache = new Map();

export async function loadModules(s) {
  const cacheKey = OVERRIDE_KEYS.map((key) => s.src[key]).join("\u0000");
  if (bundleCache.has(cacheKey)) return bundleCache.get(cacheKey);
  const overrides = new Map(OVERRIDE_KEYS.map((key) => [path.join(ROOT, FILES[key]), s.src[key]]));
  const result = await build({
    stdin: { contents: MODULE_KEYS.map((key) => `export * as ${key} from "./${FILES[key]}";`).join("\n") + '\nexport * as toneKnowledge from "./src/data/toneKnowledge.ts";', resolveDir: ROOT, loader: "ts", sourcefile: "rc2-2-23-entry.ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": '{"DEV":true}' },
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty", ".webp": "empty", ".mp3": "empty" },
    plugins: [
      {
        name: "rc2-2-23-overrides",
        setup(pluginBuild) {
          pluginBuild.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
            const text = overrides.get(args.path);
            return text === undefined ? undefined : { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2223-"));
  const file = path.join(dir, "bundle.mjs");
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    const mod = await import(pathToFileURL(file).href);
    bundleCache.set(cacheKey, mod);
    return mod;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function withModules(s, fail, where, fn) {
  let mods;
  try {
    mods = await loadModules(s);
  } catch (error) {
    fail("MODULE_NOT_EXECUTABLE", where, String(error?.message ?? error).slice(0, 200));
    return;
  }
  try {
    fn(mods);
  } catch (error) {
    fail("MODULE_NOT_EXECUTABLE", where, String(error?.message ?? error).slice(0, 200));
  }
}

// ── Contexto de orientação (conta com 1 lição, tudo liberado) ──────────────

/** Só `profile_entry_v1` pendente: as outras já resolvidas (DISMISSED). */
function guidanceContext(o, overrides = {}) {
  const visibility = new Proxy({}, { get: () => "AVAILABLE" });
  const records = Object.fromEntries(o.GUIDANCE_DEFINITIONS.filter((d) => d.id !== "profile_entry_v1").map((d) => [d.id, { status: "DISMISSED", at: 1 }]));
  const extra = overrides.records ?? {};
  delete overrides.records;
  return {
    now: 1_000_000,
    pathname: o.GUIDANCE_BY_ID.get("profile_entry_v1")?.surfaces[0] ?? "/jornada",
    visibility,
    learner: { completedLessons: ["l1"], cultureTouched: true },
    state: { version: 2, enabled: true, initialized: true, availabilityMemory: [], records: { ...records, ...extra } },
    session: { ...o.EMPTY_GUIDANCE_SESSION, shownIds: [], snoozedIds: [], anchorMisses: [] },
    activeLearning: false,
    inputFocused: false,
    otherCeremonyActive: false,
    anchorsPresent: new Set(),
    isNative: true,
    notificationPermissionPromptable: false,
    recentToneConfusions: 0,
    ...overrides,
  };
}

// ── 1. Entrega de orientação ──────────────────────────────────────────────

export async function validateGuidanceDelivery(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.orchestrator, (mods) => {
    const o = mods.orchestrator;
    const sup = mods.suppression.guidanceSuppressedForSeededE2E;
    if (sup({ seededLocalSession: true, native: true, deviceQaBuild: false, guidanceOverride: null }) !== false || sup({ seededLocalSession: true, native: false, deviceQaBuild: true, guidanceOverride: null }) !== false)
      fail("QA_BUILD_SUPPRESSED", FILES.suppression, "build nativo ou de QA nunca suprime orientações");
    if (sup({ seededLocalSession: false, native: false, deviceQaBuild: false, guidanceOverride: null }) !== false) fail("QA_BUILD_SUPPRESSED", FILES.suppression, "sem sessão semeada de E2E nada é suprimido");
    if (o.guidanceResolved({ status: "AUTO_SEEDED", at: 1 }) !== false) fail("AUTO_SEEDED_COUNTED_AS_SEEN", "guidanceResolved", "AUTO_SEEDED = pendente");
    const profile = o.GUIDANCE_BY_ID.get("profile_entry_v1");
    if (!profile || profile.kind !== "COACHMARK" || !profile.anchor) fail("GUIDANCE_DEFINITION_MISSING", "profile_entry_v1", "coachmark ancorado do Perfil");
    else {
      const seeded = guidanceContext(o, { records: { profile_entry_v1: { status: "AUTO_SEEDED", at: 1, evidence: "seed" } }, anchorsPresent: new Set([profile.anchor]) });
      if (o.selectGuidance(seeded)?.definition.id !== "profile_entry_v1") fail("AUTO_SEEDED_COUNTED_AS_SEEN", "selectGuidance", "semeada continua elegível");
      const missing = guidanceContext(o, { session: { ...o.EMPTY_GUIDANCE_SESSION, shownIds: [], snoozedIds: [], anchorMisses: ["profile_entry_v1"] } });
      const chosen = o.selectGuidance(missing);
      if (chosen?.definition.id !== "profile_entry_v1") fail("ANCHOR_MISSING_KILLS_GUIDANCE", "anchorReady", "âncora ausente após a espera → card sem âncora, não inelegível");
      else if (chosen.anchorFallback !== true) fail("NO_FALLBACK_CARD", "selectGuidance", "sem âncora → anchorFallback");
      const spam = guidanceContext(o, { anchorsPresent: new Set([profile.anchor]), session: { ...o.EMPTY_GUIDANCE_SESSION, shownIds: ["x"], snoozedIds: [], anchorMisses: [] } });
      if (o.selectGuidance(spam) !== null) fail("GUIDANCE_SPAM", "sessionBudget", "1 por sessão normal");
      if (o.GUIDANCE_SESSION_BUDGET !== 1 || o.GUIDANCE_FIRST_SESSION_BUDGET !== 2) fail("GUIDANCE_SPAM", "GUIDANCE_SESSION_BUDGET", "1 por sessão; 2 na primeira");
      for (const [flag, code] of [["activeLearning", "GUIDANCE_DURING_LESSON"], ["inputFocused", "GUIDANCE_DURING_LESSON"], ["otherCeremonyActive", "GUIDANCE_OVER_MODAL"]])
        if (o.selectGuidance(guidanceContext(o, { anchorsPresent: new Set([profile.anchor]), [flag]: true })) !== null) fail(code, `selectGuidance.${flag}`, "nada durante resposta/gravação/teclado/recompensa/modal");
    }
    const codes = ["DISABLED", "ALREADY_RESOLVED", "SESSION_BUDGET", "WRONG_SURFACE", "ANCHOR_MISSING", "INPUT_FOCUSED", "ACTIVE_LEARNING", "OTHER_CEREMONY", "FEATURE_NOT_AVAILABLE", "SNOOZED", "RENDER_TIMEOUT", "SUPPRESSED_TEST_BUILD", "NOT_INITIALIZED"];
    for (const code of codes) if (!o.GUIDANCE_REASON_CODES.includes(code)) fail("REASON_CODE_MISSING", "GUIDANCE_REASON_CODES", code);
    const rank = o.GUIDANCE_PRIORITY_RANK;
    if (!(rank.CRITICAL_UX < rank.PEDAGOGICAL_TIP && rank.PEDAGOGICAL_TIP < rank.FEATURE_UNLOCK && rank.FEATURE_UNLOCK < rank.OPTIONAL_DISCOVERY)) fail("GUIDANCE_PRIORITY", "GUIDANCE_PRIORITY_RANK", "BLOCKING UX > PEDAGÓGICA > DESCOBERTA > OPCIONAL");
    const surfaces = { "/jornada": "Jornada", "/perfil": "Perfil", "/treino": "Praticar", "/revisao": "Revisão", "/cultura": "Cultura", "/hanzi/atlas": "Atlas", "/imersao": "Imersão", "/mais": "Conta/Aparência" };
    for (const [surface, label] of Object.entries(surfaces))
      if (!o.GUIDANCE_DEFINITIONS.some((definition) => definition.surfaces.includes(surface) || definition.primaryTo === surface)) fail("FIRST_USE_GUIDANCE_MISSING", surface, `primeiro uso de ${label}`);
    const bridge = o.GUIDANCE_BY_ID.get("journey_culture_bridge_v1");
    if (!bridge || !/from=jornada/.test(bridge.primaryTo ?? "")) fail("CULTURE_BRIDGE_NO_RETURN", "journey_culture_bridge_v1", "ponte Jornada → Cultura com volta");
  });
  const host = stripComments(s.src.host);
  if (!/setCurrentGuidance\(\{ \.\.\.current, anchorFallback: true \}\)/.test(host)) fail("GUIDANCE_DROPPED_SILENTLY", FILES.host, "timeout de render troca para o card sem âncora");
  if (!/stage: "render_timeout", reasonCode: "RENDER_TIMEOUT"/.test(host)) fail("GUIDANCE_DROPPED_SILENTLY", FILES.host, "falha final registrada (RENDER_TIMEOUT)");
  if (!/noteGuidanceAnchorMiss\(/.test(host)) fail("ANCHOR_MISSING_KILLS_GUIDANCE", FILES.host, "espera da âncora registra a falta");
  if (!/data-guidance-anchor=\{fallback \|\| position\?\.placement === "fallback" \? "fallback" : "anchored"\}/.test(host) || !/placement: "fallback"/.test(host)) fail("NO_FALLBACK_CARD", FILES.host, "card inferior sem âncora");
  if (!/\["RECORDING", "RECOGNITION"\]\.includes\(currentAudioOwner\(\)\)/.test(host)) fail("GUIDANCE_DURING_LESSON", FILES.host, "gravação/reconhecimento contam como aprendizagem ativa");
  if (!/native: isNativeApp\(\)/.test(host) || !/deviceQaBuild: import\.meta\.env\.VITE_DEVICE_QA === "true"/.test(host)) fail("QA_BUILD_SUPPRESSED", FILES.host, "host passa nativo/QA para a supressão");
  if (!/<GuidanceDeliveryPanel \/>/.test(s.src.qaPage) || !/if \(!deviceQaEnabled\(\)\) return <Navigate/.test(s.src.qaPage)) fail("QA_PANEL_IN_PRODUCTION", FILES.qaPage, "painel só no /qa/device de build de QA");
  for (const testId of ["qa-guidance-list", "qa-guidance-show-next", "qa-guidance-reset"]) if (!s.src.qaPanel.includes(`data-testid="${testId}"`)) fail("QA_PANEL_INCOMPLETE", FILES.qaPanel, testId);
  if (!/data-testid="culture-back-to-journey"/.test(s.src.cultureHub)) fail("CULTURE_BRIDGE_NO_RETURN", FILES.cultureHub, "← Voltar à Jornada");
  return failures;
}

// ── 2. Energia ────────────────────────────────────────────────────────────

export async function validateEnergySoftLanding(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.energy, (mods) => {
    const e = mods.energy;
    for (const free of ["extra_training", "essential_review", "library", "atlas", "settings", "account", "progress"])
      if (e.activityConsumesCharge(free)) fail("ZERO_CHARGE_BLOCKS_FREE_STUDY", `activityConsumesCharge(${free})`, "prática/revisão/conta nunca custam Carga");
    if (!e.activityConsumesCharge("lesson")) fail("PROGRESSION_FREE", "activityConsumesCharge(lesson)", "lição nova continua custando Carga");
    if (e.lessonStartConsumesCharge({ lessonCompleted: true }) !== false) fail("REPLAY_CHARGES", "lessonStartConsumesCharge", "replay não é progressão nova");
    if (e.immersionStartConsumesCharge({ sessionCompleted: false, freeStory: true }) !== false) fail("REPLAY_CHARGES", "immersionStartConsumesCharge", "história livre não cobra");
    if (e.MISTAKE_CHARGE_COST !== 0) fail("MISTAKE_COSTS_CHARGE", "MISTAKE_CHARGE_COST", "errar custa só Vida");
    for (const route of ["/revisao", "/perfil", "/cultura", "/praticar", "/config/aparencia"]) if (!e.ZERO_CHARGE_OPEN_ROUTES.includes(route)) fail("ZERO_CHARGE_BLOCKS_FREE_STUDY", "ZERO_CHARGE_OPEN_ROUTES", `${route} abre com zero Cargas`);
    if (e.freeStudyPaths(() => false).length === 0) fail("PRO_ONLY_PATH", "freeStudyPaths", "sempre há ao menos um caminho gratuito");
  });
  if (!/export const CONSECUTIVE_MISTAKE_CHARGE_COST = 0;/.test(stripComments(s.src.economy))) fail("MISTAKE_COSTS_CHARGE", FILES.economy, "erros seguidos não removem Carga");
  const mistake = body(stripComments(s.src.player), "function noteConfirmedMistake()");
  if (!mistake || /consumeCharge|Charge/.test(mistake)) fail("MISTAKE_COSTS_CHARGE", "LessonPlayer.noteConfirmedMistake", "erro confirmado só mexe na sequência de erros");
  if (!/!lessonStartConsumesCharge\(\{ lessonCompleted: completedLessons\.includes\(foundLesson\.id\) \}\)/.test(s.src.player) || !/lessonStartConsumesCharge\(\{ lessonCompleted: completed\.includes\(lesson\.id\) \}\)/.test(s.src.lessonDetail)) fail("REPLAY_CHARGES", "LessonPlayer/LessonDetailPage", "replay de lição concluída não cobra");
  if (!/energyActivityConsumesCharge/.test(s.src.store)) fail("ZERO_CHARGE_BLOCKS_FREE_STUDY", FILES.store, "store usa a política de energia");
  const landing = stripComments(s.src.softLanding);
  const lanesAt = landing.indexOf('data-testid="energy-free-lanes"');
  const chargeAt = landing.indexOf('data-testid="energy-get-charge"');
  const proAt = landing.indexOf('data-testid="energy-pro-link"');
  if (lanesAt < 0 || chargeAt < 0 || proAt < 0 || !(lanesAt < chargeAt && chargeAt < proAt)) fail("PRO_ONLY_PATH", FILES.softLanding, "[caminhos grátis] → [Conseguir Carga] → Pro por último");
  if (!/if \(kind === "energy"\) return <EnergySoftLanding onClose=\{onClose\} \/>;/.test(s.src.paywall)) fail("PAYWALL_LOOP", FILES.paywall, "energia abre a superfície calma, não o paywall");
  const copy = /energySoftLanding: \{([\s\S]*?)\n {2}\},/.exec(s.src.localePt)?.[1] ?? "";
  if (!copy || /\bvidas?\b|f[ôo]lego/i.test(copy)) fail("ENERGY_COPY_MIXED", "pt-BR.energySoftLanding", "copy de Cargas não fala de Vidas/Fôlego");
  return failures;
}

// ── 3. Navegação progressiva ──────────────────────────────────────────────

export async function validateProgressiveNavigation(s) {
  const { failures, fail } = collector();
  const nav = stripComments(s.src.nav);
  const max = Number(/export const EARLY_NAV_MAX_ITEMS = (\d+);/.exec(nav)?.[1] ?? NaN);
  if (!(max <= 3)) fail("TAB_BAR_TOO_DENSE", FILES.nav, "no máximo 3 itens cedo");
  const practice = Number(/"\/treino":\s*(\d+)/.exec(nav)?.[1] ?? 0);
  if (!(practice >= 1)) fail("PRACTICE_VISIBLE_EARLY", FILES.nav, "Praticar só depois da 1ª conclusão real");
  if (!/earnedTabBar\(mobileNavForStage\(profile\.stage, visibility\), learner\.completedLessons\.length\)/.test(s.src.tabBar)) fail("TAB_BAR_TOO_DENSE", FILES.tabBar, "barra usa as abas conquistadas");
  const groups = body(nav, "export function moreMobileSheetGroups(");
  const you = /const you = \[([^\]]*)\]/.exec(groups)?.[1] ?? "";
  if (!/NAV\.perfil/.test(you) || !/NAV\.conta/.test(you)) fail("PROFILE_HIDDEN", "moreMobileSheetGroups", "Mais começa por Você (Perfil · Conta)");
  if (!/NAV\.aparencia/.test(you) || !/aparencia: \{[^}]*to: "\/config\/aparencia"/.test(nav)) fail("APPEARANCE_HIDDEN", "moreMobileSheetGroups", "Aparência em Você");
  const returned = /return \[([^\]]*)\]/.exec(groups.slice(groups.indexOf("const you")))?.[1] ?? "";
  if (returned && !/^\s*\{?[^,]*you/.test(returned)) fail("PROFILE_HIDDEN", "moreMobileSheetGroups", "grupo Você vem primeiro");
  return failures;
}

// ── 4. Densidade mobile ───────────────────────────────────────────────────

export async function validateMobileDensity(s) {
  const { failures, fail } = collector();
  const detail = stripComments(s.src.lessonDetail);
  if ((detail.match(/data-lesson-primary-cta=/g) ?? []).length !== 1) fail("MULTIPLE_PRIMARY_CTA", FILES.lessonDetail, "uma única ação principal no detalhe da lição");
  const answer = body(stripComments(s.src.review), "function ReviewAnswer({ data, domain }: { data: Resolved; domain: ReviewDomain }) {");
  // O que fica FORA do <details> é o feedback curto: só hànzì · pinyin · sentido.
  const markup = answer.replace(/const hasMore = [^;]*;/, "");
  const detailsAt = markup.indexOf("<details");
  for (const extra of ["data.mnemonicPt", "review.cardEvaluated", "data.example.hanzi"]) {
    const at = markup.indexOf(extra);
    if (detailsAt < 0 || at < 0 || at < detailsAt) fail("FEEDBACK_DUPLICATES_ANSWER", "ReviewAnswer", `${extra} só em "Ver explicação"`);
  }
  if (!/data-review-end/.test(s.src.review) || !/review-end-back/.test(s.src.review) || !/review-end-continue/.test(s.src.review)) fail("REVIEW_END_UNCLEAR", FILES.review, "Revisão concluída [Voltar] [Continuar revisando]");
  return failures;
}

// ── 5. Repetição na revisão ───────────────────────────────────────────────

const item = (target, op = "RECOGNIZE", ctx = "c") => ({ semanticTargetKey: target, cognitiveOperation: op, interactionFamily: "choice", contextKey: ctx });

export async function validateReviewRepetition(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.repetition, (mods) => {
    const r = mods.repetition;
    const capped = r.capTargetPerRound(["a", "a", "a", "a", "b", "c", "d", "e", "f"], (x) => x, 5);
    if (capped.slice(0, 5).filter((x) => x === "a").length > 2) fail("TARGET_SATURATION", "capTargetPerRound", "rodada normal: no máximo 2 do mesmo alvo");
    if (capped.length !== 9) fail("SRS_ITEMS_DROPPED", "capTargetPerRound", "nada sai da fila do SRS");
    const remediation = r.capTargetPerRound(["a", "a", "a", "b", "c"], (x) => x, 5, () => true);
    if (remediation.filter((x) => x === "a").length !== 3) fail("TARGET_SATURATION", "capTargetPerRound", "3 só com remediação");
    if (r.MAX_TARGET_PER_ROUND !== 2 || r.MAX_TARGET_PER_ROUND_REMEDIATION !== 3) fail("TARGET_SATURATION", "MAX_TARGET_PER_ROUND", "2 (3 em remediação)");
    const classes = r.classifyRepetitions([item("a"), item("b"), item("a")]);
    if (classes[2] !== "REDUNDANT") fail("SAME_OPERATION_REPEATED", "classifyRepetitions", "mesmo alvo+operação+contexto na janela = REDUNDANT");
    if (r.classifyRepetitions([item("a"), item("a", "HEAR")])[1] !== "TRANSFORMED") fail("SAME_OPERATION_REPEATED", "classifyRepetitions", "outra operação = TRANSFORMED");
    const dominated = r.repetitionReport([item("a", "HEAR"), item("a", "RECOGNIZE"), item("a", "RECALL"), item("a", "BUILD"), item("b"), item("a", "PRODUCE")]);
    if (dominated.clean !== false || dominated.dominated.length === 0) fail("FAKE_CLEAN_REPETITION", "repetitionReport", "nunca 'limpo' com saturação/domínio");
    if (r.repetitionReport([item("a"), item("b"), item("a"), item("a")], { round: true }).saturated.length === 0) fail("TARGET_SATURATION", "roundSaturation", "3 do mesmo alvo numa rodada normal é saturação");
    const c = mods.reviewComposer;
    if (c.REVIEW_ROUND_MIN !== 5 || c.REVIEW_ROUND_MAX !== 8) fail("REVIEW_ROUND_DENSITY", "REVIEW_ROUND_MIN/MAX", "rodadas de 5–8");
  });
  if (!/capTargetPerRound\(spaced, reviewTargetOf, reviewRoundSize\(spaced\.length\)\)/.test(stripComments(s.src.review))) fail("COMPOSER_CAP_NOT_WIRED", FILES.review, "a revisão aplica o teto por rodada");
  if (/from "\.\/srs"|from "\.\.\/lib\/srs"/.test(s.src.repetition)) fail("NEW_SRS", FILES.repetition, "mesmo SRS: repetição só reordena");
  const audit = s.repetitionAudit;
  if (!audit) fail("REPETITION_AUDIT_MISSING", "docs/reports/rc2-2-23-semantic-repetition.json", "auditoria semântica");
  else {
    for (const session of audit.sessions ?? []) if (session.clean && (session.redundant > 0 || (session.dominated ?? []).length > 0)) fail("FAKE_CLEAN_REPETITION", `audit.session.${session.session}`, "sessão com REDUNDANT/domínio não é limpa");
    const dominatedSessions = (audit.sessions ?? []).filter((session) => (session.dominated ?? []).length > 0).map((session) => session.session);
    if (JSON.stringify(dominatedSessions) !== JSON.stringify(audit.totals?.sessionsDominated)) fail("FAKE_CLEAN_REPETITION", "audit.totals.sessionsDominated", "totais batem com as sessões");
    if (dominatedSessions.length > 0 && /0 repeti[çc][ãa]o ruim|badRepetitions\W+0/i.test(s.reports["semantic-repetition"])) fail("FAKE_CLEAN_REPETITION", "semantic-repetition.md", "não declarar 0 com saturação");
  }
  return failures;
}

// ── 6. Hànzì na revisão ───────────────────────────────────────────────────

function minPx(className) {
  const values = [...String(className).matchAll(/(?:^|\s)text-\[(\d+)px\]/g)].map((match) => Number(match[1]));
  return values.length ? values[0] : 0;
}

export async function validateReviewHanzi(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.reviewComposer, (mods) => {
    const c = mods.reviewComposer;
    const floors = { main: 64, option: 48, pair: 44 };
    for (const [role, floor] of Object.entries(floors)) {
      if (!(c.REVIEW_HANZI_SIZE_PX[role]?.min >= floor)) fail("HANZI_TOO_SMALL", `REVIEW_HANZI_SIZE_PX.${role}`, `≥ ${floor} px a 360 px`);
      if (!(minPx(c.REVIEW_HANZI_CLASS[role]) >= floor)) fail("HANZI_TOO_SMALL", `REVIEW_HANZI_CLASS.${role}`, `classe móvel ≥ ${floor} px`);
    }
  });
  const review = stripComments(s.src.review);
  if (!/isHanziText\(piece\.value\) \? REVIEW_HANZI_CLASS\.pair : ""/.test(review)) fail("HANZI_TOO_SMALL", "RevisaoPage.pieces", "peça de montagem com hànzì segue o piso de par (44)");
  if (/isHanziText\([^)]*\) \? "text-(xl|2xl|3xl)/.test(review)) fail("HANZI_TOO_SMALL", FILES.review, "nenhum tipo escapa do contrato");
  for (const role of ["main", "option", "pair"]) if (!review.includes(`? "${role}" : undefined`)) fail("HANZI_ROLE_UNMARKED", FILES.review, `data-review-hanzi="${role}" para a medição computada`);
  return failures;
}

// ── 7. Tons guiados ───────────────────────────────────────────────────────

export async function validateGuidedTones(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.toneMicrolesson, (mods) => {
    const t = mods.toneMicrolesson;
    // RC2.2.24 — RASTREAR entrou depois de OUVIR (mesma ordem pedagógica).
    const expected = ["SEE", "HEAR", "TRACE", "IMITATE", "DISCRIMINATE", "RECOGNIZE", "USE_WORD", "USE_CONTEXT"];
    if (JSON.stringify([...t.TONE_MICROLESSON_STAGES]) !== JSON.stringify(expected)) fail("TONE_SEQUENCE_BROKEN", "TONE_MICROLESSON_STAGES", "VER→OUVIR→IMITAR→DISCRIMINAR→RECONHECER→PALAVRA→CONTEXTO");
    for (const tone of [1, 2, 3, 4]) {
      const screens = t.buildToneMicrolesson(tone);
      const order = screens.map((screen) => expected.indexOf(screen.stage));
      if (order.some((value, index) => value < 0 || (index > 0 && value <= order[index - 1])) || screens.length < 5) fail("TONE_SEQUENCE_BROKEN", `buildToneMicrolesson(${tone})`, "ordem e estágios mínimos");
      const concepts = screens.map((screen) => screen.concept);
      if (new Set(concepts).size !== concepts.length) fail("TONE_SCREEN_MULTIPLE_CONCEPTS", `buildToneMicrolesson(${tone})`, "um conceito por tela");
      for (const screen of screens) {
        const violations = t.toneScreenViolations(screen);
        if (violations.includes("PITCH_EXPLAINED_BY_TONGUE")) fail("PITCH_EXPLAINED_BY_TONGUE", `tone ${tone} ${screen.stage}`, "tom é altura da voz, não língua");
        if (violations.includes("TONE_SCREEN_TOO_LONG")) fail("TONE_SCREEN_MULTIPLE_CONCEPTS", `tone ${tone} ${screen.stage}`, "tela curta, uma ideia");
        if (violations.includes("TONE_SCREEN_CHOICE_COUNT")) fail("TONE_SCREEN_MULTIPLE_CONCEPTS", `tone ${tone} ${screen.stage}`, "duas opções grandes");
      }
    }
    for (const guidance of mods.toneKnowledge.TONE_GUIDANCE)
      if (t.TONGUE_FOR_PITCH.test(`${guidance.guidedPt} ${guidance.gesturePt}`)) fail("PITCH_EXPLAINED_BY_TONGUE", `TONE_GUIDANCE.${guidance.number}`, "sem língua/boca no tom");
    if (mods.toneKnowledge.TONE_PRODUCTION_EVIDENCE_STATUS !== "NO_PITCH_MEASUREMENT") fail("FAKE_PITCH_SCORE", "TONE_PRODUCTION_EVIDENCE_STATUS", "sem medição de pitch");
  });
  const ui = stripComments(s.src.toneMicrolessonUi);
  if (/\d+\s*%|pontua[çc][ãa]o|seu tom (ficou|est[áa]) (correto|certo)/i.test(ui)) fail("FAKE_PITCH_SCORE", FILES.toneMicrolessonUi, "nenhuma nota de pronúncia de tom");
  if (!/<ToneMicrolesson /.test(s.src.som) || !/tonesNeedingMicrolesson\(pack\.options, toneTrainer\)/.test(s.src.som)) fail("TONE_MICROLESSON_NOT_WIRED", FILES.som, "tom novo abre a microaula antes da rodada");
  if (!/tone-microlesson-skip/.test(ui)) fail("TONE_MICROLESSON_TRAP", FILES.toneMicrolessonUi, "[Pular] sempre disponível");
  return failures;
}

// ── 8. Imersão ────────────────────────────────────────────────────────────

export async function validateImmersionDepth(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.storyReaction, (mods) => {
    const r = mods.storyReaction;
    const scene = [{ speaker: "Lin" }, { speaker: "Você" }, { speaker: "Narrador" }];
    const onLearnerTurn = r.storyReaction(scene, 1, true);
    if (!onLearnerTurn || onLearnerTurn.cast.id !== "lin") fail("NO_REACTION", "storyReaction", "na vez do aluno quem reage é o parceiro de cena");
    for (const [index, correct] of [[1, false], [2, true], [0, true]]) {
      const reaction = r.storyReaction(scene, index, correct);
      if (!reaction || reaction.cast.learner || reaction.cast.narrator) fail("REACTION_BY_WRONG_SPEAKER", `storyReaction(${index})`, "nunca o aluno nem o narrador");
      else if (reaction.correct !== correct) fail("NO_REACTION", `storyReaction(${index})`, "reação segue a escolha");
    }
    if (r.storyReaction([{ speaker: "Você" }, { speaker: "Narrador" }], 0, true) !== null) fail("REACTION_BY_WRONG_SPEAKER", "storyReaction", "sem parceiro de cena, sem reação inventada");
    const lines = r.STORY_REACTION_LINES;
    if (!lines?.correct?.hanzi || !lines?.wrong?.hanzi || lines.correct.hanzi === lines.wrong.hanzi) fail("NO_REACTION", "STORY_REACTION_LINES", "reação distinta para acerto e erro");
  });
  const page = stripComments(s.src.immersion);
  if (!/storyReaction\(story\.steps, currentIndex, Boolean\(lastCorrect\)\)/.test(page) || !/data-story-reaction=/.test(page)) fail("NO_REACTION", FILES.immersion, "a cena reage à escolha do aluno");
  if ((page.match(/data-speaker=/g) ?? []).length < 2 || !/function StorySpeakerLabel/.test(page)) fail("NO_SPEAKER", FILES.immersion, "falante visível");
  if (!/<SpeakButton text=\{step\.hanzi\}/.test(page) || !/<SpeakButton text=\{reaction\.hanzi\}/.test(page)) fail("NO_LINE_AUDIO", FILES.immersion, "áudio em cada fala e na reação");
  if (!/<GlossText/.test(page)) fail("NO_GLOSS", FILES.immersion, "glossário por toque");
  if (!/data-testid="story-recap"/.test(page)) fail("NO_RECAP", FILES.immersion, "recap");
  if (!/<StoryContextCard/.test(page)) fail("NOT_SCENE_FIRST", FILES.immersion, "pré-tela da cena");
  if (!/data-coachmark-target="immersion-first-scene"/.test(page)) fail("FIRST_USE_GUIDANCE_MISSING", FILES.immersion, "coachmark de primeiro uso");
  return failures;
}

// ── 9. Perfil / Conta ─────────────────────────────────────────────────────

export async function validateProfileAccount(s) {
  const { failures, fail } = collector();
  const profile = stripComments(s.src.profile);
  for (const id of ["profile-avatar", "profile-username", "profile-medal-count", "profile-friends-link"]) if (!profile.includes(`data-testid="${id}"`)) fail("PROFILE_HIDDEN", FILES.profile, `${id} na primeira dobra`);
  const foldAt = profile.indexOf('data-testid="profile-first-fold-actions"');
  const fold = foldAt < 0 ? "" : profile.slice(foldAt, profile.indexOf("</Card>", foldAt));
  if (!/to="\/conta"/.test(fold) || !/to="\/amigos"/.test(fold)) fail("PROFILE_HIDDEN", FILES.profile, "[Editar] [Amigos] na primeira dobra");
  if (!/data-testid="more-sign-out"/.test(s.src.more)) fail("LOGOUT_DEEP_ONLY", FILES.more, "Sair visível no Mais");
  return failures;
}

// ── 10. Verdade física ────────────────────────────────────────────────────

export async function validatePhysicalTruth(s) {
  const { failures, fail } = collector();
  const base = s.base;
  if (!base) fail("BASE_MISSING", "docs/release/rc2-2-23-base.json", "base da onda empilhada");
  else {
    if (base.RC2_2_23_BASE_SHA !== RC2_2_23_BASE_SHA || base.parentWave !== "RC2.2.22" || base.strategy !== "STACKED") fail("BASE_SHA_AMBIGUOUS", "rc2-2-23-base.json", `STACKED sobre ${RC2_2_23_BASE_SHA}`);
    if (base.prTargetWhileParentOpen !== RC2_2_23_PARENT_BRANCH || base.doNotDuplicateParentCommits !== true) fail("PARENT_COMMITS_DUPLICATED", "rc2-2-23-base.json", "PR mira a RC2.2.22; nunca recriar commits");
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", RC2_2_23_BASE_SHA, "HEAD"], { cwd: ROOT, stdio: "ignore" });
    } catch {
      if (!process.env.RC2_2_23_SKIP_ANCESTRY) fail("BASE_SHA_AMBIGUOUS", "git", `${RC2_2_23_BASE_SHA} precisa ser ancestral do HEAD`);
    }
  }
  const bugs = s.bugs;
  if (!bugs) fail("BUGS_MISSING", "docs/release/rc2-2-23-product-convergence-bugs.json", "manifesto de bugs");
  else {
    const list = bugs.bugs ?? [];
    if (bugs.importedFrom?.historyReset !== false || list.length < (s.previousBugs?.bugs?.length ?? 0)) fail("HISTORY_RESET", "bugs.importedFrom", "bugs da RC2.2.22 importados sem reset");
    for (const id of REQUIRED_NEW_BUGS) if (!list.some((bug) => bug.id === id)) fail("BUG_MISSING", `bugs.${id}`, "bug formal da onda");
    for (const id of ["GUIDANCE_DELIVERY_NOT_VISIBLE_OWNER_DEVICE", ...CARRIED_PHYSICAL_P1]) {
      const bug = list.find((item) => item.id === id);
      if (!bug || bug.severity !== "P1" || bug.releaseBlocking !== true) fail("P1_IGNORED", `bugs.${id}`, "P1 físico continua P1 e bloqueia release");
    }
    for (const bug of list) {
      if (bug.severity === "P1" && (!bug.owner || !bug.reproduction || !bug.status)) fail("P1_WITHOUT_OWNER", `bugs.${bug.id}`, "P1 precisa de owner, reprodução e status");
      if (bug.status === "PHYSICAL_PASS" && !(bug.physicalEvidence?.testedAt && bug.physicalEvidence?.evidenceType)) fail("FAKE_PHYSICAL_PASS", `bugs.${bug.id}`, "PHYSICAL_PASS só com evidência física");
    }
    const panel = {};
    for (const sev of ["P0", "P1", "P2"]) {
      const items = list.filter((bug) => bug.severity === sev);
      panel[sev] = {
        open: items.filter((b) => !["PHYSICAL_PASS", "WONT_FIX_WITH_REASON"].includes(b.status)).length,
        new: items.filter((b) => b.status === "OPEN").length,
        reproduced: items.filter((b) => b.status === "REPRODUCED").length,
        fixed: items.filter((b) => ["FIXED_CODE", "AUTOMATED_REGRESSION"].includes(b.status)).length,
        awaitingPhysical: items.filter((b) => b.status === "PHYSICAL_RETEST_PENDING").length,
        physicalPass: items.filter((b) => b.status === "PHYSICAL_PASS").length,
      };
      if (JSON.stringify(panel[sev]) !== JSON.stringify(bugs.panel?.[sev])) fail("BUG_COUNTER_DRIFT", `bugs.panel.${sev}`, `${JSON.stringify(bugs.panel?.[sev])} ≠ ${JSON.stringify(panel[sev])}`);
    }
    const blocking = list.filter((b) => b.releaseBlocking && !["PHYSICAL_PASS", "WONT_FIX_WITH_REASON"].includes(b.status)).length;
    if (bugs.releaseBlockingOpen !== blocking) fail("BUG_COUNTER_DRIFT", "bugs.releaseBlockingOpen", `${bugs.releaseBlockingOpen} ≠ ${blocking}`);
    if (bugs.release?.PUBLIC_BETA !== "NO_GO" || bugs.release?.CLOSED_BETA !== "NO_GO") fail("CLOSED_BETA_PREMATURE", "bugs.release", "PUBLIC/CLOSED NO_GO até o gate físico e de Play");
    if (!bugs.playOwnerActions || Object.values(bugs.playOwnerActions).some((value) => value === true && !bugs.release?.playEvidence)) fail("PLAY_ACTIONS_DROPPED", "bugs.playOwnerActions", "ações de Play do owner carregadas, sem PASS inventado");
    if (bugs.prOpenedAutomatically !== false) fail("AUTO_PR", "bugs.prOpenedAutomatically", "PR nunca automático");
  }
  for (const name of REPORTS) {
    const text = s.reports[name];
    if (!text) fail("REPORT_MISSING", `docs/reports/rc2-2-23-${name}.md`, "relatório da onda");
    else for (const label of EVIDENCE_LABELS) if (!text.includes(label) && !(label === "INFERRED" && /semantic-repetition|mobile-simplification|immersion-depth/.test(name))) fail("REPORT_EVIDENCE_COLLAPSED", `rc2-2-23-${name}.md`, `seção ${label}`);
    if (text && /PHYSICAL_PASS|PHYSICAL PASS: (YES|SIM)/.test(text.replace(/CODE PASS ≠ PHYSICAL PASS/g, ""))) fail("FAKE_PHYSICAL_PASS", `rc2-2-23-${name}.md`, "relatório não declara passe físico");
  }
  // P1 físicos carregados: o código que os mitiga continua de pé.
  if (!/onCannotSpeak=\{onContinue\}/.test(s.src.pronunciation)) fail("SPEECH_BLOCKS_LESSON", FILES.pronunciation, "sempre há Continuar sem falar");
  if (!/data-testid="self-compare-play-mine"/.test(s.src.selfCompare)) fail("SELF_COMPARE_NO_REPLAY", FILES.selfCompare, "[Ouvir minha voz] sempre disponível após gravar");
  if (!/data-testid="step-stalled-retry"/.test(s.src.steps)) fail("CONTINUE_FREEZES", FILES.steps, "etapa travada mostra [Tentar novamente]");
  if (!/withSignupTimeout\(/.test(s.src.finalizeSignup) || !/export const SIGNUP_REQUEST_TIMEOUT_MS = \d/.test(s.src.signupTrace)) fail("SIGNUP_INFINITE_SPINNER", FILES.finalizeSignup, "cadastro com prazo, nunca girando para sempre");
  if (!/verifyOtp\(\{ email: email\.trim\(\), token, type: "recovery" \}\)/.test(s.src.authService)) fail("RECOVERY_LINK_ONLY", FILES.authService, "recuperação por código de 6 dígitos, não só link externo");
  if (!/appId: "longyu\.noba\.com"/.test(s.src.capacitorConfig)) fail("PACKAGE_CHANGED", "capacitor.config", "appId continua longyu.noba.com");
  if (!/export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;/.test(s.src.subscription)) fail("PURCHASES_ENABLED", FILES.subscription, "compras Android desligadas na Beta");
  if (!/MAX_AUTOMATIC_CHANNEL = "internal"/.test(stripComments(s.src.releaseIdentity))) fail("PRODUCTION_PLAY_ENABLED", FILES.releaseIdentity, "automático = internal");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("TOUCHED_273", "docs/release/rc2-candidate.json", "#273 congelada");
  if (!/export const RC2_2_23_PRODUCT_CONVERGENCE_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-23-product-convergence"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_23_PRODUCT_CONVERGENCE_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze)) fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
  return failures;
}

export const VALIDATORS = {
  "guidance-delivery": validateGuidanceDelivery,
  "energy-soft-landing": validateEnergySoftLanding,
  "progressive-navigation": validateProgressiveNavigation,
  "mobile-density": validateMobileDensity,
  "review-repetition": validateReviewRepetition,
  "review-hanzi": validateReviewHanzi,
  "guided-tones": validateGuidedTones,
  "immersion-depth": validateImmersionDepth,
  "profile-account": validateProfileAccount,
  "physical-truth": validatePhysicalTruth,
};
