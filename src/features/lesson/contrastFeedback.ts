/**
 * LGY-012 — o que o aluno lê quando erra um contraste, e o modo visual da sessão.
 */

const TONE_MARK: Record<string, 1 | 2 | 3 | 4> = {
  ā: 1, ē: 1, ī: 1, ō: 1, ū: 1, ǖ: 1,
  á: 2, é: 2, í: 2, ó: 2, ú: 2, ǘ: 2,
  ǎ: 3, ě: 3, ǐ: 3, ǒ: 3, ǔ: 3, ǚ: 3,
  à: 4, è: 4, ì: 4, ò: 4, ù: 4, ǜ: 4,
};

const ASPIRATED = new Set(["p", "t", "k", "q", "c", "ch"]);
const UNASPIRATED = new Set(["b", "d", "g", "j", "z", "zh"]);

export type ContrastSide = { hanzi?: string; pinyin: string };

export function toneOfPinyin(pinyin: string): number {
  for (const char of pinyin.normalize("NFC")) {
    const tone = TONE_MARK[char];
    if (tone) return tone;
  }
  return 5;
}

export function toneLabel(tone: number, locale: "pt-BR" | "en" = "pt-BR"): string {
  if (locale === "en") {
    if (tone === 5) return "neutral tone";
    const suffix = tone === 1 ? "st" : tone === 2 ? "nd" : tone === 3 ? "rd" : "th";
    return `${tone}${suffix} tone`;
  }
  return tone === 5 ? "tom neutro" : `${tone}º tom`;
}

export function toneLabelPt(tone: number): string {
  return toneLabel(tone, "pt-BR");
}

function initialOf(pinyin: string): string {
  const bare = pinyin.normalize("NFC").toLocaleLowerCase("pt-BR");
  if (bare.startsWith("zh") || bare.startsWith("ch") || bare.startsWith("sh")) return bare.slice(0, 2);
  return bare.slice(0, 1);
}

function aspirationNote(a: string, b: string): string | null {
  const left = initialOf(a);
  const right = initialOf(b);
  const leftAir = ASPIRATED.has(left);
  const rightAir = ASPIRATED.has(right);
  if (leftAir && UNASPIRATED.has(right)) return `${a} sai com sopro.`;
  if (rightAir && UNASPIRATED.has(left)) return `${b} sai com sopro.`;
  return null;
}

export function contrastFeedback(
  a: ContrastSide,
  b: ContrastSide,
  kind?: "tone" | "initial" | "final",
  locale: "pt-BR" | "en" = "pt-BR"
): string {
  const same = a.pinyin.trim() === b.pinyin.trim();
  const aTone = toneLabel(toneOfPinyin(a.pinyin), locale);
  const bTone = toneLabel(toneOfPinyin(b.pinyin), locale);
  if (same) {
    return locale === "en"
      ? `They were the same: both were ${a.pinyin} (${aTone}).`
      : `Eram iguais: os dois eram ${a.pinyin} (${aTone}).`;
  }
  if (kind === "initial") {
    const note = aspirationNote(a.pinyin, b.pinyin);
    if (note) {
      return locale === "en"
        ? `${a.pinyin} × ${b.pinyin}: ${note.replace("sai com sopro.", "is aspirated.")}`
        : `${a.pinyin} × ${b.pinyin}: ${note}`;
    }
  }
  return locale === "en"
    ? `They were different: ${a.pinyin} (${aTone}) × ${b.pinyin} (${bTone}).`
    : `Eram diferentes: ${a.pinyin} (${aTone}) × ${b.pinyin} (${bTone}).`;
}

export function contrastFeedbackPt(a: ContrastSide, b: ContrastSide, kind?: "tone" | "initial" | "final"): string {
  return contrastFeedback(a, b, kind, "pt-BR");
}

const SESSION_KEY = "longyu:listening-visual-session";

export function listeningVisualForSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function muteListeningForSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // sessão privada pode recusar storage; o passo atual ainda entra no modo visual
  }
}

export function clearListeningMute(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
