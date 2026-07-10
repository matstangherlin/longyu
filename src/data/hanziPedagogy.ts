import type { Character } from "./types";

export type ComponentRole = "sentido" | "som" | "forma";

export interface HanziComponentNote {
  componentId: string;
  role: ComponentRole;
  note: string;
}

export interface HanziLessonModel {
  charId: string;
  headline: string;
  coreIdea: string;
  caution?: string;
  strokeHint: string;
  components: HanziComponentNote[];
  relatedWords: { hanzi: string; pinyin: string; pt: string }[];
  sentence: { hanzi: string; pinyin: string; pt: string };
}

export type HanziEvolutionSketch = "tree" | "sun" | "moon" | "mountain" | "mouth" | "person" | "water";

export interface HanziEvolutionModel {
  charId: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  sketch: HanziEvolutionSketch;
  ancientLabel: string;
  ancientNote: string;
  middleLabel: string;
  middleNote: string;
  modernNote: string;
  decomposition: string[];
  word: { hanzi: string; pinyin: string; pt: string };
  sentence: { hanzi: string; pinyin: string; pt: string };
  insight: string;
}

export interface HanziLogicCard {
  title: string;
  example: string;
  body: string;
}

export const HANZI_EVOLUTION_CORE_IDS = ["mu", "ri", "yue", "ren", "kou", "shan", "shui"] as const;

export const HANZI_EVOLUTIONS: Record<string, HanziEvolutionModel> = {
  mu: {
    charId: "mu",
    hanzi: "木",
    pinyin: "mù",
    meaningPt: "árvore; madeira",
    sketch: "tree",
    ancientLabel: "árvore antiga",
    ancientNote: "tronco, galhos e raiz viram uma silhueta simples.",
    middleLabel: "forma padronizada",
    middleNote: "as curvas se alinham em traços escritos.",
    modernNote: "木 é lido como mù e aparece como caractere e peça.",
    decomposition: ["一 tronco/copa", "丨 eixo", "丿/丶 galhos"],
    word: { hanzi: "木头", pinyin: "mùtou", pt: "madeira" },
    sentence: { hanzi: "木 + 木 = 林。", pinyin: "Mù + mù = lín.", pt: "Duas árvores formam bosque." },
    insight: "Um hànzì pode nascer de uma imagem, mas vira uma unidade de leitura estável.",
  },
  ri: {
    charId: "ri",
    hanzi: "日",
    pinyin: "rì",
    meaningPt: "sol; dia",
    sketch: "sun",
    ancientLabel: "sol antigo",
    ancientNote: "um círculo com ponto central representava o sol.",
    middleLabel: "sinal retangular",
    middleNote: "o círculo foi achatado para caber na escrita com pincel.",
    modernNote: "日 também funciona como peça de sentido em caracteres ligados a tempo e luz.",
    decomposition: ["caixa externa", "traço interno"],
    word: { hanzi: "日子", pinyin: "rìzi", pt: "dia; data" },
    sentence: { hanzi: "日 + 月 = 明。", pinyin: "Rì + yuè = míng.", pt: "Sol e lua sugerem brilho." },
    insight: "A forma moderna não tenta desenhar um sol perfeito; ela preserva uma pista visual.",
  },
  yue: {
    charId: "yue",
    hanzi: "月",
    pinyin: "yuè",
    meaningPt: "lua; mês",
    sketch: "moon",
    ancientLabel: "lua antiga",
    ancientNote: "uma lua crescente foi simplificada em linhas.",
    middleLabel: "forma estreita",
    middleNote: "a lua vira um bloco vertical fácil de escrever.",
    modernNote: "月 é lua, mês e também aparece como componente em muitos caracteres.",
    decomposition: ["contorno vertical", "dois traços internos"],
    word: { hanzi: "月亮", pinyin: "yuèliang", pt: "lua" },
    sentence: { hanzi: "明有日和月。", pinyin: "Míng yǒu rì hé yuè.", pt: "明 tem sol e lua." },
    insight: "Você reconhece o bloco visual antes de lembrar cada traço isolado.",
  },
  shan: {
    charId: "shan",
    hanzi: "山",
    pinyin: "shān",
    meaningPt: "montanha",
    sketch: "mountain",
    ancientLabel: "picos antigos",
    ancientNote: "três picos desenhavam uma montanha.",
    middleLabel: "picos alinhados",
    middleNote: "os picos viram traços verticais com uma base comum.",
    modernNote: "山 é compacto, visual e muito frequente como peça de sentido.",
    decomposition: ["três picos", "base"],
    word: { hanzi: "山上", pinyin: "shān shàng", pt: "na montanha" },
    sentence: { hanzi: "山很高。", pinyin: "Shān hěn gāo.", pt: "A montanha é alta." },
    insight: "A escrita moderna transforma desenho em padrão.",
  },
  kou: {
    charId: "kou",
    hanzi: "口",
    pinyin: "kǒu",
    meaningPt: "boca; abertura",
    sketch: "mouth",
    ancientLabel: "boca antiga",
    ancientNote: "uma abertura simples representava boca ou entrada.",
    middleLabel: "quadrado escrito",
    middleNote: "a abertura foi regularizada em quatro lados.",
    modernNote: "口 aparece em muitos caracteres ligados a fala, som e boca.",
    decomposition: ["abertura fechada"],
    word: { hanzi: "口语", pinyin: "kǒuyǔ", pt: "fala; língua oral" },
    sentence: { hanzi: "口在吗里。", pinyin: "Kǒu zài ma lǐ.", pt: "口 aparece em 吗." },
    insight: "Algumas peças dão sentido; outras ajudam o som ou a categoria visual.",
  },
  ren: {
    charId: "ren",
    hanzi: "人",
    pinyin: "rén",
    meaningPt: "pessoa",
    sketch: "person",
    ancientLabel: "pessoa antiga",
    ancientNote: "um corpo inclinado virou uma forma mínima de pessoa.",
    middleLabel: "traços humanos",
    middleNote: "a figura vira dois traços equilibrados.",
    modernNote: "人 pode aparecer sozinho ou como radical lateral 亻.",
    decomposition: ["traço esquerdo", "traço direito"],
    word: { hanzi: "巴西人", pinyin: "Bāxī rén", pt: "brasileiro(a)" },
    sentence: { hanzi: "你是巴西人吗？", pinyin: "Nǐ shì Bāxī rén ma?", pt: "Você é brasileiro(a)?" },
    insight: "O cérebro aprende a reconhecer 人 como bloco visual, não como letra.",
  },
  shui: {
    charId: "shui",
    hanzi: "水",
    pinyin: "shuǐ",
    meaningPt: "água",
    sketch: "water",
    ancientLabel: "água antiga",
    ancientNote: "linhas onduladas representavam fluxo de água de modo aproximado.",
    middleLabel: "fluxo escrito",
    middleNote: "as ondas foram organizadas em traços mais regulares.",
    modernNote: "水 é água; como componente lateral costuma aparecer como 氵.",
    decomposition: ["fluxo central", "gotas laterais"],
    word: { hanzi: "水", pinyin: "shuǐ", pt: "água" },
    sentence: { hanzi: "水 + 口 帮你记。", pinyin: "Shuǐ + kǒu bāng nǐ jì.", pt: "Água e boca ajudam a memorizar por peças." },
    insight: "A forma antiga aqui é uma aproximação didática: o ponto é ver a ideia virar sinal estável.",
  },
};

// Explicações curtas, uma frase, para o modo "um exemplo por vez" da lição
// "O que é hànzì?". Ficam separadas das notas de evolução (mais longas) porque
// aqui o objetivo é caber num slide compacto, sem virar textão.
export const HANZI_CONCEPT_EXPLANATIONS: Record<string, string> = {
  mu: "Pense em uma árvore: tronco no meio, copa em cima e galhos abrindo.",
  ri: "Era um desenho do sol, depois virou uma forma mais quadrada.",
  yue: "Nasceu da ideia visual da lua e também passou a indicar mês.",
  ren: "Dois traços lembram uma pessoa de pé.",
  kou: "Uma abertura simples que hoje virou um quadrado: a boca.",
  shan: "Três picos de montanha viraram três traços sobre uma base.",
  shui: "Linhas de água correndo viraram traços mais organizados.",
};

export const HANZI_LOGIC_CARDS: HanziLogicCard[] = [
  {
    title: "Pictogramas",
    example: "木 日 月 山",
    body: "Alguns começaram como desenhos simplificados. Hoje são sinais padronizados.",
  },
  {
    title: "Ideogramas compostos",
    example: "木 + 木 = 林",
    body: "Peças podem se combinar para criar uma ideia visual nova.",
  },
  {
    title: "Pista sonora",
    example: "女 + 马 = 妈",
    body: "Muitos caracteres usam uma peça de sentido e outra que sugere o som.",
  },
  {
    title: "Radicais",
    example: "口 亻 氵 木",
    body: "Radicais ajudam a organizar famílias de sentido, forma e consulta.",
  },
  {
    title: "Palavras compostas",
    example: "中文 朋友 你好",
    body: "Vários hànzì se juntam para formar palavras e frases reais.",
  },
  {
    title: "Pinyin não é hànzì",
    example: "sān ≠ 三",
    body: "Pinyin mostra o som; hànzì mostra a forma escrita usada por chineses.",
  },
];

export const HANZI_LESSONS: Record<string, HanziLessonModel> = {
  hao: {
    charId: "hao",
    headline: "好 não é desenho: é composição visual",
    coreIdea: "女 + 子 forma 好. A leitura moderna é hǎo, e o sentido principal é bom; bem.",
    caution: "Use como memória visual, não como tradução literal rígida.",
    strokeHint: "Escreva primeiro 女 à esquerda, depois 子 à direita.",
    components: [
      { componentId: "nv", role: "sentido", note: "女 ajuda a formar a cena visual do caractere." },
      { componentId: "zi", role: "sentido", note: "子 completa a imagem tradicional associada a algo bom." },
    ],
    relatedWords: [
      { hanzi: "你好", pinyin: "nǐ hǎo", pt: "olá" },
      { hanzi: "很好", pinyin: "hěn hǎo", pt: "muito bom" },
    ],
    sentence: { hanzi: "你好！", pinyin: "Nǐ hǎo!", pt: "Olá!" },
  },
  ming: {
    charId: "ming",
    headline: "明 junta duas fontes de luz",
    coreIdea: "日 + 月 cria 明: claro, brilhante.",
    caution: "Aqui as peças ajudam bastante no sentido, mas o som míng precisa ser aprendido.",
    strokeHint: "Escreva 日 à esquerda, depois 月 à direita.",
    components: [
      { componentId: "ri", role: "sentido", note: "日 traz a ideia de sol, dia, luz." },
      { componentId: "yue", role: "sentido", note: "月 traz a ideia de lua, outra fonte de luz." },
    ],
    relatedWords: [
      { hanzi: "明天", pinyin: "míngtiān", pt: "amanhã" },
      { hanzi: "明白", pinyin: "míngbai", pt: "entender; claro" },
    ],
    sentence: { hanzi: "明 = 日 + 月。", pinyin: "Míng = rì + yuè.", pt: "明 junta sol e lua." },
  },
  lin: {
    charId: "lin",
    headline: "林 repete árvore para criar bosque",
    coreIdea: "木 + 木 vira 林: bosque, floresta pequena.",
    strokeHint: "Escreva o 木 da esquerda, depois o 木 da direita.",
    components: [
      { componentId: "mu", role: "sentido", note: "木 significa árvore, madeira." },
      { componentId: "mu", role: "sentido", note: "A repetição aumenta a ideia: mais de uma árvore." },
    ],
    relatedWords: [
      { hanzi: "树林", pinyin: "shùlín", pt: "bosque" },
      { hanzi: "森林", pinyin: "sēnlín", pt: "floresta" },
    ],
    sentence: { hanzi: "木 + 木 = 林。", pinyin: "Mù + mù = lín.", pt: "Duas árvores formam um bosque." },
  },
  sen: {
    charId: "sen",
    headline: "森 intensifica a ideia de árvore",
    coreIdea: "木 + 木 + 木 vira 森: floresta densa.",
    strokeHint: "Comece pelo 木 de cima; depois os dois 木 de baixo, da esquerda para a direita.",
    components: [
      { componentId: "mu", role: "sentido", note: "木 aparece três vezes." },
      { componentId: "mu", role: "sentido", note: "A repetição visual cria intensidade." },
      { componentId: "mu", role: "sentido", note: "Não é três palavras; é uma forma compacta." },
    ],
    relatedWords: [
      { hanzi: "森林", pinyin: "sēnlín", pt: "floresta" },
      { hanzi: "森森", pinyin: "sēnsēn", pt: "denso; sombrio" },
    ],
    sentence: { hanzi: "森比林更密。", pinyin: "Sēn bǐ lín gèng mì.", pt: "森 é mais denso que 林." },
  },
  xiu: {
    charId: "xiu",
    headline: "休 conta uma pequena cena",
    coreIdea: "亻 + 木 sugere uma pessoa junto à árvore: descansar.",
    caution: "A cena ajuda a lembrar o sentido; o som xiū vem da leitura do caractere inteiro.",
    strokeHint: "Escreva 亻 à esquerda, depois 木 à direita.",
    components: [
      { componentId: "ren", role: "sentido", note: "亻 é a forma lateral de 人: pessoa." },
      { componentId: "mu", role: "sentido", note: "木 é árvore, o apoio visual da cena." },
    ],
    relatedWords: [
      { hanzi: "休息", pinyin: "xiūxi", pt: "descansar" },
      { hanzi: "休假", pinyin: "xiūjià", pt: "tirar férias/folga" },
    ],
    sentence: { hanzi: "我休息。", pinyin: "Wǒ xiūxi.", pt: "Eu descanso." },
  },
  ma2: {
    charId: "ma2",
    headline: "妈 é fono-semântico: sentido + som",
    coreIdea: "女 dá a pista de sentido; 马 dá a pista sonora ma. Juntos: 妈, mãe.",
    caution: "马 não significa cavalo dentro de 妈. Aqui ele funciona principalmente como pista de som.",
    strokeHint: "Escreva 女 à esquerda, depois 马 à direita.",
    components: [
      { componentId: "nv", role: "sentido", note: "女 indica campo de significado ligado a feminino/família." },
      { componentId: "ma_h", role: "som", note: "马 mǎ aponta para o som ma de 妈 mā." },
    ],
    relatedWords: [
      { hanzi: "妈妈", pinyin: "māma", pt: "mãe; mamãe" },
      { hanzi: "妈", pinyin: "mā", pt: "mãe" },
    ],
    sentence: { hanzi: "这是我妈妈。", pinyin: "Zhè shì wǒ māma.", pt: "Esta é minha mãe." },
  },
};

export function hanziLessonFor(char: Character): HanziLessonModel {
  return HANZI_LESSONS[char.id] ?? {
    charId: char.id,
    headline: `${char.hanzi}: desmontar antes de decorar`,
    coreIdea: char.mnemonicPt ?? "Observe as peças, leia em voz alta e ligue forma, som e sentido.",
    strokeHint: "Regra geral: de cima para baixo, da esquerda para a direita.",
    components: char.components.map((componentId) => ({
      componentId,
      role: char.phonetic === componentId ? "som" : "sentido",
      note: char.phonetic === componentId
        ? "Esta peça funciona como pista sonora."
        : "Esta peça ajuda no campo de sentido ou na forma visual.",
    })),
    relatedWords: char.exampleWords ?? [],
    sentence: char.exampleWords?.[0]
      ? {
          hanzi: char.exampleWords[0].hanzi,
          pinyin: char.exampleWords[0].pinyin,
          pt: char.exampleWords[0].pt,
        }
      : { hanzi: char.hanzi, pinyin: char.pinyin, pt: char.meaningPt },
  };
}
