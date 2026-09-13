/**
 * Seis pessoas no total: o dono mais cinco convidados.
 *
 * `validateFamily` conta o dono dentro de `active.length`, então este número é
 * o total de contas, não o número de convites. Escrever "5 membros" quando o
 * limite significa dono + 4 foi o erro que o P4.1 proíbe — a copy tem que
 * dizer "você + até 5 pessoas" ou "até 6 pessoas", e as duas saem daqui.
 */
export const FAMILY_MAX_MEMBERS = 6;
export const FAMILY_MAX_INVITEES = FAMILY_MAX_MEMBERS - 1;
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

export interface FamilySeatUsage {
  /** Contas ocupando lugar: membros ativos + convites ainda pendentes. */
  used: number;
  limit: number;
  remaining: number;
  full: boolean;
}

/**
 * Convite pendente ocupa lugar.
 *
 * Sem isso o dono manda seis convites para cinco vagas, todos aceitam, e a
 * família estoura o limite sem ninguém ter feito nada errado. O lugar só volta
 * quando o convite expira ou é revogado.
 */
export function familySeatUsage(input: {
  activeMembers: number;
  pendingInvites: number;
  maxMembers?: number;
}): FamilySeatUsage {
  const limit = input.maxMembers ?? FAMILY_MAX_MEMBERS;
  const used = Math.max(0, input.activeMembers) + Math.max(0, input.pendingInvites);
  return { used, limit, remaining: Math.max(0, limit - used), full: used >= limit };
}

/**
 * Autoridade de lugar. O servidor chama isto antes de gravar o convite — o
 * frontend pode chamar também, para desabilitar o botão, mas a checagem que
 * vale é a do servidor (P5.4).
 */
export function assertCanInviteToFamily(input: {
  activeMembers: number;
  pendingInvites: number;
  maxMembers?: number;
}): FamilySeatUsage {
  const usage = familySeatUsage(input);
  if (usage.full) {
    throw new FamilyContractError("FAMILY_FULL", "Family seat limit reached.");
  }
  return usage;
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

