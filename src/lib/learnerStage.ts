/**
 * learnerStage — divulgação progressiva derivada de dados que já existem.
 *
 * NÃO é uma segunda fonte de verdade: o estágio e a disponibilidade de cada
 * área são calculados a partir de `completedLessons`, do SRS e de sinais de
 * engajamento já persistidos (medalhas, liga, sequência). As regras de
 * desbloqueio reaproveitam `journeyUnlocks`/`proAccess` — nada é duplicado.
 */
import {
  isEngineUnlocked,
  isTreinoUnlocked,
  ENGINE_UNLOCK_COPY,
  TREINO_UNLOCK_COPY,
} from "./journeyUnlocks";

export type LearnerStage = 1 | 2 | 3 | 4 | 5;
/** Progressão de aprendizado (1–4), separada do overlay "recorrente" (5). */
export type LearningStage = 1 | 2 | 3 | 4;

export interface LearnerStageContext {
  completedLessons: string[];
  srsDueCount: number;
  srsTotalCount: number;
  medalsCount: number;
  leagueJoined: boolean;
  streak: number;
}

export interface LearnerProfile {
  /** Estágio efetivo usado pela navegação (inclui o overlay recorrente = 5). */
  stage: LearnerStage;
  /** Estágio de aprendizado puro derivado do currículo (1–4). */
  learningStage: LearningStage;
  /** Usuário que já voltou e engajou (medalha, liga ou sequência). */
  recurring: boolean;
}

/**
 * Estágio de aprendizado a partir de estados reais da Jornada:
 * 1 base · 2 Treino liberado · 3 Hànzì liberado · 4 Leitura liberada.
 */
export function deriveLearningStage(completedLessons: string[]): LearningStage {
  let stage: LearningStage = 1;
  if (isTreinoUnlocked(completedLessons)) stage = 2;
  if (isEngineUnlocked("hanzi", completedLessons)) stage = 3;
  if (isEngineUnlocked("leitura", completedLessons)) stage = 4;
  return stage;
}

/** Sinal de "usuário recorrente" — só a partir de dados de engajamento reais. */
export function isRecurringLearner(ctx: LearnerStageContext): boolean {
  return ctx.medalsCount > 0 || ctx.leagueJoined || ctx.streak >= 3;
}

export function getLearnerProfile(ctx: LearnerStageContext): LearnerProfile {
  const learningStage = deriveLearningStage(ctx.completedLessons);
  const recurring = isRecurringLearner(ctx);
  // O overlay recorrente (estágio 5) só entra quando o aluno já saiu da base
  // e mostra engajamento — motivação (missões/liga/loja) ganha presença então.
  const stage: LearnerStage = learningStage >= 2 && recurring ? 5 : learningStage;
  return { stage, learningStage, recurring };
}

// ─────────────────────────────────────────────────────────────────────────
// Áreas do app e disponibilidade progressiva.
// ─────────────────────────────────────────────────────────────────────────

export type FeatureId =
  | "jornada"
  | "treino"
  | "revisao"
  | "pinyin"
  | "hanzi"
  | "biblioteca"
  | "fala"
  | "leitura"
  | "imersao"
  | "missoes"
  | "conquistas"
  | "ligas"
  | "loja"
  | "perfil"
  | "conta"
  | "plano"
  | "dados"
  | "ajustes"
  | "ajuda"
  | "sobre";

export type FeatureGroup = "aprender" | "motivacao" | "conta";

export interface FeatureAvailability {
  /** Restrição real de progressão? A rota continua acessível de qualquer forma. */
  locked: boolean;
  /** Explicação curta baseada em estados da Jornada quando `locked`. */
  reason?: string;
  /** Estágio de aprendizado em que a área passa a ser recomendada. */
  recommendedAtStage: LearningStage | 5;
  group: FeatureGroup;
}

/**
 * Disponibilidade de uma área. `locked` significa restrição real de
 * progressão (a rota ainda funciona, mas mostra o gate). A explicação usa
 * copy baseada em estados da Jornada — nunca um número fixo que envelhece.
 */
export function featureAvailability(
  id: FeatureId,
  completedLessons: string[]
): FeatureAvailability {
  const engineGate = (track: "som" | "hanzi" | "leitura", group: FeatureGroup, recommendedAtStage: LearningStage) => {
    const unlocked = isEngineUnlocked(track, completedLessons);
    return {
      locked: !unlocked,
      reason: unlocked ? undefined : ENGINE_UNLOCK_COPY[track].desc,
      recommendedAtStage,
      group,
    } satisfies FeatureAvailability;
  };

  switch (id) {
    case "treino": {
      const unlocked = isTreinoUnlocked(completedLessons);
      return {
        locked: !unlocked,
        reason: unlocked ? undefined : TREINO_UNLOCK_COPY.desc,
        recommendedAtStage: 2,
        group: "aprender",
      };
    }
    case "pinyin":
      return engineGate("som", "aprender", 2);
    case "hanzi":
      return engineGate("hanzi", "aprender", 3);
    case "leitura":
      return engineGate("leitura", "aprender", 4);
    case "fala":
      return {
        locked: !isEngineUnlocked("fala", completedLessons),
        reason: isEngineUnlocked("fala", completedLessons) ? undefined : ENGINE_UNLOCK_COPY.fala.desc,
        recommendedAtStage: 4,
        group: "aprender",
      };
    case "revisao":
      return { locked: false, recommendedAtStage: 2, group: "aprender" };
    case "biblioteca":
      return { locked: false, recommendedAtStage: 3, group: "aprender" };
    case "imersao":
      return { locked: false, recommendedAtStage: 4, group: "aprender" };
    case "missoes":
    case "conquistas":
    case "ligas":
    case "loja":
      return { locked: false, recommendedAtStage: 5, group: "motivacao" };
    default:
      // jornada e área de conta ficam sempre disponíveis.
      return { locked: false, recommendedAtStage: 1, group: "conta" };
  }
}

/**
 * A área é "recém-apresentável" quando já está disponível (sem lock real) e o
 * estágio de aprendizado alcançou o ponto em que ela passa a ser recomendada.
 * Combine com `featureDiscovery` (visto/não visto) para decidir o destaque.
 */
export function isFeatureNewlyRelevant(
  id: FeatureId,
  completedLessons: string[],
  learningStage: LearningStage
): boolean {
  const info = featureAvailability(id, completedLessons);
  if (info.locked) return false;
  const target = info.recommendedAtStage === 5 ? 5 : info.recommendedAtStage;
  return learningStage >= (target === 5 ? 4 : target);
}
