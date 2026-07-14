/**
 * Camada 2 de imagens: ações e situações (VisualScene).
 * Diferente de VisualConcept (conceito isolado: árvore, água, pessoa).
 */

import { CHARACTERS } from "./characters";
import { CHUNKS } from "./chunks";

export const VISUAL_SCENE_IDS = [
  "scene-greeting",
  "scene-thanking",
  "scene-farewell",
  "scene-introduce-name",
  "scene-drink-water",
  "scene-point-tree",
  "scene-look-mountain",
  "scene-classroom",
  "scene-confused",
  "scene-request-repeat",
  "scene-big-small",
  "scene-count-units",
] as const;

export type VisualSceneId = (typeof VISUAL_SCENE_IDS)[number];

export interface VisualScene {
  id: string;
  imageSrc: string;
  /** Alt completa (catálogo / acessibilidade fora do exercício avaliado). */
  imageAltPt: string;
  /** Alt neutra usada em exercícios avaliados — não entrega a resposta. */
  exerciseAltPt: string;
  targetChunkIds: string[];
  /** Hànzì isolados ligados à cena quando não há chunk frasal. */
  targetCharIds?: string[];
  /** Frase completa preferida para image_sentence_choice (quando diferir do chunk). */
  targetSentence?: string;
  targetMeaningPt: string;
  sceneTags: string[];
  allowedAfterLessons: string[];
}

export const VISUAL_SCENES: VisualScene[] = [
  {
    id: "scene-greeting",
    imageSrc: "actions/greeting.webp",
    imageAltPt: "Duas pessoas se cumprimentando com um gesto amigável",
    exerciseAltPt: "Cena com duas pessoas",
    targetChunkIds: ["nihao"],
    targetMeaningPt: "Cumprimentar / dizer olá",
    sceneTags: ["greeting", "people", "action"],
    allowedAfterLessons: ["l2", "p1-engine-2-lab"],
  },
  {
    id: "scene-thanking",
    imageSrc: "actions/thanking.webp",
    imageAltPt: "Pessoa fazendo um gesto de agradecimento",
    exerciseAltPt: "Cena com uma pessoa",
    targetChunkIds: ["xiexie"],
    targetMeaningPt: "Agradecer",
    sceneTags: ["thanks", "people", "action"],
    allowedAfterLessons: ["l4"],
  },
  {
    id: "scene-farewell",
    imageSrc: "actions/farewell.webp",
    imageAltPt: "Pessoa se despedindo com a mão levantada",
    exerciseAltPt: "Cena em um caminho",
    targetChunkIds: ["zaijian"],
    targetMeaningPt: "Despedir-se",
    sceneTags: ["farewell", "people", "action"],
    allowedAfterLessons: ["p1-ate-logo", "l4"],
  },
  {
    id: "scene-introduce-name",
    imageSrc: "actions/introduce-name.webp",
    imageAltPt: "Pessoa apontando para si ao se apresentar",
    exerciseAltPt: "Cena com uma pessoa",
    targetChunkIds: ["wojiao"],
    targetMeaningPt: "Dizer o próprio nome",
    sceneTags: ["introduction", "people", "action"],
    allowedAfterLessons: ["l9"],
  },
  {
    id: "scene-drink-water",
    imageSrc: "actions/drink-water.webp",
    imageAltPt: "Pessoa bebendo água de um copo",
    exerciseAltPt: "Cena com uma pessoa e um copo",
    targetChunkIds: ["woxiangheshui", "zheshishui"],
    targetSentence: "我想喝水",
    targetMeaningPt: "Beber água / querer beber água",
    sceneTags: ["drink", "water", "action", "daily-life"],
    allowedAfterLessons: ["p1-primeiros-hanzi", "l27"],
  },
  {
    id: "scene-point-tree",
    imageSrc: "actions/point-tree.webp",
    imageAltPt: "Pessoa apontando para uma árvore",
    exerciseAltPt: "Cena ao ar livre",
    targetChunkIds: [],
    targetCharIds: ["mu"],
    targetSentence: "这是木",
    targetMeaningPt: "Identificar uma árvore apontando",
    sceneTags: ["tree", "point", "nature", "action"],
    allowedAfterLessons: ["p1-primeiros-hanzi", "l24"],
  },
  {
    id: "scene-look-mountain",
    imageSrc: "actions/look-mountain.webp",
    imageAltPt: "Pessoa olhando para uma montanha ao longe",
    exerciseAltPt: "Cena de paisagem",
    targetChunkIds: [],
    targetCharIds: ["shan"],
    targetSentence: "这是山",
    targetMeaningPt: "Olhar / localizar uma montanha",
    sceneTags: ["mountain", "look", "nature", "action"],
    allowedAfterLessons: ["p1-primeiros-hanzi"],
  },
  {
    id: "scene-classroom",
    imageSrc: "classroom/classroom.webp",
    imageAltPt: "Sala de aula com quadro e mesas",
    exerciseAltPt: "Cena em um ambiente interno",
    targetChunkIds: ["nihao", "woquxuexiao"],
    targetSentence: "你好",
    targetMeaningPt: "Estar na sala de aula / escola",
    sceneTags: ["classroom", "school", "setting"],
    allowedAfterLessons: ["l2", "l1"],
  },
  {
    id: "scene-confused",
    imageSrc: "actions/confused.webp",
    imageAltPt: "Pessoa com expressão de dúvida e confusão",
    exerciseAltPt: "Cena com uma pessoa",
    targetChunkIds: ["tingbudong"],
    targetMeaningPt: "Não entender",
    sceneTags: ["confused", "learning", "action"],
    allowedAfterLessons: ["l11"],
  },
  {
    id: "scene-request-repeat",
    imageSrc: "actions/request-repeat.webp",
    imageAltPt: "Pessoa pedindo para ouvir de novo com gesto de escuta",
    exerciseAltPt: "Cena com uma pessoa",
    targetChunkIds: ["qingzaishuoyibian"],
    targetMeaningPt: "Pedir para repetir",
    sceneTags: ["repeat", "learning", "action"],
    allowedAfterLessons: ["l11"],
  },
  {
    id: "scene-big-small",
    imageSrc: "objects/big-small.webp",
    imageAltPt: "Objeto grande ao lado de um objeto pequeno",
    exerciseAltPt: "Dois objetos lado a lado",
    targetChunkIds: [],
    targetCharIds: ["da", "xiao"],
    targetSentence: "大",
    targetMeaningPt: "Contraste grande e pequeno",
    sceneTags: ["size", "big", "small", "object"],
    allowedAfterLessons: ["p4-char-da", "p4-char-xiao"],
  },
  {
    id: "scene-count-units",
    imageSrc: "objects/count-units.webp",
    imageAltPt: "Uma, duas e três unidades do mesmo objeto",
    exerciseAltPt: "Grupos de objetos",
    targetChunkIds: [],
    targetCharIds: ["yi", "er", "san"],
    targetSentence: "三",
    targetMeaningPt: "Contar uma, duas e três unidades",
    sceneTags: ["numbers", "count", "object"],
    allowedAfterLessons: ["p4-num-123", "l14"],
  },
];

export const visualSceneById = Object.fromEntries(VISUAL_SCENES.map((scene) => [scene.id, scene])) as Record<
  string,
  VisualScene
>;

const chunkById = Object.fromEntries(CHUNKS.map((chunk) => [chunk.id, chunk]));
const charById = Object.fromEntries(CHARACTERS.map((char) => [char.id, char]));

export function resolveVisualScene(id: string | undefined): VisualScene | undefined {
  if (!id) return undefined;
  return visualSceneById[id];
}

export function isVisualSceneAllowed(sceneId: string, completedLessons: readonly string[]): boolean {
  const scene = resolveVisualScene(sceneId);
  if (!scene) return false;
  if (scene.allowedAfterLessons.length === 0) return true;
  return scene.allowedAfterLessons.some((lessonId) => completedLessons.includes(lessonId));
}

export function sceneHasExplicitTarget(scene: VisualScene): boolean {
  return scene.targetChunkIds.length > 0 || (scene.targetCharIds?.length ?? 0) > 0;
}

export function sceneTargetHanzi(scene: VisualScene): string | undefined {
  if (scene.targetSentence?.trim()) return scene.targetSentence.trim();
  for (const chunkId of scene.targetChunkIds) {
    const chunk = chunkById[chunkId];
    if (chunk?.hanzi) return chunk.hanzi;
  }
  for (const charId of scene.targetCharIds ?? []) {
    const char = charById[charId];
    if (char?.hanzi) return char.hanzi;
  }
  return undefined;
}

export function sceneTargetPinyin(scene: VisualScene): string | undefined {
  for (const chunkId of scene.targetChunkIds) {
    const chunk = chunkById[chunkId];
    if (chunk?.pinyin) return chunk.pinyin;
  }
  for (const charId of scene.targetCharIds ?? []) {
    const char = charById[charId];
    if (char?.pinyin) return char.pinyin;
  }
  return undefined;
}

export function defaultSceneDistractors(targetId: string, count = 3): string[] {
  const pool = VISUAL_SCENE_IDS.filter((id) => id !== targetId);
  const target = resolveVisualScene(targetId);
  const preferred = pool.filter((id) => {
    const scene = resolveVisualScene(id);
    if (!scene || !target) return false;
    return scene.sceneTags.some((tag) => target.sceneTags.includes(tag));
  });
  const ordered = [...preferred, ...pool.filter((id) => !preferred.includes(id))];
  return ordered.slice(0, count);
}

/** Frases/hànzì candidatos a partir da cena + distratores. */
export function sentenceOptionsForScene(sceneId: string, count = 4): string[] {
  const scene = resolveVisualScene(sceneId);
  if (!scene) return [];
  const correct = sceneTargetHanzi(scene);
  if (!correct) return [];
  const distractors: string[] = [];
  for (const other of VISUAL_SCENES) {
    if (other.id === sceneId) continue;
    const hanzi = sceneTargetHanzi(other);
    if (hanzi && hanzi !== correct && !distractors.includes(hanzi)) distractors.push(hanzi);
    if (distractors.length >= count - 1) break;
  }
  // Fallback distractors from related phrases when pool is thin.
  for (const fallback of ["这是水", "这是山", "这是木", "你好", "谢谢", "再见", "我很好", "一", "二", "三", "大", "小"]) {
    if (distractors.length >= count - 1) break;
    if (fallback !== correct && !distractors.includes(fallback)) distractors.push(fallback);
  }
  return [correct, ...distractors].slice(0, count);
}
