import type { FamilyAccount } from "./family";
import { activeFamilyMembers } from "./family";
import type { ProductPlan } from "./billing";
import type {
  AccessTier,
  EntitlementSource as AccessEntitlementSource,
  OrganizationRole,
  ServerEntitlement,
} from "../lib/accessTier";

export type EntitlementSource =
  | "individual_subscription"
  | "family_membership"
  | "business_seat"
  | "enterprise_seat"
  | "promotion";

export type ProductEntitlement = "FREE" | "PRO" | "FAMILY_MEMBER" | "BUSINESS_MEMBER" | "ENTERPRISE_MEMBER";

export const PLAN_ENTITLEMENTS: Record<ProductEntitlement, { plan: ProductPlan; proFeatures: boolean }> = {
  FREE: { plan: "free", proFeatures: false },
  PRO: { plan: "pro", proFeatures: true },
  FAMILY_MEMBER: { plan: "family", proFeatures: true },
  BUSINESS_MEMBER: { plan: "business", proFeatures: true },
  ENTERPRISE_MEMBER: { plan: "enterprise", proFeatures: true },
};

export function familyEntitlementForUser(family: FamilyAccount, userId: string): ProductEntitlement {
  return activeFamilyMembers(family).some((membership) => membership.userId === userId) ? "FAMILY_MEMBER" : "FREE";
}

/**
 * Membership only resolves access. It intentionally accepts and returns no
 * learning state, preventing another member's mastery/SRS/XP/Qi/streak data
 * from becoming part of the family aggregate.
 */
export function grantsProFeatures(entitlement: ProductEntitlement): boolean {
  return PLAN_ENTITLEMENTS[entitlement].proFeatures;
}

/** Uma origem possível de acesso. O backend é quem diz se está ativa. */
export interface EntitlementCandidate {
  source: AccessEntitlementSource;
  active: boolean;
  tier?: AccessTier;
  organizationId?: string;
  organizationRole?: OrganizationRole;
  /** Epoch ms. Ausente ou null = sem prazo conhecido. */
  expiresAt?: number | null;
}

export interface EffectiveEntitlement extends ServerEntitlement {
  /** Todas as origens ativas, não só a que virou `source`. */
  activeSources: AccessEntitlementSource[];
}

/**
 * Ordem de exibição quando há mais de uma origem ativa.
 *
 * Isto decide apenas qual origem aparece em `source` — nunca se a pessoa tem
 * acesso. Qualquer origem ativa já concede Pro (P26.1), e `activeSources`
 * preserva o conjunto inteiro para atribuição e suporte.
 */
const SOURCE_PRECEDENCE: readonly AccessEntitlementSource[] = [
  "enterprise_seat",
  "business_seat",
  "individual_subscription",
  "family_membership",
  "promotion",
  "pearl",
  "internal",
];

const TIER_BY_SOURCE: Partial<Record<AccessEntitlementSource, AccessTier>> = {
  enterprise_seat: "enterprise",
  business_seat: "business",
};

function candidateIsLive(candidate: EntitlementCandidate, now: number): boolean {
  if (!candidate.active) return false;
  if (candidate.expiresAt != null && candidate.expiresAt <= now) return false;
  return candidate.source !== "none";
}

/**
 * Resolve o acesso efetivo a partir de todas as origens.
 *
 * Três regras que o contrato comercial depende de não confundir:
 *
 * 1. Basta uma origem ativa para haver Pro (P26.1). Elas não se somam nem se
 *    anulam — se qualquer uma vale, a pessoa estuda.
 * 2. A origem continua identificada. Perder isso quebraria atribuição de
 *    receita e o suporte não saberia dizer por que alguém tem acesso.
 * 3. Origens coexistem sem se cancelar (P27). Se o acesso pela empresa expira
 *    e a pessoa paga a própria assinatura, ela continua Pro — a empresa nunca
 *    teve poder de cancelar a assinatura pessoal dela.
 *
 * O que não entra aqui: nada vindo do cliente. Uma flag em localStorage não é
 * origem de entitlement; quem responde é o backend.
 */
export function resolveEffectiveEntitlement(input: {
  candidates: readonly EntitlementCandidate[];
  now?: number;
}): EffectiveEntitlement {
  const now = input.now ?? Date.now();
  const live = input.candidates.filter((candidate) => candidateIsLive(candidate, now));

  const activeSources = SOURCE_PRECEDENCE.filter((source) =>
    live.some((candidate) => candidate.source === source)
  );

  if (activeSources.length === 0) {
    return { tier: "free", premiumAccess: false, source: "none", activeSources: [] };
  }

  const primarySource = activeSources[0];
  const primary = live.find((candidate) => candidate.source === primarySource);
  const tier: AccessTier = primary?.tier ?? TIER_BY_SOURCE[primarySource] ?? "pro";

  const resolved: EffectiveEntitlement = {
    tier,
    premiumAccess: true,
    source: primarySource,
    activeSources,
  };
  if (primary?.organizationId) resolved.organizationId = primary.organizationId;
  if (primary?.organizationRole) resolved.organizationRole = primary.organizationRole;
  return resolved;
}

