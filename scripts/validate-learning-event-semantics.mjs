#!/usr/bin/env node
/**
 * validate:learning-event-semantics — P7, P14.
 *
 * Pergunta única, para cada evento: o nome descreve o que realmente
 * aconteceu? Até a RC1.4 a resposta para `phrasesSpoken` era não — clicar
 * "Já sabia" num flashcard incrementava um contador de fala.
 */
import fs from "node:fs";
import path from "node:path";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { validateLearningEventSemantics } from "./lib/rc1-5-gates.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
installTsRequireHook();

const { LEARNING_EVENTS, SPEECH_ATTEMPT_EVENTS } = require(path.join(root, "src/lib/learningEvents.ts"));

const storeSource = fs.readFileSync(path.join(root, "src/lib/store.ts"), "utf8");
const taskKeyBlock = /export type DailyTaskKey =([\s\S]*?);/.exec(storeSource)?.[1] ?? "";
const dailyTaskKeys = [...taskKeyBlock.matchAll(/"([a-zA-Z]+)"/g)].map((match) => match[1]);

/** Toda fonte que poderia emitir um evento de aprendizagem. */
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield full;
  }
}

const sourceFiles = {};
for (const file of walk(path.join(root, "src"))) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  const source = fs.readFileSync(file, "utf8");
  if (/recordDailyTask|recordSpeechAttempt/.test(source)) sourceFiles[rel] = source;
}

const { failures } = validateLearningEventSemantics({
  events: LEARNING_EVENTS,
  dailyTaskKeys,
  speechEventIds: SPEECH_ATTEMPT_EVENTS,
  sourceFiles,
});

if (failures.length > 0) {
  console.error(`validate:learning-event-semantics falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- [${failure.code}] ${failure.where}: ${failure.message}`);
  process.exit(1);
}

console.log(
  `OK: validate:learning-event-semantics — ${Object.keys(LEARNING_EVENTS).length} eventos inventariados · ${dailyTaskKeys.length} chaves diárias · fala exige ${SPEECH_ATTEMPT_EVENTS.join(", ")} por tentativa real`
);
