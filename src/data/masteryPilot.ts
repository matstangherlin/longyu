/**
 * Piloto Pedagogia V3.2: Mastery Expansion + Survival + China wave2.
 * Temas representativos:
 * - apresentacao/cumprimentos (l2, l3, l4)
 * - familia (l24)
 * - restaurante/comida/loja (l26b, l27)
 * - rotina / horarios / compras (p6-rotina-trabalho, p6-horarios, p6-compras)
 * - lugares/transporte (p6-cidade-lugares, p7-imersao-estacao)
 * - China Real (p6-china-cidades, p6-china-cidades-2, p6-china-ruas, p6-direcoes)
 * - Survival Mandarin (p6-survival-mandarin)
 *
 * Expansao lexical + passos por mastery pass. O restante da Jornada
 * continua no planner classico ate a expansao gradual (PED-050).
 */

import type { LessonStep, StepKind } from "./journey";
import type { MasteryPass } from "./masteryLoop";
import { isProductionOrTransferKind, withEquivalentAccepts } from "./masteryLoop";
import { wave1BonusStepsFor } from "./masteryWave1Bonus";
import { COMPLETION_LESSON_IDS, COMPLETION_LEXICAL_TARGETS, completionBonusStepsFor } from "./masteryCurriculum";

export const MASTERY_PILOT_LESSON_IDS = [
  "l2",
  "l3",
  "l4",
  "l24",
  "l26b",
  "l27",
  "p6-cidade-lugares",
  "p6-rotina-trabalho",
  "p6-horarios",
  "p6-compras",
  "p6-china-cidades",
  "p6-china-cidades-2",
  "p6-china-ruas",
  "p6-direcoes",
  "p6-survival-mandarin",
  "p7-imersao-estacao",
  // ————————————————————————————————————————————————————————————
  // Pedagogia V3.3 — Wave 1 (24 licoes; ver masteryCoverage.ts).
  // ————————————————————————————————————————————————————————————
  "p1-ate-logo",
  "p1-qingwen-cortesia",
  "p1-primeira-conversa",
  "l9",
  "l9-qual-nome",
  "l10",
  "l11",
  "l11-falo-pouco",
  "p3-wobuhui-shuo-zhongwen",
  "p3-qing-zai-shuo-yibian",
  "l13-dialogo-ola",
  "l13-dialogo-nome",
  "l19",
  "l20",
  "l21",
  "l22",
  "l25",
  "l26",
  "l28",
  "p6-saude",
  "p6-clima",
  "p7-imersao-mercado",
  "p7-imersao-casa-amigo",
  "p3-wohenhao",
  // ————————————————————————————————————————————————————————————
  // Pedagogia V3.4 — Mastery Completion (6 lições; ver masteryCoverage.ts).
  // ————————————————————————————————————————————————————————————
  ...COMPLETION_LESSON_IDS,
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

const CORE_PILOT_LEXICAL_TARGETS = {
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
  l4: {
    lessonId: "l4",
    themePt: "Cortesia — Obrigado / De nada",
    newVocabularyTarget: 6,
    productiveVocabularyTarget: 4,
    structuresTarget: ["谢谢", "不客气", "谢谢 + resposta"],
    communicativeFunctions: ["agradecer", "responder cortesia", "encerrar com educacao"],
    vocabulary: [
      { ref: "chunk:xiexie", hanzi: "谢谢", pinyin: "xiexie", meaningPt: "obrigado(a)", role: "core", introduceAtPass: 1 },
      { ref: "char:xie", hanzi: "谢", pinyin: "xie", meaningPt: "agradecer", role: "core", introduceAtPass: 1 },
      { ref: "chunk:bukeqi", hanzi: "不客气", pinyin: "bu keqi", meaningPt: "de nada", role: "core", introduceAtPass: 2 },
      { ref: "char:bu_not", hanzi: "不", pinyin: "bu", meaningPt: "nao", role: "support", introduceAtPass: 2 },
      { ref: "chunk:zaijian", hanzi: "再见", pinyin: "zaijian", meaningPt: "ate logo", role: "support", introduceAtPass: 3 },
      { ref: "chunk:xiexiebukeqi", hanzi: "谢谢 — 不客气", role: "productive", meaningPt: "obrigado / de nada", introduceAtPass: 3 },
    ],
    networkChunks: ["谢谢", "不客气", "dialogo de cortesia"],
  },
  l24: {
    lessonId: "l24",
    themePt: "Familia — pai e mae",
    newVocabularyTarget: 8,
    productiveVocabularyTarget: 4,
    structuresTarget: ["这是我爸爸", "这是我妈妈", "这是我家"],
    communicativeFunctions: ["apresentar pai", "apresentar mae", "mostrar a casa"],
    vocabulary: [
      { ref: "chunk:zheshibaba", hanzi: "这是我爸爸", pinyin: "zhe shi wo baba", meaningPt: "Este e meu pai", role: "core", introduceAtPass: 1 },
      { ref: "chunk:zheshimama", hanzi: "这是我妈妈", pinyin: "zhe shi wo mama", meaningPt: "Esta e minha mae", role: "core", introduceAtPass: 1 },
      { ref: "char:ba_dad", hanzi: "爸", pinyin: "ba", meaningPt: "pai", role: "core", introduceAtPass: 1 },
      { ref: "char:ma_mom", hanzi: "妈", pinyin: "ma", meaningPt: "mae", role: "core", introduceAtPass: 1 },
      { ref: "char:jia", hanzi: "家", pinyin: "jia", meaningPt: "casa; familia", role: "support", introduceAtPass: 2 },
      { ref: "chunk:zheshiwodejia", hanzi: "这是我家", pinyin: "zhe shi wo jia", meaningPt: "Esta e minha casa", role: "productive", introduceAtPass: 3 },
      { ref: "char:zhe_this", hanzi: "这", pinyin: "zhe", meaningPt: "este; esta", role: "support", introduceAtPass: 2 },
      { ref: "char:shi_be", hanzi: "是", pinyin: "shi", meaningPt: "ser; e", role: "support", introduceAtPass: 2 },
    ],
    networkChunks: ["这是我爸爸", "这是我妈妈", "这是我家"],
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
  l27: {
    lessonId: "l27",
    themePt: "Na loja — preco e pedido",
    newVocabularyTarget: 8,
    productiveVocabularyTarget: 4,
    structuresTarget: ["多少钱", "我要这个", "我想喝 + bebida"],
    communicativeFunctions: ["perguntar preco", "escolher item", "fechar compra"],
    vocabulary: [
      { ref: "chunk:duoshaoqian", hanzi: "多少钱", pinyin: "duoshao qian", meaningPt: "quanto custa?", role: "core", introduceAtPass: 1 },
      { ref: "chunk:woyaozhege", hanzi: "我要这个", pinyin: "wo yao zhege", meaningPt: "Quero este", role: "core", introduceAtPass: 1 },
      { ref: "char:duo_many", hanzi: "多", pinyin: "duo", meaningPt: "muito; quanto", role: "support", introduceAtPass: 1 },
      { ref: "char:shao_few", hanzi: "少", pinyin: "shao", meaningPt: "pouco", role: "support", introduceAtPass: 1 },
      { ref: "chunk:taiguile", hanzi: "太贵了", pinyin: "tai gui le", meaningPt: "esta caro demais", role: "support", introduceAtPass: 2 },
      { ref: "chunk:woxianghe", hanzi: "我想喝茶", pinyin: "wo xiang he cha", meaningPt: "Quero beber cha", role: "productive", introduceAtPass: 3 },
      { ref: "char:zhege", hanzi: "这个", pinyin: "zhege", meaningPt: "este; isto", role: "core", introduceAtPass: 2 },
      { ref: "chunk:ershibayuan", hanzi: "28元", pinyin: "ershi ba yuan", meaningPt: "28 yuan", role: "receptive", introduceAtPass: 3 },
    ],
    networkChunks: ["多少钱？", "我要这个", "cena de compra na loja"],
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
  "p6-rotina-trabalho": {
    lessonId: "p6-rotina-trabalho",
    themePt: "Rotina e trabalho",
    newVocabularyTarget: 8,
    productiveVocabularyTarget: 4,
    structuresTarget: ["我起床", "我上班", "我下班", "我要工作"],
    communicativeFunctions: ["falar rotina", "dizer que vai trabalhar", "dizer que saiu do trabalho"],
    vocabulary: [
      { ref: "chunk:woqichuang", hanzi: "我起床", pinyin: "wo qichuang", meaningPt: "Eu acordo", role: "core", introduceAtPass: 1 },
      { ref: "chunk:shangban", hanzi: "我上班", pinyin: "wo shangban", meaningPt: "Vou para o trabalho", role: "core", introduceAtPass: 1 },
      { ref: "chunk:xiaban", hanzi: "我下班", pinyin: "wo xiaban", meaningPt: "Saio do trabalho", role: "core", introduceAtPass: 2 },
      { ref: "chunk:woyaogongzuo", hanzi: "我要工作", pinyin: "wo yao gongzuo", meaningPt: "Quero trabalhar", role: "productive", introduceAtPass: 2 },
      { ref: "chunk:woshujiao", hanzi: "我睡觉", pinyin: "wo shuijiao", meaningPt: "Eu durmo", role: "support", introduceAtPass: 3 },
      { ref: "char:qi_rise", hanzi: "起", pinyin: "qi", meaningPt: "levantar; comecar", role: "support", introduceAtPass: 1 },
      { ref: "char:chuang_bed", hanzi: "床", pinyin: "chuang", meaningPt: "cama", role: "support", introduceAtPass: 1 },
      { ref: "char:ban_shift", hanzi: "班", pinyin: "ban", meaningPt: "turno; expediente", role: "support", introduceAtPass: 2 },
    ],
    networkChunks: ["我起床", "我上班", "我下班", "rotina do dia"],
  },
  "p6-horarios": {
    lessonId: "p6-horarios",
    themePt: "Que horas sao?",
    newVocabularyTarget: 7,
    productiveVocabularyTarget: 4,
    structuresTarget: ["现在几点？", "现在 + numero + 点", "中午"],
    communicativeFunctions: ["perguntar a hora", "dizer a hora", "ler horario"],
    vocabulary: [
      { ref: "chunk:xianzaijidian", hanzi: "现在几点？", pinyin: "xianzai ji dian?", meaningPt: "Que horas sao?", role: "core", introduceAtPass: 1 },
      { ref: "chunk:xianzaibadian", hanzi: "现在八点", pinyin: "xianzai ba dian", meaningPt: "Sao oito horas", role: "productive", introduceAtPass: 1 },
      { ref: "chunk:xianzaijiudian", hanzi: "现在九点", pinyin: "xianzai jiu dian", meaningPt: "Sao nove horas", role: "productive", introduceAtPass: 2 },
      { ref: "chunk:zhongwu", hanzi: "中午", pinyin: "zhongwu", meaningPt: "meio-dia", role: "support", introduceAtPass: 2 },
      { ref: "char:dian_hour", hanzi: "点", pinyin: "dian", meaningPt: "hora (relogio)", role: "support", introduceAtPass: 1 },
      { ref: "char:ji_howmany", hanzi: "几", pinyin: "ji", meaningPt: "quantos; que", role: "support", introduceAtPass: 1 },
      { ref: "char:xianzai", hanzi: "现在", pinyin: "xianzai", meaningPt: "agora", role: "core", introduceAtPass: 1 },
    ],
    networkChunks: ["现在几点？", "现在八点", "agora + hora"],
  },
  "p6-compras": {
    lessonId: "p6-compras",
    themePt: "Compras — roupas e itens",
    newVocabularyTarget: 10,
    productiveVocabularyTarget: 5,
    structuresTarget: ["我要买衣服", "这件衣服多少钱？", "我要这双鞋", "我要这个苹果"],
    communicativeFunctions: ["comprar roupa", "perguntar preco", "escolher item"],
    vocabulary: [
      { ref: "chunk:woyaomaiyifu", hanzi: "我要买衣服", pinyin: "wo yao mai yifu", meaningPt: "Quero comprar roupa", role: "core", introduceAtPass: 1 },
      { ref: "chunk:zhejianyifuduoshaoqian", hanzi: "这件衣服多少钱？", role: "core", meaningPt: "Quanto custa esta roupa?", introduceAtPass: 2 },
      { ref: "chunk:woyaozheshuangxie", hanzi: "我要这双鞋", role: "productive", meaningPt: "Quero estes sapatos", introduceAtPass: 2 },
      { ref: "chunk:woyaozhegepingguo", hanzi: "我要这个苹果", role: "productive", meaningPt: "Quero esta maca", introduceAtPass: 3 },
      { ref: "chunk:woyaoxiangjiao", hanzi: "我要香蕉", role: "support", meaningPt: "Quero banana", introduceAtPass: 3 },
      { ref: "chunk:woyaoniunai", hanzi: "我要牛奶", role: "support", meaningPt: "Quero leite", introduceAtPass: 3 },
      { ref: "chunk:woyaoshouji", hanzi: "我要手机", role: "receptive", meaningPt: "Quero um celular", introduceAtPass: 4 },
      { ref: "char:mai_buy", hanzi: "买", pinyin: "mai", meaningPt: "comprar", role: "core", introduceAtPass: 1 },
      { ref: "chunk:yifu", hanzi: "衣服", pinyin: "yifu", meaningPt: "roupa", role: "core", introduceAtPass: 1 },
      { ref: "chunk:duoshaoqian", hanzi: "多少钱", role: "support", meaningPt: "quanto custa?", introduceAtPass: 2 },
    ],
    networkChunks: ["我要买衣服", "这件衣服多少钱？", "compra na loja"],
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
  "p6-china-cidades-2": {
    lessonId: "p6-china-cidades-2",
    themePt: "China Real — cidades onda 2",
    newVocabularyTarget: 12,
    productiveVocabularyTarget: 6,
    structuresTarget: ["我去成都", "我要四川菜", "辣/不辣", "我去西安", "古城", "南京"],
    communicativeFunctions: ["reconhecer Chengdu", "pedir comida Sichuan", "falar de Xian", "reconhecer Nanjing"],
    vocabulary: [
      { ref: "chunk:chengdu", hanzi: "成都", pinyin: "Chengdu", meaningPt: "Chengdu", role: "core", introduceAtPass: 1 },
      { ref: "chunk:sichuancai", hanzi: "四川菜", pinyin: "Sichuan cai", meaningPt: "comida de Sichuan", role: "core", introduceAtPass: 1 },
      { ref: "chunk:la", hanzi: "辣", pinyin: "la", meaningPt: "picante", role: "core", introduceAtPass: 1 },
      { ref: "chunk:bula", hanzi: "不辣", pinyin: "bu la", meaningPt: "nao picante", role: "support", introduceAtPass: 2 },
      { ref: "chunk:woyaosichuancai", hanzi: "我要四川菜。", role: "productive", meaningPt: "Quero comida de Sichuan", introduceAtPass: 2 },
      { ref: "chunk:woquchengdu", hanzi: "我去成都。", role: "productive", meaningPt: "Vou a Chengdu", introduceAtPass: 2 },
      { ref: "chunk:xian", hanzi: "西安", pinyin: "Xian", meaningPt: "Xian", role: "core", introduceAtPass: 3 },
      { ref: "chunk:gucheng", hanzi: "古城", pinyin: "gucheng", meaningPt: "cidade antiga", role: "core", introduceAtPass: 3 },
      { ref: "chunk:woquxian", hanzi: "我去西安。", role: "productive", meaningPt: "Vou a Xian", introduceAtPass: 3 },
      { ref: "chunk:zhelihenlao", hanzi: "这里很老。", role: "support", meaningPt: "Aqui e bem antigo", introduceAtPass: 3 },
      { ref: "chunk:nanjing", hanzi: "南京", pinyin: "Nanjing", meaningPt: "Nanjing", role: "core", introduceAtPass: 3 },
      { ref: "chunk:nanjinglu", hanzi: "南京路", role: "receptive", meaningPt: "Nanjing Road", introduceAtPass: 3 },
      { ref: "chunk:woqunanjing", hanzi: "我去南京。", role: "productive", meaningPt: "Vou a Nanjing", introduceAtPass: 4 },
    ],
    networkChunks: ["我去成都", "我要四川菜", "辣", "我去西安", "古城", "南京", "我去南京"],
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
  "p6-survival-mandarin": {
    lessonId: "p6-survival-mandarin",
    themePt: "Survival Mandarin — pagamento, celular, hotel, necessidades",
    newVocabularyTarget: 14,
    productiveVocabularyTarget: 6,
    structuresTarget: ["可以刷卡吗？", "洗手间在哪里？", "我需要帮助", "微信支付/支付宝", "护照/房卡"],
    communicativeFunctions: ["pagar", "pedir Wi-Fi/carregador", "check-in hotel", "pedir ajuda", "ler placa"],
    vocabulary: [
      { ref: "chunk:xianjin", hanzi: "现金", role: "core", meaningPt: "dinheiro vivo", introduceAtPass: 1 },
      { ref: "chunk:weixinzhifu", hanzi: "微信支付", role: "core", meaningPt: "WeChat Pay", introduceAtPass: 1 },
      { ref: "chunk:zhifubao", hanzi: "支付宝", role: "core", meaningPt: "Alipay", introduceAtPass: 1 },
      { ref: "chunk:keyishuaka", hanzi: "可以刷卡吗？", role: "productive", meaningPt: "Posso pagar com cartao?", introduceAtPass: 2 },
      { ref: "chunk:shouji_device", hanzi: "手机", role: "core", meaningPt: "celular", introduceAtPass: 2 },
      { ref: "chunk:chongdianqi", hanzi: "充电器", role: "support", meaningPt: "carregador", introduceAtPass: 2 },
      { ref: "chunk:wifi", hanzi: "Wi-Fi", role: "support", meaningPt: "Wi-Fi", introduceAtPass: 2 },
      { ref: "chunk:huzhao", hanzi: "护照", role: "core", meaningPt: "passaporte", introduceAtPass: 3 },
      { ref: "chunk:fangjian", hanzi: "房间", role: "support", meaningPt: "quarto", introduceAtPass: 3 },
      { ref: "chunk:fangka", hanzi: "房卡", role: "support", meaningPt: "cartao do quarto", introduceAtPass: 3 },
      { ref: "chunk:qiantai", hanzi: "前台", role: "support", meaningPt: "recepcao", introduceAtPass: 3 },
      { ref: "chunk:xishoujianzainali", hanzi: "洗手间在哪里？", role: "productive", meaningPt: "Onde fica o banheiro?", introduceAtPass: 4 },
      { ref: "chunk:woxuyaobangzhu", hanzi: "我需要帮助", role: "productive", meaningPt: "Preciso de ajuda", introduceAtPass: 4 },
      { ref: "chunk:chuko", hanzi: "出口", role: "receptive", meaningPt: "saida", introduceAtPass: 4 },
    ],
    networkChunks: ["可以刷卡吗？", "微信支付", "洗手间在哪里？", "我需要帮助", "placa 出口"],
  },
  // ————————————————————————————————————————————————————————————
  // Pedagogia V3.3 — Wave 1 (24 licoes; ver masteryCoverage.ts).
  // ————————————————————————————————————————————————————————————
  "p1-ate-logo": {
    lessonId: "p1-ate-logo",
    themePt: "Despedida — Ate logo",
    newVocabularyTarget: 4,
    productiveVocabularyTarget: 2,
    structuresTarget: ["再见", "你好 vs 再见 (contraste)"],
    communicativeFunctions: ["despedir-se", "encerrar a conversa"],
    vocabulary: [
      { ref: "chunk:zaijian", hanzi: "再见", pinyin: "zaijian", meaningPt: "ate logo", role: "productive", introduceAtPass: 1 },
      { ref: "chunk:nihao", hanzi: "你好", pinyin: "ni hao", meaningPt: "ola (contraste)", role: "support", introduceAtPass: 2 },
      { ref: "chunk:xiexie", hanzi: "谢谢", pinyin: "xiexie", meaningPt: "obrigado (encadeamento social)", role: "support", introduceAtPass: 3 },
    ],
    networkChunks: ["再见", "你好 → 再见", "despedida social"],
  },
  "p1-qingwen-cortesia": {
    lessonId: "p1-qingwen-cortesia",
    themePt: "Cortesia — Com licenca",
    newVocabularyTarget: 5,
    productiveVocabularyTarget: 3,
    structuresTarget: ["请问", "请问 + 你好吗？"],
    communicativeFunctions: ["pedir licenca antes de perguntar", "abrir uma pergunta com cortesia"],
    vocabulary: [
      { ref: "chunk:qingwen", hanzi: "请问", pinyin: "qing wen", meaningPt: "com licenca, posso perguntar?", role: "core", introduceAtPass: 1 },
      { ref: "chunk:nihaoma", hanzi: "你好吗？", pinyin: "ni hao ma", meaningPt: "tudo bem? (reuso)", role: "support", introduceAtPass: 1 },
      { ref: "chunk:qingwen_nihaoma", hanzi: "请问，你好吗？", pinyin: "qing wen, ni hao ma", meaningPt: "com licenca, tudo bem?", role: "productive", introduceAtPass: 2 },
    ],
    networkChunks: ["请问", "请问，你好吗？", "abertura cortes"],
  },
  "p1-primeira-conversa": {
    lessonId: "p1-primeira-conversa",
    themePt: "Primeira conversa completa",
    newVocabularyTarget: 6,
    productiveVocabularyTarget: 4,
    structuresTarget: ["cumprimento", "pergunta-resposta de bem-estar", "agradecimento", "despedida"],
    communicativeFunctions: ["encadear cumprimento", "perguntar e responder bem-estar", "agradecer", "despedir-se"],
    vocabulary: [
      { ref: "chunk:nihao", hanzi: "你好", pinyin: "ni hao", meaningPt: "ola", role: "core", introduceAtPass: 1 },
      { ref: "chunk:nihaoma", hanzi: "你好吗？", pinyin: "ni hao ma", meaningPt: "tudo bem?", role: "support", introduceAtPass: 1 },
      { ref: "chunk:wohenhao", hanzi: "我很好", pinyin: "wo hen hao", meaningPt: "estou bem", role: "support", introduceAtPass: 2 },
      { ref: "chunk:xiexie", hanzi: "谢谢", pinyin: "xiexie", meaningPt: "obrigado(a)", role: "support", introduceAtPass: 2 },
      { ref: "chunk:zaijian", hanzi: "再见", pinyin: "zaijian", meaningPt: "ate logo", role: "productive", introduceAtPass: 3 },
      { ref: "chunk:bukeqi", hanzi: "不客气", pinyin: "bu keqi", meaningPt: "de nada", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["你好 → 你好吗？ → 我很好 → 谢谢 → 再见", "conversa social completa"],
  },
  l9: {
    lessonId: "l9",
    themePt: "Me apresentar — 我叫...",
    newVocabularyTarget: 4,
    productiveVocabularyTarget: 2,
    structuresTarget: ["我叫 + nome"],
    communicativeFunctions: ["apresentar-se pelo nome"],
    vocabulary: [
      { ref: "chunk:wojiao", hanzi: "我叫Matheus", pinyin: "wo jiao Matheus", meaningPt: "meu nome e Matheus", role: "productive", introduceAtPass: 1 },
      { ref: "char:jiao_call", hanzi: "叫", pinyin: "jiao", meaningPt: "chamar-se", role: "support", introduceAtPass: 1 },
    ],
    networkChunks: ["我叫Matheus", "apresentacao pessoal"],
  },
  "l9-qual-nome": {
    lessonId: "l9-qual-nome",
    themePt: "Como voce se chama? — 你叫什么？",
    newVocabularyTarget: 4,
    productiveVocabularyTarget: 2,
    structuresTarget: ["你叫什么？", "我叫 + nome (resposta)"],
    communicativeFunctions: ["perguntar o nome de alguem", "responder ao ser perguntado"],
    vocabulary: [
      { ref: "chunk:nijiaoshenme", hanzi: "你叫什么？", pinyin: "ni jiao shenme", meaningPt: "como voce se chama?", role: "core", introduceAtPass: 1 },
      { ref: "chunk:wojiao", hanzi: "我叫Matheus", pinyin: "wo jiao Matheus", meaningPt: "meu nome e Matheus", role: "productive", introduceAtPass: 2 },
      { ref: "chunk:nihao", hanzi: "你好", pinyin: "ni hao", meaningPt: "ola (abertura)", role: "support", introduceAtPass: 1 },
    ],
    networkChunks: ["你叫什么？", "你好 → 你叫什么？", "apresentacao reciproca"],
  },
  l10: {
    lessonId: "l10",
    themePt: "De onde sou — nacionalidade",
    newVocabularyTarget: 5,
    productiveVocabularyTarget: 3,
    structuresTarget: ["你是哪国人？", "我是 + nacionalidade"],
    communicativeFunctions: ["perguntar a nacionalidade de alguem", "dizer de onde e"],
    vocabulary: [
      { ref: "chunk:nishinaiguoren", hanzi: "你是哪国人？", pinyin: "ni shi na guo ren", meaningPt: "de que pais voce e?", role: "core", introduceAtPass: 1 },
      { ref: "chunk:wature", hanzi: "我是巴西人", pinyin: "wo shi Baxi ren", meaningPt: "sou brasileiro", role: "productive", introduceAtPass: 1 },
      { ref: "char:na_which", hanzi: "哪", pinyin: "na", meaningPt: "qual; onde", role: "support", introduceAtPass: 2 },
    ],
    networkChunks: ["你是哪国人？", "我是巴西人", "pergunta e resposta de origem"],
  },
  l11: {
    lessonId: "l11",
    themePt: "Nao entendi — reparo de conversa",
    newVocabularyTarget: 6,
    productiveVocabularyTarget: 3,
    structuresTarget: ["我听不懂", "请再说一遍", "我不会说中文 (contraste)"],
    communicativeFunctions: ["comunicar que nao entendeu", "pedir repeticao", "diferenciar nao entender de nao saber falar"],
    vocabulary: [
      { ref: "chunk:tingbudong", hanzi: "我听不懂", pinyin: "wo ting bu dong", meaningPt: "nao entendi (ouvindo)", role: "productive", introduceAtPass: 1 },
      { ref: "chunk:qingzaishuoyibian", hanzi: "请再说一遍", pinyin: "qing zai shuo yi bian", meaningPt: "por favor, fale de novo", role: "core", introduceAtPass: 2 },
      { ref: "chunk:wobuhui", hanzi: "我不会说中文", pinyin: "wo bu hui shuo Zhongwen", meaningPt: "nao sei falar chines", role: "support", introduceAtPass: 3 },
    ],
    networkChunks: ["我听不懂", "请再说一遍", "我不会说中文", "tres reparos de conversa"],
  },
  "l11-falo-pouco": {
    lessonId: "l11-falo-pouco",
    themePt: "Falo um pouco — 我会说一点中文",
    newVocabularyTarget: 5,
    productiveVocabularyTarget: 3,
    structuresTarget: ["我会说一点中文", "contraste com 我不会说中文"],
    communicativeFunctions: ["dizer que fala um pouco", "suavizar a limitacao"],
    vocabulary: [
      { ref: "chunk:wohuishuoyidian", hanzi: "我会说一点中文", pinyin: "wo hui shuo yidian Zhongwen", meaningPt: "sei falar um pouco de chines", role: "core", introduceAtPass: 1 },
      { ref: "chunk:wobuhui", hanzi: "我不会说中文", pinyin: "wo bu hui shuo Zhongwen", meaningPt: "nao sei falar chines (contraste)", role: "support", introduceAtPass: 1 },
      { ref: "chunk:wozaixuezhongwen", hanzi: "我在学中文", pinyin: "wo zai xue Zhongwen", meaningPt: "estou estudando chines", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["我会说一点中文", "我不会说中文 vs 我会说一点中文", "我在学中文"],
  },
  "p3-wobuhui-shuo-zhongwen": {
    lessonId: "p3-wobuhui-shuo-zhongwen",
    themePt: "Nao sei falar chines",
    newVocabularyTarget: 4,
    productiveVocabularyTarget: 2,
    structuresTarget: ["我不会说中文"],
    communicativeFunctions: ["avisar que nao fala chines"],
    vocabulary: [
      { ref: "chunk:wobuhui", hanzi: "我不会说中文", pinyin: "wo bu hui shuo Zhongwen", meaningPt: "nao sei falar chines", role: "productive", introduceAtPass: 1 },
      { ref: "chunk:nihao", hanzi: "你好", pinyin: "ni hao", meaningPt: "ola (revisao)", role: "support", introduceAtPass: 2 },
      { ref: "chunk:wohenhao", hanzi: "我很好", pinyin: "wo hen hao", meaningPt: "estou bem (revisao)", role: "support", introduceAtPass: 3 },
    ],
    networkChunks: ["我不会说中文", "frase de emergencia"],
  },
  "p3-qing-zai-shuo-yibian": {
    lessonId: "p3-qing-zai-shuo-yibian",
    themePt: "Peca repeticao — 请再说一遍",
    newVocabularyTarget: 4,
    productiveVocabularyTarget: 2,
    structuresTarget: ["请再说一遍", "我听不懂 (contraste)"],
    communicativeFunctions: ["pedir para repetir", "diferenciar de nao entender"],
    vocabulary: [
      { ref: "chunk:qingzaishuoyibian", hanzi: "请再说一遍", pinyin: "qing zai shuo yi bian", meaningPt: "por favor, fale de novo", role: "productive", introduceAtPass: 1 },
      { ref: "chunk:tingbudong", hanzi: "我听不懂", pinyin: "wo ting bu dong", meaningPt: "nao entendi (contraste)", role: "support", introduceAtPass: 1 },
      { ref: "chunk:wohenhao", hanzi: "我很好", pinyin: "wo hen hao", meaningPt: "estou bem (revisao)", role: "support", introduceAtPass: 3 },
    ],
    networkChunks: ["请再说一遍", "我听不懂 → 请再说一遍"],
  },
  "l13-dialogo-ola": {
    lessonId: "l13-dialogo-ola",
    themePt: "Microdialogo: cumprimentar",
    newVocabularyTarget: 4,
    productiveVocabularyTarget: 2,
    structuresTarget: ["你好 → 你好吗？ → 我很好 → 谢谢"],
    communicativeFunctions: ["encadear cumprimento completo em microdialogo"],
    vocabulary: [
      { ref: "chunk:nihao", hanzi: "你好", pinyin: "ni hao", meaningPt: "ola", role: "core", introduceAtPass: 1 },
      { ref: "chunk:nihaoma", hanzi: "你好吗？", pinyin: "ni hao ma", meaningPt: "tudo bem?", role: "support", introduceAtPass: 1 },
      { ref: "chunk:wohenhao", hanzi: "我很好", pinyin: "wo hen hao", meaningPt: "estou bem", role: "support", introduceAtPass: 2 },
      { ref: "chunk:xiexie", hanzi: "谢谢", pinyin: "xiexie", meaningPt: "obrigado(a)", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["你好，你好吗？我很好。谢谢。", "microdialogo de cumprimento"],
  },
  "l13-dialogo-nome": {
    lessonId: "l13-dialogo-nome",
    themePt: "Microdialogo: se apresentar",
    newVocabularyTarget: 4,
    productiveVocabularyTarget: 2,
    structuresTarget: ["你叫什么？ → 我叫... → 我是巴西人 → 请再说一遍"],
    communicativeFunctions: ["encadear apresentacao com origem e reparo"],
    vocabulary: [
      { ref: "chunk:nijiaoshenme", hanzi: "你叫什么？", pinyin: "ni jiao shenme", meaningPt: "como voce se chama?", role: "core", introduceAtPass: 1 },
      { ref: "chunk:wojiao", hanzi: "我叫Matheus", pinyin: "wo jiao Matheus", meaningPt: "meu nome e Matheus", role: "support", introduceAtPass: 1 },
      { ref: "chunk:wature", hanzi: "我是巴西人", pinyin: "wo shi Baxi ren", meaningPt: "sou brasileiro", role: "support", introduceAtPass: 2 },
      { ref: "chunk:qingzaishuoyibian", hanzi: "请再说一遍", pinyin: "qing zai shuo yi bian", meaningPt: "por favor, fale de novo", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["你叫什么？我叫Matheus。我是巴西人。", "microdialogo de apresentacao"],
  },
  l19: {
    lessonId: "l19",
    themePt: "Numeros — um a cinco",
    newVocabularyTarget: 5,
    productiveVocabularyTarget: 3,
    structuresTarget: ["一二三四五 em sequencia", "numero isolado por som"],
    communicativeFunctions: ["contar de um a cinco", "reconhecer numero por som"],
    vocabulary: [
      { ref: "char:yi", hanzi: "一", pinyin: "yi", meaningPt: "um", role: "productive", introduceAtPass: 1 },
      { ref: "char:er", hanzi: "二", pinyin: "er", meaningPt: "dois", role: "productive", introduceAtPass: 1 },
      { ref: "char:san", hanzi: "三", pinyin: "san", meaningPt: "tres", role: "core", introduceAtPass: 1 },
      { ref: "char:si", hanzi: "四", pinyin: "si", meaningPt: "quatro", role: "support", introduceAtPass: 2 },
      { ref: "char:wu", hanzi: "五", pinyin: "wu", meaningPt: "cinco", role: "support", introduceAtPass: 2 },
    ],
    networkChunks: ["一二三四五", "sequencia numerica 1-5"],
  },
  l20: {
    lessonId: "l20",
    themePt: "Numeros — seis a dez",
    newVocabularyTarget: 5,
    productiveVocabularyTarget: 3,
    structuresTarget: ["六七八九十 em sequencia", "numero em contexto (preco/idade/telefone)"],
    communicativeFunctions: ["contar de seis a dez", "usar numero em situacao real"],
    vocabulary: [
      { ref: "char:liu", hanzi: "六", pinyin: "liu", meaningPt: "seis", role: "core", introduceAtPass: 1 },
      { ref: "char:qi", hanzi: "七", pinyin: "qi", meaningPt: "sete", role: "core", introduceAtPass: 1 },
      { ref: "char:ba8", hanzi: "八", pinyin: "ba", meaningPt: "oito", role: "support", introduceAtPass: 2 },
      { ref: "char:jiu", hanzi: "九", pinyin: "jiu", meaningPt: "nove", role: "support", introduceAtPass: 2 },
      { ref: "char:shi10", hanzi: "十", pinyin: "shi", meaningPt: "dez", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["六七八九十", "sequencia numerica 6-10", "numero em preco/telefone"],
  },
  l21: {
    lessonId: "l21",
    themePt: "Nos e voces — plural com 们",
    newVocabularyTarget: 4,
    productiveVocabularyTarget: 3,
    structuresTarget: ["我 + 们 = 我们", "你 + 们 = 你们"],
    communicativeFunctions: ["falar de grupos", "diferenciar eu/nos e voce/voces"],
    vocabulary: [
      { ref: "chunk:women", hanzi: "我们", pinyin: "women", meaningPt: "nos", role: "productive", introduceAtPass: 1 },
      { ref: "chunk:nimen", hanzi: "你们", pinyin: "nimen", meaningPt: "voces", role: "productive", introduceAtPass: 1 },
      { ref: "char:men", hanzi: "们", pinyin: "men", meaningPt: "sufixo de plural", role: "support", introduceAtPass: 2 },
    ],
    networkChunks: ["我们", "你们", "sufixo 们"],
  },
  l22: {
    lessonId: "l22",
    themePt: "China e amigos",
    newVocabularyTarget: 5,
    productiveVocabularyTarget: 3,
    structuresTarget: ["中国", "朋友", "我有 + numero + 个 + 朋友"],
    communicativeFunctions: ["nomear pais", "nomear amigo", "dizer quantidade de amigos"],
    vocabulary: [
      { ref: "chunk:zhongguo", hanzi: "中国", pinyin: "Zhongguo", meaningPt: "China", role: "core", introduceAtPass: 1 },
      { ref: "chunk:pengyou", hanzi: "朋友", pinyin: "pengyou", meaningPt: "amigo", role: "core", introduceAtPass: 1 },
      { ref: "chunk:woyousangepengyou", hanzi: "我有三个朋友", pinyin: "wo you san ge pengyou", meaningPt: "tenho tres amigos", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["中国", "朋友", "我有三个朋友"],
  },
  l25: {
    lessonId: "l25",
    themePt: "Perguntas uteis — o que e isto? / voltar para casa",
    newVocabularyTarget: 5,
    productiveVocabularyTarget: 3,
    structuresTarget: ["这是什么？", "我回家", "在哪里？ (reuso)"],
    communicativeFunctions: ["perguntar o que e algo", "dizer que vai para casa"],
    vocabulary: [
      { ref: "chunk:zheshishenme", hanzi: "这是什么？", pinyin: "zhe shi shenme", meaningPt: "o que e isto?", role: "core", introduceAtPass: 1 },
      { ref: "chunk:zaina", hanzi: "在哪里？", pinyin: "zai nali", meaningPt: "onde fica? (reuso)", role: "support", introduceAtPass: 2 },
      { ref: "chunk:wohuijia", hanzi: "我回家", pinyin: "wo hui jia", meaningPt: "vou para casa", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["这是什么？", "我回家", "pergunta + despedida da visita"],
  },
  l26: {
    lessonId: "l26",
    themePt: "Fome e gosto — 我喜欢中文",
    newVocabularyTarget: 5,
    productiveVocabularyTarget: 3,
    structuresTarget: ["我喜欢 + coisa", "我饿了 (contraste)"],
    communicativeFunctions: ["expressar gosto/preferencia", "dizer que esta com fome"],
    vocabulary: [
      { ref: "chunk:woxihuan", hanzi: "我喜欢中文", pinyin: "wo xihuan Zhongwen", meaningPt: "eu gosto de chines", role: "productive", introduceAtPass: 1 },
      { ref: "chunk:woele", hanzi: "我饿了", pinyin: "wo e le", meaningPt: "estou com fome (contraste)", role: "support", introduceAtPass: 2 },
      { ref: "chunk:haochi", hanzi: "很好吃", pinyin: "hen haochi", meaningPt: "muito gostoso", role: "support", introduceAtPass: 3 },
    ],
    networkChunks: ["我喜欢中文", "我饿了", "gosto vs fome"],
  },
  l28: {
    lessonId: "l28",
    themePt: "Vamos embora — 我们走吧",
    newVocabularyTarget: 3,
    productiveVocabularyTarget: 2,
    structuresTarget: ["我们走吧"],
    communicativeFunctions: ["convidar o grupo a sair", "encerrar o encontro com convite"],
    vocabulary: [
      { ref: "chunk:womenzouba", hanzi: "我们走吧", pinyin: "women zou ba", meaningPt: "vamos embora", role: "productive", introduceAtPass: 1 },
      { ref: "chunk:women", hanzi: "我们", pinyin: "women", meaningPt: "nos (reuso)", role: "support", introduceAtPass: 1 },
      { ref: "chunk:zaijian", hanzi: "再见", pinyin: "zaijian", meaningPt: "ate logo (relacionado)", role: "support", introduceAtPass: 3 },
    ],
    networkChunks: ["我们走吧", "convite de saida"],
  },
  "p6-saude": {
    lessonId: "p6-saude",
    themePt: "Saude — doente, dor, medico, hospital",
    newVocabularyTarget: 8,
    productiveVocabularyTarget: 4,
    structuresTarget: ["我病了", "我头疼", "我要看医生", "医院在哪里？"],
    communicativeFunctions: ["avisar que esta doente", "apontar a dor", "pedir medico", "achar hospital"],
    vocabulary: [
      { ref: "chunk:wobingle", hanzi: "我病了", pinyin: "wo bing le", meaningPt: "estou doente", role: "core", introduceAtPass: 1 },
      { ref: "chunk:wotouteng", hanzi: "我头疼", pinyin: "wo tou teng", meaningPt: "estou com dor de cabeca", role: "core", introduceAtPass: 1 },
      { ref: "chunk:woyaokanyisheng", hanzi: "我要看医生", pinyin: "wo yao kan yisheng", meaningPt: "quero ver um medico", role: "productive", introduceAtPass: 2 },
      { ref: "chunk:yiyuanzainali", hanzi: "医院在哪里？", pinyin: "yiyuan zai nali", meaningPt: "onde fica o hospital?", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["我病了", "我头疼", "我要看医生", "医院在哪里？", "caminho da saude"],
  },
  "p6-clima": {
    lessonId: "p6-clima",
    themePt: "O tempo (clima)",
    newVocabularyTarget: 9,
    productiveVocabularyTarget: 4,
    structuresTarget: ["天气很热/冷", "下雪了", "天晴了", "有风", "今天天气很好"],
    communicativeFunctions: ["descrever o clima", "comentar o tempo do dia"],
    vocabulary: [
      { ref: "chunk:tianqihenre", hanzi: "天气很热", pinyin: "tianqi hen re", meaningPt: "o tempo esta quente", role: "core", introduceAtPass: 1 },
      { ref: "chunk:tianqihenleng", hanzi: "天气很冷", pinyin: "tianqi hen leng", meaningPt: "o tempo esta frio", role: "core", introduceAtPass: 1 },
      { ref: "chunk:xiaxuele", hanzi: "下雪了", pinyin: "xia xue le", meaningPt: "esta nevando", role: "support", introduceAtPass: 2 },
      { ref: "chunk:tianqingle", hanzi: "天晴了", pinyin: "tian qing le", meaningPt: "o ceu abriu", role: "support", introduceAtPass: 2 },
      { ref: "chunk:youfeng", hanzi: "有风", pinyin: "you feng", meaningPt: "esta ventando", role: "support", introduceAtPass: 3 },
      { ref: "chunk:jintiantianqihenhao", hanzi: "今天天气很好", pinyin: "jintian tianqi hen hao", meaningPt: "hoje o tempo esta otimo", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["天气很热", "天气很冷", "下雪了", "天晴了", "今天天气很好"],
  },
  "p7-imersao-mercado": {
    lessonId: "p7-imersao-mercado",
    themePt: "Imersao: no mercado — negociar preco",
    newVocabularyTarget: 4,
    productiveVocabularyTarget: 3,
    structuresTarget: ["多少钱？", "太贵了", "negociacao no mercado"],
    communicativeFunctions: ["perguntar preco", "reclamar do preco/negociar"],
    vocabulary: [
      { ref: "chunk:duoshaoqian", hanzi: "多少钱？", pinyin: "duoshao qian", meaningPt: "quanto custa?", role: "core", introduceAtPass: 1 },
      { ref: "chunk:taiguile", hanzi: "太贵了", pinyin: "tai gui le", meaningPt: "caro demais!", role: "productive", introduceAtPass: 2 },
      { ref: "chunk:xiexie", hanzi: "谢谢", pinyin: "xiexie", meaningPt: "obrigado(a) (encerrar compra)", role: "support", introduceAtPass: 3 },
    ],
    networkChunks: ["多少钱？", "太贵了", "cena de negociacao no mercado"],
  },
  "p7-imersao-casa-amigo": {
    lessonId: "p7-imersao-casa-amigo",
    themePt: "Imersao: visita a casa da amiga",
    newVocabularyTarget: 5,
    productiveVocabularyTarget: 3,
    structuresTarget: ["这是我妈妈 (revisao)", "我想喝茶", "明天见"],
    communicativeFunctions: ["apresentar familiar em visita", "aceitar oferta de bebida", "despedir-se marcando reencontro"],
    vocabulary: [
      { ref: "chunk:zheshimama", hanzi: "这是我妈妈", pinyin: "zhe shi wo mama", meaningPt: "esta e minha mae (revisao)", role: "support", introduceAtPass: 1 },
      { ref: "chunk:woxianghe", hanzi: "我想喝茶", pinyin: "wo xiang he cha", meaningPt: "quero beber cha", role: "core", introduceAtPass: 1 },
      { ref: "chunk:mingtianjian", hanzi: "明天见", pinyin: "mingtian jian", meaningPt: "ate amanha", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: ["我想喝茶", "明天见", "visita social completa"],
  },
  "p3-wohenhao": {
    lessonId: "p3-wohenhao",
    themePt: "Estou bem (variante) — 我很好",
    newVocabularyTarget: 3,
    productiveVocabularyTarget: 2,
    structuresTarget: ["我很好", "resposta a 你好吗？"],
    communicativeFunctions: ["dizer que esta bem"],
    vocabulary: [
      { ref: "chunk:wohenhao", hanzi: "我很好", pinyin: "wo hen hao", meaningPt: "estou bem", role: "productive", introduceAtPass: 1 },
      { ref: "chunk:nihaoma", hanzi: "你好吗？", pinyin: "ni hao ma", meaningPt: "tudo bem? (pergunta que provoca a resposta)", role: "support", introduceAtPass: 1 },
    ],
    networkChunks: ["我很好", "你好吗？ → 我很好"],
  },
};

/**
 * Pedagogia V3.4 — Mastery Completion (6 lições; ver masteryCoverage.ts /
 * masteryCurriculum/completion.ts). Espalhado por fora do literal acima para
 * não disparar TS2783 ("specified more than once") ao combinar um literal
 * totalmente tipado com um Record mais largo.
 */
export const PILOT_LEXICAL_TARGETS = {
  ...CORE_PILOT_LEXICAL_TARGETS,
  ...COMPLETION_LEXICAL_TARGETS,
} as unknown as Record<MasteryPilotLessonId, UnitLexicalTargets>;

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

export function contextualChoice(
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

export function audioToAction(
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

export function sentenceTransform(
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

export function substitutionDrill(
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

export function dialogueCompletion(
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

export function reverseRecall(
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
        withEquivalentAccepts(
          reverseRecall("Peca cha", "Peca um cha sem alternativas.", "我要茶", ["我要茶", "我想喝茶"])
        ),
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
      withEquivalentAccepts(
        reverseRecall(
          "Pedido livre",
          "No restaurante, peca agua de forma natural.",
          "我想喝水",
          ["我想喝水", "我要水"]
        )
      ),
    ];
  }

  if (lessonId === "l4") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Agradecer",
          "Alguem te ajuda. O que voce diz?",
          "谢谢",
          ["谢谢", "你好", "再见", "不客气"],
          "谢谢 e a forma curta de agradecer."
        ),
        audioToAction("Ouca o agradecimento", "谢谢", "谢谢", ["谢谢", "你好", "再见", "不客气"]),
      ];
    }
    if (pass === 2) {
      return [
        dialogueCompletion(
          "Responda com cortesia",
          "A: 谢谢！ B: ___",
          "不客气",
          ["不客气", "谢谢", "你好", "再见"],
          "不客气 = de nada."
        ),
        contextualChoice(
          "Discriminar",
          "Alguem diz 谢谢. Qual resposta combina?",
          "不客气",
          ["不客气", "再见", "菜单", "多少钱"]
        ),
      ];
    }
    if (pass === 3) {
      return [
        withEquivalentAccepts(
          reverseRecall("Diga obrigado", "Agradeca sem ver alternativas.", "谢谢", ["谢谢", "谢谢！"])
        ),
        sentenceTransform(
          "De agradecer a responder",
          "谢谢",
          ["不", "客", "气"],
          ["不", "客", "气", "谢", "再"],
          "Transforme o agradecimento na resposta: 不客气."
        ),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Transferencia social",
          "Alguem te ajuda e espera sua fala. Agradeca.",
          "谢谢",
          ["谢谢", "谢谢！"]
        )
      ),
      withEquivalentAccepts(
        reverseRecall(
          "Responder de nada",
          "Alguem diz 谢谢. Responda com cortesia.",
          "不客气",
          ["不客气", "不用谢"]
        )
      ),
    ];
  }

  if (lessonId === "l24") {
    if (pass === 1) {
      return [
        audioToAction("Ouca pai", "爸爸", "爸爸", ["爸爸", "妈妈", "朋友", "家"]),
        contextualChoice(
          "Foto da familia",
          "Alguem aponta para seu pai. O que voce diz?",
          "这是我爸爸",
          ["这是我爸爸", "这是我妈妈", "谢谢", "再见"]
        ),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar parentes",
          "Alguem aponta para sua mae. O que voce diz?",
          "这是我妈妈",
          ["这是我妈妈", "这是我爸爸", "我要这个", "多少钱"]
        ),
        substitutionDrill(
          "Troque o parente",
          "这是我___",
          "妈妈",
          ["妈妈", "爸爸", "朋友", "家"],
          "Apresente sua mae."
        ),
      ];
    }
    if (pass === 3) {
      return [
        reverseRecall("Apresente o pai", "Diga: este e meu pai.", "这是我爸爸", [
          "这是我爸爸",
          "这是我爸爸。",
        ]),
        sentenceTransform(
          "Da mae para a casa",
          "这是我妈妈",
          ["这", "是", "我", "家"],
          ["这", "是", "我", "家", "妈"],
          "Transforme a apresentacao em 这是我家."
        ),
      ];
    }
    return [
      reverseRecall("Transferencia familiar", "Mostre a casa da familia.", "这是我家", [
        "这是我家",
        "这是我家。",
      ]),
      dialogueCompletion(
        "Na porta",
        "Amigo chega. Voce: ___",
        "这是我家",
        ["这是我家", "这是我爸爸", "谢谢", "买单"]
      ),
    ];
  }

  if (lessonId === "l27") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Na barraca",
          "Voce aponta para um produto e quer saber o preco.",
          "多少钱？",
          ["多少钱？", "我要这个", "你好", "再见"]
        ),
        audioToAction("Ouca o preco", "多少钱", "多少钱", ["多少钱", "我要这个", "谢谢", "菜单"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Depois do preco",
          "O preco esta bom e voce quer comprar.",
          "我要这个",
          ["我要这个", "多少钱？", "我很好", "再见"]
        ),
        substitutionDrill(
          "Complete o pedido",
          "我要___",
          "这个",
          ["这个", "茶", "水", "票"],
          "Feche a compra: 我要这个."
        ),
      ];
    }
    if (pass === 3) {
      return [
        {
          kind: "price_task",
          title: "Preco pedagogico",
          prompt: "A placa mostra 28元. Quanto custa?",
          dialoguePrompt: "A placa mostra 28元. Quanto custa?",
          priceHanzi: "28元",
          correctAnswer: "28元",
          options: ["28元", "8元", "50元", "菜单"],
          speaker: "Preco",
          explanation: "Leia o preco na placa — nao e preco real de loja.",
        },
        reverseRecall("Peca o item", "Diga que quer este item.", "我要这个", ["我要这个", "我要这个。"]),
      ];
    }
    return [
      reverseRecall("Pergunte o preco", "Na loja, pergunte quanto custa.", "多少钱", [
        "多少钱",
        "多少钱？",
      ]),
      dialogueCompletion(
        "Balcao da loja",
        "Vendedor: 你好！ Voce aponta e diz: ___",
        "我要这个",
        ["我要这个", "我很好", "再见", "公园"]
      ),
      {
        kind: "price_task",
        title: "Transferencia de preco",
        prompt: "Voce ve 18元. Qual e o preco?",
        dialoguePrompt: "Voce ve 18元. Qual e o preco?",
        priceHanzi: "18元",
        correctAnswer: "18元",
        options: ["18元", "28元", "8元", "谢谢"],
        speaker: "Preco",
      },
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

  if (lessonId === "p6-rotina-trabalho") {
    if (pass === 1) {
      return [
        audioToAction("Ouca acordar", "起床", "起床", ["起床", "上班", "下班", "睡觉"]),
        contextualChoice(
          "Manha",
          "Voce acorda. O que diz?",
          "我起床",
          ["我起床", "我下班", "谢谢", "菜单"]
        ),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Ir trabalhar",
          "Hora de ir ao trabalho. O que diz?",
          "我上班",
          ["我上班", "我起床", "我很好", "再见"]
        ),
        substitutionDrill(
          "Troque o momento",
          "我___",
          "下班",
          ["下班", "起床", "睡觉", "谢谢"],
          "Termine o expediente: 我下班."
        ),
      ];
    }
    if (pass === 3) {
      return [
        {
          kind: "route_sequence",
          title: "Ordem do dia",
          prompt: "Monte a rotina: acordar → trabalhar → sair.",
          targetParts: ["起床", "上班", "下班"],
          routeParts: ["起床", "上班", "下班"],
          bank: ["起床", "上班", "下班", "菜单"],
          explanation: "Sequencia tipica do dia de trabalho.",
        },
        reverseRecall("Quero trabalhar", "Diga que quer trabalhar.", "我要工作", ["我要工作", "我要工作。"]),
      ];
    }
    return [
      reverseRecall("Fim do expediente", "Terminou o trabalho. O que diz?", "我下班", [
        "我下班",
        "我下班。",
      ]),
      {
        kind: "route_sequence",
        title: "Dia completo",
        prompt: "Monte: acordar → trabalhar → sair → dormir.",
        targetParts: ["起床", "上班", "下班", "睡觉"],
        routeParts: ["起床", "上班", "下班", "睡觉"],
        bank: ["起床", "上班", "下班", "睡觉", "谢谢"],
      },
    ];
  }

  if (lessonId === "p6-horarios") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Pergunte a hora",
          "Voce quer saber as horas. O que pergunta?",
          "现在几点？",
          ["现在几点？", "现在八点", "中午", "再见"]
        ),
        audioToAction("Ouca a pergunta", "现在几点", "现在几点", ["现在几点", "现在八点", "中午", "谢谢"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Sao oito",
          "Sao oito horas. O que voce diz?",
          "现在八点",
          ["现在八点", "现在九点", "中午", "我很好"]
        ),
        substitutionDrill(
          "Troque a hora",
          "现在___点",
          "九",
          ["九", "八", "几", "午"],
          "Diga que sao nove horas."
        ),
      ];
    }
    if (pass === 3) {
      return [
        {
          kind: "schedule_reading",
          title: "Quadro de horarios",
          prompt: "Qual destino sai as 八点?",
          dialoguePrompt: "Qual destino sai as 八点?",
          scheduleRows: [
            { timeHanzi: "八点", destinationHanzi: "北京", labelPt: "8h → Pequim" },
            { timeHanzi: "九点", destinationHanzi: "上海", labelPt: "9h → Xangai" },
            { timeHanzi: "中午", destinationHanzi: "广州", labelPt: "meio-dia → Guangzhou" },
          ],
          correctAnswer: "北京",
          options: ["北京", "上海", "广州", "谢谢"],
          speaker: "Horario",
        },
        reverseRecall("Pergunte a hora", "Pergunte que horas sao.", "现在几点？", [
          "现在几点？",
          "现在几点",
        ]),
      ];
    }
    return [
      reverseRecall("Diga a hora", "Sao nove horas. Diga em chines.", "现在九点", [
        "现在九点",
        "现在九点。",
      ]),
      {
        kind: "schedule_reading",
        title: "Transferencia de horario",
        prompt: "Qual destino sai as 九点?",
        dialoguePrompt: "Qual destino sai as 九点?",
        scheduleRows: [
          { timeHanzi: "八点", destinationHanzi: "北京", labelPt: "8h → Pequim" },
          { timeHanzi: "九点", destinationHanzi: "上海", labelPt: "9h → Xangai" },
          { timeHanzi: "中午", destinationHanzi: "广州", labelPt: "meio-dia → Guangzhou" },
        ],
        correctAnswer: "上海",
        options: ["上海", "北京", "广州", "菜单"],
        speaker: "Horario",
      },
    ];
  }

  if (lessonId === "p6-compras") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Entre na loja",
          "Voce quer comprar roupa. O que diz?",
          "我要买衣服",
          ["我要买衣服", "我要这双鞋", "谢谢", "再见"]
        ),
        audioToAction("Ouca roupa", "衣服", "衣服", ["衣服", "鞋", "苹果", "牛奶"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Pergunte o preco",
          "Voce gostou de uma roupa. O que pergunta?",
          "这件衣服多少钱？",
          ["这件衣服多少钱？", "我要香蕉", "我很好", "再见"]
        ),
        {
          kind: "menu_reading",
          title: "Vitrine",
          prompt: "Qual item e roupa?",
          dialoguePrompt: "Qual item e roupa?",
          menuItems: [
            { hanzi: "衣服", meaningPt: "roupa", priceHanzi: "50元" },
            { hanzi: "鞋", meaningPt: "sapato", priceHanzi: "80元" },
            { hanzi: "苹果", meaningPt: "maca", priceHanzi: "8元" },
          ],
          correctAnswer: "衣服",
          options: ["衣服", "鞋", "苹果", "牛奶"],
          speaker: "Cardapio",
        },
      ];
    }
    if (pass === 3) {
      return [
        {
          kind: "price_task",
          title: "Preco da roupa",
          prompt: "A etiqueta mostra 50元. Quanto custa?",
          dialoguePrompt: "A etiqueta mostra 50元. Quanto custa?",
          priceHanzi: "50元",
          correctAnswer: "50元",
          options: ["50元", "8元", "28元", "谢谢"],
          speaker: "Preco",
        },
        reverseRecall("Compre roupa", "Diga que quer comprar roupa.", "我要买衣服", [
          "我要买衣服",
          "我要买衣服。",
        ]),
      ];
    }
    return [
      reverseRecall("Preco da peca", "Pergunte quanto custa esta roupa.", "这件衣服多少钱？", [
        "这件衣服多少钱？",
        "这件衣服多少钱",
      ]),
      dialogueCompletion(
        "Feche a compra",
        "A maca te agradou. Voce: ___",
        "我要这个苹果",
        ["我要这个苹果", "我要买衣服", "再见", "我很好"]
      ),
      {
        kind: "price_task",
        title: "Transferencia na loja",
        prompt: "Voce ve 28元 na etiqueta. Qual e o preco?",
        dialoguePrompt: "Voce ve 28元 na etiqueta. Qual e o preco?",
        priceHanzi: "28元",
        correctAnswer: "28元",
        options: ["28元", "50元", "8元", "菜单"],
        speaker: "Preco",
      },
    ];
  }

  if (lessonId === "p6-china-cidades-2") {
    if (pass === 1) {
      return [
        {
          kind: "place_label",
          title: "Chengdu",
          prompt: "Qual destas e Chengdu?",
          dialoguePrompt: "Qual destas e Chengdu?",
          correctAnswer: "成都",
          options: ["成都", "西安", "南京", "北京"],
          placeLabelCategory: "cidade",
          speaker: "Placa",
        },
        contextualChoice(
          "Comida de Sichuan",
          "Em Chengdu voce quer comida tipica. O que pede?",
          "四川菜",
          ["四川菜", "古城", "再见", "菜单"],
          "四川菜 = comida de Sichuan."
        ),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Picante?",
          "A comida de Sichuan e conhecida por ser...",
          "辣",
          ["辣", "古城", "谢谢", "地铁"],
          "辣 = picante."
        ),
        {
          kind: "city_context",
          title: "Pedido em Chengdu",
          situationPt: "No restaurante em Chengdu, peca comida de Sichuan.",
          citySituationPt: "No restaurante em Chengdu, peca comida de Sichuan.",
          dialoguePrompt: "No restaurante em Chengdu, peca comida de Sichuan.",
          correctAnswer: "我要四川菜。",
          options: ["我要四川菜。", "我很好", "再见", "古城"],
          cityId: "chengdu",
          speaker: "Situacao",
        },
      ];
    }
    if (pass === 3) {
      return [
        {
          kind: "place_label",
          title: "Xian",
          prompt: "Qual destas e Xian?",
          dialoguePrompt: "Qual destas e Xian?",
          correctAnswer: "西安",
          options: ["西安", "成都", "南京", "上海"],
          placeLabelCategory: "cidade",
          speaker: "Placa",
        },
        contextualChoice(
          "Cidade antiga",
          "Em Xian voce visita a...",
          "古城",
          ["古城", "四川菜", "辣", "谢谢"],
          "古城 = cidade antiga."
        ),
        reverseRecall("Vou a Xian", "Diga que vai a Xian.", "我去西安", ["我去西安", "我去西安。"]),
        {
          kind: "place_label",
          title: "Nanjing",
          prompt: "Qual destas e Nanjing?",
          dialoguePrompt: "Qual destas e Nanjing?",
          correctAnswer: "南京",
          options: ["南京", "成都", "西安", "北京"],
          placeLabelCategory: "cidade",
          speaker: "Placa",
        },
      ];
    }
    return [
      {
        kind: "city_context",
        title: "Nanjing em viagem",
        situationPt: "Voce reconhece Nanjing e quer ir la. O que diz?",
        citySituationPt: "Voce reconhece Nanjing e quer ir la. O que diz?",
        dialoguePrompt: "Voce reconhece Nanjing e quer ir la. O que diz?",
        correctAnswer: "我去南京。",
        options: ["我去南京。", "我很好", "再见", "菜单"],
        cityId: "nanjing",
        speaker: "Situacao",
      },
      reverseRecall("Vou a Chengdu", "Diga que vai a Chengdu.", "我去成都", ["我去成都", "我去成都。"]),
      {
        kind: "menu_reading",
        title: "Cardapio Sichuan",
        prompt: "Qual prato e comida de Sichuan?",
        dialoguePrompt: "Qual prato e comida de Sichuan?",
        menuItems: [
          { hanzi: "四川菜", meaningPt: "comida de Sichuan" },
          { hanzi: "茶", meaningPt: "cha" },
          { hanzi: "水", meaningPt: "agua" },
        ],
        correctAnswer: "四川菜",
        options: ["四川菜", "茶", "水", "古城"],
        speaker: "Cardapio",
      },
    ];
  }

  if (lessonId === "p6-survival-mandarin") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Pagar",
          "Voce quer pagar com WeChat. Qual opcao?",
          "微信支付",
          ["微信支付", "护照", "房间", "再见"]
        ),
        {
          kind: "sign_reading",
          title: "Placa de pagamento",
          signHanzi: "支付宝",
          signCategory: "payment",
          prompt: "O que significa esta placa: 支付宝?",
          dialoguePrompt: "Placa: 支付宝",
          correctAnswer: "Alipay",
          options: ["Alipay", "passaporte", "saida", "quarto"],
          speaker: "Placa",
        },
      ];
    }
    if (pass === 2) {
      return [
        reverseRecall("Cartao?", "Pergunte se pode pagar com cartao.", "可以刷卡吗？", [
          "可以刷卡吗？",
          "可以刷卡吗",
        ]),
        {
          kind: "sign_reading",
          title: "Celular",
          signHanzi: "手机",
          signCategory: "phone",
          prompt: "O que significa esta placa: 手机?",
          dialoguePrompt: "Placa: 手机",
          correctAnswer: "celular",
          options: ["celular", "passaporte", "saida", "Alipay"],
          speaker: "Placa",
        },
        contextualChoice(
          "Carregador",
          "A bateria acabou. O que voce procura?",
          "充电器",
          ["充电器", "护照", "古城", "谢谢"]
        ),
      ];
    }
    if (pass === 3) {
      return [
        contextualChoice(
          "No hotel",
          "No check-in, o que voce mostra?",
          "护照",
          ["护照", "辣", "四川菜", "再见"]
        ),
        {
          kind: "sign_reading",
          title: "Recepcao",
          signHanzi: "前台",
          signCategory: "hotel",
          prompt: "O que significa esta placa: 前台?",
          dialoguePrompt: "Placa: 前台",
          correctAnswer: "recepcao",
          options: ["recepcao", "saida", "Alipay", "celular"],
          speaker: "Placa",
        },
        dialogueCompletion(
          "Cartao do quarto",
          "Recepcionista entrega a chave. Voce recebe a ___",
          "房卡",
          ["房卡", "现金", "辣", "菜单"]
        ),
      ];
    }
    return [
      {
        kind: "sign_reading",
        title: "Saida",
        signHanzi: "出口",
        signCategory: "exit",
        prompt: "O que significa esta placa: 出口?",
        dialoguePrompt: "Placa: 出口",
        correctAnswer: "saida",
        options: ["saida", "entrada", "Alipay", "quarto"],
        speaker: "Placa",
      },
      reverseRecall("Banheiro", "Pergunte onde fica o banheiro.", "洗手间在哪里？", [
        "洗手间在哪里？",
        "洗手间在哪里",
      ]),
      withEquivalentAccepts(
        reverseRecall("Preciso de ajuda", "Diga que precisa de ajuda.", "我需要帮助", [
          "我需要帮助",
          "请帮助我",
        ])
      ),
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

  // Pedagogia V3.4 — Mastery Completion (6 licoes; ver masteryCurriculum/).
  const completionSteps = completionBonusStepsFor(lessonId, pass);
  if (completionSteps.length > 0) return completionSteps;

  // Pedagogia V3.3 — Wave 1 (24 licoes novas); mantem este arquivo enxuto.
  return wave1BonusStepsFor(lessonId, pass);
}

export function planHasProductionOrTransfer(steps: readonly { kind: StepKind }[]): boolean {
  return steps.some((step) => isProductionOrTransferKind(step.kind));
}

/** Detecta falsa profundidade: muitos kinds, sem lexemas/chunks novos na pass. */
export function isFalseDepth(lessonId: MasteryPilotLessonId, pass: MasteryPass, distinctKinds: number): boolean {
  const expansion = semanticExpansionScore(lessonId, pass);
  return distinctKinds >= 4 && expansion.newLexemes === 0 && expansion.newChunks === 0 && pass >= 2;
}
