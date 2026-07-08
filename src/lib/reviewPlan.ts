import type { ItemType } from "../data/types";
import type { DomainTrack } from "../data/domains";
import type { Grade, ReviewDomain } from "./srs";

const ITEM_REVIEW_DOMAINS: Record<ItemType, ReviewDomain[]> = {
  char: ["som", "pinyin", "fala", "significado", "forma", "uso", "leitura"],
  radical: ["significado", "forma"],
  chunk: ["som", "pinyin", "fala", "significado", "forma", "uso", "leitura"],
};

export function reviewDomainsForItem(type: ItemType): ReviewDomain[] {
  return ITEM_REVIEW_DOMAINS[type];
}

export function primaryReviewDomain(type: ItemType): ReviewDomain {
  return type === "chunk" ? "uso" : "significado";
}

export function gradeReviewDomain({
  ensureSrs,
  gradeSrs,
  type,
  itemId,
  track,
  domain,
  grade,
}: {
  ensureSrs: (type: ItemType, itemId: string, track?: DomainTrack, domain?: ReviewDomain) => void;
  gradeSrs: (type: ItemType, itemId: string, grade: Grade, track?: DomainTrack, domain?: ReviewDomain) => void;
  type: ItemType;
  itemId: string;
  track?: DomainTrack;
  domain: ReviewDomain;
  grade: Grade;
}) {
  for (const reviewDomain of reviewDomainsForItem(type)) {
    ensureSrs(type, itemId, track, reviewDomain);
  }
  gradeSrs(type, itemId, grade, track, domain);
}
