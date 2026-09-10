import { isTestFixturesAllowed } from "./appEnvironment";
import type { LeagueDataPayload, ServerLeagueStanding } from "../services/leagueService";
import { LEAGUE_META, normalizeLeagueTier } from "./leagues";

export const LEAGUE_LIVE_FIXTURE_KEY = "longyu-league-live-fixture";

export type LeagueLiveFixtureRow = {
  id: string;
  displayName: string;
  weeklyXp: number;
  isMe?: boolean;
  streak?: number;
  isPro?: boolean;
};

export type LeagueLiveFixture = {
  weekKey?: string;
  users: LeagueLiveFixtureRow[];
};

function readWindowFixture(): LeagueLiveFixture | null {
  if (typeof window === "undefined") return null;
  const injected = (window as Window & { __LONGYU_LEAGUE_LIVE_FIXTURE__?: LeagueLiveFixture })
    .__LONGYU_LEAGUE_LIVE_FIXTURE__;
  if (injected?.users?.length) return injected;
  try {
    const raw = window.localStorage.getItem(LEAGUE_LIVE_FIXTURE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeagueLiveFixture;
    if (!parsed?.users?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readLeagueLiveFixture(): LeagueLiveFixture | null {
  if (!isTestFixturesAllowed()) return null;
  return readWindowFixture();
}

export function leagueFixtureToPayload(fixture: LeagueLiveFixture, meWeeklyXp?: number): LeagueDataPayload {
  const sorted = [...fixture.users].sort((a, b) => {
    const aXp = a.isMe && meWeeklyXp != null ? meWeeklyXp : a.weeklyXp;
    const bXp = b.isMe && meWeeklyXp != null ? meWeeklyXp : b.weeklyXp;
    return bXp - aXp || a.id.localeCompare(b.id);
  });
  const standings: ServerLeagueStanding[] = sorted.map((row, index) => {
    const xp = row.isMe && meWeeklyXp != null ? meWeeklyXp : row.weeklyXp;
    const name = String(row.displayName ?? "").trim() || "Aluno";
    return {
      user_id: row.id,
      display_name: name,
      avatar_letter: name.slice(0, 1).toUpperCase(),
      weekly_xp: Math.max(0, xp),
      rank: index + 1,
      streak: row.streak ?? 0,
      is_me: Boolean(row.isMe),
      is_pro: Boolean(row.isPro),
    };
  });
  const me = standings.find((row) => row.is_me);
  const tier = normalizeLeagueTier("bronze");
  return {
    mode: "live",
    weekKey: fixture.weekKey ?? "fixture-week",
    resetAt: null,
    tier,
    tierMeta: LEAGUE_META[tier],
    weeklyXp: me?.weekly_xp ?? 0,
    rankPosition: me?.rank ?? null,
    promotedLastWeek: false,
    relegatedLastWeek: false,
    isPro: Boolean(me?.is_pro),
    standings,
    lastWeek: null,
    proHistory: null,
  };
}

export const DEFAULT_LIVE_LEAGUE_FIXTURE: LeagueLiveFixture = {
  weekKey: "fixture-week",
  users: [
    { id: "user-a", displayName: "Ana", weeklyXp: 100 },
    { id: "user-b", displayName: "Matheus", weeklyXp: 80 },
    { id: "user-c", displayName: "João", weeklyXp: 40, isMe: true },
  ],
};
