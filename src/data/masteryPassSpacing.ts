/**
 * Pedagogia V3.4 — preparacao de espacamento entre passes (PED-120).
 *
 * Arquitetura experimental: permite, no futuro, M1 agora -> M2 depois de
 * algumas licoes -> M3/M4 mais tarde. Nesta remessa NAO altera a Jornada
 * automaticamente — so expoe tipos e um seletor opt-in.
 */
import type { MasteryPass } from "./masteryLoop";

export interface MasteryPassSpacingPolicy {
  /** Se true, o player pode oferecer o proximo pass so apos N licoes. */
  enabled: boolean;
  /** Licoes minimas entre passes consecutivos (0 = imediato, comportamento atual). */
  minLessonsBetweenPasses: Record<MasteryPass, number>;
}

/** Default = comportamento atual (passes seguidos sem espacamento). */
export const DEFAULT_MASTERY_PASS_SPACING: MasteryPassSpacingPolicy = {
  enabled: false,
  minLessonsBetweenPasses: { 1: 0, 2: 0, 3: 0, 4: 0 },
};

/**
 * Experimento futuro: espacamento leve apos M1/M2.
 * Nao ativar na Jornada ate haver dados de telemetria (PED-119).
 */
export const EXPERIMENTAL_SPACED_MASTERY_PASS_POLICY: MasteryPassSpacingPolicy = {
  enabled: false,
  minLessonsBetweenPasses: { 1: 0, 2: 2, 3: 3, 4: 4 },
};

export function lessonsRequiredBeforePass(
  pass: MasteryPass,
  policy: MasteryPassSpacingPolicy = DEFAULT_MASTERY_PASS_SPACING
): number {
  if (!policy.enabled) return 0;
  return policy.minLessonsBetweenPasses[pass] ?? 0;
}
