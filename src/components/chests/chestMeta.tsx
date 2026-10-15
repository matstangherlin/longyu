import type { ChestType, ChestRewardKind } from "../../lib/store";
import { IconFlame, IconRefresh, IconShield, IconStar, IconTarget, IconTrophy } from "../ui/Icon";
import { t } from "../../i18n/catalog";

// Identidade Longyu para cada baú: um hànzì central (tesouro / dragão / jade),
// um selo e as cores do tema. Nada de estética de cassino — pergaminho e jade.
export interface ChestVisual {
  name: string;
  rarity: string;
  glyph: string; // hànzì central
  seal: string; // selo pequeno
  tagline: string;
  contains: string; // o que pode vir (probabilidade "simples", sem porcentagens)
  accent: string; // cor de destaque (var CSS ou hex)
}

export const CHEST_VISUALS: Record<ChestType, ChestVisual> = {
  small: {
    name: "Baú Pequeno",
    rarity: "Comum",
    glyph: "宝",
    seal: "印",
    tagline: "Uma pequena surpresa do dragão.",
    contains: "Qi, XP, uma carga, um escudo ou Recuperar Vidas.",
    accent: "rgb(var(--accent))",
  },
  dragon: {
    name: "Baú do Dragão",
    rarity: "Raro",
    glyph: "龙",
    seal: "印",
    tagline: "A generosidade do dragão, em jade.",
    contains: "Bastante Qi, XP, escudo, cargas, Recuperar Vidas ou uma Pérola de Jade. No Pro: chance de pass de revisão profunda.",
    accent: "#B7791F",
  },
  monthly: {
    name: "Baú Mensal",
    rarity: "Épico",
    glyph: "玉",
    seal: "月",
    tagline: "A recompensa por completar o mês.",
    contains: "Qi alto, escudo e chance de Pérola de Jade.",
    accent: "#2F855A",
  },
  legendary: {
    name: "Baú Lendário",
    rarity: "Lendário",
    // RC2.3.13R.3.2.5 — 珍 (tesouro raro): o Lendário deixa de repetir o 玉 do Mensal.
    glyph: "珍",
    seal: "宝",
    tagline: "Um feito raro merece um tesouro raro.",
    contains: "Qi alto, Pérola de Jade, Escudo e chance de uma segunda Pérola.",
    accent: "#E8C75D",
  },
};

const CHEST_COPY_KEYS: Record<ChestType, { name: string; rarity: string; tagline: string; contains: string }> = {
  small: {
    name: "player.chestSmallName",
    rarity: "player.chestSmallRarity",
    tagline: "player.chestSmallTagline",
    contains: "player.chestSmallContains",
  },
  dragon: {
    name: "player.chestDragonName",
    rarity: "player.chestDragonRarity",
    tagline: "player.chestDragonTagline",
    contains: "player.chestDragonContains",
  },
  monthly: {
    name: "player.chestMonthlyName",
    rarity: "player.chestMonthlyRarity",
    tagline: "player.chestMonthlyTagline",
    contains: "player.chestMonthlyContains",
  },
  legendary: {
    name: "player.chestLegendaryName",
    rarity: "player.chestLegendaryRarity",
    tagline: "player.chestLegendaryTagline",
    contains: "player.chestLegendaryContains",
  },
};

export function localizedChestVisual(type: ChestType): ChestVisual {
  const base = CHEST_VISUALS[type];
  const keys = CHEST_COPY_KEYS[type];
  return {
    ...base,
    name: t(keys.name),
    rarity: t(keys.rarity),
    tagline: t(keys.tagline),
    contains: t(keys.contains),
  };
}

export function chestRewardCaption(kind: ChestRewardKind): string {
  const captions: Record<ChestRewardKind, string> = {
    qi: t("player.chestRewardQi"),
    xp: t("player.chestRewardXp"),
    charge: t("player.chestRewardCharge"),
    shield: t("player.chestRewardShield"),
    pearl: t("player.chestRewardPearl"),
    breath: t("player.chestRewardBreath"),
    focus_pass: t("player.chestRewardFocusPass"),
  };
  return captions[kind];
}

// RC2.3.13R.3.2.5 — the label the learner reads comes from the catalog, not
// from the store's PT-only `label` (an EN learner saw "Escudo de Sequência").
export function chestRewardName(kind: ChestRewardKind, amount = 1): string {
  const names: Record<ChestRewardKind, string> = {
    qi: t("player.chestRewardNameQi"),
    xp: t("player.chestRewardNameXp"),
    charge: amount > 1 ? t("player.chestRewardNameCharges") : t("player.chestRewardNameCharge"),
    shield: t("player.chestRewardNameShield"),
    pearl: t("player.chestRewardNamePearl"),
    breath: t("player.chestRewardNameBreath"),
    focus_pass: t("player.chestRewardNameFocusPass"),
  };
  return names[kind];
}

// One icon per reward, matching the chrome: Qi is the TopBar star, a charge is
// the TopBar energy shield, a streak shield wears the streak flame. No two
// rewards share a glyph (charge/shield and xp/focus_pass used to).
export const CHEST_REWARD_ICON: Record<Exclude<ChestRewardKind, "pearl">, typeof IconStar> = {
  qi: IconStar,
  xp: IconTrophy,
  charge: IconShield,
  shield: IconFlame,
  breath: IconRefresh,
  focus_pass: IconTarget,
};

export function ChestRewardIcon({ kind }: { kind: ChestRewardKind }) {
  if (kind === "pearl") return <span aria-hidden className="text-lg leading-none text-good">珠</span>;
  const Icon = CHEST_REWARD_ICON[kind];
  return <Icon width={20} height={20} aria-hidden />;
}
