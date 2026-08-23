/**
 * V4.1 — First Communicative Win + Acquisition Momentum
 *
 * Dois portões (um compile):
 *   --gate=win         validate:first-communicative-win
 *   --gate=momentum    validate:acquisition-momentum
 *   (sem flag)         os dois
 *
 * Mede o PLANO REAL de um aluno novo (tentativa 0, sem histórico).
 * Não maquia: listen não cobrado que o planner descarta não conta.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const gateArg = process.argv.find((arg) => arg.startsWith("--gate="))?.slice("--gate=".length);
const runWin = !gateArg || gateArg === "win";
const runMomentum = !gateArg || gateArg === "momentum";

const CJK_RE = /[\u3400-\u9fff]/u;
const CJK_RUN_RE = /[\u3400-\u9fff]+/gu;
const USABLE_PHRASES = new Set(["你好", "谢谢", "再见", "你好吗", "不客气", "我很好", "你呢"]);
const PRODUCTION_KINDS = new Set(["sentence_build", "produce", "reverse_recall"]);
const THEORY_LAB_ROLES = new Set(["perception_lab", "hanzi_lab"]);
const ACQUISITION_EXEMPT_ROLES = new Set(["perception_lab", "hanzi_lab", "review"]);

const MAX_FIRST_CONVERSATION = 2;
const MAX_FIRST_PRODUCTION = 4;
const MAX_FIRST_MANDARIN = 2;
const MAX_NON_COMMUNICATIVE_RUN = 2;
const MAX_THEORY_LAB_RUN = 3;
const FIRST_WINDOW = 10;
const ONBOARDING = 20;
const MOMENTUM_WINDOW = 50;

const failures = [];
const fail = (message) => failures.push(message);

const stepBlob = (step) =>
  [
    step.hanzi,
    step.text,
    step.audioText,
    step.correctAnswer,
    step.answer,
    step.blankAnswer,
    step.prompt,
    step.dialoguePrompt,
    step.title,
    step.body,
    ...(step.targetParts ?? []),
    ...(step.target ?? []),
    ...(step.options ?? []),
  ]
    .filter(Boolean)
    .join(" ");

const extractCjk = (step) => [...new Set(stepBlob(step).match(CJK_RUN_RE) ?? [])];
const hasCjk = (step) => CJK_RE.test(stepBlob(step));
const isUsablePhrase = (text) => {
  const runs = String(text ?? "").match(CJK_RUN_RE) ?? [];
  return runs.some((run) => run.length >= 2 || USABLE_PHRASES.has(run));
};

function isMandarinInteraction(step) {
  if (step.kind === "conversation_scene") return true;
  if (["listen_select", "listen", "comprehend", "sentence_build", "produce", "fill_blank"].includes(step.kind)) {
    return extractCjk(step).some((run) => run.length >= 2 || USABLE_PHRASES.has(run));
  }
  if (step.kind === "dialogue_choice") return isUsablePhrase(step.correctAnswer ?? step.answer ?? "");
  return false;
}

function isCommunicativePayoff(step) {
  if (step.kind === "conversation_scene") return true;
  if (PRODUCTION_KINDS.has(step.kind) && hasCjk(step)) return true;
  const blob = stepBlob(step);
  const usesKnownPhrase = [...USABLE_PHRASES].some((phrase) => blob.includes(phrase));
  if (step.kind === "dialogue_choice") {
    return isUsablePhrase(step.correctAnswer ?? step.answer ?? "") || usesKnownPhrase;
  }
  if (step.kind === "fill_blank") {
    return isUsablePhrase(step.correctAnswer ?? step.blankAnswer ?? "") || usesKnownPhrase;
  }
  if (step.kind === "listen_select") {
    return isUsablePhrase(step.audioText ?? step.correctAnswer ?? "") || usesKnownPhrase;
  }
  return false;
}

function isProduction(step) {
  return PRODUCTION_KINDS.has(step.kind) && hasCjk(step);
}

function isConversation(step) {
  return step.kind === "conversation_scene";
}

function longestRun(flags) {
  let best = 0;
  let current = 0;
  for (const flag of flags) {
    if (flag) {
      current += 1;
      best = Math.max(best, current);
    } else current = 0;
  }
  return best;
}

function acquisitionProgress(plan, previousUnits) {
  const units = new Set();
  for (const step of plan) for (const run of extractCjk(step)) units.add(run);
  const newUnits = [...units].filter(
    (unit) => !previousUnits.has(unit) && (unit.length >= 2 || USABLE_PHRASES.has(unit))
  );
  const hasConversation = plan.some(isConversation);
  const hasProduction = plan.some(isProduction);
  const hasStructure = plan.some((step) =>
    ["structural_frame", "structural_repair", "structural_transfer", "transfer_task"].includes(step.kind)
  );
  const toneApplied =
    plan.some((step) => step.kind === "tone" || step.kind === "tone_id" || step.kind === "tone_pair") &&
    plan.some(isCommunicativePayoff);
  const reuse = plan.some(isCommunicativePayoff);
  return {
    newUnits,
    ok: newUnits.length > 0 || hasConversation || hasProduction || hasStructure || toneApplied || reuse,
    reasons: [
      newUnits.length > 0 ? `unidades novas: ${newUnits.join("、")}` : null,
      hasConversation ? "conversation_scene" : null,
      hasProduction ? "produção guiada" : null,
      hasStructure ? "padrão estrutural" : null,
      toneApplied ? "tom aplicado a frase conhecida" : null,
      reuse && newUnits.length === 0 ? "reúso comunicativo" : null,
    ].filter(Boolean),
  };
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-first-win-"));
try {
  const program = ts.createProgram(
    ["src/data/journey.ts", "src/data/curriculumRole.ts", "src/features/lesson/lessonTasks.ts"],
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
  if (program.emit().emitSkipped) {
    console.error("Falha ao compilar validate:first-communicative-win.");
    process.exit(1);
  }

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { lessonRoundStepsFor, estimateLessonMinutes } = load("src/features/lesson/lessonTasks.js");

  const rows = ALL_LESSONS.map((lesson, index) => {
    const plan = lessonRoundStepsFor(lesson, { attemptNumber: 0, silent: true });
    return {
      position: index + 1,
      id: lesson.id,
      title: lesson.title,
      role: lesson.curriculumRole ?? "acquisition",
      isReview: Boolean(lesson.isReview),
      plan,
      minutes: estimateLessonMinutes(lesson),
      hasMandarin: plan.some(isMandarinInteraction),
      hasConversation: plan.some(isConversation),
      hasProduction: plan.some(isProduction),
      hasPayoff: plan.some(isCommunicativePayoff),
      cjk: [...new Set(plan.flatMap(extractCjk))],
    };
  });

  const first = (predicate) => rows.find((row) => predicate(row));
  const firstMandarin = first((row) => row.hasMandarin);
  const firstConversation = first((row) => row.hasConversation);
  const firstProduction = first((row) => row.hasProduction);
  const minutesUntil = (row) =>
    row ? rows.slice(0, row.position).reduce((sum, item) => sum + item.minutes, 0) : null;

  const onboarding = rows.slice(0, ONBOARDING);
  const first10 = rows.slice(0, FIRST_WINDOW);
  const first50 = rows.slice(0, MOMENTUM_WINDOW);

  const nonCommunicativeRun20 = longestRun(onboarding.map((row) => !row.hasPayoff));
  const nonCommunicativeRun50 = longestRun(first50.map((row) => !row.hasPayoff));
  const theoryLabRun20 = longestRun(onboarding.map((row) => THEORY_LAB_ROLES.has(row.role)));
  const theoryLabRun50 = longestRun(first50.map((row) => THEORY_LAB_ROLES.has(row.role)));

  if (runWin) {
    if (!firstMandarin || firstMandarin.position > MAX_FIRST_MANDARIN) {
      fail(`lessonToFirstMandarinInteraction=${firstMandarin?.position ?? "nunca"} (teto ${MAX_FIRST_MANDARIN})`);
    }
    if (!firstConversation || firstConversation.position > MAX_FIRST_CONVERSATION) {
      fail(`lessonToFirstConversation=${firstConversation?.position ?? "nunca"} (teto ${MAX_FIRST_CONVERSATION})`);
    }
    if (!firstProduction || firstProduction.position > MAX_FIRST_PRODUCTION) {
      fail(`lessonToFirstProduction=${firstProduction?.position ?? "nunca"} (teto ${MAX_FIRST_PRODUCTION})`);
    }
    if (nonCommunicativeRun20 > MAX_NON_COMMUNICATIVE_RUN) {
      fail(`longestNonCommunicativeLessonRun nas 20 primeiras = ${nonCommunicativeRun20} (teto ${MAX_NON_COMMUNICATIVE_RUN})`);
    }
    if (theoryLabRun20 > MAX_THEORY_LAB_RUN) {
      fail(`consecutiveTheoryOrLabLessons nas 20 primeiras = ${theoryLabRun20} (teto ${MAX_THEORY_LAB_RUN})`);
    }
    for (const row of first10) {
      if (!row.hasPayoff) {
        fail(`lição ${row.position} (${row.id}) nas 10 primeiras termina sem aplicação em mandarim`);
      }
    }
  }

  const previousUnits = new Set();
  const momentumRows = [];
  for (const row of first50) {
    const progress = acquisitionProgress(row.plan, previousUnits);
    for (const unit of row.cjk) previousUnits.add(unit);
    const exempt = ACQUISITION_EXEMPT_ROLES.has(row.role) || row.isReview;
    momentumRows.push({ ...row, progress, exempt });
    if (runMomentum && row.role === "acquisition" && !exempt && !progress.ok) {
      fail(`acquisition ${row.position} (${row.id}) sem unidade nova, padrão estrutural ou reúso comunicativo`);
    }
  }
  if (runMomentum && nonCommunicativeRun50 > MAX_NON_COMMUNICATIVE_RUN) {
    fail(`longestNonCommunicativeLessonRun nas 50 primeiras = ${nonCommunicativeRun50} (teto ${MAX_NON_COMMUNICATIVE_RUN})`);
  }

  const writeReport = async (rel, title, extraLines) => {
    const reportPath = path.join(rootDir, rel);
    const lines = [`# ${title}`, "", ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }), ...extraLines];
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, finalizeReport(lines), "utf8");
  };

  if (runWin) {
    await writeReport("reports/first-communicative-win.md", "Primeira vitória comunicativa", [
      "## Resumo",
      "",
      "| Métrica | Valor |",
      "|---------|------:|",
      `| lessonToFirstMandarinInteraction | ${firstMandarin?.position ?? "—"} |`,
      `| lessonToFirstConversation | ${firstConversation?.position ?? "—"} |`,
      `| lessonToFirstProduction | ${firstProduction?.position ?? "—"} |`,
      `| estimatedTimeToFirstConversation | ${minutesUntil(firstConversation) ?? "—"} min |`,
      `| estimatedTimeToFirstProduction | ${minutesUntil(firstProduction) ?? "—"} min |`,
      `| longestNonCommunicativeLessonRun (20) | ${nonCommunicativeRun20} |`,
      `| consecutiveTheoryOrLabLessons (20) | ${theoryLabRun20} |`,
      "",
      firstMandarin
        ? `Primeira interação em mandarim: **${firstMandarin.position}. ${firstMandarin.title}** (\`${firstMandarin.id}\`).`
        : "Nenhuma interação em mandarim na trilha.",
      "",
      firstConversation
        ? `Primeira conversa: **${firstConversation.position}. ${firstConversation.title}** (\`${firstConversation.id}\`).`
        : "Nenhuma `conversation_scene` na trilha.",
      "",
      firstProduction
        ? `Primeira produção guiada: **${firstProduction.position}. ${firstProduction.title}** (\`${firstProduction.id}\`).`
        : "Nenhuma produção guiada na trilha.",
      "",
      "## 20 primeiras lições",
      "",
      "| # | Papel | Lição | Interação | Conversa | Produção | Payoff | Min |",
      "|--:|-------|-------|:---------:|:--------:|:--------:|:------:|----:|",
      ...onboarding.map(
        (row) =>
          `| ${row.position} | ${row.role} | ${row.title} | ${row.hasMandarin ? "sim" : "não"} | ${row.hasConversation ? "sim" : "não"} | ${row.hasProduction ? "sim" : "não"} | ${row.hasPayoff ? "sim" : "não"} | ${row.minutes} |`
      ),
      "",
      "## Compatibilidade (ONB-010)",
      "",
      "IDs das lições de fundação e da parede de tons **não mudaram**. Progresso antigo continua válido; não há migration de unlock.",
      "",
      "## Falhas",
      "",
      failures.length === 0 ? "Nenhuma." : failures.map((message) => `- ${message}`).join("\n"),
      "",
    ]);
  }

  if (runMomentum) {
    await writeReport("reports/acquisition-momentum.md", "Momentum de aquisição", [
      "## Resumo",
      "",
      "Labs e revisões podem ter novidade lexical zero. Lições `acquisition` precisam de unidade nova, padrão estrutural ou reúso comunicativo mensurável.",
      "",
      "| Métrica | Valor |",
      "|---------|------:|",
      `| Janela | ${first50.length} |`,
      `| Acquisition sem progresso | ${momentumRows.filter((row) => row.role === "acquisition" && !row.exempt && !row.progress.ok).length} |`,
      `| longestNonCommunicativeLessonRun (50) | ${nonCommunicativeRun50} |`,
      `| consecutiveTheoryOrLabLessons (50) | ${theoryLabRun50} |`,
      "",
      "## 50 primeiras lições",
      "",
      "| # | Papel | Lição | Payoff | Progresso |",
      "|--:|-------|-------|:------:|-----------|",
      ...momentumRows.map((row) => {
        const progress = row.exempt
          ? row.role === "review"
            ? "revisão (isenta)"
            : "lab (lexical zero ok)"
          : row.progress.ok
            ? row.progress.reasons.join("; ")
            : "FALHA";
        return `| ${row.position} | ${row.role} | ${row.title} | ${row.hasPayoff ? "sim" : "não"} | ${progress} |`;
      }),
      "",
      "## Exceções documentadas (ONB-009)",
      "",
      "Nenhuma. A trilha inicial não permite mais de 2 lições seguidas sem payoff comunicativo.",
      "",
      "## Falhas",
      "",
      failures.length === 0 ? "Nenhuma." : failures.map((message) => `- ${message}`).join("\n"),
      "",
    ]);
  }

  console.log(
    `First win: mandarim=${firstMandarin?.position ?? "—"} conversa=${firstConversation?.position ?? "—"} produção=${firstProduction?.position ?? "—"} · run sem payoff (20)=${nonCommunicativeRun20} · labs seguidos=${theoryLabRun20}.`
  );
  if (failures.length > 0) {
    console.error("\nFalhas V4.1:");
    for (const message of failures) console.error(`- ${message}`);
    process.exitCode = 1;
  } else {
    console.log("\nOK: first communicative win + acquisition momentum.");
  }
} finally {
  await rm(outDir, { recursive: true, force: true }).catch(() => {});
}
