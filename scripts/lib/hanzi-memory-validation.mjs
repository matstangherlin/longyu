/**
 * CORE hànzì memory ladder — not every newHanzi glyph.
 */

const CJK = /[\u3400-\u9fff]/u;
const PRODUCTION = new Set(["write", "produce", "hanzi_build", "reverse_recall", "free_production"]);
const TEACH = new Set(["listen", "intro", "flashcard", "decompose", "recognize"]);
const MODALITY = {
  listen: "listen",
  listen_select: "listen",
  audio_discrimination: "listen",
  flashcard: "recognize",
  recognize: "recognize",
  match_pairs: "recognize",
  comprehend: "recognize",
  hanzi_build: "construct",
  decompose: "construct",
  sentence_build: "use",
  fill_blank: "use",
  write: "recall",
  produce: "recall",
  dialogue_choice: "use",
  conversation_scene: "use",
};

function glyphsOf(value) {
  return [...String(value ?? "")].filter((ch) => CJK.test(ch));
}

function stepBlob(step) {
  return [
    step.text,
    step.hanzi,
    step.audioText,
    step.audioTextB,
    step.correctAnswer,
    step.answer,
    step.prompt,
    ...(step.options ?? []),
    ...(step.targetParts ?? []),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
  ]
    .filter(Boolean)
    .join("");
}

function stepHasGlyph(step, glyph) {
  if (step.charId && step.charId === glyph.charId) return true;
  if ((step.charIds ?? []).includes(glyph.charId)) return true;
  return glyphsOf(stepBlob(step)).includes(glyph.glyph);
}

function reviewHasGlyph(lesson, glyph, chunks = [], characters = []) {
  for (const ref of lesson.reviewItems ?? []) {
    if (ref === `char:${glyph.charId}`) return true;
    if (ref.startsWith("char:")) {
      const ch = characters.find((item) => `char:${item.id}` === ref);
      if (ch?.hanzi === glyph.glyph) return true;
    }
    if (ref.startsWith("chunk:")) {
      const chunk = chunks.find((item) => `chunk:${item.id}` === ref);
      if (String(chunk?.hanzi ?? "").includes(glyph.glyph)) return true;
    }
  }
  return false;
}

export function validateHanziMemoryIntegration(data) {
  const failures = [];
  const fail = (code, message) => failures.push({ code, message });
  const lessons = data.lessons ?? [];
  const targets = data.hanziMemoryTargets ?? [];
  const indexById = new Map(lessons.map((lesson, index) => [lesson.id, index]));

  if (targets.length === 0) fail("NO_TARGETS", "nenhum Hanzi CORE declarado");

  for (const target of targets) {
    const introIndex = indexById.get(target.introduceLessonId);
    if (introIndex == null) {
      fail("MISSING_INTRO", `${target.glyph}: lição de introdução ausente (${target.introduceLessonId})`);
      continue;
    }
    const introLesson = lessons[introIndex];
    const declared = introLesson.hanziMemoryTargets ?? [];
    if (!declared.includes(target.glyph)) {
      fail("NOT_DECLARED", `${target.glyph}: CORE não está em hanziMemoryTargets de ${introLesson.id}`);
    }
    if ((introLesson.newHanzi ?? []).includes(target.glyph) && !declared.includes(target.glyph)) {
      fail("NEW_HANZI_AS_CORE", `${target.glyph}: newHanzi tratado como memória sem declaração CORE`);
    }

    const introSteps = introLesson.steps ?? [];
    let introTeach = null;
    let introProduction = null;
    introSteps.forEach((step, stepIndex) => {
      if (!stepHasGlyph(step, target)) return;
      if (introTeach == null && TEACH.has(step.kind)) introTeach = { stepIndex, kind: step.kind };
      if (introProduction == null && PRODUCTION.has(step.kind)) introProduction = { stepIndex, kind: step.kind };
    });
    if (
      introProduction &&
      (introTeach == null || introProduction.stepIndex < introTeach.stepIndex)
    ) {
      fail("TEACH_BEFORE_TEST", `${target.glyph}: produção (${introProduction.kind}) antes de exposição`);
    }

    const moments = [];
    const modalities = new Set();
    let exposures = 0;
    for (const lesson of lessons) {
      for (const step of lesson.steps ?? []) {
        if (!stepHasGlyph(step, target)) continue;
        moments.push(lesson.id);
        exposures += 1;
        const modality = MODALITY[step.kind];
        if (modality) modalities.add(modality);
      }
    }
    const uniqueMoments = [...new Set(moments)];
    if (exposures < 2) fail("EXPOSURE", `${target.glyph}: menos de duas exposições`);
    if (modalities.size < 2) fail("MODALITY", `${target.glyph}: uma só modalidade (${[...modalities].join(",") || "nenhuma"})`);
    if (uniqueMoments.length < 2) fail("JOURNEY_MOMENTS", `${target.glyph}: aparece em um só momento da Jornada`);

    const delayedOk = (target.delayedLessonIds ?? []).some((id) => {
      const lesson = lessons[indexById.get(id)];
      if (!lesson || (indexById.get(id) ?? -1) <= introIndex) return false;
      return (lesson.steps ?? []).some((step) => stepHasGlyph(step, target)) || reviewHasGlyph(lesson, target, data.chunks, data.characters);
    });
    if (!delayedOk) fail("DELAYED_RECALL", `${target.glyph}: sem recuperação 1–3 lições depois`);

    const reviewOk = lessons.slice(introIndex).some((lesson) => reviewHasGlyph(lesson, target, data.chunks, data.characters));
    if (!reviewOk) fail("REVIEW_CYCLE", `${target.glyph}: não entra no ciclo de revisão`);

    const introHanziKinds = introSteps.filter((step) =>
      ["hanzi_build", "recognize", "decompose"].includes(step.kind) && stepHasGlyph(step, target)
    );
    if (introHanziKinds.filter((step) => step.kind === "hanzi_build").length > 1) {
      fail("STACKED_BUILD", `${target.glyph}: mais de um hanzi_build na mesma sessão`);
    }
  }

  return { failures };
}
