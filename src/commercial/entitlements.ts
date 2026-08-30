import type { FamilyAccount } from "./family";
import { activeFamilyMembers } from "./family";
import type { ProductPlan } from "./billing";

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

