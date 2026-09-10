export function validateCultureJourneyIntegration(data) {
  const failures = [];
  const fail = (code, ref, message) => failures.push({ code, ref, message });
  const lessons = new Map((data.lessons ?? []).map((lesson) => [lesson.id, lesson]));
  const items = new Map((data.items ?? []).map((item) => [item.id, item]));
  const missions = new Map((data.missions ?? []).map((mission) => [mission.cultureItemId, mission]));
  const ineligible = data.ineligible ?? {};
  const bridges = data.bridges ?? [];
  const nativeLessons = data.nativeLessons ?? [];
  const nativeByItem = new Map(
    nativeLessons.map((lesson) => [lesson.cultureItemId ?? String(lesson.id ?? "").replace(/^culture-/, ""), lesson])
  );
  const nodes = (data.nodes ?? []).filter((node) => node.type === "CULTURE_LESSON");
  const nodeByItem = new Map(
    nodes.map((node) => [String(node.id ?? "").replace(/^culture:/, ""), node])
  );
  const byLesson = new Map();

  for (const item of data.items ?? []) {
    if (!nativeByItem.has(item.id)) {
      fail("NATIVE_COVERAGE", item.id, "published CultureItem needs a native Culture Lesson");
    }
    if (!nodeByItem.has(item.id)) {
      fail("NATIVE_COVERAGE", item.id, "published CultureItem needs a CULTURE_LESSON journey node");
    }
  }

  for (const bridge of bridges) {
    if (byLesson.has(bridge.lessonId)) fail("DOUBLE_BRIDGE", bridge.lessonId, "at most one culture bridge per lesson");
    byLesson.set(bridge.lessonId, bridge);
    const lesson = lessons.get(bridge.lessonId);
    if (!lesson) {
      fail("MISSING_LESSON", bridge.lessonId, "bridge points at an unknown lesson");
      continue;
    }
    if (lesson.cultureItemId !== bridge.cultureItemId) {
      fail("BRIDGE_ITEM_MISMATCH", bridge.lessonId, "bridge cultureItemId must match lesson.cultureItemId");
    }
    if (!items.has(bridge.cultureItemId)) fail("INVALID_ITEM", bridge.lessonId, "bridge cultureItemId is not a CultureItem");
    const mission = missions.get(bridge.cultureItemId);
    const missionConcepts = new Set(
      (mission?.steps ?? []).map((step) => step.cultureConceptId).concat((mission?.memoryTargets ?? []).map((target) => target.id))
    );
    if (!bridge.cultureConceptId || !missionConcepts.has(bridge.cultureConceptId)) {
      fail("INVALID_CONCEPT", bridge.lessonId, "bridge conceptId must match the CultureMission");
    }
    if (!String(bridge.explanation?.pt ?? "").trim() || !String(bridge.explanation?.en ?? "").trim()) {
      fail("MISSING_EN", bridge.lessonId, "bridge explanation needs PT and EN");
    }
    if (!String(bridge.prompt?.pt ?? "").trim() || !String(bridge.prompt?.en ?? "").trim()) {
      fail("MISSING_EN", `${bridge.lessonId}:task`, "bridge task needs PT and EN");
    }
    const unitId =
      data.units?.find((row) => row.unit.lessons.some((lesson) => lesson.id === bridge.lessonId))?.unit.id ??
      (data.lessonUnitId ? data.lessonUnitId(bridge.lessonId) : null);
    if (unitId && ineligible[unitId]) {
      fail("TECHNICAL_UNIT", bridge.lessonId, "do not force a culture bridge onto a technical lab unit");
    }
  }

  const nativeCoverage = (data.items ?? []).every((item) => nativeByItem.has(item.id) && nodeByItem.has(item.id));
  if (!nativeCoverage && (bridges.length < 8 || bridges.length > 12)) {
    fail("BRIDGE_COUNT", "catalog", `expected 8–12 journey bridges, found ${bridges.length}`);
  }

  const player = data.lessonPlayerSource ?? "";
  if (player && /setCultureBridgeOpen\(true\)/.test(player)) {
    fail("REDUNDANT_BRIDGE", "LessonPlayer", "native culture lessons replace mid-lesson bridge injection");
  }
  if (player && /ensureSrs\(/.test(player) && /completeCultureBridge[\s\S]{0,400}ensureSrs/.test(player)) {
    fail("SRS_LEAK", "LessonPlayer", "culture bridge must not touch lexical SRS");
  }
  if (player && /lessonDomain === "culture"/.test(player) && /function finish[\s\S]+ensureSrs/.test(player) && !/isCultureDomain/.test(player)) {
    fail("SRS_LEAK", "LessonPlayer", "culture native finish must skip lexical SRS");
  }

  return { failures, count: bridges.length };
}
