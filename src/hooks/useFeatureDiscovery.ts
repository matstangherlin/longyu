import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { useLearnerProfile } from "./useLearnerProfile";
import { isFeatureNewlyRelevant, type FeatureId } from "../lib/learnerStage";
import {
  getSeenIntros,
  initializeDiscovery,
  isDiscoveryInitialized,
  markIntroSeen,
} from "../lib/featureDiscovery";

export interface DiscoveryCopy {
  id: FeatureId;
  title: string;
  desc: string;
  cta: string;
  to: string;
}

// Conjunto curado de anúncios: um por transição de estágio importante, para
// não cansar o aluno. As demais áreas aparecem com estado no menu "Mais".
export const DISCOVERY_FEATURES: readonly FeatureId[] = ["treino", "pinyin", "hanzi", "leitura", "missoes"];

const DISCOVERY_COPY: Record<string, Omit<DiscoveryCopy, "id">> = {
  treino: {
    title: "Você liberou o Treino",
    desc: "Agora dá para praticar cada competência à vontade, no seu ritmo.",
    cta: "Abrir Treino",
    to: "/treino",
  },
  pinyin: {
    title: "Você liberou o Pinyin Lab",
    desc: "Explore sons, sílabas e os quatro tons sempre que quiser.",
    cta: "Abrir Pinyin",
    to: "/pinyin",
  },
  hanzi: {
    title: "Você liberou o Hànzì",
    desc: "Descubra os caracteres como peças lógicas e monte sua Biblioteca.",
    cta: "Abrir Hànzì",
    to: "/ideogramas",
  },
  leitura: {
    title: "Você liberou a Leitura",
    desc: "Leia textos guiados, palavra a palavra, com apoio de áudio.",
    cta: "Abrir Leitura",
    to: "/leitura",
  },
  missoes: {
    title: "Missões em destaque",
    desc: "Metas curtas e recompensas ajudam a manter o ritmo diário.",
    cta: "Ver Missões",
    to: "/missoes",
  },
};

/**
 * Retorna a próxima área a ser apresentada (uma por vez, dispensável e
 * persistida) ou `null`. Faz a semente única de migração para não bombardear
 * usuários antigos com anúncios do que já usam.
 */
export function useFeatureDiscovery(): { announcement: DiscoveryCopy | null; dismiss: () => void } {
  const completedLessons = useStore((s) => s.completedLessons);
  const profile = useLearnerProfile();
  const [tick, setTick] = useState(0);

  // Semente única: marca como visto tudo que já é relevante agora.
  useEffect(() => {
    if (isDiscoveryInitialized()) return;
    const alreadyRelevant = DISCOVERY_FEATURES.filter((id) =>
      isFeatureNewlyRelevant(id, completedLessons, profile.learningStage)
    );
    initializeDiscovery(alreadyRelevant);
    setTick((t) => t + 1);
  }, [completedLessons, profile.learningStage]);

  const announcement = useMemo<DiscoveryCopy | null>(() => {
    void tick;
    if (!isDiscoveryInitialized()) return null;
    const seen = getSeenIntros();
    const next = DISCOVERY_FEATURES.find(
      (id) => isFeatureNewlyRelevant(id, completedLessons, profile.learningStage) && !seen.has(id)
    );
    if (!next) return null;
    return { id: next, ...DISCOVERY_COPY[next] };
  }, [completedLessons, profile.learningStage, tick]);

  const dismiss = useCallback(() => {
    if (announcement) markIntroSeen(announcement.id);
    setTick((t) => t + 1);
  }, [announcement]);

  return { announcement, dismiss };
}
