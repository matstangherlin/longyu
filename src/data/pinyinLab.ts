import type { ItemType } from "./types";

export type PinyinTone = 1 | 2 | 3 | 4 | 5;

export interface PinyinExample {
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  audioText?: string;
}

export interface PinyinInitial {
  id: string;
  label: string;
  approxPt: string;
  example: PinyinExample;
}

export interface PinyinFinal {
  id: string;
  label: string;
  approxPt: string;
  example: PinyinExample;
}

export interface PinyinSyllableCell {
  id: string;
  initial: string;
  final: string;
  pinyin: string;
  audioText: string;
  examples: PinyinExample[];
}

export interface PinyinBuildRound {
  id: string;
  audioText: string;
  hanzi: string;
  pinyin: string;
  initial: string;
  final: string;
  tone: PinyinTone;
  meaningPt: string;
  itemRef: `char:${string}` | `chunk:${string}`;
}

export interface PinyinAccentRound {
  id: string;
  hanzi: string;
  audioText: string;
  answer: string;
  options: string[];
  answerTone: PinyinTone;
  focusSyllable: string;
  meaningPt: string;
  explanation: string;
  itemRef: `char:${string}` | `chunk:${string}`;
}

export const PINYIN_INITIALS: PinyinInitial[] = [
  { id: "b", label: "b", approxPt: "parece p de 'pato', curto e sem sopro forte", example: { hanzi: "爸", pinyin: "bà", meaningPt: "pai" } },
  { id: "p", label: "p", approxPt: "p bem soprado", example: { hanzi: "票", pinyin: "piào", meaningPt: "passagem" } },
  { id: "m", label: "m", approxPt: "m de 'mãe'", example: { hanzi: "妈", pinyin: "mā", meaningPt: "mãe" } },
  { id: "f", label: "f", approxPt: "f de 'faca'", example: { hanzi: "饭", pinyin: "fàn", meaningPt: "comida; refeição" } },
  { id: "d", label: "d", approxPt: "parece t de 'tato', curto e sem sopro forte", example: { hanzi: "大", pinyin: "dà", meaningPt: "grande" } },
  { id: "t", label: "t", approxPt: "t bem soprado", example: { hanzi: "他", pinyin: "tā", meaningPt: "ele" } },
  { id: "n", label: "n", approxPt: "n de 'nada'", example: { hanzi: "你", pinyin: "nǐ", meaningPt: "você" } },
  { id: "l", label: "l", approxPt: "l de 'lado'", example: { hanzi: "来", pinyin: "lái", meaningPt: "vir" } },
  { id: "g", label: "g", approxPt: "g/c duro, curto e sem sopro forte", example: { hanzi: "个", pinyin: "gè", meaningPt: "classificador comum" } },
  { id: "k", label: "k", approxPt: "k ou c de 'casa', com sopro", example: { hanzi: "看", pinyin: "kàn", meaningPt: "ver; olhar" } },
  { id: "h", label: "h", approxPt: "rr suave, vindo mais da garganta", example: { hanzi: "好", pinyin: "hǎo", meaningPt: "bom; bem" } },
  { id: "j", label: "j", approxPt: "entre dj e tch, com a língua alta", example: { hanzi: "家", pinyin: "jiā", meaningPt: "casa; família" } },
  { id: "q", label: "q", approxPt: "tch soprado, com a língua alta", example: { hanzi: "请", pinyin: "qǐng", meaningPt: "por favor" } },
  { id: "x", label: "x", approxPt: "chi suave, com a língua alta", example: { hanzi: "学", pinyin: "xué", meaningPt: "aprender" } },
  { id: "zh", label: "zh", approxPt: "som retroflexo, parecido com dj/tch sem sopro", example: { hanzi: "中", pinyin: "zhōng", meaningPt: "meio; China" } },
  { id: "ch", label: "ch", approxPt: "tch retroflexo, com sopro", example: { hanzi: "吃", pinyin: "chī", meaningPt: "comer" } },
  { id: "sh", label: "sh", approxPt: "sh retroflexo, como x de 'xícara' com a língua enrolada", example: { hanzi: "是", pinyin: "shì", meaningPt: "ser; sim" } },
  { id: "r", label: "r", approxPt: "r chinês retroflexo, entre r suave e j", example: { hanzi: "人", pinyin: "rén", meaningPt: "pessoa" } },
  { id: "z", label: "z", approxPt: "dz curto, sem sopro", example: { hanzi: "在", pinyin: "zài", meaningPt: "estar em" } },
  { id: "c", label: "c", approxPt: "ts bem soprado", example: { hanzi: "菜", pinyin: "cài", meaningPt: "prato; comida" } },
  { id: "s", label: "s", approxPt: "s de 'sapo'", example: { hanzi: "三", pinyin: "sān", meaningPt: "três" } },
];

export const PINYIN_FINALS: PinyinFinal[] = [
  { id: "a", label: "a", approxPt: "a aberto, como em 'casa'", example: { hanzi: "妈", pinyin: "mā", meaningPt: "mãe" } },
  { id: "o", label: "o", approxPt: "o arredondado, curto", example: { hanzi: "我", pinyin: "wǒ", meaningPt: "eu" } },
  { id: "e", label: "e", approxPt: "entre ê e â, mais fechado que em português", example: { hanzi: "的", pinyin: "de", meaningPt: "partícula possessiva" } },
  { id: "i", label: "i", approxPt: "i de 'vida'", example: { hanzi: "你", pinyin: "nǐ", meaningPt: "você" } },
  { id: "u", label: "u", approxPt: "u de 'lua'", example: { hanzi: "不", pinyin: "bù", meaningPt: "não" } },
  { id: "ü", label: "ü", approxPt: "diga i com os lábios arredondados como u", example: { hanzi: "女", pinyin: "nǚ", meaningPt: "mulher" } },
  { id: "ai", label: "ai", approxPt: "ai de 'pai'", example: { hanzi: "来", pinyin: "lái", meaningPt: "vir" } },
  { id: "ei", label: "ei", approxPt: "ei de 'sei'", example: { hanzi: "没", pinyin: "méi", meaningPt: "não ter" } },
  { id: "ao", label: "ao", approxPt: "au, como em 'mau'", example: { hanzi: "好", pinyin: "hǎo", meaningPt: "bom; bem" } },
  { id: "ou", label: "ou", approxPt: "ou de 'sou'", example: { hanzi: "有", pinyin: "yǒu", meaningPt: "ter" } },
  { id: "an", label: "an", approxPt: "an claro, sem nasalizar demais", example: { hanzi: "看", pinyin: "kàn", meaningPt: "ver; olhar" } },
  { id: "en", label: "en", approxPt: "en curto, língua fecha no n", example: { hanzi: "人", pinyin: "rén", meaningPt: "pessoa" } },
  { id: "ang", label: "ang", approxPt: "ang aberto, com final no fundo da boca", example: { hanzi: "忙", pinyin: "máng", meaningPt: "ocupado" } },
  { id: "eng", label: "eng", approxPt: "eng fechado, com final no fundo da boca", example: { hanzi: "冷", pinyin: "lěng", meaningPt: "frio" } },
  { id: "ong", label: "ong", approxPt: "ong arredondado", example: { hanzi: "中", pinyin: "zhōng", meaningPt: "meio; China" } },
  { id: "ia", label: "ia", approxPt: "ia ligado, sem separar as vogais", example: { hanzi: "家", pinyin: "jiā", meaningPt: "casa; família" } },
  { id: "ie", label: "ie", approxPt: "iê curto", example: { hanzi: "谢", pinyin: "xiè", meaningPt: "agradecer" } },
  { id: "iao", label: "iao", approxPt: "iau em uma sílaba só", example: { hanzi: "叫", pinyin: "jiào", meaningPt: "chamar" } },
  { id: "iu", label: "iou/iu", approxPt: "iou reduzido para iu depois de inicial", example: { hanzi: "六", pinyin: "liù", meaningPt: "seis" } },
  { id: "ian", label: "ian", approxPt: "ien, com a vogal mais aberta que em português", example: { hanzi: "天", pinyin: "tiān", meaningPt: "céu; dia" } },
  { id: "in", label: "in", approxPt: "in curto, fechado no n", example: { hanzi: "您", pinyin: "nín", meaningPt: "você, formal" } },
  { id: "iang", label: "iang", approxPt: "iang aberto e nasal no fundo", example: { hanzi: "想", pinyin: "xiǎng", meaningPt: "querer; pensar" } },
  { id: "ing", label: "ing", approxPt: "ing fechado, como em inglês", example: { hanzi: "请", pinyin: "qǐng", meaningPt: "por favor" } },
  { id: "iong", label: "iong", approxPt: "i + ong arredondado", example: { hanzi: "用", pinyin: "yòng", meaningPt: "usar" } },
  { id: "ua", label: "ua", approxPt: "ua ligado", example: { hanzi: "花", pinyin: "huā", meaningPt: "flor" } },
  { id: "uo", label: "uo", approxPt: "uô ligado", example: { hanzi: "我", pinyin: "wǒ", meaningPt: "eu" } },
  { id: "uai", label: "uai", approxPt: "uai como em 'quase'", example: { hanzi: "快", pinyin: "kuài", meaningPt: "rápido" } },
  { id: "ui", label: "ui", approxPt: "uei reduzido para ui depois de inicial", example: { hanzi: "水", pinyin: "shuǐ", meaningPt: "água" } },
  { id: "uan", label: "uan", approxPt: "uan ligado", example: { hanzi: "欢", pinyin: "huān", meaningPt: "alegre" } },
  { id: "un", label: "un", approxPt: "uen reduzido para un depois de inicial", example: { hanzi: "春", pinyin: "chūn", meaningPt: "primavera" } },
  { id: "uang", label: "uang", approxPt: "uang aberto, nasal no fundo", example: { hanzi: "光", pinyin: "guāng", meaningPt: "luz" } },
  { id: "ueng", label: "ueng", approxPt: "ueng arredondado, raro sem inicial", example: { hanzi: "翁", pinyin: "wēng", meaningPt: "senhor idoso" } },
  { id: "üe", label: "üe", approxPt: "ü + ê; depois de j/q/x escreve-se ue", example: { hanzi: "学", pinyin: "xué", meaningPt: "aprender" } },
  { id: "üan", label: "üan", approxPt: "ü + an; depois de j/q/x escreve-se uan", example: { hanzi: "选", pinyin: "xuǎn", meaningPt: "escolher" } },
  { id: "ün", label: "ün", approxPt: "ü + n; depois de j/q/x escreve-se un", example: { hanzi: "群", pinyin: "qún", meaningPt: "grupo" } },
];

export const PINYIN_GRID_INITIALS = PINYIN_INITIALS.map((item) => item.id);
export const PINYIN_GRID_FINALS = [
  "a",
  "i",
  "u",
  "ai",
  "ao",
  "an",
  "ang",
  "en",
  "ong",
  "ia",
  "ie",
  "iao",
  "ian",
  "iang",
  "ing",
  "ua",
  "uo",
  "uai",
  "ui",
  "uan",
  "uang",
  "üe",
  "üan",
  "ün",
];

export const PINYIN_SYLLABLES: PinyinSyllableCell[] = [
  syllable("b", "a", "bà", "爸", "pai"),
  syllable("p", "iao", "piào", "票", "passagem"),
  syllable("m", "a", "mā", "妈", "mãe"),
  syllable("f", "an", "fàn", "饭", "comida; refeição"),
  syllable("d", "a", "dà", "大", "grande"),
  syllable("t", "a", "tā", "他", "ele"),
  syllable("n", "i", "nǐ", "你", "você"),
  syllable("l", "ai", "lái", "来", "vir"),
  syllable("g", "uo", "guó", "国", "país"),
  syllable("k", "an", "kàn", "看", "ver; olhar"),
  syllable("h", "ao", "hǎo", "好", "bom; bem"),
  syllable("j", "ia", "jiā", "家", "casa; família"),
  syllable("q", "ing", "qǐng", "请", "por favor"),
  syllable("x", "üe", "xué", "学", "aprender"),
  syllable("zh", "ong", "zhōng", "中", "meio; China"),
  syllable("ch", "i", "chī", "吃", "comer"),
  syllable("sh", "i", "shì", "是", "ser; sim"),
  syllable("r", "en", "rén", "人", "pessoa"),
  syllable("z", "ai", "zài", "在", "estar em"),
  syllable("c", "ai", "cài", "菜", "prato; comida"),
  syllable("s", "an", "sān", "三", "três"),
  syllable("x", "iang", "xiǎng", "想", "querer; pensar"),
  syllable("g", "uang", "guāng", "光", "luz"),
  syllable("k", "uai", "kuài", "快", "rápido"),
  syllable("sh", "ui", "shuǐ", "水", "água"),
  syllable("h", "uan", "huān", "欢", "alegre"),
  syllable("x", "üan", "xuǎn", "选", "escolher"),
  syllable("q", "ün", "qún", "群", "grupo"),
];

export const PINYIN_BUILD_ROUNDS: PinyinBuildRound[] = [
  buildRound("build-ma", "妈", "mā", "m", "a", 1, "mãe", "char:ma2"),
  buildRound("build-ni", "你", "nǐ", "n", "i", 3, "você", "char:ni"),
  buildRound("build-hao", "好", "hǎo", "h", "ao", 3, "bom; bem", "char:hao"),
  buildRound("build-xie", "谢", "xiè", "x", "ie", 4, "agradecer", "chunk:xiexie"),
  buildRound("build-zhong", "中", "zhōng", "zh", "ong", 1, "meio; China", "char:zhong"),
  buildRound("build-ren", "人", "rén", "r", "en", 2, "pessoa", "char:ren"),
  buildRound("build-shi", "是", "shì", "sh", "i", 4, "ser; sim", "char:shi"),
  buildRound("build-ma-neutral", "吗", "ma", "m", "a", 5, "partícula de pergunta", "char:ma_question"),
];

export const PINYIN_ACCENT_ROUNDS: PinyinAccentRound[] = [
  accentRound(
    "accent-xiexie",
    "谢谢",
    "xièxie",
    ["xièxie", "xièxiè", "xiēxie", "xiěxie"],
    4,
    "xiè",
    "Obrigado(a).",
    "谢 usa 4º tom: xiè. O tom muda o significado e a pronúncia.",
    "chunk:xiexie"
  ),
  accentRound(
    "accent-nihao",
    "你好",
    "nǐ hǎo",
    ["nǐ hǎo", "nī hāo", "ní háo", "nì hào"],
    3,
    "hǎo",
    "Olá.",
    "好 usa 3º tom: hǎo. Em 你好, o pinyin mostra o som que o hànzì não mostra sozinho.",
    "chunk:nihao"
  ),
  accentRound(
    "accent-ma1",
    "妈",
    "mā",
    ["mā", "má", "mǎ", "mà"],
    1,
    "mā",
    "mãe",
    "妈 usa 1º tom: alto e plano. Trocar o acento muda a palavra.",
    "char:ma2"
  ),
  accentRound(
    "accent-ma3",
    "马",
    "mǎ",
    ["mā", "má", "mǎ", "mà"],
    3,
    "mǎ",
    "cavalo",
    "马 usa 3º tom: desce e sobe. É outro som e outro significado.",
    "char:ma_horse"
  ),
  accentRound(
    "accent-shi4",
    "是",
    "shì",
    ["shī", "shí", "shǐ", "shì"],
    4,
    "shì",
    "ser; sim",
    "是 usa 4º tom: cai rápido e firme.",
    "char:shi"
  ),
  accentRound(
    "accent-shi2",
    "十",
    "shí",
    ["shī", "shí", "shǐ", "shì"],
    2,
    "shí",
    "dez",
    "十 usa 2º tom: sobe. A mesma sílaba com outro tom vira outra palavra.",
    "char:shi10"
  ),
  accentRound(
    "accent-zaijian",
    "再见",
    "zàijiàn",
    ["zàijiàn", "zaijian", "zǎijiàn", "záijián"],
    4,
    "zài",
    "Até logo.",
    "再 e 见 usam 4º tom em zàijiàn: a voz cai nas duas sílabas principais.",
    "chunk:zaijian"
  ),
  accentRound(
    "accent-bukeqi",
    "不客气",
    "bú kèqi",
    ["bú kèqi", "bù kèqi", "bū kēqī", "bǔ kēqí"],
    2,
    "bú",
    "De nada.",
    "Antes de 4º tom, 不 costuma soar bú. O acento mostra a fala real.",
    "chunk:bukeqi"
  ),
];

export const PINYIN_TONE_GUIDE: Array<{ tone: PinyinTone; name: string; symbol: string; desc: string; example: PinyinExample }> = [
  { tone: 1, name: "Tom 1", symbol: "ˉ", desc: "alto e plano.", example: { hanzi: "妈", pinyin: "mā", meaningPt: "mãe" } },
  { tone: 2, name: "Tom 2", symbol: "ˊ", desc: "sobe.", example: { hanzi: "麻", pinyin: "má", meaningPt: "cânhamo; dormente" } },
  { tone: 3, name: "Tom 3", symbol: "ˇ", desc: "desce e sobe.", example: { hanzi: "马", pinyin: "mǎ", meaningPt: "cavalo" } },
  { tone: 4, name: "Tom 4", symbol: "ˋ", desc: "cai forte.", example: { hanzi: "骂", pinyin: "mà", meaningPt: "xingar" } },
  { tone: 5, name: "Tom neutro", symbol: "sem marca", desc: "curto e leve.", example: { hanzi: "吗", pinyin: "ma", meaningPt: "partícula de pergunta" } },
];

export const PINYIN_TONE_OPTIONS: PinyinTone[] = [1, 2, 3, 4, 5];

export function parseItemRef(ref: PinyinBuildRound["itemRef"]): { type: ItemType; itemId: string } {
  const [type, itemId] = ref.split(":");
  return { type: type as ItemType, itemId };
}

function syllable(initial: string, final: string, pinyin: string, hanzi: string, meaningPt: string): PinyinSyllableCell {
  return {
    id: `${initial}-${final}`,
    initial,
    final,
    pinyin,
    audioText: hanzi,
    examples: [{ hanzi, pinyin, meaningPt }],
  };
}

function buildRound(
  id: string,
  hanzi: string,
  pinyin: string,
  initial: string,
  final: string,
  tone: PinyinTone,
  meaningPt: string,
  itemRef: PinyinBuildRound["itemRef"]
): PinyinBuildRound {
  return {
    id,
    audioText: hanzi,
    hanzi,
    pinyin,
    initial,
    final,
    tone,
    meaningPt,
    itemRef,
  };
}

function accentRound(
  id: string,
  hanzi: string,
  answer: string,
  options: string[],
  answerTone: PinyinTone,
  focusSyllable: string,
  meaningPt: string,
  explanation: string,
  itemRef: PinyinAccentRound["itemRef"]
): PinyinAccentRound {
  return {
    id,
    hanzi,
    audioText: hanzi,
    answer,
    options,
    answerTone,
    focusSyllable,
    meaningPt,
    explanation,
    itemRef,
  };
}
