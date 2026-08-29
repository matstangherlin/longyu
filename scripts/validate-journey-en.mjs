#!/usr/bin/env node
/**
 * V4.8.3 — fail-closed English overlay for teaching topics 1–50 (M1–M4).
 * Topics 51+ may still fall back to pt-BR. Canonical Chinese stays overlay-free.
 */
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);

const memory = new Map();
globalThis.document = {
  documentElement: { lang: "", dataset: {} },
};
globalThis.localStorage = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  setItem(key, value) {
    memory.set(String(key), String(value));
  },
  removeItem(key) {
    memory.delete(key);
  },
  clear() {
    memory.clear();
  },
};

const STRING_FIELDS = [
  "title",
  "body",
  "prompt",
  "promptPt",
  "pt",
  "targetMeaningPt",
  "explanation",
  "situationPt",
  "patternPt",
  "productionHintPt",
  "groupLabelPt",
  "contrastLabel",
  "suggestion",
  "dialoguePrompt",
  "placeholder",
  "speaker",
  "sourceMeaning",
  "answer",
  "correctAnswer",
  "blankAnswer",
];

const PT_STOP =
  /\b(você|voce|qual|lição|licao|monte|escolha|significa|obrigad|até|ate logo|estou|tudo bem|agora|para|com|uma|não|nao|sim|então|entao|também|tambem|depois|quando|porque|como|onde|quem|isto|isso|aqui|ali|muito|pouco|fazer|diga|complete|continue|continuar|começar|comecar|verificar|pular)\b/i;

const CHROME_LEFTOVERS = [
  { file: "src/features/lesson/LessonPlayer.tsx", needles: ["Cargas do Dragão", "Rever resultados", "Lição bloqueada por hoje", "Escudo de sequência x", "Treino de tons", "Abrir treino de tons", "Voltar à jornada"] },
  { file: "src/features/lesson/steps.tsx", needles: [">Áudio lento<", "Não posso ouvir agora", "Atalhos: use 1-9", 'aria-label="Ouvir"', ">Ouvir devagar<", ">Ouvir normal<", ">Entenda<", ">Ouça e imite<"] },
  { file: "src/lib/useExerciseHotkeys.tsx", needles: ["Atalhos: use 1-9 para responder.", "Atalhos: 1-5 na esquerda"] },
  { file: "src/features/revisao/RevisaoPage.tsx", needles: ['label="Revisão de hoje"', ">Plano de hoje<", ">Fila inteligente<", "Em dia", "Histórico completo", 'label="Pendentes"', '"Confira a resposta"', '"Erro corrigido!"', '"Escolha o par"', '"Errei — continuar"', '"Conferir resposta"', '"Ajustar dificuldade (Errei / Difícil / Bom / Fácil)"', '"Toque nas peças abaixo"', '"Este cartão avaliou"', '"Histórico e padrões de erro"'] },
  { file: "src/features/lesson/LessonDetailPage.tsx", needles: ["no Treino de tons com nota mínima"] },
  { file: "src/features/journey/JourneyPage.tsx", needles: ["no Treino de tons com nota mínima"] },
  { file: "src/features/lesson/ConversationSceneStep.tsx", needles: [">Sua vez<", '"Toque para ouvir"', "A conversa travou", "Esta cena ainda não tem falas."] },
];

function collectFromStep(step, bag) {
  const add = (value, field) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!bag.has(trimmed)) bag.set(trimmed, new Set());
    bag.get(trimmed).add(field);
  };
  for (const field of STRING_FIELDS) add(step[field], field);
  for (const option of step.options ?? []) add(option, "options");
  for (const piece of step.wordBank ?? []) add(piece, "wordBank");
  for (const piece of step.bank ?? []) add(piece, "bank");
  for (const piece of step.target ?? []) add(piece, "target");
  for (const piece of step.targetParts ?? []) add(piece, "targetParts");
  for (const piece of step.distractors ?? []) add(piece, "distractors");
  for (const acc of step.accepts ?? []) add(acc, "accepts");
  for (const pair of step.pairs ?? []) {
    add(pair.left, "pairs.left");
    add(pair.right, "pairs.right");
  }
  for (const line of step.lines ?? []) add(line.pt, "lines.pt");
  if (step.optionMeta) {
    for (const meta of Object.values(step.optionMeta)) add(meta?.meaningPt, "optionMeta.meaningPt");
  }
  for (const reveal of step.pairReveal ?? []) add(reveal.meaningPt, "pairReveal.meaningPt");
  for (const node of step.nodes ?? []) {
    add(node.pt, "nodes.pt");
    if (node.interaction) {
      add(node.interaction.prompt, "nodes.prompt");
      add(node.interaction.correctAnswer, "nodes.correctAnswer");
      add(node.interaction.explanation, "nodes.explanation");
      for (const option of node.interaction.options ?? []) add(option, "nodes.options");
      for (const acc of node.interaction.accepts ?? []) add(acc, "nodes.accepts");
    }
  }
  if (step.checkpoint) {
    add(step.checkpoint.prompt, "checkpoint.prompt");
    add(step.checkpoint.correctAnswer, "checkpoint.correctAnswer");
    add(step.checkpoint.explanation, "checkpoint.explanation");
    for (const option of step.checkpoint.options ?? []) add(option, "checkpoint.options");
  }
}

function collectBuilder(builder, bag) {
  if (!builder) return;
  const add = (value, field) => {
    if (typeof value !== "string" || !value.trim()) return;
    if (!bag.has(value.trim())) bag.set(value.trim(), new Set());
    bag.get(value.trim()).add(field);
  };
  add(builder.promptPt, "builder.promptPt");
  add(builder.meaningPt, "builder.meaningPt");
  add(builder.hintPt, "builder.hintPt");
  add(builder.explanationPt, "builder.explanationPt");
  add(builder.relatedPt, "builder.relatedPt");
  add(builder.errorHintPt, "builder.errorHintPt");
  add(builder.context?.sentencePt, "builder.sentencePt");
  for (const piece of builder.components ?? []) {
    add(piece.label, "builder.glyphLabel");
    add(piece.rolePt, "builder.rolePt");
  }
}

function classifyBag(bag, gloss) {
  const missing = [];
  const leaked = [];
  for (const [pt, fields] of bag.entries()) {
    if (gloss.hasEnglishOverlay(pt)) {
      const en = gloss.resolveInstructionText(pt, "en");
      if (PT_STOP.test(en) && /[àáãâéêíóôõúç]/.test(en) && !gloss.isCanonicalZhOrPinyin(en)) {
        leaked.push({ pt, en, fields: [...fields] });
      }
      continue;
    }
    if (gloss.isCanonicalZhOrPinyin(pt)) continue;
    if (/^(Longyu|Matheus|Mei|Qi|Pro|left|right|straight|same|different|[AB])$/i.test(pt)) continue;
    if (/^\d+([./]\d+)?$/.test(pt)) continue;
    if (/^[A-Za-z0-9][A-Za-z0-9+\-./]{0,18}$/.test(pt) && !PT_STOP.test(pt) && !/[àáãâéêíóôõúç]/i.test(pt)) {
      continue;
    }
    missing.push({ pt, fields: [...fields].sort() });
  }
  return { missing, leaked };
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-journey-en-"));
try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/topicMastery.ts",
      "src/data/topicMasterySpecs.ts",
      "src/data/hanziBuilder.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/i18n/overlays/instructionGloss.ts",
      "src/i18n/overlays/localizeLesson.ts",
      "src/i18n/overlays/teachingTopics.ts",
      "src/i18n/overlays/first20.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: root,
      outDir,
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou validate:journey-en");

  await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
  await copyFile(
    path.join(root, "src/i18n/overlays/instructionGloss.en.json"),
    path.join(outDir, "src/i18n/overlays/instructionGloss.en.json")
  );

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS, JOURNEY } = load("src/data/journey.js");
  const topic = load("src/data/topicMastery.js");
  const { topicMasterySpecFor } = load("src/data/topicMasterySpecs.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { getHanziBuilder } = load("src/data/hanziBuilder.js");
  const { CHARACTERS } = load("src/data/characters.js");
  const { CHUNKS } = load("src/data/chunks.js");
  const teaching = load("src/i18n/overlays/teachingTopics.js");
  const gloss = load("src/i18n/overlays/instructionGloss.js");
  const localize = load("src/i18n/overlays/localizeLesson.js");

  const allTeaching = ALL_LESSONS.filter((lesson) => topic.isTopicMasteryLesson(lesson));
  const first50 = allTeaching.slice(0, 50);
  const rest = allTeaching.slice(50);
  if (first50.length !== 50) fail(`expected 50 teaching topics 1–50, got ${first50.length}`);
  const actualIds = first50.map((lesson) => lesson.id);
  const expectedIds = [...teaching.TOPICS_1_50_TEACHING_TOPIC_IDS];
  if (actualIds.join("|") !== expectedIds.join("|")) {
    fail(`topics 1–50 ids drifted: ${actualIds.join(", ")}`);
  }
  const expected2150 = [...teaching.TOPICS_21_50_TEACHING_TOPIC_IDS];
  const actual2150 = allTeaching.slice(20, 50).map((lesson) => lesson.id);
  if (actual2150.join("|") !== expected2150.join("|")) {
    fail(`topics 21–50 ids drifted vs teachingTopics.ts`);
  }

  function harvest(lessons) {
    const bag = new Map();
    const fingerprints = [];
    const walkIssues = [];
    const lexicalIds = { chars: new Set(), chunks: new Set() };
    for (const lesson of lessons) {
      for (const pass of [1, 2, 3, 4]) {
        const plan = lessonRoundStepsFor(lesson, {
          silent: true,
          attemptNumber: 0,
          masteryLevel: pass - 1,
          masteryPass: pass,
        });
        if (!plan.length) fail(`${lesson.id} M${pass}: empty plan`);
        for (const step of plan) {
          collectFromStep(step, bag);
          collectBuilder(getHanziBuilder(step.builderId), bag);
          const localized = localize.localizeLessonStep(step, "en");
          fingerprints.push({
            lessonId: lesson.id,
            pass,
            kind: step.kind,
            fp: localize.canonicalStepFingerprint(step),
            localizedFp: localize.canonicalStepFingerprint(localized),
          });
          const answer = typeof step.answer === "string" ? step.answer : typeof step.correctAnswer === "string" ? step.correctAnswer : "";
          if (answer && !gloss.isCanonicalZhOrPinyin(answer)) {
            const enAnswer = typeof localized.answer === "string" ? localized.answer : localized.correctAnswer;
            if (enAnswer && PT_STOP.test(enAnswer) && /[àáãâéêíóôõúç]/.test(enAnswer)) {
              walkIssues.push(`${lesson.id} M${pass} ${step.kind}: EN still requires Portuguese answer ${JSON.stringify(enAnswer)}`);
            }
            if (enAnswer && !gloss.scoredAnswersMatch(enAnswer, answer)) {
              walkIssues.push(`${lesson.id} M${pass} ${step.kind}: EN answer does not match PT identity`);
            }
          }
          if (step.charId) lexicalIds.chars.add(step.charId);
          if (step.chunkId) lexicalIds.chunks.add(step.chunkId);
          for (const ref of [...(step.learnedRefs ?? []), ...(step.newRefs ?? []), ...(lesson.libraryItems ?? [])]) {
            if (ref.startsWith("char:")) lexicalIds.chars.add(ref.slice(5));
            if (ref.startsWith("chunk:")) lexicalIds.chunks.add(ref.slice(6));
          }
        }
      }
      collectFromStep({ title: lesson.title }, bag);
      collectFromStep({ title: lesson.unitTitle, body: lesson.phaseTitle }, bag);
      const spec = topicMasterySpecFor(lesson);
      if (spec) {
        collectFromStep({ title: spec.promise }, bag);
        for (const text of spec.mustUnderstand ?? []) collectFromStep({ body: text }, bag);
        for (const text of spec.mustRecognize ?? []) collectFromStep({ body: text }, bag);
        for (const text of spec.mustProduce ?? []) collectFromStep({ body: text }, bag);
        for (const text of spec.mustTransfer ?? []) collectFromStep({ body: text }, bag);
        for (const text of spec.commonMisconceptions ?? []) collectFromStep({ body: text }, bag);
        for (const text of Object.values(spec.passObjectives ?? {})) collectFromStep({ body: text }, bag);
      }
    }
    for (const phase of JOURNEY.filter((item) =>
      lessons.some((lesson) => lesson.phaseId === item.id || lesson.phaseTitle === item.title)
    )) {
      collectFromStep({ title: phase.title, body: phase.why }, bag);
      for (const unit of phase.units ?? []) {
        if (lessons.some((lesson) => lesson.unitId === unit.id || lesson.unitTitle === unit.title)) {
          collectFromStep({ title: unit.title, body: unit.subtitle, prompt: unit.goal }, bag);
        }
      }
    }
    for (const row of CHARACTERS.filter((item) => lexicalIds.chars.has(item.id))) {
      collectFromStep({ pt: row.meaningPt, explanation: row.mnemonicPt }, bag);
    }
    for (const row of CHUNKS.filter((item) => lexicalIds.chunks.has(item.id))) {
      collectFromStep({ pt: row.meaningPt, explanation: row.literalPt }, bag);
    }
    return { bag, fingerprints, walkIssues, uniqueStrings: bag.size };
  }

  const harvested = harvest(first50);
  const { missing, leaked } = classifyBag(harvested.bag, gloss);
  const fpDrift = harvested.fingerprints.filter((row) => row.fp !== row.localizedFp);
  if (fpDrift.length) {
    fail(
      `canonical fingerprint changed after EN overlay (${fpDrift.length}): ${fpDrift
        .slice(0, 5)
        .map((row) => `${row.lessonId} M${row.pass} ${row.kind}`)
        .join("; ")}`
    );
  }
  if (missing.length) {
    fail(`missing EN overlay for ${missing.length} topic 1–50 strings`);
    for (const row of missing.slice(0, 40)) fail(`  • ${JSON.stringify(row.pt)} [${row.fields.join(", ")}]`);
    if (missing.length > 40) fail(`  … ${missing.length - 40} more`);
  }
  if (leaked.length) {
    fail(`EN overlay still returns Portuguese for ${leaked.length} strings`);
    for (const row of leaked.slice(0, 12)) fail(`  • ${JSON.stringify(row.pt)}`);
  }
  for (const issue of harvested.walkIssues.slice(0, 20)) fail(issue);
  if (harvested.walkIssues.length > 20) fail(`  … ${harvested.walkIssues.length - 20} more walk issues`);

  const later = harvest(rest);
  const laterClass = classifyBag(later.bag, gloss);

  for (const row of CHROME_LEFTOVERS) {
    const source = await readFile(path.join(root, row.file), "utf8");
    for (const needle of row.needles) {
      if (source.includes(needle)) fail(`${row.file} still contains leftover chrome ${JSON.stringify(needle)}`);
    }
  }

  const board = {
    "1-20": missing.length === 0 && leaked.length === 0 ? "READY" : "FAIL",
    "21-50": missing.length === 0 && leaked.length === 0 ? "READY" : "FAIL",
    "51-113": laterClass.missing.length === 0 ? "READY" : "NOT_YET_LOCALIZED",
  };

  const report = {
    generatedAt: new Date().toISOString(),
    teachingTopicCount: allTeaching.length,
    topicIds: actualIds,
    topics2150: actual2150,
    uniqueStrings: harvested.uniqueStrings,
    missingCount: missing.length,
    leakCount: leaked.length,
    fingerprintDrift: fpDrift.length,
    walkIssueCount: harvested.walkIssues.length,
    laterMissingCount: laterClass.missing.length,
    progressBoard: board,
    missing: missing.slice(0, 80),
  };
  await mkdir(path.join(root, "docs/reports"), { recursive: true });
  await writeFile(path.join(root, "docs/reports/v483-journey-en-gate.json"), JSON.stringify(report, null, 2));
  await writeFile(
    path.join(root, "docs/reports/v483-english-journey-progress.json"),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        rule: "ALL_LESSONS.filter(isTopicMasteryLesson)",
        teachingTopicCount: allTeaching.length,
        EnglishJourney: {
          "1-20": board["1-20"],
          "21-50": board["21-50"],
          "51-113": board["51-113"],
        },
        laterMissingSample: laterClass.missing.slice(0, 12).map((row) => row.pt),
      },
      null,
      2
    )
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`validate:journey-en FAIL (${failures.length})`);
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}
console.log("validate:journey-en PASS");
