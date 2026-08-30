/**
 * Camada de acesso da conta (B2C + B2B).
 *
 * A matriz de recursos em planFeatures.ts continua Grátis vs Pro (`PlanTier`).
 * AccessTier descreve *de onde* vem o premium, sem exigir 200 paywalls novos:
 * `serverIsPro` permanece o atalho de migração (`premiumAccess`).
 */

export type AccessTier = "free" | "pro" | "business" | "enterprise";

export type EntitlementSource =
  | "none"
  | "individual_subscription"
  | "family_membership"
  | "business_seat"
  | "enterprise_seat"
  | "promotion"
  | "pearl"
  | "internal";

export type OrganizationRole = "owner" | "admin" | "manager" | "learner";

export interface ServerEntitlement {
  tier: AccessTier;
  premiumAccess: boolean;
  source: EntitlementSource;
  organizationId?: string;
  organizationRole?: OrganizationRole;
}

export const EMPTY_SERVER_ENTITLEMENT: ServerEntitlement = {
  tier: "free",
  premiumAccess: false,
  source: "none",
};

export function premiumAccessFromTier(tier: AccessTier): boolean {
  return tier === "pro" || tier === "business" || tier === "enterprise";
}

const TIERS = new Set<AccessTier>(["free", "pro", "business", "enterprise"]);
const ORG_ROLES = new Set<OrganizationRole>(["owner", "admin", "manager", "learner"]);

/** Fontes atuais + aliases da RPC anterior (stripe / grant / pearl_pass). */
export function parseEntitlementSource(raw: string | null | undefined): EntitlementSource {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "individual_subscription" || value === "stripe") return "individual_subscription";
  if (value === "family_membership") return "family_membership";
  if (value === "business_seat" || value === "organization") return "business_seat";
  if (value === "enterprise_seat") return "enterprise_seat";
  if (value === "promotion") return "promotion";
  if (value === "pearl" || value === "pearl_pass" || value === "pearl_pro_pass") return "pearl";
  if (value === "internal" || value === "grant") return "internal";
  return "none";
}

export function parseAccessTier(raw: string | null | undefined, premiumAccess: boolean): AccessTier {
  const value = String(raw ?? "").trim().toLowerCase();
  if (TIERS.has(value as AccessTier)) return value as AccessTier;
  return premiumAccess ? "pro" : "free";
}

export function parseOrganizationRole(raw: string | null | undefined): OrganizationRole | undefined {
  const value = String(raw ?? "").trim().toLowerCase();
  if (ORG_ROLES.has(value as OrganizationRole)) return value as OrganizationRole;
  return undefined;
}

export function parseServerEntitlementRpc(row: unknown): ServerEntitlement {
  if (!row || typeof row !== "object") return { ...EMPTY_SERVER_ENTITLEMENT };

  const data = row as {
    is_pro?: unknown;
    tier?: unknown;
    source?: unknown;
    organization_id?: unknown;
    organization_role?: unknown;
  };

  const premiumAccess = data.is_pro === true;
  const source = parseEntitlementSource(typeof data.source === "string" ? data.source : undefined);
  const organizationId = typeof data.organization_id === "string" && data.organization_id ? data.organization_id : undefined;
  const organizationRole = parseOrganizationRole(
    typeof data.organization_role === "string" ? data.organization_role : undefined
  );
  const tier = parseAccessTier(typeof data.tier === "string" ? data.tier : undefined, premiumAccess);

  return {
    tier,
    premiumAccess: premiumAccess || premiumAccessFromTier(tier),
    source: premiumAccess || source !== "none" ? source : "none",
    organizationId,
    organizationRole,
  };
}
