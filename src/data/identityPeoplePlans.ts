import type { Lesson, LessonStep } from "./journey";
import type { MasteryPass } from "./masteryLoop";

export const IDENTITY_PEOPLE_TOPIC_IDS = ["l11-falo-pouco", "l13-dialogo-nome", "l18", "l24"] as const;

/** Keep the authored progression visible rather than replacing it with unrelated generated drills.
 * M1–M3 distribute the existing teaching in order. M4 is the conversational application.
 * No duplicated curriculum, new input, or independent answer bank is introduced here.
 */
export function identityPeoplePlanFor(lesson: Lesson, pass: MasteryPass, aggregate = false): LessonStep[] | null {
  if (!(IDENTITY_PEOPLE_TOPIC_IDS as readonly string[]).includes(lesson.id)) return null;
  if (aggregate) return lesson.steps;
  const teaching = lesson.steps.filter(s => s.kind !== "conversation_scene" && s.kind !== "write");
  const production = lesson.steps.filter(s => s.kind === "write");
  const scenes = lesson.steps.filter(s => s.kind === "conversation_scene");
  const postConversation = lesson.steps.filter(s => s.postConversationPhase);
  const width = Math.ceil(teaching.length / 3);
  if (pass < 4) {
    return [...teaching.slice((pass - 1) * width, pass * width), ...(pass === 3 && production.length > 0 ? production.slice(0, 1) : [])];
  }
  return [
    ...scenes,
    ...postConversation,
    ...(scenes.length
      ? production.slice(1).filter(s => !s.postConversationPhase)
      : production.filter(s => !s.postConversationPhase)),
  ];
}
