import { CHARACTERS } from "./characters";
import { CHUNKS } from "./chunks";
import type { ItemType } from "./types";
import {
  conversationSceneStepFromId,
  type ConversationCharacter,
  type ConversationCheckpoint,
  type ConversationLine,
  type ConversationSceneStep as ConversationSceneDefinition,
  type ConversationSetting,
} from "./conversationScenes";
import {
  defaultVisualDistractors,
  imageChoiceUsesImageOptions,
  resolveVisualConcept,
  type ImageChoiceMode,
  type VisualConceptId,
} from "./visualVocabulary";
import { resolveVisualScene, type VisualSceneId } from "./visualScenes";

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
  | "image_choice";

export type {
  ConversationCharacter,
  ConversationCheckpoint,
  ConversationLine,
  ConversationSetting,
  ConversationSceneDefinition,
};

export type LessonStageId = "intro" | "recognition" | "assembly" | "usage" | "consolidation";

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
  imageChoiceMode?: ImageChoiceMode;
  imageId?: string;
  iconId?: string;
  /** Cena visual real (banco visualScenes) — alternativa a imageId para exercícios contextuais. */
  visualSceneId?: string;
  promptPt?: string;
  targetHanzi?: string;
  targetPinyin?: string;
  targetMeaningPt?: string;
  imageOptions?: string[];
  correctImageId?: string;
  text?: string;
  pinyin?: string;
  pt?: string;
  hanzi?: string;
  tone?: 1 | 2 | 3 | 4;
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
  /** Controle granular de ajuda contextual em hanzi/palavras/frases. */
  helpMode?: StepHelpMode;
  /** Pergunta sem dica: hover/toque mostra aviso neutro, sem pinyin/traducao. */
  isNoHint?: boolean;
  /** hanzi_build: id de um exercício em data/hanziBuilder.ts (carta visual). */
  builderId?: string;
  /** conversation_scene: id canônico da cena. */
  sceneId?: string;
  setting?: ConversationSetting;
  characters?: ConversationCharacter[];
  checkpoint?: ConversationCheckpoint;
  learnedRefs?: string[];
  newRefs?: string[];
  /** Lição dedicada pode apresentar mais de 1 novidade na cena. */
  dedicatedLesson?: boolean;
  /** conversation_scene: nível de apoio visual (1–5). */
  conversationDifficulty?: 1 | 2 | 3 | 4 | 5;
}

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
const listen = (text: string, pinyin: string, pt: string): LessonStep => ({ kind: "listen", text, pinyin, pt });
const tone = (
  hanzi: string,
  pinyin: string,
  t: 1 | 2 | 3 | 4,
  assist: "guided" | "quiz" = "guided"
): LessonStep => ({ kind: "tone", hanzi, pinyin, tone: t, assist });
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
  const isImagePick = imageChoiceUsesImageOptions(mode);
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
    ...extra,
  };
};

const visualSceneChoice = (
  mode: ImageChoiceMode,
  sceneId: VisualSceneId,
  promptPt: string,
  answer: string,
  options: string[],
  extra: Partial<LessonStep> = {}
): LessonStep => {
  const scene = resolveVisualScene(sceneId);
  const isImagePick = imageChoiceUsesImageOptions(mode);
  return {
    kind: "image_choice",
    imageChoiceMode: mode,
    visualSceneId: sceneId,
    imageId: isImagePick ? scene?.conceptId : undefined,
    promptPt,
    targetHanzi: extra.targetHanzi ?? scene?.targetHanzi,
    targetPinyin: extra.targetPinyin ?? scene?.targetPinyin,
    targetMeaningPt: extra.targetMeaningPt ?? scene?.targetMeaningPt,
    explanation: extra.explanation,
    helpMode: extra.helpMode,
    isNoHint: extra.isNoHint,
    ...(isImagePick
      ? { imageOptions: options, correctImageId: answer }
      : { options, correctAnswer: answer }),
    ...extra,
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
const visualAudioHanziOptions = (targetId: VisualConceptId): string[] => {
  const target = resolveVisualConcept(targetId);
  if (!target) return [];
  const others = defaultVisualDistractors(targetId, 3)
    .map((id) => resolveVisualConcept(id)?.hanzi)
    .filter((hanzi): hanzi is string => Boolean(hanzi && hanzi !== target.hanzi));
  return [target.hanzi, ...others].slice(0, 4);
};
const sceneSentenceOptions = (correct: string, distractors: string[]): string[] =>
  [correct, ...distractors.filter((item) => item !== correct)].slice(0, 4);
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
const conversationScene = (sceneId: string): LessonStep => {
  const scene = conversationSceneStepFromId(sceneId);
  if (!scene) {
    throw new Error(`conversation_scene desconhecida: ${sceneId}`);
  }
  return {
    kind: "conversation_scene",
    title: scene.title,
    sceneId: scene.sceneId,
    setting: scene.setting,
    characters: scene.characters,
    lines: scene.lines,
    checkpoint: scene.checkpoint,
    learnedRefs: scene.learnedRefs,
    newRefs: scene.newRefs,
    dedicatedLesson: scene.dedicatedLesson,
    prompt: scene.checkpoint?.prompt,
    options: scene.checkpoint?.options,
    correctAnswer: scene.checkpoint?.correctAnswer,
    explanation: scene.checkpoint?.explanation,
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

const review = (id: string, skill: Skill, steps: LessonStep[], premium?: boolean): Lesson =>
  withLessonDefaults({
    id,
    title: "Revisão do módulo",
    skill,
    isReview: true,
    premium,
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
      listen("你好", "nǐ hǎo", "Olá"),
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
        "Combine som escrito e caracteres.",
        [
          { left: "nǐ hǎo", right: "你好", leftType: "pinyin", rightType: "hanzi" },
          { left: "你好", right: "Olá", leftType: "hanzi", rightType: "pt" },
        ],
        "Pinyin mostra o som; hànzì mostra a escrita chinesa."
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
      intro("A curva da voz", "Em mandarim, o contorno da voz faz parte da palavra. mǎ e mà não soam iguais, então seu ouvido treina desde cedo."),
      tone("妈", "mā", 1),
      tone("马", "mǎ", 3),
      match(
        "Tom muda sentido",
        "Combine som e ideia.",
        [
          { left: "妈", right: "mãe", leftType: "hanzi", rightType: "pt" },
          { left: "马", right: "cavalo", leftType: "hanzi", rightType: "pt" },
        ],
        "Mesmo ma com outro tom pode virar outra palavra."
      ),
      dialogue(
        "Ideia principal",
        "Em mandarim, tom é...",
        "a curva da voz que pode mudar sentido",
        ["a curva da voz que pode mudar sentido", "a tradução em português", "o desenho do caractere", "o nome da pessoa"],
        "Tom é parte da pronúncia: mudar a curva pode mudar a palavra inteira.",
        "Escolha"
      ),
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
      // Aula dedicada de montagem básica: cada hànzì novo entra com guia e
      // fragmentos simples; no fim, 木 volta sem silhueta como revisão. Nada de
      // composição (林/明) aqui — isso vem depois, quando as bases já foram vistas.
      intro("Monte peça por peça", "Agora você monta caracteres simples com fragmentos pequenos — sem composições ainda. Cada traço encaixa como um quebra-cabeça visual."),
      hanziBuild("hb-mu-fragments", "Monte 木", "Encaixe os traços da árvore.", "木", "árvore / madeira"),
      hanziBuild("hb-ren-fragments", "Monte 人", "Monte o hànzì de pessoa.", "人", "pessoa"),
      hanziBuild("hb-kou-fragments", "Monte 口", "Monte o hànzì de boca.", "口", "boca"),
      hanziBuild("hb-ri-fragments", "Monte 日", "Monte o hànzì de sol.", "日", "sol; dia"),
      hanziBuild("hb-shan-fragments", "Monte 山", "Encaixe os traços da montanha.", "山", "montanha"),
      // Revisão de 木 sem silhueta e com distratores — reforça o que abriu a lição.
      hanziBuild("hb-mu-complete", "Revise 木 sem molde", "Complete 木 sem a silhueta de fundo.", "木", "árvore / madeira"),
      dialogue(
        "Fechamento",
        "Como você montou os hànzì nesta lição?",
        "encaixando fragmentos simples",
        ["encaixando fragmentos simples", "juntando duas palavras inteiras", "soletrando letras", "copiando pinyin"],
        "Primeiro você aprende a montar blocos simples. Composições como 林 e 明 vêm depois.",
        "Escolha"
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

const PHASE1_COURTESY_MICROTASKS: Lesson[] = [
  microLesson({
    id: "p1-bukeqi-de-nada",
    title: "De nada: 不客气",
    skill: "fala",
    libraryItems: ["chunk:bukeqi", "chunk:xiexie"],
    reviewItems: ["chunk:bukeqi", "chunk:xiexie"],
    steps: [
      listen("不客气", "bú kèqi", "De nada"),
      listenSelect(
        "Escolha o que ouviu",
        "不客气",
        ["谢谢", "不客气", "你好", "再见"],
        "不客气",
        "不客气 é usado como de nada."
      ),
      match(
        "Cortesia em pares",
        "Combine cada frase com a função.",
        [
          { left: "谢谢", right: "Obrigado(a)", leftType: "hanzi", rightType: "pt" },
          { left: "不客气", right: "De nada", leftType: "hanzi", rightType: "pt" },
        ],
        "谢谢 agradece; 不客气 responde ao agradecimento."
      ),
      sentenceBuild(
        "Monte 不客气",
        "Monte: de nada.",
        ["不", "客气"],
        ["不", "客气", "谢谢", "你好"],
        "不客气 é uma resposta natural para 谢谢."
      ),
      dialogue(
        "Resposta curta",
        "Pessoa diz: 谢谢. O que você responde?",
        "不客气",
        ["不客气", "谢谢", "你好", "再见"],
        "不客气 é a resposta natural para de nada.",
        "Pessoa"
      ),
      conversationScene("agradecendo"),
      translationBuild(
        "Escreva em português",
        "不客气",
        "bú kèqi",
        ["De", "nada"],
        ["nada", "Obrigado(a)", "De", "Olá"],
        "不客气 significa de nada."
      ),
      listenSelect(
        "Revisão rápida",
        "不客气",
        ["不客气", "谢谢"],
        "不客气",
        "Você ouviu 不客气."
      ),
    ],
  }),
];

const PHASE2_MA_TONE_MICROTASKS: Lesson[] = [
  microLesson({
    id: "p2-ma-primeiro-tom",
    title: "1º tom com ma",
    skill: "som",
    libraryItems: ["char:ma2"],
    reviewItems: ["char:ma2"],
    steps: [
      intro("Alto e reto", "O 1º tom fica alto e constante. Em 妈 mā, pense em uma linha reta no alto."),
      listen("妈", "mā", "mãe"),
      tone("妈", "mā", 1, "quiz"),
      comp("妈", "mā", "mãe (1º tom)", ["mãe (1º tom)", "cavalo (3º tom)", "xingar (4º tom)", "olá"]),
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
    reviewItems: ["char:ma2"],
    steps: [
      intro("Reto contra queda", "Compare: mā fica alto e reto; mà cai rápido. O contraste ajuda seu ouvido a decidir."),
      tone("妈", "mā", 1, "quiz"),
      tone("骂", "mà", 4, "quiz"),
      match(
        "Compare os contornos",
        "Combine cada tom com o movimento da voz.",
        [
          { left: "1º tom", right: "alto e reto", leftType: "pt", rightType: "pt" },
          { left: "4º tom", right: "cai rápido", leftType: "pt", rightType: "pt" },
        ],
        "1º tom fica alto e reto; 4º tom cai rápido."
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
      intro("Dois 3º tons", "你好 tem dois 3º tons no pinyin: nǐ hǎo. Na fala natural eles ficam mais leves, mas no começo foque em reconhecer o 3º tom."),
      listen("你好", "nǐ hǎo", "Olá"),
      tone("你", "nǐ", 3, "quiz"),
      tone("好", "hǎo", 3, "quiz"),
      comp("你好", "nǐ hǎo", "Olá", ["Olá", "Obrigado(a)", "Até logo", "Sou brasileiro"]),
    ],
  }),
  microLesson({
    id: "p2-tons-xiexie",
    title: "Tons em 谢谢",
    skill: "som",
    libraryItems: ["chunk:xiexie", "char:xie"],
    reviewItems: ["chunk:xiexie", "char:xie"],
    steps: [
      intro("Queda e leveza", "谢谢 começa com xiè, 4º tom. A segunda sílaba fica leve na fala cotidiana."),
      listen("谢谢", "xièxie", "Obrigado(a)"),
      listenSelect("Ouça 谢谢", "谢谢", ["你好", "谢谢", "再见"], "谢谢", "谢谢 começa com uma queda no primeiro 谢."),
      tone("谢", "xiè", 4, "quiz"),
      comp("谢谢", "xièxie", "Obrigado(a)", ["Obrigado(a)", "De nada", "Olá", "Tudo bem?"]),
      sentenceBuild("Monte 谢谢", "Monte: obrigado(a).", ["谢", "谢"], ["谢", "你", "好"], "谢谢 repete 谢."),
    ],
  }),
];

const PHASE3_SURVIVAL_MICROTASKS: Lesson[] = [
  microLesson({
    id: "p3-wohenhao",
    title: "我很好 — Estou bem",
    skill: "fala",
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
    libraryItems: ["chunk:wobuhui"],
    reviewItems: ["chunk:wobuhui"],
    steps: [
      listen("我不会说中文", "wǒ bú huì shuō Zhōngwén", "Não sei falar chinês"),
      listenSelect(
        "Toque no que ouviu",
        "我不会说中文",
        ["我不会说中文", "我会说一点中文", "我很好", "谢谢"],
        "我不会说中文",
        "我不会说中文 é uma frase de proteção."
      ),
      match(
        "Peças de proteção",
        "Combine cada bloco com o sentido.",
        [
          { left: "我", right: "eu", leftType: "hanzi", rightType: "pt" },
          { left: "不会", right: "não sei / não consigo", leftType: "hanzi", rightType: "pt" },
          { left: "说中文", right: "falar chinês", leftType: "hanzi", rightType: "pt" },
        ],
        "不会 nega a habilidade; 说中文 é falar chinês."
      ),
      sentenceBuild(
        "Não sei falar chinês",
        "Monte a frase de sobrevivência.",
        ["我", "不会", "说", "中文"],
        ["我", "不会", "会", "说", "中文", "一点"],
        "我不会说中文 = não sei falar chinês."
      ),
      fillBlank(
        "Complete a frase",
        "Complete: 我 ___ 说中文.",
        "我",
        "不会",
        "说中文",
        ["不会", "会", "很", "叫"],
        "我不会说中文 = não sei falar chinês."
      ),
      dialogue(
        "Conversa acelerou",
        "A pessoa fala rápido demais. Qual frase protege você?",
        "我不会说中文",
        ["我不会说中文", "谢谢", "我很好", "再见"],
        "Use 我不会说中文 quando você não sabe falar chinês."
      ),
      translationBuild(
        "Escreva em português",
        "我不会说中文",
        "wǒ bú huì shuō Zhōngwén",
        ["Não", "sei", "falar", "chinês"],
        ["falar", "Não", "obrigado", "sei", "chinês"],
        "我不会说中文 = não sei falar chinês."
      ),
    ],
  }),
  microLesson({
    id: "p3-qing-zai-shuo-yibian",
    title: "请再说一遍",
    skill: "fala",
    libraryItems: ["chunk:qingzaishuoyibian"],
    reviewItems: ["chunk:qingzaishuoyibian"],
    steps: [
      intro("Peça repetição", "请再说一遍 é educado e muito útil: por favor, fale de novo."),
      listen("请再说一遍", "qǐng zài shuō yí biàn", "Por favor, fale de novo"),
      flash("qingzaishuoyibian"),
      comp("请再说一遍", "qǐng zài shuō yí biàn", "Por favor, fale de novo", ["Por favor, fale de novo", "Não sei falar chinês", "Tudo bem?", "Até logo"]),
      sentenceBuild(
        "Peça ajuda",
        "Como pedir para a pessoa falar de novo?",
        ["请", "再", "说", "一遍"],
        ["请", "再", "说", "一遍", "谢谢", "中文"],
        "请再说一遍 = por favor, fale de novo."
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
    reviewItems: ["char:si", "char:wu"],
    steps: [
      intro("Dois números comuns", "四 e 五 aparecem cedo em datas, preços e telefone."),
      recognize("si"),
      recognize("wu"),
      comp("四", "sì", "quatro", ["quatro", "cinco", "seis", "dez"]),
      comp("五", "wǔ", "cinco", ["cinco", "quatro", "oito", "um"]),
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
    steps: [intro("Árvore", "木 é árvore ou madeira. Repetir 木 cria 林 e 森."), recognize("mu"), hanziBuild("hb-mu-fragments", "Monte 木", "Monte o hànzì de árvore.", "木", "árvore; madeira"), comp("木", "mù", "árvore; madeira", ["árvore; madeira", "água", "mulher", "dez"])],
  }),
  microLesson({
    id: "p4-char-ren",
    title: "人",
    skill: "hanzi",
    libraryItems: ["char:ren"],
    reviewItems: ["char:ren"],
    steps: [intro("Pessoa", "人 significa pessoa e aparece em brasileiro: 巴西人."), recognize("ren"), hanziBuild("hb-ren-fragments", "Monte 人", "Monte o hànzì de pessoa.", "人", "pessoa"), comp("人", "rén", "pessoa", ["pessoa", "boca", "lua", "fogo"])],
  }),
  microLesson({
    id: "p4-char-kou",
    title: "口",
    skill: "hanzi",
    libraryItems: ["char:kou"],
    reviewItems: ["char:kou"],
    steps: [intro("Boca e fala", "口 sugere boca, abertura ou fala. Ele vai aparecer em 吗."), recognize("kou"), hanziBuild("hb-kou-fragments", "Monte 口", "Monte o hànzì de boca.", "口", "boca"), comp("口", "kǒu", "boca", ["boca", "pessoa", "árvore", "água"])],
  }),
  microLesson({
    id: "p4-char-ri",
    title: "日",
    skill: "hanzi",
    libraryItems: ["char:ri"],
    reviewItems: ["char:ri"],
    steps: [intro("Sol e dia", "日 significa sol ou dia. Em 明, ele se junta com 月."), recognize("ri"), hanziBuild("hb-ri-fragments", "Monte 日", "Monte o hànzì de sol.", "日", "sol; dia"), comp("日", "rì", "sol; dia", ["sol; dia", "lua; mês", "água", "pessoa"])],
  }),
  microLesson({
    id: "p4-char-yue",
    title: "月",
    skill: "hanzi",
    libraryItems: ["char:yue"],
    reviewItems: ["char:yue"],
    steps: [intro("Lua e mês", "月 pode significar lua ou mês. Visualmente, ajuda em 明."), recognize("yue"), hanziBuild("hb-yue-fragments", "Monte 月", "Monte o hànzì de lua.", "月", "lua; mês"), comp("月", "yuè", "lua; mês", ["lua; mês", "sol; dia", "boca", "fogo"])],
  }),
  microLesson({
    id: "p4-char-shan",
    title: "山",
    skill: "hanzi",
    libraryItems: ["char:shan"],
    reviewItems: ["char:shan"],
    steps: [intro("Montanha", "山 é montanha. A forma lembra três picos."), recognize("shan"), hanziBuild("hb-shan-fragments", "Monte 山", "Monte o hànzì de montanha.", "山", "montanha"), comp("山", "shān", "montanha", ["montanha", "água", "fogo", "pessoa"])],
  }),
  microLesson({
    id: "p4-char-shui",
    title: "水",
    skill: "hanzi",
    libraryItems: ["char:shui"],
    reviewItems: ["char:shui"],
    steps: [intro("Água", "水 é água. Como radical lateral, costuma aparecer em assuntos ligados a líquido."), recognize("shui"), hanziBuild("hb-shui-fragments", "Monte 水", "Monte o hànzì de água.", "水", "água"), comp("水", "shuǐ", "água", ["água", "fogo", "boca", "mulher"])],
  }),
  microLesson({
    id: "p4-char-huo",
    title: "火",
    skill: "hanzi",
    libraryItems: ["char:huo"],
    reviewItems: ["char:huo"],
    steps: [intro("Fogo", "火 é fogo. Quando aparece como peça, pode sugerir calor, luz ou energia."), recognize("huo"), hanziBuild("hb-huo-fragments", "Monte 火", "Monte o hànzì de fogo.", "火", "fogo"), comp("火", "huǒ", "fogo", ["fogo", "água", "lua", "pessoa"])],
  }),
  microLesson({
    id: "p4-char-da",
    title: "大",
    skill: "hanzi",
    libraryItems: ["char:da"],
    reviewItems: ["char:da"],
    steps: [intro("Grande", "大 é grande. A forma lembra alguém de braços abertos."), recognize("da"), hanziBuild("hb-da-fragments", "Monte 大", "Monte o hànzì de grande.", "大", "grande"), comp("大", "dà", "grande", ["grande", "pequeno", "pessoa", "meio"])],
  }),
  microLesson({
    id: "p4-char-xiao",
    title: "小",
    skill: "hanzi",
    libraryItems: ["char:xiao"],
    reviewItems: ["char:xiao"],
    steps: [intro("Pequeno", "小 é pequeno. Contrasta com 大."), recognize("xiao"), hanziBuild("hb-xiao-fragments", "Monte 小", "Monte o hànzì de pequeno.", "小", "pequeno"), comp("小", "xiǎo", "pequeno", ["pequeno", "grande", "bom", "pessoa"])],
  }),
  microLesson({
    id: "p4-char-zhong",
    title: "中",
    skill: "hanzi",
    libraryItems: ["char:zhong"],
    reviewItems: ["char:zhong"],
    steps: [intro("Centro e China", "中 significa meio/centro e aparece em 中文, chinês escrito/falado como língua."), recognize("zhong"), hanziBuild("hb-zhong-fragments", "Monte 中", "Monte o hànzì de centro.", "中", "meio; China"), hanziBuild("hb-zhongwen-sentence", "Complete 中文", "Complete a palavra de chinês.", "中", "meio; China"), comp("中", "zhōng", "meio; China", ["meio; China", "não", "ser", "eu"])],
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
    why: "Em 10 minutos você já vai cumprimentar alguém em mandarim — sem decorar caracteres.",
    tier: "fundamentos",
    units: [
      {
        id: "u1-1",
        title: "Seu primeiro mandarim",
        subtitle: "Ouvir, imitar e falar",
        goal: "Cumprimentar e agradecer em voz alta.",
        color: "#2F6FB0",
        focusChunks: ["你好", "谢谢"],
        focusHanzi: ["你", "好", "谢"],
        focusGrammar: ["resposta social curta", "chunk fixo antes de análise gramatical"],
        focusSounds: ["nǐ hǎo", "xièxie", "3º tom em 你/好", "4º tom em 谢"],
        focusSituations: ["cumprimentar alguém", "agradecer ajuda", "abrir uma conversa curta"],
        lessons: [
          ...PHASE1_BOOTSTRAP_LESSONS,
          ...PHASE1_ENGINE_LESSONS,
          {
            id: "l1",
            title: "Olá",
            skill: "fala",
            steps: [
              listen("你好", "nǐ hǎo", "Olá"),
              listenSelect(
                "Toque no que ouviu",
                "你好",
                ["你好", "谢谢", "再见", "不客气"],
                "你好",
                "你好 / nǐ hǎo é a saudação mais segura."
              ),
              match(
                "Combine frase e sentido",
                "Ligue o cumprimento ao significado.",
                [
                  { left: "你好", right: "Olá", leftType: "hanzi", rightType: "pt" },
                  { left: "你", right: "você", leftType: "hanzi", rightType: "pt" },
                  { left: "好", right: "bom; bem", leftType: "hanzi", rightType: "pt" },
                ],
                "你好 junta você + bom/bem para cumprimentar."
              ),
              sentenceBuild(
                "Monte 你好",
                "Monte: Olá.",
                ["你", "好"],
                ["好", "你", "谢", "再"],
                "你 + 好 forma 你好."
              ),
              dialogue(
                "Quando usar 你好?",
                "Você encontra alguém. O que combina dizer?",
                "你好",
                ["你好", "谢谢", "再见", "不客气"],
                "你好 é a saudação segura para encontrar ou cumprimentar alguém."
              ),
              conversationScene("primeiro-cumprimento"),
              fillBlank(
                "Complete o cumprimento",
                "Complete a frase 你 ___.",
                "你",
                "好",
                "",
                ["好", "谢", "再", "见"],
                "你好 = olá."
              ),
              dialogue(
                "Escolha o pinyin",
                "Qual pinyin combina com 你好?",
                "nǐ hǎo",
                ["nǐ hǎo", "xièxie", "zàijiàn", "bù kèqi"],
                "你好 se lê nǐ hǎo — dois 3º tons.",
                "Pinyin"
              ),
              translationBuild(
                "Revisão rápida",
                "你好",
                "nǐ hǎo",
                ["Olá"],
                ["Obrigado(a)", "Olá", "Até", "logo"],
                "你好 significa olá."
              ),
            ],
          },
          {
            id: "l2",
            title: "Obrigado",
            skill: "fala",
            steps: [
              listen("谢谢", "xièxie", "Obrigado(a)"),
              listenSelect(
                "Distinguir agradecimento",
                "谢谢",
                ["你好", "谢谢", "再见", "不客气"],
                "谢谢",
                "谢谢 é a forma curta e comum de agradecer."
              ),
              match(
                "Combine cortesia",
                "Ligue a frase ao sentido.",
                [
                  { left: "谢谢", right: "Obrigado(a)", leftType: "hanzi", rightType: "pt" },
                  { left: "谢", right: "agradecer", leftType: "hanzi", rightType: "pt" },
                ],
                "谢谢 repete 谢 para agradecer."
              ),
              sentenceBuild(
                "Monte 谢谢",
                "Monte: Obrigado(a).",
                ["谢", "谢"],
                ["谢", "你", "好"],
                "谢谢 repete 谢 para agradecer."
              ),
              dialogue(
                "Escolha uma resposta",
                "Alguém te ajuda. Qual frase curta você usa?",
                "谢谢",
                ["谢谢", "你好", "再见", "不客气"],
                "谢谢 é a forma curta e comum de agradecer."
              ),
              tone("谢", "xiè", 4, "quiz"),
              dialogue(
                "Escolha o pinyin",
                "Qual pinyin combina com 谢谢?",
                "xièxie",
                ["xièxie", "nǐ hǎo", "zàijiàn", "bù kèqi"],
                "谢谢 começa com xiè, 4º tom na primeira sílaba.",
                "Pinyin"
              ),
              translationBuild(
                "Escreva em português",
                "谢谢",
                "xièxie",
                ["Obrigado(a)"],
                ["Olá", "Obrigado(a)", "Até", "logo"],
                "谢谢 significa obrigado(a)."
              ),
              listenSelect(
                "Revisão rápida",
                "谢谢",
                ["谢谢", "你好"],
                "谢谢",
                "Você ouviu 谢谢."
              ),
            ],
          },
          {
            id: "l2-mapa-rapido",
            title: "Mapa rápido",
            skill: "fala",
            libraryItems: ["chunk:nihao", "chunk:xiexie"],
            reviewItems: ["chunk:nihao", "chunk:xiexie"],
            rewardQi: 2,
            estimatedMinutes: 3,
            steps: [
              intro("O que é mandarim?", "Mandarim é a língua chinesa padrão. No Longyu, você começa pelo som e por frases úteis antes de encarar textos longos."),
              intro("O que é pinyin?", "Pinyin escreve o som do mandarim com letras latinas: 你好 vira nǐ hǎo. Ele é uma ponte, não uma muleta eterna."),
              intro("O que é tom?", "Tom é o contorno da voz. Em mandarim, mudar o tom pode mudar a palavra, então seu ouvido treina desde cedo."),
              intro("O que é hànzì?", "Hànzì são os caracteres chineses. Você vai vê-los como peças com lógica: som, sentido e forma visual."),
              flash("nihao"),
              flash("xiexie"),
              comp("你好", "nǐ hǎo", "Olá", ["Olá", "Obrigado(a)", "Até logo", "De nada"]),
              comp("谢谢", "xièxie", "Obrigado(a)", ["Obrigado(a)", "Olá", "Com licença", "Tchau"]),
            ],
          },
          review("l1-rev", "fala", [
            flash("nihao"),
            flash("xiexie"),
            conversationScene("primeiro-cumprimento"),
            comp("你好", "nǐ hǎo", "Olá", ["Olá", "Obrigado(a)", "Até logo", "Tchau"]),
            dialogue(
              "Escolha o pinyin",
              "Qual pinyin combina com 你好?",
              "nǐ hǎo",
              ["nǐ hǎo", "xièxie", "zàijiàn", "bù kèqi"],
              "你好 = nǐ hǎo.",
              "Pinyin"
            ),
            produce(["你", "好"], ["谢", "好", "你", "再"], "Olá"),
            tone("谢", "xiè", 4, "quiz"),
            comp("谢谢", "xièxie", "Obrigado(a)", ["Obrigado(a)", "Olá", "De nada", "Tchau"]),
            match(
              "Fixe com pares",
              "Combine frases antigas com o sentido.",
              [
                { left: "你好", right: "Olá", leftType: "hanzi", rightType: "pt" },
                { left: "谢谢", right: "Obrigado(a)", leftType: "hanzi", rightType: "pt" },
              ],
              "Revisão mistura cumprimento e agradecimento."
            ),
          ]),
        ],
      },
      {
        id: "u1-2",
        title: "Despedida e cortesia",
        subtitle: "Fechar conversas com naturalidade",
        goal: "Despedir-se e usar uma frase de cortesia.",
        color: "#7A3FB0",
        focusChunks: ["再见", "不客气"],
        focusHanzi: ["再", "见", "不"],
        focusGrammar: ["resposta social curta", "frase de cortesia como bloco"],
        focusSounds: ["zàijiàn", "bú kèqi", "4º tom em 再/见", "sandhi de 不 antes de 4º tom"],
        focusSituations: ["encerrar uma conversa", "responder a 谢谢", "alternar saudação e despedida"],
        lessons: [
          {
            id: "l3",
            title: "Até logo",
            skill: "fala",
            steps: [
              listen("再见", "zàijiàn", "Até logo"),
              listenSelect(
                "Toque no que ouviu",
                "再见",
                ["你好", "谢谢", "再见", "不客气"],
                "再见",
                "再见 fecha a conversa."
              ),
              match(
                "Combine despedida",
                "Ligue as peças ao sentido.",
                [
                  { left: "再见", right: "Até logo", leftType: "hanzi", rightType: "pt" },
                  { left: "再", right: "de novo", leftType: "hanzi", rightType: "pt" },
                  { left: "见", right: "ver", leftType: "hanzi", rightType: "pt" },
                ],
                "再见 literalmente sugere ver de novo."
              ),
              sentenceBuild(
                "Monte 再见",
                "Monte: Até logo.",
                ["再", "见"],
                ["见", "谢", "再", "好"],
                "再 + 见 forma 再见."
              ),
              dialogue(
                "Fechar uma conversa",
                "Você vai embora. O que combina dizer?",
                "再见",
                ["再见", "你好", "谢谢", "不客气"],
                "再见 fecha a conversa: até logo."
              ),
              visualSceneChoice(
                "image_sentence_choice",
                "person_leaving",
                "Qual frase descreve a cena?",
                "再见",
                sceneSentenceOptions("再见", ["你好", "谢谢", "不客气"]),
                { isNoHint: true, explanation: "再见 é a despedida natural quando alguém sai." }
              ),
              conversationScene("despedida"),
              translationBuild(
                "Escreva em português",
                "再见",
                "zàijiàn",
                ["Até", "logo"],
                ["logo", "Obrigado(a)", "Até", "Olá"],
                "再见 significa até logo."
              ),
              listenSelect(
                "Revisão rápida",
                "再见",
                ["再见", "谢谢"],
                "再见",
                "Você ouviu 再见."
              ),
              fillBlank(
                "Frase antiga",
                "Complete o cumprimento que você já conhece.",
                "",
                "你好",
                "",
                ["你好", "再见", "谢谢", "不客气"],
                "你好 volta como saudação base."
              ),
            ],
          },
          ...PHASE1_COURTESY_MICROTASKS,
          {
            id: "l4",
            title: "Com licença",
            skill: "fala",
            steps: [
              listen("请问", "qǐng wèn", "Com licença, posso perguntar?"),
              listen("不客气", "bú kèqi", "De nada"),
              flash("qingwen"),
              flash("bukeqi"),
              comp("请问", "qǐng wèn", "Com licença, posso perguntar?", ["Com licença, posso perguntar?", "De nada", "Obrigado(a)", "Até logo"]),
              comp("不客气", "bú kèqi", "De nada", ["De nada", "Obrigado(a)", "Com licença", "Desculpa"]),
              dialogue(
                "Escolha uma resposta para 谢谢",
                "Pessoa diz: 谢谢. O que você responde?",
                "不客气",
                ["不客气", "谢谢", "你好", "再见"],
                "不客气 é a resposta natural para de nada.",
                "Pessoa"
              ),
            ],
          },
          review("l2-rev", "fala", [
            flash("nihao"),
            flash("xiexie"),
            flash("zaijian"),
            flash("qingwen"),
            conversationScene("despedida"),
            conversationScene("agradecendo"),
            comp("请问", "qǐng wèn", "Com licença, posso perguntar?", ["Com licença, posso perguntar?", "Obrigado(a)", "Até logo", "Olá"]),
            produce(["再", "见"], ["你", "见", "再", "好"], "Até logo"),
            tone("谢", "xiè", 4, "quiz"),
            comp("谢谢", "xièxie", "Obrigado(a)", ["Obrigado(a)", "Olá", "De nada", "Até logo"]),
            match(
              "Revisão mista",
              "Combine frases antigas com o sentido.",
              [
                { left: "你好", right: "Olá", leftType: "hanzi", rightType: "pt" },
                { left: "再见", right: "Até logo", leftType: "hanzi", rightType: "pt" },
                { left: "谢谢", right: "Obrigado(a)", leftType: "hanzi", rightType: "pt" },
                { left: "不客气", right: "De nada", leftType: "hanzi", rightType: "pt" },
              ],
              "O módulo fecha misturando saudação, agradecimento e despedida."
            ),
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
            steps: [
              intro("Forme o ouvido", "Veja a curva do tom, ouça e imite. Nas revisões, o app pode esconder as dicas."),
              tone("妈", "mā", 1),
              tone("麻", "má", 2),
              tone("马", "mǎ", 3),
              tone("骂", "mà", 4),
              comp("马", "mǎ", "cavalo (3º tom)", ["cavalo (3º tom)", "mãe (1º tom)", "xingar (4º tom)", "olá"]),
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
            steps: [
              listen("要", "yào", "querer (4º tom)"),
              listen("摇", "yáo", "balançar (2º tom)"),
              tone("要", "yào", 4),
              tone("咬", "yǎo", 3),
              comp("要", "yào", "querer", ["querer", "balançar", "morder", "obrigado"]),
              match(
                "Ouvido antes da memória",
                "Combine cada sílaba com o contorno.",
                [
                  { left: "yáo", right: "sobe no 2º tom", leftType: "pinyin", rightType: "pt" },
                  { left: "yào", right: "cai no 4º tom", leftType: "pinyin", rightType: "pt" },
                ],
                "yáo sobe; yào cai."
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
            reviewItems: ["char:ma2"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              intro("Compare em pares", "O 1º tom fica alto e reto; o 4º cai firme. O 2º sobe; o 3º desce e volta. Comparar pares treina o ouvido mais rápido."),
              tone("妈", "mā", 1, "quiz"),
              tone("骂", "mà", 4, "quiz"),
              tone("麻", "má", 2, "quiz"),
              tone("马", "mǎ", 3, "quiz"),
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
            ],
          },
          {
            id: "l8-shi",
            title: "A sílaba shi",
            skill: "som",
            libraryItems: ["char:shi"],
            reviewItems: ["char:shi"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              intro("Mesmo som base, tons diferentes", "shī, shí, shǐ e shì mostram como o contorno muda a palavra. Vamos usar 是 (shì), que você já viu em 我是巴西人."),
              listen("湿", "shī", "molhado (1º tom)"),
              listen("十", "shí", "dez (2º tom)"),
              listen("使", "shǐ", "usar; fazer (3º tom)"),
              tone("是", "shì", 4),
              recognize("shi"),
              comp("是", "shì", "ser; sim", ["ser; sim", "dez", "molhado", "obrigado"]),
            ],
          },
          ...PHASE2_CONTEXT_TONE_MICROTASKS,
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
        focusChunks: ["你叫什么？", "我叫马修", "你好吗？", "我很好"],
        focusHanzi: ["我", "你", "叫", "什", "么", "吗"],
        focusGrammar: ["pergunta com 吗", "pergunta com 什么", "resposta com 我叫", "resposta social curta"],
        focusSounds: ["nǐ jiào shénme", "wǒ jiào", "nǐ hǎo ma", "wǒ hěn hǎo"],
        focusSituations: ["perguntar o nome", "responder quem é você", "dizer que está bem", "pedir reparo na conversa"],
        lessons: [
          {
            id: "l9",
            title: "Me apresentar",
            skill: "fala",
            steps: [
              listen("我叫马修", "wǒ jiào Mǎxiū", "Meu nome é Matheus"),
              listenSelect(
                "Toque no que ouviu",
                "我叫马修",
                ["我叫马修", "我是巴西人", "我很好", "谢谢"],
                "我叫马修",
                "我叫 + nome apresenta quem você é."
              ),
              match(
                "Peças da apresentação",
                "Combine cada parte com o sentido.",
                [
                  { left: "我", right: "eu", leftType: "hanzi", rightType: "pt" },
                  { left: "叫", right: "chamar-se", leftType: "hanzi", rightType: "pt" },
                  { left: "我叫马修", right: "Meu nome é Matheus", leftType: "hanzi", rightType: "pt" },
                ],
                "我叫 + nome é a forma curta para dizer seu nome."
              ),
              sentenceBuild(
                "Meu nome é...",
                "Monte em mandarim: meu nome é Matheus.",
                ["我", "叫", "马修"],
                ["我", "叫", "是", "你好", "马修"],
                "我叫 + nome é a forma curta para se apresentar."
              ),
              dialogue(
                "Responda a pergunta",
                "Alguém pergunta: 你叫什么？ Como você responde?",
                "我叫马修",
                ["我叫马修", "谢谢", "再见", "不客气"],
                "Use 我叫 + seu nome para responder."
              ),
              conversationScene("me-apresentando"),
              translationBuild(
                "Escreva em português",
                "我叫马修",
                "wǒ jiào Mǎxiū",
                ["Meu", "nome", "é", "Matheus"],
                ["Matheus", "Meu", "sou", "nome", "é"],
                "我叫马修 = meu nome é Matheus."
              ),
              fillBlank(
                "Complete a apresentação",
                "Complete: 我 ___ 马修.",
                "我",
                "叫",
                "马修",
                ["叫", "是", "好", "谢"],
                "我叫马修 = eu me chamo Matheus."
              ),
            ],
          },
          {
            id: "l9-tudo-bem",
            title: "Tudo bem?",
            skill: "fala",
            libraryItems: ["chunk:nihaoma", "chunk:wohenhao"],
            reviewItems: ["chunk:nihaoma", "chunk:wohenhao"],
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
                ["我很好", "再见", "谢谢", "我叫马修"],
                "我很好 responde: estou bem."
              ),
              conversationScene("perguntando-se-esta-bem"),
              match(
                "Pergunta e resposta",
                "Combine cada frase com o sentido.",
                [
                  { left: "你好吗？", right: "Tudo bem?", leftType: "hanzi", rightType: "pt" },
                  { left: "我很好", right: "Estou bem", leftType: "hanzi", rightType: "pt" },
                ],
                "你好吗？ pergunta; 我很好 responde."
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
            libraryItems: ["chunk:nijiaoshenme", "chunk:wojiao"],
            reviewItems: ["chunk:nijiaoshenme", "chunk:wojiao"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              listen("你叫什么？", "nǐ jiào shénme?", "Como você se chama?"),
              flash("nijiaoshenme"),
              flash("wojiao"),
              comp("你叫什么？", "nǐ jiào shénme?", "Como você se chama?", ["Como você se chama?", "Meu nome é Matheus.", "Tudo bem?", "Sou brasileiro."]),
              produce(["你", "叫", "什么"], ["叫", "你", "我", "什么"], "Como você se chama?"),
              sentenceBuild(
                "Responda com seu nome",
                "Você ouviu 你叫什么？ Monte a resposta.",
                ["我", "叫", "马修"],
                ["我", "叫", "什么", "马修", "你好"],
                "我叫 + nome responde como você se chama."
              ),
            ],
          },
          {
            id: "l10",
            title: "De onde sou",
            skill: "fala",
            steps: [
              listen("我是巴西人", "wǒ shì Bāxī rén", "Sou brasileiro"),
              listenSelect(
                "Toque no que ouviu",
                "我是巴西人",
                ["我是巴西人", "我叫马修", "我很好", "我听不懂"],
                "我是巴西人",
                "我是巴西人 diz sou brasileiro."
              ),
              match(
                "Mapa da frase",
                "Combine cada peça com o sentido.",
                [
                  { left: "我", right: "eu", leftType: "hanzi", rightType: "pt" },
                  { left: "是", right: "sou / ser", leftType: "hanzi", rightType: "pt" },
                  { left: "巴西人", right: "brasileiro", leftType: "hanzi", rightType: "pt" },
                ],
                "我 + 是 + 巴西人 monta sua origem."
              ),
              sentenceBuild(
                "Sou brasileiro",
                "Como você diria: “Eu sou brasileiro”?",
                ["我", "是", "巴西人"],
                ["是", "我", "你好", "巴西人", "叫"],
                "我 = eu, 是 = ser/sou, 巴西人 = brasileiro."
              ),
              fillBlank(
                "Complete a origem",
                "Complete: 我 ___ 巴西人.",
                "我",
                "是",
                "巴西人",
                ["是", "叫", "很", "吗"],
                "我是巴西人 = sou brasileiro."
              ),
              dialogue(
                "Apresente sua origem",
                "Alguém pergunta de onde você é. Qual frase responde?",
                "我是巴西人",
                ["我是巴西人", "我很好", "谢谢", "再见"],
                "我是巴西人 responde sua origem."
              ),
              translationBuild(
                "Escreva em português",
                "我是巴西人",
                "wǒ shì Bāxī rén",
                ["Sou", "brasileiro"],
                ["Sou", "Obrigado", "brasileiro", "bem"],
                "我是巴西人 = sou brasileiro."
              ),
            ],
          },
          ...PHASE3_SURVIVAL_MICROTASKS,
          {
            id: "l11",
            title: "Não entendi",
            skill: "fala",
            steps: [
              listen("我听不懂", "wǒ tīng bù dǒng", "Não entendi (ouvindo)"),
              listenSelect(
                "Toque no que ouviu",
                "我听不懂",
                ["我听不懂", "我不会说中文", "我很好", "谢谢"],
                "我听不懂",
                "我听不懂 é a frase curta para não entendi."
              ),
              match(
                "O que quebrou?",
                "Combine cada frase com a situação.",
                [
                  { left: "我听不懂", right: "não entendi o que ouvi", leftType: "hanzi", rightType: "pt" },
                  { left: "我不会说中文", right: "não sei falar chinês", leftType: "hanzi", rightType: "pt" },
                ],
                "听 aponta para ouvir; 说 aponta para falar."
              ),
              sentenceBuild(
                "Não entendo",
                "Em uma conversa rápida, monte: “Não entendo”.",
                ["我", "听不懂"],
                ["我", "听不懂", "会", "说", "中文", "谢谢"],
                "我听不懂 é a frase curta para quando você não entendeu o que ouviu."
              ),
              fillBlank(
                "Complete a frase",
                "Complete: 我 ___ .",
                "我",
                "听不懂",
                "",
                ["听不懂", "很好", "谢谢", "再见"],
                "我听不懂 = não entendi."
              ),
              dialogue(
                "Peça reparo",
                "Você não entendeu o que ouviu. Qual frase combina?",
                "我听不懂",
                ["我听不懂", "我很好", "不客气", "再见"],
                "我听不懂 comunica que você não entendeu."
              ),
              translationBuild(
                "Escreva em português",
                "我听不懂",
                "wǒ tīng bù dǒng",
                ["Não", "entendi"],
                ["Não", "obrigado", "entendi", "bem"],
                "我听不懂 = não entendi."
              ),
            ],
          },
          {
            id: "l11-falo-pouco",
            title: "Falo um pouco",
            skill: "fala",
            libraryItems: ["chunk:wobuhui", "chunk:wohuishuoyidian", "chunk:qingzaishuoyibian"],
            reviewItems: ["chunk:wobuhui", "chunk:wohuishuoyidian", "chunk:qingzaishuoyibian"],
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
            steps: [
              intro("Três peças-chave", "我 (eu), 是 (ser) e 人 (pessoa) aparecem em quase toda frase de apresentação."),
              listen("我", "wǒ", "eu, me"),
              listen("是", "shì", "ser; sim"),
              listen("人", "rén", "pessoa"),
              recognize("wo"),
              recognize("shi"),
              recognize("ren"),
              comp("我是巴西人", "wǒ shì Bāxī rén", "Sou brasileiro", ["Sou brasileiro", "Meu nome é Matheus", "Obrigado", "Até logo"]),
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
            steps: [
              intro("Leitura fechada", "Este texto usa apenas cumprimentos e apresentação que você já praticou."),
              read([
                { hanzi: "你好！", pinyin: "Nǐ hǎo!", pt: "Olá!" },
                { hanzi: "谢谢。", pinyin: "Xièxie.", pt: "Obrigado(a)." },
                { hanzi: "我是巴西人。", pinyin: "Wǒ shì Bāxī rén.", pt: "Sou brasileiro." },
                { hanzi: "再见！", pinyin: "Zàijiàn!", pt: "Até logo!" },
              ]),
              flash("zaijian"),
              match(
                "Reconheça no texto",
                "Combine as frases do microtexto.",
                [
                  { left: "你好！", right: "Olá!", leftType: "hanzi", rightType: "pt" },
                  { left: "谢谢。", right: "Obrigado(a).", leftType: "hanzi", rightType: "pt" },
                  { left: "再见！", right: "Até logo!", leftType: "hanzi", rightType: "pt" },
                ],
                "O texto usa frases que você já praticou em produção."
              ),
              translationBuild(
                "Despedida do texto",
                "再见！",
                "Zàijiàn!",
                ["Até", "logo!"],
                ["Até", "Obrigado(a).", "logo!", "Olá!"],
                "再见 fecha o microtexto."
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
                "再见",
                ["你好", "谢谢", "再见", "我是巴西人"],
                "再见",
                "再见 fecha o microtexto."
              ),
            ],
          },
          {
            id: "l13-dialogo-ola",
            title: "Microdiálogo: cumprimentar",
            skill: "fala",
            libraryItems: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:xiexie"],
            reviewItems: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:xiexie"],
            rewardQi: 2,
            estimatedMinutes: 4,
            steps: [
              read([
                { hanzi: "你好！", pinyin: "Nǐ hǎo!", pt: "Olá!" },
                { hanzi: "你好吗？", pinyin: "Nǐ hǎo ma?", pt: "Tudo bem?" },
                { hanzi: "我很好。", pinyin: "Wǒ hěn hǎo.", pt: "Estou bem." },
                { hanzi: "谢谢。", pinyin: "Xièxie.", pt: "Obrigado(a)." },
              ]),
              flash("nihaoma"),
              flash("wohenhao"),
              comp("我很好。", "Wǒ hěn hǎo.", "Estou bem.", ["Estou bem.", "Tudo bem?", "Meu nome é Matheus.", "Não falo chinês."]),
              translationBuild(
                "Seu primeiro diálogo",
                "你好！ 你好吗？ 我很好。 谢谢。",
                "Nǐ hǎo! Nǐ hǎo ma? Wǒ hěn hǎo. Xièxie.",
                ["Olá.", "Tudo bem?", "Estou bem.", "Obrigado(a)."],
                ["Estou bem.", "Olá.", "Até logo.", "Tudo bem?", "Obrigado(a)."],
                "A ordem é saudação, pergunta, resposta e agradecimento."
              ),
            ],
          },
          {
            id: "l13-dialogo-nome",
            title: "Microdiálogo: se apresentar",
            skill: "fala",
            libraryItems: ["chunk:nijiaoshenme", "chunk:wojiao", "chunk:wature", "chunk:qingzaishuoyibian"],
            reviewItems: ["chunk:nijiaoshenme", "chunk:wojiao", "chunk:wature", "chunk:qingzaishuoyibian"],
            rewardQi: 2,
            estimatedMinutes: 5,
            steps: [
              read([
                { hanzi: "你好！", pinyin: "Nǐ hǎo!", pt: "Olá!" },
                { hanzi: "你叫什么？", pinyin: "Nǐ jiào shénme?", pt: "Como você se chama?" },
                { hanzi: "我叫马修。", pinyin: "Wǒ jiào Mǎxiū.", pt: "Meu nome é Matheus." },
                { hanzi: "我是巴西人。", pinyin: "Wǒ shì Bāxī rén.", pt: "Sou brasileiro." },
                { hanzi: "请再说一遍。", pinyin: "Qǐng zài shuō yí biàn.", pt: "Por favor, fale de novo." },
              ]),
              flash("nijiaoshenme"),
              flash("wojiao"),
              flash("qingzaishuoyibian"),
              comp("你叫什么？", "Nǐ jiào shénme?", "Como você se chama?", ["Como você se chama?", "Sou brasileiro.", "Estou bem.", "Obrigado."]),
              sentenceBuild(
                "Resposta natural",
                "Como você responderia 你叫什么？",
                ["我", "叫", "马修"],
                ["我", "叫", "马修", "你", "什么"],
                "我叫 + nome responde “eu me chamo...”."
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
            comp("我是巴西人", "wǒ shì Bāxī rén", "Sou brasileiro", ["Sou brasileiro", "Meu nome é Matheus", "Não entendi", "Olá"]),
            sentenceBuild(
              "Produção guiada",
              "Monte uma apresentação curta com saudação e nome.",
              ["你好", "我", "叫", "马修"],
              ["你好", "我", "叫", "马修", "是", "巴西人"],
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
                "image_to_hanzi",
                "person",
                "Qual hànzì combina com a imagem de pessoa?",
                "人",
                visualHanziOptions("person"),
                { targetMeaningPt: "pessoa", explanation: "人 (rén) significa pessoa." }
              ),
              imageChoice(
                "image_to_hanzi",
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
              recognize("si"),
              recognize("wu"),
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
                "image_to_hanzi",
                "sun",
                "Qual hànzì combina com o sol?",
                "日",
                visualHanziOptions("sun"),
                { explanation: "日 (rì) = sol / dia." }
              ),
              imageChoice(
                "image_to_pinyin",
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
            libraryItems: ["char:wo", "char:ni", "char:bu", "char:shi", "char:zhong", "char:ren"],
            reviewItems: ["char:wo", "char:ni", "char:bu", "char:shi", "char:zhong", "char:ren"],
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
                "audio_to_image",
                "water",
                "Ouça e escolha a imagem certa.",
                "water",
                visualImageOptions("water"),
                { explanation: "水 (shuǐ) = água." }
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
              "hanzi_to_image",
              "tree",
              "Qual imagem combina com 木?",
              "tree",
              visualImageOptions("tree"),
              { explanation: "木 = árvore." }
            ),
            imageChoice(
              "image_to_meaning",
              "person",
              "Isto é uma pessoa.",
              "pessoa",
              visualMeaningOptions("person"),
              { helpMode: "disabled", isNoHint: true, explanation: "人 = pessoa." }
            ),
            imageChoice(
              "image_to_audio",
              "water",
              "Ouça as opções e escolha o som de água.",
              "水",
              visualAudioHanziOptions("water"),
              { explanation: "水 (shuǐ) = água." }
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
              visualSceneChoice(
                "meaning_to_image",
                "tree_single",
                "Qual imagem combina com árvore?",
                "tree",
                visualImageOptions("tree"),
                { explanation: "木 (mù) = árvore — a foto mostra uma árvore isolada." }
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
            steps: [
              read([
                { hanzi: "你好！", pinyin: "Nǐ hǎo!", pt: "Olá!" },
                { hanzi: "我叫马修。", pinyin: "Wǒ jiào Mǎxiū.", pt: "Meu nome é Matheus." },
                { hanzi: "我是巴西人。", pinyin: "Wǒ shì Bāxī rén.", pt: "Sou brasileiro." },
                { hanzi: "我有三个朋友。", pinyin: "Wǒ yǒu sān ge péngyou.", pt: "Tenho três amigos." },
              ]),
              comp("我有三个朋友。", "Wǒ yǒu sān ge péngyou.", "Tenho três amigos.", ["Tenho três amigos.", "Sou brasileiro.", "Meu nome é Matheus.", "Obrigado."]),
              translationBuild(
                "Resumo do texto",
                "你好！我叫马修。我是巴西人。我有三个朋友。",
                "Nǐ hǎo! Wǒ jiào Mǎxiū. Wǒ shì Bāxī rén. Wǒ yǒu sān ge péngyou.",
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
        focusChunks: ["这是我爸爸", "这是我妈妈", "这是什么？"],
        focusHanzi: [],
        focusGrammar: ["apresentação com 这是", "pergunta com 什么"],
        focusSounds: ["zhè shì", "bàba", "māma", "shénme"],
        focusSituations: ["apresentar familiares", "perguntar o que é algo"],
        lessons: [
          {
            id: "l24",
            title: "Pai e mãe",
            skill: "fala",
            premium: true,
            steps: [
              flash("zheshibaba"),
              flash("zheshimama"),
              listen("这是我爸爸", "zhè shì wǒ bàba", "Este é meu pai."),
              listen("这是我妈妈", "zhè shì wǒ māma", "Esta é minha mãe."),
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
            ],
          },
          {
            id: "l25",
            title: "Perguntas úteis",
            skill: "fala",
            premium: true,
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
        focusChunks: ["我喜欢中文", "我想喝茶", "多少钱？", "我要这个"],
        focusHanzi: [],
        focusGrammar: ["gosto com 喜欢", "desejo com 想/要", "pergunta de preço"],
        focusSounds: ["xǐhuan", "xiǎng hē chá", "duōshao qián", "wǒ yào"],
        focusSituations: ["dizer preferência", "pedir bebida", "perguntar preço"],
        lessons: [
          {
            id: "l26",
            title: "Fome e gosto",
            skill: "fala",
            premium: true,
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
            ],
          },
          {
            id: "l27",
            title: "Na loja",
            skill: "fala",
            premium: true,
            newHanzi: ["多", "少"],
            steps: [
              flash("duoshaoqian"),
              flash("taiguile"),
              flash("woyao"),
              flash("woxianghe"),
              listen("多少钱？", "duōshao qián?", "Quanto custa?"),
              listen("我要这个", "wǒ yào zhège", "Eu quero este."),
              listenSelect(
                "Ouça o pedido",
                "我想喝茶",
                ["我想喝茶", "我要这个", "多少钱？", "我喜欢中文"],
                "我想喝茶",
                "我想喝茶 pede chá como desejo."
              ),
              visualSceneChoice(
                "image_sentence_choice",
                "person_drinking_water",
                "Qual frase descreve a cena?",
                "我想喝水",
                sceneSentenceOptions("我想喝水", ["谢谢", "再见", "你好"]),
                { isNoHint: true, explanation: "我想喝水 pede água de forma natural." }
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
            ],
          },
          {
            id: "l28",
            title: "Vamos embora",
            skill: "fala",
            premium: true,
            steps: [
              flash("womenzouba"),
              comp("我们走吧", "wǒmen zǒu ba", "Vamos embora.", ["Vamos embora.", "Quero chá.", "Até logo.", "Muito caro!"]),
            ],
          },
          review("l10-rev", "fala", [flash("woxihuan"), flash("woxianghe"), flash("duoshaoqian")], true),
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
            ],
          },
          {
            id: "l30",
            title: "Leitura em voz alta",
            skill: "leitura",
            premium: true,
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
            ],
          },
          review("l11-rev", "leitura", [
            flash("woyousangepengyou"),
            flash("woxihuan"),
            flash("woxianghe"),
            flash("womenzouba"),
            recognize("san"),
            comp("我们走吧", "Wǒmen zǒu ba", "Vamos embora.", ["Vamos embora.", "Estou com fome.", "Até logo.", "Sou brasileiro."]),
            sentenceBuild(
              "Tenho três amigos",
              "Monte a frase do texto.",
              ["我", "有", "三", "个", "朋友"],
              ["朋友", "三", "个", "我", "有", "喜欢"],
              "我有三个朋友 reaparece como produção guiada."
            ),
          ], true),
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
