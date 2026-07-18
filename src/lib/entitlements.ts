import { isProPreviewBuildAllowed } from "./appEnvironment";

/** Fonte efetiva do Pro: servidor (assinatura real) ou preview local (só em dev/preview). */
export type PremiumSource = "none" | "preview" | "server";

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
  options?: { accountEmail?: string | null; accountAuthMode?: string | null }
): boolean {
  // QA Pro: só a própria conta cloud — não herda de serverIsPro de outra sessão.
  if (options?.accountAuthMode === "cloud" && isInternalTestProEmail(options.accountEmail)) {
    return true;
  }
  if (serverIsPro === true) return true;
  if (isPreview && isDevPreviewAllowed()) return true;
  return false;
}

export function premiumSource(isPreview: boolean, serverIsPro: boolean | null | undefined): PremiumSource {
  if (serverIsPro === true) return "server";
  if (isPreview && isDevPreviewAllowed()) return "preview";
  return "none";
}
