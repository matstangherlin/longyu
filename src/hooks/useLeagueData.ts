import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  onLeagueXpSynced,
  onLeagueXpSyncFailed,
  flushPendingLeagueXpSync,
  getPendingLeagueXpCount,
} from "../lib/leagueXpSync";
import {
  formatLeagueClock,
  publicDisplayName,
  resolveLeagueAuthIntent,
  resolveLeagueSurface,
} from "../lib/leagueLiveView";
import { leagueFixtureToPayload, readLeagueLiveFixture } from "../lib/leagueLiveFixture";
import { getSupabaseClient } from "../lib/supabaseClient";
import { restoreCloudSessionIfPresent } from "../services/cloudSyncCoordinator";

function serverStandingToRow(row: ServerLeagueStanding): LeagueStandingRow {
  return {
    id: row.user_id,
    name: publicDisplayName(row.display_name, row.is_me),
    xp: row.weekly_xp,
    rank: row.rank ?? 0,
    isUser: row.is_me,
    label: row.is_me ? "você" : "aluno",
    streak: row.streak,
    avatarLetter: row.avatar_letter,
    isPro: row.is_pro,
  };
}

async function detectCloudSession(): Promise<boolean> {
  if (!isCloudLeagueAvailable()) return false;
  const client = getSupabaseClient();
  if (!client) return false;
  const {
    data: { user },
  } = await client.auth.getUser();
  return Boolean(user?.id);
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
  const [cachedLive, setCachedLive] = useState<LeagueDataPayload | null>(null);
  const [liveFetchedAt, setLiveFetchedAt] = useState<number | null>(null);
  const cloudBackend = isCloudLeagueAvailable();
  const [hasCloudSession, setHasCloudSession] = useState(authMode === "cloud");
  const [sessionResolved, setSessionResolved] = useState(authMode === "cloud" || !cloudBackend);
  const [liveStatusMessage, setLiveStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(cloudBackend);
  const [syncing, setSyncing] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const cacheRef = useRef<LeagueDataPayload | null>(null);

  const fixture = readLeagueLiveFixture();
  const pendingCloudCheck = cloudBackend && !sessionResolved && !fixture;
  const authIntent = resolveLeagueAuthIntent(
    authMode,
    hasCloudSession || Boolean(fixture) || pendingCloudCheck
  );

  const refreshLive = useCallback(async () => {
    let sessionPresent = false;
    try {
      sessionPresent = await detectCloudSession();
    } catch {
      sessionPresent = false;
    }
    setHasCloudSession(sessionPresent);
    setSessionResolved(true);
    if (sessionPresent && authMode !== "cloud") {
      void restoreCloudSessionIfPresent();
    }
    const intent = resolveLeagueAuthIntent(authMode, sessionPresent);

    const fixture = readLeagueLiveFixture();
    if (fixture) {
      const payload = leagueFixtureToPayload(fixture, weeklyXp);
      setLive(payload);
      setCachedLive(payload);
      cacheRef.current = payload;
      setLiveFetchedAt(Date.now());
      setLiveStatusMessage(null);
      setLoading(false);
      setSyncing(false);
      setPendingCount(getPendingLeagueXpCount());
      return;
    }

    if (!cloudBackend || intent !== "cloud") {
      setLive(null);
      setLiveStatusMessage(
        intent === "cloud"
          ? "Backend em nuvem indisponível."
          : "Demonstração — faça login para competir com alunos reais."
      );
      setLoading(false);
      setSyncing(false);
      setPendingCount(0);
      return;
    }
    setLoading(true);
    setSyncing(true);
    await flushPendingLeagueXpSync();
    const data = await fetchLiveLeagueData();
    if (data.mode === "live") {
      setLive(data);
      setCachedLive(data);
      cacheRef.current = data;
      setLiveFetchedAt(Date.now());
      setLiveStatusMessage(null);
    } else if (data.mode === "error") {
      setLive(null);
      setLiveStatusMessage(data.message ?? "Não foi possível carregar a liga.");
    } else if (data.mode === "demo" && sessionPresent) {
      setLive(null);
      setLiveStatusMessage(data.message ?? "Não foi possível carregar a liga.");
    } else {
      setLive(null);
      setLiveStatusMessage(data.message ?? "Faça login para ver a liga real.");
    }
    setPendingCount(getPendingLeagueXpCount());
    setLoading(false);
    setSyncing(false);
  }, [authMode, cloudBackend, weeklyXp]);

  useEffect(() => {
    syncLeagueWeek();
  }, [syncLeagueWeek]);

  useEffect(() => {
    void refreshLive();
  }, [refreshLive, weeklyXp, syncTick]);

  useEffect(() => {
    setPendingCount(getPendingLeagueXpCount());
  }, [weeklyXp, syncTick]);

  useEffect(() => {
    return onLeagueXpSynced(() => {
      setSyncTick((tick) => tick + 1);
      setPendingCount(getPendingLeagueXpCount());
      setLastSyncError(null);
    });
  }, []);

  useEffect(() => {
    return onLeagueXpSyncFailed((detail) => {
      setLastSyncError(detail.reason);
      setPendingCount(getPendingLeagueXpCount());
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

  const liveOrCache = live ?? cachedLive ?? cacheRef.current;
  const surface = resolveLeagueSurface({
    authIntent,
    liveMode: live?.mode ?? (loading ? "loading" : liveStatusMessage ? "error" : null),
    liveStandingsCount: live?.standings.length ?? 0,
    hasCachedLive: Boolean(liveOrCache && liveOrCache.mode === "live" && !live),
    loading,
    statusMessage: liveStatusMessage,
  });

  const isLive = surface.surface === "live" || surface.surface === "cached" || surface.surface === "empty";
  const isDemo = surface.allowBots;
  const activeLive = isLive ? liveOrCache : null;

  const leagueTier: LeagueTier = activeLive ? activeLive.tier : normalizeLeagueTier(tier);
  const meta = activeLive ? activeLive.tierMeta : LEAGUE_META[leagueTier];
  const currentWeek = activeLive ? activeLive.weekKey : weekKey(now);
  const joined = activeLive
    ? activeLive.rankPosition != null || weeklyXp > 0 || activeLive.weeklyXp > 0
    : joinedLeagueThisWeek(joinedAt, now);

  const demoBots =
    joined && leagueBots.length > 0
      ? leagueBots
      : generateLeagueBots(leagueTier, currentWeek, joined ? "joined-demo" : "preview");

  const optimisticWeeklyXp = isLive && activeLive ? Math.max(activeLive.weeklyXp, weeklyXp) : weeklyXp;
  const serverWeeklyXp = isLive && activeLive ? activeLive.weeklyXp : weeklyXp;
  const isXpSyncing =
    isLive && authIntent === "cloud" && (syncing || loading || pendingCount > 0) && optimisticWeeklyXp > serverWeeklyXp;

  const standings: LeagueStandingRow[] = useMemo(() => {
    if (!surface.allowBots && activeLive) {
      const rows = activeLive.standings
        .map(serverStandingToRow)
        .filter((row) => row.rank > 0)
        .sort((a, b) => a.rank - b.rank);
      return rows.map((row) =>
        row.isUser && optimisticWeeklyXp > row.xp ? { ...row, xp: optimisticWeeklyXp } : row
      );
    }
    if (!surface.allowBots) return [];
    return buildLeagueStandings(weeklyXp, demoBots, firstName(accountName));
  }, [accountName, activeLive, demoBots, optimisticWeeklyXp, surface.allowBots, weeklyXp]);

  const userWeeklyXp = optimisticWeeklyXp;
  const userRow = standings.find((row) => row.isUser) ?? standings[0];
  const userRank = isLive && activeLive?.rankPosition ? activeLive.rankPosition : userRow?.rank ?? 1;
  const allStandingsZero = standings.length > 0 && standings.every((row) => row.xp === 0);

  return {
    now,
    loading,
    isLive,
    isDemo,
    surface: surface.surface,
    bannerKind: surface.bannerKind,
    demoMessage: surface.message ?? undefined,
    leagueTier,
    meta,
    currentWeek,
    joined: isLive && activeLive ? activeLive.rankPosition != null || joined : joined,
    standings,
    userWeeklyXp,
    userRank,
    allStandingsZero,
    serverWeeklyXp,
    isXpSyncing,
    pendingXpCount: pendingCount,
    lastSyncError: import.meta.env.DEV ? lastSyncError : null,
    lastUpdatedLabel: formatLeagueClock(liveFetchedAt, now),
    resetAt: activeLive ? activeLive.resetAt ?? null : null,
    lastWeek: activeLive ? activeLive.lastWeek ?? null : null,
    proHistory: activeLive ? activeLive.proHistory ?? null : null,
    isPro: activeLive ? activeLive.isPro ?? false : false,
    promotedLastWeek: activeLive ? activeLive.promotedLastWeek ?? false : false,
    relegatedLastWeek: activeLive ? activeLive.relegatedLastWeek ?? false : false,
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
