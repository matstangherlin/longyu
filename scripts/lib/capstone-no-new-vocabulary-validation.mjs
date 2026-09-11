const CAPSTONE_ID = "p7-china-survival";
const TEACH_KINDS = new Set(["listen", "flashcard", "hanzi_build", "tone"]);
const CJK = /[\u3400-\u9fff]/u;

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

function firstTeachIndex(lessons, phrase) {
  const needle = clean(phrase);
  for (const [lessonIndex, lesson] of (lessons ?? []).entries()) {
    for (const [stepIndex, step] of (lesson.steps ?? []).entries()) {
      const blob = clean(`${step.text ?? ""}${step.hanzi ?? ""}${step.chunkId ?? ""}`);
      if (TEACH_KINDS.has(step.kind) && blob.includes(needle)) return { lessonIndex, stepIndex, lessonId: lesson.id };
    }
  }
  return null;
}

export function validateCapstoneNoNewVocabulary(data) {
  const { lessons, scenes, chunks = [] } = data;
  const failures = [];
  const fail = (code, message) => failures.push({ code, message });
  const lesson = (lessons ?? []).find((item) => item.id === CAPSTONE_ID);
  if (!lesson) {
    fail("NO_NEW_VOCAB", "capstone lesson missing");
    return { failures };
  }
  if ((lesson.newRefs ?? []).length > 0) fail("NO_NEW_VOCAB", `capstone newRefs=${lesson.newRefs.join(",")}`);
  if ((lesson.newHanzi ?? []).length > 0) fail("NO_NEW_VOCAB", "capstone must not declare newHanzi");
  if ((lesson.steps ?? []).some((step) => step.kind === "flashcard")) {
    fail("NO_NEW_VOCAB", "capstone flashcard would teach new vocabulary");
  }
  if ((lesson.steps ?? []).some((step) => step.kind === "listen" && step.text && !/复习|recupere|já/i.test(`${step.title ?? ""}${step.explanation ?? ""}`))) {
    // listen is allowed as recall if the phrase was taught earlier
  }

  const capstoneIndex = (lessons ?? []).findIndex((item) => item.id === lesson.id);
  const hosted = new Set(
    (lesson.steps ?? []).filter((step) => step.kind === "conversation_scene").map((step) => step.sceneId)
  );
  for (const scene of (scenes ?? []).filter((item) => hosted.has(item.sceneId))) {
    if ((scene.newRefs ?? []).length > 0) fail("NO_NEW_VOCAB", `${scene.sceneId} has newRefs`);
  }

  const ownTargets = (lesson.steps ?? [])
    .filter((step) => step.kind === "free_production" || step.kind === "fill_blank" || step.kind === "listen")
    .map((step) => clean(step.answer ?? step.correctAnswer ?? step.blankAnswer ?? step.text ?? ""))
    .filter((phrase) => CJK.test(phrase) && phrase.length >= 2);
  for (const phrase of ownTargets) {
    const taught = firstTeachIndex(lessons.slice(0, capstoneIndex), phrase);
    const chunk = chunks.find((item) => clean(item.hanzi) === phrase);
    const chunkTeach =
      chunk &&
      (lessons ?? []).slice(0, capstoneIndex).some((item) =>
        (item.steps ?? []).some((step) => step.chunkId === chunk.id || clean(`${step.text ?? ""}`).includes(clean(chunk.hanzi)))
      );
    if (!taught && !chunkTeach) fail("LEXICAL_GAP", `capstone charges ${phrase} without a prior teach`);
  }

  return { failures };
}
