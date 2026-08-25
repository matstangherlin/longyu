/**
 * V4.1.1 — First Communicative Win + Acquisition Momentum
 *
 *   --gate=win         validate:first-communicative-win
 *   --gate=momentum    validate:acquisition-momentum
 *   (sem flag)         os dois
 *
 * Mede o PLANO REAL de um aluno novo (tentativa 0, sem histórico).
 * Chinês canónico ≠ distrator. produce-com-banco = assembly; independente = free_production.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";
import {
  assertPedagogicalCjkContract,
  classifyDistractor,
  extractCanonicalCjk,
  extractDistractorCjk,
  isAssistedAssembly,
  isGuidedRecall,
  isIndependentProduction,
  isPerceptionDominant,
  isTransferProduction,
  isUsablePhrase,
  looksLikeOddChinese,
  USABLE_PHRASES,
} from "./lib/pedagogical-cjk.mjs";

assertPedagogicalCjkContract();

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const gateArg = process.argv.find((arg) => arg.startsWith("--gate="))?.slice("--gate=".length);
const runWin = !gateArg || gateArg === "win";
const runMomentum = !gateArg || gateArg === "momentum";

const THEORY_LAB_ROLES = new Set(["perception_lab", "hanzi_lab"]);
const ACQUISITION_EXEMPT_ROLES = new Set(["perception_lab", "hanzi_lab", "review"]);
const TONE_WALL_LAB_IDS = new Set([
  "p2-ma-primeiro-tom",
  "p2-ma-segundo-tom",
  "p2-ma-terceiro-tom",
  "p2-ma-quarto-tom",
  "p2-comparar-tom-1-4",
  "p2-comparar-tom-2-3",
]);

const MAX_FIRST_CONVERSATION = 2;
const MAX_FIRST_ASSEMBLY = 4;
const MAX_FIRST_MANDARIN = 2;
const MAX_NON_COMMUNICATIVE_RUN = 2;
const MAX_THEORY_LAB_RUN = 5;
const FIRST_WINDOW = 10;
const ONBOARDING = 20;
const MOMENTUM_WINDOW = 50;

const failures = [];
const fail = (message) => failures.push(message);

function isMandarinInteraction(step) {
  if (step.kind === "conversation_scene") return true;
  if (["listen_select", "listen", "comprehend", "sentence_build", "produce", "fill_blank"].includes(step.kind)) {
    return extractCanonicalCjk(step).some((run) => run.length >= 2 || USABLE_PHRASES.has(run));
  }
  if (step.kind === "dialogue_choice") return isUsablePhrase(step.correctAnswer ?? step.answer ?? "");
  return false;
}

function isCommunicativePayoff(step) {
  if (step.kind === "conversation_scene") return true;
  if (isIndependentProduction(step) || isTransferProduction(step)) return true;
  const canonical = extractCanonicalCjk(step).join(" ");
  const usesKnownPhrase = [...USABLE_PHRASES].some((phrase) => canonical.includes(phrase));
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
  for (const step of plan) for (const run of extractCanonicalCjk(step)) units.add(run);
  const newUnits = [...units].filter(
    (unit) => !previousUnits.has(unit) && (unit.length >= 2 || USABLE_PHRASES.has(unit))
  );
  const oddUnits = newUnits.filter(looksLikeOddChinese);
  const hasConversation = plan.some(isConversation);
  const hasStructure = plan.some((step) =>
    ["structural_frame", "structural_repair", "structural_transfer", "transfer_task"].includes(step.kind)
  );
  const perceptionHeavy = isPerceptionDominant(plan);
  const ok =
    newUnits.length > 0 ||
    hasStructure ||
    plan.some(isIndependentProduction) ||
    (hasConversation && !perceptionHeavy);
  return {
    newUnits,
    oddUnits,
    ok,
    reasons: [
      newUnits.length > 0 ? `unidades novas: ${newUnits.join("、")}` : null,
      hasConversation && !perceptionHeavy ? "conversation_scene" : null,
      plan.some(isIndependentProduction) ? "produção independente" : null,
      hasStructure ? "padrão estrutural" : null,
      perceptionHeavy ? "função dominante: laboratório de percepção" : null,
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
  const { lessonRoundStepsFor, estimateLessonMinutes, estimatePassMinutesFromPlan } = load(
    "src/features/lesson/lessonTasks.js"
  );
  const { isTopicMasteryLesson } = load("src/data/topicMastery.js");

  const rows = ALL_LESSONS.map((lesson, index) => {
    const plan = lessonRoundStepsFor(lesson, { attemptNumber: 0, silent: true });
    const distractors = plan.flatMap((step) =>
      extractDistractorCjk(step).map((run) => ({
        run,
        lessonId: lesson.id,
        kind: step.kind,
        class: classifyDistractor(run),
      }))
    );
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
      hasAssembly: plan.some(isAssistedAssembly),
      hasRecall: plan.some(isGuidedRecall),
      hasIndependent: plan.some(isIndependentProduction),
      hasTransfer: plan.some(isTransferProduction),
      hasPayoff: plan.some(isCommunicativePayoff),
      perceptionDominant: isPerceptionDominant(plan),
      cjk: [...new Set(plan.flatMap(extractCanonicalCjk))],
      distractors,
    };
  });

  const first = (predicate) => rows.find((row) => predicate(row));
  const firstMandarin = first((row) => row.hasMandarin);
  const firstConversation = first((row) => row.hasConversation);
  const firstAssembly = first((row) => row.hasAssembly);
  const firstRecall = first((row) => row.hasRecall);
  const firstIndependent = first((row) => row.hasIndependent);
  const firstTransfer = first((row) => row.hasTransfer);
  const minutesUntil = (row) =>
    row ? rows.slice(0, row.position).reduce((sum, item) => sum + item.minutes, 0) : null;

  const sessionRows = [];
  let sessionElapsed = 0;
  let sessionOrdinal = 0;
  for (const lesson of ALL_LESSONS) {
    const topicNode = isTopicMasteryLesson(lesson);
    const passes = topicNode ? [1, 2, 3, 4] : [1];
    for (const pass of passes) {
      sessionOrdinal += 1;
      const plan = lessonRoundStepsFor(lesson, {
        masteryLevel: topicNode ? pass - 1 : undefined,
        masteryPass: topicNode ? pass : undefined,
        silent: true,
        attemptNumber: 0,
      });
      const minutes = estimatePassMinutesFromPlan(plan);
      sessionRows.push({
        ordinal: sessionOrdinal,
        id: lesson.id,
        title: lesson.title,
        pass,
        plan,
        minutes,
        elapsedBefore: sessionElapsed,
        hasMandarin: plan.some(isMandarinInteraction),
        hasConversation: plan.some(isConversation),
        hasIndependent: plan.some(isIndependentProduction),
        hasTransfer:
          plan.some(isTransferProduction) ||
          (pass === 4 && plan.some((step) => step.kind === "conversation_scene" || step.kind === "contextual_choice")),
      });
      sessionElapsed += minutes;
    }
  }
  const firstSession = (predicate) => sessionRows.find((row) => predicate(row));
  const sessionFirstMandarin = firstSession((row) => row.hasMandarin);
  const sessionFirstConversation = firstSession((row) => row.hasConversation);
  const sessionFirstIndependent = firstSession((row) => row.hasIndependent);
  const sessionFirstTransfer = firstSession((row) => row.hasTransfer);

  const onboarding = rows.slice(0, ONBOARDING);
  const first10 = rows.slice(0, FIRST_WINDOW);
  const first50 = rows.slice(0, MOMENTUM_WINDOW);

  // Labs de percepção/hànzì não entram nesta corrida: a função deles é o
  // laboratório, medida à parte em consecutiveTheoryOrLabLessons. Pintar um
  // lab com uma microconversa só para quebrar a corrida era a falha da V4.1.
  const nonCommunicativeRun20 = longestRun(
    onboarding.map((row) => !row.hasPayoff && !THEORY_LAB_ROLES.has(row.role))
  );
  const nonCommunicativeRun50 = longestRun(
    first50.map((row) => !row.hasPayoff && !THEORY_LAB_ROLES.has(row.role))
  );
  const theoryLabRun20 = longestRun(onboarding.map((row) => THEORY_LAB_ROLES.has(row.role)));
  const theoryLabRun50 = longestRun(first50.map((row) => THEORY_LAB_ROLES.has(row.role)));

  if (runWin) {
    if (!firstMandarin || firstMandarin.position > MAX_FIRST_MANDARIN) {
      fail(`lessonToFirstMandarinInteraction=${firstMandarin?.position ?? "nunca"} (teto ${MAX_FIRST_MANDARIN})`);
    }
    if (!firstConversation || firstConversation.position > MAX_FIRST_CONVERSATION) {
      fail(`lessonToFirstConversation=${firstConversation?.position ?? "nunca"} (teto ${MAX_FIRST_CONVERSATION})`);
    }
    if (!firstAssembly || firstAssembly.position > MAX_FIRST_ASSEMBLY) {
      fail(`lessonToFirstAssistedAssembly=${firstAssembly?.position ?? "nunca"} (teto ${MAX_FIRST_ASSEMBLY})`);
    }
    if (nonCommunicativeRun20 > MAX_NON_COMMUNICATIVE_RUN) {
      fail(`longestNonCommunicativeLessonRun nas 20 primeiras = ${nonCommunicativeRun20} (teto ${MAX_NON_COMMUNICATIVE_RUN})`);
    }
    if (theoryLabRun20 > MAX_THEORY_LAB_RUN) {
      fail(`consecutiveTheoryOrLabLessons nas 20 primeiras = ${theoryLabRun20} (teto ${MAX_THEORY_LAB_RUN})`);
    }
    for (const row of first10) {
      // Labs de hànzì/percepção não precisam de payoff comunicativo: a função
      // dominante é o laboratório. O win comunicativo já está nas lições 1–2.
      if (THEORY_LAB_ROLES.has(row.role)) continue;
      if (!row.hasPayoff) fail(`lição ${row.position} (${row.id}) nas 10 primeiras termina sem aplicação em mandarim`);
    }
    if (!sessionFirstMandarin || sessionFirstMandarin.ordinal !== 1) {
      fail(`sessionToFirstMandarinInteraction=${sessionFirstMandarin?.ordinal ?? "nunca"} (precisa ser a sessão 1)`);
    }
    if (!sessionFirstConversation || sessionFirstConversation.elapsedBefore > 10) {
      fail(
        `sessionMinutesToFirstConversation=${sessionFirstConversation?.elapsedBefore.toFixed(1) ?? "nunca"} (teto 10 min)`
      );
    }
    if (!sessionFirstIndependent || sessionFirstIndependent.elapsedBefore > 30) {
      fail(
        `sessionMinutesToFirstIndependentProduction=${sessionFirstIndependent?.elapsedBefore.toFixed(1) ?? "nunca"} (teto 30 min)`
      );
    }
    if (!sessionFirstTransfer || sessionFirstTransfer.elapsedBefore > 60) {
      fail(
        `sessionMinutesToFirstTransfer=${sessionFirstTransfer?.elapsedBefore.toFixed(1) ?? "nunca"} (teto 60 min)`
      );
    }
  }

  const previousUnits = new Set();
  const momentumRows = [];
  for (const row of first50) {
    const progress = acquisitionProgress(row.plan, previousUnits);
    for (const unit of row.cjk) previousUnits.add(unit);
    const toneLab = TONE_WALL_LAB_IDS.has(row.id);
    const exempt = ACQUISITION_EXEMPT_ROLES.has(row.role) || row.isReview || toneLab || row.perceptionDominant;
    momentumRows.push({ ...row, progress, exempt });
    if (runMomentum && row.role === "acquisition" && !exempt && !progress.ok) {
      fail(`acquisition ${row.position} (${row.id}) sem unidade canónica nova, padrão estrutural ou conversa`);
    }
    if (runMomentum && progress.oddUnits.length > 0 && row.role === "acquisition") {
      fail(`acquisition ${row.position} (${row.id}) contabilizou chinês suspeito como unidade nova: ${progress.oddUnits.join("、")}`);
    }
    if (runMomentum && toneLab && row.role === "acquisition") {
      fail(`${row.id} é laboratório de tom com papel 'acquisition' — declare perception_lab (função dominante)`);
    }
    const authored = ALL_LESSONS.find((lesson) => lesson.id === row.id);
    const authoredPerception = (authored?.steps ?? []).filter((step) =>
      ["tone", "tone_pair", "audio_discrimination"].includes(step.kind)
    ).length;
    const conceptIntro = String(row.id).includes("o-que-e-");
    if (
      runMomentum &&
      !conceptIntro &&
      authored?.skill === "som" &&
      row.role === "acquisition" &&
      authoredPerception >= 3
    ) {
      fail(
        `${row.id} é lab fonético (${authoredPerception} drills de tom no autoral) com papel 'acquisition'`
      );
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

  const allDistractors = rows.flatMap((row) => row.distractors);
  const oddDistractors = allDistractors.filter(
    (item) => item.class !== "distrator" || looksLikeOddChinese(item.run)
  );

  if (runWin) {
    await writeReport("reports/first-communicative-win.md", "Primeira vitória comunicativa", [
      "## Resumo",
      "",
      "Produção **não** é um único interruptor. Montar `你 + 好` com peças à vista é assembly assistida, não recall nem produção independente.",
      "",
      "| Métrica | Valor |",
      "|---------|------:|",
      `| lessonToFirstMandarinInteraction | ${firstMandarin?.position ?? "—"} |`,
      `| lessonToFirstConversation | ${firstConversation?.position ?? "—"} |`,
      `| lessonToFirstAssistedAssembly | ${firstAssembly?.position ?? "—"} |`,
      `| lessonToFirstGuidedRecall | ${firstRecall?.position ?? "—"} |`,
      `| lessonToFirstIndependentProduction | ${firstIndependent?.position ?? "—"} |`,
      `| lessonToFirstTransfer | ${firstTransfer?.position ?? "—"} |`,
      `| estimatedTimeToFirstConversation | ${minutesUntil(firstConversation) ?? "—"} min |`,
      `| estimatedTimeToFirstAssistedAssembly | ${minutesUntil(firstAssembly) ?? "—"} min |`,
      `| longestNonCommunicativeLessonRun (20) | ${nonCommunicativeRun20} |`,
      `| consecutiveTheoryOrLabLessons (20) | ${theoryLabRun20} |`,
      `| sessionToFirstMandarinInteraction | ${sessionFirstMandarin?.ordinal ?? "—"} |`,
      `| sessionMinutesToFirstConversation | ${sessionFirstConversation?.elapsedBefore.toFixed(1) ?? "—"} |`,
      `| sessionMinutesToFirstIndependentProduction | ${sessionFirstIndependent?.elapsedBefore.toFixed(1) ?? "—"} |`,
      `| sessionMinutesToFirstTransfer | ${sessionFirstTransfer?.elapsedBefore.toFixed(1) ?? "—"} |`,
      "",
      "V4.6: `lessonTo*` continua medindo o plano-base por índice de lição (compatibilidade).",
      "`session*` mede cada pass M1–M4 do aluno novo — a unidade que o anel 4/4 realmente cobra.",
      "",
      firstMandarin
        ? `Primeira interação em mandarim: **${firstMandarin.position}. ${firstMandarin.title}** (\`${firstMandarin.id}\`).`
        : "Nenhuma interação em mandarim na trilha.",
      "",
      firstConversation
        ? `Primeira conversa: **${firstConversation.position}. ${firstConversation.title}** (\`${firstConversation.id}\`).`
        : "Nenhuma `conversation_scene` na trilha.",
      "",
      firstAssembly
        ? `Primeira montagem assistida (\`sentence_build\` / \`produce\` com banco): **${firstAssembly.position}. ${firstAssembly.title}** (\`${firstAssembly.id}\`).`
        : "Nenhuma montagem assistida na trilha.",
      "",
      firstRecall
        ? `Primeiro recall guiado: **${firstRecall.position}. ${firstRecall.title}** (\`${firstRecall.id}\`).`
        : "Nenhum recall guiado na trilha inicial medida.",
      "",
      firstIndependent
        ? `Primeira produção independente (\`free_production\`): **${firstIndependent.position}. ${firstIndependent.title}** (\`${firstIndependent.id}\`).`
        : "Nenhuma produção independente na trilha inicial medida.",
      "",
      "## 20 primeiras lições",
      "",
      "| # | Papel | Lição | Interação | Conversa | Assembly | Recall | Independente | Payoff | Min |",
      "|--:|-------|-------|:---------:|:--------:|:--------:|:------:|:------------:|:------:|----:|",
      ...onboarding.map(
        (row) =>
          `| ${row.position} | ${row.role} | ${row.title} | ${row.hasMandarin ? "sim" : "não"} | ${row.hasConversation ? "sim" : "não"} | ${row.hasAssembly ? "sim" : "não"} | ${row.hasRecall ? "sim" : "não"} | ${row.hasIndependent ? "sim" : "não"} | ${row.hasPayoff ? "sim" : "não"} | ${row.minutes} |`
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
      "Unidades novas vêm só de chinês **canónico** (estímulo, alvo, resposta correta). Distratores e frases propositalmente erradas não contam como vocabulário ensinado.",
      "",
      "Labs e revisões podem ter novidade lexical zero. Lições `acquisition` precisam de unidade canónica nova, padrão estrutural, produção independente ou conversa — e **não** podem ser laboratórios de tom pintados de aquisição.",
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
      "## Distratores chineses (não ensinam)",
      "",
      "Frases que aparecem em opções erradas / banco. Não entram no progresso de aquisição.",
      "",
      oddDistractors.length === 0
        ? "Nenhum distrator chinês listado nas 50 primeiras."
        : [
            "| Lição | Tipo | Classe | Texto |",
            "|-------|------|--------|-------|",
            ...oddDistractors.slice(0, 40).map((item) => `| ${item.lessonId} | ${item.kind} | ${item.class} | ${item.run} |`),
          ].join("\n"),
      "",
      "## Auditoria das frases suspeitas",
      "",
      "| Texto | Classe | Onde aparece |",
      "|-------|--------|--------------|",
      ...["我是好", "我是叫小明", "我会中文说", "我是水", "我有一朋友", "语吗", "西人", "你好你是哪国人我是巴西人"].map((phrase) => {
        const compact = (value) => String(value ?? "").replace(/[。！？、,.!?\s]/g, "");
        const target = compact(phrase);
        const first50Ids = new Set(first50.map((row) => row.id));
        // Match exacto. `includes` faz 巴西人 contar como 西人.
        const hits = allDistractors.filter(
          (item) => first50Ids.has(item.lessonId) && compact(item.run) === target
        );
        const cls = classifyDistractor(phrase);
        const where = hits.length
          ? [...new Set(hits.map((hit) => hit.lessonId))].join(", ")
          : "não aparece no plano das 50 primeiras";
        return `| ${phrase} | ${cls} | ${where} |`;
      }),
      "",
      "## Exceções documentadas (ONB-009)",
      "",
      "A parede de tons (ma 1–4 e os dois pares) conta como laboratório de percepção, mesmo quando reusa 你好/谢谢. A trilha inicial não permite mais de 2 lições seguidas sem payoff comunicativo fora desses labs.",
      "",
      "## Falhas",
      "",
      failures.length === 0 ? "Nenhuma." : failures.map((message) => `- ${message}`).join("\n"),
      "",
    ]);
  }

  console.log(
    `First win: mandarim=${firstMandarin?.position ?? "—"} conversa=${firstConversation?.position ?? "—"} assembly=${firstAssembly?.position ?? "—"} independente=${firstIndependent?.position ?? "—"} · run sem payoff (20)=${nonCommunicativeRun20} · labs seguidos=${theoryLabRun20}.`
  );
  if (failures.length > 0) {
    console.error("\nFalhas V4.1.1:");
    for (const message of failures) console.error(`- ${message}`);
    process.exitCode = 1;
  } else {
    console.log("\nOK: first communicative win + acquisition momentum.");
  }
} finally {
  await rm(outDir, { recursive: true, force: true }).catch(() => {});
}
