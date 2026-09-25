/**
 * RC2.2.15 · R–T, CE–CH — o que o Longyu pode afirmar sobre a ORIGEM de um hànzì.
 *
 * Quatro tipos de texto, nunca misturados:
 *
 *   VERIFIED_HISTORICAL     origem documentada, com fonte registrada aqui;
 *                           a UI mostra "Origem do caractere".
 *   PEDAGOGICAL_MNEMONIC    dica de memória (CHARACTERS.mnemonicPt); a UI mostra
 *                           "Dica para lembrar" — nunca "este caractere surgiu porque…".
 *   COMPONENT_EXPLANATION   só lista as peças que o dataset registra (radicais),
 *                           sem contar história.
 *   NONE                    nada a dizer além do significado.
 *
 * Só entra aqui o que tem fonte. Hoje: os sete pictogramas que o Longyu já
 * ensina com HanziEvolutionCard (木 日 月 山 口 人 水). Todos são classificados
 * como 象形 (pictograma) no 說文解字 e têm formas pictográficas atestadas no
 * bronze e nos ossos oraculares. Fica PROIBIDO gerar "história" combinando
 * componentes (女 + 子 = 好 não vira narrativa sem fonte).
 */

export type HanziStoryStatus = "VERIFIED_HISTORICAL" | "PEDAGOGICAL_MNEMONIC" | "COMPONENT_EXPLANATION" | "NONE";

export interface HanziOriginSource {
  /** Obra ou referência citável. */
  title: string;
  /** O que a fonte diz, em uma linha (não é bibliografia completa). */
  detail: string;
}

export interface HanziOriginNote {
  hanzi: string;
  /** id do HANZI_EVOLUTIONS que já desenha a evolução (reuso, sem nova visualização). */
  evolutionId: string;
  status: "VERIFIED_HISTORICAL";
  notePt: string;
  noteEn: string;
  /** Micro-pista curta (cabe numa notificação). */
  hintPt: string;
  hintEn: string;
  sources: HanziOriginSource[];
}

const SHUOWEN_PICTOGRAPH = (glyph: string): HanziOriginSource => ({
  title: "說文解字 (Xu Shen, c. 100 d.C.)",
  detail: `classifica ${glyph} como 象形 (pictograma)`,
});
const ORACLE_BONE: HanziOriginSource = {
  title: "Inscrições em ossos oraculares (dinastia Shang, c. 1250–1050 a.C.)",
  detail: "forma pictográfica atestada",
};

export const HANZI_ORIGIN_NOTES: Readonly<Record<string, HanziOriginNote>> = {
  木: {
    hanzi: "木",
    evolutionId: "mu",
    status: "VERIFIED_HISTORICAL",
    notePt: "Pictograma: a forma antiga desenhava uma árvore, com galhos em cima e raízes embaixo.",
    noteEn: "Pictograph: the early form drew a tree, with branches above and roots below.",
    hintPt: "A forma antiga desenhava uma árvore.",
    hintEn: "The early form drew a tree.",
    sources: [SHUOWEN_PICTOGRAPH("木"), ORACLE_BONE],
  },
  日: {
    hanzi: "日",
    evolutionId: "ri",
    status: "VERIFIED_HISTORICAL",
    notePt: "Pictograma: um círculo com um traço no meio representava o sol; com o pincel, virou retângulo.",
    noteEn: "Pictograph: a circle with a mark inside stood for the sun; with the brush it became a rectangle.",
    hintPt: "Era um desenho do sol.",
    hintEn: "It was a drawing of the sun.",
    sources: [SHUOWEN_PICTOGRAPH("日"), ORACLE_BONE],
  },
  月: {
    hanzi: "月",
    evolutionId: "yue",
    status: "VERIFIED_HISTORICAL",
    notePt: "Pictograma: a forma antiga desenhava a lua crescente.",
    noteEn: "Pictograph: the early form drew a crescent moon.",
    hintPt: "A forma antiga desenhava a lua crescente.",
    hintEn: "The early form drew a crescent moon.",
    sources: [SHUOWEN_PICTOGRAPH("月"), ORACLE_BONE],
  },
  山: {
    hanzi: "山",
    evolutionId: "shan",
    status: "VERIFIED_HISTORICAL",
    notePt: "Pictograma: três picos sobre uma base desenhavam uma montanha.",
    noteEn: "Pictograph: three peaks on a base drew a mountain.",
    hintPt: "Três picos desenhavam uma montanha.",
    hintEn: "Three peaks drew a mountain.",
    sources: [SHUOWEN_PICTOGRAPH("山"), ORACLE_BONE],
  },
  口: {
    hanzi: "口",
    evolutionId: "kou",
    status: "VERIFIED_HISTORICAL",
    notePt: "Pictograma: uma abertura desenhava a boca.",
    noteEn: "Pictograph: an opening drew the mouth.",
    hintPt: "Uma abertura desenhava a boca.",
    hintEn: "An opening drew the mouth.",
    sources: [SHUOWEN_PICTOGRAPH("口"), ORACLE_BONE],
  },
  人: {
    hanzi: "人",
    evolutionId: "ren",
    status: "VERIFIED_HISTORICAL",
    notePt: "Pictograma: a forma antiga mostrava uma pessoa de perfil, em pé.",
    noteEn: "Pictograph: the early form showed a standing person in profile.",
    hintPt: "Mostrava uma pessoa de perfil.",
    hintEn: "It showed a person in profile.",
    sources: [SHUOWEN_PICTOGRAPH("人"), ORACLE_BONE],
  },
  水: {
    hanzi: "水",
    evolutionId: "shui",
    status: "VERIFIED_HISTORICAL",
    notePt: "Pictograma: linhas de água correndo; como componente lateral vira 氵.",
    noteEn: "Pictograph: lines of flowing water; as a side component it becomes 氵.",
    hintPt: "Linhas de água correndo.",
    hintEn: "Lines of flowing water.",
    sources: [SHUOWEN_PICTOGRAPH("水"), ORACLE_BONE],
  },
};

export function hanziOriginNote(hanzi: string): HanziOriginNote | undefined {
  return HANZI_ORIGIN_NOTES[hanzi];
}
