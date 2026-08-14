/**
 * Identidade lexical única (V3.9 · P0-002).
 *
 * Bug de origem: o registro de erro montava `hanzi`, `pinyin` e `meaningPt` de
 * FONTES DIFERENTES. O passo trazia `pinyin` do enunciado (ex.: "nǐ hǎo") e o
 * `hanzi` vinha de `correctAnswer` (ex.: "明天见"). A revisão então exibia
 *
 *     明天见 · nǐ hǎo · Até amanhã.
 *
 * ensinando pronúncia errada. A regra agora é: os três campos SEMPRE saem da
 * mesma unidade lexical. Quando não é possível resolver o pinyin do alvo, o
 * campo fica vazio (P0-003) — melhor não mostrar do que mostrar de outro item.
 */
import { CHUNKS } from "../../data/chunks";
import { CHARACTERS } from "../../data/characters";

/** Referência canônica da unidade lexical que originou o card. */
export type LexicalSourceRef = `chunk:${string}` | `char:${string}` | `chars:${string}`;

export interface LexicalIdentity {
  hanzi: string;
  pinyin?: string;
  meaningPt?: string;
  literalPt?: string;
  /** De onde os campos vieram. Ausente = não há entrada canônica. */
  sourceRef?: LexicalSourceRef;
}

/**
 * Pinyin/significado declarados no passo, cada um amarrado ao hànzì que ele
 * descreve. Só entram no card quando o dono bate com o alvo resolvido.
 */
export interface OwnedGloss {
  /** Hànzì que este pinyin/significado descreve. */
  ownerHanzi: string | undefined;
  pinyin?: string;
  meaningPt?: string;
}

const chunkByText = new Map<string, (typeof CHUNKS)[number]>();
const charByGlyph = new Map<string, (typeof CHARACTERS)[number]>();

export function normalizeHanzi(text: string): string {
  return text.replace(/[，。！？、,.!?？\s]/g, "");
}

for (const chunk of CHUNKS) {
  const key = normalizeHanzi(chunk.hanzi);
  if (!chunkByText.has(key)) chunkByText.set(key, chunk);
}
for (const char of CHARACTERS) {
  if (!charByGlyph.has(char.hanzi)) charByGlyph.set(char.hanzi, char);
}

export function findChunkByText(text: string | undefined) {
  if (!text) return undefined;
  return chunkByText.get(normalizeHanzi(text));
}

export function charsInText(text: string | undefined) {
  if (!text) return [];
  return [...normalizeHanzi(text)]
    .map((glyph) => charByGlyph.get(glyph))
    .filter((char): char is (typeof CHARACTERS)[number] => Boolean(char));
}

/** Um alvo é único quando não mistura falas/opções ("你好 / 再见"). */
export function isSingleTarget(hanzi: string | undefined): hanzi is string {
  return Boolean(hanzi) && !/[/|]/.test(hanzi as string);
}

function sameTarget(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return normalizeHanzi(a) === normalizeHanzi(b);
}

/**
 * Identidade AUTORITATIVA: só o que o banco afirma sobre este hànzì exato —
 * um chunk cadastrado ou um caractere único. É a única base que pode REPROVAR
 * um pinyin autoral.
 *
 * Composição caractere a caractere não entra aqui de propósito: ela ignora
 * sandhi (不 bù→bú), tom neutro (谢谢 xièxie, não "xiè xiè") e segmentação em
 * palavras. Usá-la como verdade transformaria pinyin correto em "erro".
 */
export function canonicalIdentity(hanzi: string | undefined): LexicalIdentity | null {
  if (!hanzi) return null;
  const chunk = findChunkByText(hanzi);
  if (chunk) {
    return {
      hanzi,
      pinyin: chunk.pinyin,
      meaningPt: chunk.meaningPt,
      literalPt: chunk.literalPt,
      sourceRef: `chunk:${chunk.id}`,
    };
  }
  if (!isSingleTarget(hanzi)) return null;
  const glyphCount = [...normalizeHanzi(hanzi)].length;
  const chars = charsInText(hanzi);
  if (glyphCount === 1 && chars.length === 1) {
    const char = chars[0];
    return { hanzi, pinyin: char.pinyin, meaningPt: char.meaningPt, sourceRef: `char:${char.id}` };
  }
  return null;
}

/**
 * Resolve os campos do card a partir de UMA unidade lexical.
 *
 * Ordem: entrada canônica do banco → glosa escrita PARA ESTE MESMO hànzì →
 * composição por caractere (aproximação, último recurso). Nunca herda campo de
 * outro item; sem fonte válida, o pinyin fica vazio (P0-003).
 */
export function resolveLexicalIdentity(
  hanzi: string | undefined,
  glosses: OwnedGloss[] = []
): LexicalIdentity | null {
  if (!hanzi) return null;
  const owned = glosses.filter((gloss) => sameTarget(gloss.ownerHanzi, hanzi));
  const ownedPinyin = owned.find((gloss) => gloss.pinyin)?.pinyin;
  const ownedMeaning = owned.find((gloss) => gloss.meaningPt)?.meaningPt;

  const canonical = canonicalIdentity(hanzi);
  if (canonical) return { ...canonical, meaningPt: canonical.meaningPt ?? ownedMeaning };

  if (!isSingleTarget(hanzi)) {
    // Alvo múltiplo ("你好 / 再见"): não há unidade única, nenhum pinyin é honesto.
    return { hanzi, meaningPt: ownedMeaning };
  }

  // Glosa autoral do próprio alvo vence a composição: ela já traz sandhi e tom
  // neutro corretos, que a soma de caracteres perderia.
  if (ownedPinyin) return { hanzi, pinyin: ownedPinyin, meaningPt: ownedMeaning };

  const chars = charsInText(hanzi);
  const glyphCount = [...normalizeHanzi(hanzi)].length;
  // Composição só quando TODOS os glifos são conhecidos; parcial sairia
  // desalinhada do hànzì mostrado.
  if (chars.length > 1 && chars.length === glyphCount && chars.length <= 8) {
    return {
      hanzi,
      pinyin: chars.map((char) => char.pinyin).join(" "),
      meaningPt: ownedMeaning,
      sourceRef: `chars:${chars.map((char) => char.id).join("+")}`,
    };
  }

  return { hanzi, meaningPt: ownedMeaning };
}

/**
 * Um par (hànzì, pinyin) é incoerente quando o banco AFIRMA outro som para
 * aquele hànzì. Sem afirmação canônica não há como reprovar — e reprovar por
 * composição geraria falso positivo em sandhi/tom neutro.
 */
export function isCoherentPinyin(hanzi: string | undefined, pinyin: string | undefined): boolean {
  if (!hanzi || !pinyin) return true;
  const canonical = canonicalIdentity(hanzi);
  if (!canonical?.pinyin) return true;
  return normalizePinyin(canonical.pinyin) === normalizePinyin(pinyin);
}

export function normalizePinyin(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[,.!?，。！？'’·\s]/g, "")
    .trim();
}
