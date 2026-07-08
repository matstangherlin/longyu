const NUMERIC_PINYIN_RE = /([A-Za-züÜvV:]+)([1-5])/g;

const PINYIN_INITIALS = [
  "zh",
  "ch",
  "sh",
  "b",
  "p",
  "m",
  "f",
  "d",
  "t",
  "n",
  "l",
  "g",
  "k",
  "h",
  "j",
  "q",
  "x",
  "r",
  "z",
  "c",
  "s",
  "y",
  "w",
  "",
] as const;

const PINYIN_FINALS = new Set([
  "a",
  "ai",
  "an",
  "ang",
  "ao",
  "e",
  "ei",
  "en",
  "eng",
  "er",
  "i",
  "ia",
  "ian",
  "iang",
  "iao",
  "ie",
  "in",
  "ing",
  "iong",
  "iu",
  "o",
  "ong",
  "ou",
  "u",
  "ua",
  "uai",
  "uan",
  "uang",
  "ue",
  "ui",
  "un",
  "uo",
  "ü",
  "üe",
  "üan",
  "ün",
]);

const TONE_MARKS: Record<string, readonly [string, string, string, string]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
  A: ["Ā", "Á", "Ǎ", "À"],
  E: ["Ē", "É", "Ě", "È"],
  I: ["Ī", "Í", "Ǐ", "Ì"],
  O: ["Ō", "Ó", "Ǒ", "Ò"],
  U: ["Ū", "Ú", "Ǔ", "Ù"],
  Ü: ["Ǖ", "Ǘ", "Ǚ", "Ǜ"],
};

const VOWELS = "aeiouü";

function normalizeUmlautSyntax(syllable: string): string {
  return syllable
    .replace(/u:/g, "ü")
    .replace(/U:/g, "Ü")
    .replace(/v/g, "ü")
    .replace(/V/g, "Ü");
}

function isLikelyPinyinSyllable(syllable: string): boolean {
  const normalized = normalizeUmlautSyntax(syllable).toLowerCase();
  return PINYIN_INITIALS.some((initial) => {
    if (!normalized.startsWith(initial)) return false;
    const final = normalized.slice(initial.length);
    return PINYIN_FINALS.has(final);
  });
}

function toneMarkIndex(syllable: string): number {
  const lower = syllable.toLowerCase();
  const a = lower.indexOf("a");
  if (a >= 0) return a;
  const e = lower.indexOf("e");
  if (e >= 0) return e;
  const ou = lower.indexOf("ou");
  if (ou >= 0) return ou;

  for (let i = syllable.length - 1; i >= 0; i -= 1) {
    if (VOWELS.includes(lower[i])) return i;
  }
  return -1;
}

function markSyllable(syllable: string, tone: number): string {
  const normalized = normalizeUmlautSyntax(syllable);
  if (tone === 5) return normalized;

  const markIndex = toneMarkIndex(normalized);
  if (markIndex < 0) return normalized;

  const vowel = normalized[markIndex];
  const marks = TONE_MARKS[vowel];
  if (!marks) return normalized;

  return `${normalized.slice(0, markIndex)}${marks[tone - 1]}${normalized.slice(markIndex + 1)}`;
}

export function numericPinyinToDiacritics(input: string): string {
  return input.replace(NUMERIC_PINYIN_RE, (match, syllable: string, toneText: string) => {
    if (!isLikelyPinyinSyllable(syllable)) return match;
    return markSyllable(syllable, Number(toneText));
  });
}

// Mapa reverso: vogal acentuada → vogal base (ā → a, é → e, ǚ → ü).
const TONE_STRIP_MAP: Record<string, string> = Object.entries(TONE_MARKS).reduce(
  (map, [base, marks]) => {
    for (const mark of marks) map[mark] = base;
    return map;
  },
  {} as Record<string, string>,
);

// Remove o acento de tom, devolvendo a base da sílaba (mā → ma, xué → xue,
// shuǐ → shui). Útil para gerar as variações de tom de uma mesma sílaba.
export function stripPinyinTone(input: string): string {
  return input.replace(/./gu, (char) => TONE_STRIP_MAP[char] ?? char);
}

export function containsNumericPinyin(input: string): boolean {
  NUMERIC_PINYIN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NUMERIC_PINYIN_RE.exec(input)) !== null) {
    if (isLikelyPinyinSyllable(match[1])) return true;
  }
  return false;
}

export function formatPinyinForDisplay(input: string, options?: { numeric?: boolean }): string {
  return options?.numeric ? input : numericPinyinToDiacritics(input);
}

export function displayedPinyinHasToneNumbers(input: string, options?: { numeric?: boolean }): boolean {
  if (options?.numeric) return false;
  return containsNumericPinyin(formatPinyinForDisplay(input, options));
}
