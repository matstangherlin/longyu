/**
 * RC2.3.6 — maps Personal Mastery targets to items of the EXISTING review
 * player (same SRS). Only items the learner already has in the SRS are used:
 * a target with no SRS item is never pulled in (taught-only by construction).
 */
import { CHARACTERS } from "../../data/characters";
import { CHUNKS } from "../../data/chunks";
import type { ItemType } from "../../data/types";
import type { ReviewDomain, SRSItem } from "../srs";
import type { CompetencyView } from "./competency";
import type { PracticeTask } from "./personalMastery";
import { targetId as tid } from "./adapters";

const charByGlyph = new Map(CHARACTERS.map((c) => [c.hanzi, c]));
const charById = new Map(CHARACTERS.map((c) => [c.id, c]));
const chunkByHanzi = new Map(CHUNKS.map((c) => [c.hanzi.replace(/[\s，。！？、,.!?]/g, ""), c]));
const chunkById = new Map(CHUNKS.map((c) => [c.id, c]));

export const VIEW_REVIEW_DOMAIN: Record<CompetencyView, ReviewDomain> = {
  meaning: "significado",
  listening: "som",
  form: "forma",
  handwriting: "forma",
  production: "uso",
};

export function srsRefForTarget(targetId: string): { type: ItemType; itemId: string } | null {
  const [kind, ...rest] = targetId.split(":");
  const value = rest.join(":");
  if (kind === "hanzi") {
    const c = charByGlyph.get(value);
    return c ? { type: "char", itemId: c.id } : null;
  }
  if (kind === "chunk") return chunkById.has(value) ? { type: "chunk", itemId: value } : null;
  if (kind === "word") {
    const c = chunkByHanzi.get(value);
    return c ? { type: "chunk", itemId: c.id } : null;
  }
  return null;
}

/** Target id for an SRS item (inverse mapping, used for due → REVIEW_DUE). */
export function targetForSrsItem(item: Pick<SRSItem, "type" | "itemId">): string | null {
  if (item.type === "char") {
    const c = charById.get(item.itemId);
    return c ? tid.hanzi(c.hanzi) : null;
  }
  if (item.type === "chunk") return tid.chunk(item.itemId);
  return null;
}

export interface PracticeQueueRef {
  key: string;
  type: ItemType;
  itemId: string;
  domain: ReviewDomain;
  task: PracticeTask;
}

/** Practice tasks → review items that already exist in the learner's SRS. */
export function practiceTasksToReviewRefs(tasks: readonly PracticeTask[], srs: Record<string, SRSItem>): PracticeQueueRef[] {
  const known = new Set(Object.values(srs).map((i) => `${i.type}:${i.itemId}`));
  const out: PracticeQueueRef[] = [];
  for (const task of tasks) {
    const ref = srsRefForTarget(task.targetId);
    if (!ref || !known.has(`${ref.type}:${ref.itemId}`)) continue;
    const domain = VIEW_REVIEW_DOMAIN[task.view];
    out.push({ key: `${ref.type}:${ref.itemId}:${domain}`, ...ref, domain, task });
  }
  return out;
}
