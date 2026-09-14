import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";

/**
 * Cliente do painel Business.
 *
 * Duas RPCs e nada mais. O browser não consulta organization_members,
 * user_progress nem nenhuma tabela de aprendizagem: as funções internas de
 * assento continuam service_role, e estas duas conferem o papel de quem chama
 * naquela organização antes de ler qualquer coisa.
 *
 * O organizationId vem do entitlement do servidor. Mesmo assim ele é
 * verificado lá dentro — trocar o UUID na requisição não abre o painel da
 * empresa ao lado.
 */

export type BusinessErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "BACKEND_OFF" | "UNKNOWN";

export interface BusinessOverview {
  organizationId: string;
  name: string;
  plan: string;
  status: string;
  viewerRole: "owner" | "admin" | "manager";
  seatEntitlement: number;
  seatsActive: number;
  seatsPending: number;
  seatsReserved: number;
  seatsAvailable: number;
  activeLearners7d: number;
  lessonsCompletedTotal: number;
  averageJourneyProgress: number;
}

export interface BusinessMemberRow {
  userId: string;
  displayName: string | null;
  role: string;
  seatStatus: string;
  joinedAt: string | null;
  lastActive: string | null;
  lessonsCompleted: number;
  journeyProgressPercent: number;
  weeklyXp: number;
}

export interface BusinessMembersPage {
  total: number;
  limit: number;
  offset: number;
  members: BusinessMemberRow[];
}

export type BusinessResult<T> = { ok: true; value: T } | { ok: false; code: BusinessErrorCode };

function codeFromError(error: { message?: string } | null): BusinessErrorCode {
  const message = error?.message ?? "";
  if (message.includes("UNAUTHENTICATED")) return "UNAUTHENTICATED";
  if (message.includes("FORBIDDEN")) return "FORBIDDEN";
  return "UNKNOWN";
}

export async function fetchBusinessOverview(organizationId: string): Promise<BusinessResult<BusinessOverview>> {
  if (!isSupabaseBackendEnabled()) return { ok: false, code: "BACKEND_OFF" };
  const client = getSupabaseClient();
  if (!client) return { ok: false, code: "BACKEND_OFF" };
  const { data, error } = await client.rpc("get_business_overview", { p_organization_id: organizationId });
  if (error) return { ok: false, code: codeFromError(error) };
  const row = data as Record<string, unknown> | null;
  if (!row?.organization_id) return { ok: false, code: "UNKNOWN" };
  return {
    ok: true,
    value: {
      organizationId: String(row.organization_id),
      name: String(row.name ?? ""),
      plan: String(row.plan ?? ""),
      status: String(row.status ?? ""),
      viewerRole: (row.viewer_role as BusinessOverview["viewerRole"]) ?? "manager",
      seatEntitlement: Number(row.seat_entitlement ?? 0),
      seatsActive: Number(row.seats_active ?? 0),
      seatsPending: Number(row.seats_pending ?? 0),
      seatsReserved: Number(row.seats_reserved ?? 0),
      seatsAvailable: Number(row.seats_available ?? 0),
      activeLearners7d: Number(row.active_learners_7d ?? 0),
      lessonsCompletedTotal: Number(row.lessons_completed_total ?? 0),
      averageJourneyProgress: Number(row.average_journey_progress ?? 0),
    },
  };
}

export async function fetchBusinessMembers(
  organizationId: string,
  page: { limit?: number; offset?: number } = {}
): Promise<BusinessResult<BusinessMembersPage>> {
  if (!isSupabaseBackendEnabled()) return { ok: false, code: "BACKEND_OFF" };
  const client = getSupabaseClient();
  if (!client) return { ok: false, code: "BACKEND_OFF" };
  const { data, error } = await client.rpc("get_business_members", {
    p_organization_id: organizationId,
    p_limit: page.limit ?? 25,
    p_offset: page.offset ?? 0,
  });
  if (error) return { ok: false, code: codeFromError(error) };
  const row = data as { total?: number; limit?: number; offset?: number; members?: Record<string, unknown>[] } | null;
  return {
    ok: true,
    value: {
      total: Number(row?.total ?? 0),
      limit: Number(row?.limit ?? 25),
      offset: Number(row?.offset ?? 0),
      members: (row?.members ?? []).map((member) => ({
        userId: String(member.user_id ?? ""),
        displayName: (member.display_name as string | null) ?? null,
        role: String(member.role ?? ""),
        seatStatus: String(member.seat_status ?? ""),
        joinedAt: (member.joined_at as string | null) ?? null,
        lastActive: (member.last_active as string | null) ?? null,
        lessonsCompleted: Number(member.lessons_completed ?? 0),
        journeyProgressPercent: Number(member.journey_progress_percent ?? 0),
        weeklyXp: Number(member.weekly_xp ?? 0),
      })),
    },
  };
}
