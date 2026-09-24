import type { LeagueStandingRow } from "./leagues";
import type { LeagueDataMode, LeagueDataPayload } from "../services/leagueService";

export type LeagueAuthIntent = "cloud" | "local";

export type LeagueSurfaceKind = "live" | "cached" | "error" | "empty" | "demo" | "loading";

export type LeagueSurface = {
  surface: LeagueSurfaceKind;
  allowBots: boolean;
  bannerKind: "none" | "demo" | "error" | "syncing" | "cached";
  message: string | null;
};

export function resolveLeagueAuthIntent(authMode: string, hasCloudSession: boolean): LeagueAuthIntent {
  if (authMode === "cloud" || hasCloudSession) return "cloud";
  return "local";
}

export function resolveLeagueSurface(input: {
  authIntent: LeagueAuthIntent;
  liveMode: LeagueDataMode | null;
  liveStandingsCount: number;
  hasCachedLive: boolean;
  loading: boolean;
  statusMessage: string | null;
}): LeagueSurface {
  const cloud = input.authIntent === "cloud";
  if (!cloud) {
    return {
      surface: "demo",
      allowBots: true,
      bannerKind: "demo",
      message: input.statusMessage ?? "Demonstração — faça login para competir com alunos reais.",
    };
  }
  if (input.liveMode === "live") {
    if (input.liveStandingsCount === 0) {
      return { surface: "empty", allowBots: false, bannerKind: "none", message: null };
    }
    return { surface: "live", allowBots: false, bannerKind: "none", message: null };
  }
  if (input.loading && !input.hasCachedLive) {
    return {
      surface: "loading",
      allowBots: false,
      bannerKind: "syncing",
      message: "Carregando liga real…",
    };
  }
  if (input.hasCachedLive) {
    // RC2.2.11 — cache-first: enquanto a atualização roda, a última liga
    // aparece em silêncio. O aviso de "última liga carregada" só volta se a
    // atualização FALHAR (cache realmente velho ou backend fora).
    return {
      surface: "cached",
      allowBots: false,
      bannerKind: input.loading ? "none" : "cached",
      message: input.loading ? null : input.statusMessage ?? "Mostrando a última liga carregada.",
    };
  }
  return {
    surface: "error",
    allowBots: false,
    bannerKind: "error",
    message: input.statusMessage ?? "Não foi possível carregar a liga.",
  };
}

export function publicDisplayName(name: string | undefined | null, isMe = false): string {
  if (isMe) return "Você";
  const clean = String(name ?? "").trim();
  if (!clean || /^aluno\s*demo/i.test(clean)) return "Aluno";
  return clean;
}

export function liveStandingsOmitPrivate(rows: LeagueStandingRow[]): LeagueStandingRow[] {
  return rows.map((row) => ({
    ...row,
    name: publicDisplayName(row.name, row.isUser),
    email: undefined,
  })) as LeagueStandingRow[];
}

export function formatLeagueClock(at: number | null, now = new Date()): string | null {
  if (!at) return null;
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return null;
  const sameDay = date.toDateString() === now.toDateString();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return sameDay ? `${hh}:${mm}` : `${date.getDate()}/${date.getMonth() + 1} ${hh}:${mm}`;
}

export function payloadLooksLive(payload: LeagueDataPayload | null): boolean {
  return Boolean(payload && payload.mode === "live");
}

// ── RC2.2.11 — Liga cache-first / stale-while-revalidate ───────────────────
//
// Abrir a Liga não espera sessão + flush de XP + fetch. A última liga real
// carregada fica guardada POR CONTA neste aparelho e aparece imediatamente;
// o fetch ao vivo e o flush de XP pendente rodam em paralelo e reconciliam em
// silêncio. Só a liga real (mode "live") é guardada — nunca demo/bots.

export const LEAGUE_CACHE_KEY = "longyu:league-cache:v1";

export type PersistedLeagueCache = { accountKey: string; savedAt: number; payload: LeagueDataPayload };

function leagueStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readPersistedLeagueCache(
  accountKey: string,
  storage: Pick<Storage, "getItem"> | null = leagueStorage()
): PersistedLeagueCache | null {
  if (!storage || !accountKey) return null;
  try {
    const raw = storage.getItem(LEAGUE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedLeagueCache;
    if (parsed?.accountKey !== accountKey || parsed.payload?.mode !== "live" || !Array.isArray(parsed.payload.standings)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedLeagueCache(
  accountKey: string,
  payload: LeagueDataPayload,
  now = Date.now(),
  storage: Pick<Storage, "setItem"> | null = leagueStorage()
): void {
  if (!storage || !accountKey || payload.mode !== "live") return;
  try {
    storage.setItem(LEAGUE_CACHE_KEY, JSON.stringify({ accountKey, savedAt: now, payload } satisfies PersistedLeagueCache));
  } catch {
    /* quota / modo privado: segue sem cache */
  }
}

/**
 * Plano de carga da Liga (puro, testável): o que aparece primeiro e o que
 * roda em paralelo. O flush de XP NUNCA bloqueia o fetch de standings.
 */
export function planLeagueLoad(input: { hasCache: boolean; pendingXp: number; cloud: boolean }): {
  firstContent: "cache" | "loading" | "demo";
  parallel: readonly ("fetch" | "flush")[];
  flushBlocksFetch: false;
} {
  if (!input.cloud) return { firstContent: "demo", parallel: [], flushBlocksFetch: false };
  return {
    firstContent: input.hasCache ? "cache" : "loading",
    parallel: input.pendingXp > 0 ? ["fetch", "flush"] : ["fetch"],
    flushBlocksFetch: false,
  };
}
