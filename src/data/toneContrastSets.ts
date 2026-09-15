/**
 * RC1.3 · P13–P20 — contraste tonal com palavras reais.
 *
 * O conceito que as aulas de tom precisam ensinar explicitamente (P13.1):
 *
 *     MESMA SÍLABA-BASE + TOM DIFERENTE = PALAVRA / SIGNIFICADO DIFERENTE.
 *
 * E o que elas JAMAIS devem dizer (P13.2): que "o mesmo caractere muda de
 * significado quando muda o tom". Não é isso. Na esmagadora maioria dos casos
 * estamos comparando a mesma sílaba-base em pinyin com OUTRO tom, OUTRA palavra
 * e, quase sempre, OUTRO hànzì — 妈 e 马 são caracteres distintos que só
 * compartilham a base `ma`.
 *
 * Esta remessa NUNCA inventa vocabulário para ensinar tom (P19). Os pares abaixo
 * saem do corpus que as próprias tone lessons já apresentam, e o que aparece só
 * como demonstração fica marcado `contrastOnly` (P19.1): não conta como chunk
 * ensinado, vocabulário dominado, `newRefs` nem vocabulário da Jornada, e não
 * pode virar questão valendo mastery (P19.2).
 *
 * Nada aqui cria StepKind novo: os motores atuais (`listen`, `listen_select`,
 * `tone`, `match_pairs`) já resolvem, e o cartão de ensino entra como `intro`.
 */

import { CHARACTERS } from "./characters";

export type DictionaryTone = 1 | 2 | 3 | 4 | 5;

export interface ToneContrastMember {
  /** Referência canônica (`char:<id>`) — imagem, som e sentido vêm daqui. */
  refId: string;
  hanzi: string;
  pinyin: string;
  /** Tom de DICIONÁRIO — o da palavra isolada, antes de qualquer sandhi (P20). */
  dictionaryTone: DictionaryTone;
  meaningPt: string;
  meaningEn: string;
  audioTarget: string;
  /**
   * P19.1 — palavra usada APENAS para demonstrar o contraste.
   * Não entra em mastery, não vira `newRefs`, não conta como ensinada.
   */
  contrastOnly?: boolean;
}

export interface ToneContrastSet {
  id: string;
  /** Sílaba-base sem marca de tom. `a.pinyin` e `b.pinyin` reduzem a ela. */
  baseSyllable: string;
  a: ToneContrastMember;
  b: ToneContrastMember;
  /** Lições de tom em que este contraste é ensinado antes de ser cobrado. */
  taughtIn: string[];
  /** Frase curta que nomeia a diferença de função lexical (P16.2). */
  explanationPt: string;
  explanationEn: string;
}

/**
 * Remove marcas de TOM do pinyin — a base que os dois membros compartilham.
 *
 * Só as quatro marcas de tom saem (macron, agudo, caron, grave). O trema do `ü`
 * fica: ele distingue sílaba, não tom, e apagá-lo faria `lǜ` (verde) colapsar em
 * `lu` — um "contraste de mesma base" que não existe.
 */
export function stripToneMarks(pinyin: string): string {
  return pinyin
    .normalize("NFD")
    .replace(/[̄́̌̀]/g, "")
    .normalize("NFC")
    .replace(/[^a-zA-Zü]/g, "")
    .toLowerCase();
}

/**
 * Contrastes disponíveis.
 *
 * Todos usam a base `ma`, que é a única com quatro palavras já apresentadas nas
 * tone lessons existentes (`p1-o-que-e-tom`, `p2-ma-*`, `p2-comparar-tom-*`).
 * P13.4 — jamais adicionamos 马 nem nenhum outro caractere "porque é o exemplo
 * famoso": eles já estão no corpus destas aulas, foi por isso que entraram.
 *
 * 妈 é o único membro efetivamente ensinado (aparece em `newHanzi` de l16 /
 * p5-nv-ma-mae). 马, 麻 e 骂 são demonstração: `contrastOnly`.
 */
export const TONE_CONTRAST_SETS: ToneContrastSet[] = [
  {
    id: "ma-1-3",
    baseSyllable: "ma",
    a: {
      refId: "char:ma2",
      hanzi: "妈",
      pinyin: "mā",
      dictionaryTone: 1,
      meaningPt: "mãe",
      meaningEn: "mother",
      audioTarget: "妈",
    },
    b: {
      refId: "char:ma_horse",
      hanzi: "马",
      pinyin: "mǎ",
      dictionaryTone: 3,
      meaningPt: "cavalo",
      meaningEn: "horse",
      audioTarget: "马",
      contrastOnly: true,
    },
    taughtIn: ["p1-o-que-e-tom", "p2-ma-primeiro-tom", "p2-ma-terceiro-tom"],
    explanationPt:
      "Ouça a mesma sílaba-base ma. O tom muda: mā → mãe; mǎ → cavalo. São duas palavras diferentes, com hànzì diferentes.",
    explanationEn:
      "Listen to the same base syllable ma. The tone changes: mā → mother; mǎ → horse. Two different words, with different hànzì.",
  },
  {
    id: "ma-1-4",
    baseSyllable: "ma",
    a: {
      refId: "char:ma2",
      hanzi: "妈",
      pinyin: "mā",
      dictionaryTone: 1,
      meaningPt: "mãe",
      meaningEn: "mother",
      audioTarget: "妈",
    },
    b: {
      refId: "char:ma_scold",
      hanzi: "骂",
      pinyin: "mà",
      dictionaryTone: 4,
      meaningPt: "xingar",
      meaningEn: "to scold",
      audioTarget: "骂",
      contrastOnly: true,
    },
    taughtIn: ["p2-comparar-tom-1-4", "p2-ma-quarto-tom"],
    explanationPt:
      "Mesma base ma. mā fica alta e reta e quer dizer mãe; mà cai firme e quer dizer xingar.",
    explanationEn: "Same base ma. mā stays high and level and means mother; mà falls sharply and means to scold.",
  },
  {
    id: "ma-2-3",
    baseSyllable: "ma",
    a: {
      refId: "char:ma_hemp",
      hanzi: "麻",
      pinyin: "má",
      dictionaryTone: 2,
      meaningPt: "cânhamo; dormente",
      meaningEn: "hemp; numb",
      audioTarget: "麻",
      contrastOnly: true,
    },
    b: {
      refId: "char:ma_horse",
      hanzi: "马",
      pinyin: "mǎ",
      dictionaryTone: 3,
      meaningPt: "cavalo",
      meaningEn: "horse",
      audioTarget: "马",
      contrastOnly: true,
    },
    taughtIn: ["p2-comparar-tom-2-3", "p2-ma-segundo-tom"],
    explanationPt: "Mesma base ma. má sobe direto e quer dizer cânhamo; mǎ faz um vale e quer dizer cavalo.",
    explanationEn: "Same base ma. má rises straight and means hemp; mǎ dips and means horse.",
  },
];

export const TONE_CONTRAST_SET_BY_ID = new Map(TONE_CONTRAST_SETS.map((set) => [set.id, set]));

export function toneContrastSetsForLesson(lessonId: string): ToneContrastSet[] {
  return TONE_CONTRAST_SETS.filter((set) => set.taughtIn.includes(lessonId));
}

/** P19.1 — hànzì que só existe como demonstração de contraste. */
export function isContrastOnlyHanzi(hanzi: string): boolean {
  return TONE_CONTRAST_SETS.some(
    (set) =>
      (set.a.hanzi === hanzi && set.a.contrastOnly) || (set.b.hanzi === hanzi && set.b.contrastOnly)
  );
}

export function contrastOnlyHanzi(): string[] {
  const out = new Set<string>();
  for (const set of TONE_CONTRAST_SETS) {
    if (set.a.contrastOnly) out.add(set.a.hanzi);
    if (set.b.contrastOnly) out.add(set.b.hanzi);
  }
  return [...out];
}

export interface ToneContrastViolation {
  setId: string;
  code:
    | "BASE_SYLLABLE_MISMATCH"
    | "SAME_TONE"
    | "SAME_MEANING"
    | "MISSING_MEANING"
    | "MISSING_AUDIO"
    | "MISSING_TAUGHT_IN";
  detail: string;
}

/**
 * P15.1/P15.2 — os invariantes do contraste, escritos como código.
 *
 * Sem base igual não há contraste (mutação 16). Com o mesmo tom não há contraste
 * (17). Sem significados diferentes o contraste não ensina função lexical (18).
 * Sem áudio ele não ensina nada (19).
 */
export function validateToneContrastSet(set: ToneContrastSet): ToneContrastViolation[] {
  const violations: ToneContrastViolation[] = [];
  const baseA = stripToneMarks(set.a.pinyin);
  const baseB = stripToneMarks(set.b.pinyin);
  if (baseA !== baseB || baseA !== set.baseSyllable) {
    violations.push({
      setId: set.id,
      code: "BASE_SYLLABLE_MISMATCH",
      detail: `${set.a.pinyin} → ${baseA} ≠ ${set.b.pinyin} → ${baseB} (declarado: ${set.baseSyllable})`,
    });
  }
  if (set.a.dictionaryTone === set.b.dictionaryTone) {
    violations.push({ setId: set.id, code: "SAME_TONE", detail: `ambos no ${set.a.dictionaryTone}º tom` });
  }
  if (!set.a.meaningPt?.trim() || !set.b.meaningPt?.trim()) {
    violations.push({ setId: set.id, code: "MISSING_MEANING", detail: "significado ausente" });
  } else if (set.a.meaningPt.trim().toLowerCase() === set.b.meaningPt.trim().toLowerCase()) {
    violations.push({ setId: set.id, code: "SAME_MEANING", detail: set.a.meaningPt });
  }
  if (!set.a.audioTarget?.trim() || !set.b.audioTarget?.trim()) {
    violations.push({ setId: set.id, code: "MISSING_AUDIO", detail: "áudio ausente" });
  }
  if (!set.taughtIn.length) {
    violations.push({ setId: set.id, code: "MISSING_TAUGHT_IN", detail: "nenhuma lição declara o par" });
  }
  return violations;
}

export function validateAllToneContrastSets(): ToneContrastViolation[] {
  return TONE_CONTRAST_SETS.flatMap(validateToneContrastSet);
}

/**
 * P17.2 — contorno ligado a uma palavra real.
 *
 * Aulas de tom não devem ser só "1, 2, 3, 4". Os números ajudam, mas o contorno
 * só vira memória quando está colado a uma palavra que significa algo.
 */
export const TONE_CONTOUR_PT: Record<DictionaryTone, string> = {
  1: "alto e plano",
  2: "sobe",
  3: "desce e sobe",
  4: "cai rápido",
  5: "neutro, curto",
};

export const TONE_CONTOUR_EN: Record<DictionaryTone, string> = {
  1: "high and level",
  2: "rising",
  3: "dipping",
  4: "sharp fall",
  5: "neutral, short",
};

/** Traçado didático do contorno (viewBox 0 0 40 24) — visual, não análise acústica. */
export const TONE_CONTOUR_PATH: Record<DictionaryTone, string> = {
  1: "M4 6 L36 6",
  2: "M4 19 L36 5",
  3: "M4 9 C10 20, 22 22, 36 8",
  4: "M4 5 L36 19",
  5: "M14 12 L26 12",
};

/** Palavras do contraste que JÁ são ensinadas formalmente no currículo. */
export function taughtContrastHanzi(): string[] {
  const taught = new Set(CHARACTERS.map((char) => char.hanzi));
  const out = new Set<string>();
  for (const set of TONE_CONTRAST_SETS) {
    for (const member of [set.a, set.b]) {
      if (!member.contrastOnly && taught.has(member.hanzi)) out.add(member.hanzi);
    }
  }
  return [...out];
}
