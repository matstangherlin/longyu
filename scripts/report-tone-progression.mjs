/**
 * RC2.2.20 · V5A — report:tone-progression
 *
 * As aulas iniciais de tom precisam de MENOS texto e MAIS percepção, na ordem:
 *
 *   VER → OUVIR → IMITAR → DISCRIMINAR → RECONHECER → USAR EM PALAVRA → USAR EM CONTEXTO
 *
 * Este relatório classifica cada passo planejado (o mesmo plano que o player
 * executa) nesses estágios e aponta a aula que COBRA classificação abstrata
 * (reconhecer o tom) antes de o aluno ter visto e ouvido o contorno.
 * Só mede: não altera o currículo congelado.
 *
 * Saída: docs/reports/rc2-2-20-tone-progression.md
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const mdPath = path.join(rootDir, "docs/reports/rc2-2-20-tone-progression.md");

export const TONE_STAGES = ["VER", "OUVIR", "IMITAR", "DISCRIMINAR", "RECONHECER", "PALAVRA", "CONTEXTO"];

/** Passo planejado → estágio da progressão de tom (null = fora da trilha de tom). */
export function toneStageOf(step) {
  const kind = String(step?.kind ?? "");
  if (kind === "intro") return "VER";
  if (kind === "listen" || kind === "listen_select") return "OUVIR";
  if (kind === "produce" || kind === "free_production") return "IMITAR";
  if (kind === "audio_discrimination" || kind === "tone_pair" || kind === "odd_one_out") return "DISCRIMINAR";
  if (kind === "tone" || kind === "recognize" || kind === "recognition") return "RECONHECER";
  if (kind === "comprehend" || kind === "image_choice" || kind === "flashcard" || kind === "match_pairs") return "PALAVRA";
  if (/conversation|dialogue|transfer|contextual|sentence|microread/.test(kind)) return "CONTEXTO";
  return null;
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-tone-progression-"));
try {
  const program = ts.createProgram(["src/features/lesson/lessonTasks.ts", "src/data/journey.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
    resolveJsonModule: true,
  });
  if (program.emit().emitSkipped) {
    console.error("report:tone-progression: falha ao compilar.");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { ALL_LESSONS } = load("src/data/journey.js");

  // Aulas iniciais de tom: as da fase 1–2 cujo id fala de tom.
  const toneLessons = ALL_LESSONS.filter((lesson) => /(^p1-o-que-e-tom$)|(^p2-.*(tom|tons))/.test(lesson.id));
  const rows = toneLessons.map((lesson) => {
    const planned = lessonRoundStepsFor(lesson, { silent: true }) ?? [];
    const stages = planned.map(toneStageOf).filter(Boolean);
    const firstRecognize = stages.indexOf("RECONHECER");
    // Perceber = OUVIR ou DISCRIMINAR (ver a explicação sozinha não conta).
    const firstPerception = Math.min(...["OUVIR", "DISCRIMINAR"].map((s) => (stages.includes(s) ? stages.indexOf(s) : Infinity)));
    const abstractFirst = firstRecognize >= 0 && firstRecognize < firstPerception;
    const covered = TONE_STAGES.filter((s) => stages.includes(s));
    const textHeavy = planned.filter((step) => step.kind === "intro" && String(step.body ?? "").length > 220).length;
    return { id: lesson.id, title: lesson.title, steps: planned.length, sequence: stages, covered, abstractFirst, textHeavy };
  });

  const lines = [
    "# RC2.2.20 · V5A — Progressão das aulas iniciais de tom",
    "",
    `_Gerado por \`report:tone-progression\` · ${new Date().toISOString().slice(0, 10)}_`,
    "",
    "Ordem desejada: **VER → OUVIR → IMITAR → DISCRIMINAR → RECONHECER → USAR EM PALAVRA → USAR EM CONTEXTO**.",
    "`Abstrato antes da percepção` = a aula cobra reconhecer o tom antes de um passo só de ouvir ou de discriminar (a intro sozinha não conta como percepção). `Intro longa` = explicação com mais de 220 caracteres.",
    "Só mede o plano que o player executa; não altera o currículo congelado.",
    "",
    "| Aula | Passos | Estágios cobertos | Abstrato antes da percepção | Intro longa |",
    "|---|--:|---|:-:|--:|",
  ];
  for (const row of rows) {
    lines.push(`| \`${row.id}\` | ${row.steps} | ${row.covered.join(" → ") || "—"} | ${row.abstractFirst ? "**sim**" : "não"} | ${row.textHeavy} |`);
  }
  lines.push("", "## Sequência por aula", "");
  for (const row of rows) lines.push(`- \`${row.id}\`: ${row.sequence.join(" · ") || "—"}`);
  const flagged = rows.filter((row) => row.abstractFirst || row.textHeavy > 0);
  lines.push("", "## Prioridade V5A", "");
  if (!flagged.length) lines.push("_Nenhuma aula inicial de tom cobra classificação antes da percepção nem tem intro longa._");
  else for (const row of flagged) lines.push(`- \`${row.id}\`${row.abstractFirst ? " — cobra reconhecer antes de ouvir/discriminar" : ""}${row.textHeavy ? ` — ${row.textHeavy} intro(s) longa(s)` : ""}`);
  lines.push("");
  await mkdir(path.dirname(mdPath), { recursive: true });
  await writeFile(mdPath, lines.join("\n"), "utf8");
  console.log(`OK: report:tone-progression — ${rows.length} aulas, ${flagged.length} com prioridade V5A (${path.relative(rootDir, mdPath)}).`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
