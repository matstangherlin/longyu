/**
 * Tone integration: explanation before test, contrast before production,
 * tones return outside P2, vocab already taught, no long MC runs.
 */

const P2_LESSON_IDS = [
  "p1-o-que-e-tom",
  "p2-ma-primeiro-tom",
  "p2-ma-segundo-tom",
  "p2-ma-terceiro-tom",
  "p2-ma-quarto-tom",
  "p2-comparar-tom-1-4",
  "p2-comparar-tom-2-3",
  "p2-tons-nihao",
  "p2-tons-xiexie",
];

const CHOICE_KINDS = new Set(["dialogue_choice", "listen_select", "contextual_choice"]);
const CJK = /[\u3400-\u9fff]/u;

function blob(step) {
  return [step.title, step.body, step.prompt, step.dialoguePrompt, step.explanation, step.pinyin, ...(step.options ?? [])]
    .filter(Boolean)
    .join(" ");
}

function glyphs(step) {
  return [...[step.hanzi, step.text, step.audioText, step.audioTextB, step.correctAnswer, ...(step.options ?? [])].filter(Boolean).join("")]
    .filter((ch) => CJK.test(ch));
}

function isToneActivity(step) {
  if (step.kind === "tone" || step.kind === "tone_pair") return true;
  const text = blob(step);
  if (step.kind === "audio_discrimination" && /tom|contorno|º tom|º\+/i.test(`${step.contrastLabel ?? ""} ${text}`)) return true;
  if ((step.kind === "listen_select" || step.kind === "dialogue_choice") && /tom|contorno/i.test(text)) return true;
  return false;
}

function taughtGlyphsUntil(lessons, endIndex) {
  const set = new Set();
  for (let i = 0; i <= endIndex; i += 1) {
    const lesson = lessons[i];
    for (const step of lesson.steps ?? []) {
      if (step.kind === "listen" || step.kind === "flashcard") {
        for (const ch of glyphs(step)) set.add(ch);
      }
    }
  }
  return set;
}

export function validateToneIntegration(data) {
  const failures = [];
  const fail = (code, message) => failures.push({ code, message });
  const plans = data.tonePlans ?? {};
  const m1 = plans[1] ?? [];
  const m2 = plans[2] ?? [];
  const m3 = plans[3] ?? [];
  const allFoundation = [...m1, ...m2, ...m3, ...(plans[4] ?? [])];

  const firstExplain = m1.findIndex((step) => step.kind === "intro" && /tom|contorno|sílaba|silaba/i.test(blob(step)));
  const firstAudio = m1.findIndex((step) => step.kind === "listen" || (step.kind === "tone" && step.assist === "guided"));
  const firstContrast = m1.findIndex(
    (step) => (step.kind === "listen_select" && (step.toneChoices?.length === 2 || (step.options ?? []).length === 2)) ||
      (step.kind === "tone" && (step.toneChoices ?? []).length === 2 && step.assist !== "guided")
  );
  if (firstExplain < 0) fail("EXPLAIN_BEFORE_TEST", "M1 sem explicação do que é tom");
  if (firstAudio < 0 || (firstExplain >= 0 && firstAudio < firstExplain)) {
    fail("EXPLAIN_BEFORE_TEST", "explicação de tom precisa ser seguida de áudio");
  }
  if (firstContrast >= 0 && firstExplain >= 0 && firstContrast < firstExplain) {
    fail("EXPLAIN_BEFORE_TEST", "contraste de tom antes da explicação");
  }

  const contrast14 = [...m2, ...m1].some((step) => {
    const options = (step.options ?? []).join("");
    return step.kind === "listen_select" && options.includes("妈") && options.includes("骂");
  });
  const contrast23 = [...m2, ...m1].some((step) => {
    const options = (step.options ?? []).join("");
    return step.kind === "listen_select" && options.includes("麻") && options.includes("马");
  });
  if (!contrast14) fail("CONTRAST", "falta contraste 1º × 4º com áudio");
  if (!contrast23) fail("CONTRAST", "falta contraste 2º × 3º com áudio");

  const production = allFoundation.findIndex((step) => step.kind === "reverse_recall" || step.kind === "write");
  const guided = allFoundation.filter((step) => step.kind === "tone" && step.assist === "guided").map((step) => step.tone);
  if (production >= 0 && guided.length < 4) fail("CONTRAST_BEFORE_PRODUCTION", "produção de tom antes dos quatro contornos guiados");

  let run = 0;
  let maxRun = 0;
  for (const step of allFoundation) {
    if (CHOICE_KINDS.has(step.kind) || (step.kind === "tone" && step.assist === "quiz")) {
      run += 1;
      if (run > maxRun) maxRun = run;
    } else run = 0;
  }
  if (maxRun > 4) fail("MC_STREAK", `série longa só de múltipla escolha (${maxRun})`);

  const lessons = data.lessons ?? [];
  const p2Index = Math.max(...P2_LESSON_IDS.map((id) => lessons.findIndex((lesson) => lesson.id === id)));
  const later = lessons.slice(p2Index + 1);
  const returns = later.filter((lesson) => (lesson.steps ?? []).some(isToneActivity));
  if (returns.length === 0) fail("TONE_OUTSIDE_P2", "tons não reaparecem depois do módulo P2");

  const integrationIds = new Set(["p6-horarios", "p6-clima", "l26c", "p6-compras", "p6-direcoes"]);
  for (const lesson of later) {
    if (!integrationIds.has(lesson.id)) continue;
    const index = lessons.findIndex((item) => item.id === lesson.id);
    const known = taughtGlyphsUntil(lessons, index);
    for (const step of lesson.steps ?? []) {
      if (!isToneActivity(step)) continue;
      const used = glyphs(step).filter((ch) => !"吗妈麻马骂".includes(ch));
      const unknown = used.filter((ch) => !known.has(ch));
      if (unknown.length) fail("UNTAUGHT_TONE_VOCAB", `${lesson.id}: tom usa vocabulário não ensinado (${unknown.join("")})`);
    }
  }

  return { failures };
}
