/**
 * RC1.1 P6–P11 — Reforço + (Plus Round).
 *
 * O problema: o aluno fecha as quatro rodadas de um tema com 2★ em todas e o
 * app diz "Tema dominado". Não está. As quatro rodadas continuam sendo o
 * padrão (P5); a Plus é uma QUINTA sessão que só existe quando a média pede.
 *
 * O que ela não é:
 *   - não é lesson canônica (não entra no catálogo, não vira `lesson-5-plus`);
 *   - não cria vocabulário, chunk, char ou StepKind;
 *   - não é infinita: acontece no máximo uma vez por tema.
 *
 * É uma sessão de remediação montada em runtime a partir do que o aluno já viu
 * nas quatro rodadas — revisando o tema inteiro, mas concentrada onde doeu.
 */

import type { LessonStep, StepKind } from "../../data/journey";

export type PlusStar = 0 | 1 | 2 | 3;

// ── P6.1/P6.2 — média e gatilho ────────────────────────────────────────────

export const PLUS_ROUND_THRESHOLD = 2.0;
export const REQUIRED_TOPIC_ROUNDS = 4;

export type TopicPassStars = Partial<Record<1 | 2 | 3 | 4, PlusStar>>;

/**
 * P6.4 — qual score entra na média.
 *
 * Usa a estrela PERSISTIDA de cada rodada, que no contrato atual de mastery é
 * o melhor desempenho válido daquela rodada (`finishLessonAttempt` já grava
 * `max(atual, tentativa)`). Repetir uma rodada para melhorar conta; repetir
 * para piorar não derruba o tema.
 *
 * Nunca deriva de XP: XP mistura bônus de ofensiva, liga e primeira conclusão,
 * e não é medida de desempenho da rodada.
 */
export function topicAverageStars(passStars: TopicPassStars): number | null {
  const values: number[] = [];
  for (const pass of [1, 2, 3, 4] as const) {
    const stars = passStars[pass];
    if (stars == null) return null; // rodada ainda não concluída
    values.push(Math.max(0, Math.min(3, stars)));
  }
  if (values.length !== REQUIRED_TOPIC_ROUNDS) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  // Média aritmética simples das quatro rodadas obrigatórias, faixa 1.0–3.0.
  return Math.round((sum / REQUIRED_TOPIC_ROUNDS) * 100) / 100;
}

/** P6.2 — média <= 2.0 abre Reforço +. Média > 2.0 fecha o tema normalmente. */
export function needsPlusRound(average: number | null): boolean {
  if (average == null) return false;
  return average <= PLUS_ROUND_THRESHOLD;
}

export type TopicMasteryPhase =
  /** Ainda faltam rodadas obrigatórias. */
  | "rounds_pending"
  /** 4/4 concluídas e a média pediu reforço — o tema não está dominado (P6.5). */
  | "plus_required"
  /** 4/4 (+ Plus quando exigida) concluídas. */
  | "mastered";

export interface TopicMasteryInput {
  passStars: TopicPassStars;
  /** Plus já concluída neste tema. */
  plusCompleted?: boolean;
}

/**
 * P10.2 / P6.5 — o tema só é "dominado" depois da Plus quando ela é exigida.
 */
export function topicMasteryPhase(input: TopicMasteryInput): TopicMasteryPhase {
  const average = topicAverageStars(input.passStars);
  if (average == null) return "rounds_pending";
  if (!needsPlusRound(average)) return "mastered";
  // P6.6 — depois da Plus o tema fecha. Nunca Plus 2, mesmo se continuar fraco.
  return input.plusCompleted ? "mastered" : "plus_required";
}

/** P6.6 / mutação 15 — a Plus nunca reaparece depois de concluída. */
export function plusRoundAvailable(input: TopicMasteryInput): boolean {
  return topicMasteryPhase(input) === "plus_required";
}

// ── P7 — evidência de fraqueza ─────────────────────────────────────────────

export type WeaknessSkill =
  | "tone"
  | "hanzi"
  | "meaning"
  | "listening"
  | "conversation"
  | "production"
  | "other";

export type WeaknessSignal =
  /** Errou. */
  | "wrong"
  /** Errou de novo o mesmo alvo. */
  | "repeated"
  /** Pulou (P20 — skip conta como evidência fraca). */
  | "skip"
  /** Precisou de ajuda máxima. */
  | "max_help"
  /** Tentou várias vezes até acertar. */
  | "retry";

export interface WeaknessEvidence {
  /** Alvo lexical: `chunk:<id>` | `char:<id>` | hànzì literal. */
  ref: string;
  skill: WeaknessSkill;
  signal: WeaknessSignal;
  /** Modalidade em que o aluno falhou — a Plus precisa usar OUTRA (P8). */
  stepKind?: StepKind;
  /** Rodada em que aconteceu (1–4). */
  pass?: number;
  timestamp?: number;
}

/** P7.2 — peso de cada sinal na priorização. */
const SIGNAL_WEIGHT: Record<WeaknessSignal, number> = {
  repeated: 5,
  wrong: 4,
  max_help: 3,
  skip: 2.5,
  retry: 2,
};

export interface WeaknessTarget {
  ref: string;
  skill: WeaknessSkill;
  score: number;
  /** Modalidades já usadas (e falhadas) neste alvo. */
  failedKinds: StepKind[];
  signals: WeaknessSignal[];
  occurrences: number;
}

/**
 * P7.1/P7.2 — consolida o histórico das quatro rodadas num ranking.
 * Erro repetido vem antes de erro único, que vem antes de ajuda máxima, que
 * vem antes de item pulado.
 */
export function rankWeaknessTargets(evidence: readonly WeaknessEvidence[]): WeaknessTarget[] {
  const byRef = new Map<string, WeaknessTarget>();
  const seenSignalPerRef = new Map<string, Set<string>>();

  for (const item of evidence) {
    const ref = String(item.ref ?? "").trim();
    if (!ref) continue;
    const existing = byRef.get(ref) ?? {
      ref,
      skill: item.skill,
      score: 0,
      failedKinds: [],
      signals: [],
      occurrences: 0,
    };
    // Um alvo que reaparece em rodadas diferentes conta como repetido.
    const seen = seenSignalPerRef.get(ref) ?? new Set<string>();
    const occurrenceKey = `${item.signal}:${item.pass ?? "?"}`;
    const isRepeat = seen.size > 0 && !seen.has(occurrenceKey);
    seen.add(occurrenceKey);
    seenSignalPerRef.set(ref, seen);

    existing.score += SIGNAL_WEIGHT[item.signal] ?? 1;
    if (isRepeat) existing.score += SIGNAL_WEIGHT.repeated - SIGNAL_WEIGHT.wrong;
    existing.occurrences += 1;
    if (!existing.signals.includes(item.signal)) existing.signals.push(item.signal);
    if (item.stepKind && !existing.failedKinds.includes(item.stepKind)) {
      existing.failedKinds.push(item.stepKind);
    }
    // A habilidade mais "cara" ganha: tom/produção descrevem melhor o problema
    // do que "other".
    if (existing.skill === "other" && item.skill !== "other") existing.skill = item.skill;
    byRef.set(ref, existing);
  }

  return [...byRef.values()].sort(
    (a, b) => b.score - a.score || b.occurrences - a.occurrences || a.ref.localeCompare(b.ref)
  );
}

// ── P8 — remediação por modalidade ─────────────────────────────────────────

/**
 * P8.1–P8.4 — repetir o CONHECIMENTO, não a pergunta.
 *
 * Errar "significado em múltipla escolha" e receber a mesma pergunta com as
 * mesmas quatro opções ensina a decorar a posição da alternativa. A escada
 * abaixo diz qual abordagem vem depois de cada falha, por habilidade.
 */
const REMEDIATION_LADDER: Record<WeaknessSkill, readonly StepKind[]> = {
  // Errou o tom: outro item com a MESMA distinção tonal, não o mesmo áudio.
  tone: ["tone_pair", "audio_discrimination", "listen_select", "tone"],
  // Errou reconhecimento: áudio → hànzì, depois lacuna, depois uso em frase.
  hanzi: ["listen_select", "fill_blank", "sentence_build", "recognize"],
  // Errou significado: sai da múltipla escolha — áudio, lacuna ou pares.
  meaning: ["listen_select", "fill_blank", "match_pairs", "comprehend"],
  listening: ["audio_discrimination", "dictation", "listen_select", "audio_to_action"],
  // Errou produção aberta: começa por peças, só depois produção livre.
  conversation: ["dialogue_choice", "sentence_build", "dialogue_completion", "conversation_scene"],
  production: ["sentence_build", "fill_blank", "reverse_recall", "free_production"],
  other: ["comprehend", "listen_select", "fill_blank", "match_pairs"],
};

/**
 * Próxima modalidade para um alvo: a primeira da escada que o aluno ainda não
 * falhou. Se todas já falharam, usa a primeira da escada mesmo assim — insistir
 * numa abordagem nova é melhor do que repetir a última que deu errado.
 */
export function remediationKindFor(target: Pick<WeaknessTarget, "skill" | "failedKinds">): StepKind {
  const ladder = REMEDIATION_LADDER[target.skill] ?? REMEDIATION_LADDER.other;
  const fresh = ladder.find((kind) => !target.failedKinds.includes(kind));
  return fresh ?? ladder[0];
}

// ── P7.3 — montagem da Plus ────────────────────────────────────────────────

export const PLUS_ROUND_MIN_TASKS = 6;
export const PLUS_ROUND_MAX_TASKS = 10;

export interface PlusRoundPlanInput {
  topicId: string;
  evidence: readonly WeaknessEvidence[];
  /** Passos do tema já vistos nas quatro rodadas — a Plus reusa, não inventa. */
  topicSteps: readonly LessonStep[];
  /** Alvo de tamanho; a Plus é curta e nunca maior que uma lesson normal. */
  size?: number;
}

export interface PlusRoundSlot {
  ref: string;
  /** `weak` = veio da evidência; `recall` = revisão geral do tema. */
  origin: "weak" | "recall";
  kind: StepKind;
  /** Modalidade em que o aluno havia falhado (para provar que mudou). */
  previousKind?: StepKind;
  skill: WeaknessSkill;
}

export interface PlusRoundPlan {
  topicId: string;
  slots: PlusRoundSlot[];
  weakShare: number;
  recallShare: number;
}

function refOfStep(step: LessonStep): string | null {
  if (step.chunkId) return `chunk:${step.chunkId}`;
  if (step.charId) return `char:${step.charId}`;
  const hanzi = step.hanzi ?? step.targetHanzi ?? step.correctAnswer ?? step.text;
  const clean = String(hanzi ?? "").trim();
  return clean ? clean : null;
}

function skillOfKind(kind: StepKind): WeaknessSkill {
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

/**
 * P7 — ~65–75% do tempo nos erros, ~25–35% em recall geral do tema.
 *
 * A proporção não é imposta quando há pouca matéria: com dois alvos fracos e
 * uma Plus de seis tarefas, forçar 70% inventaria repetição literal — que é
 * exatamente o que P8 proíbe. Nesse caso a Plus usa o que existe e completa
 * com recall.
 */
export function buildPlusRoundPlan(input: PlusRoundPlanInput): PlusRoundPlan {
  const size = Math.max(
    PLUS_ROUND_MIN_TASKS,
    Math.min(PLUS_ROUND_MAX_TASKS, input.size ?? PLUS_ROUND_MIN_TASKS + 2)
  );
  const ranked = rankWeaknessTargets(input.evidence);

  const targetWeakCount = Math.round(size * 0.7);
  const weakSlots: PlusRoundSlot[] = [];
  for (const target of ranked) {
    if (weakSlots.length >= targetWeakCount) break;
    weakSlots.push({
      ref: target.ref,
      origin: "weak",
      kind: remediationKindFor(target),
      previousKind: target.failedKinds[0],
      skill: target.skill,
    });
  }

  // Recall geral: alvos do tema que não estão na lista de fraqueza, para a
  // Plus revisar a aula inteira e não virar só a lista de erros (P7).
  const weakRefs = new Set(weakSlots.map((slot) => slot.ref));
  const recallSlots: PlusRoundSlot[] = [];
  const seenRecall = new Set<string>();
  for (const step of input.topicSteps) {
    if (weakSlots.length + recallSlots.length >= size) break;
    const ref = refOfStep(step);
    if (!ref || weakRefs.has(ref) || seenRecall.has(ref)) continue;
    seenRecall.add(ref);
    recallSlots.push({ ref, origin: "recall", kind: step.kind, skill: skillOfKind(step.kind) });
  }

  // Sobrou espaço e não há mais material novo: reaproveita alvos fracos em
  // modalidades ainda não usadas nesta Plus, nunca repetindo (ref, kind).
  const slots = [...weakSlots, ...recallSlots];
  if (slots.length < PLUS_ROUND_MIN_TASKS) {
    const used = new Set(slots.map((slot) => `${slot.ref}#${slot.kind}`));
    for (const target of ranked) {
      if (slots.length >= PLUS_ROUND_MIN_TASKS) break;
      const kind = remediationKindFor({
        skill: target.skill,
        failedKinds: [
          ...target.failedKinds,
          ...slots.filter((slot) => slot.ref === target.ref).map((slot) => slot.kind),
        ],
      });
      const key = `${target.ref}#${kind}`;
      if (used.has(key)) continue;
      used.add(key);
      slots.push({
        ref: target.ref,
        origin: "weak",
        kind,
        previousKind: target.failedKinds[0],
        skill: target.skill,
      });
    }
  }

  const total = slots.length || 1;
  const weakCount = slots.filter((slot) => slot.origin === "weak").length;
  return {
    topicId: input.topicId,
    slots: slots.slice(0, size),
    weakShare: weakCount / total,
    recallShare: (total - weakCount) / total,
  };
}

// ── P8.5 — gate de diversidade ─────────────────────────────────────────────

export interface DiversityReport {
  ok: boolean;
  failures: string[];
  /** Quantos slots fracos mudaram de modalidade em relação à falha original. */
  changedModality: number;
  weakSlots: number;
}

/**
 * Falha se a Plus é apenas um clone dos itens errados: mesma pergunta, mesma
 * modalidade. Repetir o conhecimento é o objetivo; repetir o exercício não.
 */
export function checkRemediationDiversity(plan: PlusRoundPlan): DiversityReport {
  const failures: string[] = [];
  const weakSlots = plan.slots.filter((slot) => slot.origin === "weak");
  const changedModality = weakSlots.filter(
    (slot) => !slot.previousKind || slot.previousKind !== slot.kind
  ).length;

  for (const slot of weakSlots) {
    if (slot.previousKind && slot.previousKind === slot.kind) {
      failures.push(`${slot.ref}: repete a modalidade "${slot.kind}" em que o aluno já falhou`);
    }
  }

  // Nenhuma combinação (ref, kind) pode aparecer duas vezes na mesma Plus.
  const seen = new Set<string>();
  for (const slot of plan.slots) {
    const key = `${slot.ref}#${slot.kind}`;
    if (seen.has(key)) failures.push(`${slot.ref}: tarefa duplicada em "${slot.kind}"`);
    seen.add(key);
  }

  // A Plus precisa revisar o tema, não só a lista de erros.
  if (plan.slots.length > 0 && plan.recallShare === 0 && weakSlots.length === plan.slots.length) {
    const distinctRefs = new Set(weakSlots.map((slot) => slot.ref)).size;
    if (distinctRefs <= 1) failures.push("Plus inteira sobre um único alvo: não revisa o tema");
  }

  if (plan.slots.length < PLUS_ROUND_MIN_TASKS) {
    failures.push(`Plus com ${plan.slots.length} tarefas (mínimo ${PLUS_ROUND_MIN_TASKS})`);
  }
  if (plan.slots.length > PLUS_ROUND_MAX_TASKS) {
    failures.push(`Plus com ${plan.slots.length} tarefas (máximo ${PLUS_ROUND_MAX_TASKS})`);
  }

  return { ok: failures.length === 0, failures, changedModality, weakSlots: weakSlots.length };
}

// ── P11 — recompensa ───────────────────────────────────────────────────────

export const PLUS_ROUND_XP = 15;

/**
 * P11.1 — replay não duplica XP. A chave é por tema, sem data e sem tentativa:
 * a primeira conclusão da Plus paga, as seguintes não.
 */
export function plusRoundXpRewardId(topicId: string): string {
  return `plus-round:${topicId}`;
}

// ── P15 — copy do resultado ────────────────────────────────────────────────

export interface TopicRoundFourResult {
  headline: string;
  averageLine?: string;
  helper?: string;
  ctaLabel: string;
  mastered: boolean;
}

export function topicRoundFourResult(
  input: TopicMasteryInput & { locale?: "pt" | "en" }
): TopicRoundFourResult {
  const locale = input.locale === "en" ? "en" : "pt";
  const phase = topicMasteryPhase(input);
  const average = topicAverageStars(input.passStars);

  if (phase !== "plus_required") {
    return {
      headline: locale === "en" ? "Topic mastered" : "Tema dominado",
      ctaLabel: locale === "en" ? "Continue" : "Continuar",
      mastered: true,
    };
  }

  return {
    headline: locale === "en" ? "4 rounds complete" : "4 rodadas concluídas",
    averageLine:
      average != null
        ? locale === "en"
          ? `Topic average: ${average.toFixed(1)}`
          : `Média do tema: ${average.toFixed(1)}`
        : undefined,
    helper:
      locale === "en"
        ? "Let's reinforce what gave you the most trouble."
        : "Vamos reforçar os pontos que mais deram trabalho.",
    ctaLabel: locale === "en" ? "Do Reinforcement +" : "Fazer Reforço +",
    mastered: false,
  };
}
