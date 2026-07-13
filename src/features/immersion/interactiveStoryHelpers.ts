import type { ReviewDomain } from "../../lib/srs";
import type { Track } from "../../lib/store";
import type { ItemType } from "../../data/types";
import type {
  FlatStoryStep,
  InteractiveStory,
  StoryReviewTarget,
  StoryStep,
  StoryStepKind,
} from "../../data/interactiveStories";

export const STORY_PROGRESS_KEY = "longyu-interactive-story-progress-v1";

export interface StoredStoryProgress {
  completedStepIds: string[];
  completed: boolean;
  bestScore: number;
  attempts: number;
  updatedAt: number;
}

export type StoryProgressMap = Record<string, StoredStoryProgress>;
export type StoryStatus = "novo" | "em progresso" | "concluido";

export function flattenStorySteps(story: InteractiveStory): FlatStoryStep[] {
  const flat: FlatStoryStep[] = [];
  let globalIndex = 0;
  for (const scene of story.scenes) {
    for (const step of scene.steps) {
      flat.push({
        ...step,
        sceneId: scene.id,
        setting: scene.setting,
        characters: scene.characters,
        globalIndex,
      });
      globalIndex += 1;
    }
  }
  return flat;
}

export function storyStepCount(story: InteractiveStory): number {
  return flattenStorySteps(story).length;
}

export function readStoryProgress(): StoryProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORY_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const progress: StoryProgressMap = {};
    Object.entries(parsed as Record<string, Partial<StoredStoryProgress>>).forEach(([storyId, value]) => {
      if (!value || typeof value !== "object") return;
      progress[storyId] = {
        completedStepIds: Array.isArray(value.completedStepIds)
          ? value.completedStepIds.filter((stepId): stepId is string => typeof stepId === "string")
          : [],
        completed: Boolean(value.completed),
        bestScore: typeof value.bestScore === "number" ? value.bestScore : 0,
        attempts: typeof value.attempts === "number" ? value.attempts : 0,
        updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
      };
    });
    return progress;
  } catch {
    return {};
  }
}

export function writeStoryProgress(progress: StoryProgressMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORY_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Local progress is helpful, but the story should remain playable without it.
  }
}

export function updateStoredStoryProgress(
  storyId: string,
  update: (previous: StoredStoryProgress | undefined) => StoredStoryProgress
) {
  const progress = readStoryProgress();
  progress[storyId] = update(progress[storyId]);
  writeStoryProgress(progress);
  return progress[storyId];
}

const INTERACTIVE_KINDS = new Set<StoryStepKind>([
  "choose_reply",
  "choose_meaning",
  "fill_hanzi",
  "fill_pinyin",
  "listen_choice",
  "image_choice",
  "mini_review",
]);

export function storyStepIsInteractive(step: StoryStep): boolean {
  return INTERACTIVE_KINDS.has(step.kind);
}

export function storyAnswerText(step: StoryStep): string {
  if (step.kind === "image_choice") {
    const value = step.correctImageId ?? step.answer;
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  }
  if (Array.isArray(step.answer)) return step.answer[0] ?? "";
  return step.answer ?? step.hanzi ?? "";
}

function normalizeStoryAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s.,!?。！？、，;；:：'"“”‘’()（）-]/g, "");
}

export function storyAnswerMatches(step: StoryStep, value: string): boolean {
  if (step.kind === "image_choice") {
    return normalizeStoryAnswer(value) === normalizeStoryAnswer(storyAnswerText(step));
  }
  const accepted = Array.isArray(step.answer) ? step.answer : [step.answer ?? ""];
  const normalized = normalizeStoryAnswer(value);
  return accepted.some((answer) => normalizeStoryAnswer(answer) === normalized);
}

export function storyStatus(progress?: StoredStoryProgress): StoryStatus {
  if (progress?.completed) return "concluido";
  if ((progress?.completedStepIds.length ?? 0) > 0) return "em progresso";
  return "novo";
}

export function storyCompletedCount(story: InteractiveStory, progress?: StoredStoryProgress): number {
  const total = storyStepCount(story);
  if (progress?.completed) return total;
  return Math.min(total, progress?.completedStepIds.length ?? 0);
}

export function initialStoryStepIndex(story: InteractiveStory, progress?: StoredStoryProgress): number {
  const steps = flattenStorySteps(story);
  if (!progress || progress.completed) return 0;
  const completedIds = new Set(progress.completedStepIds);
  const nextIndex = steps.findIndex((step) => !completedIds.has(step.id));
  return nextIndex >= 0 ? nextIndex : 0;
}

export function storySkill(step: StoryStep): import("../../lib/store").ActivityErrorSkill {
  const domain = step.reviewTarget?.domain;
  if (domain === "forma") return "hanzi";
  return domain ?? "uso";
}

export function storyReviewTarget(
  type: ItemType,
  itemId: string,
  domain: ReviewDomain,
  track: Track
): StoryReviewTarget {
  return { type, itemId, domain, track };
}
