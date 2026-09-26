import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { useIsPro } from "../lib/proAccess";
import { listPhaseChallengeTargets } from "../lib/phaseChallenge";
import {
  DISCOVERY_FEATURE_ORDER,
  featureVisibilityMap,
  mergeStickyVisibility,
  type DiscoveryFeatureId,
  type DiscoveryLearnerState,
  type FeatureVisibilityMap,
} from "../lib/progressiveDiscovery";

/**
 * Monta o estado mínimo das regras a partir do store — nenhum campo novo de
 * progresso. Plano Pro NÃO entra aqui (só a lista de alvos do Desafio de Fase
 * usa o acesso a conteúdo premium, como a Jornada já faz).
 */
export function useDiscoveryLearnerState(): DiscoveryLearnerState {
  const completedLessons = useStore((s) => s.completedLessons) ?? [];
  const srs = useStore((s) => s.srs) ?? {};
  const learnedChars = useStore((s) => s.learnedChars) ?? [];
  const learnedChunks = useStore((s) => s.learnedChunks) ?? [];
  const cultureCompletedIds = useStore((s) => s.cultureCompletedIds) ?? [];
  const cultureStartedIds = useStore((s) => s.cultureStartedIds) ?? [];
  const cultureMasteryById = useStore((s) => s.cultureMasteryById) ?? {};
  const cultureSeals = useStore((s) => s.cultureSeals) ?? [];
  const medals = useStore((s) => s.medals) ?? [];
  const achievementsUnlocked = useStore((s) => s.achievementsUnlocked) ?? {};
  const leagueJoinedAt = useStore((s) => s.leagueJoinedAt);
  const points = useStore((s) => s.points) ?? 0;
  const dragonPearls = useStore((s) => s.dragonPearls) ?? 0;
  const rewardHistory = useStore((s) => s.rewardHistory) ?? [];
  const purchaseHistory = useStore((s) => s.purchaseHistory) ?? [];
  const missionHistory = useStore((s) => s.missionHistory) ?? [];
  const conversationHistory = useStore((s) => s.conversationHistory) ?? [];
  const recentConversationSceneIds = useStore((s) => s.recentConversationSceneIds) ?? [];
  const isPremium = useIsPro();

  return useMemo(() => {
    const phaseTargets = listPhaseChallengeTargets({
      completedLessons,
      cultureCompletedIds,
      cultureMasteryById,
      cultureSeals,
      isPremium,
    });
    return {
      completedLessons,
      srsItemCount: Object.keys(srs).length,
      learnedChars,
      learnedChunks,
      cultureTouched:
        cultureCompletedIds.length > 0 ||
        cultureStartedIds.length > 0 ||
        Object.keys(cultureMasteryById).length > 0 ||
        cultureSeals.length > 0,
      achievementsCount: Object.keys(achievementsUnlocked).length + medals.length,
      leagueJoined: leagueJoinedAt != null,
      economyIntroduced:
        points > 0 ||
        dragonPearls > 0 ||
        purchaseHistory.length > 0 ||
        missionHistory.some((entry) => entry.qi > 0) ||
        rewardHistory.some((entry) => entry.type === "qi" || entry.type === "dragonPearl"),
      conversationsDone: Math.max(conversationHistory.length, recentConversationSceneIds.length),
      phaseChallengeEligible: phaseTargets.some((target) => target.eligible),
    } satisfies DiscoveryLearnerState;
  }, [
    completedLessons,
    srs,
    learnedChars,
    learnedChunks,
    cultureCompletedIds,
    cultureStartedIds,
    cultureMasteryById,
    cultureSeals,
    medals,
    achievementsUnlocked,
    leagueJoinedAt,
    points,
    dragonPearls,
    rewardHistory,
    purchaseHistory,
    missionHistory,
    conversationHistory,
    recentConversationSceneIds,
    isPremium,
  ]);
}

/**
 * PART DJ/DK — memória de SESSÃO (RAM) do que já apareceu, por conta: a aba
 * não some e volta enquanto o sync hidrata. Não é persistida — a verdade
 * continua sendo o progresso derivado.
 */
const confirmedByAccount = new Map<string, Set<DiscoveryFeatureId>>();

function confirmedFor(accountId: string): Set<DiscoveryFeatureId> {
  let set = confirmedByAccount.get(accountId);
  if (!set) {
    set = new Set();
    confirmedByAccount.set(accountId, set);
  }
  return set;
}

export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useStore.persist?.hasHydrated?.() ?? true);
  useEffect(() => {
    if (hydrated) return undefined;
    const unsub = useStore.persist?.onFinishHydration?.(() => setHydrated(true));
    if (useStore.persist?.hasHydrated?.()) setHydrated(true);
    return () => unsub?.();
  }, [hydrated]);
  return hydrated;
}

export interface FeatureVisibilityResult {
  visibility: FeatureVisibilityMap;
  /** false até o store local hidratar: a navegação não "pisca" abas. */
  ready: boolean;
  learner: DiscoveryLearnerState;
}

export function useFeatureVisibility(): FeatureVisibilityResult {
  const learner = useDiscoveryLearnerState();
  const accountId = useStore((s) => s.currentAccountId) ?? "local";
  const ready = useStoreHydrated();

  const visibility = useMemo(() => {
    const derived = featureVisibilityMap(learner);
    const confirmed = confirmedFor(accountId);
    if (ready) {
      for (const id of DISCOVERY_FEATURE_ORDER) if (derived[id] === "AVAILABLE") confirmed.add(id);
    }
    return mergeStickyVisibility(derived, confirmed);
  }, [learner, accountId, ready]);

  return { visibility, ready, learner };
}

/** Só para testes de unidade/QA: zera a memória de sessão. */
export function resetFeatureVisibilitySessionForTests(): void {
  confirmedByAccount.clear();
}
