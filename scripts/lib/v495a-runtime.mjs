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
  const { CULTURE_FLAGSHIP_ITEM_IDS, CULTURE_ROUTES, CULTURE_SEALS } = require("../../src/data/cultureQuest.ts");
  const { CULTURE_JOURNEY_BRIDGES } = require("../../src/data/cultureJourneyBridges.ts");
  const { CULTURE_NATIVE_LESSONS, CULTURE_NATIVE_GLOSS_EN } = require("../../src/data/cultureLessons.ts");
  const { CULTURE_JOURNEY_PLACEMENT, migrateNativeCultureProgress, CULTURE_STORY_FLAGSHIP_IDS } = require("../../src/data/cultureNative.ts");
  const { JOURNEY_NODES, routeForJourneyNode } = require("../../src/data/journeyOrchestrator.ts");
  const { isTopicMasteryLesson } = require("../../src/data/topicMastery.ts");
  const { CULTURE_INELIGIBLE_UNITS, FUTURE_UNIT_CULTURE_HOOKS, allJourneyUnits } = require("../../src/data/cultureDistribution.ts");
  const lessonPlayerSource = fs.readFileSync("src/features/lesson/LessonPlayer.tsx", "utf8");
  const lessonVictorySource = fs.readFileSync("src/features/lesson/LessonVictory.tsx", "utf8");
  const storeSource = fs.readFileSync("src/lib/store.ts", "utf8");
  const cultureItemPageSource = fs.readFileSync("src/features/culture/CultureItemPage.tsx", "utf8");
  const cultureHubSource = fs.readFileSync("src/features/culture/CultureHubPage.tsx", "utf8");
  const cultureReviewSource = fs.readFileSync("src/features/culture/CultureReviewPage.tsx", "utf8");
  const cultureMissionPlayerSource = fs.readFileSync("src/features/culture/CultureMissionPlayer.tsx", "utf8");
  const routesSource = fs.readFileSync("src/routes.tsx", "utf8");
  const leagueHookSource = fs.readFileSync("src/hooks/useLeagueData.ts", "utf8");
  const ligasPageSource = fs.readFileSync("src/features/ligas/LigasPage.tsx", "utf8");
  const leagueServiceSource = fs.readFileSync("src/services/leagueService.ts", "utf8");
  const leagueLiveViewSource = fs.readFileSync("src/lib/leagueLiveView.ts", "utf8");
  const stepsSource = fs.readFileSync("src/features/lesson/steps.tsx", "utf8");
  const leagueSqlSource = fs.readFileSync("supabase/migrations/004_leagues.sql", "utf8");
  const journeyInlineSource = fs.readFileSync("src/features/journey/JourneyInlineNode.tsx", "utf8");
  const { INSTRUCTION_GLOSS_EN, hasEnglishOverlay } = require("../../src/i18n/overlays/instructionGloss.ts");
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
    lessons: ALL_LESSONS,
    nativeLessons: CULTURE_NATIVE_LESSONS,
    nativeGloss: CULTURE_NATIVE_GLOSS_EN,
    placement: CULTURE_JOURNEY_PLACEMENT,
    nodes: JOURNEY_NODES,
    routeForJourneyNode,
    isTopicMasteryLesson,
    migrateNativeCultureProgress,
    chunks: CHUNKS,
    characters: CHARACTERS,
    units: allJourneyUnits(),
    ineligible: CULTURE_INELIGIBLE_UNITS,
    futureHooks: FUTURE_UNIT_CULTURE_HOOKS,
    journey: JOURNEY,
    bridges: CULTURE_JOURNEY_BRIDGES,
    lessonPlayerSource,
    lessonVictorySource,
    storeSource,
    cultureItemPageSource,
    cultureHubSource,
    cultureReviewSource,
    cultureMissionPlayerSource,
    routesSource,
    leagueHookSource,
    ligasPageSource,
    leagueServiceSource,
    leagueLiveViewSource,
    stepsSource,
    leagueSqlSource,
    storyFlagshipIds: CULTURE_STORY_FLAGSHIP_IDS,
    journeyInlineSource,
    gloss: INSTRUCTION_GLOSS_EN,
    hasEnglishOverlay,
  };
}

/**
 * Mutation fixtures clone the catalog. Helpers such as routeForJourneyNode
 * cannot go through structuredClone, so they are copied by reference.
 */
export function cloneCultureRuntime(base) {
  const fns = {};
  const data = { ...base };
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "function") {
      fns[key] = value;
      delete data[key];
    }
  }
  return { ...structuredClone(data), ...fns };
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

export function loadShoppingRuntime() {
  const { ALL_LESSONS } = require("../../src/data/journey.ts");
  const { CONVERSATION_SCENES } = require("../../src/data/conversationScenes.ts");
  const { CHUNKS } = require("../../src/data/chunks.ts");
  const { CHARACTERS } = require("../../src/data/characters.ts");
  const { HANZI_MEMORY_TARGETS } = require("../../src/data/hanziMemoryTargets.ts");
  const { CULTURE_ITEMS } = require("../../src/data/culture.ts");
  const { CULTURE_MISSIONS } = require("../../src/data/cultureMissions.ts");
  const { CULTURE_JOURNEY_BRIDGES } = require("../../src/data/cultureJourneyBridges.ts");
  const { lessonRoundStepsFor } = require("../../src/features/lesson/lessonTasks.ts");
  const { SHOPPING_SURVIVAL_TOPIC_IDS } = require("../../src/data/chinaSurvivalShopping.ts");
  const { INSTRUCTION_GLOSS_EN, hasEnglishOverlay, isCanonicalZhOrPinyin } = require("../../src/i18n/overlays/instructionGloss.ts");
  const plans = Object.fromEntries(
    SHOPPING_SURVIVAL_TOPIC_IDS.map((id) => [
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
    missions: CULTURE_MISSIONS,
    bridges: CULTURE_JOURNEY_BRIDGES,
    gloss: INSTRUCTION_GLOSS_EN,
    hasEnglishOverlay,
    isCanonicalZhOrPinyin,
    lessonPlayerSource: fs.readFileSync("src/features/lesson/LessonPlayer.tsx", "utf8"),
    conversationPlayerSource: fs.readFileSync("src/features/lesson/ConversationSceneStep.tsx", "utf8"),
  };
}

export function loadMobilityRuntime() {
  const { ALL_LESSONS } = require("../../src/data/journey.ts");
  const { CONVERSATION_SCENES } = require("../../src/data/conversationScenes.ts");
  const { CHUNKS } = require("../../src/data/chunks.ts");
  const { CHARACTERS } = require("../../src/data/characters.ts");
  const { HANZI_MEMORY_TARGETS } = require("../../src/data/hanziMemoryTargets.ts");
  const { CULTURE_ITEMS } = require("../../src/data/culture.ts");
  const { CULTURE_MISSIONS } = require("../../src/data/cultureMissions.ts");
  const { CULTURE_JOURNEY_BRIDGES } = require("../../src/data/cultureJourneyBridges.ts");
  const { lessonRoundStepsFor } = require("../../src/features/lesson/lessonTasks.ts");
  const { MOBILITY_SURVIVAL_TOPIC_IDS } = require("../../src/data/chinaSurvivalMobility.ts");
  const { INSTRUCTION_GLOSS_EN, hasEnglishOverlay, isCanonicalZhOrPinyin } = require("../../src/i18n/overlays/instructionGloss.ts");
  const plans = Object.fromEntries(
    MOBILITY_SURVIVAL_TOPIC_IDS.map((id) => [
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
    missions: CULTURE_MISSIONS,
    bridges: CULTURE_JOURNEY_BRIDGES,
    gloss: INSTRUCTION_GLOSS_EN,
    hasEnglishOverlay,
    isCanonicalZhOrPinyin,
    lessonPlayerSource: fs.readFileSync("src/features/lesson/LessonPlayer.tsx", "utf8"),
    conversationPlayerSource: fs.readFileSync("src/features/lesson/ConversationSceneStep.tsx", "utf8"),
    lessonStepsSource: fs.readFileSync("src/features/lesson/steps.tsx", "utf8"),
  };
}

function loadTravelBundle(topicIds) {
  const { ALL_LESSONS } = require("../../src/data/journey.ts");
  const { CONVERSATION_SCENES } = require("../../src/data/conversationScenes.ts");
  const { CHUNKS } = require("../../src/data/chunks.ts");
  const { CHARACTERS } = require("../../src/data/characters.ts");
  const { HANZI_MEMORY_TARGETS } = require("../../src/data/hanziMemoryTargets.ts");
  const { CULTURE_ITEMS } = require("../../src/data/culture.ts");
  const { CULTURE_MISSIONS } = require("../../src/data/cultureMissions.ts");
  const { CULTURE_JOURNEY_BRIDGES } = require("../../src/data/cultureJourneyBridges.ts");
  const { lessonRoundStepsFor } = require("../../src/features/lesson/lessonTasks.ts");
  const { INSTRUCTION_GLOSS_EN, hasEnglishOverlay, isCanonicalZhOrPinyin } = require("../../src/i18n/overlays/instructionGloss.ts");
  const plans = Object.fromEntries(
    topicIds.map((id) => [
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
    missions: CULTURE_MISSIONS,
    bridges: CULTURE_JOURNEY_BRIDGES,
    gloss: INSTRUCTION_GLOSS_EN,
    hasEnglishOverlay,
    isCanonicalZhOrPinyin,
    lessonPlayerSource: fs.readFileSync("src/features/lesson/LessonPlayer.tsx", "utf8"),
    conversationPlayerSource: fs.readFileSync("src/features/lesson/ConversationSceneStep.tsx", "utf8"),
    lessonStepsSource: fs.readFileSync("src/features/lesson/steps.tsx", "utf8"),
  };
}

export function loadHotelRuntime() {
  const { HOTEL_SURVIVAL_TOPIC_IDS } = require("../../src/data/chinaSurvivalHotel.ts");
  return loadTravelBundle([...HOTEL_SURVIVAL_TOPIC_IDS]);
}

export function loadAirportRuntime() {
  const { AIRPORT_SURVIVAL_TOPIC_IDS } = require("../../src/data/chinaSurvivalAirport.ts");
  return loadTravelBundle([...AIRPORT_SURVIVAL_TOPIC_IDS]);
}

export function loadTravelRuntime() {
  const { TRAVEL_SURVIVAL_TOPIC_IDS } = require("../../src/data/chinaSurvivalTravel.ts");
  return loadTravelBundle([...TRAVEL_SURVIVAL_TOPIC_IDS]);
}
