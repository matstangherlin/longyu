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
  emoji: string;
  /** Índice da unidade na jornada após a qual o conceito pode aparecer em exercícios avançados. */
  afterUnitIndex: number;
}

export const VISUAL_CONCEPTS: VisualConcept[] = [
  { id: "person", charId: "ren", hanzi: "人", pinyin: "rén", meaningPt: "pessoa", emoji: "🧑", afterUnitIndex: 6 },
  { id: "tree", charId: "mu", hanzi: "木", pinyin: "mù", meaningPt: "árvore", emoji: "🌳", afterUnitIndex: 6 },
  { id: "mouth", charId: "kou", hanzi: "口", pinyin: "kǒu", meaningPt: "boca", emoji: "👄", afterUnitIndex: 6 },
  { id: "sun", charId: "ri", hanzi: "日", pinyin: "rì", meaningPt: "sol", emoji: "☀️", afterUnitIndex: 6 },
  { id: "moon", charId: "yue", hanzi: "月", pinyin: "yuè", meaningPt: "lua", emoji: "🌙", afterUnitIndex: 6 },
  { id: "mountain", charId: "shan", hanzi: "山", pinyin: "shān", meaningPt: "montanha", emoji: "⛰️", afterUnitIndex: 6 },
  { id: "water", charId: "shui", hanzi: "水", pinyin: "shuǐ", meaningPt: "água", emoji: "💧", afterUnitIndex: 6 },
  { id: "fire", charId: "huo", hanzi: "火", pinyin: "huǒ", meaningPt: "fogo", emoji: "🔥", afterUnitIndex: 6 },
  { id: "big", charId: "da", hanzi: "大", pinyin: "dà", meaningPt: "grande", emoji: "⬛", afterUnitIndex: 6 },
  { id: "small", charId: "xiao", hanzi: "小", pinyin: "xiǎo", meaningPt: "pequeno", emoji: "▫️", afterUnitIndex: 6 },
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
