import type { ChestType, ChestRewardKind } from "../../lib/store";
import { IconFlame, IconShield, IconStar, IconTarget } from "../ui/Icon";
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
    contains: "Qi, XP, uma carga ou uma tentativa extra.",
    accent: "rgb(var(--accent))",
  },
  dragon: {
    name: "Baú do Dragão",
    rarity: "Raro",
    glyph: "龙",
    seal: "印",
    tagline: "A generosidade do dragão, em jade.",
    contains: "Bastante Qi, XP, escudo, cargas ou uma Pérola de Jade. No Pro: chance de pass de revisão profunda.",
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
    glyph: "玉",
    seal: "珍",
    tagline: "Um feito raro merece um tesouro raro.",
    contains: "Qi alto, Pérola de Jade, Escudo, XP bônus e recompensa rara.",
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

export function ChestRewardIcon({ kind }: { kind: ChestRewardKind }) {
  if (kind === "pearl") return <span aria-hidden className="text-lg leading-none text-good">珠</span>;
  if (kind === "focus_pass") return <IconTarget width={20} height={20} />;
  if (kind === "breath") return <IconFlame width={20} height={20} />;
  if (kind === "charge" || kind === "shield") return <IconShield width={20} height={20} />;
  if (kind === "xp") return <IconTarget width={20} height={20} />;
  return <IconStar width={20} height={20} />;
}
