/**
 * RC2.2.25 — PRODUCT EXPERIENCE CLOSURE.
 *
 * O gate prova, no código, o contrato de experiência que o owner pediu — e
 * mantém a verdade: nada vira APK_PASS/OWNER_ACCEPTED sem evidência física.
 *
 *   gold-standard            16 características do padrão guiado aprovado
 *   stepkind-classification  todo StepKind GUIDED_NATIVE/COMPATIBLE; desconhecido = LEGACY
 *   all-lessons-audit        134 aulas (Pro incluído), sem amostragem, LEGACY = 0
 *   surface-inventory        toda superfície do aluno listada; nada aceito sem o owner
 *   density-score            MINIMAL/GOOD/BUSY/OVERLOADED; atividade só MINIMAL/GOOD
 *   hub-activity-modes       atividade em focus (Revisão, Pinyin, Fala, Imersão, Tons)
 *   review-round             hub ≠ rodada; rodada sem análise; `?modo` não pula o hub
 *   focus-frame              X, VOLTAR/Escape e pilha de modais
 *   speaking-flow            OUÇA → GRAVE → OUÇA VOCÊ → COMPARE → CONTINUE; sem motor
 *   tone-trace-memory        … → nada → escolha de memória; nunca pitch
 *   immersion-scene          ONDE/COM QUEM/OBJETIVO, "Você conseguiu", focus
 *   culture-task-handoff     "Antes de continuar…" [Ir para Cultura] → [Voltar para <unidade>]
 *   journey-return-pulse     pulso discreto 1–1,5 s
 *   progressive-discovery    Jornada + Mais → Praticar; orientação 1 (2 no onboarding)
 *   conta-first-fold         Sair na primeira dobra; Excluir só na zona de perigo
 *   logout-discoverability   Sair full-width neutro no Mais e no sheet; logout → Landing
 *   more-order               VOCÊ · ESTUDAR · SOCIAL · PROGRESSO · SISTEMA
 *   appearance               Sistema / Claro / Escuro
 *   profile-first-fold       Conta visível no Perfil (data-testid encaminhado)
 *   cta-normalization        CTA sem recompensa
 *   owner-product-debt       estados honestos; WEB_PASS só com E2E existente
 *   goldens-human-script     15 superfícies × 5 viewports; roteiro SIM/NÃO
 *   release-truth            base, P1 carregados, NO_GO, #273, package, compras, Production, freeze
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
import { headCarriesStackedWave } from "./stack-ancestry.mjs";

const ROOT = process.cwd();
export const RC2_2_25_BASE_SHA = "ab2a2d595073ac7acbdd752d316e8ee7f052a31d";
export const RC2_2_25_PARENT_BRANCH = "claude/rc2-2-24-android-learning-parity";
const REQUIRED_NEW_P1 = ["LOGOUT_DISCOVERABILITY_OWNER_FAIL"];
const CARRIED_P1 = [
  "ANDROID_TTS_HEARD_BUT_UI_NOT_ACKNOWLEDGED",
  "ANDROID_CONVERSATION_NODE_STALL",
  "STEP_RENDER_STALL_ANDROID",
  "LOCAL_PROFILES_VISIBLE",
  "MOBILE_SIGNUP_NOT_PHYSICALLY_PROVEN",
  "PASSWORD_RECOVERY_NOT_PHYSICALLY_PROVEN",
  "SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID",
  "NATIVE_SPEECH_NOT_PROVEN",
  "GUIDANCE_DELIVERY_NOT_VISIBLE_OWNER_DEVICE",
];
const OWNER_PHYSICAL = ["logoutWithinTwoLevels", "contaFirstFoldSignOut", "moreOrderVoceFirst", "reviewRoundFocus", "pinyinFocus", "falaFocus", "immersionFocus", "toneTraceMemoryChoice", "cultureHandoffReturn", "speechFallbackCopy", "ownerVisualAcceptance"];
const GOLD_IDS = ["ONE_IDEA_PER_SCREEN", "ONE_PRIMARY_ACTION", "SIMPLE_PROGRESS", "NO_DASHBOARD", "NO_CARD_IN_CARD", "NO_SCROLL_390", "ADAPT_360", "SHORT_FEEDBACK", "CTA_IS_ACTION", "NO_SHELL_CHROME", "EXIT_ALWAYS", "AUDIO_HONEST", "NO_ENGINE_TALK", "HANZI_LEGIBLE", "RETURN_TO_CONTEXT", "CALM_REWARD"];
const REQUIRED_SURFACES = ["JORNADA_LICAO", "PRATICAR", "REVISAO", "TONS_SOM", "PINYIN_LAB", "FALA", "HANZI", "IDEOGRAMAS", "ATLAS", "CULTURA", "IMERSAO", "LEITURA", "MISSOES", "CHALLENGE", "PLACEMENT", "PREMIUM", "MAIS", "PERFIL", "CONTA", "APARENCIA"];
const DEBT_STATES = ["NOT_IMPLEMENTED", "CODE_READY", "WEB_PASS", "APK_PASS", "OWNER_ACCEPTED"];
const GOLDEN_VIEWPORTS = [360, 375, 390, 412, 432];

export const FILES = {
  gold: "src/lib/productGoldStandard.ts",
  guidedPresentation: "src/lib/guidedPresentation.ts",
  toneTrace: "src/lib/toneTrace.ts",
  anchor: "src/lib/journeyReturnAnchor.ts",
  review: "src/features/revisao/RevisaoPage.tsx",
  pinyin: "src/features/pinyin/PinyinLabPage.tsx",
  fala: "src/features/fala/FalaPage.tsx",
  frame: "src/components/layout/FocusActivityFrame.tsx",
  focus: "src/lib/focusActivity.ts",
  appShell: "src/components/layout/AppShell.tsx",
  som: "src/features/som/SomPage.tsx",
  immersion: "src/features/immersion/ImmersionPage.tsx",
  selfCompare: "src/features/lesson/SelfComparePractice.tsx",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
  speech: "src/lib/speech.ts",
  toneTraceUi: "src/components/tone/ToneTrace.tsx",
  cultureGate: "src/features/journey/JourneyCultureGate.tsx",
  player: "src/features/lesson/LessonPlayer.tsx",
  journey: "src/features/journey/JourneyPage.tsx",
  nav: "src/components/layout/nav.tsx",
  tabBar: "src/components/layout/TabBar.tsx",
  more: "src/features/more/MorePage.tsx",
  conta: "src/features/conta/ContaPage.tsx",
  profile: "src/features/perfil/ProfilePage.tsx",
  page: "src/components/ui/page.tsx",
  settings: "src/features/settings/SettingsPage.tsx",
  guidance: "src/lib/guidanceOrchestrator.ts",
  signOut: "src/hooks/useCloudSignOut.ts",
  signOutControl: "src/components/account/SignOutControl.tsx",
  localePt: "src/locales/pt-BR.ts",
  subscription: "src/services/subscriptionService.ts",
  releaseIdentity: "scripts/lib/release-identity.mjs",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  e2e: "e2e/rc2-2-25-product-experience-closure.spec.ts",
  goldens: "e2e/rc2-2-25-goldens.spec.ts",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n?/g, "\n");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const optionalJson = (rel) => (exists(rel) ? JSON.parse(read(rel)) : null);
const optionalText = (rel) => (exists(rel) ? read(rel) : "");
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  src.capacitorConfig = read(exists("capacitor.config.ts") ? "capacitor.config.ts" : "capacitor.config.json");
  return {
    src,
    base: optionalJson("docs/release/rc2-2-25-base.json"),
    bugs: optionalJson("docs/release/rc2-2-25-product-experience-bugs.json"),
    previousBugs: optionalJson("docs/release/rc2-2-24-android-parity-bugs.json"),
    inventory: optionalJson("docs/release/rc2-2-25-surface-inventory.json"),
    debt: optionalJson("docs/release/rc2-2-25-owner-product-debt.json"),
    humanScript: optionalText("docs/release/rc2-2-25-owner-human-script.md"),
    report: optionalText("docs/reports/rc2-2-25-product-experience-closure.md"),
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

/** Trecho de `start` até `end` (para funções com parâmetros desestruturados). */
function section(text, start, end) {
  const source = String(text);
  const from = source.indexOf(start);
  if (from < 0) return "";
  const to = source.indexOf(end, from + start.length);
  return source.slice(from, to < 0 ? undefined : to);
}

const MODULE_KEYS = ["gold", "guidedPresentation", "toneTrace", "anchor"];
const bundleCache = new Map();

export async function loadModules(s) {
  const cacheKey = MODULE_KEYS.map((key) => s.src[key]).join("\u0000");
  if (bundleCache.has(cacheKey)) return bundleCache.get(cacheKey);
  const overrides = new Map(MODULE_KEYS.map((key) => [path.join(ROOT, FILES[key]), s.src[key]]));
  const result = await build({
    stdin: { contents: MODULE_KEYS.map((key) => `export * as ${key} from "./${FILES[key]}";`).join("\n"), resolveDir: ROOT, loader: "ts", sourcefile: "rc2-2-25-entry.ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": '{"DEV":true}' },
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty", ".webp": "empty", ".mp3": "empty" },
    plugins: [
      {
        name: "rc2-2-25-overrides",
        setup(pluginBuild) {
          pluginBuild.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
            const text = overrides.get(args.path);
            return text === undefined ? undefined : { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2225-"));
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

// ── 1. Padrão-ouro ────────────────────────────────────────────────────────

export async function validateGoldStandard(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.gold, ({ gold }) => {
    const ids = gold.GUIDED_EXPERIENCE_GOLD_STANDARD.map((trait) => trait.id);
    if (ids.length !== 16 || new Set(ids).size !== 16) fail("GOLD_STANDARD_INCOMPLETE", "GUIDED_EXPERIENCE_GOLD_STANDARD", `16 características únicas (tem ${ids.length})`);
    for (const id of GOLD_IDS) if (!ids.includes(id)) fail("GOLD_STANDARD_INCOMPLETE", "GUIDED_EXPERIENCE_GOLD_STANDARD", id);
  });
  return failures;
}

// ── 2. Classificação de StepKind ──────────────────────────────────────────

export async function validateStepkindClassification(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.gold, ({ gold, guidedPresentation }) => {
    for (const kind of Object.keys(guidedPresentation.STEP_PRESENTATION_CONTRACTS)) {
      const value = gold.guidedStepClass(kind);
      if (value === "LEGACY_PRESENTATION") fail("STEPKIND_LEGACY", `guidedStepClass(${kind})`, "todo StepKind com contrato é GUIDED_NATIVE/COMPATIBLE");
    }
    if (gold.guidedStepClass("legacy_card_only") !== "LEGACY_PRESENTATION") fail("STEPKIND_CLASSIFIER_LIES", "guidedStepClass", "StepKind sem contrato é LEGACY (nunca promovido em silêncio)");
    if (gold.guidedStepClass("intro") !== "GUIDED_NATIVE" || gold.guidedStepClass("conversation_scene") !== "GUIDED_COMPATIBLE") fail("STEPKIND_CLASSIFIER_LIES", "guidedStepClass", "nativo × compatível");
  });
  return failures;
}

// ── 3. Todas as aulas ─────────────────────────────────────────────────────

export async function validateAllLessonsAudit(s) {
  const { failures, fail } = collector();
  const inv = s.inventory;
  if (!inv) {
    fail("INVENTORY_MISSING", "docs/release/rc2-2-25-surface-inventory.json", "rode node scripts/audit-rc2-2-25-surfaces.mjs");
    return failures;
  }
  const t = inv.totals ?? {};
  if (t.lessons !== 134 || (inv.lessons ?? []).length !== 134) fail("LESSONS_SAMPLED", "inventory.totals.lessons", "134 aulas, sem amostragem");
  if (!(t.premiumLessons >= 35) || !(inv.lessons ?? []).some((row) => row.premium)) fail("PREMIUM_NOT_AUDITED", "inventory.totals.premiumLessons", "aulas Pro auditadas");
  const legacyKinds = (inv.stepKinds ?? []).filter((row) => row.guidedClass === "LEGACY_PRESENTATION");
  if (t.legacyPresentation !== 0 || legacyKinds.length || t.lessonsWithLegacy !== 0) fail("STEPKIND_LEGACY", "inventory", `LEGACY = 0 (há ${legacyKinds.map((row) => row.kind).join(",") || t.legacyPresentation})`);
  if (t.guidedNative + t.guidedCompatible + t.legacyPresentation !== t.stepKinds) fail("INVENTORY_COUNTER_DRIFT", "inventory.totals", "nativo + compatível + legado = StepKinds");
  await withModules(s, fail, FILES.gold, ({ gold }) => {
    for (const row of inv.stepKinds ?? []) if (gold.guidedStepClass(row.kind) !== row.guidedClass) fail("INVENTORY_STALE", `inventory.stepKinds.${row.kind}`, "inventário desatualizado (rode o audit)");
  });
  return failures;
}

// ── 4. Inventário de superfícies ──────────────────────────────────────────

export async function validateSurfaceInventory(s) {
  const { failures, fail } = collector();
  const surfaces = s.inventory?.surfaces ?? [];
  for (const id of REQUIRED_SURFACES) if (!surfaces.some((row) => row.id === id)) fail("SURFACE_MISSING", "inventory.surfaces", id);
  for (const row of surfaces) {
    if (row.apkState !== "NOT_RUN" && !row.physicalEvidence) fail("FAKE_APK_PASS", `inventory.surfaces.${row.id}`, "APK só com evidência física");
    if (row.ownerAccepted !== null && row.ownerAccepted !== false && !row.ownerEvidence) fail("FAKE_OWNER_ACCEPTANCE", `inventory.surfaces.${row.id}`, "aceite é SIM/NÃO do owner");
  }
  await withModules(s, fail, FILES.gold, ({ gold }) => {
    for (const surface of gold.ACTIVITY_SURFACES) if (!surfaces.some((row) => row.id === surface.id)) fail("SURFACE_MISSING", "inventory.surfaces", `${surface.id} (ACTIVITY_SURFACES)`);
  });
  return failures;
}

// ── 5. Densidade ──────────────────────────────────────────────────────────

export async function validateDensityScore(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.gold, ({ gold }) => {
    const calm = { blocks: 1, actions: 5, stats: 0, cardDepth: 1, scrolls: false, shellChrome: false };
    const dashboard = { blocks: 6, actions: 9, stats: 6, cardDepth: 2, scrolls: true, shellChrome: true };
    if (gold.screenDensityScore(calm) !== "MINIMAL") fail("DENSITY_SCORE_WRONG", "screenDensityScore", "X + 4 opções numa tela limpa = MINIMAL");
    if (gold.screenDensityScore(dashboard) !== "OVERLOADED") fail("DENSITY_SCORE_WRONG", "screenDensityScore", "dashboard rolando com chrome = OVERLOADED");
    if (gold.activityDensityAccepted("BUSY") || gold.activityDensityAccepted("OVERLOADED") || !gold.activityDensityAccepted("GOOD")) fail("BUSY_ACTIVITY_ACCEPTED", "activityDensityAccepted", "atividade só MINIMAL/GOOD");
    if (!(gold.screenDensityPoints({ ...calm, cardDepth: 2 }) > gold.screenDensityPoints(calm))) fail("CARD_IN_CARD_FREE", "screenDensityPoints", "cartão dentro de cartão custa");
  });
  if (!/activityDensityAccepted\(metrics\.density\)/.test(s.src.e2e) || !/measureDensity/.test(s.src.e2e)) fail("DENSITY_NOT_MEASURED", FILES.e2e, "E2E mede a densidade no DOM");
  return failures;
}

// ── 6. Hub × atividade ────────────────────────────────────────────────────

export async function validateHubActivityModes(s) {
  const { failures, fail } = collector();
  if (!/useFocusActivity\(sessionReadyForHotkeys && inRound\)/.test(s.src.review)) fail("ACTIVITY_KEEPS_CHROME", FILES.review, "rodada da Revisão em focus");
  if (!/useFocusActivity\(Boolean\(selectedSession \|\| selectedStory\)\)/.test(s.src.immersion)) fail("ACTIVITY_KEEPS_CHROME", FILES.immersion, "história/sessão em focus");
  if (!/<FocusActivityLauncher[\s\S]{0,200}testId="pinyin-accent"/.test(s.src.pinyin) || !/<FocusActivityLauncher[\s\S]{0,200}testId="pinyin-builder"/.test(s.src.pinyin)) fail("ACTIVITY_INSIDE_HUB", FILES.pinyin, "treinos do Pinyin Lab em focus");
  if (!/<FocusActivityLauncher[\s\S]{0,200}testId="fala-phrases"/.test(s.src.fala)) fail("ACTIVITY_INSIDE_HUB", FILES.fala, "treino de frases em focus");
  if (!/useFocusActivity\(started && !done\)/.test(s.src.som)) fail("ACTIVITY_KEEPS_CHROME", FILES.som, "rodada de tons em focus");
  if (!/const focusMode = ownsViewport \|\| focusActivity \|\|/.test(s.src.appShell) || !/\{!focusMode && <TabBar \/>\}/.test(s.src.appShell) || !/\{!focusMode && <TopBar \/>\}/.test(s.src.appShell)) fail("TABBAR_DURING_ACTIVITY", FILES.appShell, "focus tira TopBar e TabBar");
  return failures;
}

// ── 7. Rodada da Revisão ──────────────────────────────────────────────────

export async function validateReviewRound(s) {
  const { failures, fail } = collector();
  const review = stripComments(s.src.review);
  if (!/data-testid="review-start"/.test(review) || !/setRoundStarted\(true\)/.test(review)) fail("REVIEW_NO_HUB", FILES.review, "hub com [Começar revisão]");
  if (!/data-testid="review-exit"/.test(review) || !/data-review-round-step/.test(review)) fail("REVIEW_ROUND_NO_EXIT", FILES.review, "rodada com X e ETAPA n/N");
  for (const guard of ["{!inRound && detailedErrorsAllowed && (\n      <section", "{!inRound && !detailedErrorsAllowed && (", "{detailedErrorsAllowed && !inRound && (\n        <>\n          <ReviewModeTabs", "{!inRound && detailedErrorsAllowed && (\n      <Card"]) {
    if (!review.includes(guard)) fail("REVIEW_ANALYTICS_IN_ROUND", FILES.review, `painel do hub fora da rodada: ${guard.slice(0, 50)}`);
  }
  if (/t\("review\.smartQueue"\)/.test(review)) fail("REVIEW_ANALYTICS_IN_ROUND", FILES.review, "fila inteligente não aparece na rodada");
  const autostart = /const \[roundStarted, setRoundStarted\] = useState\(([\s\S]*?)\n  \);/.exec(review)?.[1] ?? "";
  if (/searchParams\.has\("modo"\)/.test(autostart)) fail("REVIEW_HUB_SKIPPED", FILES.review, "`?modo` só filtra o hub");
  if (!/wantsCorrectionSession/.test(autostart)) fail("REVIEW_HUB_SKIPPED", FILES.review, "sessão de correção entra direto na rodada");
  return failures;
}

// ── 8. Moldura de atividade ───────────────────────────────────────────────

export async function validateFocusFrame(s) {
  const { failures, fail } = collector();
  const frame = stripComments(s.src.frame);
  const fn = section(frame, "export function FocusActivityFrame(", "export function FocusActivityLauncher(");
  if (!/useFocusActivity\(true\)/.test(fn)) fail("ACTIVITY_KEEPS_CHROME", FILES.frame, "moldura entra em focus");
  if (!/data-testid=\{`\$\{testId\}-exit`\}/.test(fn) || !/onClick=\{onExit\}/.test(fn)) fail("ACTIVITY_NO_EXIT", FILES.frame, "X visível que sai da atividade");
  if (!/pushModal\("focus-activity"\)/.test(fn) || !/isTopModal\(id\)/.test(fn) || !/event\.key !== "Escape"/.test(fn)) fail("BACK_LEAVES_APP", FILES.frame, "VOLTAR/Escape sai da atividade (pilha de modais)");
  if (!/const \[started, setStarted\] = useState\(autoStart\)/.test(frame)) fail("ACTIVITY_INSIDE_HUB", FILES.frame, "hub mostra só [Começar]");
  return failures;
}

// ── 9. Fala ───────────────────────────────────────────────────────────────

export async function validateSpeakingFlow(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.gold, ({ gold }) => {
    if (JSON.stringify([...gold.SPEAKING_STAGES]) !== JSON.stringify(["OUCA", "GRAVE", "OUCA_VOCE", "COMPARE", "CONTINUE"])) fail("SPEAKING_STAGES_WRONG", "SPEAKING_STAGES", "OUÇA → GRAVE → OUÇA VOCÊ → COMPARE → CONTINUE");
    const at = (input) => gold.speakingStageFor(input);
    if (at({ modelHeard: false, phase: "idle", playState: "idle" }) !== "OUCA" || at({ modelHeard: true, phase: "recording", playState: "idle" }) !== "GRAVE" || at({ modelHeard: true, phase: "recorded", playState: "idle" }) !== "OUCA_VOCE" || at({ modelHeard: true, phase: "recorded", playState: "playing" }) !== "COMPARE" || at({ modelHeard: true, phase: "recorded", playState: "played" }) !== "CONTINUE") fail("SPEAKING_STAGES_WRONG", "speakingStageFor", "estágio vem do estado REAL");
    const speech = stripComments(s.src.speech);
    const messages = body(speech, "export function speechErrorMessage(");
    if (gold.ENGINE_TERMS_RE.test(messages)) fail("ENGINE_TALK_TO_LEARNER", FILES.speech, "mensagem de aluno sem motor/serviço/modelo/locale");
  });
  if (!/<SpeakingStageStrip stage=\{speakingStageFor\(/.test(s.src.selfCompare)) fail("SPEAKING_STAGES_HIDDEN", FILES.selfCompare, "trilha visível no Gravar e comparar");
  if (!/speechFallbackTitle: "Seu aparelho não conseguiu reconhecer mandarim agora\."/.test(s.src.localePt)) fail("ENGINE_TALK_TO_LEARNER", FILES.localePt, "fallback: 'Seu aparelho não conseguiu reconhecer mandarim agora.'");
  if (!/data-testid="speech-fallback-record"/.test(s.src.pronunciation) || !/data-testid="speech-fallback-continue"/.test(s.src.pronunciation)) fail("SPEECH_DEAD_END", FILES.pronunciation, "[Gravar e comparar] [Continuar]");
  return failures;
}

// ── 10. Tone Trace ────────────────────────────────────────────────────────

export async function validateToneTraceMemory(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.toneTrace, ({ toneTrace: t }) => {
    if (t.TONE_TRACE_INSTRUCTION !== "Passe o dedo pelo caminho do tom.") fail("TRACE_INSTRUCTION_WRONG", "TONE_TRACE_INSTRUCTION", "Passe o dedo pelo caminho do tom.");
    if (t.TONE_TRACE_STAGES.at(-1) !== "MEMORY_CHOICE" || t.nextTraceStage("NO_LINE") !== "MEMORY_CHOICE") fail("TRACE_NO_MEMORY_STAGE", "TONE_TRACE_STAGES", "… → nada → escolha de memória");
    if (/correto|pitch|voz/i.test(t.memoryChoiceFeedback(true)) || t.TONE_TRACE_MEASURES_PITCH !== false) fail("TRACE_CLAIMS_PITCH", "memoryChoiceFeedback", "nunca afirma medir o tom");
  });
  if (!/if \(level === "NO_LINE"\) setMemoryChoice\(true\);/.test(s.src.toneTraceUi) || !/data-testid="tone-trace-memory-options"/.test(s.src.toneTraceUi)) fail("TRACE_NO_MEMORY_STAGE", FILES.toneTraceUi, "UI mostra a escolha de memória");
  return failures;
}

// ── 11. Imersão ───────────────────────────────────────────────────────────

export async function validateImmersionScene(s) {
  const { failures, fail } = collector();
  const card = section(s.src.immersion, "function StoryContextCard(", "\nfunction ");
  for (const label of [">Onde<", ">Com quem<", ">Objetivo<"]) if (!card.includes(label)) fail("IMMERSION_NO_CONTEXT", FILES.immersion, `pré-tela ${label}`);
  if (!/Você conseguiu/.test(s.src.immersion)) fail("IMMERSION_NO_RECAP", FILES.immersion, "recap 'Você conseguiu…'");
  if (!/data-immersion-focus="story"/.test(s.src.immersion)) fail("ACTIVITY_KEEPS_CHROME", FILES.immersion, "marca de focus");
  return failures;
}

// ── 12. Cultura ───────────────────────────────────────────────────────────

export async function validateCultureTaskHandoff(s) {
  const { failures, fail } = collector();
  if (!/"Antes de continuar, entenda este contexto\."/.test(s.src.cultureGate) || !/data-testid="culture-gate-lead"/.test(s.src.cultureGate)) fail("CULTURE_TASK_UNEXPLAINED", FILES.cultureGate, "'Antes de continuar, entenda este contexto.'");
  if (!/: "Abrir Culture Moment";/.test(s.src.cultureGate) || !/mode=journey/.test(s.src.cultureGate)) fail("CULTURE_TASK_UNEXPLAINED", FILES.cultureGate, "[Abrir Culture Moment] no modo Jornada");
  if (!/const journeyCta = cultureReturnUnit\s*\? t\("common\.backTo", \{ target: cultureReturnUnit \}\)/.test(s.src.player) || !/peekJourneyReturnAnchor\(\)\?\.lessonId/.test(s.src.player)) fail("CULTURE_RETURN_GENERIC", FILES.player, "[Voltar para <unidade>] pela âncora");
  if (!/lessonComplete: "✓ Cultura concluída"/.test(s.src.localePt)) fail("CULTURE_RETURN_GENERIC", FILES.localePt, "'✓ Cultura concluída'");
  return failures;
}

// ── 13. Pulso da volta ────────────────────────────────────────────────────

export async function validateJourneyReturnPulse(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.anchor, ({ anchor }) => {
    const ms = anchor.JOURNEY_RETURN_PULSE_MS;
    if (!(ms >= 1000 && ms <= 1500)) fail("RETURN_PULSE_WRONG", "JOURNEY_RETURN_PULSE_MS", `1–1,5 s (é ${ms})`);
  });
  if (!/el\.classList\.remove\("ring-4", "ring-accent\/40"\), JOURNEY_RETURN_PULSE_MS\)/.test(s.src.journey)) fail("RETURN_PULSE_WRONG", FILES.journey, "Jornada usa o pulso único");
  return failures;
}

// ── 14. Descoberta progressiva ────────────────────────────────────────────

export async function validateProgressiveDiscovery(s) {
  const { failures, fail } = collector();
  const practice = Number(/"\/treino":\s*(\d+)/.exec(stripComments(s.src.nav))?.[1] ?? 0);
  if (!(practice >= 1)) fail("PRACTICE_BEFORE_FIRST_LESSON", FILES.nav, "conta nova: Jornada + Mais; Praticar depois da 1ª conclusão");
  const normal = Number(/export const GUIDANCE_SESSION_BUDGET = (\d+);/.exec(s.src.guidance)?.[1] ?? NaN);
  const onboarding = Number(/export const GUIDANCE_FIRST_SESSION_BUDGET = (\d+);/.exec(s.src.guidance)?.[1] ?? NaN);
  if (normal !== 1) fail("GUIDANCE_BUDGET_EXCEEDED", FILES.guidance, "1 orientação automática por sessão normal");
  if (!(onboarding <= 2)) fail("GUIDANCE_BUDGET_EXCEEDED", FILES.guidance, "no máximo 2 no onboarding");
  return failures;
}

// ── 15. Conta ─────────────────────────────────────────────────────────────

export async function validateContaFirstFold(s) {
  const { failures, fail } = collector();
  const conta = stripComments(s.src.conta);
  const foldStart = conta.indexOf('data-testid="conta-first-fold"');
  const fold = foldStart >= 0 ? conta.slice(foldStart, foldStart + 3500) : "";
  for (const needle of ['testId="conta-profile"', 'testId="conta-appearance"', 'testId="conta-security"']) {
    if (!fold.includes(needle) && !conta.includes(needle)) fail("LOGOUT_BELOW_FOLD", FILES.conta, `primeira dobra: ${needle}`);
  }
  // RC2.3.13A — Sair is SignOutControl (compact destructive-text). Filled danger = Excluir only.
  if (!/SignOutControl[\s\S]{0,120}?testId="conta-sign-out"/.test(conta) && !/data-testid="conta-sign-out"/.test(conta) && !/testId="conta-sign-out"/.test(conta)) {
    fail("LOGOUT_BELOW_FOLD", FILES.conta, "Sair na Conta");
  }
  const danger = conta.indexOf('data-testid="conta-danger-zone"');
  if (danger < 0 || conta.indexOf('data-testid="conta-delete-account"') < danger) {
    fail("DELETE_NOT_SEPARATED", FILES.conta, "Excluir só na zona de perigo");
  }
  if (danger >= 0 && conta.indexOf('data-testid="conta-sign-out"') > danger && !/SignOutControl/.test(conta)) {
    fail("DELETE_NOT_SEPARATED", FILES.conta, "Excluir depois do Sair");
  }
  return failures;
}

// ── 16. Logout ────────────────────────────────────────────────────────────

export async function validateLogoutDiscoverability(s) {
  const { failures, fail } = collector();
  const you = body(stripComments(s.src.more), "function MoreYouBlock(");
  // RC2.3.13A — compact SignOutControl with confirmation; still discoverable in Mais › Você.
  if (!/SignOutControl/.test(you) || !/testId="more-sign-out"/.test(you)) {
    fail("LOGOUT_NOT_DISCOVERABLE", FILES.more, "Mais › Você: SignOutControl compacto");
  }
  if (/variant=["']danger["'][\s\S]{0,120}signOutAccount|bg-wrong[\s\S]{0,80}signOutAccount/.test(you)) {
    fail("LOGOUT_STYLED_AS_DELETE", FILES.more, "Sair não é botão filled danger");
  }
  const tab = stripComments(s.src.tabBar);
  if (!/SignOutControl/.test(tab) || !/testId="more-sheet-sign-out"/.test(tab)) {
    fail("LOGOUT_TOO_DEEP", FILES.tabBar, "sheet do Mais: Sair a ≤ 2 níveis");
  }
  if (!/data-sign-out-layout="compact"/.test(s.src.signOutControl ?? "") || !/data-cognitive-logout="compact"/.test(s.src.signOutControl ?? "")) {
    fail("LOGOUT_NOT_DISCOVERABLE", "SignOutControl", "layout compact + confirmação");
  }
  if (!/signOutConfirmTitle|Signing out|signingOut/.test(s.src.signOutControl ?? "")) {
    fail("LOGOUT_NOT_DISCOVERABLE", "SignOutControl", "confirmação antes de sair");
  }
  if (/variant=["']danger["'][\s\S]{0,200}data-testid=\{testId\}/.test(s.src.signOutControl ?? "")) {
    fail("LOGOUT_STYLED_AS_DELETE", "SignOutControl", "row não é filled danger (só o confirma)");
  }
  const hook = stripComments(s.src.signOut);
  if ((hook.match(/navigate\("\/", \{ replace: true \}\)/g) ?? []).length < 2) fail("LOGOUT_TO_LOCAL_PROFILE", FILES.signOut, "logout → Landing/Login");
  return failures;
}

// ── 17. Ordem do Mais ─────────────────────────────────────────────────────

export async function validateMoreOrder(s) {
  const { failures, fail } = collector();
  const nav = stripComments(s.src.nav);
  const sheet = body(nav, "export function moreMobileSheetGroups(");
  const pushes = [...sheet.matchAll(/groups\.push\(\{ id: "(\w+)"/g)].map((m) => m[1]);
  // RC2.3.13A — Hick: VOCÊ · PROGRESSO · AJUDA (full catalog remains on /mais).
  if (JSON.stringify(pushes) !== JSON.stringify(["you", "progress", "help"])) {
    fail("MORE_ORDER_WRONG", "moreMobileSheetGroups", `VOCÊ · PROGRESSO · AJUDA (é ${pushes.join(",")})`);
  }
  const catalog = /export const MORE_CATALOG: NavGroup\[\] = \[([\s\S]*?)\n\];/.exec(nav)?.[1] ?? "";
  const ids = [...catalog.matchAll(/id: "(\w+)"/g)].map((m) => m[1]);
  if (JSON.stringify(ids) !== JSON.stringify(["learn", "social", "progress", "system"])) fail("MORE_ORDER_WRONG", "MORE_CATALOG", `ESTUDAR · SOCIAL · PROGRESSO · SISTEMA (é ${ids.join(",")})`);
  if (/NAV\.perfil|NAV\.conta\b/.test(catalog)) fail("MORE_DUPLICATES_YOU", "MORE_CATALOG", "Perfil/Conta só no bloco Você");
  const more = stripComments(s.src.more);
  if (more.indexOf("<MoreYouBlock />") < 0 || more.indexOf("<MoreYouBlock />") > more.indexOf("{sections.map(")) fail("MORE_ORDER_WRONG", FILES.more, "VOCÊ antes dos grupos");
  return failures;
}

// ── 18. Aparência ─────────────────────────────────────────────────────────

export async function validateAppearance(s) {
  const { failures, fail } = collector();
  if (!/aparencia: \{[^}]*to: "\/config\/aparencia"/.test(s.src.nav)) fail("APPEARANCE_HIDDEN", FILES.nav, "Aparência → /config/aparencia");
  if (!/\(\["system", "light", "dark"\] as AppearanceMode\[\]\)/.test(s.src.settings) || !/data-testid="appearance-mode"/.test(s.src.settings)) fail("APPEARANCE_MODES_MISSING", FILES.settings, "Sistema / Claro / Escuro");
  return failures;
}

// ── 19. Perfil ────────────────────────────────────────────────────────────

export async function validateProfileFirstFold(s) {
  const { failures, fail } = collector();
  const profile = stripComments(s.src.profile);
  const fold = profile.slice(profile.indexOf('data-testid="profile-first-fold-actions"'), profile.indexOf("</Card>", profile.indexOf('data-testid="profile-first-fold-actions"')));
  if (!/<ActionButton to="\/conta"[^>]*data-testid="profile-account-link"/.test(fold)) fail("PROFILE_NO_ACCOUNT", FILES.profile, "Conta visível na primeira dobra do Perfil");
  for (const needle of ['to="/amigos"', 'data-testid="profile-edit-link"']) if (!fold.includes(needle)) fail("PROFILE_NO_ACCOUNT", FILES.profile, `primeira dobra: ${needle}`);
  const action = section(stripComments(s.src.page), "export function ActionButton(", "\nexport function ");
  if ((action.match(/data-testid=\{testId\}/g) ?? []).length < 2) fail("TESTID_DROPPED", FILES.page, "ActionButton encaminha data-testid (link e botão)");
  return failures;
}

// ── 20. CTA ───────────────────────────────────────────────────────────────

export async function validateCtaNormalization(s) {
  const { failures, fail } = collector();
  await withModules(s, fail, FILES.gold, ({ gold }) => {
    if (!gold.ctaCarriesReward("Continuar +20 XP") || !gold.ctaCarriesReward("Responder · +5 Qi") || gold.ctaCarriesReward("Continuar") || gold.ctaCarriesReward("Voltar à Jornada")) fail("CTA_REWARD_UNDETECTED", "ctaCarriesReward", "detecta recompensa no rótulo");
    for (const label of ["Continuar", "Começar", "Ouvir", "Responder", "Ver resultado", "Voltar à Jornada"]) if (!gold.GUIDED_CTA_LABELS.includes(label)) fail("CTA_LABELS_INCOMPLETE", "GUIDED_CTA_LABELS", label);
  });
  const grades = /\{GRADE_BUTTONS\.map\(\(\{ g, variant \}\) => \(([\s\S]*?)\n\s*\)\)\}/.exec(stripComments(s.src.review))?.[1] ?? "";
  if (!grades || /reviewXpForGrade|reviewQiForGrade|XP|Qi/.test(grades)) fail("CTA_CARRIES_REWARD", FILES.review, "botões de nota sem XP/Qi");
  return failures;
}

// ── 21. Dívida do owner ───────────────────────────────────────────────────

export async function validateOwnerProductDebt(s) {
  const { failures, fail } = collector();
  const debt = s.debt;
  if (!debt) {
    fail("OWNER_DEBT_MISSING", "docs/release/rc2-2-25-owner-product-debt.json", "dívida do owner");
    return failures;
  }
  if (JSON.stringify(debt.states) !== JSON.stringify(DEBT_STATES)) fail("OWNER_DEBT_STATES", "debt.states", DEBT_STATES.join(" → "));
  const items = debt.items ?? [];
  if (items.length < 20) fail("OWNER_DEBT_INCOMPLETE", "debt.items", "cada pedido do owner listado");
  for (const item of items) {
    for (const key of ["id", "description", "surface", "introducedWave", "implementationState", "physicalState"]) if (!item[key]) fail("OWNER_DEBT_INCOMPLETE", `debt.${item.id ?? "?"}`, key);
    if (!DEBT_STATES.includes(item.implementationState)) fail("OWNER_DEBT_STATES", `debt.${item.id}`, item.implementationState);
    if (["APK_PASS", "OWNER_ACCEPTED"].includes(item.implementationState) && !item.physicalEvidence) fail("FAKE_PHYSICAL_PASS", `debt.${item.id}`, "APK/owner só com evidência física");
    if (item.ownerAccepted === true && !item.ownerEvidence) fail("FAKE_OWNER_ACCEPTANCE", `debt.${item.id}`, "aceite é SIM do owner, com data");
    if (item.physicalState !== "NOT_RUN" && !item.physicalEvidence) fail("FAKE_PHYSICAL_PASS", `debt.${item.id}`, "físico NOT_RUN até haver evidência");
    if (item.implementationState === "WEB_PASS" && !(item.webEvidence && exists(item.webEvidence))) fail("WEB_PASS_WITHOUT_E2E", `debt.${item.id}`, "WEB_PASS cita um E2E existente");
  }
  if (!items.some((item) => /Sair da conta/.test(item.description))) fail("OWNER_DEBT_INCOMPLETE", "debt.items", "pedido do Sair da conta");
  for (const state of DEBT_STATES) if (debt.totals?.[state] !== items.filter((item) => item.implementationState === state).length) fail("OWNER_DEBT_COUNTER_DRIFT", `debt.totals.${state}`, "contagem real");
  return failures;
}

// ── 22. Goldens + roteiro humano ──────────────────────────────────────────

export async function validateGoldensHumanScript(s) {
  const { failures, fail } = collector();
  const goldens = s.src.goldens;
  const viewports = [...goldens.matchAll(/\{ width: (\d+), height: \d+ \}/g)].map((m) => Number(m[1]));
  if (JSON.stringify(viewports) !== JSON.stringify(GOLDEN_VIEWPORTS)) fail("GOLDENS_INCOMPLETE", FILES.goldens, `viewports ${GOLDEN_VIEWPORTS.join("/")}`);
  const surfaces = /const SURFACES[\s\S]*?\}\[\] = \[([\s\S]*?)\n\];/.exec(goldens)?.[1] ?? "";
  if ((surfaces.match(/\{ id: "/g) ?? []).length !== 15) fail("GOLDENS_INCOMPLETE", FILES.goldens, "15 superfícies");
  if (!/test\.skip\(!process\.env\.RC2225_GOLDENS/.test(goldens)) fail("GOLDENS_AUTO_ACCEPT", FILES.goldens, "goldens sob demanda, nunca aceite automático");
  const script = s.humanScript;
  if (!/SIM\/NÃO/.test(script) || !/não é preenchido\s+por agente/.test(script)) fail("HUMAN_SCRIPT_FAKE", "rc2-2-25-owner-human-script.md", "SIM/NÃO do owner; agente não preenche");
  if (!/Sair da conta/.test(script) || !/Criar conta nova/.test(script)) fail("HUMAN_SCRIPT_INCOMPLETE", "rc2-2-25-owner-human-script.md", "conta nova → … → Logout");
  if (/\|\s*(SIM|NÃO)\s*\|\s*$/m.test(script)) fail("HUMAN_SCRIPT_FAKE", "rc2-2-25-owner-human-script.md", "nenhuma linha pré-preenchida");
  return failures;
}

// ── 23. Verdade de release ────────────────────────────────────────────────

export async function validateReleaseTruth(s) {
  const { failures, fail } = collector();
  const base = s.base;
  if (!base) fail("BASE_MISSING", "docs/release/rc2-2-25-base.json", "base");
  else {
    if (base.RC2_2_25_BASE_SHA !== RC2_2_25_BASE_SHA || base.parentWave !== "RC2.2.24" || base.strategy !== "STACKED") fail("BASE_SHA_AMBIGUOUS", "rc2-2-25-base.json", `STACKED sobre ${RC2_2_25_BASE_SHA}`);
    if (base.prTargetWhileParentOpen !== RC2_2_25_PARENT_BRANCH || base.doNotDuplicateParentCommits !== true || base.noNewEngines !== true) fail("PARENT_COMMITS_DUPLICATED", "rc2-2-25-base.json", "mira a RC2.2.24; nunca recriar commits; sem motor novo");
    if (!headCarriesStackedWave(ROOT, RC2_2_25_BASE_SHA)) {
      if (!process.env.RC2_2_25_SKIP_ANCESTRY) fail("BASE_SHA_AMBIGUOUS", "git", `${RC2_2_25_BASE_SHA} ancestral do HEAD`);
    }
  }
  const bugs = s.bugs;
  if (!bugs) fail("BUGS_MISSING", "docs/release/rc2-2-25-product-experience-bugs.json", "manifesto");
  else {
    const list = bugs.bugs ?? [];
    if (bugs.importedFrom?.historyReset !== false || list.length < (s.previousBugs?.bugs?.length ?? 0)) fail("HISTORY_RESET", "bugs.importedFrom", "importa a RC2.2.24 sem reset");
    for (const id of [...REQUIRED_NEW_P1, ...CARRIED_P1]) {
      const bug = list.find((item) => item.id === id);
      if (!bug || bug.severity !== "P1" || bug.releaseBlocking !== true) fail("P1_IGNORED", `bugs.${id}`, "P1 bloqueante até PASS físico");
    }
    for (const bug of list) if (bug.status === "PHYSICAL_PASS" && !(bug.physicalEvidence?.testedAt && bug.physicalEvidence?.evidenceType)) fail("FAKE_PHYSICAL_PASS", `bugs.${bug.id}`, "CODE/WEB PASS não é APK PASS");
    for (const name of OWNER_PHYSICAL) if (!(name in (bugs.ownerDevicePhysical ?? {})) || (bugs.ownerDevicePhysical[name] !== "NOT_RUN" && !bugs.physicalEvidence?.[name])) fail("FAKE_PHYSICAL_PASS", `ownerDevicePhysical.${name}`, "NOT_RUN até haver evidência");
    for (const sev of ["P0", "P1", "P2"]) {
      const items = list.filter((bug) => bug.severity === sev);
      const panel = {
        open: items.filter((b) => !["PHYSICAL_PASS", "WONT_FIX_WITH_REASON"].includes(b.status)).length,
        new: items.filter((b) => b.status === "OPEN").length,
        reproduced: items.filter((b) => b.status === "REPRODUCED").length,
        fixed: items.filter((b) => ["FIXED_CODE", "AUTOMATED_REGRESSION"].includes(b.status)).length,
        awaitingPhysical: items.filter((b) => b.status === "PHYSICAL_RETEST_PENDING").length,
        physicalPass: items.filter((b) => b.status === "PHYSICAL_PASS").length,
      };
      if (JSON.stringify(panel) !== JSON.stringify(bugs.panel?.[sev])) fail("BUG_COUNTER_DRIFT", `bugs.panel.${sev}`, `${JSON.stringify(bugs.panel?.[sev])} ≠ ${JSON.stringify(panel)}`);
    }
    if (bugs.release?.PUBLIC_BETA !== "NO_GO" || bugs.release?.CLOSED_BETA !== "NO_GO") fail("CLOSED_BETA_PREMATURE", "bugs.release", "NO_GO");
    if (bugs.prOpenedAutomatically !== false) fail("AUTO_PR", "bugs", "PR nunca automático");
  }
  if (!/## OBSERVED/.test(s.report) || !/## INFERRED/.test(s.report) || !/## NOT_TESTED/.test(s.report)) fail("REPORT_EVIDENCE_COLLAPSED", "rc2-2-25-product-experience-closure.md", "OBSERVED/INFERRED/NOT_TESTED");
  if (!/appId: "longyu\.noba\.com"/.test(s.src.capacitorConfig)) fail("PACKAGE_CHANGED", "capacitor.config", "longyu.noba.com");
  if (!/export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;/.test(s.src.subscription)) fail("PURCHASES_ENABLED", FILES.subscription, "DISABLED_FOR_BETA");
  if (!/MAX_AUTOMATIC_CHANNEL = "internal"/.test(stripComments(s.src.releaseIdentity))) fail("PRODUCTION_PLAY_ENABLED", FILES.releaseIdentity, "internal");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("TOUCHED_273", "docs/release/rc2-candidate.json", "#273 congelada");
  if (!/export const RC2_2_25_PRODUCT_EXPERIENCE_CLOSURE_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-25-product-experience-closure"/.test(s.src.curriculumFreeze)) fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_25_PRODUCT_EXPERIENCE_CLOSURE_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze)) fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
  return failures;
}

export const VALIDATORS = {
  "gold-standard": validateGoldStandard,
  "stepkind-classification": validateStepkindClassification,
  "all-lessons-audit": validateAllLessonsAudit,
  "surface-inventory": validateSurfaceInventory,
  "density-score": validateDensityScore,
  "hub-activity-modes": validateHubActivityModes,
  "review-round": validateReviewRound,
  "focus-frame": validateFocusFrame,
  "speaking-flow": validateSpeakingFlow,
  "tone-trace-memory": validateToneTraceMemory,
  "immersion-scene": validateImmersionScene,
  "culture-task-handoff": validateCultureTaskHandoff,
  "journey-return-pulse": validateJourneyReturnPulse,
  "progressive-discovery": validateProgressiveDiscovery,
  "conta-first-fold": validateContaFirstFold,
  "logout-discoverability": validateLogoutDiscoverability,
  "more-order": validateMoreOrder,
  appearance: validateAppearance,
  "profile-first-fold": validateProfileFirstFold,
  "cta-normalization": validateCtaNormalization,
  "owner-product-debt": validateOwnerProductDebt,
  "goldens-human-script": validateGoldensHumanScript,
  "release-truth": validateReleaseTruth,
};
