/**
 * validate:culture-distribution
 *
 * Eligible social/daily units need >= 1 related CultureItem.
 * Ineligible tone/hànzì units must record an explicit reason.
 * At most one cultureItemId per lesson. No culture on perception labs / hanzi builder lessons.
 */
const LAB_ROLES = new Set(["perception_lab"]);
const LAB_SKILL_HINT = /tom|tone|hànzì|hanzi|radical|sílaba|comparar tom/i;

export function validateCultureDistribution(data) {
  const failures = [];
  const fail = (code, ref, message) => failures.push({ code, ref, message });
  const items = data.items ?? [];
  const units = data.units ?? [];
  const ineligible = data.ineligible ?? {};
  const lessonById = new Map((data.lessons ?? []).map((lesson) => [lesson.id, lesson]));

  if (!Object.keys(ineligible).length) {
    fail("MISSING_INELIGIBLE", "distribution", "culture-ineligible units must be declared with a reason");
  }

  for (const [unitId, reason] of Object.entries(ineligible)) {
    if (!String(reason ?? "").trim()) fail("EMPTY_INELIGIBLE_REASON", unitId, "ineligible unit needs an explicit reason");
    if (!units.some((entry) => entry.unit.id === unitId)) {
      fail("UNKNOWN_INELIGIBLE_UNIT", unitId, "ineligible unit id is not in the Journey");
    }
  }

  for (const entry of units) {
    const unit = entry.unit;
    const reason = ineligible[unit.id];
    const lessonIds = new Set((unit.lessons ?? []).map((lesson) => lesson.id));
    const related = items.filter((item) => (item.relatedLessonIds ?? []).some((id) => lessonIds.has(id)));
    if (reason) continue;
    if (!related.length) {
      fail("ELIGIBLE_UNIT_EMPTY", unit.id, `eligible unit "${unit.title}" has no related CultureItem`);
    }
  }

  const touchpoints = [];
  for (const lesson of data.lessons ?? []) {
    if (!lesson.cultureItemId) continue;
    touchpoints.push(lesson.id);
    const item = items.find((row) => row.id === lesson.cultureItemId);
    if (!item) fail("TOUCHPOINT_UNKNOWN_ITEM", lesson.id, `cultureItemId ${lesson.cultureItemId} missing`);
    else if (!(item.relatedLessonIds ?? []).includes(lesson.id)) {
      fail("TOUCHPOINT_NOT_RELATED", lesson.id, "lesson cultureItemId must appear in relatedLessonIds");
    }
    if (LAB_ROLES.has(lesson.curriculumRole) || (lesson.skill === "som" && LAB_SKILL_HINT.test(String(lesson.title ?? "")))) {
      fail("CULTURE_ON_LAB", lesson.id, "do not attach culture touchpoints to pure tone labs");
    }
    if (String(lesson.id).includes("hanzi-builder") || String(lesson.title).toLowerCase().includes("hanzi builder")) {
      fail("CULTURE_ON_LAB", lesson.id, "do not attach culture touchpoints to Hanzi Builder labs");
    }
  }

  if (touchpoints.length < 10) {
    fail("TOO_FEW_TOUCHPOINTS", "journey", `need about 10–15 lessons with cultureItemId, found ${touchpoints.length}`);
  }
  if (touchpoints.length > 16) {
    fail("TOO_MANY_TOUCHPOINTS", "journey", `keep the first package to ~10–15 touchpoints, found ${touchpoints.length}`);
  }

  for (const hook of data.futureHooks ?? []) {
    if (!hook.remessa || !Array.isArray(hook.categories) || !hook.categories.length) {
      fail("FUTURE_HOOK", hook?.remessa || "hook", "V4.9.7+ culture hooks must name remessa and categories");
    }
  }

  return { failures, touchpoints: touchpoints.length, eligibleUnits: units.filter((entry) => !ineligible[entry.unit.id]).length };
}
