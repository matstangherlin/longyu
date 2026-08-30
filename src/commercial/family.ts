export const FAMILY_MAX_MEMBERS = 5;
export const CHILD_ACCOUNT_POLICY = "FUTURE_DECISION" as const;

export type FamilyRole = "owner" | "member";
export type FamilyMembershipStatus = "active" | "removed";
export type FamilyInviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface FamilyInvite {
  id: string;
  familyId: string;
  invitedEmail: string;
  status: FamilyInviteStatus;
  expiresAt: number;
}

export interface FamilyMembership {
  familyId: string;
  userId: string;
  role: FamilyRole;
  status: FamilyMembershipStatus;
  joinedAt: number;
}

export interface FamilyAccount {
  id: string;
  ownerUserId: string;
  memberships: readonly FamilyMembership[];
}

export class FamilyContractError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "FamilyContractError";
  }
}

export function activeFamilyMembers(family: FamilyAccount): FamilyMembership[] {
  return family.memberships.filter((membership) => membership.status === "active");
}

export function validateFamily(family: FamilyAccount, maxMembers = FAMILY_MAX_MEMBERS): void {
  const active = activeFamilyMembers(family);
  const userIds = new Set(active.map((membership) => membership.userId));
  if (userIds.size !== active.length) throw new FamilyContractError("DUPLICATE_MEMBERSHIP", "A user may only appear once.");
  if (active.length > maxMembers) throw new FamilyContractError("FAMILY_FULL", "Family member limit exceeded.");
  const owner = active.find((membership) => membership.role === "owner");
  if (!owner || owner.userId !== family.ownerUserId) {
    throw new FamilyContractError("OWNER_MISSING", "The owner must count as an active member.");
  }
  if (active.filter((membership) => membership.role === "owner").length !== 1) {
    throw new FamilyContractError("MULTIPLE_OWNERS", "A family has exactly one owner.");
  }
}

export function assertOneActiveFamilyPerUser(families: readonly FamilyAccount[]): void {
  const seen = new Map<string, string>();
  for (const family of families) {
    validateFamily(family);
    for (const membership of activeFamilyMembers(family)) {
      const previous = seen.get(membership.userId);
      if (previous && previous !== family.id) {
        throw new FamilyContractError("MULTIPLE_ACTIVE_FAMILIES", "A user may join at most one active family.");
      }
      seen.set(membership.userId, family.id);
    }
  }
}

export function addFamilyMember(
  family: FamilyAccount,
  membership: FamilyMembership,
  maxMembers = FAMILY_MAX_MEMBERS
): FamilyAccount {
  if (membership.familyId !== family.id || membership.role !== "member" || membership.status !== "active") {
    throw new FamilyContractError("INVALID_MEMBERSHIP", "New membership must be an active member of this family.");
  }
  if (family.memberships.some((entry) => entry.userId === membership.userId && entry.status === "active")) {
    throw new FamilyContractError("DUPLICATE_MEMBERSHIP", "User is already an active member.");
  }
  const next = { ...family, memberships: [...family.memberships, membership] };
  validateFamily(next, maxMembers);
  return next;
}

export function removeFamilyMember(family: FamilyAccount, userId: string): FamilyAccount {
  if (userId === family.ownerUserId) {
    throw new FamilyContractError("OWNER_SELF_REMOVAL", "Transfer ownership or cancel the family first.");
  }
  return {
    ...family,
    memberships: family.memberships.map((entry) =>
      entry.userId === userId && entry.status === "active" ? { ...entry, status: "removed" as const } : entry
    ),
  };
}

