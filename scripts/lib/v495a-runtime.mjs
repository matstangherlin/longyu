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

export function loadIntegratedLearningRuntime() {
  const { ALL_LESSONS } = require("../../src/data/journey.ts");
  const { CONVERSATION_SCENES } = require("../../src/data/conversationScenes.ts");
  const { CHUNKS } = require("../../src/data/chunks.ts");
  const { CHARACTERS } = require("../../src/data/characters.ts");
  const { HANZI_MEMORY_TARGETS } = require("../../src/data/hanziMemoryTargets.ts");
  const { foundationAuthoredPlanFor } = require("../../src/data/foundationTopicPlans.ts");
  const tonePlans = Object.fromEntries([1, 2, 3, 4].map((pass) => [pass, foundationAuthoredPlanFor("p1-o-que-e-tom", pass) ?? []]));
  return {
    lessons: ALL_LESSONS,
    scenes: CONVERSATION_SCENES,
    chunks: CHUNKS,
    characters: CHARACTERS,
    hanziMemoryTargets: HANZI_MEMORY_TARGETS,
    tonePlans,
  };
}

export function loadCultureRuntime() {
  const { ALL_LESSONS, JOURNEY } = require("../../src/data/journey.ts");
  const { CHUNKS } = require("../../src/data/chunks.ts");
  const { CHARACTERS } = require("../../src/data/characters.ts");
  const {
    CULTURE_ITEMS,
    CULTURE_CATEGORIES,
    CULTURE_SCOPES,
    REJECTED_CULTURE_CANDIDATES,
  } = require("../../src/data/culture.ts");
  const { CULTURE_MISSIONS, cultureMissionStats } = require("../../src/data/cultureMissions.ts");
  const { CULTURE_FLAGSHIP_ITEM_IDS, CULTURE_ROUTES, CULTURE_SEALS, isCultureStepScored } = require("../../src/data/cultureQuest.ts");
  const { CULTURE_INELIGIBLE_UNITS, FUTURE_UNIT_CULTURE_HOOKS, allJourneyUnits } = require("../../src/data/cultureDistribution.ts");
  return {
    items: CULTURE_ITEMS,
    categories: CULTURE_CATEGORIES,
    scopes: CULTURE_SCOPES,
    rejected: REJECTED_CULTURE_CANDIDATES,
    missions: CULTURE_MISSIONS,
    missionStats: cultureMissionStats(),
    flagshipIds: CULTURE_FLAGSHIP_ITEM_IDS,
    routes: CULTURE_ROUTES,
    seals: CULTURE_SEALS,
    isCultureStepScored,
    lessons: ALL_LESSONS,
    chunks: CHUNKS,
    characters: CHARACTERS,
    units: allJourneyUnits(),
    ineligible: CULTURE_INELIGIBLE_UNITS,
    futureHooks: FUTURE_UNIT_CULTURE_HOOKS,
    journey: JOURNEY,
  };
}

export function loadRoutineTimeRuntime() {
  const { ALL_LESSONS } = require("../../src/data/journey.ts");
  const { CONVERSATION_SCENES } = require("../../src/data/conversationScenes.ts");
  const { CHUNKS } = require("../../src/data/chunks.ts");
  const { CHARACTERS } = require("../../src/data/characters.ts");
  const { lessonRoundStepsFor } = require("../../src/features/lesson/lessonTasks.ts");
  const { ROUTINE_TIME_TOPIC_IDS } = require("../../src/data/routineTimePlans.ts");
  const { INSTRUCTION_GLOSS_EN, hasEnglishOverlay, isCanonicalZhOrPinyin } = require("../../src/i18n/overlays/instructionGloss.ts");
  const source = fs.readFileSync("scripts/validate-conversation-scenes.mjs", "utf8");
  const literal = source.match(/const KNOWN_DEBT = new Map\(\[([\s\S]*?)\]\);/)[1];
  const debt = Object.fromEntries([...literal.matchAll(/\["([^"]+)", \[([^\]]*)\]\]/g)].map(m=>[m[1], [...m[2].matchAll(/"([^"]+)"/g)].map(r=>r[1])]));
  const plans = Object.fromEntries(ROUTINE_TIME_TOPIC_IDS.map(id => [id, [1,2,3,4].map(masteryPass => lessonRoundStepsFor(ALL_LESSONS.find(l=>l.id===id), {masteryPass}))]));
  return { lessons: ALL_LESSONS, scenes: CONVERSATION_SCENES, chunks: CHUNKS, characters: CHARACTERS, plans, debt, gloss: INSTRUCTION_GLOSS_EN, hasEnglishOverlay, isCanonicalZhOrPinyin };
}

export function loadRestaurantRuntime() {
  const { ALL_LESSONS } = require("../../src/data/journey.ts");
  const { CONVERSATION_SCENES } = require("../../src/data/conversationScenes.ts");
  const { CHUNKS } = require("../../src/data/chunks.ts");
  const { CHARACTERS } = require("../../src/data/characters.ts");
  const { HANZI_MEMORY_TARGETS } = require("../../src/data/hanziMemoryTargets.ts");
  const { CULTURE_ITEMS } = require("../../src/data/culture.ts");
  const { lessonRoundStepsFor } = require("../../src/features/lesson/lessonTasks.ts");
  const { RESTAURANT_SURVIVAL_TOPIC_IDS } = require("../../src/data/chinaSurvivalRestaurant.ts");
  const { INSTRUCTION_GLOSS_EN, hasEnglishOverlay, isCanonicalZhOrPinyin } = require("../../src/i18n/overlays/instructionGloss.ts");
  const plans = Object.fromEntries(
    RESTAURANT_SURVIVAL_TOPIC_IDS.map((id) => [
      id,
      [1, 2, 3, 4].map((masteryPass) => lessonRoundStepsFor(ALL_LESSONS.find((lesson) => lesson.id === id), { masteryPass })),
    ])
  );
  return {
    lessons: ALL_LESSONS,
    scenes: CONVERSATION_SCENES,
    chunks: CHUNKS,
    characters: CHARACTERS,
    plans,
    hanziMemoryTargets: HANZI_MEMORY_TARGETS,
    cultureItems: CULTURE_ITEMS,
    gloss: INSTRUCTION_GLOSS_EN,
    hasEnglishOverlay,
    isCanonicalZhOrPinyin,
  };
}
