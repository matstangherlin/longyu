#!/usr/bin/env node
/**
 * V4.9.3 — Partes M, N, N1 e O: a auditoria das primeiras 20 sessões como
 * experiência humana.
 *
 * O `validate:teach-before-test` já garantia que nenhum alvo é cobrado sem
 * exposição anterior. Esta auditoria pergunta outra coisa, e a diferença é o
 * ponto da remessa inteira: a exposição foi uma AULA, ou foi um passo de
 * exercício que mostrou a resposta meio segundo antes de perguntar?
 *
 * A distinção importa porque as duas passam no gate antigo e só uma delas
 * parece ensino. Um aluno que vê 你好 aparecer numa tela e é perguntado sobre
 * 你好 na tela seguinte não foi ensinado — foi testado com a cola aberta. É
 * isso que a Parte N1 chama de surpresa, e é isso que os `CoreInstructionSlot`
 * eliminam.
 *
 * O relatório é escrito em `docs/reports/v493-first20-teaching-experience.md`
 * porque a Parte N pede a auditoria como documento legível, não só como
 * número: quem for autorar a wave 2 precisa poder ler sessão por sessão o que
 * o aluno recebe e o que lhe é pedido.
 */
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v493-first20-"));
const reportPath = path.join(rootDir, "docs/reports/v493-first20-teaching-experience.md");

const FOUNDATION_TOPICS = [
  "p1-o-que-e-mandarim",
  "p1-o-que-e-pinyin",
  "p1-o-que-e-tom",
  "p1-o-que-e-hanzi",
  "p1-primeiros-hanzi",
];
const PASSES = [1, 2, 3, 4];

try {
  const program = ts.createProgram(
    [
      "src/data/foundationTopicPlans.ts",
      "src/data/pedagogicalSpine.ts",
      "src/data/coreInstructionSlots.ts",
      "src/data/foundationCapsules.ts",
      "src/data/journeyOrchestrator.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
  await copyFile(
    path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"),
    path.join(outDir, "src/i18n/overlays/instructionGloss.en.json")
  );

  const spine = require(path.join(outDir, "src/data/pedagogicalSpine.js"));
  const plans = require(path.join(outDir, "src/data/foundationTopicPlans.js"));
  const slots = require(path.join(outDir, "src/data/coreInstructionSlots.js"));
  const capsules = require(path.join(outDir, "src/data/foundationCapsules.js"));

  const failures = [];
  const fail = (code, detail) => failures.push({ code, ...detail });

  const manifest = new Set(spine.KNOWLEDGE_TARGET_MANIFEST.map((target) => target.id));

  // ── A linha do tempo do aluno ────────────────────────────────────────────
  //
  // Uma posição é (tópico, pass, passo). A aula BEFORE_TOPIC ocupa o passo 0
  // do pass 1 — antes de tudo o que o tópico faz. A aula BETWEEN_PASSES ocupa
  // o passo 0 do pass que ela precede.
  const position = (topicIndex, pass, step) => ({ topicIndex, pass, step });
  const before = (a, b) =>
    a.topicIndex !== b.topicIndex
      ? a.topicIndex < b.topicIndex
      : a.pass !== b.pass
        ? a.pass < b.pass
        : a.step < b.step;

  /** Primeira posição em que a INSTRUÇÃO apresenta cada alvo. */
  const firstInstruction = new Map();
  for (const slot of slots.FOUNDATION_INSTRUCTION_SLOTS) {
    const topicIndex = FOUNDATION_TOPICS.indexOf(slot.topicId);
    if (topicIndex < 0) {
      fail("SLOT_TOPIC_OUTSIDE_FOUNDATION", { slot: slot.id, topicId: slot.topicId });
      continue;
    }
    const at =
      slot.placement === "BETWEEN_PASSES"
        ? position(topicIndex, slot.beforePass ?? 1, 0)
        : slot.placement === "AFTER_TOPIC"
          ? position(topicIndex, PASSES.length + 1, 0)
          : position(topicIndex, 1, 0);

    for (const target of slot.knowledgeTargets) {
      if (!manifest.has(target)) {
        fail("SLOT_TARGET_NOT_IN_MANIFEST", { slot: slot.id, target });
        continue;
      }
      const current = firstInstruction.get(target);
      if (!current || before(at, current)) firstInstruction.set(target, at);
    }
  }

  /** Primeira cobrança obrigatória, e a primeira exposição inline. */
  const firstGraded = new Map();
  const firstInlineExposure = new Map();
  const sessions = [];

  let sessionNumber = 0;
  for (let topicIndex = 0; topicIndex < FOUNDATION_TOPICS.length; topicIndex += 1) {
    const topicId = FOUNDATION_TOPICS[topicIndex];
    for (const pass of PASSES) {
      sessionNumber += 1;
      const steps = plans.foundationAuthoredPlanFor(topicId, pass) ?? [];

      const taughtHere = new Set();
      const askedHere = new Set();
      const newTargets = new Set();
      const assumedTargets = new Set();
      let gradedCount = 0;
      let scaffoldedCount = 0;
      let maxNewPerGraded = 0;
      let productionLevel = "NONE";

      // A aula que abre esta sessão, se houver.
      const openingSlots = slots.FOUNDATION_INSTRUCTION_SLOTS.filter((slot) => {
        if (slot.topicId !== topicId) return false;
        if (slot.placement === "BEFORE_TOPIC") return pass === 1;
        if (slot.placement === "BETWEEN_PASSES") return slot.beforePass === pass;
        return false;
      });
      for (const slot of openingSlots) {
        for (const target of slot.knowledgeTargets) taughtHere.add(target);
      }

      steps.forEach((step, stepIndex) => {
        const evidence = step.pedagogicalEvidence;
        if (!evidence) return;
        const at = position(topicIndex, pass, stepIndex + 1);
        const targets = evidence.knowledgeTargetIds ?? [];

        if (evidence.graded) {
          gradedCount += 1;
          if (evidence.exposureStrength && evidence.exposureStrength !== "ORIENTATION") {
            scaffoldedCount += 1;
          }
          let newInThisStep = 0;
          for (const target of targets) {
            askedHere.add(target);
            if (!firstGraded.has(target)) firstGraded.set(target, at);

            const instruction = firstInstruction.get(target);
            const inline = firstInlineExposure.get(target);
            const taughtBefore =
              (instruction && before(instruction, at)) || (inline && before(inline, at));
            if (!taughtBefore) newInThisStep += 1;

            // Parte N1 — a surpresa. Cobrar um alvo cuja única "exposição" foi
            // uma tela do mesmo exercício não é ensinar; é testar com a cola.
            // Só instrução declarada ou exposição inline ANTERIOR contam.
            if (!taughtBefore) {
              assumedTargets.add(target);
              fail("SURPRISE_GRADED_TASK", {
                session: sessionNumber,
                topicId,
                pass,
                step: stepIndex + 1,
                target,
              });
            }
          }
          maxNewPerGraded = Math.max(maxNewPerGraded, newInThisStep);
          if (evidence.rung === "PRODUCTION" || evidence.rung === "ASSEMBLY") {
            productionLevel = "PRODUCTIVE";
          } else if (productionLevel === "NONE") {
            productionLevel = "RECEPTIVE";
          }
        } else {
          for (const target of targets) {
            taughtHere.add(target);
            if (!firstInlineExposure.has(target)) firstInlineExposure.set(target, at);
          }
        }
        for (const target of targets) {
          const known = firstInstruction.has(target) || firstInlineExposure.has(target);
          if (!known) newTargets.add(target);
        }
      });

      // Parte O — carga cognitiva. Uma tarefa avaliada não pode estrear mais
      // de uma dificuldade primária: se estreia duas, o aluno não sabe qual
      // delas errou, e nem nós.
      if (maxNewPerGraded > spine.MAX_PRIMARY_NEW_DIFFICULTIES_PER_BEGINNER_STEP) {
        fail("COGNITIVE_LOAD_VIOLATION", {
          session: sessionNumber,
          topicId,
          pass,
          newDifficulties: maxNewPerGraded,
        });
      }

      sessions.push({
        session: sessionNumber,
        topicId,
        pass,
        taught: [...taughtHere],
        asked: [...askedHere],
        newTargets: [...newTargets],
        assumedTargets: [...assumedTargets],
        scaffold: gradedCount ? `${scaffoldedCount}/${gradedCount}` : "—",
        cognitiveLoad: maxNewPerGraded,
        productionLevel,
        instruction: openingSlots.map((slot) => slot.id),
      });
    }
  }

  // ── Parte M — o vínculo duro ─────────────────────────────────────────────
  //
  // Para todo alvo que a fundação ENSINA por instrução, a aula precisa vir
  // antes da primeira cobrança. Não basta existir: precisa vir antes.
  let firstInstructionAfterFirstGrade = 0;
  for (const [target, instructionAt] of firstInstruction) {
    const gradedAt = firstGraded.get(target);
    if (!gradedAt) continue;
    if (before(gradedAt, instructionAt)) {
      firstInstructionAfterFirstGrade += 1;
      fail("INSTRUCTION_AFTER_FIRST_GRADE", {
        target,
        gradedAt: `${FOUNDATION_TOPICS[gradedAt.topicIndex]}/M${gradedAt.pass}/step${gradedAt.step}`,
        instructionAt: `${FOUNDATION_TOPICS[instructionAt.topicIndex]}/M${instructionAt.pass}`,
      });
    }
  }

  // ── Todo tópico da fundação é ABERTO por uma aula ────────────────────────
  //
  // Sem esta checagem o gate tem um buraco que eu descobri quebrando-o de
  // propósito: apagar a aula de "O que é mandarim?" continuava passando,
  // porque o plano autorado expõe 你好 inline antes de cobrar e nenhuma
  // surpresa aparecia. Só que "exposto numa tela do exercício" é exatamente o
  // que esta remessa existe para deixar de aceitar como ensino.
  //
  // A ordenação sozinha não basta: é preciso exigir que a aula EXISTA.
  for (let topicIndex = 0; topicIndex < FOUNDATION_TOPICS.length; topicIndex += 1) {
    const topicId = FOUNDATION_TOPICS[topicIndex];
    const opening = slots.FOUNDATION_INSTRUCTION_SLOTS.filter(
      (slot) => slot.topicId === topicId && slot.placement !== "AFTER_TOPIC"
    );
    if (!opening.length) {
      fail("FOUNDATION_TOPIC_WITHOUT_INSTRUCTION", { topicId });
      continue;
    }
    // E a aula precisa preceder a primeira cobrança DESTE tópico.
    const firstGradedHere = [...firstGraded.entries()]
      .map(([, at]) => at)
      .filter((at) => at.topicIndex === topicIndex)
      .sort((a, b) => (before(a, b) ? -1 : 1))[0];
    if (!firstGradedHere) continue;

    const earliestInstruction = opening
      .map((slot) =>
        slot.placement === "BETWEEN_PASSES"
          ? position(topicIndex, slot.beforePass ?? 1, 0)
          : position(topicIndex, 1, 0)
      )
      .sort((a, b) => (before(a, b) ? -1 : 1))[0];

    if (before(firstGradedHere, earliestInstruction)) {
      fail("TOPIC_GRADES_BEFORE_ITS_INSTRUCTION", {
        topicId,
        gradedAt: `M${firstGradedHere.pass}/step${firstGradedHere.step}`,
        instructionAt: `M${earliestInstruction.pass}`,
      });
    }
  }

  // ── Parte P — a primeira vitória com sentido ─────────────────────────────
  //
  // Não é "completou uma sessão": é a primeira vez que o aluno RECONHECE algo
  // que lhe foi ensinado. Antes disso ele pode ter acertado por eliminação.
  const firstWin = sessions.find(
    (entry) => entry.instruction.length > 0 && entry.asked.length > 0 && !entry.assumedTargets.length
  );
  const firstMeaningfulWinSession = firstWin?.session ?? 0;
  if (!firstWin) fail("NO_FIRST_MEANINGFUL_WIN", {});

  // Alvos que a instrução declara mas que o manifesto não conhece.
  const foundationUnknownTargets = [...firstInstruction.keys()].filter(
    (target) => !manifest.has(target)
  ).length;

  const surprises = failures.filter((entry) => entry.code === "SURPRISE_GRADED_TASK");
  const loadViolations = failures.filter((entry) => entry.code === "COGNITIVE_LOAD_VIOLATION");

  const lines = [
    "# V4.9.3 — as 20 primeiras sessões como experiência",
    "",
    "Gerado por `npm run validate:first20-instruction-order`. Cada linha é uma",
    "sessão do aluno, não um teste: o que ele recebe, o que lhe é pedido, e com",
    "quanto apoio.",
    "",
    "## Métricas",
    "",
    `- first20SessionsAudited: ${sessions.length}`,
    `- surpriseGradedTasks: ${surprises.length}`,
    `- firstInstructionAfterFirstGrade: ${firstInstructionAfterFirstGrade}`,
    `- foundationUnknownTargets: ${foundationUnknownTargets}`,
    `- foundationCognitiveLoadViolations: ${loadViolations.length}`,
    `- coreInstructionSlots: ${slots.FOUNDATION_INSTRUCTION_SLOTS.length}`,
    `- foundationCapsules: ${capsules.FOUNDATION_WAVE_1_CAPSULES.length}`,
    `- firstMeaningfulWinSession: ${firstMeaningfulWinSession}`,
    "",
    "## Sessão a sessão",
    "",
    "| # | tópico | pass | aula recebida | ensinado | perguntado | assumido | scaffold | carga | produção |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...sessions.map(
      (entry) =>
        `| ${entry.session} | ${entry.topicId} | M${entry.pass} | ${entry.instruction.join(", ") || "—"} | ${entry.taught.length} | ${entry.asked.length} | ${entry.assumedTargets.join(", ") || "—"} | ${entry.scaffold} | ${entry.cognitiveLoad} | ${entry.productionLevel} |`
    ),
    "",
    "## O que cada coluna quer dizer",
    "",
    "- **aula recebida**: o `CoreInstructionSlot` que abre a sessão, quando há.",
    "- **assumido**: alvos cobrados sem instrução nem exposição anterior. É a",
    "  coluna que precisa ficar vazia — cada item aqui é uma surpresa.",
    "- **scaffold**: tarefas avaliadas com apoio, sobre o total de avaliadas.",
    "- **carga**: maior número de dificuldades estreando numa mesma tarefa",
    "  avaliada. Acima de 1, o aluno não sabe qual delas errou.",
    "",
  ];

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");

  if (failures.length) {
    console.error("FAIL validate:first20-instruction-order");
    for (const failure of failures.slice(0, 25)) {
      console.error(` - ${failure.code}: ${JSON.stringify(failure)}`);
    }
    if (failures.length > 25) console.error(` … e mais ${failures.length - 25}`);
    process.exitCode = 1;
  } else {
    console.log(
      `PASS validate:first20-instruction-order — ${sessions.length} sessões, ` +
        `${surprises.length} surpresas, instrução sempre antes da cobrança, ` +
        `primeira vitória com sentido na sessão ${firstMeaningfulWinSession}.`
    );
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
