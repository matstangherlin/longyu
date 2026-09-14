import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";

/**
 * Cliente das RPCs de Family.
 *
 * Nenhuma escrita direta nas tabelas: family_invites e family_memberships não
 * têm policy de insert/update/delete, então o browser só consegue o que estas
 * funções permitem. É de propósito — se o cliente pudesse inserir o convite,
 * ele escolheria o hash do token e o convite valeria o que ele quisesse.
 *
 * O token do convite aparece uma única vez, na resposta de criação. Ele não é
 * guardado aqui, não entra em log e não entra em telemetria.
 */

export type FamilyErrorCode =
  | "UNAUTHENTICATED"
  | "NO_FAMILY"
  | "INVALID_EMAIL"
  | "INVITE_ALREADY_PENDING"
  | "FAMILY_FULL"
  | "INVALID_INVITE"
  | "ALREADY_IN_ANOTHER_FAMILY"
  | "OWNER_CANNOT_LEAVE"
  | "BACKEND_OFF"
  | "UNKNOWN";

export interface FamilyMemberView {
  userId: string;
  name: string | null;
  role: "owner" | "member";
  joinedAt: string | null;
}

export interface FamilyInviteView {
  inviteId: string;
  email: string;
  expiresAt: string;
}

export interface FamilyOverview {
  familyId: string;
  isOwner: boolean;
  status: string;
  seatsUsed: number;
  seatsTotal: number;
  members: FamilyMemberView[];
  invites: FamilyInviteView[];
}

export type FamilyResult<T> = { ok: true; value: T } | { ok: false; code: FamilyErrorCode };

/**
 * Traduz o erro do Postgres para um código do contrato.
 *
 * O texto cru do banco nunca chega à tela: ele carrega nome de função, de
 * coluna e às vezes o valor que falhou. A tela fala por código.
 */
function codeFromError(error: { message?: string } | null): FamilyErrorCode {
  const message = error?.message ?? "";
  for (const code of [
    "UNAUTHENTICATED",
    "NO_FAMILY",
    "INVALID_EMAIL",
    "INVITE_ALREADY_PENDING",
    "INVALID_INVITE",
    "ALREADY_IN_ANOTHER_FAMILY",
    "OWNER_CANNOT_LEAVE",
  ] as const) {
    if (message.includes(code)) return code;
  }
  if (/FAMILY_FULL|lugares ocupados/i.test(message)) return "FAMILY_FULL";
  return "UNKNOWN";
}

function parseOverview(raw: unknown): FamilyOverview | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as {
    family?: { family_id?: string; is_owner?: boolean; status?: string; seats_used?: number; seats_total?: number } | null;
    members?: { user_id?: string; name?: string | null; role?: string; joined_at?: string | null }[];
    invites?: { invite_id?: string; email?: string; expires_at?: string }[];
  };
  if (!row.family?.family_id) return null;
  return {
    familyId: row.family.family_id,
    isOwner: Boolean(row.family.is_owner),
    status: row.family.status ?? "active",
    seatsUsed: Number(row.family.seats_used ?? 0),
    seatsTotal: Number(row.family.seats_total ?? 0),
    members: (row.members ?? []).map((member) => ({
      userId: String(member.user_id ?? ""),
      name: member.name ?? null,
      role: member.role === "owner" ? "owner" : "member",
      joinedAt: member.joined_at ?? null,
    })),
    invites: (row.invites ?? []).map((invite) => ({
      inviteId: String(invite.invite_id ?? ""),
      email: String(invite.email ?? ""),
      expiresAt: String(invite.expires_at ?? ""),
    })),
  };
}

export async function fetchFamilyOverview(): Promise<FamilyResult<FamilyOverview | null>> {
  if (!isSupabaseBackendEnabled()) return { ok: false, code: "BACKEND_OFF" };
  const client = getSupabaseClient();
  if (!client) return { ok: false, code: "BACKEND_OFF" };
  const { data, error } = await client.rpc("get_family_overview");
  if (error) return { ok: false, code: codeFromError(error) };
  return { ok: true, value: parseOverview(data) };
}

/** O token volta aqui e some depois de exibido. Não guardar, não registrar. */
export async function createFamilyInvite(email: string): Promise<FamilyResult<{ token: string; expiresAt: string }>> {
  if (!isSupabaseBackendEnabled()) return { ok: false, code: "BACKEND_OFF" };
  const client = getSupabaseClient();
  if (!client) return { ok: false, code: "BACKEND_OFF" };
  const { data, error } = await client.rpc("create_family_invite", { p_email: email });
  if (error) return { ok: false, code: codeFromError(error) };
  const row = data as { token?: string; expires_at?: string } | null;
  if (!row?.token) return { ok: false, code: "UNKNOWN" };
  return { ok: true, value: { token: row.token, expiresAt: String(row.expires_at ?? "") } };
}

export async function revokeFamilyInvite(inviteId: string): Promise<FamilyResult<boolean>> {
  if (!isSupabaseBackendEnabled()) return { ok: false, code: "BACKEND_OFF" };
  const client = getSupabaseClient();
  if (!client) return { ok: false, code: "BACKEND_OFF" };
  const { data, error } = await client.rpc("revoke_family_invite", { p_invite_id: inviteId });
  if (error) return { ok: false, code: codeFromError(error) };
  return { ok: true, value: Boolean(data) };
}

export async function removeFamilyMember(userId: string): Promise<FamilyResult<boolean>> {
  if (!isSupabaseBackendEnabled()) return { ok: false, code: "BACKEND_OFF" };
  const client = getSupabaseClient();
  if (!client) return { ok: false, code: "BACKEND_OFF" };
  const { data, error } = await client.rpc("remove_family_member", { p_user_id: userId });
  if (error) return { ok: false, code: codeFromError(error) };
  return { ok: true, value: Boolean(data) };
}

export async function acceptFamilyInvite(token: string): Promise<FamilyResult<{ familyId: string }>> {
  if (!isSupabaseBackendEnabled()) return { ok: false, code: "BACKEND_OFF" };
  const client = getSupabaseClient();
  if (!client) return { ok: false, code: "BACKEND_OFF" };
  const { data, error } = await client.rpc("accept_family_invite", { p_token: token });
  if (error) return { ok: false, code: codeFromError(error) };
  const row = data as { family_id?: string } | null;
  if (!row?.family_id) return { ok: false, code: "INVALID_INVITE" };
  return { ok: true, value: { familyId: row.family_id } };
}

/** Link de convite. O token vive na URL e em lugar nenhum além dela. */
export function familyInviteLink(token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/familia/convite/${token}`;
}
