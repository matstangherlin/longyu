import { readdir, readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/pinyin.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const pinyin = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

const cases = [
  ["ni3", "nǐ"],
  ["hao3", "hǎo"],
  ["ni3 hao3", "nǐ hǎo"],
  ["xie4xie", "xièxie"],
  ["Zhong1wen2", "Zhōngwén"],
  ["wo3 shi4 Ba1xi1 ren2", "wǒ shì Bāxī rén"],
  ["bu4", "bù"],
  ["bu2", "bú"],
  ["ma1", "mā"],
  ["ma2", "má"],
  ["ma3", "mǎ"],
  ["ma4", "mà"],
  ["ma5", "ma"],
  ["liu4", "liù"],
  ["gui1", "guī"],
  ["nv3", "nǚ"],
  ["nü3", "nǚ"],
  ["nu:3", "nǚ"],
  ["lv4", "lǜ"],
  ["lve4", "lüè"],
  ["lüe4", "lüè"],
  ["que4", "què"],
  ["qiong2", "qióng"],
  ["ma5 ma1", "ma mā"],
];

const failures = [];

for (const [input, expected] of cases) {
  const actual = pinyin.numericPinyinToDiacritics(input);
  if (actual !== expected) {
    failures.push(`${input} -> ${actual}; esperado ${expected}`);
  }
}

const studentSamples = [
  "pinyin: ni3 hao3",
  "xie4xie",
  "Zhong1wen2",
  "wo3 shi4 Ba1xi1 ren2",
  "ma3 / 3o tom",
];

for (const sample of studentSamples) {
  if (pinyin.displayedPinyinHasToneNumbers(sample)) {
    failures.push(`Amostra de aluno ainda tem número de tom: ${sample}`);
  }
}

const forbiddenStudentDisplay = ["ni3 hao3", "xie4xie", "Zhong1wen2", "wo3 shi4 Ba1xi1 ren2"];
const sourceRoot = new URL("../src/", import.meta.url);

const lessonStepsSource = await readFile(new URL("../src/features/lesson/steps.tsx", import.meta.url), "utf8");
const silentPromptChecks = [
  [
    "const promptTestsPinyinOrTone = hintWouldRevealAnswer(step);",
    "pergunta avaliada precisa reutilizar a regra anti-dica",
  ],
  [
    "const shouldReadPrompt = !promptTestsPinyinOrTone && isCjkText(dialoguePrompt);",
    "pergunta de pinyin/tom não pode habilitar leitura automática",
  ],
  [
    "useAutoSpeak(shouldReadPrompt ? dialoguePrompt : undefined, shouldReadPrompt",
    "hook de áudio precisa respeitar a política silenciosa",
  ],
  [
    "speakOnClick={!promptTestsPinyinOrTone}",
    "pergunta de pinyin/tom não pode oferecer leitura por clique",
  ],
  [
    "disabled={promptTestsPinyinOrTone}",
    "ajuda visual precisa continuar desativada na pergunta avaliada",
  ],
];

for (const [required, description] of silentPromptChecks) {
  if (!lessonStepsSource.includes(required)) {
    failures.push(`Proteção de pergunta silenciosa ausente: ${description}`);
  }
}

const conversationSceneSource = await readFile(
  new URL("../src/features/lesson/ConversationSceneStep.tsx", import.meta.url),
  "utf8"
);
if (!conversationSceneSource.includes("useAutoSpeak(visible && autoSpeak ? audio : undefined, visible && autoSpeak")) {
  failures.push("Leitura automática das falas reais de diálogo precisa permanecer ativa");
}

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir);
    if (entry.isDirectory()) {
      files.push(...await sourceFiles(url));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(url);
    }
  }
  return files;
}

for (const file of await sourceFiles(sourceRoot)) {
  const text = await readFile(file, "utf8");
  for (const forbidden of forbiddenStudentDisplay) {
    if (text.includes(forbidden)) {
      failures.push(`Pinyin numérico visível em ${file.pathname}: ${forbidden}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Falha na validação de pinyin:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Pinyin display OK");
