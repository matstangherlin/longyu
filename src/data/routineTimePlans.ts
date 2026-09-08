import type { Lesson, LessonStep } from "./journey";
import { masteryPassProfile } from "./masteryLoop";
import type { MasteryPass } from "./masteryLoop";

export const ROUTINE_TIME_TOPIC_IDS = ["p6-rotina-trabalho", "p6-horarios"] as const;

/** The later passes discourage kinds that only make sense while the material is new
 * (intro, flashcard, match_pairs). Source order alone would drop them into M2/M3, so the
 * teaching is ordered by how many passes still accept each step — the most restricted first,
 * authored order preserved inside each group. */
function passesAccepting(step: LessonStep): number {
  return ([1, 2, 3] as MasteryPass[]).filter(pass => !masteryPassProfile(pass).discouragedKinds.includes(step.kind))
    .length;
}

/** Keep the authored progression visible rather than replacing it with unrelated generated drills.
 * M1–M3 distribute the existing teaching, earliest-only kinds first. M4 is the conversational application:
 * the scene, the tasks derived from it, and the independent production of the same lesson.
 */
export function routineTimePlanFor(lesson: Lesson, pass: MasteryPass, aggregate = false): LessonStep[] | null {
  if (!(ROUTINE_TIME_TOPIC_IDS as readonly string[]).includes(lesson.id)) return null;
  if (aggregate) return lesson.steps;
  const teaching = lesson.steps
    .filter(s => s.kind !== "conversation_scene" && s.kind !== "write" && !s.postConversationPhase)
    .map((step, index) => ({ step, index, room: passesAccepting(step) }))
    .sort((a, b) => a.room - b.room || a.index - b.index)
    .map(entry => entry.step);
  const production = lesson.steps.filter(s => s.kind === "write");
  const scenes = lesson.steps.filter(s => s.kind === "conversation_scene");
  const postConversation = lesson.steps.filter(s => s.postConversationPhase);
  const width = Math.ceil(teaching.length / 3);
  if (pass < 4) {
    return [...teaching.slice((pass - 1) * width, pass * width), ...(pass === 3 && production.length > 0 ? production.slice(0, 1) : [])];
  }
  const applied = new Set<LessonStep>([...scenes, ...postConversation]);
  return [...scenes, ...postConversation, ...production.filter(step => !applied.has(step))];
}
