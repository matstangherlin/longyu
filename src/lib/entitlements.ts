/** Fonte efetiva do Pro: servidor (assinatura real) ou preview local (só em dev). */
export type PremiumSource = "none" | "preview" | "server";

/** Contas internas de QA com Pro sem Stripe (somente e-mails explícitos). */
export const INTERNAL_TEST_PRO_EMAILS = new Set(["teste@longyu.app"]);

export function isInternalTestProEmail(email: string | null | undefined): boolean {
  return Boolean(email && INTERNAL_TEST_PRO_EMAILS.has(email.trim().toLowerCase()));
}

/** Preview local só em desenvolvimento ou com flag explícita de build. */
export function isDevPreviewAllowed(): boolean {
  return import.meta.env.DEV === true || import.meta.env.VITE_ALLOW_PRO_PREVIEW === "true";
}

export function effectivePremium(isPreview: boolean, serverIsPro: boolean | null | undefined): boolean {
  if (serverIsPro === true) return true;
  if (isPreview && isDevPreviewAllowed()) return true;
  return false;
}

export function premiumSource(isPreview: boolean, serverIsPro: boolean | null | undefined): PremiumSource {
  if (serverIsPro === true) return "server";
  if (isPreview && isDevPreviewAllowed()) return "preview";
  return "none";
}
