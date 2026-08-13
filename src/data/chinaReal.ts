/**
 * Pedagogia V3.1 — eixo "China Real"
 *
 * Geografia e enderecos entram como contexto de linguagem (nao como lista escolar).
 * Piloto: Beijing / Shanghai / Guangzhou / Shenzhen + lu/jie/hao + direcoes.
 */

export type ChinaCityId =
  | "beijing"
  | "shanghai"
  | "guangzhou"
  | "shenzhen"
  | "chengdu"
  | "xian"
  | "nanjing"
  | "hangzhou"
  | "wuhan"
  | "chongqing";

export interface ChinaCity {
  id: ChinaCityId;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  /** Gancho cultural curto — nao e aula de geografia. */
  culturalHookPt: string;
  /** Piloto V3.1 introduz cedo. */
  pilot: boolean;
  chunkId: string;
}

export interface ChinaStreet {
  id: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  chunkId: string;
}

export interface AdminUnit {
  id: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  role: "country" | "province_marker" | "city_marker" | "district_marker";
}

/** Cidades de alta relevancia; so as pilot=true entram na primeira PR. */
export const CHINA_CITIES: ChinaCity[] = [
  {
    id: "beijing",
    hanzi: "北京",
    pinyin: "Běijīng",
    meaningPt: "Pequim",
    culturalHookPt: "Capital nacional.",
    pilot: true,
    chunkId: "beijing",
  },
  {
    id: "shanghai",
    hanzi: "上海",
    pinyin: "Shànghǎi",
    meaningPt: "Xangai",
    culturalHookPt: "Grande centro economico.",
    pilot: true,
    chunkId: "shanghai",
  },
  {
    id: "guangzhou",
    hanzi: "广州",
    pinyin: "Guǎngzhōu",
    meaningPt: "Cantao / Guangzhou",
    culturalHookPt: "Hub do sul (Guangdong).",
    pilot: true,
    chunkId: "guangzhou",
  },
  {
    id: "shenzhen",
    hanzi: "深圳",
    pinyin: "Shēnzhèn",
    meaningPt: "Shenzhen",
    culturalHookPt: "Centro tecnologico proximo a Hong Kong.",
    pilot: true,
    chunkId: "shenzhen",
  },
  {
    id: "chengdu",
    hanzi: "成都",
    pinyin: "Chéngdū",
    meaningPt: "Chengdu",
    culturalHookPt: "Associada a Sichuan.",
    pilot: false,
    chunkId: "chengdu",
  },
  {
    id: "xian",
    hanzi: "西安",
    pinyin: "Xī'ān",
    meaningPt: "Xian",
    culturalHookPt: "Historia antiga da China.",
    pilot: false,
    chunkId: "xian",
  },
  {
    id: "nanjing",
    hanzi: "南京",
    pinyin: "Nánjīng",
    meaningPt: "Nanjing",
    culturalHookPt: "Ex-capital e cidade historica.",
    pilot: false,
    chunkId: "nanjing",
  },
  {
    id: "hangzhou",
    hanzi: "杭州",
    pinyin: "Hángzhōu",
    meaningPt: "Hangzhou",
    culturalHookPt: "Lago Oeste e centro digital.",
    pilot: false,
    chunkId: "hangzhou",
  },
  {
    id: "wuhan",
    hanzi: "武汉",
    pinyin: "Wǔhàn",
    meaningPt: "Wuhan",
    culturalHookPt: "Encruzilhada no centro da China.",
    pilot: false,
    chunkId: "wuhan",
  },
  {
    id: "chongqing",
    hanzi: "重庆",
    pinyin: "Chóngqìng",
    meaningPt: "Chongqing",
    culturalHookPt: "Megacidade no sudoeste.",
    pilot: false,
    chunkId: "chongqing",
  },
];

export const CHINA_PILOT_CITIES = CHINA_CITIES.filter((city) => city.pilot);

export const CHINA_STREETS: ChinaStreet[] = [
  { id: "beijinglu", hanzi: "北京路", pinyin: "Běijīng lù", meaningPt: "Beijing Road", chunkId: "beijinglu" },
  { id: "nanjinglu", hanzi: "南京路", pinyin: "Nánjīng lù", meaningPt: "Nanjing Road", chunkId: "nanjinglu" },
  { id: "renminlu", hanzi: "人民路", pinyin: "Rénmín lù", meaningPt: "Renmin Road", chunkId: "renminlu" },
  { id: "zhongshanlu", hanzi: "中山路", pinyin: "Zhōngshān lù", meaningPt: "Zhongshan Road", chunkId: "zhongshanlu" },
  { id: "changanjie", hanzi: "长安街", pinyin: "Cháng'ān jiē", meaningPt: "Chang'an Avenue", chunkId: "changanjie" },
];

export const ADMIN_UNITS: AdminUnit[] = [
  { id: "zhongguo", hanzi: "中国", pinyin: "Zhōngguó", meaningPt: "China", role: "country" },
  { id: "sheng", hanzi: "省", pinyin: "shěng", meaningPt: "provincia", role: "province_marker" },
  { id: "shi", hanzi: "市", pinyin: "shì", meaningPt: "cidade (unidade administrativa)", role: "city_marker" },
  { id: "qu", hanzi: "区", pinyin: "qū", meaningPt: "distrito", role: "district_marker" },
];

export const ADDRESS_CORE = [
  { id: "lu_road", hanzi: "路", pinyin: "lù", meaningPt: "rua; avenida" },
  { id: "jie_street", hanzi: "街", pinyin: "jiē", meaningPt: "rua" },
  { id: "hao_number", hanzi: "号", pinyin: "hào", meaningPt: "numero (endereco)" },
] as const;

export const NAV_CORE = [
  { id: "zuo_left", hanzi: "左", pinyin: "zuǒ", meaningPt: "esquerda" },
  { id: "you_right", hanzi: "右", pinyin: "yòu", meaningPt: "direita" },
  { id: "qian_front", hanzi: "前", pinyin: "qián", meaningPt: "frente" },
  { id: "hou_back", hanzi: "后", pinyin: "hòu", meaningPt: "atras" },
  { id: "pangbian", hanzi: "旁边", pinyin: "pángbiān", meaningPt: "ao lado" },
  { id: "jin_near", hanzi: "近", pinyin: "jìn", meaningPt: "perto" },
  { id: "yuan_far", hanzi: "远", pinyin: "yuǎn", meaningPt: "longe" },
  { id: "zenmezou", hanzi: "怎么走", pinyin: "zěnme zǒu", meaningPt: "como chegar?" },
  { id: "yizhizou", hanzi: "一直走", pinyin: "yìzhí zǒu", meaningPt: "siga em frente" },
  { id: "zuozhuan", hanzi: "左转", pinyin: "zuǒ zhuǎn", meaningPt: "vire a esquerda" },
  { id: "youzhuan", hanzi: "右转", pinyin: "yòu zhuǎn", meaningPt: "vire a direita" },
] as const;

export const SURVIVAL_URBAN = [
  { id: "ditiezhan", hanzi: "地铁站", pinyin: "dìtiězhàn", meaningPt: "estacao de metro" },
  { id: "gongjiaozhan", hanzi: "公交站", pinyin: "gōngjiāozhàn", meaningPt: "ponto de onibus" },
  { id: "huochezhan", hanzi: "火车站", pinyin: "huǒchēzhàn", meaningPt: "estacao de trem" },
  { id: "jichang", hanzi: "机场", pinyin: "jīchǎng", meaningPt: "aeroporto" },
  { id: "qiantai", hanzi: "前台", pinyin: "qiántái", meaningPt: "recepcao" },
  { id: "fangjian", hanzi: "房间", pinyin: "fángjiān", meaningPt: "quarto" },
  { id: "fangka", hanzi: "房卡", pinyin: "fángkǎ", meaningPt: "cartao do quarto" },
  { id: "xishoujian", hanzi: "洗手间", pinyin: "xǐshǒujiān", meaningPt: "banheiro" },
  { id: "chongdian", hanzi: "充电", pinyin: "chōngdiàn", meaningPt: "carregar (bateria)" },
  { id: "shouji", hanzi: "手机", pinyin: "shǒujī", meaningPt: "celular" },
  { id: "xianjin", hanzi: "现金", pinyin: "xiànjīn", meaningPt: "dinheiro vivo" },
  { id: "weixinzhifu", hanzi: "微信支付", pinyin: "Wēixìn zhīfù", meaningPt: "WeChat Pay" },
  { id: "zhifubao", hanzi: "支付宝", pinyin: "Zhīfùbǎo", meaningPt: "Alipay" },
  { id: "huzhao", hanzi: "护照", pinyin: "hùzhào", meaningPt: "passaporte" },
] as const;

export type MapDirectionAction = "left" | "right" | "straight" | "destination";

export interface MapDirectionStepData {
  promptPt?: string;
  promptHanzi?: string;
  /** Sequencia visual simplificada: A -> setas -> destino. */
  fromLabel: string;
  toLabel: string;
  correctAction: MapDirectionAction;
  actionOptions: MapDirectionAction[];
  scaffoldLevel?: 1 | 2 | 3 | 4;
}

export const MAP_DIRECTION_LABELS: Record<MapDirectionAction, { hanzi: string; pinyin: string; pt: string }> = {
  left: { hanzi: "左转", pinyin: "zuǒ zhuǎn", pt: "esquerda" },
  right: { hanzi: "右转", pinyin: "yòu zhuǎn", pt: "direita" },
  straight: { hanzi: "一直走", pinyin: "yìzhí zǒu", pt: "em frente" },
  destination: { hanzi: "到了", pinyin: "dào le", pt: "chegou" },
};

export function chinaCityById(id: string): ChinaCity | undefined {
  return CHINA_CITIES.find((city) => city.id === id);
}

export function chinaStreetById(id: string): ChinaStreet | undefined {
  return CHINA_STREETS.find((street) => street.id === id);
}

/** Rede linguistica minima por cidade do piloto. */
export function cityNetworkChunks(cityHanzi: string): string[] {
  return [
    cityHanzi,
    `${cityHanzi}在哪里？`,
    `${cityHanzi}在中国。`,
    `我去${cityHanzi}。`,
    `我要去${cityHanzi}。`,
    `${cityHanzi}火车站在哪里？`,
  ];
}

export const CHINA_REAL_PILOT_LESSON_IDS = [
  "p6-china-cidades",
  "p6-china-ruas",
  "p6-direcoes",
] as const;

export type ChinaRealPilotLessonId = (typeof CHINA_REAL_PILOT_LESSON_IDS)[number];

export function isChinaRealPilotLesson(lessonId: string): lessonId is ChinaRealPilotLessonId {
  return (CHINA_REAL_PILOT_LESSON_IDS as readonly string[]).includes(lessonId);
}
