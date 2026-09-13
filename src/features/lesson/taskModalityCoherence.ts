/**
 * RC1.1 P4 — coerência entre tarefa e modalidade.
 *
 * O caso que abriu este módulo, visto em QA:
 *
 *     objetivo: "identificar 1º tom"
 *     UI:       Produção · "Monte a frase" · 妈 / 一 / 人 / 木 · 🎤 Falar
 *
 * Essas peças não formam resposta nenhuma para "identificar 1º tom". O aluno
 * lê um objetivo de percepção e recebe um exercício de montagem cujo banco é
 * uma lista de caracteres soltos que nem compõem o alvo.
 *
 * O contrato: SKILL → STEP KINDS PERMITIDOS → AFFORDANCE EXIGIDA. Uma
 * atividade precisa pedir algo que o renderer realmente representa.
 *
 * Runtime puro. Não cria StepKind (o freeze RC1 proíbe) — apenas recusa
 * combinações que o motor atual já sabe evitar.
 */

import type { LessonStep, StepKind } from "../../data/journey";

export type TaskSkill =
  | "tone_identification"
  | "audio_discrimination"
  | "listening_comprehension"
  | "meaning_recognition"
  | "image_recognition"
  | "hanzi_recall"
  | "sentence_production"
  | "conversation"
  | "instruction";

/** A affordance que a tela precisa oferecer para a habilidade ser avaliável. */
export type TaskAffordance =
  | "tone_choice"
  | "audio_playback"
  | "option_choice"
  | "image_choice"
  | "text_input"
  | "piece_build"
  | "speech_input"
  | "read_only";

export const ALLOWED_KINDS_BY_SKILL: Record<TaskSkill, readonly StepKind[]> = {
  tone_identification: ["tone", "tone_pair", "audio_discrimination", "listen_select"],
  audio_discrimination: ["audio_discrimination", "tone_pair", "listen_select", "listen", "dictation"],
  listening_comprehension: ["listen", "listen_select", "audio_to_action", "dictation", "audio_discrimination"],
  meaning_recognition: [
    "comprehend",
    "flashcard",
    "match_pairs",
    "dialogue_choice",
    "contextual_choice",
    "odd_one_out",
    "spot_error",
    "recognize",
    "microread",
    "sign_reading",
    "menu_reading",
    "schedule_reading",
    "reverse_recall",
  ],
  image_recognition: ["image_choice", "compare_with_image", "place_label", "map_direction"],
  hanzi_recall: ["recognize", "write", "hanzi_build", "decompose", "hanzi_evolution", "fill_blank", "dictation"],
  sentence_production: [
    "produce",
    "free_production",
    "sentence_build",
    "translation_build",
    "address_build",
    "sentence_transform",
    "substitution_drill",
    "transfer_task",
    "conversation_repair",
    "fill_blank",
    "dialogue_completion",
  ],
  conversation: ["conversation_scene", "dialogue_choice", "dialogue_completion", "conversation_repair", "city_context"],
  instruction: ["intro"],
};

export const REQUIRED_AFFORDANCE_BY_SKILL: Record<TaskSkill, readonly TaskAffordance[]> = {
  tone_identification: ["audio_playback", "tone_choice"],
  audio_discrimination: ["audio_playback", "option_choice"],
  listening_comprehension: ["audio_playback"],
  meaning_recognition: ["option_choice"],
  image_recognition: ["image_choice"],
  hanzi_recall: ["text_input"],
  sentence_production: ["piece_build"],
  conversation: ["option_choice"],
  instruction: ["read_only"],
};

/** Affordances que cada StepKind realmente entrega hoje. */
const AFFORDANCES_BY_KIND: Partial<Record<StepKind, readonly TaskAffordance[]>> = {
  intro: ["read_only"],
  listen: ["audio_playback", "read_only"],
  tone: ["audio_playback", "tone_choice", "option_choice"],
  tone_pair: ["audio_playback", "tone_choice", "option_choice"],
  audio_discrimination: ["audio_playback", "option_choice"],
  listen_select: ["audio_playback", "option_choice"],
  audio_to_action: ["audio_playback", "option_choice"],
  dictation: ["audio_playback", "text_input"],
  comprehend: ["option_choice"],
  flashcard: ["option_choice"],
  match_pairs: ["option_choice"],
  dialogue_choice: ["option_choice"],
  dialogue_completion: ["option_choice", "piece_build"],
  contextual_choice: ["option_choice"],
  odd_one_out: ["option_choice"],
  spot_error: ["option_choice"],
  microread: ["option_choice", "read_only"],
  reverse_recall: ["option_choice", "text_input"],
  sign_reading: ["option_choice"],
  menu_reading: ["option_choice"],
  schedule_reading: ["option_choice"],
  price_task: ["option_choice"],
  route_sequence: ["option_choice", "piece_build"],
  city_context: ["option_choice"],
  image_choice: ["image_choice"],
  compare_with_image: ["image_choice"],
  place_label: ["image_choice", "option_choice"],
  map_direction: ["image_choice", "option_choice"],
  recognize: ["option_choice", "text_input"],
  write: ["text_input"],
  hanzi_build: ["piece_build", "text_input"],
  decompose: ["piece_build", "option_choice"],
  hanzi_evolution: ["read_only", "option_choice"],
  fill_blank: ["text_input", "option_choice"],
  produce: ["text_input", "speech_input"],
  free_production: ["text_input", "speech_input"],
  sentence_build: ["piece_build"],
  translation_build: ["piece_build"],
  address_build: ["piece_build"],
  sentence_transform: ["text_input", "piece_build"],
  substitution_drill: ["text_input", "piece_build"],
  transfer_task: ["text_input", "speech_input"],
  conversation_repair: ["text_input", "speech_input"],
  conversation_scene: ["option_choice", "text_input", "speech_input"],
};

/** Kinds que renderizam o Phrase Builder ("Monte a frase"). */
export const PHRASE_BUILDER_KINDS: readonly StepKind[] = [
  "sentence_build",
  "translation_build",
  "address_build",
];

export function isPhraseBuilderKind(kind: StepKind): boolean {
  return PHRASE_BUILDER_KINDS.includes(kind);
}

const TONE_OBJECTIVE = /\btom\b|\btons\b|\btone\b|contorno/i;
const IDENTIFY_OBJECTIVE = /identific|reconhec|perceb|ouvir qual|qual tom|which tone|identify/i;
const IMAGE_OBJECTIVE = /imagem|figura|foto|image|picture/i;

/**
 * Habilidade que o passo promete. A ordem importa: o objetivo escrito tem a
 * palavra final, porque é ele que o aluno lê no alto da tela. Um passo sem
 * objetivo cai na habilidade natural do seu kind.
 */
export function taskSkillForStep(step: Pick<LessonStep, "kind" | "objective" | "title">): TaskSkill {
  const objective = `${step.objective ?? ""} ${step.title ?? ""}`.trim();
  if (objective && TONE_OBJECTIVE.test(objective) && IDENTIFY_OBJECTIVE.test(objective)) {
    return "tone_identification";
  }
  if (objective && IMAGE_OBJECTIVE.test(objective) && IDENTIFY_OBJECTIVE.test(objective)) {
    return "image_recognition";
  }
  return taskSkillForKind(step.kind);
}

export function taskSkillForKind(kind: StepKind): TaskSkill {
  for (const [skill, kinds] of Object.entries(ALLOWED_KINDS_BY_SKILL) as [TaskSkill, readonly StepKind[]][]) {
    if (skill === "instruction") continue;
    if (kinds.includes(kind)) return skill;
  }
  return "meaning_recognition";
}

export function affordancesForKind(kind: StepKind): readonly TaskAffordance[] {
  return AFFORDANCES_BY_KIND[kind] ?? ["option_choice"];
}

// ── P4.4 — quando o Phrase Builder pode existir ────────────────────────────

export interface PhraseBuilderReadiness {
  ok: boolean;
  /** Há um alvo de produção linguística (não um caractere solto). */
  hasProductionTarget: boolean;
  /** O banco de peças compõe o alvo e tem distratores plausíveis. */
  hasMeaningfulBuildBank: boolean;
  /** A resposta esperada é montável a partir do banco. */
  isAssemblable: boolean;
  reasons: string[];
}

function partsOf(step: LessonStep): string[] {
  const parts = step.targetParts ?? step.target ?? [];
  return parts.map((part) => String(part ?? "").trim()).filter(Boolean);
}

function bankOf(step: LessonStep): string[] {
  const bank = [...(step.bank ?? []), ...(step.wordBank ?? []), ...(step.distractors ?? [])];
  return bank.map((piece) => String(piece ?? "").trim()).filter(Boolean);
}

/**
 * "Montar a frase" pede três coisas ao mesmo tempo. Faltando qualquer uma, o
 * exercício vira o que o QA viu: caracteres soltos sob um enunciado que não
 * combina com eles.
 */
export function phraseBuilderReadiness(step: LessonStep): PhraseBuilderReadiness {
  const reasons: string[] = [];
  const parts = partsOf(step);
  const bank = bankOf(step);
  const pool = new Set([...parts, ...bank]);

  // 1. Alvo de produção: pelo menos duas peças formando uma sequência.
  const hasProductionTarget = parts.length >= 2;
  if (!hasProductionTarget) {
    reasons.push("sem productionTarget: menos de duas peças formam a resposta");
  }

  // 2. Banco com sentido: cobre o alvo e não é majoritariamente enchimento.
  //    Um banco em que os distratores superam a resposta não é montagem — é
  //    reconhecimento fantasiado de montagem, e foi assim que 妈/一/人/木
  //    apareceu embaixo de um alvo de um caractere só.
  const covers = parts.length > 0 && parts.every((part) => pool.has(part));
  const decoys = Math.max(0, pool.size - parts.length);
  const hasMeaningfulBuildBank = pool.size >= 2 && covers && decoys <= parts.length + 2;
  if (!hasMeaningfulBuildBank) {
    reasons.push(
      covers
        ? `meaningfulBuildBank ausente: ${decoys} distratores para ${parts.length} peça(s) de resposta`
        : "meaningfulBuildBank ausente: banco não cobre a resposta"
    );
  }

  // 3. Montável: cada peça do alvo existe no banco disponível.
  const isAssemblable = hasProductionTarget && parts.every((part) => pool.has(part));
  if (hasProductionTarget && !isAssemblable) {
    reasons.push("resposta não é montável: peça do alvo ausente do banco");
  }

  return {
    ok: hasProductionTarget && hasMeaningfulBuildBank && isAssemblable,
    hasProductionTarget,
    hasMeaningfulBuildBank,
    isAssemblable,
    reasons,
  };
}

// ── Verificação de um passo ────────────────────────────────────────────────

export interface ModalityViolation {
  code: "KIND_NOT_ALLOWED" | "MISSING_AFFORDANCE" | "PHRASE_BUILDER_UNSUPPORTED" | "PHRASE_BUILDER_INJECTED";
  skill: TaskSkill;
  kind: StepKind;
  message: string;
}

/** Habilidades em que o Phrase Builder nunca entra automaticamente (P4.4). */
export const PHRASE_BUILDER_FORBIDDEN_SKILLS: readonly TaskSkill[] = [
  "tone_identification",
  "image_recognition",
  "audio_discrimination",
];

export function checkTaskModalityCoherence(step: LessonStep): ModalityViolation[] {
  const violations: ModalityViolation[] = [];
  const skill = taskSkillForStep(step);
  const allowed = ALLOWED_KINDS_BY_SKILL[skill];

  if (!allowed.includes(step.kind)) {
    violations.push({
      code: "KIND_NOT_ALLOWED",
      skill,
      kind: step.kind,
      message: `objetivo promete "${skill}" e o passo renderiza "${step.kind}"`,
    });
  }

  const affordances = affordancesForKind(step.kind);
  const required = REQUIRED_AFFORDANCE_BY_SKILL[skill];
  if (allowed.includes(step.kind) && !required.some((affordance) => affordances.includes(affordance))) {
    violations.push({
      code: "MISSING_AFFORDANCE",
      skill,
      kind: step.kind,
      message: `"${step.kind}" não oferece nenhuma affordance exigida por "${skill}" (${required.join(", ")})`,
    });
  }

  if (isPhraseBuilderKind(step.kind)) {
    if (PHRASE_BUILDER_FORBIDDEN_SKILLS.includes(skill)) {
      violations.push({
        code: "PHRASE_BUILDER_INJECTED",
        skill,
        kind: step.kind,
        message: `Phrase Builder injetado em tarefa de "${skill}"`,
      });
    }
    const readiness = phraseBuilderReadiness(step);
    if (!readiness.ok) {
      violations.push({
        code: "PHRASE_BUILDER_UNSUPPORTED",
        skill,
        kind: step.kind,
        message: `Phrase Builder sem base: ${readiness.reasons.join("; ")}`,
      });
    }
  }

  return violations;
}

/**
 * P4.3 — produção de tom só com avaliador compatível.
 *
 * Não existe avaliação acústica de contorno tonal no app. Então uma tarefa de
 * tom nunca pede microfone fingindo medir tom: reconhecimento/produção por voz
 * continua valendo para frase e lexema, não para score tonal.
 */
export function allowsSpeechScoring(skill: TaskSkill, hasAcousticToneEvaluator = false): boolean {
  if (skill === "tone_identification") return hasAcousticToneEvaluator;
  return skill === "sentence_production" || skill === "conversation";
}

/**
 * Filtro aplicado ao plano gerado em runtime. Remove o passo incoerente em vez
 * de tentar consertá-lo: um exercício remendado continua mentindo sobre o que
 * mede. O plano segue com os passos restantes — a lição não fica mais curta que
 * o mínimo porque o planner já garante volume antes daqui.
 */
export function enforceTaskModalityCoherence<T extends LessonStep>(
  steps: readonly T[]
): { steps: T[]; dropped: Array<{ step: T; violations: ModalityViolation[] }> } {
  const kept: T[] = [];
  const dropped: Array<{ step: T; violations: ModalityViolation[] }> = [];
  for (const step of steps) {
    const violations = checkTaskModalityCoherence(step).filter(
      (violation) =>
        violation.code === "PHRASE_BUILDER_INJECTED" || violation.code === "PHRASE_BUILDER_UNSUPPORTED"
    );
    if (violations.length) dropped.push({ step, violations });
    else kept.push(step);
  }
  return { steps: kept, dropped };
}

/**
 * Reparo em runtime, aplicado sobre um plano já gerado.
 *
 * O caso real: a pass 3 pedia "Produza o núcleo" e montava um `sentence_build`
 * cujo alvo era UM caractere (妈) com banco de enchimento fixo (一 / 人 / 木).
 * Os mesmos distratores que servem para múltipla escolha viraram peças de
 * montagem, e nenhuma combinação delas responde a coisa alguma.
 *
 * Com um caractere só existe uma produção coerente — montar o próprio
 * caractere, que tem fragmentos de verdade. Quando o catálogo de builders não
 * cobre o caractere, o passo sai do plano e a produção fica por conta do
 * `reverse_recall` que o gerador já emite ao lado dele.
 *
 * `resolveCharacterBuilder` é injetado para este módulo não depender do
 * catálogo de hànzì (e não virar mais um nó do grafo de dados).
 */
export function repairPhraseBuilderCoherence<T extends LessonStep>(
  steps: readonly T[],
  resolveCharacterBuilder?: (character: string) =>
    | { id: string; character: string; promptPt?: string; meaningPt?: string; explanationPt?: string }
    | undefined
): T[] {
  const repaired: T[] = [];
  for (const step of steps) {
    if (!isPhraseBuilderKind(step.kind) || phraseBuilderReadiness(step).ok) {
      repaired.push(step);
      continue;
    }
    const parts = partsOf(step);
    const single = parts.length === 1 ? parts[0] : "";
    const builder = single ? resolveCharacterBuilder?.(single) : undefined;
    if (builder) {
      repaired.push({
        ...step,
        kind: "hanzi_build",
        title: "Monte o caractere",
        builderId: builder.id,
        prompt: builder.promptPt,
        sourceMeaning: builder.meaningPt,
        correctAnswer: builder.character,
        explanation: builder.explanationPt,
        targetParts: undefined,
        target: undefined,
        bank: undefined,
        wordBank: undefined,
        distractors: undefined,
      } as unknown as T);
      continue;
    }
    // Sem builder: o passo simplesmente não entra.
  }
  return repaired;
}
