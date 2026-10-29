import { buildMissionViews, isMissionActionable, type MissionView } from "../data/missions";
import { chargeRefillClockLabel, nextChargeRefillAt } from "../lib/energyPolicy";
import { shouldUseServerEconomy } from "../lib/economyServerBridge";
import { useIsPro } from "../lib/proAccess";
import { useStore } from "../lib/store";

/**
 * LGY-034 — horário em que as Cargas voltam, no relógio do aparelho. Conta na
 * nuvem segue o dia do servidor (UTC); conta local, a meia-noite local.
 */
export function chargeRefillTime(now: Date = new Date()): string {
  return chargeRefillClockLabel(nextChargeRefillAt(now, shouldUseServerEconomy() ? "utc" : "local"));
}

export interface ChargeRecovery {
  /** "HH:MM" da próxima recarga. */
  refillTime: string;
  /** Missão que devolve Cargas, completa e ainda não resgatada. */
  claimableMission: MissionView | null;
  /** Missão que devolve Cargas e ainda está em andamento. */
  openMission: MissionView | null;
}

/** O que o aluno sem Cargas pode fazer para ter Carga de novo, e quando. */
export function useChargeRecovery(): ChargeRecovery {
  const isPro = useIsPro();
  const aggregates = useStore((s) => s.getMissionAggregates());
  const dailyClaimed = useStore((s) => s.dailyMissions.claimed);
  const weeklyClaimed = useStore((s) => s.weeklyMissions.claimed);
  // Lido aqui para recalcular o horário quando a conta muda (local ↔ nuvem).
  useStore((s) => s.currentAccountId);
  const chargeMissions = [
    ...buildMissionViews("daily", aggregates, dailyClaimed),
    ...buildMissionViews("weekly", aggregates, weeklyClaimed),
  ].filter((mission) => (mission.reward.charges ?? 0) > 0 && !mission.claimed && isMissionActionable(mission, isPro));
  return {
    refillTime: chargeRefillTime(),
    claimableMission: chargeMissions.find((mission) => mission.complete) ?? null,
    openMission: chargeMissions.find((mission) => !mission.complete) ?? null,
  };
}
