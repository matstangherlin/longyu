/**
 * Helpers puros da economia de Pérolas de Jade (V2).
 * Sem React/store — só tipos, decisão e patches.
 */

import {
  PEARL_AUDIO_MILESTONES,
  PEARL_ERROR_MILESTONES,
  PEARL_HANZI_MILESTONES,
  PEARL_JOURNEY_MAJOR_PEARLS,
  PEARL_JOURNEY_PHASE_MASTER_PEARLS,
  PEARL_MONTHLY_CHALLENGE_PEARLS,
  PEARL_PRODUCTION_MILESTONES,
  PEARL_PRO_COST,
  PEARL_STREAK_MILESTONES,
} from "../data/economy";
import { JOURNEY } from "../data/journey";
import {
  canActivatePearlPro,
  pearlProExpiryFrom,
  type PearlProActivateBlockReason,
  type PearlProState,
} from "./pearlPro";

export const PEARL_LEDGER_CAP = 200;

export type PearlLedgerDirection = "earned" | "spent";

export interface PearlLedgerEntry {
  id: string;
  direction: PearlLedgerDirection;
  source: string;
  amount: number;
  timestamp: number;
  milestoneId?: string;
  purchaseId?: string;
}

export interface PearlEconomySlice {
  dragonPearls: number;
  pearlMilestonesClaimed: Record<string, number>;
  pearlLedger: PearlLedgerEntry[];
  pearlProExpiresAt: number | null;
  pearlProLastActivatedAt: number | null;
  pearlProAutoActivate: boolean;
  pearlProPendingOffline: boolean;
}

/** Placements where interstitial/banner ads may appear (never mid-question). */
export const ADS_SAFE_PLACEMENTS = [
  "home_idle",
  "loja_footer",
  "between_sessions",
  "journey_idle",
  "profile_idle",
] as const;

/**
 * Contextos em que anúncios nunca podem aparecer (ADS-019),
 * mesmo para Free. Qualquer componente de ads deve consultar isto.
 */
export const ADS_FORBIDDEN_CONTEXTS = [
  "during_question",
  "between_selection_and_feedback",
  "over_verify_continue_button",
  "during_audio",
  "during_conversation",
  "during_error_correction",
  "over_keyboard_input",
  "critical_modal",
  "during_production",
  "during_lesson_core",
] as const;

export function claimablePearlMilestone(
  claimed: Readonly<Record<string, number>> | null | undefined,
  milestoneId: string
): boolean {
  if (!milestoneId) return false;
  return !claimed?.[milestoneId];
}

export function resolvePearlMilestoneAmount(milestoneId: string): number | null {
  if (!milestoneId) return null;

  const streak = PEARL_STREAK_MILESTONES.find((m) => m.id === milestoneId);
  if (streak) return streak.pearls;

  for (const table of [
    PEARL_ERROR_MILESTONES,
    PEARL_HANZI_MILESTONES,
    PEARL_AUDIO_MILESTONES,
    PEARL_PRODUCTION_MILESTONES,
  ]) {
    const hit = table.find((m) => m.id === milestoneId);
    if (hit) return hit.pearls;
  }

  if (milestoneId.startsWith("journey_phase:")) return PEARL_JOURNEY_PHASE_MASTER_PEARLS;
  if (milestoneId.startsWith("journey_major:")) return PEARL_JOURNEY_MAJOR_PEARLS;
  if (milestoneId.startsWith("monthly_challenge:")) return PEARL_MONTHLY_CHALLENGE_PEARLS;

  return null;
}

function appendLedger(
  ledger: PearlLedgerEntry[] | undefined,
  entry: PearlLedgerEntry
): PearlLedgerEntry[] {
  return [...(ledger ?? []), entry].slice(-PEARL_LEDGER_CAP);
}

export function applyPearlEarn(
  state: Pick<PearlEconomySlice, "dragonPearls" | "pearlMilestonesClaimed" | "pearlLedger">,
  input: {
    amount: number;
    source: string;
    milestoneId?: string;
    idempotencyKey: string;
    now?: number;
  }
): Partial<PearlEconomySlice> | null {
  const amount = Math.max(0, Math.round(input.amount));
  if (amount <= 0 || !input.idempotencyKey) return null;

  const claimed = state.pearlMilestonesClaimed ?? {};
  if (input.milestoneId && !claimablePearlMilestone(claimed, input.milestoneId)) {
    return null;
  }

  const ledger = state.pearlLedger ?? [];
  if (ledger.some((e) => e.id === input.idempotencyKey)) {
    return null;
  }

  const now = input.now ?? Date.now();
  const entry: PearlLedgerEntry = {
    id: input.idempotencyKey,
    direction: "earned",
    source: input.source,
    amount,
    timestamp: now,
    milestoneId: input.milestoneId,
  };

  const pearlMilestonesClaimed = input.milestoneId
    ? { ...claimed, [input.milestoneId]: now }
    : claimed;

  return {
    dragonPearls: Math.max(0, (state.dragonPearls ?? 0) + amount),
    pearlMilestonesClaimed,
    pearlLedger: appendLedger(ledger, entry),
  };
}

export function applyPearlSpend(
  state: Pick<PearlEconomySlice, "dragonPearls" | "pearlLedger">,
  input: {
    amount: number;
    source: string;
    purchaseId?: string;
    idempotencyKey: string;
    now?: number;
  }
): Partial<PearlEconomySlice> | null {
  const amount = Math.max(0, Math.round(input.amount));
  if (amount <= 0 || !input.idempotencyKey) return null;

  const ledger = state.pearlLedger ?? [];
  if (ledger.some((e) => e.id === input.idempotencyKey)) {
    return null;
  }

  const balance = state.dragonPearls ?? 0;
  if (balance < amount) return null;

  const now = input.now ?? Date.now();
  const entry: PearlLedgerEntry = {
    id: input.idempotencyKey,
    direction: "spent",
    source: input.source,
    amount,
    timestamp: now,
    purchaseId: input.purchaseId,
  };

  return {
    dragonPearls: Math.max(0, balance - amount),
    pearlLedger: appendLedger(ledger, entry),
  };
}

export interface PearlProActivateApplyResult {
  allowed: boolean;
  reason?: PearlProActivateBlockReason | "applied";
  message: string;
  /** Offline cloud: flag only, no Pro grant / no debit. */
  pendingOffline?: boolean;
  patch?: Partial<PearlEconomySlice>;
  expiresAt?: number;
}

/** Decisão + patch puro para ativar Pro por Pérolas (ou marcar pendente offline). */
export function tryAutoActivatePearlPro(input: {
  state: PearlProState & Pick<PearlEconomySlice, "pearlLedger">;
  serverIsPro: boolean | null | undefined;
  authMode: string | null | undefined;
  online: boolean;
  requireAuto?: boolean;
  idempotencyKey?: string;
  now?: number;
}): PearlProActivateApplyResult {
  const now = input.now ?? Date.now();
  const decision = canActivatePearlPro({
    state: input.state,
    serverIsPro: input.serverIsPro,
    authMode: input.authMode,
    online: input.online,
    requireAuto: input.requireAuto,
    now,
  });

  if (
    !decision.allowed &&
    decision.reason === "offline_cloud" &&
    input.state.dragonPearls >= PEARL_PRO_COST
  ) {
    return {
      allowed: false,
      reason: "offline_cloud",
      message: decision.message,
      pendingOffline: true,
      patch: { pearlProPendingOffline: true },
    };
  }

  if (!decision.allowed) {
    return {
      allowed: false,
      reason: decision.reason,
      message: decision.message,
    };
  }

  const key =
    input.idempotencyKey ??
    `pearl-pro:${input.state.pearlProLastActivatedAt ?? 0}:${now}`;
  const spend = applyPearlSpend(input.state, {
    amount: PEARL_PRO_COST,
    source: "Pass Pro 7 dias",
    purchaseId: "shop-pearl-pro-pass",
    idempotencyKey: key,
    now,
  });
  if (!spend) {
    return {
      allowed: false,
      reason: "insufficient_pearls",
      message: "Saldo insuficiente de Pérolas.",
    };
  }

  const expiresAt = pearlProExpiryFrom(now);
  return {
    allowed: true,
    reason: "applied",
    message: "7 dias de Longyu Pro ativados.",
    expiresAt,
    patch: {
      ...spend,
      pearlProExpiresAt: expiresAt,
      pearlProLastActivatedAt: now,
      pearlProPendingOffline: false,
    },
  };
}

/** Fases com todas as lições em 3★ e sem estrela pendente de skip. */
export function listMasteredPhaseIds(input: {
  completedLessons: string[];
  lessonStarsById: Record<string, number>;
  lessonPendingStars?: Record<string, string[]>;
}): string[] {
  const completed = new Set(input.completedLessons);
  const pending = input.lessonPendingStars ?? {};
  return JOURNEY.filter((phase) => {
    const lessons = phase.units.flatMap((u) => u.lessons);
    if (lessons.length === 0) return false;
    return lessons.every((lesson) => {
      if (!completed.has(lesson.id)) return false;
      if ((pending[lesson.id]?.length ?? 0) > 0) return false;
      return (input.lessonStarsById[lesson.id] ?? 0) >= 3;
    });
  }).map((phase) => phase.id);
}

export function blankPearlEconomyFields(): Pick<
  PearlEconomySlice,
  | "pearlMilestonesClaimed"
  | "pearlLedger"
  | "pearlProExpiresAt"
  | "pearlProLastActivatedAt"
  | "pearlProAutoActivate"
  | "pearlProPendingOffline"
> & {
  pearlProAutoExplainSeen: boolean;
  pearlAudioExposures: number;
  pearlProductionCount: number;
} {
  return {
    pearlMilestonesClaimed: {},
    pearlLedger: [],
    pearlProExpiresAt: null,
    pearlProLastActivatedAt: null,
    pearlProAutoActivate: false,
    pearlProPendingOffline: false,
    pearlProAutoExplainSeen: false,
    pearlAudioExposures: 0,
    pearlProductionCount: 0,
  };
}
