/**
 * RC2.2.23 — quando o E2E pode desligar as orientações.
 *
 * Os ~900 testes de fluxo semeiam uma sessão local (só em DEV/Preview com a
 * flag de dev) e não querem um coachmark disputando clique. Isso NUNCA pode
 * vazar para o build que o owner ou o QA usam: no app Android nativo e em
 * qualquer build de QA (`VITE_DEVICE_QA=true`) as orientações ficam ligadas,
 * mesmo com sessão semeada.
 */
export interface GuidanceSuppressionInput {
  /** `allowSeededLocalSession()`: flag de dev + marcador do E2E. */
  seededLocalSession: boolean;
  /** App Android (Capacitor). */
  native: boolean;
  /** Build de QA/diagnóstico entregue ao owner/testers. */
  deviceQaBuild: boolean;
  /** `localStorage["longyu:e2e-guidance"]` — "on" liga as orientações no E2E. */
  guidanceOverride: string | null;
}

export function guidanceSuppressedForSeededE2E(input: GuidanceSuppressionInput): boolean {
  if (input.native || input.deviceQaBuild) return false;
  if (!input.seededLocalSession) return false;
  return input.guidanceOverride !== "on";
}
