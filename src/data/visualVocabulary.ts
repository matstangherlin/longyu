import { CHARACTERS } from "./characters";

/** IDs internos — nunca URLs externas. */
export const VISUAL_CONCEPT_IDS = [
  "person",
  "tree",
  "mouth",
  "sun",
  "moon",
  "mountain",
  "water",
  "fire",
  "big",
  "small",
] as const;

export type VisualConceptId = (typeof VISUAL_CONCEPT_IDS)[number];

export type ImageChoiceMode =
  | "image_to_hanzi"
  | "image_to_pinyin"
  | "image_to_meaning"
  | "image_to_audio"
  | "audio_to_image"
  | "hanzi_to_image"
  | "meaning_to_image"
  | "image_sentence_choice"
  | "choose_hanzi"
  | "choose_pinyin"
  | "choose_meaning"
  | "listen_and_choose_image"
  | "choose_image";

export type CanonicalImageChoiceMode =
  | "image_to_hanzi"
  | "image_to_pinyin"
  | "image_to_meaning"
  | "image_to_audio"
  | "audio_to_image"
  | "hanzi_to_image"
  | "meaning_to_image"
  | "image_sentence_choice";

const LEGACY_MODE_MAP: Record<string, CanonicalImageChoiceMode> = {
  choose_hanzi: "image_to_hanzi",
  choose_pinyin: "image_to_pinyin",
  choose_meaning: "image_to_meaning",
  listen_and_choose_image: "audio_to_image",
  choose_image: "hanzi_to_image",
};

export function normalizeImageChoiceMode(mode?: ImageChoiceMode): CanonicalImageChoiceMode {
  if (!mode) return "image_to_hanzi";
  return LEGACY_MODE_MAP[mode] ?? (mode as CanonicalImageChoiceMode);
}

/** Aluno escolhe imagem real (grade 2×2). */
export function imageChoiceUsesImageOptions(mode?: ImageChoiceMode): boolean {
  const normalized = normalizeImageChoiceMode(mode);
  return normalized === "hanzi_to_image" || normalized === "audio_to_image" || normalized === "meaning_to_image";
}

/** Aluno ouve opções e escolhe o som certo. */
export function imageChoiceUsesAudioOptions(mode?: ImageChoiceMode): boolean {
  return normalizeImageChoiceMode(mode) === "image_to_audio";
}

/** Estímulo principal é uma foto/cena. */
export function imageChoiceShowsImageStimulus(mode?: ImageChoiceMode): boolean {
  const normalized = normalizeImageChoiceMode(mode);
  return (
    normalized === "image_to_hanzi" ||
    normalized === "image_to_pinyin" ||
    normalized === "image_to_meaning" ||
    normalized === "image_to_audio" ||
    normalized === "image_sentence_choice"
  );
}

/** Estímulo principal é áudio (sem imagem grande). */
export function imageChoiceShowsAudioStimulus(mode?: ImageChoiceMode): boolean {
  return normalizeImageChoiceMode(mode) === "audio_to_image";
}

/** Estímulo principal é hànzì. */
export function imageChoiceShowsHanziStimulus(mode?: ImageChoiceMode): boolean {
  return normalizeImageChoiceMode(mode) === "hanzi_to_image";
}

/** Estímulo principal é significado em português. */
export function imageChoiceShowsMeaningStimulus(mode?: ImageChoiceMode): boolean {
  return normalizeImageChoiceMode(mode) === "meaning_to_image";
}

/** Respostas são frases completas em chinês. */
export function imageChoiceUsesSentenceOptions(mode?: ImageChoiceMode): boolean {
  return normalizeImageChoiceMode(mode) === "image_sentence_choice";
}

export const CANONICAL_IMAGE_CHOICE_MODES: CanonicalImageChoiceMode[] = [
  "image_to_hanzi",
  "image_to_pinyin",
  "image_to_meaning",
  "image_to_audio",
  "audio_to_image",
  "hanzi_to_image",
  "meaning_to_image",
  "image_sentence_choice",
];

export interface VisualConcept {
  id: VisualConceptId;
  charId: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  /** Caminho local relativo a src/assets/visuals; o mapa do Vite resolve o import final. */
  imageSrc?: string;
  imageAltPt: string;
  imageKind: "photo" | "illustration" | "svg_fallback";
  sceneTags?: string[];
  /** Fallback terciário, depois da imagem local e do SVG. */
  emoji: string;
  /** Índice da unidade na jornada após a qual o conceito pode aparecer em exercícios avançados. */
  afterUnitIndex: number;
}

export const VISUAL_CONCEPTS: VisualConcept[] = [
  { id: "person", charId: "ren", hanzi: "人", pinyin: "rén", meaningPt: "pessoa", imageSrc: "people/person.webp", imageAltPt: "Foto de uma pessoa em fundo neutro", imageKind: "photo", sceneTags: ["people", "person"], emoji: "🧑", afterUnitIndex: 0 },
  { id: "tree", charId: "mu", hanzi: "木", pinyin: "mù", meaningPt: "árvore", imageSrc: "nature/tree.webp", imageAltPt: "Foto de uma árvore isolada em um campo", imageKind: "photo", sceneTags: ["nature", "object"], emoji: "🌳", afterUnitIndex: 0 },
  { id: "mouth", charId: "kou", hanzi: "口", pinyin: "kǒu", meaningPt: "boca", imageSrc: "people/mouth.webp", imageAltPt: "Foto aproximada de uma boca humana", imageKind: "photo", sceneTags: ["people", "body"], emoji: "👄", afterUnitIndex: 6 },
  { id: "sun", charId: "ri", hanzi: "日", pinyin: "rì", meaningPt: "sol", imageSrc: "nature/sun.webp", imageAltPt: "Foto do sol brilhando em céu azul", imageKind: "photo", sceneTags: ["nature", "sky"], emoji: "☀️", afterUnitIndex: 6 },
  { id: "moon", charId: "yue", hanzi: "月", pinyin: "yuè", meaningPt: "lua", imageSrc: "nature/moon.webp", imageAltPt: "Foto da lua crescente no céu noturno", imageKind: "photo", sceneTags: ["nature", "sky"], emoji: "🌙", afterUnitIndex: 6 },
  { id: "mountain", charId: "shan", hanzi: "山", pinyin: "shān", meaningPt: "montanha", imageSrc: "nature/mountain.webp", imageAltPt: "Foto de um pico de montanha rochoso", imageKind: "photo", sceneTags: ["nature", "landscape"], emoji: "⛰️", afterUnitIndex: 6 },
  { id: "water", charId: "shui", hanzi: "水", pinyin: "shuǐ", meaningPt: "água", imageSrc: "nature/water.webp", imageAltPt: "Foto de água limpa caindo e formando respingos", imageKind: "photo", sceneTags: ["nature", "liquid"], emoji: "💧", afterUnitIndex: 6 },
  { id: "fire", charId: "huo", hanzi: "火", pinyin: "huǒ", meaningPt: "fogo", imageSrc: "nature/fire.webp", imageAltPt: "Foto de uma pequena fogueira controlada", imageKind: "photo", sceneTags: ["nature", "element"], emoji: "🔥", afterUnitIndex: 6 },
  { id: "big", charId: "da", hanzi: "大", pinyin: "dà", meaningPt: "grande", imageSrc: "daily-life/big.webp", imageAltPt: "Bola vermelha muito grande ao lado de um cubo pequeno", imageKind: "illustration", sceneTags: ["daily-life", "size"], emoji: "⬛", afterUnitIndex: 6 },
  { id: "small", charId: "xiao", hanzi: "小", pinyin: "xiǎo", meaningPt: "pequeno", imageSrc: "daily-life/small.webp", imageAltPt: "Bola vermelha pequena ao lado de um cubo grande", imageKind: "illustration", sceneTags: ["daily-life", "size"], emoji: "▫️", afterUnitIndex: 6 },
];

export const visualById = Object.fromEntries(VISUAL_CONCEPTS.map((concept) => [concept.id, concept])) as Record<
  VisualConceptId,
  VisualConcept
>;

export const visualByCharId = Object.fromEntries(VISUAL_CONCEPTS.map((concept) => [concept.charId, concept])) as Partial<
  Record<string, VisualConcept>
>;

const charById = new Map(CHARACTERS.map((char) => [char.id, char]));

export function resolveVisualConcept(id: string | undefined): VisualConcept | undefined {
  if (!id) return undefined;
  if (id in visualById) return visualById[id as VisualConceptId];
  const byChar = CHARACTERS.find((char) => char.id === id || char.hanzi === id);
  if (byChar) return visualByCharId[byChar.id];
  return undefined;
}

export function isVisualConceptAllowed(conceptId: string, unitIndex: number): boolean {
  const concept = resolveVisualConcept(conceptId);
  if (!concept) return false;
  return unitIndex >= concept.afterUnitIndex;
}

export function visualConceptForChar(charId: string): VisualConcept | undefined {
  return visualByCharId[charId];
}

export function enrichVisualFromChar(concept: VisualConcept): VisualConcept {
  const char = charById.get(concept.charId);
  if (!char) return concept;
  return {
    ...concept,
    hanzi: char.hanzi,
    pinyin: char.pinyin,
    meaningPt: char.meaningPt.replace(/\.$/, ""),
  };
}

export function defaultVisualDistractors(targetId: VisualConceptId, count = 3): VisualConceptId[] {
  const pool = VISUAL_CONCEPT_IDS.filter((id) => id !== targetId);
  const similar: Partial<Record<VisualConceptId, VisualConceptId[]>> = {
    person: ["mouth", "big", "small"],
    tree: ["mountain", "fire", "mouth"],
    mouth: ["person", "sun", "moon"],
    sun: ["moon", "fire", "big"],
    moon: ["sun", "water", "small"],
    mountain: ["tree", "fire", "big"],
    water: ["fire", "moon", "mouth"],
    fire: ["sun", "water", "tree"],
    big: ["small", "person", "mountain"],
    small: ["big", "mouth", "moon"],
  };
  const preferred = similar[targetId] ?? [];
  const ordered = [...preferred, ...pool.filter((id) => !preferred.includes(id))];
  return ordered.slice(0, count);
}
