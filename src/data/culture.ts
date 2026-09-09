/**
 * V4.9.6C — Culture Hub catalog.
 *
 * Culture is contextual, sourced, and bilingual. Items never claim
 * "Chinese people always X" without scope. Summaries only — no copied source text.
 */

export const CULTURE_COMPLETE_XP = 3;

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

export type CultureSource = {
  title: string;
  publisher: string;
  url: string;
  accessedAt: string;
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
  scope: CultureScope;
  variabilityNote?: string;
  relatedLessonIds: string[];
  relatedChunkRefs?: string[];
  relatedHanziRefs?: string[];
  sources: CultureSource[];
  estimatedMinutes: number;
  order: number;
  miniCheck: CultureMiniCheck;
};

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
  },
  govSpringFestival: {
    title: "UNESCO inscribes Spring Festival on intangible cultural heritage list",
    publisher: "The State Council of the People's Republic of China",
    url: "https://english.www.gov.cn/news/202412/05/content_WS6750dd47c6d0868f4e8edab6.html",
    accessedAt: ACCESSED,
  },
  holiday2026: {
    title: "Notice on arrangements for several public holidays in 2026",
    publisher: "General Office of the State Council",
    url: "https://www.gov.cn/zhengce/content/202511/content_7047090.htm",
    accessedAt: ACCESSED,
  },
  chinaOrgTaboos: {
    title: "Good manners, bad luck",
    publisher: "China.org.cn (China International Communications Group)",
    url: "http://www.china.org.cn/travel/beijingguide/2008-05/20/content_15355396.htm",
    accessedAt: ACCESSED,
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
  },
  holidayEn: {
    title: "Notice of General Office of State Council on arrangements for several public holidays in 2026",
    publisher: "Haidian District People's Government (English translation of State Council notice)",
    url: "https://en.bjhd.gov.cn/workinginhaidian/supportingservices/publicholidays/202512/t20251211_4797062.shtml",
    accessedAt: ACCESSED,
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
    relatedLessonIds: ["l26b", "l26", "p7-imersao-mercado"],
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
    relatedLessonIds: ["l26b", "l26"],
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
    sources: [SRC.chinaOrgTaboos, SRC.holiday2026],
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
    scope: "broad",
    estimatedMinutes: 4,
    titlePt: "Festival da Primavera",
    titleEn: "Spring Festival",
    summaryPt: "É o Ano Novo lunar: reunião familiar, deslocamento nacional e práticas sociais reconhecidas pela UNESCO em 2024.",
    summaryEn: "It is the lunar New Year: family reunion, national travel, and social practices UNESCO inscribed in 2024.",
    bodyPt: "O Conselho de Estado trata o feriado como o mais longo do calendário civil. A UNESCO descreve práticas de reunião, bênçãos e eventos comunitários — não um único ritual idêntico em cada casa.",
    bodyEn: "The State Council treats the holiday as the longest in the civil calendar. UNESCO describes reunion, well-wishing, and community events — not one identical ritual in every home.",
    situationPt: "Colegas falam em voltar para casa no 春节.",
    situationEn: "Colleagues talk about going home for 春节.",
    noticePt: "Há viagens, reuniões, saudações de ano novo e um calendário lunar. O que cada família come e visita muda.",
    noticeEn: "There is travel, reunion, New Year greetings, and a lunar calendar. What each family eats and visits still changes.",
    whyPt: "A inscrição da UNESCO enfatiza reunião familiar e práticas sociais transmitidas em casa e na escola. Por isso o feriado organiza o ano de tanta gente — sem apagar diferenças regionais.",
    whyEn: "The UNESCO inscription emphasises family reunion and social practices passed on at home and at school. That is why the holiday organises so many people's year — without erasing regional difference.",
    practicePt: "Se alguém viaja: deseja um bom 春节. Não assuma que todos fazem o mesmo prato ou a mesma visita. 家 e nomes de família que você já estudou voltam com força nesse período.",
    practiceEn: "If someone is travelling: wish them a good 春节. Do not assume every household cooks the same dish or visits the same way. 家 and family terms you already study come back strongly in this period.",
    variabilityPt: "Dias oficiais, pratos e se a pessoa fica na cidade natal ou na cidade onde trabalha variam. A reunião é o eixo mais estável, não o menu.",
    variabilityEn: "Official days off, dishes, and whether someone stays in their hometown or work city all vary. Reunion is the more stable axis, not the menu.",
    relatedLessonIds: ["l24", "l25", "p6-rotina-trabalho"],
    relatedChunkRefs: ["zheshiwodejia", "zheshibaba", "mingtianjian"],
    relatedHanziRefs: ["jia"],
    sources: [SRC.govSpringFestival, SRC.holiday2026, SRC.holidayEn],
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
    scope: "broad",
    estimatedMinutes: 3,
    titlePt: "Festival do Meio Outono",
    titleEn: "Mid-Autumn Festival",
    summaryPt: "É feriado oficial no 15º dia do 8º mês lunar. Reunião e lua são o eixo; bolos e costumes locais variam.",
    summaryEn: "It is an official holiday on the 15th day of the 8th lunar month. Reunion and the moon are the axis; cakes and local customs vary.",
    bodyPt: "O Conselho de Estado lista 中秋节 no calendário civil. A lua cheia e a reunião aparecem em descrições institucionais; o que se come e se visita não é único.",
    bodyEn: "The State Council lists 中秋节 on the civil calendar. The full moon and reunion appear in institutional descriptions; what people eat and visit is not unique.",
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
    sources: [SRC.holiday2026, SRC.holidayEn],
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
    sources: [SRC.holiday2026, SRC.holidayEn],
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
