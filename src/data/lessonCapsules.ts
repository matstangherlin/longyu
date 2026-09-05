import type { InstructionLocale } from "../i18n/config";
import { FOUNDATION_TARGET_IDS } from "./pedagogicalSpine";

export type LessonCapsuleMediaType = "ANIMATED_CAPSULE" | "VIDEO_CAPSULE";
export type LessonCapsuleCompletionRule = "VIEW_ALL_SEGMENTS" | "MEDIA_ENDED" | "INTERACTION_COMPLETE";

export interface LessonCapsuleSegment {
  id: string;
  kind: "ORIENT" | "EXPLAIN" | "DEMONSTRATE" | "REPLAY" | "CHECK";
  title: string;
  body: string;
  hanzi?: string;
  pinyin?: string;
  meaning?: string;
  audioText?: string;
}

export interface LessonCapsuleLocalizedContent {
  title: string;
  objective: string;
  transcript: string;
  captions: Array<{ startSeconds: number; endSeconds: number; text: string }>;
  segments: LessonCapsuleSegment[];
  /**
   * V4.9.2B — Parte D: a mídia é localizada, a cápsula não.
   *
   * `capsule:pinyin-foundation:v1` continua sendo uma identidade só. O que
   * muda com o idioma é qual arquivo toca, qual voz fala e quais legendas
   * aparecem — nunca o id da cápsula, o alvo de conhecimento ou o tópico.
   * Ausente quando o conteúdo localizado não tem mídia própria.
   */
  mediaAssetId?: string;
}

export interface LessonCapsule {
  id: string;
  topicId: string;
  /**
   * Onde a cápsula aparece na Jornada, para cápsulas publicadas em runtime.
   *
   * As embutidas são posicionadas por um `JourneyNode` no orquestrador, que
   * pode declarar pré-requisitos revisados em code review. Uma cápsula que
   * chega pelo catálogo não tem essa revisão, então só pode dizer DEPOIS DE
   * QUAL TÓPICO aparecer — nunca o que ela exige nem o que ela destrava.
   */
  afterTopicId?: string;
  mediaType: LessonCapsuleMediaType;
  durationSeconds: number;
  poster?: string;
  mediaUrl?: string;
  completionRule: LessonCapsuleCompletionRule;
  knowledgeTargets: string[];
  localized: Record<InstructionLocale, LessonCapsuleLocalizedContent>;
}

export const PINYIN_FOUNDATION_CAPSULE: LessonCapsule = {
  id: "capsule:pinyin-foundation:v1",
  topicId: "p1-o-que-e-pinyin",
  mediaType: "ANIMATED_CAPSULE",
  durationSeconds: 48,
  completionRule: "VIEW_ALL_SEGMENTS",
  knowledgeTargets: [FOUNDATION_TARGET_IDS.nihao, FOUNDATION_TARGET_IDS.pinyin],
  localized: {
    "pt-BR": {
      mediaAssetId: "media:pinyin-foundation:pt:v1",
      title: "Pinyin: o mapa do som",
      objective: "Entender como letras e marcas ajudam você a reproduzir a pronúncia do mandarim.",
      transcript: "Primeiro ouça 你好. A fala é mandarim. nǐ hǎo é pinyin: um mapa do som. 你好 é hànzì; Olá é o significado.",
      captions: [
        { startSeconds: 0, endSeconds: 10, text: "Primeiro, ouça o mandarim." },
        { startSeconds: 10, endSeconds: 28, text: "nǐ hǎo registra a pronúncia com letras e marcas de tom." },
        { startSeconds: 28, endSeconds: 48, text: "Pinyin guia o som; não é tradução nem hànzì." },
      ],
      segments: [
        { id: "orient", kind: "ORIENT", title: "Um mapa para os ouvidos", body: "Você vai aprender a ler a pista de pronúncia que acompanha o mandarim." },
        { id: "hear", kind: "DEMONSTRATE", title: "Ouça primeiro", body: "Isto é mandarim falado.", hanzi: "你好", audioText: "你好" },
        { id: "notice", kind: "EXPLAIN", title: "Agora veja o mapa", body: "nǐ hǎo é pinyin: letras latinas e marcas que registram a pronúncia.", hanzi: "你好", pinyin: "nǐ hǎo", meaning: "Olá" },
        { id: "layers", kind: "CHECK", title: "Três camadas, três papéis", body: "Mandarim é o som; pinyin guia a pronúncia; hànzì é a escrita. Pronto: agora os exercícios podem cobrar essa diferença.", hanzi: "你好", pinyin: "nǐ hǎo", meaning: "Olá" },
      ],
    },
    en: {
      mediaAssetId: "media:pinyin-foundation:en:v1",
      title: "Pinyin: a map of sound",
      objective: "Understand how letters and tone marks help you reproduce Mandarin pronunciation.",
      transcript: "First, listen to 你好. The spoken language is Mandarin. nǐ hǎo is pinyin: a map of sound. 你好 is hànzì; Hello is the meaning.",
      captions: [
        { startSeconds: 0, endSeconds: 10, text: "First, listen to Mandarin." },
        { startSeconds: 10, endSeconds: 28, text: "nǐ hǎo records pronunciation with letters and tone marks." },
        { startSeconds: 28, endSeconds: 48, text: "Pinyin guides sound; it is not a translation or hànzì." },
      ],
      segments: [
        { id: "orient", kind: "ORIENT", title: "A map for your ears", body: "You will learn to read the pronunciation guide that accompanies Mandarin." },
        { id: "hear", kind: "DEMONSTRATE", title: "Listen first", body: "This is spoken Mandarin.", hanzi: "你好", audioText: "你好" },
        { id: "notice", kind: "EXPLAIN", title: "Now look at the map", body: "nǐ hǎo is pinyin: Latin letters and marks that record pronunciation.", hanzi: "你好", pinyin: "nǐ hǎo", meaning: "Hello" },
        { id: "layers", kind: "CHECK", title: "Three layers, three roles", body: "Mandarin is the sound; pinyin guides pronunciation; hànzì is the writing. You are now ready for the exercises.", hanzi: "你好", pinyin: "nǐ hǎo", meaning: "Hello" },
      ],
    },
  },
};

export const LESSON_CAPSULES: LessonCapsule[] = [PINYIN_FOUNDATION_CAPSULE];

export function getLessonCapsule(id: string): LessonCapsule | undefined {
  return LESSON_CAPSULES.find((capsule) => capsule.id === id);
}
