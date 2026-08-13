import { CHARACTERS } from "./characters";

/** IDs internos — nunca URLs externas. */
export const VISUAL_CONCEPT_IDS = [
  // Núcleo original (fase 1 e hànzì lógico)
  "person",
  "tree",
  "mouth",
  "sun",
  "moon",
  "mountain",
  "water",
  "fire",
  "big",
  "small",
  // Pessoas e família
  "woman",
  "child",
  "mother",
  "father",
  "friend",
  "son",
  "daughter",
  "older_brother",
  "older_sister",
  "female_friend",
  "girlfriend",
  "boyfriend",
  "crowd",
  // Natureza
  "sky",
  "woods",
  "forest",
  // Animais
  "horse",
  "fish",
  "cat",
  "dog",
  // Comida e bebida
  "rice",
  "tea",
  "coffee",
  "milk",
  "apple",
  "meat",
  "vegetables",
  "eat",
  "drink",
  // Objetos e lugares
  "book",
  "car",
  "home",
  "money",
  "ticket",
  "phone",
  "keys",
  "cup",
  "table",
  "chair",
  "door",
  "window",
  "backpack",
  // Ambientes e cotidiano
  "bathroom",
  "bedroom",
  "kitchen",
  "travel",
  // Quantidade
  "one",
  "two",
  "three",
  "four",
  "five",
] as const;

export type VisualConceptId = (typeof VISUAL_CONCEPT_IDS)[number];

export type VisualCategory =
  | "people"
  | "nature"
  | "animals"
  | "food"
  | "actions"
  | "objects"
  | "places"
  | "quantity";

export type ImageChoiceMode =
  | "choose_hanzi"
  | "choose_pinyin"
  | "choose_meaning"
  | "listen_and_choose_image"
  | "choose_image";

/**
 * Estilo de renderização declarado do asset (ver docs/VISUAL_ASSET_GUIDE.md).
 * A consistência é garantida por FAMÍLIA de estilo (visualStyleFamily): uma
 * pergunta nunca mistura a família "realistic" (photo/realistic_illustration)
 * com a "flat" (flat_illustration).
 */
export type VisualStyle = "photo" | "realistic_illustration" | "flat_illustration";

/** Estilo de fundo — controla o object-fit no renderer (contain vs cover). */
export type VisualBackground = "neutral" | "contextual" | "transparent";

export type VisualStyleFamily = "realistic" | "flat";

export function visualStyleFamily(style: VisualStyle): VisualStyleFamily {
  return style === "flat_illustration" ? "flat" : "realistic";
}

export interface VisualConcept {
  id: VisualConceptId;
  charId: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  /** Agrupamento semântico usado para escolher distractores plausíveis. */
  category: VisualCategory;
  /** Caminho local relativo a src/assets/visuals; o mapa do Vite resolve o import final. */
  imageSrc?: string;
  imageAltPt: string;
  imageKind: "photo" | "illustration" | "svg_fallback";
  /** Estilo de renderização — não misturar famílias dentro das opções de uma pergunta. */
  visualStyle: VisualStyle;
  /** Fundo do asset — neutro/transparente usa object-contain; contextual usa object-cover. */
  backgroundStyle: VisualBackground;
  /** Número de sujeitos/personagens no asset (cena contextual: no máximo 3). */
  subjectCount: number;
  sceneTags?: string[];
  /**
   * `false` impede áudio/hànzì → grade só de imagens. Relações como namorado,
   * amiga e irmã precisam de apoio linguístico/contextual para não prometer
   * uma distinção que a aparência, sozinha, não consegue garantir.
   */
  imageOnlySafe?: boolean;
  /** Pares que nunca devem aparecer como distractores diretos entre si. */
  ambiguousWith?: VisualConceptId[];
  /** Fallback terciário, depois da imagem local e do SVG. */
  emoji: string;
  /** Índice da unidade na jornada após a qual o conceito pode aparecer em exercícios avançados. */
  afterUnitIndex: number;
}

/**
 * Cena contextual (Estilo B do guia): uma ação clara com no máximo três
 * personagens e fundo simples. Ainda sem assets dedicados — as intenções
 * comunicativas (cumprimentar, beber, agradecer, comprar, estudar, conversar)
 * são atendidas hoje pelo sistema de conversation_scene. O modelo fica pronto
 * para quando houver imagens de cena.
 */
export interface VisualScene {
  id: string;
  /** Intenção/ação retratada: greet, drink, thank, buy, study, converse… */
  intent: string;
  imageSrc?: string;
  imageAltPt: string;
  visualStyle: VisualStyle;
  backgroundStyle: VisualBackground;
  /** No máximo três personagens numa cena. */
  subjectCount: number;
  emoji: string;
}

export const VISUAL_SCENES: VisualScene[] = [];

// visualStyle/backgroundStyle/subjectCount refletem a auditoria real dos assets
// (ver docs/VISUAL_ASSET_GUIDE.md e reports/visual-consistency-report.md).
export const VISUAL_CONCEPTS: VisualConcept[] = [
  // ————— Núcleo original —————
  { id: "person", charId: "ren", hanzi: "人", pinyin: "rén", meaningPt: "pessoa", category: "people", imageSrc: "people/person.svg", imageAltPt: "Ilustração de uma pessoa em fundo neutro", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["people", "person"], emoji: "🧑", afterUnitIndex: 0 },
  { id: "tree", charId: "mu", hanzi: "木", pinyin: "mù", meaningPt: "árvore", category: "nature", imageSrc: "nature/tree.svg", imageAltPt: "Ilustração de uma árvore isolada em um campo", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["nature", "object"], emoji: "🌳", afterUnitIndex: 0 },
  { id: "mouth", charId: "kou", hanzi: "口", pinyin: "kǒu", meaningPt: "boca", category: "people", imageSrc: "people/mouth.svg", imageAltPt: "Ilustração de uma boca humana", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["people", "body"], emoji: "👄", afterUnitIndex: 6 },
  { id: "sun", charId: "ri", hanzi: "日", pinyin: "rì", meaningPt: "sol", category: "nature", imageSrc: "nature/sun.svg", imageAltPt: "Ilustração do sol com raios em fundo claro", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["nature", "sky"], emoji: "☀️", afterUnitIndex: 6 },
  { id: "moon", charId: "yue", hanzi: "月", pinyin: "yuè", meaningPt: "lua", category: "nature", imageSrc: "nature/moon.svg", imageAltPt: "Ilustração da lua crescente no céu noturno", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["nature", "sky"], emoji: "🌙", afterUnitIndex: 6 },
  // 山 é apresentado visualmente já em p1-primeiros-hanzi (unidade 0), junto com 木 e 人.
  { id: "mountain", charId: "shan", hanzi: "山", pinyin: "shān", meaningPt: "montanha", category: "nature", imageSrc: "nature/mountain.svg", imageAltPt: "Ilustração de um pico de montanha com neve", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["nature", "landscape"], emoji: "⛰️", afterUnitIndex: 0 },
  { id: "water", charId: "shui", hanzi: "水", pinyin: "shuǐ", meaningPt: "água", category: "nature", imageSrc: "nature/water.svg", imageAltPt: "Ilustração de uma gota de água azul", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["nature", "liquid"], emoji: "💧", afterUnitIndex: 6 },
  { id: "fire", charId: "huo", hanzi: "火", pinyin: "huǒ", meaningPt: "fogo", category: "nature", imageSrc: "nature/fire.svg", imageAltPt: "Ilustração de uma fogueira com chamas", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["nature", "element"], emoji: "🔥", afterUnitIndex: 6 },
  { id: "big", charId: "da", hanzi: "大", pinyin: "dà", meaningPt: "grande", category: "quantity", imageSrc: "daily-life/big.svg", imageAltPt: "Bola vermelha muito grande ao lado de um cubo pequeno", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["daily-life", "size"], emoji: "⬛", afterUnitIndex: 6 },
  { id: "small", charId: "xiao", hanzi: "小", pinyin: "xiǎo", meaningPt: "pequeno", category: "quantity", imageSrc: "daily-life/small.svg", imageAltPt: "Bola vermelha pequena ao lado de um cubo grande", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["daily-life", "size"], emoji: "▫️", afterUnitIndex: 6 },
  // ————— Pessoas e família —————
  { id: "woman", charId: "nv", hanzi: "女", pinyin: "nǚ", meaningPt: "mulher", category: "people", imageSrc: "people/woman.svg", imageAltPt: "Ilustração de uma mulher de cabelo comprido", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["people", "person"], emoji: "👩", afterUnitIndex: 8 },
  { id: "child", charId: "zi", hanzi: "子", pinyin: "zǐ", meaningPt: "criança", category: "people", imageSrc: "people/child.svg", imageAltPt: "Ilustração de uma criança pequena brincando com uma bola", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["people", "family"], emoji: "🧒", afterUnitIndex: 8 },
  { id: "mother", charId: "ma2", hanzi: "妈", pinyin: "mā", meaningPt: "mãe", category: "people", imageSrc: "people/mother.svg", imageAltPt: "Ilustração de uma mãe adulta segurando um bebê no colo", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["people", "family", "adult-with-baby"], imageOnlySafe: false, ambiguousWith: ["father", "son", "daughter"], emoji: "👩‍🍼", afterUnitIndex: 8 },
  { id: "father", charId: "ba_dad", hanzi: "爸", pinyin: "bà", meaningPt: "pai", category: "people", imageSrc: "people/father.svg", imageAltPt: "Ilustração de um pai adulto de mãos dadas com uma criança pequena", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["people", "family", "adult-with-child"], imageOnlySafe: false, ambiguousWith: ["mother", "son", "daughter"], emoji: "👨", afterUnitIndex: 11 },
  { id: "friend", charId: "peng", hanzi: "朋", pinyin: "péng", meaningPt: "amigo", category: "people", imageSrc: "people/friend.svg", imageAltPt: "Ilustração de dois amigos adultos da mesma idade lado a lado", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["people", "friendship", "same-age"], imageOnlySafe: false, ambiguousWith: ["female_friend", "older_brother", "older_sister", "girlfriend", "boyfriend"], emoji: "🧑‍🤝‍🧑", afterUnitIndex: 7 },
  { id: "son", charId: "v_erzi", hanzi: "儿子", pinyin: "érzi", meaningPt: "filho", category: "people", imageSrc: "people/son.webp", imageAltPt: "Ilustração de um menino em idade escolar sozinho, sem adultos", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["people", "family", "child-alone"], imageOnlySafe: false, ambiguousWith: ["daughter", "child", "older_brother", "mother", "father"], emoji: "👦", afterUnitIndex: 11 },
  { id: "daughter", charId: "v_nuer", hanzi: "女儿", pinyin: "nǚ'ér", meaningPt: "filha", category: "people", imageSrc: "people/daughter.webp", imageAltPt: "Ilustração de uma menina em idade escolar sozinha, sem adultos", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["people", "family", "child-alone"], imageOnlySafe: false, ambiguousWith: ["son", "child", "older_sister", "mother", "father"], emoji: "👧", afterUnitIndex: 11 },
  { id: "older_brother", charId: "v_gege", hanzi: "哥哥", pinyin: "gēge", meaningPt: "irmão mais velho", category: "people", imageSrc: "people/older-brother.webp", imageAltPt: "Ilustração de um irmão adolescente carregando o irmão mais novo nas costas", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["people", "family", "different-ages", "piggyback"], imageOnlySafe: false, ambiguousWith: ["friend", "boyfriend", "son"], emoji: "👦", afterUnitIndex: 11 },
  { id: "older_sister", charId: "v_jiejie", hanzi: "姐姐", pinyin: "jiějie", meaningPt: "irmã mais velha", category: "people", imageSrc: "people/older-sister.webp", imageAltPt: "Ilustração de uma irmã adolescente ajudando a irmã mais nova com a mochila", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["people", "family", "different-ages", "school"], imageOnlySafe: false, ambiguousWith: ["female_friend", "girlfriend", "daughter"], emoji: "👧", afterUnitIndex: 11 },
  { id: "female_friend", charId: "visual_female_friend", hanzi: "女性朋友", pinyin: "nǚxìng péngyou", meaningPt: "amiga", category: "people", imageSrc: "people/female-friend.webp", imageAltPt: "Ilustração de duas amigas adultas da mesma idade com os braços nos ombros", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["people", "friendship", "same-age"], imageOnlySafe: false, ambiguousWith: ["friend", "older_sister", "girlfriend"], emoji: "👭", afterUnitIndex: 11 },
  { id: "girlfriend", charId: "visual_girlfriend", hanzi: "女朋友", pinyin: "nǚpéngyou", meaningPt: "namorada", category: "people", imageSrc: "people/girlfriend.webp", imageAltPt: "Ilustração de um casal com a namorada em primeiro plano e o parceiro ao fundo", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["people", "relationship", "female-focus"], imageOnlySafe: false, ambiguousWith: ["boyfriend", "female_friend", "older_sister", "friend"], emoji: "👩‍❤️‍👨", afterUnitIndex: 13 },
  { id: "boyfriend", charId: "visual_boyfriend", hanzi: "男朋友", pinyin: "nánpéngyou", meaningPt: "namorado", category: "people", imageSrc: "people/boyfriend.webp", imageAltPt: "Ilustração de um casal com o namorado em primeiro plano e a parceira ao fundo", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["people", "relationship", "male-focus"], imageOnlySafe: false, ambiguousWith: ["girlfriend", "friend", "older_brother", "female_friend"], emoji: "👩‍❤️‍👨", afterUnitIndex: 13 },
  { id: "crowd", charId: "zhong3", hanzi: "众", pinyin: "zhòng", meaningPt: "multidão", category: "people", imageSrc: "people/crowd.svg", imageAltPt: "Ilustração de muitas pessoas reunidas", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 7, sceneTags: ["people", "quantity"], emoji: "👥", afterUnitIndex: 8 },
  // ————— Natureza —————
  { id: "sky", charId: "tian_sky", hanzi: "天", pinyin: "tiān", meaningPt: "céu", category: "nature", imageSrc: "nature/sky.svg", imageAltPt: "Ilustração de céu azul com nuvens brancas e pássaros", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["nature", "sky"], emoji: "☁️", afterUnitIndex: 6 },
  { id: "woods", charId: "lin", hanzi: "林", pinyin: "lín", meaningPt: "bosque", category: "nature", imageSrc: "nature/woods.svg", imageAltPt: "Ilustração de um bosque com poucas árvores", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["nature", "landscape"], emoji: "🌲", afterUnitIndex: 6 },
  { id: "forest", charId: "sen", hanzi: "森", pinyin: "sēn", meaningPt: "floresta", category: "nature", imageSrc: "nature/forest.svg", imageAltPt: "Ilustração de uma floresta densa com muitas árvores", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["nature", "landscape"], emoji: "🌲", afterUnitIndex: 6 },
  // ————— Animais —————
  { id: "horse", charId: "ma_horse", hanzi: "马", pinyin: "mǎ", meaningPt: "cavalo", category: "animals", imageSrc: "nature/horse.svg", imageAltPt: "Ilustração de um cavalo marrom de perfil em um campo", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["nature", "animal"], emoji: "🐴", afterUnitIndex: 2 },
  { id: "fish", charId: "yu_fish", hanzi: "鱼", pinyin: "yú", meaningPt: "peixe", category: "animals", imageSrc: "daily-life/fish.svg", imageAltPt: "Ilustração de um peixe azul com bolhas de água", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["food", "animal"], emoji: "🐟", afterUnitIndex: 12 },
  { id: "cat", charId: "visual_cat", hanzi: "猫", pinyin: "māo", meaningPt: "gato", category: "animals", imageSrc: "animals/cat.webp", imageAltPt: "Ilustração de um gato adulto alaranjado sentado", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["animals", "pet"], emoji: "🐈", afterUnitIndex: 13 },
  { id: "dog", charId: "visual_dog", hanzi: "狗", pinyin: "gǒu", meaningPt: "cachorro", category: "animals", imageSrc: "animals/dog.webp", imageAltPt: "Ilustração de um cachorro adulto caramelo em pé", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["animals", "pet"], emoji: "🐕", afterUnitIndex: 13 },
  // ————— Comida e bebida —————
  { id: "rice", charId: "fan_rice", hanzi: "饭", pinyin: "fàn", meaningPt: "arroz", category: "food", imageSrc: "daily-life/rice.svg", imageAltPt: "Ilustração de uma tigela de arroz com hashi", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["food", "meal"], emoji: "🍚", afterUnitIndex: 12 },
  { id: "tea", charId: "cha_tea", hanzi: "茶", pinyin: "chá", meaningPt: "chá", category: "food", imageSrc: "daily-life/tea.svg", imageAltPt: "Ilustração de uma xícara de chá verde soltando vapor", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["food", "drink"], emoji: "🍵", afterUnitIndex: 12 },
  { id: "coffee", charId: "v_kafei", hanzi: "咖啡", pinyin: "kāfēi", meaningPt: "café", category: "food", imageSrc: "daily-life/coffee.webp", imageAltPt: "Ilustração de uma xícara de café escuro com grãos ao lado", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["food", "drink"], emoji: "☕", afterUnitIndex: 12 },
  { id: "milk", charId: "v_niunai", hanzi: "牛奶", pinyin: "niúnǎi", meaningPt: "leite", category: "food", imageSrc: "daily-life/milk.webp", imageAltPt: "Ilustração de um copo cheio de leite com uma pequena embalagem ao lado", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["food", "drink"], emoji: "🥛", afterUnitIndex: 12 },
  { id: "apple", charId: "v_pingguo", hanzi: "苹果", pinyin: "píngguǒ", meaningPt: "maçã", category: "food", imageSrc: "daily-life/apple.webp", imageAltPt: "Ilustração de uma maçã vermelha com uma folha verde", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["food", "fruit"], emoji: "🍎", afterUnitIndex: 12 },
  { id: "meat", charId: "rou_meat", hanzi: "肉", pinyin: "ròu", meaningPt: "carne", category: "food", imageSrc: "daily-life/meat.svg", imageAltPt: "Ilustração de um corte de carne em um prato", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["food", "meal"], emoji: "🥩", afterUnitIndex: 12 },
  { id: "vegetables", charId: "cai_dish", hanzi: "菜", pinyin: "cài", meaningPt: "verdura", category: "food", imageSrc: "daily-life/vegetables.svg", imageAltPt: "Ilustração de verduras frescas com acelga e cenoura", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["food", "meal"], emoji: "🥬", afterUnitIndex: 12 },
  { id: "eat", charId: "chi_eat", hanzi: "吃", pinyin: "chī", meaningPt: "comer", category: "actions", imageSrc: "actions/eat.svg", imageAltPt: "Ilustração de uma pessoa comendo macarrão com hashi", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["actions", "meal"], emoji: "🍽️", afterUnitIndex: 12 },
  { id: "drink", charId: "he_drink", hanzi: "喝", pinyin: "hē", meaningPt: "beber", category: "actions", imageSrc: "actions/drink.svg", imageAltPt: "Ilustração de uma pessoa bebendo de um copo azul", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["actions", "drink"], emoji: "🥤", afterUnitIndex: 12 },
  // ————— Objetos e lugares —————
  { id: "book", charId: "shu_book", hanzi: "书", pinyin: "shū", meaningPt: "livro", category: "objects", imageSrc: "objects/book.svg", imageAltPt: "Ilustração de um livro aberto", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "study"], emoji: "📖", afterUnitIndex: 12 },
  { id: "car", charId: "che", hanzi: "车", pinyin: "chē", meaningPt: "carro", category: "objects", imageSrc: "objects/car.svg", imageAltPt: "Ilustração de um carro vermelho visto de lado", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "transport"], emoji: "🚗", afterUnitIndex: 12 },
  { id: "home", charId: "jia", hanzi: "家", pinyin: "jiā", meaningPt: "casa", category: "objects", imageSrc: "objects/home.svg", imageAltPt: "Ilustração de uma casa com telhado vermelho e chaminé", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "place"], emoji: "🏠", afterUnitIndex: 11 },
  { id: "money", charId: "qian_money", hanzi: "钱", pinyin: "qián", meaningPt: "dinheiro", category: "objects", imageSrc: "objects/money.svg", imageAltPt: "Ilustração de uma nota de dinheiro com moedas douradas", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "shopping"], emoji: "💰", afterUnitIndex: 12 },
  { id: "ticket", charId: "piao_ticket", hanzi: "票", pinyin: "piào", meaningPt: "bilhete", category: "objects", imageSrc: "objects/ticket.svg", imageAltPt: "Ilustração de um bilhete laranja com picote e estrela", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "transport"], emoji: "🎫", afterUnitIndex: 12 },
  { id: "phone", charId: "v_shouji", hanzi: "手机", pinyin: "shǒujī", meaningPt: "celular", category: "objects", imageSrc: "objects/phone.webp", imageAltPt: "Ilustração de um celular moderno com capa vermelha e tela verde-azulada", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "technology"], emoji: "📱", afterUnitIndex: 12 },
  { id: "keys", charId: "visual_keys", hanzi: "钥匙", pinyin: "yàoshi", meaningPt: "chaves", category: "objects", imageSrc: "objects/keys.webp", imageAltPt: "Ilustração de duas chaves em um chaveiro vermelho", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["objects", "home"], emoji: "🔑", afterUnitIndex: 13 },
  { id: "cup", charId: "v_beizi", hanzi: "杯子", pinyin: "bēizi", meaningPt: "copo", category: "objects", imageSrc: "objects/cup.webp", imageAltPt: "Ilustração de um copo transparente com água", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "drink"], emoji: "🥛", afterUnitIndex: 12 },
  { id: "table", charId: "visual_table", hanzi: "桌子", pinyin: "zhuōzi", meaningPt: "mesa", category: "objects", imageSrc: "objects/table.webp", imageAltPt: "Ilustração de uma mesa retangular de madeira com quatro pernas", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "furniture"], emoji: "🪑", afterUnitIndex: 13 },
  { id: "chair", charId: "visual_chair", hanzi: "椅子", pinyin: "yǐzi", meaningPt: "cadeira", category: "objects", imageSrc: "objects/chair.webp", imageAltPt: "Ilustração de uma cadeira de madeira vista em três quartos", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "furniture"], emoji: "🪑", afterUnitIndex: 13 },
  { id: "door", charId: "men_door", hanzi: "门", pinyin: "mén", meaningPt: "porta", category: "objects", imageSrc: "objects/door.webp", imageAltPt: "Ilustração de uma porta vermelha fechada em moldura clara", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "home"], emoji: "🚪", afterUnitIndex: 13 },
  { id: "window", charId: "visual_window", hanzi: "窗户", pinyin: "chuānghu", meaningPt: "janela", category: "objects", imageSrc: "objects/window.webp", imageAltPt: "Ilustração de uma janela de quatro vidros com moldura verde", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "home"], emoji: "🪟", afterUnitIndex: 13 },
  { id: "backpack", charId: "visual_backpack", hanzi: "背包", pinyin: "bēibāo", meaningPt: "mochila", category: "objects", imageSrc: "objects/backpack.webp", imageAltPt: "Ilustração de uma mochila verde-azulada com bolso claro", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["objects", "school", "travel"], emoji: "🎒", afterUnitIndex: 13 },
  // ————— Ambientes e cotidiano —————
  { id: "bathroom", charId: "v_xishoujian", hanzi: "洗手间", pinyin: "xǐshǒujiān", meaningPt: "banheiro", category: "places", imageSrc: "places/bathroom.webp", imageAltPt: "Ilustração em corte de um banheiro com vaso sanitário e pia", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["places", "home", "room"], emoji: "🚻", afterUnitIndex: 13 },
  { id: "bedroom", charId: "visual_bedroom", hanzi: "卧室", pinyin: "wòshì", meaningPt: "quarto", category: "places", imageSrc: "places/bedroom.webp", imageAltPt: "Ilustração em corte de um quarto com cama e mesa de cabeceira", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["places", "home", "room"], emoji: "🛏️", afterUnitIndex: 13 },
  { id: "kitchen", charId: "visual_kitchen", hanzi: "厨房", pinyin: "chúfáng", meaningPt: "cozinha", category: "places", imageSrc: "places/kitchen.webp", imageAltPt: "Ilustração em corte de uma cozinha com pia, fogão e armários", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["places", "home", "room"], emoji: "🍳", afterUnitIndex: 13 },
  { id: "travel", charId: "visual_travel", hanzi: "旅行", pinyin: "lǚxíng", meaningPt: "viagem", category: "places", imageSrc: "daily-life/travel.webp", imageAltPt: "Ilustração de um viajante caminhando com mala, mochila e avião ao fundo", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["places", "travel", "action"], emoji: "🧳", afterUnitIndex: 13 },
  // ————— Quantidade —————
  { id: "one", charId: "yi", hanzi: "一", pinyin: "yī", meaningPt: "um", category: "quantity", imageSrc: "daily-life/one.svg", imageAltPt: "Ilustração de uma maçã vermelha", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 1, sceneTags: ["quantity", "number"], emoji: "1️⃣", afterUnitIndex: 6 },
  { id: "two", charId: "er", hanzi: "二", pinyin: "èr", meaningPt: "dois", category: "quantity", imageSrc: "daily-life/two.svg", imageAltPt: "Ilustração de duas maçãs vermelhas", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 2, sceneTags: ["quantity", "number"], emoji: "2️⃣", afterUnitIndex: 6 },
  { id: "three", charId: "san", hanzi: "三", pinyin: "sān", meaningPt: "três", category: "quantity", imageSrc: "daily-life/three.svg", imageAltPt: "Ilustração de três maçãs vermelhas", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 3, sceneTags: ["quantity", "number"], emoji: "3️⃣", afterUnitIndex: 6 },
  { id: "four", charId: "si", hanzi: "四", pinyin: "sì", meaningPt: "quatro", category: "quantity", imageSrc: "daily-life/four.svg", imageAltPt: "Ilustração de quatro maçãs vermelhas", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 4, sceneTags: ["quantity", "number"], emoji: "4️⃣", afterUnitIndex: 6 },
  { id: "five", charId: "wu", hanzi: "五", pinyin: "wǔ", meaningPt: "cinco", category: "quantity", imageSrc: "daily-life/five.svg", imageAltPt: "Ilustração de cinco maçãs vermelhas", imageKind: "illustration", visualStyle: "flat_illustration", backgroundStyle: "transparent", subjectCount: 5, sceneTags: ["quantity", "number"], emoji: "5️⃣", afterUnitIndex: 6 },
];

export const visualById = Object.fromEntries(VISUAL_CONCEPTS.map((concept) => [concept.id, concept])) as Record<
  VisualConceptId,
  VisualConcept
>;

export const visualByCharId = Object.fromEntries(VISUAL_CONCEPTS.map((concept) => [concept.charId, concept])) as Partial<
  Record<string, VisualConcept>
>;

/** Glifo → conceito: usado para achar o conceito concreto dentro de um chunk. */
export const visualByHanzi = Object.fromEntries(VISUAL_CONCEPTS.map((concept) => [concept.hanzi, concept])) as Partial<
  Record<string, VisualConcept>
>;

/**
 * Resolve palavras inteiras antes de glifos isolados. Ex.: em 我要手机, 手机
 * vence 机; em 我有姐姐, 姐姐 vence 姐. Isso permite ampliar o catálogo para
 * vocabulário cotidiano sem regredir os hànzì unitários já existentes.
 */
export function visualConceptsInHanziText(text: string): VisualConcept[] {
  const normalized = String(text ?? "").replace(/[\s\p{P}\p{S}]/gu, "");
  return VISUAL_CONCEPTS.filter((concept) => normalized.includes(concept.hanzi)).sort(
    (a, b) => b.hanzi.length - a.hanzi.length || a.afterUnitIndex - b.afterUnitIndex
  );
}

const charById = new Map(CHARACTERS.map((char) => [char.id, char]));

export function resolveVisualConcept(id: string | undefined): VisualConcept | undefined {
  if (!id) return undefined;
  if (id in visualById) return visualById[id as VisualConceptId];
  if (id in visualByHanzi) return visualByHanzi[id];
  const byChar = CHARACTERS.find((char) => char.id === id || char.hanzi === id);
  if (byChar) return visualByCharId[byChar.id];
  return undefined;
}

export function isVisualConceptAllowed(conceptId: string, unitIndex: number): boolean {
  const concept = resolveVisualConcept(conceptId);
  if (!concept) return false;
  return unitIndex >= concept.afterUnitIndex;
}

export function visualConceptForChar(charId: string): VisualConcept | undefined {
  return visualByCharId[charId];
}

export function enrichVisualFromChar(concept: VisualConcept): VisualConcept {
  const char = charById.get(concept.charId);
  if (!char) return concept;
  return {
    ...concept,
    hanzi: char.hanzi,
    pinyin: char.pinyin,
    meaningPt: char.meaningPt.replace(/\.$/, ""),
  };
}

// Distractores curados para conjuntos confundíveis de propósito (木/林/森,
// contagens vizinhas, família). Os demais caem na regra genérica por categoria.
const CURATED_DISTRACTORS: Partial<Record<VisualConceptId, VisualConceptId[]>> = {
  person: ["mouth", "big", "small"],
  tree: ["mountain", "fire", "mouth"],
  mouth: ["person", "sun", "moon"],
  sun: ["moon", "fire", "big"],
  moon: ["sun", "water", "small"],
  mountain: ["tree", "fire", "big"],
  water: ["fire", "moon", "mouth"],
  fire: ["sun", "water", "tree"],
  big: ["small", "person", "mountain"],
  small: ["big", "mouth", "moon"],
  woman: ["mother", "child", "person"],
  child: ["woman", "person", "friend"],
  mother: ["woman", "father", "child"],
  father: ["mother", "child", "person"],
  friend: ["person", "child", "crowd"],
  son: ["person", "woman", "child"],
  daughter: ["woman", "person", "child"],
  older_brother: ["father", "person", "crowd"],
  older_sister: ["mother", "woman", "crowd"],
  female_friend: ["woman", "crowd", "person"],
  girlfriend: ["woman", "mother", "crowd"],
  boyfriend: ["person", "father", "crowd"],
  crowd: ["friend", "person", "woman"],
  woods: ["tree", "forest", "mountain"],
  forest: ["woods", "tree", "mountain"],
  horse: ["fish", "person", "tree"],
  fish: ["meat", "rice", "vegetables"],
  cat: ["dog", "horse", "fish"],
  dog: ["cat", "horse", "fish"],
  tea: ["rice", "water", "meat"],
  coffee: ["tea", "milk", "cup"],
  milk: ["tea", "coffee", "water"],
  apple: ["vegetables", "rice", "tea"],
  rice: ["vegetables", "meat", "tea"],
  meat: ["fish", "rice", "vegetables"],
  vegetables: ["rice", "meat", "fish"],
  eat: ["drink", "rice", "tea"],
  drink: ["eat", "water", "tea"],
  sky: ["sun", "moon", "mountain"],
  book: ["tea", "money", "ticket"],
  car: ["ticket", "home", "money"],
  home: ["car", "book", "money"],
  ticket: ["car", "money", "book"],
  phone: ["book", "keys", "ticket"],
  keys: ["phone", "door", "money"],
  cup: ["phone", "book", "keys"],
  table: ["chair", "door", "window"],
  chair: ["table", "door", "window"],
  door: ["window", "table", "chair"],
  window: ["door", "table", "chair"],
  backpack: ["book", "phone", "keys"],
  bathroom: ["bedroom", "kitchen", "travel"],
  bedroom: ["bathroom", "kitchen", "travel"],
  kitchen: ["bathroom", "bedroom", "travel"],
  travel: ["bedroom", "kitchen", "bathroom"],
  one: ["two", "three", "five"],
  two: ["three", "one", "four"],
  three: ["two", "four", "one"],
  four: ["three", "five", "two"],
  five: ["four", "three", "two"],
};

export function defaultVisualDistractors(targetId: VisualConceptId, count = 3): VisualConceptId[] {
  const target = visualById[targetId];
  // Consistência visual: as opções de uma pergunta compartilham a MESMA família
  // de estilo (realistic vs flat). Isso garante que uma grade nunca misture
  // foto com desenho chapado (ver docs/VISUAL_ASSET_GUIDE.md).
  const family = target ? visualStyleFamily(target.visualStyle) : undefined;
  const ambiguous = new Set<VisualConceptId>(target?.ambiguousWith ?? []);
  for (const candidate of VISUAL_CONCEPTS) {
    if (candidate.ambiguousWith?.includes(targetId)) ambiguous.add(candidate.id);
  }
  const pool = VISUAL_CONCEPT_IDS.filter(
    (id) =>
      id !== targetId &&
      !ambiguous.has(id) &&
      (!family || visualStyleFamily(visualById[id].visualStyle) === family)
  );
  const preferred = (CURATED_DISTRACTORS[targetId] ?? []).filter((id) => pool.includes(id));
  const sameCategory = target
    ? pool.filter((id) => !preferred.includes(id) && visualById[id].category === target.category)
    : [];
  const ordered = [
    ...preferred,
    ...sameCategory,
    ...pool.filter((id) => !preferred.includes(id) && !sameCategory.includes(id)),
  ];
  return ordered.slice(0, count);
}
