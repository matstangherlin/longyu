import { weekKey } from "./storage";

export type LeagueTier = "jade" | "safira" | "rubi" | "dragao";
export type LeagueOutcome = "promoted" | "stayed" | "demoted";

export interface LeagueBot {
  id: string;
  name: string;
  xp: number;
  kind: "simulated_student";
}

export interface LeagueHistoryEntry {
  id: string;
  weekKey: string;
  tier: LeagueTier;
  rank: number;
  weeklyXp: number;
  outcome: LeagueOutcome;
  createdAt: number;
}

export interface LeagueStandingRow {
  id: string;
  name: string;
  xp: number;
  rank: number;
  isUser: boolean;
  label: string;
}

export const LEAGUE_TIERS: LeagueTier[] = ["jade", "safira", "rubi", "dragao"];

export const LEAGUE_META: Record<
  LeagueTier,
  {
    name: string;
    shortName: string;
    description: string;
    color: string;
    softColor: string;
    reward: string;
  }
> = {
  jade: {
    name: "Liga Jade",
    shortName: "Jade",
    description: "Primeira divisão semanal para criar ritmo.",
    color: "#2f855a",
    softColor: "rgba(47, 133, 90, 0.14)",
    reward: "Top 5: sobe para Safira. A recompensa local é a promoção semanal.",
  },
  safira: {
    name: "Liga Safira",
    shortName: "Safira",
    description: "Ritmo consistente, com disputa um pouco mais alta.",
    color: "#2b6cb0",
    softColor: "rgba(43, 108, 176, 0.14)",
    reward: "Top 5: sobe para Rubi. A recompensa local é a promoção semanal.",
  },
  rubi: {
    name: "Liga Rubi",
    shortName: "Rubi",
    description: "Divisão forte para quem estuda em vários dias.",
    color: "#b83280",
    softColor: "rgba(184, 50, 128, 0.14)",
    reward: "Top 5: sobe para Dragão. A recompensa local é a promoção semanal.",
  },
  dragao: {
    name: "Liga Dragão",
    shortName: "Dragão",
    description: "Topo local das ligas do Longyu.",
    color: "#b7791f",
    softColor: "rgba(183, 121, 31, 0.16)",
    reward: "Top 5: mantém o topo da prévia local da Liga Dragão.",
  },
};

export const LEAGUE_SIZE = 20;
export const LEAGUE_PROMOTION_CUTOFF = 5;
export const LEAGUE_DEMOTION_CUTOFF = 5;

const BOT_COUNT = LEAGUE_SIZE - 1;
const BASE_XP: Record<LeagueTier, number> = {
  jade: 120,
  safira: 220,
  rubi: 340,
  dragao: 480,
};
const SPREAD_XP: Record<LeagueTier, number> = {
  jade: 560,
  safira: 700,
  rubi: 860,
  dragao: 1040,
};

export function normalizeLeagueTier(tier: LeagueTier | undefined): LeagueTier {
  return tier && LEAGUE_TIERS.includes(tier) ? tier : "jade";
}

export function leagueWeekFromTimestamp(timestamp: number | null | undefined): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return weekKey(date);
}

export function joinedLeagueThisWeek(joinedAt: number | null | undefined, now = new Date()): boolean {
  return leagueWeekFromTimestamp(joinedAt) === weekKey(now);
}

export function generateLeagueBots(tier: LeagueTier, leagueWeek: string, salt = "local"): LeagueBot[] {
  const cleanTier = normalizeLeagueTier(tier);
  const base = BASE_XP[cleanTier];
  const spread = SPREAD_XP[cleanTier];

  return Array.from({ length: BOT_COUNT }, (_, index) => {
    const seed = hashString(`${cleanTier}:${leagueWeek}:${salt}:${index}`);
    const jitter = (seed % 90) - 35;
    const curve = 1 - index / (BOT_COUNT + 1);
    const xp = Math.max(15, Math.round(base + spread * curve + jitter));
    const number = String(index + 1).padStart(2, "0");
    return {
      id: `local-bot:${cleanTier}:${leagueWeek}:${number}`,
      name: `Aluno simulado ${number}`,
      xp,
      kind: "simulated_student",
    };
  });
}

export function buildLeagueStandings(
  weeklyXp: number,
  bots: LeagueBot[],
  userName = "Você"
): LeagueStandingRow[] {
  const userRow: Omit<LeagueStandingRow, "rank"> = {
    id: "user",
    name: userName.trim() || "Você",
    xp: Math.max(0, Math.round(weeklyXp)),
    isUser: true,
    label: "você",
  };

  return [
    userRow,
    ...bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      xp: Math.max(0, Math.round(bot.xp)),
      isUser: false,
      label: "aluno simulado",
    })),
  ]
    .sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp;
      if (a.isUser !== b.isUser) return a.isUser ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function leagueOutcomeForRank(rank: number, total: number, tier: LeagueTier): LeagueOutcome {
  const cleanTier = normalizeLeagueTier(tier);
  if (rank <= LEAGUE_PROMOTION_CUTOFF && cleanTier !== "dragao") return "promoted";
  if (rank > total - LEAGUE_DEMOTION_CUTOFF && cleanTier !== "jade") return "demoted";
  return "stayed";
}

export function nextLeagueTier(tier: LeagueTier, outcome: LeagueOutcome): LeagueTier {
  const cleanTier = normalizeLeagueTier(tier);
  const index = LEAGUE_TIERS.indexOf(cleanTier);
  if (outcome === "promoted") return LEAGUE_TIERS[Math.min(LEAGUE_TIERS.length - 1, index + 1)];
  if (outcome === "demoted") return LEAGUE_TIERS[Math.max(0, index - 1)];
  return cleanTier;
}

export function leagueZoneLabel(rank: number, total: number, tier: LeagueTier): string {
  const cleanTier = normalizeLeagueTier(tier);
  if (rank <= LEAGUE_PROMOTION_CUTOFF) {
    return cleanTier === "dragao" ? "Topo da Liga Dragão" : "Zona de subida";
  }
  if (rank > total - LEAGUE_DEMOTION_CUTOFF) {
    return cleanTier === "jade" ? "Base da Jade" : "Zona de queda";
  }
  return "Permanece";
}

export function leagueOutcomeLabel(outcome: LeagueOutcome, tier: LeagueTier): string {
  if (outcome === "promoted") return `Sobe para ${LEAGUE_META[nextLeagueTier(tier, outcome)].shortName}`;
  if (outcome === "demoted") return `Desce para ${LEAGUE_META[nextLeagueTier(tier, outcome)].shortName}`;
  return "Permanece na divisão";
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
