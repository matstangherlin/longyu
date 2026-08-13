/**
 * Marco de Pérolas de Jade — ganhos únicos (não farmáveis).
 * Preços/quantidades vivem em economy.ts; este módulo só define IDs e progresso.
 */

import {
  PEARL_AUDIO_MILESTONES,
  PEARL_ERROR_MILESTONES,
  PEARL_HANZI_MILESTONES,
  PEARL_JOURNEY_PHASE_MASTER_PEARLS,
  PEARL_MONTHLY_CHALLENGE_PEARLS,
  PEARL_PRODUCTION_MILESTONES,
  PEARL_STREAK_MILESTONES,
  type PearlMilestoneDef,
} from "./economy";

export type PearlMilestoneKind =
  | "streak"
  | "journey_phase"
  | "errors_corrected"
  | "hanzi_learned"
  | "audio_exposures"
  | "production"
  | "monthly_challenge";

export interface PearlProgressGoal {
  milestoneId: string;
  kind: PearlMilestoneKind;
  label: string;
  current: number;
  target: number;
  pearls: number;
  /** 0–1, quanto falta (maior = mais perto). */
  proximity: number;
  claimed: boolean;
}

export interface PearlProgressSnapshot {
  goals: PearlProgressGoal[];
  /** Próximos 3–5 não resgatados, ordenados por proximidade. */
  upcoming: PearlProgressGoal[];
  pearlsTowardPro: { current: number; needed: number; cost: number };
}

export interface PearlProgressInput {
  streak: number;
  /** Fases com todas as lições em 3★. */
  masteredPhaseIds: string[];
  errorsCorrected: number;
  hanziLearned: number;
  audioExposures: number;
  productionCount: number;
  /** 0–1 progresso do desafio mensal atual. */
  monthlyChallengeProgress: number;
  monthlyChallengeCompleted: boolean;
  /** Chave do mês (YYYY-MM) — IDs de marco usam monthly_challenge:${monthKey}. */
  monthlyChallengeKey?: string;
  claimed: Readonly<Record<string, number>>;
  dragonPearls: number;
  proPassCost: number;
}

function streakGoals(input: PearlProgressInput): PearlProgressGoal[] {
  return PEARL_STREAK_MILESTONES.map((m) => {
    const claimed = Boolean(input.claimed[m.id]);
    const current = Math.min(input.streak, m.days);
    const proximity = claimed ? 0 : Math.min(1, input.streak / m.days);
    return {
      milestoneId: m.id,
      kind: "streak" as const,
      label: `Ofensiva de ${m.days} dias`,
      current,
      target: m.days,
      pearls: m.pearls,
      proximity,
      claimed,
    };
  });
}

function countMilestones(
  defs: readonly PearlMilestoneDef[],
  kind: PearlMilestoneKind,
  labelPrefix: string,
  value: number,
  claimed: Readonly<Record<string, number>>
): PearlProgressGoal[] {
  return defs.map((m) => {
    const isClaimed = Boolean(claimed[m.id]);
    const current = Math.min(value, m.threshold);
    const proximity = isClaimed ? 0 : Math.min(1, value / m.threshold);
    return {
      milestoneId: m.id,
      kind,
      label: `${labelPrefix} · ${m.threshold}`,
      current,
      target: m.threshold,
      pearls: m.pearls,
      proximity,
      claimed: isClaimed,
    };
  });
}

export function buildPearlProgress(input: PearlProgressInput): PearlProgressSnapshot {
  const goals: PearlProgressGoal[] = [
    ...streakGoals(input),
    ...countMilestones(PEARL_ERROR_MILESTONES, "errors_corrected", "Erros corrigidos", input.errorsCorrected, input.claimed),
    ...countMilestones(PEARL_HANZI_MILESTONES, "hanzi_learned", "Hànzì aprendidos", input.hanziLearned, input.claimed),
    ...countMilestones(PEARL_AUDIO_MILESTONES, "audio_exposures", "Treino de áudio", input.audioExposures, input.claimed),
    ...countMilestones(PEARL_PRODUCTION_MILESTONES, "production", "Produção/fala", input.productionCount, input.claimed),
  ];

  // Fase 3★ — um marco por fase masterizada
  for (const phaseId of input.masteredPhaseIds) {
    const id = `journey_phase:${phaseId}`;
    const claimed = Boolean(input.claimed[id]);
    goals.push({
      milestoneId: id,
      kind: "journey_phase",
      label: `Fase ${phaseId} com 3★`,
      current: claimed ? 1 : 1,
      target: 1,
      pearls: PEARL_JOURNEY_PHASE_MASTER_PEARLS,
      proximity: claimed ? 0 : 1,
      claimed,
    });
  }

  const monthlyId = `monthly_challenge:${input.monthlyChallengeKey ?? "current"}`;
  const monthlyClaimed = Boolean(input.claimed[monthlyId]);
  goals.push({
    milestoneId: monthlyId,
    kind: "monthly_challenge",
    label: "Desafio mensal",
    current: Math.round(input.monthlyChallengeProgress * 100),
    target: 100,
    pearls: PEARL_MONTHLY_CHALLENGE_PEARLS,
    proximity: monthlyClaimed ? 0 : Math.min(1, input.monthlyChallengeProgress),
    claimed: monthlyClaimed,
  });
  if (input.monthlyChallengeCompleted && !monthlyClaimed) {
    const g = goals[goals.length - 1];
    g.proximity = 1;
    g.current = 100;
  }

  const upcoming = goals
    .filter((g) => !g.claimed && g.proximity > 0 && g.proximity < 1)
    .sort((a, b) => b.proximity - a.proximity || a.target - b.target)
    .slice(0, 5);

  // Também incluir "quase prontos" (proximity === 1 mas unclaimed) no topo
  const ready = goals.filter((g) => !g.claimed && g.proximity >= 1);
  const merged = [...ready, ...upcoming.filter((g) => !ready.some((r) => r.milestoneId === g.milestoneId))].slice(
    0,
    5
  );

  return {
    goals,
    upcoming: merged,
    pearlsTowardPro: {
      current: input.dragonPearls,
      needed: Math.max(0, input.proPassCost - input.dragonPearls),
      cost: input.proPassCost,
    },
  };
}

/** Lista plana de defs de contagem (para o motor de claim). */
export function allCountMilestoneDefs(): PearlMilestoneDef[] {
  return [
    ...PEARL_STREAK_MILESTONES.map((m) => ({
      id: m.id,
      threshold: m.days,
      pearls: m.pearls,
    })),
    ...PEARL_ERROR_MILESTONES,
    ...PEARL_HANZI_MILESTONES,
    ...PEARL_AUDIO_MILESTONES,
    ...PEARL_PRODUCTION_MILESTONES,
  ];
}
