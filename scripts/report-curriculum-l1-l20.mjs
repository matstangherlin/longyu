/**
 * report:curriculum-l1-l20 — PED-024 audit of the first 20 lessons.
 * Writes docs/reports/curriculum-l1-l20.md and docs/reports/lexical-seed-before-after.md
 */

import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const EARLY_COUNT = 20;
const BASE_COMMIT = "803e4b3";

async function compileTree(workRoot, outDir) {
  const program = ts.createProgram(
    [
      path.join(workRoot, "src/data/lexicalProgression.ts"),
      path.join(workRoot, "src/features/lesson/lessonTasks.ts"),
      path.join(workRoot, "src/data/journey.ts"),
      path.join(workRoot, "src/data/chunks.ts"),
      path.join(workRoot, "src/data/characters.ts"),
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: workRoot,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("compile failed");
  return (rel) => require(path.join(outDir, rel));
}

function analyze(load) {
  const { metricsForLesson, SEED_GREETING_TOKENS, tokenCounts } = load(
    "src/data/lexicalProgression.js"
  );
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { ALL_LESSONS } = load("src/data/journey.js");
  const early = ALL_LESSONS.slice(0, EARLY_COUNT);
  const priorTokens = new Set();
  const lessons = [];
  const seedTotals = Object.fromEntries(SEED_GREETING_TOKENS.map((s) => [s, 0]));

  for (const lesson of early) {
    const planned = lessonRoundStepsFor(lesson, { silent: true });
    const metrics = metricsForLesson(lesson, planned, priorTokens);
    const counts = tokenCounts(metrics.tokens);
    for (const seed of SEED_GREETING_TOKENS) {
      seedTotals[seed] += counts.get(seed) ?? 0;
    }
    const introduced = [...new Set(metrics.tokens.filter((t) => !priorTokens.has(t)))];
    const recovered = metrics.tokens.filter((t) => priorTokens.has(t));
    const recoveredUnique = [...new Set(recovered)];
    lessons.push({
      lesson,
      planned,
      metrics,
      introduced,
      recoveredUnique,
      seedCounts: Object.fromEntries(
        SEED_GREETING_TOKENS.map((s) => [s, counts.get(s) ?? 0])
      ),
    });
    for (const token of metrics.tokens) priorTokens.add(token);
  }
  return { lessons, seedTotals, SEED_GREETING_TOKENS };
}

async function analyzeCurrent() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-curr-"));
  try {
    const load = await compileTree(rootDir, outDir);
    return analyze(load);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

async function analyzeBefore() {
  const work = await mkdtemp(path.join(os.tmpdir(), "longyu-before-work-"));
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-before-out-"));
  try {
    execSync(`cp -a src "${work}/src"`);
    const beforeJourney = execSync(`git show ${BASE_COMMIT}:src/data/journey.ts`, {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    const beforeTasks = execSync(`git show ${BASE_COMMIT}:src/features/lesson/lessonTasks.ts`, {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    await writeFile(path.join(work, "src/data/journey.ts"), beforeJourney);
    await writeFile(path.join(work, "src/features/lesson/lessonTasks.ts"), beforeTasks);
    // Keep current lexicalProgression so before×after use the same opportunity definition.
    const currentLex = await readFile(path.join(rootDir, "src/data/lexicalProgression.ts"), "utf8");
    await writeFile(path.join(work, "src/data/lexicalProgression.ts"), currentLex);
    const load = await compileTree(work, outDir);
    return analyze(load);
  } finally {
    await rm(work, { recursive: true, force: true });
    await rm(outDir, { recursive: true, force: true });
  }
}

function objectiveOf(lesson) {
  const intro = (lesson.steps ?? []).find((s) => s.kind === "intro");
  if (intro?.body) return String(intro.body).slice(0, 160);
  if (intro?.title) return String(intro.title);
  return lesson.title ?? lesson.id;
}

function structureHint(lesson, metrics) {
  const grammar = (lesson.focusGrammar ?? []).join("; ");
  if (grammar) return grammar;
  if (metrics.noveltyAxes.structural > 0) return "estrutura/prática comunicativa no plano";
  return "—";
}

function situationHint(lesson) {
  // Flat lessons may not carry unit focusSituations; infer from skill/title.
  if (lesson.skill === "som") return "discriminação / produção de tom";
  if (lesson.skill === "hanzi") return "reconhecimento e montagem de hànzì";
  if (lesson.isReview) return "revisão do módulo";
  if (/conversa|cortesia|cumpriment|logo|lab/i.test(lesson.id + lesson.title)) {
    return "interação social (cumprimento / cortesia)";
  }
  return "fundação do sistema";
}

async function main() {
  const after = await analyzeCurrent();
  const before = await analyzeBefore();

  const curriculumLines = [
    "# Curriculum audit — L1–L20 (PED-024)",
    "",
    `_Gerado por \`scripts/report-curriculum-l1-l20.mjs\` · ${new Date().toISOString().slice(0, 10)}_`,
    "",
    "Auditoria das primeiras 20 lições do plano real (`lessonRoundStepsFor`).",
    "Métricas lexicais = **oportunidades pedagógicas** (PED-022/025), não distractores de UI.",
    "",
    "## Resumo",
    "",
    `| # | Lição | Objetivo (curto) | Novo | Recuperado | Estrutura | Situação | Top 3 |`,
    `|---|-------|------------------|-----:|-----------:|-----------|----------|-------|`,
  ];

  after.lessons.forEach((row, index) => {
    const { lesson, metrics, introduced, recoveredUnique } = row;
    const top3 = (metrics.topRepeated ?? [])
      .map((t) => `${t.token}×${t.count}`)
      .join(", ");
    curriculumLines.push(
      `| ${index + 1} | \`${lesson.id}\` | ${objectiveOf(lesson).replace(/\|/g, "/")} | ${introduced.length} | ${recoveredUnique.length} | ${structureHint(lesson, metrics).replace(/\|/g, "/")} | ${situationHint(lesson)} | ${top3 || "—"} |`
    );
  });

  curriculumLines.push("", "## Por lição (detalhe)", "");

  after.lessons.forEach((row, index) => {
    const { lesson, metrics, introduced, recoveredUnique, planned } = row;
    curriculumLines.push(`### ${index + 1}. \`${lesson.id}\` — ${lesson.title ?? ""}`);
    curriculumLines.push("");
    curriculumLines.push(`- **Review:** ${lesson.isReview ? "sim" : "não"}`);
    curriculumLines.push(`- **Objetivo:** ${objectiveOf(lesson)}`);
    curriculumLines.push(
      `- **Vocabulário introduzido (tokens novos no curso até aqui):** ${introduced.slice(0, 12).join(" · ") || "—"}`
    );
    curriculumLines.push(
      `- **Vocabulário recuperado (já visto):** ${recoveredUnique.slice(0, 12).join(" · ") || "—"}`
    );
    curriculumLines.push(`- **Estrutura / foco:** ${structureHint(lesson, metrics)}`);
    curriculumLines.push(`- **Situação comunicativa:** ${situationHint(lesson)}`);
    curriculumLines.push(
      `- **Novidade (PED-025):** lexical=${metrics.noveltyAxes.lexical}, estrutural=${metrics.noveltyAxes.structural}, modalidade=${metrics.noveltyAxes.modality}, recuperação=${metrics.noveltyAxes.recovery}`
    );
    curriculumLines.push(
      `- **SRS / revisão no plano:** steps gerados com recuperação=${metrics.noveltyAxes.recovery}; reviewItems=${(lesson.reviewItems ?? []).join(", ") || "—"}`
    );
    curriculumLines.push(
      `- **Top 3 repetidos:** ${(metrics.topRepeated ?? []).map((t) => `${t.token} (${t.count})`).join(" · ") || "—"}`
    );
    curriculumLines.push(`- **Passos no plano:** ${planned.length}`);
    curriculumLines.push("");
  });

  const beforeAfterLines = [
    "# Seed greetings — before × after (PED-021)",
    "",
    `_Mesma definição de oportunidade pedagógica · baseline conteúdo \`${BASE_COMMIT}\` (#165) × branch atual_`,
    "",
    "Contagem: estímulo/resposta/montagem/falas primárias, dedupe por passo;",
    "sem distractores de MCQ; sem stamps de vocabulário do planner;",
    "你好吗 não conta como 你好.",
    "",
    "## Totais L1–L20",
    "",
    `| Seed | Antes | Depois | Δ |`,
    `|------|------:|-------:|--:|`,
  ];

  for (const seed of after.SEED_GREETING_TOKENS) {
    const a = before.seedTotals[seed] ?? 0;
    const b = after.seedTotals[seed] ?? 0;
    beforeAfterLines.push(`| ${seed} | ${a} | ${b} | ${b - a} |`);
  }

  beforeAfterLines.push(
    "",
    "## Destaque (critério de aceite)",
    "",
    `- **你好** antes: **${before.seedTotals["你好"]}** oportunidades`,
    `- **你好** depois: **${after.seedTotals["你好"]}**`,
    `- **谢谢** antes: **${before.seedTotals["谢谢"]}** · depois: **${after.seedTotals["谢谢"]}**`,
    `- **再见** antes: **${before.seedTotals["再见"]}** · depois: **${after.seedTotals["再见"]}**`,
    `- **不客气** antes: **${before.seedTotals["不客气"]}** · depois: **${after.seedTotals["不客气"]}**`,
    "",
    "## Por lição (你好)",
    "",
    `| Lição | Antes | Depois |`,
    `|-------|------:|-------:|`,
  );

  for (let i = 0; i < EARLY_COUNT; i += 1) {
    const id = after.lessons[i]?.lesson.id ?? before.lessons[i]?.lesson.id;
    const a = before.lessons[i]?.seedCounts?.["你好"] ?? 0;
    const b = after.lessons[i]?.seedCounts?.["你好"] ?? 0;
    beforeAfterLines.push(`| \`${id}\` | ${a} | ${b} |`);
  }
  beforeAfterLines.push("");

  await mkdir(path.join(rootDir, "docs/reports"), { recursive: true });
  await writeFile(
    path.join(rootDir, "docs/reports/curriculum-l1-l20.md"),
    curriculumLines.join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(rootDir, "docs/reports/lexical-seed-before-after.md"),
    beforeAfterLines.join("\n"),
    "utf8"
  );
  console.log("Wrote docs/reports/curriculum-l1-l20.md");
  console.log("Wrote docs/reports/lexical-seed-before-after.md");
  console.log("Seeds after:", after.seedTotals);
  console.log("Seeds before:", before.seedTotals);
}

await main();
