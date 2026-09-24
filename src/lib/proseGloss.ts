/**
 * RC2.2.11 · A–C — gloss em texto corrido (Cultura, fala do dragão).
 *
 * `ExerciseText` trata o que não é Hànzì como pinyin; em prosa portuguesa isso
 * está errado. Aqui a prosa continua prosa e SÓ os trechos em Hànzì com
 * referência lexical conhecida viram alvo de consulta. Hànzì sem entrada no
 * glossário fica texto simples — nada de popover vazio ou inventado.
 */

export type ProseGlossPart = { kind: "prose"; text: string } | { kind: "hanzi"; text: string; known: boolean };

const CJK_RUN_RE = /([㐀-鿿豈-﫿]+)/u;

export function splitProseGloss(text: string, isKnown: (run: string) => boolean): ProseGlossPart[] {
  const out: ProseGlossPart[] = [];
  for (const piece of String(text ?? "").split(CJK_RUN_RE)) {
    if (!piece) continue;
    if (CJK_RUN_RE.test(piece)) out.push({ kind: "hanzi", text: piece, known: isKnown(piece) });
    else out.push({ kind: "prose", text: piece });
  }
  return out;
}

/** Quantos alvos de consulta a prosa terá (0 = renderiza texto puro). */
export function countKnownGlossTargets(parts: readonly ProseGlossPart[]): number {
  return parts.filter((part) => part.kind === "hanzi" && part.known).length;
}
