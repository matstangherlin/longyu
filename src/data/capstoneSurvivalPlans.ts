import { conversationSceneStepFromId } from "./conversationScenes";
import type { Lesson, LessonStep } from "./journey";
import {
  CAPSTONE_SURVIVAL_TOPIC_IDS,
  capstoneVariantFor,
  type CapstoneVariant,
} from "./chinaSurvivalCapstone";

/**
 * Authored capstone slices. Warm-up stays short and disappears when mastery is already high.
 * Hotel stays in the runtime plan only — hosting `checkin-hotel` in authored
 * steps would reopen the existing char:de lexical debt under a new lesson key.
 */
export const CAPSTONE_WARMUP_INDEXES = [0, 1, 2, 3, 4] as const;

export const CAPSTONE_VARIANT_INDEXES: Record<CapstoneVariant, readonly number[]> = {
  A: [5, 6, 8, 13],
  B: [5, 7, 9, 10, 13],
  C: [5, 11, 12, 14],
};

function slice(steps: LessonStep[], indexes: readonly number[]): LessonStep[] {
  return indexes.map((index) => steps[index]).filter((step): step is LessonStep => Boolean(step));
}

function hostedScene(sceneId: string): LessonStep {
  const scene = conversationSceneStepFromId(sceneId);
  if (!scene) throw new Error(`capstone missing scene ${sceneId}`);
  return {
    kind: "conversation_scene",
    title: scene.title,
    sceneId: scene.sceneId,
    setting: scene.setting,
    characters: scene.characters,
    lines: scene.lines,
    checkpoint: scene.checkpoint,
    nodes: scene.nodes,
    entryNodeId: scene.entryNodeId,
    sceneIntent: scene.intent,
    learnedRefs: scene.learnedRefs,
    newRefs: scene.newRefs,
  };
}

export function capstoneShouldWarmup(context: { masteryPass?: number; masteryLevel?: number } = {}): boolean {
  if (context.masteryPass != null) return context.masteryPass < 3;
  if (context.masteryLevel != null) return context.masteryLevel < 3;
  return true;
}

export function capstoneSurvivalPlanFor(
  lesson: Lesson,
  context: { attemptNumber?: number; masteryPass?: number; masteryLevel?: number } = {}
): LessonStep[] | null {
  if (!(CAPSTONE_SURVIVAL_TOPIC_IDS as readonly string[]).includes(lesson.id)) return null;
  const steps = lesson.steps ?? [];
  const variant = capstoneVariantFor(context.attemptNumber ?? 0);
  const selected = slice(steps, CAPSTONE_VARIANT_INDEXES[variant]);
  const last = selected[selected.length - 1];
  const body =
    variant === "A"
      ? last?.kind === "free_production"
        ? [...selected.slice(0, -1), hostedScene("checkin-hotel"), last]
        : [...selected, hostedScene("checkin-hotel")]
      : selected;
  if (!capstoneShouldWarmup(context)) return body;
  return [...slice(steps, CAPSTONE_WARMUP_INDEXES), ...body];
}
