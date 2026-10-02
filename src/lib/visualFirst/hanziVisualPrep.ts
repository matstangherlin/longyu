/**
 * RC2.3.1 — preparação visual de Hànzì (API para RC2.3.4; sem desenho livre).
 *
 * Distingue origem pictográfica vs associação mnemônica vs componente moderno.
 * Evita pseudohistória etimológica.
 */
export type HanziVisualRelationKind = "pictographic_origin" | "mnemonic_association" | "modern_component";

export interface HanziVisualPrep {
  hanzi: string;
  relationKind: HanziVisualRelationKind;
  notePt: string;
  relatedVisualConceptId?: string;
}

/** Conjunto curto e conservador — só casos bem estabelecidos. */
const PREP: Record<string, HanziVisualPrep> = {
  人: {
    hanzi: "人",
    relationKind: "pictographic_origin",
    notePt: "Forma antiga lembrava uma pessoa de perfil. Hoje é o caractere moderno 人.",
    relatedVisualConceptId: "person",
  },
  木: {
    hanzi: "木",
    relationKind: "pictographic_origin",
    notePt: "Remete a uma árvore (tronco + galhos). Associação visual, não desenho literal atual.",
    relatedVisualConceptId: "tree",
  },
  山: {
    hanzi: "山",
    relationKind: "pictographic_origin",
    notePt: "Três picos esquemáticos. Origem pictográfica simplificada.",
    relatedVisualConceptId: "mountain",
  },
  水: {
    hanzi: "水",
    relationKind: "pictographic_origin",
    notePt: "Fluxo de água estilizado. Não é uma foto — é forma convencional.",
    relatedVisualConceptId: "water",
  },
  火: {
    hanzi: "火",
    relationKind: "pictographic_origin",
    notePt: "Chamas esquemáticas na origem. Use como apoio, não como etimologia popular.",
    relatedVisualConceptId: "fire",
  },
  日: {
    hanzi: "日",
    relationKind: "pictographic_origin",
    notePt: "Sol estilizado (círculo com marca). Forma moderna é quadrada.",
    relatedVisualConceptId: "sun",
  },
  月: {
    hanzi: "月",
    relationKind: "pictographic_origin",
    notePt: "Lua crescente estilizada na origem.",
    relatedVisualConceptId: "moon",
  },
  口: {
    hanzi: "口",
    relationKind: "pictographic_origin",
    notePt: "Abertura/boca esquemática. Também funciona como componente moderno.",
    relatedVisualConceptId: "mouth",
  },
};

export function hanziVisualPrepFor(hanzi: string): HanziVisualPrep | null {
  return PREP[hanzi] ?? null;
}

export function listHanziVisualPrep(): HanziVisualPrep[] {
  return Object.values(PREP);
}
