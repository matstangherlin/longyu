import type { VisualConceptId } from "./visualVocabulary";

export const VISUAL_SCENE_IDS = [
  "tree_single",
  "person_single",
  "water_glass",
  "fire_small",
  "sun_sky",
  "moon_night",
  "mountain_landscape",
  "person_drinking_water",
  "two_people_greeting",
  "person_saying_thanks",
  "person_leaving",
  "classroom_greeting",
] as const;

export type VisualSceneId = (typeof VISUAL_SCENE_IDS)[number];

export interface VisualScene {
  id: VisualSceneId;
  /** Caminho local relativo a src/assets/visuals. */
  imageSrc: string;
  imageAltPt: string;
  /** char:id ou chunk:id — alvo pedagógico principal. */
  targetRef: string;
  targetHanzi: string;
  targetPinyin: string;
  targetMeaningPt: string;
  /** Conceito visual base para distratores e fallback. */
  conceptId?: VisualConceptId;
  allowedAfterLessons: string[];
  tags: string[];
}

export const VISUAL_SCENES: VisualScene[] = [
  {
    id: "tree_single",
    imageSrc: "nature/tree.webp",
    imageAltPt: "Árvore isolada em um campo verde",
    targetRef: "char:mu",
    targetHanzi: "木",
    targetPinyin: "mù",
    targetMeaningPt: "árvore",
    conceptId: "tree",
    allowedAfterLessons: ["l14", "p4-char-mu", "l19-logica-madeira"],
    tags: ["nature", "object", "hanzi"],
  },
  {
    id: "person_single",
    imageSrc: "people/person.webp",
    imageAltPt: "Pessoa em pé com fundo neutro",
    targetRef: "char:ren",
    targetHanzi: "人",
    targetPinyin: "rén",
    targetMeaningPt: "pessoa",
    conceptId: "person",
    allowedAfterLessons: ["l14", "p4-char-ren"],
    tags: ["people", "hanzi"],
  },
  {
    id: "water_glass",
    imageSrc: "nature/water.webp",
    imageAltPt: "Água limpa em movimento, como em um copo ou riacho",
    targetRef: "char:shui",
    targetHanzi: "水",
    targetPinyin: "shuǐ",
    targetMeaningPt: "água",
    conceptId: "water",
    allowedAfterLessons: ["l14-pecas-natureza", "p4-char-shui"],
    tags: ["nature", "liquid", "hanzi"],
  },
  {
    id: "fire_small",
    imageSrc: "nature/fire.webp",
    imageAltPt: "Pequena chama de fogo controlada",
    targetRef: "char:huo",
    targetHanzi: "火",
    targetPinyin: "huǒ",
    targetMeaningPt: "fogo",
    conceptId: "fire",
    allowedAfterLessons: ["l14-pecas-natureza", "p4-char-huo"],
    tags: ["nature", "element", "hanzi"],
  },
  {
    id: "sun_sky",
    imageSrc: "nature/sun.webp",
    imageAltPt: "Sol brilhando em céu azul",
    targetRef: "char:ri",
    targetHanzi: "日",
    targetPinyin: "rì",
    targetMeaningPt: "sol",
    conceptId: "sun",
    allowedAfterLessons: ["l14-pecas-natureza", "p4-char-ri"],
    tags: ["nature", "sky", "hanzi"],
  },
  {
    id: "moon_night",
    imageSrc: "nature/moon.webp",
    imageAltPt: "Lua crescente no céu noturno",
    targetRef: "char:yue",
    targetHanzi: "月",
    targetPinyin: "yuè",
    targetMeaningPt: "lua",
    conceptId: "moon",
    allowedAfterLessons: ["l14-pecas-natureza", "p4-char-yue"],
    tags: ["nature", "sky", "hanzi"],
  },
  {
    id: "mountain_landscape",
    imageSrc: "nature/mountain.webp",
    imageAltPt: "Paisagem com montanha rochosa ao fundo",
    targetRef: "char:shan",
    targetHanzi: "山",
    targetPinyin: "shān",
    targetMeaningPt: "montanha",
    conceptId: "mountain",
    allowedAfterLessons: ["l14-pecas-natureza", "p4-char-shan"],
    tags: ["nature", "landscape", "hanzi"],
  },
  {
    id: "person_drinking_water",
    imageSrc: "nature/water.webp",
    imageAltPt: "Cena de alguém bebendo água",
    targetRef: "vocab:v_woxiangheshui",
    targetHanzi: "我想喝水",
    targetPinyin: "wǒ xiǎng hē shuǐ",
    targetMeaningPt: "Quero beber água.",
    conceptId: "water",
    allowedAfterLessons: ["l14-pecas-natureza", "l27"],
    tags: ["action", "drink", "speaking"],
  },
  {
    id: "two_people_greeting",
    imageSrc: "people/person.webp",
    imageAltPt: "Duas pessoas se cumprimentando",
    targetRef: "chunk:nihao",
    targetHanzi: "你好",
    targetPinyin: "nǐ hǎo",
    targetMeaningPt: "Olá.",
    conceptId: "person",
    allowedAfterLessons: ["l1", "l2"],
    tags: ["greeting", "speaking", "social"],
  },
  {
    id: "person_saying_thanks",
    imageSrc: "people/person.webp",
    imageAltPt: "Pessoa agradecendo com gesto amigável",
    targetRef: "chunk:xiexie",
    targetHanzi: "谢谢",
    targetPinyin: "xièxie",
    targetMeaningPt: "Obrigado(a).",
    conceptId: "person",
    allowedAfterLessons: ["l1", "l2"],
    tags: ["courtesy", "speaking"],
  },
  {
    id: "person_leaving",
    imageSrc: "people/person.webp",
    imageAltPt: "Pessoa se despedindo e saindo",
    targetRef: "chunk:zaijian",
    targetHanzi: "再见",
    targetPinyin: "zàijiàn",
    targetMeaningPt: "Até logo.",
    conceptId: "person",
    allowedAfterLessons: ["l3"],
    tags: ["farewell", "speaking"],
  },
  {
    id: "classroom_greeting",
    imageSrc: "people/person.webp",
    imageAltPt: "Professor cumprimentando estudantes na sala",
    targetRef: "chunk:woshixuesheng",
    targetHanzi: "我是学生",
    targetPinyin: "wǒ shì xuésheng",
    targetMeaningPt: "Sou estudante.",
    conceptId: "person",
    allowedAfterLessons: ["p3-wobuhui-shuo-zhongwen"],
    tags: ["classroom", "speaking"],
  },
];

export const visualSceneById = Object.fromEntries(VISUAL_SCENES.map((scene) => [scene.id, scene])) as Record<
  VisualSceneId,
  VisualScene
>;

export function resolveVisualScene(id: string | undefined): VisualScene | undefined {
  if (!id) return undefined;
  return visualSceneById[id as VisualSceneId];
}

export function isVisualSceneAllowed(sceneId: string, lessonId: string): boolean {
  const scene = resolveVisualScene(sceneId);
  if (!scene) return false;
  if (scene.allowedAfterLessons.length === 0) return true;
  return scene.allowedAfterLessons.includes(lessonId);
}
