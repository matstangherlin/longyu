// Definições de missões (diárias, semanais) e da missão mensal + medalhas.
// Este módulo é puro (sem React/store): guarda apenas metadados e helpers de
// cálculo. O progresso vem do estado do app e é composto em runtime pela store
// e pela página /missoes. Ícones são referenciados por chave e mapeados para
// componentes na camada de UI, para manter os dados desacoplados.

import { monthKey } from "../lib/storage";

export type MissionScope = "daily" | "weekly" | "monthly";

// Chaves de métrica: casam 1:1 com o objeto de agregados (metricValue faz agg[metric]).
export type MissionMetric =
  | "xpToday"
  | "minutesToday"
  | "reviewsToday"
  | "audioToday"
  | "phrasesToday"
  | "hanziToday"
  | "errorsToday"
  | "threeStarToday"
  | "immersionToday"
  | "tonesToday"
  | "weeklyXp"
  | "weeklyLessons"
  | "weeklyReviewDays"
  | "weeklyMicrotexts"
  | "weeklyImmersion";

export type MissionIconKey =
  | "xp"
  | "minutes"
  | "reviews"
  | "audio"
  | "hanzi"
  | "immersion"
  | "lessons"
  | "microtexts"
  | "star"
  | "fix"
  | "medal";

export interface MissionReward {
  xp?: number;
  qi?: number;
  charges?: number;
}

export interface MissionDef {
  id: string;
  scope: Exclude<MissionScope, "monthly">;
  title: string;
  desc: string;
  iconKey: MissionIconKey;
  metric: MissionMetric;
  goal: number;
  to: string;
  reward: MissionReward;
  /**
   * Missão premium: recompensa maior, resgatável só no Pro. O progresso é
   * visível para todos (a meta continua sendo aprendizado real), mas o resgate
   * exige a assinatura — as missões grátis continuam pagando Qi suficiente.
   */
  pro?: boolean;
}

// Missões do dia (resetam todo dia). Todas derivam de contadores já existentes,
// então não precisam de rastreio novo específico.
export const DAILY_MISSION_DEFS: MissionDef[] = [
  {
    id: "daily-xp",
    scope: "daily",
    title: "Faça uma rodada produtiva",
    desc: "Complete uma lição, revisão ou treino focado que gere pelo menos 10 XP.",
    iconKey: "xp",
    metric: "xpToday",
    goal: 10,
    to: "/treino",
    reward: { xp: 5, qi: 5 },
  },
  {
    id: "daily-minutes",
    scope: "daily",
    title: "Estude por 5 minutos",
    desc: "Pratique 5 minutos somando as quatro competências.",
    iconKey: "minutes",
    metric: "minutesToday",
    goal: 5,
    to: "/treino",
    reward: { xp: 5, qi: 5 },
  },
  {
    id: "daily-reviews",
    scope: "daily",
    title: "Revise 10 itens úteis",
    desc: "Traga de volta frases, tons ou hànzì antes que enfraqueçam.",
    iconKey: "reviews",
    metric: "reviewsToday",
    goal: 10,
    to: "/revisao",
    reward: { xp: 8, qi: 6, charges: 2 },
  },
  {
    id: "daily-audio",
    scope: "daily",
    title: "Acerte o ouvido hoje",
    desc: "Ouça 8 áudios ou microtarefas de som/tom em mandarim.",
    iconKey: "audio",
    metric: "audioToday",
    goal: 8,
    to: "/som",
    reward: { xp: 6, qi: 5 },
  },
  {
    id: "daily-phrases",
    scope: "daily",
    title: "Use 3 frases aprendidas",
    desc: "Pratique frases da jornada em fala, imersão ou treino livre.",
    iconKey: "lessons",
    metric: "phrasesToday",
    goal: 3,
    to: "/fala",
    reward: { xp: 8, qi: 6 },
  },
  {
    id: "daily-hanzi",
    scope: "daily",
    title: "Monte 3 hànzì",
    desc: "Reforce caracteres do módulo atual com decomposição ou HanziBuilder.",
    iconKey: "hanzi",
    metric: "hanziToday",
    goal: 3,
    to: "/ideogramas",
    reward: { xp: 8, qi: 6 },
  },
  {
    id: "daily-fix-errors",
    scope: "daily",
    title: "Corrija 3 erros travando a jornada",
    desc: "Acerte itens que entraram na revisão por erro recente.",
    iconKey: "fix",
    metric: "errorsToday",
    goal: 3,
    to: "/revisao",
    reward: { xp: 6, qi: 6 },
  },
  {
    id: "daily-three-star",
    scope: "daily",
    title: "Gabarite 1 lição",
    desc: "Conclua uma lição com 3 estrelas.",
    iconKey: "star",
    metric: "threeStarToday",
    goal: 1,
    to: "/",
    reward: { xp: 8, qi: 8 },
  },
  {
    id: "daily-immersion",
    scope: "daily",
    title: "Complete 1 sessão de Imersão",
    desc: "Finalize uma história ou sessão de imersão guiada.",
    iconKey: "immersion",
    metric: "immersionToday",
    goal: 1,
    to: "/imersao",
    reward: { xp: 10, qi: 8 },
  },
  {
    id: "daily-tones",
    scope: "daily",
    title: "Acerte 8 tons",
    desc: "Treine o ouvido acertando tons em lições ou no Pinyin Lab.",
    iconKey: "audio",
    metric: "tonesToday",
    goal: 8,
    to: "/pinyin",
    reward: { xp: 8, qi: 6 },
  },
  // Missões premium do dia: metas mais pesadas de correção e revisão,
  // pagando mais Qi. O aprendizado grátis não depende delas.
  {
    id: "daily-pro-fix",
    scope: "daily",
    title: "Correção intensiva: 6 erros",
    desc: "Zere 6 erros pendentes na revisão corretiva de hoje.",
    iconKey: "fix",
    metric: "errorsToday",
    goal: 6,
    to: "/revisao?modo=erros",
    reward: { xp: 15, qi: 18 },
    pro: true,
  },
  {
    id: "daily-pro-immersion",
    scope: "daily",
    title: "Imersão dupla",
    desc: "Complete 2 sessões de imersão no mesmo dia.",
    iconKey: "immersion",
    metric: "immersionToday",
    goal: 2,
    to: "/imersao",
    reward: { xp: 14, qi: 16 },
    pro: true,
  },
];

// Missões da semana (resetam toda semana ISO).
export const WEEKLY_MISSION_DEFS: MissionDef[] = [
  {
    id: "weekly-lessons",
    scope: "weekly",
    title: "Complete 5 lições",
    desc: "Avance 5 lições na jornada durante a semana.",
    iconKey: "lessons",
    metric: "weeklyLessons",
    goal: 5,
    to: "/",
    reward: { xp: 40, qi: 20 },
  },
  {
    id: "weekly-review-days",
    scope: "weekly",
    title: "Revise em 4 dias diferentes",
    desc: "Mantenha a constância revisando em 4 dias da semana.",
    iconKey: "reviews",
    metric: "weeklyReviewDays",
    goal: 4,
    to: "/revisao",
    reward: { xp: 40, qi: 20, charges: 2 },
  },
  {
    id: "weekly-xp",
    scope: "weekly",
    title: "Ganhe 250 XP",
    desc: "Acumule 250 XP de estudo nesta semana.",
    iconKey: "xp",
    metric: "weeklyXp",
    goal: 250,
    to: "/treino",
    reward: { xp: 30, qi: 25 },
  },
  {
    id: "weekly-microtexts",
    scope: "weekly",
    title: "Leia 3 microtextos",
    desc: "Leia 3 microtextos guiados na semana.",
    iconKey: "microtexts",
    metric: "weeklyMicrotexts",
    goal: 3,
    to: "/leitura",
    reward: { xp: 35, qi: 18 },
  },
  {
    id: "weekly-immersion",
    scope: "weekly",
    title: "Complete 3 sessões de Imersão",
    desc: "Finalize 3 histórias ou sessões de imersão durante a semana.",
    iconKey: "immersion",
    metric: "weeklyImmersion",
    goal: 3,
    to: "/imersao",
    reward: { xp: 45, qi: 22 },
  },
  {
    id: "weekly-pro-xp",
    scope: "weekly",
    title: "Semana intensa: 400 XP",
    desc: "Estude forte a semana toda com lições, revisão e treino focado.",
    iconKey: "xp",
    metric: "weeklyXp",
    goal: 400,
    to: "/treino",
    reward: { xp: 60, qi: 45 },
    pro: true,
  },
  {
    id: "weekly-pro-immersion",
    scope: "weekly",
    title: "Maratona de imersão: 5 sessões",
    desc: "Mantenha o mandarim no ouvido com 5 sessões na semana.",
    iconKey: "immersion",
    metric: "weeklyImmersion",
    goal: 5,
    to: "/imersao",
    reward: { xp: 55, qi: 40 },
    pro: true,
  },
];

// Missão mensal: completar 30 missões diárias garante a medalha do mês.
export const MONTHLY_GOAL = 30;
export const MONTHLY_MEDAL_REWARD = { qi: 100, shield: 1 } as const;

export interface MissionAggregates {
  xpToday: number;
  minutesToday: number;
  reviewsToday: number;
  audioToday: number;
  phrasesToday: number;
  hanziToday: number;
  errorsToday: number;
  threeStarToday: number;
  immersionToday: number;
  tonesToday: number;
  weeklyXp: number;
  weeklyLessons: number;
  weeklyReviewDays: number;
  weeklyMicrotexts: number;
  weeklyImmersion: number;
}

export function metricValue(metric: MissionMetric, agg: MissionAggregates): number {
  return agg[metric];
}

export function missionDefsFor(scope: Exclude<MissionScope, "monthly">): MissionDef[] {
  return scope === "daily" ? DAILY_MISSION_DEFS : WEEKLY_MISSION_DEFS;
}

export function findMissionDef(
  scope: Exclude<MissionScope, "monthly">,
  missionId: string
): MissionDef | undefined {
  return missionDefsFor(scope).find((def) => def.id === missionId);
}

export interface MissionView extends MissionDef {
  raw: number;
  progress: number;
  complete: boolean;
  claimed: boolean;
}

/**
 * A missão pode ser resgatada/perseguida por este usuário? Missão premium só é
 * "acionável" no Pro. Usada por badges, foco e destaques para não empurrar o
 * grátis para uma missão que só levaria ao paywall (o resgate ainda é possível
 * na tela de Missões, com o CTA "Resgatar com Pro").
 */
export function isMissionActionable(mission: Pick<MissionDef, "pro">, isPro: boolean): boolean {
  return !mission.pro || isPro;
}

export function buildMissionViews(
  scope: Exclude<MissionScope, "monthly">,
  agg: MissionAggregates,
  claimed: Record<string, boolean>
): MissionView[] {
  return missionDefsFor(scope).map((def) => {
    const raw = metricValue(def.metric, agg);
    return {
      ...def,
      raw,
      progress: Math.min(raw, def.goal),
      complete: raw >= def.goal,
      claimed: Boolean(claimed[def.id]),
    };
  });
}

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

// Emoji temático por mês — a medalha ganha uma cara diferente ao longo do ano.
const MONTH_MEDAL_EMOJI = [
  "❄️",
  "💛",
  "🌸",
  "🌱",
  "🌼",
  "☀️",
  "🐉",
  "🌾",
  "🍂",
  "🎋",
  "🏮",
  "🎇",
];

function monthIndex(key: string): number {
  return Math.min(11, Math.max(0, Number(key.split("-")[1] ?? "1") - 1));
}

export function monthLabel(key = monthKey()): string {
  return MONTH_NAMES[monthIndex(key)] ?? "";
}

export function medalEmoji(key = monthKey()): string {
  return MONTH_MEDAL_EMOJI[monthIndex(key)] ?? "🏅";
}

export function monthlyMedalLabel(key = monthKey()): string {
  return `Medalha de ${monthLabel(key)}`;
}
