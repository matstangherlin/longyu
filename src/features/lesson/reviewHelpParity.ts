/**
 * RC1.3 · P4/P5 — a revisão tem a MESMA ajuda da tarefa original, ou mais.
 *
 * Este é o ponto que mais dói na leitura do QA: o aluno errou justamente porque
 * precisava de ajuda. Depois vai para a revisão e perde dica, scaffold, contexto,
 * visual, áudio, chips e ajuda progressiva — tudo o que existia na tarefa
 * original. A revisão é remediação, não prova (P4.2): ela pode apresentar MAIS
 * apoio; nunca menos.
 *
 * O contrato (P4.1):
 *
 *     reviewHelpFloor   >= sourceHelpInitial
 *     reviewHelpCeiling >= sourceHelpCeiling
 *
 * E a ajuda é PROGRESSIVA (P4.3/P4.4): ter mais apoio disponível não significa
 * revelar a resposta de cara. Cada modalidade tem sua escada (P5), e "revelar"
 * é sempre o último degrau — nunca o primeiro.
 */

import type { LessonStep, StepKind } from "../../data/journey";
import {
  clampProductionHelpLevel,
  type ProductionHelpLevel,
} from "../../data/productionHelp";
import type { ImmediateRemediationKind } from "./immediateRemediation";

/** Apoios que uma tarefa pode oferecer — a unidade que comparamos entre lição e revisão. */
export type HelpAffordance =
  | "audio"
  | "audio_slow"
  | "pinyin"
  | "meaning"
  | "context"
  | "image"
  | "chips"
  | "eliminate"
  | "structure"
  | "vocabulary"
  | "reveal";

export interface HelpProfile {
  /** Apoio já visível ao abrir. */
  initial: ProductionHelpLevel;
  /** Teto pedível. */
  ceiling: ProductionHelpLevel;
  affordances: HelpAffordance[];
}

/**
 * Escada de dicas por modalidade (P5).
 *
 * A ordem importa: é ela que garante P4.4 — nada revela a resposta no primeiro
 * toque. "reveal" é sempre o último degrau e só existe porque um aluno que
 * esgotou a escada precisa de uma saída, não de um muro.
 */
export const REVIEW_HINT_LADDER: Record<ImmediateRemediationKind, HelpAffordance[]> = {
  // MEANING / MCQ — áudio, depois pinyin, depois contexto.
  choice: ["audio", "pinyin", "context", "eliminate", "reveal"],
  // VISUAL ASSOCIATION — hànzì, primeira parte do pinyin, áudio.
  image: ["image", "audio", "pinyin", "eliminate", "reveal"],
  hanzi: ["audio", "pinyin", "eliminate", "reveal"],
  pair: ["audio", "pinyin", "eliminate", "reveal"],
  // SENTENCE BUILD — pinyin nos chips, depois menos peças distratoras.
  build: ["pinyin", "structure", "chips", "reveal"],
  blank: ["audio", "pinyin", "eliminate", "reveal"],
  // LISTENING — ouvir de novo, ouvir devagar, depois pista de significado.
  // Nunca mostrar o alvo antes do áudio inicial (P5, mutação 7).
  listen: ["audio", "audio_slow", "meaning", "eliminate", "reveal"],
  // TONE — áudio primeiro; o contorno é pista, não resposta.
  tone: ["audio", "audio_slow", "context", "eliminate", "reveal"],
  pinyin: ["audio", "audio_slow", "eliminate", "reveal"],
};

/** Modalidades em que mostrar o alvo escrito antes do áudio entrega a resposta. */
export const AUDIO_FIRST_REVIEW_KINDS: ImmediateRemediationKind[] = ["listen", "tone", "pinyin"];

export function isAudioFirstReviewKind(kind: ImmediateRemediationKind): boolean {
  return AUDIO_FIRST_REVIEW_KINDS.includes(kind);
}

const KIND_AFFORDANCES: Partial<Record<StepKind, HelpAffordance[]>> = {
  listen: ["audio"],
  listen_select: ["audio", "context"],
  audio_discrimination: ["audio"],
  dictation: ["audio", "chips"],
  tone: ["audio"],
  tone_pair: ["audio", "meaning"],
  image_choice: ["image", "context"],
  compare_with_image: ["image", "context"],
  sentence_build: ["chips", "structure"],
  translation_build: ["chips", "structure"],
  hanzi_build: ["chips", "structure"],
  address_build: ["chips", "structure"],
  sentence_transform: ["chips", "structure"],
  produce: ["chips"],
  fill_blank: ["context", "chips"],
  substitution_drill: ["context"],
  match_pairs: ["meaning"],
  recognize: ["meaning"],
  decompose: ["structure"],
  dialogue_choice: ["context"],
  dialogue_completion: ["context"],
  contextual_choice: ["context"],
  conversation_scene: ["context", "audio"],
  conversation_repair: ["context", "chips"],
  comprehend: ["pinyin", "meaning"],
  free_production: ["structure", "vocabulary", "chips"],
  transfer_task: ["structure", "vocabulary", "chips"],
  reverse_recall: ["structure"],
};

/**
 * Apoio que a tarefa ORIGINAL oferecia.
 *
 * Lê o passo real, não o tipo: um `sentence_build` com banco de peças e um sem
 * não oferecem a mesma coisa, e é o apoio de fato exibido que a revisão precisa
 * igualar.
 */
export function sourceHelpProfile(step: LessonStep | undefined): HelpProfile {
  if (!step) return { initial: 0, ceiling: 0, affordances: [] };
  const affordances = new Set<HelpAffordance>(KIND_AFFORDANCES[step.kind] ?? []);
  if (step.audioText || step.kind === "listen" || step.kind === "listen_select") affordances.add("audio");
  if (step.pinyin || step.sourcePinyin) affordances.add("pinyin");
  if (step.imageId || step.iconId || step.correctImageId) affordances.add("image");
  if (step.bank?.length || step.distractors?.length || step.targetParts?.length) affordances.add("chips");
  if (step.patternPt || step.patternSlots?.length) affordances.add("structure");
  if (step.productionHelpVocab?.length) affordances.add("vocabulary");
  if (step.explanation || step.dialoguePrompt || step.situationPt) affordances.add("context");
  if (step.pt || step.targetMeaningPt) affordances.add("meaning");

  const initial = clampProductionHelpLevel(step.productionHelpInitial ?? (affordances.size > 0 ? 1 : 0));
  const ceiling = clampProductionHelpLevel(
    Math.max(step.productionHelpCeiling ?? 0, initial, affordances.size > 0 ? 2 : 0)
  );
  return { initial, ceiling, affordances: [...affordances] };
}

/**
 * Apoio que a REVISÃO oferece.
 *
 * O piso é sempre pelo menos o da origem (P4.1) e a escada da modalidade entra
 * inteira no teto: é ela que garante "mais apoio, não menos" sem revelar nada
 * de cara.
 */
export function reviewHelpProfile(input: {
  reviewKind: ImmediateRemediationKind;
  source: HelpProfile;
  available: HelpAffordance[];
}): HelpProfile {
  const ladder = REVIEW_HINT_LADDER[input.reviewKind] ?? [];
  const affordances = new Set<HelpAffordance>([...input.source.affordances]);
  for (const affordance of ladder) {
    if (input.available.includes(affordance)) affordances.add(affordance);
  }
  // "reveal" fecha a escada: quem esgotou as dicas sai da tela, não fica preso.
  affordances.add("reveal");
  return {
    initial: input.source.initial,
    ceiling: clampProductionHelpLevel(Math.max(input.source.ceiling, 3)),
    affordances: [...affordances],
  };
}

export interface HelpParityVerdict {
  ok: boolean;
  missing: HelpAffordance[];
  reasonPt?: string;
}

/** P4.1 — o contrato, escrito como verificação. Mutação 5 mora aqui. */
export function checkReviewHelpParity(input: {
  source: HelpProfile;
  review: HelpProfile;
}): HelpParityVerdict {
  const reviewSet = new Set(input.review.affordances);
  // Apoios que a revisão não precisa repetir literalmente porque a modalidade
  // mudou por transformação autorizada ficam fora da conta: "image" só é
  // exigido quando a revisão continua sendo visual.
  const missing = input.source.affordances.filter((affordance) => !reviewSet.has(affordance));
  const floorOk = input.review.initial >= input.source.initial;
  const ceilingOk = input.review.ceiling >= input.source.ceiling;
  if (missing.length === 0 && floorOk && ceilingOk) return { ok: true, missing: [] };
  return {
    ok: false,
    missing,
    reasonPt: [
      missing.length ? `apoio perdido: ${missing.join(", ")}` : null,
      floorOk ? null : `piso ${input.review.initial} < origem ${input.source.initial}`,
      ceilingOk ? null : `teto ${input.review.ceiling} < origem ${input.source.ceiling}`,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/**
 * Próxima dica da escada.
 *
 * `used` são os degraus já consumidos; `available` são os que existem para este
 * item (não adianta oferecer "áudio" a um item sem alvo sonoro). Devolve `null`
 * quando a escada acabou — a UI então esconde o botão em vez de oferecer nada.
 */
export function nextReviewHint(input: {
  reviewKind: ImmediateRemediationKind;
  used: readonly HelpAffordance[];
  available: readonly HelpAffordance[];
}): HelpAffordance | null {
  const ladder = REVIEW_HINT_LADDER[input.reviewKind] ?? [];
  for (const affordance of ladder) {
    if (input.used.includes(affordance)) continue;
    if (!input.available.includes(affordance)) continue;
    return affordance;
  }
  return null;
}

/** P4.4 — a primeira dica nunca pode ser a resposta. */
export function firstHintRevealsAnswer(kind: ImmediateRemediationKind): boolean {
  return (REVIEW_HINT_LADDER[kind] ?? [])[0] === "reveal";
}
