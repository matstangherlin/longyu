/**
 * Feature flags de runtime/build para rollback rápido da beta.
 * Desligar via variável de ambiente no Netlify e redeploy (sem apagar progresso).
 */

function flagEnabled(value: string | undefined, defaultEnabled: boolean): boolean {
  if (value === undefined || value === "") return defaultEnabled;
  const normalized = value.trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  if (["1", "true", "on", "yes"].includes(normalized)) return true;
  return defaultEnabled;
}

/** Conversas V2 (fluxo por nós). Default: ligado. Rollback: VITE_ENABLE_CONVERSATION_V2=false */
export function isConversationV2Enabled(
  env: { VITE_ENABLE_CONVERSATION_V2?: string } = import.meta.env
): boolean {
  return flagEnabled(env.VITE_ENABLE_CONVERSATION_V2, true);
}

/** Telemetria pedagógica (além do consentimento do usuário). Default: ligado. */
export function isTelemetryEnabled(
  env: { VITE_ENABLE_TELEMETRY?: string } = import.meta.env
): boolean {
  return flagEnabled(env.VITE_ENABLE_TELEMETRY, true);
}

/** Envio de feedback beta ao backend. Default: ligado. */
export function isBetaFeedbackEnabled(
  env: { VITE_ENABLE_BETA_FEEDBACK?: string } = import.meta.env
): boolean {
  return flagEnabled(env.VITE_ENABLE_BETA_FEEDBACK, true);
}
