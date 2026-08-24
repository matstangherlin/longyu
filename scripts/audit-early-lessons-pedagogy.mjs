#!/usr/bin/env node
/**
 * audit:early-lessons — auditoria pedagógica das lições 1–20 (ALL_LESSONS[0..19]).
 *
 * Não olha só vocabulário: estrutura, metalinguagem, formato, carga, escrita,
 * produção aberta, transferência, áudio, sentence build.
 *
 * Gera reports/early-lessons-pedagogy-audit.md
 * Exit 1 se houver severidade high (objetiva).
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/early-lessons-pedagogy-audit.md");

const EARLY_COUNT = 20;
const TECHNICAL_RE =
  /\b(sujeito|verbo|objeto|part[ií]cula|classificador|aspecto|predicado|sintaxe|SVO|tone sandhi)\b/i;
const HEAVY_KINDS = new Set([
  "free_production",
  "transfer_task",
  "conversation_repair",
  "write",
  "dictation",
  "dragon_dictation",
]);

const findings = [];

function addFinding(f) {
  findings.push({
    severity: f.severity,
    lessonId: f.lessonId,
    lessonTitle: f.lessonTitle,
    lessonIndex: f.lessonIndex,
    stepKind: f.stepKind,
    stepTitle: f.stepTitle ?? "",
    problem: f.problem,
    missingPrerequisite: f.missingPrerequisite,
    recommendedFix: f.recommendedFix,
  });
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-early-audit-"));
try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/features/lesson/exerciseValidation.ts",
      "src/data/productionTasks.ts",
      "src/data/structuralConcepts.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/vocabulary.ts",
      "src/data/productionHelp.ts",
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
    console.error("Falha ao compilar audit:early-lessons.");
    process.exit(1);
  }
  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const {
    lessonRoundStepsFor,
    structureExposureSnapshotForLesson,
    priorTransferredFramesSnapshotForLesson,
    curriculumGlyphsThroughLesson,
  } = load("src/features/lesson/lessonTasks.js");
  const {
    canGuidedProduceStructure,
    canTransferStructure,
    canOpenProduceGoal,
  } = load("src/data/productionTasks.js");
  const { STRUCTURAL_CONCEPTS, conceptLabelStage, TECHNICAL_TERM_PATTERNS } =
    load("src/data/structuralConcepts.js");

  const early = ALL_LESSONS.slice(0, EARLY_COUNT);
  const lessonIndex = new Map(ALL_LESSONS.map((l, i) => [l.id, i]));

  /** Glifos cumulativos ANTES da lição atual (só currículo anterior). */
  function glyphsBefore(lessonId) {
    const idx = lessonIndex.get(lessonId) ?? 0;
    if (idx <= 0) return new Set();
    const prev = ALL_LESSONS[idx - 1];
    return new Set(curriculumGlyphsThroughLesson(prev.id));
  }

  function glyphsThrough(lessonId) {
    return new Set(curriculumGlyphsThroughLesson(lessonId));
  }

  function textBlob(step) {
    return [
      step.title,
      step.prompt,
      step.explanation,
      step.situationPt,
      step.productionHintPt,
      step.objective,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function hanziFromStep(step) {
    const bag = [];
    const push = (v) => {
      if (!v || typeof v !== "string") return;
      for (const ch of v) {
        if (/[\u3400-\u9fff\uf900-\ufaff]/u.test(ch)) bag.push(ch);
      }
    };
    push(step.correctAnswer);
    push(step.answer);
    push(step.hanzi);
    push(step.audioText);
    push(step.blankAnswer);
    for (const p of step.targetParts ?? []) push(p);
    for (const p of step.target ?? []) push(p);
    for (const p of step.bank ?? []) push(p);
    for (const o of step.options ?? []) push(o);
    for (const line of step.lines ?? []) push(line.hanzi);
    return bag;
  }

  for (const [i, lesson] of early.entries()) {
    const band = i < 5 ? "L1-L5" : i < 10 ? "L6-L10" : "L11-L20";
    const bundle = structureExposureSnapshotForLesson(lesson.id);
    const plan = lessonRoundStepsFor(lesson, {
      silent: true,
      attemptNumber: 0,
      skipStructureExposureIndex: true,
      structureExposure: bundle.forFree,
      structureExposureForTransfer: bundle.forTransfer,
      priorTransferredFrames: priorTransferredFramesSnapshotForLesson(lesson.id),
    });
    const priorGlyphs = glyphsBefore(lesson.id);
    const lessonGlyphs = glyphsThrough(lesson.id);

    const kinds = plan.map((s) => s.kind);
    const hasRecognition = kinds.some((k) =>
      ["listen_select", "recognize", "comprehend", "tone", "tone_pair", "match_pairs", "intro_listen"].includes(k)
    );
    const hasGuidedBuild = kinds.some((k) =>
      ["sentence_build", "fill_blank", "produce", "translation_build", "hanzi_build"].includes(k)
    );

    for (const [si, step] of plan.entries()) {
      const blob = textBlob(step);
      const title = step.title ?? step.kind;

      // ——— Metalanguage / technical terms ———
      if (TECHNICAL_RE.test(blob)) {
        const match = blob.match(TECHNICAL_RE)?.[0] ?? "termo técnico";
        // Allow if past introduction lesson for that concept
        let introduced = false;
        for (const concept of STRUCTURAL_CONCEPTS) {
          if (
            concept.technicalLabelPt &&
            new RegExp(concept.technicalLabelPt, "i").test(match)
          ) {
            const introIdx = lessonIndex.get(concept.introducedAt) ?? 999;
            if (i >= introIdx) introduced = true;
          }
        }
        if (/tone sandhi/i.test(blob) && i < 6) {
          addFinding({
            severity: "medium",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: `Metalanguage técnica precoce: “${match}”.`,
            missingPrerequisite: "Introdução informal do conceito (sem jargão inglês).",
            recommendedFix: "Trocar por explicação em PT-BR acessível (ex.: “o tom muda perto de outro tom”).",
          });
        } else if (!introduced && TECHNICAL_RE.test(blob) && !/tone sandhi/i.test(match)) {
          addFinding({
            severity: i < 10 ? "high" : "medium",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: `Termo gramatical “${match}” antes da introdução formal.`,
            missingPrerequisite: `Introdução do conceito em lição dedicada (ex.: p3-nomes-da-frase).`,
            recommendedFix: "Remover jargão ou adiar o step até depois da intro do conceito.",
          });
        }
      }

      // Patterns from TECHNICAL_TERM_PATTERNS
      for (const entry of TECHNICAL_TERM_PATTERNS ?? []) {
        const { conceptId, pattern } = entry;
        if (!pattern.test(blob)) continue;
        const concept = STRUCTURAL_CONCEPTS.find((c) => c.id === conceptId);
        if (!concept) continue;
        const introIdx = lessonIndex.get(concept.introducedAt) ?? 999;
        if (i < introIdx && new RegExp(`\\b${concept.technicalLabelPt}\\b`, "i").test(blob)) {
          addFinding({
            severity: "high",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: `UI/copy usa “${concept.technicalLabelPt}” antes de introducedAt.`,
            missingPrerequisite: `Lição ${concept.introducedAt}`,
            recommendedFix: "Usar rótulo intuitivo ou adiar o step.",
          });
        }
      }

      // ——— Transfer / open / free gates ———
      if (step.kind === "transfer_task") {
        const frameId = step.productionFrameId;
        const rungs = bundle.forTransfer?.get?.(frameId);
        if (!canTransferStructure(rungs)) {
          addFinding({
            severity: "high",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: "transfer_task sem guided production prévia da estrutura.",
            missingPrerequisite: `guided free_production de ${frameId ?? "frame"}`,
            recommendedFix: "Remover transfer do plano desta lição (gate de estrutura).",
          });
        }
        if (i < 10) {
          addFinding({
            severity: "high",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: "Transferência nas primeiras 10 lições (carga cognitiva / base insuficiente).",
            missingPrerequisite: "Chunks + construção guiada estáveis (L11+).",
            recommendedFix: "Excluir transfer_task do gerador até banda L11+.",
          });
        } else if (i < 20) {
          // Topic mismatch: numbers lesson with 我在… transfer
          const isNum = /num|n[uú]mero/i.test(lesson.id + lesson.title);
          if (isNum) {
            addFinding({
              severity: "medium",
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              lessonIndex: i,
              stepKind: step.kind,
              stepTitle: title,
              problem: "Transferência fora do tópico da lição (números × estrutura 我在).",
              missingPrerequisite: "Transfer alinhado ao foco da lição ou adiado.",
              recommendedFix: "Não injetar transfer em lições de números; manter só drills de número.",
            });
          }
        }
        if (!hasGuidedBuild) {
          addFinding({
            severity: "high",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: "Salto exemplo → transferência sem construção guiada na mesma lição.",
            missingPrerequisite: "sentence_build / fill_blank / produce na lição",
            recommendedFix: "Garantir construção guiada antes de transfer, ou remover transfer.",
          });
        }
      }

      if (step.kind === "free_production" && step.productionOpen) {
        if (i < 15) {
          addFinding({
            severity: "high",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: "Produção aberta cedo demais (L1–L15).",
            missingPrerequisite: "Produção guiada estável + várias estruturas",
            recommendedFix: "Adiar open production.",
          });
        }
        if (!canOpenProduceGoal(bundle.forTransfer ?? bundle.forFree, step.productionGoal)) {
          addFinding({
            severity: "high",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: "Produção aberta sem guided prévio do objetivo.",
            missingPrerequisite: `guided production do goal ${step.productionGoal}`,
            recommendedFix: "Gate canOpenProduceGoal.",
          });
        }
      }

      if (step.kind === "free_production" && !step.productionOpen) {
        const frameId = step.productionFrameId;
        const rungs = bundle.forFree?.get?.(frameId);
        if (frameId && !canGuidedProduceStructure(rungs)) {
          addFinding({
            severity: "high",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: "free_production guiada sem exposição/completion/build da estrutura.",
            missingPrerequisite: `estrutura ${frameId} exposta + completion|build`,
            recommendedFix: "Remover free do plano até pré-requisitos.",
          });
        }
        if (i < 5) {
          addFinding({
            severity: "high",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: "Produção livre (mesmo guiada) em L1–L5.",
            missingPrerequisite: "Reconhecimento + chunks + montagem guiada",
            recommendedFix: "Não gerar free_production antes de L6+.",
          });
        } else if (i < 10) {
          addFinding({
            severity: "medium",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: "Produção livre em L6–L10 (ainda priorizar chunks/reconhecimento).",
            missingPrerequisite: "Base mais sólida de chunks",
            recommendedFix: "Preferir sentence_build/fill; adiar free se possível.",
          });
        }
      }

      // ——— Dictation / write early ———
      if ((step.kind === "dictation" || step.kind === "dragon_dictation" || step.kind === "write") && i < 5) {
        addFinding({
          severity: "high",
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonIndex: i,
          stepKind: step.kind,
          stepTitle: title,
          problem: `Escrita/ditado em ${band} — habilidade ainda não estabilizada.`,
          missingPrerequisite: "Reconhecimento auditivo + leitura de chunks",
          recommendedFix: "Remover ditado/escrita gerados das lições 1–5 (conceitos).",
        });
      }

      // ——— Sentence build of content not in focus ———
      if (step.kind === "sentence_build" || step.kind === "translation_build") {
        const target = String(step.correctAnswer ?? step.answer ?? (step.targetParts ?? []).join("") ?? "");
        const unknown = [...target].filter(
          (ch) => /[\u3400-\u9fff\uf900-\ufaff]/u.test(ch) && !lessonGlyphs.has(ch)
        );
        if (unknown.length > 0) {
          addFinding({
            severity: "high",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: `Montagem exige glifos ainda não ensinados: ${[...new Set(unknown)].join("")}.`,
            missingPrerequisite: "Vocabulário/glifos no currículo até esta lição",
            recommendedFix: "Usar só frases do foco da lição / glifos cumulativos.",
          });
        }
        if (i < 5 && step.generated) {
          const target = String(step.correctAnswer ?? step.answer ?? (step.targetParts ?? []).join("") ?? "");
          const unknown = [...target].filter(
            (ch) => /[\u3400-\u9fff\uf900-\ufaff]/u.test(ch) && !lessonGlyphs.has(ch)
          );
          if (unknown.length > 0) {
            addFinding({
              severity: "medium",
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              lessonIndex: i,
              stepKind: step.kind,
              stepTitle: title,
              problem: "sentence_build gerado em lição de conceito com glifos fora do foco.",
              missingPrerequisite: "Apenas chunks do foco da lição",
              recommendedFix: "Não gerar sentence_build suplementar com CORE_REVIEW em p1-o-que-e-*.",
            });
          }
        }
      }

      // ——— Conversation scene on pure concept lessons ———
      if (step.kind === "conversation_scene" && i < 5) {
        const isConcept = /o-que-e|engine-2-lab|primeiros-hanzi/i.test(lesson.id);
        if (isConcept) {
          addFinding({
            severity: "medium",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: "Cena de conversa injetada em lição de conceito/fundamentos.",
            missingPrerequisite: "Vocabulário de cumprimento já ensinado (l2+)",
            recommendedFix: "Desativar conversation_scene gerada em p1 conceito.",
          });
        }
      }

      // ——— Vocab unknown in answer ———
      if (["produce", "fill_blank", "listen_select", "comprehend"].includes(step.kind)) {
        const target = String(step.correctAnswer ?? step.answer ?? step.blankAnswer ?? "");
        const unknown = [...target].filter(
          (ch) => /[\u3400-\u9fff\uf900-\ufaff]/u.test(ch) && !lessonGlyphs.has(ch) && !priorGlyphs.has(ch)
        );
        // Allow current lesson teaching
        const trulyUnknown = unknown.filter((ch) => !lessonGlyphs.has(ch));
        if (trulyUnknown.length > 0 && step.generated) {
          addFinding({
            severity: "medium",
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            problem: `Resposta com glifos fora do currículo precoce: ${[...new Set(trulyUnknown)].join("")}.`,
            missingPrerequisite: "Glifos no cumulative curriculum",
            recommendedFix: "Restringir banco gerado aos glifos conhecidos.",
          });
        }
      }

      // ——— Cognitive overload heuristics ———
      if (i < 5 && HEAVY_KINDS.has(step.kind)) {
        addFinding({
          severity: "high",
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonIndex: i,
          stepKind: step.kind,
          stepTitle: title,
          problem: `Formato pesado (${step.kind}) em ${band}.`,
          missingPrerequisite: "Progressão gradual de formatos",
          recommendedFix: `Bloquear ${step.kind} no gerador para índices < 5.`,
        });
      }

      // Jump recognition → open production in same lesson
      if (step.kind === "free_production" && step.productionOpen && hasRecognition && !hasGuidedBuild) {
        addFinding({
          severity: "high",
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonIndex: i,
          stepKind: step.kind,
          stepTitle: title,
          problem: "Salto reconhecimento → produção aberta sem construção guiada.",
          missingPrerequisite: "sentence_build / produce guiado",
          recommendedFix: "Inserir construção guiada ou remover open.",
        });
      }

      // Help metalanguage on transfer with technical labels when help>=2 in early
      if (step.kind === "transfer_task" && step.productionHelpInitial >= 2 && i < 15) {
        addFinding({
          severity: "low",
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonIndex: i,
          stepKind: step.kind,
          stepTitle: title,
          problem: "Scaffold inicial já mostra estrutura (nível ≥2) cedo.",
          missingPrerequisite: "Preferir nível 0–1 no início",
          recommendedFix: "Manter initial help ≤1 nas primeiras transferências.",
        });
      }

      void si;
    }

    // Lesson-level: too many heavy formats
    const heavyCount = plan.filter((s) => HEAVY_KINDS.has(s.kind) || s.kind === "conversation_scene").length;
    if (i < 5 && heavyCount >= 3) {
      addFinding({
        severity: "medium",
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonIndex: i,
        stepKind: "lesson_plan",
        stepTitle: "plano gerado",
        problem: `Carga cognitiva: ${heavyCount} atividades pesadas/conversa em lição de fundamento.`,
        missingPrerequisite: "Plano curto focado em conceito + 1 prática leve",
        recommendedFix: "Reduzir supplements gerados em lições p1 conceito.",
      });
    }
  }

  // Dedupe similar findings
  const seen = new Set();
  const unique = [];
  for (const f of findings) {
    const key = `${f.lessonId}|${f.stepKind}|${f.problem}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }
  unique.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9) || a.lessonIndex - b.lessonIndex;
  });

  const high = unique.filter((f) => f.severity === "high");
  const medium = unique.filter((f) => f.severity === "medium");
  const low = unique.filter((f) => f.severity === "low");

  const lines = [
    `# Auditoria pedagógica — lições 1–20`,
    ``,
    ...reportProvenanceLines(rootDir, { lessonCount: EARLY_COUNT }),
    ``,
    `## Escopo`,
    ``,
    `- Primeiras **${EARLY_COUNT}** entradas de \`ALL_LESSONS\` (ordem do currículo).`,
    `- Plano real attempt=0 (\`lessonRoundStepsFor\`).`,
    `- Critérios: vocabulário, estrutura, metalanguage, formato, carga, escrita, open, transfer, áudio, sentence build.`,
    ``,
    `## Faixas`,
    ``,
    `| Faixa | Índices | Expectativa |`,
    `|-------|--------:|-------------|`,
    `| L1–L5 | 0–4 | Extremamente acessível: conceito, reconhecimento, chunks leves |`,
    `| L6–L10 | 5–9 | Chunks, reconhecimento, construção guiada |`,
    `| L11–L20 | 10–19 | Produção gradual; transfer só com base |`,
    ``,
    `## Resumo`,
    ``,
    `| Severidade | Qtd |`,
    `|------------|----:|`,
    `| high | ${high.length} |`,
    `| medium | ${medium.length} |`,
    `| low | ${low.length} |`,
    `| **total** | **${unique.length}** |`,
    ``,
    `## Achados`,
    ``,
  ];

  if (unique.length === 0) {
    lines.push("_Nenhum problema objetivo encontrado._", ``);
  } else {
    lines.push(
      `| Severidade | Lição | Step | Problema | Pré-requisito ausente | Correção recomendada |`,
      `|------------|-------|------|----------|----------------------|----------------------|`
    );
    for (const f of unique) {
      const esc = (s) =>
        String(s ?? "")
          .replace(/\\/g, "\\\\")
          .replace(/\|/g, "\\|")
          .replace(/\n/g, " ");
      lines.push(
        `| ${f.severity} | \`${f.lessonId}\` (${f.lessonIndex}) ${esc(f.lessonTitle)} | \`${f.stepKind}\` ${esc(f.stepTitle)} | ${esc(f.problem)} | ${esc(f.missingPrerequisite)} | ${esc(f.recommendedFix)} |`
      );
    }
    lines.push(``);
  }

  lines.push(`## Lições auditadas`, ``);
  for (const [i, lesson] of early.entries()) {
    lines.push(`- **${i}.** \`${lesson.id}\` — ${lesson.title}`);
  }
  lines.push(``);

  await mkdir(path.dirname(reportPath), { recursive: true });
  const body = await finalizeReport(lines);
  await writeFile(reportPath, body, "utf8");

  console.log(`Relatório: ${reportPath}`);
  console.log(`Achados: high=${high.length} medium=${medium.length} low=${low.length}`);

  // Print top findings for agent consumption
  for (const f of unique.slice(0, 40)) {
    console.log(`[${f.severity}] ${f.lessonId} · ${f.stepKind} · ${f.problem}`);
  }

  if (high.length > 0) {
    console.error(`\naudit:early-lessons: ${high.length} problema(s) high.`);
    process.exitCode = 1;
  } else {
    console.log("OK: audit:early-lessons (sem high).");
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
