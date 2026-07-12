import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ItemType } from "../data/types";
import type { DomainTrack } from "../data/domains";
import { ALL_LESSONS, FOUNDATION_LESSON_IDS } from "../data/journey";
import type { HanziBuilderCharProgress, HanziBuilderProgressMap } from "../data/hanziBuilder";
import { type SRSItem, type Grade, type ReviewDomain, makeKey, newItem, review } from "./srs";
import { todayKey, daysBetween, weekKey, monthKey } from "./storage";
import {
  type MissionScope,
  type MissionAggregates,
  findMissionDef,
  metricValue,
  MONTHLY_GOAL,
  MONTHLY_MEDAL_REWARD,
  monthlyMedalLabel,
  medalEmoji,
} from "../data/missions";
import { type ShopCurrency, type ShopItem, findShopItem } from "../data/shop";
import {
  type LeagueBot,
  type LeagueHistoryEntry,
  type LeagueTier,
  buildLeagueStandings,
  generateLeagueBots,
  joinedLeagueThisWeek,
  leagueOutcomeForRank,
  leagueWeekFromTimestamp,
  nextLeagueTier,
  normalizeLeagueTier,
} from "./leagues";
import { syncLeagueXpToServerAsync } from "./leagueXpSync";
import {
  leagueXpKeyImmersion,
  leagueXpKeyMission,
  leagueXpKeyReward,
} from "./leagueXpKeys";

import {
  CHARGE_COST_ACTIVITY,
  DAILY_CHARGES_FREE,
  FOCUS_PASS_HOURS,
  PRO_CHEST_FOCUS_PASS_CHANCE,
  PRO_CHEST_QI_MULTIPLIER,
  PRO_CHEST_RARE_BONUS,
  LESSON_NO_SKIP_QI,
  LESSON_THREE_STAR_QI,
  PRO_LESSON_QI_BONUS,
  PRO_MISSION_QI_MULTIPLIER,
  QI_PACK_AMOUNT,
  STORY_ENERGY_DAILY_CAP,
} from "../data/economy";
import { MANDARIN_TONES, type MandarinTone, type ToneTrainerAttemptInput, type ToneTrainerProgress } from "../data/toneTrainer";
import type { ProgressSnapshotBody } from "./progressSnapshot";
import {
  shouldUseServerEconomy,
  serverClaimMission,
  serverConsumeCharge,
  serverGrantLessonReward,
  serverGrantStoryEnergy,
  serverOpenChest,
  serverSpendQi,
} from "./economyServerBridge";
import { effectivePremium, isDevPreviewAllowed, isInternalTestProEmail } from "./entitlements";
import type { ModuleSkipUsageWeek } from "./moduleSkipAccess";

export type ThemeName = "clay" | "china" | "dark";
export type SoundTheme = "longyu_classic" | "longyu_soft" | "longyu_game";
export type Track = DomainTrack;
export type MandarinDisplayMode = "pinyin_hanzi" | "hanzi_pinyin" | "hanzi_only" | "pinyin_only";
export type TranslationMode = "always" | "tap" | "hidden";

export const DAILY_GOAL_PER_TRACK = 5; // min por trilha (20 min total)
export const DEFAULT_ACCOUNT_ID = "local";
export const FREE_DAILY_CHARGES = DAILY_CHARGES_FREE;
export const MISSION_CHARGE_REWARD = 2;
export { STORY_ENERGY_DAILY_CAP };

export type PlacementLevel = "inicio" | "sobrevivencia" | "tons" | "frases" | "hanzi";

export interface PlacementResult {
  level: PlacementLevel;
  label: string;
  score: number;
  targetLessonId: string;
  skippedLessonIds?: string[];
  foundationLessonIdsRequired?: string[];
  questionsAnswered?: number;
  correctWithoutHint?: number;
  correctWithHint?: number;
  wrong?: number;
  hintsUsed?: number;
  categoriesCorrect?: string[];
  categoriesWeak?: string[];
  takenAt: number;
}

interface DailyProgress {
  date: string;
  som: number;
  fala: number;
  hanzi: number;
  leitura: number;
}

export type DailyTaskKey =
  | "audioHeard"
  | "phrasesSpoken"
  | "reviewsDone"
  | "hanziDecomposed"
  | "microtextsRead"
  | "errorsCorrected"
  | "threeStarLessons"
  | "tonesTrained";

export interface DailyTasks {
  date: string;
  audioHeard: number;
  phrasesSpoken: number;
  reviewsDone: number;
  hanziDecomposed: number;
  microtextsRead: number;
  /** Erros logados que o aluno corrigiu hoje (lição ou revisão). */
  errorsCorrected: number;
  /** Lições concluídas com 3 estrelas hoje. */
  threeStarLessons: number;
  /** Tons acertados hoje (lições, Pinyin Lab, Tone Trainer). */
  tonesTrained: number;
  claimedMissions: Record<string, boolean>;
}

/** Contadores vitalícios (nunca zeram) — alimentam as medalhas/conquistas. */
export interface LifetimeStats {
  audioHeard: number;
  phrasesSpoken: number;
  reviewsDone: number;
  hanziDecomposed: number;
  microtextsRead: number;
  /** Dias (YYYY-MM-DD) em que houve pelo menos uma revisão. */
  reviewDays: string[];
}

export function freshLifetimeStats(): LifetimeStats {
  return {
    audioHeard: 0,
    phrasesSpoken: 0,
    reviewsDone: 0,
    hanziDecomposed: 0,
    microtextsRead: 0,
    reviewDays: [],
  };
}

/** Chaves diárias que também têm espelho vitalício (numérico) em LifetimeStats. */
function isLifetimeTaskKey(task: DailyTaskKey): task is "audioHeard" | "phrasesSpoken" | "reviewsDone" | "hanziDecomposed" | "microtextsRead" {
  return (
    task === "audioHeard" ||
    task === "phrasesSpoken" ||
    task === "reviewsDone" ||
    task === "hanziDecomposed" ||
    task === "microtextsRead"
  );
}

/** Recompensa de uma medalha: Qi e/ou um baú. */
export interface AchievementReward {
  qi?: number;
  chest?: ChestType;
}

export interface AchievementHistoryEntry {
  id: string;
  unlockedAt: number;
  reward?: AchievementReward;
}

export interface DailyEnergy {
  date: string;
  charges: number;
  maxCharges: number;
  usedCharges: number;
  bonusChargesClaimed: Record<string, boolean>;
}

export interface ImmersionDailyProgress {
  date: string;
  completedSessionIds: string[];
}

export interface ImmersionCompletion {
  audioHeard: number;
  phrasesSpoken?: number;
  microtextsRead?: number;
  somMinutes?: number;
  falaMinutes?: number;
  leituraMinutes?: number;
  rewardXp: number;
  rewardQi: number;
  source: string;
  /** História premium concluída pela primeira vez na sessão. */
  isPremiumStory?: boolean;
}

/** Resultado de tentar dar a carga extra de energia por concluir uma história. */
export interface StoryEnergyResult {
  granted: boolean;
  reason: "granted" | "pro" | "limit" | "claimed";
  grantedToday: number;
  cap: number;
}

/** Status diário de energia ganha por histórias (para a tela de Imersão). */
export interface StoryEnergyStatus {
  grantedToday: number;
  remaining: number;
  cap: number;
  isPro: boolean;
}

export type RewardType = "qi" | "dragonPearl" | "streakShield" | "badge" | "xp" | "charge";

export interface RewardGrant {
  id: string;
  type: RewardType;
  amount: number;
  source: string;
}

export interface RewardHistoryEntry extends RewardGrant {
  claimedAt: number;
}

export type EnergyActivityType =
  | "lesson"
  | "module_challenge"
  | "immersion_session"
  | "extra_training"
  | "premium_preview"
  | "essential_review"
  | "library"
  | "atlas"
  | "settings"
  | "account"
  | "progress";

function freshDay(date = todayKey()): DailyProgress {
  return { date, som: 0, fala: 0, hanzi: 0, leitura: 0 };
}

function freshDailyTasks(date = todayKey()): DailyTasks {
  return {
    date,
    audioHeard: 0,
    phrasesSpoken: 0,
    reviewsDone: 0,
    hanziDecomposed: 0,
    microtextsRead: 0,
    errorsCorrected: 0,
    threeStarLessons: 0,
    tonesTrained: 0,
    claimedMissions: {},
  };
}

function freshDailyEnergy(date = todayKey()): DailyEnergy {
  return {
    date,
    charges: FREE_DAILY_CHARGES,
    maxCharges: FREE_DAILY_CHARGES,
    usedCharges: 0,
    bonusChargesClaimed: {},
  };
}

function freshImmersionDaily(date = todayKey()): ImmersionDailyProgress {
  return { date, completedSessionIds: [] };
}

/**
 * XP = progresso de estudo. Nunca é gasto (diferente do Qi). O total é
 * cumulativo; os recortes de hoje/semana/mês zeram sozinhos quando a chave
 * de data correspondente vira. Usado em ligas, ranking, missões e estatísticas.
 */
export interface XpBuckets {
  xpTotal: number;
  xpToday: number;
  weeklyXp: number;
  monthlyXp: number;
  xpDayKey: string;
  xpWeekKey: string;
  xpMonthKey: string;
}

function freshXp(now = new Date()): XpBuckets {
  return {
    xpTotal: 0,
    xpToday: 0,
    weeklyXp: 0,
    monthlyXp: 0,
    xpDayKey: todayKey(now),
    xpWeekKey: weekKey(now),
    xpMonthKey: monthKey(now),
  };
}

// ————————————————————————————————————————————————————————————————
// Missões: estado persistido (progresso + resgates). As definições ficam em
// data/missions.ts; aqui guardamos só o que muda com o uso e reseta por período.
// ————————————————————————————————————————————————————————————————

export interface Medal {
  id: string; // = monthKey ("YYYY-MM")
  monthKey: string;
  label: string;
  emoji: string;
  earnedAt: number;
}

export interface MissionHistoryEntry {
  id: string; // `${scope}:${missionId}:${periodKey}`
  scope: MissionScope;
  missionId: string;
  title: string;
  xp: number;
  qi: number;
  charges: number;
  claimedAt: number;
}

export interface DailyMissionsState {
  date: string;
  claimed: Record<string, boolean>;
}

export interface WeeklyMissionsState {
  weekKey: string;
  claimed: Record<string, boolean>;
  lessons: number;
  immersion: number;
  microtexts: number;
  reviewDays: string[];
  /** Histórias premium concluídas na semana (primeira vez). */
  premiumStories: number;
}

export interface MonthlyMissionState {
  monthKey: string;
  completed: number; // missões diárias resgatadas no mês
  claimed: boolean; // medalha do mês já resgatada
}

function freshDailyMissions(date = todayKey()): DailyMissionsState {
  return { date, claimed: {} };
}

function activeDailyMissions(s: DailyMissionsState | undefined, date = todayKey()): DailyMissionsState {
  if (s?.date !== date) return freshDailyMissions(date);
  return { date, claimed: s.claimed ?? {} };
}

function freshWeeklyMissions(key = weekKey()): WeeklyMissionsState {
  return { weekKey: key, claimed: {}, lessons: 0, immersion: 0, microtexts: 0, reviewDays: [], premiumStories: 0 };
}

function activeWeeklyMissions(s: WeeklyMissionsState | undefined, key = weekKey()): WeeklyMissionsState {
  if (s?.weekKey !== key) return freshWeeklyMissions(key);
  return {
    weekKey: key,
    claimed: s.claimed ?? {},
    lessons: Math.max(0, s.lessons ?? 0),
    immersion: Math.max(0, s.immersion ?? 0),
    microtexts: Math.max(0, s.microtexts ?? 0),
    reviewDays: s.reviewDays ?? [],
    premiumStories: Math.max(0, s.premiumStories ?? 0),
  };
}

function freshMonthlyMission(key = monthKey()): MonthlyMissionState {
  return { monthKey: key, completed: 0, claimed: false };
}

function activeMonthlyMission(s: MonthlyMissionState | undefined, key = monthKey()): MonthlyMissionState {
  if (s?.monthKey !== key) return freshMonthlyMission(key);
  return { monthKey: key, completed: Math.max(0, s.completed ?? 0), claimed: s.claimed ?? false };
}

// Agregados que alimentam o progresso das missões, derivados do estado atual.
function missionAggregates(s: AppState): MissionAggregates {
  const date = todayKey();
  const xp = activeXp(s);
  const week = activeWeeklyMissions(s.weeklyMissions);
  const today = s.today.date === date ? s.today : freshDay(date);
  const tasks = activeDailyTasks(s.dailyTasks, date);
  const immersion = activeImmersionDaily(s.immersionDaily, date);
  return {
    xpToday: xp.xpToday,
    minutesToday: today.som + today.fala + today.hanzi + today.leitura,
    reviewsToday: tasks.reviewsDone,
    audioToday: Math.max(tasks.audioHeard, today.som * 2),
    phrasesToday: tasks.phrasesSpoken,
    hanziToday: tasks.hanziDecomposed,
    errorsToday: tasks.errorsCorrected,
    threeStarToday: tasks.threeStarLessons,
    immersionToday: immersion.completedSessionIds.length,
    tonesToday: tasks.tonesTrained,
    weeklyXp: xp.weeklyXp,
    weeklyLessons: week.lessons,
    weeklyReviewDays: week.reviewDays.length,
    weeklyMicrotexts: week.microtexts,
    weeklyImmersion: week.immersion,
    weeklyPremiumStories: week.premiumStories,
    currentStreak: s.streak,
  };
}

// ————————————————————————————————————————————————————————————————
// Loja: inventário (consumíveis), cosméticos comprados e histórico de compras.
// ————————————————————————————————————————————————————————————————

export interface PurchaseEntry {
  id: string; // `${itemId}:${timestamp}`
  itemId: string;
  name: string;
  currency: ShopCurrency;
  cost: number;
  purchasedAt: number;
}

export interface ChestOpenHistoryEntry {
  id: string;
  type: ChestType;
  openedAt: number;
}

export interface EconomySummary {
  xpToday: number;
  xpWeek: number;
  qiEarnedToday: number;
  qiSpentToday: number;
  chargesUsed: number;
  chestsOpened: number;
  missionsClaimed: number;
}

function qiSpendName(source: string): string {
  if (source === "mistake_retry") return "Refazer sem perder perfeição";
  if (source === "challenge_retry") return "Refazer desafio";
  if (source === "breath_recovery") return "Recuperar Fôlego";
  return source.replaceAll("_", " ");
}

/** Resultado de usar um item do inventário (efeito aplicado + texto p/ UI). */
export interface ShopUseResult {
  itemId: string;
  message: string;
}

// ————————————————————————————————————————————————————————————————
// Baús do Longyu: recompensas aleatórias ganhas por estudo, missões ou compra.
// Sem cassino e sem dinheiro real — só recursos do próprio jogo. Nunca dá
// progresso "direto" (lição/estrela).
// ————————————————————————————————————————————————————————————————

export type ChestType = "small" | "dragon" | "monthly" | "legendary";
export type ChestRewardKind = "qi" | "xp" | "charge" | "shield" | "pearl" | "breath" | "focus_pass";

export interface ChestRewardItem {
  kind: ChestRewardKind;
  amount: number;
  label: string;
}

export interface ChestInventory {
  small: number;
  dragon: number;
  monthly: number;
  legendary: number;
}

function freshChests(): ChestInventory {
  return { small: 0, dragon: 0, monthly: 0, legendary: 0 };
}

function randBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Sorteio das recompensas de um baú (sem aplicar nada). Baús pequeno/dragão dão
// um prêmio; o mensal entrega um pacote (Qi alto + escudo + chance de Pérola).
// Grátis: Qi, carga extra, escudo e tentativa extra (Fôlego). Pro: Qi ampliado,
// maior chance de raro e recompensas de missão com bônus — nunca progresso direto.
function generateChestRewards(type: ChestType, pro = false): ChestRewardItem[] {
  const boostQi = (amount: number) => (pro ? Math.round(amount * PRO_CHEST_QI_MULTIPLIER) : amount);
  const rareBonus = pro ? PRO_CHEST_RARE_BONUS : 0;
  const pick = Math.random();
  if (type === "small") {
    if (pick < 0.45 + rareBonus * 0.3) return [{ kind: "qi", amount: boostQi(randBetween(20, 50)), label: "Qi" }];
    if (pick < 0.8) return [{ kind: "xp", amount: randBetween(5, 15), label: "XP" }];
    if (pick < 0.92 + rareBonus) return [{ kind: "charge", amount: 1, label: "Carga do Dragão" }];
    if (pick < 0.97 + rareBonus * 0.5) return [{ kind: "shield", amount: 1, label: "Escudo de Sequência" }];
    return [{ kind: "breath", amount: 1, label: "Tentativa extra (Fôlego)" }];
  }
  if (type === "dragon") {
    if (pick < 0.35 + rareBonus * 0.2) return [{ kind: "qi", amount: boostQi(randBetween(80, 150)), label: "Qi" }];
    if (pick < 0.55) return [{ kind: "xp", amount: randBetween(25, 50), label: "XP" }];
    if (pick < 0.72 + rareBonus) return [{ kind: "shield", amount: 1, label: "Escudo de Sequência" }];
    if (pick < 0.86) return [{ kind: "charge", amount: pro ? 3 : 2, label: "Cargas do Dragão" }];
    if (pick < 0.93) return [{ kind: "breath", amount: 1, label: "Tentativa extra (Fôlego)" }];
    if (pro && Math.random() < PRO_CHEST_FOCUS_PASS_CHANCE) {
      return [{ kind: "focus_pass", amount: 1, label: "Pass de revisão profunda" }];
    }
    return [{ kind: "pearl", amount: 1, label: "Pérola de Jade" }];
  }
  if (type === "monthly") {
    // monthly (épico) — pacote garantido + chance de Pérola.
    const rewards: ChestRewardItem[] = [
      { kind: "qi", amount: boostQi(randBetween(200, 300)), label: "Qi" },
      { kind: "shield", amount: 1, label: "Escudo de Sequência" },
    ];
    if (Math.random() < 0.5) rewards.push({ kind: "pearl", amount: 1, label: "Pérola de Jade" });
    return rewards;
  }
  // legendary — o pacote máximo, ganho por feitos raros (nunca vendido):
  // Qi alto + Pérola garantida + escudo, com chance de segunda Pérola.
  const rewards: ChestRewardItem[] = [
    { kind: "qi", amount: boostQi(randBetween(350, 500)), label: "Qi" },
    { kind: "pearl", amount: 1, label: "Pérola de Jade" },
    { kind: "shield", amount: 1, label: "Escudo de Sequência" },
  ];
  if (Math.random() < 0.35) rewards.push({ kind: "pearl", amount: 1, label: "Pérola de Jade extra" });
  return rewards;
}

const CHEST_SOURCE: Record<ChestType, string> = {
  small: "Baú Comum",
  dragon: "Baú Raro",
  monthly: "Baú Épico",
  legendary: "Baú Lendário",
};

// Mapeia o tipo de prêmio do baú para o tipo do rewardHistory.
// "breath" vai para o inventário (item de Fôlego), então é tratado à parte.
const CHEST_REWARD_TYPE: Record<Exclude<ChestRewardKind, "breath" | "focus_pass">, RewardType> = {
  qi: "qi",
  xp: "xp",
  charge: "charge",
  shield: "streakShield",
  pearl: "dragonPearl",
};

// Tentativa extra sorteada em baú vira o item "Recuperar Fôlego" no inventário.
function applyBreathRewardToState(s: AppState, amount: number): AppState {
  const inc = Math.max(0, Math.round(amount));
  if (inc <= 0) return s;
  return {
    ...s,
    inventory: { ...s.inventory, "shop-breath": (s.inventory["shop-breath"] ?? 0) + inc },
  };
}

function applyFocusPassRewardToState(s: AppState, amount: number): AppState {
  const inc = Math.max(0, Math.round(amount));
  if (inc <= 0) return s;
  return {
    ...s,
    inventory: { ...s.inventory, "shop-focus-pass": (s.inventory["shop-focus-pass"] ?? 0) + inc },
  };
}

// Pode comprar? Regras: item existe e é comprável (não é link Pro), cosmético
// ainda não possuído, e saldo suficiente na moeda do item.
function canPurchase(
  s: Pick<AppState, "points" | "dragonPearls" | "ownedCosmetics">,
  item: ShopItem
): boolean {
  if (item.kind === "pro_link") return false;
  if (item.cosmetic && (s.ownedCosmetics ?? []).includes(item.id)) return false;
  const balance = item.currency === "qi" ? s.points : s.dragonPearls;
  return balance >= item.cost;
}

// Normaliza os recortes de XP para as chaves de data atuais: se a chave de
// hoje/semana/mês mudou, aquele recorte volta a zero (o total é preservado).
function activeXp(xp: Partial<XpBuckets> | undefined, now = new Date()): XpBuckets {
  const dayKey = todayKey(now);
  const wKey = weekKey(now);
  const mKey = monthKey(now);
  return {
    xpTotal: Math.max(0, xp?.xpTotal ?? 0),
    xpToday: xp?.xpDayKey === dayKey ? Math.max(0, xp?.xpToday ?? 0) : 0,
    weeklyXp: xp?.xpWeekKey === wKey ? Math.max(0, xp?.weeklyXp ?? 0) : 0,
    monthlyXp: xp?.xpMonthKey === mKey ? Math.max(0, xp?.monthlyXp ?? 0) : 0,
    xpDayKey: dayKey,
    xpWeekKey: wKey,
    xpMonthKey: mKey,
  };
}

function activeImmersionDaily(
  progress: ImmersionDailyProgress | undefined,
  date = todayKey()
): ImmersionDailyProgress {
  if (progress?.date !== date) return freshImmersionDaily(date);
  return {
    date,
    completedSessionIds: progress.completedSessionIds ?? [],
  };
}

function activeDailyTasks(tasks: DailyTasks | undefined, date = todayKey()): DailyTasks {
  if (tasks?.date !== date) return freshDailyTasks(date);
  return {
    ...freshDailyTasks(date),
    ...tasks,
    claimedMissions: tasks.claimedMissions ?? {},
  };
}

function activeDailyEnergy(energy: DailyEnergy | undefined, date = todayKey()): DailyEnergy {
  if (energy?.date !== date) return freshDailyEnergy(date);
  const maxCharges = Math.max(FREE_DAILY_CHARGES, energy.maxCharges ?? FREE_DAILY_CHARGES);
  return {
    date,
    maxCharges,
    charges: Math.max(0, Math.min(maxCharges, energy.charges ?? maxCharges)),
    usedCharges: Math.max(0, energy.usedCharges ?? 0),
    bonusChargesClaimed: energy.bonusChargesClaimed ?? {},
  };
}

/** Bônus legítimo de histórias do dia (+1 max por história, até o cap diário). */
function legitimateStoryBonusCount(bonusClaims: Record<string, boolean>, date: string): number {
  const prefix = `story-energy:${date}:`;
  return Object.keys(bonusClaims).filter((key) => key.startsWith(prefix) && bonusClaims[key]).length;
}

/** Normaliza cargas ao sair do Pro: base grátis + bônus reais do dia. */
export function reconcileFreePlanEnergy(energy: DailyEnergy | undefined, date = todayKey()): DailyEnergy {
  const current = energy?.date === date ? energy : freshDailyEnergy(date);
  const bonusClaims = current.bonusChargesClaimed ?? {};
  const freeMax = FREE_DAILY_CHARGES + legitimateStoryBonusCount(bonusClaims, date);
  const maxCharges = Math.max(FREE_DAILY_CHARGES, freeMax);
  const charges = Math.min(maxCharges, Math.max(0, current.charges ?? maxCharges));
  return {
    date,
    maxCharges,
    charges,
    usedCharges: Math.max(0, current.usedCharges ?? 0),
    bonusChargesClaimed: bonusClaims,
  };
}

function isSameLocalDay(timestamp: number, date = todayKey()): boolean {
  return todayKey(new Date(timestamp)) === date;
}

function buildEconomySummary(s: AppState, date = todayKey()): EconomySummary {
  const xp = activeXp(s);
  const energy = activeDailyEnergy(s.dailyEnergy, date);
  const qiEarnedFromRewards = (s.rewardHistory ?? [])
    .filter((entry) => entry.type === "qi" && isSameLocalDay(entry.claimedAt, date))
    .reduce((sum, entry) => sum + Math.max(0, entry.amount), 0);
  const qiEarnedFromMissions = (s.missionHistory ?? [])
    .filter((entry) => isSameLocalDay(entry.claimedAt, date))
    .reduce((sum, entry) => sum + Math.max(0, entry.qi), 0);
  const qiSpentToday = (s.purchaseHistory ?? [])
    .filter((entry) => entry.currency === "qi" && isSameLocalDay(entry.purchasedAt, date))
    .reduce((sum, entry) => sum + Math.max(0, entry.cost), 0);

  return {
    xpToday: xp.xpToday,
    xpWeek: xp.weeklyXp,
    qiEarnedToday: qiEarnedFromRewards + qiEarnedFromMissions,
    qiSpentToday,
    chargesUsed: energy.usedCharges,
    chestsOpened: (s.chestOpenHistory ?? []).filter((entry) => isSameLocalDay(entry.openedAt, date)).length,
    missionsClaimed: (s.missionHistory ?? []).filter((entry) => isSameLocalDay(entry.claimedAt, date)).length,
  };
}

function activityConsumesCharge(activityType: EnergyActivityType): boolean {
  return (
    activityType === "lesson" ||
    activityType === "module_challenge" ||
    activityType === "immersion_session" ||
    activityType === "extra_training" ||
    activityType === "premium_preview"
  );
}

export interface ActivityReviewTarget {
  type: ItemType;
  itemId: string;
  domain: ReviewDomain;
  track: Track;
}

export type ActivityErrorSkill = ReviewDomain | "hanzi";

export interface ActivityErrorRecord {
  id: string;
  lessonId: string;
  moduleId: string;
  phaseId: string;
  taskId: string;
  questionId: string;
  exerciseId?: string;
  type: string;
  prompt: string;
  correctAnswer: string;
  selectedAnswer: string;
  topic?: string;
  tokens?: string[];
  hanzi?: string;
  pinyin?: string;
  meaningPt?: string;
  pairLeft?: string;
  pairExpectedRight?: string;
  pairSelectedRight?: string;
  pairLeftType?: string;
  pairRightType?: string;
  pairSelectedRightType?: string;
  explanation?: string;
  mistakeReason?: string;
  timestamp: number;
  wrongCount?: number;
  correctionAttempts?: number;
  correctedSuccessDates?: string[];
  lastReviewedAt?: number;
  skill: ActivityErrorSkill;
  targets: ActivityReviewTarget[];
  correctedAt?: number;
}

export type LessonStar = 0 | 1 | 2 | 3;
export type MistakeSourceSkill = "som" | "fala" | "hanzi" | "leitura" | "pinyin" | "grammar";

export interface LessonMistakeRecord {
  id: string;
  lessonId: string;
  questionId: string;
  exerciseType: string;
  prompt: string;
  expectedAnswer: string;
  userAnswer: string;
  explanation: string;
  sourceSkill: MistakeSourceSkill;
  createdAt: number;
  recoveredAt?: number;
}

export interface LessonAttemptRecord {
  id: string;
  lessonId: string;
  startedAt: number;
  finishedAt: number;
  totalQuestions: number;
  correctCount: number;
  mistakes: LessonMistakeRecord[];
  recoveredMistakes: LessonMistakeRecord[];
  finalStars: LessonStar;
}

function normalizeRecentActivityErrors(errors: ActivityErrorRecord[] | undefined): ActivityErrorRecord[] {
  return (errors ?? [])
    .filter((error) => Boolean(error.id && error.correctAnswer && error.targets?.length))
    .map((error) => ({
      ...error,
      exerciseId: error.exerciseId ?? error.questionId,
      topic: error.topic ?? error.skill,
      tokens: Array.from(new Set((error.tokens ?? []).filter(Boolean))).slice(0, 12),
      wrongCount: Math.max(1, error.wrongCount ?? 1),
      correctionAttempts: Math.max(0, error.correctionAttempts ?? 0),
      correctedSuccessDates: Array.from(new Set(error.correctedSuccessDates ?? [])).slice(-4),
    }))
    .slice(-60);
}

function activityErrorKey(error: ActivityErrorRecord): string {
  return [
    error.lessonId,
    error.exerciseId ?? error.questionId,
    error.type,
    error.correctAnswer,
  ].join(":");
}

function mergeActivityTargets(left: ActivityReviewTarget[], right: ActivityReviewTarget[]): ActivityReviewTarget[] {
  const seen = new Set<string>();
  return [...left, ...right].filter((target) => {
    const key = `${target.type}:${target.itemId}:${target.domain}:${target.track}`;
    if (!target.type || !target.itemId || !target.domain || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeLessonStar(value: unknown): LessonStar {
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

function lessonCompletionRequiredStars(lessonId: string): LessonStar {
  const lesson = ALL_LESSONS.find((item) => item.id === lessonId);
  return lesson?.isReview ? 2 : 3;
}

function normalizeCompletedLessons(
  completedLessons: string[] | undefined,
  stars: Record<string, LessonStar> | undefined
): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const rawId of completedLessons ?? []) {
    const lessonId = rawId.trim();
    if (!lessonId || seen.has(lessonId)) continue;
    seen.add(lessonId);
    const currentStar = normalizeLessonStar(stars?.[lessonId]);
    const requiredStars = lessonCompletionRequiredStars(lessonId);
    if (currentStar > 0 && currentStar < requiredStars) continue;
    normalized.push(lessonId);
  }
  return normalized;
}

function normalizeLessonStars(
  stars: Record<string, LessonStar> | undefined,
  completedLessons: string[] | undefined
): Record<string, LessonStar> {
  const normalized: Record<string, LessonStar> = {};
  Object.entries(stars ?? {}).forEach(([lessonId, value]) => {
    const star = normalizeLessonStar(value);
    if (lessonId && star > 0) normalized[lessonId] = star;
  });
  for (const lessonId of completedLessons ?? []) {
    const requiredStars = lessonCompletionRequiredStars(lessonId);
    if (lessonId && (normalized[lessonId] ?? 0) < requiredStars) normalized[lessonId] = requiredStars;
  }
  return normalized;
}

function normalizeLessonMistakes(mistakes: LessonMistakeRecord[] | undefined): LessonMistakeRecord[] {
  return (mistakes ?? [])
    .filter((mistake) => Boolean(mistake.id && mistake.lessonId && mistake.questionId && mistake.expectedAnswer))
    .map((mistake) => ({
      ...mistake,
      exerciseType: mistake.exerciseType || "unknown",
      prompt: mistake.prompt || "Atividade",
      userAnswer: mistake.userAnswer || "Resposta incorreta",
      explanation: mistake.explanation || "Reveja este ponto.",
      sourceSkill: mistake.sourceSkill ?? "grammar",
      createdAt: mistake.createdAt || Date.now(),
    }))
    .slice(-120);
}

function normalizeCorrectedMistakes(
  correctedMistakes: Record<string, number> | undefined,
  mistakes: LessonMistakeRecord[] | undefined
): Record<string, number> {
  const normalized: Record<string, number> = {};
  Object.entries(correctedMistakes ?? {}).forEach(([id, recoveredAt]) => {
    if (id && Number.isFinite(recoveredAt) && recoveredAt > 0) normalized[id] = recoveredAt;
  });
  for (const mistake of mistakes ?? []) {
    if (mistake.id && mistake.recoveredAt) normalized[mistake.id] = mistake.recoveredAt;
  }
  return normalized;
}

function normalizeLessonAttempts(
  attempts: Record<string, LessonAttemptRecord[]> | undefined
): Record<string, LessonAttemptRecord[]> {
  const normalized: Record<string, LessonAttemptRecord[]> = {};
  Object.entries(attempts ?? {}).forEach(([lessonId, records]) => {
    const valid = (records ?? [])
      .filter((record) => Boolean(record.id && record.lessonId && record.startedAt && record.finishedAt))
      .map((record) => ({
        ...record,
        finalStars: normalizeLessonStar(record.finalStars),
        totalQuestions: Math.max(0, Math.round(record.totalQuestions ?? 0)),
        correctCount: Math.max(0, Math.round(record.correctCount ?? 0)),
        mistakes: normalizeLessonMistakes(record.mistakes),
        recoveredMistakes: normalizeLessonMistakes(record.recoveredMistakes),
      }))
      .slice(-12);
    if (lessonId && valid.length > 0) normalized[lessonId] = valid;
  });
  return normalized;
}

function normalizeCurrentLessonAttempt(attempt: LessonAttemptRecord | null | undefined): LessonAttemptRecord | null {
  if (!attempt?.id || !attempt.lessonId) return null;
  return {
    ...attempt,
    finalStars: normalizeLessonStar(attempt.finalStars),
    totalQuestions: Math.max(0, Math.round(attempt.totalQuestions ?? 0)),
    correctCount: Math.max(0, Math.round(attempt.correctCount ?? 0)),
    mistakes: normalizeLessonMistakes(attempt.mistakes),
    recoveredMistakes: normalizeLessonMistakes(attempt.recoveredMistakes),
  };
}

interface AccountSnapshot extends XpBuckets {
  srs: Record<string, SRSItem>;
  learnedChars: string[];
  learnedChunks: string[];
  /** Domínio do HanziBuilder por caractere: guia dificuldade e silhueta. */
  hanziBuilderProgressByChar: HanziBuilderProgressMap;
  completedLessons: string[];
  lessonStarsById: Record<string, LessonStar>;
  lessonAttemptsById: Record<string, LessonAttemptRecord[]>;
  currentLessonAttempt: LessonAttemptRecord | null;
  mistakeHistory: LessonMistakeRecord[];
  correctedMistakes: Record<string, number>;
  recentErrors: LessonMistakeRecord[];
  lessonTaskProgress: Record<string, number>;
  recentActivityErrors: ActivityErrorRecord[];
  toneTrainer: ToneTrainerProgress;
  today: DailyProgress;
  dailyTasks: DailyTasks;
  dailyEnergy: DailyEnergy;
  immersionDaily: ImmersionDailyProgress;
  streak: number;
  longestStreak: number;
  lastActive: string | null;
  points: number;
  dragonPearls: number;
  streakShields: number;
  badges: string[];
  rewardHistory: RewardHistoryEntry[];
  favoriteItems: string[];
  isPremium: boolean;
  placement: PlacementResult | null;
  dailyMissions: DailyMissionsState;
  weeklyMissions: WeeklyMissionsState;
  monthlyMission: MonthlyMissionState;
  missionHistory: MissionHistoryEntry[];
  medals: Medal[];
  inventory: Record<string, number>;
  ownedCosmetics: string[];
  purchaseHistory: PurchaseEntry[];
  chests: ChestInventory;
  chestOpenHistory: ChestOpenHistoryEntry[];
  journeyChestsOpened: string[];
  leagueTier: LeagueTier;
  leagueJoinedAt: number | null;
  leagueBots: LeagueBot[];
  leagueHistory: LeagueHistoryEntry[];
  lifetimeStats: LifetimeStats;
  /** Medalhas gerais desbloqueadas: id → timestamp do desbloqueio. */
  achievementsUnlocked: Record<string, number>;
  /** Historico rico das medalhas gerais desbloqueadas, sem duplicar por id. */
  achievementHistory: AchievementHistoryEntry[];
  /** Treino Focado ativo até este timestamp (treino extra sem Carga). */
  focusPassUntil: number | null;
  /** Módulos liberados pelo teste de pular ("validado por teste"). */
  validatedModules: string[];
  /** Tentativas de teste de pular por módulo na semana corrente. */
  moduleSkipUsage: Record<string, ModuleSkipUsageWeek>;
}

/**
 * Como a conta se autentica hoje:
 * - "local": só existe neste dispositivo (o usuário deixou a conta para depois).
 * - "cloud_pending": informou email para sincronizar, mas o backend real ainda não existe.
 * - "cloud": autenticado de fato na nuvem (reservado para quando houver backend).
 */
export type AuthMode = "local" | "cloud_pending" | "cloud";

export type CloudSyncStatus = "idle" | "loading" | "synced" | "pending" | "error";

export interface CloudSyncState {
  status: CloudSyncStatus;
  message: string;
  updatedAt: number | null;
}

export function cloudAccountId(userId: string): string {
  return `cloud:${userId}`;
}

export interface LearningAccount extends AccountSnapshot {
  id: string;
  name: string;
  email?: string;
  authMode: AuthMode;
  createdAt: number;
  updatedAt: number;
}

function blankSnapshot(): AccountSnapshot {
  return {
    ...freshXp(),
    srs: {},
    learnedChars: [],
    learnedChunks: [],
    hanziBuilderProgressByChar: {},
    completedLessons: [],
    lessonStarsById: {},
    lessonAttemptsById: {},
    currentLessonAttempt: null,
    mistakeHistory: [],
    correctedMistakes: {},
    recentErrors: [],
    lessonTaskProgress: {},
    recentActivityErrors: [],
    toneTrainer: {},
    today: freshDay(),
    dailyTasks: freshDailyTasks(),
    dailyEnergy: freshDailyEnergy(),
    immersionDaily: freshImmersionDaily(),
    streak: 0,
    longestStreak: 0,
    lastActive: null,
    points: 0,
    dragonPearls: 0,
    streakShields: 0,
    badges: [],
    rewardHistory: [],
    favoriteItems: [],
    isPremium: false,
    placement: null,
    dailyMissions: freshDailyMissions(),
    weeklyMissions: freshWeeklyMissions(),
    monthlyMission: freshMonthlyMission(),
    missionHistory: [],
    medals: [],
    inventory: {},
    ownedCosmetics: [],
    purchaseHistory: [],
    chests: freshChests(),
    chestOpenHistory: [],
    journeyChestsOpened: [],
    leagueTier: "bronze",
    leagueJoinedAt: null,
    leagueBots: [],
    leagueHistory: [],
    lifetimeStats: freshLifetimeStats(),
    achievementsUnlocked: {},
    achievementHistory: [],
    focusPassUntil: null,
    validatedModules: [],
    moduleSkipUsage: {},
  };
}

function freshCloudSyncState(): CloudSyncState {
  return { status: "idle", message: "", updatedAt: null };
}

function makeAccount(
  id: string,
  name: string,
  snapshot = blankSnapshot(),
  email?: string,
  authMode: AuthMode = "local"
): LearningAccount {
  const now = Date.now();
  return { id, name, email, authMode, createdAt: now, updatedAt: now, ...snapshot };
}

function buildCloudAccount(
  existing: LearningAccount | undefined,
  fallback: LearningAccount | undefined,
  identity: { userId: string; email?: string; name?: string },
  progress?: AccountSnapshot
): LearningAccount {
  const id = cloudAccountId(identity.userId);
  const now = Date.now();
  const baseSnapshot = progress ?? existing ?? fallback ?? blankSnapshot();
  return {
    ...makeAccount(id, identity.name?.trim() || existing?.name || fallback?.name || "Aluno Longyu"),
    ...(existing ?? {}),
    ...(baseSnapshot as AccountSnapshot),
    id,
    name: identity.name?.trim() || existing?.name || fallback?.name || "Aluno Longyu",
    email: identity.email ?? existing?.email ?? fallback?.email,
    authMode: "cloud",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function snapshotFromState(s: Pick<AppState, keyof AccountSnapshot>): AccountSnapshot {
  return {
    xpTotal: s.xpTotal,
    xpToday: s.xpToday,
    weeklyXp: s.weeklyXp,
    monthlyXp: s.monthlyXp,
    xpDayKey: s.xpDayKey,
    xpWeekKey: s.xpWeekKey,
    xpMonthKey: s.xpMonthKey,
    srs: s.srs,
    learnedChars: s.learnedChars,
    learnedChunks: s.learnedChunks,
    hanziBuilderProgressByChar: s.hanziBuilderProgressByChar,
    completedLessons: s.completedLessons,
    lessonStarsById: s.lessonStarsById,
    lessonAttemptsById: s.lessonAttemptsById,
    currentLessonAttempt: s.currentLessonAttempt,
    mistakeHistory: s.mistakeHistory,
    correctedMistakes: s.correctedMistakes,
    recentErrors: s.recentErrors,
    lessonTaskProgress: s.lessonTaskProgress,
    recentActivityErrors: s.recentActivityErrors,
    toneTrainer: s.toneTrainer,
    today: s.today,
    dailyTasks: s.dailyTasks,
    dailyEnergy: s.dailyEnergy,
    immersionDaily: s.immersionDaily,
    streak: s.streak,
    longestStreak: s.longestStreak,
    lastActive: s.lastActive,
    points: s.points,
    dragonPearls: s.dragonPearls,
    streakShields: s.streakShields,
    badges: s.badges,
    rewardHistory: s.rewardHistory,
    favoriteItems: s.favoriteItems,
    isPremium: s.isPremium,
    placement: s.placement,
    dailyMissions: s.dailyMissions,
    weeklyMissions: s.weeklyMissions,
    monthlyMission: s.monthlyMission,
    missionHistory: s.missionHistory,
    medals: s.medals,
    inventory: s.inventory,
    ownedCosmetics: s.ownedCosmetics,
    purchaseHistory: s.purchaseHistory,
    chests: s.chests,
    chestOpenHistory: s.chestOpenHistory,
    journeyChestsOpened: s.journeyChestsOpened,
    leagueTier: s.leagueTier,
    leagueJoinedAt: s.leagueJoinedAt,
    leagueBots: s.leagueBots,
    leagueHistory: s.leagueHistory,
    lifetimeStats: s.lifetimeStats,
    achievementsUnlocked: s.achievementsUnlocked,
    achievementHistory: s.achievementHistory,
    focusPassUntil: s.focusPassUntil,
    validatedModules: s.validatedModules,
    moduleSkipUsage: s.moduleSkipUsage ?? {},
  };
}

function normalizeAchievementState(
  unlocked: Record<string, number> | undefined,
  history: AchievementHistoryEntry[] | undefined
): Pick<AccountSnapshot, "achievementsUnlocked" | "achievementHistory"> {
  const achievementsUnlocked: Record<string, number> = {};
  const entriesById = new Map<string, AchievementHistoryEntry>();

  Object.entries(unlocked ?? {}).forEach(([id, unlockedAt]) => {
    if (!id || !Number.isFinite(unlockedAt) || unlockedAt <= 0) return;
    achievementsUnlocked[id] = unlockedAt;
  });

  (history ?? []).forEach((entry) => {
    if (!entry.id || !Number.isFinite(entry.unlockedAt) || entry.unlockedAt <= 0) return;
    const unlockedAt = achievementsUnlocked[entry.id] ?? entry.unlockedAt;
    achievementsUnlocked[entry.id] = unlockedAt;
    if (!entriesById.has(entry.id)) {
      entriesById.set(entry.id, { id: entry.id, unlockedAt, reward: entry.reward });
    }
  });

  Object.entries(achievementsUnlocked).forEach(([id, unlockedAt]) => {
    if (!entriesById.has(id)) entriesById.set(id, { id, unlockedAt });
  });

  return {
    achievementsUnlocked,
    achievementHistory: [...entriesById.values()].sort((a, b) => b.unlockedAt - a.unlockedAt),
  };
}

function normalizeHanziBuilderProgress(
  raw: HanziBuilderProgressMap | undefined
): HanziBuilderProgressMap {
  const result: HanziBuilderProgressMap = {};
  for (const [char, entry] of Object.entries(raw ?? {})) {
    if (!char || !entry) continue;
    const attempts = Math.max(0, Math.round(entry.attempts ?? 0));
    const correct = Math.max(0, Math.round(entry.correct ?? 0));
    const firstTry = Math.max(0, Math.round(entry.firstTry ?? 0));
    const lastLevelCompleted = Math.max(0, Math.round(entry.lastLevelCompleted ?? 0));
    result[char] = {
      attempts,
      correct: Math.min(correct, attempts),
      firstTry: Math.min(firstTry, correct),
      lastLevelCompleted,
      mastered: Boolean(entry.mastered) || (correct >= 3 && lastLevelCompleted >= 3),
    };
  }
  return result;
}

function accountFields(account: LearningAccount): AccountSnapshot {
  const date = todayKey();
  const completedLessons = normalizeCompletedLessons(account.completedLessons, account.lessonStarsById);
  return {
    ...activeXp(account),
    srs: account.srs,
    learnedChars: account.learnedChars,
    learnedChunks: account.learnedChunks,
    hanziBuilderProgressByChar: normalizeHanziBuilderProgress(account.hanziBuilderProgressByChar),
    completedLessons,
    lessonStarsById: normalizeLessonStars(account.lessonStarsById, completedLessons),
    lessonAttemptsById: normalizeLessonAttempts(account.lessonAttemptsById),
    currentLessonAttempt: normalizeCurrentLessonAttempt(account.currentLessonAttempt),
    mistakeHistory: normalizeLessonMistakes(account.mistakeHistory),
    correctedMistakes: normalizeCorrectedMistakes(account.correctedMistakes, account.mistakeHistory),
    recentErrors: normalizeLessonMistakes(account.recentErrors).filter((error) => !error.recoveredAt),
    lessonTaskProgress: account.lessonTaskProgress ?? {},
    recentActivityErrors: normalizeRecentActivityErrors(account.recentActivityErrors),
    toneTrainer: account.toneTrainer ?? {},
    today: account.today?.date === date ? account.today : freshDay(date),
    dailyTasks: activeDailyTasks(account.dailyTasks, date),
    dailyEnergy: activeDailyEnergy(account.dailyEnergy, date),
    immersionDaily: activeImmersionDaily(account.immersionDaily, date),
    streak: account.streak,
    longestStreak: account.longestStreak,
    lastActive: account.lastActive,
    points: account.points,
    dragonPearls: account.dragonPearls ?? 0,
    streakShields: account.streakShields ?? 0,
    badges: account.badges ?? [],
    rewardHistory: account.rewardHistory ?? [],
    favoriteItems: account.favoriteItems ?? [],
    isPremium: account.isPremium,
    placement: account.placement ?? null,
    dailyMissions: activeDailyMissions(account.dailyMissions, date),
    weeklyMissions: activeWeeklyMissions(account.weeklyMissions),
    monthlyMission: activeMonthlyMission(account.monthlyMission),
    missionHistory: account.missionHistory ?? [],
    medals: account.medals ?? [],
    inventory: account.inventory ?? {},
    ownedCosmetics: account.ownedCosmetics ?? [],
    purchaseHistory: account.purchaseHistory ?? [],
    chests: { ...freshChests(), ...(account.chests ?? {}) },
    chestOpenHistory: account.chestOpenHistory ?? [],
    journeyChestsOpened: account.journeyChestsOpened ?? [],
    leagueTier: normalizeLeagueTier(account.leagueTier),
    leagueJoinedAt: joinedLeagueThisWeek(account.leagueJoinedAt) ? account.leagueJoinedAt : null,
    leagueBots: joinedLeagueThisWeek(account.leagueJoinedAt) ? account.leagueBots ?? [] : [],
    leagueHistory: account.leagueHistory ?? [],
    lifetimeStats: { ...freshLifetimeStats(), ...(account.lifetimeStats ?? {}) },
    // Passe expirado é limpo na hidratação para não vazar entre dias.
    focusPassUntil:
      account.focusPassUntil && account.focusPassUntil > Date.now() ? account.focusPassUntil : null,
    validatedModules: account.validatedModules ?? [],
    moduleSkipUsage: account.moduleSkipUsage ?? {},
    ...normalizeAchievementState(account.achievementsUnlocked, account.achievementHistory),
  };
}

function saveCurrentAccount(s: AppState): Record<string, LearningAccount> {
  const accounts = s.accounts ?? {};
  const account = accounts[s.currentAccountId] ?? makeAccount(s.currentAccountId, "Aluno local");
  return {
    ...accounts,
    [s.currentAccountId]: {
      ...account,
      ...snapshotFromState(s),
      updatedAt: Date.now(),
    },
  };
}

// Lições anteriores ao ponto de entrada do nivelamento são dadas como concluídas.
// Deriva do placement, então o onboarding só precisa passar o resultado do teste.
function settleLeagueWeek(s: AppState, now = new Date()): Partial<AppState> {
  const currentWeek = weekKey(now);
  const joinedWeek = leagueWeekFromTimestamp(s.leagueJoinedAt);
  const xpWeek = s.xpWeekKey ?? currentWeek;
  const tier = normalizeLeagueTier(s.leagueTier);

  if (!joinedWeek) {
    return {
      leagueTier: tier,
      leagueJoinedAt: null,
      leagueBots: [],
      leagueHistory: s.leagueHistory ?? [],
    };
  }

  if (joinedWeek === currentWeek) {
    return {
      leagueTier: tier,
      leagueJoinedAt: s.leagueJoinedAt,
      leagueBots: s.leagueBots ?? [],
      leagueHistory: s.leagueHistory ?? [],
    };
  }

  if (joinedWeek !== xpWeek) {
    return {
      leagueTier: tier,
      leagueJoinedAt: null,
      leagueBots: [],
      leagueHistory: s.leagueHistory ?? [],
    };
  }

  const bots = s.leagueBots?.length ? s.leagueBots : generateLeagueBots(tier, xpWeek, s.currentAccountId);
  const standings = buildLeagueStandings(s.weeklyXp, bots);
  const userRank = standings.find((row) => row.isUser)?.rank ?? standings.length;
  const outcome = leagueOutcomeForRank(userRank, standings.length, tier);
  const promotedTier = nextLeagueTier(tier, outcome);
  if (outcome === "promoted" && promotedTier !== tier) {
    queueSocialFromApp("league_up", { tier: promotedTier, from: tier });
  }
  const historyEntry: LeagueHistoryEntry = {
    id: `league:${xpWeek}:${Date.now()}`,
    weekKey: xpWeek,
    tier,
    rank: userRank,
    weeklyXp: Math.max(0, Math.round(s.weeklyXp ?? 0)),
    outcome,
    createdAt: Date.now(),
  };

  return {
    leagueTier: promotedTier,
    leagueJoinedAt: null,
    leagueBots: [],
    leagueHistory: [historyEntry, ...(s.leagueHistory ?? [])].slice(0, 24),
  };
}

function queueSocialFromApp(type: import("../lib/social/types").SocialActivityType, payload: Record<string, unknown> = {}) {
  queueMicrotask(async () => {
    const state = useStore.getState();
    const account = state.accounts[state.currentAccountId];
    if (account?.authMode !== "cloud") return;
    const { queueSocialEvent } = await import("../services/socialActivityQueue");
    queueSocialEvent(type, payload);
  });
}

function joinLeaguePatch(
  s: AppState,
  now = new Date()
): Pick<AppState, "leagueTier" | "leagueJoinedAt" | "leagueBots" | "leagueHistory"> {
  const currentWeek = weekKey(now);
  const tier = normalizeLeagueTier(s.leagueTier);
  const alreadyJoined = joinedLeagueThisWeek(s.leagueJoinedAt, now);
  return {
    leagueTier: tier,
    leagueJoinedAt: alreadyJoined ? s.leagueJoinedAt : Date.now(),
    leagueBots: alreadyJoined && s.leagueBots?.length ? s.leagueBots : generateLeagueBots(tier, currentWeek, s.currentAccountId),
    leagueHistory: s.leagueHistory ?? [],
  };
}

function lessonsCompletedBefore(targetLessonId: string): string[] {
  const targetIndex = ALL_LESSONS.findIndex((lesson) => lesson.id === targetLessonId);
  if (targetIndex <= 0) return [];
  // As lições fundamentais de conceito nunca são puladas pelo nivelamento: o
  // aluno sempre passa por "O que é mandarim/pinyin/tom/hànzì".
  return ALL_LESSONS.slice(0, targetIndex)
    .filter((lesson) => !lesson.premium && !FOUNDATION_LESSON_IDS.includes(lesson.id))
    .map((lesson) => lesson.id);
}

function onboardingSnapshotFromPlacement(placement: PlacementResult): AccountSnapshot {
  const date = todayKey();
  const completedLessons = normalizeCompletedLessons(
    placement.skippedLessonIds ?? lessonsCompletedBefore(placement.targetLessonId),
    undefined
  );
  return {
    ...blankSnapshot(),
    completedLessons,
    lessonStarsById: normalizeLessonStars({}, completedLessons),
    placement,
    lastActive: date,
    streak: 1,
    longestStreak: 1,
    today: freshDay(date),
    dailyTasks: freshDailyTasks(date),
    dailyEnergy: freshDailyEnergy(date),
    immersionDaily: freshImmersionDaily(date),
    dailyMissions: freshDailyMissions(date),
    weeklyMissions: freshWeeklyMissions(),
    monthlyMission: freshMonthlyMission(),
  };
}

/**
 * Finaliza o onboarding no perfil local (DEFAULT_ACCOUNT_ID): aplica o nivelamento,
 * grava identidade (nome, email opcional, authMode) e marca o setup como completo.
 *
 * Segurança: NENHUMA senha passa por aqui. A UI valida senha/confirmação apenas em
 * memória e as descarta; só nome e email chegam à store/localStorage. Autenticação
 * real (e authMode "cloud") virá quando existir backend.
 */
function finalizeOnboardingState(
  s: AppState,
  opts: { name: string; email?: string; authMode: AuthMode; placement: PlacementResult }
): Partial<AppState> {
  const cleanSnapshot = onboardingSnapshotFromPlacement(opts.placement);
  const existingLocal = s.accounts[DEFAULT_ACCOUNT_ID];
  const localAccount: LearningAccount = {
    ...(existingLocal ?? makeAccount(DEFAULT_ACCOUNT_ID, opts.name, cleanSnapshot)),
    ...cleanSnapshot,
    id: DEFAULT_ACCOUNT_ID,
    name: opts.name,
    email: opts.email,
    authMode: opts.authMode,
    createdAt: existingLocal?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  return {
    ...accountFields(localAccount),
    accountSetupComplete: true,
    currentAccountId: DEFAULT_ACCOUNT_ID,
    accounts: {
      ...saveCurrentAccount(s),
      [DEFAULT_ACCOUNT_ID]: localAccount,
    },
  };
}

function hasProAccess(s: AppState, serverIsProOverride?: boolean): boolean {
  const account = s.accounts[s.currentAccountId];
  return effectivePremium(s.isPremium, serverIsProOverride ?? s.serverIsPro, {
    accountEmail: account?.email,
    accountAuthMode: account?.authMode,
  });
}

function hasInternalTestCloudAccount(s: Pick<AppState, "accounts" | "currentAccountId">): boolean {
  const current = s.accounts[s.currentAccountId];
  if (current?.authMode === "cloud" && isInternalTestProEmail(current.email)) return true;
  return Object.values(s.accounts).some(
    (account) => account.authMode === "cloud" && isInternalTestProEmail(account.email)
  );
}

interface AppState {
  // preferências
  theme: ThemeName;
  ttsRate: number;
  ttsVolume: number;
  soundEffects: boolean;
  soundFxVolume: number;
  soundTheme: SoundTheme;
  mandarinDisplayMode: MandarinDisplayMode;
  translationMode: TranslationMode;
  showNumericPinyin: boolean;
  toneColors: boolean;
  toneColorIntensity: number;
  autoPlayAudio: boolean;
  slowAudio: boolean;
  accountSetupComplete: boolean;
  currentAccountId: string;
  accounts: Record<string, LearningAccount>;
  // progresso
  srs: Record<string, SRSItem>;
  learnedChars: string[];
  learnedChunks: string[];
  hanziBuilderProgressByChar: HanziBuilderProgressMap;
  completedLessons: string[];
  lessonStarsById: Record<string, LessonStar>;
  lessonAttemptsById: Record<string, LessonAttemptRecord[]>;
  currentLessonAttempt: LessonAttemptRecord | null;
  mistakeHistory: LessonMistakeRecord[];
  correctedMistakes: Record<string, number>;
  recentErrors: LessonMistakeRecord[];
  lessonTaskProgress: Record<string, number>;
  recentActivityErrors: ActivityErrorRecord[];
  toneTrainer: ToneTrainerProgress;
  points: number;
  xpTotal: number;
  xpToday: number;
  weeklyXp: number;
  monthlyXp: number;
  xpDayKey: string;
  xpWeekKey: string;
  xpMonthKey: string;
  today: DailyProgress;
  dailyTasks: DailyTasks;
  dailyEnergy: DailyEnergy;
  immersionDaily: ImmersionDailyProgress;
  streak: number;
  longestStreak: number;
  lastActive: string | null;
  dragonPearls: number;
  streakShields: number;
  badges: string[];
  rewardHistory: RewardHistoryEntry[];
  favoriteItems: string[];
  /** Preview de assinatura Pro (paywall real vem depois). */
  isPremium: boolean;
  /** Pro real confirmado pelo servidor (assinatura Stripe ativa). */
  serverIsPro: boolean;
  cloudSyncState: CloudSyncState;
  economySyncMessage: string | null;
  placement: PlacementResult | null;
  dailyMissions: DailyMissionsState;
  weeklyMissions: WeeklyMissionsState;
  monthlyMission: MonthlyMissionState;
  missionHistory: MissionHistoryEntry[];
  medals: Medal[];
  inventory: Record<string, number>;
  ownedCosmetics: string[];
  purchaseHistory: PurchaseEntry[];
  chests: ChestInventory;
  chestOpenHistory: ChestOpenHistoryEntry[];

  // ações
  leagueTier: LeagueTier;
  leagueJoinedAt: number | null;
  leagueBots: LeagueBot[];
  leagueHistory: LeagueHistoryEntry[];
  journeyChestsOpened: string[];
  lifetimeStats: LifetimeStats;
  achievementsUnlocked: Record<string, number>;
  achievementHistory: AchievementHistoryEntry[];
  focusPassUntil: number | null;
  validatedModules: string[];
  moduleSkipUsage: Record<string, ModuleSkipUsageWeek>;

  setTheme: (t: ThemeName) => void;
  setTtsRate: (r: number) => void;
  setTtsVolume: (v: number) => void;
  setSoundEffects: (v: boolean) => void;
  setSoundFxVolume: (v: number) => void;
  setSoundTheme: (theme: SoundTheme) => void;
  setMandarinDisplayMode: (mode: MandarinDisplayMode) => void;
  setTranslationMode: (mode: TranslationMode) => void;
  setShowNumericPinyin: (enabled: boolean) => void;
  setToneColors: (enabled: boolean) => void;
  setToneColorIntensity: (intensity: number) => void;
  setAutoPlayAudio: (enabled: boolean) => void;
  setSlowAudio: (enabled: boolean) => void;
  setAccountSetupComplete: (v: boolean) => void;
  setPremium: (v: boolean) => void;
  setServerEntitlement: (isPro: boolean) => void;
  setCloudSyncState: (status: CloudSyncStatus, message?: string) => void;
  setEconomySyncMessage: (message: string | null) => void;
  applyCloudProgressSnapshot: (body: ProgressSnapshotBody) => void;
  activateCloudAccount: (identity: { userId: string; email?: string; name?: string }, progress?: AccountSnapshot) => string;
  addPoints: (points: number) => void;
  spendPoints: (points: number) => boolean;
  /** XP = progresso de estudo (lições, revisão, prática, imersão, missões). Nunca é gasto. */
  addXp: (amount: number, sourceKey: string) => void;
  /** Qi = moeda acumulável (loja, recuperações, tentativas extras). */
  addQi: (amount: number, source: string) => void;
  /** Gasta Qi; retorna false se não houver saldo. Pro nunca fica sem Qi. */
  spendQi: (amount: number, source: string, idempotencyKey?: string) => boolean;
  getTodayXp: () => number;
  getWeeklyXp: () => number;
  getMonthlyXp: () => number;
  economySummary: () => EconomySummary;
  syncLeagueWeek: () => void;
  getMissionAggregates: () => MissionAggregates;
  /**
   * Resgata a recompensa de uma missão completa. Idempotente por período:
   * cada missão só paga uma vez. Missão diária resgatada soma +1 na mensal.
   * scope "monthly" resgata a medalha do mês (exige a meta mensal batida).
   */
  claimMission: (scope: MissionScope, missionId: string) => boolean;
  /** Loja: pode comprar? (saldo suficiente, cosmético não possuído, item comprável). */
  canBuyShopItem: (itemId: string) => boolean;
  /** Loja: compra um item — desconta a moeda e envia para inventário/cosméticos. */
  buyShopItem: (itemId: string) => boolean;
  /** Loja: usa um item consumível do inventário e aplica o efeito. */
  useInventoryItem: (itemId: string) => ShopUseResult | null;
  /** Baús: adiciona baús ao inventário (ganhos por estudo, missões ou compra). */
  addChest: (type: ChestType, amount: number) => void;
  /** Baús: sorteia as recompensas de um tipo de baú (sem aplicar). */
  generateChestReward: (type: ChestType) => ChestRewardItem[];
  /** Baús: abre 1 baú — aplica as recompensas, registra no rewardHistory e as retorna. */
  openChest: (type: ChestType, openingId?: string) => ChestRewardItem[] | null;
  openJourneyChest: (chestId: string, type: ChestType) => ChestRewardItem[] | null;
  createAccount: (name: string, email?: string) => string;
  /** Onboarding sem conta: perfil local com o nome informado (authMode "local"). */
  finishLocalOnboarding: (name: string, placement: PlacementResult) => void;
  /** Onboarding com email: prepara a conta (authMode "cloud_pending"). Senha nunca é salva. */
  createCloudAccountDraft: (name: string, email: string, placement: PlacementResult) => void;
  /** Anexa um email a um perfil local já existente e o promove a "cloud_pending". */
  attachEmailToLocalAccount: (email: string) => void;
  /** Compatibilidade: marca a conta atual como cloud sem trocar de id. */
  syncAccountWithCloudAuth: (email: string) => void;
  /** Encerra sessão na nuvem sem apagar progresso local. */
  endCloudSession: () => void;
  logout: () => void;
  switchAccount: (id: string) => void;
  renameAccount: (id: string, name: string) => void;
  updateAccount: (id: string, data: { name?: string; email?: string }) => void;
  applyPlacement: (completedLessonIds: string[], placement: PlacementResult) => void;
  ensureSrs: (type: ItemType, itemId: string, track?: Track, reviewDomain?: ReviewDomain) => void;
  gradeSrs: (type: ItemType, itemId: string, grade: Grade, track?: Track, reviewDomain?: ReviewDomain) => void;
  recordActivityError: (error: ActivityErrorRecord) => void;
  markActivityErrorCorrected: (errorId: string) => void;
  /** Errou de novo na revisão: conta a tentativa sem criar erro duplicado. */
  recordActivityErrorReviewAttempt: (errorId: string) => void;
  setCurrentLessonAttempt: (attempt: LessonAttemptRecord | null) => void;
  finishLessonAttempt: (attempt: LessonAttemptRecord) => void;
  setLessonStars: (lessonId: string, stars: LessonStar) => void;
  recordLessonMistake: (mistake: LessonMistakeRecord) => void;
  markMistakeRecovered: (mistakeId: string) => void;
  recordToneTrainerAttempt: (attempt: ToneTrainerAttemptInput) => void;
  markLearned: (type: ItemType, itemId: string) => void;
  recordHanziBuilderResult: (input: {
    character: string;
    correct: boolean;
    firstTry: boolean;
    level: number;
  }) => void;
  addMinutes: (track: Track, min: number) => void;
  recordDailyTask: (task: DailyTaskKey, amount?: number) => void;
  completeImmersionSession: (sessionId: string, completion: ImmersionCompletion) => boolean;
  setLessonTaskProgress: (lessonId: string, completedTasks: number) => void;
  toggleFavoriteItem: (key: string) => void;
  claimReward: (reward: RewardGrant) => boolean;
  grantLessonReward: (input: {
    lessonId: string;
    attemptId: string;
    stars: number;
    noSkip: boolean;
  }) => boolean;
  claimDailyMission: (missionId: string, rewards: RewardGrant[]) => boolean;
  getActiveDailyEnergy: () => DailyEnergy;
  consumeCharge: (activityType: EnergyActivityType, idempotencyKey?: string) => boolean;
  addCharges: (amount: number, source: string) => boolean;
  /** +1 carga extra por concluir uma história (idempotente por dia/história). */
  grantStoryEnergy: (storyId: string) => StoryEnergyResult;
  getStoryEnergyStatus: () => StoryEnergyStatus;
  refillDailyCharges: () => void;
  canStartActivity: (activityType: EnergyActivityType) => boolean;
  registerActivity: () => void;
  completeLesson: (id: string) => void;
  /** Marca lição concluída via teste de módulo — 1 estrela, sem recompensas de aula. */
  completeLessonViaTest: (id: string) => void;
  /**
   * Desbloqueia uma medalha geral. Idempotente: retorna false se já foi
   * desbloqueada. Aplica a recompensa (Qi via rewardHistory, baú no inventário)
   * apenas na primeira vez — medalhas nunca duplicam.
   */
  unlockAchievement: (id: string, reward?: AchievementReward) => boolean;
  /** Treino Focado está valendo agora? (Pro sempre tem.) */
  hasFocusPass: () => boolean;
  /** Marca um módulo como "validado por teste" (pulo aprovado). Idempotente. */
  validateModule: (unitId: string) => void;
  /** Registra uma tentativa de teste de pular módulo na semana corrente. */
  recordModuleSkipAttempt: (unitId: string) => void;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function applyRewardToState(s: AppState, reward: RewardGrant): AppState {
  if ((s.rewardHistory ?? []).some((entry) => entry.id === reward.id)) return s;

  const next: AppState = {
    ...s,
    rewardHistory: [...(s.rewardHistory ?? []), { ...reward, claimedAt: Date.now() }],
  };

  if (reward.type === "qi") next.points = Math.max(0, next.points + reward.amount);
  if (reward.type === "dragonPearl") next.dragonPearls = Math.max(0, next.dragonPearls + reward.amount);
  if (reward.type === "streakShield") next.streakShields = Math.max(0, next.streakShields + reward.amount);
  if (reward.type === "badge" && !next.badges.includes(reward.source)) next.badges = [...next.badges, reward.source];
  if (reward.type === "xp" && reward.amount > 0) {
    const b = activeXp(next);
    next.xpTotal = b.xpTotal + reward.amount;
    next.xpToday = b.xpToday + reward.amount;
    next.weeklyXp = b.weeklyXp + reward.amount;
    next.monthlyXp = b.monthlyXp + reward.amount;
    next.xpDayKey = b.xpDayKey;
    next.xpWeekKey = b.xpWeekKey;
    next.xpMonthKey = b.xpMonthKey;
  }
  if (reward.type === "charge" && reward.amount > 0) {
    const e = activeDailyEnergy(next.dailyEnergy);
    const amount = Math.max(0, Math.round(reward.amount));
    next.dailyEnergy = { ...e, maxCharges: e.maxCharges + amount, charges: e.charges + amount };
  }

  return next;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "clay",
      ttsRate: 0.85,
      ttsVolume: 1,
      soundEffects: true,
      soundFxVolume: 0.85,
      soundTheme: "longyu_classic",
      mandarinDisplayMode: "pinyin_hanzi",
      translationMode: "tap",
      showNumericPinyin: false,
      toneColors: true,
      toneColorIntensity: 1,
      autoPlayAudio: false,
      slowAudio: false,
      accountSetupComplete: false,
      currentAccountId: DEFAULT_ACCOUNT_ID,
      accounts: { [DEFAULT_ACCOUNT_ID]: makeAccount(DEFAULT_ACCOUNT_ID, "Aluno local") },
      srs: {},
      learnedChars: [],
      learnedChunks: [],
      hanziBuilderProgressByChar: {},
      completedLessons: [],
      lessonStarsById: {},
      lessonAttemptsById: {},
      currentLessonAttempt: null,
      mistakeHistory: [],
      correctedMistakes: {},
      recentErrors: [],
      lessonTaskProgress: {},
      recentActivityErrors: [],
      toneTrainer: {},
      points: 0,
      ...freshXp(),
      today: freshDay(),
      dailyTasks: freshDailyTasks(),
      dailyEnergy: freshDailyEnergy(),
      immersionDaily: freshImmersionDaily(),
      streak: 0,
      longestStreak: 0,
      lastActive: null,
      dragonPearls: 0,
      streakShields: 0,
      badges: [],
      rewardHistory: [],
      favoriteItems: [],
      isPremium: false,
      serverIsPro: false,
      cloudSyncState: freshCloudSyncState(),
      economySyncMessage: null,
      placement: null,
      dailyMissions: freshDailyMissions(),
      weeklyMissions: freshWeeklyMissions(),
      monthlyMission: freshMonthlyMission(),
      missionHistory: [],
      medals: [],
      lifetimeStats: freshLifetimeStats(),
      achievementsUnlocked: {},
      achievementHistory: [],
      focusPassUntil: null,
      validatedModules: [],
      moduleSkipUsage: {},
      inventory: {},
      ownedCosmetics: [],
      purchaseHistory: [],
      chests: freshChests(),
      chestOpenHistory: [],
      journeyChestsOpened: [],
      leagueTier: "bronze",
      leagueJoinedAt: null,
      leagueBots: [],
      leagueHistory: [],

      setTheme: (t) => set({ theme: t }),
      setTtsRate: (r) => set({ ttsRate: r }),
      setTtsVolume: (v) => set({ ttsVolume: clamp01(v) }),
      setSoundEffects: (v) => set({ soundEffects: v }),
      setSoundFxVolume: (v) => set({ soundFxVolume: clamp01(v) }),
      setSoundTheme: (theme) => set({ soundTheme: theme }),
      setMandarinDisplayMode: (mode) => set({ mandarinDisplayMode: mode }),
      setTranslationMode: (mode) => set({ translationMode: mode }),
      setShowNumericPinyin: (enabled) => set({ showNumericPinyin: enabled }),
      setToneColors: (enabled) => set({ toneColors: enabled }),
      setToneColorIntensity: (intensity) => set({ toneColorIntensity: clamp01(intensity) }),
      setAutoPlayAudio: (enabled) => set({ autoPlayAudio: enabled }),
      setSlowAudio: (enabled) => set({ slowAudio: enabled }),
      setAccountSetupComplete: (v) =>
        set((s) => {
          const next = { ...s, accountSetupComplete: v };
          return { accountSetupComplete: v, accounts: saveCurrentAccount(next) };
        }),
      setPremium: (v) =>
        set((s) => {
          const next = { ...s, isPremium: v };
          return { isPremium: v, accounts: saveCurrentAccount(next) };
        }),
      setServerEntitlement: (isPro) =>
        set((s) => {
          const stillPro = hasProAccess(s, isPro);
          const dailyEnergy = stillPro ? s.dailyEnergy : reconcileFreePlanEnergy(s.dailyEnergy);
          const next = { ...s, serverIsPro: isPro, dailyEnergy };
          return { serverIsPro: isPro, dailyEnergy, accounts: saveCurrentAccount(next) };
        }),
      setCloudSyncState: (status, message = "") =>
        set({
          cloudSyncState: {
            status,
            message,
            updatedAt: Date.now(),
          },
        }),
      setEconomySyncMessage: (message) => set({ economySyncMessage: message }),
      applyCloudProgressSnapshot: (body) =>
        set((s) => {
          const id = s.currentAccountId;
          const account = s.accounts[id];
          if (!account) return {};
          const merged: LearningAccount = {
            ...account,
            ...body.progress,
            id: account.id,
            name: account.name,
            email: account.email ?? body.account.email,
            authMode: account.authMode,
            createdAt: account.createdAt,
            updatedAt: Date.now(),
          };
          return {
            ...accountFields(merged),
            accounts: { ...s.accounts, [id]: merged },
          };
        }),
      activateCloudAccount: (identity, progress) => {
        const id = cloudAccountId(identity.userId);
        const grantInternalPro = isInternalTestProEmail(identity.email);
        set((s) => {
          const saved = saveCurrentAccount(s);
          const fallback = saved[s.currentAccountId];
          const existing = saved[id];
          const account = buildCloudAccount(existing, fallback, identity, progress);
          return {
            ...accountFields(account),
            accountSetupComplete: true,
            currentAccountId: id,
            serverIsPro: grantInternalPro ? true : s.serverIsPro,
            accounts: {
              ...saved,
              [id]: account,
            },
          };
        });
        return id;
      },
      addQi: (amount, source) =>
        set((s) => {
          const inc = Math.max(0, Math.round(amount));
          if (inc <= 0) return {};
          const now = Date.now();
          const next = applyRewardToState(s, {
            id: `qi:${source}:${now}:${s.rewardHistory?.length ?? 0}`,
            type: "qi",
            amount: inc,
            source,
          });
          return { points: next.points, rewardHistory: next.rewardHistory, accounts: saveCurrentAccount(next) };
        }),
      spendQi: (amount, source, idempotencyKey) => {
        const spendAmount = Math.max(0, Math.round(amount));
        if (spendAmount <= 0) return true;
        const state = get();
        if (hasProAccess(state)) return true;
        if (state.points < spendAmount) return false;
        const previousPoints = state.points;
        set((s) => {
          if (s.points < spendAmount) return {};
          const now = Date.now();
          const purchaseHistory = [
            ...(s.purchaseHistory ?? []),
            {
              id: `${source}:${now}:${s.purchaseHistory?.length ?? 0}`,
              itemId: source,
              name: qiSpendName(source),
              currency: "qi" as const,
              cost: spendAmount,
              purchasedAt: now,
            },
          ].slice(-100);
          const next = { ...s, points: Math.max(0, s.points - spendAmount), purchaseHistory };
          return { points: next.points, purchaseHistory, accounts: saveCurrentAccount(next) };
        });
        if (shouldUseServerEconomy()) {
          const key = idempotencyKey ?? `spend:${source}:${spendAmount}:${Date.now()}`;
          void serverSpendQi(spendAmount, source, key).then((result) => {
            if (!result.ok && !result.already_applied) {
              set((s) => {
                const next = { ...s, points: previousPoints };
                return { points: next.points, accounts: saveCurrentAccount(next) };
              });
              get().setEconomySyncMessage("Qi não confirmado pelo servidor.");
            }
          });
        }
        return true;
      },
      // Aliases legados: Qi era chamado de "points". Mantidos para compat.
      addPoints: (points) => get().addQi(points, "legacy"),
      spendPoints: (points) => get().spendQi(points, "legacy"),
      addXp: (amount, sourceKey) => {
        const inc = Math.max(0, Math.round(amount));
        if (inc <= 0) return;
        const key = sourceKey.trim();
        if (key.length < 3) return;
        set((s) => {
          const leaguePatch = settleLeagueWeek(s);
          const current = { ...s, ...leaguePatch };
          const base = activeXp(current);
          const nextXp: XpBuckets = {
            ...base,
            xpTotal: base.xpTotal + inc,
            xpToday: base.xpToday + inc,
            weeklyXp: base.weeklyXp + inc,
            monthlyXp: base.monthlyXp + inc,
          };
          const next = { ...current, ...nextXp };
          return { ...leaguePatch, ...nextXp, accounts: saveCurrentAccount(next) };
        });
        syncLeagueXpToServerAsync(inc, key);
      },
      getTodayXp: () => activeXp(get()).xpToday,
      getWeeklyXp: () => activeXp(get()).weeklyXp,
      getMonthlyXp: () => activeXp(get()).monthlyXp,
      economySummary: () => buildEconomySummary(get()),
      syncLeagueWeek: () =>
        set((s) => {
          const leaguePatch = settleLeagueWeek(s);
          const current = { ...s, ...leaguePatch };
          const joinedThisWeek = joinedLeagueThisWeek(current.leagueJoinedAt);
          const nextLeague =
            joinedThisWeek && current.leagueBots.length === 0
              ? joinLeaguePatch(current)
              : {
                  leagueTier: normalizeLeagueTier(current.leagueTier),
                  leagueJoinedAt: current.leagueJoinedAt,
                  leagueBots: current.leagueBots ?? [],
                  leagueHistory: current.leagueHistory ?? [],
                };
          const next = { ...current, ...nextLeague };
          return { ...leaguePatch, ...nextLeague, accounts: saveCurrentAccount(next) };
        }),
      getMissionAggregates: () => missionAggregates(get()),

      claimMission: (scope, missionId) => {
        const state = get();

        // Medalha do mês: exige a meta mensal batida e ainda não resgatada.
        if (scope === "monthly") {
          const month = activeMonthlyMission(state.monthlyMission);
          if (month.claimed || month.completed < MONTHLY_GOAL) return false;
          set((s) => {
            const m = activeMonthlyMission(s.monthlyMission);
            if (m.claimed || m.completed < MONTHLY_GOAL) return {};
            const label = monthlyMedalLabel(m.monthKey);
            const medal: Medal = {
              id: m.monthKey,
              monthKey: m.monthKey,
              label,
              emoji: medalEmoji(m.monthKey),
              earnedAt: Date.now(),
            };
            const medals = (s.medals ?? []).some((x) => x.id === medal.id)
              ? s.medals
              : [...(s.medals ?? []), medal];
            const points = Math.max(0, s.points + MONTHLY_MEDAL_REWARD.qi);
            const streakShields = s.streakShields + MONTHLY_MEDAL_REWARD.shield;
            const monthlyMission = { ...m, claimed: true };
            const historyEntry: MissionHistoryEntry = {
              id: `monthly:medal:${m.monthKey}`,
              scope: "monthly",
              missionId: "medal",
              title: label,
              xp: 0,
              qi: MONTHLY_MEDAL_REWARD.qi,
              charges: 0,
              claimedAt: Date.now(),
            };
            const missionHistory = [...(s.missionHistory ?? []), historyEntry].slice(-60);
            // Completar a missão mensal também rende um Baú Mensal para abrir.
            const chests = { ...s.chests, monthly: (s.chests?.monthly ?? 0) + 1 };
            const next = { ...s, medals, points, streakShields, monthlyMission, missionHistory, chests };
            return { medals, points, streakShields, monthlyMission, missionHistory, chests, accounts: saveCurrentAccount(next) };
          });
          return true;
        }

        // Missões diárias/semanais: precisam estar completas e não resgatadas.
        const def = findMissionDef(scope, missionId);
        if (!def) return false;
        // Missão premium: o resgate exige Pro (o progresso é visível a todos).
        if (def.pro && !hasProAccess(state)) return false;
        if (metricValue(def.metric, missionAggregates(state)) < def.goal) return false;
        const periodClaimed =
          scope === "daily"
            ? activeDailyMissions(state.dailyMissions).claimed
            : activeWeeklyMissions(state.weeklyMissions).claimed;
        if (periodClaimed[missionId]) return false;

        const xpInc = def.reward.xp ?? 0;
        const periodKeyForSync =
          scope === "daily" ? todayKey() : activeWeeklyMissions(state.weeklyMissions).weekKey;

        set((s) => {
          const date = todayKey();
          const day = activeDailyMissions(s.dailyMissions, date);
          const week = activeWeeklyMissions(s.weeklyMissions);
          const month = activeMonthlyMission(s.monthlyMission);
          const claimedMap = scope === "daily" ? day.claimed : week.claimed;
          if (claimedMap[missionId]) return {};

          const xpIncInner = def.reward.xp ?? 0;
          const baseQi = def.reward.qi ?? 0;
          const qiInc = hasProAccess(s)
            ? Math.round(baseQi * PRO_MISSION_QI_MULTIPLIER)
            : baseQi;
          const chargeInc = def.reward.charges ?? 0;

          const xpBase = activeXp(s);
          const nextXp: XpBuckets = {
            ...xpBase,
            xpTotal: xpBase.xpTotal + xpIncInner,
            xpToday: xpBase.xpToday + xpIncInner,
            weeklyXp: xpBase.weeklyXp + xpIncInner,
            monthlyXp: xpBase.monthlyXp + xpIncInner,
          };
          const points = Math.max(0, s.points + qiInc);
          let dailyEnergy = activeDailyEnergy(s.dailyEnergy, date);
          const chargesGranted = !hasProAccess(s) && chargeInc > 0;
          if (chargesGranted) {
            dailyEnergy = {
              ...dailyEnergy,
              charges: Math.min(dailyEnergy.maxCharges, dailyEnergy.charges + chargeInc),
            };
          }

          const dailyMissions =
            scope === "daily" ? { ...day, claimed: { ...day.claimed, [missionId]: true } } : day;
          const weeklyMissions =
            scope === "weekly" ? { ...week, claimed: { ...week.claimed, [missionId]: true } } : week;
          // Missão diária concluída soma +1 na missão mensal.
          const monthlyMission = scope === "daily" ? { ...month, completed: month.completed + 1 } : month;

          const periodKey = scope === "daily" ? date : week.weekKey;
          const historyEntry: MissionHistoryEntry = {
            id: `${scope}:${missionId}:${periodKey}`,
            scope,
            missionId,
            title: def.title,
            xp: xpIncInner,
            qi: qiInc,
            charges: chargesGranted ? chargeInc : 0,
            claimedAt: Date.now(),
          };
          const missionHistory = [...(s.missionHistory ?? []), historyEntry].slice(-60);

          const next = {
            ...s,
            ...nextXp,
            points,
            dailyEnergy,
            dailyMissions,
            weeklyMissions,
            monthlyMission,
            missionHistory,
          };
          return {
            ...nextXp,
            points,
            dailyEnergy,
            dailyMissions,
            weeklyMissions,
            monthlyMission,
            missionHistory,
            accounts: saveCurrentAccount(next),
          };
        });
        if (xpInc > 0) {
          syncLeagueXpToServerAsync(xpInc, leagueXpKeyMission(scope, missionId, periodKeyForSync));
        }
        if (shouldUseServerEconomy()) {
          const metric = metricValue(def.metric, missionAggregates(get()));
          const periodKey = scope === "daily" ? todayKey() : activeWeeklyMissions(get().weeklyMissions).weekKey;
          void serverClaimMission({ scope, missionId, periodKey, metricValue: metric });
        }
        return true;
      },
      createAccount: (rawName, rawEmail) => {
        const name = rawName.trim() || "Novo aluno";
        const email = rawEmail?.trim() || undefined;
        const id = `acc-${Date.now()}`;
        const account = makeAccount(
          id,
          name,
          { ...blankSnapshot(), lastActive: todayKey(), streak: 1, longestStreak: 1 },
          email,
          email ? "cloud_pending" : "local"
        );
        set((s) => ({
          ...accountFields(account),
          accountSetupComplete: true,
          currentAccountId: id,
          accounts: {
            ...saveCurrentAccount(s),
            [id]: account,
          },
        }));
        return id;
      },
      finishLocalOnboarding: (rawName, placement) =>
        // "Deixar para depois": segue como perfil local, com o nome informado.
        set((s) =>
          finalizeOnboardingState(s, {
            name: rawName.trim() || "Aluno Longyu",
            email: undefined,
            authMode: "local",
            placement,
          })
        ),
      createCloudAccountDraft: (rawName, rawEmail, placement) =>
        // "Criar conta e começar": guarda nome + email e marca "cloud_pending".
        // Reutiliza o MESMO perfil local (DEFAULT_ACCOUNT_ID), sem criar id órfão.
        // A senha NUNCA chega aqui — é validada e descartada na UI. Sincronização
        // de verdade (authMode "cloud") só quando o backend existir.
        set((s) =>
          finalizeOnboardingState(s, {
            name: rawName.trim() || "Aluno Longyu",
            email: rawEmail.trim() || undefined,
            authMode: "cloud_pending",
            placement,
          })
        ),
      attachEmailToLocalAccount: (rawEmail) =>
        // A partir do perfil: um usuário local informa email e a conta vira
        // "cloud_pending". Nada de senha é persistido aqui.
        set((s) => {
          const email = rawEmail.trim();
          if (!email) return {};
          const id = s.currentAccountId;
          const saved = saveCurrentAccount(s);
          const account = saved[id];
          if (!account) return {};
          return {
            accounts: {
              ...saved,
              [id]: { ...account, email, authMode: "cloud_pending", updatedAt: Date.now() },
            },
          };
        }),
      syncAccountWithCloudAuth: (rawEmail) =>
        set((s) => {
          const email = rawEmail.trim();
          if (!email) return {};
          const id = s.currentAccountId;
          const account = s.accounts[id];
          if (!account) return {};
          return {
            accounts: {
              ...s.accounts,
              [id]: { ...account, email, authMode: "cloud", updatedAt: Date.now() },
            },
            cloudSyncState: {
              status: "synced",
              message: "Conta em nuvem conectada neste dispositivo.",
              updatedAt: Date.now(),
            },
          };
        }),
      endCloudSession: () =>
        set((s) => {
          const id = s.currentAccountId;
          const account = s.accounts[id];
          if (!account || account.authMode !== "cloud") return {};
          return {
            accounts: {
              ...s.accounts,
              [id]: { ...account, authMode: "cloud_pending", updatedAt: Date.now() },
            },
            cloudSyncState: freshCloudSyncState(),
          };
        }),
      logout: () =>
        // Salva o progresso na conta atual e volta para o onboarding.
        set((s) => ({ accounts: saveCurrentAccount(s), accountSetupComplete: false, cloudSyncState: freshCloudSyncState() })),
      switchAccount: (id) =>
        set((s) => {
          if (id === s.currentAccountId) return {};
          const target = s.accounts[id];
          if (!target) return {};
          return {
            ...accountFields(target),
            accountSetupComplete: true,
            currentAccountId: id,
            accounts: saveCurrentAccount(s),
          };
        }),
      renameAccount: (id, rawName) =>
        set((s) => {
          const name = rawName.trim();
          const account = s.accounts[id];
          if (!account || !name) return {};
          return {
            accounts: {
              ...s.accounts,
              [id]: { ...account, name, updatedAt: Date.now() },
            },
          };
        }),
      updateAccount: (id, data) =>
        set((s) => {
          const account = s.accounts[id];
          if (!account) return {};
          const name = data.name?.trim();
          const email = data.email?.trim();
          return {
            accountSetupComplete: true,
            accounts: {
              ...s.accounts,
              [id]: {
                ...account,
                name: name || account.name,
                email: email || undefined,
                updatedAt: Date.now(),
              },
            },
          };
        }),
      applyPlacement: (completedLessonIds, placement) =>
        set((s) => {
          const date = todayKey();
          const today = s.today.date === date ? s.today : freshDay(date);
          const dailyTasks = activeDailyTasks(s.dailyTasks, date);
          const dailyEnergy = activeDailyEnergy(s.dailyEnergy, date);
          const completedLessons = normalizeCompletedLessons([...new Set(completedLessonIds)], s.lessonStarsById);
          const lessonStarsById = normalizeLessonStars(s.lessonStarsById, completedLessons);
          const next = {
            ...s,
            accountSetupComplete: true,
            completedLessons,
            lessonStarsById,
            placement,
            lastActive: date,
            streak: s.streak || 1,
            longestStreak: Math.max(s.longestStreak, s.streak || 1),
            today,
            dailyTasks,
            dailyEnergy,
          };
          return {
            accountSetupComplete: true,
            completedLessons: next.completedLessons,
            lessonStarsById,
            placement,
            lastActive: next.lastActive,
            streak: next.streak,
            longestStreak: next.longestStreak,
            today,
            dailyTasks,
            dailyEnergy,
            accounts: saveCurrentAccount(next),
          };
        }),

      ensureSrs: (type, itemId, track, reviewDomain) => {
        const key = makeKey(type, itemId, reviewDomain);
        const current = get().srs[key];
        if (current) {
          if ((track && !current.track) || (reviewDomain && !current.reviewDomain)) {
            set((s) => {
              const next = {
                ...s,
                srs: {
                  ...s.srs,
                  [key]: {
                    ...current,
                    track: current.track ?? track,
                    reviewDomain: current.reviewDomain ?? reviewDomain,
                  },
                },
              };
              return {
                srs: next.srs,
                accounts: saveCurrentAccount(next),
              };
            });
          }
          return;
        }
        set((s) => {
          const next = { ...s, srs: { ...s.srs, [key]: newItem(type, itemId, { track, reviewDomain }) } };
          return { srs: next.srs, accounts: saveCurrentAccount(next) };
        });
      },

      gradeSrs: (type, itemId, grade, track, reviewDomain) => {
        const key = makeKey(type, itemId, reviewDomain);
        const current = get().srs[key] ?? newItem(type, itemId, { track, reviewDomain });
        const item = {
          ...current,
          track: current.track ?? track,
          reviewDomain: current.reviewDomain ?? reviewDomain,
        };
        set((s) => {
          const next = { ...s, srs: { ...s.srs, [key]: review(item, grade) } };
          return { srs: next.srs, accounts: saveCurrentAccount(next) };
        });
        get().markLearned(type, itemId);
      },

      recordActivityError: (error) =>
        set((s) => {
          const previous = s.recentActivityErrors.find((item) => activityErrorKey(item) === activityErrorKey(error));
          const record: ActivityErrorRecord = {
            ...previous,
            ...error,
            id: error.id,
            exerciseId: error.exerciseId ?? error.questionId,
            timestamp: error.timestamp || Date.now(),
            wrongCount: (previous?.wrongCount ?? 0) + 1,
            correctionAttempts: previous?.correctionAttempts ?? 0,
            correctedSuccessDates: previous?.correctedSuccessDates ?? [],
            correctedAt: undefined,
            lastReviewedAt: previous?.lastReviewedAt,
            targets: mergeActivityTargets(previous?.targets ?? [], error.targets),
          };
          if (!record.id || !record.correctAnswer || record.targets.length === 0) return {};
          const recentActivityErrors = normalizeRecentActivityErrors([
            ...s.recentActivityErrors.filter((item) => activityErrorKey(item) !== activityErrorKey(record)),
            record,
          ]);
          const next = { ...s, recentActivityErrors };
          return { recentActivityErrors, accounts: saveCurrentAccount(next) };
        }),

      markActivityErrorCorrected: (errorId) =>
        set((s) => {
          const found = s.recentActivityErrors.some((error) => error.id === errorId && !error.correctedAt);
          if (!found) return {};
          const date = todayKey();
          const recentActivityErrors = s.recentActivityErrors.map((error) =>
            error.id === errorId
              ? {
                  ...error,
                  correctedAt: Date.now(),
                  lastReviewedAt: Date.now(),
                  correctionAttempts: (error.correctionAttempts ?? 0) + 1,
                  correctedSuccessDates: Array.from(new Set([...(error.correctedSuccessDates ?? []), date])).slice(-4),
                }
              : error
          );
          const next = { ...s, recentActivityErrors };
          return { recentActivityErrors, accounts: saveCurrentAccount(next) };
        }),

      recordActivityErrorReviewAttempt: (errorId) =>
        set((s) => {
          const found = s.recentActivityErrors.some((error) => error.id === errorId && !error.correctedAt);
          if (!found) return {};
          const recentActivityErrors = s.recentActivityErrors.map((error) =>
            error.id === errorId
              ? {
                  ...error,
                  correctionAttempts: (error.correctionAttempts ?? 0) + 1,
                  lastReviewedAt: Date.now(),
                }
              : error
          );
          const next = { ...s, recentActivityErrors };
          return { recentActivityErrors, accounts: saveCurrentAccount(next) };
        }),

      setCurrentLessonAttempt: (attempt) =>
        set((s) => {
          const currentLessonAttempt = normalizeCurrentLessonAttempt(attempt);
          const next = { ...s, currentLessonAttempt };
          return { currentLessonAttempt, accounts: saveCurrentAccount(next) };
        }),

      finishLessonAttempt: (attempt) =>
        set((s) => {
          const normalizedAttempt = normalizeCurrentLessonAttempt(attempt);
          if (!normalizedAttempt) return {};
          const lessonId = normalizedAttempt.lessonId;
          const previousAttempts = s.lessonAttemptsById[lessonId] ?? [];
          const lessonAttempts = [
            ...previousAttempts.filter((item) => item.id !== normalizedAttempt.id),
            normalizedAttempt,
          ].slice(-12);
          const lessonAttemptsById = {
            ...s.lessonAttemptsById,
            [lessonId]: lessonAttempts,
          };
          const currentStar = s.lessonStarsById[lessonId] ?? 0;
          const nextStar = currentStar === 3 ? 3 : Math.max(currentStar, normalizedAttempt.finalStars) as LessonStar;
          const lessonStarsById = nextStar > 0
            ? { ...s.lessonStarsById, [lessonId]: nextStar }
            : s.lessonStarsById;
          const currentLessonAttempt =
            s.currentLessonAttempt?.id === normalizedAttempt.id ? null : s.currentLessonAttempt;
          const next = { ...s, lessonAttemptsById, lessonStarsById, currentLessonAttempt };
          return { lessonAttemptsById, lessonStarsById, currentLessonAttempt, accounts: saveCurrentAccount(next) };
        }),

      setLessonStars: (lessonId, stars) =>
        set((s) => {
          const cleanId = lessonId.trim();
          if (!cleanId) return {};
          const nextStar = normalizeLessonStar(stars);
          const currentStar = s.lessonStarsById[cleanId] ?? 0;
          const lessonStarsById = nextStar > 0
            ? { ...s.lessonStarsById, [cleanId]: Math.max(currentStar, nextStar) as LessonStar }
            : { ...s.lessonStarsById };
          if (nextStar === 0) delete lessonStarsById[cleanId];
          const next = { ...s, lessonStarsById };
          return { lessonStarsById, accounts: saveCurrentAccount(next) };
        }),

      recordLessonMistake: (mistake) =>
        set((s) => {
          const [record] = normalizeLessonMistakes([mistake]);
          if (!record) return {};
          const mistakeHistory = normalizeLessonMistakes([
            ...s.mistakeHistory.filter((item) => item.id !== record.id),
            record,
          ]);
          const recentErrors = normalizeLessonMistakes([
            ...s.recentErrors.filter((item) => item.id !== record.id),
            record,
          ]).filter((error) => !error.recoveredAt);
          const next = { ...s, mistakeHistory, recentErrors };
          return { mistakeHistory, recentErrors, accounts: saveCurrentAccount(next) };
        }),

      markMistakeRecovered: (mistakeId) =>
        set((s) => {
          const recoveredAt = Date.now();
          const found =
            s.mistakeHistory.some((mistake) => mistake.id === mistakeId && !mistake.recoveredAt) ||
            s.recentErrors.some((mistake) => mistake.id === mistakeId && !mistake.recoveredAt);
          if (!found && s.correctedMistakes[mistakeId]) return {};
          const recover = (mistake: LessonMistakeRecord): LessonMistakeRecord =>
            mistake.id === mistakeId ? { ...mistake, recoveredAt: mistake.recoveredAt ?? recoveredAt } : mistake;
          const mistakeHistory = s.mistakeHistory.map(recover);
          const recentErrors = s.recentErrors.map(recover).filter((mistake) => !mistake.recoveredAt);
          const correctedMistakes = { ...s.correctedMistakes, [mistakeId]: s.correctedMistakes[mistakeId] ?? recoveredAt };
          const currentLessonAttempt = s.currentLessonAttempt
            ? {
                ...s.currentLessonAttempt,
                mistakes: s.currentLessonAttempt.mistakes.map(recover),
                recoveredMistakes: normalizeLessonMistakes([
                  ...s.currentLessonAttempt.recoveredMistakes,
                  ...s.currentLessonAttempt.mistakes.filter((mistake) => mistake.id === mistakeId).map(recover),
                ]),
              }
            : s.currentLessonAttempt;
          const lessonAttemptsById: Record<string, LessonAttemptRecord[]> = {};
          Object.entries(s.lessonAttemptsById).forEach(([lessonId, attempts]) => {
            lessonAttemptsById[lessonId] = attempts.map((attempt) => ({
              ...attempt,
              mistakes: attempt.mistakes.map(recover),
              recoveredMistakes: normalizeLessonMistakes([
                ...attempt.recoveredMistakes,
                ...attempt.mistakes.filter((mistake) => mistake.id === mistakeId).map(recover),
              ]),
            }));
          });
          const next = {
            ...s,
            mistakeHistory,
            recentErrors,
            correctedMistakes,
            currentLessonAttempt,
            lessonAttemptsById,
          };
          return {
            mistakeHistory,
            recentErrors,
            correctedMistakes,
            currentLessonAttempt,
            lessonAttemptsById,
            accounts: saveCurrentAccount(next),
          };
        }),

      recordToneTrainerAttempt: (attempt) =>
        set((s) => {
          const previous = s.toneTrainer[attempt.packId];
          const errorsByTone = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<MandarinTone, number>;
          for (const tone of MANDARIN_TONES) {
            errorsByTone[tone] = (previous?.errorsByTone?.[tone] ?? 0) + (attempt.errorsByTone[tone] ?? 0);
          }
          const previousBest = previous?.bestScore ?? -1;
          const isBest = attempt.correct > previousBest;
          const stats = {
            packId: attempt.packId,
            attempts: (previous?.attempts ?? 0) + 1,
            bestScore: Math.max(previous?.bestScore ?? 0, attempt.correct),
            bestTotal: isBest ? attempt.totalRounds : previous?.bestTotal ?? attempt.totalRounds,
            completed: Boolean(previous?.completed || attempt.passed),
            lastAttemptAt: Date.now(),
            totalRounds: (previous?.totalRounds ?? 0) + attempt.totalRounds,
            totalCorrect: (previous?.totalCorrect ?? 0) + attempt.correct,
            errorsByTone,
          };
          const toneTrainer = { ...s.toneTrainer, [attempt.packId]: stats };
          // Tons acertados alimentam a missão diária de tons.
          const date = todayKey();
          const tasks = activeDailyTasks(s.dailyTasks, date);
          const dailyTasks = {
            ...tasks,
            tonesTrained: tasks.tonesTrained + Math.max(0, attempt.correct),
          };
          const next = { ...s, toneTrainer, dailyTasks };
          return { toneTrainer, dailyTasks, accounts: saveCurrentAccount(next) };
        }),

      markLearned: (type, itemId) =>
        set((s) => {
          if (type === "chunk") {
            if (s.learnedChunks.includes(itemId)) return {};
            const next = { ...s, learnedChunks: [...s.learnedChunks, itemId] };
            return { learnedChunks: next.learnedChunks, accounts: saveCurrentAccount(next) };
          }
          // char e radical contam como "caractere reconhecido"
          if (s.learnedChars.includes(itemId)) return {};
          const next = { ...s, learnedChars: [...s.learnedChars, itemId] };
          return { learnedChars: next.learnedChars, accounts: saveCurrentAccount(next) };
        }),

      recordHanziBuilderResult: ({ character, correct, firstTry, level }) =>
        set((s) => {
          const key = character.trim();
          if (!key) return {};
          const prev = s.hanziBuilderProgressByChar[key] ?? {
            attempts: 0,
            correct: 0,
            firstTry: 0,
            lastLevelCompleted: 0,
            mastered: false,
          };
          const safeLevel = Math.max(0, Math.round(level || 0));
          const attempts = prev.attempts + 1;
          const correctCount = prev.correct + (correct ? 1 : 0);
          const firstTryCount = prev.firstTry + (correct && firstTry ? 1 : 0);
          const lastLevelCompleted = correct ? Math.max(prev.lastLevelCompleted, safeLevel) : prev.lastLevelCompleted;
          const entry: HanziBuilderCharProgress = {
            attempts,
            correct: correctCount,
            firstTry: firstTryCount,
            lastLevelCompleted,
            // Dominado: montou limpo o suficiente e já chegou a um nível sem molde.
            mastered: prev.mastered || (correctCount >= 3 && lastLevelCompleted >= 3),
          };
          const hanziBuilderProgressByChar = { ...s.hanziBuilderProgressByChar, [key]: entry };
          const next = { ...s, hanziBuilderProgressByChar };
          return { hanziBuilderProgressByChar, accounts: saveCurrentAccount(next) };
        }),

      addMinutes: (track, min) =>
        set((s) => {
          const date = todayKey();
          const today = s.today.date === date ? s.today : freshDay(date);
          const dailyTasks = activeDailyTasks(s.dailyTasks, date);
          const dailyEnergy = activeDailyEnergy(s.dailyEnergy, date);
          const next = { ...s, today: { ...today, [track]: today[track] + min }, dailyTasks, dailyEnergy };
          return { today: next.today, dailyTasks, dailyEnergy, accounts: saveCurrentAccount(next) };
        }),

      recordDailyTask: (task, amount = 1) =>
        set((s) => {
          const date = todayKey();
          const today = s.today.date === date ? s.today : freshDay(date);
          const dailyTasks = activeDailyTasks(s.dailyTasks, date);
          const dailyEnergy = activeDailyEnergy(s.dailyEnergy, date);
          const nextTasks = {
            ...dailyTasks,
            [task]: Math.max(0, dailyTasks[task] + amount),
          };
          let weeklyMissions = activeWeeklyMissions(s.weeklyMissions);
          if (task === "reviewsDone" && !weeklyMissions.reviewDays.includes(date)) {
            weeklyMissions = { ...weeklyMissions, reviewDays: [...weeklyMissions.reviewDays, date] };
          }
          if (task === "microtextsRead") {
            weeklyMissions = { ...weeklyMissions, microtexts: weeklyMissions.microtexts + Math.max(0, amount) };
          }
          // Contadores vitalícios espelham os diários, mas nunca zeram. Os
          // contadores de economia (erros corrigidos, gabaritos) são só do dia
          // — alimentam missões diárias, não medalhas vitalícias.
          const base = { ...freshLifetimeStats(), ...(s.lifetimeStats ?? {}) };
          const lifetimeStats: LifetimeStats = {
            ...base,
            reviewDays:
              task === "reviewsDone" && !base.reviewDays.includes(date)
                ? [...base.reviewDays, date]
                : base.reviewDays,
          };
          if (isLifetimeTaskKey(task)) {
            lifetimeStats[task] = Math.max(0, base[task] + Math.max(0, amount));
          }
          const next = { ...s, today, dailyTasks: nextTasks, dailyEnergy, weeklyMissions, lifetimeStats };
          return { today, dailyTasks: nextTasks, dailyEnergy, weeklyMissions, lifetimeStats, accounts: saveCurrentAccount(next) };
        }),

      completeImmersionSession: (sessionId, completion) => {
        const date = todayKey();
        const state = get();
        const current = activeImmersionDaily(state.immersionDaily, date);
        if (current.completedSessionIds.includes(sessionId)) return false;

        let xpToSync = 0;
        const syncKey = leagueXpKeyImmersion(sessionId, date);

        set((s) => {
          const leaguePatch = settleLeagueWeek(s);
          const currentState = { ...s, ...leaguePatch };
          const today = currentState.today.date === date ? currentState.today : freshDay(date);
          const dailyTasks = activeDailyTasks(currentState.dailyTasks, date);
          const dailyEnergy = activeDailyEnergy(currentState.dailyEnergy, date);
          const immersionDaily = activeImmersionDaily(currentState.immersionDaily, date);
          if (immersionDaily.completedSessionIds.includes(sessionId)) return {};

          const nextImmersion = {
            ...immersionDaily,
            completedSessionIds: [...immersionDaily.completedSessionIds, sessionId],
          };
          const nextTasks = {
            ...dailyTasks,
            audioHeard: dailyTasks.audioHeard + Math.max(0, completion.audioHeard),
            phrasesSpoken: dailyTasks.phrasesSpoken + Math.max(0, completion.phrasesSpoken ?? 0),
            microtextsRead: dailyTasks.microtextsRead + Math.max(0, completion.microtextsRead ?? 0),
          };
          const lifetimeBase = { ...freshLifetimeStats(), ...(currentState.lifetimeStats ?? {}) };
          const lifetimeStats: LifetimeStats = {
            ...lifetimeBase,
            audioHeard: lifetimeBase.audioHeard + Math.max(0, completion.audioHeard),
            phrasesSpoken: lifetimeBase.phrasesSpoken + Math.max(0, completion.phrasesSpoken ?? 0),
            microtextsRead: lifetimeBase.microtextsRead + Math.max(0, completion.microtextsRead ?? 0),
          };
          const nextToday = {
            ...today,
            som: today.som + Math.max(0, completion.somMinutes ?? 0),
            fala: today.fala + Math.max(0, completion.falaMinutes ?? 0),
            leitura: today.leitura + Math.max(0, completion.leituraMinutes ?? 0),
          };
          const reward: RewardGrant = {
            id: `immersion:${date}:${sessionId}:qi`,
            type: "qi",
            amount: Math.max(0, completion.rewardQi),
            source: completion.source,
          };
          const next = applyRewardToState({
            ...currentState,
            today: nextToday,
            dailyTasks: nextTasks,
            dailyEnergy,
            immersionDaily: nextImmersion,
            lifetimeStats,
          }, reward);

          const xpBase = activeXp(next);
          const xpInc = Math.max(0, Math.round(completion.rewardXp ?? 0));
          xpToSync = xpInc;
          const nextXp: XpBuckets = {
            ...xpBase,
            xpTotal: xpBase.xpTotal + xpInc,
            xpToday: xpBase.xpToday + xpInc,
            weeklyXp: xpBase.weeklyXp + xpInc,
            monthlyXp: xpBase.monthlyXp + xpInc,
          };
          const week = activeWeeklyMissions(currentState.weeklyMissions);
          const weeklyMissions: WeeklyMissionsState = {
            ...week,
            immersion: week.immersion + 1,
            microtexts: week.microtexts + Math.max(0, completion.microtextsRead ?? 0),
            premiumStories: week.premiumStories + (completion.isPremiumStory ? 1 : 0),
          };
          const withXp = { ...next, ...nextXp, weeklyMissions };

          return {
            ...leaguePatch,
            today: nextToday,
            dailyTasks: nextTasks,
            dailyEnergy,
            immersionDaily: nextImmersion,
            lifetimeStats,
            points: next.points,
            rewardHistory: next.rewardHistory,
            weeklyMissions,
            ...nextXp,
            accounts: saveCurrentAccount(withXp),
          };
        });

        if (xpToSync > 0) syncLeagueXpToServerAsync(xpToSync, syncKey);
        return true;
      },

      setLessonTaskProgress: (lessonId, completedTasks) =>
        set((s) => {
          const nextCount = Math.max(0, Math.round(completedTasks));
          if ((s.lessonTaskProgress[lessonId] ?? 0) === nextCount) return {};
          const lessonTaskProgress = { ...s.lessonTaskProgress, [lessonId]: nextCount };
          const next = { ...s, lessonTaskProgress };
          return { lessonTaskProgress, accounts: saveCurrentAccount(next) };
        }),

      toggleFavoriteItem: (key) =>
        set((s) => {
          const current = s.favoriteItems ?? [];
          const favoriteItems = current.includes(key)
            ? current.filter((item) => item !== key)
            : [...current, key];
          const next = { ...s, favoriteItems };
          return { favoriteItems, accounts: saveCurrentAccount(next) };
        }),

      unlockAchievement: (id, reward) => {
        const state = get();
        if ((state.achievementsUnlocked ?? {})[id] || (state.achievementHistory ?? []).some((entry) => entry.id === id)) {
          return false;
        }
        set((s) => {
          if ((s.achievementsUnlocked ?? {})[id] || (s.achievementHistory ?? []).some((entry) => entry.id === id)) {
            return {};
          }
          const unlockedAt = Date.now();
          const achievementsUnlocked = { ...(s.achievementsUnlocked ?? {}), [id]: unlockedAt };
          const achievementHistory = [
            { id, unlockedAt, reward },
            ...(s.achievementHistory ?? []).filter((entry) => entry.id !== id),
          ];
          let next: AppState = { ...s, achievementsUnlocked, achievementHistory };
          if (reward?.qi && reward.qi > 0) {
            next = applyRewardToState(next, {
              id: `achievement:${id}`,
              type: "qi",
              amount: reward.qi,
              source: "Medalha do Longyu",
            });
          }
          if (reward?.chest) {
            const chests = { ...freshChests(), ...(next.chests ?? {}) };
            next = { ...next, chests: { ...chests, [reward.chest]: (chests[reward.chest] ?? 0) + 1 } };
          }

          const patch: Partial<AppState> = {
            achievementsUnlocked,
            achievementHistory,
            accounts: saveCurrentAccount(next),
          };
          if (reward?.qi && reward.qi > 0) {
            patch.points = next.points;
            patch.rewardHistory = next.rewardHistory;
          }
          if (reward?.chest) {
            patch.chests = next.chests;
          }
          return patch;
        });
        void import("../data/achievements").then(({ ACHIEVEMENTS }) => {
          const def = ACHIEVEMENTS.find((item) => item.id === id);
          queueSocialFromApp("achievement", { id, title: def?.title ?? id });
        });
        return true;
      },

      claimReward: (reward) => {
        const state = get();
        if ((state.rewardHistory ?? []).some((entry) => entry.id === reward.id)) return false;
        set((s) => {
          const next = applyRewardToState(s, reward);
          return {
            points: next.points,
            dragonPearls: next.dragonPearls,
            streakShields: next.streakShields,
            badges: next.badges,
            // XP precisa ser persistido no estado raiz: sem isto, xpTotal/weeklyXp
            // continuavam 0 depois de concluir a lição ("+15 XP" com "total 0").
            xpTotal: next.xpTotal,
            xpToday: next.xpToday,
            weeklyXp: next.weeklyXp,
            monthlyXp: next.monthlyXp,
            xpDayKey: next.xpDayKey,
            xpWeekKey: next.xpWeekKey,
            xpMonthKey: next.xpMonthKey,
            dailyEnergy: next.dailyEnergy,
            rewardHistory: next.rewardHistory,
            accounts: saveCurrentAccount(next),
          };
        });
        if (reward.type === "xp" && reward.amount > 0) {
          syncLeagueXpToServerAsync(reward.amount, leagueXpKeyReward(reward.id));
        }
        return true;
      },

      grantLessonReward: ({ lessonId, attemptId, stars, noSkip }) => {
        const state = get();
        const rewardId = `lesson:${lessonId}:qi`;
        if ((state.rewardHistory ?? []).some((entry) => entry.id === rewardId)) return false;

        const qiAmount =
          stars >= 3
            ? LESSON_THREE_STAR_QI +
              (noSkip ? LESSON_NO_SKIP_QI : 0) +
              (hasProAccess(state) ? PRO_LESSON_QI_BONUS : 0)
            : 0;

        if (qiAmount <= 0) {
          if (shouldUseServerEconomy()) {
            void serverGrantLessonReward({ lessonId, attemptId, stars, noSkip });
          }
          return false;
        }

        const previousPoints = state.points;
        const claimed = get().claimReward({
          id: rewardId,
          type: "qi",
          amount: qiAmount,
          source: "Conclusão de lição",
        });
        if (!claimed) return false;

        if (shouldUseServerEconomy()) {
          void serverGrantLessonReward({ lessonId, attemptId, stars, noSkip }).then((result) => {
            if (!result.ok && !result.already_applied) {
              set((s) => {
                const rewardHistory = (s.rewardHistory ?? []).filter((entry) => entry.id !== rewardId);
                const next = { ...s, points: previousPoints, rewardHistory };
                return { points: previousPoints, rewardHistory, accounts: saveCurrentAccount(next) };
              });
              get().setEconomySyncMessage("Recompensa não confirmada pelo servidor.");
            }
          });
        }
        return true;
      },

      claimDailyMission: (missionId, rewards) => {
        const state = get();
        const date = todayKey();
        const dailyTasks = activeDailyTasks(state.dailyTasks, date);
        if (dailyTasks.claimedMissions[missionId]) return false;

        set((s) => {
          const today = s.today.date === date ? s.today : freshDay(date);
          const currentTasks = activeDailyTasks(s.dailyTasks, date);
          const dailyEnergy = activeDailyEnergy(s.dailyEnergy, date);
          let next = {
            ...s,
            today,
            dailyEnergy,
            dailyTasks: {
              ...currentTasks,
              claimedMissions: {
                ...currentTasks.claimedMissions,
                [missionId]: true,
              },
            },
          };

          for (const reward of rewards) next = applyRewardToState(next, reward);

          return {
            today,
            dailyTasks: next.dailyTasks,
            dailyEnergy: next.dailyEnergy,
            points: next.points,
            dragonPearls: next.dragonPearls,
            streakShields: next.streakShields,
            badges: next.badges,
            rewardHistory: next.rewardHistory,
            accounts: saveCurrentAccount(next),
          };
        });
        return true;
      },

      canBuyShopItem: (itemId) => {
        const item = findShopItem(itemId);
        if (!item) return false;
        return canPurchase(get(), item);
      },

      buyShopItem: (itemId) => {
        const item = findShopItem(itemId);
        if (!item) return false;
        if (!canPurchase(get(), item)) return false;
        set((s) => {
          if (!canPurchase(s, item)) return {};
          const balance = item.currency === "qi" ? s.points : s.dragonPearls;
          const purchase: PurchaseEntry = {
            id: `${item.id}:${Date.now()}`,
            itemId: item.id,
            name: item.name,
            currency: item.currency,
            cost: item.cost,
            purchasedAt: Date.now(),
          };
          const purchaseHistory = [...(s.purchaseHistory ?? []), purchase].slice(-100);
          const currencyPatch =
            item.currency === "qi"
              ? { points: Math.max(0, balance - item.cost) }
              : { dragonPearls: Math.max(0, balance - item.cost) };

          if (item.cosmetic) {
            const ownedCosmetics = (s.ownedCosmetics ?? []).includes(item.id)
              ? s.ownedCosmetics
              : [...(s.ownedCosmetics ?? []), item.id];
            const next = { ...s, ...currencyPatch, ownedCosmetics, purchaseHistory };
            return { ...currencyPatch, ownedCosmetics, purchaseHistory, accounts: saveCurrentAccount(next) };
          }

          // Baús comprados vão para o contador de baús (abertos com revelação),
          // não para o inventário de consumíveis.
          if (item.kind === "chest_small" || item.kind === "chest_dragon") {
            const chestType: ChestType = item.kind === "chest_small" ? "small" : "dragon";
            const chests = { ...s.chests, [chestType]: (s.chests?.[chestType] ?? 0) + 1 };
            const next = { ...s, ...currencyPatch, chests, purchaseHistory };
            return { ...currencyPatch, chests, purchaseHistory, accounts: saveCurrentAccount(next) };
          }

          const inventory = { ...s.inventory, [item.id]: (s.inventory[item.id] ?? 0) + 1 };
          const next = { ...s, ...currencyPatch, inventory, purchaseHistory };
          return { ...currencyPatch, inventory, purchaseHistory, accounts: saveCurrentAccount(next) };
        });
        return true;
      },

      useInventoryItem: (itemId) => {
        const item = findShopItem(itemId);
        if (!item) return null;
        if ((get().inventory[itemId] ?? 0) <= 0) return null;
        let result: ShopUseResult | null = null;
        set((s) => {
          const count = s.inventory[itemId] ?? 0;
          if (count <= 0) return {};
          const inventory = { ...s.inventory, [itemId]: count - 1 };

          if (item.kind === "charge") {
            const energy = activeDailyEnergy(s.dailyEnergy);
            const dailyEnergy = {
              ...energy,
              maxCharges: energy.maxCharges + 1,
              charges: energy.charges + 1,
            };
            result = { itemId, message: "+1 Carga do Dragão" };
            const next = { ...s, inventory, dailyEnergy };
            return { inventory, dailyEnergy, accounts: saveCurrentAccount(next) };
          }

          if (item.kind === "shield") {
            const streakShields = s.streakShields + 1;
            result = { itemId, message: "+1 Escudo de sequência" };
            const next = { ...s, inventory, streakShields };
            return { inventory, streakShields, accounts: saveCurrentAccount(next) };
          }

          if (item.kind === "focus_pass") {
            const base = s.focusPassUntil && s.focusPassUntil > Date.now() ? s.focusPassUntil : Date.now();
            const focusPassUntil = base + FOCUS_PASS_HOURS * 60 * 60 * 1000;
            result = { itemId, message: `Treino Focado ativo por ${FOCUS_PASS_HOURS}h` };
            const next = { ...s, inventory, focusPassUntil };
            return { inventory, focusPassUntil, accounts: saveCurrentAccount(next) };
          }

          if (item.kind === "qi_pack") {
            const next = applyRewardToState(
              { ...s, inventory },
              {
                id: `qi_pack:${Date.now()}:${s.rewardHistory?.length ?? 0}`,
                type: "qi",
                amount: QI_PACK_AMOUNT,
                source: "Pacote de Qi",
              }
            );
            result = { itemId, message: `+${QI_PACK_AMOUNT} Qi` };
            return {
              inventory,
              points: next.points,
              rewardHistory: next.rewardHistory,
              accounts: saveCurrentAccount(next),
            };
          }

          // breath / module_retry: consumidos no contexto certo (lição/teste).
          result = {
            itemId,
            message: item.kind === "breath" ? "Fôlego recuperado" : "Tentativa liberada",
          };
          const next = { ...s, inventory };
          return { inventory, accounts: saveCurrentAccount(next) };
        });
        return result;
      },

      addChest: (type, amount) =>
        set((s) => {
          const inc = Math.max(0, Math.round(amount));
          if (inc <= 0) return {};
          const chests = { ...s.chests, [type]: (s.chests?.[type] ?? 0) + inc };
          const next = { ...s, chests };
          return { chests, accounts: saveCurrentAccount(next) };
        }),

      generateChestReward: (type) => generateChestRewards(type, hasProAccess(get())),

      openChest: (type, openingId) => {
        if ((get().chests?.[type] ?? 0) <= 0) return null;
        const now = Date.now();
        const resolvedOpeningId = openingId ?? `chest:${type}:${now}:${get().chestOpenHistory?.length ?? 0}`;
        let openedRewards: ChestRewardItem[] | null = null;
        set((s) => {
          if ((s.chests?.[type] ?? 0) <= 0) return {};
          const rewards = generateChestRewards(type, hasProAccess(s));
          const chests = { ...s.chests, [type]: s.chests[type] - 1 };
          const openEntry: ChestOpenHistoryEntry = {
            id: resolvedOpeningId,
            type,
            openedAt: now,
          };
          let next: AppState = {
            ...s,
            chests,
            chestOpenHistory: [...(s.chestOpenHistory ?? []), openEntry].slice(-100),
          };
          rewards.forEach((reward, i) => {
            if (reward.kind === "breath") {
              next = applyBreathRewardToState(next, reward.amount);
              return;
            }
            if (reward.kind === "focus_pass") {
              next = applyFocusPassRewardToState(next, reward.amount);
              return;
            }
            next = applyRewardToState(next, {
              id: `chest:${type}:${now}:${i}`,
              type: CHEST_REWARD_TYPE[reward.kind],
              amount: reward.amount,
              source: CHEST_SOURCE[type],
            });
          });
          openedRewards = rewards;
          return {
            chests,
            chestOpenHistory: next.chestOpenHistory,
            points: next.points,
            dragonPearls: next.dragonPearls,
            streakShields: next.streakShields,
            inventory: next.inventory,
            xpTotal: next.xpTotal,
            xpToday: next.xpToday,
            weeklyXp: next.weeklyXp,
            monthlyXp: next.monthlyXp,
            xpDayKey: next.xpDayKey,
            xpWeekKey: next.xpWeekKey,
            xpMonthKey: next.xpMonthKey,
            dailyEnergy: next.dailyEnergy,
            rewardHistory: next.rewardHistory,
            accounts: saveCurrentAccount(next),
          };
        });
        if (shouldUseServerEconomy()) {
          void serverOpenChest(type, resolvedOpeningId);
        }
        return openedRewards;
      },

      openJourneyChest: (chestId, type) => {
        const cleanId = chestId.trim();
        if (!cleanId || (get().journeyChestsOpened ?? []).includes(cleanId)) return null;
        let openedRewards: ChestRewardItem[] | null = null;
        set((s) => {
          if ((s.journeyChestsOpened ?? []).includes(cleanId)) return {};
          const rewards = generateChestRewards(type, hasProAccess(s));
          const now = Date.now();
          const openEntry: ChestOpenHistoryEntry = {
            id: `journey-chest:${cleanId}`,
            type,
            openedAt: now,
          };
          let next: AppState = {
            ...s,
            journeyChestsOpened: [...(s.journeyChestsOpened ?? []), cleanId],
            chestOpenHistory: [...(s.chestOpenHistory ?? []), openEntry].slice(-100),
          };
          rewards.forEach((reward, i) => {
            if (reward.kind === "breath") {
              next = applyBreathRewardToState(next, reward.amount);
              return;
            }
            if (reward.kind === "focus_pass") {
              next = applyFocusPassRewardToState(next, reward.amount);
              return;
            }
            next = applyRewardToState(next, {
              id: `journey-chest:${cleanId}:${i}`,
              type: CHEST_REWARD_TYPE[reward.kind],
              amount: reward.amount,
              source: "Baú da jornada",
            });
          });
          openedRewards = rewards;
          return {
            journeyChestsOpened: next.journeyChestsOpened,
            chestOpenHistory: next.chestOpenHistory,
            points: next.points,
            dragonPearls: next.dragonPearls,
            streakShields: next.streakShields,
            inventory: next.inventory,
            xpTotal: next.xpTotal,
            xpToday: next.xpToday,
            weeklyXp: next.weeklyXp,
            monthlyXp: next.monthlyXp,
            xpDayKey: next.xpDayKey,
            xpWeekKey: next.xpWeekKey,
            xpMonthKey: next.xpMonthKey,
            dailyEnergy: next.dailyEnergy,
            rewardHistory: next.rewardHistory,
            accounts: saveCurrentAccount(next),
          };
        });
        return openedRewards;
      },

      getActiveDailyEnergy: () => activeDailyEnergy(get().dailyEnergy),

      hasFocusPass: () => {
        const state = get();
        return hasProAccess(state) || Boolean(state.focusPassUntil && state.focusPassUntil > Date.now());
      },

      validateModule: (unitId) =>
        set((s) => {
          const cleanId = unitId.trim();
          if (!cleanId || (s.validatedModules ?? []).includes(cleanId)) return {};
          const validatedModules = [...(s.validatedModules ?? []), cleanId];
          const next = { ...s, validatedModules };
          return { validatedModules, accounts: saveCurrentAccount(next) };
        }),

      recordModuleSkipAttempt: (unitId) =>
        set((s) => {
          const cleanId = unitId.trim();
          if (!cleanId) return {};
          const currentWeek = weekKey();
          const previous = s.moduleSkipUsage?.[cleanId];
          const attempts = previous?.weekKey === currentWeek ? previous.attempts + 1 : 1;
          const moduleSkipUsage = {
            ...(s.moduleSkipUsage ?? {}),
            [cleanId]: { weekKey: currentWeek, attempts },
          };
          const next = { ...s, moduleSkipUsage };
          return { moduleSkipUsage, accounts: saveCurrentAccount(next) };
        }),

      canStartActivity: (activityType) => {
        const state = get();
        if (hasProAccess(state) || !activityConsumesCharge(activityType)) return true;
        if (activityType === "extra_training" && get().hasFocusPass()) return true;
        return activeDailyEnergy(state.dailyEnergy).charges >= CHARGE_COST_ACTIVITY;
      },

      consumeCharge: (activityType, idempotencyKey) => {
        const state = get();
        if (hasProAccess(state) || !activityConsumesCharge(activityType)) return true;
        if (activityType === "extra_training" && get().hasFocusPass()) return true;
        const energy = activeDailyEnergy(state.dailyEnergy);
        if (energy.charges < CHARGE_COST_ACTIVITY) return false;
        const previousEnergy = { ...energy };
        set((s) => {
          const current = activeDailyEnergy(s.dailyEnergy);
          if (current.charges < CHARGE_COST_ACTIVITY) return {};
          const dailyEnergy = {
            ...current,
            charges: current.charges - CHARGE_COST_ACTIVITY,
            usedCharges: current.usedCharges + CHARGE_COST_ACTIVITY,
          };
          const next = { ...s, dailyEnergy };
          return { dailyEnergy, accounts: saveCurrentAccount(next) };
        });
        if (shouldUseServerEconomy()) {
          const key =
            idempotencyKey ??
            `consume:${activityType}:${todayKey()}:${previousEnergy.usedCharges + CHARGE_COST_ACTIVITY}`;
          void serverConsumeCharge(activityType, key).then((result) => {
            if (!result.ok && !result.already_applied && !result.skipped) {
              set((s) => {
                const next = { ...s, dailyEnergy: previousEnergy };
                return { dailyEnergy: previousEnergy, accounts: saveCurrentAccount(next) };
              });
              get().setEconomySyncMessage("Carga não confirmada pelo servidor.");
            }
          });
        }
        return true;
      },

      addCharges: (amount, source) => {
        const cleanSource = source.trim();
        if (amount <= 0 || !cleanSource) return false;
        const state = get();
        if (hasProAccess(state)) return false;
        const energy = activeDailyEnergy(state.dailyEnergy);
        if (energy.bonusChargesClaimed[cleanSource]) return false;
        const recoveredCharges = energy.charges < energy.maxCharges;
        set((s) => {
          const current = activeDailyEnergy(s.dailyEnergy);
          if (current.bonusChargesClaimed[cleanSource]) return {};
          const dailyEnergy = {
            ...current,
            charges: Math.min(current.maxCharges, current.charges + Math.max(0, Math.round(amount))),
            bonusChargesClaimed: {
              ...current.bonusChargesClaimed,
              [cleanSource]: true,
            },
          };
          const next = { ...s, dailyEnergy };
          return { dailyEnergy, accounts: saveCurrentAccount(next) };
        });
        return recoveredCharges;
      },

      grantStoryEnergy: (storyId) => {
        const clean = storyId.trim();
        const date = todayKey();
        const cap = STORY_ENERGY_DAILY_CAP;
        const prefix = `story-energy:${date}:`;
        const countStories = (claimed: Record<string, boolean>) =>
          Object.keys(claimed).filter((key) => key.startsWith(prefix)).length;
        const state = get();
        const energyNow = activeDailyEnergy(state.dailyEnergy, date);
        const grantedNow = countStories(energyNow.bonusChargesClaimed);
        // Pro tem cargas ilimitadas: não precisa (nem deve) farmar energia.
        if (hasProAccess(state)) return { granted: false, reason: "pro", grantedToday: grantedNow, cap };
        const rewardId = `${prefix}${clean}`;
        if (!clean || energyNow.bonusChargesClaimed[rewardId]) {
          return { granted: false, reason: "claimed", grantedToday: grantedNow, cap };
        }
        if (grantedNow >= cap) return { granted: false, reason: "limit", grantedToday: grantedNow, cap };

        let result: StoryEnergyResult = { granted: false, reason: "limit", grantedToday: grantedNow, cap };
        set((s) => {
          const current = activeDailyEnergy(s.dailyEnergy, date);
          const claimed = current.bonusChargesClaimed;
          const already = countStories(claimed);
          // rewardId idempotente: a mesma história no mesmo dia nunca dá 2×.
          if (claimed[rewardId]) {
            result = { granted: false, reason: "claimed", grantedToday: already, cap };
            return {};
          }
          if (already >= cap) {
            result = { granted: false, reason: "limit", grantedToday: already, cap };
            return {};
          }
          // Carga EXTRA de verdade: sobe o teto do dia junto (senão o clamp de
          // activeDailyEnergy devolveria a carga acima do máximo).
          const dailyEnergy: DailyEnergy = {
            ...current,
            maxCharges: current.maxCharges + 1,
            charges: current.charges + 1,
            bonusChargesClaimed: { ...claimed, [rewardId]: true },
          };
          result = { granted: true, reason: "granted", grantedToday: already + 1, cap };
          const next = { ...s, dailyEnergy };
          return { dailyEnergy, accounts: saveCurrentAccount(next) };
        });
        if (result.granted && shouldUseServerEconomy()) {
          void serverGrantStoryEnergy(clean, date);
        }
        return result;
      },

      getStoryEnergyStatus: () => {
        const state = get();
        const date = todayKey();
        const energy = activeDailyEnergy(state.dailyEnergy, date);
        const grantedToday = Object.keys(energy.bonusChargesClaimed).filter((key) =>
          key.startsWith(`story-energy:${date}:`)
        ).length;
        return {
          grantedToday,
          remaining: Math.max(0, STORY_ENERGY_DAILY_CAP - grantedToday),
          cap: STORY_ENERGY_DAILY_CAP,
          isPro: hasProAccess(state),
        };
      },

      refillDailyCharges: () =>
        set((s) => {
          const current = activeDailyEnergy(s.dailyEnergy);
          const dailyEnergy = { ...current, charges: current.maxCharges };
          const next = { ...s, dailyEnergy };
          return { dailyEnergy, accounts: saveCurrentAccount(next) };
        }),

      completeLesson: (id) => {
        const wasComplete = get().completedLessons.includes(id);
        set((s) => {
          const leaguePatch = settleLeagueWeek(s);
          const current = { ...s, ...leaguePatch };
          const currentStar = current.lessonStarsById[id] ?? 0;
          const lessonStarsById = { ...current.lessonStarsById, [id]: (currentStar > 0 ? currentStar : 3) as LessonStar };
          if (current.completedLessons.includes(id)) {
            const next = { ...current, lessonStarsById };
            return { ...leaguePatch, lessonStarsById, accounts: saveCurrentAccount(next) };
          }
          const leagueJoin = joinLeaguePatch(current);
          const week = activeWeeklyMissions(current.weeklyMissions);
          const weeklyMissions = { ...week, lessons: week.lessons + 1 };
          const next = {
            ...current,
            ...leagueJoin,
            completedLessons: [...current.completedLessons, id],
            lessonStarsById,
            weeklyMissions,
          };
          return {
            ...leaguePatch,
            ...leagueJoin,
            completedLessons: next.completedLessons,
            lessonStarsById,
            weeklyMissions,
            accounts: saveCurrentAccount(next),
          };
        });
        if (!wasComplete) {
          const lesson = ALL_LESSONS.find((item) => item.id === id);
          queueSocialFromApp("lesson_complete", {
            lessonId: id,
            lessonTitle: lesson?.title ?? id,
          });
        }
      },

      completeLessonViaTest: (id) => {
        const wasComplete = get().completedLessons.includes(id);
        set((s) => {
          const leaguePatch = settleLeagueWeek(s);
          const current = { ...s, ...leaguePatch };
          const lessonStarsById = { ...current.lessonStarsById, [id]: 1 as LessonStar };
          if (current.completedLessons.includes(id)) {
            const next = { ...current, lessonStarsById };
            return { ...leaguePatch, lessonStarsById, accounts: saveCurrentAccount(next) };
          }
          const leagueJoin = joinLeaguePatch(current);
          const week = activeWeeklyMissions(current.weeklyMissions);
          const weeklyMissions = { ...week, lessons: week.lessons + 1 };
          const next = {
            ...current,
            ...leagueJoin,
            completedLessons: [...current.completedLessons, id],
            lessonStarsById,
            weeklyMissions,
          };
          return {
            ...leaguePatch,
            ...leagueJoin,
            completedLessons: next.completedLessons,
            lessonStarsById,
            weeklyMissions,
            accounts: saveCurrentAccount(next),
          };
        });
        if (!wasComplete) {
          const lesson = ALL_LESSONS.find((item) => item.id === id);
          queueSocialFromApp("lesson_complete", {
            lessonId: id,
            lessonTitle: lesson?.title ?? id,
            viaTest: true,
          });
        }
      },

      registerActivity: () => {
        const prevStreak = get().streak;
        const prevLastActive = get().lastActive;
        set((s) => {
          const leaguePatch = settleLeagueWeek(s);
          const current = { ...s, ...leaguePatch };
          const t = todayKey();
          if (current.lastActive === t) return { ...leaguePatch, accounts: saveCurrentAccount(current) };
          let streak = 1;
          let streakShields = current.streakShields;
          if (current.lastActive) {
            const gap = daysBetween(current.lastActive, t);
            if (gap === 1) {
              streak = current.streak + 1;
            } else if (gap === 2 && streakShields > 0) {
              streak = current.streak + 1;
              streakShields -= 1;
            }
          }
          const today = current.today.date === t ? current.today : freshDay(t);
          const dailyTasks = activeDailyTasks(current.dailyTasks, t);
          const dailyEnergy = activeDailyEnergy(current.dailyEnergy, t);
          const longestStreak = Math.max(current.longestStreak, streak);
          return {
            ...leaguePatch,
            lastActive: t,
            streak,
            streakShields,
            longestStreak,
            today,
            dailyTasks,
            dailyEnergy,
            accounts: saveCurrentAccount({
              ...current,
              lastActive: t,
              streak,
              streakShields,
              longestStreak,
              today,
              dailyTasks,
              dailyEnergy,
            }),
          };
        });
        const next = get();
        if (next.lastActive !== prevLastActive && next.streak >= 2 && next.streak >= prevStreak) {
          queueSocialFromApp("streak", { days: next.streak, streak: next.streak });
        }
      },
    }),
    {
      name: "longyu-v1",
      version: 15,
      // v1: garante authMode em toda conta (com email → "cloud_pending", senão "local").
      // v2: separa XP do Qi. Contas antigas ganham os recortes de XP zerados
      //     (freshXp); o Qi acumulado continua em `points`, sem duplicar nada.
      // v3: adiciona o sistema de missões (diárias/semanais/mensal + medalhas)
      //     com estado zerado; nada de progresso antigo é perdido.
      // v4: adiciona a Loja (inventário, cosméticos e histórico de compras) vazios.
      // v5: adiciona o inventário de baús (small/dragon/monthly) zerado.
      // v6: adiciona ligas locais (tier, entrada semanal, bots simulados e historico).
      // v7: adiciona baus visuais da Jornada ja abertos.
      // v8: adiciona medalhas gerais (achievementsUnlocked) e contadores
      //     vitalicios (lifetimeStats), ambos zerados; nada antigo se perde.
      // v9: adiciona achievementHistory para auditoria rica de medalhas gerais.
      // v10: adiciona progresso do Tone Trainer por conta.
      // v11: adiciona histórico leve de erros recentes para revisão corretiva.
      // v13: adiciona progresso do HanziBuilder por caractere (guia/dificuldade).
      // v14: remove preview Pro persistido em produção e normaliza cargas ao plano grátis.
      // v15: adiciona moduleSkipUsage para cotas semanais do teste de pular.
      migrate: (persisted, version) => {
        const state = persisted as { accounts?: Record<string, LearningAccount> } | undefined;
        if (!state) return persisted as AppState;
        const accounts = state.accounts ?? {};
        const normalized: Record<string, LearningAccount> = {};
        for (const [id, account] of Object.entries(accounts)) {
          let migrated = account;
          if (version < 1) {
            migrated = {
              ...migrated,
              authMode: migrated.authMode ?? (migrated.email ? "cloud_pending" : "local"),
            };
          }
          if (version < 2) migrated = { ...freshXp(), ...migrated };
          if (version < 3) {
            migrated = {
              ...migrated,
              dailyMissions: migrated.dailyMissions ?? freshDailyMissions(),
              weeklyMissions: migrated.weeklyMissions ?? freshWeeklyMissions(),
              monthlyMission: migrated.monthlyMission ?? freshMonthlyMission(),
              missionHistory: migrated.missionHistory ?? [],
              medals: migrated.medals ?? [],
            };
          }
          if (version < 4) {
            migrated = {
              ...migrated,
              inventory: migrated.inventory ?? {},
              ownedCosmetics: migrated.ownedCosmetics ?? [],
              purchaseHistory: migrated.purchaseHistory ?? [],
            };
          }
          if (version < 5) {
            migrated = { ...migrated, chests: migrated.chests ?? freshChests() };
          }
          if (version < 6) {
            migrated = {
              ...migrated,
              leagueTier: normalizeLeagueTier(migrated.leagueTier),
              leagueJoinedAt: migrated.leagueJoinedAt ?? null,
              leagueBots: migrated.leagueBots ?? [],
              leagueHistory: migrated.leagueHistory ?? [],
            };
          }
          if (version < 7) {
            migrated = {
              ...migrated,
              journeyChestsOpened: migrated.journeyChestsOpened ?? [],
            };
          }
          if (version < 8) {
            migrated = {
              ...migrated,
              dailyEnergy: activeDailyEnergy(migrated.dailyEnergy),
              chestOpenHistory: migrated.chestOpenHistory ?? [],
              lifetimeStats: { ...freshLifetimeStats(), ...(migrated.lifetimeStats ?? {}) },
              achievementsUnlocked: migrated.achievementsUnlocked ?? {},
            };
          }
          if (version < 9) {
            migrated = {
              ...migrated,
              achievementHistory: migrated.achievementHistory ?? [],
            };
          }
          if (version < 10) {
            migrated = {
              ...migrated,
              toneTrainer: migrated.toneTrainer ?? {},
            };
          }
          if (version < 11) {
            migrated = {
              ...migrated,
              recentActivityErrors: [],
            };
          }
          if (version < 12) {
            const completedLessons = normalizeCompletedLessons(migrated.completedLessons, migrated.lessonStarsById);
            migrated = {
              ...migrated,
              completedLessons,
              lessonStarsById: normalizeLessonStars(migrated.lessonStarsById, completedLessons),
              lessonAttemptsById: normalizeLessonAttempts(migrated.lessonAttemptsById),
              currentLessonAttempt: normalizeCurrentLessonAttempt(migrated.currentLessonAttempt),
              mistakeHistory: normalizeLessonMistakes(migrated.mistakeHistory),
              correctedMistakes: normalizeCorrectedMistakes(migrated.correctedMistakes, migrated.mistakeHistory),
              recentErrors: normalizeLessonMistakes(migrated.recentErrors).filter((error) => !error.recoveredAt),
            };
          }
          // v14: no plano grátis (preview removido), zera isPremium e reconcilia
          // a energia. O reconcile precisa vir na normalização final abaixo,
          // senão o activeDailyEnergy o sobrescreveria e o teto inflado ("quase
          // infinito") sobreviveria nas contas guardadas.
          const stripAccountPreview = version < 14 && !isDevPreviewAllowed();
          if (stripAccountPreview) {
            migrated = { ...migrated, isPremium: false };
          }
          if (version < 15) {
            migrated = {
              ...migrated,
              moduleSkipUsage: migrated.moduleSkipUsage ?? {},
            };
          }
          const completedLessons = normalizeCompletedLessons(migrated.completedLessons, migrated.lessonStarsById);
          migrated = {
            ...migrated,
            completedLessons,
            lessonStarsById: normalizeLessonStars(migrated.lessonStarsById, completedLessons),
            lessonAttemptsById: normalizeLessonAttempts(migrated.lessonAttemptsById),
            currentLessonAttempt: normalizeCurrentLessonAttempt(migrated.currentLessonAttempt),
            mistakeHistory: normalizeLessonMistakes(migrated.mistakeHistory),
            correctedMistakes: normalizeCorrectedMistakes(migrated.correctedMistakes, migrated.mistakeHistory),
            recentErrors: normalizeLessonMistakes(migrated.recentErrors).filter((error) => !error.recoveredAt),
            toneTrainer: migrated.toneTrainer ?? {},
            recentActivityErrors: normalizeRecentActivityErrors(migrated.recentActivityErrors),
            dailyEnergy: stripAccountPreview
              ? reconcileFreePlanEnergy(migrated.dailyEnergy)
              : activeDailyEnergy(migrated.dailyEnergy),
            chestOpenHistory: migrated.chestOpenHistory ?? [],
            lifetimeStats: { ...freshLifetimeStats(), ...(migrated.lifetimeStats ?? {}) },
            hanziBuilderProgressByChar: normalizeHanziBuilderProgress(migrated.hanziBuilderProgressByChar),
            ...normalizeAchievementState(migrated.achievementsUnlocked, migrated.achievementHistory),
          };
          normalized[id] = migrated;
        }
        const root = state as Partial<AppState>;
        const rootAchievements = normalizeAchievementState(root.achievementsUnlocked, root.achievementHistory);
        const rootCompletedLessons = normalizeCompletedLessons(root.completedLessons, root.lessonStarsById);
        const stripPreview = version < 14 && !isDevPreviewAllowed();
        const rootDailyEnergy = stripPreview
          ? reconcileFreePlanEnergy(root.dailyEnergy)
          : activeDailyEnergy(root.dailyEnergy);
        const currentAccountId = root.currentAccountId ?? DEFAULT_ACCOUNT_ID;
        const grantInternalPro =
          root.serverIsPro === true ||
          hasInternalTestCloudAccount({ accounts: normalized, currentAccountId });
        return {
          ...root,
          serverIsPro: grantInternalPro,
          isPremium: stripPreview ? false : root.isPremium,
          leagueTier: normalizeLeagueTier(root.leagueTier),
          leagueJoinedAt: root.leagueJoinedAt ?? null,
          leagueBots: root.leagueBots ?? [],
          leagueHistory: root.leagueHistory ?? [],
          journeyChestsOpened: root.journeyChestsOpened ?? [],
          completedLessons: rootCompletedLessons,
          lessonStarsById: normalizeLessonStars(root.lessonStarsById, rootCompletedLessons),
          lessonAttemptsById: normalizeLessonAttempts(root.lessonAttemptsById),
          currentLessonAttempt: normalizeCurrentLessonAttempt(root.currentLessonAttempt),
          mistakeHistory: normalizeLessonMistakes(root.mistakeHistory),
          correctedMistakes: normalizeCorrectedMistakes(root.correctedMistakes, root.mistakeHistory),
          recentErrors: normalizeLessonMistakes(root.recentErrors).filter((error) => !error.recoveredAt),
          toneTrainer: root.toneTrainer ?? {},
          recentActivityErrors: normalizeRecentActivityErrors(root.recentActivityErrors),
          chestOpenHistory: root.chestOpenHistory ?? [],
          dailyEnergy: rootDailyEnergy,
          lifetimeStats: { ...freshLifetimeStats(), ...(root.lifetimeStats ?? {}) },
          hanziBuilderProgressByChar: normalizeHanziBuilderProgress(root.hanziBuilderProgressByChar),
          ...rootAchievements,
          moduleSkipUsage: root.moduleSkipUsage ?? {},
          accounts: normalized,
        } as AppState;
      },
    }
  )
);
