/**
 * RC2.3.13H — declarative dynamic AULA presentation metadata.
 * Presentation only: references canonical lesson/audio/asset IDs.
 */

export type TeachingBeatType =
  | "GUIDE_MESSAGE"
  | "VISUAL_EXAMPLE"
  | "IMAGE_EXAMPLE"
  | "MANDARIN_EXAMPLE"
  | "AUDIO_EXAMPLE"
  | "CONTRAST"
  | "REVEAL"
  | "DIAGRAM"
  | "MICRO_DEMO"
  | "CHECK_UNDERSTANDING"
  | "HANDOFF";

export type TeachingBeat = {
  id: string;
  type: TeachingBeatType;
  teacherLinePt: string;
  teacherLineEn: string;
  visualAssetId?: string;
  hanzi?: string;
  pinyin?: string;
  meaningPt?: string;
  meaningEn?: string;
  audioText?: string;
  captionPt?: string;
  captionEn?: string;
  /** Handoff destination hint (presentation only). */
  handoffHint?: "guided_try" | "tone_trainer" | "pinyin" | "hanzi_builder" | "conversation" | "topic";
};

export type LessonPresentation = {
  lessonId: string;
  capsuleId: string;
  beats: TeachingBeat[];
};

export const FOUNDATION_LESSON_PRESENTATIONS: LessonPresentation[] = [
  {
    lessonId: "foundation:mandarin",
    capsuleId: "capsule:foundation:mandarin:v1",
    beats: [
      {
        id: "m1",
        type: "GUIDE_MESSAGE",
        teacherLinePt: "Antes de qualquer pergunta, quero te mostrar como o mandarim funciona.",
        teacherLineEn: "Before any question, I want to show you how Mandarin works.",
      },
      {
        id: "m2",
        type: "IMAGE_EXAMPLE",
        teacherLinePt: "Duas pessoas se cumprimentam assim.",
        teacherLineEn: "Two people greet each other like this.",
        visualAssetId: "visual:greeting-nihao",
      },
      {
        id: "m3",
        type: "MANDARIN_EXAMPLE",
        teacherLinePt: "Escute: 你好.",
        teacherLineEn: "Listen: 你好.",
        hanzi: "你好",
        pinyin: "nǐ hǎo",
        meaningPt: "Olá",
        meaningEn: "Hello",
        audioText: "你好",
      },
      {
        id: "m4",
        type: "REVEAL",
        teacherLinePt: "你好 é a escrita. nǐ hǎo é o som. Olá é o significado.",
        teacherLineEn: "你好 is the writing. nǐ hǎo is the sound. Hello is the meaning.",
        hanzi: "你好",
        pinyin: "nǐ hǎo",
        meaningPt: "Olá",
        meaningEn: "Hello",
      },
      {
        id: "m5",
        type: "HANDOFF",
        teacherLinePt: "Você já viu sua primeira palavra. Agora vamos testar isso.",
        teacherLineEn: "You've seen your first word. Now let's try it.",
        handoffHint: "conversation",
      },
    ],
  },
  {
    lessonId: "foundation:pinyin",
    capsuleId: "capsule:foundation:pinyin:v1",
    beats: [
      {
        id: "p1",
        type: "GUIDE_MESSAGE",
        teacherLinePt: "Pinyin mostra como pronunciar o mandarim com letras que você já conhece.",
        teacherLineEn: "Pinyin shows how to pronounce Mandarin with letters you already know.",
      },
      {
        id: "p2",
        type: "MANDARIN_EXAMPLE",
        teacherLinePt: "Olhe o hànzì primeiro.",
        teacherLineEn: "Look at the hànzì first.",
        hanzi: "你好",
      },
      {
        id: "p3",
        type: "REVEAL",
        teacherLinePt: "Agora o som: nǐ hǎo.",
        teacherLineEn: "Now the sound: nǐ hǎo.",
        hanzi: "你好",
        pinyin: "nǐ hǎo",
        audioText: "你好",
      },
      {
        id: "p4",
        type: "IMAGE_EXAMPLE",
        teacherLinePt: "Inicial, final e tom — três partes do mesmo som.",
        teacherLineEn: "Initial, final, and tone — three parts of one sound.",
        visualAssetId: "visual:pinyin-layers",
      },
      {
        id: "p5",
        type: "HANDOFF",
        teacherLinePt: "Agora vamos ler algumas sílabas em voz alta.",
        teacherLineEn: "Now let's read a few syllables out loud.",
        handoffHint: "pinyin",
      },
    ],
  },
  {
    lessonId: "foundation:tone",
    capsuleId: "capsule:foundation:tone:v1",
    beats: [
      {
        id: "t1",
        type: "GUIDE_MESSAGE",
        teacherLinePt: "Em mandarim, mudar a melodia pode mudar a palavra.",
        teacherLineEn: "In Mandarin, changing the melody can change the word.",
      },
      {
        id: "t2",
        type: "VISUAL_EXAMPLE",
        teacherLinePt: "Quatro movimentos simples.",
        teacherLineEn: "Four simple movements.",
        visualAssetId: "visual:tones-four-contours",
      },
      {
        id: "t3",
        type: "AUDIO_EXAMPLE",
        teacherLinePt: "Ouça mā, má, mǎ, mà.",
        teacherLineEn: "Listen to mā, má, mǎ, mà.",
        audioText: "妈",
        captionPt: "Mesma sílaba, melodias diferentes.",
        captionEn: "Same syllable, different melodies.",
      },
      {
        id: "t4",
        type: "CONTRAST",
        teacherLinePt: "Não memorize o número. Ouça o movimento.",
        teacherLineEn: "Don't memorize the number. Hear the movement.",
        visualAssetId: "visual:tones-four-contours",
      },
      {
        id: "t5",
        type: "HANDOFF",
        teacherLinePt: "Você já viu como o tom se move. Agora vamos ver se seu ouvido percebe.",
        teacherLineEn: "You've seen how tone moves. Now let's see if your ear catches it.",
        handoffHint: "tone_trainer",
      },
    ],
  },
  {
    lessonId: "foundation:hanzi",
    capsuleId: "capsule:foundation:hanzi:v1",
    beats: [
      {
        id: "h1",
        type: "GUIDE_MESSAGE",
        teacherLinePt: "Hànzì não é um desenho aleatório — muitas peças têm história.",
        teacherLineEn: "Hànzì aren't random drawings — many pieces have a story.",
      },
      {
        id: "h2",
        type: "MANDARIN_EXAMPLE",
        teacherLinePt: "Olhe: 木.",
        teacherLineEn: "Look: 木.",
        hanzi: "木",
        meaningPt: "árvore / madeira",
        meaningEn: "tree / wood",
      },
      {
        id: "h3",
        type: "IMAGE_EXAMPLE",
        teacherLinePt: "Parece uma árvore simples.",
        teacherLineEn: "It looks like a simple tree.",
        visualAssetId: "visual:hanzi-mu-tree",
      },
      {
        id: "h4",
        type: "GUIDE_MESSAGE",
        teacherLinePt: "Você não precisa decorar um desenho inteiro de uma vez.",
        teacherLineEn: "You don't need to memorize a whole drawing at once.",
      },
      {
        id: "h5",
        type: "HANDOFF",
        teacherLinePt: "Agora vamos montar alguns hànzì com peças.",
        teacherLineEn: "Now let's build a few hànzì from parts.",
        handoffHint: "hanzi_builder",
      },
    ],
  },
  {
    lessonId: "foundation:hanzi-components",
    capsuleId: "capsule:foundation:hanzi-components:v1",
    beats: [
      {
        id: "c1",
        type: "GUIDE_MESSAGE",
        teacherLinePt: "Muitos hànzì são feitos de peças que se repetem.",
        teacherLineEn: "Many hànzì are made of repeating parts.",
      },
      {
        id: "c2",
        type: "DIAGRAM",
        teacherLinePt: "Reconhecer a peça acelera a leitura.",
        teacherLineEn: "Recognizing the part speeds up reading.",
        visualAssetId: "visual:hanzi-mu-tree",
      },
      {
        id: "c3",
        type: "HANDOFF",
        teacherLinePt: "Você já viu que os hànzì são feitos de peças. Vamos montar alguns?",
        teacherLineEn: "You've seen that hànzì are made of parts. Shall we build a few?",
        handoffHint: "hanzi_builder",
      },
    ],
  },
];

export function presentationForCapsule(capsuleId: string): LessonPresentation | undefined {
  return FOUNDATION_LESSON_PRESENTATIONS.find((p) => p.capsuleId === capsuleId);
}

export function allDynamicAulaCapsuleIds(): string[] {
  return FOUNDATION_LESSON_PRESENTATIONS.map((p) => p.capsuleId);
}
