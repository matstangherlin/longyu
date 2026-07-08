/** Fonte efetiva do Pro: servidor (assinatura real) ou preview local. */
export type PremiumSource = "none" | "preview" | "server";

export function effectivePremium(isPreview: boolean, serverIsPro: boolean | null | undefined): boolean {
  if (serverIsPro === true) return true;
  return isPreview;
}

export function premiumSource(isPreview: boolean, serverIsPro: boolean | null | undefined): PremiumSource {
  if (serverIsPro === true) return "server";
  if (isPreview) return "preview";
  return "none";
}
