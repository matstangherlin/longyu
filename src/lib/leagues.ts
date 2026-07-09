import { weekKey } from "./storage";

export type LeagueTier =
  | "bronze"
  | "prata"
  | "ouro"
  | "jade"
  | "dragao"
  | "mestre"
  | "celestial";

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
  streak?: number;
  avatarLetter?: string;
  isPro?: boolean;
}

export const LEAGUE_TIERS: LeagueTier[] = [
  "bronze",
  "prata",
  "ouro",
  "jade",
  "dragao",
  "mestre",
  "celestial",
];

const LEGACY_TIER_MAP: Record<string, LeagueTier> = {
  safira: "prata",
  rubi: "ouro",
};

export const LEAGUE_META: Record<
  LeagueTier,
  {
    name: string;
    shortName: string;
    description: string;
    color: string;
    softColor: string;
    reward: string;
    levelRange: string;
    icon: string;
  }
> = {
  bronze: {
    name: "Liga Bronze",
    shortName: "Bronze",
    description: "Primeiros passos. Aprenda o ritmo semanal.",
    color: "#8B6914",
    softColor: "rgba(139, 105, 20, 0.14)",
    reward: "Top 5 sobem · recompensa básica de Qi",
    levelRange: "Início",
    icon: "shield",
  },
  prata: {
    name: "Liga Prata",
    shortName: "Prata",
    description: "Consistência básica na jornada.",
    color: "#9AA3AF",
    softColor: "rgba(154, 163, 175, 0.16)",
    reward: "Top 5 sobem · mais Qi na recompensa",
    levelRange: "Básico",
    icon: "star",
  },
  ouro: {
    name: "Liga Ouro",
    shortName: "Ouro",
    description: "Estudo regular em vários dias.",
    color: "#C6971E",
    softColor: "rgba(198, 151, 30, 0.14)",
    reward: "Top 5 sobem · recompensa intermediária",
    levelRange: "Intermediário",
    icon: "star",
  },
  jade: {
    name: "Liga Jade",
    shortName: "Jade",
    description: "Ritmo forte e revisão frequente.",
    color: "#2F855A",
    softColor: "rgba(47, 133, 90, 0.14)",
    reward: "Top 5 sobem · baú pequeno possível",
    levelRange: "Avançado",
    icon: "gem",
  },
  dragao: {
    name: "Liga Dragão",
    shortName: "Dragão",
    description: "Divisão avançada para quem estuda todo dia.",
    color: "#B7791F",
    softColor: "rgba(183, 121, 31, 0.16)",
    reward: "Top 5 sobem · baú pequeno",
    levelRange: "Expert",
    icon: "dragon",
  },
  mestre: {
    name: "Liga Mestre",
    shortName: "Mestre",
    description: "Elite semanal. Poucos chegam aqui.",
    color: "#6B46C1",
    softColor: "rgba(107, 70, 193, 0.14)",
    reward: "Top 5 sobem · baú dragão possível",
    levelRange: "Mestre",
    icon: "crown",
  },
  celestial: {
    name: "Liga Celestial",
    shortName: "Celestial",
    description: "O topo. Mantenha a coroa.",
    color: "#E53E3E",
    softColor: "rgba(229, 62, 62, 0.12)",
    reward: "Topo absoluto · baú dragão",
    levelRange: "Lenda",
    icon: "sun",
  },
};

export const LEAGUE_SIZE = 20;
export const LEAGUE_PROMOTION_CUTOFF = 5;
export const LEAGUE_DEMOTION_CUTOFF = 5;

const BOT_COUNT = LEAGUE_SIZE - 1;
const BASE_XP: Record<LeagueTier, number> = {
  bronze: 80,
  prata: 140,
  ouro: 200,
  jade: 280,
  dragao: 380,
  mestre: 480,
  celestial: 600,
};
const SPREAD_XP: Record<LeagueTier, number> = {
  bronze: 420,
  prata: 520,
  ouro: 620,
  jade: 720,
  dragao: 820,
  mestre: 920,
  celestial: 1020,
};

export function normalizeLeagueTier(tier: LeagueTier | string | undefined): LeagueTier {
  if (!tier) return "bronze";
  const mapped = LEGACY_TIER_MAP[tier] ?? tier;
  return LEAGUE_TIERS.includes(mapped as LeagueTier) ? (mapped as LeagueTier) : "bronze";
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
      id: `demo-bot:${cleanTier}:${leagueWeek}:${number}`,
      name: `Aluno demo ${number}`,
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
  const safeName = userName.trim() || "Você";
  const userRow: Omit<LeagueStandingRow, "rank"> = {
    id: "user",
    name: safeName,
    xp: Math.max(0, Math.round(weeklyXp)),
    isUser: true,
    label: "você",
    avatarLetter: safeName.charAt(0).toUpperCase(),
  };

  return [
    userRow,
    ...bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      xp: Math.max(0, Math.round(bot.xp)),
      isUser: false,
      label: "demonstração",
      avatarLetter: bot.name.replace(/[^A-Za-zÀ-ÿ]/g, "").charAt(0).toUpperCase() || "A",
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
  const isTopTier = cleanTier === "celestial";
  const isBottomTier = cleanTier === "bronze";
  if (!isTopTier && rank <= LEAGUE_PROMOTION_CUTOFF) return "promoted";
  if (!isBottomTier && rank > total - LEAGUE_DEMOTION_CUTOFF) return "demoted";
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
    return cleanTier === "celestial" ? "Topo celestial" : "Zona de subida";
  }
  if (rank > total - LEAGUE_DEMOTION_CUTOFF) {
    return cleanTier === "bronze" ? "Base do Bronze" : "Zona de queda";
  }
  return "Permanece";
}

export function leagueOutcomeLabel(outcome: LeagueOutcome, tier: LeagueTier): string {
  if (outcome === "promoted") return `Sobe para ${LEAGUE_META[nextLeagueTier(tier, outcome)].shortName}`;
  if (outcome === "demoted") return `Desce para ${LEAGUE_META[nextLeagueTier(tier, outcome)].shortName}`;
  return "Permanece na divisão";
}

export function formatLeagueReward(tier: LeagueTier, isPro = false): string {
  const meta = LEAGUE_META[tier];
  const proNote = isPro ? " · bônus Pro no Qi" : "";
  return `${meta.reward}${proNote}`;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
