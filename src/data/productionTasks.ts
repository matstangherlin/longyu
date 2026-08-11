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
  | "state_change";

/** Microcopy amigável do objetivo comunicativo (produção / transferência). */
export const COMMUNICATIVE_GOAL_LABELS: Record<CommunicativeGoal, string> = {
  request_item: "Peça o que você quer",
  ask_location: "Pergunte onde fica",
  ask_price: "Pergunte o preço",
  state_preference: "Diga o que você gosta",
  state_destination: "Diga para onde vai",
  buy_item: "Diga o que quer comprar",
  offer_item: "Ofereça algo a alguém",
  refuse_drink: "Recuse uma bebida",
  refuse_food: "Recuse uma comida",
  count_possession: "Diga quantos você tem",
  chain_actions: "Combine duas ações em sequência",
  travel_by: "Diga como vai viajar",
  state_ongoing: "Diga o que está acontecendo agora",
  state_change: "Diga uma mudança / conclusão",
};

/**
 * Papel de um slot na moldura da frase. É o STPVO-light: o aluno vê a ordem
 * (sujeito · tempo · lugar · verbo · objeto) em vez de só o buraco "___".
 */
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
    situationTemplatePt: "Você está pedindo no balcão. Diga que quer {item}.",
    grammarNotePt: "要 é o pedido direto: 我要 + o que você quer. Nada de 是 aqui.",
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
    grammarNotePt: "想 é a vontade ('quero/queria'), e o verbo vem logo depois: 想喝 + bebida.",
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
    anchorChunkId: "woxianghe",
    situationTemplatePt: "Você está com fome. Diga que quer comer {item}.",
    grammarNotePt: "Mesma estrutura de 想喝, trocando o verbo: 想 + verbo + o que você quer.",
    fillers: [
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
    grammarNotePt: "喜欢 vem direto depois do sujeito, sem preposição: 我喜欢 + coisa.",
    fillers: [
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
    grammarNotePt: "去 já significa 'ir a' — o destino vem colado, sem 到 no meio. Tempo (今天/明天) fica entre o sujeito e o verbo.",
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
    grammarNotePt: "要 + verbo é a intenção ('vou/quero fazer'): 要买 + coisa.",
    fillers: [
      { vocabId: "v_shu", promptPt: "um livro" },
      { vocabId: "v_piao", promptPt: "uma passagem" },
      { vocabId: "v_pingguo", promptPt: "maçãs" },
      { vocabId: "v_niunai", promptPt: "leite" },
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
    anchorChunkId: "wobuhui",
    situationTemplatePt: "Ofereceram {item} e você não quer. Recuse dizendo que não bebe isso.",
    grammarNotePt: "不 vem ANTES do verbo: 不喝, nunca 喝不.",
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
    anchorChunkId: "wobuhui",
    situationTemplatePt: "No restaurante, avise que você não come {item}.",
    grammarNotePt: "A negação fica grudada no verbo: 不吃 + comida.",
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
    grammarNotePt: "在 antes do verbo marca 'agora / em progresso': 在 + ação. O verbo não muda de forma.",
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
    grammarNotePt: "了 no fim marca mudança / conclusão — o verbo (ou estado) não se conjuga: 饿 → 我饿了, 回家 → 我回家了.",
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
        });
      }
    }
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
export const FRAME_TASKS: FrameTask[] = withSiblingAnswers(SENTENCE_FRAMES.flatMap(frameTasks));

function availableTasks(seenGlyphs: ReadonlySet<string>): FrameTask[] {
  return FRAME_TASKS.filter((task) => task.requiredGlyphs.every((glyph) => seenGlyphs.has(glyph)));
}

/**
 * Produção livre: a frase alvo JÁ foi ensinada, mas aqui o aluno a produz do
 * zero — sem banco, sem alternativas, sem tradução na tela. Só a situação.
 */
export function productionTasksFor(
  seenGlyphs: ReadonlySet<string>,
  options: { limit?: number } = {}
): FrameTask[] {
  const available = availableTasks(seenGlyphs)
    .filter((task) => !task.isNovelCombination)
    .sort((a, b) => a.id.localeCompare(b.id));
  return options.limit ? available.slice(0, options.limit) : available;
}

/**
 * Transferência: mesma estrutura, combinação que o currículo NUNCA mostrou.
 * Acertar aqui só é possível aplicando o padrão — é a prova de que o aluno
 * aprendeu a estrutura e não a frase.
 */
export function transferTasksFor(
  seenGlyphs: ReadonlySet<string>,
  options: { limit?: number; extraTaughtSentences?: ReadonlySet<string> } = {}
): FrameTask[] {
  const taught = options.extraTaughtSentences;
  const available = availableTasks(seenGlyphs)
    .filter((task) => task.isNovelCombination)
    .filter((task) => !taught || !taught.has(cleanSentence(task.targetHanzi)))
    .sort((a, b) => a.id.localeCompare(b.id));
  return options.limit ? available.slice(0, options.limit) : available;
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
    situationPt: "Você senta no restaurante e o garçom vem até a mesa. Peça alguma coisa para comer ou beber.",
    hintPt: "Qualquer pedido que você já saiba fazer serve — quem escolhe é você.",
  },
  {
    goal: "ask_location",
    situationPt: "Você está perdido numa cidade chinesa e precisa chegar a algum lugar. Pergunte onde fica.",
    hintPt: "Escolha um lugar que você já sabe dizer.",
  },
  {
    goal: "ask_price",
    situationPt: "Você está numa loja e uma coisa te interessa. Pergunte quanto custa.",
    hintPt: "Vale perguntar o preço de qualquer coisa que você já saiba nomear.",
  },
  {
    goal: "state_preference",
    situationPt: "Alguém que acabou de te conhecer pergunta do que você gosta. Responda.",
    hintPt: "Diga algo de que você goste de verdade, com as palavras que já tem.",
  },
  {
    goal: "state_destination",
    situationPt: "Um amigo te encontra na rua e pergunta para onde você está indo. Responda.",
    hintPt: "Escolha um destino que você já sabe dizer.",
  },
  {
    goal: "buy_item",
    situationPt: "Você entra numa loja decidido a comprar alguma coisa. Diga ao vendedor o que quer.",
    hintPt: "Você escolhe o que comprar.",
  },
  {
    goal: "offer_item",
    situationPt: "Você recebe uma visita em casa. Ofereça alguma coisa à pessoa.",
    hintPt: "Ofereça o que quiser, perguntando se a pessoa aceita.",
  },
  {
    goal: "refuse_food",
    situationPt: "No restaurante, avise que existe uma comida que você não come.",
    hintPt: "Escolha a comida que você quiser recusar.",
  },
  {
    goal: "chain_actions",
    situationPt: "Alguém pergunta o que você vai fazer ao chegar em casa. Conte a sequência.",
    hintPt: "Empilhe as ações na ordem em que acontecem — sem 'para' no meio.",
  },
  {
    goal: "travel_by",
    situationPt: "Conte como você vai chegar a algum lugar — o meio de transporte faz parte da frase.",
    hintPt: "Meio primeiro, destino depois: é a ordem do que acontece de verdade.",
  },
  {
    goal: "state_ongoing",
    situationPt: "Alguém pergunta o que você está fazendo neste momento. Responda.",
    hintPt: "Marque que a ação está acontecendo agora. Qualquer ação que você já saiba serve.",
  },
  {
    goal: "state_change",
    situationPt: "Conte uma mudança de estado — como você está agora, ou o que acabou de acontecer com você.",
    hintPt: "A partícula no fim marca a mudança. Escolha o estado que fizer sentido.",
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
  options: { limit?: number } = {}
): OpenProductionTask[] {
  const reachable = availableTasks(seenGlyphs);
  const tasks: OpenProductionTask[] = [];

  for (const copy of OPEN_PRODUCTION_GOALS) {
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
