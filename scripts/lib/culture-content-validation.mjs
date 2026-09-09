/**
 * validate:culture-content
 *
 * Unique ids, PT+EN, category, scope, sources with URL, related lessons/chunks/hanzi,
 * estimated minutes, non-empty learning sections, mini-check.
 */
export function validateCultureContent(data) {
  const failures = [];
  const fail = (code, ref, message) => failures.push({ code, ref, message });
  const items = data.items ?? [];
  const lessons = new Map((data.lessons ?? []).map((lesson) => [lesson.id, lesson]));
  const chunkIds = new Set((data.chunks ?? []).map((chunk) => chunk.id));
  const hanziIds = new Set((data.characters ?? []).map((character) => character.id));
  const categories = new Set(data.categories ?? []);
  const scopes = new Set(data.scopes ?? []);
  const seen = new Set();

  if (!items.length) fail("EMPTY_CATALOG", "catalog", "no CultureItems");

  for (const item of items) {
    const ref = item?.id || "(missing-id)";
    if (!item?.id || typeof item.id !== "string") {
      fail("MISSING_ID", ref, "id required");
      continue;
    }
    if (seen.has(item.id)) fail("DUPLICATE_ID", item.id, "duplicate CultureItem id");
    seen.add(item.id);

    for (const field of ["titlePt", "titleEn", "summaryPt", "summaryEn", "bodyPt", "bodyEn", "situationPt", "situationEn", "noticePt", "noticeEn", "whyPt", "whyEn", "practicePt", "practiceEn"]) {
      if (!String(item[field] ?? "").trim()) fail("EMPTY_COPY", item.id, `${field} empty`);
    }
    if (!String(item.titleEn ?? "").trim()) fail("MISSING_EN", item.id, "titleEn required");
    if (!categories.has(item.category)) fail("BAD_CATEGORY", item.id, `unknown category ${item.category}`);
    if (!item.scope) fail("MISSING_SCOPE", item.id, "scope required");
    if (!scopes.has(item.scope)) fail("BAD_SCOPE", item.id, `unknown scope ${item.scope}`);

    const minutes = Number(item.estimatedMinutes);
    if (!Number.isFinite(minutes) || minutes < 2 || minutes > 5) {
      fail("BAD_MINUTES", item.id, `estimatedMinutes must be 2–5, got ${item.estimatedMinutes}`);
    }
    if (!Number.isFinite(Number(item.order))) fail("BAD_ORDER", item.id, "order required");

    const sources = item.sources ?? [];
    if (!sources.length) fail("MISSING_SOURCE", item.id, "at least one source required");
    for (const [index, source] of sources.entries()) {
      if (!String(source?.title ?? "").trim()) fail("SOURCE_TITLE", item.id, `source[${index}].title`);
      if (!String(source?.publisher ?? "").trim()) fail("SOURCE_PUBLISHER", item.id, `source[${index}].publisher`);
      if (!String(source?.accessedAt ?? "").trim()) fail("SOURCE_ACCESSED", item.id, `source[${index}].accessedAt`);
      const url = String(source?.url ?? "").trim();
      if (!url) fail("SOURCE_URL", item.id, `source[${index}].url`);
      else if (!/^https?:\/\//i.test(url)) fail("SOURCE_URL", item.id, `source[${index}].url must be http(s)`);
    }

    const related = item.relatedLessonIds ?? [];
    if (!related.length) fail("MISSING_LESSON_LINKS", item.id, "relatedLessonIds required");
    for (const lessonId of related) {
      if (!lessons.has(lessonId)) fail("UNKNOWN_LESSON", item.id, `relatedLessonId ${lessonId} does not exist`);
    }

    for (const chunkId of item.relatedChunkRefs ?? []) {
      if (!chunkIds.has(chunkId)) fail("UNKNOWN_CHUNK", item.id, `relatedChunkRef ${chunkId} does not exist`);
    }
    for (const hanziId of item.relatedHanziRefs ?? []) {
      if (!hanziIds.has(hanziId)) fail("UNKNOWN_HANZI", item.id, `relatedHanziRef ${hanziId} does not exist`);
    }

    const check = item.miniCheck;
    if (!check) fail("MISSING_CHECK", item.id, "miniCheck required");
    else {
      if (!String(check.promptPt ?? "").trim() || !String(check.promptEn ?? "").trim()) {
        fail("CHECK_PROMPT", item.id, "miniCheck prompts required in PT and EN");
      }
      if (!Array.isArray(check.options) || check.options.length !== 3) {
        fail("CHECK_OPTIONS", item.id, "miniCheck needs exactly 3 options");
      }
      const optionIds = (check.options ?? []).map((option) => option?.id);
      if (new Set(optionIds).size !== optionIds.length) fail("CHECK_OPTIONS", item.id, "miniCheck option ids must be unique");
      if (!optionIds.includes(check.correctOptionId)) fail("CHECK_ANSWER", item.id, "correctOptionId missing from options");
      for (const option of check.options ?? []) {
        if (!String(option?.labelPt ?? "").trim() || !String(option?.labelEn ?? "").trim()) {
          fail("CHECK_OPTIONS", item.id, "each option needs PT and EN");
        }
      }
    }
  }

  for (const lesson of data.lessons ?? []) {
    if (!lesson.cultureItemId) continue;
    if (!seen.has(lesson.cultureItemId)) {
      fail("UNKNOWN_CULTURE_ON_LESSON", lesson.id, `cultureItemId ${lesson.cultureItemId} does not exist`);
    }
  }

  const rejected = data.rejected ?? [];
  if (!rejected.some((row) => row.id === "cold-at-host-home" && row.status === "REJECTED_UNVERIFIED")) {
    fail("MISSING_REJECTION", "cold-at-host-home", "unverified 'I am cold at a host home' claim must stay REJECTED_UNVERIFIED");
  }

  return { failures, count: items.length };
}
