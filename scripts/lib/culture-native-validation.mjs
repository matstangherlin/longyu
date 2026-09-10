const STANDARD_KINDS = new Set([
  "contextual_choice",
  "fill_blank",
  "match_pairs",
  "dialogue_choice",
  "spot_error",
  "image_choice",
]);

const GRADED_KINDS = new Set([
  ...STANDARD_KINDS,
  "comprehend",
  "listen_select",
  "sentence_build",
]);

function failList() {
  const failures = [];
  return {
    failures,
    fail(code, ref, message) {
      failures.push({ code, ref, message });
    },
  };
}

function blobOf(step) {
  return [
    step.title,
    step.body,
    step.prompt,
    step.promptPt,
    step.dialoguePrompt,
    step.explanation,
    step.situationPt,
    step.kind === "fill_blank" ? undefined : step.correctAnswer,
    step.blankAnswer,
    step.sentenceBefore,
    step.sentenceAfter,
    ...(step.options ?? []),
    ...(step.bank ?? []),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
  ]
    .filter(Boolean)
    .map(String);
}

function itemIdOfLesson(lesson) {
  return lesson.cultureItemId ?? String(lesson.id ?? "").replace(/^culture-/, "");
}

export function validateCultureNativeLessons(data) {
  const { fail, failures } = failList();
  const languageIds = new Set((data.lessons ?? []).map((lesson) => lesson.id));
  const items = data.items ?? [];
  const native = data.nativeLessons ?? [];
  const byItem = new Map(native.map((lesson) => [itemIdOfLesson(lesson), lesson]));
  const hasEnglish = data.hasEnglishOverlay ?? (() => true);

  if (native.length !== items.length) {
    fail("NATIVE_COVERAGE", "catalog", `expected ${items.length} native lessons, found ${native.length}`);
  }

  const kindsSeen = new Set();
  for (const item of items) {
    const lesson = byItem.get(item.id);
    if (!lesson) {
      fail("NATIVE_COVERAGE", item.id, "published CultureItem has no native lesson");
      continue;
    }
    if (lesson.lessonDomain !== "culture") fail("DOMAIN", lesson.id, "native lesson must declare lessonDomain=culture");
    if (languageIds.has(lesson.id)) fail("TOPIC_COUNT", lesson.id, "culture lesson must not sit in ALL_LESSONS");
    if (data.isTopicMasteryLesson?.(lesson)) fail("TOPIC_COUNT", lesson.id, "culture lesson must not be a topic-mastery node");
    const steps = lesson.steps ?? [];
    const firstTeach = steps.findIndex(
      (step) => step.kind === "intro" || step.pedagogicalEvidence?.role === "teach"
    );
    const firstGraded = steps.findIndex(
      (step) => GRADED_KINDS.has(step.kind) || step.pedagogicalEvidence?.graded === true
    );
    if (firstGraded < 0) fail("STORY_NO_ACTIVITY", lesson.id, "story/teach without a scored activity");
    if (firstTeach < 0) fail("TEACH_AFTER_TEST", lesson.id, "missing teach screen");
    if (firstGraded >= 0 && firstTeach >= 0 && !(firstTeach < firstGraded)) {
      fail("TEACH_AFTER_TEST", lesson.id, "first teach must precede first scored step");
    }
    const kinds = new Set(steps.map((step) => step.kind).filter((kind) => STANDARD_KINDS.has(kind)));
    kinds.forEach((kind) => kindsSeen.add(kind));
    if (kinds.size < 2) fail("ONLY_MCQ", lesson.id, "native lesson needs more than one standard task kind");
    if (!steps.some((step) => step.kind === "fill_blank" || step.kind === "match_pairs" || step.kind === "dialogue_choice")) {
      fail("MISSING_ENGINE", lesson.id, "need fill_blank, match_pairs or dialogue_choice");
    }
    for (const text of steps.flatMap(blobOf)) {
      if (!hasEnglish(text)) fail("MISSING_EN", `${lesson.id}:${text.slice(0, 48)}`, "culture lesson copy needs EN overlay");
    }
  }

  if (!kindsSeen.has("fill_blank") || !kindsSeen.has("match_pairs") || !kindsSeen.has("dialogue_choice")) {
    fail("MISSING_ENGINE", "catalog", "global catalog lost fill, match or dialogue");
  }

  return { failures };
}

export function validateCultureJourneyNodes(data) {
  const { fail, failures } = failList();
  const languageIds = new Set((data.lessons ?? []).map((lesson) => lesson.id));
  const placement = data.placement ?? [];
  const nodes = (data.nodes ?? []).filter((node) => node.type === "CULTURE_LESSON");
  const byItem = new Map(nodes.map((node) => [String(node.id ?? "").replace(/^culture:/, ""), node]));
  const native = new Map((data.nativeLessons ?? []).map((lesson) => [itemIdOfLesson(lesson), lesson]));

  for (const row of placement) {
    const node = byItem.get(row.itemId);
    const lesson = native.get(row.itemId);
    if (!node) {
      fail("MISSING_NODE", row.itemId, "placement has no CULTURE_LESSON node");
      continue;
    }
    if (!lesson) fail("HUB_JOURNEY_MISMATCH", row.itemId, "journey node without native lesson");
    if (node.sourceId !== lesson?.id) fail("HUB_JOURNEY_MISMATCH", row.itemId, "node sourceId must match culture-{itemId}");
    if (node.afterTopicId !== row.afterTopicId) fail("HUB_JOURNEY_MISMATCH", row.itemId, "afterTopicId mismatch");
    if (!languageIds.has(row.afterTopicId)) fail("MISSING_NODE", row.afterTopicId, "anchor language topic missing");
    const expectedPriority = row.track === "core" ? "CORE" : "OPTIONAL";
    if (node.priority !== expectedPriority) fail("TRACK", row.itemId, `expected ${expectedPriority}`);
    if (!(node.requiredCompletedLessonIds ?? []).includes(row.afterTopicId)) {
      fail("NODE_TOO_EARLY", row.itemId, "node must require the related language topic path-complete");
    }
    const route = data.routeForJourneyNode ? data.routeForJourneyNode(node) : "";
    if (!String(route).includes(`/licao/${node.sourceId}/player`)) {
      fail("ROUTE", row.itemId, "culture node must open LessonPlayer");
    }
  }

  if (nodes.length !== placement.length) {
    fail("MISSING_NODE", "catalog", `expected ${placement.length} culture nodes, found ${nodes.length}`);
  }

  const inline = data.journeyInlineSource ?? "";
  if (inline && !/CULTURE_LESSON/.test(inline)) {
    fail("MISSING_NODE", "JourneyInlineNode", "inline node must render CULTURE_LESSON");
  }
  if (inline && /CULTURE_LESSON/.test(inline) && !/completedLessons/.test(inline)) {
    fail("PROGRESS", "JourneyInlineNode", "culture complete must use store completedLessons");
  }

  return { failures };
}

export function validateCultureStandardTasks(data) {
  const { fail, failures } = failList();
  const player = data.lessonPlayerSource ?? "";
  const itemPage = data.cultureItemPageSource ?? "";
  const hub = data.cultureHubSource ?? "";
  const review = data.cultureReviewSource ?? "";
  const store = data.storeSource ?? "";

  if (itemPage && /CultureMissionPlayer/.test(itemPage) && /export \{ CultureMissionPlayer/.test(itemPage)) {
    fail("HUB_MISSION_PLAYER", "CultureItemPage", "hub item route still opens CultureMissionPlayer");
  }
  if (itemPage && !/Navigate/.test(itemPage)) {
    fail("HUB_MISSION_PLAYER", "CultureItemPage", "published items must redirect to LessonPlayer");
  }
  if (player && /culture-option-/.test(player)) {
    fail("CUSTOM_OPTIONS", "LessonPlayer", "culture lessons must not use custom culture-option buttons");
  }
  if (player && !/data-lesson-domain/.test(player)) {
    fail("STANDARD_PLAYER", "LessonPlayer", "culture player must declare lesson domain");
  }
  if (player && /setCultureBridgeOpen\(true\)/.test(player)) {
    fail("REDUNDANT_BRIDGE", "LessonPlayer", "do not inject redundant culture bridges");
  }
  if (player && !/isCultureDomain/.test(player)) {
    fail("SRS_LEAK", "LessonPlayer", "culture finish must skip lexical SRS");
  }
  if (player && !/lessonStars\(\{[\s\S]{0,240}hadMistakes/.test(player)) {
    fail("PERFECT_IGNORES_ERROR", "LessonPlayer", "stars must still use lessonStars/hadMistakes");
  }
  if (store && !/version: 24/.test(store)) {
    fail("MIGRATION", "store", "native culture progress needs persist v24");
  }
  if (store && /cultureMasteryById:\s*\{\}/.test(store) && /migrateNativeCultureProgress[\s\S]{0,200}cultureMasteryById:\s*\{\}/.test(store)) {
    fail("MIGRATION_WIPES_MASTERY", "store", "migration must not wipe culture mastery");
  }
  if (store && !/grantXp: false/.test(store)) {
    fail("REPLAY_XP", "store", "native completion must skip duplicate culture XP");
  }
  if (store && !/migrateNativeCultureProgress/.test(store)) {
    fail("SYNC", "store", "Hub and Journey ids must migrate in both directions");
  }
  if (hub && !/\/cultura\/\$\{/.test(hub) && !/\/licao\/culture-/.test(hub)) {
    fail("HUB_JOURNEY_MISMATCH", "CultureHubPage", "hub cards must keep a canonical culture path");
  }
  if (review && !/StepRenderer/.test(review)) {
    fail("STANDARD_PLAYER", "CultureReviewPage", "culture review must use StepRenderer");
  }

  const kinds = new Set();
  for (const lesson of data.nativeLessons ?? []) {
    for (const step of lesson.steps ?? []) {
      if (STANDARD_KINDS.has(step.kind)) kinds.add(step.kind);
    }
  }
  if (!kinds.has("fill_blank") || !kinds.has("match_pairs") || !kinds.has("dialogue_choice")) {
    fail("MISSING_ENGINE", "catalog", "standard-task catalog lost fill, match or dialogue");
  }

  return { failures };
}
