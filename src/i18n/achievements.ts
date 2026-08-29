import type { AchievementCategory } from "../data/achievements";
import type { AchievementReward } from "../lib/store";
import { t } from "./catalog";
import type { SupportedLocale } from "./config";
import { getInterfaceLocale } from "./locale";

/** Canonical stored badge identity. Never rename — existing users already hold this string. */
export const ACCURACY_SERENE_BADGE = "Precisão Serena";
export const ACCURACY_SERENE_REWARD_ID = "badge:precisao-serena";
export const ACCURACY_SERENE_LOC_ID = "accuracy-serene";

const LESSON_COMPLETE_SOURCE = "Conclusão de lição";
const DAILY_GOAL_SOURCE = "Meta diária";
const STREAK_PROTECTED_SOURCE = "Sequência protegida";

function resolveLocale(locale?: SupportedLocale): SupportedLocale {
  return locale ?? getInterfaceLocale();
}

export function localizedAchievementTitle(
  id: string,
  fallback: string,
  locale?: SupportedLocale
): string {
  const key = `achievements.${id}.title`;
  const value = t(key, {}, resolveLocale(locale));
  return value === key ? fallback : value;
}

export function localizedAchievementDesc(
  id: string,
  fallback: string,
  locale?: SupportedLocale
): string {
  const key = `achievements.${id}.desc`;
  const value = t(key, {}, resolveLocale(locale));
  return value === key ? fallback : value;
}

export function localizedAchievementCategory(
  category: AchievementCategory,
  locale?: SupportedLocale
): string {
  return t(`achievements.category.${category}`, {}, resolveLocale(locale));
}

export function localizedAchievementReward(
  reward: AchievementReward,
  locale?: SupportedLocale
): string {
  const loc = resolveLocale(locale);
  if (reward.chest === "dragon") return t("achievements.reward.rareChest", {}, loc);
  if (reward.chest === "small") return t("achievements.reward.commonChest", {}, loc);
  if (reward.chest === "monthly") return t("achievements.reward.epicChest", {}, loc);
  if (reward.qi) return `+${reward.qi} Qi`;
  return t("achievements.reward.medal", {}, loc);
}

export function localizedBadgeTitle(sourceOrId: string, locale?: SupportedLocale): string {
  if (
    sourceOrId === ACCURACY_SERENE_BADGE ||
    sourceOrId === ACCURACY_SERENE_REWARD_ID ||
    sourceOrId === ACCURACY_SERENE_LOC_ID
  ) {
    return t("achievements.accuracy-serene.title", {}, resolveLocale(locale));
  }
  return sourceOrId;
}

export function localizedRewardSource(source: string, locale?: SupportedLocale): string {
  const loc = resolveLocale(locale);
  if (source === LESSON_COMPLETE_SOURCE) return t("player.rewardSourceLesson", {}, loc);
  if (source === DAILY_GOAL_SOURCE) return t("player.rewardSourceDailyGoal", {}, loc);
  if (source === STREAK_PROTECTED_SOURCE) return t("player.rewardSourceStreakProtected", {}, loc);
  return localizedBadgeTitle(source, loc);
}
