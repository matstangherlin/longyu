// Dados do HanziBuilderExercise: montar hànzì como quebra-cabeça visual.
// Três modos: "fragments" (traços soltos), "complete" (peça faltando) e
// "components" (componentes inteiros). Os traços são paths SVG num viewBox
// 0 0 100 100 — aproximações didáticas, não caligrafia rigorosa.

export type HanziBuilderMode = "fragments" | "components" | "complete";
export type HanziBuilderLevel = 1 | 2 | 3 | 4 | 5;

/** Um traço do caractere, desenhado na carta central. */
export interface HanziStroke {
  id: string;
  /** Path SVG no viewBox 0 0 100 100. */
  d: string;
  /** Descrição para leitor de tela e feedback. */
  label: string;
}

/** Um componente inteiro (glifo), usado no modo "components". */
export interface HanziGlyphPiece {
  id: string;
  glyph: string;
  label: string;
}

export interface HanziBuilder {
  id: string;
  character: string;
  pinyin: string;
  meaningPt: string;
  level: HanziBuilderLevel;
  mode: HanziBuilderMode;
  /** Enunciado curto ("Monte o hànzì de árvore."). */
  promptPt: string;
  /** Dica textual (níveis 2+). */
  hintPt?: string;
  /** Mostra silhueta/linhas-guia leves (modo tutorial). */
  showGuide?: boolean;
  /** Níveis avançados: mostra só o significado até o aluno montar corretamente. */
  hidePinyinUntilCorrect?: boolean;
  /** Nível 5: montar o hànzì dentro de uma frase curta. */
  context?: {
    before: string;
    after: string;
    sentencePinyin: string;
    sentencePt: string;
  };
  // --- fragments / complete ---
  /** Traços que compõem o caractere, em ordem canônica. */
  strokes?: HanziStroke[];
  /** complete: ids de traços já desenhados na carta (não removíveis). */
  fixedStrokeIds?: string[];
  /** Traços errados/parecidos que servem de distração. */
  strokeDistractors?: HanziStroke[];
  // --- components ---
  components?: HanziGlyphPiece[];
  componentDistractors?: HanziGlyphPiece[];
  // --- feedback ---
  explanationPt: string;
  /** "Aparece em 林 e 森." */
  relatedPt?: string;
  /** Dica curta mostrada no erro. */
  errorHintPt?: string;
}

// ---------------------------------------------------------------------------
// Conjuntos de traços por caractere (reutilizados por fragments e complete).
// ---------------------------------------------------------------------------

const MU_STROKES: HanziStroke[] = [
  { id: "mu-h", d: "M20 38 H80", label: "traço horizontal (copa)" },
  { id: "mu-v", d: "M50 22 V82", label: "traço vertical (tronco)" },
  { id: "mu-l", d: "M50 52 L26 80", label: "galho esquerdo" },
  { id: "mu-r", d: "M50 52 L74 80", label: "galho direito" },
];

const REN_STROKES: HanziStroke[] = [
  { id: "ren-l", d: "M52 24 L28 82", label: "traço esquerdo" },
  { id: "ren-r", d: "M50 40 L76 82", label: "traço direito" },
];

const KOU_STROKES: HanziStroke[] = [
  { id: "kou-l", d: "M30 28 V78", label: "lado esquerdo" },
  { id: "kou-t", d: "M30 28 H72", label: "topo" },
  { id: "kou-r", d: "M72 28 V78", label: "lado direito" },
  { id: "kou-b", d: "M30 78 H72", label: "base" },
];

const RI_STROKES: HanziStroke[] = [
  { id: "ri-l", d: "M32 20 V82", label: "lado esquerdo" },
  { id: "ri-t", d: "M32 20 H68", label: "topo" },
  { id: "ri-r", d: "M68 20 V82", label: "lado direito" },
  { id: "ri-m", d: "M32 51 H68", label: "linha do meio" },
  { id: "ri-b", d: "M32 82 H68", label: "base" },
];

const YUE_STROKES: HanziStroke[] = [
  { id: "yue-l", d: "M40 20 C30 44 30 62 30 82", label: "contorno esquerdo" },
  { id: "yue-r", d: "M40 20 H64 V80", label: "topo e lado direito" },
  { id: "yue-1", d: "M36 42 H60", label: "traço interno de cima" },
  { id: "yue-2", d: "M36 62 H60", label: "traço interno de baixo" },
];

const SHAN_STROKES: HanziStroke[] = [
  { id: "shan-b", d: "M22 74 H78", label: "base" },
  { id: "shan-c", d: "M50 26 V74", label: "pico central" },
  { id: "shan-l", d: "M32 50 V74", label: "pico esquerdo" },
  { id: "shan-r", d: "M68 46 V74", label: "pico direito" },
];

const SHUI_STROKES: HanziStroke[] = [
  { id: "shui-c", d: "M50 18 V80", label: "traço central" },
  { id: "shui-lu", d: "M50 40 C42 40 34 46 30 58", label: "gota esquerda de cima" },
  { id: "shui-ld", d: "M46 46 L26 76", label: "gota esquerda de baixo" },
  { id: "shui-ru", d: "M54 40 L74 28", label: "gota direita de cima" },
  { id: "shui-rd", d: "M54 48 L76 76", label: "gota direita de baixo" },
];

const HUO_STROKES: HanziStroke[] = [
  { id: "huo-sl", d: "M38 30 L30 46", label: "faísca esquerda" },
  { id: "huo-sr", d: "M62 30 L70 46", label: "faísca direita" },
  { id: "huo-bl", d: "M50 28 L32 80", label: "chama esquerda" },
  { id: "huo-br", d: "M50 46 L72 80", label: "chama direita" },
];

const DA_STROKES: HanziStroke[] = [
  { id: "da-h", d: "M20 40 H80", label: "traço horizontal" },
  { id: "da-l", d: "M50 26 L24 82", label: "perna esquerda" },
  { id: "da-r", d: "M50 44 L82 82", label: "perna direita" },
];

const XIAO_STROKES: HanziStroke[] = [
  { id: "xiao-c", d: "M50 22 V76", label: "gancho central" },
  { id: "xiao-l", d: "M40 38 L30 62", label: "ponto esquerdo" },
  { id: "xiao-r", d: "M60 38 L70 62", label: "ponto direito" },
];

const ZHONG_STROKES: HanziStroke[] = [
  { id: "zhong-l", d: "M32 28 V72", label: "lado esquerdo da caixa" },
  { id: "zhong-t", d: "M32 28 H70", label: "topo da caixa" },
  { id: "zhong-r", d: "M70 28 V72", label: "lado direito da caixa" },
  { id: "zhong-b", d: "M32 72 H70", label: "base da caixa" },
  { id: "zhong-v", d: "M51 18 V84", label: "traço vertical central" },
];

const WO_STROKES: HanziStroke[] = [
  { id: "wo-slash", d: "M24 30 C38 26 50 22 65 18", label: "traço inclinado superior" },
  { id: "wo-h", d: "M22 42 H66", label: "traço horizontal" },
  { id: "wo-v", d: "M43 26 V76", label: "gancho central" },
  { id: "wo-lift", d: "M22 64 L60 52", label: "traço levantado" },
  { id: "wo-hook", d: "M63 24 C64 48 70 66 82 78", label: "gancho direito" },
  { id: "wo-dot", d: "M68 22 L78 32", label: "ponto direito" },
];

const WEN_STROKES: HanziStroke[] = [
  { id: "wen-dot", d: "M50 18 L50 28", label: "ponto superior" },
  { id: "wen-h", d: "M24 38 H76", label: "traço horizontal" },
  { id: "wen-left", d: "M50 40 C45 58 35 72 22 82", label: "traço esquerdo" },
  { id: "wen-right", d: "M50 42 C56 60 66 74 80 84", label: "traço direito" },
];

// Traços "errados" reutilizáveis como distratores.
const D_DIAG: HanziStroke = { id: "x-diag", d: "M28 30 L72 74", label: "diagonal grande" };
const D_CURVE: HanziStroke = { id: "x-curve", d: "M30 42 C50 22 60 72 74 52", label: "curva em S" };
const D_SHORT: HanziStroke = { id: "x-short", d: "M40 50 H62", label: "traço curto solto" };
const D_DOT: HanziStroke = { id: "x-dot", d: "M46 40 L56 50", label: "ponto solto" };

const cloneStroke = (stroke: HanziStroke, id: string): HanziStroke => ({ ...stroke, id });

// ---------------------------------------------------------------------------
// Componentes (glifos) para o modo "components".
// ---------------------------------------------------------------------------

const G_MU: HanziGlyphPiece = { id: "g-mu", glyph: "木", label: "árvore" };
const G_MU2: HanziGlyphPiece = { id: "g-mu2", glyph: "木", label: "árvore" };
const G_MU3: HanziGlyphPiece = { id: "g-mu3", glyph: "木", label: "árvore" };
const G_RI: HanziGlyphPiece = { id: "g-ri", glyph: "日", label: "sol / dia" };
const G_YUE: HanziGlyphPiece = { id: "g-yue", glyph: "月", label: "lua / mês" };
const G_NV: HanziGlyphPiece = { id: "g-nv", glyph: "女", label: "mulher" };
const G_ZI: HanziGlyphPiece = { id: "g-zi", glyph: "子", label: "criança" };
const G_REN_SIDE: HanziGlyphPiece = { id: "g-ren-side", glyph: "亻", label: "pessoa (lateral)" };
const G_ER: HanziGlyphPiece = { id: "g-er", glyph: "尔", label: "tu (arcaico)" };
const G_KOU: HanziGlyphPiece = { id: "g-kou", glyph: "口", label: "boca" };

// ---------------------------------------------------------------------------
// Exercícios.
// ---------------------------------------------------------------------------

export const HANZI_BUILDERS: HanziBuilder[] = [
  // ---- Nível 1: fragmentos básicos, sem distratores, com guia ----
  {
    id: "hb-mu-fragments",
    character: "木",
    pinyin: "mù",
    meaningPt: "árvore / madeira",
    level: 1,
    mode: "fragments",
    promptPt: "Monte o hànzì de árvore.",
    showGuide: true,
    strokes: MU_STROKES,
    explanationPt: "木 é o tronco vertical com a copa na horizontal e dois galhos abrindo.",
    relatedPt: "Aparece em 林 (bosque) e 森 (floresta).",
    errorHintPt: "木 tem um traço vertical no centro e dois galhos que abrem como uma árvore.",
  },
  {
    id: "hb-ren-fragments",
    character: "人",
    pinyin: "rén",
    meaningPt: "pessoa",
    level: 1,
    mode: "fragments",
    promptPt: "Monte o hànzì de pessoa.",
    showGuide: true,
    strokes: REN_STROKES,
    explanationPt: "人 são só dois traços que se apoiam como duas pernas.",
    relatedPt: "Como radical lateral vira 亻, em 你 e 休.",
    errorHintPt: "São dois traços que se encontram no topo e abrem para baixo.",
  },
  {
    id: "hb-kou-fragments",
    character: "口",
    pinyin: "kǒu",
    meaningPt: "boca / abertura",
    level: 1,
    mode: "fragments",
    promptPt: "Monte o hànzì de boca.",
    showGuide: true,
    strokes: KOU_STROKES,
    explanationPt: "口 fecha um quadrado: lados, topo e base.",
    relatedPt: "Aparece em muitos caracteres de fala e som.",
    errorHintPt: "Feche o quadrado com os quatro lados.",
  },
  {
    id: "hb-ri-fragments",
    character: "日",
    pinyin: "rì",
    meaningPt: "sol / dia",
    level: 1,
    mode: "fragments",
    promptPt: "Monte o hànzì de sol.",
    showGuide: true,
    strokes: RI_STROKES,
    explanationPt: "日 é uma caixa com uma linha no meio, como o sol antigo.",
    relatedPt: "日 + 月 formam 明 (claro).",
    errorHintPt: "É um retângulo com uma linha dividindo o meio.",
  },
  {
    id: "hb-yue-fragments",
    character: "月",
    pinyin: "yuè",
    meaningPt: "lua / mês",
    level: 1,
    mode: "fragments",
    promptPt: "Monte o hànzì de lua.",
    showGuide: true,
    strokes: YUE_STROKES,
    explanationPt: "月 é o contorno da lua com dois traços internos.",
    relatedPt: "日 + 月 formam 明 (claro).",
    errorHintPt: "Contorno curvo à esquerda, lado reto à direita e dois traços dentro.",
  },
  {
    id: "hb-shan-fragments",
    character: "山",
    pinyin: "shān",
    meaningPt: "montanha",
    level: 1,
    mode: "fragments",
    promptPt: "Monte o hànzì de montanha.",
    showGuide: true,
    strokes: SHAN_STROKES,
    explanationPt: "山 são três picos sobre uma base, como uma montanha.",
    errorHintPt: "Três hastes verticais apoiadas em uma base.",
  },
  {
    id: "hb-shui-fragments",
    character: "水",
    pinyin: "shuǐ",
    meaningPt: "água",
    level: 1,
    mode: "fragments",
    promptPt: "Monte o hànzì de água.",
    showGuide: true,
    strokes: SHUI_STROKES,
    explanationPt: "水 tem um traço central e gotas dos dois lados, como água correndo.",
    relatedPt: "Como radical lateral costuma aparecer como 氵.",
    errorHintPt: "Um traço central com gotas abrindo dos dois lados.",
  },
  {
    id: "hb-huo-fragments",
    character: "火",
    pinyin: "huǒ",
    meaningPt: "fogo",
    level: 1,
    mode: "fragments",
    promptPt: "Monte o hànzì de fogo.",
    showGuide: true,
    strokes: HUO_STROKES,
    explanationPt: "火 tem duas faíscas em cima e o corpo da chama embaixo.",
    errorHintPt: "Duas faíscas no topo e duas chamas descendo.",
  },
  {
    id: "hb-da-fragments",
    character: "大",
    pinyin: "dà",
    meaningPt: "grande",
    level: 1,
    mode: "fragments",
    promptPt: "Monte o hànzì de grande.",
    showGuide: true,
    strokes: DA_STROKES,
    explanationPt: "大 é uma pessoa de braços abertos: uma linha e duas pernas.",
    errorHintPt: "Uma horizontal no alto e duas pernas abrindo.",
  },
  {
    id: "hb-xiao-fragments",
    character: "小",
    pinyin: "xiǎo",
    meaningPt: "pequeno",
    level: 1,
    mode: "fragments",
    promptPt: "Monte o hànzì de pequeno.",
    showGuide: true,
    strokes: XIAO_STROKES,
    explanationPt: "小 é um gancho central com dois pontinhos ao lado.",
    errorHintPt: "Gancho no centro e um ponto de cada lado.",
  },
  {
    id: "hb-zhong-fragments",
    character: "中",
    pinyin: "zhōng",
    meaningPt: "meio / centro; China",
    level: 2,
    mode: "fragments",
    promptPt: "Monte o hànzì de centro.",
    showGuide: true,
    strokes: ZHONG_STROKES,
    strokeDistractors: [cloneStroke(D_SHORT, "x-short-zhong")],
    explanationPt: "中 é uma caixa atravessada por um traço vertical: a ideia visual de centro/meio.",
    relatedPt: "Aparece em 中文, Zhōngwén: língua chinesa.",
    errorHintPt: "Feche a caixa e coloque o traço vertical bem no meio.",
  },
  {
    id: "hb-wen-fragments",
    character: "文",
    pinyin: "wén",
    meaningPt: "escrita / língua / cultura",
    level: 2,
    mode: "fragments",
    promptPt: "Monte o hànzì de escrita/língua.",
    showGuide: true,
    strokes: WEN_STROKES,
    strokeDistractors: [cloneStroke(D_SHORT, "x-short-wen")],
    explanationPt: "文 tem ponto no topo, linha horizontal e dois traços que abrem embaixo.",
    relatedPt: "Aparece em 中文, língua chinesa.",
    errorHintPt: "Comece pelo topo e feche com os dois traços que abrem para baixo.",
  },
  {
    id: "hb-wo-fragments",
    character: "我",
    pinyin: "wǒ",
    meaningPt: "eu",
    level: 3,
    mode: "fragments",
    promptPt: "Monte o hànzì de eu.",
    showGuide: true,
    strokes: WO_STROKES,
    strokeDistractors: [cloneStroke(D_CURVE, "x-curve-wo"), cloneStroke(D_SHORT, "x-short-wo")],
    explanationPt: "我 aparece em apresentações como 我叫... e 我是.... Repare no eixo central e no gancho à direita.",
    relatedPt: "Aparece em 我叫, 我是 e 我不会说中文.",
    errorHintPt: "Procure o eixo central primeiro; depois complete o gancho e o ponto da direita.",
  },
  {
    id: "hb-shui-challenge",
    character: "水",
    pinyin: "shuǐ",
    meaningPt: "água",
    level: 3,
    mode: "fragments",
    promptPt: "Monte o hànzì de água sem silhueta.",
    strokes: SHUI_STROKES,
    strokeDistractors: [cloneStroke(D_CURVE, "x-curve-shui-challenge"), cloneStroke(D_SHORT, "x-short-shui-challenge")],
    explanationPt: "水 tem um eixo central e quatro movimentos laterais, como gotas correndo.",
    relatedPt: "Como componente, água costuma apontar para líquidos e fluxo.",
    errorHintPt: "Procure o eixo central primeiro; depois encaixe as gotas laterais.",
  },
  {
    id: "hb-huo-challenge",
    character: "火",
    pinyin: "huǒ",
    meaningPt: "fogo",
    level: 3,
    mode: "fragments",
    promptPt: "Monte o hànzì de fogo sem silhueta.",
    strokes: HUO_STROKES,
    strokeDistractors: [cloneStroke(D_DIAG, "x-diag-huo-challenge"), cloneStroke(D_SHORT, "x-short-huo-challenge")],
    explanationPt: "火 combina duas faíscas pequenas e duas chamas maiores.",
    errorHintPt: "As faíscas ficam em cima; os traços longos descem como chama.",
  },
  {
    id: "hb-zhong-challenge",
    character: "中",
    pinyin: "zhōng",
    meaningPt: "meio / centro; China",
    level: 3,
    mode: "fragments",
    promptPt: "Monte 中 sem molde.",
    strokes: ZHONG_STROKES,
    strokeDistractors: [cloneStroke(D_DIAG, "x-diag-zhong-challenge"), cloneStroke(D_DOT, "x-dot-zhong-challenge")],
    explanationPt: "中 só funciona visualmente quando a caixa é atravessada pelo traço central.",
    errorHintPt: "Monte a caixa e atravesse o centro com uma vertical.",
  },

  // ---- Nível 2: completar peça faltando ----
  {
    id: "hb-mu-complete",
    character: "木",
    pinyin: "mù",
    meaningPt: "árvore / madeira",
    level: 2,
    mode: "complete",
    promptPt: "Complete o hànzì 木.",
    hintPt: "Falta o tronco e um galho.",
    strokes: MU_STROKES,
    fixedStrokeIds: ["mu-h", "mu-l"],
    strokeDistractors: [D_DIAG, cloneStroke(D_SHORT, "x-short-mu")],
    explanationPt: "木 precisa do tronco vertical e dos dois galhos.",
    errorHintPt: "O tronco é vertical, no centro. Os galhos abrem para baixo.",
  },
  {
    id: "hb-shui-complete",
    character: "水",
    pinyin: "shuǐ",
    meaningPt: "água",
    level: 2,
    mode: "complete",
    promptPt: "Complete o hànzì 水.",
    hintPt: "Faltam as gotas laterais.",
    strokes: SHUI_STROKES,
    fixedStrokeIds: ["shui-c", "shui-lu"],
    strokeDistractors: [D_CURVE, cloneStroke(D_DIAG, "x-diag-shui")],
    explanationPt: "水 fecha com as gotas dos dois lados do traço central.",
    errorHintPt: "Perceba os traços laterais como o movimento da água.",
  },
  {
    id: "hb-huo-complete",
    character: "火",
    pinyin: "huǒ",
    meaningPt: "fogo",
    level: 2,
    mode: "complete",
    promptPt: "Complete o hànzì 火.",
    hintPt: "Falta uma faísca e uma chama.",
    strokes: HUO_STROKES,
    fixedStrokeIds: ["huo-sl", "huo-bl"],
    strokeDistractors: [cloneStroke(D_DOT, "x-dot-huo"), cloneStroke(D_SHORT, "x-short-huo")],
    explanationPt: "火 tem duas faíscas em cima e duas chamas descendo.",
    errorHintPt: "Uma faísca de cada lado; as chamas descem no meio.",
  },
  {
    id: "hb-kou-complete",
    character: "口",
    pinyin: "kǒu",
    meaningPt: "boca / abertura",
    level: 2,
    mode: "complete",
    promptPt: "Complete o hànzì 口.",
    hintPt: "Falta fechar um lado e a base.",
    strokes: KOU_STROKES,
    fixedStrokeIds: ["kou-l", "kou-t"],
    strokeDistractors: [cloneStroke(D_DIAG, "x-diag-kou")],
    explanationPt: "口 só fica pronto quando o quadrado fecha.",
    errorHintPt: "Falta o lado direito e a base para fechar o quadrado.",
  },
  {
    id: "hb-ri-complete",
    character: "日",
    pinyin: "rì",
    meaningPt: "sol / dia",
    level: 2,
    mode: "complete",
    promptPt: "Complete o hànzì 日.",
    hintPt: "Falta a linha do meio e a base.",
    strokes: RI_STROKES,
    fixedStrokeIds: ["ri-l", "ri-t", "ri-r"],
    strokeDistractors: [cloneStroke(D_DIAG, "x-diag-ri")],
    explanationPt: "日 é uma caixa com a linha do meio — não esqueça de fechá-la embaixo.",
    errorHintPt: "A linha do meio divide o sol; a base fecha a caixa.",
  },
  {
    id: "hb-yue-complete",
    character: "月",
    pinyin: "yuè",
    meaningPt: "lua / mês",
    level: 2,
    mode: "complete",
    promptPt: "Complete o hànzì 月.",
    hintPt: "Faltam os traços internos.",
    strokes: YUE_STROKES,
    fixedStrokeIds: ["yue-l", "yue-r"],
    strokeDistractors: [cloneStroke(D_DIAG, "x-diag-yue"), cloneStroke(D_DOT, "x-dot-yue")],
    explanationPt: "月 leva dois traços internos dentro do contorno.",
    errorHintPt: "São dois traços horizontais dentro do contorno da lua.",
  },

  // ---- Nível 3: componentes inteiros ----
  {
    id: "hb-lin-components",
    character: "林",
    pinyin: "lín",
    meaningPt: "bosque",
    level: 3,
    mode: "components",
    promptPt: "Monte o hànzì que significa 'bosque'.",
    hintPt: "Duas árvores, lado a lado.",
    components: [G_MU, G_MU2],
    componentDistractors: [G_RI, G_KOU],
    explanationPt: "林 junta 木 + 木: duas árvores formam um bosque.",
    relatedPt: "Com três árvores vira 森 (floresta).",
    errorHintPt: "Repita a mesma peça: 木 + 木.",
  },
  {
    id: "hb-sen-components",
    character: "森",
    pinyin: "sēn",
    meaningPt: "floresta densa",
    level: 3,
    mode: "components",
    promptPt: "Monte o hànzì que significa 'floresta'.",
    hintPt: "Três árvores empilhadas.",
    components: [G_MU, G_MU2, G_MU3],
    componentDistractors: [G_KOU, G_RI],
    explanationPt: "森 junta 木 + 木 + 木: a repetição intensifica a ideia de árvore.",
    relatedPt: "森 é mais denso que 林.",
    errorHintPt: "São três 木, não dois.",
  },
  {
    id: "hb-ming-components",
    character: "明",
    pinyin: "míng",
    meaningPt: "claro / brilhante",
    level: 3,
    mode: "components",
    promptPt: "Monte o hànzì que significa 'claro/brilhante'.",
    hintPt: "Sol + lua.",
    components: [G_RI, G_YUE],
    componentDistractors: [G_MU, G_KOU],
    explanationPt: "明 junta 日 + 月: sol e lua, duas fontes de luz.",
    errorHintPt: "Primeiro o sol 日, depois a lua 月.",
  },
  {
    id: "hb-hao-components",
    character: "好",
    pinyin: "hǎo",
    meaningPt: "bom / bem",
    level: 3,
    mode: "components",
    promptPt: "Monte o hànzì que significa 'bom'.",
    hintPt: "Mulher + criança.",
    components: [G_NV, G_ZI],
    componentDistractors: [G_MU, G_RI],
    explanationPt: "好 junta 女 + 子. Hoje significa bom ou bem.",
    errorHintPt: "Primeiro 女 (mulher), depois 子 (criança).",
  },
  {
    id: "hb-xiu-components",
    character: "休",
    pinyin: "xiū",
    meaningPt: "descansar",
    level: 4,
    mode: "components",
    promptPt: "Monte o hànzì que significa 'descansar'.",
    hintPt: "Uma pessoa ao lado de uma árvore.",
    components: [G_REN_SIDE, G_MU],
    componentDistractors: [G_ZI, G_RI],
    explanationPt: "休 junta 亻 (pessoa) + 木 (árvore): alguém encostado numa árvore, descansando.",
    errorHintPt: "亻 é a pessoa lateral; depois vem 木.",
  },
  {
    id: "hb-ni-components",
    character: "你",
    pinyin: "nǐ",
    meaningPt: "você",
    level: 4,
    mode: "components",
    promptPt: "Monte o hànzì que significa 'você'.",
    hintPt: "Pessoa + 尔.",
    components: [G_REN_SIDE, G_ER],
    componentDistractors: [G_ZI, G_MU],
    explanationPt: "你 junta 亻 (pessoa) + 尔. É o 'você' do dia a dia.",
    relatedPt: "Aparece em 你好 (olá).",
    errorHintPt: "亻 (pessoa) vem antes de 尔.",
  },
  {
    id: "hb-hao-sentence",
    character: "好",
    pinyin: "hǎo",
    meaningPt: "bom / bem",
    level: 5,
    mode: "components",
    promptPt: "Complete a saudação: 你__.",
    hidePinyinUntilCorrect: true,
    context: {
      before: "你",
      after: "",
      sentencePinyin: "nǐ hǎo",
      sentencePt: "Olá.",
    },
    components: [G_NV, G_ZI],
    componentDistractors: [G_MU, G_KOU],
    explanationPt: "好 fecha 你好. Mesmo dentro da frase, a forma visual continua sendo 女 + 子.",
    relatedPt: "你好 é uma das primeiras frases úteis do mandarim.",
    errorHintPt: "Procure a composição de 好: 女 + 子.",
  },
  {
    id: "hb-ni-sentence",
    character: "你",
    pinyin: "nǐ",
    meaningPt: "você",
    level: 5,
    mode: "components",
    promptPt: "Complete a frase: __好.",
    hidePinyinUntilCorrect: true,
    context: {
      before: "",
      after: "好",
      sentencePinyin: "nǐ hǎo",
      sentencePt: "Olá.",
    },
    components: [G_REN_SIDE, G_ER],
    componentDistractors: [G_ZI, G_MU],
    explanationPt: "你 é a pessoa da frase 你好. A lateral 亻 lembra que falamos de alguém.",
    relatedPt: "你 aparece em 你好吗？ e 你叫什么？.",
    errorHintPt: "Monte 你 com 亻 + 尔.",
  },
  {
    id: "hb-zhongwen-sentence",
    character: "中",
    pinyin: "zhōng",
    meaningPt: "meio / China",
    level: 5,
    mode: "fragments",
    promptPt: "Complete a palavra: __文.",
    hidePinyinUntilCorrect: true,
    context: {
      before: "",
      after: "文",
      sentencePinyin: "Zhōngwén",
      sentencePt: "chinês; língua chinesa",
    },
    strokes: ZHONG_STROKES,
    strokeDistractors: [cloneStroke(D_DIAG, "x-diag-zhongwen"), cloneStroke(D_DOT, "x-dot-zhongwen")],
    explanationPt: "中 aparece em 中文. Mesmo dentro de uma palavra, a caixa atravessada mantém a ideia de centro/China.",
    relatedPt: "中文 é uma das primeiras palavras úteis para falar sobre estudar chinês.",
    errorHintPt: "Monte a caixa e atravesse o meio com a vertical.",
  },
  {
    id: "hb-ming-sentence",
    character: "明",
    pinyin: "míng",
    meaningPt: "claro / brilhante",
    level: 5,
    mode: "components",
    promptPt: "Monte o hànzì que completa: __天.",
    hidePinyinUntilCorrect: true,
    context: {
      before: "",
      after: "天",
      sentencePinyin: "míngtiān",
      sentencePt: "amanhã",
    },
    components: [G_RI, G_YUE],
    componentDistractors: [G_MU, G_KOU],
    explanationPt: "明 combina 日 + 月. Em 明天, ele ganha uso real: amanhã.",
    relatedPt: "A mesma forma também carrega a ideia de claro/brilhante.",
    errorHintPt: "Sol 日 antes de lua 月.",
  },
];

// ---------------------------------------------------------------------------
// Lookups e seleções úteis para lições, treino e revisão.
// ---------------------------------------------------------------------------

export const hanziBuilderById: Record<string, HanziBuilder> = Object.fromEntries(
  HANZI_BUILDERS.map((builder) => [builder.id, builder])
);

export function getHanziBuilder(id: string | undefined): HanziBuilder | undefined {
  return id ? hanziBuilderById[id] : undefined;
}

/** Builders cujo caractere-alvo é `character` (para gerar revisão a partir de erro). */
export function buildersForCharacter(character: string): HanziBuilder[] {
  const clean = character.trim();
  return HANZI_BUILDERS.filter((builder) => builder.character === clean);
}

/** Um builder representativo para um caractere, preferindo o modo mais simples. */
export function preferredBuilderForCharacter(character: string): HanziBuilder | undefined {
  const matches = buildersForCharacter(character);
  if (matches.length === 0) return undefined;
  const order: HanziBuilderMode[] = ["fragments", "complete", "components"];
  return [...matches].sort(
    (a, b) => order.indexOf(a.mode) - order.indexOf(b.mode) || a.level - b.level
  )[0];
}

export const FRAGMENT_BUILDERS = HANZI_BUILDERS.filter((b) => b.mode === "fragments");
export const COMPLETE_BUILDERS = HANZI_BUILDERS.filter((b) => b.mode === "complete");
export const COMPONENT_BUILDERS = HANZI_BUILDERS.filter((b) => b.mode === "components" && !b.context);
export const SENTENCE_BUILDERS = HANZI_BUILDERS.filter((b) => Boolean(b.context));

/** Ordena todos os builders por dificuldade, para uma sessão de treino livre. */
export const TRAINING_BUILDERS = [...HANZI_BUILDERS].sort((a, b) => a.level - b.level);
