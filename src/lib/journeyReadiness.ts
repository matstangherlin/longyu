/**
 * Autoridade única de readiness da Jornada (V4.9.2).
 *
 * Antes desta versão, um node auxiliar tinha DUAS fontes de verdade: os campos
 * declarativos do `JourneyNode` (V4.9.1) e uma condição escrita à mão no
 * `FoundationOrchestrationPanel`. Elas já divergiam — os dois nodes de tom
 * declaravam `NOTICED` enquanto o painel exigia mastery 1 e 2 respectivamente.
 * Duas fontes que discordam significam que a declaração não estava governando
 * nada, e que um engine aberto por deep link não era checado por ninguém.
 *
 * Este módulo passa a ser a única autoridade. A regra de ouro: a declaração
 * precisa ser expressiva o bastante para dizer exatamente o que a condição
 * manual dizia — incluindo grupos OR e escape hatches. Aproximar por uma lista
 * de AND afrouxaria ou apertaria portões em silêncio, que é pior do que a
 * duplicação que estamos removendo.
 */
import {
  PEDAGOGICAL_STAGE_ORDER,
  getKnowledgeTarget,
  type KnowledgeStage,
} from "../data/pedagogicalSpine";
import type { JourneyNode } from "../data/journeyOrchestrator";
import { dueItems, type SRSItem } from "./srs";

export type JourneyReadinessReason =
  | "READY"
  | "MISSING_TARGET"
  | "TARGET_STAGE_TOO_LOW"
  | "INSUFFICIENT_CHUNKS"
  | "INSUFFICIENT_PATTERNS"
  | "INSUFFICIENT_RECOGNITION"
  | "NO_REVIEW_DUE"
  | "CAPSULE_PREREQUISITE"
  | "UNKNOWN_REQUIREMENT";

export interface LearnerReadinessState {
  completedLessons: string[];
  lessonMasteryById: Record<string, { level: number } | undefined>;
  learnedChunks: string[];
  learnedChars: string[];
  /** Padrões distintos já vistos em lições concluídas. */
  knownPatternCount: number;
  srs: Record<string, SRSItem>;
  /** Nodes auxiliares concluídos — local-only, nunca bloqueia mastery core. */
  completedNodeIds: string[];
  /** Tópico aberto agora, para os escape hatches declarados. */
  currentTopicId?: string;
  now?: number;
}

export interface UnmetRequirement {
  reason: JourneyReadinessReason;
  targetId?: string;
  requiredStage?: KnowledgeStage;
  actualStage?: KnowledgeStage;
  required?: number;
  actual?: number;
  detail?: string;
}

export interface JourneyNodeReadiness {
  ready: boolean;
  /** READY, ou a razão do primeiro requisito não atendido. */
  reason: JourneyReadinessReason;
  unmetRequirements: UnmetRequirement[];
  evidence: {
    nodeId: string;
    stagesByTarget: Record<string, KnowledgeStage>;
    knownChunks: number;
    knownPatterns: number;
    recognition: RecognitionMeasurement;
    reviewDue: number;
  };
}

// ── Recognition rate (Parte B) ────────────────────────────────────────────
//
// `minimumRecognitionRate: 0.7` existia sem semântica: nada media taxa de
// reconhecimento, então o número era decorativo. Em vez de inventar uma
// heurística que devolvesse 0.7 para todo mundo, a taxa passa a sair de dado
// já medido e confiável — o próprio SRS.
//
// Fórmula:
//
//     amostra = itens de SRS já revisados (reviewedAt definido) cujo
//               reviewDomain é receptivo
//     retidos = itens da amostra com reps >= 1
//     taxa    = retidos / |amostra|
//
// `reps` é zerado a cada erro (`again`) e incrementado a cada acerto, então
// `reps >= 1` significa exatamente "o último contato com este item foi
// correto". A taxa lê-se: dos itens receptivos que você já enfrentou, em que
// fração você estava certo no último encontro.
//
// A amostra mínima é o próprio `minimumKnownChunks` do node, não uma constante
// nova: não faz sentido afirmar uma taxa sobre menos itens do que o repertório
// que o node já exige. Abaixo disso a medição é declarada inválida e o
// requisito falha fechado — imersão não destrava sobre terreno não medido.

/** Domínios receptivos: ouvir, entender e ler. Falar, escrever e usar são produção. */
export const RECOGNITION_REVIEW_DOMAINS = ["som", "significado", "leitura", "pinyin"] as const;

export interface RecognitionMeasurement {
  /** null quando a amostra é pequena demais para afirmar qualquer taxa. */
  rate: number | null;
  sampleSize: number;
  held: number;
  minimumSample: number;
}

export function measureRecognitionRate(
  srs: Record<string, SRSItem>,
  minimumSample: number
): RecognitionMeasurement {
  const receptive = new Set<string>(RECOGNITION_REVIEW_DOMAINS);
  const sample = Object.values(srs ?? {}).filter(
    (item) => item.reviewedAt != null && item.reviewDomain != null && receptive.has(item.reviewDomain)
  );
  const held = sample.filter((item) => item.reps >= 1).length;
  return {
    rate: sample.length >= minimumSample && sample.length > 0 ? held / sample.length : null,
    sampleSize: sample.length,
    held,
    minimumSample,
  };
}

// ── Estágio de um knowledge target ────────────────────────────────────────
//
// A escada abaixo traduz mastery de tópico (M0–M4, já existente e persistido)
// para os estágios da espinha pedagógica. É monotônica e não inventa medição:
// cada degrau corresponde a um pass de mastery que o aluno realmente fez.

export const MASTERY_STAGE_LADDER: KnowledgeStage[] = [
  "NOTICED", // lição concluída, sem pass de mastery
  "GUIDED", // M1
  "RECOGNIZED", // M2
  "RECALLED", // M3
  "PRODUCED", // M4
];

function lexicalIdOf(canonicalRef: string): string {
  return canonicalRef.slice(canonicalRef.indexOf(":") + 1);
}

/**
 * Estágio atingido para um alvo, derivado só de estado real do aluno.
 *
 * Alvo lexical (`chunk:` / `char:`) tem autoridade própria: entrar no
 * repertório é evidência direta, e o SRS levanta o degrau conforme o item
 * sobrevive a revisões. Alvo conceitual depende da lição que o introduz.
 */
export function stageForTarget(targetId: string, state: LearnerReadinessState): KnowledgeStage {
  const target = getKnowledgeTarget(targetId);
  if (!target) return "UNSEEN";

  if (target.canonicalRef) {
    const bareId = lexicalIdOf(target.canonicalRef);
    const known = target.canonicalRef.startsWith("chunk:")
      ? state.learnedChunks.includes(bareId)
      : state.learnedChars.includes(bareId);
    if (known) {
      // Entrou no repertório: reconhecido. Revisões seguidas levantam o degrau.
      const items = Object.values(state.srs ?? {}).filter((item) => item.itemId === bareId);
      const bestReps = items.reduce((max, item) => Math.max(max, item.reps), 0);
      const graduated = items.some((item) => item.intervalDays >= 1);
      if (bestReps >= 4 && graduated) return "PRODUCED";
      if (bestReps >= 2) return "RECALLED";
      return "RECOGNIZED";
    }
    // Fora do repertório, o alvo lexical não sobe além de NOTICED: mastery da
    // lição que o introduz não fabrica vocabulário retido. Sem este teto, um
    // aluno com M2 no tópico "passaria" por 你好 sem nunca tê-lo aprendido.
    const introLessonId = target.firstIntroducedLessonId;
    const seen =
      introLessonId &&
      introLessonId !== "CATALOG_ONLY" &&
      (state.completedLessons.includes(introLessonId) ||
        (state.lessonMasteryById[introLessonId]?.level ?? 0) >= 1);
    return seen ? "NOTICED" : "UNSEEN";
  }

  const lessonId = target.firstIntroducedLessonId;
  if (!lessonId || lessonId === "CATALOG_ONLY") return "UNSEEN";
  const level = state.lessonMasteryById[lessonId]?.level ?? 0;
  const completed = state.completedLessons.includes(lessonId);
  if (!completed && level <= 0) return "UNSEEN";
  return MASTERY_STAGE_LADDER[Math.min(Math.max(level, 0), MASTERY_STAGE_LADDER.length - 1)];
}

function stageReaches(actual: KnowledgeStage, required: KnowledgeStage): boolean {
  return PEDAGOGICAL_STAGE_ORDER[actual] >= PEDAGOGICAL_STAGE_ORDER[required];
}

// ── A autoridade ──────────────────────────────────────────────────────────

export function evaluateJourneyNodeReadiness(
  node: JourneyNode,
  state: LearnerReadinessState
): JourneyNodeReadiness {
  const unmet: UnmetRequirement[] = [];
  const stagesByTarget: Record<string, KnowledgeStage> = {};
  const now = state.now ?? Date.now();

  const recognition = measureRecognitionRate(state.srs ?? {}, node.minimumKnownChunks ?? 0);
  const reviewDue = dueItems(state.srs ?? {}, now).length;

  const evidence: JourneyNodeReadiness["evidence"] = {
    nodeId: node.id,
    stagesByTarget,
    knownChunks: state.learnedChunks.length,
    knownPatterns: state.knownPatternCount,
    recognition,
    reviewDue,
  };

  // Escape hatch declarado: estar no tópico dispensa os requisitos de ESTÁGIO,
  // não o node inteiro. A distinção é o que preserva o comportamento: o Blitz
  // exigia `foundationReady && blitzReady`, e o hatch cobria só a primeira
  // metade — liberar o node todo destravaria o Blitz sem o aluno saber 你好.
  const stagesWaived =
    node.stagesWaivedWhenCurrentTopicId != null &&
    state.currentTopicId === node.stagesWaivedWhenCurrentTopicId;

  // Pré-requisito de cápsula (node auxiliar que precisa preceder este).
  for (const requiredNodeId of node.requiresNodeIds ?? []) {
    if (!state.completedNodeIds.includes(requiredNodeId)) {
      unmet.push({ reason: "CAPSULE_PREREQUISITE", detail: requiredNodeId });
    }
  }

  // Alvos obrigatórios (AND).
  for (const targetId of node.requiredKnowledgeTargetIds ?? []) {
    if (!getKnowledgeTarget(targetId)) {
      unmet.push({ reason: "UNKNOWN_REQUIREMENT", targetId, detail: "alvo fora do manifesto" });
      continue;
    }
    const actualStage = stageForTarget(targetId, state);
    stagesByTarget[targetId] = actualStage;
    // O hatch dispensa alvo conceitual (estágio vem de mastery de tópico), nunca
    // alvo lexical: "você já está no tópico seguinte" não é o mesmo que "você
    // não precisa do vocabulário".
    if (stagesWaived && !getKnowledgeTarget(targetId)?.canonicalRef) continue;
    if (actualStage === "UNSEEN") {
      unmet.push({ reason: "MISSING_TARGET", targetId, actualStage });
      continue;
    }
    const requiredStage = node.minimumKnowledgeStages?.[targetId];
    if (requiredStage && !stageReaches(actualStage, requiredStage)) {
      unmet.push({ reason: "TARGET_STAGE_TOO_LOW", targetId, requiredStage, actualStage });
    }
  }

  // Grupos OR: cada grupo precisa de pelo menos um alvo no estágio pedido.
  // Avaliamos todos os membros (sem curto-circuito) para que o estágio de cada
  // um entre na evidência — e para que o laço de requisitos avulsos abaixo os
  // reconheça como já tratados, em vez de re-checá-los individualmente e
  // transformar o OR num AND.
  const orGroupTargetIds = new Set((node.anyOfKnowledgeTargetIds ?? []).flat());
  for (const group of node.anyOfKnowledgeTargetIds ?? []) {
    const outcomes = group.map((targetId) => {
      const actualStage = stageForTarget(targetId, state);
      stagesByTarget[targetId] = actualStage;
      if (actualStage === "UNSEEN") return false;
      const requiredStage = node.minimumKnowledgeStages?.[targetId];
      return !requiredStage || stageReaches(actualStage, requiredStage);
    });
    const satisfied = outcomes.some(Boolean);
    if (!satisfied) {
      unmet.push({ reason: "MISSING_TARGET", detail: `nenhum de: ${group.join(", ")}` });
    }
  }

  // Estágio exigido para alvo que não está na lista obrigatória nem em grupo OR.
  for (const [targetId, requiredStage] of Object.entries(node.minimumKnowledgeStages ?? {})) {
    if (targetId in stagesByTarget || orGroupTargetIds.has(targetId) || !requiredStage) continue;
    if (stagesWaived && !getKnowledgeTarget(targetId)?.canonicalRef) continue;
    if (!getKnowledgeTarget(targetId)) {
      unmet.push({ reason: "UNKNOWN_REQUIREMENT", targetId });
      continue;
    }
    const actualStage = stageForTarget(targetId, state);
    stagesByTarget[targetId] = actualStage;
    if (!stageReaches(actualStage, requiredStage)) {
      unmet.push({ reason: "TARGET_STAGE_TOO_LOW", targetId, requiredStage, actualStage });
    }
  }

  // Repertório mínimo.
  if (node.minimumKnownChunks != null && state.learnedChunks.length < node.minimumKnownChunks) {
    unmet.push({
      reason: "INSUFFICIENT_CHUNKS",
      required: node.minimumKnownChunks,
      actual: state.learnedChunks.length,
    });
  }
  if (node.minimumKnownPatterns != null && state.knownPatternCount < node.minimumKnownPatterns) {
    unmet.push({
      reason: "INSUFFICIENT_PATTERNS",
      required: node.minimumKnownPatterns,
      actual: state.knownPatternCount,
    });
  }

  // Recognition rate — falha fechado quando a amostra não sustenta a afirmação.
  if (node.minimumRecognitionRate != null) {
    if (recognition.rate == null) {
      unmet.push({
        reason: "INSUFFICIENT_RECOGNITION",
        required: node.minimumRecognitionRate,
        detail: `amostra receptiva de ${recognition.sampleSize} item(ns), mínimo ${recognition.minimumSample}`,
      });
    } else if (recognition.rate < node.minimumRecognitionRate) {
      unmet.push({
        reason: "INSUFFICIENT_RECOGNITION",
        required: node.minimumRecognitionRate,
        actual: recognition.rate,
      });
    }
  }

  // Fila de revisão: um node de revisão sem nada vencido não tem o que fazer.
  if (node.mode === "CURRENT_QUEUE" && reviewDue === 0) {
    unmet.push({ reason: "NO_REVIEW_DUE", actual: 0 });
  }

  return {
    ready: unmet.length === 0,
    reason: unmet[0]?.reason ?? "READY",
    unmetRequirements: unmet,
    evidence,
  };
}
