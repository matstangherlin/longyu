import type { StepKind } from "../data/journey";

/**
 * RC2.2.14 — contrato canônico de avanço por StepKind.
 *
 * Toda atividade da lição conclui do MESMO jeito no fim da cadeia:
 *
 *   componente do passo
 *     → onDone(correct?)                    (uma vez: latch do StepRenderer)
 *     → LessonPlayer.handleDone             (uma vez por completionKey)
 *     → setIdx(idx + 1) | finish()
 *
 * O que muda por tipo é COMO o componente chega ao `onDone`. Esta tabela
 * torna isso explícito; `validate:lesson-step-progression` confere que cada
 * StepKind real tem entrada, que o renderer declarado é o que o StepRenderer
 * usa e que cada passo das 134 lições cai num contrato conhecido.
 *
 * `Record<StepKind, …>`: um StepKind novo sem contrato não compila.
 */

export type StepInteraction =
  | "read"
  | "listen_speak"
  | "tone_choice"
  | "choice"
  | "audio_choice"
  | "image_choice"
  | "pairs"
  | "token_build"
  | "hanzi_build"
  | "typing"
  | "speech_or_typing"
  | "map"
  | "conversation";

/** Como o componente sinaliza "passo concluído". */
export type StepCompletionSignal =
  /** Resposta avaliada → feedback no próprio passo → botão Continuar chama onDone(!erro). */
  | "feedback_continue"
  /** Conteúdo sem avaliação → botão Continuar/Entendi chama onDone(). */
  | "continue_button"
  /** Diálogo do guia termina (ou "Entendi") → onDone(). */
  | "dialogue_complete"
  /** Construtor de hànzì confirma a montagem → onCorrect(firstTry) → onDone(firstTry). */
  | "builder_correct"
  /** Cena de conversa chega ao fim → onDone(sem erro, meta). */
  | "scene_complete";

/** O que acontece depois de um erro. */
export type StepRetryBehavior =
  /** onMistake → painel do player (tentar de novo remonta com stepAttempt + 1, ou continuar). */
  | "player_modal"
  /** O próprio componente pede nova tentativa (sem painel do player). */
  | "in_component"
  /** Passo não avaliado: não existe erro. */
  | "none";

export interface StepAdvanceContract {
  /** Componente que o StepRenderer usa para o tipo. */
  renderer: string;
  interaction: StepInteraction;
  /** Conta como questão avaliada (acerto/erro, Vida, perfeição). */
  graded: boolean;
  completionSignal: StepCompletionSignal;
  retry: StepRetryBehavior;
}

/** Chaves de idempotência (documentadas aqui, conferidas pelo validador). */
export const STEP_COMPLETION_LATCH = "StepRenderer.completionSentRef" as const;
export const PLAYER_COMPLETION_KEY_PARTS = ["lessonId", "planNonce", "idx", "stepAttempt", "stepIdentity"] as const;

/**
 * Toque que "atravessa" para o passo seguinte: no celular, um toque duplo em
 * Continuar faz o segundo toque cair no botão do próximo passo, que nasce no
 * mesmo lugar — e a lição pulava um passo. Um clique no MESMO ponto do
 * anterior, logo depois de um passo montar, é descartado (ver useTapThroughGuard).
 */
export const STEP_TAP_THROUGH_GUARD_MS = 350;
/** Distância máxima (px) do toque anterior para contar como o mesmo toque duplo. */
export const STEP_TAP_THROUGH_RADIUS_PX = 32;

export function isTapThrough(stepMountedAt: number, now: number): boolean {
  return now - stepMountedAt >= 0 && now - stepMountedAt < STEP_TAP_THROUGH_GUARD_MS;
}

const choice = (renderer: string, interaction: StepInteraction = "choice"): StepAdvanceContract => ({
  renderer,
  interaction,
  graded: true,
  completionSignal: "feedback_continue",
  retry: "player_modal",
});
const reading = (renderer: string, completionSignal: StepCompletionSignal = "continue_button"): StepAdvanceContract => ({
  renderer,
  interaction: "read",
  graded: false,
  completionSignal,
  retry: "none",
});

export const STEP_ADVANCE_CONTRACT: Record<StepKind, StepAdvanceContract> = {
  intro: reading("StepIntro", "dialogue_complete"),
  listen: { renderer: "StepListen", interaction: "listen_speak", graded: false, completionSignal: "continue_button", retry: "none" },
  tone: choice("StepTone", "tone_choice"),
  comprehend: choice("StepComprehend"),
  produce: { renderer: "StepProduce", interaction: "token_build", graded: true, completionSignal: "feedback_continue", retry: "player_modal" },
  write: { renderer: "StepWrite", interaction: "typing", graded: true, completionSignal: "feedback_continue", retry: "player_modal" },
  recognize: choice("StepRecognize"),
  decompose: reading("StepDecompose"),
  flashcard: reading("StepFlashcard"),
  microread: reading("StepMicroread"),
  match_pairs: choice("StepMatchPairs", "pairs"),
  listen_select: choice("StepListenSelect", "audio_choice"),
  sentence_build: choice("StepSentenceBuild", "token_build"),
  translation_build: choice("StepTranslationBuild", "token_build"),
  fill_blank: choice("StepFillBlank"),
  dialogue_choice: choice("StepDialogueChoice"),
  conversation_scene: { renderer: "ConversationSceneStep", interaction: "conversation", graded: true, completionSignal: "scene_complete", retry: "in_component" },
  hanzi_evolution: reading("StepHanziEvolution"),
  hanzi_build: { renderer: "StepHanziBuild", interaction: "hanzi_build", graded: true, completionSignal: "builder_correct", retry: "in_component" },
  tone_pair: choice("StepTonePair", "pairs"),
  image_choice: choice("StepImageChoice", "image_choice"),
  compare_with_image: choice("StepCompareWithImage", "image_choice"),
  audio_discrimination: choice("StepAudioDiscrimination", "audio_choice"),
  dictation: choice("StepDictation", "token_build"),
  odd_one_out: choice("StepOddOneOut"),
  spot_error: choice("StepSpotError"),
  free_production: { renderer: "StepFreeProduction", interaction: "speech_or_typing", graded: true, completionSignal: "feedback_continue", retry: "player_modal" },
  transfer_task: { renderer: "StepFreeProduction", interaction: "speech_or_typing", graded: true, completionSignal: "feedback_continue", retry: "player_modal" },
  conversation_repair: choice("StepConversationRepair"),
  contextual_choice: choice("StepDialogueChoice"),
  audio_to_action: choice("StepListenSelect", "audio_choice"),
  sentence_transform: choice("StepSentenceBuild", "token_build"),
  substitution_drill: choice("StepDialogueChoice|StepFillBlank"),
  dialogue_completion: choice("StepDialogueChoice"),
  reverse_recall: { renderer: "StepFreeProduction", interaction: "speech_or_typing", graded: true, completionSignal: "feedback_continue", retry: "player_modal" },
  map_direction: choice("StepMapDirection", "map"),
  place_label: choice("StepDialogueChoice"),
  address_build: choice("StepAddressBuild", "token_build"),
  city_context: choice("StepDialogueChoice"),
  sign_reading: choice("StepDialogueChoice"),
  menu_reading: choice("StepDialogueChoice"),
  price_task: choice("StepDialogueChoice"),
  route_sequence: choice("StepAddressBuild", "token_build"),
  schedule_reading: choice("StepDialogueChoice"),
};

/** Identidade estável de um passo: muda quando o CONTEÚDO do passo muda. */
export function stepIdentity(step: {
  kind: string;
  title?: string;
  prompt?: string;
  answer?: string;
  correctAnswer?: string;
  text?: string;
  hanzi?: string;
  sceneId?: string;
  builderId?: string;
  charId?: string;
  pedagogyVariant?: string;
}): string {
  const raw = [
    step.kind,
    step.pedagogyVariant ?? "",
    step.sceneId ?? "",
    step.builderId ?? "",
    step.charId ?? "",
    step.title ?? "",
    step.prompt ?? "",
    step.answer ?? step.correctAnswer ?? "",
    step.text ?? step.hanzi ?? "",
  ].join("\u0001");
  // djb2 — curto e estável; não é segurança, só identidade de conteúdo.
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0;
  return `${step.kind}:${(hash >>> 0).toString(36)}`;
}
