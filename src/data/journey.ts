import { CHARACTERS } from "./characters";
import { CHUNKS } from "./chunks";
import type { ItemType } from "./types";
import {
  conversationSceneStepFromId,
  type ConversationCharacter,
  type ConversationCheckpoint,
  type ConversationInteraction,
  type ConversationLine,
  type ConversationNode,
  type ConversationSceneStep as ConversationSceneDefinition,
  type ConversationSetting,
  type ConversationVariantLevel,
} from "./conversationScenes";
import {
  defaultVisualDistractors,
  resolveVisualConcept,
  type ImageChoiceMode,
  type VisualConceptId,
} from "./visualVocabulary";
import type { CommunicativeGoal, PatternSlot, RepairDirection, RepairStrategy } from "./productionTasks";

// Jornada: Tiers → Fases → Módulos → Lições.
// Ordem pedagógica: falar cedo → tons → frases → hànzì lógico → números → vida real → leitura.

export type StepKind =
  | "intro"
  | "listen"
  | "tone"
  | "comprehend"
  | "produce"
  | "write"
  | "recognize"
  | "decompose"
  | "flashcard"
  | "microread"
  | "match_pairs"
  | "listen_select"
  | "sentence_build"
  | "translation_build"
  | "fill_blank"
  | "dialogue_choice"
  | "conversation_scene"
  | "hanzi_evolution"
  | "hanzi_build"
  | "tone_pair"
  | "image_choice"
  | "compare_with_image"
  // ——— Motores de percepção e sentido (src/data/perceptionDrills.ts) ———
  | "audio_discrimination"
  | "dictation"
  | "odd_one_out"
  | "spot_error"
  // ——— Motores de produção e sobrevivência (src/data/productionTasks.ts) ———
  | "free_production"
  | "transfer_task"
  | "conversation_repair"
  // ——— Pedagogia V3 — tarefas com ganho cognitivo distinto (mastery loop) ———
  | "contextual_choice"
  | "audio_to_action"
  | "sentence_transform"
  | "substitution_drill"
  | "dialogue_completion"
  | "reverse_recall"
  // ——— Pedagogia V3.1 — China Real / navegacao urbana ———
  | "map_direction"
  | "place_label"
  | "address_build"
  | "city_context"
  | "sign_reading"
  | "menu_reading"
  | "price_task"
  | "route_sequence"
  | "schedule_reading";

export type {
  ConversationCharacter,
  ConversationCheckpoint,
  ConversationInteraction,
  ConversationLine,
  ConversationNode,
  ConversationSetting,
  ConversationSceneDefinition,
};

export type LessonStageId = "intro" | "recognition" | "assembly" | "usage" | "post_conversation" | "consolidation";

export type LessonStageMotor = "som" | "fala" | "hanzi" | "leitura" | "revisao";

export interface LessonStage {
  id: LessonStageId;
  name?: string;
  objective?: string;
  actionLabel?: string;
  description?: string;
  motor?: LessonStageMotor;
  rewardQi?: number;
  stepKinds?: StepKind[];
  exercises?: StepKind[];
  reusesPreviousVocabulary?: string[];
  introducesNewVocabulary?: string[];
}

export type StepTextType = "pt" | "hanzi" | "pinyin" | "audio";
export type StepHelpMode = "character" | "word" | "sentence" | "progressive" | "disabled";
export type DictationMode = "blocks" | "pinyin" | "hanzi" | "immersion";
export type CompareWithImageMode = "word_to_image" | "image_to_word";
export type PedagogyVariant =
  | "audio_same_different"
  | "dragon_dictation"
  | "meaning_odd_one_out"
  | "meaning_spot_error"
  | "meaning_intention_match"
  | "sentence_lab_distractors"
  | "sentence_lab_no_translation"
  | "sentence_lab_audio"
  | "sentence_lab_repair";

export interface LessonStep {
  kind: StepKind;
  objective?: string;
  exercises?: StepKind[];
  reusesPreviousVocabulary?: string[];
  introducesNewVocabulary?: string[];
  title?: string;
  body?: string;
  assist?: "guided" | "quiz";
  mode?: "guided_write" | "free_reflection" | "translation_fill";
  /** Variation inside an existing engine; keeps grading/SRS on the canonical kind. */
  pedagogyVariant?: PedagogyVariant;
  /** Automatic lesson rotation: first attempt, review attempt, challenge attempt. */
  practiceVariant?: "A" | "B" | "C";
  dictationMode?: DictationMode;
  /** Audio discrimination can compare two hidden stimuli without leaking hanzi. */
  audioSequence?: string[];
  /** Sentence Lab accepts alternate grammatically valid piece sequences. */
  acceptedTargetParts?: string[][];
  /** Immersion dictation can limit playback to one attempt. */
  playbackLimit?: number;
  imageChoiceMode?: ImageChoiceMode;
  imageId?: string;
  iconId?: string;
  promptPt?: string;
  targetHanzi?: string;
  targetPinyin?: string;
  targetMeaningPt?: string;
  imageOptions?: string[];
  correctImageId?: string;
  /** Comparação visual curada: palavra → duas imagens ou imagem → duas palavras. */
  compareWithImageMode?: CompareWithImageMode;
  /** 1 = contraste evidente · 2 = mesma categoria · 3 = contraste semântico próximo. */
  compareWithImageLevel?: 1 | 2 | 3;
  text?: string;
  pinyin?: string;
  pt?: string;
  hanzi?: string;
  tone?: 1 | 2 | 3 | 4;
  /** PED-005 — subset of tones for early contrast drills (e.g. [1, 3]). */
  toneChoices?: Array<1 | 2 | 3 | 4>;
  answer?: string;
  suggestion?: string;
  requiredTerms?: string[];
  wordBank?: string[];
  accepts?: string[];
  options?: string[];
  target?: string[];
  bank?: string[];
  placeholder?: string;
  charId?: string;
  charIds?: string[];
  chunkId?: string;
  lines?: {
    hanzi: string;
    pinyin: string;
    pt?: string;
    speakerId?: string;
    emotion?: ConversationLine["emotion"];
    audioText?: string;
    revealMode?: ConversationLine["revealMode"];
  }[];
  pairs?: {
    left: string;
    right: string;
    leftType?: StepTextType;
    rightType?: StepTextType;
    reinforcement?: boolean;
    reviewType?: ItemType;
    reviewItemId?: string;
  }[];
  audioText?: string;
  slowAudioText?: string;
  prompt?: string;
  sourceText?: string;
  sourcePinyin?: string;
  sourceMeaning?: string;
  targetParts?: string[];
  distractors?: string[];
  sentenceBefore?: string;
  sentenceAfter?: string;
  blankAnswer?: string;
  speaker?: string;
  dialoguePrompt?: string;
  correctAnswer?: string;
  explanation?: string;
  /** PED-013 — nível do "Qual não pertence?" (1 explícito → 3 inferência). */
  oddOneOutLevel?: 1 | 2 | 3;
  /** Rótulo do grupo semântico (não VocabDomain). */
  groupLabelPt?: string;
  /** Metadados por opção (pinyin/significado) para apoio no nível 1. */
  optionMeta?: Record<string, { pinyin?: string; meaningPt?: string }>;
  /** Controle granular de ajuda contextual em hanzi/palavras/frases. */
  helpMode?: StepHelpMode;
  /** Pergunta sem dica: hover/toque mostra aviso neutro, sem pinyin/traducao. */
  isNoHint?: boolean;
  /** "Som primeiro": mostra só o pinyin/áudio nesta exposição; o hànzì vem depois. */
  hanziMode?: "pinyin_first";
  /** hanzi_build: id de um exercício em data/hanziBuilder.ts (carta visual). */
  builderId?: string;
  /** conversation_scene: id canônico da cena. */
  sceneId?: string;
  setting?: ConversationSetting;
  characters?: ConversationCharacter[];
  checkpoint?: ConversationCheckpoint;
  /** conversation_scene V2: fluxo por nós com interações e ramificação. */
  nodes?: ConversationNode[];
  entryNodeId?: string;
  /** Intenção comunicativa da cena — alimenta a seleção sem repetição. */
  sceneIntent?: string;
  learnedRefs?: string[];
  newRefs?: string[];
  /** Lição dedicada pode apresentar mais de 1 novidade na cena. */
  dedicatedLesson?: boolean;
  /** Nível de apresentação da cena (guided→audio_first), pelo histórico do aluno. */
  conversationVariantLevel?: ConversationVariantLevel;
  // ——— Conversation Vocabulary Loop: metadados de tarefa derivada de conversa ———
  /** Esta tarefa foi derivada de uma conversa (reúso do vocabulário exibido). */
  conversationDerived?: boolean;
  /** sceneId da conversa de origem. */
  conversationSourceSceneId?: string;
  /** Ref de vocabulário coberto por esta tarefa (chunk:/char:). */
  conversationCoveredRef?: string;
  /** Modalidade (kind) usada nesta reutilização. */
  conversationModality?: StepKind;
  /** Número da exposição desse item (1ª, 2ª…) contando a conversa como 0. */
  conversationExposureNumber?: number;
  /** Gerada por erro do aluno ou por regra padrão de cobertura. */
  conversationDerivedReason?: "error" | "rule";
  // ——— Fase Pós-Conversa (consolidação imediata após conversation_scene) ———
  /** Tarefa da fase Pós-Conversa (consolida vocabulário da conversa recém-concluída). */
  postConversationPhase?: boolean;
  /** Tipo pedagógico da tarefa pós-conversa (para adaptação e relatórios). */
  postConversationTaskType?: PostConversationTaskType;
  /** Índice desta tarefa na fase (1-based). */
  postConversationIndex?: number;
  /** Total de tarefas na fase pós-conversa desta conversa. */
  postConversationCount?: number;
  // ——— audio_discrimination: par mínimo "iguais ou diferentes?" ———
  /** Segundo áudio do par (o primeiro continua em audioText). */
  audioTextB?: string;
  /** O que muda entre os dois sons ("2º × 3º tom", "-en × -eng"). */
  contrastLabel?: string;
  /** Par mínimo de origem (src/data/perceptionDrills.ts). */
  minimalPairId?: string;
  /** Lados do par, revelados só depois da resposta. */
  pairReveal?: { hanzi: string; pinyin: string; meaningPt: string }[];
  // ——— dictation: ouvir e escrever ———
  // dictationMode já declarado acima (DictationMode inclui immersion).
  /** Modo imersão: velocidade natural e uma única reprodução. */
  singlePlayback?: boolean;
  // ——— free_production / transfer_task: produzir sem apoio ———
  /**
   * Situação em pt-BR ("Peça duas águas."). Nunca contém hànzì nem pinyin:
   * se contivesse, o exercício viraria cópia em vez de produção.
   */
  situationPt?: string;
  /** Estrutura visível na transferência ("我要 ___") — nunca a resposta. */
  patternPt?: string;
  /**
   * Scaffold STPVO-light: ordem nomeada da frase (sujeito · tempo · verbo…).
   * Aparece na produção e na transferência; nunca revela a resposta.
   */
  patternSlots?: PatternSlot[];
  /** Frame de origem (src/data/productionTasks.ts), para relatório e SRS. */
  productionFrameId?: string;
  /** Objetivo comunicativo: define o que conta como resposta certa. */
  productionGoal?: CommunicativeGoal;
  /**
   * Produção ABERTA: o enunciado dá só o objetivo e a situação, e o conteúdo
   * é escolha do aluno. Qualquer realização conhecida do objetivo vale.
   */
  productionOpen?: boolean;
  /** Lembrete de que a escolha é do aluno (só na produção aberta). */
  productionHintPt?: string;
  /** Outras respostas certas, mostradas DEPOIS da tentativa — nunca antes. */
  productionExamples?: { hanzi: string; pinyin: string }[];
  /** Frase-âncora já ensinada que sustenta a transferência. */
  transferAnchorHanzi?: string;
  transferAnchorPinyin?: string;
  transferAnchorPt?: string;
  /** A frase alvo não existe no currículo: acertar exige aplicar o padrão. */
  isNovelCombination?: boolean;
  /** Degrau de scaffold da produção/transferência:
   * guided → supported → question → open.
   */
  productionAssist?: "guided" | "supported" | "question" | "open";
  /** Dica visual de transformação (ex.: 我 → 你) no degrau supported. */
  transferTransformHint?: { from: string; to: string };
  /**
   * Scaffolding visual progressivo (0–4), independente de `productionAssist`.
   * 0 situação+input · 1 padrão · 2 estrutura · 3 vocabulário · 4 montagem
   */
  productionHelpInitial?: 0 | 1 | 2 | 3 | 4;
  /** Teto pedível sem erro repetido (nível 4 só após dificuldade repetida). */
  productionHelpCeiling?: 0 | 1 | 2 | 3 | 4;
  /** Primeira transferência desta estrutura no currículo. */
  productionHelpFirstOfStructure?: boolean;
  /** Vocabulário útil já aprendido (nível 3) — não monta a frase. */
  productionHelpVocab?: { hanzi: string; pinyin?: string; meaningPt?: string }[];
  /** Banco de peças para o nível 4 (sentence build). */
  productionHelpBuildBank?: string[];
  // ——— conversation_repair: continuar depois do mal-entendido ———
  /** Fala do personagem que trava a conversa (你说什么？/我听不懂). */
  repairNpcHanzi?: string;
  repairNpcPinyin?: string;
  repairNpcPt?: string;
  /** Quem não entendeu quem. */
  repairDirection?: RepairDirection;
  /** Estratégia correta nesta rodada. */
  repairStrategy?: RepairStrategy;
  /** Estratégias oferecidas na 1ª fase (a certa incluída). */
  repairStrategyOptions?: RepairStrategy[];
  /**
   * conversation_scene: o que acontece quando a comunicação quebra DENTRO da
   * cena. O primeiro erro o personagem absorve (ramo de erro autoral); a
   * partir do segundo ele para a conversa e o aluno precisa reparar antes de
   * seguir. Ausente quando o aluno ainda não tem vocabulário de reparo.
   */
  conversationRepairBeat?: ConversationRepairBeat;
  // ——— Pedagogia V3.1 — China Real ———
  mapFromLabel?: string;
  mapToLabel?: string;
  mapCorrectAction?: "left" | "right" | "straight" | "destination";
  mapActionOptions?: Array<"left" | "right" | "straight" | "destination">;
  mapScaffoldLevel?: 1 | 2 | 3 | 4;
  placeLabelCategory?: string;
  cityId?: string;
  citySituationPt?: string;
  // ——— Pedagogia V3.2 — mundo real / survival ———
  /** Placa urbana (sign_reading). */
  signHanzi?: string;
  signCategory?: string;
  /** Cardápio simplificado (menu_reading). */
  menuItems?: { hanzi: string; pinyin?: string; meaningPt?: string; priceHanzi?: string }[];
  /** Preço pedagógico (price_task). */
  priceHanzi?: string;
  priceAmount?: number;
  /** Sequência de rota (route_sequence): peças na ordem correta. */
  routeParts?: string[];
  /** Tabela curta de horário (schedule_reading). */
  scheduleRows?: { timeHanzi: string; destinationHanzi: string; labelPt?: string }[];
}

/** Batida de reparo disparada por falha repetida numa cena. */
export interface ConversationRepairBeat {
  npcHanzi: string;
  npcPinyin: string;
  npcPt: string;
  promptPt: string;
  strategy: RepairStrategy;
  strategyOptions: RepairStrategy[];
  targetHanzi: string;
  targetPinyin: string;
  accepts: string[];
  whyPt: string;
}

/** Tipos de tarefa da fase Pós-Conversa (rótulos pedagógicos). */
export type PostConversationTaskType =
  | "meaning_check"
  | "situation_reply"
  | "build_used_answer"
  | "fill_missing"
  | "listen_choose"
  | "image_match"
  | "spot_hanzi"
  | "alternate_scenario"
  | "repair_repeat"
  | "recreate_no_translation"
  | "polite_reply"
  | "order_dialogue"
  // ——— Motores de percepção na fase pós-conversa ———
  | "sound_contrast"
  | "write_heard"
  | "group_meaning"
  // ——— Motores de produção na fase pós-conversa ———
  | "produce_free"
  | "transfer_context"
  | "repair_recover";

/** Rótulos curtos para UI e relatórios. */
export const POST_CONVERSATION_TASK_LABELS: Record<PostConversationTaskType, string> = {
  meaning_check: "O que esta frase significa?",
  situation_reply: "Qual resposta combina com esta situação?",
  build_used_answer: "Monte a resposta que você usou.",
  fill_missing: "Complete a palavra que faltou.",
  listen_choose: "Ouça e escolha a resposta.",
  image_match: "Escolha a imagem correspondente.",
  spot_hanzi: "Qual hànzì apareceu na conversa?",
  alternate_scenario: "Responda em um cenário diferente.",
  repair_repeat: "O personagem não entendeu. Como pedir repetição?",
  recreate_no_translation: "Recrie a frase sem tradução.",
  polite_reply: "Escolha uma resposta mais educada.",
  order_dialogue: "Organize a conversa em ordem.",
  sound_contrast: "Estes dois sons são iguais?",
  write_heard: "Escreva o que você ouviu.",
  group_meaning: "Qual não pertence ao grupo?",
  produce_free: "Diga isto sozinho, sem alternativas.",
  transfer_context: "Mesma estrutura, situação nova.",
  repair_recover: "A conversa travou. Recupere.",
};

export type Skill = "som" | "fala" | "hanzi" | "leitura" | "sistema";

export interface Lesson {
  id: string;
  title: string;
  skill: Skill;
  /** Metadados curriculares para auditoria de microtarefas. */
  libraryItems?: string[];
  reviewItems?: string[];
  /** Itens exibidos como prévia cultural/sonora; não podem ser cobrados cedo. */
  previewItems?: string[];
  /** Hànzì vistos como novidade visual nesta lição, antes de entrarem no repertório principal. */
  newHanzi?: string[];
  rewardQi?: number;
  estimatedMinutes?: number;
  /** Lição de consolidação no fim do módulo (nó dourado). */
  isReview?: boolean;
  /** Conteúdo Longyu Pro — requer assinatura ou preview nas configurações. */
  premium?: boolean;
  /**
   * Pedagogia V3 — lição participa do Mastery Loop (múltiplos passes 1–4).
   * Piloto: cumprimentos, restaurante, lugares/transporte.
   */
  masteryLoop?: boolean;
  /**
   * Pedagogia V3.4 — revisão especial com Review Mastery (Recall→Mixed→Production→Transfer).
   * Não usa masteryLoop de ensino; ver src/data/reviewMastery.ts.
   */
  reviewMasteryMode?: boolean;
  /** Ciclo pedagógico interno. Se omitido, o app gera Apresentar → Reconhecer → Montar → Usar → Fixar. */
  lessonStages?: LessonStage[];
  steps: LessonStep[];
}

export type PedagogicalItemStatus =
  | "novo"
  | "apresentado"
  | "reconhecido"
  | "produzido"
  | "usado_em_contexto"
  | "revisao_ativa"
  | "dominado";

export interface ModulePedagogicalFocus {
  /** Chunks centrais do módulo, escritos como aparecem para o aluno: "你好", "谢谢". */
  focusChunks: string[];
  /** Hànzì centrais do módulo, como glifos: "你", "好". */
  focusHanzi: string[];
  focusGrammar: string[];
  focusSounds: string[];
  focusSituations: string[];
}

export interface Unit extends ModulePedagogicalFocus {
  id: string;
  title: string;
  subtitle: string;
  goal: string;
  color: string;
  lessons: Lesson[];
}

export interface JourneyPhase {
  id: string;
  order: number;
  title: string;
  /** Por que esta fase existe — exibido na jornada. */
  why: string;
  tier: Tier;
  units: Unit[];
}

export const TIERS = [
  { id: "fundamentos", label: "Fundamentos", subtitle: "Falar cedo, treinar tons, ver a lógica dos caracteres" },
  { id: "intermediario", label: "Intermediário", subtitle: "Números, situações reais e leitura autônoma" },
  { id: "avancado", label: "Avançado", subtitle: "Palavras compostas, estruturas e textos maiores" },
] as const;
export type Tier = (typeof TIERS)[number]["id"];

const intro = (title: string, body: string): LessonStep => ({ kind: "intro", title, body });
const listen = (text: string, pinyin: string, pt: string, hanziMode?: "pinyin_first"): LessonStep => ({ kind: "listen", text, pinyin, pt, ...(hanziMode ? { hanziMode } : {}) });
const tone = (
  hanzi: string,
  pinyin: string,
  t: 1 | 2 | 3 | 4,
  assist: "guided" | "quiz" = "guided",
  toneChoices?: Array<1 | 2 | 3 | 4>
): LessonStep => ({
  kind: "tone",
  hanzi,
  pinyin,
  tone: t,
  assist,
  ...(toneChoices ? { toneChoices } : {}),
});
const comp = (hanzi: string, pinyin: string, answer: string, options: string[]): LessonStep => ({
  kind: "comprehend",
  hanzi,
  pinyin,
  answer,
  options,
});
const imageChoice = (
  mode: ImageChoiceMode,
  imageId: VisualConceptId,
  promptPt: string,
  answer: string,
  options: string[],
  extra: Partial<LessonStep> = {}
): LessonStep => {
  const visual = resolveVisualConcept(imageId);
  const isImagePick = mode === "choose_image" || mode === "listen_and_choose_image";
  return {
    kind: "image_choice",
    imageChoiceMode: mode,
    imageId,
    promptPt,
    targetHanzi: visual?.hanzi,
    targetPinyin: visual?.pinyin,
    targetMeaningPt: extra.targetMeaningPt ?? visual?.meaningPt,
    explanation: extra.explanation,
    helpMode: extra.helpMode,
    isNoHint: extra.isNoHint,
    ...(isImagePick
      ? { imageOptions: options, correctImageId: answer }
      : { options, correctAnswer: answer }),
  };
};
const compareWithImage = (
  mode: CompareWithImageMode,
  level: 1 | 2 | 3,
  imageId: VisualConceptId,
  promptPt: string,
  answer: string,
  options: string[],
  extra: Partial<LessonStep> = {}
): LessonStep => {
  const visual = resolveVisualConcept(imageId);
  const isImagePick = mode === "word_to_image";
  return {
    kind: "compare_with_image",
    compareWithImageMode: mode,
    compareWithImageLevel: level,
    imageId,
    promptPt,
    targetHanzi: extra.targetHanzi ?? visual?.hanzi,
    targetPinyin: extra.targetPinyin ?? visual?.pinyin,
    targetMeaningPt: extra.targetMeaningPt ?? visual?.meaningPt,
    explanation: extra.explanation,
    helpMode: extra.helpMode,
    isNoHint: extra.isNoHint,
    ...(isImagePick
      ? { imageOptions: options, correctImageId: answer }
      : { options, correctAnswer: answer }),
  };
};
const visualImageOptions = (targetId: VisualConceptId, count = 4): string[] => {
  const distractors = defaultVisualDistractors(targetId, count - 1);
  return [targetId, ...distractors].slice(0, count);
};
const visualHanziOptions = (targetId: VisualConceptId): string[] => {
  const target = resolveVisualConcept(targetId);
  if (!target) return [];
  const others = defaultVisualDistractors(targetId, 3)
    .map((id) => resolveVisualConcept(id)?.hanzi)
    .filter((hanzi): hanzi is string => Boolean(hanzi && hanzi !== target.hanzi));
  return [target.hanzi, ...others].slice(0, 4);
};
const visualPinyinOptions = (targetId: VisualConceptId): string[] => {
  const target = resolveVisualConcept(targetId);
  if (!target) return [];
  const others = defaultVisualDistractors(targetId, 3)
    .map((id) => resolveVisualConcept(id)?.pinyin)
    .filter((pinyin): pinyin is string => Boolean(pinyin && pinyin !== target.pinyin));
  return [target.pinyin, ...others].slice(0, 4);
};
const visualMeaningOptions = (targetId: VisualConceptId): string[] => {
  const target = resolveVisualConcept(targetId);
  if (!target) return [];
  const others = defaultVisualDistractors(targetId, 3)
    .map((id) => resolveVisualConcept(id)?.meaningPt)
    .filter((meaning): meaning is string => Boolean(meaning && meaning !== target.meaningPt));
  return [target.meaningPt, ...others].slice(0, 4);
};
const produce = (target: string[], bank: string[], pt: string): LessonStep => ({ kind: "produce", target, bank, pt });
type WriteGuide = Pick<LessonStep, "suggestion" | "requiredTerms" | "wordBank" | "accepts" | "mode">;
const write = (
  title: string,
  body: string,
  answer: string,
  placeholder = "Escreva sua resposta aqui",
  chunkId?: string,
  guide: WriteGuide = {}
): LessonStep => ({
  kind: "write",
  title,
  body,
  answer,
  suggestion: guide.suggestion ?? `Use como guia: ${answer}`,
  requiredTerms: guide.requiredTerms ?? [],
  wordBank: guide.wordBank ?? [],
  accepts: guide.accepts ?? [answer],
  mode: guide.mode ?? "free_reflection",
  placeholder,
  chunkId,
});
const recognize = (charId: string): LessonStep => ({ kind: "recognize", charId });
const decompose = (charId: string): LessonStep => ({ kind: "decompose", charId });
const hanziEvolution = (charIds: string[], title: string, body: string): LessonStep => ({
  kind: "hanzi_evolution",
  charIds,
  title,
  body,
});
const flash = (chunkId: string): LessonStep => ({ kind: "flashcard", chunkId });
const read = (lines: { hanzi: string; pinyin: string; pt: string }[]): LessonStep => ({ kind: "microread", lines });
const dialogue = (
  title: string,
  dialoguePrompt: string,
  correctAnswer: string,
  options: string[],
  explanation?: string,
  speaker = "Situação"
): LessonStep => ({
  kind: "dialogue_choice",
  title,
  speaker,
  dialoguePrompt,
  options,
  correctAnswer,
  explanation,
});
const mapDirection = (
  title: string,
  fromLabel: string,
  toLabel: string,
  correctAction: NonNullable<LessonStep["mapCorrectAction"]>,
  options: NonNullable<LessonStep["mapActionOptions"]>,
  extra: Partial<Pick<LessonStep, "prompt" | "promptPt" | "mapScaffoldLevel" | "audioText" | "explanation">> = {}
): LessonStep => ({
  kind: "map_direction",
  title,
  mapFromLabel: fromLabel,
  mapToLabel: toLabel,
  mapCorrectAction: correctAction,
  mapActionOptions: options,
  mapScaffoldLevel: extra.mapScaffoldLevel ?? 1,
  prompt: extra.prompt,
  promptPt: extra.promptPt,
  audioText: extra.audioText,
  explanation: extra.explanation,
  correctAnswer: correctAction,
});
const placeLabel = (
  title: string,
  prompt: string,
  correctAnswer: string,
  options: string[],
  category?: string,
  explanation?: string
): LessonStep => ({
  kind: "place_label",
  title,
  prompt,
  dialoguePrompt: prompt,
  correctAnswer,
  options,
  placeLabelCategory: category,
  explanation,
  speaker: "Placa",
});
const addressBuild = (
  title: string,
  prompt: string,
  targetParts: string[],
  bank: string[],
  explanation?: string
): LessonStep => ({
  kind: "address_build",
  title,
  prompt,
  targetParts,
  bank,
  explanation,
});
const cityContext = (
  title: string,
  situationPt: string,
  correctAnswer: string,
  options: string[],
  cityId: string,
  explanation?: string
): LessonStep => ({
  kind: "city_context",
  title,
  situationPt,
  citySituationPt: situationPt,
  dialoguePrompt: situationPt,
  correctAnswer,
  options,
  cityId,
  explanation,
  speaker: "Situação",
});
const signReading = (
  title: string,
  signHanzi: string,
  correctAnswer: string,
  options: string[],
  category?: string,
  explanation?: string
): LessonStep => ({
  kind: "sign_reading",
  title,
  signHanzi,
  signCategory: category,
  prompt: `O que significa esta placa: ${signHanzi}?`,
  dialoguePrompt: `Placa: ${signHanzi}`,
  correctAnswer,
  options,
  explanation,
  speaker: "Placa",
});
const menuReading = (
  title: string,
  prompt: string,
  menuItems: NonNullable<LessonStep["menuItems"]>,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep => ({
  kind: "menu_reading",
  title,
  prompt,
  dialoguePrompt: prompt,
  menuItems,
  correctAnswer,
  options,
  explanation,
  speaker: "Cardápio",
});
const priceTask = (
  title: string,
  prompt: string,
  priceHanzi: string,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep => ({
  kind: "price_task",
  title,
  prompt,
  dialoguePrompt: prompt,
  priceHanzi,
  correctAnswer,
  options,
  explanation,
  speaker: "Preço",
});
const routeSequence = (
  title: string,
  prompt: string,
  targetParts: string[],
  bank: string[],
  explanation?: string
): LessonStep => ({
  kind: "route_sequence",
  title,
  prompt,
  targetParts,
  routeParts: targetParts,
  bank,
  explanation,
});
const scheduleReading = (
  title: string,
  prompt: string,
  scheduleRows: NonNullable<LessonStep["scheduleRows"]>,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep => ({
  kind: "schedule_reading",
  title,
  prompt,
  dialoguePrompt: prompt,
  scheduleRows,
  correctAnswer,
  options,
  explanation,
  speaker: "Horário",
});
const conversationScene = (sceneId: string): LessonStep => {
  const scene = conversationSceneStepFromId(sceneId);
  if (!scene) {
    throw new Error(`conversation_scene desconhecida: ${sceneId}`);
  }
  const firstInteraction = scene.nodes?.map((node) => node.interaction).find(Boolean);
  return {
    kind: "conversation_scene",
    title: scene.title,
    sceneId: scene.sceneId,
    setting: scene.setting,
    characters: scene.characters,
    lines: scene.lines,
    checkpoint: scene.checkpoint,
    nodes: scene.nodes,
    entryNodeId: scene.entryNodeId,
    sceneIntent: scene.intent,
    learnedRefs: scene.learnedRefs,
    newRefs: scene.newRefs,
    dedicatedLesson: scene.dedicatedLesson,
    prompt: scene.checkpoint?.prompt ?? firstInteraction?.prompt,
    options: scene.checkpoint?.options ?? firstInteraction?.options,
    correctAnswer: scene.checkpoint?.correctAnswer ?? firstInteraction?.correctAnswer,
    explanation: scene.checkpoint?.explanation ?? firstInteraction?.explanation,
    bank: scene.checkpoint?.type === "order_reply" || scene.checkpoint?.type === "fill_reply"
      ? scene.checkpoint.options
      : undefined,
  };
};
const sentenceBuild = (
  title: string,
  prompt: string,
  targetParts: string[],
  bank: string[],
  explanation?: string
): LessonStep => ({
  kind: "sentence_build",
  title,
  prompt,
  targetParts,
  bank,
  correctAnswer: targetParts.join(""),
  explanation,
});
const translationBuild = (
  title: string,
  sourceText: string,
  sourcePinyin: string | undefined,
  targetParts: string[],
  bank: string[],
  explanation?: string,
  prompt = "Como fica em português?"
): LessonStep => ({
  kind: "translation_build",
  title,
  prompt,
  sourceText,
  sourcePinyin,
  targetParts,
  bank,
  correctAnswer: targetParts.join(" "),
  explanation,
});
const listenSelect = (
  title: string,
  audioText: string,
  options: string[],
  correctAnswer: string,
  explanation?: string,
  prompt = "Toque no que ouviu."
): LessonStep => ({
  kind: "listen_select",
  title,
  prompt,
  audioText,
  slowAudioText: audioText,
  options,
  correctAnswer,
  explanation,
});
const fillBlank = (
  title: string,
  prompt: string,
  sentenceBefore: string,
  blankAnswer: string,
  sentenceAfter: string,
  bank: string[],
  explanation?: string
): LessonStep => ({
  kind: "fill_blank",
  title,
  prompt,
  sentenceBefore,
  blankAnswer,
  sentenceAfter,
  bank,
  correctAnswer: `${sentenceBefore}${blankAnswer}${sentenceAfter}`,
  explanation,
});
const match = (
  title: string,
  body: string,
  pairs: NonNullable<LessonStep["pairs"]>,
  explanation?: string
): LessonStep => ({
  kind: "match_pairs",
  title,
  body,
  pairs,
  explanation,
});
const hanziBuild = (
  builderId: string,
  title: string,
  prompt: string,
  character: string,
  meaning: string,
  targetParts?: string[],
  bank?: string[]
): LessonStep => ({
  kind: "hanzi_build",
  title,
  builderId,
  prompt,
  sourceMeaning: meaning,
  targetParts: targetParts ?? [character],
  bank: bank ?? [character],
  correctAnswer: character,
  explanation: `${character} = ${meaning}.`,
});
const charIdByGlyph = new Map(CHARACTERS.map((char) => [char.hanzi, char.id]));

function normalizeHanziRef(text: string): string {
  return text.replace(/[，。！？、,.!?\s]/g, "");
}

function chunkRefByText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const normalized = normalizeHanziRef(text);
  return CHUNKS.find((chunk) => normalizeHanziRef(chunk.hanzi) === normalized)?.id;
}

function refsFromText(text: string | undefined, refs: Set<string>) {
  const chunkId = chunkRefByText(text);
  if (chunkId) refs.add(`chunk:${chunkId}`);
  for (const glyph of normalizeHanziRef(text ?? "")) {
    const charId = charIdByGlyph.get(glyph);
    if (charId) refs.add(`char:${charId}`);
  }
}

function refsFromSteps(steps: LessonStep[]): string[] {
  const refs = new Set<string>();
  for (const step of steps) {
    if ((step.kind === "recognize" || step.kind === "decompose") && step.charId) refs.add(`char:${step.charId}`);
    if (step.kind === "hanzi_evolution") {
      for (const charId of step.charIds ?? []) refs.add(`char:${charId}`);
    }
    if (step.kind === "flashcard" && step.chunkId) refs.add(`chunk:${step.chunkId}`);
    if (step.kind === "write" && step.chunkId) refs.add(`chunk:${step.chunkId}`);
    if (step.kind === "conversation_scene") {
      for (const ref of [...(step.learnedRefs ?? []), ...(step.newRefs ?? [])]) refs.add(ref);
    }
    refsFromText(step.text, refs);
    refsFromText(step.hanzi, refs);
    refsFromText(step.answer, refs);
    refsFromText(step.audioText, refs);
    refsFromText(step.slowAudioText, refs);
    refsFromText(step.sourceText, refs);
    refsFromText(step.correctAnswer, refs);
    refsFromText(step.blankAnswer, refs);
    refsFromText(step.sentenceBefore, refs);
    refsFromText(step.sentenceAfter, refs);
    refsFromText(step.target?.join(""), refs);
    refsFromText(step.targetParts?.join(""), refs);
    for (const pair of step.pairs ?? []) {
      refsFromText(pair.left, refs);
      refsFromText(pair.right, refs);
    }
    for (const line of step.lines ?? []) refsFromText(line.hanzi, refs);
  }
  return [...refs];
}

function estimateLessonMinutes(steps: LessonStep[]): number {
  return Math.max(2, Math.min(6, Math.ceil(steps.length / 2)));
}

function withLessonDefaults(lesson: Lesson): Lesson {
  const refs = refsFromSteps(lesson.steps);
  return {
    ...lesson,
    libraryItems: lesson.libraryItems ?? refs,
    reviewItems: lesson.reviewItems ?? refs,
    rewardQi: lesson.rewardQi ?? (lesson.isReview ? 3 : 2),
    estimatedMinutes: lesson.estimatedMinutes ?? estimateLessonMinutes(lesson.steps),
  };
}

const microLesson = (lesson: Lesson): Lesson => withLessonDefaults(lesson);

const review = (id: string, skill: Skill, steps: LessonStep[], premium?: boolean, newHanzi?: string[]): Lesson =>
  withLessonDefaults({
    id,
    title: "Revisão do módulo",
    skill,
    isReview: true,
    premium,
    newHanzi,
    steps,
  });

/**
 * Lições fundamentais de conceito ("O que é ...") que todo aluno deve fazer.
 * O nivelamento NUNCA as marca como concluídas — mesmo colocando o aluno mais
 * adiante, ele ainda passa por elas. Ver `lessonsCompletedBefore` na store.
 */
export const FOUNDATION_LESSON_IDS: readonly string[] = [
  "p1-o-que-e-mandarim",
  "p1-o-que-e-pinyin",
  "p1-o-que-e-tom",
  "p1-o-que-e-hanzi",
  "p1-primeiros-hanzi",
  "p1-engine-2-lab",
];

const PHASE1_BOOTSTRAP_LESSONS: Lesson[] = [
  microLesson({
    id: "p1-o-que-e-mandarim",
    title: "O que é mandarim?",
    skill: "sistema",
    libraryItems: ["chunk:nihao"],
    reviewItems: ["chunk:nihao"],
    steps: [
      intro("A língua padrão", "Mandarim é a forma padrão do chinês falado. No Longyu, você começa por frases úteis antes de estudar explicações longas."),
      listen("你好", "nǐ hǎo", "Olá", "pinyin_first"),
      intro(
        "Como soa de verdade",
        "Na fala, 3º + 3º vira 2º + 3º: você ouve ní hǎo, mesmo que o dicionário escreva nǐ hǎo."
      ),
      listenSelect("Primeiro som", "你好", ["你好", "谢谢", "再见"], "你好", "Você ouviu 你好."),
      comp("你好", "nǐ hǎo", "Olá", ["Olá", "Obrigado(a)", "Até logo", "De nada"]),
      sentenceBuild("Primeira montagem", "Monte: Olá.", ["你", "好"], ["好", "你", "谢"], "你好 é sua primeira frase útil."),
    ],
  }),
  microLesson({
    id: "p1-o-que-e-pinyin",
    title: "O que é pinyin?",
    skill: "som",
    libraryItems: ["chunk:nihao"],
    reviewItems: ["chunk:nihao"],
    steps: [
      intro("A ponte para o som", "Pinyin escreve o som do mandarim com letras latinas. 你好 aparece como nǐ hǎo para você saber como começar a falar."),
      listen("你好", "nǐ hǎo", "nǐ hǎo é o pinyin de 你好"),
      match(
        "Pinyin e frase",
        "Combine pinyin, hànzì e sentido.",
        [
          { left: "nǐ hǎo", right: "你好", leftType: "pinyin", rightType: "hanzi" },
          { left: "你好", right: "Olá", leftType: "hanzi", rightType: "pt" },
        ],
        "Pinyin = som. Hànzì = escrita."
      ),
      comp("nǐ hǎo", "pinyin", "som escrito com letras latinas", ["som escrito com letras latinas", "tradução literal", "radical", "número"]),
      dialogue("Uso do pinyin", "Pinyin serve principalmente para...", "guiar a pronúncia", ["guiar a pronúncia", "substituir hànzì para sempre", "marcar pontos", "traduzir para inglês"], "Pinyin é uma ponte para falar e ouvir."),
    ],
  }),
  microLesson({
    id: "p1-o-que-e-tom",
    title: "O que é tom?",
    skill: "som",
    libraryItems: ["char:ma2"],
    reviewItems: ["char:ma2"],
    steps: [
      intro(
        "A curva da voz",
        "Em mandarim, o contorno da voz faz parte da palavra. Comece só ouvindo dois tons bem diferentes — depois entram os quatro contornos."
      ),
      // PED-005: primeiro 2 tons contrastantes (1º × 3º), sem misturar significado.
      tone("妈", "mā", 1, "guided", [1, 3]),
      tone("马", "mǎ", 3, "guided", [1, 3]),
      listenSelect(
        "Reta ou vale?",
        "马",
        ["妈", "马"],
        "马",
        "mǎ desce e volta a subir (3º tom); mā fica reta no alto (1º tom)."
      ),
      // Depois: quatro contornos, ainda com ajuda.
      tone("麻", "má", 2, "guided"),
      tone("骂", "mà", 4, "guided"),
      match(
        "Tom muda sentido",
        "Combine som e ideia — só duas palavras.",
        [
          { left: "妈", right: "mãe", leftType: "hanzi", rightType: "pt" },
          { left: "马", right: "cavalo", leftType: "hanzi", rightType: "pt" },
        ],
        "Mesmo ma com outro tom pode virar outra palavra."
      ),
      // Quiz leve no fim (palavra conhecida + tom), sem a família completa de uma vez.
      tone("妈", "mā", 1, "quiz", [1, 4]),
      tone("骂", "mà", 4, "quiz", [1, 4]),
      dialogue(
        "Ideia principal",
        "Em mandarim, tom é...",
        "a curva da voz que pode mudar sentido",
        ["a curva da voz que pode mudar sentido", "a tradução em português", "o desenho do caractere", "o nome da pessoa"],
        "Mudar o tom pode mudar a palavra.",
        "Escolha"
      ),
      comp("妈妈", "māma", "Mãe; mamãe.", ["Mãe; mamãe.", "Obrigado(a).", "Olá.", "Sou brasileiro."]),
    ],
  }),
  microLesson({
    id: "p1-o-que-e-hanzi",
    title: "O que é hànzì?",
    skill: "hanzi",
    libraryItems: ["char:mu", "char:ri", "char:yue", "char:ren", "char:kou", "char:shan", "char:shui", "char:lin", "char:sen", "char:ming"],
    reviewItems: ["char:mu", "char:ri", "char:yue", "char:ren", "char:kou", "char:shan", "char:shui", "char:lin", "char:sen", "char:ming"],
    estimatedMinutes: 4,
    steps: [
      intro("O que é Hànzì?", "Hànzì são os caracteres usados no chinês escrito. Eles não funcionam como o alfabeto português: cada caractere pode representar uma ideia, uma palavra, parte de uma palavra ou uma função."),
      intro("Pinyin e hànzì", "Pinyin mostra o som: nǐ hǎo. Hànzì mostra a forma escrita usada por chineses: 你好. O pinyin ajuda você a pronunciar; o hànzì ajuda você a ler e reconhecer a escrita real."),
      intro("Pense no número 3", "O símbolo 3 não é a palavra 'três', mas todo mundo reconhece a ideia. 三 representa 'três' em chinês; o som é sān; a forma escrita é 三. Hànzì se parece mais com símbolos assim do que com letras soltas."),
      hanziEvolution(
        ["mu", "ri", "yue", "ren"],
        "O que é hànzì?",
        "Cada hànzì carrega uma ideia. Veja quatro exemplos, um de cada vez — depois você monta o primeiro."
      ),
      imageChoice(
        "choose_image",
        "tree",
        "Olhe a imagem. O que você vê?",
        "tree",
        visualImageOptions("tree"),
        { explanation: "木 representa árvore ou madeira — a forma lembra um tronco com galhos." }
      ),
      imageChoice(
        "choose_hanzi",
        "tree",
        "Qual hànzì combina com a árvore?",
        "木",
        visualHanziOptions("tree"),
        { explanation: "木 é o caractere de árvore." }
      ),
      hanziBuild(
        "hb-mu-fragments",
        "Monte seu primeiro hànzì",
        "Agora monte seu primeiro hànzì: 木 (árvore), encaixando as peças.",
        "木",
        "árvore / madeira"
      ),
      match(
        "Combine forma e ideia",
        "Combine cada hànzì com a ideia que ele carrega.",
        [
          { left: "木", right: "árvore; madeira", leftType: "hanzi", rightType: "pt" },
          { left: "日", right: "sol; dia", leftType: "hanzi", rightType: "pt" },
          { left: "月", right: "lua; mês", leftType: "hanzi", rightType: "pt" },
          { left: "水", right: "água", leftType: "hanzi", rightType: "pt" },
        ],
        "Você não soletra esses sinais como letras: reconhece o bloco visual."
      ),
      match(
        "Pinyin é som",
        "Agora combine hànzì, pinyin e significado.",
        [
          { left: "三", right: "sān · três", leftType: "hanzi", rightType: "pinyin" },
          { left: "木", right: "mù · árvore", leftType: "hanzi", rightType: "pinyin" },
          { left: "人", right: "rén · pessoa", leftType: "hanzi", rightType: "pinyin" },
          { left: "口", right: "kǒu · boca", leftType: "hanzi", rightType: "pinyin" },
        ],
        "Pinyin aponta para o som; o hànzì é a forma visual."
      ),
      fillBlank(
        "Complete a lógica",
        "Complete a composição: 木 + 木 + 木 = ___.",
        "木 + 木 + 木 = ",
        "森",
        "",
        ["森", "林", "明", "好"],
        "Três árvores formam 森, floresta densa. Você montará 林 e 明 depois, com mais prática."
      ),
      dialogue(
        "Reconheça a evolução",
        "Qual caractere tem relação com água?",
        "水",
        ["水", "口", "日", "人"],
        "水 significa água. Como radical lateral, costuma aparecer como 氵.",
        "Escolha"
      ),
      dialogue(
        "Revisão",
        "Hànzì é o quê?",
        "um sistema visual de caracteres chineses",
        ["um sistema visual de caracteres chineses", "um alfabeto de letras", "a tradução em português", "só um desenho antigo"],
        "Hànzì é escrita chinesa: visual, padronizada e ligada a som, sentido e uso.",
        "Escolha"
      ),
      dialogue(
        "Cuidado importante",
        "Todo hànzì moderno é apenas um desenho?",
        "não; muitos combinam uma peça de sentido e outra de som",
        ["não; muitos combinam uma peça de sentido e outra de som", "sim; todos são desenhos literais", "sim; todos são números", "não; hànzì é só pinyin"],
        "Nem todo caractere moderno é desenho. 妈, por exemplo, usa 女 como pista de sentido e 马 como pista sonora. Você montará composições como 林 e 明 em lições posteriores.",
        "Escolha"
      ),
    ],
  }),
  microLesson({
    id: "p1-primeiros-hanzi",
    title: "Montando primeiros hànzì",
    skill: "hanzi",
    libraryItems: ["char:mu", "char:ren", "char:kou", "char:ri", "char:yue", "char:shan", "char:shui", "char:huo", "char:da", "char:xiao"],
    reviewItems: ["char:mu", "char:ren", "char:kou", "char:ri", "char:yue", "char:shan", "char:shui", "char:huo", "char:da", "char:xiao"],
    estimatedMinutes: 6,
    steps: [
      intro("Monte peça por peça", "Agora você monta caracteres simples como 木, 口 e 日 com fragmentos pequenos — sem composições ainda. Cada traço encaixa como um quebra-cabeça visual."),
      imageChoice(
        "choose_image",
        "tree",
        "O que você vê na foto?",
        "tree",
        visualImageOptions("tree"),
        { explanation: "木 representa árvore — a forma lembra um tronco com galhos." }
      ),
      hanziBuild("hb-mu-fragments", "Monte 木", "Encaixe os traços da árvore.", "木", "árvore / madeira"),
      imageChoice(
        "choose_hanzi",
        "person",
        "Qual hànzì significa pessoa?",
        "人",
        visualHanziOptions("person"),
        { explanation: "人 é o caractere de pessoa." }
      ),
      hanziBuild("hb-ren-fragments", "Monte 人", "Monte o hànzì de pessoa.", "人", "pessoa"),
      hanziBuild("hb-kou-fragments", "Monte 口", "Monte o hànzì de boca.", "口", "boca"),
      hanziBuild("hb-ri-fragments", "Monte 日", "Monte o hànzì de sol.", "日", "sol; dia"),
      imageChoice(
        "listen_and_choose_image",
        "mountain",
        "Ouça e escolha a imagem certa.",
        "mountain",
        visualImageOptions("mountain"),
        { explanation: "山 (shān) = montanha." }
      ),
      hanziBuild("hb-shan-fragments", "Monte 山", "Encaixe os traços da montanha.", "山", "montanha"),
      match(
        "Feche o mapa",
        "Combine cada hànzì com a ideia.",
        [
          { left: "木", right: "árvore", leftType: "hanzi", rightType: "pt" },
          { left: "人", right: "pessoa", leftType: "hanzi", rightType: "pt" },
          { left: "口", right: "boca", leftType: "hanzi", rightType: "pt" },
          { left: "日", right: "sol / dia", leftType: "hanzi", rightType: "pt" },
        ],
        "Você montou os blocos simples; composições como 林 e 明 vêm depois."
      ),
    ],
  }),
];

const PHASE1_ENGINE_LESSONS: Lesson[] = [
  microLesson({
    id: "p1-engine-2-lab",
    title: "Laboratório de exercícios",
    skill: "fala",
    libraryItems: ["chunk:nihao", "chunk:xiexie", "chunk:zaijian", "chunk:bukeqi", "char:ni", "char:hao", "char:ma_question", "char:nv", "char:zi"],
    reviewItems: ["chunk:nihao", "chunk:xiexie", "chunk:zaijian", "chunk:bukeqi", "char:ni", "char:hao", "char:ma_question", "char:nv", "char:zi"],
    estimatedMinutes: 5,
    rewardQi: 3,
    steps: [
      {
        kind: "match_pairs",
        title: "Combine frase e sentido",
        body: "Toque em uma peça da esquerda e depois no par correto.",
        pairs: [
          { left: "你好", right: "Olá", leftType: "hanzi", rightType: "pt" },
          { left: "谢谢", right: "Obrigado(a)", leftType: "hanzi", rightType: "pt" },
          { left: "再见", right: "Até logo", leftType: "hanzi", rightType: "pt" },
        ],
        explanation: "Comece ligando forma visual e significado antes de produzir.",
      },
      {
        kind: "listen_select",
        title: "Ouça e escolha",
        prompt: "Qual frase você ouviu?",
        audioText: "谢谢",
        slowAudioText: "谢谢",
        options: ["你好", "谢谢", "再见", "不客气"],
        correctAnswer: "谢谢",
        explanation: "谢谢 é a forma curta para agradecer.",
      },
      {
        kind: "dialogue_choice",
        title: "Qual é o tom de 谢?",
        speaker: "Pinyin",
        dialoguePrompt: "Todas leem xie. Qual tem o tom certo de 谢谢?",
        sourceText: "谢谢",
        sourcePinyin: "xièxie",
        sourceMeaning: "Obrigado(a).",
        options: ["xièxie — 4º tom", "xiéxie — 2º tom", "xiěxie — 3º tom", "xiēxie — 1º tom"],
        correctAnswer: "xièxie — 4º tom",
        explanation: "谢 usa 4º tom: xiè. O tom muda o significado e a pronúncia.",
      },
      {
        kind: "sentence_build",
        title: "Monte o cumprimento",
        prompt: "Monte: Olá.",
        sourceMeaning: "Olá.",
        targetParts: ["你", "好"],
        bank: ["好", "谢", "你", "再"],
        correctAnswer: "你好",
        explanation: "你好 junta você + bom para cumprimentar.",
      },
      {
        kind: "translation_build",
        title: "Escreva em português",
        prompt: "Como fica em português?",
        sourceText: "再见",
        sourcePinyin: "zàijiàn",
        targetParts: ["Até", "logo"],
        bank: ["logo", "Olá", "Até", "Obrigado(a)"],
        correctAnswer: "Até logo",
        explanation: "再见 = até logo; 再 sugere de novo, 见 é ver.",
      },
      {
        kind: "fill_blank",
        title: "Complete a pergunta",
        prompt: "Complete a frase para perguntar se a pessoa esta bem.",
        sentenceBefore: "你",
        sentenceAfter: "吗？",
        blankAnswer: "好",
        bank: ["好", "谢", "再", "见"],
        correctAnswer: "你好吗？",
        explanation: "你好吗？ significa Tudo bem?",
      },
      {
        kind: "dialogue_choice",
        title: "Escolha no diálogo",
        speaker: "Longyu",
        dialoguePrompt: "Alguém diz 谢谢. Qual resposta combina?",
        options: ["不客气", "你好", "再见", "我叫"],
        correctAnswer: "不客气",
        explanation: "不客气 e a resposta natural para de nada.",
      },
      conversationScene("agradecendo"),
      {
        kind: "hanzi_build",
        title: "Monte o hànzì 好",
        builderId: "hb-hao-components",
        prompt: "女 + 子 forma qual caractere?",
        sourceMeaning: "mulher + crianca",
        targetParts: ["女", "子"],
        bank: ["子", "女", "口", "马"],
        correctAnswer: "好",
        explanation: "女 + 子 ajuda a lembrar 好: bom; bem.",
      },
      {
        kind: "tone_pair",
        title: "Pares de tom",
        prompt: "Combine cada som com o tom certo.",
        pairs: [
          { left: "妈", right: "1º tom", leftType: "audio", rightType: "pt" },
          { left: "骂", right: "4º tom", leftType: "audio", rightType: "pt" },
        ],
        explanation: "mā alto e reto é diferente de mà caindo forte.",
      },
    ],
  }),
];

const PHASE2_MA_TONE_MICROTASKS: Lesson[] = [
  microLesson({
    id: "p2-ma-primeiro-tom",
    title: "1º tom com ma",
    skill: "som",
    libraryItems: ["char:ma2"],
    reviewItems: ["char:ma2", "char:shan"],
    steps: [
      intro("Alto e reto", "O 1º tom fica alto e constante. Em 妈 mā, pense em uma linha reta no alto."),
      listen("妈", "mā", "mãe"),
      tone("妈", "mā", 1, "quiz"),
      listen("山", "shān", "montanha (também 1º tom)"),
      tone("山", "shān", 1, "quiz"),
      comp("山", "shān", "montanha", ["montanha", "mãe", "cavalo", "água"]),
      fillBlank(
        "A mesma sílaba, sem tom",
        "Complete a pergunta que você já conhece: tudo bem?",
        "你好",
        "吗",
        "？",
        ["吗", "妈"],
        "吗 é a sílaba ma SEM contorno (tom neutro) — compare com 妈 mā, alta e reta. O 你好 já conhecido só ancora o contraste."
      ),
      dialogue("Contorno", "Qual descrição combina com o 1º tom?", "alto e reto", ["alto e reto", "cai rápido", "sobe", "desce e sobe"], "O 1º tom fica alto e constante.", "Escolha"),
    ],
  }),
  microLesson({
    id: "p2-ma-segundo-tom",
    title: "2º tom com ma",
    skill: "som",
    libraryItems: ["char:ma2"],
    reviewItems: ["char:ma2"],
    steps: [
      intro("Subindo", "O 2º tom sobe, como uma pergunta curta em português. Ouça má e acompanhe a subida."),
      listen("麻", "má", "cânhamo; dormente"),
      listenSelect("Ouça má", "麻", ["妈", "麻", "马", "骂"], "麻", "麻 usa 2º tom: sobe."),
      tone("麻", "má", 2, "quiz"),
      dialogue(
        "Descreva o som",
        "Como o 2º tom se move?",
        "sobe",
        ["sobe", "cai rápido", "fica reto", "desce e sobe"],
        "O 2º tom sobe, como uma pergunta curta.",
        "Escolha"
      ),
    ],
  }),
  microLesson({
    id: "p2-ma-terceiro-tom",
    title: "3º tom com ma",
    skill: "som",
    libraryItems: ["char:ma2"],
    reviewItems: ["char:ma2"],
    steps: [
      intro("Desce e sobe", "O 3º tom faz um vale: desce e depois volta a subir. 马 mǎ é o exemplo clássico."),
      listen("马", "mǎ", "cavalo"),
      listenSelect("Ouça mǎ", "马", ["妈", "麻", "马", "骂"], "马", "马 usa 3º tom: desce e sobe."),
      tone("马", "mǎ", 3, "quiz"),
      comp("马", "mǎ", "cavalo (3º tom)", ["cavalo (3º tom)", "mãe (1º tom)", "xingar (4º tom)", "obrigado"]),
    ],
  }),
  microLesson({
    id: "p2-ma-quarto-tom",
    title: "4º tom com ma",
    skill: "som",
    libraryItems: ["char:ma2"],
    reviewItems: ["char:ma2"],
    steps: [
      intro("Cai firme", "O 4º tom cai rápido, como um comando curto. 骂 mà usa essa queda forte."),
      listen("骂", "mà", "xingar"),
      listenSelect("Ouça mà", "骂", ["妈", "麻", "马", "骂"], "骂", "骂 usa 4º tom: cai firme."),
      tone("骂", "mà", 4, "quiz"),
      dialogue(
        "Queda rápida",
        "Qual tom cai rápido e firme?",
        "4º tom",
        ["4º tom", "1º tom", "2º tom", "3º tom"],
        "O 4º tom é a queda rápida, como um comando curto.",
        "Escolha"
      ),
    ],
  }),
  microLesson({
    id: "p2-comparar-tom-1-4",
    title: "Comparar 1º e 4º tom",
    skill: "som",
    libraryItems: ["char:ma2"],
    reviewItems: ["char:ma2", "char:xie", "chunk:zaijian"],
    steps: [
      intro("Reto contra queda", "Compare: mā fica alto e reto; mà cai rápido. O contraste ajuda seu ouvido a decidir."),
      tone("妈", "mā", 1, "quiz"),
      tone("骂", "mà", 4, "quiz"),
      listenSelect(
        "Reto ou queda?",
        "骂",
        ["妈", "骂"],
        "骂",
        "mà cai rápido e firme; mā ficaria reta no alto."
      ),
      match(
        "Compare os contornos",
        "Combine cada tom com o movimento da voz.",
        [
          { left: "1º tom", right: "alto e reto", leftType: "pt", rightType: "pt" },
          { left: "4º tom", right: "cai rápido", leftType: "pt", rightType: "pt" },
        ],
        "1º tom fica alto e reto; 4º tom cai rápido."
      ),
      tone("谢", "xiè", 4, "quiz"),
      comp("谢谢", "xièxie", "Obrigado(a).", ["Obrigado(a).", "Até logo.", "Estou bem.", "Quero isto."]),
      listenSelect(
        "Queda em palavra real",
        "谢",
        ["谢", "妈", "骂", "马"],
        "谢",
        "谢 começa com 4º tom — a mesma queda rápida de 骂 mà."
      ),
      dialogue(
        "Queda em contexto",
        "Você quer agradecer com educação. Qual frase começa com a queda do 4º tom?",
        "谢谢",
        ["谢谢", "妈", "骂", "马"],
        "谢谢 começa com xiè, 4º tom."
      ),
      match(
        "Quatro quedas",
        "Combine cada palavra com o sentido — todas começam com a queda do 4º tom.",
        [
          { left: "谢", right: "agradecer", leftType: "hanzi", rightType: "pt" },
          { left: "骂", right: "xingar", leftType: "hanzi", rightType: "pt" },
          { left: "是", right: "ser", leftType: "hanzi", rightType: "pt" },
          { left: "去", right: "ir", leftType: "hanzi", rightType: "pt" },
        ],
        "谢 xiè, 骂 mà, 是 shì, 去 qù: quatro quedas em palavras que você já usa."
      ),
      sentenceBuild(
        "Dupla queda",
        "Monte a despedida que você já conhece (4º + 4º tom).",
        ["再", "见"],
        ["再", "见", "你"],
        "再见 zài jiàn são duas quedas seguidas — o mesmo contorno de 骂 mà."
      ),
      dialogue("Escolha o que cai", "Qual tom cai rápido?", "4º tom", ["4º tom", "1º tom", "2º tom", "3º tom"], "O 4º tom é a queda rápida.", "Escolha"),
    ],
  }),
  microLesson({
    id: "p2-comparar-tom-2-3",
    title: "Comparar 2º e 3º tom",
    skill: "som",
    libraryItems: ["char:ma2"],
    reviewItems: ["char:ma2"],
    steps: [
      intro("Subida contra vale", "O 2º tom sobe direto. O 3º tom desce e sobe, como um vale."),
      tone("麻", "má", 2, "quiz"),
      tone("马", "mǎ", 3, "quiz"),
      match(
        "Compare os contornos",
        "Combine cada tom com o movimento da voz.",
        [
          { left: "2º tom", right: "sobe", leftType: "pt", rightType: "pt" },
          { left: "3º tom", right: "desce e sobe", leftType: "pt", rightType: "pt" },
        ],
        "2º tom sobe; 3º tom desce e sobe."
      ),
      dialogue("Escolha o vale", "Qual tom desce e sobe?", "3º tom", ["3º tom", "2º tom", "1º tom", "4º tom"], "O 3º tom faz um vale.", "Escolha"),
      sentenceBuild(
        "Dois vales numa frase",
        "Monte o cumprimento 你好 (3º + 3º tom).",
        ["你", "好"],
        ["你", "好", "马", "麻"],
        "你好 junta dois 3º tons — na fala o primeiro sobe."
      ),
      dialogue(
        "Como soa na fala?",
        "Dois 3º tons seguidos (nǐ hǎo) soam como...",
        "2º + 3º (ní hǎo)",
        ["2º + 3º (ní hǎo)", "3º + 3º completos", "1º + 3º", "4º + 3º"],
        "3º + 3º → 2º + 3º: soa ní hǎo."
      ),
    ],
  }),
];

const PHASE2_CONTEXT_TONE_MICROTASKS: Lesson[] = [
  microLesson({
    id: "p2-tons-nihao",
    title: "Tons em 你好",
    skill: "som",
    libraryItems: ["chunk:nihao", "char:ni", "char:hao"],
    reviewItems: ["chunk:nihao", "char:ni", "char:hao"],
    steps: [
      intro(
        "Dois 3º tons viram 2º + 3º",
        "Escrito: nǐ hǎo. Falado: ní hǎo. O primeiro 3º sobe."
      ),
      listen("你好", "nǐ hǎo", "Olá"),
      tone("你", "nǐ", 3, "quiz"),
      tone("好", "hǎo", 3, "quiz"),
      dialogue(
        "Escrito vs. falado",
        "O dicionário escreve nǐ hǎo. Como soa na fala?",
        "ní hǎo",
        [
          "ní hǎo",
          "nǐ hǎo",
          "nì hào",
          "nī hāo",
        ],
        "3º + 3º → soa ní hǎo."
      ),
      comp("你好", "nǐ hǎo", "Olá", ["Olá", "Obrigado(a)", "Até logo", "Sou brasileiro"]),
    ],
  }),
  microLesson({
    id: "p2-tons-xiexie",
    title: "Tons em 谢谢",
    skill: "som",
    libraryItems: ["chunk:xiexie", "char:xie"],
    reviewItems: ["chunk:xiexie", "char:xie", "chunk:bukeqi", "chunk:zaijian"],
    steps: [
      intro("Queda e leveza", "谢谢 começa com xiè, 4º tom. A segunda sílaba fica leve na fala cotidiana."),
      listenSelect("Ouça 谢谢", "谢谢", ["你好", "谢谢", "再见"], "谢谢", "谢谢 começa com uma queda no primeiro 谢."),
      tone("谢", "xiè", 4, "quiz"),
      tone("再", "zài", 4, "quiz"),
      sentenceBuild("Monte 谢谢", "Monte: obrigado(a).", ["谢", "谢"], ["谢", "你", "好"], "谢谢 repete 谢."),
      dialogue(
        "Responda à gentileza",
        "Alguém agradece você com uma queda dupla no início. Qual é a resposta educada?",
        "不客气",
        ["不客气", "你好", "再见", "我很好"],
        "不客气 responde ao agradecimento: de nada.",
        "Situação"
      ),
      sentenceBuild(
        "Feche a troca",
        "Monte a resposta: de nada.",
        ["不", "客", "气"],
        ["不", "客", "气", "再"],
        "不客气 fecha a troca: bú kèqi também começa caindo."
      ),
    ],
  }),
];

const PHASE3_SURVIVAL_MICROTASKS: Lesson[] = [
  microLesson({
    id: "p3-wohenhao",
    title: "我很好 — Estou bem",
    skill: "fala",
    masteryLoop: true,
    libraryItems: ["chunk:wohenhao"],
    reviewItems: ["chunk:wohenhao"],
    steps: [
      listen("我很好", "wǒ hěn hǎo", "Estou bem"),
      listenSelect(
        "Toque no que ouviu",
        "我很好",
        ["我很好", "你好吗？", "谢谢", "再见"],
        "我很好",
        "我很好 é a resposta simples para dizer que está bem."
      ),
      match(
        "Peças de 我很好",
        "Combine cada parte com o sentido.",
        [
          { left: "我", right: "eu", leftType: "hanzi", rightType: "pt" },
          { left: "很好", right: "muito bem", leftType: "hanzi", rightType: "pt" },
          { left: "我很好", right: "Estou bem", leftType: "hanzi", rightType: "pt" },
        ],
        "我很好 responde a 你好吗？"
      ),
      sentenceBuild(
        "Monte a resposta",
        "Como dizer 'estou bem'?",
        ["我", "很", "好"],
        ["好", "你", "我", "很", "谢谢"],
        "我 = eu; 很好 = estou bem."
      ),
      fillBlank(
        "Complete a resposta",
        "Complete: 我 ___ 好.",
        "我",
        "很",
        "好",
        ["很", "吗", "叫", "是"],
        "我很好 = estou bem."
      ),
      dialogue(
        "Conversa curta",
        "Pessoa pergunta: 你好吗？ Qual resposta combina?",
        "我很好",
        ["我很好", "不客气", "再见", "你叫什么？"],
        "我很好 é uma resposta segura."
      ),
      translationBuild(
        "Revisão rápida",
        "我很好",
        "wǒ hěn hǎo",
        ["Estou", "bem"],
        ["Estou", "bem", "Obrigado", "Olá"],
        "我很好 = estou bem."
      ),
    ],
  }),
  microLesson({
    id: "p3-wobuhui-shuo-zhongwen",
    title: "我不会说中文",
    skill: "fala",
    masteryLoop: true,
    libraryItems: ["chunk:wobuhui", "chunk:nihao", "chunk:wohenhao"],
    reviewItems: ["chunk:nihao", "chunk:wohenhao"],
    steps: [
      // Antes esta lição abria fria: um `listen` de uma frase longa (5 hànzì
      // novos) seguido direto de um quiz — e ainda comparava com 听不懂 e
      // 请再说一遍, que só são ensinados nas lições seguintes. Isso travava o
      // aluno. Agora ela apresenta a frase, deixa acertar com apoio e só depois
      // cobra; as outras frases de sobrevivência ficam para as próximas lições.
      intro(
        "Sua frase de emergência",
        "Se alguém falar rápido demais, uma única frase te protege: 我不会说中文 (wǒ bú huì shuō Zhōngwén) — “não sei falar chinês”. Você já conhece 我 (eu) e 不 (não); aqui elas se juntam a 会说 (saber falar) e 中文 (a língua chinesa). Por enquanto, guarde a frase inteira como um bloco — as peças você destrincha nas próximas lições."
      ),
      listen("我不会说中文", "wǒ bú huì shuō Zhōngwén", "Não sei falar chinês"),
      intro(
        "不 sobe antes de 4º tom",
        "Você já ouviu 不客气 soar “bú kèqi”. Em 不会 acontece o mesmo: 不 (bù) antes de 会 (huì, 4º tom) sobe para bú. Por isso a frase soa “wǒ bú huì shuō Zhōngwén”."
      ),
      listenSelect(
        "Reconheça a frase",
        "我不会说中文",
        ["我不会说中文", "你好", "我很好"],
        "我不会说中文",
        "Essa é a frase que te protege quando não dá para entender: 我不会说中文."
      ),
      comp(
        "我不会说中文",
        "wǒ bú huì shuō Zhōngwén",
        "Não sei falar chinês",
        ["Não sei falar chinês", "Estou bem", "Olá", "Até logo"]
      ),
      conversationScene("nao-falo-chinês"),
      dialogue(
        "Proteção",
        "A pessoa fala rápido demais. Qual frase protege você?",
        "我不会说中文",
        ["我不会说中文", "谢谢", "我很好", "再见"],
        "Use 我不会说中文 quando você não sabe falar chinês."
      ),
      sentenceBuild(
        "Revisão com cumprimentos",
        "Monte o cumprimento antigo: Olá.",
        ["你", "好"],
        ["你", "好", "会", "说", "中文"],
        "你好 reaparece em contexto novo de sobrevivência."
      ),
    ],
  }),
  microLesson({
    id: "p3-qing-zai-shuo-yibian",
    title: "请再说一遍",
    skill: "fala",
    masteryLoop: true,
    libraryItems: ["chunk:qingzaishuoyibian", "chunk:tingbudong", "chunk:wohenhao"],
    reviewItems: ["chunk:tingbudong", "chunk:wohenhao", "chunk:qingzaishuoyibian"],
    steps: [
      intro("Peça repetição", "请再说一遍 é educado e útil: por favor, fale de novo."),
      listen("请再说一遍", "qǐng zài shuō yí biàn", "Por favor, fale de novo"),
      comp(
        "请再说一遍",
        "qǐng zài shuō yí biàn",
        "Repita, por favor",
        ["Repita, por favor", "Não entendi", "Não sei falar chinês", "Estou bem"]
      ),
      conversationScene("pedir-repeticao"),
      dialogue(
        "Qual intenção?",
        "Você ouviu, mas não entendeu. Escolha entre pedir repetição ou dizer que não entendeu.",
        "我听不懂",
        ["我听不懂", "请再说一遍", "我很好", "谢谢"],
        "我听不懂 comunica que você não entendeu; 请再说一遍 pede a repetição."
      ),
      sentenceBuild(
        "Monte o pedido",
        "Na mesma cena, monte: por favor, fale de novo.",
        ["请", "再", "说", "一遍"],
        ["请", "再", "说", "一遍", "听不懂", "很好"],
        "请再说一遍 = por favor, fale de novo."
      ),
      fillBlank(
        "Revisão com frase antiga",
        "Complete a resposta antiga: 我 ___.",
        "我",
        "很好",
        "",
        ["很好", "听不懂", "再说一遍", "谢谢"],
        "我很好 reaparece em novo contexto de revisão."
      ),
    ],
  }),
];

const PHASE4_CHARACTER_MICROTASKS: Lesson[] = [
  microLesson({
    id: "p4-num-123",
    title: "一 二 三",
    skill: "hanzi",
    libraryItems: ["char:yi", "char:er", "char:san"],
    reviewItems: ["char:yi", "char:er", "char:san"],
    steps: [
      intro("Traços que contam", "一, 二 e 三 mostram a quantidade nos próprios traços."),
      recognize("yi"),
      recognize("er"),
      recognize("san"),
      produce(["一", "二", "三"], ["三", "一", "五", "二"], "um, dois, três"),
    ],
  }),
  microLesson({
    id: "p4-num-45",
    title: "四 五",
    skill: "hanzi",
    libraryItems: ["char:si", "char:wu"],
    reviewItems: ["char:si", "char:wu", "char:san"],
    steps: [
      intro("Dois números comuns", "四 e 五 aparecem cedo em datas, preços e telefone."),
      recognize("si"),
      recognize("wu"),
      imageChoice(
        "choose_hanzi",
        "tree",
        "Revisão visual: qual hànzì combina com árvore?",
        "木",
        visualHanziOptions("tree"),
        { explanation: "木 volta como revisão visual enquanto você fixa 四 e 五." }
      ),
      comp("四", "sì", "quatro", ["quatro", "cinco", "seis", "dez"]),
      comp("五", "wǔ", "cinco", ["cinco", "quatro", "oito", "um"]),
      dialogue(
        "Compare com 三",
        "Qual número vem antes de 四?",
        "三",
        ["三", "五", "六", "一"],
        "三 reaparece: depois dele vem 四."
      ),
    ],
  }),
  microLesson({
    id: "p4-num-678",
    title: "六 七 八",
    skill: "hanzi",
    libraryItems: ["char:liu", "char:qi", "char:ba8"],
    reviewItems: ["char:liu", "char:qi", "char:ba8"],
    steps: [
      recognize("liu"),
      recognize("qi"),
      recognize("ba8"),
      produce(["六", "七", "八"], ["八", "六", "十", "七"], "seis, sete, oito"),
    ],
  }),
  microLesson({
    id: "p4-num-910",
    title: "九 十",
    skill: "hanzi",
    libraryItems: ["char:jiu", "char:shi10"],
    reviewItems: ["char:jiu", "char:shi10"],
    steps: [
      intro("Fechando até dez", "九 é nove e 十 é dez. 十 também aparece em perguntas como 你叫什么？ por causa de 什么."),
      recognize("jiu"),
      recognize("shi10"),
      comp("十", "shí", "dez", ["dez", "nove", "ser", "obrigado"]),
    ],
  }),
  microLesson({
    id: "p4-char-mu",
    title: "木",
    skill: "hanzi",
    libraryItems: ["char:mu"],
    reviewItems: ["char:mu"],
    steps: [
      intro("Árvore", "木 é árvore ou madeira. A foto e a forma se apoiam."),
      imageChoice(
        "choose_hanzi",
        "tree",
        "Qual hànzì combina com a árvore?",
        "木",
        visualHanziOptions("tree"),
        { explanation: "木 é o caractere de árvore." }
      ),
      imageChoice(
        "listen_and_choose_image",
        "tree",
        "Ouça e escolha a imagem certa.",
        "tree",
        visualImageOptions("tree"),
        { explanation: "木 (mù) = árvore." }
      ),
      hanziBuild("hb-mu-fragments", "Monte 木", "Monte o hànzì de árvore.", "木", "árvore; madeira"),
      sentenceBuild(
        "Frase curta",
        "Monte: isto é árvore.",
        ["这", "是", "木"],
        ["这", "是", "木", "水", "人"],
        "这是木 liga demonstrativo + 木."
      ),
      dialogue(
        "Revisão de número",
        "Qual hànzì significa três?",
        "三",
        ["三", "木", "人", "水"],
        "三 reaparece como revisão antes de novos caracteres."
      ),
    ],
  }),
  microLesson({
    id: "p4-char-ren",
    title: "人",
    skill: "hanzi",
    libraryItems: ["char:ren"],
    reviewItems: ["char:ren"],
    steps: [
      intro("Pessoa", "人 significa pessoa e aparece em 巴西人."),
      imageChoice(
        "choose_hanzi",
        "person",
        "Qual hànzì significa pessoa?",
        "人",
        visualHanziOptions("person"),
        { explanation: "人 é o caractere de pessoa." }
      ),
      imageChoice(
        "listen_and_choose_image",
        "person",
        "Ouça e escolha a imagem certa.",
        "person",
        visualImageOptions("person"),
        { explanation: "人 (rén) = pessoa." }
      ),
      hanziBuild("hb-ren-fragments", "Monte 人", "Monte o hànzì de pessoa.", "人", "pessoa"),
      comp("巴西人", "Bāxī rén", "brasileiro", ["brasileiro", "árvore", "boca", "sol"]),
      dialogue(
        "Revisão de 木",
        "Qual hànzì combina com árvore?",
        "木",
        ["木", "人", "口", "日"],
        "木 volta como revisão antes de 口."
      ),
    ],
  }),
  microLesson({
    id: "p4-char-kou",
    title: "口",
    skill: "hanzi",
    libraryItems: ["char:kou"],
    reviewItems: ["char:kou"],
    steps: [
      intro("Boca e fala", "口 sugere boca, abertura ou fala. Ele vai aparecer em 吗."),
      imageChoice(
        "choose_hanzi",
        "mouth",
        "Qual hànzì combina com a boca?",
        "口",
        visualHanziOptions("mouth"),
        { explanation: "口 é o caractere de boca." }
      ),
      imageChoice(
        "listen_and_choose_image",
        "mouth",
        "Ouça e escolha a imagem certa.",
        "mouth",
        visualImageOptions("mouth"),
        { explanation: "口 (kǒu) = boca." }
      ),
      hanziBuild("hb-kou-fragments", "Monte 口", "Monte o hànzì de boca.", "口", "boca"),
      match(
        "Ideia da peça",
        "Combine cada hànzì com a ideia.",
        [
          { left: "口", right: "boca / fala", leftType: "hanzi", rightType: "pt" },
          { left: "人", right: "pessoa", leftType: "hanzi", rightType: "pt" },
        ],
        "口 traz pista de boca/fala; 人 é pessoa."
      ),
      dialogue(
        "Revisão de 人",
        "Qual hànzì significa pessoa?",
        "人",
        ["人", "口", "木", "日"],
        "人 volta em revisão leve."
      ),
    ],
  }),
  microLesson({
    id: "p4-char-ri",
    title: "日",
    skill: "hanzi",
    libraryItems: ["char:ri"],
    reviewItems: ["char:ri"],
    steps: [
      intro("Sol e dia", "日 significa sol ou dia. Em 明, ele se junta com 月."),
      imageChoice(
        "choose_hanzi",
        "sun",
        "Qual hànzì combina com o sol?",
        "日",
        visualHanziOptions("sun"),
        { explanation: "日 é o caractere de sol/dia." }
      ),
      imageChoice(
        "listen_and_choose_image",
        "sun",
        "Ouça e escolha a imagem certa.",
        "sun",
        visualImageOptions("sun"),
        { explanation: "日 (rì) = sol / dia." }
      ),
      hanziBuild("hb-ri-fragments", "Monte 日", "Monte o hànzì de sol.", "日", "sol; dia"),
      sentenceBuild(
        "Frase curta",
        "Monte: isto é sol.",
        ["这", "是", "日"],
        ["这", "是", "日", "口", "木"],
        "这是日 usa 日 em frase mínima."
      ),
      dialogue(
        "Revisão de 口",
        "Qual hànzì combina com boca?",
        "口",
        ["口", "日", "人", "木"],
        "口 volta como revisão."
      ),
    ],
  }),
  microLesson({
    id: "p4-char-yue",
    title: "月",
    skill: "hanzi",
    libraryItems: ["char:yue"],
    reviewItems: ["char:yue"],
    steps: [
      intro("Lua e mês", "月 pode significar lua ou mês. Visualmente, ajuda em 明."),
      imageChoice("choose_hanzi", "moon", "Qual hànzì combina com a lua?", "月", visualHanziOptions("moon"), { explanation: "月 é o caractere de lua/mês." }),
      imageChoice("listen_and_choose_image", "moon", "Ouça e escolha a imagem certa.", "moon", visualImageOptions("moon"), { explanation: "月 (yuè) = lua / mês." }),
      hanziBuild("hb-yue-fragments", "Monte 月", "Monte o hànzì de lua.", "月", "lua; mês"),
      dialogue("Revisão de 日", "Qual hànzì combina com sol?", "日", ["日", "月", "木", "水"], "日 e 月 se juntam em 明."),
    ],
  }),
  microLesson({
    id: "p4-char-shan",
    title: "山",
    skill: "hanzi",
    libraryItems: ["char:shan"],
    reviewItems: ["char:shan"],
    steps: [
      intro("Montanha", "山 é montanha. A forma lembra três picos."),
      imageChoice("choose_hanzi", "mountain", "Qual hànzì combina com a montanha?", "山", visualHanziOptions("mountain"), { explanation: "山 é o caractere de montanha." }),
      imageChoice("listen_and_choose_image", "mountain", "Ouça e escolha a imagem certa.", "mountain", visualImageOptions("mountain"), { explanation: "山 (shān) = montanha." }),
      hanziBuild("hb-shan-fragments", "Monte 山", "Monte o hànzì de montanha.", "山", "montanha"),
      dialogue("Revisão de 月", "Qual hànzì combina com lua?", "月", ["月", "山", "水", "火"], "月 volta como revisão."),
    ],
  }),
  microLesson({
    id: "p4-char-shui",
    title: "水",
    skill: "hanzi",
    libraryItems: ["char:shui"],
    reviewItems: ["char:shui"],
    steps: [
      intro("Água", "水 é água. Como radical lateral, costuma aparecer em assuntos ligados a líquido."),
      imageChoice("choose_hanzi", "water", "Qual hànzì combina com água?", "水", visualHanziOptions("water"), { explanation: "水 é o caractere de água." }),
      imageChoice("listen_and_choose_image", "water", "Ouça e escolha a imagem certa.", "water", visualImageOptions("water"), { explanation: "水 (shuǐ) = água." }),
      hanziBuild("hb-shui-fragments", "Monte 水", "Monte o hànzì de água.", "水", "água"),
      sentenceBuild("Frase curta", "Monte: isto é água.", ["这", "是", "水"], ["这", "是", "水", "火", "山"], "这是水 usa 水 em frase mínima."),
    ],
  }),
  microLesson({
    id: "p4-char-tian",
    title: "天",
    skill: "hanzi",
    libraryItems: ["char:tian_sky", "chunk:nashitian", "chunk:jintianhenhao"],
    reviewItems: ["char:tian_sky", "char:shan", "char:ri", "char:yue"],
    steps: [
      intro(
        "Céu e dia",
        "天 é céu — e também entra em 今天 (hoje). Depois de 日、月 e 山, você aponta o que está acima."
      ),
      listen("天", "tiān", "céu; dia"),
      imageChoice(
        "choose_meaning",
        "sky",
        "O que esta imagem mostra?",
        "céu",
        visualMeaningOptions("sky"),
        { explanation: "天 (tiān) = céu (e também 'dia' em palavras como 今天)." }
      ),
      imageChoice(
        "choose_hanzi",
        "sky",
        "Qual hànzì combina com o céu?",
        "天",
        visualHanziOptions("sky"),
        { explanation: "天 é o caractere de céu." }
      ),
      imageChoice(
        "listen_and_choose_image",
        "sky",
        "Ouça e escolha a imagem certa.",
        "sky",
        visualImageOptions("sky"),
        { explanation: "天 (tiān) = céu." }
      ),
      flash("nashitian"),
      listen("那是天", "nà shì tiān", "Aquilo é o céu."),
      sentenceBuild(
        "Aponte o céu",
        "Monte: aquilo é o céu.",
        ["那", "是", "天"],
        ["那", "是", "天", "山", "日"],
        "那是天 aponta o céu na paisagem."
      ),
      dialogue(
        "Comentar o dia",
        "O céu está limpo. Qual frase comenta o dia de forma simples?",
        "今天很好",
        ["今天很好", "那是山", "我很好", "再见"],
        "今天很好 comenta o dia/clima com 天 dentro de 今天."
      ),
      conversationScene("comentar-ceu"),
    ],
  }),
  microLesson({
    id: "p4-char-huo",
    title: "火",
    skill: "hanzi",
    libraryItems: ["char:huo"],
    reviewItems: ["char:huo"],
    steps: [
      intro("Fogo", "火 é fogo. Quando aparece como peça, pode sugerir calor, luz ou energia."),
      imageChoice("choose_hanzi", "fire", "Qual hànzì combina com fogo?", "火", visualHanziOptions("fire"), { explanation: "火 é o caractere de fogo." }),
      imageChoice("listen_and_choose_image", "fire", "Ouça e escolha a imagem certa.", "fire", visualImageOptions("fire"), { explanation: "火 (huǒ) = fogo." }),
      hanziBuild("hb-huo-fragments", "Monte 火", "Monte o hànzì de fogo.", "火", "fogo"),
      dialogue("Revisão de 水", "Qual hànzì combina com água?", "水", ["水", "火", "山", "木"], "水 volta como contraste com 火."),
    ],
  }),
  microLesson({
    id: "p4-char-da",
    title: "大",
    skill: "hanzi",
    libraryItems: ["char:da"],
    reviewItems: ["char:da"],
    steps: [
      intro("Grande", "大 é grande. A forma lembra alguém de braços abertos."),
      imageChoice("choose_hanzi", "big", "Qual hànzì combina com grande?", "大", visualHanziOptions("big"), { explanation: "大 é o caractere de grande." }),
      imageChoice("listen_and_choose_image", "big", "Ouça e escolha a imagem certa.", "big", visualImageOptions("big"), { explanation: "大 (dà) = grande." }),
      hanziBuild("hb-da-fragments", "Monte 大", "Monte o hànzì de grande.", "大", "grande"),
      dialogue("Revisão de 火", "Qual hànzì combina com fogo?", "火", ["火", "大", "小", "水"], "火 volta como revisão."),
    ],
  }),
  microLesson({
    id: "p4-char-xiao",
    title: "小",
    skill: "hanzi",
    libraryItems: ["char:xiao"],
    reviewItems: ["char:xiao"],
    steps: [
      intro("Pequeno", "小 é pequeno. Contrasta com 大."),
      imageChoice("choose_hanzi", "small", "Qual hànzì combina com pequeno?", "小", visualHanziOptions("small"), { explanation: "小 é o caractere de pequeno." }),
      imageChoice("listen_and_choose_image", "small", "Ouça e escolha a imagem certa.", "small", visualImageOptions("small"), { explanation: "小 (xiǎo) = pequeno." }),
      hanziBuild("hb-xiao-fragments", "Monte 小", "Monte o hànzì de pequeno.", "小", "pequeno"),
      dialogue("Revisão de 大", "Qual hànzì significa grande?", "大", ["大", "小", "人", "木"], "大 e 小 formam um contraste."),
    ],
  }),
  microLesson({
    id: "p4-char-zhong",
    title: "中",
    skill: "hanzi",
    libraryItems: ["char:zhong"],
    reviewItems: ["char:zhong"],
    steps: [
      intro("Centro e China", "中 significa meio/centro e aparece em 中文, chinês escrito/falado como língua."),
      imageChoice("choose_hanzi", "person", "Revisão visual: qual hànzì significa pessoa?", "人", visualHanziOptions("person"), { explanation: "人 volta enquanto você prepara 中文." }),
      hanziBuild("hb-zhong-fragments", "Monte 中", "Monte o hànzì de centro.", "中", "meio; China"),
      sentenceBuild("Palavra curta", "Monte: chinês (língua).", ["中", "文"], ["中", "文", "不", "会"], "中文 junta 中 + 文."),
      comp("中", "zhōng", "meio; China", ["meio; China", "não", "ser", "eu"]),
    ],
  }),
  microLesson({
    id: "p4-char-bu",
    title: "不",
    skill: "hanzi",
    libraryItems: ["char:bu"],
    reviewItems: ["char:bu"],
    steps: [intro("Negação", "不 é a peça de negação: não. Você já viu em 我不会说中文."), recognize("bu"), comp("不", "bù", "não", ["não", "ser", "eu", "você"])],
  }),
  microLesson({
    id: "p4-char-shi",
    title: "是",
    skill: "hanzi",
    libraryItems: ["char:shi"],
    reviewItems: ["char:shi"],
    steps: [intro("Ser", "是 significa ser/sim. Em 我是巴西人, liga eu + brasileiro."), recognize("shi"), comp("我是巴西人", "wǒ shì Bāxī rén", "Sou brasileiro", ["Sou brasileiro", "Estou bem", "Obrigado", "Até logo"])],
  }),
  microLesson({
    id: "p4-char-wo",
    title: "我",
    skill: "hanzi",
    libraryItems: ["char:wo"],
    reviewItems: ["char:wo"],
    steps: [intro("Eu", "我 significa eu. É uma das peças mais úteis para frases iniciais."), recognize("wo"), hanziBuild("hb-wo-fragments", "Monte 我", "Monte o hànzì de eu.", "我", "eu"), comp("我", "wǒ", "eu", ["eu", "você", "não", "bom"])],
  }),
  microLesson({
    id: "p4-char-ni",
    title: "你",
    skill: "hanzi",
    libraryItems: ["char:ni"],
    reviewItems: ["char:ni"],
    steps: [intro("Você", "你 significa você. Ele abre 你好 e 你叫什么？."), recognize("ni"), hanziBuild("hb-ni-components", "Monte 你", "Monte o hànzì de você.", "你", "você"), hanziBuild("hb-ni-sentence", "Complete 你好", "Complete a saudação.", "你", "você"), comp("你", "nǐ", "você", ["você", "eu", "pessoa", "boca"])],
  }),
];

const PHASE5_DECOMPOSITION_MICROTASKS: Lesson[] = [
  microLesson({
    id: "p5-mu-mu-lin",
    title: "木 + 木 = 林",
    skill: "hanzi",
    libraryItems: ["char:mu", "char:lin"],
    reviewItems: ["char:mu", "char:lin"],
    steps: [
      intro("Duas árvores", "木 é árvore. Duas árvores juntas formam 林: bosque."),
      decompose("lin"),
      recognize("lin"),
      hanziBuild("hb-lin-components", "Monte 林", "Duas árvores formam qual ideia?", "林", "bosque", ["木", "木"], ["木", "日", "月"]),
      match(
        "Explique 林",
        "Combine a composição com o sentido.",
        [
          { left: "木 + 木", right: "林", leftType: "hanzi", rightType: "hanzi" },
          { left: "林", right: "bosque", leftType: "hanzi", rightType: "pt" },
        ],
        "Duas árvores sugerem um bosque."
      ),
    ],
  }),
  microLesson({
    id: "p5-mu-mu-mu-sen",
    title: "木 + 木 + 木 = 森",
    skill: "hanzi",
    libraryItems: ["char:mu", "char:sen"],
    reviewItems: ["char:mu", "char:sen"],
    steps: [
      intro("Três árvores", "森 repete 木 três vezes. A imagem fica mais intensa: floresta densa."),
      decompose("sen"),
      recognize("sen"),
      hanziBuild("hb-sen-components", "Monte 森", "Três árvores formam qual ideia?", "森", "floresta densa", ["木", "木", "木"], ["木", "日", "月"]),
      match(
        "Explique 森",
        "Combine a composição com o sentido.",
        [
          { left: "木 + 木 + 木", right: "森", leftType: "hanzi", rightType: "hanzi" },
          { left: "森", right: "floresta", leftType: "hanzi", rightType: "pt" },
        ],
        "Muitas árvores sugerem floresta."
      ),
    ],
  }),
  microLesson({
    id: "p5-ri-yue-ming",
    title: "日 + 月 = 明",
    skill: "hanzi",
    libraryItems: ["char:ri", "char:yue", "char:ming"],
    reviewItems: ["char:ri", "char:yue", "char:ming"],
    steps: [
      intro("Duas luzes", "日 é sol/dia. 月 é lua/mês. Juntos, 明 cria a ideia de claro/brilhante."),
      decompose("ming"),
      recognize("ming"),
      hanziBuild("hb-ming-components", "Monte 明", "Sol + lua forma qual caractere?", "明", "claro; brilhante", ["日", "月"], ["月", "口", "日", "木"]),
      hanziBuild("hb-ming-sentence", "Complete 明天", "Monte o hànzì que completa amanhã.", "明", "claro; brilhante"),
      comp("明", "míng", "claro; brilhante", ["claro; brilhante", "floresta", "mãe", "pergunta"]),
    ],
  }),
  microLesson({
    id: "p5-ren-mu-xiu",
    title: "人 + 木 = 休",
    skill: "hanzi",
    libraryItems: ["char:ren", "char:mu", "char:xiu"],
    reviewItems: ["char:ren", "char:mu", "char:xiu"],
    steps: [
      intro("Pessoa na árvore", "Uma pessoa ao lado de uma árvore cria a cena de descansar: 休."),
      decompose("xiu"),
      recognize("xiu"),
      hanziBuild("hb-xiu-components", "Monte 休", "Pessoa + árvore forma qual ideia?", "休", "descansar"),
      match(
        "Cena mental",
        "Combine a composição com a cena.",
        [
          { left: "人 + 木", right: "休", leftType: "hanzi", rightType: "hanzi" },
          { left: "休", right: "descansar", leftType: "hanzi", rightType: "pt" },
        ],
        "Uma pessoa perto da árvore cria a cena de descansar."
      ),
    ],
  }),
  microLesson({
    id: "p5-nv-zi-hao",
    title: "女 + 子 = 好",
    skill: "hanzi",
    libraryItems: ["char:nv", "char:zi", "char:hao"],
    reviewItems: ["char:nv", "char:zi", "char:hao"],
    steps: [
      intro("Uma ponte visual", "女 + 子 forma 好, bom/bem. Não é uma regra moderna de cultura: aqui é uma memória visual para reconhecer o caractere."),
      decompose("hao"),
      recognize("hao"),
      hanziBuild("hb-hao-components", "Monte 好", "Mulher + criança forma qual caractere?", "好", "bom; bem"),
      hanziBuild("hb-hao-sentence", "Complete 你好", "Complete a saudação.", "好", "bom; bem"),
      comp("好", "hǎo", "bom; bem", ["bom; bem", "mulher", "filho", "pergunta"]),
    ],
  }),
  microLesson({
    id: "p5-ren-ren-cong",
    title: "人 + 人 = 从",
    skill: "hanzi",
    libraryItems: ["char:ren", "char:cong"],
    reviewItems: ["char:ren", "char:cong"],
    steps: [
      intro("Uma pessoa atrás da outra", "从 mostra uma pessoa seguindo outra. A ideia central é seguir; a partir de."),
      decompose("cong"),
      recognize("cong"),
      match(
        "Siga a imagem",
        "Combine a composição com a ideia.",
        [
          { left: "人 + 人", right: "从", leftType: "hanzi", rightType: "hanzi" },
          { left: "从", right: "seguir", leftType: "hanzi", rightType: "pt" },
        ],
        "Duas pessoas em sequência sugerem seguir."
      ),
    ],
  }),
  microLesson({
    id: "p5-ren-ren-ren-zhong",
    title: "人 + 人 + 人 = 众",
    skill: "hanzi",
    libraryItems: ["char:ren", "char:zhong3"],
    reviewItems: ["char:ren", "char:zhong3"],
    steps: [
      intro("Muita gente", "众 junta três pessoas. A cena vira multidão."),
      decompose("zhong3"),
      recognize("zhong3"),
      comp("众", "zhòng", "multidão", ["multidão", "pessoa", "descansar", "bom"]),
    ],
  }),
  microLesson({
    id: "p5-nv-ma-mae",
    title: "女 + 马 = 妈",
    skill: "hanzi",
    libraryItems: ["char:nv", "char:ma2"],
    reviewItems: ["char:nv", "char:ma2"],
    steps: [
      intro("Sentido e som", "Em 妈, 女 dá o campo de sentido e 马 dá a pista sonora ma."),
      decompose("ma2"),
      recognize("ma2"),
      tone("妈", "mā", 1, "quiz"),
      dialogue(
        "Peça sonora",
        "Em 妈, qual peça dá o som ma?",
        "马",
        ["马", "女", "木", "口"],
        "马 dá a pista sonora ma; 女 dá o campo de sentido.",
        "Escolha"
      ),
    ],
  }),
  microLesson({
    id: "p5-kou-ma-pergunta",
    title: "口 + 马 = 吗",
    skill: "hanzi",
    libraryItems: ["char:kou", "char:ma_question", "chunk:nihaoma"],
    reviewItems: ["char:kou", "char:ma_question", "chunk:nihaoma"],
    steps: [
      intro("A partícula de pergunta", "Em 吗, 口 aponta para fala/frase e 马 dá a pista sonora ma. Em 你好吗？, 吗 transforma em pergunta."),
      decompose("ma_question"),
      recognize("ma_question"),
      flash("nihaoma"),
      comp("你好吗？", "nǐ hǎo ma?", "Tudo bem?", ["Tudo bem?", "Obrigado(a)", "De nada", "Sou brasileiro"]),
    ],
  }),
];

export const JOURNEY: JourneyPhase[] = [
  // ─── FASE 1 · Primeiro Contato ───────────────────────────────────────────
  {
    id: "p1",
    order: 1,
    title: "Primeiro Contato",
    why: "Som → cumprimento → conversa → imagem → hànzì → revisão. Em poucos minutos você já fala com naturalidade.",
    tier: "fundamentos",
    units: [
      {
        id: "u1-1",
        title: "Seu primeiro mandarim",
        subtitle: "Som, cumprimento e conversa",
        goal: "Entender mandarim/pinyin/tom e cumprimentar com naturalidade.",
        color: "#2F6FB0",
        focusChunks: ["你好", "你好吗？", "我很好"],
        focusHanzi: ["你", "好", "我"],
        focusGrammar: ["resposta social curta", "pergunta com 吗"],
        focusSounds: ["nǐ hǎo", "nǐ hǎo ma?", "wǒ hěn hǎo", "3º tom em 你/好"],
        focusSituations: ["cumprimentar alguém", "perguntar se está bem", "responder com 我很好"],
        lessons: [
          ...PHASE1_BOOTSTRAP_LESSONS,
          ...PHASE1_ENGINE_LESSONS,
          {
            id: "l1",
            title: "Mandarim, pinyin e tom",
            skill: "sistema",
            libraryItems: ["chunk:nihao", "char:ma2"],
            reviewItems: ["chunk:nihao", "char:ma2"],
            estimatedMinutes: 3,
            steps: [
              intro(
                "Bem-vindo ao mandarim",
                "Mandarim é a língua chinesa padrão. Aqui você começa pelo som e por frases úteis — sem listas frias de exercício."
              ),
              intro(
                "Pinyin: ponte para o som",
                "Pinyin escreve o som com letras latinas: 你好 vira nǐ hǎo. É uma ponte para falar e ouvir, não um substituto para sempre."
              ),
              listen("你好", "nǐ hǎo", "Olá — seu primeiro som útil", "pinyin_first"),
              intro(
                "Soa “ní hǎo”",
                "Na fala real, 你好 soa “ní hǎo”: quando dois 3º tons se encontram, o primeiro sobe para 2º tom. Você ouve isso em praticamente todo cumprimento."
              ),
              intro(
                "Tom: a curva da voz",
                "Em mandarim, a curva da voz faz parte da palavra. O mesmo som com tom diferente pode significar outra coisa."
              ),
              tone("妈", "mā", 1),
              tone("马", "mǎ", 3),
              dialogue(
                "O que é tom?",
                "Em mandarim, tom é...",
                "a curva da voz que pode mudar o sentido",
                [
                  "a curva da voz que pode mudar o sentido",
                  "a tradução em português",
                  "o desenho do caractere",
                  "só um detalhe opcional",
                ],
                "Tom é parte da pronúncia: mudar a curva pode mudar a palavra inteira.",
                "Escolha"
              ),
            ],
          },
          {
            id: "l2",
            title: "Olá",
            skill: "fala",
            masteryLoop: true,
            libraryItems: [
              "chunk:nihao",
              "chunk:zaoshanghao",
              "char:ni",
              "char:hao",
              "char:ren",
              "char:wo",
              "chunk:wojiao",
            ],
            reviewItems: ["chunk:nihao", "chunk:zaoshanghao", "char:ni", "char:hao"],
            steps: [
              listen("你好", "nǐ hǎo", "Olá"),
              listenSelect(
                "Ouça e reconheça",
                "你好",
                ["你好", "谢谢", "再见", "不客气"],
                "你好",
                "Você ouviu 你好 — a saudação mais segura."
              ),
              comp("你好", "nǐ hǎo", "Olá", ["Olá", "Obrigado(a)", "Até logo", "De nada"]),
              produce(["你", "好"], ["谢", "好", "你", "再"], "Olá"),
              sentenceBuild(
                "Monte o cumprimento",
                "Monte: Olá.",
                ["你", "好"],
                ["好", "你", "谢", "再"],
                "你 + 好 forma 你好."
              ),
              // LEX-007 — variação temporal do cumprimento (Atlas → Journey)
              listen("早上好", "zǎoshang hǎo", "Bom dia"),
              comp("早上好", "zǎoshang hǎo", "Bom dia", ["Bom dia", "Boa noite", "Até logo", "De nada"]),
              dialogue(
                "De manhã",
                "É de manhã. Qual cumprimento combina melhor?",
                "早上好",
                ["早上好", "再见", "谢谢", "不客气"],
                "早上好 = bom dia — mesma ideia de 好, momento diferente."
              ),
              intro(
                "De pessoa a você",
                "你 significa você — e traz a ideia de pessoa 亻 ao lado de 好. Você já viu 人 antes."
              ),
              dialogue(
                "Na prática",
                "Você encontra alguém. O que combina dizer?",
                "你好",
                ["你好", "谢谢", "再见", "不客气"],
                "你好 é a saudação segura para encontrar ou cumprimentar alguém."
              ),
              conversationScene("primeiro-cumprimento"),
              fillBlank(
                "Use na frase",
                "Complete o cumprimento: 你 ___.",
                "你",
                "好",
                "",
                ["好", "谢", "再", "见"],
                "你好 = olá."
              ),
            ],
          },
          {
            id: "l3",
            title: "Tudo bem?",
            skill: "fala",
            masteryLoop: true,
            libraryItems: ["chunk:nihaoma", "chunk:wohenhao", "chunk:nine", "char:wo"],
            reviewItems: ["chunk:nihaoma", "chunk:wohenhao", "chunk:nine"],
            steps: [
              listen("你好吗？", "nǐ hǎo ma?", "Tudo bem?"),
              listen("我很好", "wǒ hěn hǎo", "Estou bem"),
              comp("你好吗？", "nǐ hǎo ma?", "Tudo bem?", ["Tudo bem?", "Obrigado(a)", "De nada", "Até logo"]),
              produce(["我", "很", "好"], ["好", "你", "我", "很", "谢"], "Estou bem"),
              sentenceBuild(
                "Monte a pergunta",
                "Monte: Tudo bem?",
                ["你", "好", "吗"],
                ["吗", "你", "好", "我", "很"],
                "你 + 好 + 吗 forma 你好吗？"
              ),
              dialogue(
                "Escolha a resposta",
                "Pessoa pergunta: 你好吗？ O que você responde se está bem?",
                "我很好",
                ["我很好", "再见", "谢谢", "不客气"],
                "我很好 é a resposta natural: estou bem."
              ),
              dialogue(
                "Devolva a pergunta",
                "Você respondeu 我很好. Como devolver a pergunta para a pessoa?",
                "你呢？",
                ["你呢？", "你好吗？", "谢谢", "再见"],
                "你呢？ devolve a pergunta: “e você?”."
              ),
              conversationScene("perguntando-se-esta-bem"),
              listenSelect(
                "Ouça a resposta",
                "我很好",
                ["你好吗？", "我很好", "谢谢", "再见"],
                "我很好",
                "Você ouviu 我很好."
              ),
            ],
          },
          review("l1-rev", "fala", [
            intro("Revisão viva", "Vamos usar o que você já viu numa conversa curta."),
            conversationScene("primeiro-cumprimento"),
            conversationScene("perguntando-se-esta-bem"),
            produce(["你", "好"], ["谢", "好", "你", "再"], "Olá"),
            dialogue(
              "Resposta certa",
              "Pessoa pergunta: 你好吗？ Qual resposta combina?",
              "我很好",
              ["我很好", "谢谢", "再见", "不客气"],
              "我很好 responde que está bem."
            ),
            listenSelect("Ouça de novo", "你好", ["你好", "我很好", "谢谢", "再见"], "你好", "Você ouviu 你好."),
          ]),
        ],
      },
      {
        id: "u1-2",
        title: "Cortesia e despedida",
        subtitle: "Agradecer, responder e fechar",
        goal: "Agradecer, responder com cortesia e encerrar uma conversa.",
        color: "#7A3FB0",
        focusChunks: ["谢谢", "不客气", "再见"],
        focusHanzi: ["谢", "再", "见", "不"],
        focusGrammar: ["resposta social curta", "frase de cortesia como bloco"],
        focusSounds: ["xièxie", "bú kèqi", "zàijiàn", "4º tom em 谢"],
        focusSituations: ["agradecer ajuda", "responder a 谢谢", "encerrar uma conversa"],
        lessons: [
          {
            id: "l4",
            title: "Obrigado",
            skill: "fala",
            masteryLoop: true,
            libraryItems: ["chunk:xiexie", "chunk:bukeqi", "chunk:meiguanxi", "char:xie"],
            reviewItems: ["chunk:xiexie", "chunk:bukeqi", "chunk:meiguanxi"],
            steps: [
              listen("谢谢", "xièxie", "Obrigado(a)"),
              listen("不客气", "bú kèqi", "De nada"),
              intro(
                "Por que “bú kèqi”?",
                "不 é bù (4º tom), mas antes de outra sílaba de 4º tom ele sobe para bú. Por isso 不客气 soa “bú kèqi”, mesmo 不 sozinho sendo bù."
              ),
              dialogue(
                "Quando 不 sobe?",
                "不 é bù (4º tom). Quando ele vira bú?",
                "antes de outra sílaba de 4º tom",
                ["antes de outra sílaba de 4º tom", "antes de um 1º tom", "no fim da frase", "sempre, em qualquer posição"],
                "Antes de 4º tom, 不 sobe para 2º tom: 不客气 soa bú kèqi."
              ),
              listenSelect(
                "Ouça o agradecimento",
                "谢谢",
                ["你好", "谢谢", "再见", "不客气"],
                "谢谢",
                "谢谢 é a forma curta e comum de agradecer."
              ),
              comp("谢谢", "xièxie", "Obrigado(a)", ["Obrigado(a)", "Olá", "De nada", "Até logo"]),
              sentenceBuild(
                "Monte o agradecimento",
                "Monte: Obrigado(a).",
                ["谢", "谢"],
                ["谢", "你", "好", "再"],
                "谢谢 repete 谢 para agradecer."
              ),
              dialogue(
                "Na situação",
                "Alguém te ajuda. Qual frase curta você usa?",
                "谢谢",
                ["谢谢", "你好", "再见", "不客气"],
                "谢谢 agradece de forma natural."
              ),
              conversationScene("agradecendo"),
              dialogue(
                "Responda com cortesia",
                "Pessoa diz: 谢谢. O que você responde?",
                "不客气",
                ["不客气", "谢谢", "你好", "再见"],
                "不客气 é a resposta natural: de nada.",
                "Pessoa"
              ),
              // LEX-007 — Atlas chunk 没关系 (desculpa social / “não tem problema”)
              listen("没关系", "méi guānxi", "Não tem problema"),
              comp(
                "没关系",
                "méi guānxi",
                "Não tem problema / não foi nada",
                ["Não tem problema / não foi nada", "Até logo", "Bom dia", "Obrigado(a)"]
              ),
              dialogue(
                "Alguém se desculpa",
                "A pessoa diz 对不起. Qual resposta suave combina?",
                "没关系",
                ["没关系", "再见", "早上好", "我很好"],
                "没关系 = não tem problema — fecha o pedido de desculpas."
              ),
              listenSelect(
                "Ouça de novo",
                "不客气",
                ["不客气", "谢谢", "你好", "再见"],
                "不客气",
                "Você ouviu 不客气."
              ),
            ],
          },
          {
            id: "p1-ate-logo",
            title: "Até logo",
            skill: "fala",
            masteryLoop: true,
            libraryItems: [
              "chunk:zaijian",
              "chunk:mingtianjian",
              "chunk:wanan",
              "chunk:wanshanghao",
            ],
            reviewItems: ["chunk:zaijian", "chunk:mingtianjian", "chunk:wanan"],
            steps: [
              listen("再见", "zàijiàn", "Até logo"),
              listenSelect(
                "Ouça a despedida",
                "再见",
                ["明天见", "谢谢", "再见", "我很好"],
                "再见",
                "再见 fecha a conversa."
              ),
              comp("再见", "zàijiàn", "Até logo", ["Até logo", "Olá", "Obrigado(a)", "De nada"]),
              produce(["再", "见"], ["你", "见", "再", "好"], "Até logo"),
              sentenceBuild(
                "Monte a despedida",
                "Monte: Até logo.",
                ["再", "见"],
                ["见", "谢", "再", "好"],
                "再 + 见 forma 再见."
              ),
              dialogue(
                "Hora de ir",
                "Você vai embora. O que combina dizer?",
                "再见",
                ["再见", "明天见", "谢谢", "我很好"],
                "再见 fecha a conversa: até logo."
              ),
              conversationScene("despedida"),
              // LEX-007 — despedidas do Atlas além de 再见
              listen("明天见", "míngtiān jiàn", "Até amanhã"),
              comp("明天见", "míngtiān jiàn", "Até amanhã", ["Até amanhã", "Bom dia", "De nada", "Estou bem"]),
              dialogue(
                "Vocês se veem amanhã",
                "Vocês combinam de se ver amanhã. Qual despedida é mais precisa?",
                "明天见",
                ["明天见", "不客气", "早上好", "我很好"],
                "明天见 = até amanhã — marca o próximo encontro."
              ),
              listen("晚上好", "wǎnshang hǎo", "Boa noite (ao chegar)"),
              listen("晚安", "wǎn'ān", "Boa noite (ao dormir)"),
              dialogue(
                "Antes de dormir",
                "É hora de dormir. Qual frase combina?",
                "晚安",
                ["晚安", "谢谢", "请问", "我很好"],
                "晚安 = boa noite ao dormir (diferente de 晚上好)."
              ),
              dialogue(
                "Despedida vs. cumprimento",
                "Alguém chega. Você usa 你好. Alguém vai embora. Você usa…",
                "再见",
                ["再见", "谢谢", "不客气", "我很好"],
                "Mesmo núcleo social, função nova: 再见 encerra; a manutenção de 你好 fica na revisão/SRS."
              ),
            ],
          },
          microLesson({
            id: "p1-primeira-conversa",
            title: "Primeira conversa",
            skill: "fala",
            masteryLoop: true,
            libraryItems: [
              "chunk:nihao",
              "chunk:nihaoma",
              "chunk:wohenhao",
              "chunk:xiexie",
              "chunk:zaijian",
              "chunk:bukeqi",
              "chunk:zaoshanghao",
              "chunk:mingtianjian",
              "chunk:nijiaoshenme",
              "chunk:wojiao",
            ],
            reviewItems: [
              "chunk:nihao",
              "chunk:nihaoma",
              "chunk:wohenhao",
              "chunk:xiexie",
              "chunk:zaijian",
              "chunk:zaoshanghao",
              "chunk:mingtianjian",
            ],
            rewardQi: 3,
            estimatedMinutes: 5,
            steps: [
              intro(
                "Conversa completa",
                "Você e Mei vão usar o que você aprendeu — e abrir espaço para nome e novas despedidas."
              ),
              dialogue(
                "Sua vez",
                "Alguém diz 你好！ Qual é a resposta natural?",
                "你好",
                ["你好", "谢谢", "再见", "不客气"],
                "你好 também responde a um cumprimento."
              ),
              // LEX-008 — apresentação entra cedo (Atlas → Journey)
              listen("你叫什么？", "nǐ jiào shénme?", "Como você se chama?"),
              dialogue(
                "Pergunte o nome",
                "Você quer saber o nome da pessoa. O que pergunta?",
                "你叫什么？",
                ["你叫什么？", "再见", "不客气", "早上好"],
                "你叫什么？ pergunta o nome."
              ),
              conversationScene("como-se-chama"),
              dialogue(
                "Bom dia de novo",
                "É de manhã na segunda conversa. Qual cumprimento combina?",
                "早上好",
                ["早上好", "不客气", "请问", "我很好"],
                "早上好 reaparece depois de 你好 — mesmo 好, momento novo."
              ),
              dialogue(
                "Até amanhã",
                "Vocês vão se ver amanhã. Qual despedida combina?",
                "明天见",
                ["明天见", "谢谢", "请问", "我很好"],
                "明天见 reforça a despedida com plano."
              ),
              produce(["再", "见"], ["你", "见", "再", "好"], "Até logo"),
            ],
          }),
          microLesson({
            id: "p1-qingwen-cortesia",
            title: "Com licença",
            skill: "fala",
            masteryLoop: true,
            libraryItems: [
              "chunk:qingwen",
              "chunk:qingwen_nihaoma",
              "chunk:nihaoma",
              "chunk:qingzuo",
              "chunk:qingjin",
            ],
            reviewItems: ["chunk:qingwen", "chunk:nihaoma", "chunk:qingzuo", "chunk:qingjin"],
            estimatedMinutes: 4,
            steps: [
              listen("请问", "qǐng wèn", "Com licença, posso perguntar?"),
              listen("请问，你好吗？", "qǐng wèn, nǐ hǎo ma?", "Com licença, tudo bem?"),
              comp(
                "请问",
                "qǐng wèn",
                "Com licença, posso perguntar?",
                ["Com licença, posso perguntar?", "De nada", "Obrigado(a)", "Até logo"]
              ),
              conversationScene("cortesia-loja"),
              dialogue(
                "Quando usar",
                "Você quer pedir informação na loja ou na rua. O que abre a pergunta?",
                "请问",
                ["请问", "再见", "不客气", "我很好"],
                "请问 = com licença; abre a pergunta."
              ),
              sentenceBuild(
                "Abertura curta",
                "Monte a abertura: com licença + tudo bem?",
                ["请问", "你好吗"],
                ["请问", "你好吗", "谢谢", "再见"],
                "请问 + 你好吗？ reutiliza o cumprimento em estrutura nova (pedido de licença)."
              ),
              // LEX-007 — 请坐 / 请进 (Atlas courtesy)
              listen("请坐", "qǐng zuò", "Sente-se, por favor"),
              listen("请进", "qǐng jìn", "Entre, por favor"),
              dialogue(
                "Receber alguém",
                "Alguém chega na sua casa. Qual convite combina?",
                "请进",
                ["请进", "再见", "明天见", "我很好"],
                "请进 = entre, por favor."
              ),
              dialogue(
                "Oferecer assento",
                "A pessoa entrou. O que você diz para ela se sentar?",
                "请坐",
                ["请坐", "谢谢", "早上好", "不客气"],
                "请坐 = sente-se, por favor."
              ),
              produce(["请", "问"], ["你", "好", "请", "问"], "Com licença — foco na abertura nova"),
            ],
          }),
          review("l2-rev", "fala", [
            intro("Revisão do módulo", "Vamos usar o que você já viu — inclusive cumprimentos novos."),
            conversationScene("revisao-cumprimento-completo"),
            conversationScene("agradecendo"),
            dialogue(
              "Manhã ou despedida?",
              "É de manhã. Qual frase combina?",
              "早上好",
              ["早上好", "明天见", "不客气", "请问"],
              "早上好 reforça o cumprimento matinal."
            ),
            dialogue(
              "Não tem problema",
              "Alguém se desculpa. O que você responde?",
              "没关系",
              ["没关系", "再见", "早上好", "请问"],
              "没关系 fecha o pedido de desculpas."
            ),
            produce(["你", "好"], ["谢", "好", "你", "再"], "Olá"),
            sentenceBuild(
              "Monte o agradecimento",
              "Monte: Obrigado(a).",
              ["谢", "谢"],
              ["谢", "你", "好", "再"],
              "谢谢 repete 谢 para agradecer."
            ),
            dialogue(
              "Resposta certa",
              "Pessoa diz 谢谢. O que você responde?",
              "不客气",
              ["不客气", "你好", "再见", "我很好"],
              "不客气 responde ao agradecimento."
            ),
            listenSelect("Ouça tudo junto", "明天见", ["明天见", "你好", "谢谢", "我很好"], "明天见", "Você ouviu 明天见."),
          ]),
        ],
      },
    ],
  },

  // ─── FASE 2 · Som e Tons ─────────────────────────────────────────────────
  {
    id: "p2",
    order: 2,
    title: "Som e Tons",
    why: "No mandarim, o tom muda o sentido — treine o ouvido antes de acumular caracteres.",
    tier: "fundamentos",
    units: [
      {
        id: "u2-1",
        title: "Os quatro contornos",
        subtitle: "mā má mǎ mà",
        goal: "Distinguir e imitar os 4 tons.",
        color: "#2F855A",
        focusChunks: [],
        focusHanzi: ["妈", "麻", "马", "骂"],
        focusGrammar: ["tom como parte lexical da palavra"],
        focusSounds: ["1º tom alto e reto", "2º tom subindo", "3º tom desce e sobe", "4º tom cai firme"],
        focusSituations: ["perceber diferença de sentido pelo contorno", "comparar pares de tons"],
        lessons: [
          ...PHASE2_MA_TONE_MICROTASKS,
          {
            id: "l5",
            title: "Quatro tons",
            skill: "som",
            steps: [
              intro(
                "Quatro contornos",
                "1º alto e reto · 2º sobe · 3º desce e sobe · 4º cai firme. A série ma (妈麻马骂) é o clássico para treinar."
              ),
              listen("妈", "mā", "mãe (1º tom)"),
              listen("麻", "má", "cânhamo (2º tom)"),
              listen("马", "mǎ", "cavalo (3º tom)"),
              listen("骂", "mà", "xingar (4º tom)"),
              tone("妈", "mā", 1),
              tone("麻", "má", 2),
              tone("马", "mǎ", 3),
              tone("骂", "mà", 4),
              match(
                "Tom muda sentido",
                "Combine cada sílaba com o sentido.",
                [
                  { left: "mā", right: "mãe", leftType: "pinyin", rightType: "pt" },
                  { left: "má", right: "cânhamo", leftType: "pinyin", rightType: "pt" },
                  { left: "mǎ", right: "cavalo", leftType: "pinyin", rightType: "pt" },
                  { left: "mà", right: "xingar", leftType: "pinyin", rightType: "pt" },
                ],
                "Em mandarim, mudar o tom pode mudar a palavra inteira."
              ),
            ],
          },
          {
            id: "l6",
            title: "Treino guiado",
            skill: "som",
            reviewItems: ["chunk:nihaoma"],
            steps: [
              intro("Forme o ouvido", "Veja a curva do tom, ouça e imite. Nas revisões, o app pode esconder as dicas."),
              tone("妈", "mā", 1),
              tone("麻", "má", 2),
              tone("马", "mǎ", 3),
              tone("骂", "mà", 4),
              listenSelect(
                "Identifique de ouvido",
                "骂",
                ["妈", "麻", "马", "骂"],
                "骂",
                "mà é a queda firme do 4º tom — compare com a reta (mā), a subida (má) e o vale (mǎ)."
              ),
              listen(
                "吗",
                "ma",
                "吗 é a “quinta irmã” de ma: tom neutro, curto e leve, sem contorno — é ele que fecha 你好吗？"
              ),
              fillBlank(
                "A quinta irmã de ma",
                "Complete a pergunta que você já conhece: tudo bem?",
                "你好",
                "吗",
                "？",
                ["吗", "麻"],
                "吗 é ma com tom neutro — a mesma sílaba que você treinou, agora dentro de uma frase real."
              ),
              dialogue(
                "Dica auditiva",
                "Qual tom parece uma queda rápida e firme?",
                "4º tom",
                ["4º tom", "1º tom", "2º tom", "3º tom"],
                "O 4º tom cai rápido e firme, como um comando curto.",
                "Escolha"
              ),
            ],
          },
          review("l3-rev", "som", [
            tone("妈", "mā", 1, "quiz"),
            tone("骂", "mà", 4, "quiz"),
            tone("马", "mǎ", 3, "quiz"),
            comp("妈", "mā", "mãe (1º tom)", ["mãe (1º tom)", "cavalo (3º tom)", "xingar (4º tom)", "obrigado"]),
            match(
              "Compare dois tons",
              "Combine cada tom com o contorno.",
              [
                { left: "1º tom", right: "alto e reto", leftType: "pt", rightType: "pt" },
                { left: "4º tom", right: "cai rápido e firme", leftType: "pt", rightType: "pt" },
              ],
              "O 1º tom fica alto e reto. O 4º tom cai rápido e firme."
            ),
          ]),
        ],
      },
      {
        id: "u2-2",
        title: "Tons na prática",
        subtitle: "Novas sílabas e frases que você já conhece",
        goal: "Aplicar tons em sílabas novas e nas frases de cortesia.",
        color: "#B7791F",
        focusChunks: ["你好", "谢谢"],
        focusHanzi: ["好", "谢", "是"],
        focusGrammar: ["tom em frase já conhecida", "reconhecimento sonoro antes da produção"],
        focusSounds: ["hǎo", "xiè", "shì", "yáo/yào"],
        focusSituations: ["reconhecer tons em cumprimentos", "comparar sílabas parecidas"],
        lessons: [
          {
            id: "l7",
            title: "A sílaba yao",
            skill: "som",
            libraryItems: ["char:yao_bite", "char:yao_shake"],
            reviewItems: ["chunk:nihaoma", "chunk:wohenhao"],
            steps: [
              intro("Uma sílaba, três palavras", "yáo, yǎo e yào compartilham a mesma base — só o contorno muda a palavra. Treine o ouvido antes da memória."),
              listen("要", "yào", "querer (4º tom)"),
              listen("摇", "yáo", "balançar (2º tom)"),
              tone("要", "yào", 4),
              tone("咬", "yǎo", 3, "quiz"),
              listenSelect(
                "Qual você ouviu?",
                "咬",
                ["要", "咬", "摇"],
                "咬",
                "yǎo faz o vale do 3º tom; yào cai e yáo sobe."
              ),
              comp("摇", "yáo", "balançar", ["balançar", "querer", "morder", "obrigado"]),
              match(
                "Ouvido antes da memória",
                "Combine cada sílaba com o contorno.",
                [
                  { left: "yáo", right: "sobe no 2º tom", leftType: "pinyin", rightType: "pt" },
                  { left: "yào", right: "cai no 4º tom", leftType: "pinyin", rightType: "pt" },
                ],
                "yáo sobe; yào cai."
              ),
              fillBlank(
                "Tom neutro na frase antiga",
                "Complete a pergunta: tudo bem?",
                "你好",
                "吗",
                "？",
                ["吗", "再"],
                "吗 fecha a pergunta com tom neutro — contraste com as curvas fortes de yao."
              ),
              sentenceBuild(
                "Três vales seguidos",
                "Monte a resposta antiga: estou bem (três 3º tons).",
                ["我", "很", "好"],
                ["我", "很", "好", "见"],
                "wǒ hěn hǎo repete o mesmo vale de yǎo três vezes seguidas."
              ),
            ],
          },
          {
            id: "l8",
            title: "Tons em 好 e 谢",
            skill: "som",
            steps: [
              intro("Reconectar", "Você já falou 你好 e 谢谢 — agora treine o tom exato de 好 (3º) e ouça 谢 (4º)."),
              tone("好", "hǎo", 3),
              listen("谢", "xiè", "agradecer (4º tom)"),
              comp("你好", "nǐ hǎo", "Olá", ["Olá", "Obrigado(a)", "Até logo", "De nada"]),
              tone("谢", "xiè", 4),
              dialogue(
                "Conecte som e frase",
                "Em 你好, qual sílaba tem 3º tom?",
                "好 / hǎo",
                ["好 / hǎo", "谢 / xiè", "是 / shì", "再 / zài"],
                "好 / hǎo tem 3º tom.",
                "Escolha"
              ),
            ],
          },
          {
            id: "l8-compare",
            title: "Compare tons",
            skill: "som",
            libraryItems: ["char:ma2"],
            reviewItems: ["char:ma2", "chunk:nihaoma"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              intro("Compare em pares", "O 1º tom fica alto e reto; o 4º cai firme. O 2º sobe; o 3º desce e volta. Comparar pares treina o ouvido mais rápido."),
              tone("妈", "mā", 1, "quiz"),
              tone("骂", "mà", 4, "quiz"),
              tone("麻", "má", 2, "quiz"),
              tone("马", "mǎ", 3, "quiz"),
              listenSelect(
                "Subida ou vale?",
                "麻",
                ["麻", "马"],
                "麻",
                "má sobe direto; mǎ desce e volta a subir."
              ),
              match(
                "Dois pares",
                "Combine cada tom com o contorno.",
                [
                  { left: "1º tom", right: "alto e reto", leftType: "pt", rightType: "pt" },
                  { left: "4º tom", right: "cai", leftType: "pt", rightType: "pt" },
                  { left: "2º tom", right: "sobe", leftType: "pt", rightType: "pt" },
                  { left: "3º tom", right: "desce e sobe", leftType: "pt", rightType: "pt" },
                ],
                "1º fica alto e reto; 4º cai. 2º sobe; 3º desce e sobe."
              ),
              sentenceBuild(
                "Do tom à frase",
                "Monte a pergunta antiga: tudo bem?",
                ["你", "好", "吗"],
                ["你", "好", "吗", "麻"],
                "你好吗 termina na sílaba ma sem tom — a quinta irmã da família que você acabou de comparar."
              ),
            ],
          },
          {
            id: "l8-shi",
            title: "A sílaba shi",
            skill: "som",
            libraryItems: ["char:shi"],
            reviewItems: ["char:shi", "chunk:zaijian", "chunk:wohenhao"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              intro("Mesmo som base, tons diferentes", "shī, shí, shǐ e shì mostram como o contorno muda a palavra. Vamos treinar com 是 (shì), a peça de ‘ser/estar’."),
              listen("湿", "shī", "molhado (1º tom)"),
              listen("十", "shí", "dez (2º tom)"),
              listen("使", "shǐ", "usar; fazer (3º tom)"),
              tone("是", "shì", 4),
              listenSelect(
                "Qual shi você ouviu?",
                "是",
                ["湿", "十", "使", "是"],
                "是",
                "shì cai firme no 4º tom — é o shi de 'ser'."
              ),
              recognize("shi"),
              comp("十", "shí", "dez", ["dez", "molhado", "usar; fazer", "ser; sim"]),
              sentenceBuild(
                "Queda dupla conhecida",
                "Monte a despedida: até logo (duas quedas como shì).",
                ["再", "见"],
                ["再", "见", "十"],
                "再见 zài jiàn repete o contorno de shì duas vezes."
              ),
              fillBlank(
                "Complete o vale",
                "Complete a resposta antiga: estou bem.",
                "我很",
                "好",
                "",
                ["好", "使"],
                "我很好 fecha com hǎo — o mesmo vale do 3º tom de shǐ."
              ),
            ],
          },
          ...PHASE2_CONTEXT_TONE_MICROTASKS,
          {
            id: "p2-sons-brasileiros",
            title: "Sons que brasileiros confundem",
            skill: "som",
            libraryItems: [
              "chunk:xiexie",
              "chunk:tingbudong",
              "chunk:qingzaishuoyibian",
              "char:shi",
              "char:qing_pls",
              "char:zhong",
              "char:nv",
            ],
            reviewItems: ["chunk:xiexie", "chunk:tingbudong", "char:shi", "char:qing_pls", "char:zhong", "char:nv"],
            rewardQi: 2,
            estimatedMinutes: 6,
            steps: [
              intro(
                "Três famílias de consoantes",
                "O mandarim separa sons que o português não separa: j/q/x (língua alta), zh/ch/sh (língua enrolada) e z/c/s (língua baixa). Brasileiros trocam x por sh e j por zh. Vamos treinar com palavras que você já conhece — e com frases de reparo úteis."
              ),
              listen("谢", "xiè", "xiè — x com a língua alta e bem à frente (fricativa suave)"),
              listen("是", "shì", "shì — sh retroflexo, com a língua enrolada para trás"),
              listenSelect(
                "xiè ou shì?",
                "谢",
                ["谢", "是", "四", "十"],
                "谢",
                "谢 começa com x (língua alta); 是 começa com sh (língua enrolada)."
              ),
              listenSelect(
                "xiè ou shì?",
                "是",
                ["是", "谢", "十", "四"],
                "是",
                "是 começa com sh — o som de “x” com a língua enrolada."
              ),
              listen("请", "qǐng", "qǐng — q: língua alta e bem à frente, africada com sopro"),
              listen("中", "zhōng", "zhōng — zh é retroflexo, como um “dj/tch” sem sopro"),
              listenSelect(
                "qǐng ou zhōng?",
                "请",
                ["请", "中", "七", "十"],
                "请",
                "请 começa com q (língua alta); 中 começa com zh (língua enrolada)."
              ),
              listenSelect(
                "qǐng ou zhōng?",
                "中",
                ["中", "请", "十", "七"],
                "中",
                "中 começa com zh retroflexo — a língua sobe e se enrola."
              ),
              listen("女", "nǚ", "nǚ — ü: diga “i” e arredonde os lábios (não é o u de lua)"),
              listen("人", "rén", "rén — r retroflexo, entre um r suave e um “j” (não é o rr do português)"),
              // LEX-009 — survival cedo (Atlas repair) enquanto o ouvido treina
              listen("我听不懂", "wǒ tīng bù dǒng", "Não entendi (ouvindo)"),
              listen("请再说一遍", "qǐng zài shuō yí biàn", "Por favor, fale de novo"),
              dialogue(
                "Quando o som falha",
                "Você ouviu, mas não entendeu. Qual frase comunica isso?",
                "我听不懂",
                ["我听不懂", "请再说一遍", "谢谢", "再见"],
                "我听不懂 = não entendi o que ouvi."
              ),
              dialogue(
                "Peça repetição",
                "Agora peça para a pessoa falar de novo.",
                "请再说一遍",
                ["请再说一遍", "我听不懂", "早上好", "不客气"],
                "请再说一遍 pede a repetição — útil quando o tom ou a consoante escapou."
              ),
              conversationScene("pedir-repeticao"),
              match(
                "Famílias de som",
                "Combine cada consoante com a palavra que começa com ela.",
                [
                  { left: "x", right: "谢", leftType: "pinyin", rightType: "hanzi" },
                  { left: "sh", right: "是", leftType: "pinyin", rightType: "hanzi" },
                  { left: "q", right: "请", leftType: "pinyin", rightType: "hanzi" },
                  { left: "zh", right: "中", leftType: "pinyin", rightType: "hanzi" },
                  { left: "r", right: "人", leftType: "pinyin", rightType: "hanzi" },
                ],
                "x e q: língua alta. sh e zh: língua enrolada. r: retroflexo suave. Ouça de novo se precisar."
              ),
            ],
          },
          {
            id: "p2-numeros-1-5",
            title: "Números por som",
            skill: "som",
            libraryItems: ["char:yi", "char:er", "char:san", "char:si", "char:wu"],
            reviewItems: ["char:yi", "char:er", "char:san", "char:si", "char:wu"],
            rewardQi: 2,
            estimatedMinutes: 5,
            steps: [
              intro(
                "Contar com o ouvido",
                "Os números aparecem cedo em preço, telefone e idade. Aqui você aprende o SOM de 1 a 5 — os hànzì e o uso completo vêm nas próximas fases."
              ),
              listen("一", "yī", "um — 1º tom, alto e reto", "pinyin_first"),
              listen("二", "èr", "dois — preste atenção no r retroflexo"),
              listen("三", "sān", "três"),
              listen("四", "sì", "quatro — a queda firme do 4º tom"),
              listen("五", "wǔ", "cinco — o vale do 3º tom"),
              listenSelect(
                "Qual número?",
                "二",
                ["一", "二", "三", "四"],
                "二",
                "二 é o dois: começa com o r retroflexo, diferente do r brasileiro."
              ),
              listenSelect(
                "Qual número?",
                "五",
                ["三", "四", "五", "二"],
                "五",
                "五 é o cinco — o vale do 3º tom, como em 好."
              ),
              tone("一", "yī", 1, "quiz"),
              tone("四", "sì", 4, "quiz"),
              match(
                "Do som ao número",
                "Combine cada som com o número.",
                [
                  { left: "yī", right: "1", leftType: "pinyin", rightType: "pt" },
                  { left: "èr", right: "2", leftType: "pinyin", rightType: "pt" },
                  { left: "sān", right: "3", leftType: "pinyin", rightType: "pt" },
                  { left: "sì", right: "4", leftType: "pinyin", rightType: "pt" },
                  { left: "wǔ", right: "5", leftType: "pinyin", rightType: "pt" },
                ],
                "yī, èr, sān, sì, wǔ — os sons de 1 a 5."
              ),
            ],
          },
          review("l4-rev", "som", [
            tone("妈", "mā", 1, "quiz"),
            tone("麻", "má", 2, "quiz"),
            tone("马", "mǎ", 3, "quiz"),
            tone("骂", "mà", 4, "quiz"),
            tone("摇", "yáo", 2, "quiz"),
            tone("咬", "yǎo", 3, "quiz"),
            tone("是", "shì", 4, "quiz"),
            tone("你", "nǐ", 3, "quiz"),
            tone("好", "hǎo", 3, "quiz"),
            tone("谢", "xiè", 4, "quiz"),
            flash("nihao"),
          ]),
        ],
      },
    ],
  },

  // ─── FASE 3 · Frases Reais ───────────────────────────────────────────────
  {
    id: "p3",
    order: 3,
    title: "Frases Reais",
    why: "Frases prontas valem mais que palavras soltas — é assim que se fala mandarim de verdade.",
    tier: "fundamentos",
    units: [
      {
        id: "u3-1",
        title: "Quem sou eu",
        subtitle: "Apresentação e sobrevivência",
        goal: "Dizer seu nome, origem e pedir ajuda.",
        color: "#B42318",
        focusChunks: ["你叫什么？", "我叫Matheus", "你好吗？", "我很好"],
        focusHanzi: ["我", "你", "叫", "什", "么", "吗"],
        focusGrammar: ["pergunta com 吗", "pergunta com 什么", "resposta com 我叫", "resposta social curta"],
        focusSounds: ["nǐ jiào shénme", "wǒ jiào", "nǐ hǎo ma", "wǒ hěn hǎo"],
        focusSituations: ["perguntar o nome", "responder quem é você", "dizer que está bem", "pedir reparo na conversa"],
        lessons: [
          {
            id: "l9",
            title: "Me apresentar",
            skill: "fala",
            masteryLoop: true,
            libraryItems: [
              "chunk:wojiao",
              "chunk:nijiaoshenme",
              "chunk:wature",
              "chunk:nishinaiguoren",
              "chunk:qingzuo",
            ],
            reviewItems: ["chunk:wojiao", "chunk:nijiaoshenme", "chunk:qingzuo"],
            steps: [
              listen("我叫Matheus", "wǒ jiào Matheus", "Meu nome é Matheus"),
              listenSelect(
                "Toque no que ouviu",
                "我叫Matheus",
                ["我叫Matheus", "我是巴西人", "我很好", "谢谢"],
                "我叫Matheus",
                "我叫 + nome apresenta quem você é."
              ),
              match(
                "Peças da apresentação",
                "Combine cada parte com o sentido.",
                [
                  { left: "我", right: "eu", leftType: "hanzi", rightType: "pt" },
                  { left: "叫", right: "chamar-se", leftType: "hanzi", rightType: "pt" },
                  { left: "我叫Matheus", right: "Meu nome é Matheus", leftType: "hanzi", rightType: "pt" },
                ],
                "我叫 + nome é a forma curta para dizer seu nome."
              ),
              sentenceBuild(
                "Meu nome é...",
                "Monte em mandarim: meu nome é Matheus.",
                ["我", "叫", "Matheus"],
                ["我", "叫", "是", "你好", "Matheus"],
                "我叫 + nome é a forma curta para se apresentar."
              ),
              dialogue(
                "Responda a pergunta",
                "Alguém pergunta: 你叫什么？ Como você responde?",
                "我叫Matheus",
                ["我叫Matheus", "谢谢", "再见", "不客气"],
                "Use 我叫 + seu nome para responder."
              ),
              conversationScene("me-apresentando"),
              // LEX-008 — escada de apresentação (país entra cedo)
              listen("你是哪国人？", "nǐ shì nǎ guó rén?", "De que país você é?"),
              listen("我是巴西人", "wǒ shì Bāxī rén", "Sou brasileiro"),
              dialogue(
                "Origem",
                "Alguém pergunta: 你是哪国人？ Como você responde?",
                "我是巴西人",
                ["我是巴西人", "我叫Matheus", "谢谢", "再见"],
                "我是巴西人 diz de onde você é."
              ),
              dialogue(
                "Receba com cortesia",
                "A pessoa entra na sala. Qual convite combina?",
                "请坐",
                ["请坐", "再见", "不客气", "我很好"],
                "请坐 reforça a cortesia aprendida no módulo 1."
              ),
              translationBuild(
                "Escreva em português",
                "我叫Matheus",
                "wǒ jiào Matheus",
                ["Meu", "nome", "é", "Matheus"],
                ["Matheus", "Meu", "sou", "nome", "é"],
                "我叫Matheus = meu nome é Matheus."
              ),
              fillBlank(
                "Complete a apresentação",
                "Complete: 我 ___ Matheus.",
                "我",
                "叫",
                "Matheus",
                ["叫", "是", "好", "谢"],
                "我叫Matheus = eu me chamo Matheus."
              ),
            ],
          },
          {
            id: "l9-tudo-bem",
            title: "Tudo bem?",
            skill: "fala",
            masteryLoop: true,
            libraryItems: ["chunk:nihaoma", "chunk:wohenhao", "chunk:zenmeyang"],
            reviewItems: ["chunk:nihaoma", "chunk:wohenhao", "chunk:zenmeyang"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              listen("你好吗？", "nǐ hǎo ma?", "Tudo bem?"),
              fillBlank(
                "Complete a pergunta",
                "Complete: 你 ___ 吗？",
                "你",
                "好",
                "吗？",
                ["好", "叫", "谢", "见"],
                "你好吗？ pergunta se a pessoa está bem."
              ),
              sentenceBuild(
                "Monte a pergunta",
                "Monte: Tudo bem?",
                ["你", "好", "吗"],
                ["吗", "你", "好", "我", "很"],
                "你 + 好 + 吗 forma 你好吗？"
              ),
              dialogue(
                "Escolha a resposta",
                "Pessoa pergunta: 你好吗？ O que você responde se está bem?",
                "我很好",
                ["我很好", "再见", "谢谢", "我叫Matheus"],
                "我很好 responde: estou bem."
              ),
              // LEX-010 — escada de perguntas (怎么样)
              listen("怎么样？", "zěnmeyàng?", "Que tal? / Como está?"),
              comp(
                "怎么样？",
                "zěnmeyàng?",
                "Que tal? / Como está?",
                ["Que tal? / Como está?", "Até logo", "Obrigado(a)", "Sou brasileiro."]
              ),
              dialogue(
                "Outra forma de perguntar",
                "Você quer perguntar “que tal?” de forma curta. Qual frase combina?",
                "怎么样？",
                ["怎么样？", "你好吗？", "谢谢", "再见"],
                "怎么样？ é outra pergunta social — mais aberta que 你好吗？"
              ),
              conversationScene("perguntando-se-esta-bem"),
              match(
                "Pergunta e resposta",
                "Combine cada frase com o sentido.",
                [
                  { left: "你好吗？", right: "Tudo bem?", leftType: "hanzi", rightType: "pt" },
                  { left: "我很好", right: "Estou bem", leftType: "hanzi", rightType: "pt" },
                  { left: "怎么样？", right: "Que tal?", leftType: "hanzi", rightType: "pt" },
                ],
                "你好吗？ e 怎么样？ perguntam; 我很好 responde."
              ),
              listenSelect(
                "Ouça a resposta",
                "我很好",
                ["你好吗？", "我很好", "谢谢", "再见"],
                "我很好",
                "Você ouviu 我很好."
              ),
              translationBuild(
                "Revisão rápida",
                "我很好",
                "wǒ hěn hǎo",
                ["Estou", "bem"],
                ["Tudo", "Estou", "bem", "Obrigado"],
                "我很好 = estou bem."
              ),
            ],
          },
          {
            id: "l9-qual-nome",
            title: "Como você se chama?",
            skill: "fala",
            masteryLoop: true,
            libraryItems: ["chunk:nijiaoshenme", "chunk:wojiao", "chunk:nihao"],
            reviewItems: ["chunk:nijiaoshenme", "chunk:wojiao", "chunk:nihao"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              listen("你叫什么？", "nǐ jiào shénme?", "Como você se chama?"),
              flash("nijiaoshenme"),
              comp("你叫什么？", "nǐ jiào shénme?", "Como você se chama?", ["Como você se chama?", "Meu nome é Matheus.", "Tudo bem?", "Sou brasileiro."]),
              conversationScene("como-se-chama"),
              sentenceBuild(
                "Responda com seu nome",
                "Você ouviu 你叫什么？ Monte a resposta.",
                ["我", "叫", "Matheus"],
                ["我", "叫", "什么", "Matheus", "你好"],
                "我叫 + nome responde como você se chama."
              ),
              dialogue(
                "Reutilize 你好",
                "Antes de perguntar o nome, qual cumprimento cabe?",
                "你好",
                ["你好", "再见", "不客气", "我听不懂"],
                "你好 abre a apresentação."
              ),
            ],
          },
          {
            id: "l10",
            title: "De onde sou",
            skill: "fala",
            masteryLoop: true,
            libraryItems: [
              "chunk:wature",
              "chunk:nishinaiguoren",
              "chunk:woshixuesheng",
              "chunk:renshinihengaoxing",
              "chunk:nihao",
              "chunk:wojiao",
              "char:ni",
              "char:ren",
            ],
            reviewItems: ["chunk:nihao", "chunk:wojiao", "chunk:wature", "char:ni", "char:ren"],
            newHanzi: ["哪"],
            steps: [
              listen("你是哪国人？", "nǐ shì nǎ guó rén?", "De que país você é?"),
              listen("我是巴西人", "wǒ shì Bāxī rén", "Sou brasileiro"),
              match(
                "Mapa da resposta",
                "Combine cada peça com o sentido.",
                [
                  { left: "我", right: "eu", leftType: "hanzi", rightType: "pt" },
                  { left: "是", right: "sou / ser", leftType: "hanzi", rightType: "pt" },
                  { left: "巴西人", right: "brasileiro", leftType: "hanzi", rightType: "pt" },
                ],
                "我 + 是 + 巴西人 monta sua origem. 人 já apareceu antes."
              ),
              conversationScene("de-onde-sou"),
              sentenceBuild(
                "Sou brasileiro",
                "Como você diria: “Eu sou brasileiro”?",
                ["我", "是", "巴西人"],
                ["是", "我", "你好", "巴西人", "叫"],
                "我 = eu, 是 = ser/sou, 巴西人 = brasileiro."
              ),
              // LEX-008 — estudante + prazer em conhecer
              listen("我是学生", "wǒ shì xuésheng", "Sou estudante"),
              comp(
                "我是学生",
                "wǒ shì xuésheng",
                "Sou estudante",
                ["Sou estudante", "Sou brasileiro", "Estou bem", "Até amanhã"]
              ),
              listen("认识你很高兴", "rènshi nǐ hěn gāoxìng", "Prazer em conhecer você"),
              dialogue(
                "Feche a apresentação",
                "Depois de dizer o nome e o país, qual frase de cortesia combina?",
                "认识你很高兴",
                ["认识你很高兴", "再见", "不客气", "我很好"],
                "认识你很高兴 = prazer em conhecer você."
              ),
              dialogue(
                "Reutilize 我叫",
                "Alguém pergunta seu nome. Qual frase responde?",
                "我叫Matheus",
                ["我叫Matheus", "我是巴西人", "谢谢", "再见"],
                "我叫 volta em contexto de apresentação completa."
              ),
            ],
          },
          ...PHASE3_SURVIVAL_MICROTASKS,
          {
            id: "l11",
            title: "Não entendi",
            skill: "fala",
            masteryLoop: true,
            libraryItems: ["chunk:tingbudong", "chunk:qingzaishuoyibian", "chunk:wobuhui", "chunk:dengyixia"],
            reviewItems: ["chunk:tingbudong", "chunk:qingzaishuoyibian", "chunk:wobuhui", "chunk:dengyixia"],
            steps: [
              listen("我听不懂", "wǒ tīng bù dǒng", "Não entendi (ouvindo)"),
              match(
                "Três intenções",
                "Combine cada frase com a situação.",
                [
                  { left: "我听不懂", right: "não entendi o que ouvi", leftType: "hanzi", rightType: "pt" },
                  { left: "请再说一遍", right: "peça para repetir", leftType: "hanzi", rightType: "pt" },
                  { left: "我不会说中文", right: "não sei falar chinês", leftType: "hanzi", rightType: "pt" },
                ],
                "听不懂 = ouvir sem entender; 再说一遍 = repita; 不会说 = não sei falar."
              ),
              conversationScene("nao-entendi-reparo"),
              dialogue(
                "Primeiro reparo",
                "Você não entendeu o que ouviu. Qual frase comunica isso?",
                "我听不懂",
                ["我听不懂", "请再说一遍", "我不会说中文", "我很好"],
                "我听不懂 comunica: não entendi."
              ),
              dialogue(
                "Segundo reparo",
                "Agora peça para a pessoa falar de novo.",
                "请再说一遍",
                ["请再说一遍", "我听不懂", "谢谢", "再见"],
                "请再说一遍 pede a repetição depois de 我听不懂."
              ),
              // LEX-009 — 等一下
              listen("等一下", "děng yíxià", "Espere um pouco"),
              dialogue(
                "Peça tempo",
                "Você precisa de um segundo para pensar. O que diz?",
                "等一下",
                ["等一下", "再见", "不客气", "我很好"],
                "等一下 = espere um pouco — ganha tempo na conversa."
              ),
              sentenceBuild(
                "Diga que não fala",
                "Monte a terceira intenção: não sei falar chinês.",
                ["我", "不会", "说", "中文"],
                ["我", "不会", "说", "中文", "听不懂", "很好"],
                "我不会说中文 é outra intenção: não sei falar. Repare no som: 不 antes de 会 (4º tom) sobe — “wǒ bú huì”."
              ),
            ],
          },
          {
            id: "l11-falo-pouco",
            title: "Falo um pouco",
            skill: "fala",
            masteryLoop: true,
            libraryItems: ["chunk:wobuhui", "chunk:wohuishuoyidian", "chunk:qingzaishuoyibian", "chunk:wozaixuezhongwen"],
            reviewItems: ["chunk:wobuhui", "chunk:wohuishuoyidian", "chunk:qingzaishuoyibian", "chunk:wozaixuezhongwen"],
            rewardQi: 2,
            estimatedMinutes: 5,
            steps: [
              listen("我会说一点中文", "wǒ huì shuō yìdiǎn Zhōngwén", "Sei falar um pouco de chinês"),
              listenSelect(
                "Toque no que ouviu",
                "我会说一点中文",
                ["我会说一点中文", "我不会说中文", "我听不懂", "谢谢"],
                "我会说一点中文",
                "会 fala de habilidade; 一点 suaviza para um pouco."
              ),
              match(
                "Blocos da frase",
                "Combine cada bloco com o sentido.",
                [
                  { left: "我", right: "eu", leftType: "hanzi", rightType: "pt" },
                  { left: "会说", right: "sei falar", leftType: "hanzi", rightType: "pt" },
                  { left: "一点", right: "um pouco", leftType: "hanzi", rightType: "pt" },
                  { left: "中文", right: "chinês", leftType: "hanzi", rightType: "pt" },
                ],
                "我会说一点中文 = sei falar um pouco de chinês."
              ),
              sentenceBuild(
                "Falo um pouco de chinês",
                "Como você diria “sei falar um pouco de chinês”?",
                ["我", "会", "说", "一点", "中文"],
                ["我", "会", "说", "一点", "中文", "不会", "听不懂"],
                "我会说一点中文 = sei falar um pouco de chinês."
              ),
              listen("我在学中文", "wǒ zài xué Zhōngwén", "Estou estudando chinês"),
              listenSelect(
                "O que você ouviu?",
                "我在学中文",
                ["我在学中文", "我会说一点中文", "我不会说中文", "谢谢"],
                "我在学中文",
                "在 antes da ação marca o que está acontecendo agora."
              ),
              sentenceBuild(
                "Estou estudando chinês",
                "Monte: estou estudando chinês agora.",
                ["我", "在", "学", "中文"],
                ["我", "在", "学", "中文", "会", "一点"],
                "我在学中文: 在 + ação = acontecendo agora. A ação não muda de forma."
              ),
              fillBlank(
                "Complete o meio",
                "Complete: 我会说 ___ 中文.",
                "我会说",
                "一点",
                "中文",
                ["一点", "不懂", "很好", "再见"],
                "一点 deixa a frase mais modesta: um pouco."
              ),
              dialogue(
                "Seja honesto no nível",
                "Você sabe só um pouco. Qual frase combina?",
                "我会说一点中文",
                ["我会说一点中文", "我不会说中文", "再见", "不客气"],
                "Essa frase ajuda a ajustar a expectativa da conversa."
              ),
              dialogue(
                "O que você está fazendo?",
                "Alguém pergunta o que você faz neste momento. O que você diz?",
                "我在学中文",
                ["我在学中文", "我会说一点中文", "再见", "谢谢"],
                "我在学中文 responde com o que está acontecendo agora."
              ),
              translationBuild(
                "Escreva em português",
                "我会说一点中文",
                "wǒ huì shuō yìdiǎn Zhōngwén",
                ["Sei", "falar", "um", "pouco", "de", "chinês"],
                ["falar", "Sei", "de", "chinês", "um", "pouco", "Obrigado"],
                "我会说一点中文 = sei falar um pouco de chinês."
              ),
            ],
          },
        ],
      },
      {
        id: "u3-2",
        title: "Primeira leitura",
        subtitle: "Só o que você já ouviu e falou",
        goal: "Reconhecer 我/是/人 e ler um microtexto fechado.",
        color: "#2F6FB0",
        focusChunks: ["你好", "谢谢", "再见", "我是巴西人"],
        focusHanzi: ["我", "是", "人", "你", "谢"],
        focusGrammar: ["texto fechado com repertório aprendido", "frase de identidade com 是"],
        focusSounds: ["wǒ", "shì", "rén", "leitura em voz alta de microdiálogo"],
        focusSituations: ["ler saudação e apresentação", "reconhecer frases aprendidas em texto"],
        lessons: [
          {
            id: "l12",
            title: "Peças da frase",
            skill: "hanzi",
            libraryItems: [
              "chunk:wature",
              "chunk:woshixuesheng",
              "chunk:renshinihengaoxing",
              "char:wo",
              "char:shi",
              "char:ren",
            ],
            reviewItems: ["chunk:wature", "chunk:woshixuesheng", "char:wo", "char:shi", "char:ren"],
            steps: [
              intro("Três peças-chave", "我 (eu), 是 (ser) e 人 (pessoa) aparecem em quase toda frase de apresentação."),
              listen("我", "wǒ", "eu, me"),
              listen("是", "shì", "ser; sim"),
              listen("人", "rén", "pessoa"),
              recognize("wo"),
              recognize("shi"),
              recognize("ren"),
              comp("我是巴西人", "wǒ shì Bāxī rén", "Sou brasileiro", ["Sou brasileiro", "Meu nome é Matheus", "Obrigado", "Até logo"]),
              dialogue(
                "Outro papel",
                "Além de brasileiro, você também é estudante. Qual frase combina?",
                "我是学生",
                ["我是学生", "我是巴西人", "谢谢", "再见"],
                "我是学生 reutiliza 我是… com um papel novo."
              ),
              listenSelect(
                "Prazer em conhecer",
                "认识你很高兴",
                ["认识你很高兴", "我是学生", "早上好", "没关系"],
                "认识你很高兴",
                "认识你很高兴 fecha a apresentação com cortesia."
              ),
              match(
                "Mapa da frase",
                "Combine cada peça com o papel na frase.",
                [
                  { left: "我", right: "eu", leftType: "hanzi", rightType: "pt" },
                  { left: "是", right: "sou / ser", leftType: "hanzi", rightType: "pt" },
                  { left: "人", right: "pessoa", leftType: "hanzi", rightType: "pt" },
                ],
                "我 = eu; 是 = sou/ser; 人 = pessoa."
              ),
            ],
          },
          {
            id: "l13",
            title: "Microtexto 1",
            skill: "leitura",
            masteryLoop: true,
            libraryItems: [
              "chunk:nihao",
              "chunk:xiexie",
              "chunk:wature",
              "chunk:zaijian",
              "chunk:mingtianjian",
              "chunk:renshinihengaoxing",
              "chunk:duibuqi",
            ],
            reviewItems: ["chunk:nihao", "chunk:xiexie", "chunk:wature", "chunk:zaijian", "chunk:mingtianjian"],
            steps: [
              intro("Leitura fechada", "Este texto usa cumprimentos, apresentação e despedida que você já praticou — inclusive 明天见."),
              read([
                { hanzi: "你好！", pinyin: "Nǐ hǎo!", pt: "Olá!" },
                { hanzi: "谢谢。", pinyin: "Xièxie.", pt: "Obrigado(a)." },
                { hanzi: "我是巴西人。", pinyin: "Wǒ shì Bāxī rén.", pt: "Sou brasileiro." },
                { hanzi: "认识你很高兴。", pinyin: "Rènshi nǐ hěn gāoxìng.", pt: "Prazer em conhecer você." },
                { hanzi: "明天见！", pinyin: "Míngtiān jiàn!", pt: "Até amanhã!" },
              ]),
              flash("zaijian"),
              // LEX-007 — 对不起 fecha o par com 没关系 (já em l4)
              listen("对不起", "duìbuqǐ", "Desculpa"),
              dialogue(
                "Peça desculpas",
                "Você esbarra em alguém. Qual frase combina?",
                "对不起",
                ["对不起", "没关系", "再见", "我很好"],
                "对不起 = desculpa; 没关系 (já visto) responde."
              ),
              dialogue(
                "Despedida no texto",
                "No microtexto, a despedida marca o próximo encontro. Qual frase é essa?",
                "明天见",
                ["明天见", "再见", "谢谢", "我很好"],
                "明天见 no texto reforça a despedida com plano."
              ),
              conversationScene("encontro-amanha"),
              match(
                "Reconheça no texto",
                "Combine as frases do microtexto.",
                [
                  { left: "你好！", right: "Olá!", leftType: "hanzi", rightType: "pt" },
                  { left: "我是巴西人。", right: "Sou brasileiro.", leftType: "hanzi", rightType: "pt" },
                  { left: "明天见！", right: "Até amanhã!", leftType: "hanzi", rightType: "pt" },
                ],
                "O texto reúne cumprimento, identidade e despedida nova."
              ),
              translationBuild(
                "Despedida do texto",
                "明天见！",
                "Míngtiān jiàn!",
                ["Até", "amanhã!"],
                ["Até", "Obrigado(a).", "amanhã!", "Olá!"],
                "明天见 fecha o microtexto com plano."
              ),
              comp("我是巴西人。", "Wǒ shì Bāxī rén.", "Sou brasileiro.", ["Sou brasileiro.", "Meu nome é Matheus.", "Obrigado(a).", "Até logo."]),
              translationBuild(
                "Entendeu o texto?",
                "我是巴西人。",
                "Wǒ shì Bāxī rén.",
                ["Eu", "sou", "brasileiro."],
                ["brasileiro.", "Eu", "Obrigado.", "sou"],
                "我是巴西人 comunica: eu sou brasileiro."
              ),
              listenSelect(
                "Revisão de leitura",
                "认识你很高兴",
                ["认识你很高兴", "谢谢", "再见", "我是巴西人"],
                "认识你很高兴",
                "认识你很高兴 fecha a apresentação no texto."
              ),
            ],
          },
          {
            id: "l13-dialogo-ola",
            title: "Microdiálogo: cumprimentar",
            skill: "fala",
            masteryLoop: true,
            libraryItems: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:xiexie", "chunk:zaoshanghao", "chunk:jintianhenhao"],
            reviewItems: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:xiexie", "chunk:zaoshanghao"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              read([
                { hanzi: "早上好！", pinyin: "Zǎoshang hǎo!", pt: "Bom dia!" },
                { hanzi: "你好吗？", pinyin: "Nǐ hǎo ma?", pt: "Tudo bem?" },
                { hanzi: "我很好。", pinyin: "Wǒ hěn hǎo.", pt: "Estou bem." },
                { hanzi: "今天很好。", pinyin: "Jīntiān hěn hǎo.", pt: "Hoje está ótimo." },
                { hanzi: "谢谢。", pinyin: "Xièxie.", pt: "Obrigado(a)." },
              ]),
              flash("nihaoma"),
              flash("wohenhao"),
              listen("今天很好", "jīntiān hěn hǎo", "Hoje está ótimo"),
              dialogue(
                "Comente o dia",
                "Além de 我很好, qual frase comenta que o dia está bom?",
                "今天很好",
                ["今天很好", "再见", "不客气", "请坐"],
                "今天很好 = hoje está ótimo — nova combinação com 好."
              ),
              comp("我很好。", "Wǒ hěn hǎo.", "Estou bem.", ["Estou bem.", "Tudo bem?", "Meu nome é Matheus.", "Não falo chinês."]),
              translationBuild(
                "Seu primeiro diálogo",
                "早上好！ 你好吗？ 我很好。 谢谢。",
                "Zǎoshang hǎo! Nǐ hǎo ma? Wǒ hěn hǎo. Xièxie.",
                ["Bom dia.", "Tudo bem?", "Estou bem.", "Obrigado(a)."],
                ["Estou bem.", "Bom dia.", "Até logo.", "Tudo bem?", "Obrigado(a)."],
                "A ordem é saudação, pergunta, resposta e agradecimento — agora com 早上好."
              ),
            ],
          },
          {
            id: "l13-dialogo-nome",
            title: "Microdiálogo: se apresentar",
            skill: "fala",
            masteryLoop: true,
            libraryItems: [
              "chunk:nijiaoshenme",
              "chunk:wojiao",
              "chunk:wature",
              "chunk:qingzaishuoyibian",
              "chunk:woyousangepengyou",
              "chunk:nihuishuoyingyuma",
            ],
            reviewItems: ["chunk:nijiaoshenme", "chunk:wojiao", "chunk:wature", "chunk:qingzaishuoyibian"],
            rewardQi: 2,
            estimatedMinutes: 5,
            steps: [
              read([
                { hanzi: "你好！", pinyin: "Nǐ hǎo!", pt: "Olá!" },
                { hanzi: "你叫什么？", pinyin: "Nǐ jiào shénme?", pt: "Como você se chama?" },
                { hanzi: "我叫Matheus。", pinyin: "Wǒ jiào Matheus.", pt: "Meu nome é Matheus." },
                { hanzi: "我是巴西人。", pinyin: "Wǒ shì Bāxī rén.", pt: "Sou brasileiro." },
                { hanzi: "我有三个朋友。", pinyin: "Wǒ yǒu sān ge péngyou.", pt: "Tenho três amigos." },
                { hanzi: "请再说一遍。", pinyin: "Qǐng zài shuō yí biàn.", pt: "Por favor, fale de novo." },
              ]),
              flash("nijiaoshenme"),
              flash("wojiao"),
              flash("qingzaishuoyibian"),
              listen("我有三个朋友", "wǒ yǒu sān ge péngyou", "Tenho três amigos"),
              dialogue(
                "Fale de amigos",
                "Depois de dizer quem você é, qual frase fala de amigos?",
                "我有三个朋友",
                ["我有三个朋友", "再见", "不客气", "我很好"],
                "我有三个朋友 continua a apresentação."
              ),
              listen("你会说英语吗？", "nǐ huì shuō Yīngyǔ ma?", "Você fala inglês?"),
              dialogue(
                "Pergunte o idioma",
                "Você quer saber se a pessoa fala inglês. O que pergunta?",
                "你会说英语吗？",
                ["你会说英语吗？", "你好吗？", "谢谢", "再见"],
                "你会说英语吗？ é sobrevivência útil depois de 我会说一点中文."
              ),
              comp("你叫什么？", "Nǐ jiào shénme?", "Como você se chama?", ["Como você se chama?", "Sou brasileiro.", "Estou bem.", "Obrigado."]),
              sentenceBuild(
                "Resposta natural",
                "Como você responderia 你叫什么？",
                ["我", "叫", "Matheus"],
                ["我", "叫", "Matheus", "你", "什么"],
                "我叫 + nome responde “eu me chamo...”."
              ),
            ],
          },
          {
            id: "p3-ordem-das-palavras",
            title: "A ordem importa",
            skill: "sistema",
            libraryItems: ["chunk:wature", "chunk:wojiao", "chunk:nihaoma"],
            reviewItems: ["chunk:wature", "chunk:wojiao", "chunk:nihaoma"],
            rewardQi: 2,
            estimatedMinutes: 6,
            steps: [
              // ——— ETAPA 1: ver a frase + perguntas (sem nomes técnicos) ———
              intro(
                "Olhe a frase",
                "我 是 巴西人\n\nQuem? · O que faz? · O quê?\n\nNão traduza palavra por palavra — veja as peças e a ordem."
              ),
              match(
                "Quem? O que faz? O quê?",
                "Na frase 我是巴西人, combine cada peça com a pergunta.",
                [
                  { left: "我", right: "Quem?", leftType: "hanzi", rightType: "pt" },
                  { left: "是", right: "O que faz?", leftType: "hanzi", rightType: "pt" },
                  { left: "巴西人", right: "O quê?", leftType: "hanzi", rightType: "pt" },
                ],
                "我 = Quem? · 是 = O que faz? · 巴西人 = O quê?"
              ),
              match(
                "Outra frase, mesmas perguntas",
                "Agora em 我叫Matheus — mesmas perguntas.",
                [
                  { left: "我", right: "Quem?", leftType: "hanzi", rightType: "pt" },
                  { left: "叫", right: "O que faz?", leftType: "hanzi", rightType: "pt" },
                  { left: "Matheus", right: "O quê?", leftType: "hanzi", rightType: "pt" },
                ],
                "De novo: Quem? · O que faz? · O quê?"
              ),
              // ——— ETAPA 2: a lógica do padrão ———
              intro(
                "A lógica",
                "quem + ação + coisa\n\n我 + 是 + 巴西人\n我 + 叫 + Matheus\n\nMesma ordem. Trocar as peças muda o sentido."
              ),
              sentenceBuild(
                "Monte na ordem",
                "Monte: 我是巴西人 (quem + ação + coisa).",
                ["我", "是", "巴西人"],
                ["巴西人", "是", "我", "你", "好"],
                "Ordem: quem → ação → coisa."
              ),
              dialogue(
                "Qual segue o padrão?",
                "Qual frase segue quem + ação + coisa?",
                "我是巴西人",
                ["我是巴西人", "巴西人是我", "是巴西人我", "我巴西人是"],
                "Só 我是巴西人 mantém quem + ação + coisa."
              ),
              sentenceBuild(
                "Mesma lógica",
                "Monte: 我叫Matheus (quem + ação + coisa).",
                ["我", "叫", "Matheus"],
                ["我", "叫", "Matheus", "你", "什么"],
                "Mesmo padrão: quem → ação → coisa."
              ),
              // ——— ETAPA 3: + pergunta ———
              intro(
                "E a pergunta?",
                "你 好 吗？\n\nquem + ação + pergunta\n\n吗 no fim transforma em pergunta — a ordem das outras peças não muda."
              ),
              sentenceBuild(
                "Feche com pergunta",
                "Monte: 你好吗？ (quem + ação + pergunta).",
                ["你", "好", "吗"],
                ["吗", "你", "好", "我"],
                "吗 fica no fim: quem + ação + pergunta."
              ),
              dialogue(
                "Onde entra a pergunta?",
                "Em 你好吗？, onde fica 吗?",
                "no fim",
                ["no fim", "no começo", "no meio", "antes de 你"],
                "A marca de pergunta fecha a frase."
              ),
            ],
          },
          {
            id: "p3-nomes-da-frase",
            title: "Nomes das peças",
            skill: "sistema",
            libraryItems: ["chunk:wature", "chunk:wojiao", "chunk:nihaoma"],
            reviewItems: ["chunk:wature", "chunk:wojiao", "chunk:nihaoma"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              // ——— ETAPA 4: dar os nomes (só depois da lógica) ———
              intro(
                "Agora os nomes",
                "Você já viu o padrão. Os nomes só ajudam a falar sobre ele:\n\nquem = sujeito\nação = verbo\ncoisa = objeto\n吗 = partícula de pergunta"
              ),
              match(
                "Ligue pergunta → nome",
                "Combine a pergunta que você já usa com o nome da peça.",
                [
                  { left: "Quem?", right: "sujeito", leftType: "pt", rightType: "pt" },
                  { left: "O que faz?", right: "verbo", leftType: "pt", rightType: "pt" },
                  { left: "O quê?", right: "objeto", leftType: "pt", rightType: "pt" },
                  { left: "吗 no fim", right: "partícula de pergunta", leftType: "pt", rightType: "pt" },
                ],
                "quem→sujeito · ação→verbo · coisa→objeto · 吗→partícula."
              ),
              match(
                "Peças de 我是巴西人",
                "Combine o hànzì com o nome (você já sabe o papel).",
                [
                  { left: "我", right: "sujeito", leftType: "hanzi", rightType: "pt" },
                  { left: "是", right: "verbo", leftType: "hanzi", rightType: "pt" },
                  { left: "巴西人", right: "objeto", leftType: "hanzi", rightType: "pt" },
                ],
                "我 sujeito · 是 verbo · 巴西人 objeto — mesma ordem de sempre."
              ),
              dialogue(
                "吗 na pergunta",
                "Em 你好吗？, 吗 é…",
                "partícula de pergunta",
                ["partícula de pergunta", "sujeito", "verbo", "objeto"],
                "吗 é a partícula que marca a pergunta no fim."
              ),
              sentenceBuild(
                "Use o padrão com nome",
                "Monte de novo: 我是巴西人 (sujeito + verbo + objeto).",
                ["我", "是", "巴西人"],
                ["巴西人", "是", "我", "吗", "好"],
                "Os nomes descrevem o padrão que você já montava."
              ),
            ],
          },
          review("l5-rev", "fala", [
            flash("nihaoma"),
            flash("wohenhao"),
            flash("wojiao"),
            flash("nijiaoshenme"),
            flash("wature"),
            flash("wohuishuoyidian"),
            flash("qingzaishuoyibian"),
            recognize("wo"),
            recognize("shi"),
            // ——— ETAPA 5: termos técnicos nas atividades ———
            match(
              "Sujeito · verbo · objeto",
              "Em 我是巴西人, combine cada peça com o termo.",
              [
                { left: "我", right: "sujeito", leftType: "hanzi", rightType: "pt" },
                { left: "是", right: "verbo", leftType: "hanzi", rightType: "pt" },
                { left: "巴西人", right: "objeto", leftType: "hanzi", rightType: "pt" },
              ],
              "Daqui em diante as atividades usam esses nomes com naturalidade."
            ),
            comp("我是巴西人", "wǒ shì Bāxī rén", "Sou brasileiro", ["Sou brasileiro", "Meu nome é Matheus", "Não entendi", "Olá"]),
            sentenceBuild(
              "Produção guiada",
              "Monte uma apresentação curta com saudação e nome.",
              ["你好", "我", "叫", "Matheus"],
              ["你好", "我", "叫", "Matheus", "是", "巴西人"],
              "你好 abre a conversa; 我叫 + nome apresenta você."
            ),
          ]),
        ],
      },
    ],
  },

  // ─── FASE 4 · Hànzì Lógico ───────────────────────────────────────────────
  {
    id: "p4",
    order: 4,
    title: "Hànzì Lógico",
    why: "Caracteres têm peças de sentido e peças de som — pare de ver desenhos aleatórios.",
    tier: "fundamentos",
    units: [
      {
        id: "u4-1",
        title: "Peças que dão sentido",
        subtitle: "Radicais que voltam sempre",
        goal: "Reconhecer peças básicas de sentido.",
        color: "#B42318",
        focusChunks: [],
        focusHanzi: ["人", "女", "口", "木", "一", "二", "三", "四", "五", "我", "你", "不", "是"],
        focusGrammar: ["radical como pista de sentido", "hànzì como forma visual reutilizável"],
        focusSounds: ["rén", "kǒu", "mù", "wǒ", "nǐ", "shì"],
        focusSituations: ["reconhecer peças dentro de frases", "ler números visuais", "tocar para ver pinyin e significado"],
        lessons: [
          {
            id: "l14",
            title: "Radicais básicos",
            skill: "hanzi",
            steps: [
              intro("Peças com papel", "Algumas peças dão pista de SENTIDO: 人 pessoa, 女 mulher, 口 boca, 木 árvore. Outras podem dar pista de som."),
              listen("女", "nǚ", "mulher; feminino"),
              recognize("ren"),
              recognize("nv"),
              recognize("kou"),
              recognize("mu"),
              produce(["女"], ["人", "女", "口", "木"], "mulher / feminino"),
              imageChoice(
                "choose_hanzi",
                "person",
                "Qual hànzì combina com a imagem de pessoa?",
                "人",
                visualHanziOptions("person"),
                { targetMeaningPt: "pessoa", explanation: "人 (rén) significa pessoa." }
              ),
              imageChoice(
                "choose_hanzi",
                "tree",
                "Qual hànzì combina com a imagem de árvore?",
                "木",
                visualHanziOptions("tree"),
                { targetMeaningPt: "árvore", explanation: "木 (mù) significa árvore." }
              ),
              match(
                "Peça, não desenho",
                "Combine cada radical com a ideia que ele costuma sugerir.",
                [
                  { left: "人", right: "pessoa", leftType: "hanzi", rightType: "pt" },
                  { left: "女", right: "mulher / feminino", leftType: "hanzi", rightType: "pt" },
                  { left: "口", right: "boca / fala", leftType: "hanzi", rightType: "pt" },
                  { left: "木", right: "árvore / madeira", leftType: "hanzi", rightType: "pt" },
                ],
                "Radicais dão pistas de sentido."
              ),
            ],
          },
          ...PHASE4_CHARACTER_MICROTASKS,
          {
            id: "l14-numeros-visuais",
            title: "Números visuais",
            skill: "hanzi",
            libraryItems: ["char:yi", "char:er", "char:san", "char:si", "char:wu"],
            reviewItems: ["char:yi", "char:er", "char:san", "char:si", "char:wu"],
            rewardQi: 2,
            estimatedMinutes: 5,
            steps: [
              intro("Números sem susto", "一, 二 e 三 mostram a quantidade nos traços. 四 e 五 já parecem menos óbvios, mas aparecem cedo em preços, telefone e datas."),
              recognize("yi"),
              recognize("er"),
              recognize("san"),
              imageChoice(
                "choose_hanzi",
                "big",
                "Qual hànzì combina com grande? (revisão visual)",
                "大",
                visualHanziOptions("big"),
                { explanation: "大 volta como revisão visual; números também têm forma." }
              ),
              produce(["一", "二", "三"], ["三", "一", "五", "二"], "um, dois, três"),
              match(
                "Primeira lógica visual",
                "Combine o caractere com a quantidade de traços.",
                [
                  { left: "一", right: "um traço", leftType: "hanzi", rightType: "pt" },
                  { left: "二", right: "dois traços", leftType: "hanzi", rightType: "pt" },
                  { left: "三", right: "três traços", leftType: "hanzi", rightType: "pt" },
                ],
                "A forma visual acompanha a quantidade."
              ),
              dialogue(
                "Quantos são?",
                "Quantos traços tem 三?",
                "três",
                ["três", "um", "dois", "cinco"],
                "三 mostra três traços — a quantidade na forma."
              ),
              sentenceBuild(
                "Conte em sequência",
                "Monte a sequência: um, dois, três.",
                ["一", "二", "三"],
                ["一", "二", "三", "四", "五"],
                "一 二 三 mostra a quantidade nos traços."
              ),
            ],
          },
          {
            id: "l14-pecas-natureza",
            title: "Peças da natureza",
            skill: "hanzi",
            libraryItems: ["char:kou", "char:ri", "char:yue", "char:mu", "char:huo", "char:shui"],
            reviewItems: ["char:kou", "char:ri", "char:yue", "char:mu", "char:huo", "char:shui"],
            rewardQi: 2,
            estimatedMinutes: 5,
            steps: [
              intro("Peças que voltam", "口, 日, 月, 木, 火 e 水 aparecem dentro de muitos caracteres. Hoje você só reconhece a ideia geral."),
              recognize("kou"),
              recognize("ri"),
              recognize("yue"),
              recognize("mu"),
              recognize("huo"),
              recognize("shui"),
              imageChoice(
                "choose_hanzi",
                "sun",
                "Qual hànzì combina com o sol?",
                "日",
                visualHanziOptions("sun"),
                { explanation: "日 (rì) = sol / dia." }
              ),
              imageChoice(
                "choose_pinyin",
                "tree",
                "Qual é o pinyin de árvore?",
                "mù",
                visualPinyinOptions("tree"),
                { explanation: "木 se lê mù." }
              ),
              match(
                "Agrupe por imagem",
                "Combine cada peça com a imagem principal.",
                [
                  { left: "日", right: "sol / dia", leftType: "hanzi", rightType: "pt" },
                  { left: "月", right: "lua / mês", leftType: "hanzi", rightType: "pt" },
                  { left: "木", right: "árvore", leftType: "hanzi", rightType: "pt" },
                  { left: "水", right: "água", leftType: "hanzi", rightType: "pt" },
                  { left: "口", right: "boca", leftType: "hanzi", rightType: "pt" },
                ],
                "Essas peças voltam dentro de muitos caracteres."
              ),
            ],
          },
          {
            id: "l14-frase-minima",
            title: "Caracteres de frase",
            skill: "hanzi",
            libraryItems: [
              "char:wo",
              "char:ni",
              "char:bu",
              "char:shi",
              "char:zhong",
              "char:ren",
              "chunk:zheshishenme",
            ],
            reviewItems: ["char:wo", "char:ni", "char:bu", "char:shi", "char:zhong", "char:ren", "chunk:zheshishenme"],
            rewardQi: 2,
            estimatedMinutes: 5,
            steps: [
              intro("Ler só o necessário", "Você não precisa ler tudo ainda. Comece por peças que aparecem em frases úteis: 我, 你, 不, 是, 中 e 人."),
              recognize("wo"),
              recognize("ni"),
              recognize("bu"),
              recognize("shi"),
              recognize("zhong"),
              recognize("ren"),
              imageChoice(
                "listen_and_choose_image",
                "water",
                "Ouça e escolha a imagem certa.",
                "water",
                visualImageOptions("water"),
                { explanation: "水 (shuǐ) = água." }
              ),
              // LEX-010 — pergunta “o que é isto?” entra cedo com peças 是
              listen("这是什么？", "zhè shì shénme?", "O que é isto?"),
              dialogue(
                "Pergunte o objeto",
                "Você aponta para algo e quer saber o que é. Qual frase combina?",
                "这是什么？",
                ["这是什么？", "你好吗？", "谢谢", "再见"],
                "这是什么？ reutiliza 是 numa pergunta nova."
              ),
              comp("我不会说中文", "wǒ bú huì shuō Zhōngwén", "Não falo chinês", ["Não falo chinês", "Sou brasileiro", "Tudo bem?", "Estou bem"]),
              match(
                "Reconheça sem traduzir tudo",
                "Combine as peças mais úteis da frase.",
                [
                  { left: "我", right: "eu", leftType: "hanzi", rightType: "pt" },
                  { left: "不", right: "não", leftType: "hanzi", rightType: "pt" },
                  { left: "中", right: "China / meio", leftType: "hanzi", rightType: "pt" },
                ],
                "Você não precisa traduzir tudo: comece por peças recorrentes."
              ),
            ],
          },
          {
            id: "l14-char-rev",
            title: "Revisão de reconhecimento",
            skill: "hanzi",
            reviewMasteryMode: true,
            libraryItems: ["char:yi", "char:san", "char:kou", "char:ri", "char:mu", "char:wo", "char:ni", "char:bu", "char:shi"],
            reviewItems: ["char:yi", "char:san", "char:kou", "char:ri", "char:mu", "char:wo", "char:ni", "char:bu", "char:shi"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              recognize("yi"),
              recognize("san"),
              recognize("kou"),
              recognize("ri"),
              recognize("mu"),
              recognize("wo"),
              recognize("ni"),
              recognize("bu"),
              recognize("shi"),
            ],
          },
          {
            id: "l15",
            title: "Repetir intensifica",
            skill: "hanzi",
            steps: [
              intro("Somar peças iguais", "Uma árvore 木, duas 林 (bosque), três 森 (mata). Repetir aumenta a ideia."),
              decompose("lin"),
              decompose("sen"),
              recognize("lin"),
              recognize("sen"),
              match(
                "Repetição visual",
                "Combine cada forma com a ideia.",
                [
                  { left: "木", right: "árvore", leftType: "hanzi", rightType: "pt" },
                  { left: "林", right: "bosque", leftType: "hanzi", rightType: "pt" },
                  { left: "森", right: "floresta", leftType: "hanzi", rightType: "pt" },
                ],
                "Repetir 木 intensifica a ideia de árvores."
              ),
            ],
          },
          review("l6-rev", "hanzi", [
            recognize("mu"),
            recognize("lin"),
            recognize("sen"),
            decompose("sen"),
            imageChoice(
              "choose_image",
              "tree",
              "Qual imagem combina com 木?",
              "tree",
              visualImageOptions("tree"),
              { explanation: "木 = árvore." }
            ),
            imageChoice(
              "choose_meaning",
              "person",
              "Isto é uma pessoa.",
              "pessoa",
              visualMeaningOptions("person"),
              { helpMode: "disabled", isNoHint: true, explanation: "人 = pessoa." }
            ),
            match(
              "Desmonte mentalmente",
              "Combine cada caractere com o sentido.",
              [
                { left: "木", right: "árvore", leftType: "hanzi", rightType: "pt" },
                { left: "林", right: "bosque", leftType: "hanzi", rightType: "pt" },
                { left: "森", right: "floresta", leftType: "hanzi", rightType: "pt" },
              ],
              "木 cresce para 林 e 森 pela repetição visual."
            ),
          ]),
        ],
      },
      {
        id: "u4-2",
        title: "Quando uma peça dá som",
        subtitle: "Fono-semântica sem mistério",
        goal: "Separar pista de sentido, pista de som e forma visual.",
        color: "#2F855A",
        focusChunks: ["朋友"],
        focusHanzi: ["妈", "明", "朋"],
        focusGrammar: ["pista de som versus pista de sentido", "palavra composta de dois hànzì"],
        focusSounds: ["mā", "míng", "péngyou"],
        focusSituations: ["desmontar caractere composto", "reconhecer peça sonora em contexto"],
        lessons: [
          {
            id: "l16",
            title: "妈: sentido + som",
            skill: "hanzi",
            steps: [
              intro("Sentido + som", "女 dá o campo de sentido; 马 não significa cavalo aqui: funciona como pista sonora «ma». Juntos: 妈 = mãe — você treinou mā na Fase 2."),
              decompose("ma2"),
              recognize("ma2"),
              tone("妈", "mā", 1, "quiz"),
              dialogue(
                "Peça de som",
                "Em 妈, qual peça dá pista sonora?",
                "马",
                ["马", "女", "木", "日"],
                "马 dá a pista sonora ma. 女 dá o campo de sentido.",
                "Escolha"
              ),
            ],
          },
          {
            id: "l17",
            title: "Sol e lua",
            skill: "hanzi",
            steps: [
              recognize("ri"),
              recognize("yue"),
              decompose("ming"),
              recognize("ming"),
              comp("明", "míng", "claro, brilhante", ["claro, brilhante", "bosque", "mãe", "amigo"]),
              match(
                "Sol + lua",
                "Combine as peças de 明.",
                [
                  { left: "日", right: "sol / dia", leftType: "hanzi", rightType: "pt" },
                  { left: "月", right: "lua / mês", leftType: "hanzi", rightType: "pt" },
                  { left: "明", right: "claro / brilhante", leftType: "hanzi", rightType: "pt" },
                ],
                "日 + 月 cria uma ponte visual para luz e clareza."
              ),
            ],
          },
          {
            id: "l18",
            title: "Amigo",
            skill: "hanzi",
            steps: [
              decompose("peng"),
              flash("pengyou"),
              comp("朋友", "péngyou", "amigo", ["amigo", "China", "casa", "mãe"]),
              recognize("peng"),
              sentenceBuild(
                "Monte 朋友",
                "Monte: amigo.",
                ["朋", "友"],
                ["友", "朋", "明", "妈"],
                "朋友 junta dois caracteres para formar amigo."
              ),
              dialogue(
                "Da peça à palavra",
                "Qual é a palavra de dois caracteres para amigo?",
                "朋友",
                ["朋友", "中国", "谢谢", "你好"],
                "朋友 / péngyou significa amigo.",
                "Escolha"
              ),
            ],
          },
          review("l7-rev", "hanzi", [decompose("ma2"), recognize("ming"), flash("pengyou")]),
          {
            id: "p4-checkpoint-fundamentos",
            title: "Checkpoint dos fundamentos",
            skill: "hanzi",
            isReview: true,
            reviewMasteryMode: true,
            rewardQi: 4,
            estimatedMinutes: 7,
            libraryItems: ["chunk:nihao", "chunk:xiexie", "chunk:zaijian", "chunk:wojiao", "chunk:wature", "char:wo", "char:shi", "char:ren", "char:ma2", "char:ming"],
            reviewItems: ["chunk:nihao", "chunk:xiexie", "chunk:zaijian", "chunk:wojiao", "chunk:wature", "char:wo", "char:shi", "char:ren", "char:ma2", "char:ming"],
            steps: [
              intro(
                "Checkpoint dos fundamentos",
                "Você fechou os fundamentos: som, tons, frases úteis e a lógica dos hànzì. Este checkpoint junta o que você já sabe antes de subir para o nível intermediário."
              ),
              flash("nihao"),
              flash("xiexie"),
              flash("zaijian"),
              flash("wojiao"),
              recognize("wo"),
              recognize("shi"),
              recognize("ren"),
              produce(["一", "二", "三"], ["三", "一", "五", "二"], "um, dois, três"),
              decompose("ma2"),
              decompose("ming"),
              comp("我是巴西人", "wǒ shì Bāxī rén", "Sou brasileiro", ["Sou brasileiro", "Meu nome é Matheus", "Olá", "De nada"]),
              dialogue(
                "O que você construiu",
                "Depois dos fundamentos, o que você já consegue fazer?",
                "cumprimentar, agradecer, me apresentar e reconhecer a lógica dos hànzì",
                [
                  "cumprimentar, agradecer, me apresentar e reconhecer a lógica dos hànzì",
                  "só reconhecer tons isolados",
                  "ler qualquer texto em chinês",
                  "nada disso ainda",
                ],
                "Os fundamentos te dão frases úteis e a lógica visual dos caracteres — o intermediário constrói em cima disso."
              ),
            ],
          },
        ],
      },
    ],
  },

  // ─── FASE 5 · Construção Lógica ─────────────────────────────────────────
  {
    id: "p5",
    order: 5,
    title: "Construção Lógica",
    why: "Depois de ver peças isoladas, você começa a combinar sentido e som sem decoreba.",
    tier: "intermediario",
    units: [
      {
        id: "u5-0",
        title: "Construção lógica",
        subtitle: "Peças que somam sentido e som",
        goal: "Desmontar caracteres compostos sem decorar forma solta.",
        color: "#B42318",
        focusChunks: ["你好吗？"],
        focusHanzi: ["林", "森", "明", "休", "好", "妈", "吗"],
        focusGrammar: ["composição visual", "composição fono-semântica"],
        focusSounds: ["lin", "sen", "míng", "mā", "ma"],
        focusSituations: ["desmontar antes de memorizar", "usar 你好吗？ como contexto de 吗"],
        lessons: [
          ...PHASE5_DECOMPOSITION_MICROTASKS,
          {
            id: "l19-logica-madeira",
            title: "Árvore vira floresta",
            skill: "hanzi",
            libraryItems: ["char:mu", "char:lin", "char:sen", "char:xiu"],
            reviewItems: ["char:mu", "char:lin", "char:sen", "char:xiu"],
            rewardQi: 2,
            estimatedMinutes: 5,
            steps: [
              intro("Peças somam ideias", "木 é árvore/madeira. Quando a peça aparece mais de uma vez, a imagem cresce: 林 vira bosque e 森 vira floresta densa."),
              recognize("mu"),
              decompose("lin"),
              decompose("sen"),
              decompose("xiu"),
              recognize("lin"),
              recognize("sen"),
              recognize("xiu"),
              match(
                "Leia a lógica",
                "Combine composição e significado.",
                [
                  { left: "木 + 木 + 木", right: "森", leftType: "hanzi", rightType: "hanzi" },
                  { left: "森", right: "floresta densa", leftType: "hanzi", rightType: "pt" },
                ],
                "Três árvores juntas sugerem muitas árvores."
              ),
            ],
          },
          {
            id: "l19-logica-luz",
            title: "Luz e bom",
            skill: "hanzi",
            libraryItems: ["char:ri", "char:yue", "char:ming", "char:nv", "char:zi", "char:hao"],
            reviewItems: ["char:ri", "char:yue", "char:ming", "char:nv", "char:zi", "char:hao"],
            rewardQi: 2,
            estimatedMinutes: 5,
            steps: [
              intro("Duas imagens, uma ideia", "日 é sol/dia e 月 é lua/mês. Juntos em 明, criam uma ponte visual para claro, brilho e luz."),
              recognize("ri"),
              recognize("yue"),
              decompose("ming"),
              recognize("nv"),
              recognize("zi"),
              decompose("hao"),
              comp("明", "míng", "claro, brilhante", ["claro, brilhante", "bom; bem", "floresta", "descansar"]),
              comp("好", "hǎo", "bom; bem", ["bom; bem", "lua", "pessoa", "pergunta"]),
              match(
                "Peças com sentido",
                "Combine cada caractere com a composição.",
                [
                  { left: "日 + 月", right: "明", leftType: "hanzi", rightType: "hanzi" },
                  { left: "女 + 子", right: "好", leftType: "hanzi", rightType: "hanzi" },
                  { left: "明", right: "claro / brilhante", leftType: "hanzi", rightType: "pt" },
                  { left: "好", right: "bom / bem", leftType: "hanzi", rightType: "pt" },
                ],
                "明 junta sol e lua; 好 junta 女 e 子."
              ),
            ],
          },
          {
            id: "l19-logica-pessoas",
            title: "Pessoas juntas",
            skill: "hanzi",
            libraryItems: ["char:ren", "char:cong", "char:zhong3"],
            reviewItems: ["char:ren", "char:cong", "char:zhong3"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              intro("Repetir também muda a cena", "人 é pessoa. Duas pessoas formam 从; três pessoas formam 众, uma multidão. Não é desenho aleatório: é composição visual."),
              recognize("ren"),
              decompose("cong"),
              decompose("zhong3"),
              recognize("cong"),
              recognize("zhong3"),
              match(
                "Cena mental",
                "Combine a composição com o sentido.",
                [
                  { left: "人 + 人 + 人", right: "众", leftType: "hanzi", rightType: "hanzi" },
                  { left: "众", right: "multidão", leftType: "hanzi", rightType: "pt" },
                ],
                "Várias pessoas juntas sugerem multidão."
              ),
            ],
          },
          {
            id: "l19-logica-ma",
            title: "Quando 马 dá som",
            skill: "hanzi",
            libraryItems: ["char:ma2", "char:ma_question", "chunk:nihaoma"],
            reviewItems: ["char:ma2", "char:ma_question", "chunk:nihaoma"],
            rewardQi: 2,
            estimatedMinutes: 5,
            steps: [
              intro("Nem toda peça dá sentido", "Em 妈, 女 aponta para o campo de mãe/mulher e 马 dá a pista sonora ma. Em 吗, 口 aponta para fala/frase e 马 também dá a pista sonora ma."),
              decompose("ma2"),
              tone("妈", "mā", 1, "quiz"),
              decompose("ma_question"),
              flash("nihaoma"),
              recognize("ma2"),
              recognize("ma_question"),
              comp("你好吗？", "nǐ hǎo ma?", "Tudo bem?", ["Tudo bem?", "Obrigado(a).", "Sou brasileiro.", "Meu nome é Matheus."]),
              match(
                "Sentido ou som?",
                "Combine as peças de 吗 com seus papéis.",
                [
                  { left: "口", right: "fala / pergunta", leftType: "hanzi", rightType: "pt" },
                  { left: "马", right: "pista sonora ma", leftType: "hanzi", rightType: "pt" },
                ],
                "口 aponta para fala/frase; 马 dá a pista sonora ma."
              ),
            ],
          },
          {
            id: "l19-logica-rev",
            title: "Revisão de peças",
            skill: "hanzi",
            reviewMasteryMode: true,
            libraryItems: ["char:lin", "char:sen", "char:ming", "char:xiu", "char:hao", "char:cong", "char:zhong3", "char:ma2", "char:ma_question"],
            reviewItems: ["char:lin", "char:sen", "char:ming", "char:xiu", "char:hao", "char:cong", "char:zhong3", "char:ma2", "char:ma_question"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              decompose("lin"),
              decompose("sen"),
              decompose("ming"),
              decompose("xiu"),
              decompose("hao"),
              decompose("cong"),
              decompose("zhong3"),
              decompose("ma2"),
              decompose("ma_question"),
              match(
                "Peças favoritas",
                "Combine as combinações já vistas.",
                [
                  { left: "日 + 月", right: "明", leftType: "hanzi", rightType: "hanzi" },
                  { left: "木 + 木", right: "林", leftType: "hanzi", rightType: "hanzi" },
                  { left: "口 + 马", right: "吗", leftType: "hanzi", rightType: "hanzi" },
                ],
                "Cada combinação cria uma pista visual ou sonora."
              ),
            ],
          },
        ],
      },
      {
        id: "u5-1",
        title: "Números 1 a 10",
        subtitle: "Contar em mandarim",
        goal: "Reconhecer e ouvir os números de 1 a 10.",
        color: "#2F6FB0",
        focusChunks: [],
        focusHanzi: ["一", "二", "三", "四", "五"],
        focusGrammar: ["sequência numérica curta", "número como hànzì visual"],
        focusSounds: ["yī", "èr", "sān", "sì", "wǔ"],
        focusSituations: ["contar 1 a 5", "reconhecer números em quantidade, preço e telefone"],
        lessons: [
          {
            id: "l19",
            title: "Um a cinco",
            skill: "hanzi",
            masteryLoop: true,
            steps: [
              intro("Risquinhos", "一 二 三 são literalmente 1, 2 e 3 traços. É o jeito mais fácil de começar a ler números."),
              listen("一", "yī", "um"),
              listen("二", "èr", "dois"),
              listen("三", "sān", "três"),
              recognize("yi"),
              recognize("er"),
              recognize("san"),
              listen("四", "sì", "quatro"),
              listenSelect(
                "Ouça o número",
                "四",
                ["一", "二", "四", "五"],
                "四",
                "四 é quatro."
              ),
              recognize("si"),
              comp("五", "wǔ", "cinco", ["cinco", "quatro", "três", "um"]),
              recognize("wu"),
              produce(["一", "二", "三"], ["三", "一", "五", "二"], "um, dois, três"),
              sentenceBuild(
                "Monte 1 a 5",
                "Monte a sequência de um a cinco.",
                ["一", "二", "三", "四", "五"],
                ["三", "一", "五", "二", "四"],
                "一 二 三 四 五 é a primeira sequência numérica."
              ),
              fillBlank(
                "Complete a sequência",
                "Complete: 一 二 三 ___ 五.",
                "一二三",
                "四",
                "五",
                ["四", "二", "五", "三"],
                "四 vem depois de 三 e antes de 五."
              ),
              dialogue(
                "Número seguinte",
                "Na sequência 一 二 三 四, qual vem depois?",
                "五",
                ["五", "二", "三", "一"],
                "五 fecha a sequência de 1 a 5.",
                "Escolha"
              ),
              match(
                "Lógica visual",
                "Combine o caractere com a quantidade.",
                [
                  { left: "一", right: "um", leftType: "hanzi", rightType: "pt" },
                  { left: "二", right: "dois", leftType: "hanzi", rightType: "pt" },
                  { left: "三", right: "três", leftType: "hanzi", rightType: "pt" },
                ],
                "O número de traços acompanha a quantidade."
              ),
            ],
          },
          {
            id: "l20",
            title: "Seis a dez",
            skill: "hanzi",
            masteryLoop: true,
            steps: [
              recognize("liu"),
              recognize("qi"),
              recognize("ba8"),
              listen("九", "jiǔ", "nove"),
              recognize("jiu"),
              recognize("shi10"),
              produce(["六", "七", "八"], ["八", "十", "六", "七"], "seis, sete, oito"),
              write("Contagem útil", "Escreva em português uma situação em que você usaria números em mandarim.", "Exemplos: preço, idade, telefone, mesa de restaurante ou quantidade de pessoas.", "Escreva um exemplo real"),
            ],
          },
          review("l8-rev", "hanzi", [
            recognize("san"),
            recognize("wu"),
            recognize("shi10"),
            produce(["一", "二", "三"], ["二", "三", "一", "五"], "um, dois, três"),
            dialogue(
              "Revisão de números",
              "Qual caractere significa dez?",
              "十",
              ["十", "九", "三", "人"],
              "十 significa dez.",
              "Escolha"
            ),
          ]),
        ],
      },
      {
        id: "u5-2",
        title: "Palavras compostas",
        subtitle: "Juntar peças que você já conhece",
        goal: "Reconhecer palavras de dois caracteres.",
        color: "#7A3FB0",
        focusChunks: ["我们", "你们", "我有三个朋友"],
        focusHanzi: ["我", "你", "们", "三", "朋", "友"],
        focusGrammar: ["plural com 们", "quantidade com 三 个", "palavra composta"],
        focusSounds: ["wǒmen", "nǐmen", "sān ge péngyou"],
        focusSituations: ["falar de grupos", "dizer que tem três amigos"],
        lessons: [
          {
            id: "l21",
            title: "Nós e vocês",
            skill: "fala",
            masteryLoop: true,
            steps: [
              intro("Plural", "我 + 们 = 我们 (nós); 你 + 们 = 你们 (vocês)."),
              flash("women"),
              flash("nimen"),
              comp("我们", "wǒmen", "nós", ["nós", "vocês", "amigo", "China"]),
              comp("你们", "nǐmen", "vocês", ["vocês", "nós", "eu", "pessoa"]),
              produce(["我", "们"], ["们", "你", "我", "人"], "nós"),
              produce(["你", "们"], ["们", "你", "我", "人"], "vocês"),
              dialogue(
                "Peça que muda o grupo",
                "Qual peça transforma 我 em 我们?",
                "们",
                ["们", "人", "是", "不"],
                "们 transforma eu/você em nós/vocês: 我 → 我们, 你 → 你们.",
                "Escolha"
              ),
            ],
          },
          {
            id: "l22",
            title: "China e amigos",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            steps: [
              flash("zhongguo"),
              comp("中国", "Zhōngguó", "China", ["China", "Brasil", "amigo", "casa"]),
              flash("pengyou"),
              flash("woyousangepengyou"),
              produce(["我", "有", "三", "个", "朋友"], ["三", "朋友", "有", "我", "个", "你"], "Tenho três amigos"),
              dialogue(
                "Composto útil",
                "Qual palavra significa amigo?",
                "朋友",
                ["朋友", "中国", "我们", "中文"],
                "朋友 / péngyou significa amigo.",
                "Escolha"
              ),
            ],
          },
          {
            id: "l23",
            title: "Microtexto 2",
            skill: "leitura",
            premium: true,
            masteryLoop: true,
            steps: [
              read([
                { hanzi: "你好！", pinyin: "Nǐ hǎo!", pt: "Olá!" },
                { hanzi: "我叫Matheus。", pinyin: "Wǒ jiào Matheus.", pt: "Meu nome é Matheus." },
                { hanzi: "我是巴西人。", pinyin: "Wǒ shì Bāxī rén.", pt: "Sou brasileiro." },
                { hanzi: "我有三个朋友。", pinyin: "Wǒ yǒu sān ge péngyou.", pt: "Tenho três amigos." },
              ]),
              comp("我有三个朋友。", "Wǒ yǒu sān ge péngyou.", "Tenho três amigos.", ["Tenho três amigos.", "Sou brasileiro.", "Meu nome é Matheus.", "Obrigado."]),
              translationBuild(
                "Resumo do texto",
                "你好！我叫Matheus。我是巴西人。我有三个朋友。",
                "Nǐ hǎo! Wǒ jiào Matheus. Wǒ shì Bāxī rén. Wǒ yǒu sān ge péngyou.",
                ["Olá.", "Meu nome é Matheus.", "Sou brasileiro.", "Tenho três amigos."],
                ["Sou brasileiro.", "Obrigado.", "Olá.", "Tenho três amigos.", "Meu nome é Matheus."],
                "O texto cumprimenta, apresenta nome, origem e três amigos."
              ),
            ],
          },
          review("l9-rev", "fala", [
            flash("women"),
            comp("我们", "wǒmen", "nós", ["nós", "vocês", "amigo", "China"]),
            flash("zhongguo"),
            flash("pengyou"),
            flash("woyousangepengyou"),
            produce(["我", "有", "三", "个", "朋友"], ["有", "朋友", "三", "我", "个"], "Tenho três amigos"),
            conversationScene("revisao-numeros"),
          ], true),
        ],
      },
    ],
  },

  // ─── FASE 6 · Vida Cotidiana (Premium) ───────────────────────────────────
  {
    id: "p6",
    order: 6,
    title: "Vida Cotidiana",
    why: "Mandarim de verdade é pedir comida, falar da família e sobreviver numa loja.",
    tier: "intermediario",
    units: [
      {
        id: "u6-1",
        title: "Família",
        subtitle: "Apresentar quem é quem",
        goal: "Apresentar pai e mãe; fazer perguntas básicas.",
        color: "#B7791F",
        focusChunks: ["这是我爸爸", "这是我妈妈", "这是什么？", "这是我家"],
        focusHanzi: ["家"],
        focusGrammar: ["apresentação com 这是", "pergunta com 什么"],
        focusSounds: ["zhè shì", "bàba", "māma", "shénme", "jiā"],
        focusSituations: ["apresentar familiares", "mostrar a casa", "perguntar o que é algo"],
        lessons: [
          {
            id: "l24",
            title: "Pai e mãe",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // Visto na cena de identificar alguém à distância (那是我妈妈) e na casa (家).
            newHanzi: ["那", "家"],
            libraryItems: [
              "chunk:zheshibaba",
              "chunk:zheshimama",
              "chunk:zheshiwodejia",
              "chunk:wohuijia",
              "char:jia",
            ],
            reviewItems: ["chunk:zheshibaba", "chunk:zheshimama", "char:jia"],
            steps: [
              flash("zheshibaba"),
              flash("zheshimama"),
              listen("这是我爸爸", "zhè shì wǒ bàba", "Este é meu pai."),
              listen("这是我妈妈", "zhè shì wǒ māma", "Esta é minha mãe."),
              imageChoice(
                "choose_hanzi",
                "father",
                "Qual hànzì combina com pai?",
                "爸",
                visualHanziOptions("father"),
                { explanation: "爸 (bà) = pai — na foto da família." }
              ),
              comp("这是我爸爸", "zhè shì wǒ bàba", "Este é meu pai.", [
                "Este é meu pai.",
                "Esta é minha mãe.",
                "Este é meu amigo.",
                "Eu gosto de chá.",
              ]),
              comp("这是我妈妈", "zhè shì wǒ māma", "Esta é minha mãe.", [
                "Esta é minha mãe.",
                "Este é meu pai.",
                "O que é isto?",
                "Quanto custa?",
              ]),
              sentenceBuild(
                "Apresente seu pai",
                "Monte: Este é meu pai.",
                ["这", "是", "我", "爸爸"],
                ["我", "爸爸", "这", "妈妈", "是"],
                "这是我爸爸 apresenta quem é seu pai."
              ),
              fillBlank(
                "Apresente sua mãe",
                "Complete: 这是我 ___.",
                "这是我",
                "妈妈",
                "",
                ["妈妈", "爸爸", "朋友", "中文"],
                "这是我妈妈 apresenta quem é sua mãe."
              ),
              dialogue(
                "Foto da família",
                "Alguém aponta para seu pai na foto. O que você diz?",
                "这是我爸爸",
                ["这是我爸爸", "这是我妈妈", "这是什么？", "我喜欢中文"],
                "这是我爸爸 apresenta seu pai em uma foto.",
                "Pessoa"
              ),
              dialogue(
                "Outra foto",
                "Alguém aponta para sua mãe. O que você diz?",
                "这是我妈妈",
                ["这是我妈妈", "这是我爸爸", "我要这个", "我想喝茶"],
                "这是我妈妈 apresenta sua mãe.",
                "Pessoa"
              ),
              // 家: a casa da família — conceito visual ligado a apresentar parentes.
              intro("Casa da família", "家 é casa e também família. Depois de apresentar pai e mãe, mostre onde vocês moram."),
              listen("家", "jiā", "casa; família"),
              imageChoice(
                "choose_meaning",
                "home",
                "O que esta imagem mostra?",
                "casa",
                visualMeaningOptions("home"),
                { explanation: "家 (jiā) = casa; família." }
              ),
              imageChoice(
                "choose_hanzi",
                "home",
                "Qual hànzì combina com a casa?",
                "家",
                visualHanziOptions("home"),
                { explanation: "家 é o caractere de casa." }
              ),
              flash("zheshiwodejia"),
              listen("这是我家", "zhè shì wǒ jiā", "Esta é minha casa."),
              sentenceBuild(
                "Mostre a casa",
                "Monte: esta é minha casa.",
                ["这", "是", "我", "家"],
                ["这", "是", "我", "家", "妈妈"],
                "这是我家 apresenta a casa da família."
              ),
              dialogue(
                "Na porta",
                "Um amigo chega. Como você mostra a casa?",
                "这是我家",
                ["这是我家", "这是我爸爸", "我想喝茶", "我们走吧"],
                "这是我家 aponta a casa.",
                "Amigo"
              ),
              // Cena autoral: identificar alguém à distância no momento certo do
              // módulo Família (那是我妈妈), sem antecipar vocabulário.
              conversationScene("identificar-pessoa"),
            ],
          },
          {
            id: "l25",
            title: "Perguntas úteis",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // Vistos na cena de perguntar onde algo fica (山在哪里 → 在那里) e em casa.
            newHanzi: ["那", "里"],
            libraryItems: [
              "chunk:zheshishenme",
              "chunk:zaina",
              "chunk:zheshiwodejia",
              "chunk:wohuijia",
              "char:jia",
            ],
            reviewItems: ["chunk:zheshishenme", "char:jia", "chunk:zheshiwodejia"],
            steps: [
              flash("zheshishenme"),
              flash("zaina"),
              listen("这是什么？", "zhè shì shénme?", "O que é isto?"),
              listenSelect(
                "Ouça a pergunta",
                "这是什么？",
                ["这是什么？", "这是我爸爸", "你好", "你叫什么？"],
                "这是什么？",
                "这是什么？ pergunta o que é algo."
              ),
              comp("这是什么？", "zhè shì shénme?", "O que é isto?", ["O que é isto?", "Onde fica?", "Quanto custa?", "Com licença"]),
              sentenceBuild(
                "Monte a pergunta",
                "Monte: O que é isto?",
                ["这", "是", "什么"],
                ["什么", "这", "是", "我", "爸爸"],
                "这是什么？ pergunta o que é algo."
              ),
              dialogue(
                "Objeto desconhecido",
                "Você vê um objeto e não sabe o que é. Qual pergunta combina?",
                "这是什么？",
                ["这是什么？", "这是我妈妈", "我喜欢中文", "我们走吧"],
                "Use 这是什么？ para perguntar o que é algo.",
                "Situação"
              ),
              // Revisão visual de 家 + conversa: mostrar a casa depois de saber perguntar 这是什么？
              imageChoice(
                "choose_image",
                "home",
                "Qual imagem combina com 家?",
                "home",
                visualImageOptions("home"),
                { explanation: "家 volta: casa da família." }
              ),
              flash("wohuijia"),
              listen("我回家", "wǒ huí jiā", "Vou para casa."),
              dialogue(
                "Hora de voltar",
                "A visita acabou. Como você diz que vai para casa?",
                "我回家",
                ["我回家", "这是什么？", "太贵了", "我很好"],
                "我回家 fecha a visita.",
                "Situação"
              ),
              // Cena autoral: perguntar onde algo fica (山在哪里？→ 在那里) — a
              // intenção "perguntar onde está" no módulo de perguntas úteis.
              conversationScene("onde-esta"),
            ],
          },
        ],
      },
      {
        id: "u6-2",
        title: "Comida e compras",
        subtitle: "Dizer o que você quer",
        goal: "Expressar gostos, fome e fazer compras.",
        color: "#2F855A",
        focusChunks: ["我喜欢中文", "我想喝茶", "我要饭", "我要鱼", "我想喝水", "多少钱？", "我要这个"],
        focusHanzi: ["饭", "菜", "肉", "鱼", "喝"],
        focusGrammar: ["gosto com 喜欢", "desejo com 想/要", "pergunta de preço", "pedido no cardápio"],
        focusSounds: ["xǐhuan", "xiǎng hē", "fàn", "cài", "ròu", "yú", "duōshao qián", "wǒ yào"],
        focusSituations: ["dizer preferência", "pedir no cardápio", "escolher carne ou peixe", "perguntar preço"],
        lessons: [
          {
            id: "l26",
            title: "Fome e gosto",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            steps: [
              flash("woxihuan"),
              flash("woele"),
              flash("haochi"),
              listen("我喜欢中文", "wǒ xǐhuan Zhōngwén", "Eu gosto de chinês."),
              comp("我喜欢中文", "wǒ xǐhuan Zhōngwén", "Eu gosto de chinês.", [
                "Eu gosto de chinês.",
                "Quero beber chá.",
                "Quanto custa?",
                "Vamos embora.",
              ]),
              sentenceBuild(
                "Monte seu gosto",
                "Monte: Eu gosto de chinês.",
                ["我", "喜欢", "中文"],
                ["中文", "我", "喜欢", "想", "茶"],
                "我喜欢中文 diz uma preferência simples."
              ),
              dialogue(
                "Preferência",
                "Você quer dizer que gosta de chinês. Qual frase combina?",
                "我喜欢中文",
                ["我喜欢中文", "我想喝茶", "我要这个", "谢谢"],
                "我喜欢中文 expressa gosto ou interesse.",
                "Situação"
              ),
              // Cena autoral: perguntar o que é algo (这是什么？→ 这是茶 / 这是水),
              // a intenção "o que é isto" no módulo de comida e bebida.
              conversationScene("o-que-e-isto"),
            ],
          },
          {
            id: "l26b",
            title: "No cardápio",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            newHanzi: ["饭", "菜", "肉", "鱼", "喝", "饿", "馆"],
            libraryItems: [
              "char:fan_rice",
              "char:cai_dish",
              "char:rou_meat",
              "char:yu_fish",
              "char:he_drink",
              "char:e_hungry",
              "char:shui",
              "char:cha_tea",
              "char:yao",
              "char:chi_eat",
              "chunk:woyaofan",
              "chunk:woyaocai",
              "chunk:woyaorou",
              "chunk:woyaoyu",
              "chunk:woxiangheshui",
              "chunk:woyaoshui",
              "chunk:womenchifanba",
              "chunk:woele",
              "chunk:caidan",
              "chunk:fanguan",
              "chunk:yibeicha",
              "chunk:maidan",
              "chunk:duoshaoqian",
            ],
            reviewItems: [
              "char:fan_rice",
              "char:cai_dish",
              "char:rou_meat",
              "char:yu_fish",
              "char:he_drink",
              "chunk:woele",
              "chunk:woxianghe",
            ],
            steps: [
              intro(
                "Pedir no cardápio",
                "Num restaurante você escolhe arroz ou verdura, carne ou peixe, e diz o que quer beber — tudo com frases curtas."
              ),
              flash("woele"),
              flash("womenchifanba"),
              listen("饭", "fàn", "arroz; refeição"),
              listen("菜", "cài", "verdura; prato"),
              listen("肉", "ròu", "carne"),
              listen("鱼", "yú", "peixe"),
              listen("喝", "hē", "beber"),
              imageChoice(
                "choose_hanzi",
                "fish",
                "Qual hànzì combina com peixe?",
                "鱼",
                visualHanziOptions("fish"),
                { explanation: "鱼 (yú) = peixe." }
              ),
              imageChoice(
                "choose_hanzi",
                "meat",
                "Qual hànzì combina com carne?",
                "肉",
                visualHanziOptions("meat"),
                { explanation: "肉 (ròu) = carne." }
              ),
              // 饭 / 菜 / 喝 ficam no foco (libraryItems) e aparecem em revisão / outras lições;
              // aqui o slot visual (máx. 2) prioriza carne e peixe — a escolha do cardápio.
              flash("woyaofan"),
              flash("woyaocai"),
              flash("woyaorou"),
              flash("woyaoyu"),
              flash("woxiangheshui"),
              flash("woyaoshui"),
              flash("caidan"),
              flash("fanguan"),
              flash("yibeicha"),
              flash("maidan"),
              listen("我要饭", "wǒ yào fàn", "Quero arroz."),
              listen("我要菜", "wǒ yào cài", "Quero verdura."),
              listen("我想喝水", "wǒ xiǎng hē shuǐ", "Quero beber água."),
              imageChoice(
                "choose_meaning",
                "menu",
                "O que esta imagem mostra?",
                "cardápio",
                visualMeaningOptions("menu"),
                { explanation: "菜单 (càidān) é o cardápio que você pede no restaurante." }
              ),
              imageChoice(
                "listen_and_choose_image",
                "drinking_water",
                "Ouça e escolha o pedido certo.",
                "drinking_water",
                visualImageOptions("drinking_water"),
                { explanation: "一杯水 (yì bēi shuǐ) = um copo de água." }
              ),
              imageChoice(
                "choose_meaning",
                "restaurant",
                "O que esta imagem mostra?",
                "restaurante",
                visualMeaningOptions("restaurant"),
                { explanation: "饭馆 (fànguǎn) é um restaurante; 餐厅 também é muito usado." }
              ),
              compareWithImage(
                "word_to_image",
                1,
                "restaurant",
                "饭馆 é o lugar onde você come. Qual imagem mostra o lugar, não o cardápio?",
                "restaurant",
                ["restaurant", "menu"],
                { explanation: "饭馆 (fànguǎn) é o restaurante; 菜单 (càidān) é apenas o cardápio usado lá." }
              ),
              sentenceBuild(
                "Peça arroz",
                "Monte: quero arroz.",
                ["我", "要", "饭"],
                ["我", "要", "饭", "菜", "鱼"],
                "我要饭 pede a refeição / o arroz."
              ),
              // Reforço do padrão (etapas 1–2) com vocabulário 要 + coisa — chinês primeiro.
              intro(
                "Mesma lógica",
                "我 要 饭\n我 要 茶\n\nquem + ação + coisa\n\nIgual a 我是巴西人: quem → ação → coisa. Você troca a coisa (饭 / 茶), não a ordem."
              ),
              match(
                "Quem? Ação? Coisa?",
                "Em 我要茶, combine cada peça com o papel do padrão.",
                [
                  { left: "我", right: "quem", leftType: "hanzi", rightType: "pt" },
                  { left: "要", right: "ação", leftType: "hanzi", rightType: "pt" },
                  { left: "茶", right: "coisa", leftType: "hanzi", rightType: "pt" },
                ],
                "我要茶 = quem + ação + coisa — mesmo padrão do cardápio."
              ),
              sentenceBuild(
                "Peça peixe",
                "Monte: quero peixe.",
                ["我", "要", "鱼"],
                ["我", "要", "鱼", "肉", "饭"],
                "我要鱼 pede peixe no cardápio."
              ),
              dialogue(
                "Arroz ou verdura?",
                "O garçom pergunta se você quer arroz. O que você diz?",
                "我要饭",
                ["我要饭", "我要菜", "再见", "太贵了"],
                "我要饭 escolhe o arroz.",
                "Garçom"
              ),
              dialogue(
                "Carne ou peixe?",
                "Há carne e peixe. Você prefere peixe. O que diz?",
                "我要鱼",
                ["我要鱼", "我要肉", "我很好", "再见"],
                "我要鱼 escolhe peixe em vez de carne.",
                "Garçom"
              ),
              dialogue(
                "O que beber?",
                "Quer beber água. Qual frase combina?",
                "我想喝水",
                ["我想喝水", "我要饭", "这是我家", "再见"],
                "我想喝水 diz o que você quer beber.",
                "Garçom"
              ),
              conversationScene("pedir-cardapio"),
            ],
          },
          {
            id: "l27",
            title: "Na loja",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            newHanzi: ["多", "少"],
            steps: [
              flash("duoshaoqian"),
              flash("taiguile"),
              flash("woyao"),
              flash("woxianghe"),
              imageChoice(
                "listen_and_choose_image",
                "drink",
                "Ouça e escolha a ação certa.",
                "drink",
                visualImageOptions("drink"),
                { explanation: "喝 (hē) = beber — pedido na loja." }
              ),
              imageChoice(
                "choose_meaning",
                "rice",
                "O que esta imagem mostra?",
                "arroz",
                visualMeaningOptions("rice"),
                { explanation: "饭 reaparece na loja: comida e compra juntas." }
              ),
              listen("多少钱？", "duōshao qián?", "Quanto custa?"),
              listen("我要这个", "wǒ yào zhège", "Eu quero este."),
              listenSelect(
                "Ouça o pedido",
                "我想喝茶",
                ["我想喝茶", "我要这个", "多少钱？", "我喜欢中文"],
                "我想喝茶",
                "我想喝茶 pede chá como desejo."
              ),
              listenSelect(
                "Ouça a pergunta de preço",
                "多少钱？",
                ["多少钱？", "我要这个", "我想喝茶", "我们走吧"],
                "多少钱？",
                "多少钱？ pergunta o preço."
              ),
              comp("多少钱？", "duōshao qián?", "Quanto custa?", [
                "Quanto custa?",
                "Quero este.",
                "Eu gosto de chinês.",
                "Vamos embora.",
              ]),
              comp("我要这个", "wǒ yào zhège", "Eu quero este.", [
                "Eu quero este.",
                "Quanto custa?",
                "Quero beber chá.",
                "Está caro demais.",
              ]),
              sentenceBuild(
                "Pergunte o preço",
                "Monte: Quanto custa?",
                ["多少", "钱"],
                ["钱", "这个", "多少", "茶"],
                "多少钱？ é a pergunta curta de preço."
              ),
              sentenceBuild(
                "Escolha o item",
                "Monte: Eu quero este.",
                ["我", "要", "这个"],
                ["这个", "我", "要", "多少", "钱"],
                "我要这个 resolve uma compra simples."
              ),
              fillBlank(
                "Complete o pedido",
                "Complete: 我 ___ 这个.",
                "我",
                "要",
                "这个",
                ["要", "想", "喝", "喜欢"],
                "我要这个 = eu quero este."
              ),
              dialogue(
                "Na barraca",
                "Você aponta para um produto e quer saber o preço. O que pergunta?",
                "多少钱？",
                ["多少钱？", "我要这个", "我喜欢中文", "我们走吧"],
                "多少钱？ é a pergunta mais direta para preço.",
                "Vendedor"
              ),
              dialogue(
                "Depois do preço",
                "O preço está bom e você quer comprar. O que diz?",
                "我要这个",
                ["我要这个", "多少钱？", "我想喝茶", "这是我爸爸"],
                "我要这个 confirma que você quer aquele item.",
                "Vendedor"
              ),
              produce(["我", "想", "喝", "茶"], ["茶", "我", "喝", "想", "吃"], "Quero beber chá"),
              write(
                "Escreva em português",
                "Escreva em português: 我想喝茶",
                "Quero beber chá",
                "Monte a tradução com as peças",
                "woxianghe",
                {
                  mode: "translation_fill",
                  suggestion: "Monte a tradução tocando nas peças sugeridas.",
                  wordBank: ["quero", "beber", "chá", "eu", "arroz"],
                  accepts: ["Quero beber chá", "Eu quero beber chá"],
                }
              ),
              // Cena autoral: pedir água na loja (请问 → 我要水 → 谢谢), com o
              // vocabulário de compra já disponível neste módulo.
              conversationScene("pedir-agua"),
            ],
          },
          {
            id: "l28",
            title: "Vamos embora",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            steps: [
              flash("womenzouba"),
              comp("我们走吧", "wǒmen zǒu ba", "Vamos embora.", ["Vamos embora.", "Quero chá.", "Até logo.", "Muito caro!"]),
              // Cena autoral: reencontrar um amigo e convidá-lo a ir junto
              // (你好，朋友！→ 我们走吧！) — a intenção central do módulo.
              conversationScene("encontrar-amigo"),
            ],
          },
          withLessonDefaults({
            id: "p6-rotina-trabalho",
            title: "Rotina e trabalho",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // Chars de rotina/trabalho que ainda não têm entrada própria em
            // CHARACTERS (têm gloss) — declarados aqui para o corpus aceitar.
            newHanzi: ["起", "床", "上", "班", "下", "睡", "觉"],
            // Vocabulário novo de rotina/trabalho (chunks); os antigos (你好/谢谢)
            // aparecem como distratores para misturar repertório.
            libraryItems: [
              "chunk:woqichuang",
              "chunk:shangban",
              "chunk:xiaban",
              "chunk:woyaogongzuo",
              "chunk:woshujiao",
              "chunk:wozuofeiji",
            ],
            reviewItems: [
              "chunk:woqichuang",
              "chunk:shangban",
              "chunk:xiaban",
              "chunk:woyaogongzuo",
              "chunk:woshujiao",
              "chunk:nihao",
              "chunk:xiexie",
            ],
            steps: [
              intro(
                "Dia a dia",
                "Rotina e trabalho entram cedo na conversa: acordar, ir trabalhar, sair e dormir. São blocos curtos que você monta a partir do que já sabe."
              ),
              listen("我起床", "wǒ qǐchuáng", "Eu acordo"),
              listen("我上班", "wǒ shàngbān", "Vou para o trabalho"),
              listen("我下班", "wǒ xiàbān", "Saio do trabalho"),
              listen("我要工作", "wǒ yào gōngzuò", "Quero trabalhar"),
              listen("我睡觉", "wǒ shuìjiào", "Eu durmo"),
              match(
                "A rotina em ordem",
                "Combine cada frase com o momento do dia.",
                [
                  { left: "我起床", right: "acordar", leftType: "hanzi", rightType: "pt" },
                  { left: "我上班", right: "ir trabalhar", leftType: "hanzi", rightType: "pt" },
                  { left: "我下班", right: "sair do trabalho", leftType: "hanzi", rightType: "pt" },
                  { left: "我睡觉", right: "dormir", leftType: "hanzi", rightType: "pt" },
                ],
                "Acordar → trabalhar → sair → dormir: a rotina em ordem."
              ),
              listenSelect(
                "Qual frase?",
                "下班",
                ["起床", "上班", "下班", "睡觉"],
                "下班",
                "下班 é sair do trabalho."
              ),
              comp("我上班", "wǒ shàngbān", "Vou para o trabalho.", ["Vou para o trabalho.", "Eu durmo.", "Quero trabalhar.", "Estou bem."]),
              sentenceBuild(
                "Monte: eu acordo",
                "Monte a frase de acordar.",
                ["我", "起", "床"],
                ["我", "起", "床", "班"],
                "我起床 = eu acordo."
              ),
              sentenceBuild(
                "Monte: quero trabalhar",
                "Monte a frase de querer trabalhar.",
                ["我", "要", "工", "作"],
                ["我", "要", "工", "作", "睡"],
                "我要工作 = quero trabalhar."
              ),
              fillBlank(
                "Complete: vou trabalhar",
                "Complete: eu vou para o trabalho.",
                "我",
                "上",
                "班",
                ["上", "下"],
                "我上班 = vou para o trabalho."
              ),
              dialogue(
                "Sobre o trabalho",
                "Você quer trabalhar. O que diz?",
                "我要工作",
                ["我要工作", "我睡觉", "我下班", "谢谢"],
                "我要工作 = quero trabalhar.",
                "Situação"
              ),
              dialogue(
                "Fim do expediente",
                "Terminou o expediente. O que você diz?",
                "我下班",
                ["我下班", "我起床", "我要工作", "你好"],
                "我下班 = saio do trabalho.",
                "Situação"
              ),
            ],
          }),
          withLessonDefaults({
            id: "p6-cidade-lugares",
            title: "Cidade e lugares",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // Chars de lugares que só têm gloss (supermercado/banco/hospital/parque).
            newHanzi: ["超", "市", "银", "行", "医", "院", "公", "园", "酒", "场"],
            libraryItems: [
              "chunk:chaoshizainali",
              "chunk:yinhangzainali",
              "chunk:yiyuanzainali",
              "chunk:gongyuanzainali",
              "chunk:woquchaoshi",
              "chunk:woquyiyuan",
            ],
            reviewItems: [
              "chunk:chaoshizainali",
              "chunk:yinhangzainali",
              "chunk:yiyuanzainali",
              "chunk:gongyuanzainali",
              "chunk:zaina",
              "chunk:wozuofeiji",
            ],
            steps: [
              intro(
                "Na cidade",
                "Na cidade você precisa achar lugares: supermercado, banco, hospital e parque. A pergunta “onde fica?” já é sua — agora é só trocar o lugar."
              ),
              listen("超市在哪里？", "chāoshì zài nǎlǐ?", "Onde fica o supermercado?"),
              listen("银行在哪里？", "yínháng zài nǎlǐ?", "Onde fica o banco?"),
              listen("医院在哪里？", "yīyuàn zài nǎlǐ?", "Onde fica o hospital?"),
              listen("公园在哪里？", "gōngyuán zài nǎlǐ?", "Onde fica o parque?"),
              imageChoice(
                "listen_and_choose_image",
                "supermarket",
                "Ouça e escolha o lugar certo.",
                "supermarket",
                visualImageOptions("supermarket"),
                { explanation: "超市 (chāoshì) = supermercado." }
              ),
              imageChoice(
                "choose_hanzi",
                "hospital",
                "Qual palavra combina com o hospital?",
                "医院",
                visualHanziOptions("hospital"),
                { explanation: "医院 (yīyuàn) = hospital." }
              ),
              imageChoice(
                "choose_meaning",
                "bank",
                "O que esta imagem mostra?",
                "banco",
                visualMeaningOptions("bank"),
                { explanation: "银行 (yínháng) = banco." }
              ),
              compareWithImage(
                "word_to_image",
                2,
                "supermarket",
                "Você precisa comprar comida. Qual imagem corresponde a 超市?",
                "supermarket",
                ["supermarket", "hospital"],
                { explanation: "超市 (chāoshì) é o supermercado; 医院 (yīyuàn) é o hospital." }
              ),
              compareWithImage(
                "image_to_word",
                2,
                "bank",
                "Compare os lugares e escolha a palavra da imagem.",
                "银行",
                ["银行", "超市"],
                { explanation: "银行 (yínháng) é o banco, onde você resolve pagamentos e dinheiro; 超市 é supermercado." }
              ),
              match(
                "Onde fica o quê?",
                "Combine o lugar com o que você faz nele.",
                [
                  { left: "超市", right: "comprar comida", leftType: "hanzi", rightType: "pt" },
                  { left: "银行", right: "trocar dinheiro", leftType: "hanzi", rightType: "pt" },
                  { left: "医院", right: "ver o médico", leftType: "hanzi", rightType: "pt" },
                  { left: "公园", right: "passear", leftType: "hanzi", rightType: "pt" },
                ],
                "Cada lugar tem um uso: mercado compra, banco troca dinheiro, hospital cuida, parque é para passear."
              ),
              listenSelect("Qual lugar?", "医院", ["超市", "银行", "医院", "公园"], "医院", "医院 é o hospital."),
              comp("我去超市", "wǒ qù chāoshì", "Vou ao supermercado.", ["Vou ao supermercado.", "Vou ao hospital.", "Onde fica o banco?", "Estou doente."]),
              sentenceBuild(
                "Monte: onde fica o banco?",
                "Monte a pergunta.",
                ["银", "行", "在", "哪", "里"],
                ["银", "行", "在", "哪", "里", "超"],
                "银行在哪里？ pergunta onde fica o banco."
              ),
              sentenceBuild(
                "Monte: vou ao hospital",
                "Monte a frase.",
                ["我", "去", "医", "院"],
                ["我", "去", "医", "院", "园"],
                "我去医院 = vou ao hospital."
              ),
              fillBlank(
                "Complete: vou ao mercado",
                "Complete: vou ao supermercado.",
                "我去",
                "超",
                "市",
                ["超", "医"],
                "我去超市 = vou ao supermercado."
              ),
              dialogue(
                "Onde comprar?",
                "Você precisa comprar comida. Onde você pergunta?",
                "超市在哪里？",
                ["超市在哪里？", "医院在哪里？", "我要工作", "我很好"],
                "超市在哪里？ acha o supermercado.",
                "Situação"
              ),
              dialogue(
                "Achando o parque",
                "Quer passear no parque. O que você pergunta?",
                "公园在哪里？",
                ["公园在哪里？", "银行在哪里？", "谢谢", "再见"],
                "公园在哪里？ acha o parque.",
                "Situação"
              ),
            ],
          }),
          withLessonDefaults({
            id: "p6-china-cidades",
            title: "Cidades da China",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            newHanzi: ["北", "京", "上", "海", "广", "州", "深", "圳", "省", "市", "东", "南", "单", "超", "热", "洗", "手", "间"],
            libraryItems: [
              "chunk:beijing",
              "chunk:shanghai",
              "chunk:guangzhou",
              "chunk:shenzhen",
              "chunk:zhongguo",
              "chunk:beijingzainali",
              "chunk:beijingzaizhongguo",
              "chunk:woqubeijing",
              "chunk:woyaoqubeijing",
              "chunk:woyaoqushanghai",
              "chunk:wozaibeijing",
              "chunk:beijinghuochezhanzainali",
              "chunk:beijingshi",
              "chunk:guangdongsheng",
            ],
            reviewItems: [
              "chunk:zhongguo",
              "chunk:zaina",
              "chunk:woquchaoshi",
              "char:qu_go",
              "char:zai",
            ],
            steps: [
              intro(
                "China real",
                "Cidades reais entram como linguagem: reconhecer, localizar, ir e pedir a estação — não como lista para decorar."
              ),
              flash("beijing"),
              flash("shanghai"),
              flash("guangzhou"),
              flash("shenzhen"),
              listen("北京", "Běijīng", "Pequim"),
              listen("上海", "Shànghǎi", "Xangai"),
              listen("广州", "Guǎngzhōu", "Guangzhou"),
              listen("深圳", "Shēnzhèn", "Shenzhen"),
              placeLabel(
                "Qual cidade?",
                "Qual destas é Pequim?",
                "北京",
                ["北京", "上海", "广州", "深圳"],
                "cidade",
                "北京 = Pequim (capital)."
              ),
              cityContext(
                "Onde fica?",
                "Você quer saber onde fica Pequim.",
                "北京在哪里？",
                ["北京在哪里？", "你好吗？", "买单", "菜单"],
                "beijing",
                "北京在哪里？ localiza a cidade."
              ),
              cityContext(
                "Na China",
                "Alguém pergunta onde fica Pequim. Responda com o país.",
                "北京在中国。",
                ["北京在中国。", "我很好", "天气很热", "再见"],
                "beijing"
              ),
              listen("我去北京。", "wǒ qù Běijīng.", "Eu vou a Pequim."),
              sentenceBuild(
                "Monte: vou a Pequim",
                "Monte a frase.",
                ["我", "去", "北", "京"],
                ["我", "去", "北", "京", "海"],
                "我去北京 = vou a Pequim."
              ),
              cityContext(
                "Quero viajar",
                "Você está indo para Pequim.",
                "我要去北京。",
                ["我要去北京。", "我要票", "你好", "菜单"],
                "beijing"
              ),
              cityContext(
                "Xangai também",
                "Agora o destino é Xangai.",
                "我要去上海。",
                ["我要去上海。", "我要去北京。", "超市在哪里？", "买单"],
                "shanghai"
              ),
              cityContext(
                "Já cheguei",
                "Você está em Pequim.",
                "我在北京。",
                ["我在北京。", "我去北京。", "谢谢", "再见"],
                "beijing"
              ),
              cityContext(
                "Estação em Pequim",
                "Você chegou em Pequim e precisa encontrar a estação.",
                "北京火车站在哪里？",
                ["北京火车站在哪里？", "你好吗？", "我很好", "菜单"],
                "beijing",
                "北京火车站在哪里？ combina cidade + transporte."
              ),
              flash("beijingshi"),
              flash("guangdongsheng"),
              dialogue(
                "Município",
                "Como se diz o município de Pequim?",
                "北京市",
                ["北京市", "广东省", "南京路", "洗手间"],
                "北京市 = município de Pequim."
              ),
            ],
          }),
          withLessonDefaults({
            id: "p6-china-cidades-2",
            title: "Mais cidades: Chengdu, Xi'an, Nanjing",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            newHanzi: ["成", "都", "西", "安", "南", "京", "四", "川", "菜", "辣", "古", "城", "老", "这", "里", "上", "海", "机", "场", "房", "卡", "微", "信", "支", "付", "北", "深", "圳", "单"],
            libraryItems: [
              "chunk:chengdu",
              "chunk:xian",
              "chunk:nanjing",
              "chunk:woquchengdu",
              "chunk:sichuancai",
              "chunk:la",
              "chunk:bula",
              "chunk:woyaosichuancai",
              "chunk:gucheng",
              "chunk:zhelihenlao",
              "chunk:woquxian",
              "chunk:shanghaijichang",
            ],
            reviewItems: [
              "chunk:beijing",
              "chunk:shanghai",
              "chunk:woyaoqubeijing",
              "chunk:caidan",
              "chunk:ditie",
            ],
            steps: [
              intro(
                "Cada cidade, uma função",
                "Chengdu traz comida (四川菜 / 辣). Xi'an traz história (古城). Nanjing reaparece com rua e turismo. Não é lista — é linguagem útil."
              ),
              flash("chengdu"),
              flash("xian"),
              flash("nanjing"),
              placeLabel(
                "Chengdu",
                "Qual destas é Chengdu?",
                "成都",
                ["成都", "西安", "南京", "北京"],
                "cidade",
                "成都 = Chengdu (Sichuan)."
              ),
              cityContext(
                "Vou a Chengdu",
                "Você está indo para Chengdu.",
                "我去成都。",
                ["我去成都。", "我很好", "再见", "菜单"],
                "chengdu"
              ),
              flash("sichuancai"),
              flash("la"),
              flash("bula"),
              menuReading(
                "Cardápio em Chengdu",
                "No cardápio: o que é comida de Sichuan?",
                [
                  { hanzi: "四川菜", pinyin: "Sìchuān cài", meaningPt: "comida de Sichuan", priceHanzi: "38元" },
                  { hanzi: "茶", pinyin: "chá", meaningPt: "chá", priceHanzi: "8元" },
                  { hanzi: "水", pinyin: "shuǐ", meaningPt: "água", priceHanzi: "3元" },
                ],
                "四川菜",
                ["四川菜", "茶", "水", "古城"],
                "四川菜 é o prato típico de Chengdu."
              ),
              cityContext(
                "Pedir Sichuan",
                "No restaurante em Chengdu, peça comida de Sichuan.",
                "我要四川菜。",
                ["我要四川菜。", "我很好", "再见", "古城"],
                "chengdu"
              ),
              dialogue(
                "Picante?",
                "Você não quer picante. O que diz?",
                "不辣",
                ["不辣", "辣", "谢谢", "再见"],
                "不辣 = não picante."
              ),
              placeLabel(
                "Xi'an",
                "Qual destas é Xi'an?",
                "西安",
                ["西安", "成都", "南京", "上海"],
                "cidade"
              ),
              flash("gucheng"),
              flash("zhelihenlao"),
              cityContext(
                "Turismo em Xi'an",
                "Você visita a cidade antiga de Xi'an. O que combina dizer?",
                "这里很老。",
                ["这里很老。", "我要四川菜。", "微信支付", "再见"],
                "xian",
                "这里很老 comenta o caráter histórico."
              ),
              cityContext(
                "Vou a Xi'an",
                "Seu destino é Xi'an.",
                "我去西安。",
                ["我去西安。", "我去成都。", "菜单", "谢谢"],
                "xian"
              ),
              placeLabel(
                "Nanjing",
                "Qual destas é Nanjing?",
                "南京",
                ["南京", "成都", "西安", "深圳"],
                "cidade"
              ),
              flash("shanghaijichang"),
              dialogue(
                "Xangai + transporte",
                "Como se diz o aeroporto de Xangai?",
                "上海机场",
                ["上海机场", "四川菜", "古城", "房卡"],
                "上海机场 combina cidade + transporte."
              ),
            ],
          }),
          withLessonDefaults({
            id: "p6-china-ruas",
            title: "Ruas e endereços",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            newHanzi: ["路", "街", "号", "区", "人", "民", "北", "京", "上", "海", "南", "地", "铁", "医", "院", "单", "酒"],
            libraryItems: [
              "char:lu_road",
              "char:jie_street",
              "char:hao_number",
              "chunk:beijinglu",
              "chunk:nanjinglu",
              "chunk:renminlu",
              "chunk:zhongshanlu",
              "chunk:changanjie",
              "chunk:wozainanjinglu",
              "chunk:beijinglu10hao",
              "chunk:shanghai_nanjinglu20hao",
              "chunk:ditiezhan",
              "chunk:nanjingluditiezhan",
            ],
            reviewItems: [
              "chunk:beijing",
              "chunk:shanghai",
              "chunk:wozaibeijing",
              "char:zai",
            ],
            steps: [
              intro(
                "Ruas que você verá",
                "路 e 街 aparecem o tempo todo na China. Aprenda a reconhecer a placa e a dizer onde você está."
              ),
              listen("路", "lù", "rua; avenida"),
              listen("街", "jiē", "rua"),
              listen("号", "hào", "número (endereço)"),
              placeLabel(
                "Isto é uma rua?",
                "Qual destas é uma rua/avenida?",
                "路",
                ["路", "站", "省", "茶"],
                "rua",
                "路 = rua/avenida."
              ),
              flash("beijinglu"),
              flash("nanjinglu"),
              flash("renminlu"),
              flash("zhongshanlu"),
              flash("changanjie"),
              placeLabel(
                "Ler a placa",
                "Qual palavra aparece nesta placa urbana?",
                "南京路",
                ["南京路", "北京", "医院", "菜单"],
                "rua",
                "南京路 = Nanjing Road (rua), não a cidade sozinha."
              ),
              cityContext(
                "Significado",
                "北京路 significa o quê?",
                "Beijing Road",
                ["Beijing Road", "estação de metrô", "província", "cardápio"],
                "beijing"
              ),
              addressBuild(
                "Endereço curto",
                "Monte: Beijing Road, número 10.",
                ["北京", "路", "10", "号"],
                ["北京", "路", "10", "号", "街", "站"],
                "北京路10号 é um endereço pedagógico simples."
              ),
              sentenceBuild(
                "Onde estou?",
                "Monte: estou na Nanjing Road.",
                ["我", "在", "南", "京", "路"],
                ["我", "在", "南", "京", "路", "站"],
                "我在南京路。"
              ),
              addressBuild(
                "Endereço em Xangai",
                "Monte um endereço pedagógico em Xangai.",
                ["上", "海", "市", "南", "京", "路", "20", "号"],
                ["上", "海", "市", "南", "京", "路", "20", "号", "省"],
                "上海市南京路20号 — cidade + rua + número."
              ),
              flash("ditiezhan"),
              cityContext(
                "Na Nanjing Road",
                "Você está na 南京路 e precisa encontrar o metrô.",
                "南京路地铁站在哪里？",
                ["南京路地铁站在哪里？", "我很好", "买单", "你好吗？"],
                "shanghai",
                "Combina rua real + transporte urbano."
              ),
              dialogue(
                "Estação de metrô",
                "Como se diz estação de metrô?",
                "地铁站",
                ["地铁站", "火车站", "北京路", "菜单"],
                "地铁站 = estação de metrô."
              ),
              dialogue(
                "Hotel na cena",
                "Depois da rua, você procura o hotel. O que pergunta?",
                "酒店在哪里？",
                ["酒店在哪里？", "我很好", "菜单", "再见"],
                "酒店在哪里？ fecha a cena urbana."
              ),
            ],
          }),
          withLessonDefaults({
            id: "p6-saude",
            title: "Saúde",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // Chars de saúde que só têm gloss (院, 下 e 班 entram via 医院/我下班).
            newHanzi: ["病", "头", "疼", "医", "了", "看", "院", "下", "班"],
            libraryItems: [
              "chunk:wobingle",
              "chunk:wotouteng",
              "chunk:woyaokanyisheng",
              "chunk:yiyuanzainali",
            ],
            reviewItems: [
              "chunk:wobingle",
              "chunk:wotouteng",
              "chunk:woyaokanyisheng",
              "chunk:yiyuanzainali",
              "chunk:xiexie",
              "chunk:nihao",
            ],
            steps: [
              intro(
                "Estar doente",
                "Para falar de saúde você precisa de três blocos: dizer que está doente, apontar a dor e pedir o médico. E saber onde fica o hospital."
              ),
              listen("我病了", "wǒ bìng le", "Estou doente"),
              listen("我头疼", "wǒ tóu téng", "Estou com dor de cabeça"),
              listen("我要看医生", "wǒ yào kàn yīshēng", "Quero ver um médico"),
              match(
                "O que dizer?",
                "Combine a situação com a frase.",
                [
                  { left: "我病了", right: "estou doente", leftType: "hanzi", rightType: "pt" },
                  { left: "我头疼", right: "dor de cabeça", leftType: "hanzi", rightType: "pt" },
                  { left: "我要看医生", right: "quero ver médico", leftType: "hanzi", rightType: "pt" },
                  { left: "医院在哪里？", right: "onde fica o hospital", leftType: "hanzi", rightType: "pt" },
                ],
                "Doente → dor → médico → hospital: o caminho da saúde."
              ),
              listenSelect("O que você ouviu?", "我头疼", ["我病了", "我头疼", "我要看医生", "谢谢"], "我头疼", "我头疼 é dor de cabeça."),
              comp("我病了", "wǒ bìng le", "Estou doente.", ["Estou doente.", "Estou com dor de cabeça.", "Quero ver um médico.", "Estou bem."]),
              sentenceBuild(
                "Monte: quero ver o médico",
                "Monte a frase.",
                ["我", "要", "看", "医", "生"],
                ["我", "要", "看", "医", "生", "病"],
                "我要看医生 = quero ver um médico."
              ),
              sentenceBuild(
                "Monte: dor de cabeça",
                "Monte a frase.",
                ["我", "头", "疼"],
                ["我", "头", "疼", "病"],
                "我头疼 = estou com dor de cabeça."
              ),
              fillBlank(
                "Complete: estou doente",
                "Complete: estou doente.",
                "我",
                "病",
                "了",
                ["病", "疼"],
                "我病了 = estou doente."
              ),
              dialogue(
                "Na emergência",
                "Você precisa de médico. O que diz?",
                "我要看医生",
                ["我要看医生", "我头疼", "我下班", "谢谢"],
                "我要看医生 pede o médico.",
                "Situação"
              ),
              dialogue(
                "Onde há médico?",
                "Quer saber onde fica o hospital. O que pergunta?",
                "医院在哪里？",
                ["医院在哪里？", "现在几点？", "我很好", "再见"],
                "医院在哪里？ acha o hospital.",
                "Situação"
              ),
            ],
          }),
          withLessonDefaults({
            id: "p6-horarios",
            title: "Que horas são?",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // 午 é o único char só-gloss usado aqui (中 está em CHARACTERS).
            newHanzi: ["午"],
            libraryItems: [
              "chunk:xianzaijidian",
              "chunk:xianzaibadian",
              "chunk:xianzaijiudian",
              "chunk:zhongwu",
            ],
            reviewItems: [
              "chunk:xianzaijidian",
              "chunk:xianzaibadian",
              "chunk:xianzaijiudian",
              "chunk:zhongwu",
              "chunk:zaoshanghao",
              "chunk:wanan",
            ],
            steps: [
              intro(
                "Que horas são?",
                "Perguntar a hora é essencial: 现在几点？ (que horas são?). As respostas usam os números que você já sabe, com 点 (hora)."
              ),
              listen("现在几点？", "xiànzài jǐ diǎn?", "Que horas são?"),
              listen("现在八点", "xiànzài bā diǎn", "São oito horas"),
              listen("现在九点", "xiànzài jiǔ diǎn", "São nove horas"),
              listen("中午", "zhōngwǔ", "Meio-dia"),
              match(
                "Combine a hora",
                "Combine cada relógio com a frase.",
                [
                  { left: "八点", right: "8 horas", leftType: "hanzi", rightType: "pt" },
                  { left: "九点", right: "9 horas", leftType: "hanzi", rightType: "pt" },
                  { left: "中午", right: "meio-dia", leftType: "hanzi", rightType: "pt" },
                ],
                "八点 é 8h, 九点 é 9h, 中午 é meio-dia."
              ),
              listenSelect("Que horas?", "九点", ["八点", "九点", "中午", "现在几点"], "九点", "九点 = 9 horas."),
              comp("现在几点？", "xiànzài jǐ diǎn?", "Que horas são?", ["Que horas são?", "São oito horas.", "Meio-dia.", "Estou bem."]),
              sentenceBuild(
                "Monte a pergunta",
                "Monte: que horas são?",
                ["现", "在", "几", "点"],
                ["现", "在", "几", "点", "八"],
                "现在几点？ pergunta a hora."
              ),
              sentenceBuild(
                "Monte: são oito",
                "Monte: são oito horas.",
                ["现", "在", "八", "点"],
                ["现", "在", "八", "点", "九"],
                "现在八点 = são oito horas."
              ),
              fillBlank(
                "Complete: meio-dia",
                "Complete: meio-dia.",
                "中",
                "午",
                "",
                ["午", "点"],
                "中午 = meio-dia."
              ),
              dialogue(
                "Pergunte a hora",
                "Você quer saber as horas. O que pergunta?",
                "现在几点？",
                ["现在几点？", "现在八点", "中午", "再见"],
                "现在几点？ pergunta as horas.",
                "Situação"
              ),
              dialogue(
                "Responda a hora",
                "São nove horas. O que você diz?",
                "现在九点",
                ["现在九点", "现在八点", "中午", "我很好"],
                "现在九点 = são nove horas.",
                "Situação"
              ),
            ],
          }),
          microLesson({
            id: "p6-natureza",
            title: "A natureza",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // Elementos vistos em lições antigas (山/水/火/木/日/月/林/森) + os novos.
            newHanzi: ["云", "雨", "树", "花", "星", "上", "下"],
            libraryItems: [
              "chunk:tianshangyouyun",
              "chunk:shanshangyoushu",
              "chunk:shuililiyouyu",
              "chunk:xiayule",
              "chunk:huahaokan",
              "chunk:tianshangdexingxing",
            ],
            reviewItems: [
              "chunk:tianshangyouyun",
              "chunk:shanshangyoushu",
              "chunk:shuililiyouyu",
              "chunk:xiayule",
              "chunk:huahaokan",
              "chunk:tianshangdexingxing",
              "char:shan",
              "char:shui",
              "char:mu",
            ],
            steps: [
              intro(
                "O mundo ao redor",
                "Natureza em mandarim usa elementos que você já conhece: 山 (montanha), 水 (água), 木 (árvore). Agora você junta tudo em frases sobre o céu, a chuva e as estrelas."
              ),
              listen("山", "shān", "montanha"),
              listen("水", "shuǐ", "água"),
              listen("木", "mù", "árvore; madeira"),
              imageChoice(
                "choose_meaning",
                "mountain",
                "O que esta imagem mostra?",
                "montanha",
                visualMeaningOptions("mountain"),
                { explanation: "山 (shān) = montanha." }
              ),
              imageChoice(
                "choose_hanzi",
                "water",
                "Qual hànzì combina com a água?",
                "水",
                visualHanziOptions("water"),
                { explanation: "水 (shuǐ) = água." }
              ),
              match(
                "Elementos da natureza",
                "Combine cada elemento com o sentido.",
                [
                  { left: "山", right: "montanha", leftType: "hanzi", rightType: "pt" },
                  { left: "水", right: "água", leftType: "hanzi", rightType: "pt" },
                  { left: "木", right: "árvore", leftType: "hanzi", rightType: "pt" },
                ],
                "山 é montanha, 水 é água, 木 é árvore."
              ),
              listen("天上有云", "tiān shàng yǒu yún", "Há nuvens no céu"),
              listen("山上有树", "shān shàng yǒu shù", "Há árvores na montanha"),
              listen("水里有鱼", "shuǐ lǐ yǒu yú", "Há peixes na água"),
              comp("下雨了", "xià yǔ le", "Está chovendo.", ["Está chovendo.", "Está ventando.", "Há nuvens.", "Estou bem."]),
              listen("花好看", "huā hǎo kàn", "A flor é bonita"),
              listen("天上的星星", "tiān shàng de xīngxing", "As estrelas no céu"),
              sentenceBuild(
                "Monte: nuvens no céu",
                "Monte: há nuvens no céu.",
                ["天", "上", "有", "云"],
                ["天", "上", "有", "云", "雨"],
                "天上有云 = há nuvens no céu."
              ),
              sentenceBuild(
                "Monte: chuva",
                "Monte: está chovendo.",
                ["下", "雨", "了"],
                ["下", "雨", "了", "云"],
                "下雨了 = está chovendo."
              ),
              fillBlank(
                "Complete: árvores",
                "Complete: há árvores na montanha.",
                "山上",
                "有树",
                "",
                ["有树", "有云", "有鱼"],
                "山上有树 = há árvores na montanha."
              ),
              dialogue(
                "Descreva o dia",
                "O céu está cheio de nuvens. O que você diz?",
                "天上有云",
                ["天上有云", "下雨了", "水里有鱼", "花好看"],
                "天上有云 descreve as nuvens no céu.",
                "Situação"
              ),
              dialogue(
                "Chuva chegando",
                "Começa a chover. O que você diz?",
                "下雨了",
                ["下雨了", "天上有云", "山上有树", "我很好"],
                "下雨了 = está chovendo.",
                "Situação"
              ),
            ],
          }),
          microLesson({
            id: "p6-clima",
            title: "O tempo (clima)",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // 雨/云/下 já vistos em p6-natureza; novos: 冷/晴/雪/风.
            newHanzi: ["冷", "晴", "雪", "风", "雨", "云", "下", "热"],
            libraryItems: [
              "chunk:jintiantianqihenhao",
              "chunk:tianqihenre",
              "chunk:tianqihenleng",
              "chunk:xiaxuele",
              "chunk:tianqingle",
              "chunk:youfeng",
              "chunk:xiayule",
            ],
            reviewItems: [
              "chunk:jintiantianqihenhao",
              "chunk:tianqihenre",
              "chunk:tianqihenleng",
              "chunk:xiaxuele",
              "chunk:tianqingle",
              "chunk:youfeng",
              "chunk:xiayule",
              "chunk:jintianhenhao",
            ],
            steps: [
              intro(
                "Que tempo faz?",
                "Para falar do clima: 天气 (o tempo) + 很热 (quente) ou 很冷 (frio). E 下雨了 / 下雪了 dizem que está chovendo ou nevando."
              ),
              listen("天气很热", "tiānqì hěn rè", "O tempo está quente"),
              listen("天气很冷", "tiānqì hěn lěng", "O tempo está frio"),
              listen("有风", "yǒu fēng", "Está ventando"),
              match(
                "Quente ou frio?",
                "Combine cada clima com a sensação.",
                [
                  { left: "热", right: "quente", leftType: "hanzi", rightType: "pt" },
                  { left: "冷", right: "frio", leftType: "hanzi", rightType: "pt" },
                  { left: "风", right: "vento", leftType: "hanzi", rightType: "pt" },
                ],
                "热 é quente, 冷 é frio, 风 é vento."
              ),
              listen("今天天气很好", "jīntiān tiānqì hěn hǎo", "Hoje o tempo está ótimo"),
              listen("下雨了", "xià yǔ le", "Está chovendo"),
              listen("下雪了", "xià xuě le", "Está nevando"),
              listen("天晴了", "tiān qíng le", "O céu abriu"),
              comp("今天天气很好", "jīntiān tiānqì hěn hǎo", "Hoje o tempo está ótimo.", [
                "Hoje o tempo está ótimo.",
                "Está nevando.",
                "Está ventando.",
                "São nove horas.",
              ]),
              sentenceBuild(
                "Monte: quente",
                "Monte: o tempo está quente.",
                ["天", "气", "很", "热"],
                ["天", "气", "很", "热", "冷"],
                "天气很热 = o tempo está quente."
              ),
              sentenceBuild(
                "Monte: frio",
                "Monte: o tempo está frio.",
                ["天", "气", "很", "冷"],
                ["天", "气", "很", "冷", "热"],
                "天气很冷 = o tempo está frio."
              ),
              fillBlank(
                "Complete: nevando",
                "Complete: está nevando.",
                "下",
                "雪",
                "了",
                ["雪", "雨", "风"],
                "下雪了 = está nevando."
              ),
              dialogue(
                "Como está o dia?",
                "Alguém pergunta como está o tempo hoje. O que você responde?",
                "今天天气很好",
                ["今天天气很好", "下雪了", "天晴了", "天气很冷"],
                "今天天气很好 comenta o tempo de hoje.",
                "Amigo"
              ),
              dialogue(
                "Que calor!",
                "Está muito quente. O que você diz?",
                "天气很热",
                ["天气很热", "天气很冷", "有风", "下雨了"],
                "天气很热 = o tempo está quente.",
                "Situação"
              ),
            ],
          }),
          microLesson({
            id: "p6-direcoes",
            title: "Direções",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // 走/在 já existem; novos: 左/右/前/后/边/直/往/南/路 + mapa (转/怎) e distractores.
            newHanzi: ["左", "右", "前", "后", "边", "直", "往", "南", "面", "转", "怎", "单"],
            libraryItems: [
              "chunk:zuobian",
              "chunk:youbian",
              "chunk:qianmian",
              "chunk:houmian",
              "chunk:zhizou",
              "chunk:wangzuozou",
              "chunk:wangyouzou",
              "chunk:nanbian",
              "chunk:zenmezou",
              "chunk:zuozhuan",
              "chunk:youzhuan",
              "chunk:yizhizou",
              "chunk:ditiezhan",
              "chunk:nanjingluditiezhan",
            ],
            reviewItems: [
              "chunk:zuobian",
              "chunk:youbian",
              "chunk:qianmian",
              "chunk:houmian",
              "chunk:zhizou",
              "chunk:wangzuozou",
              "chunk:wangyouzou",
              "chunk:nanbian",
              "chunk:zaina",
              "chunk:chezainali",
              "chunk:nanjinglu",
            ],
            steps: [
              intro(
                "Para onde vou?",
                "Pedir e dar direções: 左边 (à esquerda), 右边 (à direita), 前面 (em frente), 后面 (atrás). E 直走 (siga em frente) ou 往左走 (vá para a esquerda)."
              ),
              listen("左边", "zuǒbiān", "À esquerda"),
              listen("右边", "yòubiān", "À direita"),
              listen("前面", "qiánmiàn", "Em frente"),
              listen("后面", "hòumiàn", "Atrás"),
              match(
                "Lados e posições",
                "Combine cada direção com o sentido.",
                [
                  { left: "左边", right: "à esquerda", leftType: "hanzi", rightType: "pt" },
                  { left: "右边", right: "à direita", leftType: "hanzi", rightType: "pt" },
                  { left: "前面", right: "em frente", leftType: "hanzi", rightType: "pt" },
                  { left: "后面", right: "atrás", leftType: "hanzi", rightType: "pt" },
                ],
                "左边/右边/前面/后面 cobrem os quatro lados."
              ),
              listen("直走", "zhí zǒu", "Siga em frente"),
              listen("往左走", "wǎng zuǒ zǒu", "Vá para a esquerda"),
              listen("往右走", "wǎng yòu zǒu", "Vá para a direita"),
              listen("南边", "nánbiān", "Ao sul"),
              flash("zenmezou"),
              flash("zuozhuan"),
              flash("youzhuan"),
              flash("yizhizou"),
              mapDirection(
                "Mapa: vire à esquerda",
                "酒店",
                "地铁站",
                "left",
                ["left", "right", "straight"],
                {
                  promptPt: "Do hotel ao metrô: o que você faz?",
                  mapScaffoldLevel: 1,
                  explanation: "左转 = vire à esquerda.",
                }
              ),
              mapDirection(
                "Mapa: siga em frente",
                "银行",
                "公园",
                "straight",
                ["left", "right", "straight"],
                {
                  prompt: "一直走",
                  mapScaffoldLevel: 2,
                  explanation: "一直走 = siga em frente.",
                }
              ),
              mapDirection(
                "Ouça e navegue",
                "南京路",
                "地铁站",
                "right",
                ["left", "right", "straight"],
                {
                  audioText: "右转",
                  mapScaffoldLevel: 3,
                  explanation: "右转 = vire à direita.",
                }
              ),
              comp("直走", "zhí zǒu", "Siga em frente.", ["Siga em frente.", "Vá para a esquerda.", "Atrás.", "Está ventando."]),
              sentenceBuild(
                "Monte: à esquerda",
                "Monte: à esquerda.",
                ["左", "边"],
                ["左", "边", "右"],
                "左边 = à esquerda."
              ),
              sentenceBuild(
                "Monte: siga em frente",
                "Monte: siga em frente.",
                ["直", "走"],
                ["直", "走", "左"],
                "直走 = siga em frente."
              ),
              sentenceBuild(
                "Monte: vá para a direita",
                "Monte: vá para a direita.",
                ["往", "右", "走"],
                ["往", "右", "走", "左"],
                "往右走 = vá para a direita."
              ),
              dialogue(
                "Aonde é o banco?",
                "Você procura o banco. A pessoa responde: à direita. O que ela diz?",
                "右边",
                ["右边", "左边", "前面", "南边"],
                "右边 = à direita.",
                "Passante"
              ),
              cityContext(
                "Como chegar?",
                "Você está na 南京路 e quer saber como chegar ao metrô.",
                "怎么走？",
                ["怎么走？", "我很好", "买单", "菜单"],
                "shanghai",
                "怎么走？ pede o caminho."
              ),
              mapDirection(
                "Só chinês",
                "南京路",
                "地铁站",
                "left",
                ["left", "right", "straight", "destination"],
                {
                  prompt: "左转",
                  mapScaffoldLevel: 4,
                  explanation: "No domínio, a instrução vem só em chinês.",
                }
              ),
            ],
          }),
          microLesson({
            id: "p6-compras",
            title: "Compras: roupas e itens",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // 买/这/个/多/少/钱/水/机 já existem; novos: 衣/服/鞋/双/件/苹/果/香/蕉/牛/奶/手.
            newHanzi: ["衣", "服", "鞋", "双", "件", "苹", "果", "香", "蕉", "牛", "奶", "手", "元", "单"],
            libraryItems: [
              "chunk:woyaomaiyifu",
              "chunk:zhejianyifuduoshaoqian",
              "chunk:woyaozheshuangxie",
              "chunk:woyaozhegepingguo",
              "chunk:woyaoxiangjiao",
              "chunk:woyaoniunai",
              "chunk:woyaoshouji",
              "chunk:duoshaoqian",
            ],
            reviewItems: [
              "chunk:woyaomaiyifu",
              "chunk:zhejianyifuduoshaoqian",
              "chunk:woyaozheshuangxie",
              "chunk:woyaozhegepingguo",
              "chunk:woyaoxiangjiao",
              "chunk:woyaoniunai",
              "chunk:woyaoshouji",
              "chunk:duoshaoqian",
              "chunk:zhegeduoshaoqian",
              "char:mai_buy",
            ],
            steps: [
              intro(
                "Fazendo compras",
                "Você já sabe pedir com 我要. Agora entra o vocabulário de loja: 买 (comprar), roupas (衣服, 鞋) e itens do dia a dia (苹果, 香蕉, 牛奶, 手机)."
              ),
              listen("我要买衣服", "wǒ yào mǎi yīfu", "Quero comprar roupa"),
              listen("这件衣服多少钱？", "zhè jiàn yīfu duōshao qián?", "Quanto custa esta roupa?"),
              listen("我要这双鞋", "wǒ yào zhè shuāng xié", "Quero estes sapatos"),
              match(
                "O que comprar",
                "Combine cada item com o sentido.",
                [
                  { left: "衣服", right: "roupa", leftType: "hanzi", rightType: "pt" },
                  { left: "鞋", right: "sapato", leftType: "hanzi", rightType: "pt" },
                  { left: "手机", right: "celular", leftType: "hanzi", rightType: "pt" },
                ],
                "衣服 é roupa, 鞋 é sapato, 手机 é celular."
              ),
              listen("我要这个苹果", "wǒ yào zhège píngguǒ", "Quero esta maçã"),
              listen("我要香蕉", "wǒ yào xiāngjiāo", "Quero banana"),
              listen("我要牛奶", "wǒ yào niúnǎi", "Quero leite"),
              imageChoice(
                "choose_image",
                "apple",
                "Qual imagem combina com 苹果?",
                "apple",
                ["apple", "milk", "tea", "rice"],
                { explanation: "苹果 (píngguǒ) = maçã; 牛奶 é leite e 茶 é chá." }
              ),
              imageChoice(
                "listen_and_choose_image",
                "phone",
                "Ouça e escolha o item correto.",
                "phone",
                ["phone", "book", "car", "ticket"],
                { explanation: "手机 (shǒujī) = celular." }
              ),
              comp("这件衣服多少钱？", "zhè jiàn yīfu duōshao qián?", "Quanto custa esta roupa?", [
                "Quanto custa esta roupa?",
                "Quero estes sapatos.",
                "Siga em frente.",
                "Está chovendo.",
              ]),
              sentenceBuild(
                "Monte: comprar roupa",
                "Monte: quero comprar roupa.",
                ["我", "要", "买", "衣", "服"],
                ["我", "要", "买", "衣", "服", "鞋"],
                "我要买衣服 = quero comprar roupa."
              ),
              sentenceBuild(
                "Monte: sapatos",
                "Monte: quero estes sapatos.",
                ["我", "要", "这", "双", "鞋"],
                ["我", "要", "这", "双", "鞋", "衣"],
                "我要这双鞋 = quero estes sapatos."
              ),
              fillBlank(
                "Complete: maçã",
                "Complete: quero esta maçã.",
                "我要这个",
                "苹果",
                "",
                ["苹果", "香蕉", "牛奶"],
                "我要这个苹果 = quero esta maçã."
              ),
              dialogue(
                "Entre na loja",
                "Você entra na loja e quer comprar roupa. O que diz?",
                "我要买衣服",
                ["我要买衣服", "我要这双鞋", "我要香蕉", "我要牛奶"],
                "我要买衣服 anuncia o que você procura.",
                "Vendedor"
              ),
              dialogue(
                "Pergunte o preço",
                "Você gostou de uma roupa. O que pergunta?",
                "这件衣服多少钱？",
                ["这件衣服多少钱？", "我要香蕉", "我要牛奶", "我要手机"],
                "这件衣服多少钱？ pergunta o preço da peça.",
                "Vendedor"
              ),
              dialogue(
                "Feche a compra",
                "A maçã te agradou. O que você diz ao vendedor?",
                "我要这个苹果",
                ["我要这个苹果", "我要买衣服", "我要香蕉", "我要牛奶"],
                "我要这个苹果 fecha a compra apontando o item.",
                "Vendedor"
              ),
              priceTask(
                "Etiqueta",
                "A etiqueta mostra 28元. Qual é o preço?",
                "28元",
                "28元",
                ["28元", "8元", "50元", "菜单"],
                "28元 = vinte e oito yuan."
              ),
            ],
          }),
          withLessonDefaults({
            id: "p6-survival-mandarin",
            title: "Survival: pagar, hotel, ajuda",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            newHanzi: [
              "现",
              "金",
              "微",
              "信",
              "支",
              "付",
              "宝",
              "刷",
              "卡",
              "充",
              "电",
              "器",
              "护",
              "照",
              "房",
              "间",
              "前",
              "台",
              "出",
              "口",
              "入",
              "需",
              "要",
              "帮",
              "助",
              "洗",
              "手",
              "元",
              "可",
              "以",
              "古",
              "城",
              "川",
              "辣",
              "单",
              "直",
              "转",
              "地",
              "铁",
              "酒",
              "北",
              "京",
              "上",
              "海",
              "午",
              "广",
              "州",
            ],
            libraryItems: [
              "chunk:xianjin",
              "chunk:weixinzhifu",
              "chunk:zhifubao",
              "chunk:keyishuaka",
              "chunk:shouji_device",
              "chunk:chongdian",
              "chunk:chongdianqi",
              "chunk:wifi",
              "chunk:huzhao",
              "chunk:fangjian",
              "chunk:fangka",
              "chunk:qiantai",
              "chunk:xishoujianzainali",
              "chunk:woxuyaobangzhu",
              "chunk:chuko",
              "chunk:ruko",
              "chunk:ershibayuan",
              "chunk:yiyuanzainali",
            ],
            reviewItems: [
              "chunk:duoshaoqian",
              "chunk:woyao",
              "chunk:ditiezhan",
              "chunk:jiudianzainali",
            ],
            steps: [
              intro(
                "Mandarim utilizável",
                "Pagamento, celular, hotel e necessidades: o que um visitante realmente pede nas primeiras semanas."
              ),
              flash("xianjin"),
              flash("weixinzhifu"),
              listen("微信支付", "Wēixìn zhīfù", "WeChat Pay."),
              flash("zhifubao"),
              flash("keyishuaka"),
              signReading(
                "WeChat Pay",
                "微信支付",
                "WeChat Pay",
                ["WeChat Pay", "passaporte", "saída", "quarto"],
                "payment"
              ),
              signReading(
                "Alipay",
                "支付宝",
                "Alipay",
                ["Alipay", "entrada", "celular", "ajuda"],
                "payment"
              ),
              dialogue(
                "Cartão?",
                "Você quer pagar com cartão. O que pergunta?",
                "可以刷卡吗？",
                ["可以刷卡吗？", "我很好", "再见", "古城"],
                "可以刷卡吗？ pergunta se aceitam cartão."
              ),
              flash("shouji_device"),
              flash("chongdian"),
              flash("chongdianqi"),
              flash("wifi"),
              dialogue(
                "Carregador",
                "A bateria acabou. O que você pede?",
                "充电器",
                ["充电器", "护照", "现金", "古城"],
                "充电器 = carregador."
              ),
              flash("huzhao"),
              flash("fangjian"),
              flash("fangka"),
              flash("qiantai"),
              signReading(
                "Recepção",
                "前台",
                "recepção",
                ["recepção", "saída", "Alipay", "picante"],
                "hotel"
              ),
              dialogue(
                "Check-in",
                "No hotel, o que você mostra na recepção?",
                "护照",
                ["护照", "四川菜", "辣", "菜单"],
                "护照 = passaporte."
              ),
              flash("chuko"),
              flash("ruko"),
              signReading(
                "Saída",
                "出口",
                "saída",
                ["saída", "entrada", "quarto", "Wi-Fi"],
                "exit"
              ),
              signReading(
                "Entrada",
                "入口",
                "entrada",
                ["entrada", "saída", "Alipay", "ajuda"],
                "entrance"
              ),
              flash("xishoujianzainali"),
              flash("woxuyaobangzhu"),
              cityContext(
                "Banheiro",
                "Você precisa do banheiro.",
                "洗手间在哪里？",
                ["洗手间在哪里？", "我很好", "菜单", "再见"],
                "shanghai"
              ),
              {
                kind: "reverse_recall",
                title: "Ajuda",
                situationPt: "Diga que precisa de ajuda.",
                body: "Diga que precisa de ajuda.",
                answer: "我需要帮助",
                accepts: ["我需要帮助", "我需要帮助。", "请帮助我"],
                mode: "free_reflection",
                isNoHint: true,
              },
              priceTask(
                "Preço na loja",
                "A etiqueta mostra 28元. Qual é o preço?",
                "28元",
                "28元",
                ["28元", "8元", "50元", "Wi-Fi"]
              ),
              routeSequence(
                "Caminho ao metrô",
                "Ordene o caminho: siga em frente, vire à esquerda, metrô.",
                ["一直走", "左转", "地铁站"],
                ["一直走", "左转", "地铁站", "右转", "酒店"]
              ),
              scheduleReading(
                "Horário do trem",
                "Qual trem vai para Pequim às 9?",
                [
                  { timeHanzi: "九点", destinationHanzi: "北京", labelPt: "9h → Pequim" },
                  { timeHanzi: "八点", destinationHanzi: "上海", labelPt: "8h → Xangai" },
                  { timeHanzi: "中午", destinationHanzi: "广州", labelPt: "meio-dia → Guangzhou" },
                ],
                "九点 → 北京",
                ["九点 → 北京", "八点 → 上海", "中午 → 广州", "右转"]
              ),
            ],
          }),
          withLessonDefaults({
            id: "l10-rev",
            title: "Revisão do módulo",
            skill: "fala",
            isReview: true,
            reviewMasteryMode: true,
            premium: true,
            newHanzi: ["多", "少", "饿", "饭", "菜", "肉", "鱼", "喝"],
            // Foco em chunks (não caracteres isolados) — evita trio de comprehend
            // intent:identify-concept sem transformação na revisão.
            libraryItems: [
              "chunk:woxihuan",
              "chunk:woxianghe",
              "chunk:duoshaoqian",
              "chunk:woele",
              "chunk:womenchifanba",
              "chunk:woyaofan",
              "chunk:woyaocai",
              "chunk:woyaoyu",
              "char:shui",
              "char:mu",
              "char:jia",
            ],
            reviewItems: [
              "chunk:woxihuan",
              "chunk:woxianghe",
              "chunk:duoshaoqian",
              "chunk:woele",
              "char:shui",
              "char:mu",
              "char:jia",
            ],
            steps: [
              flash("woxihuan"),
              flash("woxianghe"),
              flash("duoshaoqian"),
              imageChoice(
                "choose_image",
                "home",
                "Revisão: qual imagem combina com 家?",
                "home",
                visualImageOptions("home"),
                { explanation: "家 volta da unidade Família." }
              ),
              imageChoice(
                "choose_hanzi",
                "water",
                "Revisão: qual hànzì combina com água?",
                "水",
                visualHanziOptions("water"),
                { explanation: "水 volta enquanto você revisa pedidos de bebida." }
              ),
              hanziBuild("hb-shui-fragments", "Monte 水", "Revisão: monte o hànzì de água.", "水", "água"),
              hanziBuild("hb-mu-fragments", "Monte 木", "Revisão: monte o hànzì de árvore.", "木", "árvore"),
              conversationScene("revisao-restaurante"),
            ],
          }),
        ],
      },
    ],
  },

  // ─── FASE 7 · Leitura Graduada (Premium) ─────────────────────────────────
  {
    id: "p7",
    order: 7,
    title: "Leitura Graduada",
    why: "Você já sabe o suficiente — agora leia uma história inteira, linha por linha.",
    tier: "intermediario",
    units: [
      {
        id: "u7-1",
        title: "Histórias curtas",
        subtitle: "Ler sem travar a cada linha",
        goal: "Ler um texto curto com áudio e tradução sob demanda.",
        color: "#2F6FB0",
        focusChunks: ["我有三个朋友", "我喜欢中文", "我想喝茶", "我们走吧"],
        focusHanzi: [],
        focusGrammar: ["leitura graduada com chunks conhecidos", "shadowing linha a linha"],
        focusSounds: ["wǒ yǒu sān ge péngyou", "wǒ xǐhuan Zhōngwén", "wǒ xiǎng hē chá"],
        focusSituations: ["ler história curta", "repetir em voz alta", "reconhecer chunks em texto"],
        lessons: [
          {
            id: "l29",
            title: "Eu e meus amigos",
            skill: "leitura",
            premium: true,
            masteryLoop: true,
            // Visto na cena de apontar a paisagem (那是山 / 那是日) e no livro (书).
            newHanzi: ["那", "书"],
            libraryItems: [
              "chunk:woxihuan",
              "chunk:woxianghe",
              "chunk:womenzouba",
              "chunk:zheshishu",
              "chunk:wokanshu",
              "char:shu_book",
            ],
            reviewItems: ["char:shu_book", "chunk:zheshishu", "chunk:wokanshu"],
            steps: [
              read([
                { hanzi: "我有三个朋友。", pinyin: "Wǒ yǒu sān ge péngyou.", pt: "Eu tenho três amigos." },
                { hanzi: "我喜欢中文。", pinyin: "Wǒ xǐhuan Zhōngwén.", pt: "Eu gosto de chinês." },
                { hanzi: "我想喝茶。", pinyin: "Wǒ xiǎng hē chá.", pt: "Quero beber chá." },
                { hanzi: "很好吃。", pinyin: "Hěn hǎochī.", pt: "Muito gostoso." },
                { hanzi: "我们走吧。", pinyin: "Wǒmen zǒu ba.", pt: "Vamos embora." },
              ]),
              flash("woxihuan"),
              flash("woxianghe"),
              flash("womenzouba"),
              comp("我有三个朋友。", "Wǒ yǒu sān ge péngyou.", "Eu tenho três amigos.", [
                "Eu tenho três amigos.",
                "Eu gosto de chinês.",
                "Quero beber chá.",
                "Vamos embora.",
              ]),
              comp("我喜欢中文。", "Wǒ xǐhuan Zhōngwén.", "Eu gosto de chinês.", [
                "Eu gosto de chinês.",
                "Eu tenho três amigos.",
                "Quero beber chá.",
                "Vamos embora.",
              ]),
              comp("我想喝茶。", "Wǒ xiǎng hē chá.", "Quero beber chá.", [
                "Quero beber chá.",
                "Eu gosto de chinês.",
                "Tenho três amigos.",
                "Vamos embora.",
              ]),
              comp("我们走吧。", "Wǒmen zǒu ba.", "Vamos embora.", [
                "Vamos embora.",
                "Quero beber chá.",
                "Eu gosto de chinês.",
                "Tenho três amigos.",
              ]),
              // 书: mostrar o livro enquanto lê — leitura vira objeto concreto.
              intro("O livro", "书 é livro. Na leitura, você também precisa apontar o objeto: isto é um livro."),
              listen("书", "shū", "livro"),
              imageChoice(
                "choose_meaning",
                "book",
                "O que esta imagem mostra?",
                "livro",
                visualMeaningOptions("book"),
                { explanation: "书 (shū) = livro." }
              ),
              imageChoice(
                "choose_hanzi",
                "book",
                "Qual hànzì combina com o livro?",
                "书",
                visualHanziOptions("book"),
                { explanation: "书 é o caractere de livro." }
              ),
              flash("zheshishu"),
              flash("wokanshu"),
              listen("这是书", "zhè shì shū", "Isto é um livro."),
              listen("我看书", "wǒ kàn shū", "Eu leio / olho o livro."),
              sentenceBuild(
                "Mostre o livro",
                "Monte: isto é um livro.",
                ["这", "是", "书"],
                ["这", "是", "书", "水", "茶"],
                "这是书 identifica o livro."
              ),
              dialogue(
                "Na sala",
                "O professor aponta um objeto. Como você diz que é um livro?",
                "这是书",
                ["这是书", "我想喝茶", "我们走吧", "太贵了"],
                "这是书 responde apontando o livro.",
                "Professor"
              ),
              conversationScene("mostrar-livro"),
            ],
          },
          {
            id: "l30",
            title: "Leitura em voz alta",
            skill: "leitura",
            premium: true,
            masteryLoop: true,
            // Vistos na conversa de loja (多少钱) e na paisagem.
            newHanzi: ["多", "少"],
            steps: [
              intro("Shadowing", "Ouça cada linha e repita em voz alta — é assim que a leitura vira fala."),
              listen("我有三个朋友。", "Wǒ yǒu sān ge péngyou.", "Eu tenho três amigos."),
              listen("我喜欢中文。", "Wǒ xǐhuan Zhōngwén.", "Eu gosto de chinês."),
              listen("我想喝茶。", "Wǒ xiǎng hē chá.", "Quero beber chá."),
              listen("我们走吧。", "Wǒmen zǒu ba.", "Vamos embora."),
              sentenceBuild(
                "Reconstrua o gosto",
                "Monte a linha: Eu gosto de chinês.",
                ["我", "喜欢", "中文"],
                ["中文", "喜欢", "我", "茶", "朋友"],
                "我喜欢中文 é uma linha curta de gosto."
              ),
              sentenceBuild(
                "Reconstrua o pedido",
                "Monte a linha: Quero beber chá.",
                ["我", "想", "喝", "茶"],
                ["茶", "想", "我", "喝", "走"],
                "我想喝茶 transforma leitura em fala útil."
              ),
              dialogue(
                "Fechar a cena",
                "Depois do chá e da conversa, qual frase encerra a cena?",
                "我们走吧",
                ["我们走吧", "我喜欢中文", "我想喝茶", "我有三个朋友"],
                "我们走吧 fecha a cena: vamos embora.",
                "Narrador"
              ),
              // Cena autoral: aplicar os hànzì de natureza numa conversa real
              // (这是什么？→ 这是木 / 那是日), apontando a paisagem.
              conversationScene("apontar-natureza"),
            ],
          },
          review("l11-rev", "leitura", [
            flash("woyousangepengyou"),
            flash("woxihuan"),
            flash("woxianghe"),
            flash("womenzouba"),
            flash("nashitian"),
            flash("zheshishu"),
            recognize("san"),
            imageChoice(
              "choose_hanzi",
              "sky",
              "Revisão: qual hànzì combina com o céu?",
              "天",
              visualHanziOptions("sky"),
              { explanation: "天 volta na revisão de leitura e natureza." }
            ),
            imageChoice(
              "choose_image",
              "book",
              "Revisão: qual imagem combina com 书?",
              "book",
              visualImageOptions("book"),
              { explanation: "书 reaparece depois da leitura." }
            ),
            comp("我们走吧", "Wǒmen zǒu ba", "Vamos embora.", ["Vamos embora.", "Estou com fome.", "Até logo.", "Sou brasileiro."]),
            sentenceBuild(
              "Tenho três amigos",
              "Monte a frase do texto.",
              ["我", "有", "三", "个", "朋友"],
              ["朋友", "三", "个", "我", "有", "喜欢"],
              "我有三个朋友 reaparece como produção guiada."
            ),
            // Revisão final: consolidar a lógica dos hànzì de natureza
            // (木+木=林, 日+月=明) — montagem + conversa de reconhecimento.
            hanziBuild("hb-lin-components", "Monte 林", "Duas árvores viram um bosque.", "林", "bosque"),
            conversationScene("revisao-hanzi-natureza"),
            // Revisão de socorro comunicativo: pedir ajuda quando não se entende.
            conversationScene("pedir-ajuda"),
          ], true, ["米"]),
        ],
      },
      {
        id: "u7-2",
        title: "Imersão",
        subtitle: "Conversas inteiras, do início ao fim",
        goal: "Sustentar uma conversa longa e ramificada em situações reais.",
        color: "#B4451E",
        focusChunks: ["多少钱？", "我要这个", "我想喝茶", "这是我妈妈"],
        focusHanzi: [],
        focusGrammar: ["conversa longa com ramificação", "recuperar-se de um erro no diálogo"],
        focusSounds: ["duōshao qián", "wǒ yào zhège", "wǒ xiǎng hē chá"],
        focusSituations: ["negociar no mercado", "comprar bilhete na estação", "visitar a casa de um amigo"],
        lessons: [
          {
            id: "p7-imersao-mercado",
            title: "Imersão: no mercado",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // Vocabulário visto na imersão de mercado (多少钱).
            newHanzi: ["多", "少"],
            steps: [
              intro(
                "Imersão no mercado",
                "Uma conversa inteira: cumprimentar, pedir, perguntar o preço e negociar. Erre à vontade — o vendedor te dá outra chance."
              ),
              conversationScene("imersao-mercado"),
              // Cenas comuns de aquecimento: quantidade, loja e negociação.
              conversationScene("perguntar-quantidade"),
              conversationScene("conversa-na-loja"),
              conversationScene("comprar-itens"),
              comp("多少钱？", "duōshao qián?", "Quanto custa?", [
                "Quanto custa?",
                "Vamos embora.",
                "Quero beber chá.",
                "Está tudo bem.",
              ]),
              dialogue(
                "Hora de negociar",
                "O preço veio alto. Qual reação abre a pechincha?",
                "太贵了",
                ["太贵了", "谢谢", "你好吗？", "我喜欢中文"],
                "太贵了 = caro demais; no mercado, negociar faz parte.",
                "Vendedor"
              ),
            ],
          },
          {
            id: "p7-imersao-estacao",
            title: "Imersão: na estação",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // Vocabulário visto na imersão de estação (在那里, 票多少钱, 等一下) + 车/票.
            newHanzi: ["那", "里", "多", "少", "等", "下", "车", "票", "酒", "店"],
            libraryItems: [
              "char:che",
              "char:piao_ticket",
              "chunk:chezainali",
              "chunk:woyaopiao",
              "chunk:piaoduoshaoqian",
              "chunk:huochezhanzainali",
              "chunk:jiudianzainali",
            ],
            reviewItems: ["char:che", "char:piao_ticket", "chunk:chezainali", "chunk:woyaopiao"],
            steps: [
              intro(
                "Imersão na estação",
                "Ache o carro, pergunte o preço da passagem e compre o bilhete — uma cena longa de rua, do 请问 ao 再见."
              ),
              listen("车", "chē", "carro; veículo"),
              listen("票", "piào", "bilhete; passagem"),
              listen("酒店在哪里？", "jiǔdiàn zài nǎlǐ?", "Onde fica o hotel?"),
              imageChoice(
                "choose_meaning",
                "train",
                "O que esta imagem mostra?",
                "trem",
                visualMeaningOptions("train"),
                { explanation: "火车 (huǒchē) = trem; 地铁 é o metrô urbano." }
              ),
              imageChoice(
                "listen_and_choose_image",
                "metro",
                "Ouça e escolha o metrô.",
                "metro",
                visualImageOptions("metro"),
                { explanation: "地铁 (dìtiě) = metrô, diferente do trem 火车." }
              ),
              compareWithImage(
                "word_to_image",
                3,
                "metro",
                "地铁 é o transporte urbano subterrâneo. Compare com 火车 e escolha.",
                "metro",
                ["metro", "train"],
                { explanation: "地铁 (dìtiě) é o metrô urbano; 火车 (huǒchē) é o trem que costuma ligar cidades." }
              ),
              imageChoice(
                "choose_meaning",
                "hotel",
                "O que esta imagem mostra?",
                "hotel",
                visualMeaningOptions("hotel"),
                { explanation: "酒店 (jiǔdiàn) = hotel; 酒店在哪里？ pergunta onde ele fica." }
              ),
              imageChoice(
                "choose_meaning",
                "car",
                "O que esta imagem mostra?",
                "carro",
                visualMeaningOptions("car"),
                { explanation: "车 (chē) = carro / veículo." }
              ),
              imageChoice(
                "choose_hanzi",
                "ticket",
                "Qual hànzì combina com o bilhete?",
                "票",
                visualHanziOptions("ticket"),
                { explanation: "票 (piào) = bilhete / passagem." }
              ),
              imageChoice(
                "listen_and_choose_image",
                "car",
                "Ouça e escolha a imagem certa.",
                "car",
                visualImageOptions("car"),
                { explanation: "车 (chē) = carro." }
              ),
              flash("chezainali"),
              flash("woyaopiao"),
              flash("piaoduoshaoqian"),
              listen("车在哪里？", "chē zài nǎlǐ?", "Onde está o carro?"),
              listen("我要票", "wǒ yào piào", "Quero o bilhete."),
              listen("票多少钱？", "piào duōshao qián?", "Quanto custa a passagem?"),
              sentenceBuild(
                "Onde está o carro?",
                "Monte: onde está o carro?",
                ["车", "在", "哪", "里"],
                ["车", "在", "哪", "里", "票"],
                "车在哪里？ pergunta onde está o carro."
              ),
              dialogue(
                "Na rua",
                "Você procura o carro. O que pergunta?",
                "车在哪里？",
                ["车在哪里？", "我要票", "我想喝茶", "这是书"],
                "车在哪里？ localiza o veículo.",
                "Passante"
              ),
              conversationScene("onde-esta-o-carro"),
              conversationScene("imersao-estacao"),
              comp("在那里", "zài nàlǐ", "Fica ali.", ["Fica ali.", "Custa dez.", "Espere um pouco.", "Não sei."]),
              sentenceBuild(
                "Compre o bilhete",
                "Monte: eu quero este.",
                ["我", "要", "这个"],
                ["这个", "要", "我", "多少"],
                "我要这个 fecha a compra apontando o que você quer."
              ),
              dialogue(
                "Receba a passagem",
                "O atendente te entrega o bilhete. O que você diz?",
                "谢谢",
                ["谢谢", "太贵了", "你好", "我们走吧"],
                "谢谢 encerra a compra com cortesia.",
                "Bilheteria"
              ),
            ],
          },
          {
            id: "p7-imersao-casa-amigo",
            title: "Imersão: visita à casa da amiga",
            skill: "fala",
            premium: true,
            masteryLoop: true,
            // Vocabulário visto na imersão de visita (认识你很高兴 e distratores).
            newHanzi: ["认", "识", "高", "兴", "单", "饿", "多", "少"],
            steps: [
              intro(
                "Imersão: uma visita",
                "Chegue, cumprimente a família, mostre a casa, aceite um chá e combine o reencontro — uma conversa social inteira em casa."
              ),
              // Aquecimento: mostrar a casa e pedir chá antes da imersão completa.
              conversationScene("esta-e-minha-casa"),
              conversationScene("pedir-cha"),
              conversationScene("imersao-casa-amigo"),
              comp("这是我妈妈", "zhè shì wǒ māma", "Esta é minha mãe.", [
                "Esta é minha mãe.",
                "Este é meu pai.",
                "Quero beber chá.",
                "Até amanhã.",
              ]),
              dialogue(
                "Aceite o chá",
                "A anfitriã oferece chá. Como você aceita?",
                "我想喝茶",
                ["我想喝茶", "太贵了", "再见", "多少钱？"],
                "我想喝茶 aceita a oferta com naturalidade.",
                "Anfitriã"
              ),
              dialogue(
                "Combine o próximo dia",
                "Está tarde. Como você se despede já marcando o reencontro?",
                "明天见",
                ["明天见", "你好", "这是什么？", "我要这个"],
                "明天见 despede e marca: até amanhã!",
                "Amiga"
              ),
            ],
          },
        ],
      },
    ],
  },
];

// --- estado/desbloqueio ---
export interface FlatLesson extends Lesson {
  phaseId: string;
  phaseTitle: string;
  phaseOrder: number;
  phaseTier: Tier;
  phaseWhy: string;
  unitId: string;
  unitTitle: string;
  unitColor: string;
}

export const ALL_LESSONS: FlatLesson[] = JOURNEY.flatMap((p) =>
  p.units.flatMap((u) =>
    u.lessons.map((l) => {
      const lesson = withLessonDefaults(l);
      return {
        ...lesson,
        phaseId: p.id,
        phaseTitle: p.title,
        phaseOrder: p.order,
        phaseTier: p.tier,
        phaseWhy: p.why,
        unitId: u.id,
        unitTitle: u.title,
        unitColor: u.color,
      };
    })
  )
);

export const getLesson = (id: string) => ALL_LESSONS.find((l) => l.id === id);

export function currentLessonId(completed: string[], _isPremium = false): string | undefined {
  return ALL_LESSONS.find((l) => !completed.includes(l.id))?.id;
}

export type LessonState = "done" | "current" | "locked" | "premium";

export function lessonState(id: string, completed: string[], isPremium = false): LessonState {
  if (completed.includes(id)) return "done";
  const lesson = getLesson(id);
  if (lesson?.premium && !isPremium) return "premium";
  const current = currentLessonId(completed, isPremium);
  if (id !== current) return "locked";
  return "current";
}

export function unitProgress(unit: Unit, completed: string[]): { done: number; total: number } {
  const total = unit.lessons.length;
  const done = unit.lessons.filter((l) => completed.includes(l.id)).length;
  return { done, total };
}

export function getPhaseById(id: string): JourneyPhase | undefined {
  return JOURNEY.find((p) => p.id === id);
}
