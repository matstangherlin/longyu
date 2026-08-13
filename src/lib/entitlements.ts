import { isProPreviewBuildAllowed } from "./appEnvironment";
import { hasActivePearlPro } from "./pearlPro";

/** Fonte efetiva do Pro: servidor (assinatura real), pass de Pérolas, ou preview local. */
export type PremiumSource = "none" | "preview" | "server" | "pearl_pass";

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
  // Conta cloud nunca confia em preview/expiração persistidos no navegador.
  // Todos os gates premium dependem exclusivamente do entitlement confirmado.
  if (options?.accountAuthMode === "cloud") {
    return serverIsPro === true;
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
