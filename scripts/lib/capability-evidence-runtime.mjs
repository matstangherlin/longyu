/**
 * RC2.2.9 — carrega a Jornada real e monta os planos que o aluno recebe.
 *
 * O planner (`lessonRoundStepsFor`) depende do estado do aluno: lições
 * concluídas e chunks aprendidos mudam a seleção de cenas e de tarefas. Um
 * perfil vazio vê outra coisa que um aluno que seguiu a Jornada. Por isso a
 * simulação é progressiva: na lição N, o aluno concluiu as N−1 anteriores e
 * conhece o que elas ensinaram; os passes 1–4 são as rodadas de maestria que o
 * LessonPlayer entrega (masteryLevel 0–3).
 *
 * Os planos custam ~1 min para montar; o resultado vai para um cache em
 * node_modules/.cache, com chave no conteúdo das fontes que o planner lê.
 * Mudou qualquer arquivo de src/data, src/features/lesson ou src/lib, o cache
 * é refeito.
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
export const root = process.cwd();

let registered = false;
export function registerTsLoader() {
  if (registered) return;
  registered = true;
  require.extensions[".ts"] = (module, filename) =>
    module._compile(
      ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      filename
    );
}

export function loadTs(rel) {
  registerTsLoader();
  return require(path.join(root, rel));
}

const PLANNER_SOURCE_DIRS = ["src/data", "src/features/lesson", "src/lib", "src/i18n"];

function listFiles(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(rel));
    else if (/\.(ts|tsx|json)$/.test(entry.name)) out.push(rel);
  }
  return out.sort();
}

const SIMULATION_VERSION = "rc2.2.9-v2";

export function plannerSourceHash() {
  const hash = createHash("sha256");
  hash.update(SIMULATION_VERSION);
  for (const dir of PLANNER_SOURCE_DIRS) {
    for (const rel of listFiles(dir)) {
      hash.update(rel);
      hash.update(fs.readFileSync(path.join(root, rel)));
    }
  }
  return hash.digest("hex").slice(0, 16);
}

/** Só os campos que a evidência lê — o cache fica pequeno e estável. */
function slimStep(step) {
  const keep = [
    "kind", "chunkId", "charId", "sceneId", "prompt", "promptPt", "title", "body", "situationPt", "hanzi", "text", "pt",
    "answer", "correctAnswer", "blankAnswer", "sentenceBefore", "sentenceAfter", "target", "targetParts",
    "accepts", "options", "audioText", "audioTextB", "audioSequence", "sourceText", "dialoguePrompt",
    "isNovelCombination", "productionOpen",
  ];
  const out = {};
  for (const key of keep) if (step[key] !== undefined) out[key] = step[key];
  if (step.lines) out.lines = step.lines.map((line) => ({ hanzi: line.hanzi, pt: line.pt, speakerId: line.speakerId }));
  if (step.pairs) out.pairs = step.pairs.map((pair) => ({ left: pair.left, right: pair.right }));
  if (step.nodes) {
    out.nodes = step.nodes.map((node) => ({
      id: node.id,
      speakerId: node.speakerId,
      hanzi: node.hanzi,
      pt: node.pt,
      audioText: node.audioText,
      ...(node.interaction
        ? {
            interaction: {
              type: node.interaction.type,
              prompt: node.interaction.prompt,
              options: node.interaction.options,
              correctAnswer: node.interaction.correctAnswer,
              validAnswers: node.interaction.validAnswers,
              accepts: node.interaction.accepts,
            },
          }
        : {}),
    }));
  }
  if (step.checkpoint) {
    out.checkpoint = {
      prompt: step.checkpoint.prompt,
      options: step.checkpoint.options,
      correctAnswer: step.checkpoint.correctAnswer,
    };
  }
  return out;
}

/** Planos da Jornada normal, na ordem (lição, passe), com aluno progressivo. */
export function buildJourneyPlans({ useCache = true } = {}) {
  const cacheDir = path.join(root, "node_modules/.cache/longyu");
  const key = plannerSourceHash();
  const cachePath = path.join(cacheDir, `capability-plans-${key}.json`);
  if (useCache && fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  }
  const { ALL_LESSONS } = loadTs("src/data/journey.ts");
  const { lessonRoundStepsFor } = loadTs("src/features/lesson/lessonTasks.ts");
  const plans = [];
  const learned = new Set();
  const completed = [];
  ALL_LESSONS.forEach((lesson, lessonIndex) => {
    for (const pass of [1, 2, 3, 4]) {
      const steps = lessonRoundStepsFor(lesson, {
        completedLessons: [...completed],
        learnedChunks: [...learned],
        // O player passa masteryLevel; passamos também o pass explícito para
        // não cair no caminho "aggregate" que só validadores usam (silent sem
        // pass devolve a lição inteira de uma vez, o que nenhum aluno vê).
        masteryLevel: pass - 1,
        masteryPass: pass,
        attemptNumber: pass - 1,
        silent: true,
      });
      plans.push({ lesson: { id: lesson.id }, lessonIndex, pass, steps: steps.map(slimStep) });
    }
    completed.push(lesson.id);
    for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
      if (typeof ref === "string" && ref.startsWith("chunk:")) learned.add(ref.slice("chunk:".length));
    }
  });
  const payload = { key, lessonCount: ALL_LESSONS.length, plans };
  if (useCache) {
    fs.mkdirSync(cacheDir, { recursive: true });
    for (const stale of fs.readdirSync(cacheDir)) {
      if (stale.startsWith("capability-plans-")) fs.rmSync(path.join(cacheDir, stale), { force: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(payload));
  }
  return payload;
}

export function buildRegistry() {
  const { CHUNKS } = loadTs("src/data/chunks.ts");
  const { CHARACTERS } = loadTs("src/data/characters.ts");
  const { VOCABULARY } = loadTs("src/data/vocabulary.ts");
  return {
    chunkHanziByRef: new Map(CHUNKS.map((chunk) => [`chunk:${chunk.id}`, chunk.hanzi])),
    charHanziByRef: new Map(CHARACTERS.map((char) => [`char:${char.id}`, char.hanzi])),
    knownWords: new Set(VOCABULARY.map((entry) => entry.hanzi.replace(/[？?！!。，,]/g, ""))),
  };
}

export function loadCapabilityModules() {
  const capabilities = loadTs("src/data/conversationCapabilities.ts");
  const evidence = loadTs("src/lib/capabilityRuntimeEvidence.ts");
  return { capabilities, evidence };
}

export function describeRef(ref) {
  if (!ref) return "—";
  const where = `${ref.lessonId} · M${ref.pass} · passo ${ref.stepIndex + 1} · ${ref.kind}`;
  const scene = ref.sceneId ? ` · cena ${ref.sceneId}${ref.nodeId ? `/${ref.nodeId}` : ""}` : "";
  return `${where}${scene} — ${ref.text}`;
}

function listSrcFiles(dir = "src") {
  const abs = path.join(root, dir);
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSrcFiles(rel));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/** Tudo o que os gates da RC2.2.9 leem, com os dados reais do repositório. */
export function loadCapabilityGateContext({ useCache = true } = {}) {
  const { plans } = buildJourneyPlans({ useCache });
  const registry = buildRegistry();
  const { capabilities: capabilityModule, evidence: evidenceModule } = loadCapabilityModules();
  const { ALL_LESSONS } = loadTs("src/data/journey.ts");
  const { CAPABILITY_CLOSURE_STEPS } = loadTs("src/data/capabilityClosureSteps.ts");
  const scenes = loadTs("src/data/conversationScenes.ts");
  const enOverlay = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/overlays/instructionGloss.en.json"), "utf8"));
  const srcFiles = new Map(listSrcFiles().map((file) => [file, fs.readFileSync(path.join(root, file), "utf8")]));
  const capabilities = capabilityModule.CONVERSATION_CAPABILITIES;
  const evidenceById = evidenceModule.deriveCapabilityRuntimeEvidence({ capabilities, plans, registry });
  return {
    plans,
    registry,
    capabilityModule,
    evidenceModule,
    capabilities,
    evidenceById,
    lessonIds: ALL_LESSONS.map((lesson) => lesson.id),
    lessons: ALL_LESSONS,
    closureEntries: CAPABILITY_CLOSURE_STEPS,
    dedicatedScenes: ["gostos-na-casa", "perguntar-o-caminho"].map((id) => scenes.conversationSceneStepFromId(id)),
    sceneIds: new Set(scenes.CONVERSATION_SCENES.map((scene) => scene.sceneId)),
    enOverlay,
    sources: {
      capabilitiesSource: srcFiles.get("src/data/conversationCapabilities.ts") ?? "",
      srcFiles,
    },
  };
}
