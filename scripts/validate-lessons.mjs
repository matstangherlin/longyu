import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const errors = [];

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;
const QUIZ_MIN_QUESTIONS = 16;
const REVIEW_DOMAINS = ["som", "fala", "significado", "forma", "uso", "pinyin", "leitura"];
const REQUIRED_QUIZ_LAYERS = ["supported", "reduced", "noHelp", "sentenceReasoning", "soundSpeech", "production"];
const REQUIRED_FOUNDATION_IDS = [
  "foundation-what-is-mandarin",
  "foundation-pinyin-role",
  "foundation-tone-role",
  "foundation-hanzi-role",
  "foundation-pinyin-vs-hanzi",
];
const REQUIRED_ESSENTIAL_ITEMS = ["mandarim", "pinyin", "tom", "hanzi", "你好", "谢谢", "我", "你", "好", "再见"];

const FORBIDDEN_VISIBLE_PINYIN = [
  /\bni3\s+hao3\b/i,
  /\bni3\b/i,
  /\bhao3\b/i,
  /\bbu4\b/i,
  /\bxie4xie\b/i,
  /\bni hao\b/i,
  /\bxiexie\b/i,
  /\bbu ke qi\b/i,
];

const PORTUGUESE_FIXES = [
  [/\bOla\b/g, "Olá"],
  [/\bVoce\b/g, "Você"],
  [/\bvoce\b/g, "você"],
  [/\bNao\b/g, "Não"],
  [/\bnao\b/g, "não"],
  [/\btres\b/g, "três"],
  [/\bate\b/g, "até"],
  [/\bAlguem\b/g, "Alguém"],
  [/\bqual e\b/gi, "qual é"],
  [/\bmae\b/g, "mãe"],
  [/\bagua\b/g, "água"],
  [/\bsao\b/g, "são"],
  [/\bpeca\b/g, "peça"],
];

function addError(area, ref, message) {
  errors.push({ area, ref, message });
}

function norm(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/[\s.。．,，!！?？:：;；·"“”'’‘()[\]]+/g, "");
}

function visibleNorm(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function isCjk(value) {
  return CJK_RE.test(String(value ?? ""));
}

function hasDuplicate(values) {
  const seen = new Set();
  for (const value of values) {
    const key = norm(value);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function choiceNorm(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, "");
}

function checkVisibleText(area, ref, value) {
  const text = visibleNorm(value);
  if (!text) return;
  for (const pattern of FORBIDDEN_VISIBLE_PINYIN) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      addError(area, ref, `pinyin visível sem diacrítico ou numérico: "${text}"`);
      break;
    }
  }
  for (const [pattern, expected] of PORTUGUESE_FIXES) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      addError(area, ref, `texto em português sem acento: "${text}" (use "${expected}")`);
      break;
    }
  }
}

function runNodeScript(label, scriptPath) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: rootDir,
    stdio: "inherit",
  });
  if (result.error) {
    addError("script", label, result.error.message);
  } else if (result.status !== 0) {
    addError("script", label, `${scriptPath} falhou com status ${result.status}`);
  }
}

function findMatchingParen(source, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function splitTopLevelArgs(argsSource) {
  const args = [];
  let start = 0;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let quote = null;
  let escaped = false;
  for (let index = 0; index < argsSource.length; index += 1) {
    const char = argsSource[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") paren += 1;
    else if (char === ")") paren -= 1;
    else if (char === "[") bracket += 1;
    else if (char === "]") bracket -= 1;
    else if (char === "{") brace += 1;
    else if (char === "}") brace -= 1;
    else if (char === "," && paren === 0 && bracket === 0 && brace === 0) {
      args.push(argsSource.slice(start, index).trim());
      start = index + 1;
    }
  }
  args.push(argsSource.slice(start).trim());
  return args;
}

function extractFunctionCalls(source, name) {
  const calls = [];
  let index = 0;
  const needle = `${name}(`;
  while ((index = source.indexOf(needle, index)) >= 0) {
    const openIndex = index + name.length;
    const closeIndex = findMatchingParen(source, openIndex);
    if (closeIndex < 0) {
      addError("onboarding", name, `chamada sem fechamento em ${index}`);
      break;
    }
    calls.push(source.slice(openIndex + 1, closeIndex));
    index = closeIndex + 1;
  }
  return calls;
}

function parseStringLiteral(source) {
  const trimmed = source.trim();
  if (!/^"([^"\\]|\\.)*"$/s.test(trimmed)) return undefined;
  return JSON.parse(trimmed);
}

function parseStringArray(source) {
  const trimmed = source.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return undefined;
  const values = [];
  const regex = /"((?:\\.|[^"\\])*)"/gs;
  let match;
  while ((match = regex.exec(trimmed))) values.push(JSON.parse(`"${match[1]}"`));
  return values;
}

function parseExtraObject(source) {
  const text = source ?? "";
  const stringProp = (key) => {
    const match = new RegExp(`${key}\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "s").exec(text);
    return match ? JSON.parse(`"${match[1]}"`) : undefined;
  };
  const boolProp = (key) => {
    const match = new RegExp(`${key}\\s*:\\s*(true|false)`).exec(text);
    return match ? match[1] === "true" : undefined;
  };
  const numberProp = (key) => {
    const match = new RegExp(`${key}\\s*:\\s*([0-9.]+)`).exec(text);
    return match ? Number(match[1]) : undefined;
  };
  return {
    stimulus: stringProp("stimulus"),
    detail: stringProp("detail"),
    audioText: stringProp("audioText"),
    allowHints: boolProp("allowHints"),
    withClue: boolProp("withClue"),
    hasHint: boolProp("hasHint"),
    noHint: boolProp("noHint"),
    essential: boolProp("essential"),
    essentialItem: stringProp("essentialItem"),
    difficulty: numberProp("difficulty"),
    unlockWeight: numberProp("unlockWeight"),
  };
}

function parseQuizQuestion(callSource, index) {
  const args = splitTopLevelArgs(callSource);
  if (args.length < 6) {
    addError("onboarding", `quizQuestion#${index}`, `esperava 6 argumentos, recebeu ${args.length}`);
    return null;
  }
  const question = {
    id: parseStringLiteral(args[0]),
    category: parseStringLiteral(args[1]),
    layer: parseStringLiteral(args[2]),
    prompt: parseStringLiteral(args[3]),
    answer: parseStringLiteral(args[4]),
    options: parseStringArray(args[5]),
    extra: parseExtraObject(args[6]),
  };
  for (const key of ["id", "category", "layer", "prompt", "answer"]) {
    if (!question[key]) addError("onboarding", `quizQuestion#${index}`, `${key} vazio ou não literal`);
  }
  if (!Array.isArray(question.options)) {
    addError("onboarding", question.id ?? `quizQuestion#${index}`, "opções não literais");
    return null;
  }
  return question;
}

function validateChoice(area, ref, options, answer) {
  if (!answer?.trim()) addError(area, ref, "sem resposta correta");
  if (!Array.isArray(options) || options.length < 2) {
    addError(area, ref, "menos de 2 alternativas");
    return;
  }
  if (options.some((option) => !String(option ?? "").trim())) addError(area, ref, "alternativa vazia");
  const optionKeys = options.map(choiceNorm);
  if (new Set(optionKeys).size !== optionKeys.length) addError(area, ref, "alternativas duplicadas");
  if (answer?.trim() && !optionKeys.includes(choiceNorm(answer))) {
    addError(area, ref, `resposta correta "${answer}" fora das alternativas`);
  }
}

function staticAssessmentTier(question) {
  if (question.extra?.withClue || question.extra?.allowHints || question.layer === "supported" || question.layer === "reduced") {
    return "A";
  }
  if (question.layer === "production") return "E";
  if (question.layer === "soundSpeech" || question.category === "tone") return "D";
  if (question.layer === "sentenceReasoning" || question.category === "sentence" || question.category === "context") return "C";
  return "B";
}

function wrongAnswerFor(question) {
  return question.options.find((option) => choiceNorm(option) !== choiceNorm(question.answer)) ?? "__wrong__";
}

function evaluatePlacementScenario(questions, answerForQuestion) {
  const answered = questions.map((question) => {
    const answer = answerForQuestion(question);
    const correct = answer.correct ? question.answer : wrongAnswerFor(question);
    return {
      question,
      correct: choiceNorm(correct) === choiceNorm(question.answer),
      hinted: Boolean(answer.hinted),
    };
  });
  const essentialMissed = new Set();
  const essentialHinted = new Set();
  const strongCleanCategories = new Set();
  let strongAudio = false;
  let decisiveTotal = 0;
  let decisiveCorrect = 0;

  for (const item of answered) {
    const { question, correct, hinted } = item;
    const essentialLabel = question.extra?.essentialItem ?? question.id;
    if (question.extra?.essential === true && !correct) essentialMissed.add(essentialLabel);
    if (question.extra?.essential === true && correct && hinted) essentialHinted.add(essentialLabel);
    const tier = staticAssessmentTier(question);
    if (tier !== "A") {
      decisiveTotal += 1;
      if (correct && !hinted) {
        decisiveCorrect += 1;
        strongCleanCategories.add(question.category);
        if (question.extra?.audioText) strongAudio = true;
      }
    }
  }

  const hasRequiredSpread =
    strongCleanCategories.has("meaning") &&
    strongCleanCategories.has("sound") &&
    strongCleanCategories.has("tone") &&
    strongCleanCategories.has("hanzi") &&
    (strongCleanCategories.has("sentence") || strongCleanCategories.has("context")) &&
    strongAudio &&
    answered.some(({ question, correct, hinted }) => staticAssessmentTier(question) === "E" && correct && !hinted);

  return {
    essentialMissed: [...essentialMissed],
    essentialHinted: [...essentialHinted],
    essentialBlocked: essentialMissed.size > 0 || essentialHinted.size > 0,
    strongCleanCategories,
    strongAudio,
    decisiveAccuracy: decisiveTotal > 0 ? decisiveCorrect / decisiveTotal : 0,
    hasRequiredSpread,
  };
}

function validatePlacementProfileScenarios(questions) {
  const profiles = [
    {
      id: "A-nunca-estudei",
      answer: (question) => ({
        correct: question.layer === "supported" || question.layer === "reduced",
        hinted: question.layer === "supported" || question.layer === "reduced",
      }),
      assert: (result) =>
        result.essentialBlocked &&
        result.essentialHinted.length > 0 &&
        !result.hasRequiredSpread,
      message: "iniciante com acertos usando dica conseguiu parecer apto a pular fundamentos",
    },
    {
      id: "B-algumas-palavras",
      answer: (question) => ({
        correct:
          /你好|谢谢|再见/.test(`${question.extra?.stimulus ?? ""} ${question.answer}`) &&
          !question.id.startsWith("foundation-"),
        hinted: false,
      }),
      assert: (result) =>
        result.essentialBlocked &&
        ["pinyin", "tom", "hanzi"].some((item) => result.essentialMissed.includes(item)),
      message: "aluno que reconhece saudacoes pulou sem provar pinyin/tom/hanzi",
    },
    {
      id: "C-basico-sem-tom",
      answer: (question) => ({ correct: question.category !== "tone", hinted: false }),
      assert: (result) => result.essentialBlocked && result.essentialMissed.includes("tom") && !result.hasRequiredSpread,
      message: "aluno basico errou tom e mesmo assim manteve spread completo",
    },
    {
      id: "D-intermediario-sem-audio",
      answer: (question) => ({ correct: !question.extra?.audioText, hinted: false }),
      assert: (result) => !result.strongAudio && !result.hasRequiredSpread,
      message: "perfil intermediario passou sem prova de audio",
    },
    {
      id: "E-avancado-limpo",
      answer: () => ({ correct: true, hinted: false }),
      assert: (result) => !result.essentialBlocked && result.hasRequiredSpread && result.decisiveAccuracy >= 0.9,
      message: "perfil avancado perfeito sem dica nao conseguiu provar nivel",
    },
  ];

  for (const profile of profiles) {
    const result = evaluatePlacementScenario(questions, profile.answer);
    if (!profile.assert(result)) {
      addError("onboarding", profile.id, profile.message);
    }
  }
  console.log(`Onboarding: ${profiles.length} perfis adaptativos simulados.`);
}

async function validatePlacementQuiz() {
  const source = await readFile(path.join(rootDir, "src/features/account/AccountPage.tsx"), "utf8");
  const questions = extractFunctionCalls(source, "quizQuestion")
    .map(parseQuizQuestion)
    .filter(Boolean);

  if (questions.length < QUIZ_MIN_QUESTIONS) {
    addError("onboarding", "quiz", `apenas ${questions.length} perguntas; mínimo ${QUIZ_MIN_QUESTIONS}`);
  }

  const ids = questions.map((question) => question.id);
  if (hasDuplicate(ids)) addError("onboarding", "quiz", "ids duplicados em quizQuestion");

  for (const layer of REQUIRED_QUIZ_LAYERS) {
    if (!questions.some((question) => question.layer === layer)) {
      addError("onboarding", "quiz", `camada obrigatória ausente: ${layer}`);
    }
  }

  for (const id of REQUIRED_FOUNDATION_IDS) {
    const question = questions.find((item) => item.id === id);
    if (!question) {
      addError("onboarding", id, "fundamento obrigatório ausente");
      continue;
    }
    if (question.layer !== "noHelp") addError("onboarding", id, "fundamento precisa ser sem ajuda");
    if (question.extra.essential !== true) addError("onboarding", id, "fundamento precisa ser essencial");
  }

  for (const item of REQUIRED_ESSENTIAL_ITEMS) {
    const covered = questions.some((question) => question.extra.essential === true && question.extra.essentialItem === item);
    if (!covered) addError("onboarding", item, "item essencial não coberto por pergunta essencial");
  }

  for (const question of questions) {
    const ref = question.id ?? "quizQuestion";
    validateChoice("onboarding", ref, question.options, question.answer);
    for (const value of [
      question.prompt,
      question.answer,
      question.extra.stimulus,
      question.extra.detail,
      question.extra.audioText,
      ...question.options,
    ]) {
      checkVisibleText("onboarding", ref, value);
    }

    const isXiexieMeaning =
      question.category === "meaning" &&
      (question.extra.stimulus === "谢谢" || /谢谢/.test(`${question.prompt} ${question.extra.detail ?? ""}`));
    if (isXiexieMeaning) {
      if (visibleNorm(question.answer) !== "Obrigado(a).") {
        addError("onboarding", ref, `谢谢 de significado deve responder "Obrigado(a).", recebeu "${question.answer}"`);
      }
      if (!question.options.some((option) => visibleNorm(option) === "Obrigado(a).")) {
        addError("onboarding", ref, '谢谢 de significado sem alternativa "Obrigado(a)."');
      }
    }
  }

  validatePlacementProfileScenarios(questions);
  console.log(`Onboarding: ${questions.length} perguntas obrigatórias auditadas.`);
}

function containsCounts(source, target) {
  const remaining = [...source];
  for (const piece of target) {
    const index = remaining.findIndex((candidate) => norm(candidate) === norm(piece));
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  return true;
}

function optionValues(options) {
  return (options ?? []).map((option) => option?.value ?? option?.label ?? "");
}

function validateGeneratedReviewExercise(ref, exercise) {
  if (!exercise) {
    addError("revisao", ref, "builder não gerou exercício");
    return;
  }
  if (!exercise.answer?.trim()) addError("revisao", ref, "sem resposta correta");
  if (!exercise.prompt?.trim()) addError("revisao", ref, "prompt vazio");
  if (!exercise.question?.trim()) addError("revisao", ref, "pergunta vazia");

  for (const value of [
    exercise.prompt,
    exercise.question,
    exercise.answer,
    exercise.answerLabel,
    exercise.displayText,
    exercise.explanation,
    ...(exercise.options ?? []).flatMap((option) => [option.value, option.label, option.detail]),
    ...(exercise.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
    ...(exercise.pieces ?? []).map((piece) => piece.value),
  ]) {
    checkVisibleText("revisao", ref, value);
  }

  if (exercise.kind === "sentence_build") {
    const target = exercise.targetValues ?? [];
    const pieces = (exercise.pieces ?? []).map((piece) => piece.value);
    if (target.length === 0) addError("revisao", ref, "sentence_build sem targetValues");
    if (!containsCounts(pieces, target)) addError("revisao", ref, "peças não contêm a resposta");
    return;
  }

  if (exercise.kind === "match_pairs") {
    const pairs = exercise.pairs ?? [];
    if (pairs.length < 2) addError("revisao", ref, "match_pairs com menos de 2 pares");
    if (pairs.some((pair) => !pair.left?.trim() || !pair.right?.trim())) addError("revisao", ref, "par com lado vazio");
    if (hasDuplicate(pairs.map((pair) => pair.left))) addError("revisao", ref, "lado esquerdo duplicado");
    if (hasDuplicate(pairs.map((pair) => pair.right))) addError("revisao", ref, "lado direito duplicado");
    for (const pair of pairs) {
      if (norm(pair.left) === norm("谢谢") && !isCjk(pair.right) && visibleNorm(pair.right) !== "Obrigado(a).") {
        addError("revisao", ref, `par 谢谢 deve usar "Obrigado(a).", recebeu "${pair.right}"`);
      }
    }
    return;
  }

  if (exercise.canAutoCheck !== false) {
    const values = optionValues(exercise.options);
    validateChoice("revisao", ref, values, exercise.answer);
  }

  if (
    norm(exercise.entity?.hanzi) === norm("谢谢") &&
    exercise.kind === "microread" &&
    /expressa|tradução/i.test(`${exercise.prompt} ${exercise.question}`) &&
    visibleNorm(exercise.answer) !== "Obrigado(a)."
  ) {
    addError("revisao", ref, `microread 谢谢 deve responder "Obrigado(a).", recebeu "${exercise.answer}"`);
  }
}

async function validateGeneratedReview() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-review-"));
  try {
    const program = ts.createProgram(
      [
        "src/features/revisao/reviewExerciseBuilder.ts",
        "src/data/chunks.ts",
        "src/data/characters.ts",
        "src/lib/srs.ts",
      ],
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
    if (emit.emitSkipped) {
      addError("revisao", "compile", "falha ao compilar builder de revisão");
      return;
    }

    const load = (rel) => require(path.join(outDir, rel));
    const { buildReviewExercise } = load("src/features/revisao/reviewExerciseBuilder.js");
    const { CHUNKS } = load("src/data/chunks.js");
    const { CHARACTERS } = load("src/data/characters.js");
    const { newItem } = load("src/lib/srs.js");

    const learnedItems = [
      ...CHUNKS.map((chunk) => newItem("chunk", chunk.id, { now: 1 })),
      ...CHARACTERS.map((char) => newItem("char", char.id, { now: 1 })),
    ];

    let audited = 0;
    for (const [type, entries] of [
      ["chunk", CHUNKS],
      ["char", CHARACTERS],
    ]) {
      for (const entry of entries) {
        for (const domain of REVIEW_DOMAINS) {
          const item = newItem(type, entry.id, { reviewDomain: domain, now: 1 });
          const exercise = buildReviewExercise({ item, learnedItems, domain });
          validateGeneratedReviewExercise(`${domain}:${type}:${entry.id}`, exercise);
          audited += 1;
        }
      }
    }

    console.log(`Revisão: ${audited} exercícios gerados e auditados.`);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

async function validateModulePracticeCoverage() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-practice-"));
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
        strict: true,
      }
    );
    const emit = program.emit();
    if (emit.emitSkipped) {
      addError("pratica", "compile", "falha ao compilar lessonTasks");
      return;
    }

    const { validateModulePracticeCoverage: audit } = require(
      path.join(outDir, "src/features/lesson/lessonTasks.js")
    );
    const issues = audit();
    for (const issue of issues) {
      for (const warning of issue.warnings) {
        addError("pratica", `${issue.unitId}`, `${issue.unitTitle}: ${warning}`);
      }
    }
    console.log(`Prática: ${issues.length} módulo(s) com alertas de cobertura.`);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

runNodeScript("Encoding UTF-8", "scripts/validate-encoding.js");
runNodeScript("LessonStep, teste de pulo e corpus", "scripts/validate-pedagogy.mjs");
runNodeScript("Pinyin display", "scripts/validate-pinyin-display.mjs");
await validatePlacementQuiz();
await validateGeneratedReview();
await validateModulePracticeCoverage();

if (errors.length > 0) {
  console.error(`\nvalidate:lessons encontrou ${errors.length} erro(s).`);
  for (const error of errors.slice(0, 100)) {
    console.error(`- [${error.area}] ${error.ref}: ${error.message}`);
  }
  if (errors.length > 100) console.error(`...mais ${errors.length - 100} erro(s).`);
  process.exit(1);
}

console.log("\nOK: validate:lessons passou.");
