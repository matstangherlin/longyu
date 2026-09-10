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
    return {
      surface: "cached",
      allowBots: false,
      bannerKind: "cached",
      message: input.statusMessage ?? "Mostrando a última liga carregada.",
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
