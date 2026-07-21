/**
 * validate:conversation-pedagogy
 *
 * Audita o catálogo e o plano real entregue ao player, gera um relatório
 * rastreável e falha para qualquer critério bloqueador.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import {
  validateConversationPedagogy,
  summarizeConversationMetrics,
  normalizeConversationText,
} from "./lib/conversation-pedagogy-core.mjs";
import {
  appVersion,
  currentCommitSha,
  finalizeReport,
  journeyFingerprint,
} from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/conversation-pedagogy-report.md");
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-conversation-pedagogy-"));

function countRows(map) {
  return [...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]), "pt-BR"));
}

function refsInStep(step, catalogItems) {
  const refs = new Set();
  if (step.charId) refs.add("char:" + step.charId);
  for (const id of step.charIds ?? []) refs.add("char:" + id);
  if (step.chunkId) refs.add("chunk:" + step.chunkId);
  for (const ref of [...(step.learnedRefs ?? []), ...(step.newRefs ?? [])]) refs.add(ref);
  const blob = normalizeConversationText([
    step.text,
    step.hanzi,
    step.answer,
    step.audioText,
    step.sourceText,
    step.correctAnswer,
    step.blankAnswer,
    step.sentenceBefore,
    step.sentenceAfter,
    step.target?.join(""),
    step.targetParts?.join(""),
    ...(step.options ?? []),
    ...(step.bank ?? []),
    ...(step.lines ?? []).map((line) => line.hanzi),
  ].filter(Boolean).join(" "));
  for (const item of catalogItems) {
    const text = normalizeConversationText(item.text);
    if (text && blob.includes(text)) refs.add(item.ref);
  }
  return refs;
}

function variantMinPhase(scene, learnedRefs) {
  const same = (a, b) => a.length === b.length && a.every((ref) => b.includes(ref));
  const variant = (scene.variants ?? []).find((candidate) => same(candidate.learnedRefs ?? [], learnedRefs ?? []));
  return variant?.minPhaseOrder ?? 0;
}

function layerManifest(buildManifestForResolvedVariant, conversationSceneMainPath, scene, layer, stage) {
  const nodes = layer.nodes ?? [];
  const lines = conversationSceneMainPath(nodes, layer.entryNodeId).map((node) => ({
    speakerId: node.speakerId,
    hanzi: node.hanzi,
    pinyin: node.pinyin,
    pt: node.pt,
    emotion: node.emotion,
    audioText: node.audioText,
  }));
  return buildManifestForResolvedVariant(scene, {
    nodes,
    entryNodeId: layer.entryNodeId,
    lines,
    learnedRefs: layer.learnedRefs ?? [],
    newRefs: layer.newRefs ?? [],
    stage,
    minPhaseOrder: layer.minPhaseOrder ?? 0,
  });
}

function suggestionsFor(failures) {
  const suggestions = new Set();
  const codes = new Set(failures.map((failure) => failure.code));
  if ([...codes].some((code) => code.includes("NODE") || code.includes("LOOP") || code.includes("ERROR_BRANCH"))) {
    suggestions.add("Corrigir o grafo V2 e garantir que todo erro ofereça reparo antes de um final alcançável.");
  }
  if ([...codes].some((code) => code.includes("VOCABULARY") || code.includes("CANONICAL") || code.includes("CATALOG"))) {
    suggestions.add("Cadastrar o item no corpus, posicioná-lo no currículo e gerar uma tarefa posterior transformativa.");
  }
  if (codes.has("MAIN_ANSWER_NOT_REUSED") || codes.has("NO_COGNITIVE_TRANSFORMATION")) {
    suggestions.add("Reutilizar a resposta principal em produção, montagem ou aplicação contextual.");
  }
  if (codes.has("INTENT_DOMINANCE") || codes.has("REPEATED_SITUATION") || codes.has("CONSECUTIVE_SCENE_REPEAT")) {
    suggestions.add("Diversificar cenário e intenção ou registrar uma justificativa autoral explícita.");
  }
  if (codes.has("ADVANCED_VARIANT_TOO_EARLY")) {
    suggestions.add("Aumentar o gate de fase e reduzir os pré-requisitos da variante beginner.");
  }
  if (suggestions.size === 0) suggestions.add("Manter o portão na cadeia validate:beta e revisar tendências do relatório a cada mudança curricular.");
  return [...suggestions];
}

function reportList(lines, title, values, empty = "Nenhum.") {
  lines.push("## " + title, "");
  if (values.length === 0) lines.push(empty, "");
  else {
    for (const value of values) lines.push("- " + value);
    lines.push("");
  }
}

try {
  const entries = [
    "src/data/conversationScenes.ts",
    "src/data/conversationVocabulary.ts",
    "src/data/journey.ts",
    "src/data/characters.ts",
    "src/data/chunks.ts",
    "src/data/types.ts",
    "src/features/lesson/lessonTasks.ts",
    "src/features/lesson/lessonNovelty.ts",
  ];
  const program = ts.createProgram(entries, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("Falha ao compilar os dados da jornada.");

  const load = (relative) => require(path.join(outDir, relative));
  const {
    CONVERSATION_SCENES,
    conversationSceneMainPath,
  } = load("src/data/conversationScenes.js");
  const {
    buildManifestForResolvedVariant,
    reusableRefsFromManifest,
  } = load("src/data/conversationVocabulary.js");
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { CHARACTERS } = load("src/data/characters.js");
  const { CHUNKS } = load("src/data/chunks.js");
  const {
    lessonRoundStepsFor,
    manifestFromConversationStep,
  } = load("src/features/lesson/lessonTasks.js");
  const { cognitiveTransformation } = load("src/features/lesson/lessonNovelty.js");

  const catalogItems = [
    ...CHARACTERS.map((item) => ({ ref: "char:" + item.id, text: item.hanzi })),
    ...CHUNKS.map((item) => ({ ref: "chunk:" + item.id, text: item.hanzi })),
  ];
  const catalogRefs = new Set(catalogItems.map((item) => item.ref));

  const sceneManifests = new Map();
  for (const scene of CONVERSATION_SCENES) {
    const manifests = [
      layerManifest(buildManifestForResolvedVariant, conversationSceneMainPath, scene, scene, "advanced"),
      ...(scene.variants ?? []).map((variant) =>
        layerManifest(buildManifestForResolvedVariant, conversationSceneMainPath, scene, variant, variant.stage)
      ),
    ];
    sceneManifests.set(scene.sceneId, manifests);
  }

  const authoredPlacements = [];
  const authoredUseCounts = new Map();
  const knownRefs = new Set();
  for (const lesson of ALL_LESSONS) {
    for (const step of lesson.steps ?? []) {
      if (step.kind === "conversation_scene" && step.sceneId) {
        authoredPlacements.push({ lessonId: lesson.id, sceneId: step.sceneId, knownRefs: new Set(knownRefs) });
        authoredUseCounts.set(step.sceneId, (authoredUseCounts.get(step.sceneId) ?? 0) + 1);
      }
      for (const ref of refsInStep(step, catalogItems)) knownRefs.add(ref);
    }
    for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) knownRefs.add(ref);
  }

  const sceneById = new Map(CONVERSATION_SCENES.map((scene) => [scene.sceneId, scene]));
  const plans = [];
  const srsCoveredRefs = new Set();
  let recentSceneIds = [];
  let recentIntentIds = [];
  for (const lesson of ALL_LESSONS) {
    const raw = lessonRoundStepsFor(lesson, {
      silent: true,
      recentConversationSceneIds: recentSceneIds,
      recentConversationIntentIds: recentIntentIds,
    });
    const steps = raw.map((step) => ({ ...step }));
    const manifests = new Map();
    let activeConversation = null;
    steps.forEach((step, index) => {
      if (step.kind === "conversation_scene") {
        activeConversation = step;
        const manifest = manifestFromConversationStep(step);
        if (manifest) {
          manifests.set(index, manifest);
          for (const ref of reusableRefsFromManifest(manifest)) srsCoveredRefs.add(ref);
        }
        const scene = sceneById.get(step.sceneId);
        if (scene) step.__variantMinPhase = variantMinPhase(scene, step.learnedRefs ?? scene.learnedRefs);
      } else if (step.conversationDerived && activeConversation) {
        step.__transformsConversation = cognitiveTransformation(activeConversation, step);
      }
    });
    const generated = steps.filter((step) => step.kind === "conversation_scene" && step.generated && step.sceneId);
    for (const step of generated) {
      const scene = sceneById.get(step.sceneId);
      recentSceneIds = [step.sceneId, ...recentSceneIds.filter((id) => id !== step.sceneId)].slice(0, 10);
      if (scene?.intent) recentIntentIds = [scene.intent, ...recentIntentIds.filter((id) => id !== scene.intent)].slice(0, 10);
    }
    plans.push({ lessonId: lesson.id, phaseOrder: lesson.phaseOrder ?? 0, steps, manifests });
  }

  const environmentCommit = process.env.GITHUB_SHA?.trim()
  const commit = /^[0-9a-f]{40}$/i.test(environmentCommit ?? "")
    ? environmentCommit
    : currentCommitSha(rootDir)

  const provenance = {
    commit,
    version: appVersion(rootDir),
    date: new Date().toISOString(),
    lessonCount: ALL_LESSONS.length,
    journeyHash: journeyFingerprint(rootDir),
  };
  const result = validateConversationPedagogy({
    scenes: CONVERSATION_SCENES,
    lessons: ALL_LESSONS,
    plans,
    catalogRefs,
    sceneManifests,
    authoredPlacements,
    authoredUseCounts,
    srsCoveredRefs,
    provenance,
  });
  const summary = summarizeConversationMetrics(result);
  const unresolved = result.failures.filter((failure) =>
    ["TEXT_OUTSIDE_CATALOG", "MISSING_CANONICAL_REFERENCE"].includes(failure.code)
  );
  const suggestions = suggestionsFor(result.failures);
  const pct = summary.coveragePercent.toFixed(1) + "%";
  const lines = [
    "# Relatório de pedagogia das conversas",
    "",
    "## Procedência",
    "",
    "| Campo | Valor |",
    "|-------|-------|",
    "| Commit | " + provenance.commit + " |",
    "| Versão do app | " + provenance.version + " |",
    "| Gerado em | " + provenance.date + " |",
    "| Lições | " + provenance.lessonCount + " |",
    "| Hash da Jornada | " + provenance.journeyHash + " |",
    "",
    "## Resumo",
    "",
    "| Indicador | Valor |",
    "|-----------|------:|",
    "| Número de cenas | " + summary.sceneCount + " |",
    "| Média de falas | " + summary.averageLines.toFixed(2) + " |",
    "| Média de intervenções | " + summary.averageInterventions.toFixed(2) + " |",
    "| Número de ramificações | " + summary.branchCount + " |",
    "| Número de finais | " + summary.endingCount + " |",
    "| Vocabulário total exibido (refs únicas no plano real) | " + summary.vocabularyTotal + " |",
    "| Vocabulário coberto por tarefas posteriores (plano ou SRS) | " + summary.vocabularyCovered + " |",
    "| Porcentagem de cobertura | " + pct + " |",
    "| Palavras novas (refs únicas) | " + summary.newWordCount + " |",
    "| Média de reutilizações por ref exibida | " + summary.averageReuse.toFixed(2) + " |",
    "",
    "## Cenas mais curtas",
    "",
    "| Cena | Falas | Intervenções |",
    "|------|------:|-------------:|",
    ...summary.shortest.map((item) => "| " + item.sceneId + " | " + item.lines + " | " + item.interventions + " |"),
    "",
    "## Cenas mais longas",
    "",
    "| Cena | Falas | Intervenções |",
    "|------|------:|-------------:|",
    ...summary.longest.map((item) => "| " + item.sceneId + " | " + item.lines + " | " + item.interventions + " |"),
    "",
    "## Cenas com maior repetição no plano real",
    "",
    "| Cena | Usos |",
    "|------|-----:|",
    ...summary.mostRepeated.map(([sceneId, count]) => "| " + sceneId + " | " + count + " |"),
    "",
    "## Cenas por cenário",
    "",
    "| Cenário | Cenas |",
    "|---------|------:|",
    ...countRows(summary.bySetting).map(([setting, count]) => "| " + setting + " | " + count + " |"),
    "",
    "## Cenas por intenção",
    "",
    "| Intenção | Cenas |",
    "|----------|------:|",
    ...countRows(summary.byIntent).map(([intent, count]) => "| " + intent + " | " + count + " |"),
    "",
  ];
  reportList(lines, "Itens não resolvidos", unresolved.map((item) => "[" + item.code + "] " + item.ref + ": " + item.message));
  reportList(lines, "Falhas", result.failures.map((item) => "[" + item.code + "] " + item.ref + ": " + item.message));
  reportList(lines, "Warnings", result.warnings.map((item) => "[" + item.code + "] " + item.ref + ": " + item.message));
  reportList(lines, "Sugestões", suggestions);

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines), "utf8");

  if (result.failures.length) {
    console.error("validate:conversation-pedagogy encontrou " + result.failures.length + " falha(s):");
    for (const failure of result.failures.slice(0, 80)) {
      console.error("- [" + failure.code + "] " + failure.ref + ": " + failure.message);
    }
    if (result.failures.length > 80) console.error("...mais " + (result.failures.length - 80) + ".");
    process.exitCode = 1;
  } else {
    console.log(
      "OK: validate:conversation-pedagogy passou (" +
        summary.sceneCount + " cenas · " +
        summary.averageLines.toFixed(2) + " falas/cena · " +
        summary.vocabularyCovered + "/" + summary.vocabularyTotal + " refs cobertas)."
    );
  }
  console.log("Relatório: " + reportPath);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
