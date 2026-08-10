/**
 * validate:onboarding-pace — portão do ritmo da entrada do curso.
 *
 * As ondas anteriores mediram PROFUNDIDADE (o conteúdo volta por muitos
 * caminhos, o aluno produz sem apoio, o erro é diagnosticado). Nenhuma media
 * RITMO: se a primeira hora do aluno novo é escalável ou se o curso abre no
 * volume máximo.
 *
 * A auditoria que motivou este portão encontrou a lição 1 — "O que é
 * mandarim?" — pedindo produção livre de 我想喝水 e transferência de 我不喝水,
 * com a âncora 我不会说中文, a quem tinha acabado de encontrar 你好. Nenhum
 * validador via isso, porque todos mediam o curso inteiro ou a média: um
 * começo brutal fica escondido atrás de 122 lições saudáveis.
 *
 * O que este portão mede, no PLANO REAL de um aluno novo (sem histórico, sem
 * erros, primeira tentativa):
 *
 *  1. os motores exigentes não podem abrir o curso — produzir uma frase
 *     inteira sem apoio exige vocabulário que a lição 1 não tem;
 *  2. a carga de DIGITAÇÃO cresce aos poucos: as primeiras lições são de
 *     reconhecer e montar, não de escrever hànzì de cabeça;
 *  3. nenhuma lição da entrada é longa demais (fadiga = abandono);
 *  4. o salto entre lições consecutivas é suave — revisão de módulo pode ser
 *     maior, é a função dela;
 *  5. toda lição tem variedade mínima de motores;
 *  6. a entrada de um curso de mandarim precisa de SOM: quase nenhuma lição
 *     pode passar sem nada para ouvir.
 *
 * Gera reports/onboarding-pace-report.md.
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
const reportPath = path.join(rootDir, "reports/onboarding-pace-report.md");
const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

/** Quantas lições contam como "a entrada do curso". */
const ONBOARDING_SIZE = 20;
/** Janela inicial em que a carga é mais restrita ainda. */
const FIRST_STEPS_WINDOW = 5;

/**
 * Motores que só fazem sentido depois de o aluno ter repertório. Produzir uma
 * frase inteira sem apoio, ou transferir uma estrutura para uma combinação
 * inédita, pressupõe vocabulário — e na abertura não há.
 */
const DEMANDING_ENGINES = {
  free_production: 10,
  transfer_task: 10,
  conversation_repair: 10,
};

/** Motores que exigem DIGITAR uma resposta livre (carga alta em celular). */
const TYPING_KINDS = new Set(["write", "dictation", "free_production", "transfer_task", "conversation_repair"]);
/** Motores que dependem de ouvir. */
const AUDIO_KINDS = new Set(["listen", "listen_select", "dictation", "audio_discrimination", "tone", "tone_pair"]);
/** Passos de apresentação, que não são cobrança. */
const UNGRADED_KINDS = new Set(["intro", "listen", "flashcard", "microread", "hanzi_evolution"]);

/** Tetos medidos com folga sobre o estado real — pegam regressão, não o presente. */
const MAX_TYPING_FIRST_WINDOW = 1;
const MAX_TYPING_ONBOARDING = 3;
const MAX_STEPS_COMMON = 20;
const MAX_STEPS_REVIEW = 26;
const MAX_STEP_JUMP = 8;
const MIN_DISTINCT_KINDS = 4;
const MAX_SILENT_LESSONS = 2;

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-onboarding-"));
try {
  const program = ts.createProgram(
    ["src/data/journey.ts", "src/features/lesson/lessonTasks.ts"],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("falha ao compilar o grafo da jornada TypeScript");

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { lessonRoundStepsFor, estimateLessonMinutes } = load("src/features/lesson/lessonTasks.js");

  const onboarding = ALL_LESSONS.slice(0, ONBOARDING_SIZE);
  const rows = [];
  const firstSeen = new Map();

  for (const [index, lesson] of onboarding.entries()) {
    const position = index + 1;
    // Aluno NOVO: nada completado, nenhum erro, nenhum histórico, tentativa 0.
    // É este o plano que decide se a pessoa continua no app ou fecha.
    const plan = lessonRoundStepsFor(lesson, { attemptNumber: 0, silent: true });
    const kinds = plan.map((step) => step.kind);
    const distinct = [...new Set(kinds)];
    for (const kind of distinct) if (!firstSeen.has(kind)) firstSeen.set(kind, position);

    const typing = kinds.filter((kind) => TYPING_KINDS.has(kind)).length;
    const audio = kinds.filter((kind) => AUDIO_KINDS.has(kind)).length;
    const graded = kinds.filter((kind) => !UNGRADED_KINDS.has(kind)).length;

    rows.push({
      position,
      id: lesson.id,
      title: lesson.title,
      isReview: Boolean(lesson.isReview),
      steps: plan.length,
      graded,
      typing,
      audio,
      distinct: distinct.length,
      minutes: estimateLessonMinutes(lesson),
      kinds: distinct,
    });
  }

  // 1. Motor exigente não abre curso.
  for (const [kind, earliest] of Object.entries(DEMANDING_ENGINES)) {
    const seen = firstSeen.get(kind);
    if (seen === undefined) continue;
    assert(
      seen >= earliest,
      `${kind} aparece na lição ${seen}; a partir da ${earliest} o aluno tem repertório para isso`
    );
  }

  // 2. Carga de digitação sobe aos poucos.
  for (const row of rows) {
    const limit = row.position <= FIRST_STEPS_WINDOW ? MAX_TYPING_FIRST_WINDOW : MAX_TYPING_ONBOARDING;
    assert(
      row.typing <= limit,
      `lição ${row.position} (${row.id}): ${row.typing} passos de digitação, acima do teto ${limit} para esta altura do curso`
    );
  }

  // 3. Nenhuma lição de entrada é cansativa.
  for (const row of rows) {
    const limit = row.isReview ? MAX_STEPS_REVIEW : MAX_STEPS_COMMON;
    assert(
      row.steps <= limit,
      `lição ${row.position} (${row.id}): ${row.steps} passos, acima do teto ${limit}`
    );
  }

  // 4. O salto entre lições consecutivas é suave. Revisão de módulo pode
  //    crescer — consolidar exige varrer o módulo inteiro.
  for (let i = 1; i < rows.length; i += 1) {
    const previous = rows[i - 1];
    const current = rows[i];
    if (current.isReview) continue;
    const jump = current.steps - previous.steps;
    assert(
      jump <= MAX_STEP_JUMP,
      `lição ${current.position} (${current.id}) salta ${jump} passos sobre a anterior (teto ${MAX_STEP_JUMP})`
    );
  }

  // 5. Variedade mínima — uma lição de um motor só vira formulário.
  for (const row of rows) {
    assert(
      row.distinct >= MIN_DISTINCT_KINDS,
      `lição ${row.position} (${row.id}): só ${row.distinct} motores distintos`
    );
  }

  // 6. Mandarim entra pelo ouvido: lição muda da entrada é sinal de alerta.
  const silent = rows.filter((row) => row.audio === 0);
  assert(
    silent.length <= MAX_SILENT_LESSONS,
    `${silent.length} lições da entrada não têm nada para ouvir (teto ${MAX_SILENT_LESSONS})`
  );
  for (const row of silent) {
    warnings.push(
      `lição ${row.position} (${row.id} — "${row.title}") não tem nenhum passo de áudio.`
    );
  }

  // ————————————————————————————————————————————————————————————
  // Relatório
  // ————————————————————————————————————————————————————————————
  const totalSteps = rows.reduce((sum, row) => sum + row.steps, 0);
  const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0);
  const totalTyping = rows.reduce((sum, row) => sum + row.typing, 0);

  const lines = ["# Relatório de ritmo da entrada do curso", ""];
  lines.push(...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }));
  lines.push("## Resumo", "");
  lines.push("| Indicador | Valor |", "|-----------|------:|");
  lines.push(`| Lições auditadas | ${rows.length} |`);
  lines.push(`| Passos somados | ${totalSteps} |`);
  lines.push(`| Média de passos por lição | ${(totalSteps / rows.length).toFixed(1)} |`);
  lines.push(`| Minutos estimados até a lição ${rows.length} | ${totalMinutes} |`);
  lines.push(`| Passos de digitação na entrada inteira | ${totalTyping} |`);
  lines.push(`| Lições sem nada para ouvir | ${silent.length} |`);
  lines.push("");
  lines.push(
    "> Medido no plano REAL de um aluno **novo**: nada completado, nenhum erro,",
    "> nenhum histórico, primeira tentativa. É este plano que decide se a pessoa",
    "> continua no app — e é justamente o que a média de 122 lições esconde.",
    ""
  );

  lines.push("## Lição a lição", "");
  lines.push("| # | Lição | Passos | Cobrados | Digitação | Áudio | Motores | Min |");
  lines.push("|--:|-------|-------:|---------:|----------:|------:|--------:|----:|");
  for (const row of rows) {
    const name = row.isReview ? `${row.title} (revisão)` : row.title;
    lines.push(
      `| ${row.position} | ${name} | ${row.steps} | ${row.graded} | ${row.typing} | ${row.audio} | ${row.distinct} | ${row.minutes} |`
    );
  }
  lines.push("");

  lines.push("## Quando cada motor entra", "");
  lines.push(
    "A escada importa mais que a lista. Um motor que exige produzir uma frase",
    "inteira sem apoio não pode aparecer antes de existir vocabulário para ela.",
    ""
  );
  lines.push("| Lição | Motor |", "|------:|-------|");
  for (const [kind, position] of [...firstSeen.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))) {
    lines.push(`| ${position} | ${kind} |`);
  }
  lines.push("");

  lines.push("## Avisos", "");
  lines.push(warnings.length === 0 ? "Nenhum." : warnings.map((message) => `- ${message}`).join("\n"));
  lines.push("");
  lines.push("## Falhas", "");
  lines.push(failures.length === 0 ? "Nenhum." : failures.map((message) => `- ${message}`).join("\n"));
  lines.push("");

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines), "utf8");

  console.log(
    `Entrada: ${rows.length} lições · ${totalSteps} passos · ${(totalSteps / rows.length).toFixed(1)} por lição · ${totalTyping} de digitação.`
  );
  const demanding = Object.keys(DEMANDING_ENGINES)
    .map((kind) => `${kind}=${firstSeen.get(kind) ?? "fora da entrada"}`)
    .join(", ");
  console.log(`Motores exigentes entram em: ${demanding}.`);
  if (warnings.length > 0) {
    console.log("\nAvisos:");
    for (const message of warnings) console.log(`- ${message}`);
  }

  if (failures.length > 0) {
    console.error("\nFalhas de ritmo da entrada:");
    for (const message of failures) console.error(`- ${message}`);
    process.exitCode = 1;
  } else {
    console.log("\nOK: ritmo da entrada validado.");
  }
} finally {
  await rm(outDir, { recursive: true, force: true }).catch(() => {});
}
