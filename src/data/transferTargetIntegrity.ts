/**
 * V4.6 — Integridade cognitiva da transferência.
 *
 * O alvo completo da transferência não pode aparecer na UI antes de:
 * - o aluno responder;
 * - cometer erro; ou
 * - pedir ajuda o suficiente para chegar ao nível de revelação.
 *
 * Níveis de ajuda na transferência (honesto):
 * 0 situação + âncora + componente + desafio
 * 1 padrão seguro (com buraco) — nunca a frase completa se pattern = alvo
 * 2 estrutura / posição do componente
 * 3 transformação (pode revelar alvo — ajuda explícita)
 * 4 montagem / resposta completa no scaffold
 */

import type { ProductionHelpLevel } from "./productionHelp";

/** Nível em que a transformação (from → to) e o alvo completo podem aparecer no scaffold. */
export const TRANSFER_TARGET_REVEAL_HELP_LEVEL: ProductionHelpLevel = 3;

export function normalizeTransferHanzi(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\s\u3000]/g, "")
    .replace(/[，,]/g, "，")
    .replace(/[？?]/g, "？")
    .trim();
}

/**
 * O padrão exibido vaza o alvo completo (sem buracos ___).
 * Ex.: patternPt = "请问，你叫什么？" === correctAnswer.
 */
export function patternRevealsFullTarget(patternPt: string | undefined, targetHanzi: string | undefined): boolean {
  if (!patternPt || !targetHanzi) return false;
  if (patternPt.includes("___") || patternPt.includes("…") || patternPt.includes("...")) return false;
  return normalizeTransferHanzi(patternPt) === normalizeTransferHanzi(targetHanzi);
}

/** Alvo completo pode aparecer no scaffold / transform hint. */
export function canRevealTransferTarget(input: {
  helpLevel: ProductionHelpLevel;
  feedback: "correct" | "wrong" | "unrecognized" | null;
  hadMistake: boolean;
}): boolean {
  if (input.feedback === "correct" || input.feedback === "wrong" || input.feedback === "unrecognized") {
    return true;
  }
  if (input.hadMistake) return true;
  return input.helpLevel >= TRANSFER_TARGET_REVEAL_HELP_LEVEL;
}

/** Texto de UI (situation, title, placeholder, aria) contém o alvo completo. */
export function textContainsTransferTarget(text: string | undefined, targetHanzi: string | undefined): boolean {
  if (!text || !targetHanzi) return false;
  const needle = normalizeTransferHanzi(targetHanzi);
  if (!needle) return false;
  return normalizeTransferHanzi(text).includes(needle);
}

/** Padrão seguro para scaffold: buraco no lugar do alvo completo. */
export function safeTransferPatternPt(patternPt: string | undefined, targetHanzi: string | undefined): string | undefined {
  if (!patternPt) return undefined;
  if (!patternRevealsFullTarget(patternPt, targetHanzi)) return patternPt;
  // Preferência: se o alvo começa com 请问，, mostrar 请问，___
  const target = targetHanzi ?? "";
  if (target.startsWith("请问")) return "请问，___";
  return "___";
}
