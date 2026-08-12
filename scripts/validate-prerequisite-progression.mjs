#!/usr/bin/env node
/**
 * validate:prerequisite-progression
 *
 * Portão pedagógico unificado: impede que atividades avançadas apareçam
 * antes dos pré-requisitos reais do Longyu (estrutura, vocabulário, rótulos,
 * scaffold, onboarding L1–L20).
 *
 * Regras (pedagogia real — sem mínimos arbitrários):
 *  1. transfer_task só após exposição + completion|build + guided production
 *  2. free_production guiada só após exposição + completion|build
 *  3. sentence_build não usa estrutura ainda não apresentada
 *  4. sujeito/verbo/objeto/partícula só após introducedAt
 *  5. conceito/glifo novo não é cobrado no mesmo passo de apresentação sem apoio
 *  6. 1ª ocorrência de estrutura tem scaffold adequado
 *  7. não salta recognize → free production
 *  8. não salta vocabulary exposure → transfer
 *  9. L1–L20 respeitam onboarding
 * 10. atividade só exige prerequisites já disponíveis naquele ponto
 *
 * Relatório: reports/prerequisite-progression-report.md
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
const reportPath = path.join(rootDir, "reports/prerequisite-progression-report.md");

/** Lições de onboarding (índice 0–19 em ALL_LESSONS). */
const ONBOARDING_LESSON_COUNT = 20;

const RECOGNIZE_ONLY_KINDS = new Set([
  "recognize",
  "comprehend",
  "listen_select",
  "listen",
  "flash",
  "read",
  "dialogue_choice",
  "match_pairs",
  "image_choice",
]);

const BUILD_KINDS = new Set([
  "sentence_build",
  "translation_build",
  "sentence_lab_distractors",
  "sentence_lab_audio",
  "sentence_lab_no_translation",
  "sentence_lab_repair",
  "produce",
  "fill_blank",
]);

const SUPPORTIVE_INTRO_KINDS = new Set([
  "intro",
  "listen",
  "flash",
  "recognize",
  "comprehend",
  "read",
  "match_pairs",
  "image_choice",
  "listen_select",
  "tone",
  "tone_pair",
  "decompose",
  "dialogue_choice",
  "hanzi_build",
]);

const UNSUPPORTED_FIRST_KINDS = new Set([
  "free_production",
  "transfer_task",
  "write",
  "dictation",
  "dragon_dictation",
]);

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;

/** @typedef {{
 *   rule: number,
 *   lessonId: string,
 *   lessonTitle: string,
 *   lessonIndex: number,
 *   stepKind: string,
 *   stepTitle: string,
 *   activity: string,
 *   missingPrerequisite: string,
 *   requiredPreviousExperience: string,
 * }} Finding */

/** @type {Finding[]} */
const findings = [];

function addFinding(partial) {
  findings.push({
    rule: partial.rule,
    lessonId: partial.lessonId,
    lessonTitle: partial.lessonTitle ?? "",
    lessonIndex: partial.lessonIndex,
    stepKind: partial.stepKind ?? "",
    stepTitle: partial.stepTitle ?? "",
    activity: partial.activity ?? partial.stepKind ?? "",
    missingPrerequisite: partial.missingPrerequisite,
    requiredPreviousExperience: partial.requiredPreviousExperience,
  });
}

function stepUiBlob(step) {
  // Só o que o aluno vê ANTES de responder (não a explicação pós-acerto).
  return [step.title, step.body, step.prompt, step.situationPt, step.patternPt, ...(step.options ?? [])]
    .filter(Boolean)
    .join("\n");
}

function stepBlob(step) {
  return [stepUiBlob(step), step.explanation].filter(Boolean).join("\n");
}

function collectAuthoredGlyphs(lesson) {
  const set = new Set();
  const add = (text) => {
    for (const ch of String(text ?? "")) {
      if (CJK_RE.test(ch)) set.add(ch);
    }
  };
  for (const step of lesson.steps ?? []) {
    add(step.hanzi);
    add(step.text);
    add(step.correctAnswer);
    add(step.answer);
    add(step.audioText);
    add((step.targetParts ?? []).join(""));
    add((step.bank ?? []).join(""));
    add(step.blankAnswer);
    add(`${step.sentenceBefore ?? ""}${step.blankAnswer ?? ""}${step.sentenceAfter ?? ""}`);
    for (const line of step.lines ?? []) add(line.hanzi);
    for (const node of step.nodes ?? []) add(node.hanzi);
  }
  return set;
}

function stepTargetHanzi(step) {
  return String(
    step.correctAnswer ??
      step.answer ??
      (step.targetParts ?? []).join("") ??
      (step.target ?? []).join("") ??
      step.hanzi ??
      step.text ??
      ""
  ).replace(/[^\u3400-\u9fff\uf900-\ufaff]/gu, "");
}

function activityLabel(step) {
  const frame = step.productionFrameId ? ` · ${step.productionFrameId}` : "";
  const assist = step.productionAssist ? ` · assist=${step.productionAssist}` : "";
  const open = step.productionOpen ? " · open" : "";
  return `${step.kind}${frame}${assist}${open}`;
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-prereq-prog-"));
try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/features/lesson/exerciseValidation.ts",
      "src/data/productionTasks.ts",
      "src/data/productionHelp.ts",
      "src/data/structuralConcepts.ts",
      "src/data/sentenceStructureIntro.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/vocabulary.ts",
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
    console.error("Falha ao compilar validate:prerequisite-progression.");
    process.exit(1);
  }

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS, FOUNDATION_LESSON_IDS } = load("src/data/journey.js");
  const {
    lessonRoundStepsFor,
    structureExposureSnapshotForLesson,
    curriculumGlyphsThroughLesson,
    creditStructureFromStep,
  } = load("src/features/lesson/lessonTasks.js");
  const {
    SENTENCE_FRAMES,
    framesMatchingSentence,
    canGuidedProduceStructure,
    canTransferStructure,
    canOpenProduceGoal,
    emptyStructureRungs,
    ensureStructureRungs,
    cloneStructureExposure,
  } = load("src/data/productionTasks.js");
  const { resolveProductionHelpPlan } = load("src/data/productionHelp.js");
  const {
    STRUCTURAL_CONCEPTS,
    TECHNICAL_TERM_PATTERNS,
    conceptLabelStage,
    formatConceptLabel,
    conceptsAssumedByFrame,
  } = load("src/data/structuralConcepts.js");

  const foundationIds = new Set(FOUNDATION_LESSON_IDS ?? []);
  const lessonIndex = new Map(ALL_LESSONS.map((lesson, index) => [lesson.id, index]));
  const frameById = new Map(SENTENCE_FRAMES.map((frame) => [frame.id, frame]));

  /** Primeira vez que um frame teve free guiada / transfer no plano real. */
  const seenGuidedFrame = new Set();
  const seenTransferFrame = new Set();
  /** Glifos já apresentados com apoio (listen/flash/recognize…). */
  const glyphsIntroducedWithSupport = new Set();
  /** Frames já expostos com completion|build em algum ponto anterior do plano. */
  const frameHadBuildOrCompletion = new Set();
  /** Frames só vistos em recognize-like (sem build/completion ainda). */
  const frameRecognizeOnly = new Set();

  for (let i = 0; i < ALL_LESSONS.length; i += 1) {
    const lesson = ALL_LESSONS[i];
    const bundle = structureExposureSnapshotForLesson(lesson.id);
    const knownGlyphs = curriculumGlyphsThroughLesson(lesson.id);
    /** Glifos de lições ANTERIORES (sem o foco da atual). */
    const glyphsBefore = i === 0 ? new Set() : curriculumGlyphsThroughLesson(ALL_LESSONS[i - 1].id);
    const authoredGlyphs = collectAuthoredGlyphs(lesson);
    /** Disponíveis neste ponto: currículo anterior + o que esta lição ensina no autoral. */
    const availableGlyphs = new Set([...glyphsBefore, ...authoredGlyphs]);
    // Apresentação apoiada: autoral da lição + histórico.
    for (const ch of authoredGlyphs) glyphsIntroducedWithSupport.add(ch);
    for (const ch of glyphsBefore) glyphsIntroducedWithSupport.add(ch);

    const plan = lessonRoundStepsFor(lesson, {
      silent: true,
      attemptNumber: 0,
      skipStructureExposureIndex: true,
      structureExposure: bundle.forFree,
      structureExposureForTransfer: bundle.forTransfer,
    });

    /** Exposição acumulada DENTRO da lição (ordem dos steps). */
    const intra = cloneStructureExposure(bundle.forTransfer);
    // Free pode usar foco da própria lição — espelha forFree no início.
    for (const [frameId, rungs] of bundle.forFree) {
      const target = ensureStructureRungs(intra, frameId);
      target.exposed = target.exposed || rungs.exposed;
      target.completion = target.completion || rungs.completion;
      target.build = target.build || rungs.build;
    }

    for (const step of plan) {
      const title = step.title ?? "";
      const activity = activityLabel(step);
      const target = stepTargetHanzi(step);
      const uiBlob = stepUiBlob(step);
      const matchedFrames = target ? framesMatchingSentence(target) : [];

      // Conversa / apoio no plano libera glifos para os passos seguintes da lição.
      if (
        SUPPORTIVE_INTRO_KINDS.has(step.kind) ||
        step.kind === "conversation_scene" ||
        step.kind === "listen" ||
        step.kind === "flashcard"
      ) {
        for (const ch of target) {
          if (CJK_RE.test(ch)) {
            availableGlyphs.add(ch);
            glyphsIntroducedWithSupport.add(ch);
          }
        }
        for (const line of step.lines ?? []) {
          for (const ch of String(line.hanzi ?? "")) {
            if (CJK_RE.test(ch)) {
              availableGlyphs.add(ch);
              glyphsIntroducedWithSupport.add(ch);
            }
          }
        }
        for (const node of step.nodes ?? []) {
          for (const ch of String(node.hanzi ?? "")) {
            if (CJK_RE.test(ch)) {
              availableGlyphs.add(ch);
              glyphsIntroducedWithSupport.add(ch);
            }
          }
        }
        for (const opt of step.options ?? []) {
          for (const ch of String(opt)) {
            if (CJK_RE.test(ch)) {
              availableGlyphs.add(ch);
              glyphsIntroducedWithSupport.add(ch);
            }
          }
        }
      }

      // ——— R4: termos técnicos antes de introducedAt (UI pré-resposta) ———
      for (const { conceptId, pattern } of TECHNICAL_TERM_PATTERNS) {
        if (!pattern.test(uiBlob)) continue;
        const concept = STRUCTURAL_CONCEPTS.find((item) => item.id === conceptId);
        if (!concept) continue;
        const introAt = lessonIndex.get(concept.introducedAt) ?? Infinity;
        if (i < introAt) {
          addFinding({
            rule: 4,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: `introducedAt (${concept.introducedAt}) para “${concept.technicalLabelPt}”`,
            requiredPreviousExperience: `Ver/praticar a lógica da frase e só então aprender o nome “${concept.technicalLabelPt}” em ${concept.introducedAt}.`,
          });
        }
      }

      // ——— R10: glifos / prerequisites disponíveis ———
      if (target && (BUILD_KINDS.has(step.kind) || step.kind === "free_production" || step.kind === "transfer_task" || step.kind === "fill_blank" || step.kind === "dictation" || step.kind === "dragon_dictation" || step.kind === "write")) {
        // Autoral pode INTRODUZIR glifo (ex.: 这是木). Gerado só usa o já disponível.
        const pool = step.generated ? availableGlyphs : new Set([...availableGlyphs, ...authoredGlyphs]);
        const unknown = [...target].filter((ch) => CJK_RE.test(ch) && !pool.has(ch));
        if (unknown.length > 0) {
          addFinding({
            rule: 10,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: `glifos ainda não disponíveis: ${[...new Set(unknown)].join("")}`,
            requiredPreviousExperience:
              "Vocabulário já apresentado no currículo anterior ou no conteúdo autoral desta lição.",
          });
        }
      }

      if (step.kind === "transfer_task" && step.productionFrameId) {
        const frame = frameById.get(step.productionFrameId);
        if (frame?.transferRequiresMa && !knownGlyphs.has("吗")) {
          addFinding({
            rule: 10,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: "吗 ainda não disponível",
            requiredPreviousExperience: "Aprender 吗 (pergunta) antes de transferir frames com 吗.",
          });
        }
        for (const requiredId of frame?.transferRequiresFrameIds ?? []) {
          const requiredRungs = bundle.forTransfer.get(requiredId);
          if (!canGuidedProduceStructure(requiredRungs) && !requiredRungs?.guidedProduction) {
            // Exige que o frame pré-requisito já tenha sido praticável (exposto+build).
            if (!requiredRungs?.exposed) {
              addFinding({
                rule: 10,
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                lessonIndex: i,
                stepKind: step.kind,
                stepTitle: title,
                activity,
                missingPrerequisite: `frame pré-requisito ${requiredId} não exposto`,
                requiredPreviousExperience: `Praticar ${requiredId} (exposição + montagem) antes de ${step.productionFrameId}.`,
              });
            }
          }
        }
      }

      // ——— R3: sentence build sem estrutura apresentada ———
      if (BUILD_KINDS.has(step.kind) && matchedFrames.length > 0) {
        for (const frame of matchedFrames) {
          const prior = intra.get(frame.id) ?? emptyStructureRungs();
          // Montagem pode SER a primeira prática se a frase já foi exposta
          // (listen/flash/foco). Sem exposição prévia = estrutura inventada.
          if (!prior.exposed) {
            addFinding({
              rule: 3,
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              lessonIndex: i,
              stepKind: step.kind,
              stepTitle: title,
              activity: `${activity} · ${frame.id}`,
              missingPrerequisite: `exposição de ${frame.id} (${frame.patternPt})`,
              requiredPreviousExperience:
                "Ouvir/ler/ver a frase no padrão (flash, listen, foco ou conversa) antes de montar.",
            });
          }
        }
      }

      // ——— R1 / R8: transfer ———
      if (step.kind === "transfer_task") {
        const frameId = step.productionFrameId;
        const rungs = bundle.forTransfer.get(frameId) ?? emptyStructureRungs();
        if (!canTransferStructure(rungs)) {
          const missing = [];
          if (!rungs.exposed) missing.push("exposição da estrutura");
          if (!rungs.completion && !rungs.build) missing.push("completion ou sentence build");
          if (!rungs.guidedProduction) missing.push("free_production guiada (lição anterior)");
          addFinding({
            rule: 1,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: missing.join(" + ") || "escada completa da estrutura",
            requiredPreviousExperience: `Para ${frameId ?? "frame"}: exposição → completion|build → produção guiada → só então transferir.`,
          });
        } else if (rungs.exposed && !rungs.guidedProduction && !rungs.completion && !rungs.build) {
          // R8 só quando R1 não cobriu: exposição lexical sem prática.
          addFinding({
            rule: 8,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: "prática de estrutura (build/completion + guided) além da exposição lexical",
            requiredPreviousExperience:
              "Vocabulário conhecido ≠ estrutura praticada. Montar e produzir no padrão antes de transferir.",
          });
        }

        // ——— R6: 1ª transferência com scaffold ———
        if (frameId && !seenTransferFrame.has(frameId)) {
          seenTransferFrame.add(frameId);
          const help = resolveProductionHelpPlan({
            kind: "transfer_task",
            firstOfStructure: true,
            attemptNumber: 0,
          });
          const assistOk = step.productionAssist === "guided";
          const helpOk =
            (step.productionHelpInitial ?? help.initial) >= 1 ||
            step.productionHelpFirstOfStructure === true;
          const patternOk = Boolean(step.patternPt?.trim()) || Boolean(step.patternSlots?.length);
          if (!assistOk || !helpOk || !patternOk) {
            addFinding({
              rule: 6,
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              lessonIndex: i,
              stepKind: step.kind,
              stepTitle: title,
              activity,
              missingPrerequisite: [
                !assistOk ? "productionAssist=guided" : null,
                !helpOk ? "productionHelp inicial ≥ 1 (padrão à vista)" : null,
                !patternOk ? "patternPt ou patternSlots" : null,
              ]
                .filter(Boolean)
                .join(" + "),
              requiredPreviousExperience:
                "Na 1ª transferência da estrutura: degrau guided + padrão visível (help ≥ 1).",
            });
          }
        }
      }

      // ——— R2 / R7: free_production ———
      if (step.kind === "free_production" && !step.productionOpen) {
        const frameId = step.productionFrameId;
        const rungs = bundle.forFree.get(frameId) ?? emptyStructureRungs();
        if (frameId && !canGuidedProduceStructure(rungs)) {
          addFinding({
            rule: 2,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: `exposição + (completion|build) de ${frameId}`,
            requiredPreviousExperience:
              "Ver/ouvir o padrão e montar (fill_blank ou sentence_build) antes da produção guiada.",
          });
        }

        // R7: recognize → free (só recognize-like no histórico do frame)
        if (
          frameId &&
          frameRecognizeOnly.has(frameId) &&
          !frameHadBuildOrCompletion.has(frameId) &&
          !(rungs.completion || rungs.build)
        ) {
          addFinding({
            rule: 7,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: `montagem/completion de ${frameId} entre reconhecimento e free_production`,
            requiredPreviousExperience:
              "Não saltar recognize/comprehend → free_production. Incluir sentence_build ou fill_blank.",
          });
        }

        // R6: 1ª free com scaffold
        if (frameId && !seenGuidedFrame.has(frameId)) {
          seenGuidedFrame.add(frameId);
          const help = resolveProductionHelpPlan({
            kind: "free_production",
            firstOfStructure: false,
            attemptNumber: 0,
          });
          const helpLevel = step.productionHelpInitial ?? help.initial;
          const hasScaffold =
            helpLevel >= 1 ||
            Boolean(step.patternPt?.trim()) ||
            Boolean(step.patternSlots?.length) ||
            step.productionAssist === "guided";
          if (!hasScaffold) {
            addFinding({
              rule: 6,
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              lessonIndex: i,
              stepKind: step.kind,
              stepTitle: title,
              activity,
              missingPrerequisite: "scaffold de produção (padrão / help ≥ 1 / assist guided)",
              requiredPreviousExperience:
                "Primeira free_production da estrutura deve mostrar o padrão ou apoio equivalente.",
            });
          }
        }
      }

      if (step.kind === "free_production" && step.productionOpen) {
        if (!canOpenProduceGoal(step.productionGoal, bundle.forTransfer)) {
          addFinding({
            rule: 2,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: `guided production prévia do objetivo ${step.productionGoal ?? "?"}`,
            requiredPreviousExperience:
              "Produção aberta só depois de free_production guiada de algum frame do mesmo objetivo.",
          });
        }
      }

      // ——— R5: cobrança sem apoio no 1º contato do glifo ———
      if (UNSUPPORTED_FIRST_KINDS.has(step.kind) && target) {
        // Só glifos que não estavam no currículo anterior NEM no autoral desta lição.
        const brandNew = [...target].filter(
          (ch) => CJK_RE.test(ch) && !glyphsBefore.has(ch) && !authoredGlyphs.has(ch) && !glyphsIntroducedWithSupport.has(ch)
        );
        if (brandNew.length > 0) {
          addFinding({
            rule: 5,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: `apresentação apoiada de ${[...new Set(brandNew)].join("")} antes de cobrar`,
            requiredPreviousExperience:
              "Introduzir com listen/flash/recognize (apoio) antes de free/transfer/ditado/escrita.",
          });
        }
      }

      // ——— R9: onboarding L1–L20 ———
      if (i < ONBOARDING_LESSON_COUNT) {
        if (step.kind === "transfer_task" && i < 10) {
          addFinding({
            rule: 9,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: "base de chunks + construção guiada (onboarding)",
            requiredPreviousExperience:
              "L1–L10: sem transfer_task. Priorizar reconhecimento, chunks e montagem.",
          });
        }
        if (step.kind === "free_production" && step.productionOpen && i < 15) {
          addFinding({
            rule: 9,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: "produção guiada estável no onboarding",
            requiredPreviousExperience: "L1–L15: sem produção aberta.",
          });
        }
        if (step.kind === "free_production" && !step.productionOpen && i < 5) {
          addFinding({
            rule: 9,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: "reconhecimento + chunks + montagem (fundamentos)",
            requiredPreviousExperience: "L1–L5: sem free_production; foco em conceito e reconhecimento.",
          });
        }
        if (
          (step.kind === "dictation" || step.kind === "dragon_dictation" || step.kind === "write") &&
          i < 5
        ) {
          addFinding({
            rule: 9,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: "reconhecimento auditivo + leitura de chunks",
            requiredPreviousExperience: "L1–L5: sem ditado/escrita gerados.",
          });
        }
        if (
          foundationIds.has(lesson.id) &&
          step.generated &&
          (step.kind === "transfer_task" ||
            step.kind === "free_production" ||
            step.kind === "dictation" ||
            step.kind === "conversation_scene")
        ) {
          addFinding({
            rule: 9,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex: i,
            stepKind: step.kind,
            stepTitle: title,
            activity,
            missingPrerequisite: "lição de conceito sem drills avançados gerados",
            requiredPreviousExperience:
              "Lições FOUNDATION (o-que-e-…): só conteúdo autoral leve de conceito.",
          });
        }
      }

      // ——— Rótulos técnicos na UI de produção (R4 + R10) ———
      if (
        (step.kind === "transfer_task" || step.kind === "free_production") &&
        step.patternSlots?.length
      ) {
        const assumed = conceptsAssumedByFrame(
          step.productionFrameId ?? "",
          step.patternSlots,
          step.patternPt
        );
        for (const conceptId of assumed) {
          const stage = conceptLabelStage(conceptId, lesson.id);
          const label = formatConceptLabel(conceptId, lesson.id);
          if (stage === "intuitive" && /sujeito|verbo|objeto|part[ií]cula/i.test(label)) {
            addFinding({
              rule: 4,
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              lessonIndex: i,
              stepKind: step.kind,
              stepTitle: title,
              activity,
              missingPrerequisite: `rótulo intuitivo para ${conceptId} (ainda pré-intro)`,
              requiredPreviousExperience: `Antes de ${STRUCTURAL_CONCEPTS.find((c) => c.id === conceptId)?.introducedAt}: usar quem/ação/coisa, não o termo técnico.`,
            });
          }
        }
      }

      // ——— Atualiza estado intra-lição / global após o step ———
      if (SUPPORTIVE_INTRO_KINDS.has(step.kind) && target) {
        for (const ch of target) {
          if (CJK_RE.test(ch)) glyphsIntroducedWithSupport.add(ch);
        }
      }

      for (const frame of matchedFrames) {
        if (RECOGNIZE_ONLY_KINDS.has(step.kind)) {
          if (!frameHadBuildOrCompletion.has(frame.id)) {
            frameRecognizeOnly.add(frame.id);
          }
        }
        if (BUILD_KINDS.has(step.kind)) {
          frameHadBuildOrCompletion.add(frame.id);
          frameRecognizeOnly.delete(frame.id);
        }
      }

      creditStructureFromStep(intra, step);
    }

    // Glifos já no currículo anterior ficam disponíveis como “apresentados”.
    for (const ch of glyphsBefore) {
      glyphsIntroducedWithSupport.add(ch);
    }
  }

  // Deduplicar findings idênticos (mesmo lesson/step/rule/missing)
  const seen = new Set();
  const unique = [];
  for (const f of findings) {
    const key = `${f.rule}|${f.lessonId}|${f.stepKind}|${f.stepTitle}|${f.activity}|${f.missingPrerequisite}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }
  findings.length = 0;
  findings.push(...unique);

  const byRule = new Map();
  for (const f of findings) {
    byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
  }

  const ruleTitles = {
    1: "transfer_task antes de prática guiada suficiente",
    2: "free_production antes de exposição adequada",
    3: "sentence_build com estrutura ainda não apresentada",
    4: "termos técnicos antes de introducedAt",
    5: "conceito novo cobrado sem apoio na apresentação",
    6: "1ª ocorrência de estrutura sem scaffold adequado",
    7: "salto recognize → free production",
    8: "salto vocabulary exposure → transfer",
    9: "L1–L20 fora do onboarding",
    10: "prerequisites indisponíveis no ponto da atividade",
  };

  const lines = [
    "# Relatório: progressão de prerequisites",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
    "## Objetivo",
    "",
    "Impedir que atividades avançadas apareçam antes dos pré-requisitos pedagógicos reais.",
    "",
    "## Regras",
    "",
    "| # | Regra | Achados |",
    "|---|-------|--------:|",
  ];
  for (let r = 1; r <= 10; r += 1) {
    lines.push(`| ${r} | ${ruleTitles[r]} | ${byRule.get(r) ?? 0} |`);
  }

  lines.push(
    "",
    "## Achados",
    "",
    "| lesson | step | activity | missing prerequisite | required previous experience |",
    "|--------|------|----------|----------------------|------------------------------|"
  );

  if (findings.length === 0) {
    lines.push("| — | — | — | (nenhum) | Progressão ok. |");
  } else {
    for (const f of findings) {
      const step = f.stepTitle ? `${f.stepKind} · ${f.stepTitle}` : f.stepKind;
      lines.push(
        `| \`${f.lessonId}\` (R${f.rule}) | ${step.replace(/\|/g, "/")} | ${f.activity.replace(/\|/g, "/")} | ${f.missingPrerequisite.replace(/\|/g, "/")} | ${f.requiredPreviousExperience.replace(/\|/g, "/")} |`
      );
    }
  }

  lines.push(
    "",
    "## Contagens",
    "",
    `| Métrica | Valor |`,
    `|---------|------:|`,
    `| Lições auditadas | ${ALL_LESSONS.length} |`,
    `| Achados | ${findings.length} |`,
    ""
  );

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines), "utf8");

  if (findings.length > 0) {
    console.error(`\nvalidate:prerequisite-progression: ${findings.length} problema(s):`);
    for (const f of findings.slice(0, 40)) {
      console.error(
        `- [R${f.rule}] ${f.lessonId} · ${f.activity}: ${f.missingPrerequisite}`
      );
    }
    if (findings.length > 40) console.error(`...mais ${findings.length - 40}.`);
    process.exitCode = 1;
  } else {
    console.log(
      `OK: validate:prerequisite-progression (${ALL_LESSONS.length} lições · 0 achados).`
    );
  }
  console.log(`Relatório: ${reportPath}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
