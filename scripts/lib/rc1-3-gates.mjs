/**
 * RC1.3 — Learning Integrity.
 *
 * Os gates desta remessa existem porque cada um deles corresponde a algo que o
 * QA real viu acontecer com um aluno:
 *
 * - a revisão entrava em loop e não terminava;
 * - a correção mostrava 我叫马修 para um item cuja resposta é 请问;
 * - a revisão era mais difícil e menos apoiada que a tarefa original;
 * - a árvore da associação visual mostrava fundo ao redor da base;
 * - a Victory desktop abria um vazio enorme antes do CTA.
 *
 * Um gate que só lesse o contrato não teria pego nenhum desses: todos eram
 * comportamento de runtime. Por isso, além de ler as fontes, a maioria dos
 * validadores aqui EXECUTA o motor real (plano de lição, plano de revisão,
 * construção da correção) e mede o que sai.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { installTsRequireHook } from "./rc1-1-gates.mjs";

const require = createRequire(import.meta.url);

function failList() {
  const failures = [];
  return {
    failures,
    fail(code, ref, message) {
      failures.push({ code, ref, message });
    },
  };
}

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

/** Fonte sem comentários — evita um gate verde por causa de um comentário. */
function code(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function loadModule(rel) {
  installTsRequireHook();
  return require(path.join(process.cwd(), rel));
}

function loadCurriculum() {
  installTsRequireHook();
  const root = process.cwd();
  return {
    journey: require(path.join(root, "src/data/journey.ts")),
    lessonTasks: require(path.join(root, "src/features/lesson/lessonTasks.ts")),
  };
}

// ── validate:review-finite-session (P1/P2) ─────────────────────────────────

/**
 * P1 — a revisão não pode ser infinita.
 *
 * O gate valida o contrato (plano imutável, orçamento, teto de ocorrências,
 * disjuntor) E roda a máquina com o pior oráculo possível: erra tudo, sempre.
 * Essa execução é o que pega a regressão real — a fila que se reconstruía a cada
 * resposta passava em qualquer leitura estática.
 */
export function validateReviewFiniteSession(data = {}) {
  const { fail, failures } = failList();
  const planSource = data.planSource ?? read("src/features/lesson/reviewSessionPlan.ts");
  const player = data.playerSource ?? read("src/features/lesson/LessonPlayer.tsx");

  for (const needle of [
    "reviewSessionId",
    "plannedItems",
    "retryBudget",
    "currentIndex",
    "completedItemIds",
  ]) {
    if (!planSource.includes(needle)) {
      fail("CONTRACT", "reviewSessionPlan", `P1: falta ${needle} na sessão de revisão`);
    }
  }
  if (!planSource.includes("REVIEW_MAX_OCCURRENCES_PER_LOGICAL_ITEM")) {
    fail("OCCURRENCE_CAP", "reviewSessionPlan", "P1.5: teto de ocorrências por conhecimento ausente");
  }
  if (!planSource.includes("checkReviewSessionInvariants")) {
    fail("INVARIANT", "reviewSessionPlan", "P1.5: invariante precisa existir como código");
  }
  for (const breaker of ["RENDER_BUDGET_EXCEEDED", "OCCURRENCE_LIMIT_EXCEEDED", "CURSOR_STALLED"]) {
    if (!planSource.includes(breaker)) {
      fail("CIRCUIT_BREAKER", "reviewSessionPlan", `P1.8: disjuntor sem ${breaker}`);
    }
  }

  // P1.1 / BUG 1 — a fila NÃO pode voltar a cair no conjunto inteiro quando os
  // pendentes acabam, e a `key` da sessão não pode depender dos corrigidos.
  if (/remainingErrors\.length\s*>\s*0\s*\?\s*remainingErrors\s*:\s*committedErrors/.test(code(player))) {
    fail("REVIEW_LOOP", "LessonPlayer", "BUG 1: fila da revisão volta ao conjunto inteiro e reinicia a sessão");
  }
  if (/key=\{`review-\$\{correctedErrorIds/.test(player)) {
    fail("REVIEW_LOOP", "LessonPlayer", "P1.1: a key da sessão não pode mudar a cada correção");
  }
  if (!player.includes("buildReviewSessionPlan") || !player.includes("advanceReviewSession")) {
    fail("WIRING", "LessonPlayer", "P1: o player precisa consumir o plano finito");
  }
  // P2.2 — o resumo não pode reabrir a mesma sessão.
  if (/onReviewAgain/.test(code(player))) {
    fail("REVIEW_LOOP", "LessonPlayer", "P2.2: o resumo não pode devolver o aluno à mesma revisão");
  }
  // P1.9 — avanço local-first; sync não segura o término.
  if (/cloudSync[A-Za-z]*\s*===\s*"?finished/.test(code(player))) {
    fail("SYNC_BLOCKS", "LessonPlayer", "P1.9: término da revisão não pode depender de sync");
  }

  // Execução real da máquina.
  const plan = data.planModule ?? loadModule("src/features/lesson/reviewSessionPlan.ts");
  const sources = ["A", "B", "C", "D", "E"].map((id) => ({ errorId: id, logicalReviewItemId: id }));
  const built = plan.buildReviewSessionPlan({ reviewSessionId: "gate", sources });

  const oracles = [
    ["sempre erra", () => false],
    ["sempre acerta", () => true],
    ["alterna", (_item, index) => index % 2 === 0],
    ["erra só o último", (item) => item.logicalReviewItemId !== "E"],
    ["erra só o primeiro", (item) => item.logicalReviewItemId !== "A"],
  ];
  for (const [label, oracle] of oracles) {
    const run = plan.runReviewSession(built, oracle);
    if (!run.terminated) {
      fail("INFINITE", "reviewSessionPlan", `P1: sessão não terminou com oráculo "${label}"`);
      continue;
    }
    const invariants = plan.checkReviewSessionInvariants(run.state);
    for (const violation of invariants.violations) {
      fail(violation.code, "reviewSessionPlan", `oráculo "${label}": ${violation.detail}`);
    }
    if (run.renderedOrder.length > built.maxRenderedTasks) {
      fail(
        "RENDER_BUDGET_EXCEEDED",
        "reviewSessionPlan",
        `oráculo "${label}": ${run.renderedOrder.length} > ${built.maxRenderedTasks}`
      );
    }
    // P1.4 — nunca A seguido de A.
    for (let index = 1; index < run.renderedOrder.length; index += 1) {
      const previous = run.renderedOrder[index - 1].split(":")[1];
      const current = run.renderedOrder[index].split(":")[1];
      if (previous === current) {
        fail("IMMEDIATE_RETRY", "reviewSessionPlan", `oráculo "${label}": ${current} repetido em sequência`);
      }
    }
    // P1.7 — o último item fecha a sessão.
    if (run.state.status === "complete" && run.state.currentIndex !== run.state.queue.length) {
      fail("NOT_FINAL", "reviewSessionPlan", `oráculo "${label}": sessão completa com cursor ${run.state.currentIndex}`);
    }
  }

  // P2.1 — o número anunciado é o do plano: erros do mesmo conhecimento colapsam.
  const collapsed = plan.buildReviewSessionPlan({
    reviewSessionId: "gate-dup",
    sources: [
      { errorId: "e1", logicalReviewItemId: "X" },
      { errorId: "e2", logicalReviewItemId: "X" },
      { errorId: "e3", logicalReviewItemId: "Y" },
    ],
  });
  if (collapsed.plannedItems.length !== 2) {
    fail("PLAN_COUNT", "reviewSessionPlan", `P2.1: ${collapsed.plannedItems.length} itens para 2 conhecimentos`);
  }

  return { failures };
}

// ── validate:review-task-parity (P3) ───────────────────────────────────────

/**
 * P3 — a revisão pratica a MESMA habilidade.
 *
 * Além de checar o mapa, o gate varre os passos REAIS de todas as lições em
 * todas as passes, constrói o erro correspondente e confere qual motor a
 * remediação escolheu. É assim que "sentence_build virou MCQ" aparece.
 */
export function validateReviewTaskParity(data = {}) {
  const { fail, failures } = failList();
  const paritySource = data.paritySource ?? read("src/features/lesson/reviewTaskParity.ts");

  for (const needle of ["REVIEW_KINDS_BY_SOURCE_KIND", "AUTHORIZED_REMEDIATION_TRANSFORMS", "isSilentMcqConversion"]) {
    if (!paritySource.includes(needle)) fail("CONTRACT", "reviewTaskParity", `P3: falta ${needle}`);
  }
  const parity = data.parityModule ?? loadModule("src/features/lesson/reviewTaskParity.ts");
  for (const transform of parity.AUTHORIZED_REMEDIATION_TRANSFORMS) {
    if (!transform.reasonPt || transform.reasonPt.length < 40) {
      fail("UNJUSTIFIED", "reviewTaskParity", `P3.3: ${transform.from}→${transform.to} sem motivo pedagógico escrito`);
    }
  }
  // P3.2 — as famílias que o QA citou não podem cair fora da modalidade.
  const mustKeep = [
    ["image_choice", "image"],
    ["compare_with_image", "image"],
    ["listen_select", "listen"],
    ["audio_discrimination", "listen"],
    ["sentence_build", "build"],
    ["translation_build", "build"],
    ["hanzi_build", "build"],
    ["fill_blank", "blank"],
    ["match_pairs", "pair"],
  ];
  for (const [from, expected] of mustKeep) {
    if (parity.preferredReviewKind(from) !== expected) {
      fail("PARITY", "reviewTaskParity", `P3.2: ${from} deveria revisar como ${expected}`);
    }
  }
  // Mutação 6 — MCQ sem motivo é reprovado; MCQ autorizada e justificada, não.
  const authorizedToChoice = new Set(
    parity.AUTHORIZED_REMEDIATION_TRANSFORMS.filter((transform) => transform.to === "choice").map(
      (transform) => transform.from
    )
  );
  for (const [from] of mustKeep) {
    const silent = parity.isSilentMcqConversion({ sourceKind: from, reviewKind: "choice" });
    if (authorizedToChoice.has(from)) {
      if (silent) {
        fail("SILENT_MCQ", "reviewTaskParity", `P3.3: ${from}→choice é autorizado e não deveria ser reprovado`);
      }
      continue;
    }
    if (!silent) {
      fail("SILENT_MCQ", "reviewTaskParity", `P3.3: ${from}→choice deveria ser reprovado`);
    }
  }

  const runtime = data.runtimeFailures ?? scanReviewParity();
  for (const violation of runtime) fail("RUNTIME", violation.ref, violation.message);
  return { failures, scanned: runtime.length };
}

/** Constrói um erro plausível a partir de um passo real da lição. */
function activityErrorForStep(lesson, step, index) {
  const expected =
    step.correctAnswer ??
    step.checkpoint?.correctAnswer ??
    step.answer ??
    step.blankAnswer ??
    step.targetParts?.join("") ??
    step.target?.join("") ??
    (step.kind === "tone" && step.tone ? `${step.tone}º tom` : "") ??
    "";
  return {
    id: `${lesson.id}:${index}:${step.kind}:gate`,
    lessonId: lesson.id,
    moduleId: lesson.unitId ?? "",
    phaseId: lesson.phaseId ?? "",
    taskId: `${lesson.id}:stage`,
    questionId: `${lesson.id}:${index}:${step.kind}`,
    exerciseId: `${lesson.id}:${index}`,
    type: step.kind,
    prompt: step.prompt ?? step.dialoguePrompt ?? step.title ?? "",
    correctAnswer: String(expected ?? ""),
    selectedAnswer: "Resposta incorreta",
    hanzi: step.hanzi,
    pinyin: step.pinyin,
    timestamp: 0,
    skill: "uso",
    targets: [],
    step,
  };
}

const GRADED_SKIP = new Set(["intro", "listen", "flashcard", "microread", "hanzi_evolution", "write"]);

export function scanReviewParity({ limit = Infinity } = {}) {
  const { journey, lessonTasks } = loadCurriculum();
  const remediation = loadModule("src/features/lesson/immediateRemediation.ts");
  const parity = loadModule("src/features/lesson/reviewTaskParity.ts");
  const violations = [];
  let scanned = 0;
  for (const lesson of journey.ALL_LESSONS) {
    for (const pass of [1, 2, 3, 4]) {
      let steps;
      try {
        steps = lessonTasks.lessonRoundStepsFor(lesson, { masteryPass: pass });
      } catch {
        continue;
      }
      steps.forEach((step, index) => {
        if (GRADED_SKIP.has(step.kind)) return;
        if (scanned >= limit) return;
        scanned += 1;
        let exercise;
        try {
          exercise = remediation.buildImmediateRemediationExercise(activityErrorForStep(lesson, step, index));
        } catch (error) {
          violations.push({ ref: `${lesson.id}#${pass}:${index}`, message: `remediação lançou: ${error.message}` });
          return;
        }
        const verdict = parity.checkReviewTaskParity({ sourceKind: step.kind, reviewKind: exercise.kind });
        if (!verdict.ok) {
          violations.push({
            ref: `${lesson.id}#${pass}:${index}`,
            message: `${step.kind} → ${exercise.kind}: ${verdict.reasonPt}`,
          });
        }
      });
    }
  }
  return violations;
}

// ── validate:review-answer-integrity (P6/P7/P8) ────────────────────────────

/**
 * P6 — uma única resposta canônica; P8 — falha fechada.
 *
 * O caso de 请问 entra aqui como regressão nomeada (P7): prompt real, resposta
 * canônica 请问, e a proibição explícita de 我叫马修 aparecer como correção.
 */
export function validateReviewAnswerIntegrity(data = {}) {
  const { fail, failures } = failList();
  const canonicalSource = data.canonicalSource ?? read("src/features/lesson/canonicalAnswer.ts");
  const player = data.playerSource ?? read("src/features/lesson/LessonPlayer.tsx");
  const remediationSource = data.remediationSource ?? read("src/features/lesson/immediateRemediation.ts");

  for (const needle of ["CanonicalResponse", "correctOptionId", "ANSWER_INTEGRITY_MISMATCH", "checkAnswerIntegrity"]) {
    if (!canonicalSource.includes(needle)) fail("CONTRACT", "canonicalAnswer", `P6: falta ${needle}`);
  }
  for (const field of ["hanzi", "pinyin", "meaning", "explanation", "audioTarget"]) {
    if (!new RegExp(`\\b${field}\\??:`).test(canonicalSource)) {
      fail("CONTRACT", "canonicalAnswer", `P6.1: resposta canônica sem ${field}`);
    }
  }
  // P6.2/P6.4 — nunca índice depois do shuffle.
  if (/correctIndex/.test(code(canonicalSource)) || /correctIndex/.test(code(player))) {
    fail("CORRECT_INDEX", "canonicalAnswer", "P6.2: resposta correta não pode ser índice");
  }
  if (!player.includes("evaluateCanonicalChoice")) {
    fail("WIRING", "LessonPlayer", "P6.2: o avaliador precisa comparar optionId");
  }
  // P6.5/P6.6/P6.7 — feedback, explicação e áudio vêm da mesma resposta.
  for (const needle of [
    "exercise.canonical.explanation",
    "exercise.canonical.audioTarget",
    "exercise.canonical.meaning",
  ]) {
    if (!player.includes(needle)) fail("SINGLE_SOURCE", "LessonPlayer", `P6: ${needle} ausente`);
  }
  if (!player.includes("data-review-integrity")) {
    fail("FAIL_CLOSED", "LessonPlayer", "P8: a tela precisa marcar quando a correção é bloqueada");
  }
  if (!remediationSource.includes("integrity")) {
    fail("FAIL_CLOSED", "immediateRemediation", "P8: a correção precisa carregar o veredito de integridade");
  }

  const canonical = data.canonicalModule ?? loadModule("src/features/lesson/canonicalAnswer.ts");
  // P6.3 — shuffle não move a resposta.
  const response = {
    id: "char:qingwen",
    hanzi: "请问",
    pinyin: "qǐng wèn",
    meaning: "com licença",
    explanation: "请问 = com licença; abre a pergunta.",
    audioTarget: "请问",
    display: "请问",
    value: canonical.normalizeCanonicalValue("请问"),
  };
  for (let seed = 0; seed < 100; seed += 1) {
    const set = canonical.buildCanonicalOptionSet({
      canonical: response,
      distractors: ["再见", "不客气", "我很好"],
      seed: `seed-${seed}`,
    });
    const correct = set.options.find((option) => option.id === set.correctOptionId);
    if (!correct || correct.label !== "请问") {
      fail("SHUFFLE", "canonicalAnswer", `P7.2: seed ${seed} moveu a resposta para "${correct?.label}"`);
      break;
    }
    for (const option of set.options) {
      if (canonical.evaluateCanonicalChoice(option.id, set) !== (option.label === "请问")) {
        fail("SHUFFLE", "canonicalAnswer", `P6.4: seed ${seed} avaliou "${option.label}" incorretamente`);
        break;
      }
    }
  }
  // P8 — resposta e explicação em itens diferentes falham fechado.
  const mismatch = canonical.checkAnswerIntegrity({
    canonical: { ...response, display: "我叫马修", hanzi: "我叫马修", value: canonical.normalizeCanonicalValue("我叫马修") },
  });
  if (mismatch.ok || !mismatch.issues.some((issue) => issue.code === "ANSWER_INTEGRITY_MISMATCH")) {
    fail("FAIL_CLOSED", "canonicalAnswer", "P8: 我叫马修 com explicação de 请问 precisa falhar fechado");
  }

  const runtime = data.runtimeFailures ?? scanAnswerIntegrity();
  for (const violation of runtime) fail("RUNTIME", violation.ref, violation.message);
  return { failures, scanned: runtime.length };
}

/**
 * RC1.4 — allowlist REMOVIDA.
 *
 * Em RC1.3 estes quatro refs estavam congelados porque o planejador gerava
 * prompt/resposta/explicação de alvos diferentes. RC1.4 corrigiu a origem
 * (`generatedTaskObjective` + `genericFidelityBonus`); a lista fica vazia.
 *
 * Mutação P15.1 / M14: reintroduzir entradas aqui deve falhar o gate
 * `validate:generated-task-integrity` (não use isto como escape hatch).
 */
export const KNOWN_FROZEN_ANSWER_MISMATCHES = new Set([]);

/** RC1.4 P15.1 — a allowlist de mismatches gerados deve permanecer vazia. */
export function assertFrozenMismatchAllowlistEmpty() {
  return [...KNOWN_FROZEN_ANSWER_MISMATCHES];
}

/**
 * Varre as correções REAIS de todas as lições. Qualquer item em que a resposta
 * canônica e a explicação apontem para hànzì diferentes é exatamente o bug do
 * 请问 — e o gate só aceita zero (a allowlist RC1.3 foi esvaziada em RC1.4).
 */
export function scanAnswerIntegrity() {
  const { journey, lessonTasks } = loadCurriculum();
  const remediation = loadModule("src/features/lesson/immediateRemediation.ts");
  const violations = [];
  for (const lesson of journey.ALL_LESSONS) {
    for (const pass of [1, 2, 3, 4]) {
      let steps;
      try {
        steps = lessonTasks.lessonRoundStepsFor(lesson, { masteryPass: pass });
      } catch {
        continue;
      }
      steps.forEach((step, index) => {
        if (GRADED_SKIP.has(step.kind)) return;
        let exercise;
        try {
          exercise = remediation.buildImmediateRemediationExercise(activityErrorForStep(lesson, step, index));
        } catch {
          return;
        }
        const ref = `${lesson.id}#${pass}:${index}:${step.kind}`;
        if (KNOWN_FROZEN_ANSWER_MISMATCHES.has(ref)) return;
        const blocking = exercise.integrity.issues.filter(
          (issue) => issue.code === "ANSWER_INTEGRITY_MISMATCH" || issue.code === "ANSWER_INTEGRITY_OPTION_MISSING"
        );
        for (const issue of blocking) {
          violations.push({ ref, message: `${issue.code} — ${issue.detail}` });
        }
      });
    }
  }
  return violations;
}

// ── validate:review-help-parity (P4/P5) ────────────────────────────────────

export function validateReviewHelpParity(data = {}) {
  const { fail, failures } = failList();
  const helpSource = data.helpSource ?? read("src/features/lesson/reviewHelpParity.ts");
  const player = data.playerSource ?? read("src/features/lesson/LessonPlayer.tsx");

  for (const needle of ["REVIEW_HINT_LADDER", "checkReviewHelpParity", "nextReviewHint", "sourceHelpProfile"]) {
    if (!helpSource.includes(needle)) fail("CONTRACT", "reviewHelpParity", `P4: falta ${needle}`);
  }
  // P4 — "Preciso de uma dica" continua na revisão.
  if (!player.includes("data-review-help-request") || !player.includes("player.needHint")) {
    fail("NO_HINT", "LessonPlayer", "P4: a revisão perdeu o botão de dica");
  }
  if (!player.includes("nextReviewHint")) {
    fail("NO_LADDER", "LessonPlayer", "P4.3: a revisão precisa usar a escada progressiva");
  }

  const help = data.helpModule ?? loadModule("src/features/lesson/reviewHelpParity.ts");
  // P4.4 / mutação: nenhuma escada pode começar revelando.
  for (const kind of Object.keys(help.REVIEW_HINT_LADDER)) {
    if (help.firstHintRevealsAnswer(kind)) {
      fail("REVEALS_FIRST", "reviewHelpParity", `P4.4: a primeira dica de "${kind}" revela a resposta`);
    }
    const ladder = help.REVIEW_HINT_LADDER[kind];
    if (ladder[ladder.length - 1] !== "reveal") {
      fail("NO_EXIT", "reviewHelpParity", `P4.3: a escada de "${kind}" não termina em revelar`);
    }
  }
  // P5 — listening é audio-first (mutação 7).
  for (const kind of ["listen", "tone", "pinyin"]) {
    if (!help.isAudioFirstReviewKind(kind)) {
      fail("AUDIO_FIRST", "reviewHelpParity", `P5: "${kind}" precisa ser audio-first`);
    }
    if (help.REVIEW_HINT_LADDER[kind][0] !== "audio") {
      fail("AUDIO_FIRST", "reviewHelpParity", `P5: a primeira dica de "${kind}" deveria ser o áudio`);
    }
  }
  // P4.1 — piso e teto.
  const source = { initial: 2, ceiling: 3, affordances: ["audio", "chips", "context"] };
  const review = help.reviewHelpProfile({
    reviewKind: "build",
    source,
    available: ["audio", "chips", "context", "pinyin", "structure"],
  });
  const verdict = help.checkReviewHelpParity({ source, review });
  if (!verdict.ok) {
    fail("HELP_FLOOR", "reviewHelpParity", `P4.1: paridade falhou no caso base — ${verdict.reasonPt}`);
  }
  // Mutação 5 — perder um apoio da origem reprova.
  const stripped = { ...review, affordances: review.affordances.filter((item) => item !== "chips") };
  if (help.checkReviewHelpParity({ source, review: stripped }).ok) {
    fail("HELP_FLOOR", "reviewHelpParity", "P4.1: perder as peças da origem deveria reprovar");
  }

  const runtime = data.runtimeFailures ?? scanReviewHelpParity();
  for (const violation of runtime) fail("RUNTIME", violation.ref, violation.message);
  return { failures, scanned: runtime.length };
}

/**
 * Varredura real: para cada passo que oferecia dica/áudio/peças, a correção
 * gerada precisa oferecer pelo menos o mesmo conjunto de degraus.
 */
export function scanReviewHelpParity() {
  const { journey, lessonTasks } = loadCurriculum();
  const remediation = loadModule("src/features/lesson/immediateRemediation.ts");
  const help = loadModule("src/features/lesson/reviewHelpParity.ts");
  const violations = [];
  for (const lesson of journey.ALL_LESSONS) {
    for (const pass of [1, 2, 3, 4]) {
      let steps;
      try {
        steps = lessonTasks.lessonRoundStepsFor(lesson, { masteryPass: pass });
      } catch {
        continue;
      }
      steps.forEach((step, index) => {
        if (GRADED_SKIP.has(step.kind)) return;
        let exercise;
        try {
          exercise = remediation.buildImmediateRemediationExercise(activityErrorForStep(lesson, step, index));
        } catch {
          return;
        }
        // P4 — a revisão precisa oferecer ALGUMA ajuda progressiva sempre.
        const hints = exercise.availableHints.filter((hint) => hint !== "reveal");
        if (hints.length === 0) {
          violations.push({
            ref: `${lesson.id}#${pass}:${index}:${step.kind}`,
            message: "correção sem nenhum degrau de dica antes de revelar",
          });
        }
        // Mutação 7 — listening não pode revelar o alvo antes do áudio.
        if (help.isAudioFirstReviewKind(exercise.kind) && exercise.display && exercise.kind === "listen") {
          violations.push({
            ref: `${lesson.id}#${pass}:${index}:${step.kind}`,
            message: "revisão de listening mostra o alvo antes do áudio",
          });
        }
      });
    }
  }
  return violations;
}

// ── validate:visual-asset-transparency (P10/P11) ───────────────────────────

/**
 * P11.2 — o gate automático de transparência.
 *
 * `transparentExpected` vem de `backgroundStyle: "transparent"` no catálogo.
 * Para SVG: nenhuma placa de canvas, nenhuma tinta de canvas pintada por cima do
 * desenho e nenhum resíduo de chão solto na margem inferior. Para raster: os
 * quatro cantos com alpha 0.
 *
 * Exceções são declaradas aqui, com motivo — é o que separa "arte clara
 * legítima" de "fundo que sobrou", uma distinção que nenhuma heurística de cor
 * resolve sozinha. `home.svg` é o exemplo: as vidraças esverdeadas são desenho.
 */
export const TRANSPARENCY_REVIEWED_EXCEPTIONS = {};

export async function validateVisualAssetTransparency(data = {}) {
  const { fail, failures } = failList();
  const sharp = data.sharp ?? (await import("sharp")).default;
  const transparency = data.transparency ?? (await import("./visual-transparency.mjs"));
  const visuals = loadModule("src/data/visualVocabulary.ts");
  const root = process.cwd();

  let checked = 0;
  for (const concept of visuals.VISUAL_CONCEPTS) {
    if (concept.backgroundStyle !== "transparent") continue;
    const file = path.join(root, "src/assets/visuals", concept.imageSrc);
    if (!fs.existsSync(file)) {
      fail("MISSING", concept.id, `arquivo ausente: ${concept.imageSrc}`);
      continue;
    }
    checked += 1;
    const exception = TRANSPARENCY_REVIEWED_EXCEPTIONS[concept.id];
    if (concept.imageSrc.endsWith(".svg")) {
      const svg = fs.readFileSync(file, "utf8");
      for (const plate of transparency.findCanvasPlates(svg)) {
        fail("CANVAS_PLATE", concept.id, `placa de fundo ${plate.fill} — "transparent" não aceita canvas opaco`);
      }
      const residue = await transparency.findResidueShapes(sharp, svg);
      for (const finding of residue) {
        if (exception?.fills?.includes(finding.fill)) continue;
        fail(
          finding.reason === "ground-residue" ? "GROUND_RESIDUE" : "CANVAS_OVER_DRAWING",
          concept.id,
          `${finding.reason} ${finding.fill} — corrija o ARQUIVO, nunca por CSS (P10.1)`
        );
      }
    } else {
      // P10.2 — raster transparente: cantos com alpha 0.
      const { data: pixels, info } = await sharp(file)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const corners = [
        0,
        (info.width - 1) * info.channels,
        (info.height - 1) * info.width * info.channels,
        ((info.height - 1) * info.width + info.width - 1) * info.channels,
      ];
      for (const corner of corners) {
        if (pixels[corner + 3] > 8) {
          fail("OPAQUE_CORNER", concept.id, `canto com alpha ${pixels[corner + 3]} — fundo deve ser alpha 0 (P10.2)`);
          break;
        }
      }
    }
  }

  // P10.1 / mutação 14 — o defeito não pode ser escondido por CSS.
  const stepImage = read("src/features/lesson/StepImageChoice.tsx");
  const compare = read("src/features/lesson/StepCompareWithImage.tsx");
  for (const [ref, source] of [["StepImageChoice", stepImage], ["StepCompareWithImage", compare]]) {
    if (/mix-blend-mode|mixBlendMode/.test(source)) {
      fail("CSS_MASK", ref, "P10.1: mix-blend-mode esconde o defeito em vez de corrigir o asset");
    }
  }
  return { failures, checked };
}

// ── validate:visual-association-integrity (P12) ────────────────────────────

/**
 * P12 — imagem, ref canônico, hànzì, pinyin e significado do MESMO item.
 *
 * O caso citado é a árvore: se o alvo canônico é 木 / mù, a imagem, o hànzì, o
 * pinyin e o significado têm de sair todos desse ref — e "mù" não pode estar
 * hardcoded no renderer (mutação 15).
 */
export function validateVisualAssociationIntegrity(data = {}) {
  const { fail, failures } = failList();
  const visuals = data.visualsModule ?? loadModule("src/data/visualVocabulary.ts");
  const characters = data.charactersModule ?? loadModule("src/data/characters.ts");
  const charByHanzi = new Map(characters.CHARACTERS.map((char) => [char.hanzi, char]));
  const charById = new Map(characters.CHARACTERS.map((char) => [char.id, char]));

  for (const concept of visuals.VISUAL_CONCEPTS) {
    const char = charById.get(concept.charId) ?? charByHanzi.get(concept.hanzi);
    if (!char) continue;
    if (char.hanzi !== concept.hanzi) {
      fail("REF_MISMATCH", concept.id, `hànzì ${concept.hanzi} × ref ${concept.charId} (${char.hanzi})`);
    }
    // Mutação 15 — pinyin de outro ref.
    const conceptBase = String(concept.pinyin ?? "").replace(/\s+/g, "").toLowerCase();
    const charBase = String(char.pinyin ?? "").replace(/\s+/g, "").toLowerCase();
    if (conceptBase && charBase && conceptBase !== charBase) {
      fail("PINYIN_MISMATCH", concept.id, `pinyin ${concept.pinyin} × ref ${char.id} (${char.pinyin})`);
    }
    if (!concept.meaningPt?.trim()) fail("NO_MEANING", concept.id, "P12: conceito visual sem significado");
    if (!concept.imageSrc?.trim()) fail("NO_IMAGE", concept.id, "P12: conceito visual sem imagem");
  }

  // P12.1 — o caso da árvore, nomeado.
  const tree = visuals.VISUAL_CONCEPTS.find((concept) => concept.id === "tree");
  if (!tree) {
    fail("MISSING_TREE", "tree", "P12.1: conceito da árvore ausente");
  } else {
    if (tree.hanzi !== "木" || !String(tree.pinyin).startsWith("mù")) {
      fail("TREE_REF", "tree", `P12.1: árvore aponta para ${tree.hanzi}/${tree.pinyin} (esperado 木/mù)`);
    }
    if (tree.charId !== "mu") fail("TREE_REF", "tree", `P12.1: charId ${tree.charId} (esperado mu)`);
  }

  // Mutação 15 — o renderer não pode hardcodar o alvo.
  const stepImage = data.stepImageSource ?? read("src/features/lesson/StepImageChoice.tsx");
  const player = data.playerSource ?? read("src/features/lesson/LessonPlayer.tsx");
  for (const [ref, source] of [["StepImageChoice", stepImage], ["LessonPlayer", player]]) {
    if (/["'`]mù["'`]/.test(code(source))) {
      fail("HARDCODED", ref, "P12.1: pinyin da árvore hardcoded no renderer");
    }
  }
  // A revisão visual precisa derivar do conceito.
  if (!player.includes("data-review-visual-concept")) {
    fail("NO_CANONICAL_REF", "LessonPlayer", "P12: a revisão visual precisa expor o ref canônico");
  }
  return { failures };
}

// ── validate:tone-contrast-progression (P13–P22) ───────────────────────────

export function validateToneContrastProgression(data = {}) {
  const { fail, failures } = failList();
  const sets = data.setsModule ?? loadModule("src/data/toneContrastSets.ts");
  const enrichment = data.enrichmentModule ?? loadModule("src/features/lesson/toneContrastEnrichment.ts");

  // P15.1/P15.2 e mutações 16–19.
  for (const violation of sets.validateAllToneContrastSets()) {
    fail(violation.code, violation.setId, violation.detail);
  }
  if (sets.TONE_CONTRAST_SETS.length === 0) {
    fail("EMPTY", "toneContrastSets", "P15: nenhum contraste tonal declarado");
  }

  // P16 / mutação 20 — nenhum teste antes da apresentação do par, em passe algum.
  const { journey, lessonTasks } = loadCurriculum();
  const lessonById = new Map(journey.ALL_LESSONS.map((lesson) => [lesson.id, lesson]));
  const lessonIds = [...new Set(sets.TONE_CONTRAST_SETS.flatMap((set) => set.taughtIn))];
  let scanned = 0;
  for (const lessonId of lessonIds) {
    const lesson = lessonById.get(lessonId);
    if (!lesson) {
      fail("MISSING_LESSON", lessonId, "P16: lição declarada em taughtIn não existe");
      continue;
    }
    const plans = [["autoral", lesson.steps]];
    for (const pass of [1, 2, 3, 4]) {
      try {
        plans.push([`pass ${pass}`, lessonTasks.lessonRoundStepsFor(lesson, { masteryPass: pass })]);
      } catch {
        /* uma pass que não planeja não impede as outras */
      }
    }
    for (const [label, steps] of plans) {
      scanned += 1;
      const enriched = enrichment.withToneContrastTeaching(lesson, steps);
      for (const gap of enrichment.findToneContrastGaps(lessonId, enriched)) {
        fail(
          "TEST_BEFORE_TEACH",
          `${lessonId} · ${label}`,
          `P16: ${gap.setId} cobrado no passo ${gap.firstTestIndex} sem o par apresentado antes`
        );
      }
    }
  }

  // P21.1 / mutação 23 — nenhum score falso de pronúncia.
  for (const rel of [
    "src/components/tone/ToneContrastCard.tsx",
    "src/features/lesson/PronunciationPractice.tsx",
    "src/locales/pt-BR.ts",
    "src/locales/en.ts",
  ]) {
    let source;
    try {
      source = read(rel);
    } catch {
      continue;
    }
    // Comentários que EXPLICAM a proibição não são a proibição sendo violada.
    if (enrichment.claimsFakeToneScore(code(source))) {
      fail("FAKE_TONE_SCORE", rel, "P21.1: SpeechRecognition não é analisador de tom — sem nota de pronúncia");
    }
  }

  // P16.3/P17 — o cartão apresenta contorno, significado e áudio dos dois.
  const card = data.cardSource ?? read("src/components/tone/ToneContrastCard.tsx");
  for (const needle of ["ToneContour", "data-tone-contrast-meaning", "data-tone-contrast-compare", "data-tone-contrast-slow"]) {
    if (!card.includes(needle)) fail("CARD", "ToneContrastCard", `P16.1/P17.1: falta ${needle}`);
  }
  return { failures, scanned };
}

// ── validate:tone-contrast-no-new-vocab (P19) ──────────────────────────────

/**
 * P19 — contraste pontuado não introduz vocabulário escondido.
 *
 * O que aparece só para demonstrar fica `contrastOnly` e NÃO pode entrar em
 * `newHanzi`, `libraryItems` nem na lista de ensinados (mutações 21 e 22).
 */
export function validateToneContrastNoNewVocab(data = {}) {
  const { fail, failures } = failList();
  const sets = data.setsModule ?? loadModule("src/data/toneContrastSets.ts");
  const { journey } = loadCurriculum();

  const contrastOnly = new Set(sets.contrastOnlyHanzi());
  for (const lesson of journey.ALL_LESSONS) {
    for (const hanzi of lesson.newHanzi ?? []) {
      if (contrastOnly.has(hanzi)) {
        fail("CONTRAST_ONLY_TAUGHT", lesson.id, `P19.1: ${hanzi} é contrastOnly e aparece em newHanzi`);
      }
    }
    for (const item of lesson.libraryItems ?? []) {
      const glyph = String(item).split(":")[1];
      if (contrastOnly.has(glyph)) {
        fail("CONTRAST_ONLY_TAUGHT", lesson.id, `P19.1: ${glyph} é contrastOnly e aparece em libraryItems`);
      }
    }
  }
  // P19 — todo membro NÃO-contrastOnly precisa existir no corpus ensinado.
  const characters = loadModule("src/data/characters.ts");
  const known = new Set(characters.CHARACTERS.map((char) => char.hanzi));
  for (const set of sets.TONE_CONTRAST_SETS) {
    for (const member of [set.a, set.b]) {
      if (!known.has(member.hanzi)) {
        fail("UNKNOWN_REF", set.id, `P19: ${member.hanzi} não existe no corpus`);
      }
      if (!member.contrastOnly && !known.has(member.hanzi)) {
        fail("HIDDEN_VOCAB", set.id, `P19: ${member.hanzi} pontua sem ter sido ensinado`);
      }
    }
  }
  return { failures };
}

// ── validate:completion-layout (P24) ───────────────────────────────────────

/**
 * P24 — a Victory desktop não pode abrir um vazio enorme antes do CTA.
 *
 * Preserva o desenho da RC1.1 (P24.1): o gate olha SÓ para a altura. O que
 * reprova é o card continuar preso a ~100dvh no desktop quando o conteúdo é
 * curto — a regressão da screenshot.
 *
 * A primeira versão deste gate exigia as strings `sm:h-auto` e `sm:flex-none`,
 * e com isso gravou a implementação errada como se fosse o contrato:
 *
 *  - `sm:` é LARGURA. Um celular deitado (667x360) satisfaz `sm` com 360px de
 *    altura, deixava de ocupar a tela e levava o CTA para fora do alcance.
 *  - `flex-none` na região de conteúdo desliga o encolhimento. Dentro de uma
 *    seção com teto e `overflow-hidden`, quem é empurrado para fora do recorte
 *    é o CTA — e aí não dá mais para sair da tela de vitória.
 *
 * O gate agora cobra o invariante, não o nome da classe: compactar só com
 * folga vertical, e a região de conteúdo sempre encolhível.
 */
export function validateCompletionLayout(data = {}) {
  const { fail, failures } = failList();
  const victory = data.victorySource ?? read("src/features/lesson/LessonVictory.tsx");

  if (!/roomy:h-auto/.test(victory)) {
    fail("DESKTOP_HEIGHT", "LessonVictory", "P24.2: o card precisa acompanhar o conteúdo quando há folga vertical");
  }
  if (!/roomy:flex-none/.test(victory)) {
    fail("DESKTOP_HEIGHT", "LessonVictory", "P24.2: a seção não pode esticar quando há folga vertical");
  }
  // A compactação NUNCA pode depender só de largura: `sm:` pega celular deitado.
  for (const widthOnly of ["sm:h-auto", "sm:flex-none", "sm:justify-start"]) {
    if (victory.includes(widthOnly)) {
      fail(
        "WIDTH_ONLY_COMPACT",
        "LessonVictory",
        `P24.2: "${widthOnly}" compacta por largura — um celular deitado (667x360) satisfaz \`sm\` e perde o CTA. Use \`roomy:\`.`
      );
    }
  }
  // A região rolável precisa continuar encolhível, ou o CTA sai do recorte.
  const scrollRegion = victory.match(/data-lesson-victory-scroll[\s\S]{0,400}?className="([^"]*)"/);
  if (!scrollRegion) {
    fail("SCROLL_REGION", "LessonVictory", "P24: não achei a região rolável da Victory");
  } else {
    const classes = scrollRegion[1];
    if (/(^|\s|:)flex-none/.test(classes)) {
      fail(
        "SCROLL_REGION_RIGID",
        "LessonVictory",
        "P24.3: a região rolável não pode ser `flex-none` — ela para de encolher e empurra o CTA para fora do `overflow-hidden` da seção"
      );
    }
    if (!/(^|\s)flex-1(\s|$)/.test(classes) || !/(^|\s)min-h-0(\s|$)/.test(classes)) {
      fail(
        "SCROLL_REGION_RIGID",
        "LessonVictory",
        "P24.3: a região rolável precisa de `flex-1 min-h-0` em TODO tamanho para rolar em vez de recortar o CTA"
      );
    }
  }
  if (!/data-lesson-victory-compact/.test(victory)) {
    fail("MARKER", "LessonVictory", "P24: falta o marcador de compactação para o e2e");
  }
  // P24.3 — o mobile mantém o CTA colado embaixo.
  if (!/pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\]/.test(victory)) {
    fail("MOBILE_CTA", "LessonVictory", "P24.3: o CTA mobile perdeu o safe-area");
  }
  // P24.1 — sem redesenho: a hierarquia da RC1.1 continua.
  for (const marker of ["data-victory-summary", "data-victory-stars", "data-victory-primary", "data-victory-highlight"]) {
    if (!victory.includes(marker)) {
      fail("REDESIGN", "LessonVictory", `P24.1: ${marker} sumiu — a Victory não deve ser redesenhada`);
    }
  }
  return { failures };
}

// ── validate:rc13-curriculum-freeze ────────────────────────────────────────

export const RC13_FREEZE = {
  fingerprint: "a4ca4594a2e5",
  lessons: 134,
  teachingTopics: 113,
};

export function validateRc13CurriculumFreeze(data = {}) {
  const { fail, failures } = failList();
  const { fingerprint, counts } = data;
  if (fingerprint !== RC13_FREEZE.fingerprint) {
    fail("FINGERPRINT", "journey", `esperado ${RC13_FREEZE.fingerprint}, obtido ${fingerprint}`);
  }
  if (counts.lessons !== RC13_FREEZE.lessons) {
    fail("LESSONS", "journey", `esperado ${RC13_FREEZE.lessons}, obtido ${counts.lessons}`);
  }
  if (counts.teachingTopics !== RC13_FREEZE.teachingTopics) {
    fail("TOPICS", "journey", `esperado ${RC13_FREEZE.teachingTopics}, obtido ${counts.teachingTopics}`);
  }
  // A remessa é bugfix: nada de Groups / Programs / Reports.
  const forbidden = ["src/features/business/GroupsPage.tsx", "src/features/business/ProgramsPage.tsx", "src/features/business/ReportsPage.tsx"];
  for (const rel of forbidden) {
    if (fs.existsSync(path.join(process.cwd(), rel))) {
      fail("SCOPE", rel, "RC1.3 não abre Groups/Programs/Reports — V4.10B segue pausada");
    }
  }
  return { failures };
}
