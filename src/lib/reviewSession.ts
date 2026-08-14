import { FREE_REVIEW_SESSION_LIMIT, REVIEW_DAILY_SESSION_TARGET } from "../data/economy";

/**
 * V3.9 · REVIEW-026 — Backlog apresentado como sessão, não como dívida.
 *
 * O QA real flagrou "Revisar 260 itens" ainda na Fase 1 · Unidade 2. Mesmo
 * depois de REVIEW-024 cortar as entradas de domínio nunca praticado, a fila
 * legítima cresce e volta a passar de cem. Um número monolítico desencoraja;
 * o convite tem de ser do tamanho de uma sessão, com o resto visível mas
 * secundário.
 */
export interface ReviewSessionSplit {
  /** Quantos itens a sessão de hoje propõe. */
  today: number;
  /** Quantos ficam para depois (0 quando a fila cabe na sessão). */
  pending: number;
  /** Total devido — continua disponível para telemetria e planos Pro. */
  total: number;
}

export function reviewSessionSplit(total: number, isPremium = false): ReviewSessionSplit {
  const safeTotal = Math.max(0, Math.floor(total));
  // O grátis já tem teto por sessão; o alvo diário nunca pode ultrapassá-lo.
  const cap = isPremium ? REVIEW_DAILY_SESSION_TARGET : Math.min(REVIEW_DAILY_SESSION_TARGET, FREE_REVIEW_SESSION_LIMIT);
  const today = Math.min(safeTotal, cap);
  return { today, pending: safeTotal - today, total: safeTotal };
}

/** Rótulo do CTA: "Revisão de hoje · 10". */
export function reviewSessionLabel(split: ReviewSessionSplit): string {
  if (split.total === 0) return "Em dia";
  if (split.today === 1) return "Revisão de hoje · 1 item";
  return `Revisão de hoje · ${split.today}`;
}

/** Linha secundária: "+250 pendentes" (vazia quando a fila cabe na sessão). */
export function reviewPendingLabel(split: ReviewSessionSplit): string | null {
  if (split.pending <= 0) return null;
  return `+${split.pending} pendentes`;
}
