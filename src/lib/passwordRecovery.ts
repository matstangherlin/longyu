/**
 * RC2.2.19 — recuperação de senha por CÓDIGO de 6 dígitos (P1
 * PASSWORD_RECOVERY_FLOW_BROKEN_ON_MOBILE).
 *
 * O link do e-mail abre no navegador do celular, não no app — a sessão de
 * recuperação nasce no lugar errado. O código resolve isso dentro do app:
 *
 *   e-mail → "Se este email estiver cadastrado, enviaremos as instruções."
 *   → código de 6 dígitos (verifyOtp type=recovery, canônico do Supabase)
 *   → nova senha (updateUser) → sai da sessão → Login.
 *
 * Regras:
 * - Anti-enumeração: a mesma resposta para e-mail existente ou não. Só falta
 *   de conexão e excesso de tentativas viram erro (não revelam a conta).
 * - O código NUNCA é salvo, logado, enviado para analytics nem posto em URL.
 * - O modelo de e-mail com {{ .Token }} é passo do OWNER no painel do
 *   Supabase; o app não altera template de produção.
 */

export const RECOVERY_CODE_LENGTH = 6;

export const RECOVERY_NEUTRAL_MESSAGE = "Se este email estiver cadastrado, enviaremos as instruções.";

/** Só dígitos, no máximo 6 (colar "123 456" ou "123-456" funciona). */
export function normalizeRecoveryCode(raw: string): string {
  return String(raw ?? "").replace(/\D+/g, "").slice(0, RECOVERY_CODE_LENGTH);
}

export function isRecoveryCodeComplete(code: string): boolean {
  return new RegExp(`^\\d{${RECOVERY_CODE_LENGTH}}$`).test(code);
}

export type RecoveryRequestOutcome = "SENT_NEUTRAL" | "RATE_LIMITED" | "OFFLINE";

/**
 * Qualquer erro que não seja rede ou limite vira a resposta neutra: "usuário
 * não encontrado", "e-mail não confirmado" etc. nunca chegam à tela.
 */
export function classifyRecoveryRequestError(error: { status?: number; code?: string; message?: string } | null): RecoveryRequestOutcome {
  if (!error) return "SENT_NEUTRAL";
  const code = String(error.code ?? "").toLowerCase();
  const message = String(error.message ?? "").toLowerCase();
  if (error.status === 429 || code.includes("rate_limit") || /rate limit|too many/.test(message)) return "RATE_LIMITED";
  if (/failed to fetch|network|load failed|offline|timeout/.test(message)) return "OFFLINE";
  return "SENT_NEUTRAL";
}

/** Código errado e código vencido têm a mesma resposta (não ajuda adivinhar). */
export const RECOVERY_CODE_INVALID_MESSAGE = "Código inválido ou expirado. Confira o e-mail mais recente ou peça um novo código.";

export const RECOVERY_MIN_PASSWORD_LENGTH = 6;

/**
 * Estado do modelo de e-mail de recuperação com código (manifesto de release).
 * CODE_READY: app + modelo versionado prontos. OWNER_APPLIED: o owner colou o
 * modelo no painel. PHYSICALLY_VERIFIED: código recebido e usado num aparelho.
 */
export type RecoveryTemplateStatus = "RECOVERY_TEMPLATE_CODE_READY" | "OWNER_APPLIED" | "PHYSICALLY_VERIFIED";
