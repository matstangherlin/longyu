/**
 * RC2.2.20 · V5A — report:lexical-recycling
 *
 * Vocabulário aprendido precisa VOLTAR: em outras frases e tarefas, na
 * Revisão, na Cultura e na Imersão. Este relatório audita as primeiras fases
 * (mesma análise de `report:lexical-progression`) e marca a palavra que
 * aparece numa lição e some por dezenas de aulas.
 *
 * Por lexema: 1ª, 2ª e 3ª exposição (índice da lição), 1ª exposição em
 * conversa, elegibilidade para Revisão (é item do SRS: vocabulário ou chunk),
 * exposição na Imersão e na Cultura. Não altera o SRS nem conteúdo: só mede.
 *
 * Saída: docs/reports/rc2-2-20-lexical-recycling.md + .json
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const mdPath = path.join(rootDir, "docs/reports/rc2-2-20-lexical-recycling.md");
const jsonPath = path.join(rootDir, "docs/reports/rc2-2-20-lexical-recycling.json");
/** Primeiras fases auditadas (lições da Jornada, na ordem do currículo). */
const EARLY_COUNT = 40;
/** "Some por dezenas de aulas": sem 2ª exposição em até este número de lições. */
export const ORPHAN_GAP = 10;

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-lexical-recycling-"));
try {
  const program = ts.createProgram(
    [
      "src/data/lexicalProgression.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/vocabulary.ts",
      "src/data/immersion.ts",
      "src/data/cultureLessons.ts",
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
      resolveJsonModule: true,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error("report:lexical-recycling: falha ao compilar.");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const { extractTokensFromStep, extractHanziTokensFromText, isSeedGreetingToken } = load("src/data/lexicalProgression.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { CHUNKS } = load("src/data/chunks.js");
  const { VOCABULARY } = load("src/data/vocabulary.js");
  const immersionModule = load("src/data/immersion.js");
  const cultureModule = load("src/data/cultureLessons.js");

  const srsSurfaces = new Set([...CHUNKS.map((c) => c.hanzi), ...VOCABULARY.map((v) => v.hanzi)].filter(Boolean));
  const tokensIn = (value) => new Set(extractHanziTokensFromText(JSON.stringify(value ?? "")));
  const immersionTokens = tokensIn(Object.values(immersionModule));
  const cultureTokens = tokensIn(Object.values(cultureModule));

  const isConversation = (kind) => /conversation|dialogue|scene|roleplay/i.test(String(kind ?? ""));
  const early = ALL_LESSONS.slice(0, EARLY_COUNT);
  /** token → { lessons: number[], conversation: number|null } */
  const byToken = new Map();
  early.forEach((lesson, index) => {
    const planned = lessonRoundStepsFor(lesson, { silent: true }) ?? [];
    const seenHere = new Set();
    for (const step of planned) {
      for (const token of extractTokensFromStep(step)) {
        const entry = byToken.get(token) ?? { lessons: [], conversation: null, firstLessonId: lesson.id };
        if (!seenHere.has(token)) {
          entry.lessons.push(index + 1);
          seenHere.add(token);
        }
        if (entry.conversation == null && isConversation(step.kind)) entry.conversation = index + 1;
        byToken.set(token, entry);
      }
    }
  });

  const rows = [...byToken.entries()]
    .map(([lexeme, entry]) => {
      const [first, second, third] = entry.lessons;
      const gap = second != null ? second - first : EARLY_COUNT - first + 1;
      return {
        lexeme,
        firstLessonId: entry.firstLessonId,
        firstExposure: first ?? null,
        secondExposure: second ?? null,
        thirdExposure: third ?? null,
        exposures: entry.lessons.length,
        conversationExposure: entry.conversation,
        reviewEligible: srsSurfaces.has(lexeme),
        immersionExposure: immersionTokens.has(lexeme),
        cultureExposure: cultureTokens.has(lexeme),
        seedGreeting: isSeedGreetingToken(lexeme),
        orphan: second == null ? first != null && EARLY_COUNT - first >= ORPHAN_GAP : gap > ORPHAN_GAP,
      };
    })
    .sort((a, b) => (a.firstExposure ?? 0) - (b.firstExposure ?? 0) || a.lexeme.localeCompare(b.lexeme));

  const orphans = rows.filter((row) => row.orphan);
  const summary = {
    lessonsAudited: early.length,
    lexemes: rows.length,
    withSecondExposure: rows.filter((row) => row.secondExposure != null).length,
    withThirdExposure: rows.filter((row) => row.thirdExposure != null).length,
    withConversationExposure: rows.filter((row) => row.conversationExposure != null).length,
    reviewEligible: rows.filter((row) => row.reviewEligible).length,
    immersionExposure: rows.filter((row) => row.immersionExposure).length,
    cultureExposure: rows.filter((row) => row.cultureExposure).length,
    orphans: orphans.length,
    orphanGap: ORPHAN_GAP,
  };

  const pct = (n) => (rows.length ? `${Math.round((n / rows.length) * 100)}%` : "—");
  const yes = (value) => (value ? "✓" : "·");
  const lines = [
    "# RC2.2.20 · V5A — Reciclagem lexical (primeiras fases)",
    "",
    `_Gerado por \`report:lexical-recycling\` · ${new Date().toISOString().slice(0, 10)}_`,
    "",
    "Mede se a palavra aprendida volta — em outras lições, em conversa, na Revisão (item do SRS), na Imersão e na Cultura.",
    `Órfã = sem 2ª exposição em até ${ORPHAN_GAP} lições. **Só mede: não altera SRS nem conteúdo.**`,
    "",
    "## Resumo",
    "",
    "| Indicador | Valor |",
    "|---|---:|",
    `| Lições auditadas | ${summary.lessonsAudited} |`,
    `| Lexemas | ${summary.lexemes} |`,
    `| Com 2ª exposição | ${summary.withSecondExposure} (${pct(summary.withSecondExposure)}) |`,
    `| Com 3ª exposição | ${summary.withThirdExposure} (${pct(summary.withThirdExposure)}) |`,
    `| Com exposição em conversa | ${summary.withConversationExposure} (${pct(summary.withConversationExposure)}) |`,
    `| Elegíveis para Revisão (SRS) | ${summary.reviewEligible} (${pct(summary.reviewEligible)}) |`,
    `| Aparecem na Imersão | ${summary.immersionExposure} (${pct(summary.immersionExposure)}) |`,
    `| Aparecem na Cultura | ${summary.cultureExposure} (${pct(summary.cultureExposure)}) |`,
    `| **Órfãs** | **${summary.orphans}** |`,
    "",
    "## Órfãs (prioridade de reciclagem)",
    "",
  ];
  if (!orphans.length) lines.push("_Nenhuma._");
  else {
    lines.push("| Lexema | 1ª lição | 1ª | 2ª | Revisão | Imersão | Cultura |", "|---|---|--:|--:|:-:|:-:|:-:|");
    for (const row of orphans) {
      lines.push(`| ${row.lexeme} | \`${row.firstLessonId}\` | ${row.firstExposure} | ${row.secondExposure ?? "—"} | ${yes(row.reviewEligible)} | ${yes(row.immersionExposure)} | ${yes(row.cultureExposure)} |`);
    }
  }
  lines.push(
    "",
    "## Todos os lexemas",
    "",
    "| Lexema | 1ª | 2ª | 3ª | Exposições | Conversa | Revisão | Imersão | Cultura |",
    "|---|--:|--:|--:|--:|--:|:-:|:-:|:-:|"
  );
  for (const row of rows) {
    lines.push(
      `| ${row.lexeme} | ${row.firstExposure ?? "—"} | ${row.secondExposure ?? "—"} | ${row.thirdExposure ?? "—"} | ${row.exposures} | ${row.conversationExposure ?? "—"} | ${yes(row.reviewEligible)} | ${yes(row.immersionExposure)} | ${yes(row.cultureExposure)} |`
    );
  }
  lines.push("");

  await mkdir(path.dirname(mdPath), { recursive: true });
  await writeFile(mdPath, lines.join("\n"), "utf8");
  await writeFile(jsonPath, JSON.stringify({ schema: "longyu-lexical-recycling/1", summary, orphans, rows }, null, 2) + "\n", "utf8");
  console.log(`OK: report:lexical-recycling — ${summary.lexemes} lexemas, ${summary.orphans} órfãs (${path.relative(rootDir, mdPath)}).`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
