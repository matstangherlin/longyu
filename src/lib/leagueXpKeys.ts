import { weekKey, todayKey } from "./storage";

/** Chave determinística para XP de lição (idempotente por tentativa). */
export function leagueXpKeyLesson(lessonId: string, attemptId: string): string {
  return `lesson:${lessonId}:attempt:${attemptId}`;
}

/** Chave para revisão corretiva de um erro. */
export function leagueXpKeyReview(errorId: string, date = todayKey()): string {
  return `review:${errorId}:${date}`;
}

/** Chave para sessão de imersão ou história. */
export function leagueXpKeyImmersion(sessionId: string, date = todayKey()): string {
  const clean = sessionId.replace(/^story:/, "");
  if (sessionId.startsWith("story:")) {
    return `story:${clean}:first-completion`;
  }
  return `immersion:${sessionId}:${date}`;
}

/** Chave para missão resgatada. */
export function leagueXpKeyMission(scope: string, missionId: string, periodKey: string): string {
  return `mission:${scope}:${missionId}:${periodKey}`;
}

/** Chave para atividades extras (fala, hanzi, revisão em lote). */
export function leagueXpKeyActivity(activity: string, sessionId: string): string {
  return `activity:${activity}:${sessionId}`;
}

/** Chave de recompensa genérica (baú, medalha) — usa o id do reward. */
export function leagueXpKeyReward(rewardId: string): string {
  return rewardId.trim();
}

/** Reconciliação única ao entrar na nuvem (semana corrente). */
export function leagueXpKeyBackfill(week = weekKey()): string {
  return `backfill:week:${week}`;
}
