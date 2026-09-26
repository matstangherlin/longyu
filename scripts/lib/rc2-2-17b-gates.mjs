/**
 * RC2.2.17B — Guided Journey Player Parity.
 *
 * Cinco gates sobre um estado carregado do repositório real:
 *   validateGuidedShell            toda lição no GuidedLessonShell; sem Card antigo;
 *                                  shell ≠ nível de guia; prova, cultura e desktop
 *   validatePresentationContracts  STEP_PRESENTATION_CONTRACTS: todo StepKind,
 *                                  dock ≥ 80%, exceções explícitas, evidência 134
 *   validatePresentationStage      PREPARE real e micro-páginas SÓ de apresentação
 *                                  (sem idx, XP, domínio, onDone antecipado)
 *   validateGuidedActionDock       uma ação principal, dock na safe-area, ouvir
 *                                  honesto, fallback de fala, folha de erro, movimento
 *   validateGuidedParityRelease    conversa, tom, metadados, Dragão, package,
 *                                  #273, QA físico honesto, sem segundo motor
 * Cada um devolve [{ code, where, why }] (vazio = passa). Os `test:*` mutam o
 * estado e exigem o código de falha certo.
 *
 * O módulo puro de apresentação (guidedPresentation.ts) é EMPACOTADO a partir
 * do TEXTO do estado (esbuild), então uma mutação no código é executada de
 * verdade — não só procurada por regex. Dados da Jornada vêm do repo.
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
export const RC2_2_17B_BASE = { pr290Head: "ddf00fdd", mainSha: "8594baa5" };
export const RC2_2_17B_QA_FIELDS = [
  "guidedJourneyL1",
  "guidedJourneyL2",
  "guidedJourneyTone",
  "guidedJourneySpeech",
  "guidedJourneyConversation",
  "guidedJourneyHanzi",
  "guidedJourneyIntermediate",
  "guidedJourneyAdvanced",
];
const FORBIDDEN_ENGINE_FILES = /(LessonEngineV2|GuidedJourneyEngine|StepRendererV2|GuidedStepRenderer)\.(tsx?|mjs)$/;
const PROGRESS_CALLS = /\b(setIdx|handleDone|completeLesson|recordLessonMasteryPass|setLessonXp|setLessonReward|addXp|addPoints|recordDailyTask|ensureSrs|setCorrect)\b/;
/** Passos simples que precisam caber em 390×844 (PART BM). */
const SIMPLE_KINDS = ["listen", "tone", "intro", "flashcard", "recognize", "dialogue_choice", "listen_select", "image_choice"];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

export const FILES = {
  presentation: "src/lib/guidedPresentation.ts",
  guidedLesson: "src/lib/guidedLesson.ts",
  shell: "src/features/lesson/GuidedLessonShell.tsx",
  primitives: "src/components/guided/GuidedPrimitives.tsx",
  player: "src/features/lesson/LessonPlayer.tsx",
  steps: "src/features/lesson/steps.tsx",
  conversation: "src/features/lesson/ConversationSceneStep.tsx",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
  selfCompare: "src/features/lesson/SelfComparePractice.tsx",
  imageChoice: "src/features/lesson/StepImageChoice.tsx",
  victory: "src/features/lesson/LessonVictory.tsx",
  guideDialogue: "src/components/guide/GuideDialogue.tsx",
  toneContrast: "src/components/tone/ToneContrastCard.tsx",
  guidedTry: "src/features/landing/GuidedTryPage.tsx",
  phaseChallenge: "src/features/challenge/PhaseChallengePage.tsx",
  journeyData: "src/data/journey.ts",
  css: "src/index.css",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
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
  src.capacitorConfig = read(exists("capacitor.config.ts") ? "capacitor.config.ts" : "capacitor.config.json");
  src.e2e = read("e2e/rc2-2-17b-guided-journey-parity.spec.ts");
  return {
    srcFileNames: walk("src"),
    src,
    structural: exists("docs/release/rc2-2-17b-structural-134.json") ? readJson("docs/release/rc2-2-17b-structural-134.json") : null,
    contractSweep: exists("docs/release/rc2-2-17b-contract-sweep.json") ? readJson("docs/release/rc2-2-17b-contract-sweep.json") : null,
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
  const head = /\)\s*(?::\s*[^{=]+)?\{/.exec(String(text).slice(start));
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

/** Trecho entre dois marcadores (exclusivo); vazio se algum faltar. */
function between(text, from, to) {
  const a = String(text).indexOf(from);
  if (a < 0) return "";
  const b = String(text).indexOf(to, a + from.length);
  return b < 0 ? "" : String(text).slice(a + from.length, b);
}

// ── Execução do módulo puro a partir do TEXTO ─────────────────────────────

const bundleCache = new Map();
export async function loadModules(s) {
  const key = `${s.src.presentation}\u0000${s.src.guidedLesson}`;
  if (bundleCache.has(key)) return bundleCache.get(key);
  const overrides = new Map([
    [path.join(ROOT, FILES.presentation), s.src.presentation],
    [path.join(ROOT, FILES.guidedLesson), s.src.guidedLesson],
  ]);
  const result = await build({
    stdin: {
      contents: `export * as presentation from "./${FILES.presentation}";\nexport * as guided from "./${FILES.guidedLesson}";\nexport { ALL_LESSONS } from "./${FILES.journeyData}";\n`,
      resolveDir: ROOT,
      loader: "ts",
      sourcefile: "rc2-2-17b-entry.ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": "{}" },
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty" },
    plugins: [
      {
        name: "rc2-2-17b-overrides",
        setup(pluginBuild) {
          pluginBuild.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
            const text = overrides.get(args.path);
            return text === undefined ? undefined : { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2217b-"));
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

/** StepKinds declarados na união `StepKind` de journey.ts. */
function declaredStepKinds(journeyText) {
  const union = between(journeyText, "export type StepKind =", ";");
  return [...union.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

function freezeInvariants(s, fail) {
  if (!/export const RC2_2_17B_GUIDED_JOURNEY_PARITY_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-17b-guided-journey-parity"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_17B_GUIDED_JOURNEY_PARITY_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze))
    fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
}

/** Ramo guiado do passo no LessonPlayer (entre o PREPARE e o rollback). */
function guidedStepBranch(player) {
  return between(player, ') : guidedShell ? (', ') : (\n      <Card');
}
function prepareBranch(player) {
  return between(player, 'guidedShell && presentationStage === "PREPARE" ? (', ') : guidedShell ? (');
}

// ── 1. Shell guiado ───────────────────────────────────────────────────────

export async function validateGuidedShell(s) {
  const { failures, fail } = collector();
  const player = stripComments(s.src.player);
  const shell = stripComments(s.src.shell);
  // CU — toda lição da Jornada passa pelo shell (marca exposta no quadro).
  if (!/data-guided-lesson-shell=\{guidedShell \? "true" : "false"\}/.test(player) || !/<GuidedLessonHeader\b/.test(player) || !/<GuidedLessonActionDock\b/.test(player))
    fail("SHELL_MISSING", "LessonPlayer.tsx", "cabeçalho, viewport e dock do GuidedLessonShell em toda lição");
  // CV/BI — o ramo guiado não embrulha o passo no <Card> antigo.
  const branch = guidedStepBranch(player);
  if (!branch || /<Card\b/.test(branch) || !/<GuidedStepSurface\b/.test(branch) || !/data-lesson-task-body/.test(branch))
    fail("LEGACY_CARD_WRAPPER", "LessonPlayer.tsx", "passo direto no viewport (GuidedStepSurface), sem <Card>");
  if (/<Card\b|shadow-lift|rounded-\[24px\]/.test(fnBody(shell, "export function GuidedStepSurface(")))
    fail("LEGACY_CARD_WRAPPER", "GuidedLessonShell.tsx GuidedStepSurface", "superfície sem sombra/borda de card");
  // BH/DA — SHELL não depende do nível de guia: LOW também é guiado.
  const shellLine = /const guidedShell = ([^;]+);/.exec(player)?.[1] ?? "";
  if (shellLine.trim() !== 'shellMode === "GUIDED"' || /guidance/.test(fnBody(shell, "export function lessonShellMode(")))
    fail("SHELL_DEPENDS_ON_GUIDANCE", "LessonPlayer.tsx", "guidedShell = shellMode === \"GUIDED\" (guia muda densidade, não o shell)");
  const { presentation } = await loadModules(s);
  const mode = presentation.resolveLessonShellMode;
  if (mode({}) !== "GUIDED" || mode({ flag: "off" }) !== "LEGACY" || mode({ flag: "on" }) !== "GUIDED")
    fail("SHELL_FLAG_BROKEN", "resolveLessonShellMode", "padrão GUIDED; VITE_GUIDED_JOURNEY_SHELL=off volta ao legado (DEV/QA)");
  if (mode({ flag: "off", productionBeta: true }) !== "GUIDED" || mode({ runtimeOverride: "legacy", productionBeta: true }) !== "GUIDED")
    fail("PRODUCTION_LEGACY_ALLOWED", "resolveLessonShellMode", "produção pública: sempre GUIDED");
  if (!/runtimeOverride: seeded \? readLocal\(SHELL_OVERRIDE_KEY\) : null/.test(shell) || !/productionBeta: isProductionBetaEnv\(\)/.test(shell))
    fail("PRODUCTION_LEGACY_ALLOWED", "GuidedLessonShell.tsx lessonShellMode", "override só em sessão de teste semeada");
  // DB — prova de fase no mesmo shell limpo, sem Card e sem Dragão.
  const exam = between(stripComments(s.src.phaseChallenge), 'data-testid="phase-challenge-exam"', "</MandarinHelpProvider>");
  if (!exam || !/data-guided-lesson-shell="true"/.test(exam) || /<Card\b|<Mascot|<GuideLine|<GuideDialogue/.test(exam) || !/<GuidedProgressHeader\b/.test(exam) || !/<GuidedBottomAction\b/.test(exam))
    fail("ASSESSMENT_LEGACY", "PhaseChallengePage.tsx", "prova: cabeçalho guiado, sem card, ação no dock, sem Dragão");
  // BU — cultura: mesmo shell; × sai (culture-back), fontes discretas.
  if (!/exitTestId=\{lesson\.lessonDomain === "culture" \? "culture-back" : undefined\}/.test(player) || !/lesson\.lessonDomain === "culture" && guidedShell \?/.test(player))
    fail("CULTURE_SHELL_BROKEN", "LessonPlayer.tsx", "cultura no shell guiado, sem pílula de tipo e sem Voltar duplicado");
  // BJ/BK — desktop/tablet: coluna limitada ~640–760px.
  const width = Number(/column: "mx-auto w-full max-w-\[(\d+)px\]"/.exec(s.src.primitives)?.[1] ?? 0);
  const widthConst = presentation.GUIDED_VIEWPORT_MAX_WIDTH_PX;
  if (width < 640 || width > 760 || widthConst !== width)
    fail("DESKTOP_WIDTH", "GuidedPrimitives.tsx GUIDED_CLASS.column", "largura limitada 640–760px (não é celular esticado)");
  freezeInvariants(s, fail);
  return failures;
}

// ── 2. Contratos de apresentação ──────────────────────────────────────────

export async function validatePresentationContracts(s) {
  const { failures, fail } = collector();
  const { presentation, ALL_LESSONS } = await loadModules(s);
  const contracts = presentation.STEP_PRESENTATION_CONTRACTS ?? {};
  // CH — todo StepKind tem contrato completo.
  const kinds = declaredStepKinds(s.src.journeyData);
  if (kinds.length < 40) fail("CONTRACT_MISSING", "journey.ts StepKind", "união de StepKind não encontrada");
  for (const kind of kinds) {
    const c = contracts[kind];
    if (!c || !c.layout || !c.actionPlacement || !c.verticalAlignment || !c.scrollPolicy || !c.feedbackPolicy || !c.interaction)
      fail("CONTRACT_MISSING", `STEP_PRESENTATION_CONTRACTS.${kind}`, "layout, actionPlacement, verticalAlignment, scrollPolicy, feedbackPolicy, interaction");
  }
  // CG/K — INLINE/NONE são exceções explícitas; COMPLEX_INLINE só para cena longa.
  for (const [kind, c] of Object.entries(contracts)) {
    if (c.actionPlacement !== "DOCK" && !String(c.exception ?? "").trim())
      fail("INLINE_WITHOUT_REASON", `STEP_PRESENTATION_CONTRACTS.${kind}`, "exceção ao dock precisa de motivo");
    if (c.layout === "COMPLEX_INLINE" && kind !== "conversation_scene")
      fail("INLINE_WITHOUT_REASON", `STEP_PRESENTATION_CONTRACTS.${kind}`, "COMPLEX_INLINE é exceção de cena longa");
  }
  // BM — passos simples cabem na tela (sem rolagem, centralizados).
  for (const kind of SIMPLE_KINDS) {
    const c = contracts[kind];
    if (!c || c.scrollPolicy !== "NONE" || c.verticalAlignment === "CONTENT_SCROLL")
      fail("SIMPLE_STEP_SCROLLS", `STEP_PRESENTATION_CONTRACTS.${kind}`, "ouvir/tom/escolha/ensino simples cabem em 390×844");
  }
  // L — ≥ 80% dos passos com a ação no dock (autorais E plano real).
  const target = presentation.GUIDED_DOCK_TARGET_SHARE;
  const authored = presentation.dockShareForKinds(ALL_LESSONS.flatMap((lesson) => (lesson.steps ?? []).map((step) => step.kind)));
  if (target !== 0.8 || authored.share < target)
    fail("DOCK_SHARE_LOW", "passos autorais", `dock ${(authored.share * 100).toFixed(1)}% (meta ≥ 80%)`);
  // Evidência estrutural das 134 lições (varredura E2E do plano REAL).
  const ev = s.structural;
  if (!ev) fail("STRUCTURAL_EVIDENCE_MISSING", "docs/release/rc2-2-17b-structural-134.json", "varredura das 134 lições");
  else {
    if (ev.lessons !== ALL_LESSONS.length || ev.guidedShell !== ALL_LESSONS.length || ev.legacyCard !== 0)
      fail("STRUCTURAL_EVIDENCE_FAILED", "rc2-2-17b-structural-134.json", `${ev.guidedShell}/${ev.lessons} no shell, ${ev.legacyCard} com Card antigo`);
    const runtime = presentation.dockShareForKinds((ev.rows ?? []).flatMap((row) => row.kinds ?? []));
    if (runtime.total < 500 || runtime.share < target)
      fail("DOCK_SHARE_LOW", "plano real (134 lições)", `dock ${(runtime.share * 100).toFixed(1)}% no plano real (meta ≥ 80%)`);
  }
  const sweep = s.contractSweep;
  if (!sweep || !Array.isArray(sweep.violations) || sweep.violations.length || (sweep.steps ?? 0) < 100)
    fail("STRUCTURAL_EVIDENCE_FAILED", "docs/release/rc2-2-17b-contract-sweep.json", "varredura por StepKind sem violações");
  freezeInvariants(s, fail);
  return failures;
}

// ── 3. Estágio de apresentação ────────────────────────────────────────────

export async function validatePresentationStage(s) {
  const { failures, fail } = collector();
  const { presentation } = await loadModules(s);
  const stage = (input) => presentation.presentationStageFor({ guidance: "HIGH", stepIndex: 0, firstStepKind: "listen", bridge: false, started: false, ...input });
  // N/O/P — PREPARE real quando aplicável.
  if (stage({}) !== "PREPARE" || stage({ guidance: "MEDIUM" }) !== "PREPARE" || stage({ firstStepKind: "intro", bridge: true }) !== "PREPARE")
    fail("PREPARE_NOT_REAL", "presentationStageFor", "abertura com guia alto/médio vira micro-passo visual");
  if (stage({ started: true }) !== "STEP" || stage({ stepIndex: 2 }) !== "STEP" || stage({ guidance: "LOW" }) !== "STEP" || stage({ guidance: "NONE" }) !== "STEP" || stage({ firstStepKind: "intro" }) !== "STEP")
    fail("PREPARE_NOT_REAL", "presentationStageFor", "sem PREPARE depois de começar, no meio, em LOW/NONE ou quando o 1º passo já é o Dragão");
  const player = stripComments(s.src.player);
  const prepare = prepareBranch(player);
  if (!prepare || !/<GuidedPrepareStage\b/.test(prepare) || !/<LessonActionPortal>/.test(prepare) || !/onClick=\{\(\) => setPrepareDone\(true\)\}/.test(prepare))
    fail("PREPARE_NOT_REAL", "LessonPlayer.tsx", "PREPARE = Dragão + balão + título + Começar no dock");
  // Q/DC — o PREPARE não conta como passo, XP, domínio, tarefa ou SRS.
  const progress = PROGRESS_CALLS.exec(prepare)?.[0];
  if (progress && /setIdx|handleDone|setCorrect|recordLessonMasteryPass|completeLesson|ensureSrs|recordDailyTask/.test(progress))
    fail("PRESENTATION_MUTATES_PROGRESS", "LessonPlayer.tsx PREPARE", `estágio de apresentação chama ${progress}`);
  if (progress && /setLessonXp|setLessonReward|addXp|addPoints/.test(progress))
    fail("PRESENTATION_GRANTS_XP", "LessonPlayer.tsx PREPARE", `estágio de apresentação chama ${progress}`);
  if (!/const \[prepareDone, setPrepareDone\] = useState\(false\);/.test(player) || /persist|localStorage/.test(between(player, "const [prepareDone", ";")))
    fail("PRESENTATION_MUTATES_PROGRESS", "LessonPlayer.tsx", "PREPARE é estado de UI (RAM), não progresso");
  // DD — recarregar não duplica conclusão: a barreira de conclusão continua.
  if (!/if \(completedStepKeyRef\.current === completionKey\) \{/.test(player))
    fail("RELOAD_DUPLICATES", "LessonPlayer.tsx handleDone", "um passo só conclui uma vez (completedStepKeyRef)");
  // AM–AQ — micro-páginas: ≤ 140 caracteres, nada se perde, onDone só no fim.
  const long = "Pinyin escreve o som com letras latinas. Ele não substitui os caracteres, mas ajuda a ler e a pronunciar. Os acentos mostram o tom, e o tom muda o sentido da palavra inteira. Vamos por partes, sem pressa, um som por vez.";
  const pages = presentation.splitTeachPages([long, "Curta."]);
  const norm = (text) => text.replace(/\s+/g, " ").trim();
  if (!pages.length || pages.some((page) => page.length > presentation.GUIDED_HELPER_MAX_CHARS) || norm(pages.join(" ")) !== norm(`${long} Curta.`) || presentation.GUIDED_HELPER_MAX_CHARS > 140)
    fail("TEACH_PAGES_LOSE_TEXT", "splitTeachPages", "micro-páginas ≤ 140 caracteres, sem perder texto");
  const steps = stripComments(s.src.steps);
  const intro = fnBody(steps, "function StepIntro(");
  if (!/const pages = guided \? splitTeachPages\(guideMessages\) : guideMessages;/.test(intro) || !/messages=\{pages\}/.test(intro) || !/onComplete=\{\(\) => onDone\(\)\}/.test(intro))
    fail("SUBPAGE_EARLY_DONE", "steps.tsx StepIntro", "micro-páginas no GuideDialogue; onDone só na última");
  const listen = fnBody(steps, "function GuidedStepListen(");
  const listenPage = between(listen, 'data-guided-listen-stage="listen"', "</StickyActionBar>");
  if (!listenPage || /onDone\(/.test(listenPage) || !/onClick=\{\(\) => setPage\("speak"\)\}/.test(listenPage) || !/onContinue=\{\(\) => onDone\(\)\}/.test(listen))
    fail("SUBPAGE_EARLY_DONE", "steps.tsx GuidedStepListen", "ouvir → falar é a mesma etapa; onDone só no Continuar final");
  // CP — título da lição só no PREPARE.
  if (/data-guided-lesson-title/.test(fnBody(stripComments(s.src.shell), "export function GuidedStepSurface(")) || (player.match(/data-guided-lesson-title/g) ?? []).length)
    fail("TITLE_REPEATED", "GuidedStepSurface", "título da lição aparece no PREPARE e some depois");
  if (!/data-guided-lesson-title/.test(fnBody(stripComments(s.src.shell), "export function GuidedPrepareStage(")))
    fail("TITLE_REPEATED", "GuidedPrepareStage", "o PREPARE mostra o título da lição");
  freezeInvariants(s, fail);
  return failures;
}

// ── 4. Dock / ação principal ──────────────────────────────────────────────

export async function validateGuidedActionDock(s) {
  const { failures, fail } = collector();
  const primitives = stripComments(s.src.primitives);
  const shell = stripComments(s.src.shell);
  const css = s.src.css;
  // I/BO — dock na safe-area de baixo; cabeçalho na de cima.
  const dockClass = /dock: "([^"]+)"/.exec(primitives)?.[1] ?? "";
  const headerClass = /header:\s*"([^"]+)"/.exec(primitives)?.[1] ?? "";
  if (!/var\(--app-safe-bottom\)/.test(dockClass) || !/var\(--app-safe-top\)/.test(headerClass) || !/data-guided-action-dock/.test(primitives))
    fail("CTA_BEHIND_GESTURE_BAR", "GuidedPrimitives.tsx", "dock respeita safe-area-bottom; cabeçalho safe-area-top");
  if (!/data-lesson-action-region/.test(fnBody(shell, "export function GuidedLessonActionDock(")))
    fail("CTA_BEHIND_GESTURE_BAR", "GuidedLessonActionDock", "o dock é a região das ações do passo (fora do scroller)");
  // CM — UMA ação principal sólida: secundárias viram texto no dock.
  if (!/\[data-guided-action-dock\] button\[data-button-variant="outline"\]:not\(\[data-guided-primary\]\)[\s\S]{0,400}background: transparent;/.test(css) || !/data-button-variant=\{variant\}/.test(read("src/components/ui/primitives.tsx")))
    fail("TWO_PRIMARY_CTAS", "index.css", "ações secundárias no dock sem superfície de CTA");
  const guidedTry = stripComments(s.src.guidedTry);
  if ((guidedTry.match(/data-guided-action(?![-\w])/g) ?? []).length !== 1)
    fail("TWO_PRIMARY_CTAS", "GuidedTryPage.tsx", "uma ação principal por passo");
  // T/U/CX — ouvir: revela só com áudio REAL (ou falha explícita).
  const listen = fnBody(stripComments(s.src.steps), "function GuidedStepListen(");
  if (!/const heard = listen === "PLAYING" \|\| listen === "HEARD";/.test(listen) || !/\(heard \|\| failed\) && \(/.test(listen) || !/disabled=\{!heard && !failed\}/.test(listen) || !/playMandarinAudio\(/.test(listen))
    fail("LISTEN_CLICK_IS_HEARD", "steps.tsx GuidedStepListen", "clique ≠ ouviu; revela e libera só com evento real ou falha");
  if (/setListen\(/.test(fnBody(listen, "function play(")))
    fail("LISTEN_CLICK_IS_HEARD", "steps.tsx GuidedStepListen play()", "o toque só pede o áudio; o estado vem do motor (onState)");
  if (!/data-testid="guided-audio-failed"/.test(listen))
    fail("AUDIO_FAILURE_HIDDEN", "steps.tsx GuidedStepListen", "o shell não esconde a falha de áudio");
  // DH/BQ — fala: autoavaliação e Falar no dock do shell.
  if (!/<GuidedDock>/.test(stripComments(s.src.selfCompare)) || !/<GuidedDock>/.test(stripComments(s.src.pronunciation)))
    fail("SPEECH_FALLBACK_ESCAPES_SHELL", "PronunciationPractice/SelfComparePractice", "Falar / Gravar / Continuar no dock do shell");
  // Y/Z — erro no fluxo inicial: folha compacta, sem painel de economia.
  const player = stripComments(s.src.player);
  const compact = between(player, 'data-guided-retry-sheet="compact"', "</ModalOverlay>");
  if (!/pendingMistake && guidedShell && \(guidance === "HIGH" \|\| guidance === "MEDIUM"\) \?/.test(player) || !compact || /seeProShort|seeLongyuPro|player\.balance|player\.cost/.test(compact))
    fail("RETRY_DASHBOARD", "LessonPlayer.tsx", "erro no início: correção curta + Continuar; Qi como link; sem ofertas");
  // AT/AV — transição curta; movimento reduzido respeitado.
  const reduced = between(css, "@media (prefers-reduced-motion: reduce)", "}\n}");
  const { presentation } = await loadModules(s);
  const ms = presentation.GUIDED_STEP_TRANSITION_MS;
  if (!/\.longyu-step-in,/.test(reduced) || !/longyu-step-in 180ms/.test(css) || ms < 150 || ms > 220 || !/longyu-step-in/.test(fnBody(shell, "export function GuidedStepSurface(")))
    fail("REDUCED_MOTION_IGNORED", "index.css / GuidedStepSurface", "transição 150–220ms; nenhuma com movimento reduzido");
  // BP — teclado: o frame segue o visualViewport.
  if (!/const viewportFrame = useVisualViewportFrame\(\);/.test(player))
    fail("KEYBOARD_COVERS_INPUT", "LessonPlayer.tsx", "dock reposiciona pelo visualViewport");
  freezeInvariants(s, fail);
  return failures;
}

// ── 5. Conversa, tom, metadados, release ──────────────────────────────────

export async function validateGuidedParityRelease(s) {
  const { failures, fail } = collector();
  const conversation = stripComments(s.src.conversation);
  // AB/CZ — conversa sem moldura gigante no shell guiado.
  const frames = conversation.match(/className=\{guided \? "mt-4" : "-mt-2 rounded-b-2xl border border-t-0 border-line bg-surface/g) ?? [];
  if (frames.length < 2 || !/data-conversation-frame=\{guided \? "none" : "legacy"\}/.test(conversation) || !/<GuidedDock>/.test(conversation))
    fail("CONVERSATION_FRAME", "ConversationSceneStep.tsx", "personagens + balão + ação, sem moldura externa");
  // AC — quem não fala: ~60–75%, nunca quase invisível.
  const dim = /active \? "border-accent ring-2 ring-accent\/20" : "border-line opacity-(\d+)"/.exec(conversation)?.[1];
  if (!dim || Number(dim) < 60 || Number(dim) > 75)
    fail("SPEAKER_INVISIBLE", "ConversationSceneStep.tsx CharacterAvatar", "falante inativo entre 60% e 75%");
  // AH/F — tom sem card-em-card.
  const steps = stripComments(s.src.steps);
  if (!/flat=\{guided\}/.test(fnBody(steps, "function StepIntro(")) || !/className=\{flat \? "" :/.test(stripComments(s.src.toneContrast)) || !/guidedShell \? "mx-auto mt-5 max-w-sm" :/.test(fnBody(steps, "function StepTone(")))
    fail("TONE_CARD_IN_CARD", "steps.tsx / ToneContrastCard", "tom no shell: contorno sem moldura extra");
  // F/CM — escolha simples sem caixa em volta do áudio.
  if (!/guidedShell \? "mt-4 grid gap-2\.5 text-center" :/.test(fnBody(steps, "function StepListenSelect(")))
    fail("NESTED_CARDS", "steps.tsx StepListenSelect", "escolha simples: uma superfície por vez");
  // CN/D — cabeçalho: ×, barra, n/N; etapa só para leitor de tela.
  const header = fnBody(stripComments(s.src.shell), "export function GuidedLessonHeader(");
  if (!/<span className="sr-only">\{stageLabel\}<\/span>/.test(header) || /FolegoMeter|DragonBreathMeter|points|Qi\b|streak/i.test(header))
    fail("METADATA_PILLS", "GuidedLessonHeader", "sem pílulas de etapa/fase/Qi/ofensiva no cabeçalho");
  // AW/AX — Dragão em momentos pedagógicos, não em toda pergunta.
  const { presentation } = await loadModules(s);
  const dragonKinds = ["listen", "dialogue_choice", "tone", "conversation_scene", "sentence_build"].filter((kind) => presentation.dragonMomentForStep(kind, 3));
  if (dragonKinds.length || presentation.dragonMomentForStep("intro", 0) !== "PREPARE" || /<Mascot\b/.test(steps) || /<Mascot\b/.test(fnBody(stripComments(s.src.shell), "export function GuidedStepSurface(")))
    fail("DRAGON_EVERY_STEP", "dragonMomentForStep / passos", "Dragão no PREPARE/explicação; nunca em toda pergunta");
  // CR — recap pedagógico antes das recompensas.
  const victory = stripComments(s.src.victory);
  const learnedAt = victory.indexOf("data-victory-learned");
  const xpAt = victory.indexOf("data-victory-xp");
  if (learnedAt < 0 || xpAt < 0 || learnedAt > xpAt)
    fail("RECAP_AFTER_REWARDS", "LessonVictory.tsx", "Você aprendeu vem antes do XP");
  // Sem segundo motor.
  const engines = s.srcFileNames.filter((rel) => FORBIDDEN_ENGINE_FILES.test(rel));
  if (engines.length || (stripComments(s.src.player).match(/<StepRenderer\b/g) ?? []).length !== 1)
    fail("SECOND_ENGINE", engines.join(", ") || "LessonPlayer.tsx", "mesmo StepRenderer; nada de LessonEngineV2");
  // Release — package, #273, QA físico honesto.
  if (!/appId: "longyu\.noba\.com"/.test(s.src.capacitorConfig))
    fail("PACKAGE_CHANGED", "capacitor.config", "appId continua longyu.noba.com");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256)
    fail("TOUCHED_273", "docs/release/rc2-candidate.json", "o candidate da #273 não muda");
  for (const field of RC2_2_17B_QA_FIELDS) {
    if (!(field in s.qa)) fail("QA_FIELD_MISSING", `android-physical-qa.json:${field}`, "campo de QA físico da Jornada guiada");
    else if (s.qa[field] === "PASS" && !s.qa.deviceModel) fail("FAKE_PHYSICAL_PASS", `android-physical-qa.json:${field}`, "PASS só com aparelho real");
  }
  if (!(s.qa.knownRisks ?? []).some((risk) => risk.id === "ANDROID_RC2_2_17B_GUIDED_JOURNEY_UNVERIFIED"))
    fail("QA_FIELD_MISSING", "android-physical-qa.json knownRisks", "risco aberto até o QA físico da Jornada guiada");
  freezeInvariants(s, fail);
  return failures;
}

export const VALIDATORS = {
  "guided-shell": validateGuidedShell,
  "presentation-contracts": validatePresentationContracts,
  "presentation-stage": validatePresentationStage,
  "guided-action-dock": validateGuidedActionDock,
  "guided-parity-release": validateGuidedParityRelease,
};
