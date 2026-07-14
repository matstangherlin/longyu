import type { Chunk } from "./types";

// Fala útil em blocos — frases de sobrevivência, não cartões soltos.
// Os ids são referenciados pelas lições da jornada: nunca renomear.
// Pinyin em forma falada (sandhi de 不 e 一 já aplicado, como se ouve).
export const CHUNKS: Chunk[] = [
  // --- Saudação e cortesia (seed) ---
  { id: "nihao", hanzi: "你好", pinyin: "nǐ hǎo", meaningPt: "Olá.", literalPt: "você + bom", tags: ["saudacao"], domain: "saudacao", level: "seed" },
  { id: "nihaoma", hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", meaningPt: "Tudo bem?", literalPt: "você bom (pergunta)", tags: ["saudacao"], domain: "saudacao", level: "seed" },
  { id: "wohenhao", hanzi: "我很好", pinyin: "wǒ hěn hǎo", meaningPt: "Estou bem.", literalPt: "eu muito bom", tags: ["saudacao"], domain: "saudacao", level: "seed" },
  { id: "jintianhenhao", hanzi: "今天很好", pinyin: "jīntiān hěn hǎo", meaningPt: "Hoje está ótimo.", literalPt: "hoje muito bom", tags: ["saudacao"], domain: "saudacao", level: "beginner" },
  { id: "xiexie", hanzi: "谢谢", pinyin: "xièxie", meaningPt: "Obrigado(a).", tags: ["cortesia"], domain: "cortesia", level: "seed" },
  { id: "bukeqi", hanzi: "不客气", pinyin: "bú kèqi", meaningPt: "De nada.", tags: ["cortesia"], domain: "cortesia", level: "seed" },
  { id: "duibuqi", hanzi: "对不起", pinyin: "duìbuqǐ", meaningPt: "Desculpa.", tags: ["cortesia"], domain: "cortesia", level: "beginner" },
  { id: "zaijian", hanzi: "再见", pinyin: "zàijiàn", meaningPt: "Até logo.", literalPt: "de novo + ver", tags: ["despedida"], domain: "saudacao", level: "seed" },
  { id: "zaoshanghao", hanzi: "早上好", pinyin: "zǎoshang hǎo", meaningPt: "Bom dia.", literalPt: "manhã + bom", tags: ["saudacao"], domain: "saudacao", level: "beginner" },
  { id: "wanshanghao", hanzi: "晚上好", pinyin: "wǎnshang hǎo", meaningPt: "Boa noite (ao chegar).", literalPt: "noite + bom", tags: ["saudacao"], domain: "saudacao", level: "beginner" },
  { id: "wanan", hanzi: "晚安", pinyin: "wǎn'ān", meaningPt: "Boa noite (ao dormir).", literalPt: "noite + paz", tags: ["saudacao", "despedida"], domain: "saudacao", level: "beginner" },
  { id: "mingtianjian", hanzi: "明天见", pinyin: "míngtiān jiàn", meaningPt: "Até amanhã.", literalPt: "amanhã + ver", tags: ["despedida"], domain: "saudacao", level: "elementary" },
  { id: "meiguanxi", hanzi: "没关系", pinyin: "méi guānxi", meaningPt: "Não foi nada; tudo bem.", literalPt: "não ter + relação", tags: ["cortesia"], domain: "cortesia", level: "beginner" },
  { id: "qingwen", hanzi: "请问", pinyin: "qǐng wèn", meaningPt: "Com licença, posso perguntar?", literalPt: "por favor perguntar", tags: ["cortesia"], domain: "cortesia", level: "beginner" },
  { id: "qingzuo", hanzi: "请坐", pinyin: "qǐng zuò", meaningPt: "Sente-se, por favor.", literalPt: "por favor + sentar", tags: ["cortesia"], domain: "cortesia", level: "elementary" },
  { id: "qingjin", hanzi: "请进", pinyin: "qǐng jìn", meaningPt: "Entre, por favor.", literalPt: "por favor + entrar", tags: ["cortesia"], domain: "cortesia", level: "elementary" },

  // --- Apresentação ---
  { id: "wojiao", hanzi: "我叫马修", pinyin: "wǒ jiào Mǎxiū", meaningPt: "Meu nome é Matheus.", literalPt: "eu chamo Matheus", tags: ["apresentacao"], domain: "apresentacao", level: "beginner" },
  { id: "nijiaoshenme", hanzi: "你叫什么？", pinyin: "nǐ jiào shénme?", meaningPt: "Como você se chama?", literalPt: "você chama o quê", tags: ["apresentacao", "pergunta"], domain: "apresentacao", level: "beginner" },
  { id: "wature", hanzi: "我是巴西人", pinyin: "wǒ shì Bāxī rén", meaningPt: "Sou brasileiro.", literalPt: "eu sou Brasil pessoa", tags: ["apresentacao"], domain: "apresentacao", level: "beginner" },
  { id: "nishinaiguoren", hanzi: "你是哪国人？", pinyin: "nǐ shì nǎ guó rén?", meaningPt: "De que país você é?", literalPt: "você é qual país pessoa", tags: ["apresentacao", "pergunta"], domain: "apresentacao", level: "beginner" },
  { id: "qingwen_nihaoma", hanzi: "请问，你好吗？", pinyin: "qǐng wèn, nǐ hǎo ma?", meaningPt: "Com licença, tudo bem?", literalPt: "por favor perguntar + tudo bem", tags: ["cortesia", "pergunta"], domain: "cortesia", level: "beginner" },
  { id: "woshixuesheng", hanzi: "我是学生", pinyin: "wǒ shì xuésheng", meaningPt: "Sou estudante.", literalPt: "eu sou estudante", tags: ["apresentacao", "estudo"], domain: "apresentacao", level: "elementary" },
  { id: "renshinihengaoxing", hanzi: "认识你很高兴", pinyin: "rènshi nǐ hěn gāoxìng", meaningPt: "Prazer em conhecer você.", literalPt: "conhecer você muito feliz", tags: ["apresentacao", "cortesia"], domain: "apresentacao", level: "elementary" },
  { id: "woyousangepengyou", hanzi: "我有三个朋友", pinyin: "wǒ yǒu sān ge péngyou", meaningPt: "Tenho três amigos.", literalPt: "eu tenho três unidades amigo", tags: ["palavras", "apresentacao"], domain: "apresentacao", level: "elementary" },

  // --- Sobrevivência de comunicação ---
  { id: "wobuhui", hanzi: "我不会说中文", pinyin: "wǒ bú huì shuō Zhōngwén", meaningPt: "Não falo chinês.", literalPt: "eu não sei falar chinês", tags: ["sobrevivencia"], domain: "sobrevivencia", level: "beginner" },
  { id: "wohuishuoyidian", hanzi: "我会说一点中文", pinyin: "wǒ huì shuō yìdiǎn Zhōngwén", meaningPt: "Sei falar um pouco de chinês.", literalPt: "eu sei falar um pouco chinês", tags: ["sobrevivencia"], domain: "sobrevivencia", level: "elementary" },
  { id: "tingbudong", hanzi: "我听不懂", pinyin: "wǒ tīng bù dǒng", meaningPt: "Não entendi (ouvindo).", tags: ["sobrevivencia"], domain: "sobrevivencia", level: "beginner" },
  { id: "qingzaishuoyibian", hanzi: "请再说一遍", pinyin: "qǐng zài shuō yí biàn", meaningPt: "Por favor, fale de novo.", literalPt: "por favor de novo fale uma vez", tags: ["sobrevivencia", "cortesia"], domain: "sobrevivencia", level: "beginner" },
  { id: "nihuishuoyingyuma", hanzi: "你会说英语吗？", pinyin: "nǐ huì shuō Yīngyǔ ma?", meaningPt: "Você fala inglês?", literalPt: "você sabe falar inglês (pergunta)", tags: ["sobrevivencia", "pergunta"], domain: "sobrevivencia", level: "survival" },
  { id: "womenzouba", hanzi: "我们走吧", pinyin: "wǒmen zǒu ba", meaningPt: "Vamos embora.", literalPt: "nós ir (vamos)", tags: ["sobrevivencia"], domain: "sobrevivencia", level: "elementary" },
  { id: "dengyixia", hanzi: "等一下", pinyin: "děng yíxià", meaningPt: "Espera um pouco.", literalPt: "esperar um momento", tags: ["sobrevivencia"], domain: "sobrevivencia", level: "survival" },

  // --- Perguntas básicas ---
  { id: "zheshishenme", hanzi: "这是什么？", pinyin: "zhè shì shénme?", meaningPt: "O que é isto?", literalPt: "isto é o quê", tags: ["pergunta"], domain: "pergunta", level: "beginner" },
  { id: "zheshishui", hanzi: "这是水", pinyin: "zhè shì shuǐ", meaningPt: "Isto é água.", literalPt: "isto é água", tags: ["pergunta"], domain: "pergunta", level: "beginner" },
  { id: "nashirenm", hanzi: "那是人吗", pinyin: "nà shì rén ma", meaningPt: "Aquilo é uma pessoa?", literalPt: "aquilo é pessoa (pergunta)", tags: ["pergunta"], domain: "pergunta", level: "beginner" },
  { id: "zaina", hanzi: "在哪里？", pinyin: "zài nǎlǐ?", meaningPt: "Onde fica?", literalPt: "está onde", tags: ["pergunta"], domain: "pergunta", level: "beginner" },
  { id: "nine", hanzi: "你呢？", pinyin: "nǐ ne?", meaningPt: "E você?", literalPt: "você (partícula)", tags: ["pergunta"], domain: "pergunta", level: "beginner" },
  { id: "shenmeshihou", hanzi: "什么时候？", pinyin: "shénme shíhou?", meaningPt: "Quando?", literalPt: "o quê + momento", tags: ["pergunta"], domain: "pergunta", level: "survival" },
  { id: "zenmeyang", hanzi: "怎么样？", pinyin: "zěnmeyàng?", meaningPt: "Que tal? Como está?", tags: ["pergunta"], domain: "pergunta", level: "survival" },

  // --- Compras ---
  { id: "duoshaoqian", hanzi: "多少钱？", pinyin: "duōshao qián?", meaningPt: "Quanto custa?", literalPt: "quanto dinheiro", tags: ["compras"], domain: "compras", level: "beginner" },
  { id: "zhegeduoshaoqian", hanzi: "这个多少钱？", pinyin: "zhège duōshao qián?", meaningPt: "Quanto custa este?", literalPt: "este quanto dinheiro", tags: ["compras"], domain: "compras", level: "elementary" },
  { id: "woyao", hanzi: "我要这个", pinyin: "wǒ yào zhège", meaningPt: "Eu quero este.", literalPt: "eu quero este", tags: ["compras"], domain: "compras", level: "beginner" },
  { id: "taiguile", hanzi: "太贵了", pinyin: "tài guì le", meaningPt: "Caro demais!", literalPt: "demais caro (já)", tags: ["compras"], domain: "compras", level: "elementary" },
  { id: "pianyiyidian", hanzi: "便宜一点", pinyin: "piányi yìdiǎn", meaningPt: "Mais barato, por favor.", literalPt: "barato um pouco", tags: ["compras"], domain: "compras", level: "survival" },

  // --- Comida e bebida ---
  { id: "haochi", hanzi: "很好吃", pinyin: "hěn hǎochī", meaningPt: "Muito gostoso.", literalPt: "muito bom-comer", tags: ["comida"], domain: "comida", level: "elementary" },
  { id: "woele", hanzi: "我饿了", pinyin: "wǒ è le", meaningPt: "Estou com fome.", literalPt: "eu faminto (já)", tags: ["comida"], domain: "comida", level: "elementary" },
  { id: "woxianghe", hanzi: "我想喝茶", pinyin: "wǒ xiǎng hē chá", meaningPt: "Quero beber chá.", literalPt: "eu querer beber chá", tags: ["comida"], domain: "bebida", level: "elementary" },
  { id: "womenchifanba", hanzi: "我们吃饭吧", pinyin: "wǒmen chīfàn ba", meaningPt: "Vamos comer.", literalPt: "nós comer refeição (vamos)", tags: ["comida"], domain: "comida", level: "elementary" },
  { id: "woyaomifan", hanzi: "我要米饭", pinyin: "wǒ yào mǐfàn", meaningPt: "Quero arroz.", literalPt: "eu quero arroz", tags: ["comida"], domain: "comida", level: "survival" },
  { id: "buyaola", hanzi: "不要辣", pinyin: "búyào là", meaningPt: "Sem pimenta, por favor.", literalPt: "não querer picante", tags: ["comida"], domain: "comida", level: "survival" },
  { id: "maidan", hanzi: "买单", pinyin: "mǎidān", meaningPt: "A conta, por favor.", literalPt: "comprar + conta", tags: ["comida"], domain: "comida", level: "survival" },
  { id: "fuwuyuan", hanzi: "服务员！", pinyin: "fúwùyuán!", meaningPt: "Garçom! / Moça!", literalPt: "atendente", tags: ["comida"], domain: "comida", level: "survival" },

  // --- Família ---
  { id: "zheshibaba", hanzi: "这是我爸爸", pinyin: "zhè shì wǒ bàba", meaningPt: "Este é meu pai.", literalPt: "este é meu pai", tags: ["familia"], domain: "familia", level: "elementary" },
  { id: "zheshimama", hanzi: "这是我妈妈", pinyin: "zhè shì wǒ māma", meaningPt: "Esta é minha mãe.", literalPt: "este é minha mãe", tags: ["familia"], domain: "familia", level: "elementary" },

  // --- Gostos e estudo ---
  { id: "woxihuan", hanzi: "我喜欢中文", pinyin: "wǒ xǐhuan Zhōngwén", meaningPt: "Eu gosto de chinês.", literalPt: "eu gostar chinês", tags: ["gostos"], domain: "gostos", level: "elementary" },
  { id: "wozaixuezhongwen", hanzi: "我在学中文", pinyin: "wǒ zài xué Zhōngwén", meaningPt: "Estou estudando chinês.", literalPt: "eu estar-em estudar chinês", tags: ["estudo"], domain: "estudo", level: "elementary" },
  { id: "woquxuexiao", hanzi: "我去学校", pinyin: "wǒ qù xuéxiào", meaningPt: "Vou para a escola.", literalPt: "eu ir escola", tags: ["estudo"], domain: "estudo", level: "elementary" },

  // --- Transporte ---
  { id: "wozuochuzuche", hanzi: "我坐出租车", pinyin: "wǒ zuò chūzūchē", meaningPt: "Vou de táxi.", literalPt: "eu sentar táxi", tags: ["transporte"], domain: "transporte", level: "survival" },
  { id: "huochezhanzainali", hanzi: "火车站在哪里？", pinyin: "huǒchēzhàn zài nǎlǐ?", meaningPt: "Onde fica a estação de trem?", literalPt: "trem-estação está onde", tags: ["transporte", "pergunta"], domain: "transporte", level: "survival" },
  { id: "piaoduoshaoqian", hanzi: "票多少钱？", pinyin: "piào duōshao qián?", meaningPt: "Quanto custa a passagem?", literalPt: "passagem quanto dinheiro", tags: ["transporte", "compras"], domain: "transporte", level: "survival" },

  // --- Respostas sociais curtas ---
  { id: "haode", hanzi: "好的", pinyin: "hǎo de", meaningPt: "Está bem; ok.", literalPt: "bom (partícula)", tags: ["frase_social"], domain: "frase_social", level: "beginner" },
  { id: "meiwenti", hanzi: "没问题", pinyin: "méi wèntí", meaningPt: "Sem problema.", literalPt: "não ter problema", tags: ["frase_social"], domain: "frase_social", level: "elementary" },
  { id: "taihaole", hanzi: "太好了", pinyin: "tài hǎo le", meaningPt: "Que ótimo!", literalPt: "demais bom (já)", tags: ["frase_social"], domain: "frase_social", level: "elementary" },
  { id: "woyeshi", hanzi: "我也是", pinyin: "wǒ yě shì", meaningPt: "Eu também.", literalPt: "eu também ser", tags: ["frase_social"], domain: "frase_social", level: "elementary" },
  { id: "wozhidao", hanzi: "我知道", pinyin: "wǒ zhīdào", meaningPt: "Eu sei.", literalPt: "eu saber", tags: ["frase_social"], domain: "frase_social", level: "elementary" },
  { id: "wobuzhidao", hanzi: "我不知道", pinyin: "wǒ bù zhīdào", meaningPt: "Não sei.", literalPt: "eu não saber", tags: ["frase_social"], domain: "frase_social", level: "elementary" },

  // --- Palavras-âncora usadas nas lições ---
  { id: "women", hanzi: "我们", pinyin: "wǒmen", meaningPt: "nós", literalPt: "eu + (plural)", tags: ["palavras"], domain: "pessoa", level: "seed" },
  { id: "nimen", hanzi: "你们", pinyin: "nǐmen", meaningPt: "vocês", literalPt: "você + (plural)", tags: ["palavras"], domain: "pessoa", level: "beginner" },
  { id: "zhongguo", hanzi: "中国", pinyin: "Zhōngguó", meaningPt: "China", literalPt: "meio + país", tags: ["palavras"], domain: "lugar", level: "beginner" },
  { id: "pengyou", hanzi: "朋友", pinyin: "péngyou", meaningPt: "amigo", tags: ["palavras"], domain: "pessoa", level: "beginner" },
];

export const chunkById = Object.fromEntries(CHUNKS.map((c) => [c.id, c]));
