// Consulta caractere → { pinyin, significado }, para o hover-traduzir.
// Combina os CHARACTERS/RADICALS já existentes com um dicionário extra
// que cobre os caracteres que aparecem nos textos e chunks.
import { CHARACTERS } from "./characters";
import { CHUNKS } from "./chunks";
import { RADICALS } from "./radicals";
import { VOCABULARY } from "./vocabulary";
import { containsNumericPinyin, formatPinyinForDisplay, stripPinyinTone } from "../lib/pinyin";

export interface Gloss {
  pinyin?: string;
  pt: string;
}

export interface RichGlossPart {
  text: string;
  pinyin?: string;
  meaningPt: string;
  role?: string;
  charId?: string;
}

export interface RichGloss {
  fullText: string;
  fullPinyin?: string;
  fullMeaningPt?: string;
  literalMeaningPt?: string;
  parts: RichGlossPart[];
}

const charByHanzi: Record<string, Gloss> = Object.fromEntries(
  CHARACTERS.map((c) => [c.hanzi, { pinyin: c.pinyin, pt: c.meaningPt }])
);

const radicalByGlyph: Record<string, Gloss> = Object.fromEntries(
  RADICALS.map((r) => [r.glyph, { pinyin: r.pinyin, pt: r.meaningPt }])
);

// Caracteres que aparecem no conteúdo mas não estão na lista principal.
const EXTRA: Record<string, Gloss> = {
  吗: { pinyin: "ma", pt: "(partícula de pergunta)" },
  叫: { pinyin: "jiào", pt: "chamar(-se)" },
  马: { pinyin: "mǎ", pt: "cavalo" },
  修: { pinyin: "xiū", pt: "(nome) Xiū; reparar" },
  巴: { pinyin: "bā", pt: "Brasil (巴西)" },
  西: { pinyin: "xī", pt: "oeste (também em 巴西)" },
  点: { pinyin: "diǎn", pt: "pouco; ponto; hora" },
  文: { pinyin: "wén", pt: "escrita; língua" },
  今: { pinyin: "jīn", pt: "hoje, agora" },
  天: { pinyin: "tiān", pt: "dia; céu" },
  息: { pinyin: "xī", pt: "descanso; respirar" },
  外: { pinyin: "wài", pt: "fora, exterior" },
  面: { pinyin: "miàn", pt: "lado; superfície; rosto" },
  和: { pinyin: "hé", pt: "e; com" },
  很: { pinyin: "hěn", pt: "muito" },
  静: { pinyin: "jìng", pt: "quieto, silencioso" },
  什: { pinyin: "shén", pt: "o quê (em 什么)" },
  么: { pinyin: "me", pt: "(partícula, em 什么)" },
  多: { pinyin: "duō", pt: "muito; quanto" },
  少: { pinyin: "shǎo", pt: "pouco" },
  钱: { pinyin: "qián", pt: "dinheiro" },
  请: { pinyin: "qǐng", pt: "por favor; convidar" },
  问: { pinyin: "wèn", pt: "perguntar" },
  遍: { pinyin: "biàn", pt: "vez; ocorrência" },
  哪: { pinyin: "nǎ", pt: "qual; onde" },
  里: { pinyin: "lǐ", pt: "dentro; em" },
  吃: { pinyin: "chī", pt: "comer" },
  客: { pinyin: "kè", pt: "convidado" },
  气: { pinyin: "qì", pt: "ar; energia" },
  对: { pinyin: "duì", pt: "certo; em relação a" },
  起: { pinyin: "qǐ", pt: "levantar" },
  再: { pinyin: "zài", pt: "de novo" },
  见: { pinyin: "jiàn", pt: "ver" },
  听: { pinyin: "tīng", pt: "ouvir" },
  懂: { pinyin: "dǒng", pt: "entender" },
  妈: { pinyin: "mā", pt: "mãe" },
  麻: { pinyin: "má", pt: "cânhamo; dormente" },
  骂: { pinyin: "mà", pt: "xingar" },
  腰: { pinyin: "yāo", pt: "cintura" },
  摇: { pinyin: "yáo", pt: "balançar" },
  咬: { pinyin: "yǎo", pt: "morder" },
  十: { pinyin: "shí", pt: "dez" },
  使: { pinyin: "shǐ", pt: "usar; fazer" },
  湿: { pinyin: "shī", pt: "molhado" },
  爸: { pinyin: "bà", pt: "pai" },
  喜: { pinyin: "xǐ", pt: "gostar; alegria" },
  欢: { pinyin: "huān", pt: "alegre; feliz" },
  饿: { pinyin: "è", pt: "ter fome" },
  想: { pinyin: "xiǎng", pt: "pensar; querer" },
  喝: { pinyin: "hē", pt: "beber" },
  茶: { pinyin: "chá", pt: "chá" },
  太: { pinyin: "tài", pt: "demais; muito" },
  贵: { pinyin: "guì", pt: "caro" },
  走: { pinyin: "zǒu", pt: "andar; ir embora" },
  吧: { pinyin: "ba", pt: "(partícula de sugestão)" },
  友: { pinyin: "yǒu", pt: "amigo (em 朋友)" },
  // Pessoas e tratamento
  您: { pinyin: "nín", pt: "senhor(a) — você respeitoso" },
  先: { pinyin: "xiān", pt: "primeiro; antes (em 先生)" },
  儿: { pinyin: "ér", pt: "criança; sufixo -r" },
  孩: { pinyin: "hái", pt: "criança (em 孩子)" },
  医: { pinyin: "yī", pt: "medicina (em 医生/医院)" },
  服: { pinyin: "fú", pt: "servir; roupa" },
  务: { pinyin: "wù", pt: "tarefa, serviço" },
  员: { pinyin: "yuán", pt: "funcionário, membro" },
  // Números e medidas
  零: { pinyin: "líng", pt: "zero" },
  两: { pinyin: "liǎng", pt: "dois (antes de classificador)" },
  百: { pinyin: "bǎi", pt: "cem" },
  千: { pinyin: "qiān", pt: "mil" },
  块: { pinyin: "kuài", pt: "yuan (dinheiro); pedaço" },
  号: { pinyin: "hào", pt: "número; dia do mês" },
  // Tempo
  星: { pinyin: "xīng", pt: "estrela (em 星期)" },
  期: { pinyin: "qī", pt: "período (em 星期)" },
  周: { pinyin: "zhōu", pt: "semana; volta" },
  末: { pinyin: "mò", pt: "fim (em 周末)" },
  钟: { pinyin: "zhōng", pt: "relógio; hora (em 分钟)" },
  小: { pinyin: "xiǎo", pt: "pequeno" },
  间: { pinyin: "jiān", pt: "espaço; sala" },
  早: { pinyin: "zǎo", pt: "cedo; manhã" },
  午: { pinyin: "wǔ", pt: "meio-dia" },
  晚: { pinyin: "wǎn", pt: "noite; tarde (atrasado)" },
  候: { pinyin: "hòu", pt: "momento (em 时候)" },
  // Comida e bebida
  条: { pinyin: "tiáo", pt: "classificador de coisas compridas" },
  包: { pinyin: "bāo", pt: "embrulhar; pão (em 面包)" },
  牛: { pinyin: "niú", pt: "boi, vaca" },
  鸡: { pinyin: "jī", pt: "galinha, frango" },
  蛋: { pinyin: "dàn", pt: "ovo" },
  果: { pinyin: "guǒ", pt: "fruta; resultado" },
  苹: { pinyin: "píng", pt: "maçã (em 苹果)" },
  香: { pinyin: "xiāng", pt: "perfumado, cheiroso" },
  蕉: { pinyin: "jiāo", pt: "banana (em 香蕉)" },
  汤: { pinyin: "tāng", pt: "sopa" },
  热: { pinyin: "rè", pt: "quente" },
  咖: { pinyin: "kā", pt: "café (em 咖啡)" },
  啡: { pinyin: "fēi", pt: "café (em 咖啡)" },
  奶: { pinyin: "nǎi", pt: "leite" },
  爷: { pinyin: "yé", pt: "avô (em 爷爷)" },
  汁: { pinyin: "zhī", pt: "suco" },
  啤: { pinyin: "pí", pt: "cerveja (em 啤酒)" },
  酒: { pinyin: "jiǔ", pt: "bebida alcoólica" },
  可: { pinyin: "kě", pt: "poder; aceitável" },
  乐: { pinyin: "lè", pt: "alegria (em 可乐/快乐)" },
  杯: { pinyin: "bēi", pt: "copo, taça" },
  米: { pinyin: "mǐ", pt: "arroz (cru); metro" },
  辣: { pinyin: "là", pt: "picante" },
  甜: { pinyin: "tián", pt: "doce" },
  // Survival / China Real V3.2
  成: { pinyin: "chéng", pt: "tornar-se; (em 成都) Chengdu" },
  安: { pinyin: "ān", pt: "paz; (em 西安) Xi'an" },
  古: { pinyin: "gǔ", pt: "antigo (em 古城)" },
  城: { pinyin: "chéng", pt: "cidade murada (em 古城)" },
  川: { pinyin: "chuān", pt: "rio; (em 四川) Sichuan" },
  元: { pinyin: "yuán", pt: "yuan (moeda)" },
  微: { pinyin: "wēi", pt: "pequeno; (em 微信) WeChat" },
  信: { pinyin: "xìn", pt: "carta; confiança; (em 微信)" },
  支: { pinyin: "zhī", pt: "pagar; (em 支付)" },
  付: { pinyin: "fù", pt: "pagar" },
  宝: { pinyin: "bǎo", pt: "tesouro; (em 支付宝)" },
  刷: { pinyin: "shuā", pt: "passar (cartão)" },
  充: { pinyin: "chōng", pt: "carregar; encher" },
  电: { pinyin: "diàn", pt: "eletricidade" },
  器: { pinyin: "qì", pt: "aparelho" },
  台: { pinyin: "tái", pt: "balcão; plataforma" },
  入: { pinyin: "rù", pt: "entrar" },
  需: { pinyin: "xū", pt: "precisar" },
  助: { pinyin: "zhù", pt: "ajuda" },
  老: { pinyin: "lǎo", pt: "velho; antigo" },
  金: { pinyin: "jīn", pt: "ouro; dinheiro (em 现金)" },
  // Lugares
  北: { pinyin: "běi", pt: "norte" },
  京: { pinyin: "jīng", pt: "capital (em 北京)" },
  上: { pinyin: "shàng", pt: "cima; subir" },
  海: { pinyin: "hǎi", pt: "mar" },
  广: { pinyin: "guǎng", pt: "amplo (em 广州)" },
  州: { pinyin: "zhōu", pt: "prefeitura; (em 广州) cidade" },
  深: { pinyin: "shēn", pt: "profundo (em 深圳)" },
  圳: { pinyin: "zhèn", pt: "(em 深圳) Shenzhen" },
  民: { pinyin: "mín", pt: "povo (em 人民)" },
  转: { pinyin: "zhuǎn", pt: "virar (em 左转/右转)" },
  长: { pinyin: "cháng", pt: "longo (em 长安)" },
  校: { pinyin: "xiào", pt: "escola (em 学校)" },
  馆: { pinyin: "guǎn", pt: "estabelecimento (em 饭馆)" },
  餐: { pinyin: "cān", pt: "refeição (em 餐厅)" },
  厅: { pinyin: "tīng", pt: "salão (em 餐厅)" },
  商: { pinyin: "shāng", pt: "comércio (em 商店)" },
  店: { pinyin: "diàn", pt: "loja; estabelecimento" },
  街: { pinyin: "jiē", pt: "rua (em 街道)" },
  超: { pinyin: "chāo", pt: "super (em 超市)" },
  市: { pinyin: "shì", pt: "mercado; cidade" },
  院: { pinyin: "yuàn", pt: "pátio; instituição (em 医院)" },
  银: { pinyin: "yín", pt: "prata (em 银行)" },
  行: { pinyin: "xíng/háng", pt: "andar; firma (em 银行)" },
  洗: { pinyin: "xǐ", pt: "lavar" },
  手: { pinyin: "shǒu", pt: "mão" },
  头: { pinyin: "tóu", pt: "cabeça" },
  场: { pinyin: "chǎng", pt: "local aberto (em 机场)" },
  园: { pinyin: "yuán", pt: "jardim; parque (em 公园)" },
  那: { pinyin: "nà", pt: "aquele; aquilo" },
  附: { pinyin: "fù", pt: "junto a (em 附近)" },
  近: { pinyin: "jìn", pt: "perto" },
  东: { pinyin: "dōng", pt: "leste" },
  // Compras e transporte
  便: { pinyin: "pián/biàn", pt: "barato (em 便宜); conveniente" },
  宜: { pinyin: "yí", pt: "adequado (em 便宜)" },
  衣: { pinyin: "yī", pt: "roupa (em 衣服)" },
  卡: { pinyin: "kǎ", pt: "cartão" },
  账: { pinyin: "zhàng", pt: "conta (em 账单)" },
  房: { pinyin: "fáng", pt: "quarto; casa" },
  护: { pinyin: "hù", pt: "proteger (em 护照)" },
  照: { pinyin: "zhào", pt: "documento; foto (em 护照)" },
  李: { pinyin: "li", pt: "bagagem (em 行李)" },
  公: { pinyin: "gōng", pt: "público" },
  交: { pinyin: "jiāo", pt: "cruzar; entregar (em 公交车)" },
  出: { pinyin: "chū", pt: "sair" },
  租: { pinyin: "zū", pt: "alugar (em 出租车)" },
  地: { pinyin: "dì", pt: "terra, chão" },
  铁: { pinyin: "tiě", pt: "ferro (em 地铁)" },
  自: { pinyin: "zì", pt: "próprio, si mesmo" },
  // Estudo e trabalho
  习: { pinyin: "xí", pt: "praticar (em 学习)" },
  汉: { pinyin: "Hàn", pt: "chinês, etnia Han (em 汉语)" },
  英: { pinyin: "yīng", pt: "Inglaterra (em 英语)" },
  葡: { pinyin: "pú", pt: "uva (em 葡萄牙)" },
  萄: { pinyin: "táo", pt: "uva (em 葡萄牙)" },
  词: { pinyin: "cí", pt: "palavra" },
  课: { pinyin: "kè", pt: "aula, lição" },
  题: { pinyin: "tí", pt: "questão (em 问题)" },
  司: { pinyin: "sī", pt: "administrar (em 公司)" },
  忙: { pinyin: "máng", pt: "ocupado" },
  累: { pinyin: "lèi", pt: "cansado" },
  病: { pinyin: "bìng", pt: "doente; doença" },
  疼: { pinyin: "téng", pt: "dor; doer" },
  班: { pinyin: "bān", pt: "turno; classe (em 上班)" },
  // Sentimentos e opinião
  高: { pinyin: "gāo", pt: "alto; (em 高兴) feliz" },
  兴: { pinyin: "xìng", pt: "ânimo (em 高兴)" },
  觉: { pinyin: "jué/jiào", pt: "sentir; sono (em 睡觉)" },
  得: { pinyin: "de/dé", pt: "partícula; obter" },
  最: { pinyin: "zuì", pt: "o mais (superlativo)" },
  // Gramática e conectores
  为: { pinyin: "wèi", pt: "por; para (em 为什么)" },
  怎: { pinyin: "zěn", pt: "como (em 怎么)" },
  别: { pinyin: "bié", pt: "não faça; outro" },
  能: { pinyin: "néng", pt: "poder (capacidade)" },
  以: { pinyin: "yǐ", pt: "por meio de (em 可以)" },
  都: { pinyin: "dōu", pt: "todos; ambos" },
  真: { pinyin: "zhēn", pt: "verdadeiro; realmente" },
  还: { pinyin: "hái", pt: "ainda; também" },
  因: { pinyin: "yīn", pt: "causa (em 因为)" },
  所: { pinyin: "suǒ", pt: "lugar; (em 所以) então" },
  应: { pinyin: "yīng", pt: "dever (em 应该)" },
  该: { pinyin: "gāi", pt: "dever (em 应该)" },
  已: { pinyin: "yǐ", pt: "já (em 已经)" },
  经: { pinyin: "jīng", pt: "passar por (em 已经)" },
  // Verbos e ações
  住: { pinyin: "zhù", pt: "morar" },
  认: { pinyin: "rèn", pt: "reconhecer (em 认识)" },
  识: { pinyin: "shí", pt: "conhecer (em 认识)" },
  做: { pinyin: "zuò", pt: "fazer" },
  给: { pinyin: "gěi", pt: "dar; para (alguém)" },
  开: { pinyin: "kāi", pt: "abrir; dirigir" },
  帮: { pinyin: "bāng", pt: "ajudar" },
  等: { pinyin: "děng", pt: "esperar" },
  找: { pinyin: "zhǎo", pt: "procurar; dar troco" },
  用: { pinyin: "yòng", pt: "usar" },
  睡: { pinyin: "shuì", pt: "dormir" },
  床: { pinyin: "chuáng", pt: "cama (em 起床)" },
  知: { pinyin: "zhī", pt: "saber (em 知道)" },
  进: { pinyin: "jìn", pt: "entrar" },
  迎: { pinyin: "yíng", pt: "receber (em 欢迎)" },
  // Frases sociais
  干: { pinyin: "gān", pt: "secar (em 干杯)" },
  加: { pinyin: "jiā", pt: "adicionar (em 加油)" },
  油: { pinyin: "yóu", pt: "óleo; combustível" },
  打: { pinyin: "dǎ", pt: "bater; fazer (em 打包)" },
  慢: { pinyin: "màn", pt: "devagar" },
  够: { pinyin: "gòu", pt: "suficiente" },
  事: { pinyin: "shì", pt: "assunto, coisa" },
  烦: { pinyin: "fán", pt: "incômodo (em 麻烦)" },
  关: { pinyin: "guān", pt: "fechar; (em 关系) relação" },
  系: { pinyin: "xì", pt: "relação (em 关系)" },
  单: { pinyin: "dān", pt: "conta; único (em 买单)" },
  样: { pinyin: "yàng", pt: "jeito, tipo (em 怎么样)" },
  下: { pinyin: "xià", pt: "abaixo; descer; (em 一下) um momento" },
  呢: { pinyin: "ne", pt: "partícula de pergunta-eco (e...?)" },
  道: { pinyin: "dào", pt: "caminho; (em 知道) saber" },
  她: { pinyin: "tā", pt: "ela" },
  分: { pinyin: "fēn", pt: "minuto; dividir" },
  牙: { pinyin: "yá", pt: "dente; (em 葡萄牙) Portugal" },
  久: { pinyin: "jiǔ", pt: "muito tempo (em 好久不见)" },
  // Natureza
  云: { pinyin: "yún", pt: "nuvem" },
  雨: { pinyin: "yǔ", pt: "chuva" },
  树: { pinyin: "shù", pt: "árvore" },
  花: { pinyin: "huā", pt: "flor" },
  草: { pinyin: "cǎo", pt: "grama; capim" },
  // Clima
  冷: { pinyin: "lěng", pt: "frio" },
  晴: { pinyin: "qíng", pt: "ensolarado; céu limpo" },
  雪: { pinyin: "xuě", pt: "neve" },
  风: { pinyin: "fēng", pt: "vento" },
  // Direções
  左: { pinyin: "zuǒ", pt: "esquerda" },
  右: { pinyin: "yòu", pt: "direita" },
  前: { pinyin: "qián", pt: "frente; antes" },
  后: { pinyin: "hòu", pt: "atrás; depois" },
  边: { pinyin: "biān", pt: "lado; beira" },
  直: { pinyin: "zhí", pt: "reto; em frente" },
  往: { pinyin: "wǎng", pt: "em direção a" },
  南: { pinyin: "nán", pt: "sul" },
  路: { pinyin: "lù", pt: "rua; caminho" },
  // Compras (roupas e itens)
  鞋: { pinyin: "xié", pt: "sapato" },
  双: { pinyin: "shuāng", pt: "par (classificador de pares)" },
  件: { pinyin: "jiàn", pt: "peça (classificador de roupas)" },
  登: { pinyin: "dēng", pt: "embarcar; subir" },
  航: { pinyin: "háng", pt: "navegar; voo (em 航班)" },
  舒: { pinyin: "shū", pt: "confortável (em 舒服)" },
  烧: { pinyin: "shāo", pt: "queimar; febre (em 发烧)" },
  预: { pinyin: "yù", pt: "de antemão (em 预订)" },
  订: { pinyin: "dìng", pt: "reservar; pedir" },
  停: { pinyin: "tíng", pt: "parar; estacionar" },
  药: { pinyin: "yào", pt: "remédio" },
  肚: { pinyin: "dù", pt: "barriga" },
  半: { pinyin: "bàn", pt: "meio; e meia" },
  发: { pinyin: "fā", pt: "emitir; ter (em 发烧)" },
  同: { pinyin: "tóng", pt: "mesmo; juntos (em 同学)" },
  汽: { pinyin: "qì", pt: "vapor (em 汽车)" },
  梯: { pinyin: "tī", pt: "escada (em 电梯)" },
  厕: { pinyin: "cè", pt: "banheiro (em 厕所)" },
  话: { pinyin: "huà", pt: "fala; palavras (em 说话)" },
  价: { pinyin: "jià", pt: "preço (em 价钱)" },
  旁: { pinyin: "páng", pt: "lado (em 旁边)" },
  感: { pinyin: "gǎn", pt: "sentir (em 感冒)" },
  冒: { pinyin: "mào", pt: "emitir (em 感冒)" },
  码: { pinyin: "mǎ", pt: "número; código (em 号码)" },
  板: { pinyin: "bǎn", pt: "tábua (em 老板)" },
  春: { pinyin: "chūn", pt: "primavera" },
  夏: { pinyin: "xià", pt: "verão" },
  秋: { pinyin: "qiū", pt: "outono" },
  冬: { pinyin: "dōng", pt: "inverno" },
  阴: { pinyin: "yīn", pt: "nublado (em 阴天)" },
};

const LOOKUP: Record<string, Gloss> = { ...EXTRA, ...radicalByGlyph, ...charByHanzi };

/** Devolve o significado/pinyin de um caractere, ou null se desconhecido. */
export function glossFor(ch: string): Gloss | null {
  return LOOKUP[ch] ?? null;
}

interface GlossEntry {
  text: string;
  pinyin?: string;
  meaningPt: string;
  literalMeaningPt?: string;
  /** Nota de uso curta (registro, armadilha) — vira "explicação" no popover. */
  notePt?: string;
  role: string;
  charId?: string;
  rank: number;
}

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const HANZI_PUNCTUATION_RE = /[，。！？、,.!?\s：；;“”"（）()]/g;
const END_PUNCTUATION_RE = /[，。！？、,.!?？\s]+$/g;
const TOKEN_RE = /([\u3400-\u9fff\uf900-\ufaff]+|[\p{Script=Latin}][\p{Script=Latin}'’.-]*[1-5]?)/gu;
const PINYIN_TONE_MARK_RE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛ]/u;
const LATIN_TOKEN_RE = /^[\p{Script=Latin}][\p{Script=Latin}'’.-]*[1-5]?$/u;
const PINYIN_INITIALS = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w", ""] as const;
const PINYIN_FINALS = new Set([
  "a",
  "ai",
  "an",
  "ang",
  "ao",
  "e",
  "ei",
  "en",
  "eng",
  "er",
  "i",
  "ia",
  "ian",
  "iang",
  "iao",
  "ie",
  "in",
  "ing",
  "iong",
  "iu",
  "o",
  "ong",
  "ou",
  "u",
  "ua",
  "uai",
  "uan",
  "uang",
  "ue",
  "ui",
  "un",
  "uo",
  "ü",
  "üe",
  "üan",
  "ün",
]);

const PROPER_NAMES: GlossEntry[] = [
  { text: "Matheus", pinyin: "Matheus", meaningPt: "Matheus", role: "nome próprio", rank: 4 },
];

const charEntries: GlossEntry[] = CHARACTERS.map((char) => ({
  text: char.hanzi,
  pinyin: char.pinyin,
  meaningPt: char.meaningPt,
  role: "hànzì",
  charId: char.id,
  rank: 1,
}));

const radicalEntries: GlossEntry[] = RADICALS.map((radical) => ({
  text: radical.glyph,
  pinyin: radical.pinyin,
  meaningPt: radical.meaningPt,
  role: "peça",
  rank: 0,
}));

const vocabEntries: GlossEntry[] = VOCABULARY.map((entry) => ({
  text: entry.hanzi,
  pinyin: entry.pinyin,
  meaningPt: entry.meaningPt,
  literalMeaningPt: entry.literalPt,
  notePt: entry.notePt,
  role: entry.kind === "phrase" ? "frase" : "palavra",
  rank: 3,
}));

const chunkEntries: GlossEntry[] = CHUNKS.map((chunk) => ({
  text: chunk.hanzi,
  pinyin: chunk.pinyin,
  meaningPt: chunk.meaningPt,
  literalMeaningPt: chunk.literalPt,
  role: "chunk",
  rank: 4,
}));

const ALL_ENTRIES = [
  ...radicalEntries,
  ...charEntries,
  ...vocabEntries,
  ...chunkEntries,
  ...PROPER_NAMES,
];

const ENTRY_BY_NORMALIZED = new Map<string, GlossEntry>();
for (const entry of [...ALL_ENTRIES].sort((a, b) => a.rank - b.rank)) {
  ENTRY_BY_NORMALIZED.set(normalizeHanzi(entry.text), entry);
}

const PART_ENTRIES = [...ALL_ENTRIES]
  .filter((entry) => CJK_RE.test(entry.text))
  .sort((a, b) => normalizeHanzi(b.text).length - normalizeHanzi(a.text).length || b.rank - a.rank);

export function richGlossFor(
  text: string,
  overrides: { pinyin?: string; meaningPt?: string; literalMeaningPt?: string } = {}
): RichGloss | null {
  const cleanText = text.trim();
  if (!cleanText) return null;

  const withoutTrailingPunctuation = cleanText.replace(END_PUNCTUATION_RE, "");
  const normalized = normalizeHanzi(cleanText);
  const exact = ENTRY_BY_NORMALIZED.get(normalized);
  const personalized = personalizedNameGloss(withoutTrailingPunctuation);
  const parts = personalized?.parts ?? segmentText(withoutTrailingPunctuation, Boolean(exact));
  const fallbackPart = parts.length === 0 && exact ? [entryToPart(exact)] : parts;

  const fullPinyin = chooseFullPinyin(overrides.pinyin, personalized?.fullPinyin, exact?.pinyin, fallbackPart);
  const fullMeaningPt = overrides.meaningPt ?? personalized?.fullMeaningPt ?? exact?.meaningPt;
  const literalMeaningPt =
    overrides.literalMeaningPt ??
    personalized?.literalMeaningPt ??
    exact?.literalMeaningPt ??
    literalFromParts(fallbackPart);

  if (!fullPinyin && !fullMeaningPt && fallbackPart.length === 0) return null;

  return {
    fullText: cleanText,
    fullPinyin,
    fullMeaningPt,
    literalMeaningPt,
    parts: dedupeAdjacentParts(fallbackPart),
  };
}

function personalizedNameGloss(text: string): RichGloss | null {
  const match = /^我叫\s*(.+)$/u.exec(text);
  if (!match) return null;
  const name = match[1].trim();
  if (!name) return null;
  const namePart = partForToken(name);
  if (!namePart) return null;
  return {
    fullText: text,
    fullPinyin: `wǒ jiào ${namePart.pinyin ?? name}`,
    fullMeaningPt: `Meu nome é ${namePart.meaningPt === "Matheus" ? "Matheus" : name}.`,
    literalMeaningPt: `eu chamo ${name}`,
    parts: [
      entryToPart(ENTRY_BY_NORMALIZED.get("我")!),
      entryToPart(ENTRY_BY_NORMALIZED.get("叫")!),
      namePart,
    ],
  };
}

function segmentText(text: string, avoidExactFullMatch: boolean): RichGlossPart[] {
  const parts: RichGlossPart[] = [];
  for (const match of text.matchAll(TOKEN_RE)) {
    const token = match[0];
    if (CJK_RE.test(token)) {
      parts.push(...segmentHanzi(token, avoidExactFullMatch));
    } else {
      const part = partForToken(token);
      if (part) parts.push(part);
    }
  }
  return parts;
}

function segmentHanzi(text: string, avoidExactFullMatch: boolean): RichGlossPart[] {
  const normalizedText = normalizeHanzi(text);
  const parts: RichGlossPart[] = [];
  let index = 0;

  while (index < normalizedText.length) {
    const match = findPartEntry(normalizedText, index, avoidExactFullMatch && index === 0);
    if (match) {
      parts.push(entryToPart(match.entry));
      index += match.length;
      continue;
    }

    const char = normalizedText[index];
    const gloss = glossFor(char);
    parts.push({
      text: char,
      pinyin: formatMaybePinyin(gloss?.pinyin),
      meaningPt: gloss?.pt ?? "parte ainda não cadastrada",
      role: "hànzì",
      charId: CHARACTERS.find((entry) => entry.hanzi === char)?.id,
    });
    index += 1;
  }

  return parts;
}

function findPartEntry(
  normalizedText: string,
  index: number,
  avoidExactFullMatch: boolean
): { entry: GlossEntry; length: number } | null {
  for (const entry of PART_ENTRIES) {
    const normalized = normalizeHanzi(entry.text);
    if (!normalized || !normalizedText.startsWith(normalized, index)) continue;
    if (avoidExactFullMatch && normalized.length === normalizedText.length) continue;
    return { entry, length: normalized.length };
  }
  return null;
}

export function isMandarinGlossableToken(token: string): boolean {
  const raw = token.trim();
  if (!raw) return false;
  if (CJK_RE.test(raw)) return true;
  if (!LATIN_TOKEN_RE.test(raw)) return false;

  const normalized = raw.normalize("NFC");
  if (PROPER_NAMES.some((entry) => entry.text === normalized)) return true;

  if (normalized.toLowerCase() === "pinyin") return false;
  return containsNumericPinyin(normalized) || isLikelyPinyinToken(normalized);
}

function isLikelyPinyinToken(token: string): boolean {
  const sanitized = stripPinyinTone(token)
    .replace(/[1-5]/g, "")
    .replace(/u:/gi, (match) => (match === "U:" ? "Ü" : "ü"))
    .replace(/v/gi, (match) => (match === "V" ? "Ü" : "ü"))
    .toLowerCase();
  if (!/^[a-zü]+$/u.test(sanitized)) return false;
  return PINYIN_INITIALS.some((initial) => {
    if (!sanitized.startsWith(initial)) return false;
    const final = sanitized.slice(initial.length);
    return PINYIN_FINALS.has(final);
  });
}

function partForToken(token: string): RichGlossPart | null {
  const normalized = normalizeHanzi(token);
  const known = normalized ? ENTRY_BY_NORMALIZED.get(normalized) : undefined;
  if (known) return entryToPart(known);
  if (!isMandarinGlossableToken(token)) return null;
  if (PROPER_NAMES.some((entry) => entry.text === token.trim())) {
    return {
      text: token,
      meaningPt: "nome próprio",
      role: "nome próprio",
    };
  }
  return null;
}

function entryToPart(entry: GlossEntry): RichGlossPart {
  return {
    text: entry.text,
    pinyin: formatMaybePinyin(entry.pinyin),
    meaningPt: entry.meaningPt,
    role: entry.role,
    charId: entry.charId,
  };
}

function dedupeAdjacentParts(parts: RichGlossPart[]): RichGlossPart[] {
  return parts.filter((part, index) => {
    const previous = parts[index - 1];
    return !previous || previous.text !== part.text || previous.meaningPt !== part.meaningPt;
  });
}

function literalFromParts(parts: RichGlossPart[]): string | undefined {
  if (parts.length < 2) return undefined;
  const pieces = parts
    .map((part) => part.meaningPt)
    .filter((meaning) => meaning && meaning !== "parte ainda não cadastrada" && meaning !== "nome próprio");
  return pieces.length >= 2 ? pieces.join(" + ") : undefined;
}

function chooseFullPinyin(
  override: string | undefined,
  personalized: string | undefined,
  exact: string | undefined,
  parts: RichGlossPart[]
): string | undefined {
  if (override && pinyinHasTone(override)) return formatMaybePinyin(override);
  return (
    formatMaybePinyin(personalized) ??
    formatMaybePinyin(exact) ??
    pinyinFromParts(parts) ??
    formatMaybePinyin(override)
  );
}

function pinyinHasTone(value: string): boolean {
  return PINYIN_TONE_MARK_RE.test(value) || containsNumericPinyin(value);
}

function pinyinFromParts(parts: RichGlossPart[]): string | undefined {
  const values = parts.map((part) => part.pinyin?.trim()).filter((value): value is string => Boolean(value));
  return values.length > 0 ? values.join(" ") : undefined;
}

function normalizeHanzi(value: string): string {
  return value.replace(HANZI_PUNCTUATION_RE, "");
}

function formatMaybePinyin(value: string | undefined): string | undefined {
  return value?.trim() ? formatPinyinForDisplay(value) : undefined;
}

// ---------------------------------------------------------------------------
// API do glossário em três níveis (caractere · chunk · frase).
// Reaproveita a segmentação acima; não duplica lógica de lookup.
// ---------------------------------------------------------------------------

/** Glossário de um único termo (caractere isolado ou palavra/chunk). */
export interface GlossaryEntry {
  text: string;
  pinyin?: string;
  meaningPt: string;
  /** Sentido literal parte a parte (útil em chunks). */
  literalMeaningPt?: string;
  /** Explicação/nota de uso curta. */
  notePt?: string;
  /** Tipo amigável para o aluno: "pronome", "partícula", "expressão"… */
  role: string;
  charId?: string;
  /** true quando é um único caractere → ajuda de nível 1. */
  single: boolean;
}

/** Glossário da frase inteira: mesmo shape de RichGloss. */
export type PhraseGlossary = RichGloss;

// Classe gramatical amigável para os termos mais frequentes.
// Não temos POS completo nos dados; este mapa cobre o núcleo do repertório
// para que o "tipo" no popover seja informativo (ex.: 我 → pronome).
const WORD_CLASS: Record<string, string> = {
  // pronomes
  我: "pronome", 你: "pronome", 您: "pronome", 他: "pronome", 她: "pronome", 它: "pronome",
  我们: "pronome", 你们: "pronome", 他们: "pronome", 这: "pronome", 那: "pronome",
  // partículas
  吗: "partícula", 呢: "partícula", 吧: "partícula", 了: "partícula", 的: "partícula",
  么: "partícula", 得: "partícula", 地: "partícula",
  // advérbios / negação
  不: "advérbio de negação", 没: "advérbio de negação", 很: "advérbio", 也: "advérbio",
  都: "advérbio", 还: "advérbio", 太: "advérbio", 最: "advérbio", 真: "advérbio",
  // conjunções / preposições
  和: "conjunção", 在: "verbo/preposição", 给: "verbo/preposição",
  // verbos frequentes
  是: "verbo", 有: "verbo", 会: "verbo", 想: "verbo", 说: "verbo", 要: "verbo",
  吃: "verbo", 喝: "verbo", 去: "verbo", 来: "verbo", 叫: "verbo", 做: "verbo",
  // numerais
  一: "numeral", 二: "numeral", 两: "numeral", 三: "numeral", 十: "numeral",
};

function displayRole(text: string, rawRole: string | undefined, single: boolean): string {
  const cls = WORD_CLASS[normalizeHanzi(text)];
  if (cls) return cls;
  switch (rawRole) {
    case "hànzì":
      return single ? "caractere" : "palavra";
    case "peça":
      return "peça (radical)";
    case "chunk":
    case "frase":
      return "expressão";
    case "palavra":
      return "palavra";
    case "nome próprio":
      return "nome próprio";
    default:
      return rawRole ?? (single ? "caractere" : "expressão");
  }
}

/**
 * Ajuda de um termo isolado (nível 1 caractere / nível 2 chunk).
 * Devolve null quando não há nenhum dado — a UI decide o fallback.
 */
export function getGlossaryEntry(text: string): GlossaryEntry | null {
  const raw = text.trim();
  if (!raw) return null;

  const normalized = normalizeHanzi(raw);
  const single = Array.from(normalized).length === 1 && CJK_RE.test(normalized);

  // 1. Entrada exata do banco (chunk, palavra, caractere, radical, nome).
  const exact = normalized ? ENTRY_BY_NORMALIZED.get(normalized) : undefined;
  if (exact) {
    const decomposition = segmentText(raw, true);
    return {
      text: raw,
      pinyin: formatMaybePinyin(exact.pinyin),
      meaningPt: exact.meaningPt,
      literalMeaningPt: exact.literalMeaningPt ?? literalFromParts(decomposition),
      notePt: exact.notePt,
      role: displayRole(raw, exact.role, single),
      charId: exact.charId,
      single,
    };
  }

  // 2. Caractere isolado conhecido no LOOKUP (CHARACTERS + RADICALS + EXTRA).
  if (single) {
    const g = glossFor(normalized);
    if (g) {
      return {
        text: raw,
        pinyin: formatMaybePinyin(g.pinyin),
        meaningPt: g.pt,
        role: displayRole(raw, "hànzì", true),
        charId: CHARACTERS.find((c) => c.hanzi === normalized)?.id,
        single: true,
      };
    }
  }

  // 3. Multi-caractere sem entrada exata: recompõe pela frase.
  const rich = richGlossFor(raw);
  if (rich && (rich.fullMeaningPt || rich.fullPinyin)) {
    return {
      text: raw,
      pinyin: rich.fullPinyin,
      meaningPt: rich.fullMeaningPt ?? "",
      literalMeaningPt: rich.literalMeaningPt,
      role: displayRole(raw, "expressão", single),
      single,
    };
  }

  return null;
}

/** Ajuda da frase inteira (nível 3): frase + pinyin + tradução + literal + partes. */
export function getPhraseGlossary(
  text: string,
  overrides: { pinyin?: string; meaningPt?: string; literalMeaningPt?: string } = {}
): PhraseGlossary | null {
  return richGlossFor(text, overrides);
}
