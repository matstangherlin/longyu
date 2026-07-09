import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { weekKey } from "../lib/storage";
import {
  LEAGUE_DEMOTION_CUTOFF,
  LEAGUE_META,
  LEAGUE_PROMOTION_CUTOFF,
  LEAGUE_TIERS,
  buildLeagueStandings,
  generateLeagueBots,
  joinedLeagueThisWeek,
  leagueOutcomeForRank,
  normalizeLeagueTier,
  type LeagueStandingRow,
  type LeagueTier,
} from "../lib/leagues";
import {
  fetchLiveLeagueData,
  isCloudLeagueAvailable,
  type LeagueDataPayload,
  type ServerLeagueStanding,
} from "../services/leagueService";

function serverStandingToRow(row: ServerLeagueStanding): LeagueStandingRow {
  return {
    id: row.user_id,
    name: row.is_me ? "Você" : row.display_name,
    xp: row.weekly_xp,
    rank: row.rank ?? 0,
    isUser: row.is_me,
    label: row.is_me ? "você" : "aluno",
    streak: row.streak,
    avatarLetter: row.avatar_letter,
    isPro: row.is_pro,
  };
}

export function useLeagueData() {
  const syncLeagueWeek = useStore((s) => s.syncLeagueWeek);
  const tier = useStore((s) => s.leagueTier);
  const weeklyXp = useStore((s) => s.getWeeklyXp());
  const joinedAt = useStore((s) => s.leagueJoinedAt);
  const leagueBots = useStore((s) => s.leagueBots);
  const accountName = useStore((s) => s.accounts[s.currentAccountId]?.name ?? "Você");
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");

  const [now, setNow] = useState(() => new Date());
  const [live, setLive] = useState<LeagueDataPayload | null>(null);
  const [loading, setLoading] = useState(isCloudLeagueAvailable());

  const refreshLive = useCallback(async () => {
    if (!isCloudLeagueAvailable() || authMode !== "cloud") {
      setLive(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await fetchLiveLeagueData();
    setLive(data.mode === "live" ? data : null);
    setLoading(false);
  }, [authMode]);

  useEffect(() => {
    syncLeagueWeek();
  }, [syncLeagueWeek]);

  useEffect(() => {
    void refreshLive();
  }, [refreshLive, weeklyXp]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const isLive = Boolean(live && live.mode === "live");
  const isDemo = !isLive;

  const leagueTier: LeagueTier = isLive ? live!.tier : normalizeLeagueTier(tier);
  const meta = isLive ? live!.tierMeta : LEAGUE_META[leagueTier];
  const currentWeek = isLive ? live!.weekKey : weekKey(now);
  const joined = isLive ? live!.weeklyXp > 0 || live!.rankPosition != null : joinedLeagueThisWeek(joinedAt, now);

  const demoBots =
    joined && leagueBots.length > 0
      ? leagueBots
      : generateLeagueBots(leagueTier, currentWeek, joined ? "joined-demo" : "preview");

  const standings: LeagueStandingRow[] = useMemo(() => {
    if (isLive && live) {
      return live.standings
        .map(serverStandingToRow)
        .filter((row) => row.rank > 0)
        .sort((a, b) => a.rank - b.rank);
    }
    return buildLeagueStandings(weeklyXp, demoBots, firstName(accountName));
  }, [accountName, demoBots, isLive, live, weeklyXp]);

  const userWeeklyXp = isLive ? live!.weeklyXp : weeklyXp;
  const userRow = standings.find((row) => row.isUser) ?? standings[0];
  const userRank = isLive && live?.rankPosition ? live.rankPosition : userRow?.rank ?? 1;

  return {
    now,
    loading,
    isLive,
    isDemo,
    demoMessage: isDemo
      ? authMode === "cloud"
        ? live?.message ?? "Carregando liga real…"
        : "Demonstração — faça login para competir com alunos reais."
      : undefined,
    leagueTier,
    meta,
    currentWeek,
    joined: isLive ? true : joined,
    standings,
    userWeeklyXp,
    userRank,
    resetAt: isLive ? live?.resetAt ?? null : null,
    lastWeek: isLive ? live?.lastWeek ?? null : null,
    proHistory: isLive ? live?.proHistory ?? null : null,
    isPro: isLive ? live?.isPro ?? false : false,
    promotedLastWeek: isLive ? live?.promotedLastWeek ?? false : false,
    relegatedLastWeek: isLive ? live?.relegatedLastWeek ?? false : false,
    promotionCutoff: LEAGUE_PROMOTION_CUTOFF,
    demotionCutoff: LEAGUE_DEMOTION_CUTOFF,
    tiers: LEAGUE_TIERS,
    outcome: leagueOutcomeForRank(userRank, standings.length, leagueTier),
    refreshLive,
  };
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "Você";
}
