/**
 * Regras puras do lint de conteúdo. O runner aplica o texto que o aluno lê
 * (polishLearnerText) antes de CL001–CL003. Os testes injetam a string crua.
 */

export const CHOICE_KINDS = new Set([
  "dialogue_choice",
  "contextual_choice",
  "listen_select",
  "image_choice",
  "odd_one_out",
  "comprehend",
]);

export const ASSEMBLY_KINDS = new Set(["sentence_build", "hanzi_build", "reverse_recall", "fill_blank"]);

const CJK = /[\u3400-\u9fff]/;
const DOUBLE = /(?<!\.)\.\.(?!\.)|[?？]\.|[.。][?？]/;
const PLACEHOLDER_MARK = /\{nome\}|\{name\}|\{\{[^}]+\}\}|\?\?\?/;
const PLACEHOLDER_WORD = /\bTODO\b|\bFIXME\b/;
const PLACEHOLDER_NAME = /meu nome é você|我叫\s*você|Aluno local/i;
const QUESTION = /[?？]|\b(qual|quais|como|quem|o que|cadê|escolha|ouça|ouca|toque|marque|aponte|reconheça|quer|monte|complete)\b/i;

export function hasDoublePunctuation(text) {
  return DOUBLE.test(String(text ?? ""));
}

export function hasUnresolvedPlaceholder(text) {
  const value = String(text ?? "");
  return PLACEHOLDER_MARK.test(value) || PLACEHOLDER_WORD.test(value) || PLACEHOLDER_NAME.test(value);
}

export function isChoiceQuestion(text) {
  const value = String(text ?? "").trim();
  if (!value) return true;
  if (CJK.test(value) && !/[A-Za-zÀ-ÿ]/.test(value)) return true;
  if (/[…]$/.test(value) || /\.\.\.$/.test(value) || /___/.test(value)) return true;
  return QUESTION.test(value);
}

export function missingPieces(target, pieces) {
  const need = new Map();
  for (const char of String(target ?? "")) {
    if (!CJK.test(char)) continue;
    need.set(char, (need.get(char) ?? 0) + 1);
  }
  if (need.size === 0) return [];
  const have = new Map();
  for (const piece of pieces ?? []) {
    for (const char of String(piece ?? "")) {
      if (!CJK.test(char)) continue;
      have.set(char, (have.get(char) ?? 0) + 1);
    }
  }
  const missing = [];
  for (const [char, count] of need) {
    if ((have.get(char) ?? 0) < count) missing.push(char);
  }
  return missing;
}

export function cjkGlyphs(text) {
  return [...String(text ?? "")].filter((char) => CJK.test(char));
}
