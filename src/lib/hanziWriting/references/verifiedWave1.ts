/**
 * RC2.3.4 — verified handwriting reference wave 1.
 *
 * AUTHORIAL didactic stroke geometry in normalized 0–100 space.
 * NOT derived from HanziBuilder SVG paths.
 * NOT derived from font glyph outlines.
 * Stroke order follows common modern Mainland teaching conventions.
 *
 * Status VERIFIED = suitable for graded TRACE / MEMORY_WRITE locally.
 * Characters without a row here remain UNAVAILABLE (do not invent).
 */

import type { HanziHandwritingReference, HandwritingStroke, Point2D } from "../types";

const DEFAULT_TOLERANCE = {
  startRadius: 18,
  endRadius: 20,
  directionDegrees: 55,
  shapeMeanDistance: 16,
  minLengthRatio: 0.35,
  maxLengthRatio: 2.4,
} as const;

function dir(a: Point2D, b: Point2D): Point2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function stroke(id: string, order: number, points: Point2D[], labelPt: string): HandwritingStroke {
  const start = points[0]!;
  const end = points[points.length - 1]!;
  return { id, order, points, direction: dir(start, end), labelPt };
}

function bounds(strokes: readonly HandwritingStroke[]) {
  let minX = 100;
  let minY = 100;
  let maxX = 0;
  let maxY = 0;
  for (const s of strokes) {
    for (const p of s.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  return { minX, minY, maxX, maxY };
}

function ref(
  character: string,
  charId: string,
  strokes: HandwritingStroke[],
  notesPt: string
): HanziHandwritingReference {
  return {
    character,
    charId,
    status: "VERIFIED",
    strokes,
    strokeOrder: strokes.map((s) => s.id),
    boundingArea: bounds(strokes),
    tolerance: { ...DEFAULT_TOLERANCE },
    source: {
      provenance: "longyu-authorial-stroke-order-v1",
      license: "All-rights-reserved — Longyu didactic authorial data (not third-party calligraphy datasets)",
      version: "1.0.0",
      geometrySource: "HANDWRITING_REFERENCE",
      validatedAgainst: "Mainland modern stroke-order teaching conventions (pedagogical, not calligraphic OCR)",
      notesPt,
    },
  };
}

/** 人 — 2 strokes */
const REN = ref(
  "人",
  "ren",
  [
    stroke("ren-1", 1, [{ x: 52, y: 18 }, { x: 40, y: 48 }, { x: 28, y: 86 }], "traço esquerdo (pie)"),
    stroke("ren-2", 2, [{ x: 48, y: 42 }, { x: 62, y: 64 }, { x: 78, y: 86 }], "traço direito (na)"),
  ],
  "Ordem padrão de 人 (2 traços). Geometria autorial didática."
);

/** 口 — 3 strokes (丨 + 𠃍 + 一) */
const KOU = ref(
  "口",
  "kou",
  [
    stroke("kou-1", 1, [{ x: 28, y: 26 }, { x: 28, y: 78 }], "lado esquerdo"),
    stroke("kou-2", 2, [{ x: 28, y: 26 }, { x: 72, y: 26 }, { x: 72, y: 78 }], "topo e lado direito"),
    stroke("kou-3", 3, [{ x: 28, y: 78 }, { x: 72, y: 78 }], "base"),
  ],
  "Ordem padrão de 口 (3 traços). Não usar os 4 paths do builder como verdade."
);

/** 木 — 4 strokes */
const MU = ref(
  "木",
  "mu",
  [
    stroke("mu-1", 1, [{ x: 22, y: 36 }, { x: 78, y: 36 }], "horizontal (copa)"),
    stroke("mu-2", 2, [{ x: 50, y: 18 }, { x: 50, y: 86 }], "vertical (tronco)"),
    stroke("mu-3", 3, [{ x: 50, y: 50 }, { x: 28, y: 82 }], "galho esquerdo"),
    stroke("mu-4", 4, [{ x: 50, y: 50 }, { x: 72, y: 82 }], "galho direito"),
  ],
  "Ordem padrão de 木 (heng, shu, pie, na)."
);

/** 日 — 4 strokes */
const RI = ref(
  "日",
  "ri",
  [
    stroke("ri-1", 1, [{ x: 32, y: 18 }, { x: 32, y: 84 }], "lado esquerdo"),
    stroke("ri-2", 2, [{ x: 32, y: 18 }, { x: 68, y: 18 }, { x: 68, y: 84 }], "topo e lado direito"),
    stroke("ri-3", 3, [{ x: 32, y: 50 }, { x: 68, y: 50 }], "linha do meio"),
    stroke("ri-4", 4, [{ x: 32, y: 84 }, { x: 68, y: 84 }], "base"),
  ],
  "Ordem padrão de 日 (4 traços)."
);

/** 月 — 4 strokes */
const YUE = ref(
  "月",
  "yue",
  [
    stroke("yue-1", 1, [{ x: 42, y: 18 }, { x: 34, y: 48 }, { x: 30, y: 86 }], "contorno esquerdo"),
    stroke("yue-2", 2, [{ x: 42, y: 18 }, { x: 66, y: 18 }, { x: 66, y: 86 }], "topo e lado direito"),
    stroke("yue-3", 3, [{ x: 36, y: 42 }, { x: 62, y: 42 }], "interno superior"),
    stroke("yue-4", 4, [{ x: 36, y: 62 }, { x: 62, y: 62 }], "interno inferior"),
  ],
  "Ordem padrão de 月 (4 traços)."
);

/** 山 — 3 strokes */
const SHAN = ref(
  "山",
  "shan",
  [
    stroke("shan-1", 1, [{ x: 50, y: 22 }, { x: 50, y: 78 }], "pico central"),
    stroke("shan-2", 2, [{ x: 22, y: 78 }, { x: 78, y: 78 }], "base"),
    stroke("shan-3", 3, [
      { x: 32, y: 48 },
      { x: 32, y: 78 },
      { x: 50, y: 78 },
      { x: 68, y: 78 },
      { x: 68, y: 44 },
    ], "picos laterais (forma em U invertido didática)"),
  ],
  "Ordem didática de 山. Geometria autorial; não caligrafia de pincel."
);

/** 水 — 4 strokes */
const SHUI = ref(
  "水",
  "shui",
  [
    stroke("shui-1", 1, [{ x: 50, y: 16 }, { x: 50, y: 86 }], "vertical central"),
    stroke("shui-2", 2, [{ x: 50, y: 40 }, { x: 28, y: 28 }], "gota esquerda superior"),
    stroke("shui-3", 3, [{ x: 50, y: 52 }, { x: 24, y: 78 }], "fluxo esquerdo inferior"),
    stroke("shui-4", 4, [{ x: 50, y: 48 }, { x: 78, y: 78 }], "fluxo direito"),
  ],
  "Ordem didática de 水 (4 traços)."
);

/** 火 — 4 strokes */
const HUO = ref(
  "火",
  "huo",
  [
    stroke("huo-1", 1, [{ x: 38, y: 42 }, { x: 24, y: 72 }], "chama esquerda"),
    stroke("huo-2", 2, [{ x: 62, y: 42 }, { x: 76, y: 72 }], "chama direita"),
    stroke("huo-3", 3, [{ x: 50, y: 18 }, { x: 42, y: 52 }, { x: 28, y: 88 }], "pie central"),
    stroke("huo-4", 4, [{ x: 48, y: 48 }, { x: 72, y: 88 }], "na central"),
  ],
  "Ordem didática de 火 (4 traços)."
);

/** 大 — 3 strokes */
const DA = ref(
  "大",
  "da",
  [
    stroke("da-1", 1, [{ x: 24, y: 38 }, { x: 76, y: 38 }], "horizontal"),
    stroke("da-2", 2, [{ x: 50, y: 18 }, { x: 34, y: 88 }], "pie"),
    stroke("da-3", 3, [{ x: 50, y: 42 }, { x: 76, y: 88 }], "na"),
  ],
  "Ordem padrão de 大 (3 traços)."
);

/** 小 — 3 strokes */
const XIAO = ref(
  "小",
  "xiao",
  [
    stroke("xiao-1", 1, [{ x: 50, y: 18 }, { x: 50, y: 72 }], "vertical central"),
    stroke("xiao-2", 2, [{ x: 50, y: 48 }, { x: 28, y: 78 }], "esquerda"),
    stroke("xiao-3", 3, [{ x: 50, y: 48 }, { x: 72, y: 78 }], "direita"),
  ],
  "Ordem padrão de 小 (3 traços)."
);

/** 中 — 4 strokes */
const ZHONG = ref(
  "中",
  "zhong",
  [
    stroke("zhong-1", 1, [{ x: 30, y: 28 }, { x: 30, y: 72 }], "lado esquerdo da caixa"),
    stroke("zhong-2", 2, [{ x: 30, y: 28 }, { x: 70, y: 28 }, { x: 70, y: 72 }], "topo e lado direito"),
    stroke("zhong-3", 3, [{ x: 30, y: 72 }, { x: 70, y: 72 }], "base da caixa"),
    stroke("zhong-4", 4, [{ x: 50, y: 14 }, { x: 50, y: 88 }], "vertical central"),
  ],
  "Ordem didática de 中 (caixa + shu)."
);

export const VERIFIED_HANDWRITING_WAVE1: readonly HanziHandwritingReference[] = [
  REN,
  KOU,
  MU,
  RI,
  YUE,
  SHAN,
  SHUI,
  HUO,
  DA,
  XIAO,
  ZHONG,
];

export const VERIFIED_HANDWRITING_BY_CHAR = new Map(
  VERIFIED_HANDWRITING_WAVE1.map((r) => [r.character, r] as const)
);

export const VERIFIED_HANDWRITING_BY_ID = new Map(
  VERIFIED_HANDWRITING_WAVE1.map((r) => [r.charId, r] as const)
);
