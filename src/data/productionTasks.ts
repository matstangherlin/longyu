import { CHUNKS } from "./chunks";
import { VOCABULARY } from "./vocabulary";

// ————————————————————————————————————————————————————————————————
// Motores de produção, transferência e reparo (onda 2).
//
// A onda 1 resolveu a VARIEDADE: o mesmo conteúdo passou a ser cobrado por
// caminhos diferentes (ouvir, discriminar, escrever, categorizar, julgar
// estrutura). O que continuava fraco era o outro eixo:
//
//   percepção + compreensão + construção   →  já forte
//   produção independente + transferência  →  ainda apoiado em alternativas
//
// Praticamente toda tarefa terminava em "escolher" ou "ordenar peças que o
// app entregou". Este módulo é a fonte de conteúdo de três motores que tiram
// o apoio:
//
//   1. free_production   — situação em pt-BR, sem banco e sem alternativas.
//                          O aluno escreve (ou fala) a frase inteira.
//   2. transfer_task     — mesma ESTRUTURA, combinação nova. A frase alvo
//                          nunca foi ensinada; se o aluno acerta, ele
//                          aprendeu o padrão, não decorou a frase.
//   3. conversation_repair — a comunicação falha e o aluno precisa continuar:
//                          repetir, simplificar, pedir repetição, assumir
//                          que não entendeu.
//
// Regra de ouro (a mesma de perceptionDrills.ts): nada aqui inventa
// vocabulário. Hànzì e pinyin de cada peça saem de VOCABULARY/CHUNKS pelo id;
// só o enunciado em português e a moldura da estrutura são curados — não dá
// para gerar situação comunicativa boa a partir de tabela de frequência.
// ————————————————————————————————————————————————————————————————

// Escapes explícitos, não os caracteres literais: escrito com literais, o
// início do segundo intervalo (U+F900) normaliza para U+8C48 em NFC e a classe
// passa a cobrir U+8C48–U+FAFF, engolindo Yi, Hangul e uso privado. Mesma
// correção já aplicada em perceptionDrills.ts.
const HANZI_ONLY_RE = /^[\u3400-\u9fff\uf900-\ufaff]+$/u;
const PUNCT_RE = /[　-〿＀-￯,.!?\s:;"'()]/g;

function cleanSentence(value: string): string {
  return value.replace(PUNCT_RE, "").trim();
}

// ————————————————————————————————————————————————————————————————
// 1. Frames de frase: a estrutura que a produção e a transferência usam
// ————————————————————————————————————————————————————————————————

/** Peça que preenche o buraco de um frame. O hànzì vem do corpus, pelo id. */
export interface FrameFiller {
  /** id em src/data/vocabulary.ts — resolvido em tempo de geração. */
  vocabId: string;
  /** Como o item aparece no enunciado em pt-BR ("uma maçã", "amigos"). */
  promptPt: string;
  /** Forma singular, usada quando a quantidade é 1 ("um amigo", não "um amigos"). */
  promptSingularPt?: string;
}

/** Quantidade opcional (número + classificador) para frames que contam. */
export interface FrameQuantifier {
  hanzi: string;
  pinyin: string;
  promptPt: string;
  /** Marca a quantidade 1 — o enunciado passa a usar a forma singular da peça. */
  singular?: boolean;
}

/**
 * O que o aluno está TENTANDO FAZER com a frase. Duas estruturas diferentes
 * podem cumprir o mesmo objetivo (我要茶 e 我想喝茶 pedem chá do mesmo jeito),
 * e é por isso que o objetivo — não a estrutura — decide o que conta como
 * resposta certa. Sem isto, produzir uma frase correta que não é a esperada
 * é punido, que é o oposto de treinar produção.
 */
export type CommunicativeGoal =
  | "request_item"
  | "ask_location"
  | "ask_price"
  | "state_preference"
  | "state_destination"
  | "buy_item"
  | "offer_item"
  | "refuse_drink"
  | "refuse_food"
  | "count_possession"
  | "chain_actions"
  | "travel_by"
  | "state_ongoing"
  | "state_change"
  | "farewell"
  | "state_wellbeing";

/** Domínio situacional da estrutura — para casar transferência com a lição. */
export type CommunicativeDomain =
  | "restaurant"
  | "shopping"
  | "hotel"
  | "airport"
  | "taxi"
  | "directions"
  | "work"
  | "study"
  | "health"
  | "time";

/**
 * Papel de um slot na moldura da frase. É o STPVO-light: o aluno vê a ordem
 * (sujeito · tempo · lugar · verbo · objeto) em vez de só o buraco "___".
 */
/**
 * Escada de scaffold da transferência (e da produção aberta no degrau final).
 * Uma transformação nova por vez nas primeiras ocorrências.
 *
 * - guided:    só troca UMA peça (ex.: 我要这个 → 我要茶)
 * - supported: duas transformações já ensinadas, com dica visual (ex.: 我→你)
 * - question:  acrescenta 吗 só depois de o padrão interrogativo existir
 * - open:      situação nova sem estrutura exposta (produção aberta)
 */
export type ProductionAssist = "guided" | "supported" | "question" | "open";

export const PRODUCTION_ASSIST_RANK: Record<ProductionAssist, number> = {
  guided: 1,
  supported: 2,
  question: 3,
  open: 4,
};

export type PatternSlotRole =
  | "subject"
  | "time"
  | "place"
  | "verb"
  | "object"
  | "quantity"
  | "classifier"
  | "particle"
  | "polite"
  | "negation"
  | "other";

export const PATTERN_SLOT_LABELS: Record<PatternSlotRole, string> = {
  subject: "sujeito",
  time: "tempo",
  place: "lugar",
  verb: "verbo",
  object: "objeto",
  quantity: "quantidade",
  classifier: "classificador",
  particle: "partícula",
  polite: "cortesia",
  negation: "negação",
  other: "peça",
};

/** Um degrau nomeado da estrutura — buraco ou peça fixa do padrão. */
export interface PatternSlot {
  role: PatternSlotRole;
  /** true = é o buraco que o aluno preenche nesta tarefa. */
  hole?: boolean;
}

export interface SentenceFrame {
  id: string;
  /** O que esta estrutura faz. Define o conjunto de respostas aceitas. */
  goal: CommunicativeGoal;
  /** Nome da estrutura em pt-BR, para relatórios e para a correção. */
  labelPt: string;
  /** Como a estrutura aparece na tela da transferência: "我要 ___". */
  patternPt: string;
  /**
   * Ordem nomeada da frase (STPVO-light). Aparece na produção e na
   * transferência para o aluno montar por slots, não por tradução.
   */
  slots: PatternSlot[];
  prefix: string;
  prefixPinyin: string;
  suffix: string;
  suffixPinyin: string;
  /** Frase JÁ ENSINADA que ancora a estrutura (chunk do corpus). */
  anchorChunkId: string;
  /**
   * Enunciado da situação. `{item}` recebe o promptPt da peça e `{qty}` a
   * quantidade — nunca aparece hànzì aqui: a tarefa é produzir, não copiar.
   */
  situationTemplatePt: string;
  /**
   * Quando o frame aceita tempo opcional, este template usa `{time}` + `{item}`.
   * Sem ele, a variante com tempo reaproveita `situationTemplatePt` e injeta
   * o tempo no português de forma genérica.
   */
  situationWithTimeTemplatePt?: string;
  /** A regra que a estrutura carrega — é isto que a transferência prova. */
  grammarNotePt: string;
  fillers: FrameFiller[];
  quantifiers?: FrameQuantifier[];
  /**
   * Tempo opcional (今天/明天/昨天…) inserido depois do sujeito 我.
   * Só faz sentido em frames cujo prefix começa com 我 — a ordem chinesa
   * pede sujeito → tempo → resto.
   */
  timeFillers?: FrameFiller[];
  /**
   * Degrau desta estrutura na escada de transferência.
   * Default: guided (uma troca de slot vs a âncora).
   */
  transferAssist?: ProductionAssist;
  /**
   * Frames mais simples que precisam estar praticáveis (glifos ok) antes
   * deste degrau aparecer como transferência.
   */
  transferRequiresFrameIds?: string[];
  /** Exige 吗 já conhecido (visto em glifos) — para degrau question. */
  transferRequiresMa?: boolean;
  /**
   * Dica visual de transformação (supported): o que muda vs a âncora.
   * Ex.: { from: "我", to: "你" }.
   */
  transferTransformHint?: { from: string; to: string };
}

/**
 * Frames curados. Cada um tem âncora real no currículo — a estrutura já foi
 * ensinada em alguma lição, e é isso que autoriza cobrar produção livre dela.
 */
export const SENTENCE_FRAMES: SentenceFrame[] = [
  {
    id: "frame_woyao",
    goal: "request_item",
    labelPt: "pedir uma coisa",
    patternPt: "我要 ___",
    slots: [{ role: "subject" }, { role: "verb" }, { role: "object", hole: true }],
    prefix: "我要",
    prefixPinyin: "wǒ yào",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woyao",
    situationTemplatePt: "No balcão, diga que você quer {item}.",
    grammarNotePt: "要 é o pedido direto: 我要 + o que você quer. Nada de 是 aqui.",
    transferAssist: "guided",
    fillers: [
      { vocabId: "v_cha", promptPt: "chá" },
      { vocabId: "v_shui", promptPt: "água" },
      { vocabId: "v_reshui", promptPt: "água quente" },
      { vocabId: "v_niunai", promptPt: "leite" },
      { vocabId: "v_pingguo", promptPt: "uma maçã" },
      { vocabId: "v_xiangjiao", promptPt: "uma banana" },
      { vocabId: "v_niurou", promptPt: "carne de boi" },
      { vocabId: "v_yu", promptPt: "peixe" },
    ],
  },
  {
    id: "frame_woxianghe",
    goal: "request_item",
    labelPt: "dizer o que quer beber",
    patternPt: "我想喝 ___",
    slots: [{ role: "subject" }, { role: "verb" }, { role: "object", hole: true }],
    prefix: "我想喝",
    prefixPinyin: "wǒ xiǎng hē",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woxianghe",
    situationTemplatePt: "Você está com sede. Diga que quer beber {item}.",
    grammarNotePt: "想 + ação: 想喝 + bebida.",
    transferAssist: "guided",
    fillers: [
      { vocabId: "v_shui", promptPt: "água" },
      { vocabId: "v_cha", promptPt: "chá" },
      { vocabId: "v_niunai", promptPt: "leite" },
      { vocabId: "v_reshui", promptPt: "água quente" },
    ],
  },
  {
    id: "frame_zainali",
    goal: "ask_location",
    labelPt: "perguntar onde algo fica",
    patternPt: "___ 在哪里？",
    slots: [{ role: "place", hole: true }, { role: "verb" }],
    prefix: "",
    prefixPinyin: "",
    suffix: "在哪里？",
    suffixPinyin: "zài nǎlǐ?",
    anchorChunkId: "huochezhanzainali",
    situationTemplatePt: "Você se perdeu na cidade. Pergunte onde fica {item}.",
    grammarNotePt: "Em mandarim o lugar vem primeiro e a pergunta fecha a frase: LUGAR + 在哪里？",
    transferAssist: "guided",
    fillers: [
      { vocabId: "v_yinhang", promptPt: "o banco" },
      { vocabId: "v_chaoshi", promptPt: "o supermercado" },
      { vocabId: "v_yiyuan", promptPt: "o hospital" },
      { vocabId: "v_huochezhan", promptPt: "a estação de trem" },
      { vocabId: "v_chezhan", promptPt: "o ponto de ônibus" },
    ],
  },
  {
    id: "frame_qingwenzainali",
    goal: "ask_location",
    labelPt: "perguntar onde algo fica, com licença",
    patternPt: "请问，___ 在哪里？",
    slots: [{ role: "polite" }, { role: "place", hole: true }, { role: "verb" }],
    prefix: "请问，",
    prefixPinyin: "qǐng wèn,",
    suffix: "在哪里？",
    suffixPinyin: "zài nǎlǐ?",
    anchorChunkId: "qingwen",
    situationTemplatePt: "Você aborda um desconhecido na rua. Pergunte com licença onde fica {item}.",
    grammarNotePt: "请问 abre a pergunta educadamente e não muda o resto: 请问 + LUGAR + 在哪里？",
    transferAssist: "supported",
    transferRequiresFrameIds: ["frame_zainali"],
    transferTransformHint: { from: "…在哪里？", to: "请问，…在哪里？" },
    fillers: [
      { vocabId: "v_yinhang", promptPt: "o banco" },
      { vocabId: "v_chaoshi", promptPt: "o supermercado" },
      { vocabId: "v_yiyuan", promptPt: "o hospital" },
      { vocabId: "v_huochezhan", promptPt: "a estação de trem" },
      { vocabId: "v_chezhan", promptPt: "o ponto de ônibus" },
    ],
  },
  {
    id: "frame_woxiangchi",
    goal: "request_item",
    labelPt: "dizer o que quer comer",
    patternPt: "我想吃 ___",
    slots: [{ role: "subject" }, { role: "verb" }, { role: "object", hole: true }],
    prefix: "我想吃",
    prefixPinyin: "wǒ xiǎng chī",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woxiangchimifan",
    situationTemplatePt: "Você está com fome. Diga que quer comer {item}.",
    grammarNotePt: "Mesma estrutura de 想喝, trocando a ação: 想 + ação + o que você quer.",
    transferAssist: "guided",
    fillers: [
      { vocabId: "v_mifan", promptPt: "arroz" },
      { vocabId: "v_rou", promptPt: "carne" },
      { vocabId: "v_yu", promptPt: "peixe" },
      { vocabId: "v_niurou", promptPt: "carne de boi" },
      { vocabId: "v_pingguo", promptPt: "uma maçã" },
      { vocabId: "v_xiangjiao", promptPt: "uma banana" },
    ],
  },
  {
    id: "frame_woxiangmai",
    goal: "buy_item",
    labelPt: "dizer o que quer comprar",
    patternPt: "我想买 ___",
    slots: [{ role: "subject" }, { role: "verb" }, { role: "object", hole: true }],
    prefix: "我想买",
    prefixPinyin: "wǒ xiǎng mǎi",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woyaomaiyifu",
    situationTemplatePt: "Na loja, diga o que você está querendo comprar: {item}.",
    grammarNotePt: "想买 é o mesmo pedido de 要买, um grau mais suave — as duas funcionam na loja.",
    fillers: [
      { vocabId: "v_shu", promptPt: "um livro" },
      { vocabId: "v_piao", promptPt: "uma passagem" },
      { vocabId: "v_pingguo", promptPt: "maçãs" },
      { vocabId: "v_niunai", promptPt: "leite" },
    ],
  },
  {
    id: "frame_duoshaoqian",
    goal: "ask_price",
    labelPt: "perguntar o preço",
    patternPt: "___ 多少钱？",
    slots: [{ role: "object", hole: true }, { role: "other" }],
    prefix: "",
    prefixPinyin: "",
    suffix: "多少钱？",
    suffixPinyin: "duōshao qián?",
    anchorChunkId: "piaoduoshaoqian",
    situationTemplatePt: "Na loja, pergunte quanto custa {item}.",
    grammarNotePt: "多少钱 pergunta preço e vai no fim: COISA + 多少钱？ (几钱 é para contar, não para preço).",
    fillers: [
      { vocabId: "v_piao", promptPt: "a passagem" },
      { vocabId: "v_pingguo", promptPt: "a maçã" },
      { vocabId: "v_xiangjiao", promptPt: "a banana" },
      { vocabId: "v_shu", promptPt: "o livro" },
      { vocabId: "v_yifu", promptPt: "a roupa" },
      { vocabId: "v_niunai", promptPt: "o leite" },
      { vocabId: "v_cha", promptPt: "o chá" },
    ],
  },
  {
    id: "frame_woyouge",
    goal: "count_possession",
    labelPt: "dizer quantos você tem",
    patternPt: "我有 ___ 个 ___",
    slots: [
      { role: "subject" },
      { role: "verb" },
      { role: "quantity", hole: true },
      { role: "classifier" },
      { role: "object", hole: true },
    ],
    prefix: "我有",
    prefixPinyin: "wǒ yǒu",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woyousangepengyou",
    situationTemplatePt: "Conte sobre você: diga que tem {qty} {item}.",
    grammarNotePt: "Entre o número e a coisa entra sempre o classificador: 有 + número + 个 + coisa.",
    quantifiers: [
      { hanzi: "一个", pinyin: "yí ge", promptPt: "1", singular: true },
      { hanzi: "三个", pinyin: "sān ge", promptPt: "3" },
      { hanzi: "四个", pinyin: "sì ge", promptPt: "4" },
      { hanzi: "五个", pinyin: "wǔ ge", promptPt: "5" },
    ],
    fillers: [
      { vocabId: "v_pengyou", promptPt: "amigos", promptSingularPt: "amigo" },
      { vocabId: "v_pingguo", promptPt: "maçãs", promptSingularPt: "maçã" },
      { vocabId: "v_xiangjiao", promptPt: "bananas", promptSingularPt: "banana" },
    ],
  },
  {
    id: "frame_woxihuan",
    goal: "state_preference",
    labelPt: "dizer do que você gosta",
    patternPt: "我喜欢 ___",
    slots: [{ role: "subject" }, { role: "verb" }, { role: "object", hole: true }],
    prefix: "我喜欢",
    prefixPinyin: "wǒ xǐhuan",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woxihuan",
    situationTemplatePt: "Alguém pergunta sobre seus gostos. Diga do que você gosta: {item}.",
    grammarNotePt: "喜欢 vem direto depois de quem age, sem preposição: 我喜欢 + coisa.",
    fillers: [
      { vocabId: "v_zhongwen", promptPt: "chinês" },
      { vocabId: "v_cha", promptPt: "chá" },
      { vocabId: "v_yu", promptPt: "peixe" },
      { vocabId: "v_shu", promptPt: "livros" },
      { vocabId: "v_pingguo", promptPt: "maçã" },
      { vocabId: "v_zhongguo", promptPt: "China" },
    ],
  },
  {
    id: "frame_woqu",
    goal: "state_destination",
    labelPt: "dizer para onde você vai",
    patternPt: "我去 ___",
    slots: [{ role: "subject" }, { role: "verb" }, { role: "place", hole: true }],
    prefix: "我去",
    prefixPinyin: "wǒ qù",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woquxuexiao",
    situationTemplatePt: "Um amigo pergunta onde você vai agora. Responda que vai {item}.",
    situationWithTimeTemplatePt: "Alguém pergunta seus planos. Diga que {time} você vai {item}.",
    grammarNotePt: "去 já significa 'ir a' — o destino vem colado, sem 到 no meio. Tempo (今天/明天) fica entre quem age e a ação.",
    fillers: [
      { vocabId: "v_chaoshi", promptPt: "ao supermercado" },
      { vocabId: "v_yiyuan", promptPt: "ao hospital" },
      { vocabId: "v_yinhang", promptPt: "ao banco" },
      { vocabId: "v_huochezhan", promptPt: "à estação de trem" },
    ],
    timeFillers: [
      { vocabId: "v_jintian", promptPt: "hoje" },
      { vocabId: "v_mingtian", promptPt: "amanhã" },
    ],
  },
  {
    id: "frame_woyaomai",
    goal: "buy_item",
    labelPt: "dizer o que quer comprar",
    patternPt: "我要买 ___",
    slots: [{ role: "subject" }, { role: "verb" }, { role: "object", hole: true }],
    prefix: "我要买",
    prefixPinyin: "wǒ yào mǎi",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woyaomaiyifu",
    situationTemplatePt: "Você entra numa loja. Diga que quer comprar {item}.",
    grammarNotePt: "要 + ação é a intenção ('vou/quero fazer'): 要买 + coisa.",
    fillers: [
      { vocabId: "v_yifu", promptPt: "roupa" },
      { vocabId: "v_shu", promptPt: "um livro" },
      { vocabId: "v_piao", promptPt: "uma passagem" },
      { vocabId: "v_pingguo", promptPt: "maçãs" },
      { vocabId: "v_niunai", promptPt: "leite" },
    ],
  },
  {
    id: "frame_niyao",
    goal: "offer_item",
    labelPt: "dizer o que a outra pessoa quer",
    patternPt: "你要 ___",
    slots: [{ role: "subject" }, { role: "verb" }, { role: "object", hole: true }],
    prefix: "你要",
    prefixPinyin: "nǐ yào",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woyao",
    situationTemplatePt: "Agora é a outra pessoa: diga que ela quer {item}.",
    grammarNotePt: "Troque só quem age: 我要 → 你要. O resto da estrutura continua igual.",
    transferAssist: "supported",
    transferRequiresFrameIds: ["frame_woyao"],
    transferTransformHint: { from: "我", to: "你" },
    fillers: [
      { vocabId: "v_cha", promptPt: "chá" },
      { vocabId: "v_shui", promptPt: "água" },
      { vocabId: "v_pingguo", promptPt: "uma maçã" },
      { vocabId: "v_cai", promptPt: "um prato de comida" },
    ],
  },
  {
    id: "frame_niyaoma",
    goal: "offer_item",
    labelPt: "oferecer alguma coisa",
    patternPt: "你要 ___ 吗？",
    slots: [{ role: "subject" }, { role: "verb" }, { role: "object", hole: true }, { role: "particle" }],
    prefix: "你要",
    prefixPinyin: "nǐ yào",
    suffix: "吗？",
    suffixPinyin: "ma?",
    anchorChunkId: "woyao",
    situationTemplatePt: "Você recebe uma visita em casa. Ofereça {item}, perguntando se a pessoa quer.",
    grammarNotePt: "吗 transforma a afirmação em pergunta de sim/não — e vai sempre no FIM.",
    transferAssist: "question",
    transferRequiresFrameIds: ["frame_woyao", "frame_niyao"],
    transferRequiresMa: true,
    transferTransformHint: { from: "你要…", to: "你要…吗？" },
    fillers: [
      { vocabId: "v_cha", promptPt: "chá" },
      { vocabId: "v_shui", promptPt: "água" },
      { vocabId: "v_pingguo", promptPt: "uma maçã" },
      { vocabId: "v_cai", promptPt: "um prato de comida" },
    ],
  },
  {
    id: "frame_wobuhe",
    goal: "refuse_drink",
    labelPt: "recusar uma bebida",
    patternPt: "我不喝 ___",
    slots: [{ role: "subject" }, { role: "negation" }, { role: "verb" }, { role: "object", hole: true }],
    prefix: "我不喝",
    prefixPinyin: "wǒ bù hē",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "wobuheta",
    situationTemplatePt: "Ofereceram {item}. Recuse: diga que você não bebe isso.",
    grammarNotePt: "不 vem ANTES da ação: 不喝, nunca 喝不.",
    transferAssist: "guided",
    fillers: [
      { vocabId: "v_cha", promptPt: "chá" },
      { vocabId: "v_shui", promptPt: "água" },
      { vocabId: "v_niunai", promptPt: "leite" },
    ],
  },
  {
    id: "frame_wobuchi",
    goal: "refuse_food",
    labelPt: "recusar uma comida",
    patternPt: "我不吃 ___",
    slots: [{ role: "subject" }, { role: "negation" }, { role: "verb" }, { role: "object", hole: true }],
    prefix: "我不吃",
    prefixPinyin: "wǒ bù chī",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "wobuchirou",
    situationTemplatePt: "No restaurante, diga que você não come {item}.",
    grammarNotePt: "A negação fica grudada na ação: 不吃 + comida.",
    transferAssist: "guided",
    fillers: [
      { vocabId: "v_rou", promptPt: "carne" },
      { vocabId: "v_yu", promptPt: "peixe" },
      { vocabId: "v_niurou", promptPt: "carne de boi" },
    ],
  },
  // ——— Cadeia de ações: empilhar verbos na ordem real, sem "to/by/with" ———
  {
    id: "frame_huijia_action",
    goal: "chain_actions",
    labelPt: "encadear voltar para casa + ação",
    patternPt: "我回家 ___",
    slots: [{ role: "subject" }, { role: "verb" }, { role: "verb", hole: true }],
    prefix: "我回家",
    prefixPinyin: "wǒ huí jiā",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "wohuijia",
    situationTemplatePt: "Você conta o que vai fazer em seguida. Diga que volta para casa para {item}.",
    situationWithTimeTemplatePt: "Você conta o plano. Diga que {time} volta para casa para {item}.",
    grammarNotePt: "Em mandarim as ações se empilham na ordem real — sem 'para' no meio: 回家 + dormir = 回家睡觉.",
    fillers: [
      { vocabId: "v_shuijiao", promptPt: "dormir" },
      { vocabId: "v_chifan", promptPt: "comer" },
    ],
    timeFillers: [
      { vocabId: "v_jintian", promptPt: "hoje" },
      { vocabId: "v_mingtian", promptPt: "amanhã" },
    ],
  },
  {
    id: "frame_zuofeijiqu",
    goal: "travel_by",
    labelPt: "ir de avião a um lugar",
    patternPt: "我坐飞机去 ___",
    slots: [{ role: "subject" }, { role: "verb" }, { role: "object" }, { role: "verb" }, { role: "place", hole: true }],
    prefix: "我坐飞机去",
    prefixPinyin: "wǒ zuò fēijī qù",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "wozuofeiji",
    situationTemplatePt: "Você conta a viagem. Diga que vai de avião {item}.",
    grammarNotePt: "O meio vem ANTES do destino, na ordem do que acontece: 坐飞机 (pegar o avião) + 去 + lugar. Sem 'de avião' no fim.",
    fillers: [
      { vocabId: "v_zhongguo", promptPt: "para a China" },
      { vocabId: "v_chaoshi", promptPt: "ao supermercado" },
      { vocabId: "v_yiyuan", promptPt: "ao hospital" },
      { vocabId: "v_huochezhan", promptPt: "à estação de trem" },
    ],
  },
  // ——— Filtros de aspecto: a frase-base ganha 在 / 了 sem mudar o verbo ———
  {
    id: "frame_wozai",
    goal: "state_ongoing",
    labelPt: "dizer o que está acontecendo agora",
    patternPt: "我在 ___",
    slots: [{ role: "subject" }, { role: "particle" }, { role: "verb", hole: true }],
    prefix: "我在",
    prefixPinyin: "wǒ zài",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "wozaixuezhongwen",
    situationTemplatePt: "Alguém pergunta o que você está fazendo agora. Responda que está {item}.",
    grammarNotePt: "在 antes da ação marca 'agora / em progresso': 在 + ação. A ação não muda de forma.",
    fillers: [
      { vocabId: "v_xuezhongwen", promptPt: "estudando chinês" },
      { vocabId: "v_chifan", promptPt: "comendo" },
      { vocabId: "v_heshui", promptPt: "bebendo água" },
      { vocabId: "v_shuijiao", promptPt: "dormindo" },
    ],
  },
  {
    id: "frame_wo_le",
    goal: "state_change",
    labelPt: "marcar mudança de estado com 了",
    patternPt: "我 ___ 了",
    slots: [{ role: "subject" }, { role: "other", hole: true }, { role: "particle" }],
    prefix: "我",
    prefixPinyin: "wǒ",
    suffix: "了。",
    suffixPinyin: "le.",
    anchorChunkId: "woele",
    situationTemplatePt: "Conte como você está agora. Diga que {item}.",
    grammarNotePt: "了 no fim marca mudança / conclusão — a ação (ou estado) não se conjuga: 饿 → 我饿了, 回家 → 我回家了.",
    fillers: [
      { vocabId: "v_e_fome", promptPt: "está com fome" },
      { vocabId: "v_huijia", promptPt: "já voltou para casa" },
      { vocabId: "v_shuijiao", promptPt: "já foi dormir" },
    ],
  },
];

const vocabById = new Map(VOCABULARY.map((entry) => [entry.id, entry]));
const chunkById = new Map(CHUNKS.map((chunk) => [chunk.id, chunk]));

/**
 * Frases que o currículo JÁ ENSINA (chunks + microfrases do vocabulário).
 * É contra este conjunto que a transferência se define: se a frase está
 * aqui, produzi-la é produção; se não está, é transferência.
 */
export const CORPUS_SENTENCES: ReadonlySet<string> = new Set(
  [
    ...CHUNKS.map((chunk) => chunk.hanzi),
    ...VOCABULARY.filter((entry) => entry.kind === "phrase").map((entry) => entry.hanzi),
  ].map(cleanSentence)
);

/** Uma tarefa gerada por um frame — serve tanto para produção quanto para transferência. */
export interface FrameTask {
  id: string;
  frameId: string;
  /** O que a frase faz. Tarefas do mesmo objetivo aceitam a resposta uma da outra. */
  goal: CommunicativeGoal;
  /** Peça que preenche o buraco. */
  vocabId: string;
  /**
   * Chave de conteúdo: peça + quantidade + tempo. É o que casa realizações
   * irmãs — "diga que tem 3 amigos" não pode aceitar 我有五个朋友, e
   * "amanhã vou ao banco" não aceita "hoje vou ao banco".
   */
  contentKey: string;
  frameLabelPt: string;
  patternPt: string;
  /** Ordem nomeada da frase (STPVO-light) para o scaffold na UI. */
  slots: PatternSlot[];
  /** Enunciado em pt-BR. Nunca contém hànzì: o aluno tem que produzir. */
  situationPt: string;
  targetHanzi: string;
  targetPinyin: string;
  /**
   * Tudo que conta como certo: o alvo, o alvo sem pontuação, o pinyin, e as
   * outras realizações do MESMO objetivo com a MESMA peça.
   */
  accepts: string[];
  /** As frases irmãs, em hànzì, para mostrar depois da resposta. */
  siblingAnswers: string[];
  grammarNotePt: string;
  /** Frase-âncora já ensinada — mostrada só na transferência. */
  anchor: { hanzi: string; pinyin: string; meaningPt: string };
  /** true quando a frase alvo não existe no currículo (transferência real). */
  isNovelCombination: boolean;
  /** Glifos exigidos pela resposta — o gate de "o aluno já viu isto". */
  requiredGlyphs: string[];
  /** Degrau na escada de transferência (guided → supported → question). */
  transferAssist: ProductionAssist;
  /** Frames que precisam estar praticáveis antes deste degrau. */
  transferRequiresFrameIds: string[];
  /** Exige 吗 nos glifos conhecidos. */
  transferRequiresMa: boolean;
  /** Dica visual de transformação (supported / question). */
  transferTransformHint?: { from: string; to: string };
}

function joinPinyin(...parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    // "chá ." → "chá."  ·  "chá ma?" fica como está (sílaba separada de verdade).
    .replace(/\s+([.?!])/g, "$1");
}

/**
 * Insere tempo depois do sujeito 我 no prefixo. Só é chamado quando o frame
 * declara timeFillers e o prefixo começa com 我 — a ordem chinesa é
 * sujeito → tempo → resto.
 */
function withTimePrefix(
  prefix: string,
  prefixPinyin: string,
  timeHanzi: string,
  timePinyin: string
): { prefix: string; prefixPinyin: string } {
  if (!prefix.startsWith("我")) {
    return { prefix, prefixPinyin };
  }
  const restHanzi = prefix.slice(1);
  const restPinyin = prefixPinyin.replace(/^wǒ\s*/i, "");
  return {
    prefix: `我${timeHanzi}${restHanzi}`,
    prefixPinyin: joinPinyin("wǒ", timePinyin, restPinyin),
  };
}

function slotsForTask(frame: SentenceFrame, hasTime: boolean): PatternSlot[] {
  if (!hasTime) return frame.slots;
  // Tempo entra depois do sujeito, se houver; senão no início.
  const slots = [...frame.slots];
  const subjectIdx = slots.findIndex((slot) => slot.role === "subject");
  const insertAt = subjectIdx >= 0 ? subjectIdx + 1 : 0;
  if (!slots.some((slot) => slot.role === "time")) {
    slots.splice(insertAt, 0, { role: "time" });
  }
  return slots;
}

function frameTasks(frame: SentenceFrame): FrameTask[] {
  const anchorChunk = chunkById.get(frame.anchorChunkId);
  if (!anchorChunk) return [];
  const quantifiers: (FrameQuantifier | null)[] = frame.quantifiers?.length ? frame.quantifiers : [null];
  const timeOptions: (FrameFiller | null)[] = frame.timeFillers?.length
    ? [null, ...frame.timeFillers]
    : [null];
  const tasks: FrameTask[] = [];

  for (const filler of frame.fillers) {
    const entry = vocabById.get(filler.vocabId);
    if (!entry || !HANZI_ONLY_RE.test(entry.hanzi)) continue;
    for (const quantifier of quantifiers) {
      for (const timeFiller of timeOptions) {
        const timeEntry = timeFiller ? vocabById.get(timeFiller.vocabId) : null;
        if (timeFiller && (!timeEntry || !HANZI_ONLY_RE.test(timeEntry.hanzi))) continue;

        const builtPrefix = timeEntry
          ? withTimePrefix(frame.prefix, frame.prefixPinyin, timeEntry.hanzi, timeEntry.pinyin)
          : { prefix: frame.prefix, prefixPinyin: frame.prefixPinyin };

        const targetHanzi = `${builtPrefix.prefix}${quantifier?.hanzi ?? ""}${entry.hanzi}${frame.suffix}`;
        const targetPinyin = joinPinyin(
          builtPrefix.prefixPinyin,
          quantifier?.pinyin ?? "",
          entry.pinyin,
          frame.suffixPinyin
        );
        const bare = cleanSentence(targetHanzi);
        const itemPt = quantifier?.singular ? filler.promptSingularPt ?? filler.promptPt : filler.promptPt;
        const situationPt = timeEntry
          ? (frame.situationWithTimeTemplatePt ?? frame.situationTemplatePt)
              .replace("{time}", timeFiller?.promptPt ?? "")
              .replace("{item}", itemPt)
              .replace("{qty}", quantifier?.promptPt ?? "")
          : frame.situationTemplatePt
              .replace("{item}", itemPt)
              .replace("{qty}", quantifier?.promptPt ?? "")
              .replace("{time}", "");

        const patternPt = timeEntry
          ? frame.patternPt.replace(/^我/, `我${timeEntry.hanzi}`)
          : frame.patternPt;

        tasks.push({
          id: `${frame.id}__${filler.vocabId}${quantifier ? `__${quantifier.pinyin.replace(/\s+/g, "")}` : ""}${
            timeEntry ? `__t_${timeFiller?.vocabId}` : ""
          }`,
          frameId: frame.id,
          goal: frame.goal,
          vocabId: filler.vocabId,
          contentKey: `${filler.vocabId}|${quantifier?.hanzi ?? ""}|${timeEntry?.hanzi ?? ""}`,
          frameLabelPt: frame.labelPt,
          patternPt,
          slots: slotsForTask(frame, Boolean(timeEntry)),
          situationPt,
          targetHanzi,
          targetPinyin,
          accepts: [bare, targetPinyin],
          siblingAnswers: [],
          grammarNotePt: frame.grammarNotePt,
          anchor: { hanzi: anchorChunk.hanzi, pinyin: anchorChunk.pinyin, meaningPt: anchorChunk.meaningPt },
          isNovelCombination: !CORPUS_SENTENCES.has(bare),
          requiredGlyphs: [...bare],
          transferAssist: frame.transferAssist ?? "guided",
          transferRequiresFrameIds: frame.transferRequiresFrameIds ?? [],
          transferRequiresMa: Boolean(frame.transferRequiresMa),
          transferTransformHint: frame.transferTransformHint,
        });
      }
    }
  }
  return tasks;
}

/**
 * Frases do currículo que já realizam o frame — produção guiada precisa
 * de pelo menos uma frase ensinada. Sem isto, 我喜欢/我想吃/多少钱 só
 * existiam como combinação inédita e nunca destravavam a escada.
 */
function corpusTasksForFrame(frame: SentenceFrame): FrameTask[] {
  const anchorChunk = chunkById.get(frame.anchorChunkId);
  if (!anchorChunk) return [];
  const sources: { id: string; hanzi: string; pinyin: string; meaningPt: string }[] = [
    ...CHUNKS.map((chunk) => ({
      id: chunk.id,
      hanzi: chunk.hanzi,
      pinyin: chunk.pinyin,
      meaningPt: chunk.meaningPt,
    })),
    ...VOCABULARY.filter((entry) => entry.kind === "phrase").map((entry) => ({
      id: entry.id,
      hanzi: entry.hanzi,
      pinyin: entry.pinyin,
      meaningPt: entry.meaningPt,
    })),
  ];
  const tasks: FrameTask[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    if (!sentenceMatchesFrame(source.hanzi, frame)) continue;
    const bare = cleanSentence(source.hanzi);
    if (!bare || seen.has(bare)) continue;
    seen.add(bare);
    tasks.push({
      id: `${frame.id}__corpus_${source.id}`,
      frameId: frame.id,
      goal: frame.goal,
      vocabId: source.id,
      contentKey: `corpus|${bare}`,
      frameLabelPt: frame.labelPt,
      patternPt: frame.patternPt,
      slots: slotsForTask(frame, false),
      situationPt: frame.situationTemplatePt.replace("{item}", "isto").replace("{qty}", "").replace("{time}", ""),
      targetHanzi: source.hanzi,
      targetPinyin: source.pinyin,
      accepts: [bare, source.pinyin],
      siblingAnswers: [],
      grammarNotePt: frame.grammarNotePt,
      anchor: { hanzi: anchorChunk.hanzi, pinyin: anchorChunk.pinyin, meaningPt: anchorChunk.meaningPt },
      isNovelCombination: false,
      requiredGlyphs: [...bare],
      transferAssist: frame.transferAssist ?? "guided",
      transferRequiresFrameIds: frame.transferRequiresFrameIds ?? [],
      transferRequiresMa: Boolean(frame.transferRequiresMa),
      transferTransformHint: frame.transferTransformHint,
    });
  }
  return tasks;
}

/**
 * Realizações irmãs: duas frases que cumprem o MESMO objetivo com a MESMA
 * peça são as duas certas. 我要茶 e 我想喝茶 pedem chá igual; 银行在哪里？ e
 * 请问，银行在哪里？ perguntam a mesma coisa. Punir a segunda porque o
 * enunciado "esperava" a primeira é exatamente o que trava produção.
 *
 * A chave é (objetivo, peça) — não a estrutura. Assim um frame novo entra no
 * conjunto de respostas certas só por declarar o objetivo, sem ninguém
 * precisar lembrar de atualizar uma lista de pares.
 */
function withSiblingAnswers(tasks: FrameTask[]): FrameTask[] {
  const byGoalAndContent = new Map<string, FrameTask[]>();
  for (const task of tasks) {
    const key = `${task.goal}|${task.contentKey}`;
    byGoalAndContent.set(key, [...(byGoalAndContent.get(key) ?? []), task]);
  }
  return tasks.map((task) => {
    const siblings = (byGoalAndContent.get(`${task.goal}|${task.contentKey}`) ?? []).filter(
      (candidate) => cleanSentence(candidate.targetHanzi) !== cleanSentence(task.targetHanzi)
    );
    if (siblings.length === 0) return task;
    return {
      ...task,
      siblingAnswers: siblings.map((sibling) => sibling.targetHanzi),
      accepts: [
        ...task.accepts,
        ...siblings.flatMap((sibling) => [
          sibling.targetHanzi,
          cleanSentence(sibling.targetHanzi),
          sibling.targetPinyin,
        ]),
      ],
    };
  });
}

/** Todas as tarefas geradas pelos frames (produção + transferência). */
export const FRAME_TASKS: FrameTask[] = withSiblingAnswers(
  SENTENCE_FRAMES.flatMap((frame) => {
    const generated = frameTasks(frame);
    const taught = new Set(generated.map((task) => cleanSentence(task.targetHanzi)));
    const extra = corpusTasksForFrame(frame).filter((task) => !taught.has(cleanSentence(task.targetHanzi)));
    return [...generated, ...extra];
  })
);

function availableTasks(seenGlyphs: ReadonlySet<string>): FrameTask[] {
  return FRAME_TASKS.filter((task) => task.requiredGlyphs.every((glyph) => seenGlyphs.has(glyph)));
}

// ————————————————————————————————————————————————————————————————
// Política de prerequisites de estrutura (transfer / free / open)
//
// Vocabulário conhecido ≠ estrutura praticada. A escada pedida pelo QA:
//   exposição → reconhecimento/completion → sentence build →
//   produção guiada → transferência → produção aberta
//
// Glifos continuam necessários; esta camada exige histórico da ESTRUTURA.
// ————————————————————————————————————————————————————————————————

/** Degraus de prática de uma estrutura antes de transferir. */
export interface StructurePracticeRungs {
  /** Ancora ou frase no padrao ja apareceu no curriculo (foco/autoral). */
  exposed: boolean;
  /** Já houve fill_blank (ou equivalente) no padrão. */
  completion: boolean;
  /** Já houve sentence_build / lab no padrão. */
  build: boolean;
  /** Já houve free_production guiada deste frame. */
  guidedProduction: boolean;
}

export type StructureExposureMap = Map<string, StructurePracticeRungs>;

export function emptyStructureRungs(): StructurePracticeRungs {
  return { exposed: false, completion: false, build: false, guidedProduction: false };
}

export function cloneStructureExposure(map: StructureExposureMap): StructureExposureMap {
  const next: StructureExposureMap = new Map();
  for (const [frameId, rungs] of map) {
    next.set(frameId, { ...rungs });
  }
  return next;
}

export function ensureStructureRungs(
  map: StructureExposureMap,
  frameId: string
): StructurePracticeRungs {
  let rungs = map.get(frameId);
  if (!rungs) {
    rungs = emptyStructureRungs();
    map.set(frameId, rungs);
  }
  return rungs;
}

export function mergeStructureExposure(into: StructureExposureMap, from: StructureExposureMap): void {
  for (const [frameId, rungs] of from) {
    const target = ensureStructureRungs(into, frameId);
    target.exposed = target.exposed || rungs.exposed;
    target.completion = target.completion || rungs.completion;
    target.build = target.build || rungs.build;
    target.guidedProduction = target.guidedProduction || rungs.guidedProduction;
  }
}

/** A frase casa com o esqueleto do frame (prefixo/sufixo fixos)? */
export function sentenceMatchesFrame(hanzi: string, frame: SentenceFrame): boolean {
  const clean = cleanSentence(hanzi);
  if (!clean) return false;
  const prefix = cleanSentence(frame.prefix);
  const suffix = cleanSentence(frame.suffix);
  if (prefix && !clean.startsWith(prefix)) return false;
  if (suffix && !clean.endsWith(suffix)) return false;

  // Afirmação vs pergunta: 吗 no texto precisa bater com o frame.
  // Senão 你要饭吗？ “casa” com 你要 ___ só porque o sufixo 。 some na limpeza.
  // Atenção: slots com role "particle" também cobrem 在/了 — só 吗 conta aqui.
  const frameHasMa = /吗/.test(frame.suffix) || /吗/.test(frame.patternPt);
  const textHasMa = /吗/.test(clean);
  if (frameHasMa !== textHasMa) return false;

  // Sufixo só pontuação (limpo vazio): ainda exige conteúdo depois do prefixo.
  if (prefix && !suffix && clean.length <= prefix.length) return false;
  // Prefixo vazio (___ 在哪里): exige mais que o sufixo sozinho.
  if (!prefix && suffix && clean.length <= suffix.length) return false;

  return Boolean(prefix || suffix);
}

export function framesMatchingSentence(hanzi: string): SentenceFrame[] {
  return SENTENCE_FRAMES.filter((frame) => sentenceMatchesFrame(hanzi, frame));
}

/** Palavras úteis do frame (já vistas), sem montar a resposta completa. */
export function productionHelpVocabForTask(
  task: FrameTask,
  seenGlyphs: ReadonlySet<string>,
  limit = 4
): { hanzi: string; pinyin: string; meaningPt: string }[] {
  const frame = frameById(task.frameId);
  if (!frame) return [];
  const out: { hanzi: string; pinyin: string; meaningPt: string }[] = [];
  const seen = new Set<string>();
  const push = (hanzi: string, pinyin: string, meaningPt: string) => {
    const key = cleanSentence(hanzi);
    if (!key || seen.has(key) || out.length >= limit) return;
    if (![...key].every((glyph) => seenGlyphs.has(glyph))) return;
    // Não oferecer a frase-alvo inteira como "vocabulário".
    if (key === cleanSentence(task.targetHanzi)) return;
    seen.add(key);
    out.push({ hanzi: key, pinyin, meaningPt });
  };

  // Peças do padrão (sujeito/verbo curtos) quando forem vocabulário real.
  for (const filler of frame.fillers) {
    const entry = vocabById.get(filler.vocabId);
    if (!entry) continue;
    push(entry.hanzi, entry.pinyin, filler.promptPt || entry.meaningPt);
  }
  for (const time of frame.timeFillers ?? []) {
    const entry = vocabById.get(time.vocabId);
    if (!entry) continue;
    push(entry.hanzi, entry.pinyin, time.promptPt || entry.meaningPt);
  }
  // Pronomes / núcleos curtos do prefixo, se o aluno já os viu.
  if (frame.prefix.includes("我")) push("我", "wǒ", "eu");
  if (frame.prefix.includes("你")) push("你", "nǐ", "você");
  if (frame.suffix.includes("吗") || frame.patternPt.includes("吗")) push("吗", "ma", "pergunta");

  return out.slice(0, limit);
}

/** Banco de peças para o nível 4 (sentence build) — alvo + distratores do frame. */
export function productionHelpBuildBank(task: FrameTask, seed = 0): string[] {
  const target = [...cleanSentence(task.targetHanzi)];
  if (target.length < 2) return target;
  const frame = frameById(task.frameId);
  const extras: string[] = [];
  for (const filler of frame?.fillers ?? []) {
    const entry = vocabById.get(filler.vocabId);
    if (!entry) continue;
    for (const glyph of entry.hanzi) {
      if (!target.includes(glyph) && !extras.includes(glyph)) extras.push(glyph);
    }
  }
  const bank = [...target, ...extras].slice(0, Math.max(target.length + 3, 4));
  // Embaralhamento estável pelo seed (Fisher-Yates determinístico).
  const order = bank.map((piece, index) => ({ piece, key: (seed * 31 + index * 17) % 997 }));
  order.sort((a, b) => a.key - b.key);
  return order.map((entry) => entry.piece);
}

export function frameById(frameId: string): SentenceFrame | undefined {
  return SENTENCE_FRAMES.find((frame) => frame.id === frameId);
}

/** Produção guiada: estrutura exposta + (completion OU build). */
export function canGuidedProduceStructure(rungs: StructurePracticeRungs | undefined): boolean {
  if (!rungs?.exposed) return false;
  return rungs.completion || rungs.build;
}

/**
 * Transferência: só depois de produção guiada da mesma estrutura.
 * Completion/build já são pré-requisito da produção guiada.
 */
export function canTransferStructure(rungs: StructurePracticeRungs | undefined): boolean {
  return Boolean(rungs?.exposed && rungs.guidedProduction && (rungs.completion || rungs.build));
}

/** Produção aberta de um objetivo: já produziu com apoio ao menos um frame do goal. */
export function canOpenProduceGoal(
  goal: CommunicativeGoal,
  exposure: StructureExposureMap
): boolean {
  return SENTENCE_FRAMES.some(
    (frame) => frame.goal === goal && exposure.get(frame.id)?.guidedProduction
  );
}

/**
 * Marca exposição a partir de um texto (foco ou passo autoral).
 * `rung` diz qual degrau este encontro conta.
 */
export function creditStructureText(
  map: StructureExposureMap,
  hanzi: string | undefined,
  rung: keyof StructurePracticeRungs = "exposed"
): void {
  if (!hanzi) return;
  for (const frame of framesMatchingSentence(hanzi)) {
    const rungs = ensureStructureRungs(map, frame.id);
    rungs.exposed = true;
    if (rung !== "exposed") rungs[rung] = true;
  }
}

/** Credita o frame quando o chunk de âncora entra no foco E casa com o padrão. */
export function creditStructureAnchorChunk(map: StructureExposureMap, chunkId: string): void {
  const chunk = chunkById.get(chunkId);
  if (!chunk) return;
  for (const frame of SENTENCE_FRAMES) {
    if (frame.anchorChunkId !== chunkId) continue;
    // Compartilhar âncora (ex.: woyao em niyaoma) não expõe o degrau avançado:
    // só a estrutura cujo esqueleto a frase-âncora realiza.
    if (!sentenceMatchesFrame(chunk.hanzi, frame)) continue;
    ensureStructureRungs(map, frame.id).exposed = true;
  }
}

/**
 * Ordem pedagógica: primeiro contato com produção/transferência deve usar
 * frames curtos e âncoras próximas (我要 ___), não pergunta com 吗 nem
 * recusa/negação avançada.
 * Quanto menor o número, mais cedo o frame aparece.
 */
const FRAME_INTRO_EASE: Record<string, number> = {
  // Pedido afirmativo primeiro (1 slot: objeto) — o exemplo canônico de guided.
  frame_woyao: 0,
  frame_woxianghe: 1,
  frame_woxiangchi: 2,
  frame_woyaomai: 3,
  frame_zainali: 4,
  // Sujeito 我→你 e cortesia: só depois da afirmação base.
  frame_niyao: 6,
  frame_qingwenzainali: 7,
  // Negação: guided, mas cognitivamente mais pesada que trocar o objeto.
  frame_wobuhe: 10,
  frame_wobuchi: 11,
  // Pergunta com 吗: último degrau da escada 要.
  frame_niyaoma: 14,
};

function frameEase(frameId: string): number {
  return FRAME_INTRO_EASE[frameId] ?? 20;
}

function sortByPedagogicalEase(tasks: FrameTask[]): FrameTask[] {
  return [...tasks].sort((a, b) => {
    const rung =
      PRODUCTION_ASSIST_RANK[a.transferAssist] - PRODUCTION_ASSIST_RANK[b.transferAssist];
    if (rung !== 0) return rung;
    const ease = frameEase(a.frameId) - frameEase(b.frameId);
    if (ease !== 0) return ease;
    return a.id.localeCompare(b.id);
  });
}

export const FRAME_COMMUNICATIVE_DOMAINS: Record<string, readonly CommunicativeDomain[]> = {
  frame_woyao: ["restaurant", "shopping"],
  frame_woxianghe: ["restaurant"],
  frame_zainali: ["directions", "hotel", "airport"],
  frame_qingwenzainali: ["directions", "hotel"],
  frame_woxiangchi: ["restaurant"],
  frame_woxiangmai: ["shopping"],
  frame_duoshaoqian: ["shopping"],
  frame_woyouge: ["study"],
  frame_woxihuan: ["restaurant", "shopping"],
  frame_woqu: ["directions", "airport", "taxi"],
  frame_woyaomai: ["shopping"],
  frame_niyao: ["restaurant"],
  frame_niyaoma: ["restaurant"],
  frame_wobuhe: ["restaurant"],
  frame_wobuchi: ["restaurant"],
  frame_huijia_action: ["time", "work"],
  frame_zuofeijiqu: ["airport", "taxi"],
  frame_wozai: ["work", "study", "health"],
  frame_wo_le: ["health", "time"],
};

const DOMAIN_HINTS: { domain: CommunicativeDomain; needles: string[] }[] = [
  { domain: "restaurant", needles: ["restaur", "comida", "cardapio", "menu", "cha", "cafe"] },
  { domain: "shopping", needles: ["compra", "loja", "preco", "mercado"] },
  { domain: "hotel", needles: ["hotel", "quarto"] },
  { domain: "airport", needles: ["aeroporto", "airport", "aviao", "feiji", "passaporte"] },
  { domain: "taxi", needles: ["taxi", "chuzuche", "uber"] },
  { domain: "directions", needles: ["direc", "onde", "caminho", "mapa", "estacao"] },
  { domain: "work", needles: ["trabalho", "rotina", "escritorio"] },
  { domain: "study", needles: ["estudo", "aula", "escola", "microtexto", "leitura"] },
  { domain: "health", needles: ["saude", "hospital", "medico", "doente"] },
  { domain: "time", needles: ["horario", "hora", "relogio", "ontem", "amanha"] },
];

export function inferCommunicativeDomain(lessonId: string, title = ""): CommunicativeDomain | undefined {
  const blob = `${lessonId} ${title}`.toLocaleLowerCase("pt-BR");
  for (const { domain, needles } of DOMAIN_HINTS) {
    if (needles.some((needle) => blob.includes(needle))) return domain;
  }
  return undefined;
}

export interface FramePickOptions {
  priorTransferredFrameIds?: ReadonlySet<string>;
  usedFrameIds?: ReadonlySet<string>;
  usedTargetHanzi?: ReadonlySet<string>;
  /** Exposição: frames sem produção guiada ganham prioridade para destravar. */
  needsGuidedProduction?: ReadonlySet<string>;
  lessonSalt?: number;
  domain?: CommunicativeDomain;
}

/**
 * Escolhe uma tarefa cobrindo frames ainda não usados, frases inéditas e o
 * domínio da lição. A facilidade pedagógica continua como desempate, não como
 * trava — senão só 我要/我有 aparecem no plano real.
 */
function uniqueSorted(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

/**
 * Round-robin estável: frames que ainda precisam de produção guiada
 * entram primeiro; o salt da lição percorre o conjunto em vez de
 * sempre cair em 我要/我有.
 */
function preferredFrameId(tasks: readonly FrameTask[], options: FramePickOptions): string | undefined {
  if (tasks.length === 0) return undefined;
  const salt = Math.abs(options.lessonSalt ?? 0);
  const needy = uniqueSorted(
    tasks.filter((task) => options.needsGuidedProduction?.has(task.frameId)).map((task) => task.frameId)
  );
  const unused = uniqueSorted(
    tasks.filter((task) => !options.usedFrameIds?.has(task.frameId)).map((task) => task.frameId)
  );
  const freshTransfer = uniqueSorted(
    tasks
      .filter((task) => !options.priorTransferredFrameIds?.has(task.frameId))
      .map((task) => task.frameId)
  );
  const domainMatch = uniqueSorted(
    tasks
      .filter((task) => options.domain && (FRAME_COMMUNICATIVE_DOMAINS[task.frameId] ?? []).includes(options.domain))
      .map((task) => task.frameId)
  );
  const all = uniqueSorted(tasks.map((task) => task.frameId));
  const rotation =
    needy.length > 0
      ? needy
      : unused.length > 0
        ? unused
        : freshTransfer.length > 0
          ? freshTransfer
          : domainMatch.length > 0
            ? domainMatch
            : all;
  return rotation[salt % rotation.length];
}

export function pickFrameTask(tasks: readonly FrameTask[], options: FramePickOptions = {}): FrameTask | undefined {
  if (tasks.length === 0) return undefined;
  const salt = Math.abs(options.lessonSalt ?? 0);
  const preferred = preferredFrameId(tasks, options);
  const scored = tasks.map((task, index) => {
    let score = 0;
    if (preferred && task.frameId === preferred) score += 48;
    if (options.usedFrameIds?.has(task.frameId)) score -= 80;
    if (options.needsGuidedProduction?.has(task.frameId)) score += 28;
    else if (options.priorTransferredFrameIds?.has(task.frameId)) score -= 18;
    else score += 12;
    const target = cleanSentence(task.targetHanzi);
    if (target && options.usedTargetHanzi?.has(target)) score -= 50;
    else if (task.isNovelCombination) score += 14;
    const domains = FRAME_COMMUNICATIVE_DOMAINS[task.frameId] ?? [];
    if (options.domain && domains.includes(options.domain)) score += 16;
    score -= frameEase(task.frameId) * 0.35;
    score -= PRODUCTION_ASSIST_RANK[task.transferAssist];
    score += ((index + salt * 3) % 11) * 0.05;
    return { task, score, index };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored[0]?.task;
}

export function pickOpenProductionTask<T extends { goal: CommunicativeGoal }>(
  tasks: readonly T[],
  options: { lessonSalt?: number; usedGoals?: ReadonlySet<CommunicativeGoal> } = {}
): T | undefined {
  if (tasks.length === 0) return undefined;
  const salt = Math.abs(options.lessonSalt ?? 0);
  const declared = OPEN_PRODUCTION_GOALS.map((copy) => copy.goal);
  const preferredDeclared = declared[salt % declared.length];
  const unused = tasks.filter((task) => !options.usedGoals?.has(task.goal));
  const pool = unused.length > 0 ? unused : tasks;
  return (
    pool.find((task) => task.goal === preferredDeclared) ??
    pool[salt % pool.length] ??
    tasks[0]
  );
}

/** Frames cujos glifos de âncora+padrão mínimo já estão disponíveis. */
function framePracticable(frameId: string, seenGlyphs: ReadonlySet<string>): boolean {
  return FRAME_TASKS.some(
    (task) =>
      task.frameId === frameId && task.requiredGlyphs.every((glyph) => seenGlyphs.has(glyph))
  );
}

/**
 * Degrau máximo permitido nesta tentativa.
 * Tentativa 0 (primeira): só guided. Depois sobe um degrau por vez.
 */
export function maxTransferAssistForAttempt(attemptNumber = 0): ProductionAssist {
  if (attemptNumber <= 0) return "guided";
  if (attemptNumber === 1) return "supported";
  return "question";
}

/** A tarefa pode aparecer como transferência neste conjunto de glifos/degrau? */
export function isTransferTaskEligible(
  task: FrameTask,
  seenGlyphs: ReadonlySet<string>,
  maxAssist: ProductionAssist = "question",
  structureExposure?: StructureExposureMap
): boolean {
  if (PRODUCTION_ASSIST_RANK[task.transferAssist] > PRODUCTION_ASSIST_RANK[maxAssist]) {
    return false;
  }
  if (task.transferRequiresMa && !seenGlyphs.has("吗")) return false;
  for (const requiredId of task.transferRequiresFrameIds) {
    if (!framePracticable(requiredId, seenGlyphs)) return false;
  }
  if (structureExposure && !canTransferStructure(structureExposure.get(task.frameId))) {
    return false;
  }
  return true;
}

/**
 * Produção livre: a frase alvo JÁ foi ensinada, mas aqui o aluno a produz do
 * zero — sem banco, sem alternativas, sem tradução na tela. Só a situação.
 * Com `structureExposure`, só libera frames já expostos + completion/build.
 */
export function productionTasksFor(
  seenGlyphs: ReadonlySet<string>,
  options: { limit?: number; structureExposure?: StructureExposureMap } = {}
): FrameTask[] {
  const exposure = options.structureExposure;
  const available = sortByPedagogicalEase(
    availableTasks(seenGlyphs)
      .filter((task) => !task.isNovelCombination)
      .filter(
        (task) => !exposure || canGuidedProduceStructure(exposure.get(task.frameId))
      )
  );
  return options.limit ? available.slice(0, options.limit) : available;
}

/**
 * Transferência: mesma estrutura, combinação que o currículo NUNCA mostrou.
 * Escada guided → supported → question + prerequisites de estrutura:
 * exposição → completion/build → produção guiada → só então transferir.
 */
export function transferTasksFor(
  seenGlyphs: ReadonlySet<string>,
  options: {
    limit?: number;
    extraTaughtSentences?: ReadonlySet<string>;
    maxAssist?: ProductionAssist;
    /** Se true, devolve só o degrau mais baixo elegível (1ª ocorrência). */
    preferLowestRung?: boolean;
    structureExposure?: StructureExposureMap;
  } = {}
): FrameTask[] {
  const taught = options.extraTaughtSentences;
  const maxAssist = options.maxAssist ?? "question";
  const exposure = options.structureExposure;
  const available = sortByPedagogicalEase(
    availableTasks(seenGlyphs)
      .filter((task) => task.isNovelCombination)
      .filter((task) => !taught || !taught.has(cleanSentence(task.targetHanzi)))
      .filter((task) => isTransferTaskEligible(task, seenGlyphs, maxAssist, exposure))
  );
  if (available.length === 0) return [];
  const pool =
    options.preferLowestRung === false
      ? available
      : (() => {
          const minRank = Math.min(...available.map((task) => PRODUCTION_ASSIST_RANK[task.transferAssist]));
          return available.filter((task) => PRODUCTION_ASSIST_RANK[task.transferAssist] === minRank);
        })();
  return options.limit ? pool.slice(0, options.limit) : pool;
}

// ————————————————————————————————————————————————————————————————
// 2. Produção aberta: objetivo sem alvo
// ————————————————————————————————————————————————————————————————

/**
 * Até aqui toda produção tinha UM item combinado ("diga que quer chá"), e o
 * app conferia contra a frase esperada. Isso treina montar a frase, mas não
 * treina escolher o que dizer — e escolher é metade de falar.
 *
 * Na produção aberta o enunciado dá só o OBJETIVO e a situação; o conteúdo é
 * do aluno. Qualquer realização daquele objetivo que ele já tenha condições
 * de escrever conta como certa. Continua sendo verificável: o conjunto de
 * respostas vem inteiro dos frames, então nada aqui aceita mandarim que o app
 * não saiba que é correto.
 */
export interface OpenProductionGoalCopy {
  goal: CommunicativeGoal;
  situationPt: string;
  /** Lembrete de que a escolha é do aluno — nunca sugere um item específico. */
  hintPt: string;
}

/** Objetivos que funcionam sem item combinado. Contar, por exemplo, não funciona:
 *  o enunciado teria que dizer o número, e aí o alvo volta a ser único. */
export const OPEN_PRODUCTION_GOALS: OpenProductionGoalCopy[] = [
  {
    goal: "request_item",
    situationPt: "No restaurante, peça algo para comer ou beber.",
    hintPt: "Qualquer pedido que você já saiba fazer serve.",
  },
  {
    goal: "ask_location",
    situationPt: "Você se perdeu. Pergunte onde fica um lugar.",
    hintPt: "Escolha um lugar que você já sabe dizer.",
  },
  {
    goal: "ask_price",
    situationPt: "Na loja, pergunte o preço de alguma coisa.",
    hintPt: "Pode ser qualquer item que você já saiba nomear.",
  },
  {
    goal: "state_preference",
    situationPt: "Alguém pergunta do que você gosta. Responda.",
    hintPt: "Use as palavras que você já tem.",
  },
  {
    goal: "state_destination",
    situationPt: "Um amigo pergunta para onde você vai. Responda.",
    hintPt: "Escolha um destino que você já sabe dizer.",
  },
  {
    goal: "buy_item",
    situationPt: "Na loja, diga ao vendedor o que você quer comprar.",
    hintPt: "Você escolhe o que comprar.",
  },
  {
    goal: "offer_item",
    situationPt: "Uma visita chegou. Ofereça alguma coisa.",
    hintPt: "Ofereça o que quiser — perguntando se a pessoa aceita.",
  },
  {
    goal: "refuse_food",
    situationPt: "No restaurante, diga uma comida que você não come.",
    hintPt: "Escolha a comida que quiser recusar.",
  },
  {
    goal: "chain_actions",
    situationPt: "Conte o que você vai fazer ao chegar em casa.",
    hintPt: "Ações na ordem real — sem 'para' no meio.",
  },
  {
    goal: "travel_by",
    situationPt: "Conte como você vai chegar a algum lugar.",
    hintPt: "Meio primeiro, destino depois.",
  },
  {
    goal: "state_ongoing",
    situationPt: "Alguém pergunta o que você está fazendo agora. Responda.",
    hintPt: "Qualquer ação que você já saiba serve.",
  },
  {
    goal: "state_change",
    situationPt: "Conte como você está agora, ou o que acabou de mudar.",
    hintPt: "A partícula no fim marca a mudança.",
  },
];

export interface OpenProductionTask {
  id: string;
  goal: CommunicativeGoal;
  situationPt: string;
  hintPt: string;
  /** Tudo que conta como certo (hànzì com e sem pontuação, e pinyin). */
  accepts: string[];
  /** Realizações em hànzì, para mostrar DEPOIS da resposta. */
  examples: { hanzi: string; pinyin: string }[];
}

/**
 * Uma produção aberta só existe quando o aluno tem escolha real: com menos de
 * três realizações possíveis, "diga o que quiser" é uma pergunta de alvo único
 * disfarçada.
 */
const MIN_OPEN_ANSWERS = 3;

export function openProductionTasksFor(
  seenGlyphs: ReadonlySet<string>,
  options: { limit?: number; structureExposure?: StructureExposureMap } = {}
): OpenProductionTask[] {
  const reachable = availableTasks(seenGlyphs);
  const exposure = options.structureExposure;
  const tasks: OpenProductionTask[] = [];

  for (const copy of OPEN_PRODUCTION_GOALS) {
    if (exposure && !canOpenProduceGoal(copy.goal, exposure)) continue;
    const forGoal = reachable
      .filter((task) => task.goal === copy.goal)
      .sort((a, b) => a.id.localeCompare(b.id));
    // Uma realização por frase distinta: 我要茶 e 我想喝茶 são escolhas
    // diferentes; 我要茶 gerado por dois caminhos não é.
    const byText = new Map<string, FrameTask>();
    for (const task of forGoal) {
      const key = cleanSentence(task.targetHanzi);
      if (!byText.has(key)) byText.set(key, task);
    }
    const distinct = [...byText.values()];
    if (distinct.length < MIN_OPEN_ANSWERS) continue;

    tasks.push({
      id: `open_${copy.goal}`,
      goal: copy.goal,
      situationPt: copy.situationPt,
      hintPt: copy.hintPt,
      accepts: distinct.flatMap((task) => [
        task.targetHanzi,
        cleanSentence(task.targetHanzi),
        task.targetPinyin,
      ]),
      examples: distinct.map((task) => ({ hanzi: task.targetHanzi, pinyin: task.targetPinyin })),
    });
  }

  return options.limit ? tasks.slice(0, options.limit) : tasks;
}

// ————————————————————————————————————————————————————————————————
// 3. Reparo conversacional
// ————————————————————————————————————————————————————————————————

/**
 * O que o aluno faz quando a comunicação quebra. Aprender uma língua também
 * é saber continuar depois do mal-entendido — sem isso, a primeira conversa
 * real termina no primeiro 什么？.
 */
export type RepairStrategy =
  | "repeat"
  | "simplify"
  | "ask_repeat"
  | "admit_not_understood"
  | "say_speak_little";

export const REPAIR_STRATEGY_LABELS: Record<RepairStrategy, string> = {
  repeat: "Repetir a mesma frase, com calma",
  simplify: "Dizer a mesma coisa de forma mais curta",
  ask_repeat: "Pedir para a pessoa falar de novo",
  admit_not_understood: "Avisar que você não entendeu",
  say_speak_little: "Explicar que você fala pouco chinês",
};

/** Quem não entendeu quem — muda completamente o reparo correto. */
export type RepairDirection = "npc_did_not_understand" | "learner_did_not_understand";

export interface RepairMove {
  strategy: RepairStrategy;
  /** Realização em mandarim. Vazio em "repeat"/"simplify": vem da fala do aluno. */
  chunkId?: string;
  /** Por que este movimento resolve a situação. */
  whyPt: string;
}

export interface RepairSituation {
  id: string;
  direction: RepairDirection;
  /** Fala do personagem que dispara o reparo (chunk do corpus). */
  npcChunkId: string;
  /** Pergunta feita ao aluno antes de ele produzir. */
  promptPt: string;
  /** Movimentos corretos, em ordem de preferência. */
  correct: RepairMove[];
  /** Movimentos plausíveis mas errados AQUI — viram distratores honestos. */
  wrong: { strategy: RepairStrategy; whyPt: string }[];
}

export const REPAIR_SITUATIONS: RepairSituation[] = [
  {
    id: "repair_npc_lost",
    direction: "npc_did_not_understand",
    npcChunkId: "tingbudong",
    promptPt: "A pessoa não entendeu o que você disse. O que fazer agora?",
    correct: [
      { strategy: "repeat", whyPt: "Repetir com calma resolve a maior parte dos mal-entendidos — o problema costuma ser velocidade, não vocabulário." },
      { strategy: "simplify", whyPt: "Encurtar a frase para o essencial é o segundo recurso: menos palavras, menos ruído." },
    ],
    wrong: [
      { strategy: "ask_repeat", whyPt: "Quem não entendeu foi a outra pessoa. Pedir que ELA repita devolve o problema para o lugar errado." },
      { strategy: "admit_not_understood", whyPt: "Você entendeu — foi a sua fala que não chegou. Dizer 我听不懂 aqui confunde ainda mais." },
    ],
  },
  {
    id: "repair_learner_lost",
    direction: "learner_did_not_understand",
    npcChunkId: "nishinaiguoren",
    promptPt: "A pessoa falou rápido demais e você não entendeu. O que fazer agora?",
    correct: [
      { strategy: "ask_repeat", chunkId: "qingzaishuoyibian", whyPt: "请再说一遍 é o pedido educado e universal: mantém a conversa viva sem fingir que entendeu." },
      { strategy: "admit_not_understood", chunkId: "tingbudong", whyPt: "我听不懂 é honesto e faz o interlocutor desacelerar — muito melhor do que responder qualquer coisa." },
      { strategy: "say_speak_little", chunkId: "wohuishuoyidian", whyPt: "我会说一点中文 avisa o nível e quase sempre faz a outra pessoa simplificar." },
    ],
    wrong: [
      { strategy: "repeat", whyPt: "Repetir a SUA frase não ajuda: o problema foi a fala da outra pessoa." },
      { strategy: "simplify", whyPt: "Simplificar o que você disse não recupera o que você não ouviu." },
    ],
  },
];

/** Deslocamento estável a partir de uma chave — mesmo id, mesma ordem, sempre. */
function stableRotation(key: string, size: number): number {
  if (size <= 1) return 0;
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) % 100003;
  return hash % size;
}

export interface RepairTask {
  id: string;
  direction: RepairDirection;
  promptPt: string;
  npc: { hanzi: string; pinyin: string; meaningPt: string };
  /** Estratégia certa nesta rodada. */
  strategy: RepairStrategy;
  /** Estratégias oferecidas (a certa incluída), em ordem estável. */
  strategyOptions: RepairStrategy[];
  /** Frase que o aluno precisa produzir depois de escolher o movimento. */
  targetHanzi: string;
  targetPinyin: string;
  accepts: string[];
  whyPt: string;
  requiredGlyphs: string[];
}

/**
 * Reparos disponíveis. `utterance` é o que o aluno acabou de dizer na cena —
 * quando existe, habilita os movimentos "repetir" e "simplificar", que não
 * têm frase própria: a frase é a dele.
 */
export function repairTasksFor(
  seenGlyphs: ReadonlySet<string>,
  options: {
    utterance?: { hanzi: string; pinyin: string };
    /** Núcleo curto da fala do aluno, para o movimento "simplificar". */
    utteranceCore?: { hanzi: string; pinyin: string };
    limit?: number;
  } = {}
): RepairTask[] {
  const knows = (text: string) => [...cleanSentence(text)].every((glyph) => seenGlyphs.has(glyph));
  const tasks: RepairTask[] = [];

  for (const situation of REPAIR_SITUATIONS) {
    const npcChunk = chunkById.get(situation.npcChunkId);
    if (!npcChunk || !knows(npcChunk.hanzi)) continue;

    for (const move of situation.correct) {
      let target: { hanzi: string; pinyin: string } | undefined;
      if (move.chunkId) {
        const chunk = chunkById.get(move.chunkId);
        if (chunk) target = { hanzi: chunk.hanzi, pinyin: chunk.pinyin };
      } else if (move.strategy === "repeat") {
        target = options.utterance;
      } else if (move.strategy === "simplify") {
        target = options.utteranceCore;
      }
      if (!target?.hanzi || !knows(target.hanzi)) continue;

      // Distratores: os movimentos errados desta situação, mais os corretos
      // que não são o desta rodada — todos plausíveis, nenhum absurdo.
      const others = [
        ...situation.wrong.map((item) => item.strategy),
        ...situation.correct.filter((item) => item.strategy !== move.strategy).map((item) => item.strategy),
      ];
      const ordered = [move.strategy, ...others.filter((item) => item !== move.strategy)].slice(0, 4);
      if (ordered.length < 3) continue;
      // A certa não pode ser sempre a primeira: rotação estável pelo id evita
      // que o aluno aprenda a posição em vez da estratégia.
      const rotation = stableRotation(`${situation.id}:${move.strategy}`, ordered.length);
      const strategyOptions = [...ordered.slice(rotation), ...ordered.slice(0, rotation)];

      const bare = cleanSentence(target.hanzi);
      tasks.push({
        id: `${situation.id}__${move.strategy}`,
        direction: situation.direction,
        promptPt: situation.promptPt,
        npc: { hanzi: npcChunk.hanzi, pinyin: npcChunk.pinyin, meaningPt: npcChunk.meaningPt },
        strategy: move.strategy,
        strategyOptions,
        targetHanzi: target.hanzi,
        targetPinyin: target.pinyin,
        accepts: [bare, target.pinyin],
        whyPt: move.whyPt,
        requiredGlyphs: [...bare],
      });
    }
  }

  return options.limit ? tasks.slice(0, options.limit) : tasks;
}
