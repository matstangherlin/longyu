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
import { onLeagueXpSynced, flushPendingLeagueXpSync } from "../lib/leagueXpSync";

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
  const [syncTick, setSyncTick] = useState(0);

  const refreshLive = useCallback(async () => {
    if (!isCloudLeagueAvailable() || authMode !== "cloud") {
      setLive(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    await flushPendingLeagueXpSync();
    const data = await fetchLiveLeagueData();
    setLive(data.mode === "live" ? data : null);
    setLoading(false);
  }, [authMode]);

  useEffect(() => {
    syncLeagueWeek();
  }, [syncLeagueWeek]);

  useEffect(() => {
    void refreshLive();
  }, [refreshLive, weeklyXp, syncTick]);

  useEffect(() => {
    return onLeagueXpSynced(() => {
      setSyncTick((tick) => tick + 1);
    });
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshLive();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshLive]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const isLive = Boolean(live && live.mode === "live");
  const isDemo = !isLive;

  const leagueTier: LeagueTier = isLive ? live!.tier : normalizeLeagueTier(tier);
  const meta = isLive ? live!.tierMeta : LEAGUE_META[leagueTier];
  const currentWeek = isLive ? live!.weekKey : weekKey(now);
  const joined = isLive
    ? live!.rankPosition != null || weeklyXp > 0 || live!.weeklyXp > 0
    : joinedLeagueThisWeek(joinedAt, now);

  const demoBots =
    joined && leagueBots.length > 0
      ? leagueBots
      : generateLeagueBots(leagueTier, currentWeek, joined ? "joined-demo" : "preview");

  const optimisticWeeklyXp = isLive ? Math.max(live!.weeklyXp, weeklyXp) : weeklyXp;

  const standings: LeagueStandingRow[] = useMemo(() => {
    if (isLive && live) {
      const rows = live.standings
        .map(serverStandingToRow)
        .filter((row) => row.rank > 0)
        .sort((a, b) => a.rank - b.rank);
      return rows.map((row) =>
        row.isUser && optimisticWeeklyXp > row.xp ? { ...row, xp: optimisticWeeklyXp } : row
      );
    }
    return buildLeagueStandings(weeklyXp, demoBots, firstName(accountName));
  }, [accountName, demoBots, isLive, live, optimisticWeeklyXp, weeklyXp]);

  const userWeeklyXp = optimisticWeeklyXp;
  const userRow = standings.find((row) => row.isUser) ?? standings[0];
  const userRank = isLive && live?.rankPosition ? live.rankPosition : userRow?.rank ?? 1;
  const allStandingsZero = standings.length > 0 && standings.every((row) => row.xp === 0);

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
    joined: isLive ? live!.rankPosition != null || joined : joined,
    standings,
    userWeeklyXp,
    userRank,
    allStandingsZero,
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
