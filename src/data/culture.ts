/**
 * V4.9.6C — Culture Hub catalog.
 *
 * Culture is contextual, sourced, and bilingual. Items never claim
 * "Chinese people always X" without scope. Summaries only — no copied source text.
 */

/** First mission completion XP. Same reward id as V4.9.6C (`culture-complete:<id>`). */
export const CULTURE_COMPLETE_XP = 8;

export const CULTURE_CATEGORIES = [
  "home_visits",
  "table_food",
  "social_etiquette",
  "gifts",
  "school_work",
  "festivals",
  "contemporary_china",
  "daily_life",
  "transport_public",
  "communication_relations",
] as const;

export type CultureCategory = (typeof CULTURE_CATEGORIES)[number];

export const CULTURE_SCOPES = [
  "broad",
  "regional",
  "generational",
  "formal",
  "informal",
  "historical",
] as const;

export type CultureScope = (typeof CULTURE_SCOPES)[number];

/**
 * V4.11A — que TIPO de coisa o item é. Distinto de `category` (assunto) e de
 * `scope` (abrangência da prática).
 *
 * Existe para uma coisa só: nunca deixar história, lenda e obra literária se
 * confundirem. 孙悟空 é `literature`, não `history`, e o tipo é o que impede a
 * copy de dizer "aconteceu" sobre ele.
 */
export const CULTURE_ITEM_KINDS = [
  "documented_practice",
  "festival",
  "history",
  "legend",
  "literature",
  "symbol",
] as const;

export type CultureItemKind = (typeof CULTURE_ITEM_KINDS)[number];

/**
 * V4.11A.2 — papel editorial da fonte.
 *
 * `year_specific` cobre calendário civil / folga oficial daquele ano.
 * Nunca basta sozinha para sustentar um claim evergreen de festival.
 */
export type CultureSourceRole = "evergreen" | "year_specific" | "primary" | "secondary";

export type CultureSource = {
  title: string;
  publisher: string;
  url: string;
  accessedAt: string;
  /** Papel editorial. Ausente = evergreen (compatibilidade com o catálogo antigo). */
  role?: CultureSourceRole;
  /** Ano civil coberto quando `role` é `year_specific`. */
  year?: number;
};

/**
 * Fato amarrado a um ano civil. Fica fora do body evergreen para não forçar
 * reescrita anual do texto principal.
 */
export type CultureYearFact = {
  year: number;
  labelPt: string;
  labelEn: string;
  gregorianDate?: string;
  source: CultureSource;
  verifiedAt: string;
};

export type CultureMiniCheckOption = {
  id: string;
  labelPt: string;
  labelEn: string;
};

export type CultureMiniCheck = {
  promptPt: string;
  promptEn: string;
  options: [CultureMiniCheckOption, CultureMiniCheckOption, CultureMiniCheckOption];
  correctOptionId: string;
  explanationPt: string;
  explanationEn: string;
};

export type CultureItem = {
  id: string;
  titlePt: string;
  titleEn: string;
  summaryPt: string;
  summaryEn: string;
  bodyPt: string;
  bodyEn: string;
  situationPt: string;
  situationEn: string;
  noticePt: string;
  noticeEn: string;
  whyPt: string;
  whyEn: string;
  practicePt: string;
  practiceEn: string;
  variabilityPt?: string;
  variabilityEn?: string;
  category: CultureCategory;
  kind: CultureItemKind;
  scope: CultureScope;
  variabilityNote?: string;
  relatedLessonIds: string[];
  relatedChunkRefs?: string[];
  relatedHanziRefs?: string[];
  /** Links leves entre CultureItems (sem graph engine). */
  relatedCultureItemIds?: string[];
  sources: CultureSource[];
  /** Dados anuais (ex.: folga oficial de 2026). Não substituem fonte evergreen. */
  yearFacts?: CultureYearFact[];
  estimatedMinutes: number;
  order: number;
  miniCheck: CultureMiniCheck;
};

/** Fonte anual só cobre o ano declarado — não sustenta claim evergreen sozinha. */
export function isYearSpecificSource(source: CultureSource): boolean {
  return source.role === "year_specific";
}

export function isEvergreenSource(source: CultureSource): boolean {
  if (source.role === "year_specific") return false;
  return true;
}

export type RejectedCultureCandidate = {
  id: string;
  title: string;
  status: "REJECTED_UNVERIFIED";
  reasonPt: string;
  reasonEn: string;
};

const ACCESSED = "2026-09-08";

const SRC = {
  unescoDragonBoat: {
    title: "Dragon Boat festival",
    publisher: "UNESCO Intangible Cultural Heritage",
    url: "https://ich.unesco.org/en/RL/dragon-boat-festival-00225",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  govSpringFestival: {
    title: "UNESCO inscribes Spring Festival on intangible cultural heritage list",
    publisher: "The State Council of the People's Republic of China",
    url: "https://english.www.gov.cn/news/202412/05/content_WS6750dd47c6d0868f4e8edab6.html",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  holiday2026: {
    title: "Notice on arrangements for several public holidays in 2026",
    publisher: "General Office of the State Council",
    url: "https://www.gov.cn/zhengce/content/202511/content_7047090.htm",
    accessedAt: ACCESSED,
    role: "year_specific" as const,
    year: 2026,
  },
  chinaOrgTaboos: {
    title: "Good manners, bad luck",
    publisher: "China.org.cn (China International Communications Group)",
    url: "http://www.china.org.cn/travel/beijingguide/2008-05/20/content_15355396.htm",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaMidAutumn: {
    title: "Mid-Autumn Festival",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Mid-Autumn-Festival",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  ihchinaQingming: {
    title: "清明节 (Qingming Festival)",
    publisher: "China Intangible Cultural Heritage Digital Museum (ihchina.cn)",
    url: "https://www.ihchina.cn/Article/Index/detail?id=14907",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  unescoSolarTerms: {
    title: "The Twenty-Four Solar Terms",
    publisher: "UNESCO Intangible Cultural Heritage",
    url: "https://ich.unesco.org/en/RL/the-twenty-four-solar-terms-00647",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaLantern: {
    title: "Lantern Festival",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Lantern-Festival",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  chinaCultureLantern: {
    title: "The Lantern Festival",
    publisher: "China Culture (Ministry of Culture and Tourism affiliated)",
    url: "http://en.chinaculture.org/2014-12/09/content_584309.htm",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaDragon: {
    title: "Long (Chinese dragon)",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/long",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  metDragonRobes: {
    title: "Dragon Robes of China",
    publisher: "The Metropolitan Museum of Art",
    url: "https://www.metmuseum.org/toah/hd/drg/hd_drg.htm",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaMonkeyKing: {
    title: "Sun Wukong",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Sun-Wukong",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaXiyouji: {
    title: "Journey to the West",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Journey-to-the-West",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  chinaOrgXiyouji: {
    title: "Journey to the West",
    publisher: "China.org.cn (China International Communications Group)",
    url: "http://www.china.org.cn/english/features/Literature/145325.htm",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  columbiaDynastyTimeline: {
    title: "Timeline of Chinese Dynasties",
    publisher: "Columbia University Asia for Educators",
    url: "https://afe.easia.columbia.edu/timelines/china_timeline.htm",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  smithsonianChinaTimeline: {
    title: "Timeline of Chinese History, Art, and Culture",
    publisher: "Smithsonian National Museum of Asian Art",
    url: "https://asia-archive.si.edu/learn/for-educators/teaching-china-with-the-smithsonian/interactives/timelines/timeline-of-chinese-history-art-and-culture/",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaQin: {
    title: "Qin dynasty",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Qin-dynasty",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  metQin: {
    title: "Qin Dynasty (221–206 B.C.)",
    publisher: "The Metropolitan Museum of Art (Heilbrunn Timeline)",
    url: "https://www.metmuseum.org/essays/qin-dynasty-221-206-b-c",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  unescoQinMausoleum: {
    title: "Mausoleum of the First Qin Emperor",
    publisher: "UNESCO World Heritage Centre",
    url: "https://whc.unesco.org/en/list/441/",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  unescoGreatWall: {
    title: "The Great Wall",
    publisher: "UNESCO World Heritage Centre",
    url: "https://whc.unesco.org/en/list/438/",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaHan: {
    title: "Han dynasty",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Han-dynasty",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  metHan: {
    title: "Han Dynasty (206 B.C.–220 A.D.)",
    publisher: "The Metropolitan Museum of Art (Heilbrunn Timeline)",
    url: "https://www.metmuseum.org/TOAH/hd/hand/hd_hand.htm",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaSilkRoad: {
    title: "Silk Road",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Silk-Road-trade-route",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaTang: {
    title: "Tang dynasty",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Tang-dynasty",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  metTang: {
    title: "Tang Dynasty (618–907)",
    publisher: "The Metropolitan Museum of Art (Heilbrunn Timeline)",
    url: "https://www.metmuseum.org/essays/tang-dynasty-618-906",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaChangan: {
    title: "Chang'an",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/place/Changan",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaSong: {
    title: "Song dynasty",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Song-dynasty",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  metSong: {
    title: "Northern Song Dynasty (960–1127)",
    publisher: "The Metropolitan Museum of Art (Heilbrunn Timeline)",
    url: "https://www.metmuseum.org/essays/northern-song-dynasty-960-1127",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaMing: {
    title: "Ming dynasty",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Ming-dynasty-Chinese-history",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  metMing: {
    title: "Ming Dynasty (1368–1644)",
    publisher: "The Metropolitan Museum of Art (Heilbrunn Timeline)",
    url: "https://www.metmuseum.org/TOAH/HD/ming/hd_ming.htm",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  unescoImperialPalaces: {
    title: "Imperial Palaces of the Ming and Qing Dynasties in Beijing and Shenyang",
    publisher: "UNESCO World Heritage Centre",
    url: "https://whc.unesco.org/en/list/439/",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaQing: {
    title: "Qing dynasty",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Qing-dynasty",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  britannicaChineseRevolution: {
    title: "Chinese Revolution (1911–1912)",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/event/Chinese-Revolution-1911-1912",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  chinaDailyTable: {
    title: "Table manners",
    publisher: "China Daily",
    url: "https://www.chinadaily.com.cn/english/doc/2004-01/09/content_297514.htm",
    accessedAt: ACCESSED,
  },
  pbocPayments: {
    title: "Overall operation of the payment system in 2024",
    publisher: "People's Bank of China — Payment and Settlement Department",
    url: "https://www.pbc.gov.cn/zhifujiesuansi/128525/128545/128643/5589365/index.html",
    accessedAt: ACCESSED,
  },
  priceLawArt13: {
    title: "Price Law of the People's Republic of China, Article 13",
    publisher: "National Energy Administration Zhejiang Regulatory Office (full text of the Price Law)",
    url: "https://zjb.nea.gov.cn/xxgk/zcfg/202309/t20230914_75903.html",
    accessedAt: "2026-09-09",
  },
  samrMarkedPrices: {
    title: "Provisions on Clearly Marked Prices and Prohibiting Price Fraud (SAMR Order No. 56)",
    publisher: "State Administration for Market Regulation — State Council Gazette",
    url: "https://www.gov.cn/gongbao/content/2022/content_5699926.htm",
    accessedAt: "2026-09-09",
  },
  guPoliteness: {
    title: "Politeness phenomena in modern Chinese",
    publisher: "Journal of Pragmatics (Gu Yueguo, 1990)",
    url: "https://doi.org/10.1016/0378-2166(90)90082-O",
    accessedAt: ACCESSED,
  },
  familyCulturePoliteness: {
    title: "Family-culture and Chinese politeness",
    publisher: "Acta Linguistica Academica",
    url: "https://doi.org/10.1556/2062.2019.66.2.6",
    accessedAt: ACCESSED,
  },
  chinaCultureOrg: {
    title: "The Dragon Boat Festival",
    publisher: "China Culture (Ministry of Culture and Tourism affiliated)",
    url: "http://en.chinaculture.org/2014-12/09/content_584311.htm",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  holidayEn: {
    title: "Notice of General Office of State Council on arrangements for several public holidays in 2026",
    publisher: "Haidian District People's Government (English translation of State Council notice)",
    url: "https://en.bjhd.gov.cn/workinginhaidian/supportingservices/publicholidays/202512/t20251211_4797062.shtml",
    accessedAt: ACCESSED,
    role: "year_specific" as const,
    year: 2026,
  },
  niaExitEntryArt39: {
    title: "Exit and Entry Administration Law of the People's Republic of China (English), Article 39",
    publisher: "National Immigration Administration of the People's Republic of China",
    url: "https://www.nia.gov.cn/n741440/n741547/c757592/content.html",
    accessedAt: "2026-09-10",
  },
  niaHotelVsHome: {
    title: "Policy interpretation of online accommodation registration for foreigners staying outside hotels",
    publisher: "The State Council of the People's Republic of China (NIA interpretation)",
    url: "https://english.www.gov.cn/services/visitchina/202603/21/content_WS69ce124cc6d00ca5f9a0a368.html",
    accessedAt: "2026-09-10",
  },
} as const satisfies Record<string, CultureSource>;

export const REJECTED_CULTURE_CANDIDATES: RejectedCultureCandidate[] = [
  {
    id: "cold-at-host-home",
    title: "Never say you are cold in a Chinese home",
    status: "REJECTED_UNVERIFIED",
    reasonPt:
      "A afirmação viral de que dizer 'estou com frio' na casa de alguém é automaticamente rude ou um pedido disfarçado não tem fonte institucional ou acadêmica sólida. O que aparece em literatura de polidez é o contrário: perguntar se a pessoa está com frio (嘘寒问暖) costuma ser um gesto de cuidado, e 今天很冷 descreve o clima. Sem evidência contextual confiável, o item não foi publicado.",
    reasonEn:
      "The viral claim that saying 'I am cold' in someone's home is automatically rude or a coded request lacks a solid institutional or academic source. Politeness research documents the reverse: asking whether someone is cold is often care (嘘寒问暖), and 今天很冷 is ordinary weather talk. Unpublished.",
  },
  {
    id: "never-finish-or-always-finish-plate",
    title: "You must always (or never) finish your plate",
    status: "REJECTED_UNVERIFIED",
    reasonPt:
      "Guias de viagem contradizem uns aos outros (esvaziar o prato seria elogio; deixar um pouco seria educação). Sem fonte oficial que descreva uma norma única, o item não foi publicado.",
    reasonEn:
      "Travel guides contradict each other (finishing the plate as praise vs leaving a little as politeness). No official source describes a single rule, so the item was not published.",
  },
  {
    id: "never-give-umbrellas",
    title: "Never give an umbrella as a gift",
    status: "REJECTED_UNVERIFIED",
    reasonPt:
      "O homófono 伞/散 aparece em listas de internet, mas não encontrou suporte em órgão oficial ou material acadêmico suficiente para uma afirmação forte neste pacote.",
    reasonEn:
      "The 伞/散 homophone appears in internet lists, but this package did not find enough official or academic support for a strong claim.",
  },
];

export const CULTURE_ITEMS: CultureItem[] = [
  {
    id: "visiting-home",
    order: 1,
    category: "home_visits",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 3,
    titlePt: "Chegar à casa de alguém",
    titleEn: "Arriving at someone's home",
    summaryPt: "O anfitrião costuma guiar a entrada com convites curtos. O convidado espera o sinal antes de avançar.",
    summaryEn: "Hosts often guide entry with short invitations. Guests usually wait for that cue before stepping further in.",
    bodyPt: "Em muitas visitas, a porta não é um convite automático para circular a casa. Frases como 请进 e 请坐 organizam o momento: entrar, sentar, aceitar o lugar que foi oferecido.",
    bodyEn: "In many visits, an open door is not a blanket invitation to walk the home. Phrases such as 请进 and 请坐 organise the moment: come in, sit, accept the place that was offered.",
    situationPt: "Você está na porta da casa de um colega.",
    situationEn: "You are at a classmate's front door.",
    noticePt: "A pessoa pode dizer 请进 e, logo depois, 请坐. Pode haver um tapete ou um móvel para sapatos — isso varia por casa e região.",
    noticeEn: "They may say 请进 and then 请坐. There may be a mat or cabinet for shoes — that varies by household and region.",
    whyPt: "Convidar para entrar e sentar é uma forma explícita de hospitalidade. Esperar o convite evita invadir um espaço que ainda não foi oferecido.",
    whyEn: "Inviting someone in and offering a seat is explicit hospitality. Waiting for that cue avoids walking into space that has not yet been offered.",
    practicePt: "Cumprimente, espere 请进, entre, e sente-se quando ouvir 请坐. Agradeça com 谢谢. Não circule cômodos sem ser convidado.",
    practiceEn: "Greet, wait for 请进, go in, and sit when you hear 请坐. Thank them with 谢谢. Do not tour rooms unless invited.",
    variabilityPt: "Tirar sapatos é comum em muitos apartamentos urbanos e menos rígido em outras casas. Siga o que você vê na entrada.",
    variabilityEn: "Removing shoes is common in many urban apartments and less strict in other homes. Follow what you see at the entrance.",
    variabilityNote: "Shoe removal and how far a guest may walk inside vary by household, region, and season.",
    relatedLessonIds: ["p7-imersao-casa-amigo", "l24", "l2"],
    relatedChunkRefs: ["qingjin", "qingzuo", "xiexie"],
    relatedHanziRefs: ["jia", "qing_pls"],
    sources: [SRC.familyCulturePoliteness, SRC.chinaDailyTable],
    miniCheck: {
      promptPt: "A porta está aberta e ninguém disse nada ainda. Qual leitura é mais segura?",
      promptEn: "The door is open and nobody has said anything yet. Which reading is safer?",
      options: [
        { id: "a", labelPt: "Entrar e ir até a cozinha para ajudar.", labelEn: "Walk in and go to the kitchen to help." },
        { id: "b", labelPt: "Cumprimentar e esperar um convite para entrar ou sentar.", labelEn: "Greet them and wait for an invitation to come in or sit." },
        { id: "c", labelPt: "Entrar em silêncio e sentar no sofá principal.", labelEn: "Walk in silently and sit on the main sofa." },
      ],
      correctOptionId: "b",
      explanationPt: "Esperar 请进 / 请坐 é a leitura mais segura. Ajudar na cozinha ou escolher o melhor lugar sozinho pode soar invasivo.",
      explanationEn: "Waiting for 请进 / 请坐 is the safer reading. Heading to the kitchen or taking the best seat uninvited can feel intrusive.",
    },
  },
  {
    id: "host-insistence",
    order: 2,
    category: "home_visits",
    kind: "documented_practice",
    scope: "informal",
    estimatedMinutes: 4,
    titlePt: "Quando o anfitrião insiste",
    titleEn: "When the host insists",
    summaryPt: "Oferecer de novo chá, comida ou um lugar não é necessariamente pressão. Pode ser um ritual de hospitalidade (客气).",
    summaryEn: "Offering tea, food, or a seat again is not always pressure. It can be a hospitality ritual (客气).",
    bodyPt: "Em contextos familiares e entre conhecidos, recusar uma vez e aceitar depois — ou recusar com 谢谢 e uma razão curta — é comum. O ponto não é 'nunca recuse' nem 'sempre aceite'.",
    bodyEn: "Among family and acquaintances, refusing once then accepting later — or declining with 谢谢 and a short reason — is common. The point is neither 'never refuse' nor 'always accept'.",
    situationPt: "Você já disse que está bem, e a pessoa oferece chá outra vez.",
    situationEn: "You already said you are fine, and they offer tea again.",
    noticePt: "Pode haver um segundo ou terceiro oferecimento. Isso pode ser cuidado, não uma ordem.",
    noticeEn: "There may be a second or third offer. That can be care, not a command.",
    whyPt: "Pesquisas de polidez descrevem 客气 como tratar o outro como convidado: oferecer, insistir um pouco, evitar que a pessoa se sinta 见外 (de fora).",
    whyEn: "Politeness research describes 客气 as treating the other person as a guest: offer, insist a little, and avoid making them feel 见外 (like an outsider).",
    practicePt: "Se quiser aceitar: 谢谢 e um sorriso. Se não quiser: 谢谢, 我不用 and a brief reason (já bebi / estou satisfeito). Não interprete a insistência automática como falta de respeito ao 'não'.",
    practiceEn: "If you want to accept: 谢谢 and a smile. If not: 谢谢, 我不用, plus a brief reason (I already drank / I am full). Do not read one extra offer as disrespect for your no.",
    variabilityPt: "Em contextos formais ou com desconhecidos, a insistência tende a ser menor. Amigos próximos podem ser mais diretos e menos rituais.",
    variabilityEn: "In formal settings or with strangers, insistence is often lighter. Close friends may be more direct and less ritual.",
    variabilityNote: "Strength of 客气 varies by intimacy, generation, and how formal the visit is.",
    relatedLessonIds: ["p7-imersao-casa-amigo", "l26", "l4"],
    relatedChunkRefs: ["xiexie", "bukeqi", "woxiangheshui"],
    relatedHanziRefs: ["cha_tea", "ke_guest"],
    sources: [SRC.guPoliteness, SRC.familyCulturePoliteness],
    miniCheck: {
      promptPt: "Você recebeu um copo e a pessoa insiste mais uma vez. Qual interpretação é mais segura?",
      promptEn: "You were given a cup and the person insists once more. Which interpretation is safer?",
      options: [
        { id: "a", labelPt: "É uma ordem: recusar agora seria ofensa grave.", labelEn: "It is an order: refusing now would be a serious insult." },
        { id: "b", labelPt: "Pode ser hospitalidade. Agradecer e aceitar ou recusar com uma razão curta.", labelEn: "It may be hospitality. Thank them, then accept or decline with a short reason." },
        { id: "c", labelPt: "É um teste. Você deve recusar três vezes sempre.", labelEn: "It is a test. You must always refuse three times." },
      ],
      correctOptionId: "b",
      explanationPt: "A leitura mais segura é hospitalidade contextual — não uma regra de três recusas nem uma ofensa automática.",
      explanationEn: "The safer reading is contextual hospitality — not a three-refusal rule and not an automatic insult.",
    },
  },
  {
    id: "shared-dishes",
    order: 3,
    category: "table_food",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 3,
    titlePt: "Pratos no centro da mesa",
    titleEn: "Dishes in the middle of the table",
    summaryPt: "Em muitas refeições, os pratos são compartilhados. Cada pessoa serve um pouco para o seu prato, em vez de pedir um prato só seu.",
    summaryEn: "At many meals, dishes are shared. People usually take a little onto their own plate instead of ordering only an individual plate.",
    bodyPt: "O cardápio em grupo costuma ser coletivo: vários pratos no centro, arroz ou acompanhamentos por pessoa. Servir o outro pode ser hospitalidade — e recusar com educação também é possível.",
    bodyEn: "Group menus are often communal: several dishes in the centre, rice or sides per person. Serving someone else can be hospitality — and a polite decline is also possible.",
    situationPt: "Você sentou-se num restaurante com colegas.",
    situationEn: "You sat down at a restaurant with classmates.",
    noticePt: "Há vários pratos no meio. Hashis de servir ou a ponta 'limpa' dos hashis podem aparecer. Alguém pode colocar comida no seu prato.",
    noticeEn: "Several dishes sit in the middle. Serving chopsticks or the unused end of chopsticks may appear. Someone may put food on your plate.",
    whyPt: "A refeição compartilhada é uma forma frequente de hospitalidade. China Daily descreve o anfitrião servir o convidado como polidez, não como obrigação de esvaziar o prato.",
    whyEn: "A shared meal is a common form of hospitality. China Daily describes a host serving a guest as politeness, not as a duty to empty the plate.",
    practicePt: "Espere um pouco se houver anfitrião. Pegue porções pequenas. Se colocarem comida no seu prato, 谢谢. Se não puder comer algo, diga cedo (por exemplo 我不吃肉).",
    practiceEn: "Wait a moment if there is a host. Take small portions. If food is placed on your plate, 谢谢. If you cannot eat something, say so early (for example 我不吃肉).",
    variabilityPt: "Hotpot, banquete e almoço rápido de uma pessoa só não seguem o mesmo ritmo. Restaurantes contemporâneos também servem pratos individuais.",
    variabilityEn: "Hotpot, banquets, and a one-person quick lunch do not follow the same rhythm. Contemporary restaurants also serve individual plates.",
    variabilityNote: "Communal serving is typical of many sit-down meals, not of every lunch or every region.",
    relatedLessonIds: ["l26b", "l26"],
    relatedChunkRefs: ["haochi", "woyaocai", "wobuchirou", "womenchifanba"],
    relatedHanziRefs: ["fan_rice", "cha_tea"],
    sources: [SRC.chinaDailyTable, SRC.chinaOrgTaboos],
    miniCheck: {
      promptPt: "Chegam vários pratos ao centro e ninguém pediu um prato só seu. O que costuma acontecer?",
      promptEn: "Several dishes arrive in the centre and nobody ordered a plate just for you. What usually happens?",
      options: [
        { id: "a", labelPt: "Cada um come somente o prato que escolheu no cardápio, sem compartilhar.", labelEn: "Each person eats only the dish they ordered, with no sharing." },
        { id: "b", labelPt: "Os pratos ficam no centro para o grupo servir um pouco de cada.", labelEn: "The dishes stay in the middle for the group to take a little of each." },
        { id: "c", labelPt: "É obrigatório esvaziar todos os pratos comunitários.", labelEn: "Everyone must empty every communal dish." },
      ],
      correctOptionId: "b",
      explanationPt: "O padrão mais comum nessa situação é compartilhar. Não é uma regra de esvaziar tudo, nem de prato individual obrigatório.",
      explanationEn: "The more common pattern here is sharing. It is not a rule to empty everything, nor a requirement of individual plates.",
    },
  },
  {
    id: "chopsticks-rest",
    order: 4,
    category: "table_food",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 3,
    titlePt: "Onde pousar os hashis",
    titleEn: "Where to rest chopsticks",
    summaryPt: "Deixar hashis em pé no arroz lembra incenso funerário para muita gente. Pousar ao lado do prato é a leitura mais segura.",
    summaryEn: "Standing chopsticks upright in rice resembles funeral incense for many people. Resting them beside the plate is the safer default.",
    bodyPt: "Fontes institucionais chinesas descrevem o gesto de espetar hashis no arroz como infeliz numa refeição comum, porque visualmente se aproxima de oferendas. Não é lei — é associação cultural.",
    bodyEn: "Chinese institutional sources describe sticking chopsticks upright in rice as unlucky at an ordinary meal because it visually recalls offerings. It is not a law — it is a cultural association.",
    situationPt: "Você pausa no meio da refeição e precisa soltar os hashis.",
    situationEn: "You pause mid-meal and need to put the chopsticks down.",
    noticePt: "Pode haver um descanso de hashis. Se não houver, as pessoas costumam pousá-los sobre o prato ou ao lado da tigela, na horizontal.",
    noticeEn: "There may be a chopstick rest. If not, people usually lay them on the plate or beside the bowl, horizontally.",
    whyPt: "China.org.cn e China Daily ligam o par de palitos em pé à imagem de incenso junto a um memorial. Por isso o gesto chama atenção em mesas formais e familiares.",
    whyEn: "China.org.cn and China Daily link upright chopsticks to the image of incense at a memorial. That is why the gesture stands out at formal and family tables.",
    practicePt: "Pouse os hashis na horizontal. Evite tamborilar a tigela. Se alguém servir com os próprios hashis, isso pode ser hospitalidade — não é o mesmo gesto do arroz em pé.",
    practiceEn: "Rest chopsticks horizontally. Avoid drumming on the bowl. If someone serves you with their own chopsticks, that can be hospitality — it is not the same gesture as standing them in rice.",
    variabilityPt: "Em refeições muito informais o cuidado é menor. Em funerais e datas de memória o mesmo gesto tem outro significado — não misture os dois contextos.",
    variabilityEn: "At very informal meals people may be less strict. At funerals and memorial dates the same gesture has another meaning — do not mix the two contexts.",
    variabilityNote: "The association is widely reported; how strongly people react still depends on formality and generation.",
    relatedLessonIds: ["l26b", "l26", "l26c"],
    relatedChunkRefs: ["woyaomifan", "haochi", "maidan"],
    relatedHanziRefs: ["fan_rice"],
    sources: [SRC.chinaOrgTaboos, SRC.chinaDailyTable],
    miniCheck: {
      promptPt: "Você precisa soltar os hashis por um segundo. Qual opção é mais adequada numa refeição comum?",
      promptEn: "You need to put the chopsticks down for a moment. Which option is more suitable at an ordinary meal?",
      options: [
        { id: "a", labelPt: "Espetar os dois no meio da tigela de arroz.", labelEn: "Stick both upright in the rice bowl." },
        { id: "b", labelPt: "Pousá-los na horizontal no prato ou no descanso.", labelEn: "Lay them horizontally on the plate or rest." },
        { id: "c", labelPt: "Entregar os hashis usados diretamente na boca de outra pessoa.", labelEn: "Pass your used chopsticks straight into someone else's mouth." },
      ],
      correctOptionId: "b",
      explanationPt: "A horizontal é o descanso usual. O par em pé no arroz é o gesto associado a memorial.",
      explanationEn: "Horizontal rest is the usual pause. Upright in rice is the gesture associated with a memorial.",
    },
  },
  {
    id: "greetings-nihao",
    order: 5,
    category: "social_etiquette",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 3,
    titlePt: "Olá: o que 你好 faz — e o que não faz",
    titleEn: "Hello: what 你好 does — and does not do",
    summaryPt: "你好 abre um primeiro contato. Entre conhecidos, um aceno, o nome ou 你吃了吗 / 最近怎么样 podem aparecer no lugar.",
    summaryEn: "你好 opens a first contact. Among people who already know each other, a nod, a name, or 你吃了吗 / 最近怎么样 may appear instead.",
    bodyPt: "Tratamentos mudam com distância social. 你好 é seguro com desconhecidos e em lojas. Com colegas do dia a dia, um cumprimento mais curto também é natural.",
    bodyEn: "Address changes with social distance. 你好 is safe with strangers and in shops. With everyday colleagues, a shorter greeting is also natural.",
    situationPt: "Você encontra alguém pela primeira vez num corredor.",
    situationEn: "You meet someone for the first time in a hallway.",
    noticePt: "Pode haver um 你好, um aceno, ou o nome da pessoa. Nem toda saudação vira uma conversa longa.",
    noticeEn: "There may be a 你好, a nod, or the person's name. Not every greeting becomes a long conversation.",
    whyPt: "Cumprimentar marca o início de uma relação pública. Depois que a relação já existe, repetir 你好 como se fosse o único cumprimento possível pode soar rígido.",
    whyEn: "Greeting marks the start of a public relationship. Once that relationship exists, repeating 你好 as if it were the only possible greeting can sound stiff.",
    practicePt: "Use 你好 no primeiro contato. Se a pessoa perguntar 你好吗, 我很好 e 你呢 cabem. Com alguém que você já vê todo dia, um aceno ou o nome também funcionam.",
    practiceEn: "Use 你好 on first contact. If they ask 你好吗, 我很好 and 你呢 fit. With someone you already see every day, a nod or their name also works.",
    variabilityPt: "Região, idade e se vocês estão no trabalho ou na rua mudam o comprimento da saudação.",
    variabilityEn: "Region, age, and whether you are at work or on the street change how long the greeting is.",
    variabilityNote: "Formality of 你好 versus a casual nod is generational and situational.",
    relatedLessonIds: ["l2", "p1-primeira-conversa", "l13-dialogo-ola", "l3", "l29"],
    relatedChunkRefs: ["nihao", "nihaoma", "wohenhao", "nine"],
    relatedHanziRefs: ["ni", "hao"],
    sources: [SRC.guPoliteness, SRC.familyCulturePoliteness],
    miniCheck: {
      promptPt: "Você vê todo dia a mesma colega no escritório. Qual leitura é mais natural?",
      promptEn: "You see the same colleague in the office every day. Which reading is more natural?",
      options: [
        { id: "a", labelPt: "É obrigatório parar e dizer 你好 como se fosse a primeira vez.", labelEn: "You must stop and say 你好 as if it were the first meeting." },
        { id: "b", labelPt: "Um aceno, o nome ou um 你好 curto podem bastar.", labelEn: "A nod, their name, or a short 你好 can be enough." },
        { id: "c", labelPt: "Não cumprimentar nunca, para não ser 客气.", labelEn: "Never greet at all, so you do not seem 客气." },
      ],
      correctOptionId: "b",
      explanationPt: "你好 é seguro, mas não é o único cumprimento possível entre pessoas que já se conhecem.",
      explanationEn: "你好 is safe, but it is not the only greeting available among people who already know each other.",
    },
  },
  {
    id: "thanks-keqi",
    order: 6,
    category: "social_etiquette",
    kind: "documented_practice",
    scope: "informal",
    estimatedMinutes: 3,
    titlePt: "谢谢 e a resposta 不客气",
    titleEn: "谢谢 and the reply 不客气",
    summaryPt: "Agradecer é adequado. Entre muito íntimos, um 谢谢 demais pode soar como distância — e isso também varia.",
    summaryEn: "Thanking is appropriate. Among very close people, extra 谢谢 can sound like distance — and that also varies.",
    bodyPt: "不客气 responde 谢谢 no sentido de 'não seja formal'. Não significa 'não precisa agradecer nunca'. Em lojas e primeiros contatos, o par continua natural.",
    bodyEn: "不客气 answers 谢谢 in the sense of 'don't be so formal'. It does not mean 'never thank anyone'. In shops and first contacts the pair stays natural.",
    situationPt: "Alguém segura a porta ou te oferece água.",
    situationEn: "Someone holds the door or offers you water.",
    noticePt: "Você diz 谢谢. A pessoa pode responder 不客气 ou 没事.",
    noticeEn: "You say 谢谢. They may answer 不客气 or 没事.",
    whyPt: "客气 marca tratamento de convidado. 不客气 reduz essa distância depois do agradecimento, sem apagar o agradecimento.",
    whyEn: "客气 marks guest-like treatment. 不客气 reduces that distance after thanks without erasing the thanks.",
    practicePt: "Agradeça em serviços e favores pontuais. Se a pessoa disser 不客气, um aceno fecha o momento. Não transforme isso em aula sobre 'chineses não agradecem'.",
    practiceEn: "Say thanks for services and one-off favours. If they say 不客气, a nod closes the moment. Do not turn this into a lesson that 'Chinese people do not thank'.",
    variabilityPt: "Geração e intimidade mudam a dose. Em serviço ao cliente o par 谢谢 / 不客气 continua padrão.",
    variabilityEn: "Generation and closeness change the dose. In customer service the 谢谢 / 不客气 pair remains standard.",
    relatedLessonIds: ["l4", "p1-qingwen-cortesia", "l2"],
    relatedChunkRefs: ["xiexie", "bukeqi", "meiguanxi"],
    relatedHanziRefs: ["xie", "ke_guest"],
    sources: [SRC.guPoliteness, SRC.familyCulturePoliteness],
    miniCheck: {
      promptPt: "Você disse 谢谢 e ouviu 不客气. O que isso costuma fazer?",
      promptEn: "You said 谢谢 and heard 不客气. What does that usually do?",
      options: [
        { id: "a", labelPt: "Cancela o favor: você deveria pagar agora.", labelEn: "It cancels the favour: you should pay now." },
        { id: "b", labelPt: "Acolhe o agradecimento e reduz a formalidade.", labelEn: "It accepts the thanks and reduces formality." },
        { id: "c", labelPt: "Significa que agradecer foi um erro grave.", labelEn: "It means thanking was a serious mistake." },
      ],
      correctOptionId: "b",
      explanationPt: "不客气 responde o agradecimento. Não transforma 谢谢 em tabu.",
      explanationEn: "不客气 answers the thanks. It does not make 谢谢 a taboo.",
    },
  },
  {
    id: "qingwen-ask",
    order: 7,
    category: "communication_relations",
    kind: "documented_practice",
    scope: "formal",
    estimatedMinutes: 3,
    titlePt: "Pedir informação com 请问",
    titleEn: "Asking for information with 请问",
    summaryPt: "请问 avisa que vem uma pergunta e reduz o impacto de interromper. Não é obrigatório entre amigos íntimos.",
    summaryEn: "请问 signals that a question is coming and softens an interruption. It is not required among close friends.",
    bodyPt: "Em lojas, estações e com desconhecidos, começar com 请问 é uma forma reconhecida de polidez. Depois da pergunta, 谢谢 fecha o pedido.",
    bodyEn: "In shops, stations, and with strangers, opening with 请问 is a recognised politeness. After the question, 谢谢 closes the request.",
    situationPt: "Você precisa perguntar o caminho a alguém que não conhece.",
    situationEn: "You need to ask a stranger for directions.",
    noticePt: "As pessoas costumam chamar a atenção com 请问 antes do conteúdo da pergunta.",
    noticeEn: "People often get attention with 请问 before the content of the question.",
    whyPt: "Interromper o espaço de outra pessoa pede uma moldura. 请问 é essa moldura em mandarim padrão de serviço e rua.",
    whyEn: "Stepping into someone else's space needs a frame. 请问 is that frame in standard service and street Mandarin.",
    practicePt: "请问, …? e 谢谢 no fim. Se não entender, 请再说一遍. Com um amigo ao lado, o 请问 pode desaparecer.",
    practiceEn: "请问, …? and 谢谢 at the end. If you do not understand, 请再说一遍. Beside a close friend, 请问 may drop away.",
    variabilityPt: "Quanto mais formal o lugar, mais o 请问 ajuda. Em grupo íntimo, pode soar distante.",
    variabilityEn: "The more formal the place, the more 请问 helps. In a close group it can sound distant.",
    relatedLessonIds: ["p1-qingwen-cortesia", "l11", "p6-cidade-lugares"],
    relatedChunkRefs: ["qingwen", "qingzaishuoyibian", "xiexie"],
    relatedHanziRefs: ["qing_pls"],
    sources: [SRC.guPoliteness, SRC.familyCulturePoliteness],
    miniCheck: {
      promptPt: "Você vai perguntar a um desconhecido onde fica o metrô. Qual abertura é mais adequada?",
      promptEn: "You are about to ask a stranger where the metro is. Which opening is more suitable?",
      options: [
        { id: "a", labelPt: "Começar direto com a ordem: 告诉我.", labelEn: "Start with a command: 告诉我." },
        { id: "b", labelPt: "Abrir com 请问 e só então fazer a pergunta.", labelEn: "Open with 请问 and only then ask." },
        { id: "c", labelPt: "Não falar nada e apontar o celular na cara da pessoa.", labelEn: "Say nothing and point your phone at their face." },
      ],
      correctOptionId: "b",
      explanationPt: "请问 marca o pedido a um desconhecido. Não é a única frase possível, mas é a mais segura neste contexto.",
      explanationEn: "请问 frames a request to a stranger. It is not the only possible line, but it is the safer one here.",
    },
  },
  {
    id: "family-terms",
    order: 8,
    category: "home_visits",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 3,
    titlePt: "Apresentar a família",
    titleEn: "Introducing family",
    summaryPt: "这是我爸爸 / 这是我妈妈 apresentam relações, não apenas nomes. Em visitas, a ordem e o respeito à geração importam mais do que um discurso longo.",
    summaryEn: "这是我爸爸 / 这是我妈妈 introduce relations, not only names. During visits, generation and order matter more than a long speech.",
    bodyPt: "Termos como 爸爸 e 妈妈 são formas de tratamento cotidianas. Apresentar quem é quem ajuda o convidado a saber como cumprimentar.",
    bodyEn: "Terms such as 爸爸 and 妈妈 are everyday forms of address. Introducing who is who helps a guest know how to greet.",
    situationPt: "Você chega à casa de um colega e os pais estão na sala.",
    situationEn: "You arrive at a classmate's home and the parents are in the living room.",
    noticePt: "Alguém pode dizer 这是我妈妈. Pode haver um cumprimento curto, não uma entrevista.",
    noticeEn: "Someone may say 这是我妈妈. There may be a short greeting, not an interview.",
    whyPt: "A casa é um espaço de geração. Saber quem é pai, mãe ou avó evita tratar um mais velho como se fosse um colega da mesma idade.",
    whyEn: "The home is a generational space. Knowing who is a parent or grandparent avoids treating an elder like a same-age classmate.",
    practicePt: "Cumprimente, ouça a apresentação, e use 您好 se o contexto for formal. 认识你很高兴 cabe depois, se a conversa continuar.",
    practiceEn: "Greet, listen to the introduction, and use 您好 if the context is formal. 认识你很高兴 fits afterwards if the conversation continues.",
    variabilityPt: "Famílias urbanas pequenas e famílias extensas não organizam a sala da mesma forma. Siga o anfitrião.",
    variabilityEn: "Small urban households and extended families do not organise the room the same way. Follow the host.",
    relatedLessonIds: ["l24", "l25", "p7-imersao-casa-amigo"],
    relatedChunkRefs: ["zheshibaba", "zheshimama", "zheshiwodejia", "renshinihengaoxing"],
    relatedHanziRefs: ["jia"],
    sources: [SRC.familyCulturePoliteness, SRC.govSpringFestival],
    miniCheck: {
      promptPt: "Alguém diz 这是我妈妈. Qual leitura ajuda mais?",
      promptEn: "Someone says 这是我妈妈. Which reading helps more?",
      options: [
        { id: "a", labelPt: "É só uma tradução de 'esta pessoa'. O papel dela na casa não importa.", labelEn: "It is only a translation of 'this person'. Her role in the home does not matter." },
        { id: "b", labelPt: "Estão apresentando a relação. Um cumprimento curto à mãe é adequado.", labelEn: "They are introducing the relationship. A short greeting to the mother is suitable." },
        { id: "c", labelPt: "Você deve imediatamente usar o primeiro nome dela.", labelEn: "You should immediately use her given name." },
      ],
      correctOptionId: "b",
      explanationPt: "A frase marca parentesco. Cumprimentar a pessoa apresentada é o passo natural; o primeiro nome pode ser íntimo demais.",
      explanationEn: "The line marks kinship. Greeting the person just introduced is the natural next step; a given name can be too intimate.",
    },
  },
  {
    id: "teacher-title",
    order: 9,
    category: "school_work",
    kind: "documented_practice",
    scope: "formal",
    estimatedMinutes: 3,
    titlePt: "Chamar o professor de 老师",
    titleEn: "Addressing a teacher as 老师",
    summaryPt: "Na escola e em muitos cursos, 老师 funciona como título. Não é um elogio opcional — é a forma esperada de se dirigir à pessoa naquele papel.",
    summaryEn: "At school and in many courses, 老师 works as a title. It is not an optional compliment — it is the expected way to address that role.",
    bodyPt: "Alunos costumam dizer 老师 mesmo quando o nome em pinyin seria possível. Em escritórios, títulos de cargo também aparecem; isso não é o mesmo que a sala de aula.",
    bodyEn: "Students often say 老师 even when a pinyin name would be possible. Offices also use job titles; that is not the same as the classroom.",
    situationPt: "Você precisa fazer uma pergunta no fim da aula.",
    situationEn: "You need to ask a question at the end of class.",
    noticePt: "Colegas podem chamar a pessoa de 老师, não pelo nome dado.",
    noticeEn: "Classmates may call the person 老师, not by their given name.",
    whyPt: "O título marca o papel (ensinar) e a assimetria da sala. Usar só o nome, como em alguns contextos brasileiros informais, pode soar seco nesse espaço.",
    whyEn: "The title marks the role (teaching) and the classroom asymmetry. Using only a given name, as in some informal Brazilian contexts, can sound blunt in that space.",
    practicePt: "老师, 请问…? Para colegas, 你 is usual. Não leve o título da sala automaticamente para um bar entre amigos da mesma idade.",
    practiceEn: "老师, 请问…? For classmates, 你 is usual. Do not carry the classroom title automatically into a bar among same-age friends.",
    variabilityPt: "Universidades internacionais e empresas jovens podem ser mais informais. Em escolas e cursos de língua, 老师 continua o padrão.",
    variabilityEn: "International universities and young companies may be more informal. In schools and language courses, 老师 remains the default.",
    relatedLessonIds: ["p6-rotina-trabalho", "l9", "l10"],
    relatedChunkRefs: ["woshixuesheng", "nixuexizhongwenma", "woxuexizhongwen", "qingwen"],
    relatedHanziRefs: ["ni"],
    sources: [SRC.guPoliteness, SRC.familyCulturePoliteness],
    miniCheck: {
      promptPt: "Você vai interromper o professor no corredor da escola. Qual tratamento é mais seguro?",
      promptEn: "You are about to stop the teacher in a school corridor. Which address is safer?",
      options: [
        { id: "a", labelPt: "Só o primeiro nome, como se fosse um colega da turma.", labelEn: "Only the given name, as if they were a classmate." },
        { id: "b", labelPt: "老师, seguido da pergunta.", labelEn: "老师, followed by the question." },
        { id: "c", labelPt: "Nenhum cumprimento: puxe a manga e fale.", labelEn: "No address: tug their sleeve and speak." },
      ],
      correctOptionId: "b",
      explanationPt: "老师 é o título do papel na escola. O primeiro nome pode ser íntimo demais nesse corredor.",
      explanationEn: "老师 is the role title at school. A given name can be too intimate in that corridor.",
    },
  },
  {
    id: "gift-receiving",
    order: 10,
    category: "gifts",
    kind: "documented_practice",
    scope: "formal",
    estimatedMinutes: 4,
    titlePt: "Receber algo com as duas mãos",
    titleEn: "Receiving something with both hands",
    summaryPt: "Em trocas um pouco formais, duas mãos ao dar ou receber um objeto marcam cuidado. Não é uma lei para cada copo de água entre amigos.",
    summaryEn: "In slightly formal exchanges, two hands when giving or receiving an object mark care. It is not a law for every glass of water among friends.",
    bodyPt: "Cartões, presentes embrulhados, documentos e chá em visitas mais formais são os casos em que o gesto aparece com mais clareza. Abrir o presente na hora não é regra única.",
    bodyEn: "Cards, wrapped gifts, documents, and tea on more formal visits are the cases where the gesture shows most clearly. Opening a gift on the spot is not a single rule.",
    situationPt: "Alguém te entrega um pacote pequeno ao chegar.",
    situationEn: "Someone hands you a small package when you arrive.",
    noticePt: "A pessoa pode oferecer com as duas mãos. Pode dizer para abrir depois, ou não dizer nada.",
    noticeEn: "They may offer it with both hands. They may tell you to open it later, or say nothing.",
    whyPt: "Duas mãos tornam o objeto visível como algo que importa. Uma mão só, em contexto formal, pode parecer pressa.",
    whyEn: "Two hands make the object visible as something that matters. One hand, in a formal context, can look rushed.",
    practicePt: "Receba com as duas mãos, diga 谢谢, e espere uma dica antes de abrir. Se disserem para abrir, abra com calma. Se não disserem, guardar para depois também é aceitável.",
    practiceEn: "Receive with both hands, say 谢谢, and wait for a cue before opening. If they say to open it, open it calmly. If they do not, putting it aside for later is also acceptable.",
    variabilityPt: "Amigos jovens e colegas informais frequentemente entregam com uma mão. O gesto de duas mãos pesa mais em visitas, cerimônias e trabalho formal.",
    variabilityEn: "Young friends and informal colleagues often pass things with one hand. Two hands matter more on visits, ceremonies, and formal work.",
    variabilityNote: "Opening immediately vs later is situational; treat both as possible, not as a national law.",
    relatedLessonIds: ["l4", "p7-imersao-casa-amigo", "p1-qingwen-cortesia"],
    relatedChunkRefs: ["xiexie", "bukeqi", "qingjin"],
    relatedHanziRefs: ["xie", "qing_pls"],
    sources: [SRC.chinaOrgTaboos, SRC.guPoliteness],
    miniCheck: {
      promptPt: "Numa visita um pouco formal, alguém te entrega um pacote. Qual gesto é mais adequado?",
      promptEn: "On a slightly formal visit, someone hands you a package. Which gesture is more suitable?",
      options: [
        { id: "a", labelPt: "Pegar com uma mão enquanto olha o celular.", labelEn: "Take it with one hand while looking at your phone." },
        { id: "b", labelPt: "Receber com as duas mãos e agradecer, sem rasgar o papel na hora a menos que peçam.", labelEn: "Receive with both hands and thank them, without tearing the paper open unless asked." },
        { id: "c", labelPt: "Recusar três vezes em silêncio e sair da sala.", labelEn: "Refuse three times in silence and leave the room." },
      ],
      correctOptionId: "b",
      explanationPt: "Duas mãos e 谢谢 marcam o cuidado. Abrir na hora não é obrigatório nem proibido de forma absoluta.",
      explanationEn: "Two hands and 谢谢 mark care. Opening on the spot is neither an absolute duty nor an absolute ban.",
    },
  },
  {
    id: "four-and-eight",
    order: 11,
    category: "gifts",
    kind: "symbol",
    scope: "regional",
    estimatedMinutes: 3,
    titlePt: "Quatro e oito: som, não magia",
    titleEn: "Four and eight: sound, not magic",
    summaryPt: "四 soa perto de 死 em várias variedades. 八 soa perto de 发. Isso influencia alguns preços, andares e presentes — não todos, nem para todas as pessoas.",
    summaryEn: "四 sounds close to 死 in several varieties. 八 sounds close to 发. That influences some prices, floors, and gifts — not all of them, and not for everyone.",
    bodyPt: "Associações fonéticas são documentadas em costumes de presente e numeração. Tratar isso como superstição obrigatória de 'todo chinês' é falso. Tratar como detalhe possível em contextos de presente e preço é útil.",
    bodyEn: "Phonetic associations are documented in gift customs and numbering. Treating them as a mandatory superstition of 'every Chinese person' is false. Treating them as a possible detail in gift and price contexts is useful.",
    situationPt: "Você escolhe um detalhe numérico para um presente ou lê um preço 268 / 444.",
    situationEn: "You pick a numerical detail for a gift or you read a price 268 / 444.",
    noticePt: "Alguns andares pulam o 4. Alguns preços de loja gostam de 8. Outros lugares não ligam.",
    noticeEn: "Some buildings skip 4. Some shop prices like 8. Other places do not care.",
    whyPt: "A associação nasce do som, não de uma lei. Por isso muda com língua local, geração e se a ocasião é festive ou cotidiana.",
    whyEn: "The association comes from sound, not from a law. That is why it shifts with local language, generation, and whether the occasion is festive or everyday.",
    practicePt: "Se for um presente simbólico, evitar um único 4 isolado e preferir um 6 ou 8 é uma leitura cautelosa. Não corrija quem usa 4 no telefone ou na data.",
    practiceEn: "For a symbolic gift, avoiding a lone 4 and preferring a 6 or 8 is a cautious reading. Do not correct someone who uses 4 in a phone number or a date.",
    variabilityPt: "Cantão, Hong Kong e algumas práticas de mercado realçam mais o 8 e o 4 do que muitos contextos do norte urbano jovem.",
    variabilityEn: "Cantonese-speaking areas, Hong Kong, and some market practices highlight 8 and 4 more than many young northern urban contexts.",
    variabilityNote: "Phonetic luck is regional and generational, not a national rule.",
    relatedLessonIds: ["l19", "l20", "l27", "p4-num-45"],
    relatedChunkRefs: ["duoshaoqian", "ershibayuan"],
    relatedHanziRefs: ["yi"],
    // holiday2026 não sustenta simbologia numérica — era citação errada.
    sources: [SRC.chinaOrgTaboos],
    miniCheck: {
      promptPt: "Você viu um preço 888 e um andar sem 4. Qual leitura é mais segura?",
      promptEn: "You saw a price 888 and a floor without 4. Which reading is safer?",
      options: [
        { id: "a", labelPt: "Todo mundo na China rejeita o 4 e ama o 8, sempre.", labelEn: "Everyone in China always rejects 4 and loves 8." },
        { id: "b", labelPt: "Há uma associação sonora que às vezes aparece em preços e presentes, e às vezes não.", labelEn: "There is a sound association that sometimes appears in prices and gifts, and sometimes does not." },
        { id: "c", labelPt: "Esses números são ilegais.", labelEn: "Those numbers are illegal." },
      ],
      correctOptionId: "b",
      explanationPt: "É associação fonética contextual, não uma lei nem um comportamento único de um bilhão de pessoas.",
      explanationEn: "It is a contextual phonetic association, not a law and not a single behaviour of a billion people.",
    },
  },
  {
    id: "spring-festival",
    order: 12,
    category: "festivals",
    kind: "festival",
    scope: "broad",
    estimatedMinutes: 5,
    titlePt: "Festival da Primavera",
    titleEn: "Spring Festival",
    summaryPt: "春节 (Chūnjié) é o Ano Novo no calendário lunissolar chinês: reunião familiar, deslocamento e costumes que variam por casa — reconhecidos pela UNESCO em 2024.",
    summaryEn: "春节 (Chūnjié) is New Year on the Chinese lunisolar calendar: family reunion, travel, and household customs that vary — UNESCO-inscribed in 2024.",
    bodyPt:
      "春节 marca a virada do ano no calendário lunissolar tradicional (intercalação lunar com correção solar). Por isso a data gregoriana muda a cada ano — não há um único '1º de janeiro chinês' fixo no calendário ocidental. O eixo mais estável é a reunião familiar: muitos viajam na véspera (除夕), trocam cumprimentos de ano novo, usam decoração vermelha e, em alguns círculos, 红包 (hóngbāo). A UNESCO descreve práticas de reunião, bênçãos e eventos comunitários — não um ritual idêntico em cada casa. Costumes de comida, visita e etiqueta mudam por região, geração e família.",
    bodyEn:
      "春节 marks the turn of the year on the traditional Chinese lunisolar calendar (lunar months with solar correction). That is why the Gregorian date moves each year — there is no single fixed 'Chinese January 1' on the Western calendar. The most stable axis is family reunion: many travel on New Year's Eve (除夕), exchange New Year greetings, use red decoration, and in some circles give 红包 (hóngbāo). UNESCO describes reunion, well-wishing, and community events — not one identical ritual in every home. Food, visits, and etiquette still shift by region, generation, and family.",
    situationPt: "Colegas falam em voltar para casa no 春节 e alguém menciona 红包.",
    situationEn: "Colleagues talk about going home for 春节 and someone mentions 红包.",
    noticePt: "Há viagens, reunião na véspera, cumprimentos, decoração e às vezes 红包. O que cada família come e visita muda.",
    noticeEn: "There is travel, reunion on New Year's Eve, greetings, decoration, and sometimes 红包. What each family eats and visits still changes.",
    whyPt: "A inscrição da UNESCO enfatiza reunião familiar e práticas transmitidas em casa e na escola. Entender 春节 como calendário lunissolar + reunião evita tanto o erro de data fixa gregoriana quanto o estereótipo de um único ritual nacional.",
    whyEn: "The UNESCO inscription emphasises family reunion and practices passed on at home and at school. Reading 春节 as lunisolar calendar + reunion avoids both a fixed Gregorian-date error and the stereotype of one national ritual.",
    practicePt: "Se alguém viaja: deseja um bom 春节. Não assuma o mesmo prato, a mesma visita ou o mesmo 红包. 家 e termos de família que você já estudou voltam com força nesse período.",
    practiceEn: "If someone is travelling: wish them a good 春节. Do not assume the same dish, visit, or 红包. 家 and family terms you already study come back strongly in this period.",
    variabilityPt: "Dias oficiais de folga, pratos, 红包 e se a pessoa fica na cidade natal ou na cidade onde trabalha variam. A reunião é o eixo mais estável, não o menu.",
    variabilityEn: "Official days off, dishes, 红包, and whether someone stays in their hometown or work city all vary. Reunion is the more stable axis, not the menu.",
    relatedLessonIds: ["l24", "l25", "p6-rotina-trabalho"],
    relatedChunkRefs: ["zheshiwodejia", "zheshibaba", "mingtianjian"],
    relatedHanziRefs: ["jia"],
    sources: [SRC.govSpringFestival, SRC.holiday2026, SRC.holidayEn],
    yearFacts: [
      {
        year: 2026,
        labelPt: "Em 2026, o período oficial de folga do Festival da Primavera consta no aviso de feriados públicos do Conselho de Estado.",
        labelEn: "In 2026, the official Spring Festival public-holiday window is listed in the State Council public-holiday notice.",
        source: SRC.holiday2026,
        verifiedAt: ACCESSED,
      },
    ],
    miniCheck: {
      promptPt: "Um colega diz que volta para casa no 春节. Qual leitura é mais segura?",
      promptEn: "A colleague says they are going home for 春节. Which reading is safer?",
      options: [
        { id: "a", labelPt: "É só um feriado comercial, sem reunião familiar.", labelEn: "It is only a commercial holiday, with no family reunion." },
        { id: "b", labelPt: "Costuma ser um período de reunião e deslocamento, com práticas que variam por família.", labelEn: "It is usually a period of reunion and travel, with practices that vary by family." },
        { id: "c", labelPt: "Toda casa na China faz exatamente o mesmo ritual na mesma hora.", labelEn: "Every home in China performs exactly the same ritual at the same hour." },
      ],
      correctOptionId: "b",
      explanationPt: "Reunião e viagem são o eixo documentado. O ritual idêntico em cada casa não é.",
      explanationEn: "Reunion and travel are the documented axis. An identical ritual in every home is not.",
    },
  },
  {
    id: "mid-autumn",
    order: 13,
    category: "festivals",
    kind: "festival",
    scope: "broad",
    estimatedMinutes: 3,
    titlePt: "Festival do Meio Outono",
    titleEn: "Mid-Autumn Festival",
    summaryPt: "É feriado oficial no 15º dia do 8º mês lunar. Reunião e lua são o eixo; bolos e costumes locais variam.",
    summaryEn: "It is an official holiday on the 15th day of the 8th lunar month. Reunion and the moon are the axis; cakes and local customs vary.",
    bodyPt: "中秋节 cai no 15º dia do 8º mês do calendário lunissolar. Fontes institucionais e enciclopédicas ligam o dia à lua cheia e à reunião; bolos (月饼) e costumes locais variam. O calendário civil estatal lista o feriado — isso não fixa um único script de festa.",
    bodyEn: "中秋节 falls on the 15th day of the 8th lunisolar month. Institutional and encyclopaedic sources link the day to the full moon and reunion; cakes (月饼) and local customs vary. The state civil calendar lists the holiday — that does not fix a single party script.",
    situationPt: "Na semana do feriado, alguém oferece um pacote de 月饼.",
    situationEn: "In the holiday week, someone offers a box of 月饼.",
    noticePt: "Pode haver folga, deslocamento curto e conversa sobre ver a lua. Presentes de bolo acontecem em alguns círculos de trabalho e família.",
    noticeEn: "There may be time off, a short trip, and talk about seeing the moon. Cake gifts happen in some work and family circles.",
    whyPt: "O calendário estatal reconhece o dia. Tradições de lua e reunião são antigas e regionais — por isso o feriado existe sem um único script de festa.",
    whyEn: "The state calendar recognises the day. Moon and reunion traditions are old and regional — that is why the holiday exists without a single party script.",
    practicePt: "Se receber 月饼: 谢谢. Não é obrigatório gostar do recheio. Se alguém viaja para casa, o mesmo cuidado do 春节 vale em escala menor.",
    practiceEn: "If you receive 月饼: 谢谢. You are not required to like the filling. If someone travels home, the same care as 春节 applies on a smaller scale.",
    variabilityPt: "Costumes de Hong Kong, Guangdong e do norte não coincidem. Algumas empresas dão caixas; outras não.",
    variabilityEn: "Customs in Hong Kong, Guangdong, and the north do not match. Some companies give boxes; others do not.",
    relatedLessonIds: ["l24", "l4", "l26"],
    relatedChunkRefs: ["xiexie", "zheshiwodejia"],
    relatedHanziRefs: ["jia", "yue"],
    sources: [SRC.britannicaMidAutumn, SRC.holiday2026, SRC.holidayEn],
    yearFacts: [
      {
        year: 2026,
        labelPt: "Em 2026, 中秋节 aparece no aviso oficial de feriados públicos do Conselho de Estado.",
        labelEn: "In 2026, 中秋节 appears in the State Council official public-holiday notice.",
        source: SRC.holiday2026,
        verifiedAt: ACCESSED,
      },
    ],
    miniCheck: {
      promptPt: "Alguém menciona 中秋节. O que é mais estável nesse feriado?",
      promptEn: "Someone mentions 中秋节. What is more stable about this holiday?",
      options: [
        { id: "a", labelPt: "Toda família come exatamente o mesmo bolo no mesmo minuto.", labelEn: "Every family eats exactly the same cake at the same minute." },
        { id: "b", labelPt: "É um feriado oficial ligado a reunião e à lua; os costumes locais mudam.", labelEn: "It is an official holiday tied to reunion and the moon; local customs change." },
        { id: "c", labelPt: "Não existe no calendário do Estado.", labelEn: "It does not exist on the state calendar." },
      ],
      correctOptionId: "b",
      explanationPt: "O Estado lista o feriado. O menu único nacional não existe.",
      explanationEn: "The state lists the holiday. A single national menu does not exist.",
    },
  },
  {
    id: "qingming",
    order: 14,
    category: "festivals",
    kind: "festival",
    scope: "historical",
    estimatedMinutes: 3,
    titlePt: "Qingming: lembrar, não 'festa'",
    titleEn: "Qingming: remembrance, not 'a party'",
    summaryPt: "清明节 é feriado oficial ligado a visitas a túmulos e cuidado com antepassados. O tom é de memória, não de celebração barulhenta.",
    summaryEn: "清明节 is an official holiday linked to grave visits and care for ancestors. The tone is remembrance, not a noisy celebration.",
    bodyPt: "O calendário estatal inclui 清明节. Práticas de limpar o túmulo, oferecer flores ou viajar para a cidade natal aparecem com variação enorme.",
    bodyEn: "The state calendar includes 清明节. Practices of tending a grave, offering flowers, or travelling to a hometown vary widely.",
    situationPt: "Um colega pede folga em abril e fala em voltar à cidade dos avós.",
    situationEn: "A colleague asks for leave in April and talks about returning to their grandparents' town.",
    noticePt: "Pode haver viagem, silêncio sobre detalhes, ou uma conversa curta. Não é o mesmo clima do 春节.",
    noticeEn: "There may be travel, silence about details, or a short conversation. It is not the same mood as 春节.",
    whyPt: "O feriado institucionaliza um tempo de memória. Tratar Qingming como 'mais um festival de comida' perde o eixo documentado.",
    whyEn: "The holiday institutionalises a time of remembrance. Treating Qingming as 'just another food festival' misses the documented axis.",
    practicePt: "Se alguém menciona 清明, um tom sóbrio é mais adequado do que piada. Não peça fotos do túmulo. 家 volta como lugar de origem, não só como endereço.",
    practiceEn: "If someone mentions 清明, a sober tone fits better than a joke. Do not ask for grave photos. 家 returns as a place of origin, not only as an address.",
    variabilityPt: "Urbano/rural, se a família ainda tem túmulo acessível, e se o feriado vira só um fim de semana de viagem mudam a prática.",
    variabilityEn: "Urban/rural life, whether the family still has an accessible grave, and whether the holiday becomes only a travel weekend all change the practice.",
    relatedLessonIds: ["l24", "p6-rotina-trabalho"],
    relatedChunkRefs: ["zheshiwodejia", "mingtianjian"],
    relatedHanziRefs: ["jia"],
    sources: [SRC.ihchinaQingming, SRC.unescoSolarTerms, SRC.holiday2026, SRC.holidayEn],
    yearFacts: [
      {
        year: 2026,
        labelPt: "Em 2026, 清明节 consta no aviso oficial de feriados públicos do Conselho de Estado.",
        labelEn: "In 2026, 清明节 is listed in the State Council official public-holiday notice.",
        source: SRC.holiday2026,
        verifiedAt: ACCESSED,
      },
    ],
    miniCheck: {
      promptPt: "Qingming aparece no calendário. Qual leitura combina melhor?",
      promptEn: "Qingming appears on the calendar. Which reading fits better?",
      options: [
        { id: "a", labelPt: "É principalmente um feriado de memória e visitas familiares, com práticas que variam.", labelEn: "It is mainly a holiday of remembrance and family visits, with practices that vary." },
        { id: "b", labelPt: "É o mesmo que o Ano Novo: fogos e reunião barulhenta obrigatória.", labelEn: "It is the same as New Year: fireworks and a mandatory noisy reunion." },
        { id: "c", labelPt: "Não é reconhecido pelo Estado.", labelEn: "The state does not recognise it." },
      ],
      correctOptionId: "a",
      explanationPt: "O Estado lista o feriado; o eixo documentado é memória, não o script do Ano Novo.",
      explanationEn: "The state lists the holiday; the documented axis is remembrance, not the New Year script.",
    },
  },
  {
    id: "dragon-boat",
    order: 15,
    category: "festivals",
    kind: "festival",
    scope: "regional",
    estimatedMinutes: 3,
    titlePt: "Festival do Barco-Dragão",
    titleEn: "Dragon Boat Festival",
    summaryPt: "端午节 está na lista da UNESCO (2009) e no calendário estatal. Corridas, 粽子 e o herói lembrado mudam por região.",
    summaryEn: "端午节 is on the UNESCO list (2009) and on the state calendar. Races, 粽子, and which hero is remembered change by region.",
    bodyPt: "A UNESCO registra variação: Qu Yuan em Hubei e Hunan, outras figuras no sul e no sudoeste. Comer 粽子 é comum; não é o único conteúdo do dia.",
    bodyEn: "UNESCO records variation: Qu Yuan in Hubei and Hunan, other figures in the south and southwest. Eating 粽子 is common; it is not the day's only content.",
    situationPt: "Em junho, alguém fala em 粽子 e num feriado de três dias.",
    situationEn: "In June, someone talks about 粽子 and a three-day holiday.",
    noticePt: "Pode haver folga, comida de arroz envolvida em folha, e — em algumas cidades — corridas no rio.",
    noticeEn: "There may be time off, leaf-wrapped rice food, and — in some cities — races on the river.",
    whyPt: "A inscrição da UNESCO insiste na variação regional. Por isso o feriado é nacional e as histórias não são uma só.",
    whyEn: "The UNESCO inscription insists on regional variation. That is why the holiday is national and the stories are not single.",
    practicePt: "Se oferecerem 粽子: 谢谢. Não assuma que toda cidade tem corrida. Se alguém mencionar Qu Yuan, é uma tradição de algumas regiões, não de todas.",
    practiceEn: "If someone offers 粽子: 谢谢. Do not assume every city has a race. If someone mentions Qu Yuan, that is a tradition of some regions, not all.",
    variabilityPt: "O herói, o esporte e os rituais de proteção contra doença variam explicitamente na ficha da UNESCO.",
    variabilityEn: "The hero, the sport, and protective rituals against illness vary explicitly in the UNESCO file.",
    relatedLessonIds: ["l26", "l26b", "p6-natureza"],
    relatedChunkRefs: ["xiexie", "haochi"],
    relatedHanziRefs: ["fan_rice"],
    sources: [SRC.unescoDragonBoat, SRC.chinaCultureOrg, SRC.holiday2026],
    miniCheck: {
      promptPt: "A UNESCO descreve o Dragon Boat Festival. Qual afirmação é mais fiel?",
      promptEn: "UNESCO describes the Dragon Boat Festival. Which statement is more faithful?",
      options: [
        { id: "a", labelPt: "Todas as regiões celebram exatamente o mesmo herói da mesma forma.", labelEn: "Every region celebrates exactly the same hero in the same way." },
        { id: "b", labelPt: "Há um feriado compartilhado, com comidas e histórias que mudam por região.", labelEn: "There is a shared holiday, with foods and stories that change by region." },
        { id: "c", labelPt: "O festival só existe em Pequim.", labelEn: "The festival exists only in Beijing." },
      ],
      correctOptionId: "b",
      explanationPt: "A ficha da UNESCO lista variação de herói e de festa. O feriado estatal é nacional.",
      explanationEn: "The UNESCO file lists variation of hero and festivity. The state holiday is national.",
    },
  },
  {
    id: "digital-pay",
    order: 16,
    category: "contemporary_china",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 3,
    titlePt: "Pagar com o celular",
    titleEn: "Paying with a phone",
    summaryPt: "Pagamentos móveis e de instituições não bancárias são parte documentada do sistema de pagamentos chinês. Dinheiro vivo ainda existe, mas muitas lojas esperam um QR.",
    summaryEn: "Mobile and non-bank payments are a documented part of China's payment system. Cash still exists, but many shops expect a QR code.",
    bodyPt: "O banco central publica estatísticas de pagamento móvel e de instituições não bancárias. Na vida cotidiana isso aparece como 微信支付, 支付宝 ou outro QR — não como um único app obrigatório por lei.",
    bodyEn: "The central bank publishes statistics on mobile payments and non-bank institutions. In daily life that appears as 微信支付, 支付宝, or another QR — not as a single legally mandatory app.",
    situationPt: "Você chegou no caixa e não vê uma bandeja de cartão como no Brasil.",
    situationEn: "You reach the till and do not see a card tray like in Brazil.",
    noticePt: "Pode haver um código QR na mesa ou no caixa. Alguém pode perguntar se você usa WeChat ou Alipay. Dinheiro vivo (现金) ainda é uma pergunta possível.",
    noticeEn: "There may be a QR code on the table or at the till. Someone may ask whether you use WeChat or Alipay. Cash (现金) is still a possible question.",
    whyPt: "A infraestrutura de pagamento cresceu em torno do celular. Por isso 'passar o cartão' não é o gesto padrão em muitos lugares — sem isso significar que cartão ou dinheiro tenham desaparecido.",
    whyEn: "Payment infrastructure grew around the phone. That is why 'swipe the card' is not the default gesture in many places — without meaning that cards or cash have vanished.",
    practicePt: "Aprenda 微信支付, 支付宝 e 现金. 可以刷卡吗？ continua útil. Não assuma que todo caixa aceita o mesmo método.",
    practiceEn: "Learn 微信支付, 支付宝, and 现金. 可以刷卡吗？ remains useful. Do not assume every till accepts the same method.",
    variabilityPt: "Cidades grandes e mercados de rua não têm a mesma cobertura. Turistas e idosos encontram mais exceções.",
    variabilityEn: "Large cities and street markets do not have the same coverage. Tourists and older people meet more exceptions.",
    relatedLessonIds: ["l27", "p6-compras", "p6-survival-mandarin"],
    relatedChunkRefs: ["weixinzhifu", "zhifubao", "xianjin", "keyishuaka", "duoshaoqian"],
    relatedHanziRefs: ["yao"],
    sources: [SRC.pbocPayments],
    miniCheck: {
      promptPt: "No caixa só aparece um QR. Qual leitura é mais útil?",
      promptEn: "At the till you only see a QR code. Which reading is more useful?",
      options: [
        { id: "a", labelPt: "Cartão e dinheiro foram proibidos em todo o país.", labelEn: "Cards and cash were banned nationwide." },
        { id: "b", labelPt: "Muitos caixas esperam pagamento móvel; ainda vale perguntar por cartão ou 现金.", labelEn: "Many tills expect mobile pay; it is still worth asking about a card or 现金." },
        { id: "c", labelPt: "O QR é só decoração.", labelEn: "The QR code is only decoration." },
      ],
      correctOptionId: "b",
      explanationPt: "Pagamento móvel é o padrão documentado em volume, não uma proibição dos outros meios.",
      explanationEn: "Mobile pay is the documented volume default, not a ban on other means.",
    },
  },
  {
    id: "metro-qr",
    order: 17,
    category: "transport_public",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 3,
    titlePt: "Metrô e espaço público",
    titleEn: "Metro and public space",
    summaryPt: "Cidades grandes organizam o deslocamento em torno de 地铁, códigos e filas. O ritmo é urbano, não uma etiqueta eterna de aldeia.",
    summaryEn: "Large cities organise movement around 地铁, codes, and queues. The rhythm is urban, not an eternal village etiquette.",
    bodyPt: "Perguntar 地铁站在哪里？ é sobrevivência. Nos vagões, volume baixo e não bloquear a porta são hábitos de densidade — iguais em muitas metrópoles.",
    bodyEn: "Asking 地铁站在哪里？ is survival. On trains, lower volume and not blocking the door are density habits — like in many metropolises.",
    situationPt: "Você precisa cruzar a cidade na hora do rush.",
    situationEn: "You need to cross the city at rush hour.",
    noticePt: "Há catracas, QR ou cartão, setas de entrada/saída (入口 / 出口) e gente andando rápido.",
    noticeEn: "There are gates, a QR or card, entry/exit signs (入口 / 出口), and people walking fast.",
    whyPt: "Transporte urbano chinês contemporâneo é um sistema de massa. A 'etiqueta' aqui é sobretudo fluidez: não parar na porta, ter o código pronto, falar baixo no telefone.",
    whyEn: "Contemporary Chinese urban transport is a mass system. 'Etiquette' here is mostly flow: do not stop in the doorway, have the code ready, keep phone calls quiet.",
    practicePt: "地铁站在哪里？ 我坐地铁. Deixe as pessoas descerem. Tenha o pagamento pronto. 出口 e 入口 ajudam a ler o espaço.",
    practiceEn: "地铁站在哪里？ 我坐地铁. Let people off first. Have payment ready. 出口 and 入口 help you read the space.",
    variabilityPt: "Cidades e linhas não usam o mesmo app. Ônibus e bicicletas compartilhadas mudam o quadro. Pequenas cidades não copiam Xangai.",
    variabilityEn: "Cities and lines do not use the same app. Buses and shared bikes change the picture. Smaller cities do not copy Shanghai.",
    relatedLessonIds: ["p6-cidade-lugares", "p7-imersao-estacao", "p6-direcoes"],
    relatedChunkRefs: ["ditie", "ditiezhanzainali", "wozuoditie", "chuko", "ruko"],
    relatedHanziRefs: ["zai"],
    sources: [SRC.pbocPayments, SRC.holidayEn],
    miniCheck: {
      promptPt: "A porta do metrô abre e você está na frente. Qual hábito ajuda o fluxo?",
      promptEn: "The metro door opens and you are in front. Which habit helps the flow?",
      options: [
        { id: "a", labelPt: "Entrar na hora para garantir lugar, bloqueando quem desce.", labelEn: "Step in immediately to get a seat, blocking people who are getting off." },
        { id: "b", labelPt: "Deixar descer, depois entrar, com o código ou cartão já pronto.", labelEn: "Let people off, then enter, with your code or card already ready." },
        { id: "c", labelPt: "Parar na porta para olhar o mapa do celular.", labelEn: "Stop in the doorway to look at the map on your phone." },
      ],
      correctOptionId: "b",
      explanationPt: "Em transporte de massa, o cuidado é com o fluxo. Não é uma regra imperial — é densidade urbana.",
      explanationEn: "In mass transit, the care is for flow. It is not an imperial rule — it is urban density.",
    },
  },
  {
    id: "office-hours",
    order: 18,
    category: "daily_life",
    kind: "documented_practice",
    scope: "generational",
    estimatedMinutes: 3,
    titlePt: "Horário, trabalho e ritmo urbano",
    titleEn: "Hours, work, and urban rhythm",
    summaryPt: "Perguntar 你几点上班？ é sobre rotina, não sobre julgar o caráter de alguém. Ritmos de escritório, escola e plataforma variam muito.",
    summaryEn: "Asking 你几点上班？ is about routine, not about judging someone's character. Office, school, and platform rhythms vary widely.",
    bodyPt: "A Jornada já ensina acordar, trabalhar e perguntar horas. Na vida real isso encontra 加班, horários escolares e serviços 24h — sem um único 'horário chinês'.",
    bodyEn: "The Journey already teaches waking, working, and asking the time. In real life that meets 加班, school hours, and 24-hour services — without a single 'Chinese timetable'.",
    situationPt: "Um conhecido pergunta a que horas você começa o trabalho.",
    situationEn: "An acquaintance asks what time you start work.",
    noticePt: "Pode ser small talk de rotina, igual a perguntar se você já comeu. Não é automaticamente uma invasão.",
    noticeEn: "It may be routine small talk, like asking whether you have eaten. It is not automatically an invasion.",
    whyPt: "Perguntas de rotina (horas, refeições, deslocamento) organizam o cuidado cotidiano. Literatura de polidez trata isso como calor atitudinal em círculos conhecidos — não como ficha policial.",
    whyEn: "Routine questions (hours, meals, commuting) organise everyday care. Politeness literature treats this as attitudinal warmth in known circles — not as a police form.",
    practicePt: "Você pode responder com a hora (我七点起床 / 我在公司上班) ou desviar com leveza se não quiser detalhar. Não leia a pergunta como grosseira só porque no Brasil ela seria íntima.",
    practiceEn: "You can answer with a time (我七点起床 / 我在公司上班) or deflect lightly if you do not want detail. Do not read the question as rude only because it would be intimate in Brazil.",
    variabilityPt: "Trabalho de plataforma, escritório e escola não compartilham o mesmo relógio. Geração e cidade mudam o que é 'cedo'.",
    variabilityEn: "Platform work, offices, and schools do not share the same clock. Generation and city change what counts as 'early'.",
    relatedLessonIds: ["p6-rotina-trabalho", "p6-horarios", "l9"],
    relatedChunkRefs: ["nizuoshenmegongzuo", "wozaigongsishangban", "nijidianshangban", "woqidianqichuang"],
    relatedHanziRefs: ["shi"],
    sources: [SRC.familyCulturePoliteness, SRC.guPoliteness],
    miniCheck: {
      promptPt: "Alguém pergunta 你几点上班？ Qual leitura é mais segura entre conhecidos?",
      promptEn: "Someone asks 你几点上班？ Which reading is safer among acquaintances?",
      options: [
        { id: "a", labelPt: "É sempre uma ofensa à privacidade.", labelEn: "It is always an offence against privacy." },
        { id: "b", labelPt: "Pode ser conversa de rotina; você pode responder ou desviar com educação.", labelEn: "It can be routine talk; you may answer or deflect politely." },
        { id: "c", labelPt: "Você é obrigado a mostrar o holerite.", labelEn: "You are required to show your payslip." },
      ],
      correctOptionId: "b",
      explanationPt: "Em círculos conhecidos, rotina é small talk possível. Não é obrigação de entregar dados, nem insulto automático.",
      explanationEn: "In known circles, routine can be possible small talk. It is neither a duty to hand over data nor an automatic insult.",
    },
  },
  {
    id: "bargaining-context",
    order: 19,
    category: "contemporary_china",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 3,
    titlePt: "Quando negociar o preço",
    titleEn: "When to bargain over price",
    summaryPt: "A lei chinesa pede preço claramente marcado. Em supermercado e loja de rede, pagar o valor da etiqueta é o caminho usual. Em algumas bancas o preço é falado na hora — aí 太贵了 pode fazer sentido.",
    summaryEn: "Chinese law requires clearly marked prices. In a supermarket or chain shop, paying the tagged amount is the usual path. At some stalls the price is spoken on the spot — then 太贵了 can make sense.",
    bodyPt: "O artigo 13 da Lei de Preços e o regulamento da SAMR (2022) exigem 明码标价: nome, preço e unidade visíveis, sem taxa escondida. Isso não descreve um «mercado chinês» único. Descreve o dever da loja de mostrar o preço.",
    bodyEn: "Article 13 of the Price Law and the 2022 SAMR rules require 明码标价: visible name, price, and unit, with no hidden surcharge. That does not describe a single “Chinese market”. It describes the shop’s duty to show the price.",
    situationPt: "Wang entra numa loja de rede. O preço está na etiqueta. Depois passa numa banca que diz o valor na hora.",
    situationEn: "Wang walks into a chain shop. The price is on the tag. Later he stops at a stall that quotes the amount out loud.",
    noticePt: "Etiqueta clara, fila de caixa e cartaz de preço costumam dizer: pague o que está escrito. Banca com preço falado é outro contexto.",
    noticeEn: "A clear tag, a till queue, and a price sign usually mean: pay what is written. A stall that quotes the amount out loud is a different context.",
    whyPt: "Pechinchar em todo lugar trata «o mercado» como uma regra. A fonte jurídica é o contrário: o preço marcado é a informação padrão. Negociar, quando acontece, depende do tipo de estabelecimento.",
    whyEn: "Bargaining everywhere treats “the market” as a rule. The legal source says the opposite: the marked price is the default information. Haggling, when it happens, depends on the kind of shop.",
    practicePt: "Olhe o contexto antes de 太贵了. Loja de rede e supermercado: 好 ou 不要了. Banca com preço falado: 太贵了 ou 便宜一点 podem caber.",
    practiceEn: "Read the setting before 太贵了. Chain shop and supermarket: 好 or 不要了. A stall with a spoken price: 太贵了 or 便宜一点 may fit.",
    variabilityPt: "Mercado de turista, atacado e loja de bairro não repetem o mesmo script. Uma recusa educada (不要了) vale em qualquer um.",
    variabilityEn: "Tourist markets, wholesale stalls, and neighbourhood shops do not share one script. A polite decline (不要了) works in any of them.",
    relatedLessonIds: ["p6-compras", "p7-imersao-mercado", "l27"],
    relatedChunkRefs: ["taiguile", "pianyiyidian", "duoshaoqian"],
    relatedHanziRefs: ["mai_buy", "qian_money"],
    sources: [SRC.priceLawArt13, SRC.samrMarkedPrices],
    miniCheck: {
      promptPt: "O preço está na etiqueta duma loja de rede. Qual leitura é mais fiel às regras de 明码标价?",
      promptEn: "The price is on the tag in a chain shop. Which reading is more faithful to 明码标价 rules?",
      options: [
        { id: "a", labelPt: "Negociar faz parte em qualquer loja da China.", labelEn: "Bargaining is part of shopping in every shop in China." },
        { id: "b", labelPt: "Pagar o preço marcado é o caminho usual; pechinchar depende do tipo de estabelecimento.", labelEn: "Paying the marked price is the usual path; haggling depends on the kind of shop." },
        { id: "c", labelPt: "O preço na etiqueta é só um convite para começar a pechincha.", labelEn: "The tagged price is only an invitation to start haggling." },
      ],
      correctOptionId: "b",
      explanationPt: "明码标价 pede o preço visível. Não transforma toda compra numa negociação.",
      explanationEn: "明码标价 requires a visible price. It does not turn every purchase into a negotiation.",
    },
  },
  {
    id: "hotel-checkin-register",
    order: 20,
    category: "daily_life",
    kind: "documented_practice",
    scope: "formal",
    estimatedMinutes: 3,
    titlePt: "Passaporte na recepção",
    titleEn: "Passport at the front desk",
    summaryPt:
      "Em hotel na China continental, a recepção registra a estadia do estrangeiro com o passaporte e envia esse registro ao órgão de segurança pública do lugar. Não é um 'costume de hospitalidade': é dever legal do hotel.",
    summaryEn:
      "In a hotel on the Chinese mainland, the front desk registers a foreign guest's stay with the passport and submits that registration to the local public security organ. It is not a hospitality custom: it is the hotel's legal duty.",
    bodyPt:
      "O artigo 39 da Lei de Administração de Saída e Entrada diz: se o estrangeiro fica em hotel, o hotel registra a hospedagem segundo as regras de segurança pública da indústria hoteleira e envia a informação ao órgão local. Quem fica em casa, dormitório ou outro domicílio que não seja hotel segue o outro parágrafo: o hóspede ou quem o acolhe registra em 24 horas.",
    bodyEn:
      "Article 39 of the Exit and Entry Administration Law says: when a foreigner stays in a hotel, the hotel registers the stay under hotel public-security rules and submits the information to the local organ. Anyone staying in a home, dorm, or other non-hotel domicile follows the other paragraph: the guest or the host registers within 24 hours.",
    situationPt: "Você chega a um hotel em Xangai. A recepcionista cumprimenta e pede o passaporte.",
    situationEn: "You arrive at a hotel in Shanghai. The receptionist greets you and asks for the passport.",
    noticePt:
      "Mostre o passaporte na 前台. O hotel faz o registro. Isso não é o mesmo processo de quem dorme na casa de um amigo.",
    noticeEn:
      "Show the passport at 前台. The hotel does the registration. That is not the same process as staying at a friend's home.",
    whyPt:
      "Sem o documento, o hotel não consegue cumprir o registro. Pedir o passaporte na recepção é o passo legal da estadia em hotel — não um pedido aleatório de 'cultura chinesa'.",
    whyEn:
      "Without the document, the hotel cannot complete the registration. Asking for the passport at the desk is the legal hotel-stay step — not a random 'Chinese culture' request.",
    practicePt: "这是我的护照. Guarde o passaporte acessível no check-in. Em casa de amigo, o registro é outro caminho.",
    practiceEn: "这是我的护照. Keep the passport ready at check-in. At a friend's home, registration is a different path.",
    variabilityPt:
      "Hotel, hostel e pousada que aceitam estrangeiros costumam registrar na recepção. Casa, dormitório e alguns aluguéis informais usam o prazo de 24 horas — e o aplicativo ou a delegacia variam por cidade.",
    variabilityEn:
      "Hotels, hostels, and guesthouses that take foreigners usually register at the desk. Homes, dorms, and some informal stays use the 24-hour rule — and the app or police station varies by city.",
    relatedLessonIds: ["p6-survival-mandarin", "p7-imersao-hotel"],
    relatedChunkRefs: ["huzhao", "zheshiwodehuzhao", "qinggeiwodehuzhao", "qiantai"],
    relatedHanziRefs: ["you"],
    sources: [SRC.niaExitEntryArt39, SRC.niaHotelVsHome],
    miniCheck: {
      promptPt: "Na recepção de um hotel na China continental, por que pedem o passaporte?",
      promptEn: "At a hotel front desk on the Chinese mainland, why do they ask for the passport?",
      options: [
        {
          id: "a",
          labelPt: "É só um hábito de hotel igual em qualquer país, sem regra local.",
          labelEn: "It is only a hotel habit like anywhere, with no local rule.",
        },
        {
          id: "b",
          labelPt: "O hotel registra a estadia do estrangeiro e envia isso ao órgão de segurança pública local.",
          labelEn: "The hotel registers the foreigner's stay and submits it to the local public security organ.",
        },
        {
          id: "c",
          labelPt: "Todo hóspede chinês também precisa do passaporte para dormir.",
          labelEn: "Every Chinese guest also needs a passport to sleep there.",
        },
      ],
      correctOptionId: "b",
      explanationPt: "O artigo 39 atribui o registro ao hotel. Não generalize para casa de amigo nem para 'todo hóspede'.",
      explanationEn: "Article 39 assigns registration to the hotel. Do not generalise that to a friend's home or to 'every guest'.",
    },
  },
  {
    id: "lantern-festival",
    order: 21,
    category: "festivals",
    kind: "festival",
    scope: "broad",
    estimatedMinutes: 4,
    titlePt: "Festival das Lanternas",
    titleEn: "Lantern Festival",
    summaryPt: "元宵节 (Yuánxiāojié) fecha o período do Ano Novo lunissolar: lanternas, reunião e costumes que variam por região e família.",
    summaryEn: "元宵节 (Yuánxiāojié) closes the lunisolar New Year period: lanterns, gathering, and customs that vary by region and family.",
    bodyPt:
      "元宵节 cai no 15º dia do 1º mês do calendário lunissolar — em muitas descrições, o encerramento do ciclo aberto no 春节. Lanternas e passeios noturnos aparecem com frequência; alimentos e ritos locais (incluindo 元宵 / 汤圆 em algumas regiões) não são idênticos em todo o país. Evite absolutizar costumes como se fossem iguais em cada casa e horário.",
    bodyEn:
      "元宵节 falls on the 15th day of the 1st lunisolar month — in many accounts, the close of the cycle opened at 春节. Lanterns and evening strolls appear often; local foods and rites (including 元宵 / 汤圆 in some regions) are not identical nationwide. Avoid treating customs as identical in every household and hour.",
    situationPt: "Alguém menciona lanternas no fim do período do Ano Novo e fala em 元宵节.",
    situationEn: "Someone mentions lanterns at the end of the New Year period and talks about 元宵节.",
    noticePt: "Pode haver lanternas, passeio e conversa sobre o fim do ciclo do 春节. Comidas e costumes locais mudam.",
    noticeEn: "There may be lanterns, an evening outing, and talk about the close of the 春节 cycle. Local foods and customs change.",
    whyPt: "Ligar 元宵节 ao período do 春节 ajuda a ler o calendário lunissolar sem confundir o Festival das Lanternas com o próprio Ano Novo nem com o Dragon Boat.",
    whyEn: "Linking 元宵节 to the 春节 period helps you read the lunisolar calendar without confusing Lantern Festival with New Year itself or with Dragon Boat.",
    practicePt: "Se alguém falar em 元宵节: pergunte se há lanternas ou reunião — sem assumir um único prato ou rito. Trate variação regional como o normal.",
    practiceEn: "If someone mentions 元宵节: ask about lanterns or a gathering — without assuming one dish or rite. Treat regional variation as normal.",
    variabilityPt: "Cidades destacam lanternas públicas; famílias podem só reunir-se em casa. O nome do doce e o roteiro da noite não são nacionais únicos.",
    variabilityEn: "Cities may highlight public lanterns; families may only gather at home. The sweet's name and the evening script are not a single national form.",
    relatedLessonIds: ["l24", "l25"],
    relatedChunkRefs: ["zheshiwodejia", "mingtianjian"],
    relatedHanziRefs: ["jia"],
    sources: [SRC.britannicaLantern, SRC.chinaCultureLantern],
    miniCheck: {
      promptPt: "元宵节 aparece na conversa. Qual leitura é mais segura?",
      promptEn: "元宵节 comes up in conversation. Which reading is safer?",
      options: [
        {
          id: "a",
          labelPt: "É o mesmo dia que o 春节, com o mesmo ritual em toda casa.",
          labelEn: "It is the same day as 春节, with the same ritual in every home.",
        },
        {
          id: "b",
          labelPt: "Costuma fechar o período do Ano Novo lunissolar; lanternas e costumes locais variam.",
          labelEn: "It usually closes the lunisolar New Year period; lanterns and local customs vary.",
        },
        {
          id: "c",
          labelPt: "É o Festival do Barco-Dragão.",
          labelEn: "It is the Dragon Boat Festival.",
        },
      ],
      correctOptionId: "b",
      explanationPt: "元宵节 marca o 15º dia do 1º mês lunissolar, ligado ao ciclo do 春节 — não é 端午节 nem um ritual único nacional.",
      explanationEn: "元宵节 marks the 15th day of the 1st lunisolar month, tied to the 春节 cycle — not 端午节 and not one national ritual.",
    },
  },
  {
    id: "chinese-dragon",
    order: 22,
    category: "festivals",
    kind: "symbol",
    scope: "broad",
    estimatedMinutes: 4,
    titlePt: "O dragão chinês",
    titleEn: "The Chinese dragon",
    summaryPt: "龙 (lóng) é um símbolo cultural recorrente na iconografia chinesa — distinto de muitas imagens europeias de dragão como monstro a ser vencido.",
    summaryEn: "龙 (lóng) is a recurring cultural symbol in Chinese iconography — distinct from many European images of the dragon as a monster to be slain.",
    bodyPt:
      "Em contextos culturais chineses, 龙 aparece em arte, celebrações e linguagem simbólica. Fontes enciclopédicas e museais descrevem associações com poder, auspício e autoridade em contextos históricos e cerimoniais — sempre com escopo: não diga que o dragão 'sempre' significa a mesma coisa para todas as pessoas. A dança do dragão em festas é um uso celebratório possível. Não confunda esta lição com 端午节 (Festival do Barco-Dragão): podem se relacionar visualmente, mas não são o mesmo tema.",
    bodyEn:
      "In Chinese cultural contexts, 龙 appears in art, celebrations, and symbolic language. Encyclopaedic and museum sources describe associations with power, auspiciousness, and authority in historical and ceremonial settings — always with scope: do not say the dragon 'always' means the same thing for everyone. Dragon dance at festivals is one possible celebratory use. Do not confuse this lesson with 端午节 (Dragon Boat Festival): they may relate visually, but they are not the same topic.",
    situationPt: "Você vê um dragão em decoração de festa ou em arte e alguém diz 龙.",
    situationEn: "You see a dragon in festival decoration or art and someone says 龙.",
    noticePt: "Pode ser emblema celebratório, motivo artístico ou referência simbólica — o tom muda com o contexto.",
    noticeEn: "It may be a celebratory emblem, an artistic motif, or a symbolic reference — the tone shifts with context.",
    whyPt: "Separar 龙 de estereótipos europeus de 'monstro' evita leitura errada de arte e festa. Separar de 端午节 evita misturar símbolo e feriado.",
    whyEn: "Separating 龙 from European 'monster' stereotypes avoids misreading art and festivals. Separating it from 端午节 avoids mixing symbol and holiday.",
    practicePt: "Se apontarem um 龙: reconheça o símbolo cultural sem afirmar um significado único universal. Se a conversa for sobre barcos e 粽子, isso é outra lição (端午节).",
    practiceEn: "If someone points to a 龙: recognise the cultural symbol without asserting one universal meaning. If the talk is about boats and 粽子, that is another lesson (端午节).",
    variabilityPt: "Estilos regionais de dança, arte imperial versus uso popular e leitura contemporânea mudam o peso do símbolo.",
    variabilityEn: "Regional dance styles, imperial versus popular art, and contemporary readings all change the symbol's weight.",
    relatedLessonIds: ["l26", "p6-natureza"],
    relatedChunkRefs: ["xiexie"],
    relatedCultureItemIds: ["dragon-boat"],
    sources: [SRC.britannicaDragon, SRC.metDragonRobes],
    miniCheck: {
      promptPt: "Alguém aponta um 龙 em decoração de festa. Qual leitura é mais segura?",
      promptEn: "Someone points to a 龙 in festival decoration. Which reading is safer?",
      options: [
        {
          id: "a",
          labelPt: "É sempre um monstro malvado que deve ser destruído, como em muitas histórias europeias.",
          labelEn: "It is always an evil monster that must be destroyed, as in many European stories.",
        },
        {
          id: "b",
          labelPt: "É um símbolo cultural recorrente; significados dependem do contexto e não são universais.",
          labelEn: "It is a recurring cultural symbol; meanings depend on context and are not universal.",
        },
        {
          id: "c",
          labelPt: "É automaticamente o Festival do Barco-Dragão.",
          labelEn: "It is automatically the Dragon Boat Festival.",
        },
      ],
      correctOptionId: "b",
      explanationPt: "龙 é símbolo com leituras contextuais. Não é monstro europeu padrão nem sinônimo automático de 端午节.",
      explanationEn: "龙 is a symbol with contextual readings. It is not the default European monster, nor an automatic synonym for 端午节.",
    },
  },
  {
    id: "sun-wukong",
    order: 23,
    category: "festivals",
    kind: "literature",
    scope: "historical",
    estimatedMinutes: 4,
    titlePt: "Sun Wukong",
    titleEn: "Sun Wukong",
    summaryPt: "孙悟空 (Sūn Wùkōng), o Rei Macaco, é figura da tradição literária chinesa — não uma biografia de general histórico.",
    summaryEn: "孙悟空 (Sūn Wùkōng), the Monkey King, is a figure in Chinese literary tradition — not a biography of a historical general.",
    bodyPt:
      "Na narrativa e na tradição cultural em torno de 西游记 (Xīyóujì), 孙悟空 é o Rei Macaco: figura literária reconhecível por traços como a agilidade, o bastão e a rebeldia dentro da obra. Fontes enciclopédicas o tratam como personagem — não como figura documentada de arquivo militar. Esta lição apresenta o personagem; a obra completa tem a sua própria entrada.",
    bodyEn:
      "In the narrative and cultural tradition around 西游记 (Xīyóujì), 孙悟空 is the Monkey King: a literary figure recognisable for traits such as agility, the staff, and rebelliousness within the work. Encyclopaedic sources treat him as a character — not as a documented military-archive figure. This lesson introduces the character; the full work has its own entry.",
    situationPt: "Alguém menciona o Rei Macaco ou 孙悟空 em conversa sobre histórias chinesas.",
    situationEn: "Someone mentions the Monkey King or 孙悟空 in a conversation about Chinese stories.",
    noticePt: "É referência a personagem literário/cultural. O tom é de narrativa, não de biografia de arquivo.",
    noticeEn: "It is a reference to a literary/cultural character. The tone is narrative, not archival biography.",
    whyPt: "Separar literatura de história evita transformar 孙悟空 em 'general real'. Isso é exatamente o erro que o tipo `literature` existe para impedir.",
    whyEn: "Separating literature from history stops 孙悟空 from becoming a 'real general'. That is exactly the error the `literature` kind exists to block.",
    practicePt: "Se ouvirem 孙悟空: trate como personagem da tradição literária ligado a 西游记. Não recite uma biografia histórica inventada.",
    practiceEn: "If you hear 孙悟空: treat him as a literary-tradition character linked to 西游记. Do not recite an invented historical biography.",
    variabilityPt: "Adaptações modernas mudam ênfase; a base literária clássica permanece o eixo desta lição.",
    variabilityEn: "Modern adaptations shift emphasis; the classical literary base remains this lesson's axis.",
    relatedLessonIds: ["l24", "l9"],
    relatedChunkRefs: ["xiexie"],
    relatedCultureItemIds: ["journey-to-the-west", "china-history-timeline"],
    sources: [SRC.britannicaMonkeyKing, SRC.britannicaXiyouji],
    miniCheck: {
      promptPt: "Sun Wukong é apresentado aqui como:",
      promptEn: "Sun Wukong is presented here as:",
      options: [
        { id: "a", labelPt: "um imperador documentado", labelEn: "a documented emperor" },
        { id: "b", labelPt: "leitura literária, não histórica", labelEn: "a literary, not historical, reading" },
        { id: "c", labelPt: "um feriado nacional", labelEn: "a national holiday" },
      ],
      correctOptionId: "b",
      explanationPt: "孙悟空 é personagem literário/cultural ligado a 西游记 — não biografia de arquivo nem feriado.",
      explanationEn: "孙悟空 is a literary/cultural character linked to 西游记 — not an archival biography or a holiday.",
    },
  },
  {
    id: "journey-to-the-west",
    order: 24,
    category: "festivals",
    kind: "literature",
    scope: "historical",
    estimatedMinutes: 4,
    titlePt: "Jornada ao Oeste",
    titleEn: "Journey to the West",
    summaryPt: "西游记 (Xīyóujì) é romance clássico chinês; 孙悟空 é um de seus personagens centrais na narrativa.",
    summaryEn: "西游记 (Xīyóujì) is a Chinese classical novel; 孙悟空 is one of its central characters in the narrative.",
    bodyPt:
      "西游记 é um romance da tradição literária chinesa. Na obra, um monge viaja para o oeste com discípulos — entre eles 孙悟空 — em uma narrativa de provações e transformação. Esta lição apresenta o título, o contexto literário e a relação com o Rei Macaco; não é uma enciclopédia completa de todos os episódios. Personagens principais podem ser nomeados para orientação, sempre como figuras da narrativa.",
    bodyEn:
      "西游记 is a novel in Chinese literary tradition. In the work, a monk travels west with disciples — among them 孙悟空 — in a narrative of trials and transformation. This lesson introduces the title, literary context, and the link to the Monkey King; it is not a full encyclopaedia of every episode. Main characters may be named for orientation, always as figures in the narrative.",
    situationPt: "Alguém cita 西游记 ou 'Journey to the West' ao falar de clássicos chineses.",
    situationEn: "Someone cites 西游记 or 'Journey to the West' when talking about Chinese classics.",
    noticePt: "É título de obra literária. Os personagens vivem dentro da narrativa — não como fichas de arquivo histórico.",
    noticeEn: "It is a literary title. The characters live inside the narrative — not as historical-archive files.",
    whyPt: "Reconhecer 西游记 como literatura clássica abre a porta para 孙悟空 e outras figuras sem misturá-las com história documental.",
    whyEn: "Recognising 西游记 as classical literature opens the door to 孙悟空 and other figures without mixing them into documentary history.",
    practicePt: "Se ouvirem 西游记: trate como obra literária. Relacione 孙悟空 à narrativa sem transformar a conversa em biografia histórica.",
    practiceEn: "If you hear 西游记: treat it as a literary work. Link 孙悟空 to the narrative without turning the talk into historical biography.",
    variabilityPt: "Traduções, adaptações e ênfases escolares variam; o status de clássico literário é o eixo estável aqui.",
    variabilityEn: "Translations, adaptations, and school emphases vary; classical literary status is the stable axis here.",
    relatedLessonIds: ["l24", "l9"],
    relatedChunkRefs: ["xiexie"],
    relatedCultureItemIds: ["sun-wukong"],
    sources: [SRC.britannicaXiyouji, SRC.chinaOrgXiyouji],
    miniCheck: {
      promptPt: "西游记, nesta lição, é melhor descrito como:",
      promptEn: "西游记, in this lesson, is best described as:",
      options: [
        { id: "a", labelPt: "um diário de viagem militar do século XX", labelEn: "a twentieth-century military travel diary" },
        { id: "b", labelPt: "clássico da literatura chinesa", labelEn: "a Chinese literary classic" },
        { id: "c", labelPt: "um feriado do calendário estatal", labelEn: "a holiday on the state calendar" },
      ],
      correctOptionId: "b",
      explanationPt: "西游记 é romance clássico. Personagens como 孙悟空 pertencem à narrativa da obra.",
      explanationEn: "西游记 is a classical novel. Characters such as 孙悟空 belong to the work's narrative.",
    },
  },
  {
    id: "china-history-timeline",
    order: 25,
    category: "school_work",
    kind: "history",
    scope: "historical",
    estimatedMinutes: 5,
    titlePt: "Uma visão da história chinesa",
    titleEn: "A timeline of Chinese history",
    summaryPt: "Um mapa mental introdutório dos grandes períodos — não um curso completo de história chinesa.",
    summaryEn: "An introductory mental map of major periods — not a full course in Chinese history.",
    bodyPt:
      "Esta visão introdutória organiza grandes blocos: China antiga → Qin → Han → Tang → Song → Ming → Qing → China moderna. O objetivo é orientação cronológica e continuidade, não decorar dezenas de datas. Museus e linhas do tempo acadêmicas usam marcas aproximadas; dinastias intermediárias e rupturas existem e ficam fora deste primeiro mapa.",
    bodyEn:
      "This introductory overview organises major blocks: ancient China → Qin → Han → Tang → Song → Ming → Qing → modern China. The goal is chronological orientation and continuity, not memorising dozens of dates. Museums and academic timelines use approximate markers; intermediate dynasties and ruptures exist and sit outside this first map.",
    situationPt: "Você quer um primeiro mapa antes de aprofundar uma dinastia.",
    situationEn: "You want a first map before going deeper into one dynasty.",
    noticePt: "É introdução. Não diga que esta lista é 'toda a história chinesa'.",
    noticeEn: "It is an introduction. Do not treat this list as 'all of Chinese history'.",
    whyPt: "Sem um mapa mental, nomes como Qin e Tang ficam soltos. Com o mapa, cada lesson histórica ganha lugar.",
    whyEn: "Without a mental map, names like Qin and Tang float free. With the map, each history lesson has a place.",
    practicePt: "Memorize a ordem dos blocos principais. Depois, abra Qin, Han, Tang, Song e Ming/Qing para detalhe.",
    practiceEn: "Remember the order of the main blocks. Then open Qin, Han, Tang, Song, and Ming/Qing for detail.",
    variabilityPt: "Linhas do tempo de museus e enciclopédias variam em datas limítrofes; a sequência Qin→Han→Tang→Song→Ming→Qing é o eixo estável aqui.",
    variabilityEn: "Museum and encyclopaedia timelines vary on boundary dates; the Qin→Han→Tang→Song→Ming→Qing sequence is the stable axis here.",
    relatedLessonIds: ["l9", "l24"],
    relatedCultureItemIds: ["qin-unification", "han-dynasty", "tang-dynasty", "song-dynasty", "ming-qing"],
    sources: [SRC.columbiaDynastyTimeline, SRC.smithsonianChinaTimeline],
    miniCheck: {
      promptPt: "Nesta visão introdutória, qual ordem cronológica está correta?",
      promptEn: "In this introductory overview, which chronological order is correct?",
      options: [
        { id: "a", labelPt: "Tang → Han → Qin", labelEn: "Tang → Han → Qin" },
        { id: "b", labelPt: "Qin → Han → Tang → Song", labelEn: "Qin → Han → Tang → Song" },
        { id: "c", labelPt: "Song → Qin → Ming", labelEn: "Song → Qin → Ming" },
      ],
      correctOptionId: "b",
      explanationPt: "O mapa introdutório segue Qin, depois Han, depois Tang, depois Song — antes de Ming/Qing.",
      explanationEn: "The introductory map follows Qin, then Han, then Tang, then Song — before Ming/Qing.",
    },
  },
  {
    id: "qin-unification",
    order: 26,
    category: "school_work",
    kind: "history",
    scope: "historical",
    estimatedMinutes: 4,
    titlePt: "Qin: unificação imperial",
    titleEn: "Qin: imperial unification",
    summaryPt: "秦 (Qín) marca o primeiro império unificado sob Qin Shi Huang — com padronizações e o mausoléu dos Guerreiros de Terracota.",
    summaryEn: "秦 (Qín) marks the first unified empire under Qin Shi Huang — with standardisations and the Terracotta Army mausoleum.",
    bodyPt:
      "No fim do século III a.C., o estado Qin unificou territórios rivais sob Qin Shi Huang. Fontes museológicas e enciclopédicas descrevem padronizações (escrita, pesos, medidas) e um sistema imperial centralizado. O mausoléu do primeiro imperador Qin, com o Exército de Terracota, é Patrimônio da UNESCO. Sobre a Grande Muralha: há conexões com obras de defesa mais antigas e projetos Qin, mas a muralha que visitantes veem hoje é em grande parte construção/reconstrução Ming — não diga que Qin 'construiu toda a Grande Muralha atual'.",
    bodyEn:
      "In the late 3rd century BCE, the Qin state unified rival territories under Qin Shi Huang. Museum and encyclopaedic sources describe standardisations (script, weights, measures) and a centralised imperial system. The First Qin Emperor's mausoleum, with the Terracotta Army, is a UNESCO World Heritage site. On the Great Wall: there are links to earlier defence works and Qin projects, but the wall visitors see today is largely Ming construction/rebuild — do not say Qin 'built all of today's Great Wall'.",
    situationPt: "Alguém menciona Qin Shi Huang ou os Guerreiros de Terracota.",
    situationEn: "Someone mentions Qin Shi Huang or the Terracotta Army.",
    noticePt: "É história documentada de unificação imperial curta e intensa — não uma lenda de origem mítica.",
    noticeEn: "It is documented history of a short, intense imperial unification — not a mythical origin legend.",
    whyPt: "Qin dá o primeiro marco imperial do mapa. Sem ele, Han e as dinastias seguintes ficam sem ponto de partida.",
    whyEn: "Qin gives the map its first imperial marker. Without it, Han and later dynasties lack a starting point.",
    practicePt: "Associe 秦 a unificação e padronização. Separe Terracotta Army (Qin) de 'muralha atual = só Qin'.",
    practiceEn: "Link 秦 to unification and standardisation. Separate Terracotta Army (Qin) from 'today's wall = Qin only'.",
    relatedLessonIds: ["l9", "l19"],
    relatedCultureItemIds: ["china-history-timeline", "ming-qing"],
    sources: [SRC.britannicaQin, SRC.metQin, SRC.unescoQinMausoleum, SRC.unescoGreatWall],
    miniCheck: {
      promptPt: "Sobre a Grande Muralha e Qin, qual leitura é mais segura?",
      promptEn: "About the Great Wall and Qin, which reading is safer?",
      options: [
        { id: "a", labelPt: "Qin construiu toda a Grande Muralha que os turistas veem hoje.", labelEn: "Qin built all of the Great Wall tourists see today." },
        { id: "b", labelPt: "Há conexões com defesas antigas e Qin, mas muita da muralha visitável é Ming.", labelEn: "There are links to earlier defences and Qin, but much of the visitable wall is Ming." },
        { id: "c", labelPt: "A muralha só existe na literatura, não na história.", labelEn: "The wall exists only in literature, not in history." },
      ],
      correctOptionId: "b",
      explanationPt: "UNESCO e fontes museológicas separam obras antigas/Qin da predominância Ming na muralha visitável.",
      explanationEn: "UNESCO and museum sources separate earlier/Qin works from Ming predominance in the visitable wall.",
    },
  },
  {
    id: "han-dynasty",
    order: 27,
    category: "school_work",
    kind: "history",
    scope: "historical",
    estimatedMinutes: 4,
    titlePt: "Han: consolidação e 汉字",
    titleEn: "Han: consolidation and 汉字",
    summaryPt: "汉 (Hàn) consolida o império após Qin e ajuda a explicar por que 汉 aparece em termos como 汉字.",
    summaryEn: "汉 (Hàn) consolidates the empire after Qin and helps explain why 汉 appears in terms such as 汉字.",
    bodyPt:
      "A dinastia Han (aprox. 206 a.C.–220 d.C.) sucede Qin e é descrita por fontes enciclopédicas e museológicas como período de consolidação imperial, expansão e intercâmbios de longa distância — rotas depois associadas à ideia de Silk Road. O etônimo 汉 e a associação cultural com a escrita (汉字) são vínculos históricos/culturais frequentes: a escrita chinesa é bem mais antiga, mas a era Han é um marco de consolidação e identidade. Isso é contexto cultural — não cria automaticamente novo domínio lexical no app.",
    bodyEn:
      "The Han dynasty (approx. 206 BCE–220 CE) follows Qin and is described by encyclopaedic and museum sources as a period of imperial consolidation, expansion, and long-distance exchange — routes later associated with the idea of the Silk Road. The ethnonym 汉 and the cultural link to writing (汉字) are frequent historical/cultural associations: Chinese writing is much older, but the Han era is a consolidation and identity landmark. That is cultural context — it does not automatically create new lexical mastery in the app.",
    situationPt: "Você vê 汉字 e quer saber por que há 汉 no nome.",
    situationEn: "You see 汉字 and wonder why 汉 is in the name.",
    noticePt: "Han vem depois de Qin no mapa. Silk Road é rótulo moderno para redes de troca — use com contexto.",
    noticeEn: "Han comes after Qin on the map. Silk Road is a modern label for exchange networks — use it with context.",
    whyPt: "Han liga história imperial a um termo que o aluno encontra no aprendizado de escrita.",
    whyEn: "Han links imperial history to a term learners meet in writing study.",
    practicePt: "Ordene: Qin antes de Han. Leia 汉字 como vínculo cultural com Hàn, não como invenção súbita da escrita.",
    practiceEn: "Order: Qin before Han. Read 汉字 as a cultural link to Hàn, not as a sudden invention of writing.",
    relatedLessonIds: ["l9", "l19"],
    relatedCultureItemIds: ["china-history-timeline", "qin-unification"],
    sources: [SRC.britannicaHan, SRC.metHan, SRC.britannicaSilkRoad],
    miniCheck: {
      promptPt: "Por que 汉 aparece em 汉字, nesta lição?",
      promptEn: "Why does 汉 appear in 汉字 in this lesson?",
      options: [
        { id: "a", labelPt: "Porque a escrita chinesa nasceu só em 220 d.C.", labelEn: "Because Chinese writing only began in 220 CE." },
        { id: "b", labelPt: "Por um vínculo cultural/histórico com a era Han — a escrita é bem mais antiga.", labelEn: "Because of a cultural/historical link to the Han era — writing is much older." },
        { id: "c", labelPt: "Porque Han é um feriado do calendário estatal.", labelEn: "Because Han is a state-calendar holiday." },
      ],
      correctOptionId: "b",
      explanationPt: "汉字 carrega associação com Hàn; a escrita precede a dinastia. É contexto cultural, não trivia de ano exato.",
      explanationEn: "汉字 carries an association with Hàn; writing predates the dynasty. It is cultural context, not exact-year trivia.",
    },
  },
  {
    id: "tang-dynasty",
    order: 28,
    category: "school_work",
    kind: "history",
    scope: "historical",
    estimatedMinutes: 4,
    titlePt: "Tang: Chang'an e intercâmbio",
    titleEn: "Tang: Chang'an and exchange",
    summaryPt: "唐 (Táng) é um período imperial importante associado a Chang'an, poesia e intercâmbio cultural — sem romantizar como 'a melhor dinastia'.",
    summaryEn: "唐 (Táng) is a major imperial period linked to Chang'an, poetry, and cultural exchange — without romanticising it as 'the best dynasty'.",
    bodyPt:
      "A dinastia Tang (618–907) tem capital em Chang'an (hoje associada a Xi'an). Fontes museológicas descrevem uma capital cosmopolita e intercâmbio cultural de longa distância. A caracterização de 'idade de ouro' aparece em algumas narrativas históricas como interpretação, não como fato absoluto — evite 'foi objetivamente a melhor dinastia'. Poesia e artes são marcas culturais frequentes deste período nas descrições institucionais.",
    bodyEn:
      "The Tang dynasty (618–907) has its capital at Chang'an (today linked with Xi'an). Museum sources describe a cosmopolitan capital and long-distance cultural exchange. The 'golden age' characterisation appears in some historical narratives as interpretation, not absolute fact — avoid 'it was objectively the best dynasty'. Poetry and the arts are frequent cultural markers of this period in institutional descriptions.",
    situationPt: "Alguém fala em Tang ou na antiga Chang'an.",
    situationEn: "Someone talks about Tang or ancient Chang'an.",
    noticePt: "Tang vem depois de Han no mapa introdutório. 'Golden age' = caracterização, não veredicto absoluto.",
    noticeEn: "Tang comes after Han on the introductory map. 'Golden age' = characterisation, not an absolute verdict.",
    whyPt: "Tang ancora cosmopolitismo e literatura no mapa mental — útil para ler arte e poesia com contexto.",
    whyEn: "Tang anchors cosmopolitanism and literature on the mental map — useful for reading art and poetry with context.",
    practicePt: "Ordene: Han antes de Tang. Se ouvir 'idade de ouro', trate como rótulo histórico, não como ranking objetivo.",
    practiceEn: "Order: Han before Tang. If you hear 'golden age', treat it as a historical label, not an objective ranking.",
    relatedLessonIds: ["l9", "l24"],
    relatedCultureItemIds: ["china-history-timeline", "han-dynasty", "song-dynasty"],
    sources: [SRC.britannicaTang, SRC.metTang, SRC.britannicaChangan],
    miniCheck: {
      promptPt: "Qual veio antes no mapa introdutório?",
      promptEn: "Which came earlier on the introductory map?",
      options: [
        { id: "a", labelPt: "Tang antes de Han", labelEn: "Tang before Han" },
        { id: "b", labelPt: "Han antes de Tang", labelEn: "Han before Tang" },
        { id: "c", labelPt: "Tang e Han no mesmo século", labelEn: "Tang and Han in the same century" },
      ],
      correctOptionId: "b",
      explanationPt: "No mapa: Qin → Han → Tang. Tang não precede Han.",
      explanationEn: "On the map: Qin → Han → Tang. Tang does not precede Han.",
    },
  },
  {
    id: "song-dynasty",
    order: 29,
    category: "school_work",
    kind: "history",
    scope: "historical",
    estimatedMinutes: 4,
    titlePt: "Song: cidades e inovação gradual",
    titleEn: "Song: cities and gradual innovation",
    summaryPt: "宋 (Sòng) é associado a urbanização, comércio e tecnologias que se desenvolveram ao longo do tempo — não 'inventou tudo num dia'.",
    summaryEn: "宋 (Sòng) is linked to urbanisation, commerce, and technologies that developed over time — not 'invented everything in a day'.",
    bodyPt:
      "A dinastia Song (960–1279; Norte e Sul) aparece em fontes museológicas e enciclopédicas ligada a crescimento urbano, comércio e cultura. Impressão, bússola náutica e armas de pólvora são frequentemente discutidas neste horizonte histórico, mas como processos graduais — não como invenção única num único dia ou 'Song inventou tudo'. O período também é marcado por produção intelectual e artística nas descrições institucionais.",
    bodyEn:
      "The Song dynasty (960–1279; Northern and Southern) appears in museum and encyclopaedic sources linked to urban growth, commerce, and culture. Printing, the navigational compass, and gunpowder weapons are often discussed in this historical horizon, but as gradual processes — not as a single-day invention or 'Song invented everything'. The period is also marked by intellectual and artistic production in institutional descriptions.",
    situationPt: "Alguém menciona Song e inovações chinesas antigas.",
    situationEn: "Someone mentions Song and older Chinese innovations.",
    noticePt: "Song vem depois de Tang. Evite absolutizar invenções como eventos de um dia.",
    noticeEn: "Song comes after Tang. Avoid treating inventions as one-day events.",
    whyPt: "Song completa o bloco medieval do mapa com urbanização e tecnologia em leitura cuidadosa.",
    whyEn: "Song completes the map's medieval block with urbanisation and technology in a careful reading.",
    practicePt: "Ordene: Tang antes de Song. Se falarem em tipografia ou bússola, prefira 'desenvolvimento gradual' a 'inventou tudo'.",
    practiceEn: "Order: Tang before Song. If print or the compass come up, prefer 'gradual development' to 'invented everything'.",
    relatedLessonIds: ["l9", "l27"],
    relatedCultureItemIds: ["china-history-timeline", "tang-dynasty"],
    sources: [SRC.britannicaSong, SRC.metSong, SRC.columbiaDynastyTimeline],
    miniCheck: {
      promptPt: "Sobre impressão, bússola e pólvora na era Song, qual leitura é mais segura?",
      promptEn: "About printing, the compass, and gunpowder in the Song era, which reading is safer?",
      options: [
        { id: "a", labelPt: "Song inventou tudo isso num único dia.", labelEn: "Song invented all of that in a single day." },
        { id: "b", labelPt: "São processos graduais frequentemente discutidos neste horizonte histórico.", labelEn: "They are gradual processes often discussed in this historical horizon." },
        { id: "c", labelPt: "Nada disso existiu antes de 1900.", labelEn: "None of that existed before 1900." },
      ],
      correctOptionId: "b",
      explanationPt: "Fontes sérias tratam essas tecnologias como desenvolvimento ao longo do tempo, não como milagre de um dia.",
      explanationEn: "Serious sources treat these technologies as development over time, not as a one-day miracle.",
    },
  },
  {
    id: "ming-qing",
    order: 30,
    category: "school_work",
    kind: "history",
    scope: "historical",
    estimatedMinutes: 5,
    titlePt: "Ming e Qing: império tardio",
    titleEn: "Ming and Qing: late empire",
    summaryPt: "明 (Míng) e 清 (Qīng) formam a China imperial tardia: Forbidden City, muralha Ming, última dinastia e fim do sistema imperial em 1911/12.",
    summaryEn: "明 (Míng) and 清 (Qīng) form late imperial China: the Forbidden City, the Ming wall, the last dynasty, and the end of the imperial system in 1911/12.",
    bodyPt:
      "Ming (1368–1644) e Qing (1644–1911/12) cobrem a China imperial tardia neste mapa curto. Ming: palácios imperiais (Forbidden City — UNESCO), grande parte da Grande Muralha visitável, e expedições marítimas associadas a Zheng He em narrativas históricas. Qing: última dinastia imperial, império diverso e expandido; a Revolução de 1911–1912 marca o fim do sistema imperial (abdicação em 1912). Esta lesson não entra em Century of Humiliation, Taiwan, Revolução Cultural ou política contemporânea — esses temas exigem outra política editorial.",
    bodyEn:
      "Ming (1368–1644) and Qing (1644–1911/12) cover late imperial China on this short map. Ming: imperial palaces (Forbidden City — UNESCO), much of the visitable Great Wall, and maritime expeditions associated with Zheng He in historical narratives. Qing: last imperial dynasty, a diverse expanded empire; the 1911–1912 Revolution marks the end of the imperial system (abdication in 1912). This lesson does not enter the Century of Humiliation, Taiwan, the Cultural Revolution, or contemporary politics — those topics need another editorial policy.",
    situationPt: "Você visita (ou lê sobre) a Cidade Proibida ou a muralha e quer o período certo.",
    situationEn: "You visit (or read about) the Forbidden City or the wall and want the right period.",
    noticePt: "Ming antes de Qing. Império tardio ≠ história política moderna profunda.",
    noticeEn: "Ming before Qing. Late empire ≠ deep modern political history.",
    whyPt: "Fecha o mapa imperial: do primeiro Qin ao último Qing, com o que o visitante mais encontra hoje.",
    whyEn: "Closes the imperial map: from first Qin to last Qing, with what visitors most often meet today.",
    practicePt: "Associe Forbidden City e muralha visitável sobretudo a Ming; Qing como última dinastia até 1911/12.",
    practiceEn: "Link the Forbidden City and the visitable wall mainly to Ming; Qing as the last dynasty until 1911/12.",
    relatedLessonIds: ["l9", "l24"],
    relatedCultureItemIds: ["china-history-timeline", "qin-unification"],
    sources: [
      SRC.britannicaMing,
      SRC.metMing,
      SRC.unescoImperialPalaces,
      SRC.britannicaQing,
      SRC.britannicaChineseRevolution,
      SRC.unescoGreatWall,
    ],
    miniCheck: {
      promptPt: "Qual período está associado à China imperial tardia neste mapa?",
      promptEn: "Which period is associated with late imperial China on this map?",
      options: [
        { id: "a", labelPt: "Qin e Han", labelEn: "Qin and Han" },
        { id: "b", labelPt: "Ming e Qing", labelEn: "Ming and Qing" },
        { id: "c", labelPt: "Tang e Song apenas", labelEn: "Tang and Song only" },
      ],
      correctOptionId: "b",
      explanationPt: "Ming e Qing cobrem o bloco final do império neste Atlas introdutório.",
      explanationEn: "Ming and Qing cover the final imperial block in this introductory Atlas.",
    },
  },
];

export type CultureLocale = "pt-BR" | "en";

export function getCultureItem(id: string): CultureItem | undefined {
  return CULTURE_ITEMS.find((item) => item.id === id);
}

export function cultureItemsSorted(): CultureItem[] {
  return [...CULTURE_ITEMS].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function cultureItemsForCategory(category: CultureCategory | "all"): CultureItem[] {
  const items = cultureItemsSorted();
  if (category === "all") return items;
  return items.filter((item) => item.category === category);
}

export function localizedCulture(item: CultureItem, locale: CultureLocale) {
  const en = locale === "en";
  return {
    title: en ? item.titleEn : item.titlePt,
    summary: en ? item.summaryEn : item.summaryPt,
    body: en ? item.bodyEn : item.bodyPt,
    situation: en ? item.situationEn : item.situationPt,
    notice: en ? item.noticeEn : item.noticePt,
    why: en ? item.whyEn : item.whyPt,
    practice: en ? item.practiceEn : item.practicePt,
    variability: en ? item.variabilityEn : item.variabilityPt,
    miniPrompt: en ? item.miniCheck.promptEn : item.miniCheck.promptPt,
    miniExplanation: en ? item.miniCheck.explanationEn : item.miniCheck.explanationPt,
  };
}

export function miniOptionLabel(
  option: CultureMiniCheckOption,
  locale: CultureLocale
): string {
  return locale === "en" ? option.labelEn : option.labelPt;
}

export function cultureItemsRelatedToLesson(lessonId: string): CultureItem[] {
  return cultureItemsSorted().filter(
    (item) => item.relatedLessonIds.includes(lessonId)
  );
}

export function cultureItemLinkedFromLesson(lessonId: string, cultureItemId?: string): CultureItem | undefined {
  if (cultureItemId) return getCultureItem(cultureItemId);
  return cultureItemsRelatedToLesson(lessonId)[0];
}

export function cultureProgressByCategory(
  completedIds: readonly string[]
): { category: CultureCategory; done: number; total: number }[] {
  const completed = new Set(completedIds);
  return CULTURE_CATEGORIES.map((category) => {
    const items = CULTURE_ITEMS.filter((item) => item.category === category);
    return {
      category,
      done: items.filter((item) => completed.has(item.id)).length,
      total: items.length,
    };
  });
}
