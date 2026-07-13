// validate:lesson-options
//
// Gera o plano REAL de cada lição (lessonRoundStepsFor) e falha se encontrar:
//  - opções duplicadas depois de normalização (inclui pinyin numérico ⇄ diacrítico);
//  - menos de 2 opções únicas em uma pergunta de escolha;
//  - pergunta de pinyin com menos de 3 opções visualmente diferentes;
//  - escolha de pinyin cujas opções só diferem no tom (parecem iguais): 3+ com a
//    mesma base sem tom, ou menos de 3 bases distintas — salvo treino de tom
//    explícito (título/prompt fala em tom, ou opções trazem "1º tom" etc.);
//  - par (match_pairs/tone_pair) com lado longo demais (explicação inteira);
//  - par com texto misto PT+hànzì longo, ou gloss (lado "pt") contendo hànzì;
//  - a explicação "Três árvores formam ..." usada como item de par/opção.
//
// Roda sobre o conteúdo gerado, exatamente como o aluno vê no player.

import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const errors = [];
const addError = (lessonId, message) => errors.push(`[${lessonId}] ${message}`);

const CJK_RE = /[㐀-鿿豈-﫿]/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/;
const BANNED_PAIR_PHRASES = [/Três árvores formam/i, /\bsignifica\b/i, /pista sonora ma;/i, /primeira sequência numérica/i];
const PAIR_SIDE_MAX = 40;
const PAIR_MIXED_MAX = 24;
const CHOICE_KINDS = new Set(["dialogue_choice", "comprehend", "listen_select", "conversation_scene"]);
const PAIR_KINDS = new Set(["match_pairs", "tone_pair"]);
const PINYIN_TONE_MARK_RE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/iu;
const TONE_LABEL_RE = /\b[1-5]\s*º?\s*(?:tom|tone)s?\b|\btom\s*[1-5]\b|neutro/i;

const hasCjk = (s) => CJK_RE.test(String(s ?? ""));
const hasLatin = (s) => LATIN_RE.test(String(s ?? ""));
const isPinyinQuestion = (step) =>
  /pinyin/i.test(`${step.title ?? ""} ${step.prompt ?? ""} ${step.dialoguePrompt ?? ""} ${step.speaker ?? ""}`);
// Treino de tom explícito: título/prompt fala em tom/acento, ou as opções trazem
// o rótulo do tom ("nǐ hǎo — 3º + 3º tom"). Só aí opções que diferem só no tom
// são permitidas.
const isToneTrainingStep = (step, options) => {
  const label = `${step.title ?? ""} ${step.prompt ?? ""} ${step.dialoguePrompt ?? ""} ${step.speaker ?? ""}`.toLocaleLowerCase(
    "pt-BR"
  );
  if (/\btom\b|\btons\b|\btone\b|\bacento\b/.test(label)) return true;
  return options.some((option) => TONE_LABEL_RE.test(String(option)));
};

async function main() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-options-"));
  try {
    const program = ts.createProgram(
      [
        "src/features/lesson/lessonTasks.ts",
        "src/data/journey.ts",
        "src/data/characters.ts",
        "src/data/chunks.ts",
        "src/data/hanziBuilder.ts",
        "src/data/types.ts",
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
      console.error("validate:lesson-options: falha ao compilar lessonTasks.");
      process.exit(1);
    }

    const tasks = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));
    const journey = require(path.join(outDir, "src/data/journey.js"));
    const pinyin = require(path.join(outDir, "src/lib/pinyin.js"));
    const { lessonRoundStepsFor, normalizePinyinOptionForUniqueness } = tasks;
    const { isNearDuplicatePinyinSet } = pinyin;
    const lessons = journey.ALL_LESSONS;

    let planCount = 0;
    for (const lesson of lessons) {
      const plan = lessonRoundStepsFor(lesson, { silent: true });
      planCount += 1;
      for (const step of plan) {
        checkChoiceStep(lesson.id, step, normalizePinyinOptionForUniqueness, isNearDuplicatePinyinSet);
        checkPairStep(lesson.id, step);
      }
    }

    if (errors.length > 0) {
      console.error(`\nvalidate:lesson-options encontrou ${errors.length} problema(s):`);
      for (const error of errors.slice(0, 80)) console.error(`- ${error}`);
      if (errors.length > 80) console.error(`...mais ${errors.length - 80}.`);
      process.exit(1);
    }
    console.log(`OK: validate:lesson-options passou (${planCount} planos verificados).`);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

function checkChoiceStep(lessonId, step, normPinyin, isNearDup) {
  if (!CHOICE_KINDS.has(step.kind)) return;
  const options = [...(step.options ?? []), ...(step.distractors ?? [])].filter((o) => String(o ?? "").trim());
  if (options.length < 2) return; // estrutura mínima é coberta por outro validador
  const keys = options.map((o) => normPinyin(o));
  const unique = new Set(keys);
  if (unique.size < options.length) {
    addError(lessonId, `${step.kind}: opções duplicadas após normalização [${options.join(" | ")}]`);
  }
  if (unique.size < 2) {
    addError(lessonId, `${step.kind}: menos de 2 opções únicas [${options.join(" | ")}]`);
  }
  if (isPinyinQuestion(step) && unique.size < 3) {
    addError(lessonId, `pergunta de pinyin com menos de 3 opções distintas [${options.join(" | ")}]`);
  }
  // Opções que só diferem no tom parecem 4 iguais para o iniciante. Só bloqueia
  // conjuntos que de fato parecem pinyin tonal (3+ opções com marca de tom) e
  // que não sejam treino de tom explícito.
  const toned = options.filter((o) => PINYIN_TONE_MARK_RE.test(String(o)));
  if (toned.length >= 3 && !isToneTrainingStep(step, options) && isNearDup(options)) {
    addError(
      lessonId,
      `${step.kind}: opções de pinyin diferem só no tom (parecem iguais) [${options.join(" | ")}]`
    );
  }
}

function checkPairStep(lessonId, step) {
  if (!PAIR_KINDS.has(step.kind)) return;
  for (const pair of step.pairs ?? []) {
    checkPairSide(lessonId, step.kind, pair.left, pair.leftType);
    checkPairSide(lessonId, step.kind, pair.right, pair.rightType);
  }
}

function checkPairSide(lessonId, kind, side, type) {
  const value = String(side ?? "");
  if (!value.trim()) return;
  for (const phrase of BANNED_PAIR_PHRASES) {
    if (phrase.test(value)) {
      addError(lessonId, `${kind}: lado com explicação/frase proibida "${value}"`);
      return;
    }
  }
  if (value.length > PAIR_SIDE_MAX) {
    addError(lessonId, `${kind}: lado longo demais (${value.length}) "${value}"`);
    return;
  }
  // Um gloss (lado "pt") jamais deve conter hànzì — sinal de texto misto/explicação.
  if (type === "pt" && hasCjk(value)) {
    addError(lessonId, `${kind}: gloss (pt) com hànzì misturado "${value}"`);
    return;
  }
  if (hasCjk(value) && hasLatin(value) && value.length > PAIR_MIXED_MAX) {
    addError(lessonId, `${kind}: texto misto PT+hànzì longo "${value}"`);
  }
}

await main();
