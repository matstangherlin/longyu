/**
 * Piloto Pedagogia V3 / V3.1 — temas representativos:
 * - apresentacao/cumprimentos (l2, l3)
 * - restaurante/comida (l26b)
 * - lugares/transporte (p6-cidade-lugares, p7-imersao-estacao)
 * - China Real (p6-china-cidades, p6-china-ruas, p6-direcoes)
 *
 * Expansao lexical + passos por mastery pass. O restante da Jornada
 * continua no planner classico ate a expansao gradual (PED-050).
 */

import type { LessonStep, StepKind } from "./journey";
import type { MasteryPass } from "./masteryLoop";
import { isProductionOrTransferKind } from "./masteryLoop";

export const MASTERY_PILOT_LESSON_IDS = [
  "l2",
  "l3",
  "l26b",
  "p6-cidade-lugares",
  "p6-china-cidades",
  "p6-china-ruas",
  "p6-direcoes",
  "p7-imersao-estacao",
] as const;

export type MasteryPilotLessonId = (typeof MASTERY_PILOT_LESSON_IDS)[number];

export function isMasteryPilotLesson(lessonId: string): lessonId is MasteryPilotLessonId {
  return (MASTERY_PILOT_LESSON_IDS as readonly string[]).includes(lessonId);
}

export type VocabRole = "core" | "support" | "productive" | "receptive";

export interface LexicalItemSpec {
  ref: string;
  hanzi: string;
  pinyin?: string;
  meaningPt: string;
  role: VocabRole;
  /** Pass em que o item e introduzido (1–4). */
  introduceAtPass: MasteryPass;
}

export interface UnitLexicalTargets {
  lessonId: MasteryPilotLessonId;
  themePt: string;
  newVocabularyTarget: number;
  productiveVocabularyTarget: number;
  structuresTarget: string[];
  communicativeFunctions: string[];
  vocabulary: LexicalItemSpec[];
  /** Combinacoes estruturais novas esperadas (crescimento em rede). */
  networkChunks: string[];
}

export const PILOT_LEXICAL_TARGETS: Record<MasteryPilotLessonId, UnitLexicalTargets> = {
  l2: {
    lessonId: "l2",
    themePt: "Cumprimentos — Ola",
    newVocabularyTarget: 5,
    productiveVocabularyTarget: 3,
    structuresTarget: ["你好", "你好 + nome", "cumprimento situacional"],
    communicativeFunctions: ["cumprimentar", "iniciar contato"],
    vocabulary: [
      { ref: "chunk:nihao", hanzi: "你好", pinyin: "ni hao", meaningPt: "Ola", role: "core", introduceAtPass: 1 },
      { ref: "char:ni", hanzi: "你", pinyin: "ni", meaningPt: "voce", role: "core", introduceAtPass: 1 },
      { ref: "char:hao", hanzi: "好", pinyin: "hao", meaningPt: "bom; bem", role: "core", introduceAtPass: 1 },
      { ref: "char:wo", hanzi: "我", pinyin: "wo", meaningPt: "eu", role: "support", introduceAtPass: 2 },
      { ref: "char:jiao_call", hanzi: "叫", pinyin: "jiao", meaningPt: "chamar-se", role: "productive", introduceAtPass: 3 },
      { ref: "chunk:wojiao", hanzi: "我叫", pinyin: "wo jiao", meaningPt: "Eu me chamo...", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["你好", "你好，我叫...", "cumprimento em encontro"],
  },
  l3: {
    lessonId: "l3",
    themePt: "Cumprimentos — Tudo bem?",
    newVocabularyTarget: 6,
    productiveVocabularyTarget: 4,
    structuresTarget: ["你好吗？", "我很好", "你呢？"],
    communicativeFunctions: ["perguntar estado", "responder", "devolver pergunta"],
    vocabulary: [
      { ref: "chunk:nihaoma", hanzi: "你好吗？", pinyin: "ni hao ma?", meaningPt: "Tudo bem?", role: "core", introduceAtPass: 1 },
      { ref: "chunk:wohenhao", hanzi: "我很好", pinyin: "wo hen hao", meaningPt: "Estou bem", role: "core", introduceAtPass: 1 },
      { ref: "chunk:nine", hanzi: "你呢？", pinyin: "ni ne?", meaningPt: "E voce?", role: "core", introduceAtPass: 2 },
      { ref: "char:ma_question", hanzi: "吗", pinyin: "ma", meaningPt: "particula de pergunta", role: "support", introduceAtPass: 2 },
      { ref: "char:hen_very", hanzi: "很", pinyin: "hen", meaningPt: "muito; bem", role: "support", introduceAtPass: 2 },
      { ref: "char:ne_particle", hanzi: "呢", pinyin: "ne", meaningPt: "e quanto a...?", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["你好吗？", "我很好，你呢？", "mini dialogo de bem-estar"],
  },
  l26b: {
    lessonId: "l26b",
    themePt: "Restaurante / cardapio",
    newVocabularyTarget: 12,
    productiveVocabularyTarget: 6,
    structuresTarget: ["我要 + comida", "我想喝 + bebida", "多少钱", "买单"],
    communicativeFunctions: ["pedir comida", "pedir bebida", "perguntar preco", "pedir a conta"],
    vocabulary: [
      { ref: "char:fan_rice", hanzi: "饭", pinyin: "fan", meaningPt: "arroz; refeicao", role: "core", introduceAtPass: 1 },
      { ref: "char:cai_dish", hanzi: "菜", pinyin: "cai", meaningPt: "prato; verdura", role: "core", introduceAtPass: 1 },
      { ref: "char:shui", hanzi: "水", pinyin: "shui", meaningPt: "agua", role: "core", introduceAtPass: 1 },
      { ref: "char:cha_tea", hanzi: "茶", pinyin: "cha", meaningPt: "cha", role: "core", introduceAtPass: 1 },
      { ref: "char:he_drink", hanzi: "喝", pinyin: "he", meaningPt: "beber", role: "core", introduceAtPass: 2 },
      { ref: "char:chi_eat", hanzi: "吃", pinyin: "chi", meaningPt: "comer", role: "support", introduceAtPass: 2 },
      { ref: "char:yao", hanzi: "要", pinyin: "yao", meaningPt: "querer", role: "core", introduceAtPass: 2 },
      { ref: "chunk:caidan", hanzi: "菜单", pinyin: "caidan", meaningPt: "cardapio", role: "support", introduceAtPass: 2 },
      { ref: "chunk:fanguan", hanzi: "饭馆", pinyin: "fanguan", meaningPt: "restaurante", role: "support", introduceAtPass: 2 },
      { ref: "chunk:yibeicha", hanzi: "一杯茶", pinyin: "yi bei cha", meaningPt: "um copo de cha", role: "productive", introduceAtPass: 3 },
      { ref: "chunk:duoshaoqian", hanzi: "多少钱", pinyin: "duoshao qian", meaningPt: "quanto custa?", role: "productive", introduceAtPass: 3 },
      { ref: "chunk:maidan", hanzi: "买单", pinyin: "maidan", meaningPt: "pedir a conta", role: "productive", introduceAtPass: 4 },
      { ref: "chunk:woyaoshui", hanzi: "我要水", pinyin: "wo yao shui", meaningPt: "Quero agua", role: "productive", introduceAtPass: 3 },
      { ref: "chunk:woxiangheshui", hanzi: "我想喝水", pinyin: "wo xiang he shui", meaningPt: "Quero beber agua", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["我要水", "我想喝水", "你要苹果还是香蕉？", "pedir a conta"],
  },
  "p6-cidade-lugares": {
    lessonId: "p6-cidade-lugares",
    themePt: "Cidade e lugares",
    newVocabularyTarget: 10,
    productiveVocabularyTarget: 5,
    structuresTarget: ["X 在哪里？", "我去 + lugar"],
    communicativeFunctions: ["perguntar localizacao", "dizer destino"],
    vocabulary: [
      { ref: "chunk:chaoshizainali", hanzi: "超市在哪里？", role: "core", meaningPt: "Onde fica o supermercado?", introduceAtPass: 1 },
      { ref: "chunk:yinhangzainali", hanzi: "银行在哪里？", role: "core", meaningPt: "Onde fica o banco?", introduceAtPass: 1 },
      { ref: "chunk:yiyuanzainali", hanzi: "医院在哪里？", role: "core", meaningPt: "Onde fica o hospital?", introduceAtPass: 1 },
      { ref: "chunk:gongyuanzainali", hanzi: "公园在哪里？", role: "core", meaningPt: "Onde fica o parque?", introduceAtPass: 2 },
      { ref: "chunk:woquchaoshi", hanzi: "我去超市", role: "productive", meaningPt: "Vou ao supermercado", introduceAtPass: 3 },
      { ref: "chunk:woquyiyuan", hanzi: "我去医院", role: "productive", meaningPt: "Vou ao hospital", introduceAtPass: 3 },
      { ref: "chunk:zaina", hanzi: "在哪", role: "support", meaningPt: "onde?", introduceAtPass: 2 },
    ],
    networkChunks: ["超市在哪里？", "我去超市", "pedir direcao + destino"],
  },
  "p7-imersao-estacao": {
    lessonId: "p7-imersao-estacao",
    themePt: "Estacao / transporte",
    newVocabularyTarget: 10,
    productiveVocabularyTarget: 5,
    structuresTarget: ["车/票", "票多少钱", "地铁/火车", "酒店在哪里？"],
    communicativeFunctions: ["comprar bilhete", "perguntar preco", "achar hotel/estacao"],
    vocabulary: [
      { ref: "char:che", hanzi: "车", role: "core", meaningPt: "carro; veiculo", introduceAtPass: 1 },
      { ref: "char:piao_ticket", hanzi: "票", role: "core", meaningPt: "bilhete", introduceAtPass: 1 },
      { ref: "chunk:chezainali", hanzi: "车在哪里？", role: "core", meaningPt: "Onde esta o carro?", introduceAtPass: 1 },
      { ref: "chunk:woyaopiao", hanzi: "我要票", role: "productive", meaningPt: "Quero o bilhete", introduceAtPass: 2 },
      { ref: "chunk:piaoduoshaoqian", hanzi: "票多少钱？", role: "productive", meaningPt: "Quanto custa o bilhete?", introduceAtPass: 3 },
      { ref: "chunk:huochezhanzainali", hanzi: "火车站在哪里？", role: "support", meaningPt: "Onde fica a estacao?", introduceAtPass: 2 },
      { ref: "chunk:jiudianzainali", hanzi: "酒店在哪里？", role: "support", meaningPt: "Onde fica o hotel?", introduceAtPass: 2 },
      { ref: "chunk:ditie", hanzi: "地铁", role: "receptive", meaningPt: "metro", introduceAtPass: 2 },
      { ref: "chunk:huoche", hanzi: "火车", role: "receptive", meaningPt: "trem", introduceAtPass: 2 },
    ],
    networkChunks: ["我要票", "票多少钱？", "cena de compra na estacao"],
  },
  "p6-china-cidades": {
    lessonId: "p6-china-cidades",
    themePt: "China Real — cidades",
    newVocabularyTarget: 12,
    productiveVocabularyTarget: 6,
    structuresTarget: ["北京在哪里？", "北京在中国", "我去 + cidade", "我要去 + cidade", "我在 + cidade", "cidade + 火车站在哪里？"],
    communicativeFunctions: ["reconhecer cidade", "localizar", "dizer destino", "pedir estacao na cidade"],
    vocabulary: [
      { ref: "chunk:beijing", hanzi: "北京", pinyin: "Beijing", meaningPt: "Pequim", role: "core", introduceAtPass: 1 },
      { ref: "chunk:shanghai", hanzi: "上海", pinyin: "Shanghai", meaningPt: "Xangai", role: "core", introduceAtPass: 1 },
      { ref: "chunk:guangzhou", hanzi: "广州", pinyin: "Guangzhou", meaningPt: "Guangzhou", role: "core", introduceAtPass: 1 },
      { ref: "chunk:shenzhen", hanzi: "深圳", pinyin: "Shenzhen", meaningPt: "Shenzhen", role: "receptive", introduceAtPass: 1 },
      { ref: "chunk:zhongguo", hanzi: "中国", pinyin: "Zhongguo", meaningPt: "China", role: "support", introduceAtPass: 2 },
      { ref: "chunk:beijingzainali", hanzi: "北京在哪里？", role: "core", meaningPt: "Onde fica Pequim?", introduceAtPass: 2 },
      { ref: "chunk:beijingzaizhongguo", hanzi: "北京在中国。", role: "support", meaningPt: "Pequim fica na China", introduceAtPass: 2 },
      { ref: "chunk:woqubeijing", hanzi: "我去北京。", role: "productive", meaningPt: "Vou a Pequim", introduceAtPass: 3 },
      { ref: "chunk:woyaoqubeijing", hanzi: "我要去北京。", role: "productive", meaningPt: "Quero ir a Pequim", introduceAtPass: 3 },
      { ref: "chunk:woyaoqushanghai", hanzi: "我要去上海。", role: "productive", meaningPt: "Quero ir a Xangai", introduceAtPass: 3 },
      { ref: "chunk:wozaibeijing", hanzi: "我在北京。", role: "productive", meaningPt: "Estou em Pequim", introduceAtPass: 3 },
      { ref: "chunk:beijinghuochezhanzainali", hanzi: "北京火车站在哪里？", role: "productive", meaningPt: "Onde fica a estacao de Pequim?", introduceAtPass: 4 },
      { ref: "chunk:beijingshi", hanzi: "北京市", role: "support", meaningPt: "Municipio de Pequim", introduceAtPass: 4 },
      { ref: "chunk:guangdongsheng", hanzi: "广东省", role: "receptive", meaningPt: "Provincia de Guangdong", introduceAtPass: 4 },
    ],
    networkChunks: ["北京在哪里？", "我去北京", "我要去上海", "北京火车站在哪里？"],
  },
  "p6-china-ruas": {
    lessonId: "p6-china-ruas",
    themePt: "China Real — ruas e enderecos",
    newVocabularyTarget: 12,
    productiveVocabularyTarget: 5,
    structuresTarget: ["X路", "X街", "X号", "我在 + rua", "cidade + 市 + rua + 号"],
    communicativeFunctions: ["reconhecer rua", "ler placa", "dizer onde estou", "montar endereco", "achar metro na rua"],
    vocabulary: [
      { ref: "char:lu_road", hanzi: "路", pinyin: "lu", meaningPt: "rua; avenida", role: "core", introduceAtPass: 1 },
      { ref: "char:jie_street", hanzi: "街", pinyin: "jie", meaningPt: "rua", role: "core", introduceAtPass: 1 },
      { ref: "char:hao_number", hanzi: "号", pinyin: "hao", meaningPt: "numero (endereco)", role: "support", introduceAtPass: 2 },
      { ref: "chunk:beijinglu", hanzi: "北京路", role: "core", meaningPt: "Beijing Road", introduceAtPass: 1 },
      { ref: "chunk:nanjinglu", hanzi: "南京路", role: "core", meaningPt: "Nanjing Road", introduceAtPass: 2 },
      { ref: "chunk:renminlu", hanzi: "人民路", role: "receptive", meaningPt: "Renmin Road", introduceAtPass: 2 },
      { ref: "chunk:zhongshanlu", hanzi: "中山路", role: "receptive", meaningPt: "Zhongshan Road", introduceAtPass: 2 },
      { ref: "chunk:changanjie", hanzi: "长安街", role: "support", meaningPt: "Chang'an Avenue", introduceAtPass: 2 },
      { ref: "chunk:wozainanjinglu", hanzi: "我在南京路。", role: "productive", meaningPt: "Estou na Nanjing Road", introduceAtPass: 3 },
      { ref: "chunk:beijinglu10hao", hanzi: "北京路10号", role: "productive", meaningPt: "Beijing Road 10", introduceAtPass: 3 },
      { ref: "chunk:shanghai_nanjinglu20hao", hanzi: "上海市南京路20号", role: "productive", meaningPt: "Xangai Nanjing Road 20", introduceAtPass: 4 },
      { ref: "chunk:ditiezhan", hanzi: "地铁站", role: "support", meaningPt: "estacao de metro", introduceAtPass: 3 },
      { ref: "chunk:nanjingluditiezhan", hanzi: "南京路地铁站在哪里？", role: "productive", meaningPt: "Onde fica o metro da Nanjing Road?", introduceAtPass: 4 },
    ],
    networkChunks: ["北京路", "我在南京路", "北京路10号", "南京路地铁站在哪里？"],
  },
  "p6-direcoes": {
    lessonId: "p6-direcoes",
    themePt: "China Real — direcoes e mapa",
    newVocabularyTarget: 12,
    productiveVocabularyTarget: 5,
    structuresTarget: ["左边/右边", "前面/后面", "怎么走", "左转/右转", "一直走"],
    communicativeFunctions: ["pedir caminho", "seguir seta", "interpretar mapa", "navegar com audio"],
    vocabulary: [
      { ref: "char:zuo_left", hanzi: "左", role: "core", meaningPt: "esquerda", introduceAtPass: 1 },
      { ref: "char:you_right", hanzi: "右", role: "core", meaningPt: "direita", introduceAtPass: 1 },
      { ref: "chunk:zuobian", hanzi: "左边", role: "core", meaningPt: "a esquerda", introduceAtPass: 1 },
      { ref: "chunk:youbian", hanzi: "右边", role: "core", meaningPt: "a direita", introduceAtPass: 1 },
      { ref: "chunk:qianmian", hanzi: "前面", role: "support", meaningPt: "em frente", introduceAtPass: 2 },
      { ref: "chunk:houmian", hanzi: "后面", role: "support", meaningPt: "atras", introduceAtPass: 2 },
      { ref: "chunk:zenmezou", hanzi: "怎么走？", role: "core", meaningPt: "como chegar?", introduceAtPass: 2 },
      { ref: "chunk:zuozhuan", hanzi: "左转", role: "productive", meaningPt: "vire a esquerda", introduceAtPass: 2 },
      { ref: "chunk:youzhuan", hanzi: "右转", role: "productive", meaningPt: "vire a direita", introduceAtPass: 3 },
      { ref: "chunk:yizhizou", hanzi: "一直走", role: "productive", meaningPt: "siga em frente", introduceAtPass: 3 },
      { ref: "chunk:ditiezhan", hanzi: "地铁站", role: "support", meaningPt: "estacao de metro", introduceAtPass: 3 },
      { ref: "char:jin_near", hanzi: "近", role: "receptive", meaningPt: "perto", introduceAtPass: 4 },
      { ref: "char:yuan_far", hanzi: "远", role: "receptive", meaningPt: "longe", introduceAtPass: 4 },
    ],
    networkChunks: ["怎么走？", "左转", "一直走", "mapa hotel → metro"],
  },
};

/** Lexemas unicos cobertos ate a pass (crescimento real, nao so modalidade). */
export function lexemesForPass(lessonId: MasteryPilotLessonId, pass: MasteryPass): LexicalItemSpec[] {
  return PILOT_LEXICAL_TARGETS[lessonId].vocabulary.filter((item) => item.introduceAtPass <= pass);
}

export interface SemanticExpansionBreakdown {
  newLexemes: number;
  newChunks: number;
  structures: number;
  communicativeFunctions: number;
  newCombinations: number;
  score: number;
  /** Modalidade repetida do mesmo alvo nao aumenta o score. */
  uniqueLexicalTargets: number;
}

/**
 * PED-036 — variedade de modalidade sobre o mesmo lexema nao conta como profundidade.
 * Score baseado em lexemas/chunks/estruturas/funcoes/combinacoes.
 */
export function semanticExpansionScore(
  lessonId: MasteryPilotLessonId,
  pass: MasteryPass,
  planKindsForSameTarget?: readonly StepKind[]
): SemanticExpansionBreakdown {
  const targets = PILOT_LEXICAL_TARGETS[lessonId];
  const lexemes = lexemesForPass(lessonId, pass);
  const newLexemes = lexemes.filter((item) => item.introduceAtPass === pass).length;
  const newChunks = lexemes.filter((item) => item.ref.startsWith("chunk:") && item.introduceAtPass === pass).length;
  const structures = Math.min(targets.structuresTarget.length, pass);
  const communicativeFunctions = Math.min(targets.communicativeFunctions.length, pass);
  const newCombinations = Math.min(targets.networkChunks.length, pass);
  const uniqueLexicalTargets = new Set(lexemes.map((item) => item.hanzi)).size;

  // Modalidades extras do mesmo alvo: contribuicao zero (teste PED-036).
  const modalityOnlyBonus = 0;
  void planKindsForSameTarget;

  const score =
    newLexemes * 1.2 +
    newChunks * 1.5 +
    structures * 1.1 +
    communicativeFunctions * 1.0 +
    newCombinations * 1.3 +
    uniqueLexicalTargets * 0.15 +
    modalityOnlyBonus;

  return {
    newLexemes,
    newChunks,
    structures,
    communicativeFunctions,
    newCombinations,
    uniqueLexicalTargets,
    score: Math.round(score * 10) / 10,
  };
}

function contextualChoice(
  title: string,
  situationPt: string,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep {
  return {
    kind: "contextual_choice",
    title,
    situationPt,
    dialoguePrompt: situationPt,
    correctAnswer,
    options,
    explanation,
    speaker: "Situacao",
  };
}

function audioToAction(
  title: string,
  audioText: string,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep {
  return {
    kind: "audio_to_action",
    title,
    audioText,
    prompt: "Ouca e escolha a acao/imagem correspondente.",
    correctAnswer,
    options,
    explanation,
  };
}

function sentenceTransform(
  title: string,
  sourceHanzi: string,
  targetParts: string[],
  bank: string[],
  promptPt: string,
  explanation?: string
): LessonStep {
  return {
    kind: "sentence_transform",
    title,
    sourceText: sourceHanzi,
    prompt: promptPt,
    targetParts,
    bank,
    explanation,
  };
}

function substitutionDrill(
  title: string,
  patternBefore: string,
  blankAnswer: string,
  options: string[],
  promptPt: string,
  explanation?: string
): LessonStep {
  return {
    kind: "substitution_drill",
    title,
    sentenceBefore: patternBefore,
    blankAnswer,
    options,
    prompt: promptPt,
    explanation,
  };
}

function dialogueCompletion(
  title: string,
  dialoguePrompt: string,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep {
  return {
    kind: "dialogue_completion",
    title,
    dialoguePrompt,
    correctAnswer,
    options,
    explanation,
    speaker: "Dialogo",
  };
}

function reverseRecall(
  title: string,
  situationPt: string,
  answer: string,
  accepts?: string[]
): LessonStep {
  return {
    kind: "reverse_recall",
    title,
    situationPt,
    body: situationPt,
    answer,
    accepts: accepts ?? [answer],
    mode: "free_reflection",
    isNoHint: true,
  };
}

/** Passos bonus por pass — exigencia cognitiva diferente, nao so outra modalidade. */
export function masteryBonusStepsFor(lessonId: string, pass: MasteryPass): LessonStep[] {
  if (!isMasteryPilotLesson(lessonId)) return [];

  if (lessonId === "l2") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Primeiro encontro",
          "Voce acaba de encontrar alguem. O que diz?",
          "你好",
          ["你好", "谢谢", "再见", "不客气"],
          "你好 e o cumprimento seguro ao encontrar alguem."
        ),
        audioToAction("Ouca o cumprimento", "你好", "你好", ["你好", "谢谢", "我很好", "再见"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar",
          "Alguem pergunta se voce esta bem. Qual NAO e so \"ola\"?",
          "你好吗？",
          ["你好", "你好吗？", "谢谢", "再见"],
          "你好吗？ pergunta 'tudo bem?' — diferente de 你好."
        ),
        dialogueCompletion(
          "Resposta curta",
          "A: 你好！ B: ___",
          "你好",
          ["你好", "我很好", "买单", "多少钱"],
          "Devolver 你好 mantem o cumprimento simples."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Cresca a frase",
          "你好",
          ["你好", "，", "我", "叫"],
          ["你好", "，", "我", "叫", "谢", "再"],
          "Transforme o cumprimento em apresentacao: 你好，我叫...",
          "你好 + 我叫 forma a apresentacao."
        ),
        reverseRecall("Diga sozinho", "Cumprimente alguem em chines.", "你好", ["你好", "你好！"]),
      ];
    }
    return [
      reverseRecall(
        "Transferencia",
        "O NPC diz algo novo e espera sua fala. Cumprimente sem ver alternativas.",
        "你好",
        ["你好", "你好！"]
      ),
      dialogueCompletion(
        "Continuar o dialogo",
        "NPC: 你好！ Voce: ___",
        "你好",
        ["你好", "多少钱", "我要票", "菜单"],
        "Na transferencia, mantenha o cumprimento natural."
      ),
    ];
  }

  if (lessonId === "l3") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Checar se esta bem",
          "Voce quer perguntar se a pessoa esta bem.",
          "你好吗？",
          ["你好吗？", "你好", "谢谢", "再见"]
        ),
      ];
    }
    if (pass === 2) {
      return [
        dialogueCompletion(
          "Complete o dialogo",
          "A: 你好吗？ B: ___",
          "我很好",
          ["我很好", "再见", "菜单", "多少钱"]
        ),
        substitutionDrill(
          "Troque o foco",
          "我很好，___？",
          "你呢",
          ["你呢", "你好", "谢谢", "再见"],
          "Devolva a pergunta: complete com 你呢"
        ),
      ];
    }
    if (pass === 3) {
      return [
        reverseRecall("Produza a pergunta", "Pergunte se a pessoa esta bem.", "你好吗？", ["你好吗？", "你好吗"]),
        reverseRecall("Produza a resposta", "Diga que voce esta bem.", "我很好"),
      ];
    }
    return [
      dialogueCompletion(
        "Mini dialogo",
        "A: 你好吗？ B: 我很好，___？",
        "你呢",
        ["你呢", "再见", "谢谢", "买单"]
      ),
      reverseRecall(
        "Sem prompt",
        "Alguem pergunta 你好吗？ Responda e devolva a pergunta.",
        "我很好，你呢？",
        ["我很好，你呢？", "我很好你呢", "我很好，你呢"]
      ),
    ];
  }

  if (lessonId === "l26b") {
    if (pass === 1) {
      return [
        audioToAction("Ouca e escolha a bebida", "茶", "茶", ["茶", "饭", "肉", "鱼"], "茶 = cha."),
        contextualChoice(
          "No restaurante",
          "Voce entra em um restaurante e quer agua.",
          "我要水",
          ["我要水", "再见", "你好吗？", "多少钱"]
        ),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Troque o pedido",
          "我要___",
          "茶",
          ["茶", "水", "饭", "菜"],
          "Mantenha 我要 e troque o item: peca cha."
        ),
        contextualChoice(
          "Cardapio",
          "Voce quer ver o cardapio.",
          "菜单",
          ["菜单", "买单", "地铁", "公园"]
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Refine o pedido",
          "我要水",
          ["我", "想", "喝", "水"],
          ["我", "想", "喝", "水", "要", "茶"],
          "Transforme 我要水 em 我想喝水.",
          "想喝 deixa o pedido mais natural para bebida."
        ),
        reverseRecall("Peca cha", "Peca um cha sem alternativas.", "我要茶", ["我要茶", "我想喝茶"]),
      ];
    }
    return [
      contextualChoice(
        "Pedir a conta",
        "Voce terminou de comer e quer pagar.",
        "买单",
        ["买单", "菜单", "你好", "地铁"]
      ),
      reverseRecall("Quanto custa?", "Pergunte o preco.", "多少钱", ["多少钱", "多少钱？"]),
      reverseRecall(
        "Pedido livre",
        "No restaurante, peca agua de forma natural.",
        "我想喝水",
        ["我想喝水", "我要水"]
      ),
    ];
  }

  if (lessonId === "p6-cidade-lugares") {
    if (pass === 1) {
      return [
        audioToAction("Ouca o lugar", "超市", "超市", ["超市", "银行", "医院", "公园"]),
        contextualChoice(
          "Onde fica?",
          "Voce precisa achar o supermercado.",
          "超市在哪里？",
          ["超市在哪里？", "我要水", "你好", "买单"]
        ),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Troque o lugar",
          "___在哪里？",
          "银行",
          ["银行", "医院", "公园", "酒店"],
          "Pergunte onde fica o banco."
        ),
      ];
    }
    if (pass === 3) {
      return [
        reverseRecall("Diga o destino", "Diga que voce vai ao supermercado.", "我去超市"),
        sentenceTransform(
          "De pergunta a acao",
          "超市在哪里？",
          ["我", "去", "超市"],
          ["我", "去", "超市", "银行", "在"],
          "Transforme a pergunta em destino: 我去超市."
        ),
      ];
    }
    return [
      reverseRecall("Transferencia urbana", "Voce esta perdido e precisa do hospital.", "医院在哪里？", [
        "医院在哪里？",
        "医院在哪里",
      ]),
      dialogueCompletion(
        "Na rua",
        "A: 你去哪里？ B: ___",
        "我去超市",
        ["我去超市", "你好吗？", "买单", "我很好"]
      ),
    ];
  }

  if (lessonId === "p6-china-cidades") {
    if (pass === 1) {
      return [
        {
          kind: "place_label",
          title: "Placa urbana",
          prompt: "Qual destas e Pequim?",
          dialoguePrompt: "Qual destas e Pequim?",
          correctAnswer: "北京",
          options: ["北京", "上海", "广州", "深圳"],
          placeLabelCategory: "cidade",
          speaker: "Placa",
        },
        contextualChoice(
          "Capital",
          "Voce quer ir a capital da China. Qual cidade?",
          "北京",
          ["北京", "上海", "广州", "深圳"],
          "北京 = Pequim, capital."
        ),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar cidades",
          "Qual e a capital?",
          "北京",
          ["北京", "上海", "广州", "深圳"],
          "北京 = Pequim, capital — diferente de 上海."
        ),
        {
          kind: "city_context",
          title: "Onde fica?",
          situationPt: "Voce quer saber onde fica Pequim.",
          citySituationPt: "Voce quer saber onde fica Pequim.",
          dialoguePrompt: "Voce quer saber onde fica Pequim.",
          correctAnswer: "北京在哪里？",
          options: ["北京在哪里？", "我要水", "菜单", "再见"],
          cityId: "beijing",
          speaker: "Situacao",
        },
      ];
    }
    if (pass === 3) {
      return [
        reverseRecall("Diga o destino", "Diga que voce vai a Pequim.", "我去北京", ["我去北京", "我去北京。"]),
        sentenceTransform(
          "De ir a querer ir",
          "我去北京",
          ["我", "要", "去", "北京"],
          ["我", "要", "去", "北京", "上海"],
          "Transforme 我去北京 em 我要去北京."
        ),
      ];
    }
    return [
      {
        kind: "city_context",
        title: "Chegou a Pequim",
        situationPt: "Voce chegou em Pequim e precisa encontrar a estacao.",
        citySituationPt: "Voce chegou em Pequim e precisa encontrar a estacao.",
        dialoguePrompt: "Voce chegou em Pequim e precisa encontrar a estacao.",
        correctAnswer: "北京火车站在哪里？",
        options: ["北京火车站在哪里？", "我很好", "买单", "菜单"],
        cityId: "beijing",
        speaker: "Situacao",
        explanation: "Cidade + transporte: transferencia, nao trivia.",
      },
      reverseRecall("Estou em Pequim", "Diga que voce esta em Pequim.", "我在北京", ["我在北京", "我在北京。"]),
    ];
  }

  if (lessonId === "p6-china-ruas") {
    if (pass === 1) {
      return [
        {
          kind: "place_label",
          title: "Qual e rua?",
          prompt: "Qual destas e uma rua/avenida?",
          dialoguePrompt: "Qual destas e uma rua/avenida?",
          correctAnswer: "路",
          options: ["路", "市", "站", "茶"],
          placeLabelCategory: "rua",
          speaker: "Placa",
        },
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Placa real",
          "南京路 e o que?",
          "Uma rua",
          ["Uma rua", "Uma cidade", "Uma estacao", "Um hotel"],
          "南京路 = Nanjing Road (rua), nao so a cidade."
        ),
        {
          kind: "place_label",
          title: "Ler placa",
          prompt: "Qual palavra aparece nesta placa?",
          dialoguePrompt: "Qual palavra aparece nesta placa?",
          correctAnswer: "南京路",
          options: ["南京路", "北京", "医院", "菜单"],
          placeLabelCategory: "rua",
          speaker: "Placa",
        },
      ];
    }
    if (pass === 3) {
      return [
        {
          kind: "address_build",
          title: "Onde estou?",
          prompt: "Monte: estou na Nanjing Road.",
          targetParts: ["我", "在", "南京路"],
          bank: ["我", "在", "南京路", "北京", "号"],
          explanation: "我在南京路.",
        },
        reverseRecall("Diga a rua", "Diga que esta na Nanjing Road.", "我在南京路", ["我在南京路", "我在南京路。"]),
      ];
    }
    return [
      {
        kind: "address_build",
        title: "Endereco pedagogico",
        prompt: "Monte: Beijing Road, numero 10.",
        targetParts: ["北京", "路", "10", "号"],
        bank: ["北京", "路", "10", "号", "街"],
      },
      dialogueCompletion(
        "Na Nanjing Road",
        "Voce esta na 南京路 e precisa do metro. O que pergunta?",
        "南京路地铁站在哪里？",
        ["南京路地铁站在哪里？", "我很好", "买单", "你好吗？"]
      ),
    ];
  }

  if (lessonId === "p6-direcoes") {
    if (pass === 1) {
      return [
        {
          kind: "map_direction",
          title: "Mapa: esquerda",
          mapFromLabel: "酒店",
          mapToLabel: "地铁站",
          mapCorrectAction: "left",
          mapActionOptions: ["left", "right", "straight"],
          mapScaffoldLevel: 1,
          promptPt: "Do hotel ao metro: vire a esquerda.",
          correctAnswer: "left",
          explanation: "左转 = esquerda.",
        },
      ];
    }
    if (pass === 2) {
      return [
        {
          kind: "map_direction",
          title: "Mapa: 右转",
          mapFromLabel: "银行",
          mapToLabel: "公园",
          mapCorrectAction: "right",
          mapActionOptions: ["left", "right", "straight"],
          mapScaffoldLevel: 2,
          prompt: "右转",
          correctAnswer: "right",
        },
        substitutionDrill(
          "Complete o lado",
          "___边",
          "左",
          ["左", "右", "前", "后"],
          "Complete: lado esquerdo."
        ),
      ];
    }
    if (pass === 3) {
      return [
        {
          kind: "map_direction",
          title: "Ouca e navegue",
          mapFromLabel: "南京路",
          mapToLabel: "地铁站",
          mapCorrectAction: "straight",
          mapActionOptions: ["left", "right", "straight"],
          mapScaffoldLevel: 3,
          audioText: "一直走",
          correctAnswer: "straight",
        },
        reverseRecall("Peca o caminho", "Pergunte como chegar.", "怎么走？", ["怎么走？", "怎么走"]),
      ];
    }
    return [
      {
        kind: "map_direction",
        title: "So chines",
        mapFromLabel: "南京路",
        mapToLabel: "地铁站",
        mapCorrectAction: "left",
        mapActionOptions: ["left", "right", "straight", "destination"],
        mapScaffoldLevel: 4,
        prompt: "左转",
        correctAnswer: "left",
        explanation: "M4: instrucao so em chines + transferencia no mapa.",
      },
      {
        kind: "city_context",
        title: "Na rua real",
        situationPt: "Voce esta na 南京路 e quer saber como chegar ao metro.",
        citySituationPt: "Voce esta na 南京路 e quer saber como chegar ao metro.",
        dialoguePrompt: "Voce esta na 南京路 e quer saber como chegar ao metro.",
        correctAnswer: "怎么走？",
        options: ["怎么走？", "我很好", "菜单", "买单"],
        cityId: "shanghai",
        speaker: "Situacao",
      },
    ];
  }

  if (lessonId === "p7-imersao-estacao") {
    if (pass === 1) {
      return [
        audioToAction("Ouca o bilhete", "票", "票", ["票", "车", "茶", "水"]),
        contextualChoice(
          "Na estacao",
          "Voce precisa de um bilhete.",
          "我要票",
          ["我要票", "你好", "菜单", "公园"]
        ),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Transporte",
          "我要___",
          "票",
          ["票", "茶", "水", "菜"],
          "Peca o bilhete: complete 我要___."
        ),
        contextualChoice(
          "Hotel",
          "Voce chegou e procura o hotel.",
          "酒店在哪里？",
          ["酒店在哪里？", "我很好", "买单", "你好吗？"]
        ),
      ];
    }
    if (pass === 3) {
      return [
        reverseRecall("Preco do bilhete", "Pergunte quanto custa o bilhete.", "票多少钱？", [
          "票多少钱？",
          "票多少钱",
          "多少钱",
        ]),
        sentenceTransform(
          "Do desejo ao preco",
          "我要票",
          ["票", "多少", "钱"],
          ["票", "多少", "钱", "要", "车"],
          "Passe de 'quero bilhete' para perguntar o preco."
        ),
      ];
    }
    return [
      reverseRecall("Cena livre", "Na estacao, compre o bilhete perguntando o preco.", "票多少钱？", [
        "票多少钱？",
        "票多少钱",
      ]),
      dialogueCompletion(
        "Balcao",
        "Atendente: 你好！ Voce: ___",
        "我要票",
        ["我要票", "我很好", "菜单", "公园"]
      ),
    ];
  }

  return [];
}

export function planHasProductionOrTransfer(steps: readonly { kind: StepKind }[]): boolean {
  return steps.some((step) => isProductionOrTransferKind(step.kind));
}

/** Detecta falsa profundidade: muitos kinds, sem lexemas/chunks novos na pass. */
export function isFalseDepth(lessonId: MasteryPilotLessonId, pass: MasteryPass, distinctKinds: number): boolean {
  const expansion = semanticExpansionScore(lessonId, pass);
  return distinctKinds >= 4 && expansion.newLexemes === 0 && expansion.newChunks === 0 && pass >= 2;
}
