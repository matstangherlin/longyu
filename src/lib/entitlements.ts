import { isProPreviewBuildAllowed } from "./appEnvironment";
import { hasActivePearlPro } from "./pearlPro";

/** Fonte efetiva do Pro: servidor (assinatura real), pass de Pérolas, ou preview local. */
export type PremiumSource = "none" | "preview" | "server" | "pearl_pass";

/**
 * Contas internas de QA com Pro sem Stripe (somente e-mails explícitos).
 * Nunca concede Pro a outros usuários — só a sessão cloud com este e-mail.
 */
export const INTERNAL_TEST_PRO_EMAILS = new Set(["teste@longyu.app"]);

export function isInternalTestProEmail(email: string | null | undefined): boolean {
  return Boolean(email && INTERNAL_TEST_PRO_EMAILS.has(email.trim().toLowerCase()));
}

/**
 * Preview local só em Development, ou Preview com VITE_ALLOW_PRO_PREVIEW=true.
 * Bloqueado no ambiente principal (Production Beta), mesmo se a flag vazar.
 */
export function isDevPreviewAllowed(): boolean {
  return isProPreviewBuildAllowed(import.meta.env);
}

export function effectivePremium(
  isPreview: boolean,
  serverIsPro: boolean | null | undefined,
  options?: {
    accountEmail?: string | null;
    accountAuthMode?: string | null;
    pearlProExpiresAt?: number | null;
    now?: number;
  }
): boolean {
  // QA Pro: só a própria conta cloud — não herda de serverIsPro de outra sessão.
  if (options?.accountAuthMode === "cloud" && isInternalTestProEmail(options.accountEmail)) {
    return true;
  }
  if (serverIsPro === true) return true;
  if (hasActivePearlPro(options?.pearlProExpiresAt, options?.now ?? Date.now())) return true;
  if (isPreview && isDevPreviewAllowed()) return true;
  return false;
}

export function premiumSource(
  isPreview: boolean,
  serverIsPro: boolean | null | undefined,
  pearlProExpiresAt?: number | null,
  now = Date.now()
): PremiumSource {
  if (serverIsPro === true) return "server";
  if (hasActivePearlPro(pearlProExpiresAt, now)) return "pearl_pass";
  if (isPreview && isDevPreviewAllowed()) return "preview";
  return "none";
}
