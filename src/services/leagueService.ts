import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import type { LeagueOutcome, LeagueTier } from "../lib/leagues";
import { LEAGUE_META, normalizeLeagueTier } from "../lib/leagues";

export type LeagueDataMode = "live" | "demo" | "loading" | "error";

export interface ServerLeagueStanding {
  user_id: string;
  display_name: string;
  avatar_letter: string;
  weekly_xp: number;
  rank: number | null;
  streak: number;
  is_me: boolean;
  is_pro: boolean;
}

export interface ServerLeagueWeekResult {
  week_key: string;
  tier_id: string;
  weekly_xp: number;
  final_rank: number;
  movement: LeagueOutcome;
  reward_claimed: boolean;
  reward_qi?: number;
  reward_chest_type?: string | null;
}

export interface LeagueDataPayload {
  mode: LeagueDataMode;
  message?: string;
  weekKey: string;
  resetAt: string | null;
  tier: LeagueTier;
  tierMeta: (typeof LEAGUE_META)[LeagueTier];
  weeklyXp: number;
  rankPosition: number | null;
  promotedLastWeek: boolean;
  relegatedLastWeek: boolean;
  isPro: boolean;
  standings: ServerLeagueStanding[];
  lastWeek: ServerLeagueWeekResult | null;
  proHistory: ServerLeagueWeekResult[] | null;
}

function emptyPayload(mode: LeagueDataMode, message?: string): LeagueDataPayload {
  const tier: LeagueTier = "bronze";
  return {
    mode,
    message,
    weekKey: "",
    resetAt: null,
    tier,
    tierMeta: LEAGUE_META[tier],
    weeklyXp: 0,
    rankPosition: null,
    promotedLastWeek: false,
    relegatedLastWeek: false,
    isPro: false,
    standings: [],
    lastWeek: null,
    proHistory: null,
  };
}

function parseStandings(raw: unknown): ServerLeagueStanding[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const userId = String(r.user_id ?? "");
      if (!userId) return null;
      return {
        user_id: userId,
        display_name: String(r.display_name ?? "Aluno"),
        avatar_letter: String(r.avatar_letter ?? "A").slice(0, 1),
        weekly_xp: Math.max(0, Number(r.weekly_xp ?? 0)),
        rank: r.rank == null ? null : Math.max(1, Number(r.rank)),
        streak: Math.max(0, Number(r.streak ?? 0)),
        is_me: Boolean(r.is_me),
        is_pro: Boolean(r.is_pro),
      };
    })
    .filter((row): row is ServerLeagueStanding => row !== null);
}

function parseWeekResult(raw: unknown): ServerLeagueWeekResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const movement = r.movement;
  if (movement !== "promoted" && movement !== "stayed" && movement !== "demoted") return null;
  return {
    week_key: String(r.week_key ?? ""),
    tier_id: String(r.tier_id ?? "bronze"),
    weekly_xp: Math.max(0, Number(r.weekly_xp ?? 0)),
    final_rank: Math.max(1, Number(r.final_rank ?? 1)),
    movement,
    reward_claimed: Boolean(r.reward_claimed),
    reward_qi: r.reward_qi == null ? undefined : Number(r.reward_qi),
    reward_chest_type: r.reward_chest_type == null ? null : String(r.reward_chest_type),
  };
}

export async function fetchLiveLeagueData(): Promise<LeagueDataPayload> {
  if (!isSupabaseBackendEnabled()) {
    return emptyPayload("demo", "Backend em nuvem indisponível.");
  }

  const client = getSupabaseClient();
  if (!client) return emptyPayload("demo", "Cliente Supabase indisponível.");

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return emptyPayload("demo", "Faça login para ver a liga real.");
  }

  const { data, error } = await client.rpc("get_league_standings");
  if (error) {
    return emptyPayload("error", error.message);
  }

  const payload = data as Record<string, unknown>;
  const tierRaw = (payload.tier as Record<string, unknown> | undefined)?.id;
  const tier = normalizeLeagueTier(typeof tierRaw === "string" ? tierRaw : "bronze");
  const membership = (payload.membership ?? {}) as Record<string, unknown>;

  const proHistoryRaw = payload.pro_history;
  const proHistory = Array.isArray(proHistoryRaw)
    ? proHistoryRaw.map(parseWeekResult).filter((r): r is ServerLeagueWeekResult => r !== null)
    : null;

  return {
    mode: "live",
    weekKey: String(payload.week_key ?? ""),
    resetAt: payload.reset_at ? String(payload.reset_at) : null,
    tier,
    tierMeta: LEAGUE_META[tier],
    weeklyXp: Math.max(0, Number(membership.weekly_xp ?? 0)),
    rankPosition: membership.rank_position == null ? null : Number(membership.rank_position),
    promotedLastWeek: Boolean(membership.promoted_last_week),
    relegatedLastWeek: Boolean(membership.relegated_last_week),
    isPro: Boolean(membership.is_pro),
    standings: parseStandings(payload.standings),
    lastWeek: parseWeekResult(payload.last_week),
    proHistory,
  };
}

export async function syncLeagueWeekOnServer(): Promise<void> {
  if (!isSupabaseBackendEnabled()) return;
  const client = getSupabaseClient();
  if (!client) return;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;
  await client.rpc("sync_league_week", { p_user_id: user.id });
}

export async function addLeagueWeeklyXpOnServer(
  amount: number,
  sourceKey: string
): Promise<{ added: number; reason?: string }> {
  if (!isSupabaseBackendEnabled()) return { added: 0, reason: "offline" };
  const client = getSupabaseClient();
  if (!client) return { added: 0, reason: "no_client" };

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { added: 0, reason: "not_logged_in" };

  const cleanKey = sourceKey.trim();
  if (cleanKey.length < 3) return { added: 0, reason: "invalid_source" };

  const { data, error } = await client.rpc("add_league_weekly_xp", {
    p_amount: Math.max(0, Math.round(amount)),
    p_source_key: cleanKey,
  });

  if (error) return { added: 0, reason: error.message };
  const result = (data ?? {}) as Record<string, unknown>;
  return {
    added: Math.max(0, Number(result.added ?? 0)),
    reason: result.reason ? String(result.reason) : undefined,
  };
}

export async function claimLeagueWeekReward(weekKeyValue: string): Promise<{
  ok: boolean;
  qi?: number;
  message: string;
}> {
  if (!isSupabaseBackendEnabled()) {
    return { ok: false, message: "Recompensa disponível apenas com conta na nuvem." };
  }
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: "Cliente indisponível." };

  const { data, error } = await client.rpc("claim_league_week_reward", {
    p_week_key: weekKeyValue,
  });

  if (error) return { ok: false, message: error.message };
  const result = (data ?? {}) as Record<string, unknown>;
  if (!result.claimed) {
    return { ok: false, message: String(result.reason ?? "Não foi possível resgatar.") };
  }
  return {
    ok: true,
    qi: Number(result.qi ?? 0),
    message: `+${result.qi} Qi resgatados!`,
  };
}

export function isCloudLeagueAvailable(): boolean {
  return isSupabaseBackendEnabled();
}
