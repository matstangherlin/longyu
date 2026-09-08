import type { Lesson, LessonStep } from "./journey";
import type { MasteryPass } from "./masteryLoop";

export const ROUTINE_TIME_TOPIC_IDS = ["p6-rotina-trabalho", "p6-horarios"] as const;

const RECOGNITION_KINDS = new Set(["intro", "flashcard", "match_pairs"]);
const DISCRIMINATION_KINDS = new Set([
  "listen_select",
  "image_choice",
  "comprehend",
  "audio_discrimination",
  "odd_one_out",
  "compare_with_image",
]);
const PRODUCTION_TEACHING_KINDS = new Set([
  "dialogue_choice",
  "sentence_build",
  "fill_blank",
  "produce",
]);

/** Keep the authored progression visible rather than replacing it with unrelated generated drills.
 * M1 recognizes (intro/flash/match + the first half of the listens).
 * M2 discriminates (remaining listens + listen_select/image).
 * M3 produces (dialogue/build + the first independent write).
 * M4 applies: scene, post-conversation, remaining writes.
 */
export function routineTimePlanFor(lesson: Lesson, pass: MasteryPass, aggregate = false): LessonStep[] | null {
  if (!(ROUTINE_TIME_TOPIC_IDS as readonly string[]).includes(lesson.id)) return null;
  if (aggregate) return lesson.steps;
  const teaching = lesson.steps.filter(
    s => s.kind !== "conversation_scene" && s.kind !== "write" && !s.postConversationPhase
  );
  const production = lesson.steps.filter(s => s.kind === "write");
  const scenes = lesson.steps.filter(s => s.kind === "conversation_scene");
  const postConversation = lesson.steps.filter(s => s.postConversationPhase);
  const recog = teaching.filter(s => RECOGNITION_KINDS.has(s.kind));
  const listens = teaching.filter(s => s.kind === "listen");
  const disc = teaching.filter(s => DISCRIMINATION_KINDS.has(s.kind));
  const prodTeach = teaching.filter(s => PRODUCTION_TEACHING_KINDS.has(s.kind));
  const leftover = teaching.filter(
    s =>
      !RECOGNITION_KINDS.has(s.kind) &&
      s.kind !== "listen" &&
      !DISCRIMINATION_KINDS.has(s.kind) &&
      !PRODUCTION_TEACHING_KINDS.has(s.kind)
  );
  const listenSplit = Math.ceil(listens.length / 2);
  const m2pool = [...listens.slice(listenSplit), ...disc];
  const m3fromPool = m2pool.slice(m2pool.length > 6 ? -2 : -1);
  const m2 = m2pool.slice(0, Math.max(0, m2pool.length - m3fromPool.length));
  if (pass === 1) return [...recog, ...listens.slice(0, listenSplit), ...leftover];
  if (pass === 2) return m2;
  if (pass === 3) return [...m3fromPool, ...prodTeach, ...production.slice(0, 1)];
  const applied = new Set<LessonStep>([...scenes, ...postConversation]);
  return [...scenes, ...postConversation, ...production.filter(step => !applied.has(step))];
}
