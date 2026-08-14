/**
 * Pedagogia V3.7 — padrões com slots (LEX-043/044 / COMM-006).
 * Uma estrutura produtiva gera várias frases com vocabulário já aprendido.
 */

export interface SlotPattern {
  id: string;
  pattern: string;
  /** Ex.: "我要" + NOUN */
  glossPt: string;
  slots: Array<{ name: string; kind: "noun" | "verb" | "place" | "person" | "measure" }>;
  exampleFills: string[];
  communicativeFunction: string;
  introduceAt?: string;
  packet?: string;
}

export const SLOT_PATTERNS: SlotPattern[] = [
  {
    id: "woshi_noun",
    pattern: "我是 + NOUN",
    glossPt: "Eu sou + substantivo",
    slots: [{ name: "NOUN", kind: "noun" }],
    exampleFills: ["我是学生", "我是巴西人", "我是老师"],
    communicativeFunction: "identity",
    introduceAt: "l10",
    packet: "introductions",
  },
  {
    id: "wojiao_name",
    pattern: "我叫 + NAME",
    glossPt: "Eu me chamo + nome",
    slots: [{ name: "NAME", kind: "person" }],
    exampleFills: ["我叫王明", "我叫李华"],
    communicativeFunction: "introduce_name",
    introduceAt: "l9",
    packet: "introductions",
  },
  {
    id: "woyou_noun",
    pattern: "我有 + NOUN",
    glossPt: "Eu tenho + coisa",
    slots: [{ name: "NOUN", kind: "noun" }],
    exampleFills: ["我有姐姐", "我有弟弟", "我有一个哥哥", "我有预订"],
    communicativeFunction: "possession",
    introduceAt: "l24",
    packet: "family",
  },
  {
    id: "woyao_noun",
    pattern: "我要 + NOUN",
    glossPt: "Eu quero + coisa",
    slots: [{ name: "NOUN", kind: "noun" }],
    exampleFills: ["我要水", "我要茶", "我要米饭", "我要票", "我要这个", "我要一杯茶"],
    communicativeFunction: "request",
    introduceAt: "l26b",
    packet: "shopping",
  },
  {
    id: "woxiang_verb",
    pattern: "我想 + VERB",
    glossPt: "Eu quero / pretendo + verbo",
    slots: [{ name: "VERB", kind: "verb" }],
    exampleFills: ["我想喝水", "我想喝茶", "我想吃饭", "我想吃米饭"],
    communicativeFunction: "desire",
    introduceAt: "l26b",
    packet: "food_drink",
  },
  {
    id: "woxihuan_noun",
    pattern: "我喜欢 + NOUN/VERB",
    glossPt: "Eu gosto de + coisa/ação",
    slots: [{ name: "NOUN", kind: "noun" }],
    exampleFills: ["我喜欢中文", "我喜欢米饭", "我喜欢茶"],
    communicativeFunction: "preference",
    introduceAt: "l28",
    packet: "preferences",
  },
  {
    id: "wobuxihuan",
    pattern: "我不喜欢 + …",
    glossPt: "Eu não gosto de …",
    slots: [{ name: "NOUN", kind: "noun" }],
    exampleFills: ["我不喜欢辣", "我不喜欢茶"],
    communicativeFunction: "dislike",
    introduceAt: "l28",
    packet: "preferences",
  },
  {
    id: "woqu_place",
    pattern: "我去 + PLACE",
    glossPt: "Eu vou a + lugar",
    slots: [{ name: "PLACE", kind: "place" }],
    exampleFills: ["我去学校", "我去超市", "我去医院", "我去北京"],
    communicativeFunction: "movement",
    introduceAt: "p6-cidade-lugares",
    packet: "city",
  },
  {
    id: "wozai_place",
    pattern: "我在 + PLACE",
    glossPt: "Eu estou em + lugar",
    slots: [{ name: "PLACE", kind: "place" }],
    exampleFills: ["我在北京", "我在南京路", "我在学校"],
    communicativeFunction: "location",
    introduceAt: "p6-china-cidades",
    packet: "city",
  },
  {
    id: "zheshi_noun",
    pattern: "这是 + NOUN",
    glossPt: "Isto / este é + coisa",
    slots: [{ name: "NOUN", kind: "noun" }],
    exampleFills: ["这是水", "这是书", "这是我妈妈", "这是我家", "这是我的护照"],
    communicativeFunction: "identify",
    introduceAt: "l24",
    packet: "family",
  },
  {
    id: "x_zainali",
    pattern: "X 在哪里？",
    glossPt: "Onde fica X?",
    slots: [{ name: "X", kind: "place" }],
    exampleFills: ["车在哪里？", "火车站在哪里？", "酒店在哪里？", "洗手间在哪里？", "地铁站在哪里？"],
    communicativeFunction: "ask_location",
    introduceAt: "p6-cidade-lugares",
    packet: "directions",
  },
  {
    id: "nixihuan_ma",
    pattern: "你喜欢 + X + 吗？",
    glossPt: "Você gosta de X?",
    slots: [{ name: "X", kind: "noun" }],
    exampleFills: ["你喜欢中文吗？", "你喜欢茶吗？"],
    communicativeFunction: "ask_preference",
    introduceAt: "l28",
    packet: "preferences",
  },
  {
    id: "nixiang_ma",
    pattern: "你想 + X + 吗？",
    glossPt: "Você quer X?",
    slots: [{ name: "X", kind: "verb" }],
    exampleFills: ["你想喝茶吗？", "你想吃饭吗？"],
    communicativeFunction: "ask_desire",
    introduceAt: "l26b",
    packet: "restaurant",
  },
  {
    id: "youmeiyou_noun",
    pattern: "有没有 + NOUN",
    glossPt: "Tem / não tem + coisa?",
    slots: [{ name: "NOUN", kind: "noun" }],
    exampleFills: ["有没有米饭？", "有没有水？"],
    communicativeFunction: "ask_availability",
    introduceAt: "l26b",
    packet: "restaurant",
  },
  {
    id: "duoshaoqian",
    pattern: "多少钱？",
    glossPt: "Quanto custa?",
    slots: [],
    exampleFills: ["多少钱？", "这个多少钱？", "票多少钱？"],
    communicativeFunction: "ask_price",
    introduceAt: "l27",
    packet: "shopping",
  },
  {
    id: "jidian",
    pattern: "几点？",
    glossPt: "Que horas?",
    slots: [],
    exampleFills: ["现在几点？", "几点？"],
    communicativeFunction: "ask_time",
    introduceAt: "p6-horarios",
    packet: "time",
  },
  {
    id: "wozuo_vehicle",
    pattern: "我坐 + VEHICLE",
    glossPt: "Eu vou de + veículo",
    slots: [{ name: "VEHICLE", kind: "noun" }],
    exampleFills: ["我坐地铁", "我坐出租车", "我坐飞机", "我坐公交车"],
    communicativeFunction: "transport_mode",
    introduceAt: "p6-cidade-lugares",
    packet: "transport",
  },
];

export const slotPatternById = Object.fromEntries(SLOT_PATTERNS.map((p) => [p.id, p]));
