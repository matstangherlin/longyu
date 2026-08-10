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

const HANZI_ONLY_RE = /^[㐀-鿿豈-﫿]+$/u;
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

export interface SentenceFrame {
  id: string;
  /** Nome da estrutura em pt-BR, para relatórios e para a correção. */
  labelPt: string;
  /** Como a estrutura aparece na tela da transferência: "我要 ___". */
  patternPt: string;
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
  /** A regra que a estrutura carrega — é isto que a transferência prova. */
  grammarNotePt: string;
  fillers: FrameFiller[];
  quantifiers?: FrameQuantifier[];
  /**
   * Outros frames cujo resultado também responde à mesma situação. O aluno
   * não pode ser punido por produzir outra frase correta: 我想喝茶 e 我要茶
   * pedem a mesma coisa.
   */
  alsoAcceptFrameIds?: string[];
}

/**
 * Frames curados. Cada um tem âncora real no currículo — a estrutura já foi
 * ensinada em alguma lição, e é isso que autoriza cobrar produção livre dela.
 */
export const SENTENCE_FRAMES: SentenceFrame[] = [
  {
    id: "frame_woyao",
    labelPt: "pedir uma coisa",
    patternPt: "我要 ___",
    prefix: "我要",
    prefixPinyin: "wǒ yào",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woyao",
    situationTemplatePt: "Você está pedindo no balcão. Diga que quer {item}.",
    grammarNotePt: "要 é o pedido direto: 我要 + o que você quer. Nada de 是 aqui.",
    alsoAcceptFrameIds: ["frame_woxianghe"],
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
    labelPt: "dizer o que quer beber",
    patternPt: "我想喝 ___",
    prefix: "我想喝",
    prefixPinyin: "wǒ xiǎng hē",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woxianghe",
    situationTemplatePt: "Você está com sede. Diga que quer beber {item}.",
    grammarNotePt: "想 é a vontade ('quero/queria'), e o verbo vem logo depois: 想喝 + bebida.",
    alsoAcceptFrameIds: ["frame_woyao"],
    fillers: [
      { vocabId: "v_shui", promptPt: "água" },
      { vocabId: "v_cha", promptPt: "chá" },
      { vocabId: "v_niunai", promptPt: "leite" },
      { vocabId: "v_reshui", promptPt: "água quente" },
    ],
  },
  {
    id: "frame_zainali",
    labelPt: "perguntar onde algo fica",
    patternPt: "___ 在哪里？",
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
    id: "frame_duoshaoqian",
    labelPt: "perguntar o preço",
    patternPt: "___ 多少钱？",
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
    labelPt: "dizer quantos você tem",
    patternPt: "我有 ___ 个 ___",
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
    labelPt: "dizer do que você gosta",
    patternPt: "我喜欢 ___",
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
    labelPt: "dizer para onde você vai",
    patternPt: "我去 ___",
    prefix: "我去",
    prefixPinyin: "wǒ qù",
    suffix: "。",
    suffixPinyin: ".",
    anchorChunkId: "woquxuexiao",
    situationTemplatePt: "Um amigo pergunta onde você vai agora. Responda que vai {item}.",
    grammarNotePt: "去 já significa 'ir a' — o destino vem colado, sem 到 no meio.",
    fillers: [
      { vocabId: "v_chaoshi", promptPt: "ao supermercado" },
      { vocabId: "v_yiyuan", promptPt: "ao hospital" },
      { vocabId: "v_yinhang", promptPt: "ao banco" },
      { vocabId: "v_huochezhan", promptPt: "à estação de trem" },
    ],
  },
  {
    id: "frame_woyaomai",
    labelPt: "dizer o que quer comprar",
    patternPt: "我要买 ___",
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
    labelPt: "oferecer alguma coisa",
    patternPt: "你要 ___ 吗？",
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
    labelPt: "recusar uma bebida",
    patternPt: "我不喝 ___",
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
    labelPt: "recusar uma comida",
    patternPt: "我不吃 ___",
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
  frameLabelPt: string;
  patternPt: string;
  /** Enunciado em pt-BR. Nunca contém hànzì: o aluno tem que produzir. */
  situationPt: string;
  targetHanzi: string;
  targetPinyin: string;
  /** Respostas gramaticalmente válidas além do alvo (frases irmãs, sem pontuação, pinyin). */
  accepts: string[];
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

function frameTasks(frame: SentenceFrame): FrameTask[] {
  const anchorChunk = chunkById.get(frame.anchorChunkId);
  if (!anchorChunk) return [];
  const quantifiers: (FrameQuantifier | null)[] = frame.quantifiers?.length ? frame.quantifiers : [null];
  const tasks: FrameTask[] = [];

  for (const filler of frame.fillers) {
    const entry = vocabById.get(filler.vocabId);
    if (!entry || !HANZI_ONLY_RE.test(entry.hanzi)) continue;
    for (const quantifier of quantifiers) {
      const targetHanzi = `${frame.prefix}${quantifier?.hanzi ?? ""}${entry.hanzi}${frame.suffix}`;
      const targetPinyin = joinPinyin(
        frame.prefixPinyin,
        quantifier?.pinyin ?? "",
        entry.pinyin,
        frame.suffixPinyin
      );
      const bare = cleanSentence(targetHanzi);
      const itemPt = quantifier?.singular ? filler.promptSingularPt ?? filler.promptPt : filler.promptPt;
      const situationPt = frame.situationTemplatePt
        .replace("{item}", itemPt)
        .replace("{qty}", quantifier?.promptPt ?? "");
      tasks.push({
        id: `${frame.id}__${filler.vocabId}${quantifier ? `__${quantifier.pinyin.replace(/\s+/g, "")}` : ""}`,
        frameId: frame.id,
        frameLabelPt: frame.labelPt,
        patternPt: frame.patternPt,
        situationPt,
        targetHanzi,
        targetPinyin,
        accepts: [bare, targetPinyin],
        grammarNotePt: frame.grammarNotePt,
        anchor: { hanzi: anchorChunk.hanzi, pinyin: anchorChunk.pinyin, meaningPt: anchorChunk.meaningPt },
        isNovelCombination: !CORPUS_SENTENCES.has(bare),
        requiredGlyphs: [...bare],
      });
    }
  }
  return tasks;
}

/**
 * Frases irmãs: quando dois frames respondem à mesma situação, a resposta de
 * um vale para o outro. É o que impede o app de punir 我要茶 quando pediu
 * "diga que quer beber chá" — as duas frases funcionam no balcão.
 */
function withSiblingAnswers(tasks: FrameTask[]): FrameTask[] {
  const byFrameAndVocab = new Map<string, FrameTask>();
  for (const task of tasks) byFrameAndVocab.set(task.id, task);
  return tasks.map((task) => {
    const frame = SENTENCE_FRAMES.find((candidate) => candidate.id === task.frameId);
    if (!frame?.alsoAcceptFrameIds?.length) return task;
    const [, vocabPart] = task.id.split("__");
    const siblings = frame.alsoAcceptFrameIds
      .map((siblingId) => byFrameAndVocab.get(`${siblingId}__${vocabPart}`))
      .filter((sibling): sibling is FrameTask => Boolean(sibling));
    if (siblings.length === 0) return task;
    return {
      ...task,
      accepts: [
        ...task.accepts,
        ...siblings.flatMap((sibling) => [sibling.targetHanzi, cleanSentence(sibling.targetHanzi), sibling.targetPinyin]),
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
// 2. Reparo conversacional
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
