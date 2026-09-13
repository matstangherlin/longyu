/**
 * RC1.1 P6–P8 — montagem da sessão de Reforço + em runtime.
 *
 * A Plus não cria conteúdo: ela REUSA os passos que o próprio tema já gerou
 * nas quatro rodadas, escolhendo outros ângulos para os alvos que deram
 * trabalho. Nada aqui entra no catálogo, no grafo da Jornada ou no
 * fingerprint — é uma sessão montada na hora e descartada no fim.
 */

import type { Lesson, LessonStep, StepKind } from "../../data/journey";
import type { ActivityErrorRecord, LessonAttemptRecord, LessonStar } from "../../lib/store";
import {
  buildPlusRoundPlan,
  PLUS_ROUND_MIN_TASKS,
  type PlusRoundPlan,
  type PlusRoundSlot,
  type TopicPassStars,
  type WeaknessEvidence,
  type WeaknessSkill,
} from "./plusRound";

/** Converte as estrelas persistidas por rodada para a forma que a média usa. */
export function topicPassStarsFrom(
  record: Partial<Record<"1" | "2" | "3" | "4", LessonStar>> | undefined
): TopicPassStars {
  return {
    1: record?.["1"],
    2: record?.["2"],
    3: record?.["3"],
    4: record?.["4"],
  };
}

function skillFromActivityError(error: ActivityErrorRecord): WeaknessSkill {
  const skill = String(error.skill ?? "").toLowerCase();
  if (skill.includes("tom") || skill.includes("tone")) return "tone";
  if (skill.includes("hanzi") || skill.includes("hànzì")) return "hanzi";
  if (skill.includes("som") || skill.includes("listen") || skill.includes("escuta")) return "listening";
  if (skill.includes("fala") || skill.includes("convers")) return "conversation";
  if (skill.includes("produc") || skill.includes("produç")) return "production";
  if (skill.includes("significado") || skill.includes("meaning") || skill.includes("leitura")) return "meaning";
  return "other";
}

function refFromActivityError(error: ActivityErrorRecord): string | null {
  if (error.sourceRef) return error.sourceRef;
  const target = error.targets?.[0];
  if (target) return `${target.type}:${target.itemId}`;
  const hanzi = String(error.hanzi ?? error.correctAnswer ?? "").trim();
  return hanzi || null;
}

export interface PlusRoundEvidenceInput {
  lessonId: string;
  activityErrors: readonly ActivityErrorRecord[];
  attempts: readonly LessonAttemptRecord[];
  /** Refs pulados com Fôlego — P20: skip conta como evidência fraca. */
  pendingStarRefs?: readonly string[];
}

/**
 * P7.1 — junta o histórico das quatro rodadas num único conjunto de evidências.
 * Erros de atividade, erros gravados nas tentativas e itens pulados entram no
 * mesmo ranking; o peso de cada sinal vive em `plusRound.ts`.
 */
export function collectPlusRoundEvidence(input: PlusRoundEvidenceInput): WeaknessEvidence[] {
  const evidence: WeaknessEvidence[] = [];

  for (const error of input.activityErrors) {
    if (error.lessonId !== input.lessonId) continue;
    const ref = refFromActivityError(error);
    if (!ref) continue;
    const wrongCount = Math.max(1, error.wrongCount ?? 1);
    evidence.push({
      ref,
      skill: skillFromActivityError(error),
      signal: wrongCount > 1 ? "repeated" : "wrong",
      stepKind: (error.type as StepKind) || undefined,
      timestamp: error.timestamp,
    });
    if ((error.correctionAttempts ?? 0) > 1) {
      evidence.push({
        ref,
        skill: skillFromActivityError(error),
        signal: "retry",
        stepKind: (error.type as StepKind) || undefined,
        timestamp: error.timestamp,
      });
    }
  }

  for (const attempt of input.attempts) {
    if (attempt.lessonId !== input.lessonId) continue;
    for (const mistake of attempt.mistakes ?? []) {
      const ref = String(mistake.expectedAnswer ?? "").trim();
      if (!ref) continue;
      const skill = mistake.sourceSkill;
      evidence.push({
        ref,
        skill:
          skill === "som"
            ? "listening"
            : skill === "hanzi"
              ? "hanzi"
              : skill === "fala"
                ? "conversation"
                : skill === "pinyin"
                  ? "tone"
                  : "meaning",
        signal: "wrong",
        stepKind: (mistake.exerciseType as StepKind) || undefined,
        timestamp: mistake.createdAt,
      });
    }
  }

  // P20 — pular não é acertar. O alvo pulado entra com peso próprio.
  for (const ref of input.pendingStarRefs ?? []) {
    const clean = String(ref ?? "").trim();
    if (!clean) continue;
    evidence.push({ ref: clean, skill: "other", signal: "skip" });
  }

  return evidence;
}

function refOfStep(step: LessonStep): string | null {
  if (step.chunkId) return `chunk:${step.chunkId}`;
  if (step.charId) return `char:${step.charId}`;
  const hanzi = step.hanzi ?? step.targetHanzi ?? step.correctAnswer ?? step.text;
  const clean = String(hanzi ?? "").trim();
  return clean || null;
}

/**
 * Índice (ref → kind → passo) sobre tudo que o tema já produziu nas quatro
 * rodadas. É daqui que a Plus tira material: nenhuma frase, caractere ou
 * cena nova é inventada.
 */
export function indexTopicSteps(stepPool: readonly LessonStep[]): Map<string, Map<StepKind, LessonStep>> {
  const index = new Map<string, Map<StepKind, LessonStep>>();
  for (const step of stepPool) {
    const ref = refOfStep(step);
    if (!ref) continue;
    const byKind = index.get(ref) ?? new Map<StepKind, LessonStep>();
    if (!byKind.has(step.kind)) byKind.set(step.kind, step);
    index.set(ref, byKind);
  }
  return index;
}

/** Índice secundário (kind → passos), para a terceira tentativa abaixo. */
export function indexStepsByKind(stepPool: readonly LessonStep[]): Map<StepKind, LessonStep[]> {
  const index = new Map<StepKind, LessonStep[]>();
  for (const step of stepPool) {
    const list = index.get(step.kind) ?? [];
    list.push(step);
    index.set(step.kind, list);
  }
  return index;
}

function pickStepForSlot(
  slot: PlusRoundSlot,
  index: Map<string, Map<StepKind, LessonStep>>,
  byKindIndex: Map<StepKind, LessonStep[]>,
  used: ReadonlySet<LessonStep>
): LessonStep | null {
  const byKind = index.get(slot.ref);
  // 1. A modalidade que a escada de remediação pediu, no próprio alvo.
  const preferred = byKind?.get(slot.kind);
  if (preferred && !used.has(preferred)) return preferred;
  // 2. Outra modalidade do mesmo alvo, desde que não seja aquela em que o
  //    aluno falhou — repetir a pergunta errada é o que P8 proíbe.
  if (byKind) {
    for (const [kind, step] of byKind) {
      if (slot.previousKind && kind === slot.previousKind) continue;
      if (used.has(step)) continue;
      return step;
    }
  }
  // 3. P8.2 — o alvo não tem outro ângulo dentro deste tema. Em vez de
  //    desistir do slot (o que devolvia a Plus quase inteira para recall),
  //    treina a MESMA habilidade com outro item já aprendido: "se errou 2º × 3º
  //    tom, use outro item com a mesma distinção tonal".
  for (const step of byKindIndex.get(slot.kind) ?? []) {
    if (used.has(step)) continue;
    if (slot.previousKind && step.kind === slot.previousKind) continue;
    return step;
  }
  return null;
}


function skillOfStepKind(kind: StepKind): WeaknessSkill {
  if (kind === "tone" || kind === "tone_pair") return "tone";
  if (kind === "listen" || kind === "listen_select" || kind === "audio_discrimination" || kind === "dictation") {
    return "listening";
  }
  if (kind === "recognize" || kind === "hanzi_build" || kind === "decompose" || kind === "write") return "hanzi";
  if (kind === "conversation_scene" || kind === "dialogue_choice" || kind === "conversation_repair") {
    return "conversation";
  }
  if (kind === "produce" || kind === "free_production" || kind === "sentence_build" || kind === "transfer_task") {
    return "production";
  }
  return "meaning";
}

export interface PlusRoundSession {
  plan: PlusRoundPlan;
  steps: LessonStep[];
  /** Slots que não encontraram passo reaproveitável (ficam fora da sessão). */
  unmatched: PlusRoundSlot[];
}

export interface BuildPlusRoundSessionInput {
  lesson: Pick<Lesson, "id">;
  /** Todos os passos que o tema gerou nas quatro rodadas. */
  stepPool: readonly LessonStep[];
  evidence: readonly WeaknessEvidence[];
  size?: number;
}

export function buildPlusRoundSession(input: BuildPlusRoundSessionInput): PlusRoundSession {
  const plan = buildPlusRoundPlan({
    topicId: input.lesson.id,
    evidence: input.evidence,
    topicSteps: input.stepPool,
    size: input.size,
  });
  const index = indexTopicSteps(input.stepPool);
  const byKindIndex = indexStepsByKind(input.stepPool);
  const steps: LessonStep[] = [];
  const unmatched: PlusRoundSlot[] = [];
  const used = new Set<LessonStep>();
  const slots: PlusRoundSlot[] = [];

  for (const slot of plan.slots) {
    const step = pickStepForSlot(slot, index, byKindIndex, used);
    if (!step || used.has(step)) {
      unmatched.push(slot);
      continue;
    }
    used.add(step);
    steps.push(step);
    slots.push(slot);
  }

  // Nem todo alvo fraco tem, dentro deste tema, um passo na modalidade que a
  // escada pediu — e um slot sem passo simplesmente some. Sem esta reposição, a
  // Plus de um tema pequeno terminava com quatro tarefas e o player caía no
  // plano normal, ou seja: o aluno pedia reforço e recebia a aula de novo.
  //
  // A reposição vem do próprio tema (nada novo é inventado) e entra como
  // recall, que é o que ela de fato é.
  if (steps.length < PLUS_ROUND_MIN_TASKS) {
    for (const step of input.stepPool) {
      if (steps.length >= PLUS_ROUND_MIN_TASKS) break;
      if (used.has(step)) continue;
      const ref = refOfStep(step);
      if (!ref) continue;
      // Não repete (ref, kind) já presente na sessão.
      if (slots.some((slot) => slot.ref === ref && slot.kind === step.kind)) continue;
      used.add(step);
      steps.push(step);
      slots.push({ ref, origin: "recall", kind: step.kind, skill: skillOfStepKind(step.kind) });
    }
  }

  const total = slots.length || 1;
  const weakCount = slots.filter((slot) => slot.origin === "weak").length;
  return {
    plan: { ...plan, slots, weakShare: weakCount / total, recallShare: (total - weakCount) / total },
    steps,
    unmatched,
  };
}
