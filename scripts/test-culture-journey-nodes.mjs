import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureJourneyNodes } from "./lib/culture-native-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureJourneyNodes(base).failures, [], "positive control must pass");

function fixture() {
  return {
    ...base,
    nodes: structuredClone(base.nodes),
    placement: structuredClone(base.placement),
    nativeLessons: structuredClone(base.nativeLessons),
    lessons: structuredClone(base.lessons),
    journeyInlineSource: base.journeyInlineSource,
    routeForJourneyNode: base.routeForJourneyNode,
    isTopicMasteryLesson: base.isTopicMasteryLesson,
  };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureJourneyNodes(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("2 missing journey node", (data) => {
  data.nodes = data.nodes.filter((node) => node.type !== "CULTURE_LESSON" || node.id !== "culture:metro-qr");
}, "MISSING_NODE");

mutation("3 Hub/Journey id mismatch", (data) => {
  const node = data.nodes.find((item) => item.id === "culture:metro-qr");
  node.sourceId = "culture-digital-pay";
}, "HUB_JOURNEY_MISMATCH");

mutation("14 node too early", (data) => {
  for (const node of data.nodes.filter((item) => item.type === "CULTURE_LESSON")) {
    node.requiredCompletedLessonIds = [];
  }
}, "NODE_TOO_EARLY");

mutation("CORE/EXPLORE track mismatch", (data) => {
  const node = data.nodes.find((item) => item.id === "culture:metro-qr");
  node.priority = "OPTIONAL";
}, "TRACK");

console.log("PASS test:culture-journey-nodes");
