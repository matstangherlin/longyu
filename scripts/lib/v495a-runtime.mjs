import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
export const require = createRequire(import.meta.url);
// Same canonical TypeScript data as the player; build/typecheck runs separately.
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
}).outputText, filename);

export function loadIdentityRuntime() {
  const { ALL_LESSONS } = require("../../src/data/journey.ts");
  const { CONVERSATION_SCENES } = require("../../src/data/conversationScenes.ts");
  const { CHUNKS } = require("../../src/data/chunks.ts");
  const { CHARACTERS } = require("../../src/data/characters.ts");
  const { lessonRoundStepsFor } = require("../../src/features/lesson/lessonTasks.ts");
  const { IDENTITY_PEOPLE_TOPIC_IDS } = require("../../src/data/identityPeoplePlans.ts");
  const { INSTRUCTION_GLOSS_EN, hasInstructionTranslation, isCanonicalZhOrPinyin } = require("../../src/i18n/overlays/instructionGloss.ts");
  const source = fs.readFileSync("scripts/validate-conversation-scenes.mjs", "utf8");
  const literal = source.match(/const KNOWN_DEBT = new Map\(\[([\s\S]*?)\]\);/)[1];
  const debt = Object.fromEntries([...literal.matchAll(/\["([^"]+)", \[([^\]]*)\]\]/g)].map(m=>[m[1], [...m[2].matchAll(/"([^"]+)"/g)].map(r=>r[1])]));
  const plans = Object.fromEntries(IDENTITY_PEOPLE_TOPIC_IDS.map(id => [id, [1,2,3,4].map(masteryPass => lessonRoundStepsFor(ALL_LESSONS.find(l=>l.id===id), {masteryPass}))]));
  return { lessons: ALL_LESSONS, scenes: CONVERSATION_SCENES, chunks: CHUNKS, characters: CHARACTERS, plans, debt, gloss: INSTRUCTION_GLOSS_EN, isCanonicalZhOrPinyin };
}
