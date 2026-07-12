import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { LEAGUE_META, type LeagueTier } from "../lib/leagues";
import { useStore } from "../lib/store";
import type {
  PublicProfile,
  SocialActivityItem,
  SocialActivityType,
  SocialFollowRow,
  SocialProfileSettings,
} from "../lib/social/types";
import { isValidUsername, normalizeUsernameInput, suggestUsernameFromName } from "../lib/social/username";

type ServiceResult<T> = { ok: true; data: T } | { ok: false; message: string };

function clientOrError() {
  if (!isSupabaseBackendEnabled()) return { ok: false as const, message: "Conta na nuvem necessária para amigos." };
  const client = getSupabaseClient();
  if (!client) return { ok: false as const, message: "Cliente Supabase indisponível." };
  return { ok: true as const, client };
}

async function currentUserId(): Promise<string | null> {
  const gate = clientOrError();
  if (!gate.ok) return null;
  const { data } = await gate.client.auth.getUser();
  return data.user?.id ?? null;
}

function mapPublicProfile(row: Record<string, unknown>): PublicProfile {
  return {
    user_id: String(row.user_id),
    display_name: String(row.display_name ?? "Aluno"),
    username: row.username ? String(row.username) : null,
    avatar_key: row.avatar_key ? String(row.avatar_key) : null,
    league_tier: String(row.league_tier ?? "jade"),
    weekly_xp: Number(row.weekly_xp ?? 0),
    streak: Number(row.streak ?? 0),
    joined_at: String(row.joined_at ?? new Date().toISOString()),
    show_in_search: row.show_in_search == null ? true : Boolean(row.show_in_search),
  };
}

export async function fetchMySocialSettings(): Promise<ServiceResult<SocialProfileSettings>> {
  const gate = clientOrError();
  if (!gate.ok) return gate;

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Faça login na nuvem." };

  const { data, error } = await gate.client
    .from("profiles")
    .select("username, show_in_search")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    data: {
      username: data?.username ? String(data.username) : null,
      show_in_search: data?.show_in_search ?? true,
    },
  };
}

export async function updateUsername(raw: string): Promise<ServiceResult<SocialProfileSettings>> {
  const gate = clientOrError();
  if (!gate.ok) return gate;

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Faça login na nuvem." };

  const username = normalizeUsernameInput(raw);
  if (!isValidUsername(username)) {
    return { ok: false, message: "Use 3–24 caracteres: letras minúsculas, números e _." };
  }

  const { error } = await gate.client
    .from("profiles")
    .update({ username, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    if (error.code === "23505") return { ok: false, message: "Este @apelido já está em uso." };
    return { ok: false, message: error.message };
  }

  return fetchMySocialSettings();
}

export async function updateShowInSearch(show: boolean): Promise<ServiceResult<SocialProfileSettings>> {
  const gate = clientOrError();
  if (!gate.ok) return gate;

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Faça login na nuvem." };

  const { error } = await gate.client
    .from("profiles")
    .update({ show_in_search: show, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { ok: false, message: error.message };
  return fetchMySocialSettings();
}

export async function ensureSuggestedUsername(name: string): Promise<ServiceResult<string | null>> {
  const current = await fetchMySocialSettings();
  if (!current.ok) return { ok: false, message: current.message };
  if (current.data.username) return { ok: true, data: current.data.username };

  const suggestion = suggestUsernameFromName(name);
  const result = await updateUsername(suggestion);
  if (!result.ok) return { ok: true, data: null };
  return { ok: true, data: result.data.username };
}

export async function searchProfiles(query: string): Promise<ServiceResult<PublicProfile[]>> {
  const gate = clientOrError();
  if (!gate.ok) return gate;

  const q = query.trim();
  if (q.length < 2) return { ok: true, data: [] };

  const { data, error } = await gate.client.rpc("search_public_profiles", { search_query: q });
  if (error) return { ok: false, message: error.message };

  return { ok: true, data: (data ?? []).map((row: Record<string, unknown>) => mapPublicProfile(row)) };
}

export async function getProfileByUsername(username: string): Promise<ServiceResult<PublicProfile | null>> {
  const gate = clientOrError();
  if (!gate.ok) return gate;

  const { data, error } = await gate.client.rpc("get_public_profile_by_username", {
    target_username: username.trim(),
  });
  if (error) return { ok: false, message: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: true, data: null };
  return { ok: true, data: mapPublicProfile(row as Record<string, unknown>) };
}

export async function followUser(targetUserId: string): Promise<ServiceResult<true>> {
  const gate = clientOrError();
  if (!gate.ok) return gate;

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Faça login na nuvem." };
  if (userId === targetUserId) return { ok: false, message: "Você não pode seguir a si mesmo." };

  const { error } = await gate.client.from("user_follows").insert({
    follower_id: userId,
    following_id: targetUserId,
  });

  if (error) {
    if (error.code === "23505") return { ok: true, data: true };
    return { ok: false, message: error.message };
  }
  return { ok: true, data: true };
}

export async function unfollowUser(targetUserId: string): Promise<ServiceResult<true>> {
  const gate = clientOrError();
  if (!gate.ok) return gate;

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Faça login na nuvem." };

  const { error } = await gate.client
    .from("user_follows")
    .delete()
    .eq("follower_id", userId)
    .eq("following_id", targetUserId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: true };
}

async function listFollowProfiles(direction: "following" | "followers"): Promise<ServiceResult<SocialFollowRow[]>> {
  const gate = clientOrError();
  if (!gate.ok) return gate;

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Faça login na nuvem." };

  const query =
    direction === "following"
      ? gate.client.from("user_follows").select("following_id, created_at").eq("follower_id", userId)
      : gate.client.from("user_follows").select("follower_id, created_at").eq("following_id", userId);

  const { data: follows, error } = await query.order("created_at", { ascending: false });
  if (error) return { ok: false, message: error.message };
  if (!follows?.length) return { ok: true, data: [] };

  type FollowRow = { following_id?: string; follower_id?: string; created_at: string };
  const followRows = follows as FollowRow[];
  const ids = followRows.map((row) =>
    String(direction === "following" ? row.following_id : row.follower_id)
  );
  const { data: profiles, error: profileError } = await gate.client
    .from("public_profiles")
    .select("user_id, display_name, username, avatar_key, league_tier, weekly_xp, streak")
    .in("user_id", ids);

  if (profileError) return { ok: false, message: profileError.message };

  const profileMap = new Map((profiles ?? []).map((p) => [String(p.user_id), p]));
  const rows: SocialFollowRow[] = followRows
    .map((follow) => {
      const id = String(direction === "following" ? follow.following_id : follow.follower_id);
      const profile = profileMap.get(id);
      if (!profile) return null;
      return {
        user_id: id,
        display_name: String(profile.display_name),
        username: profile.username ? String(profile.username) : null,
        avatar_key: profile.avatar_key ? String(profile.avatar_key) : null,
        league_tier: String(profile.league_tier ?? "jade"),
        weekly_xp: Number(profile.weekly_xp ?? 0),
        streak: Number(profile.streak ?? 0),
        followed_at: String(follow.created_at),
      } satisfies SocialFollowRow;
    })
    .filter((row): row is SocialFollowRow => row !== null);

  return { ok: true, data: rows };
}

export function listFollowing() {
  return listFollowProfiles("following");
}

export function listFollowers() {
  return listFollowProfiles("followers");
}

export async function fetchFriendsRanking(): Promise<ServiceResult<PublicProfile[]>> {
  const gate = clientOrError();
  if (!gate.ok) return gate;

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Faça login na nuvem." };

  const following = await listFollowing();
  if (!following.ok) return following;

  const state = useStore.getState();
  const account = state.accounts[state.currentAccountId];
  const me: PublicProfile = {
    user_id: userId,
    display_name: account?.name ?? "Você",
    username: null,
    avatar_key: null,
    league_tier: state.leagueTier,
    weekly_xp: state.getWeeklyXp(),
    streak: state.streak,
    joined_at: new Date(account?.createdAt ?? Date.now()).toISOString(),
  };

  const settings = await fetchMySocialSettings();
  if (settings.ok && settings.data.username) me.username = settings.data.username;

  const friends = following.data.map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    username: row.username,
    avatar_key: row.avatar_key,
    league_tier: row.league_tier,
    weekly_xp: row.weekly_xp,
    streak: row.streak,
    joined_at: row.followed_at,
  }));

  return {
    ok: true,
    data: [me, ...friends].sort((a, b) => b.weekly_xp - a.weekly_xp || b.streak - a.streak),
  };
}

export async function fetchFriendActivity(limit = 20): Promise<ServiceResult<SocialActivityItem[]>> {
  const gate = clientOrError();
  if (!gate.ok) return gate;

  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "Faça login na nuvem." };

  const following = await listFollowing();
  if (!following.ok) return following;

  const ids = [userId, ...following.data.map((row) => row.user_id)];
  const { data, error } = await gate.client
    .from("social_activity_events")
    .select("id, user_id, event_type, payload, created_at")
    .in("user_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, message: error.message };

  const nameMap = new Map<string, { name: string; username: string | null }>();
  nameMap.set(userId, {
    name: useStore.getState().accounts[useStore.getState().currentAccountId]?.name ?? "Você",
    username: null,
  });
  for (const row of following.data) {
    nameMap.set(row.user_id, { name: row.display_name, username: row.username });
  }

  const items: SocialActivityItem[] = (data ?? []).map((row) => {
    const meta = nameMap.get(String(row.user_id));
    return {
      id: String(row.id),
      user_id: String(row.user_id),
      display_name: meta?.name ?? "Aluno",
      username: meta?.username ?? null,
      event_type: row.event_type as SocialActivityType,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      created_at: String(row.created_at),
    };
  });

  return { ok: true, data: items };
}

export async function recordSocialActivity(
  eventType: SocialActivityType,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const gate = clientOrError();
  if (!gate.ok) return;

  const userId = await currentUserId();
  if (!userId) return;

  await gate.client.from("social_activity_events").insert({
    user_id: userId,
    event_type: eventType,
    payload,
  });
}

export async function syncSocialProfileFromStore(): Promise<void> {
  const gate = clientOrError();
  if (!gate.ok) return;

  const userId = await currentUserId();
  if (!userId) return;

  const state = useStore.getState();
  const account = state.accounts[state.currentAccountId];
  if (account?.authMode !== "cloud") return;

  await gate.client
    .from("profiles")
    .update({
      name: account.name,
      league_tier: state.leagueTier,
      public_weekly_xp: state.getWeeklyXp(),
      public_streak: state.streak,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

export function leagueLabel(tier: string): string {
  const key = tier as LeagueTier;
  return LEAGUE_META[key]?.shortName ?? tier;
}

export function activityCopy(item: SocialActivityItem, meUserId?: string | null): string {
  const who = meUserId && item.user_id === meUserId ? "Você" : item.display_name;
  switch (item.event_type) {
    case "lesson_complete":
      return `${who} concluiu uma lição${item.payload.lessonTitle ? `: ${String(item.payload.lessonTitle)}` : ""}.`;
    case "league_up":
      return `${who} subiu para a Liga ${leagueLabel(String(item.payload.tier ?? "jade"))}.`;
    case "streak":
      return `${who} manteve sequência de ${String(item.payload.days ?? item.payload.streak ?? "vários")} dias.`;
    case "achievement":
      return `${who} desbloqueou a conquista ${String(item.payload.title ?? "nova")}.`;
    default:
      return `${who} teve atividade recente.`;
  }
}
