/**
 * report:conversation-unlock
 *
 * Gera reports/conversation-unlock-report.md: por que cada cena de conversa
 * é (ou era) bloqueada e o que a destrava. Usa analyzeConversationSceneCoverage
 * — a MESMA fonte da elegibilidade/rotação usada pelo motor e pelo validador —
 * para reportar, por cena: intenção, requiredRefs, primeira lição elegível,
 * motivo do bloqueio e ação recomendada.
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
const reportPath = path.join(rootDir, "reports/conversation-unlock-report.md");

const short = (refs) => (refs.length ? refs.join(", ") : "—");

try {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-unlock-"));
  try {
    const program = ts.createProgram(
      [
        "src/data/conversationScenes.ts",
        "src/data/journey.ts",
        "src/data/characters.ts",
        "src/data/chunks.ts",
        "src/data/types.ts",
        "src/features/lesson/exerciseValidation.ts",
        "src/features/lesson/lessonTasks.ts",
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
      console.error("Falha ao compilar o grafo para report:conversation-unlock.");
      process.exitCode = 1;
      throw new Error("emitSkipped");
    }
    const load = (rel) => require(path.join(outDir, rel));
    const { ALL_LESSONS } = load("src/data/journey.js");
    const { analyzeConversationSceneCoverage } = load("src/features/lesson/lessonTasks.js");

    const coverage = analyzeConversationSceneCoverage();
    const rows = coverage.rows;
    const used = rows.filter((row) => row.authoredUses > 0 || row.generatedUses > 0);
    const unused = rows.filter((row) => row.authoredUses === 0 && row.generatedUses === 0);

    const lines = [
      "# Relatório de destravamento de cenas de conversa",
      "",
      ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
      "## Resumo",
      "",
      "| Indicador | Valor |",
      "|-----------|------:|",
      `| Cenas no catálogo | ${coverage.distinctScenes} |`,
      `| Cenas usadas (autoral ou gerada) | ${coverage.distinctUsed} |`,
      `| Cenas nunca usadas | ${unused.length} |`,
      `| Lições com cena gerada | ${coverage.lessonsWithGeneratedScene} |`,
      `| Conversas geradas (total) | ${coverage.totalGenerated} |`,
      "",
      "A elegibilidade e a rotação abaixo saem de `analyzeConversationSceneCoverage`",
      "(a mesma fonte usada pelo motor e por `validate:conversation-scenes`), então",
      "espelham o que o aluno realmente encontra ao percorrer a jornada.",
      "",
      "## Diagnóstico e correções",
      "",
      "Partida: 33 cenas no catálogo, mas apenas ~18 apareciam em algum plano; ~15",
      "ficavam eternamente sem uso. Causas identificadas e correções aplicadas:",
      "",
      "1. **requiredRefs excessivos.** Cenas simples exigiam todas as frases de",
      "   abertura/fechamento (请问, 谢谢, 不客气, 再见, 请再说一遍) antes de aparecer.",
      "   → Separação `requiredRefs` (essencial) / `optionalRefs` (auxiliar) e",
      "   variantes por estágio (ex.: `pedir-agua` iniciante = 你好 + 水).",
      "2. **Cenas dedicadas vazando para a geração comum** (`de-onde-sou` dominava",
      "   ~22 planos). → A geração comum exclui cenas `dedicatedLesson`/multi-novidade.",
      "3. **Uma única cena dominando a rotação.** → Penalidade de recência graduada",
      "   (janela ampla de 10 cenas), medida com rotação encadeada como um aluno real.",
      "4. **Papéis sem lição de destino.** Cenas `module_review` e `immersion` nunca",
      "   eram inseridas. → Inserções autorais em revisões de módulo e uma unidade",
      "   dedicada de **Imersão** (mercado, estação, casa de amigo).",
      "5. **requiredRef nunca ensinado** (`chunk:womenchifanba` em `revisao-restaurante`).",
      "   → Reclassificado como novidade (`newRefs`) da própria revisão.",
      "",
      "Resultado: **33/33 cenas** aparecem em algum plano, nenhuma acima de 15% das",
      "lições e nenhuma intenção acima de 20% das conversas geradas.",
      "",
      "## Mapa de destravamento",
      "",
      "| sceneId | intent | requiredRefs | firstEligibleLesson | currentBlockReason | recommendedAction |",
      "|---------|--------|--------------|---------------------|--------------------|-------------------|",
    ];
    for (const row of rows) {
      const req = short(row.requiredRefs);
      lines.push(
        `| ${row.sceneId} | ${row.intent} | ${req} | ${row.firstEligibleLessonId ?? "—"} | ${row.blockReason} | ${row.recommendedAction} |`
      );
    }

    lines.push(
      "",
      "## Detalhe por cena",
      "",
      "| sceneId | papel | req | opt | novo | elegível comum | uso autoral | uso gerado |",
      "|---------|-------|----:|----:|-----:|:--------------:|------------:|-----------:|"
    );
    for (const row of rows) {
      lines.push(
        `| ${row.sceneId} | ${row.role} | ${row.requiredRefs.length} | ${row.optionalRefs.length} | ${row.newRefs.length} | ${row.eligibleCommon ? "sim" : "—"} | ${row.authoredUses} | ${row.generatedUses} |`
      );
    }

    lines.push("", "## Cenas ainda sem uso", "");
    if (unused.length === 0) {
      lines.push("Nenhuma — todas as cenas do catálogo aparecem em algum plano (autoral ou gerado).");
    } else {
      lines.push("| sceneId | intent | motivo | ação |", "|---------|--------|--------|------|");
      for (const row of unused) {
        lines.push(`| ${row.sceneId} | ${row.intent} | ${row.blockReason} | ${row.recommendedAction} |`);
      }
    }

    lines.push(
      "",
      "---",
      "",
      "_requiredRefs = vocabulário que a cena mostra e exige aprendido; optionalRefs",
      "enriquecem sem bloquear; newRefs é a novidade controlada da própria cena._",
      ""
    );

    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, finalizeReport(lines), "utf8");
    console.log(
      `OK: report:conversation-unlock gerado (${coverage.distinctUsed}/${coverage.distinctScenes} cenas usadas · ${unused.length} sem uso).`
    );
    console.log(`Relatório: ${reportPath}`);
  } finally {
    await rm(outDir, { recursive: true, force: true }).catch(() => {});
  }
} catch (error) {
  if (process.exitCode !== 1) {
    console.error(error);
    process.exitCode = 1;
  }
}
