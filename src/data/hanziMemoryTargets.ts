/**
 * Productive hànzì memory — not every newHanzi glyph.
 * Technical/corpus glyphs (候, 晚, …) stay in newHanzi without a CORE ladder.
 */

export interface HanziMemoryTarget {
  glyph: string;
  charId: string;
  introduceLessonId: string;
  delayedLessonIds: readonly string[];
}

export const HANZI_MEMORY_TARGETS: readonly HanziMemoryTarget[] = [
  { glyph: "点", charId: "dian_point", introduceLessonId: "p6-rotina-trabalho", delayedLessonIds: ["p6-horarios"] },
  { glyph: "明", charId: "ming", introduceLessonId: "p6-horarios", delayedLessonIds: ["p6-clima"] },
  { glyph: "天", charId: "tian_sky", introduceLessonId: "p6-horarios", delayedLessonIds: ["p6-natureza", "p6-clima"] },
  { glyph: "今", charId: "jin_now", introduceLessonId: "p6-horarios", delayedLessonIds: ["p6-clima"] },
  { glyph: "昨", charId: "zuo_yesterday", introduceLessonId: "p6-horarios", delayedLessonIds: ["p6-clima"] },
  { glyph: "现", charId: "xian_now", introduceLessonId: "p6-horarios", delayedLessonIds: ["p6-clima"] },
  { glyph: "菜", charId: "cai_dish", introduceLessonId: "l26b", delayedLessonIds: ["l26c", "l27"] },
  { glyph: "买", charId: "mai_buy", introduceLessonId: "p6-compras", delayedLessonIds: ["p7-imersao-mercado"] },
  { glyph: "左", charId: "zuo_left", introduceLessonId: "p6-direcoes", delayedLessonIds: ["p7-imersao-estacao"] },
  { glyph: "右", charId: "you_right", introduceLessonId: "p6-direcoes", delayedLessonIds: ["p7-imersao-estacao"] },
];

export const HANZI_MEMORY_TARGET_GLYPHS = new Set(HANZI_MEMORY_TARGETS.map((item) => item.glyph));

export function hanziMemoryTargetsForLesson(lessonId: string): HanziMemoryTarget[] {
  return HANZI_MEMORY_TARGETS.filter((item) => item.introduceLessonId === lessonId);
}

/** Tone micro-activities belong on lessons whose vocab already carries the contour. */
export const TONE_INTEGRATION_LESSON_IDS = ["p6-horarios", "p6-clima", "l26c", "p6-compras", "p6-direcoes"] as const;

export const INTEGRATED_CONVERSATION_SCENE_IDS = [
  "encontro-amanha",
  "que-horas-sao",
  "rotina-e-trabalho",
  "pedir-cardapio",
  "imersao-restaurante",
] as const;
