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
  // V3.9 · REVIEW-024 — só entra na fila o domínio efetivamente praticado.
  //
  // Antes, avaliar QUALQUER domínio criava entrada para todos os 7 do tipo. Como
  // a chave do SRS inclui o domínio, praticar 你好 uma vez gerava sete itens
  // devidos — seis sem nenhum evento pedagógico de aquisição. Era daí que vinha
  // o "Revisar 260 itens" ainda na Fase 1 · Unidade 2: 301 entradas para apenas
  // 43 memórias-alvo reais (86% de domínios nunca praticados).
  //
  // Os demais domínios continuam existindo como caminho pedagógico; passam a
  // nascer quando o aluno de fato os pratica. Ver
  // docs/reports/review-queue-composition.md.
  ensureSrs(type, itemId, track, domain);
  gradeSrs(type, itemId, grade, track, domain);
}
