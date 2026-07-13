/**
 * validate:exercise-depth
 *
 * Audita profundidade pedagógica das lições: detecta exercícios superficiais,
 * repetitivos ou sem aplicação em contexto.
 *
 * Gera reports/exercise-depth-report.md
 *
 * Por enquanto só emite warnings no beta (não falha por score baixo).
 * Futuro: falhar se lição principal < 55 ou revisão de módulo < 70.
 */

import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/exercise-depth-report.md");

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const PUNCT_RE = /[\u3000-\u303f\uff00-\uffef,.!?\s:;"'()？！。，、]/g;

const CONTEXT_KINDS = new Set([
  "dialogue_choice",
  "conversation_scene",
  "write",
  "fill_blank",
  "produce",
  "sentence_build",
  "translation_build",
  "match_pairs",
  "microread",
]);
const SENTENCE_KINDS = new Set(["sentence_build", "translation_build", "conversation_scene", "produce"]);
const USAGE_KINDS = new Set([
  "dialogue_choice",
  "conversation_scene",
  "write",
  "produce",
  "fill_blank",
  "sentence_build",
  "translation_build",
]);
const MEANING_ONLY_KINDS = new Set(["comprehend", "recognize", "flashcard", "tone", "tone_pair"]);
const LISTEN_KINDS = new Set(["listen", "listen_select"]);
const VISUAL_KINDS = new Set(["image_choice"]);
const CONVERSATION_KINDS = new Set(["conversation_scene"]);
const BUILDER_KINDS = new Set(["hanzi_build"]);

const OBJECT_HANZI = new Set(["木", "水", "火", "山", "日", "月", "人", "口", "大", "小"]);
const GREETING_CHUNKS = new Set(["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:xiexie", "chunk:zaijian"]);

function cleanHanzi(value) {
  return String(value ?? "").replace(PUNCT_RE, "").trim();
}

function cjkChars(value) {
  return [...cleanHanzi(value)].filter((ch) => CJK_RE.test(ch));
}

function normAnswer(value) {
  return cleanHanzi(value).toLocaleLowerCase("pt-BR");
}

function collectTextBlobs(step) {
  const blobs = [
    step.text,
    step.hanzi,
    step.audioText,
    step.correctAnswer,
    step.answer,
    step.prompt,
    step.promptPt,
    ...(step.options ?? []),
    ...(step.target ?? []),
    ...(step.targetParts ?? []),
    ...(step.bank ?? []),
    ...(step.lines ?? []).map((line) => line.hanzi),
    step.checkpoint?.correctAnswer,
    ...(step.checkpoint?.options ?? []),
  ];
  return blobs.filter((value) => String(value ?? "").trim());
}

function isRealSentenceStep(step) {
  if (SENTENCE_KINDS.has(step.kind)) {
    const text = step.correctAnswer ?? step.target?.join("") ?? step.checkpoint?.correctAnswer ?? "";
    return cjkChars(text).length >= 2;
  }
  if (step.kind === "dialogue_choice" || step.kind === "fill_blank") {
    const text = step.correctAnswer ?? step.answer ?? "";
    return cjkChars(text).length >= 2;
  }
  return false;
}

function unitTeachesObjects(unit) {
  const hanzi = [...(unit?.focusHanzi ?? []), ...(unit?.focusChunks ?? [])].join("");
  return [...OBJECT_HANZI].some((ch) => hanzi.includes(ch));
}

function unitHasPhrases(unit) {
  return (unit?.focusChunks?.length ?? 0) > 0;
}

function analyzeLesson(lesson, plan, unit) {
  const kinds = new Set();
  const answers = [];
  const hanziSet = new Set();
  const chunkRefs = new Set();
  let contextCount = 0;
  let sentenceCount = 0;
  let visualCount = 0;
  let conversationCount = 0;
  let listenCount = 0;
  let builderCount = 0;
  let usageCount = 0;
  let meaningOnlyCount = 0;
  let mixedOldNew = false;

  const libraryChunks = new Set(
    (lesson.libraryItems ?? [])
      .filter((ref) => String(ref).startsWith("chunk:"))
      .map((ref) => String(ref).replace("chunk:", ""))
  );
  const newItems = new Set(lesson.libraryItems ?? []);
  const reviewItems = new Set(lesson.reviewItems ?? []);

  for (const step of plan) {
    kinds.add(step.kind);
    if (CONTEXT_KINDS.has(step.kind)) contextCount += 1;
    if (isRealSentenceStep(step)) sentenceCount += 1;
    if (VISUAL_KINDS.has(step.kind)) visualCount += 1;
    if (CONVERSATION_KINDS.has(step.kind)) conversationCount += 1;
    if (LISTEN_KINDS.has(step.kind)) listenCount += 1;
    if (BUILDER_KINDS.has(step.kind)) builderCount += 1;
    if (USAGE_KINDS.has(step.kind)) usageCount += 1;
    if (MEANING_ONLY_KINDS.has(step.kind)) meaningOnlyCount += 1;

    for (const ref of step.learnedRefs ?? []) {
      if (ref.startsWith("chunk:")) chunkRefs.add(ref);
    }
    for (const ref of step.newRefs ?? []) {
      if (ref.startsWith("chunk:")) chunkRefs.add(ref);
    }

    const answer = step.correctAnswer ?? step.answer ?? step.checkpoint?.correctAnswer;
    if (answer) answers.push(normAnswer(answer));

    for (const blob of collectTextBlobs(step)) {
      for (const ch of cjkChars(blob)) hanziSet.add(ch);
    }

    if (step.reusesPreviousVocabulary?.length && step.introducesNewVocabulary?.length) {
      mixedOldNew = true;
    }
    if (reviewItems.size > 0 && newItems.size > 0) {
      const stepRefs = [...(step.learnedRefs ?? []), ...(step.newRefs ?? [])];
      const touchesOld = stepRefs.some((ref) => reviewItems.has(ref));
      const touchesNew = stepRefs.some((ref) => newItems.has(ref) && !reviewItems.has(ref));
      if (touchesOld && touchesNew) mixedOldNew = true;
    }
  }

  for (const ref of lesson.libraryItems ?? []) {
    if (ref.startsWith("chunk:")) chunkRefs.add(ref);
  }

  const answerCounts = new Map();
  for (const answer of answers) {
    if (!answer) continue;
    answerCounts.set(answer, (answerCounts.get(answer) ?? 0) + 1);
  }
  const repeatedAnswers = [...answerCounts.entries()].filter(([, count]) => count > 2);

  const kindCounts = new Map();
  for (const step of plan) {
    kindCounts.set(step.kind, (kindCounts.get(step.kind) ?? 0) + 1);
  }
  const dominantKind = [...kindCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const dominantHanzi =
    hanziSet.size > 0
      ? [...hanziSet].map((ch) => ({
          ch,
          count: plan.filter((step) => collectTextBlobs(step).some((blob) => blob.includes(ch))).length,
        }))
      : [];
  const overusedHanzi = dominantHanzi.filter((entry) => entry.count > Math.max(2, plan.length * 0.4));

  const problems = [];
  const suggestions = [];
  let score = 52;

  if (kinds.size < 3) {
    score -= 15;
    problems.push("menos de 3 tipos de exercício");
    suggestions.push("variar tipos (escuta, montagem, contexto ou conversa)");
  }

  if (repeatedAnswers.length > 0) {
    score -= 10 * repeatedAnswers.length;
    for (const [answer, count] of repeatedAnswers) {
      problems.push(`resposta "${answer || "(vazia)"}" repetida ${count} vezes`);
    }
    suggestions.push("diversificar opções e prompts de resposta");
  }

  if (overusedHanzi.length > 0) {
    score -= 8;
    problems.push(`hànzì muito repetido: ${overusedHanzi.map((e) => e.ch).join(", ")}`);
    suggestions.push("reutilizar vocabulário antigo em frases novas, não só reconhecimento");
  }

  if (dominantKind && dominantKind[1] > Math.max(3, plan.length * 0.5)) {
    score -= 6;
    problems.push(`muitos exercícios do mesmo tipo (${dominantKind[0]} × ${dominantKind[1]})`);
    suggestions.push(`alternar ${dominantKind[0]} com uso em frase ou diálogo`);
  }

  if (contextCount === 0 && plan.length >= 4) {
    score -= 12;
    problems.push("nenhum exercício de contexto");
    suggestions.push("adicionar dialogue_choice, fill_blank ou conversation_scene");
  }

  if (sentenceCount === 0 && plan.length >= 5 && !lesson.steps.every((s) => s.kind === "intro")) {
    score -= 10;
    problems.push("pouca aplicação em frase real");
    suggestions.push("incluir sentence_build, produce ou cena com frase completa");
  }

  const meaningRatio = plan.length > 0 ? meaningOnlyCount / plan.length : 0;
  if (meaningRatio > 0.55 && usageCount === 0) {
    score -= 15;
    problems.push("só pinyin/significado sem uso prático");
    suggestions.push("fechar com produce, diálogo ou escrita curta");
  }

  if (
    conversationCount === 0 &&
    unitHasPhrases(unit) &&
    plan.length >= 6 &&
    !lesson.id.includes("intro") &&
    lesson.skill === "fala"
  ) {
    score -= 8;
    problems.push("nenhuma conversa em módulo com frases");
    suggestions.push("adicionar conversation_scene (ex.: 你好 / 你好吗 / 我很好)");
  }

  if (visualCount === 0 && unitTeachesObjects(unit) && lesson.skill === "hanzi") {
    score -= 8;
    problems.push("módulo de objeto/coisa sem exercício visual");
    suggestions.push("adicionar image_choice com foto real do conceito");
  }

  if (conversationCount > 0) score += Math.min(16, conversationCount * 8);
  if (visualCount > 0) score += Math.min(12, visualCount * 6);
  if (builderCount > 0) score += Math.min(10, builderCount * 5);
  if (mixedOldNew) score += 8;
  if (listenCount > 0) score += Math.min(8, listenCount * 4);
  if (usageCount > 0) score += Math.min(10, usageCount * 3);
  if (lesson.isReview && kinds.size >= 4) score += 5;
  if (sentenceCount >= 2) score += 6;

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score < 55 && problems.length === 0) {
    problems.push("profundidade geral abaixo do ideal");
    suggestions.push("misturar reconhecimento com aplicação e revisão leve");
  }

  if (
    conversationCount === 0 &&
    [...GREETING_CHUNKS].some((ref) => (lesson.libraryItems ?? []).includes(ref) || chunkRefs.has(ref))
  ) {
    if (!suggestions.some((s) => s.includes("conversation_scene"))) {
      suggestions.push("adicionar conversation_scene com 你好 / 你好吗 / 我很好");
    }
  }

  return {
    lessonId: lesson.id,
    title: lesson.title,
    isReview: Boolean(lesson.isReview),
    skill: lesson.skill,
    unitId: lesson.unitId,
    phaseOrder: lesson.phaseOrder,
    depthScore: score,
    metrics: {
      stepCount: plan.length,
      kindCount: kinds.size,
      kinds: [...kinds],
      uniqueAnswers: new Set(answers.filter(Boolean)).size,
      uniqueHanzi: hanziSet.size,
      uniqueChunks: chunkRefs.size,
      sentenceCount,
      contextCount,
      visualCount,
      conversationCount,
      listenCount,
      builderCount,
      usageCount,
      repeatedAnswers: repeatedAnswers.length,
    },
    problems,
    suggestions: [...new Set(suggestions)],
  };
}

function formatReportRow(entry) {
  const problems =
    entry.problems.length > 0 ? entry.problems.map((p) => `- ${p}`).join("\n") : "- (nenhum crítico)";
  const suggestions =
    entry.suggestions.length > 0 ? entry.suggestions.map((s) => `- ${s}`).join("\n") : "- manter variedade atual";
  return `### ${entry.lessonId} — ${entry.title} (score ${entry.depthScore})

| Métrica | Valor |
|---------|------:|
| Passos no plano | ${entry.metrics.stepCount} |
| Tipos de exercício | ${entry.metrics.kindCount} |
| Respostas únicas | ${entry.metrics.uniqueAnswers} |
| Hànzì únicos | ${entry.metrics.uniqueHanzi} |
| Chunks únicos | ${entry.metrics.uniqueChunks} |
| Frases reais | ${entry.metrics.sentenceCount} |
| Contexto | ${entry.metrics.contextCount} |
| Visuais | ${entry.metrics.visualCount} |
| Conversas | ${entry.metrics.conversationCount} |

**Problemas:**
${problems}

**Sugestões:**
${suggestions}
`;
}

async function main() {
  const betaMode = process.argv.includes("--beta");
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-exercise-depth-"));
  const warnings = [];

  try {
    const program = ts.createProgram(
      [
        "src/features/lesson/lessonTasks.ts",
        "src/data/journey.ts",
        "src/data/chunks.ts",
        "src/data/characters.ts",
        "src/data/types.ts",
        "src/data/hanziBuilder.ts",
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
      }
    );
    const emit = program.emit();
    if (emit.emitSkipped) {
      console.error("validate:exercise-depth: falha ao compilar grafo TypeScript.");
      process.exit(1);
    }

    const tasks = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));
    const journey = require(path.join(outDir, "src/data/journey.js"));
    const { lessonRoundStepsFor } = tasks;
    const { ALL_LESSONS, JOURNEY } = journey;

    const unitById = new Map();
    for (const phase of JOURNEY) {
      for (const unit of phase.units ?? []) {
        unitById.set(unit.id, unit);
      }
    }

    const results = [];
    for (const lesson of ALL_LESSONS) {
      const plan = lessonRoundStepsFor(lesson, { silent: true });
      const unit = unitById.get(lesson.unitId);
      const entry = analyzeLesson(lesson, plan, unit);
      results.push(entry);

      const threshold = entry.isReview ? 70 : 55;
      if (entry.depthScore < threshold) {
        const msg = `${entry.lessonId} (${entry.title}): score ${entry.depthScore} < ${threshold}`;
        warnings.push(msg);
      }
    }

    results.sort((a, b) => a.depthScore - b.depthScore);

    const shallow = results.filter((r) => r.depthScore < 55);
    const reviewWeak = results.filter((r) => r.isReview && r.depthScore < 70);
    const avg = Math.round(results.reduce((sum, r) => sum + r.depthScore, 0) / Math.max(1, results.length));

    const lines = [
      "# Relatório de profundidade de exercícios",
      "",
      `Gerado em: ${new Date().toISOString()}`,
      "",
      "## Resumo",
      "",
      `| Indicador | Valor |`,
      `|-----------|------:|`,
      `| Lições analisadas | ${results.length} |`,
      `| Score médio | ${avg} |`,
      `| Lições com score < 55 | ${shallow.length} |`,
      `| Revisões de módulo < 70 | ${reviewWeak.length} |`,
      "",
      "## Lições mais superficiais",
      "",
      "| lessonId | title | depthScore | problemas |",
      "|----------|-------|----------:|-----------|",
    ];

    for (const entry of shallow.slice(0, 25)) {
      const prob = entry.problems.slice(0, 2).join("; ") || "profundidade baixa";
      lines.push(`| ${entry.lessonId} | ${entry.title} | ${entry.depthScore} | ${prob} |`);
    }

    lines.push("", "## Detalhes por lição (ordenado por score)", "");
    for (const entry of results) {
      lines.push(formatReportRow(entry));
    }

    lines.push(
      "",
      "---",
      "",
      "_Nota: validate:beta ainda não falha por score baixo — apenas warnings no console. Futuro: falhar se lição principal < 55 ou revisão < 70._",
      ""
    );

    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, lines.join("\n"), "utf8");

    console.log(`validate:exercise-depth OK — ${results.length} lições · score médio ${avg}`);
    console.log(`Relatório: ${reportPath}`);

    if (warnings.length > 0) {
      console.warn(`\n⚠ ${warnings.length} lição(ões) abaixo do limiar recomendado:`);
      for (const warning of warnings.slice(0, 40)) {
        console.warn(`  - ${warning}`);
      }
      if (warnings.length > 40) console.warn(`  ...mais ${warnings.length - 40}.`);
      if (!betaMode) {
        console.warn("\n(Auditoria informativa — não bloqueia o build por enquanto.)");
      }
    }

    if (betaMode && warnings.length > 0) {
      console.warn(`\nvalidate:beta: ${warnings.length} aviso(s) de profundidade (não bloqueante).`);
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

await main();
