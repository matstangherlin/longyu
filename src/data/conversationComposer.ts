import { chunkById } from "./chunks";
import { charById } from "./characters";
import type { Lesson, LessonStageId } from "./journey";
import {
  CONVERSATION_SCENES,
  conversationScenesForRefs,
  type ConversationCharacter,
  type ConversationLine,
  type ConversationSceneStep,
  type ConversationSetting,
} from "./conversationScenes";

export type ConversationDifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface ConversationComposerContext {
  learnedChunkRefs: string[];
  learnedCharRefs: string[];
  learnedVocabRefs?: string[];
  recentErrors?: Array<{ targets?: Array<{ type: string; itemId: string }> }>;
  moduleId?: string;
  unitId?: string;
  phaseOrder?: number;
  phaseTier?: "fundamentos" | "intermediario" | "avancado";
  existingSceneIds?: string[];
  existingLineSignatures?: string[];
  stageId?: LessonStageId;
  isReview?: boolean;
  isImmersion?: boolean;
}

const PAIR_LIN_MEI: ConversationCharacter[] = [
  { id: "lin", name: "Lin", avatar: "lin", side: "left" },
  { id: "mei", name: "Mei", avatar: "mei", side: "right" },
];

interface ConversationRecipe {
  id: string;
  title: string;
  setting: ConversationSetting;
  /** Refs mínimos para gerar a cena. */
  minRefs: string[];
  /** Pelo menos um destes deve estar no foco atual. */
  triggerRefs: string[];
  build: (refs: Set<string>, level: ConversationDifficultyLevel) => ConversationSceneStep | null;
}

function refSet(context: ConversationComposerContext): Set<string> {
  return new Set([
    ...context.learnedChunkRefs,
    ...context.learnedCharRefs,
    ...(context.learnedVocabRefs ?? []),
  ]);
}

function hasRefs(refs: Set<string>, required: string[]): boolean {
  return required.every((ref) => refs.has(ref));
}

function touchesTrigger(refs: Set<string>, triggerRefs: string[]): boolean {
  return triggerRefs.some((ref) => refs.has(ref));
}

function lineSignature(lines: ConversationLine[]): string {
  return lines.map((line) => line.hanzi.trim()).join("|");
}

export function conversationLineSignature(lines: ConversationLine[]): string {
  return lineSignature(lines);
}

function chunkLine(chunkId: string, speakerId: string, emotion: ConversationLine["emotion"] = "neutral"): ConversationLine | null {
  const chunk = chunkById[chunkId];
  if (!chunk) return null;
  return {
    speakerId,
    hanzi: chunk.hanzi,
    pinyin: chunk.pinyin,
    pt: chunk.meaningPt,
    emotion,
    audioText: chunk.hanzi.replace(/[？。！，、]/g, ""),
  };
}

function charLine(charId: string, speakerId: string, pt?: string): ConversationLine | null {
  const char = charById[charId];
  if (!char) return null;
  return {
    speakerId,
    hanzi: char.hanzi,
    pinyin: char.pinyin,
    pt: pt ?? char.meaningPt,
    emotion: "neutral",
    audioText: char.hanzi,
  };
}

function applyDifficulty(scene: ConversationSceneStep, level: ConversationDifficultyLevel): ConversationSceneStep {
  const lines = scene.lines.map((line) => {
    if (level === 1) {
      return { ...line, revealMode: "tap" as const, pt: line.pt };
    }
    if (level === 2) {
      return { ...line, revealMode: "auto" as const, pt: undefined };
    }
    if (level === 3) {
      return { ...line, revealMode: "tap" as const, pt: undefined };
    }
    if (level === 4) {
      return { ...line, revealMode: "tap" as const, pt: undefined, hanzi: line.hanzi, pinyin: line.pinyin };
    }
    return { ...line, revealMode: "auto" as const, pt: undefined };
  });

  let checkpoint = scene.checkpoint;
  if (checkpoint && level >= 5 && checkpoint.type === "choose_reply") {
    const pieces = [...new Set([...checkpoint.correctAnswer, ...(checkpoint.options ?? [])])].slice(0, 6);
    checkpoint = {
      type: "order_reply",
      prompt: "Monte a resposta correta.",
      options: pieces,
      correctAnswer: checkpoint.correctAnswer,
      explanation: checkpoint.explanation,
    };
  }

  return { ...scene, lines, checkpoint, difficultyLevel: level };
}

export function conversationDifficultyForContext(context: ConversationComposerContext): ConversationDifficultyLevel {
  const order = context.phaseOrder ?? 1;
  if (context.isReview || context.stageId === "consolidation") return 5;
  if (context.stageId === "usage" && order >= 5) return 4;
  if (order >= 5) return 3;
  if (order >= 3) return 2;
  return 1;
}

export function isExplanatoryLesson(lesson: Lesson): boolean {
  const steps = lesson.steps ?? [];
  if (steps.length === 0) return true;
  return steps.every((step) => step.kind === "intro" || step.kind === "listen");
}

export function conversationSceneToLessonStep(scene: ConversationSceneStep): import("./journey").LessonStep {
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
    conversationDifficulty: scene.difficultyLevel,
    prompt: scene.checkpoint?.prompt,
    options: scene.checkpoint?.options,
    correctAnswer: scene.checkpoint?.correctAnswer,
    explanation: scene.checkpoint?.explanation,
    bank:
      scene.checkpoint?.type === "order_reply" || scene.checkpoint?.type === "fill_reply"
        ? scene.checkpoint.options
        : undefined,
  };
}

const RECIPES: ConversationRecipe[] = [
  {
    id: "greeting-echo",
    title: "Cumprimento curto",
    setting: "school",
    minRefs: ["chunk:nihao"],
    triggerRefs: ["chunk:nihao"],
    build: () => ({
      kind: "conversation_scene",
      sceneId: "composed-greeting-echo",
      title: "Cumprimento curto",
      setting: "school",
      characters: PAIR_LIN_MEI,
      lines: [
        { speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", audioText: "你好" },
        { speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", audioText: "你好" },
      ],
      checkpoint: {
        type: "choose_reply",
        prompt: "Alguém diz 你好. Como você responde?",
        options: ["你好", "谢谢", "再见", "不客气"],
        correctAnswer: "你好",
        explanation: "你好 também responde a um cumprimento.",
      },
      learnedRefs: ["chunk:nihao"],
    }),
  },
  {
    id: "thanks-exchange",
    title: "Agradecimento rápido",
    setting: "shop",
    minRefs: ["chunk:xiexie", "chunk:bukeqi"],
    triggerRefs: ["chunk:xiexie"],
    build: () => {
      const a = chunkLine("xiexie", "lin", "happy");
      const b = chunkLine("bukeqi", "mei");
      if (!a || !b) return null;
      return {
        kind: "conversation_scene",
        sceneId: "composed-thanks-exchange",
        title: "Agradecimento rápido",
        setting: "shop",
        characters: PAIR_LIN_MEI,
        lines: [a, b],
        checkpoint: {
          type: "choose_reply",
          prompt: "Alguém diz 谢谢. Qual resposta combina?",
          options: ["不客气", "你好", "再见", "我很好"],
          correctAnswer: "不客气",
          explanation: "不客气 responde naturalmente a 谢谢.",
        },
        learnedRefs: ["chunk:xiexie", "chunk:bukeqi"],
      };
    },
  },
  {
    id: "wellness-check",
    title: "Perguntando como está",
    setting: "park",
    minRefs: ["chunk:nihaoma", "chunk:wohenhao"],
    triggerRefs: ["chunk:nihaoma", "chunk:wohenhao", "char:wo", "char:ni", "char:hao"],
    build: () => {
      const a = chunkLine("nihaoma", "lin");
      const b = chunkLine("wohenhao", "mei", "happy");
      if (!a || !b) return null;
      return {
        kind: "conversation_scene",
        sceneId: "composed-wellness-check",
        title: "Perguntando como está",
        setting: "park",
        characters: PAIR_LIN_MEI,
        lines: [a, b],
        checkpoint: {
          type: "choose_meaning",
          prompt: "O que significa 我很好?",
          options: ["Estou bem.", "De nada.", "Até logo.", "Olá."],
          correctAnswer: "Estou bem.",
          explanation: "我很好 responde a 你好吗.",
        },
        learnedRefs: ["chunk:nihaoma", "chunk:wohenhao", "char:wo", "char:ni", "char:hao"],
      };
    },
  },
  {
    id: "water-request",
    title: "Pedindo água",
    setting: "home",
    minRefs: ["char:shui", "char:hao"],
    triggerRefs: ["char:shui", "vocab:v_woxiangheshui"],
    build: (refs) => {
      const aLine: ConversationLine = {
        speakerId: "lin",
        hanzi: "我想喝水。",
        pinyin: "wǒ xiǎng hē shuǐ.",
        pt: "Quero beber água.",
        emotion: "neutral",
        audioText: "我想喝水",
      };
      const b = charLine("hao", "mei", "Está bem; ok.");
      if (!b) return null;
      const usesPreview = refs.has("vocab:v_woxiangheshui");
      return {
        kind: "conversation_scene",
        sceneId: "composed-water-request",
        title: "Pedindo água",
        setting: "home",
        characters: PAIR_LIN_MEI,
        lines: [aLine, { ...b, hanzi: "好。", pinyin: "hǎo.", pt: "Ok." }],
        checkpoint: {
          type: "choose_reply",
          prompt: "Você pede água. Qual frase combina?",
          options: ["我想喝水", "谢谢", "再见", "你好"],
          correctAnswer: "我想喝水",
          explanation: "我想喝水 pede água de forma natural.",
        },
        learnedRefs: usesPreview
          ? ["char:shui", "char:hao", "char:wo"]
          : ["char:shui", "char:hao", "char:wo", "char:xiang_think", "char:he_drink"],
        newRefs: usesPreview ? ["vocab:v_woxiangheshui"] : undefined,
      };
    },
  },
  {
    id: "chinese-survival",
    title: "Falando chinês",
    setting: "classroom",
    minRefs: ["chunk:wobuhui", "chunk:nihaoma", "char:zhong"],
    triggerRefs: ["chunk:wobuhui", "char:zhong"],
    build: () => {
      const bLine = chunkLine("wobuhui", "mei", "confused");
      if (!bLine) return null;
      return {
        kind: "conversation_scene",
        sceneId: "composed-chinese-survival",
        title: "Falando chinês",
        setting: "classroom",
        characters: PAIR_LIN_MEI,
        lines: [
          {
            speakerId: "lin",
            hanzi: "你会说中文吗？",
            pinyin: "nǐ huì shuō Zhōngwén ma?",
            pt: "Você fala chinês?",
            emotion: "neutral",
            audioText: "你会说中文吗",
          },
          bLine,
        ],
      checkpoint: {
        type: "choose_reply",
        prompt: "Você não fala chinês ainda. O que responde?",
        options: ["我不会说中文", "你好", "谢谢", "我很好"],
        correctAnswer: "我不会说中文",
        explanation: "我不会说中文 é a resposta honesta para quem ainda está aprendendo.",
      },
      learnedRefs: ["chunk:wobuhui", "chunk:nihaoma", "char:zhong", "char:ni", "char:hui", "char:shuo", "char:wen_writing"],
      };
    },
  },
  {
    id: "farewell-echo",
    title: "Despedida curta",
    setting: "street",
    minRefs: ["chunk:zaijian"],
    triggerRefs: ["chunk:zaijian"],
    build: () => {
      const line = chunkLine("zaijian", "lin");
      if (!line) return null;
      return {
        kind: "conversation_scene",
        sceneId: "composed-farewell-echo",
        title: "Despedida curta",
        setting: "street",
        characters: PAIR_LIN_MEI,
        lines: [line, { ...line, speakerId: "mei", emotion: "happy" }],
        checkpoint: {
          type: "choose_reply",
          prompt: "Alguém diz 再见. Como você responde?",
          options: ["再见", "你好", "谢谢", "不客气"],
          correctAnswer: "再见",
          explanation: "再见 também responde a uma despedida.",
        },
        learnedRefs: ["chunk:zaijian"],
      };
    },
  },
];

function pickRecipe(refs: Set<string>, context: ConversationComposerContext): ConversationRecipe | null {
  const errorRefs = new Set(
    (context.recentErrors ?? []).flatMap((error) =>
      (error.targets ?? []).map((target) => `${target.type}:${target.itemId}`)
    )
  );

  const eligible = RECIPES.filter(
    (recipe) => hasRefs(refs, recipe.minRefs) && touchesTrigger(refs, recipe.triggerRefs)
  );
  if (eligible.length === 0) return null;

  const scored = eligible.map((recipe) => {
    let score = recipe.triggerRefs.filter((ref) => refs.has(ref)).length;
    if (errorRefs.size > 0 && recipe.triggerRefs.some((ref) => errorRefs.has(ref))) score += 3;
    if (context.isReview) score += 1;
    return { recipe, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.recipe ?? null;
}

function isDuplicateScene(scene: ConversationSceneStep, context: ConversationComposerContext): boolean {
  const signature = lineSignature(scene.lines);
  if (context.existingLineSignatures?.includes(signature)) return true;
  if (context.existingSceneIds?.includes(scene.sceneId)) return true;

  const authored = (context.existingSceneIds ?? []).some((id) => id === scene.sceneId);
  if (authored) return true;

  return CONVERSATION_SCENES.some((catalog) => lineSignature(catalog.lines) === signature);
}

export function buildConversationSceneForLesson(
  lesson: Lesson,
  context: ConversationComposerContext
): ConversationSceneStep | null {
  if (isExplanatoryLesson(lesson)) return null;

  const refs = refSet(context);
  if (refs.size < 1) return null;

  const level = conversationDifficultyForContext(context);
  const recipe = pickRecipe(refs, context);

  let scene: ConversationSceneStep | null = null;
  if (recipe) {
    scene = recipe.build(refs, level);
  } else {
    const catalogMatches = conversationScenesForRefs([...refs]);
    const unused = catalogMatches.find(
      (candidate) =>
        !context.existingSceneIds?.includes(candidate.sceneId) &&
        !context.existingLineSignatures?.includes(lineSignature(candidate.lines))
    );
    scene = unused ?? null;
  }

  if (!scene) return null;
  if (isDuplicateScene(scene, context)) return null;

  const chineseLines = scene.lines.filter((line) => line.hanzi.trim().length > 0);
  if (chineseLines.length < 2) return null;
  if (scene.lines.length > 6) return null;
  if (!scene.checkpoint?.correctAnswer?.trim()) return null;

  const hasLearnedLine = scene.learnedRefs.some((ref) => refs.has(ref));
  if (!hasLearnedLine) return null;

  return applyDifficulty(scene, level);
}

export const COMPOSED_CONVERSATION_RECIPES = RECIPES.map((recipe) => recipe.id);
