/**
 * LGY-010 / LGY-021 — enunciado que o aluno lê.
 * joinSentence não cola um ponto em texto que já termina.
 * toneQuestion cita a sílaba quando o hànzì faz parte de uma palavra com neutro.
 */

const LEARNER_START = /^(qual|como|monte|complete|escolha|ouça|ouca|diga|toque|marque|responda|aponte|escreva)\b/i;

export function isLearnerFacingPrompt(text: string | null | undefined): boolean {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return false;
  if (/[?？]$/.test(trimmed)) return true;
  return LEARNER_START.test(trimmed);
}

/** Colapsa "..", ".?", "?." e o mesmo em pontuação chinesa. Reticências "..." ficam. */
export function collapseTerminalPunctuation(value: string): string {
  return value
    .replace(/([!?？！])\./g, "$1")
    .replace(/\.([!?？！])/g, "$1")
    .replace(/([^.]|^)\.\.(?!\.)/g, "$1.")
    .replace(/([。！？])[。！？]+/g, "$1");
}

export function joinSentence(prefix: string, text: string): string {
  const head = prefix.trim();
  const body = text.trim();
  if (!head) return collapseTerminalPunctuation(body);
  if (!body) return collapseTerminalPunctuation(head);
  return collapseTerminalPunctuation(`${head} ${body}`);
}

export function toneQuestion(hanzi: string, host?: string): string {
  const glyph = hanzi.trim();
  const word = (host ?? "").trim() || glyph;
  const chars = [...word];
  const cited = [...glyph];
  if (chars.length > 1 && cited.length === 1 && word.includes(glyph)) {
    const index = chars.indexOf(glyph);
    return `Qual é o tom da ${index + 1}ª sílaba de ${word}?`;
  }
  if (chars.length === 2 && chars[0] === chars[1]) {
    return `Qual é o tom da 1ª sílaba de ${word}?`;
  }
  return glyph ? `Qual é o tom de ${glyph}?` : "Escolha o tom correto.";
}

export function clarifyToneQuestion(text: string, sourceText?: string): string {
  const match = text.match(/^Qual é o tom de (.+)\?$/);
  if (!match) return text;
  const cited = match[1].trim();
  const source = (sourceText ?? "").trim();
  if (!source || source === cited || ![...source].some((char) => cited.includes(char))) return text;
  if ([...source].length <= [...cited].length) return text;
  return toneQuestion(cited, source);
}

export function polishLearnerText(value: string | undefined, sourceText?: string): string | undefined {
  if (value == null) return value;
  return clarifyToneQuestion(collapseTerminalPunctuation(value), sourceText);
}
