import { useMemo } from "react";
import { useStore } from "../lib/store";
import { dueItems } from "../lib/srs";
import {
  getLearnerProfile,
  type LearnerProfile,
  type LearnerStageContext,
} from "../lib/learnerStage";

/**
 * Perfil de estágio derivado do estado do store (sem nova fonte de verdade).
 * Reúne os sinais já persistidos e delega o cálculo a `getLearnerProfile`.
 */
export function useLearnerProfile(): LearnerProfile {
  const completedLessons = useStore((s) => s.completedLessons);
  const srs = useStore((s) => s.srs);
  const medals = useStore((s) => s.medals);
  const leagueJoinedAt = useStore((s) => s.leagueJoinedAt);
  const streak = useStore((s) => s.streak);

  return useMemo(() => {
    const ctx: LearnerStageContext = {
      completedLessons,
      srsDueCount: dueItems(srs).length,
      srsTotalCount: Object.keys(srs).length,
      medalsCount: medals.length,
      leagueJoined: leagueJoinedAt != null,
      streak,
    };
    return getLearnerProfile(ctx);
  }, [completedLessons, srs, medals.length, leagueJoinedAt, streak]);
}
