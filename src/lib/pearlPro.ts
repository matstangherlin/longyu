/**
 * Pro temporário via Pérolas de Jade + regra única de anúncios.
 * Não substitui Stripe — soma ao entitlement existente.
 */

import {
  PEARL_PRO_COOLDOWN_DAYS,
  PEARL_PRO_COST,
  PEARL_PRO_PASS_DAYS,
} from "../data/economy";
import { effectivePremium } from "./entitlements";

export interface PearlProState {
  pearlProExpiresAt: number | null;
  pearlProLastActivatedAt: number | null;
  pearlProAutoActivate: boolean;
  pearlProPendingOffline: boolean;
  dragonPearls: number;
}

export interface EntitlementAdsContext {
  isPremiumPreview: boolean;
  serverIsPro: boolean | null | undefined;
  accountEmail?: string | null;
  accountAuthMode?: string | null;
  pearlProExpiresAt?: number | null;
  now?: number;
}

export function hasActivePearlPro(
  expiresAt: number | null | undefined,
  now = Date.now()
): boolean {
  return typeof expiresAt === "number" && expiresAt > now;
}

/** Pro efetivo incluindo pass de Pérolas. */
export function hasProAccess(ctx: EntitlementAdsContext): boolean {
  return effectivePremium(ctx.isPremiumPreview, ctx.serverIsPro, {
    accountEmail: ctx.accountEmail,
    accountAuthMode: ctx.accountAuthMode,
    pearlProExpiresAt: ctx.pearlProExpiresAt,
    now: ctx.now,
  });
}

/**
 * Fonte única: Free sem benefício ad-free = anúncios.
 * Pro pago, Pro de Pérolas ou QA = sem anúncios.
 */
export function shouldShowAds(ctx: EntitlementAdsContext): boolean {
  return !hasProAccess(ctx);
}

export type PearlProActivateBlockReason =
  | "insufficient_pearls"
  | "pass_active"
  | "cooldown"
  | "paid_subscription"
  | "offline_cloud"
  | "auto_disabled";

export interface PearlProActivateDecision {
  allowed: boolean;
  reason?: PearlProActivateBlockReason;
  message: string;
}

export function canActivatePearlPro(input: {
  state: PearlProState;
  serverIsPro: boolean | null | undefined;
  authMode: string | null | undefined;
  online: boolean;
  /** Ativação automática exige preferência ligada. */
  requireAuto?: boolean;
  now?: number;
}): PearlProActivateDecision {
  const now = input.now ?? Date.now();
  const { state } = input;

  if (input.requireAuto && !state.pearlProAutoActivate) {
    return {
      allowed: false,
      reason: "auto_disabled",
      message: "Ativação automática desligada.",
    };
  }

  if (state.dragonPearls < PEARL_PRO_COST) {
    return {
      allowed: false,
      reason: "insufficient_pearls",
      message: `Faltam ${PEARL_PRO_COST - state.dragonPearls} Pérolas.`,
    };
  }

  // Assinatura paga: nunca consumir Pérolas automaticamente.
  if (input.serverIsPro === true) {
    return {
      allowed: false,
      reason: "paid_subscription",
      message: "Você já tem Longyu Pro. Suas Pérolas ficam guardadas.",
    };
  }

  // Em cloud, expiração/cooldown persistidos são apenas cache de UI. A RPC
  // valida ambos novamente; nunca usamos o navegador como autoridade.
  if (input.authMode !== "cloud" && hasActivePearlPro(state.pearlProExpiresAt, now)) {
    return {
      allowed: false,
      reason: "pass_active",
      message: "Pass de Pro por Pérolas já está ativo.",
    };
  }

  if (input.authMode !== "cloud" && state.pearlProLastActivatedAt) {
    const cooldownMs = PEARL_PRO_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    if (now - state.pearlProLastActivatedAt < cooldownMs) {
      return {
        allowed: false,
        reason: "cooldown",
        message: `Aguarde ${PEARL_PRO_COOLDOWN_DAYS} dias entre passes de Pro por Pérolas.`,
      };
    }
  }

  // Conta cloud offline: não fabricar Pro local.
  if (input.authMode === "cloud" && !input.online) {
    return {
      allowed: false,
      reason: "offline_cloud",
      message: "Pro pronto para ativar — conecte-se à internet.",
    };
  }

  return { allowed: true, message: "Pode ativar 7 dias de Longyu Pro." };
}

export function pearlProExpiryFrom(now = Date.now()): number {
  return now + PEARL_PRO_PASS_DAYS * 24 * 60 * 60 * 1000;
}

export function formatPearlProUntil(expiresAt: number): string {
  const d = new Date(expiresAt);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export const PEARL_PRO_COPY = {
  autoExplain:
    "Ao chegar a 12 Pérolas, elas serão usadas automaticamente para ativar 7 dias de Longyu Pro.",
  costLabel: `${PEARL_PRO_COST} Pérolas → ${PEARL_PRO_PASS_DAYS} dias de Longyu Pro`,
} as const;
