import type { Character } from "./types";

// Caracteres-semente: alta frequência (ordem do first-5000) + os que têm
// decomposição limpa para a competência Hànzì. Glosas autorais em pt-BR.
export const CHARACTERS: Character[] = [
  { id: "de", hanzi: "的", pinyin: "de", toneless: "de", tone: 5, meaningPt: "partícula possessiva (de)", freqRank: 1, components: [] },
  { id: "shi", hanzi: "是", pinyin: "shì", toneless: "shi", tone: 4, meaningPt: "ser; sim", freqRank: 2, components: [] },
  { id: "bu", hanzi: "不", pinyin: "bù", toneless: "bu", tone: 4, meaningPt: "não", freqRank: 3, components: [] },
  { id: "wo", hanzi: "我", pinyin: "wǒ", toneless: "wo", tone: 3, meaningPt: "eu, me", freqRank: 4, components: [] },
  { id: "yi", hanzi: "一", pinyin: "yī", toneless: "yi", tone: 1, meaningPt: "um; sozinho", freqRank: 5, components: [] },
  { id: "you", hanzi: "有", pinyin: "yǒu", toneless: "you", tone: 3, meaningPt: "ter; existir", freqRank: 6, components: [] },
  { id: "da", hanzi: "大", pinyin: "dà", toneless: "da", tone: 4, meaningPt: "grande", freqRank: 7, components: [] },
  { id: "xiao", hanzi: "小", pinyin: "xiǎo", toneless: "xiao", tone: 3, meaningPt: "pequeno", freqRank: 120, components: [] },
  { id: "zai", hanzi: "在", pinyin: "zài", toneless: "zai", tone: 4, meaningPt: "estar em; em", freqRank: 8, components: [] },
  {
    id: "ren", hanzi: "人", pinyin: "rén", toneless: "ren", tone: 2, meaningPt: "pessoa, gente", freqRank: 9, components: ["ren"],
    exampleWords: [{ hanzi: "巴西人", pinyin: "Bāxī rén", pt: "brasileiro(a)" }],
  },
  { id: "le", hanzi: "了", pinyin: "le", toneless: "le", tone: 5, meaningPt: "partícula de ação completa", freqRank: 10, components: [] },
  { id: "zhong", hanzi: "中", pinyin: "zhōng", toneless: "zhong", tone: 1, meaningPt: "meio, centro; China", freqRank: 11, components: [] },
  { id: "dao", hanzi: "到", pinyin: "dào", toneless: "dao", tone: 4, meaningPt: "chegar; até", freqRank: 12, components: [] },
  { id: "yao", hanzi: "要", pinyin: "yào", toneless: "yao", tone: 4, meaningPt: "querer; precisar", freqRank: 13, components: [] },
  { id: "zhe", hanzi: "这", pinyin: "zhè", toneless: "zhe", tone: 4, meaningPt: "este, isto", freqRank: 14, components: [] },
  { id: "ge", hanzi: "个", pinyin: "gè", toneless: "ge", tone: 4, meaningPt: "classificador (peça/unidade)", freqRank: 15, components: [] },
  {
    id: "ni", hanzi: "你", pinyin: "nǐ", toneless: "ni", tone: 3, meaningPt: "você", freqRank: 16, components: ["ren"],
    mnemonicPt: "Leva o radical de pessoa (亻) à esquerda — é alguém com quem você fala.",
    exampleWords: [{ hanzi: "你好", pinyin: "nǐ hǎo", pt: "olá" }],
  },
  { id: "hui", hanzi: "会", pinyin: "huì", toneless: "hui", tone: 4, meaningPt: "saber fazer; poder; reunião", freqRank: 17, components: [] },
  {
    id: "hao", hanzi: "好", pinyin: "hǎo", toneless: "hao", tone: 3, meaningPt: "bom; bem", freqRank: 18, components: ["nv", "zi"],
    mnemonicPt: "Mulher (女) + filho (子): mãe e criança juntas — isso é bom.",
    exampleWords: [{ hanzi: "你好", pinyin: "nǐ hǎo", pt: "olá" }],
  },
  { id: "shuo", hanzi: "说", pinyin: "shuō", toneless: "shuo", tone: 1, meaningPt: "falar, dizer", freqRank: 19, components: ["yan"] },
  { id: "ta", hanzi: "他", pinyin: "tā", toneless: "ta", tone: 1, meaningPt: "ele", freqRank: 20, components: ["ren"] },
  { id: "kan", hanzi: "看", pinyin: "kàn", toneless: "kan", tone: 4, meaningPt: "ver, olhar", freqRank: 21, components: [] },
  { id: "sheng", hanzi: "生", pinyin: "shēng", toneless: "sheng", tone: 1, meaningPt: "nascer; vida", freqRank: 22, components: [] },
  { id: "guo", hanzi: "国", pinyin: "guó", toneless: "guo", tone: 2, meaningPt: "país, nação", freqRank: 23, components: [] },
  { id: "na_which", hanzi: "哪", pinyin: "nǎ", toneless: "na", tone: 3, meaningPt: "qual; onde", freqRank: 280, components: ["kou"] },
  { id: "lai", hanzi: "来", pinyin: "lái", toneless: "lai", tone: 2, meaningPt: "vir", freqRank: 24, components: [] },
  { id: "men", hanzi: "们", pinyin: "men", toneless: "men", tone: 5, meaningPt: "sufixo de plural (nós/eles)", freqRank: 25, components: ["ren"] },
  { id: "ye", hanzi: "也", pinyin: "yě", toneless: "ye", tone: 3, meaningPt: "também", freqRank: 26, components: [] },
  {
    id: "xue", hanzi: "学", pinyin: "xué", toneless: "xue", tone: 2, meaningPt: "aprender, estudar", freqRank: 27, components: ["zi"],
    mnemonicPt: "Embaixo está a criança (子): aprender é coisa de quem cresce.",
  },
  {
    id: "jia", hanzi: "家", pinyin: "jiā", toneless: "jia", tone: 1, meaningPt: "casa, família", freqRank: 28, components: ["mian"],
    mnemonicPt: "Sob um teto (宀): o lugar onde a família vive.",
  },
  // --- Famílias gráficas (peças básicas que também são caracteres) ---
  { id: "mu", hanzi: "木", pinyin: "mù", toneless: "mu", tone: 4, meaningPt: "árvore, madeira", freqRank: 240, components: ["mu"] },
  { id: "shui", hanzi: "水", pinyin: "shuǐ", toneless: "shui", tone: 3, meaningPt: "água", freqRank: 220, components: ["shui"] },
  { id: "huo", hanzi: "火", pinyin: "huǒ", toneless: "huo", tone: 3, meaningPt: "fogo", freqRank: 410, components: ["huo"] },
  { id: "shan", hanzi: "山", pinyin: "shān", toneless: "shan", tone: 1, meaningPt: "montanha", freqRank: 360, components: ["shan"] },
  { id: "kou", hanzi: "口", pinyin: "kǒu", toneless: "kou", tone: 3, meaningPt: "boca", freqRank: 290, components: ["kou"] },
  { id: "ri", hanzi: "日", pinyin: "rì", toneless: "ri", tone: 4, meaningPt: "sol, dia", freqRank: 130, components: ["ri"] },
  { id: "yue", hanzi: "月", pinyin: "yuè", toneless: "yue", tone: 4, meaningPt: "lua, mês", freqRank: 150, components: ["yue"] },
  { id: "nv", hanzi: "女", pinyin: "nǚ", toneless: "nv", tone: 3, meaningPt: "mulher", freqRank: 200, components: ["nv"] },
  { id: "zi", hanzi: "子", pinyin: "zǐ", toneless: "zi", tone: 3, meaningPt: "filho, criança", freqRank: 80, components: ["zi"] },
  // --- Estrelas da decomposição ---
  {
    id: "xiu", hanzi: "休", pinyin: "xiū", toneless: "xiu", tone: 1, meaningPt: "descansar", freqRank: 900, components: ["ren", "mu"],
    mnemonicPt: "Uma pessoa (亻) encostada numa árvore (木) está descansando.",
  },
  {
    id: "lin", hanzi: "林", pinyin: "lín", toneless: "lin", tone: 2, meaningPt: "bosque, floresta", freqRank: 700, components: ["mu", "mu"],
    mnemonicPt: "Duas árvores (木 + 木): onde há muitas árvores, há um bosque.",
  },
  {
    id: "ming", hanzi: "明", pinyin: "míng", toneless: "ming", tone: 2, meaningPt: "claro, brilhante", freqRank: 320, components: ["ri", "yue"],
    mnemonicPt: "Sol (日) + lua (月): as duas maiores luzes juntas = brilhante.",
  },
  {
    id: "an", hanzi: "安", pinyin: "ān", toneless: "an", tone: 1, meaningPt: "paz, tranquilo", freqRank: 480, components: ["mian", "nv"],
    mnemonicPt: "Uma mulher (女) sob um teto (宀): em casa, em paz.",
  },
  { id: "xie", hanzi: "谢", pinyin: "xiè", toneless: "xie", tone: 4, meaningPt: "agradecer", freqRank: 1100, components: ["yan"], exampleWords: [{ hanzi: "谢谢", pinyin: "xièxie", pt: "obrigado(a)" }] },
  // --- Números ---
  { id: "er", hanzi: "二", pinyin: "èr", toneless: "er", tone: 4, meaningPt: "dois", freqRank: 100, components: [] },
  { id: "san", hanzi: "三", pinyin: "sān", toneless: "san", tone: 1, meaningPt: "três", freqRank: 110, components: [] },
  { id: "si", hanzi: "四", pinyin: "sì", toneless: "si", tone: 4, meaningPt: "quatro", freqRank: 180, components: [] },
  { id: "wu", hanzi: "五", pinyin: "wǔ", toneless: "wu", tone: 3, meaningPt: "cinco", freqRank: 170, components: [] },
  { id: "liu", hanzi: "六", pinyin: "liù", toneless: "liu", tone: 4, meaningPt: "seis", freqRank: 250, components: [] },
  { id: "qi", hanzi: "七", pinyin: "qī", toneless: "qi", tone: 1, meaningPt: "sete", freqRank: 260, components: [] },
  { id: "ba8", hanzi: "八", pinyin: "bā", toneless: "ba", tone: 1, meaningPt: "oito", freqRank: 230, components: [] },
  { id: "jiu", hanzi: "九", pinyin: "jiǔ", toneless: "jiu", tone: 3, meaningPt: "nove", freqRank: 270, components: [] },
  { id: "shi10", hanzi: "十", pinyin: "shí", toneless: "shi", tone: 2, meaningPt: "dez", freqRank: 90, components: [] },
  // --- Repetição = intensidade (família de decomposição) ---
  {
    id: "sen", hanzi: "森", pinyin: "sēn", toneless: "sen", tone: 1, meaningPt: "floresta densa", freqRank: 1500, components: ["mu", "mu", "mu"],
    mnemonicPt: "Três árvores (木): mata fechada.",
  },
  {
    id: "peng", hanzi: "朋", pinyin: "péng", toneless: "peng", tone: 2, meaningPt: "amigo", freqRank: 901, components: ["yue", "yue"],
    mnemonicPt: "Duas 月 lado a lado: companheiros que andam juntos.",
  },
  { id: "you_friend", hanzi: "友", pinyin: "yǒu", toneless: "you", tone: 3, meaningPt: "amigo", freqRank: 902, components: [], exampleWords: [{ hanzi: "朋友", pinyin: "péngyou", pt: "amigo" }] },
  {
    id: "cong", hanzi: "从", pinyin: "cóng", toneless: "cong", tone: 2, meaningPt: "seguir; a partir de", freqRank: 300, components: ["ren", "ren"],
    mnemonicPt: "Uma pessoa (人) atrás da outra: seguir.",
  },
  {
    id: "zhong3", hanzi: "众", pinyin: "zhòng", toneless: "zhong", tone: 4, meaningPt: "multidão", freqRank: 800, components: ["ren", "ren", "ren"],
    mnemonicPt: "Três pessoas (人): uma multidão.",
  },
  {
    id: "pin", hanzi: "品", pinyin: "pǐn", toneless: "pin", tone: 3, meaningPt: "produto; qualidade", freqRank: 600, components: ["kou", "kou", "kou"],
    mnemonicPt: "Três bocas (口) provando: qualidade.",
  },
  {
    id: "yan2", hanzi: "炎", pinyin: "yán", toneless: "yan", tone: 2, meaningPt: "chama; inflamação", freqRank: 1400, components: ["huo", "huo"],
    mnemonicPt: "Fogo sobre fogo (火): calor intenso.",
  },
  // --- Fono-semântico: uma peça dá o SENTIDO, outra dá o SOM ---
  {
    id: "ma2", hanzi: "妈", pinyin: "mā", toneless: "ma", tone: 1, meaningPt: "mãe", freqRank: 850, components: ["nv", "ma_h"], phonetic: "ma_h",
    mnemonicPt: "女 (mulher) dá o sentido; 马 (mǎ) dá o som “ma”. Juntos: 妈 = mãe.",
  },
  {
    id: "ma_question", hanzi: "吗", pinyin: "ma", toneless: "ma", tone: 5, meaningPt: "partícula de pergunta", freqRank: 120, components: ["kou", "ma_h"], phonetic: "ma_h",
    mnemonicPt: "口 (boca/fala) mostra que é partícula de frase; 马 dá a pista sonora ma. Em 你好吗？, 吗 transforma afirmação em pergunta.",
    exampleWords: [{ hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", pt: "Tudo bem?" }],
  },
  { id: "ma_horse", hanzi: "马", pinyin: "mǎ", toneless: "ma", tone: 3, meaningPt: "cavalo; peça sonora ma", freqRank: 1800, components: ["ma_h"], exampleWords: [{ hanzi: "马", pinyin: "mǎ", pt: "cavalo" }] },
  { id: "ma_hemp", hanzi: "麻", pinyin: "má", toneless: "ma", tone: 2, meaningPt: "cânhamo; dormente", freqRank: 1801, components: [], exampleWords: [{ hanzi: "麻", pinyin: "má", pt: "cânhamo; dormente" }] },
  { id: "ma_scold", hanzi: "骂", pinyin: "mà", toneless: "ma", tone: 4, meaningPt: "xingar", freqRank: 1802, components: ["kou", "kou", "ma_h"], phonetic: "ma_h", mnemonicPt: "Duas bocas (口口) em cima de 马: uma cena fácil para lembrar xingar.", exampleWords: [{ hanzi: "骂", pinyin: "mà", pt: "xingar" }] },
  { id: "yao_bite", hanzi: "咬", pinyin: "yǎo", toneless: "yao", tone: 3, meaningPt: "morder", freqRank: 1803, components: ["kou"], exampleWords: [{ hanzi: "咬", pinyin: "yǎo", pt: "morder" }] },
  { id: "yao_shake", hanzi: "摇", pinyin: "yáo", toneless: "yao", tone: 2, meaningPt: "balançar", freqRank: 1804, components: [], exampleWords: [{ hanzi: "摇", pinyin: "yáo", pt: "balançar" }] },
  // --- Perguntas e apresentação ---
  {
    id: "qing_pls", hanzi: "请", pinyin: "qǐng", toneless: "qing", tone: 3, meaningPt: "por favor; convidar", freqRank: 361, components: ["yan"],
    exampleWords: [{ hanzi: "请问", pinyin: "qǐngwèn", pt: "com licença, posso perguntar?" }],
  },
  {
    id: "wen_ask", hanzi: "问", pinyin: "wèn", toneless: "wen", tone: 4, meaningPt: "perguntar", freqRank: 172, components: ["men_door", "kou"], phonetic: "men_door",
    mnemonicPt: "Uma boca (口) na porta (门): perguntar. 门 mén ainda ecoa no som wèn.",
    exampleWords: [{ hanzi: "请问", pinyin: "qǐngwèn", pt: "com licença" }],
  },
  {
    id: "jiao_call", hanzi: "叫", pinyin: "jiào", toneless: "jiao", tone: 4, meaningPt: "chamar(-se)", freqRank: 299, components: ["kou"],
    exampleWords: [{ hanzi: "我叫…", pinyin: "wǒ jiào…", pt: "meu nome é…" }],
  },
  { id: "xiu_name", hanzi: "修", pinyin: "xiū", toneless: "xiu", tone: 1, meaningPt: "reparar; Xiū (nome)", freqRank: 950, components: ["ren"], exampleWords: [{ hanzi: "马修", pinyin: "Mǎxiū", pt: "Matheus" }] },
  { id: "ba_brazil", hanzi: "巴", pinyin: "bā", toneless: "ba", tone: 1, meaningPt: "Ba (em 巴西, Brasil)", freqRank: 951, components: [], exampleWords: [{ hanzi: "巴西", pinyin: "Bāxī", pt: "Brasil" }] },
  { id: "xi_west", hanzi: "西", pinyin: "xī", toneless: "xi", tone: 1, meaningPt: "oeste; Xi (em 巴西)", freqRank: 76, components: [], exampleWords: [{ hanzi: "巴西", pinyin: "Bāxī", pt: "Brasil" }] },
  { id: "shen", hanzi: "什", pinyin: "shén", toneless: "shen", tone: 2, meaningPt: "o quê (em 什么)", freqRank: 106, components: ["ren"] },
  { id: "me", hanzi: "么", pinyin: "me", toneless: "me", tone: 5, meaningPt: "partícula (em 什么)", freqRank: 83, components: [] },
  {
    id: "ming_name", hanzi: "名", pinyin: "míng", toneless: "ming", tone: 2, meaningPt: "nome", freqRank: 171, components: ["kou"],
    mnemonicPt: "Uma boca (口) dizendo seu nome no escuro da noite (夕).",
    exampleWords: [{ hanzi: "名字", pinyin: "míngzi", pt: "nome" }],
  },
  {
    id: "zi_char", hanzi: "字", pinyin: "zì", toneless: "zi", tone: 4, meaningPt: "caractere; letra", freqRank: 393, components: ["mian", "zi"],
    mnemonicPt: "Criança (子) sob o teto (宀): aprendendo as primeiras letras em casa.",
    exampleWords: [{ hanzi: "名字", pinyin: "míngzi", pt: "nome" }],
  },
  { id: "ji_how", hanzi: "几", pinyin: "jǐ", toneless: "ji", tone: 3, meaningPt: "quantos (números pequenos)", freqRank: 148, components: [] },
  { id: "shei", hanzi: "谁", pinyin: "shéi", toneless: "shei", tone: 2, meaningPt: "quem", freqRank: 928, components: ["yan"] },
  { id: "sui_age", hanzi: "岁", pinyin: "suì", toneless: "sui", tone: 4, meaningPt: "ano de idade", freqRank: 927, components: ["shan"], exampleWords: [{ hanzi: "你几岁？", pinyin: "nǐ jǐ suì?", pt: "quantos anos você tem?" }] },
  // --- Família ---
  { id: "ba_dad", hanzi: "爸", pinyin: "bà", toneless: "ba", tone: 4, meaningPt: "pai", freqRank: 902, components: [], exampleWords: [{ hanzi: "爸爸", pinyin: "bàba", pt: "pai; papai" }] },
  { id: "ge_bro", hanzi: "哥", pinyin: "gē", toneless: "ge", tone: 1, meaningPt: "irmão mais velho", freqRank: 903, components: ["kou"], exampleWords: [{ hanzi: "哥哥", pinyin: "gēge", pt: "irmão mais velho" }] },
  { id: "jie_sis", hanzi: "姐", pinyin: "jiě", toneless: "jie", tone: 3, meaningPt: "irmã mais velha", freqRank: 904, components: ["nv"], exampleWords: [{ hanzi: "姐姐", pinyin: "jiějie", pt: "irmã mais velha" }] },
  { id: "di_bro", hanzi: "弟", pinyin: "dì", toneless: "di", tone: 4, meaningPt: "irmão mais novo", freqRank: 905, components: [], exampleWords: [{ hanzi: "弟弟", pinyin: "dìdi", pt: "irmão mais novo" }] },
  { id: "mei_sis", hanzi: "妹", pinyin: "mèi", toneless: "mei", tone: 4, meaningPt: "irmã mais nova", freqRank: 906, components: ["nv"], exampleWords: [{ hanzi: "妹妹", pinyin: "mèimei", pt: "irmã mais nova" }] },
  // --- Tempo ---
  { id: "tian_sky", hanzi: "天", pinyin: "tiān", toneless: "tian", tone: 1, meaningPt: "dia; céu", freqRank: 55, components: [], exampleWords: [{ hanzi: "今天", pinyin: "jīntiān", pt: "hoje" }] },
  { id: "jin_now", hanzi: "今", pinyin: "jīn", toneless: "jin", tone: 1, meaningPt: "agora; atual", freqRank: 248, components: ["ren"], exampleWords: [{ hanzi: "今天", pinyin: "jīntiān", pt: "hoje" }] },
  {
    id: "zuo_yesterday", hanzi: "昨", pinyin: "zuó", toneless: "zuo", tone: 2, meaningPt: "ontem (em 昨天)", freqRank: 907, components: ["ri"],
    mnemonicPt: "O sol (日) de um dia que já passou.",
    exampleWords: [{ hanzi: "昨天", pinyin: "zuótiān", pt: "ontem" }],
  },
  { id: "xian_now", hanzi: "现", pinyin: "xiàn", toneless: "xian", tone: 4, meaningPt: "agora; aparecer", freqRank: 105, components: [], exampleWords: [{ hanzi: "现在", pinyin: "xiànzài", pt: "agora" }] },
  { id: "nian", hanzi: "年", pinyin: "nián", toneless: "nian", tone: 2, meaningPt: "ano", freqRank: 30, components: [] },
  { id: "shi_time", hanzi: "时", pinyin: "shí", toneless: "shi", tone: 2, meaningPt: "tempo; hora", freqRank: 31, components: ["ri"], exampleWords: [{ hanzi: "时候", pinyin: "shíhou", pt: "momento; hora" }] },
  { id: "dian_point", hanzi: "点", pinyin: "diǎn", toneless: "dian", tone: 3, meaningPt: "ponto; hora; um pouco", freqRank: 155, components: ["huo"], exampleWords: [{ hanzi: "一点", pinyin: "yìdiǎn", pt: "um pouco" }] },
  // --- Comida e bebida ---
  {
    id: "chi_eat", hanzi: "吃", pinyin: "chī", toneless: "chi", tone: 1, meaningPt: "comer", freqRank: 484, components: ["kou"],
    mnemonicPt: "A boca (口) em ação: comer.",
    exampleWords: [{ hanzi: "吃饭", pinyin: "chīfàn", pt: "comer; fazer refeição" }],
  },
  { id: "he_drink", hanzi: "喝", pinyin: "hē", toneless: "he", tone: 1, meaningPt: "beber", freqRank: 908, components: ["kou"], exampleWords: [{ hanzi: "喝茶", pinyin: "hē chá", pt: "beber chá" }] },
  {
    id: "cha_tea", hanzi: "茶", pinyin: "chá", toneless: "cha", tone: 2, meaningPt: "chá", freqRank: 909, components: ["cao", "ren", "mu"],
    mnemonicPt: "Planta (艹) que a pessoa (人) colhe da árvore (木): chá.",
    exampleWords: [{ hanzi: "喝茶", pinyin: "hē chá", pt: "beber chá" }],
  },
  { id: "fan_rice", hanzi: "饭", pinyin: "fàn", toneless: "fan", tone: 4, meaningPt: "refeição; arroz cozido", freqRank: 910, components: ["shi_food"], exampleWords: [{ hanzi: "米饭", pinyin: "mǐfàn", pt: "arroz" }] },
  { id: "cai_dish", hanzi: "菜", pinyin: "cài", toneless: "cai", tone: 4, meaningPt: "prato; verdura", freqRank: 911, components: ["cao"], exampleWords: [{ hanzi: "中国菜", pinyin: "Zhōngguó cài", pt: "comida chinesa" }] },
  { id: "rou_meat", hanzi: "肉", pinyin: "ròu", toneless: "rou", tone: 4, meaningPt: "carne", freqRank: 912, components: [] },
  { id: "yu_fish", hanzi: "鱼", pinyin: "yú", toneless: "yu", tone: 2, meaningPt: "peixe", freqRank: 913, components: [] },
  // --- Compras e dinheiro ---
  { id: "qian_money", hanzi: "钱", pinyin: "qián", toneless: "qian", tone: 2, meaningPt: "dinheiro", freqRank: 366, components: [], exampleWords: [{ hanzi: "多少钱？", pinyin: "duōshao qián?", pt: "quanto custa?" }] },
  { id: "mai_buy", hanzi: "买", pinyin: "mǎi", toneless: "mai", tone: 3, meaningPt: "comprar", freqRank: 585, components: [] },
  { id: "mai_sell", hanzi: "卖", pinyin: "mài", toneless: "mai", tone: 4, meaningPt: "vender", freqRank: 914, components: [], mnemonicPt: "卖 é 买 (comprar) com uma tampa em cima: o vendedor por cima do negócio." },
  { id: "gui_expensive", hanzi: "贵", pinyin: "guì", toneless: "gui", tone: 4, meaningPt: "caro", freqRank: 915, components: [], exampleWords: [{ hanzi: "太贵了", pinyin: "tài guì le", pt: "caro demais" }] },
  { id: "dian_shop", hanzi: "店", pinyin: "diàn", toneless: "dian", tone: 4, meaningPt: "loja", freqRank: 916, components: [], exampleWords: [{ hanzi: "饭店", pinyin: "fàndiàn", pt: "restaurante; hotel" }] },
  // --- Transporte ---
  { id: "che", hanzi: "车", pinyin: "chē", toneless: "che", tone: 1, meaningPt: "carro; veículo", freqRank: 362, components: [], exampleWords: [{ hanzi: "火车", pinyin: "huǒchē", pt: "trem" }] },
  { id: "zhan_station", hanzi: "站", pinyin: "zhàn", toneless: "zhan", tone: 4, meaningPt: "estação; ficar de pé", freqRank: 917, components: [], exampleWords: [{ hanzi: "车站", pinyin: "chēzhàn", pt: "estação; ponto" }] },
  { id: "piao_ticket", hanzi: "票", pinyin: "piào", toneless: "piao", tone: 4, meaningPt: "bilhete, passagem", freqRank: 918, components: [] },
  { id: "fei_fly", hanzi: "飞", pinyin: "fēi", toneless: "fei", tone: 1, meaningPt: "voar", freqRank: 919, components: [], exampleWords: [{ hanzi: "飞机", pinyin: "fēijī", pt: "avião" }] },
  { id: "ji_machine", hanzi: "机", pinyin: "jī", toneless: "ji", tone: 1, meaningPt: "máquina; oportunidade", freqRank: 175, components: ["mu"], exampleWords: [{ hanzi: "手机", pinyin: "shǒujī", pt: "celular" }] },
  // --- Estudo e línguas ---
  { id: "yu_lang", hanzi: "语", pinyin: "yǔ", toneless: "yu", tone: 3, meaningPt: "língua, fala", freqRank: 920, components: ["yan"], exampleWords: [{ hanzi: "汉语", pinyin: "Hànyǔ", pt: "chinês (língua)" }] },
  { id: "wen_writing", hanzi: "文", pinyin: "wén", toneless: "wen", tone: 2, meaningPt: "escrita; língua; cultura", freqRank: 66, components: [], exampleWords: [{ hanzi: "中文", pinyin: "Zhōngwén", pt: "chinês (língua)" }] },
  { id: "shu_book", hanzi: "书", pinyin: "shū", toneless: "shu", tone: 1, meaningPt: "livro", freqRank: 921, components: [] },
  { id: "du_read", hanzi: "读", pinyin: "dú", toneless: "du", tone: 2, meaningPt: "ler", freqRank: 922, components: ["yan"], exampleWords: [{ hanzi: "读书", pinyin: "dúshū", pt: "ler; estudar" }] },
  { id: "xie_write", hanzi: "写", pinyin: "xiě", toneless: "xie", tone: 3, meaningPt: "escrever", freqRank: 923, components: [] },
  { id: "ting_listen", hanzi: "听", pinyin: "tīng", toneless: "ting", tone: 1, meaningPt: "ouvir", freqRank: 400, components: ["kou"] },
  { id: "dong_understand", hanzi: "懂", pinyin: "dǒng", toneless: "dong", tone: 3, meaningPt: "entender", freqRank: 401, components: ["xin"], exampleWords: [{ hanzi: "听不懂", pinyin: "tīng bù dǒng", pt: "não entender ouvindo" }] },
  // --- Verbos de movimento e ação ---
  { id: "zai_again", hanzi: "再", pinyin: "zài", toneless: "zai", tone: 4, meaningPt: "de novo; novamente", freqRank: 74, components: [], exampleWords: [{ hanzi: "再见", pinyin: "zàijiàn", pt: "até logo" }] },
  { id: "jian_see", hanzi: "见", pinyin: "jiàn", toneless: "jian", tone: 4, meaningPt: "ver; encontrar", freqRank: 75, components: [], exampleWords: [{ hanzi: "再见", pinyin: "zàijiàn", pt: "até logo" }] },
  { id: "bian_once", hanzi: "遍", pinyin: "biàn", toneless: "bian", tone: 4, meaningPt: "vez; ocorrência", freqRank: 952, components: ["chuo"], exampleWords: [{ hanzi: "一遍", pinyin: "yí biàn", pt: "uma vez" }] },
  { id: "zou_walk", hanzi: "走", pinyin: "zǒu", toneless: "zou", tone: 3, meaningPt: "andar; ir embora", freqRank: 428, components: ["tu"] },
  {
    id: "zuo_sit", hanzi: "坐", pinyin: "zuò", toneless: "zuo", tone: 4, meaningPt: "sentar; pegar (transporte)", freqRank: 924, components: ["ren", "ren", "tu"],
    mnemonicPt: "Duas pessoas (人) sentadas na terra (土).",
  },
  { id: "qu_go", hanzi: "去", pinyin: "qù", toneless: "qu", tone: 4, meaningPt: "ir", freqRank: 64, components: ["tu"] },
  {
    id: "hui_return", hanzi: "回", pinyin: "huí", toneless: "hui", tone: 2, meaningPt: "voltar", freqRank: 165, components: ["kou", "kou"],
    mnemonicPt: "Um contorno (口) dentro do outro: dar a volta e voltar ao começo.",
    exampleWords: [{ hanzi: "回家", pinyin: "huí jiā", pt: "voltar para casa" }],
  },
  { id: "zuo_do", hanzi: "作", pinyin: "zuò", toneless: "zuo", tone: 4, meaningPt: "fazer; obra", freqRank: 101, components: ["ren"], exampleWords: [{ hanzi: "工作", pinyin: "gōngzuò", pt: "trabalho; trabalhar" }] },
  { id: "gong_work", hanzi: "工", pinyin: "gōng", toneless: "gong", tone: 1, meaningPt: "trabalho", freqRank: 118, components: [], exampleWords: [{ hanzi: "工作", pinyin: "gōngzuò", pt: "trabalho" }] },
  // --- Gostos e sentimentos ---
  { id: "ai_love", hanzi: "爱", pinyin: "ài", toneless: "ai", tone: 4, meaningPt: "amar; adorar", freqRank: 394, components: [] },
  { id: "xi_like", hanzi: "喜", pinyin: "xǐ", toneless: "xi", tone: 3, meaningPt: "gostar; alegria", freqRank: 925, components: ["kou"], exampleWords: [{ hanzi: "喜欢", pinyin: "xǐhuan", pt: "gostar de" }] },
  { id: "huan_joy", hanzi: "欢", pinyin: "huān", toneless: "huan", tone: 1, meaningPt: "alegre", freqRank: 926, components: [], exampleWords: [{ hanzi: "喜欢", pinyin: "xǐhuan", pt: "gostar de" }] },
  {
    id: "xiang_think", hanzi: "想", pinyin: "xiǎng", toneless: "xiang", tone: 3, meaningPt: "pensar; querer", freqRank: 71, components: ["mu", "xin"],
    mnemonicPt: "O coração (心) embaixo sustenta o pensamento.",
    exampleWords: [{ hanzi: "我想喝茶", pinyin: "wǒ xiǎng hē chá", pt: "quero beber chá" }],
  },
  // --- Palavras de função ---
  { id: "hen_very", hanzi: "很", pinyin: "hěn", toneless: "hen", tone: 3, meaningPt: "muito", freqRank: 392, components: [], exampleWords: [{ hanzi: "很好", pinyin: "hěn hǎo", pt: "muito bom" }] },
  { id: "mei_not", hanzi: "没", pinyin: "méi", toneless: "mei", tone: 2, meaningPt: "não (ter); sem", freqRank: 92, components: ["shui"], exampleWords: [{ hanzi: "没有", pinyin: "méiyǒu", pt: "não ter" }] },
  { id: "dui_correct", hanzi: "对", pinyin: "duì", toneless: "dui", tone: 4, meaningPt: "certo; correto", freqRank: 76, components: [] },
  { id: "ke_guest", hanzi: "客", pinyin: "kè", toneless: "ke", tone: 4, meaningPt: "convidado; cliente", freqRank: 303, components: ["mian"], exampleWords: [{ hanzi: "不客气", pinyin: "bú kèqi", pt: "de nada" }] },
  { id: "qi_air", hanzi: "气", pinyin: "qì", toneless: "qi", tone: 4, meaningPt: "ar; energia; jeito", freqRank: 302, components: [], exampleWords: [{ hanzi: "不客气", pinyin: "bú kèqi", pt: "de nada" }] },
  { id: "tai_too", hanzi: "太", pinyin: "tài", toneless: "tai", tone: 4, meaningPt: "demais; muito", freqRank: 241, components: [], exampleWords: [{ hanzi: "太贵了", pinyin: "tài guì le", pt: "caro demais" }] },
  { id: "he_and", hanzi: "和", pinyin: "hé", toneless: "he", tone: 2, meaningPt: "e; com", freqRank: 33, components: ["kou"] },
  { id: "ba_suggest", hanzi: "吧", pinyin: "ba", toneless: "ba", tone: 5, meaningPt: "partícula de sugestão", freqRank: 304, components: ["kou", "ma_h"], exampleWords: [{ hanzi: "我们走吧", pinyin: "wǒmen zǒu ba", pt: "vamos embora" }] },
  { id: "shi_wet", hanzi: "湿", pinyin: "shī", toneless: "shi", tone: 1, meaningPt: "molhado", freqRank: 1805, components: ["shui"], exampleWords: [{ hanzi: "湿", pinyin: "shī", pt: "molhado" }] },
  { id: "shi_use", hanzi: "使", pinyin: "shǐ", toneless: "shi", tone: 3, meaningPt: "usar; fazer com que", freqRank: 1806, components: ["ren"], exampleWords: [{ hanzi: "使用", pinyin: "shǐyòng", pt: "usar" }] },
  // --- Pessoas e papéis ---
  { id: "lao", hanzi: "老", pinyin: "lǎo", toneless: "lao", tone: 3, meaningPt: "velho; experiente", freqRank: 127, components: [], exampleWords: [{ hanzi: "老师", pinyin: "lǎoshī", pt: "professor(a)" }] },
  { id: "shi_teacher", hanzi: "师", pinyin: "shī", toneless: "shi", tone: 1, meaningPt: "mestre, professor", freqRank: 464, components: [], exampleWords: [{ hanzi: "老师", pinyin: "lǎoshī", pt: "professor(a)" }] },
];

export const charById = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
/** Caracteres que têm decomposição interessante (≥ 2 componentes). */
export const DECOMPOSABLE = CHARACTERS.filter((c) => c.components.length >= 2);
