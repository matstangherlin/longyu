/**
 * Pedagogia V3.4 — preparação de espaçamento entre passes (PED-120).
 *
 * Arquitetura experimental: permite, no futuro, M1 agora → M2 depois de
 * algumas lições → M3/M4 mais tarde. Nesta remessa NÃO altera a Jornada
 * automaticamente — só expõe tipos e um seletor opt-in.
 */
import type { MasteryPass } from "./masteryLoop";

export interface MasteryPassSpacingPolicy {
  /** Se true, o player pode oferecer o próximo pass só após N lições. */
  enabled: boolean;
  /** Lições mínimas entre passes consecutivos (0 = imediato, comportamento atual). */
  minLessonsBetweenPasses: Record<MasteryPass, number>;
}

/** Default = comportamento atual (passes seguidos sem espaçamento). */
export const DEFAULT_MASTERY_PASS_SPACING: MasteryPassSpacingPolicy = {
  enabled: false,
  minLessonsBetweenPasses: { 1: 0, 2: 0, 3: 0, 4: 0 },
};

/**
 * Experimento futuro: espaçamento leve após M1/M2.
 * Não ativar na Jornada até haver dados de telemetria (PED-119).
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
