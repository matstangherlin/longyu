/**
 * RC2.3.13H — canonical visual asset registry for dynamic AULA.
 * Core visuals are local/bundled (SVG/CSS); no arbitrary remote URLs for core.
 * Images must not contain instructional paragraphs baked into pixels — text lives in UI.
 */

export type LessonVisualAsset = {
  assetId: string;
  /** Local public path or data URI — never arbitrary remote for core. */
  src: string;
  altPt: string;
  altEn: string;
  aspect: `${number}/${number}`;
  purpose: "tones" | "pinyin" | "hanzi" | "greeting" | "culture" | "diagram" | "other";
  /** Max recommended encoded size hint (bytes) for gates. */
  maxBytes?: number;
  fallback: "svg-tones" | "svg-hanzi" | "css-diagram" | "text";
};

export const LESSON_VISUAL_ASSETS: Record<string, LessonVisualAsset> = {
  "visual:tones-four-contours": {
    assetId: "visual:tones-four-contours",
    src: "/assets/visuals/tones-four-contours.svg",
    altPt: "Quatro contornos de tom do mandarim: plano, ascendente, descendente-ascendente e descendente.",
    altEn: "Four Mandarin tone contours: flat, rising, dipping, and falling.",
    aspect: "16/9",
    purpose: "tones",
    maxBytes: 24_000,
    fallback: "svg-tones",
  },
  "visual:pinyin-layers": {
    assetId: "visual:pinyin-layers",
    src: "/assets/visuals/pinyin-layers.svg",
    altPt: "Camadas do pinyin: inicial, final e tom sobre 你好.",
    altEn: "Pinyin layers: initial, final, and tone over 你好.",
    aspect: "4/3",
    purpose: "pinyin",
    maxBytes: 20_000,
    fallback: "css-diagram",
  },
  "visual:hanzi-mu-tree": {
    assetId: "visual:hanzi-mu-tree",
    src: "/assets/visuals/hanzi-mu-tree.svg",
    altPt: "O caractere 木 ao lado de uma árvore simples.",
    altEn: "The character 木 beside a simple tree.",
    aspect: "1/1",
    purpose: "hanzi",
    maxBytes: 18_000,
    fallback: "svg-hanzi",
  },
  "visual:greeting-nihao": {
    assetId: "visual:greeting-nihao",
    src: "/assets/visuals/greeting-nihao.svg",
    altPt: "Duas pessoas se cumprimentando; balão com 你好.",
    altEn: "Two people greeting; speech bubble with 你好.",
    aspect: "4/3",
    purpose: "greeting",
    maxBytes: 22_000,
    fallback: "text",
  },
  "visual:culture-round-table": {
    assetId: "visual:culture-round-table",
    src: "/assets/visuals/culture-round-table.svg",
    altPt: "Mesa redonda com pratos compartilhados.",
    altEn: "Round table with shared dishes.",
    aspect: "4/3",
    purpose: "culture",
    maxBytes: 22_000,
    fallback: "css-diagram",
  },
};

export function getLessonVisualAsset(assetId: string): LessonVisualAsset | undefined {
  return LESSON_VISUAL_ASSETS[assetId];
}

export function isCoreVisualLocal(asset: LessonVisualAsset): boolean {
  return asset.src.startsWith("/") || asset.src.startsWith("data:");
}
