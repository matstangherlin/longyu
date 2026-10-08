/**
 * RC2.3.1 — Visual First · classificação curricular de conceitos.
 */
export type VisualClass =
  | "CONCRETE_VISUAL"
  | "CONTEXT_VISUAL"
  | "ABSTRACT_VISUALIZABLE"
  | "ABSTRACT_NON_VISUAL";

/** Hànzì / frases com apoio visual de contexto (ação/cenário), não objeto isolado. */
const CONTEXT_VISUAL_HANZI = new Set([
  "你好",
  "谢谢",
  "请",
  "请坐",
  "买",
  "喝",
  "吃",
  "要",
  "坐",
  "走",
  "看",
  "听",
  "问路",
  "再见",
  "不客气",
]);

/** Conceitos abstratos visualizáveis (diagrama/contraste/tipografia — sem foto forçada). */
const ABSTRACT_VISUALIZABLE_HINTS =
  /tom|tone|pinyin|component|estrutura|ordem|direção|esquerda|direita|frente|atrás|左|右|前|后|声调|拼音/;

export function classifyVisualText(text: string): VisualClass {
  const raw = String(text ?? "").trim();
  if (!raw) return "ABSTRACT_NON_VISUAL";
  if (CONTEXT_VISUAL_HANZI.has(raw) || [...CONTEXT_VISUAL_HANZI].some((h) => raw.includes(h) && raw.length <= 6)) {
    return "CONTEXT_VISUAL";
  }
  if (ABSTRACT_VISUALIZABLE_HINTS.test(raw)) return "ABSTRACT_VISUALIZABLE";
  // Concrete if we only have CJK content that maps to a visual concept later.
  if (/^[\u4e00-\u9fff]{1,4}$/.test(raw)) return "CONCRETE_VISUAL";
  if (/mandarim|hànzì|hanzi|metalingu|tradução correta|qual é a tradução/i.test(raw)) {
    return "ABSTRACT_NON_VISUAL";
  }
  return "ABSTRACT_NON_VISUAL";
}

export function isConcreteVisualClass(c: VisualClass): boolean {
  return c === "CONCRETE_VISUAL";
}
