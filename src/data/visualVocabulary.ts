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
  | "choose_hanzi"
  | "choose_pinyin"
  | "choose_meaning"
  | "listen_and_choose_image"
  | "choose_image";

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

export function hasValidVisualImage(concept: VisualConcept | undefined): boolean {
  if (!concept) return false;
  return Boolean(String(concept.imageSrc ?? "").trim() || String(concept.emoji ?? "").trim());
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

/** Distratores permitidos no índice da unidade atual (respeita afterUnitIndex + imagem válida). */
export function defaultVisualDistractorsForUnit(
  targetId: VisualConceptId,
  unitIndex: number,
  count = 3
): VisualConceptId[] {
  return defaultVisualDistractors(targetId, VISUAL_CONCEPT_IDS.length)
    .filter((id) => isVisualConceptAllowed(id, unitIndex) && hasValidVisualImage(resolveVisualConcept(id)))
    .slice(0, count);
}

/** Resolve conceito a partir de charId, hànzì ou id de conceito. */
export function resolveVisualConceptFromFocus(input: {
  charId?: string;
  hanzi?: string;
  conceptId?: string;
}): VisualConcept | undefined {
  if (input.conceptId) {
    const byId = resolveVisualConcept(input.conceptId);
    if (byId) return byId;
  }
  if (input.charId) {
    const byChar = visualConceptForChar(input.charId) ?? resolveVisualConcept(input.charId);
    if (byChar) return byChar;
  }
  const glyphs = String(input.hanzi ?? "").replace(/[，。！？、,.!?\s]/g, "");
  for (const glyph of glyphs) {
    const byGlyph = resolveVisualConcept(glyph);
    if (byGlyph) return byGlyph;
  }
  return undefined;
}
