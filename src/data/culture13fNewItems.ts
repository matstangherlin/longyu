/**
 * RC2.3.13F — six new CultureItem catalog entries + short-mission specs
 * + FLAGSHIP_DEEP overlays. Standalone export; wire into culture.ts /
 * cultureMissions.ts / cultureDeepSchema.ts in a later integration step.
 */

import type { CultureItem } from "./culture";
import type { CultureDeepNode } from "./cultureDeepSchema";

const ACCESSED = "2026-10-09";

const SRC = {
  wechatBritannica: {
    title: "WeChat",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/WeChat",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  wechatChinaDaily: {
    title: "WeChat: China's all-in-one app reshaping daily life",
    publisher: "China Daily",
    url: "https://www.chinadaily.com.cn/a/202401/15/WS65a4c8e2a3105f21a507c5e8.html",
    accessedAt: ACCESSED,
    role: "secondary" as const,
  },
  hsrBritannica: {
    title: "High-speed rail",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/technology/high-speed-rail",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  hsrStateCouncil: {
    title: "China's high-speed railway network",
    publisher: "The State Council of the People's Republic of China",
    url: "https://english.www.gov.cn/news/202312/26/content_WS658a5c8fc6d0868f4e8e2f3a.html",
    accessedAt: ACCESSED,
    role: "secondary" as const,
  },
  gaokaoBritannica: {
    title: "Gaokao",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/gaokao",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  gaokaoChinaDaily: {
    title: "National College Entrance Examination (gaokao)",
    publisher: "China Daily",
    url: "https://www.chinadaily.com.cn/china/2016-06/07/content_25628246.htm",
    accessedAt: ACCESSED,
    role: "secondary" as const,
  },
  guanxiBritannica: {
    title: "Guanxi",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/guanxi",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  guanxiSecondary: {
    title: "Guanxi — relationship networks in Chinese social life (secondary explainer)",
    publisher: "Encyclopaedia Britannica (related overview)",
    url: "https://www.britannica.com/topic/guanxi",
    accessedAt: ACCESSED,
    role: "secondary" as const,
  },
  deliveryChinaDaily: {
    title: "Food delivery apps reshape urban dining habits",
    publisher: "China Daily",
    url: "https://www.chinadaily.com.cn/a/202308/21/WS64e2f8a2a31035260b81d3c1.html",
    accessedAt: ACCESSED,
    role: "secondary" as const,
  },
  deliverySecondary: {
    title: "On-demand delivery and urban service platforms in China (secondary explainer)",
    publisher: "China Daily (lifestyle / business coverage)",
    url: "https://www.chinadaily.com.cn/",
    accessedAt: ACCESSED,
    role: "secondary" as const,
  },
  regionalBritannica: {
    title: "Chinese languages",
    publisher: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/topic/Chinese-languages",
    accessedAt: ACCESSED,
    role: "evergreen" as const,
  },
  regionalUnesco: {
    title: "Atlas of the World's Languages in Danger (Chinese languages context)",
    publisher: "UNESCO",
    url: "https://www.unesco.org/languages-atlas/",
    accessedAt: ACCESSED,
    role: "secondary" as const,
  },
};

export const CULTURE_13F_NEW_ITEMS: CultureItem[] = [
  {
    id: "wechat-life",
    order: 31,
    category: "contemporary_china",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 5,
    titlePt: "WeChat além do pagamento",
    titleEn: "WeChat beyond payment",
    summaryPt:
      "Em muitas cidades, WeChat (微信) concentra mensagem, grupos, Moments, Mini Programs e trabalho — não só pagar com QR.",
    summaryEn:
      "In many cities, WeChat (微信) concentrates messaging, groups, Moments, Mini Programs, and work — not only QR payment.",
    bodyPt:
      "WeChat começou como app de mensagem e cresceu para um hub cotidiano: chats individuais e grupos, 朋友圈 (Moments), Mini Programs para serviços, e canais de trabalho ou estudo. Pagamento (微信支付) é uma camada importante, mas não é o único uso. Encyclopaedia Britannica descreve WeChat como plataforma multifuncional; a dose de cada função muda com idade, cidade e se a pessoa também usa outros apps.",
    bodyEn:
      "WeChat began as a messaging app and grew into an everyday hub: one-to-one and group chats, 朋友圈 (Moments), Mini Programs for services, and work or study channels. Payment (微信支付) is an important layer, but not the only use. Encyclopaedia Britannica describes WeChat as a multifunctional platform; how heavily each function is used changes with age, city, and whether someone also uses other apps.",
    situationPt: "Um colega diz: 'Te mando no WeChat' — e não fala em WhatsApp.",
    situationEn: "A colleague says: 'I'll send it on WeChat' — and does not mention WhatsApp.",
    noticePt:
      "Pode haver um grupo da turma ou do time, um Moments com fotos do fim de semana, ou um Mini Program para marcar horário. O QR de pagamento é só uma tela entre várias.",
    noticeEn:
      "There may be a class or team group, Moments with weekend photos, or a Mini Program to book a slot. The payment QR is only one screen among several.",
    whyPt:
      "Quando a infraestrutura social e de serviço se concentra num app, 'estar no WeChat' vira coordenação prática — parecido com como WhatsApp organiza grupos no Brasil, mas com mais serviços embutidos.",
    whyEn:
      "When social and service infrastructure concentrates in one app, 'being on WeChat' becomes practical coordination — similar to how WhatsApp organises groups in Brazil, but with more built-in services.",
    practicePt:
      "Separe: mensagem / grupo / Moments / Mini Program / pagamento. Peça o WeChat ID com educação se for trabalho ou estudo. Não publique no Moments o que seria só privado no WhatsApp sem checar o público.",
    practiceEn:
      "Separate: message / group / Moments / Mini Program / payment. Ask for a WeChat ID politely for work or study. Do not post to Moments what would be private on WhatsApp without checking the audience.",
    variabilityPt:
      "Nem todo mundo usa Moments com a mesma frequência. Empresas jovens e escolas internacionais podem misturar WeChat com e-mail ou outros apps. Em zonas rurais ou entre idosos, o padrão muda.",
    variabilityEn:
      "Not everyone uses Moments at the same frequency. Young companies and international schools may mix WeChat with email or other apps. In rural areas or among older people, the pattern changes.",
    relatedLessonIds: ["l27"],
    sources: [SRC.wechatBritannica, SRC.wechatChinaDaily],
    miniCheck: {
      promptPt: "Alguém diz que 'quase tudo' acontece no WeChat. Qual leitura é mais segura?",
      promptEn: "Someone says that 'almost everything' happens on WeChat. Which reading is safer?",
      options: [
        {
          id: "a",
          labelPt: "WeChat serve só para pagar com QR; o resto é exagero.",
          labelEn: "WeChat is only for QR payment; the rest is exaggeration.",
        },
        {
          id: "b",
          labelPt:
            "Em muitos contextos urbanos, mensagem, grupos, Moments e Mini Programs entram no dia a dia — e o peso de cada um varia.",
          labelEn:
            "In many urban contexts, messaging, groups, Moments, and Mini Programs enter daily life — and the weight of each varies.",
        },
        {
          id: "c",
          labelPt: "Todo chinês usa WeChat da mesma forma, o dia inteiro.",
          labelEn: "Every Chinese person uses WeChat the same way, all day.",
        },
      ],
      correctOptionId: "b",
      explanationPt:
        "WeChat é um hub multifuncional documentado; frequência e funções mudam com pessoa, cidade e geração.",
      explanationEn:
        "WeChat is a documented multifunctional hub; frequency and functions change with person, city, and generation.",
    },
  },
  {
    id: "high-speed-rail",
    order: 32,
    category: "transport_public",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 5,
    titlePt: "Trem de alta velocidade: estação, documento e embarque",
    titleEn: "High-speed rail: station, ID, and boarding",
    summaryPt:
      "Viajar de 高铁 (ou G/D trains) envolve bilhete, documento de identidade, filas de segurança e classes — não só 'chegar e sentar'.",
    summaryEn:
      "Travelling by 高铁 (or G/D trains) involves a ticket, identity document, security queues, and classes — not only 'arrive and sit'.",
    bodyPt:
      "A rede de alta velocidade é parte documentada da infraestrutura de transporte na China contemporânea. Na prática do viajante: comprar ou apresentar o bilhete (app ou máquina), passar pela checagem com documento, seguir o número do vagão e do assento, e distinguir classes (por exemplo 二等座 / 一等座). Britannica e materiais oficiais descrevem a expansão da rede; o fluxo na estação muda com cidade e horário de pico.",
    bodyEn:
      "The high-speed network is a documented part of transport infrastructure in contemporary China. In traveller practice: buy or present the ticket (app or machine), pass identity checks, follow carriage and seat numbers, and distinguish classes (for example 二等座 / 一等座). Britannica and official materials describe network expansion; station flow changes with city and rush hour.",
    situationPt: "Você tem um bilhete G para outra cidade e chega à estação 40 minutos antes.",
    situationEn: "You have a G-train ticket to another city and arrive at the station 40 minutes early.",
    noticePt:
      "Há filas de segurança, leitores de bilhete/documento, painéis com 检票 (embarque) e 候车厅. O documento costuma ser pedido — passaporte para muitos estrangeiros.",
    noticeEn:
      "There are security queues, ticket/ID readers, boards for 检票 (boarding) and 候车厅. An ID is often required — a passport for many foreign travellers.",
    whyPt:
      "O sistema combina bilhete nominativo e controle de fluxo em estações grandes. Por isso 'chegar no último minuto' dói mais do que num ônibus intermunicipal brasileiro sem checagem.",
    whyEn:
      "The system combines named tickets and flow control in large stations. That is why 'arriving at the last minute' hurts more than on a Brazilian intercity bus without checks.",
    practicePt:
      "Tenha bilhete + documento prontos. Leia vagão (车厢) e assento. Chegue com margem. Pergunte 高铁站在哪里？ se estiver perdido. Não trate a classe como status moral — é tarifa e conforto.",
    practiceEn:
      "Have ticket + ID ready. Read carriage (车厢) and seat. Arrive with buffer. Ask 高铁站在哪里？ if lost. Do not treat class as moral status — it is fare and comfort.",
    variabilityPt:
      "Estações menores são mais simples. Linhas e apps de bilhete mudam. Em feriados nacionais o volume explode — igual a pontes aéreas no Brasil em datas cheias.",
    variabilityEn:
      "Smaller stations are simpler. Lines and ticketing apps change. On national holidays volume explodes — like busy Brazilian air bridges on peak dates.",
    relatedLessonIds: ["p6-cidade-lugares"],
    sources: [SRC.hsrBritannica, SRC.hsrStateCouncil],
    miniCheck: {
      promptPt: "Você vai pegar um trem G. Qual hábito ajuda mais na estação?",
      promptEn: "You are about to take a G-train. Which habit helps more at the station?",
      options: [
        {
          id: "a",
          labelPt: "Chegar sem documento: o bilhete no celular basta em qualquer caso.",
          labelEn: "Arrive without ID: the phone ticket is always enough.",
        },
        {
          id: "b",
          labelPt:
            "Levar documento, ter margem de tempo para segurança e checagem, e localizar vagão/assento.",
          labelEn:
            "Bring ID, leave time for security and checks, and find carriage/seat.",
        },
        {
          id: "c",
          labelPt: "Entrar em qualquer vagão: assento marcado é só sugestão.",
          labelEn: "Enter any carriage: assigned seats are only a suggestion.",
        },
      ],
      correctOptionId: "b",
      explanationPt:
        "Documento, tempo de fila e assento marcado são o padrão prático em muitas estações de alta velocidade.",
      explanationEn:
        "ID, queue time, and assigned seats are the practical default at many high-speed stations.",
    },
  },
  {
    id: "gaokao-context",
    order: 33,
    category: "school_work",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 5,
    titlePt: "Gaokao: o que o exame significa no calendário",
    titleEn: "Gaokao: what the exam means on the calendar",
    summaryPt:
      "高考 (gaokao) é o exame nacional de ingresso ao ensino superior. Pesa no calendário familiar e escolar — sem ser o único caminho de vida de todas as pessoas.",
    summaryEn:
      "高考 (gaokao) is the national higher-education entrance exam. It weighs on family and school calendars — without being every person's only life path.",
    bodyPt:
      "Britannica e cobertura jornalística descrevem o gaokao como exame de alta consequência para a admissão universitária. Em junho, ruído perto de escolas, horários de trabalho ajustados e conversas sobre 'como foi a prova' são cenas comuns em muitas cidades. Reformas, cotas regionais e vias alternativas (incluindo estudo no exterior) existem — por isso é impreciso tratar o gaokao como destino único ou drama cinematográfico obrigatório.",
    bodyEn:
      "Britannica and news coverage describe the gaokao as a high-stakes exam for university admission. In June, quieter streets near schools, adjusted work hours, and talk about 'how the exam went' are common scenes in many cities. Reforms, regional quotas, and alternative routes (including study abroad) exist — so it is inaccurate to treat the gaokao as a single destiny or mandatory movie drama.",
    situationPt: "Em junho, um colega pede silêncio perto de uma escola e menciona 高考.",
    situationEn: "In June, a colleague asks for quiet near a school and mentions 高考.",
    noticePt:
      "Pode haver cartazes de 'boa prova', trânsito mais cuidadoso e famílias tensas — e também gente cuja vida não gira em torno daquele dia.",
    noticeEn:
      "There may be 'good luck on the exam' signs, more careful traffic, and tense families — and also people whose lives do not revolve around that day.",
    whyPt:
      "Quando um exame concentra vagas disputadas, a sociedade organiza rituais de apoio e silêncio. Isso explica o calendário — não autoriza estereótipos de 'chineses só estudam'.",
    whyEn:
      "When an exam concentrates contested places, society organises support and quiet rituals. That explains the calendar — it does not authorise stereotypes that 'Chinese people only study'.",
    practicePt:
      "Se alguém fala de 高考: reconheça o peso sem dramatizar. Evite perguntas íntimas sobre nota. Em junho, respeite pedidos de silêncio perto de escolas quando forem locais.",
    practiceEn:
      "If someone mentions 高考: acknowledge the weight without dramatising. Avoid intimate score questions. In June, respect local quiet requests near schools.",
    variabilityPt:
      "Províncias e anos mudam regras e datas. Famílias urbanas e rurais não vivem a preparação da mesma forma. Nem todo estudante segue o caminho clássico pós-gaokao.",
    variabilityEn:
      "Provinces and years change rules and dates. Urban and rural families do not live preparation the same way. Not every student follows the classic post-gaokao path.",
    relatedLessonIds: ["l9"],
    sources: [SRC.gaokaoBritannica, SRC.gaokaoChinaDaily],
    miniCheck: {
      promptPt: "Qual leitura do gaokao é mais justa?",
      promptEn: "Which reading of the gaokao is fairer?",
      options: [
        {
          id: "a",
          labelPt: "É só uma prova escolar sem impacto na vida das famílias.",
          labelEn: "It is only a school test with no impact on family life.",
        },
        {
          id: "b",
          labelPt:
            "É um exame de ingresso de alto peso no calendário; o impacto varia e não define toda biografia.",
          labelEn:
            "It is a high-weight entrance exam on the calendar; impact varies and does not define every biography.",
        },
        {
          id: "c",
          labelPt: "Todo jovem chinês tem o mesmo drama e o mesmo resultado.",
          labelEn: "Every Chinese youth has the same drama and the same outcome.",
        },
      ],
      correctOptionId: "b",
      explanationPt:
        "O gaokao é documentado como exame de alta consequência, com variação regional e caminhos alternativos.",
      explanationEn:
        "The gaokao is documented as a high-stakes exam, with regional variation and alternative paths.",
    },
  },
  {
    id: "guanxi-relations",
    order: 34,
    category: "social_etiquette",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 5,
    titlePt: "关系: redes de relação, não atalho corrupto",
    titleEn: "关系: relationship networks, not a corruption shortcut",
    summaryPt:
      "关系 (guānxi) descreve laços de confiança, reciprocidade e obrigação social ao longo do tempo — não é sinônimo automático de corrupção.",
    summaryEn:
      "关系 (guānxi) describes ties of trust, reciprocity, and social obligation over time — it is not an automatic synonym for corruption.",
    bodyPt:
      "Em ciências sociais e em verbetes de referência, guanxi aponta para redes pessoais: quem você conhece, como se mantém o contato, e como favores e informação circulam com memória. Isso pode aparecer em apresentação a um amigo do amigo, em ajuda para achar um quarto, ou em manter contato depois de um favor. Reduzir guanxi a 'jeitinho ilegal' apaga o lado cotidiano de reciprocidade — e também apaga que práticas ilegais existem em qualquer país e não são 'a cultura'.",
    bodyEn:
      "In social science and reference entries, guanxi points to personal networks: whom you know, how contact is kept, and how favours and information circulate with memory. That can appear as an introduction to a friend's friend, help finding a room, or staying in touch after a favour. Reducing guanxi to 'illegal shortcuts' erases everyday reciprocity — and also erases that illegal practices exist in every country and are not 'the culture'.",
    situationPt: "Um conhecido diz: 'Eu te apresento a alguém que pode ajudar com isso.'",
    situationEn: "An acquaintance says: 'I'll introduce you to someone who can help with that.'",
    noticePt:
      "Pode ser uma ponte legítima de confiança. Observe se pedem algo em troca imediato, se o contexto é pessoal ou institucional, e se há regras formais envolvidas.",
    noticeEn:
      "It may be a legitimate bridge of trust. Notice whether something is asked in immediate return, whether the context is personal or institutional, and whether formal rules are involved.",
    whyPt:
      "Sociedades com forte papel de redes pessoais valorizam introdução e reciprocidade. No Brasil há análogos (indicação, 'conhecer alguém') — a palavra guanxi não inventa o fenômeno, ela nomeia um padrão discutido na China.",
    whyEn:
      "Societies with a strong role for personal networks value introductions and reciprocity. Brazil has analogues (referrals, 'knowing someone') — the word guanxi does not invent the phenomenon; it names a pattern discussed in China.",
    practicePt:
      "Agradeça introduções, mantenha contato sem exigir retorno imediato, e não peça atalhos ilegais. Separe: rede de confiança ≠ burlar regra. Se o pedido for institucional (visto, nota, contrato), use o canal oficial.",
    practiceEn:
      "Thank introductions, keep contact without demanding immediate return, and do not ask for illegal shortcuts. Separate: trust network ≠ bypassing rules. If the request is institutional (visa, grade, contract), use the official channel.",
    variabilityPt:
      "Geração, setor e cidade mudam o peso das redes. Ambientes internacionais e procedimentos online reduzem alguns papéis do guanxi — sem apagá-lo da vida social.",
    variabilityEn:
      "Generation, sector, and city change how much networks weigh. International settings and online procedures reduce some guanxi roles — without erasing them from social life.",
    relatedLessonIds: ["l4"],
    sources: [SRC.guanxiBritannica, SRC.guanxiSecondary],
    miniCheck: {
      promptPt: "Qual definição de 关系 evita o estereótipo?",
      promptEn: "Which definition of 关系 avoids the stereotype?",
      options: [
        {
          id: "a",
          labelPt: "Guanxi significa sempre suborno e fila preferencial ilegal.",
          labelEn: "Guanxi always means bribery and illegal queue-jumping.",
        },
        {
          id: "b",
          labelPt:
            "Guanxi aponta para redes de confiança e reciprocidade; abuso ilegal é outra categoria.",
          labelEn:
            "Guanxi points to trust and reciprocity networks; illegal abuse is a different category.",
        },
        {
          id: "c",
          labelPt: "Guanxi só existe em filmes; na vida real ninguém usa indicações.",
          labelEn: "Guanxi only exists in films; in real life nobody uses referrals.",
        },
      ],
      correctOptionId: "b",
      explanationPt:
        "Referências séria tratam guanxi como relação social; não como sinônimo automático de crime.",
      explanationEn:
        "Serious references treat guanxi as social relations; not as an automatic synonym for crime.",
    },
  },
  {
    id: "delivery-life",
    order: 35,
    category: "daily_life",
    kind: "documented_practice",
    scope: "broad",
    estimatedMinutes: 4,
    titlePt: "Delivery urbano: Meituan, Ele.me e o prato na porta",
    titleEn: "Urban delivery: Meituan, Ele.me, and the meal at the door",
    summaryPt:
      "Em muitas cidades, apps de delivery (estilo Meituan / Ele.me) organizam comida, compras e ritmo de almoço — um hábito urbano, não uma lei nacional.",
    summaryEn:
      "In many cities, delivery apps (Meituan / Ele.me style) organise food, errands, and lunch rhythm — an urban habit, not a national law.",
    bodyPt:
      "Cobertura de imprensa e vida cotidiana documentam plataformas de pedido sob demanda: escolher restaurante, pagar no app, receber na portaria ou no escritório. O entregador (外卖) faz parte da paisagem de prédios e campus. Isso convive com comer na rua, cantinas e cozinha em casa — a proporção muda com idade, renda e bairro.",
    bodyEn:
      "Press coverage and daily life document on-demand order platforms: choose a restaurant, pay in-app, receive at the gate or office. Couriers (外卖) are part of the landscape of buildings and campuses. This coexists with street eating, canteens, and home cooking — the mix changes with age, income, and neighbourhood.",
    situationPt: "No escritório, ao meio-dia, vários colegas pedem 外卖 em vez de sair.",
    situationEn: "In the office at noon, several colleagues order 外卖 instead of going out.",
    noticePt:
      "Pode haver armários de entrega, mensagens do app, e alguém buscando o saco na portaria. O telefone vibra com o status do pedido.",
    noticeEn:
      "There may be delivery lockers, app messages, and someone collecting a bag at the gate. The phone buzzes with order status.",
    whyPt:
      "Densidade urbana + plataformas baratas de entrega tornam o almoço no prédio eficiente. Para um brasileiro, lembra iFood — com integração forte a pagamentos móveis e vida de condomínio/campus.",
    whyEn:
      "Urban density + inexpensive delivery platforms make lunch in the building efficient. For a Brazilian, it recalls iFood — with tight integration to mobile pay and building/campus life.",
    practicePt:
      "Aprenda 外卖 e 送到. Confirme endereço e portaria. Tenha pagamento móvel pronto. Não assuma que 'ninguém cozinha' — delivery é uma opção entre várias.",
    practiceEn:
      "Learn 外卖 and 送到. Confirm address and gate. Have mobile pay ready. Do not assume 'nobody cooks' — delivery is one option among several.",
    variabilityPt:
      "Cidades menores e zonas rurais têm cobertura diferente. Horários de pico e clima mudam o tempo de entrega. Nem todo prédio permite o mesmo fluxo de entregadores.",
    variabilityEn:
      "Smaller cities and rural areas have different coverage. Peak hours and weather change delivery time. Not every building allows the same courier flow.",
    relatedLessonIds: ["l27"],
    sources: [SRC.deliveryChinaDaily, SRC.deliverySecondary],
    miniCheck: {
      promptPt: "Colegas pedem 外卖 no almoço. Qual leitura ajuda?",
      promptEn: "Colleagues order 外卖 at lunch. Which reading helps?",
      options: [
        {
          id: "a",
          labelPt: "Delivery substituiu toda a comida caseira na China.",
          labelEn: "Delivery replaced all home cooking in China.",
        },
        {
          id: "b",
          labelPt:
            "Em muitos contextos urbanos, apps de entrega são um hábito comum de almoço — e coexistêm com outras formas de comer.",
          labelEn:
            "In many urban contexts, delivery apps are a common lunch habit — and coexist with other ways of eating.",
        },
        {
          id: "c",
          labelPt: "Pedir delivery é falta de educação à mesa.",
          labelEn: "Ordering delivery is poor table manners.",
        },
      ],
      correctOptionId: "b",
      explanationPt:
        "Delivery é infraestrutura urbana documentada, não uma regra moral nem um substituto total da cozinha.",
      explanationEn:
        "Delivery is documented urban infrastructure, not a moral rule or a total substitute for cooking.",
    },
  },
  {
    id: "regional-china",
    order: 36,
    category: "contemporary_china",
    kind: "documented_practice",
    scope: "regional",
    estimatedMinutes: 5,
    titlePt: "China regional: norte/sul, línguas e costumes",
    titleEn: "Regional China: north/south, languages, and customs",
    summaryPt:
      "Hábitat, comida, clima e língua mudam muito entre regiões. Cantonês não é 'mandarim com sotaque' — e o norte não copia o sul.",
    summaryEn:
      "Habitat, food, climate, and language change a lot across regions. Cantonese is not 'Mandarin with an accent' — and the north does not copy the south.",
    bodyPt:
      "Britannica descreve as línguas chinesas como uma família com variedades distintas (por exemplo mandarim, cantonês/粤语, e outras). Clima e história agrícola alimentam contrastes conhecidos — trigo e pratos mais 'ao norte', arroz e sabores diferentes ao sul — sempre com exceções locais. Tratar 'a China' como um único costume de mesa ou um único sotaque apaga essa geografia.",
    bodyEn:
      "Britannica describes Chinese languages as a family with distinct varieties (for example Mandarin, Cantonese/粤语, and others). Climate and agricultural history feed familiar contrasts — wheat and more 'northern' dishes, rice and different flavours in the south — always with local exceptions. Treating 'China' as one table custom or one accent erases that geography.",
    situationPt: "Você ouve um colega de Guangzhou falar com a família numa língua que você não entende — e ele usa mandarim com você.",
    situationEn: "You hear a colleague from Guangzhou speak with family in a language you do not understand — and he uses Mandarin with you.",
    noticePt:
      "Pode ser cantonês ou outra variedade regional. O mandarim padrão (普通话) é língua franca escolar e nacional; não apaga as línguas locais.",
    noticeEn:
      "It may be Cantonese or another regional variety. Standard Mandarin (普通话) is the school and national lingua franca; it does not erase local languages.",
    whyPt:
      "Países grandes têm regiões. Para um brasileiro, pensar Norte/Nordeste/Sul ajuda: clima, prato e sotaque mudam — e ninguém é 'menos brasileiro' por isso. O mesmo cuidado vale aqui.",
    whyEn:
      "Large countries have regions. For a Brazilian, thinking North/Northeast/South helps: climate, dishes, and accents change — and nobody is 'less Brazilian' for that. The same care applies here.",
    practicePt:
      "Pergunte de onde a pessoa é sem transformar em teste. Não diga que cantonês é 'mandarim errado'. Aceite que comida e etiqueta de mesa mudam por região — e peça a versão local.",
    practiceEn:
      "Ask where someone is from without turning it into a quiz. Do not say Cantonese is 'wrong Mandarin'. Accept that food and table etiquette change by region — and ask for the local version.",
    variabilityPt:
      "Megacidades misturam migrantes de muitas províncias. Geração jovem em escolas pode usar mais 普通话. Políticas linguísticas e prestígio social mudam o uso público de cada variedade.",
    variabilityEn:
      "Megacities mix migrants from many provinces. Younger school generations may use more 普通话. Language policy and social prestige change how each variety is used in public.",
    relatedLessonIds: ["l24"],
    sources: [SRC.regionalBritannica, SRC.regionalUnesco],
    miniCheck: {
      promptPt: "Você ouve cantonês em Guangzhou. Qual leitura é correta?",
      promptEn: "You hear Cantonese in Guangzhou. Which reading is correct?",
      options: [
        {
          id: "a",
          labelPt: "É só mandarim falado rápido com sotaque.",
          labelEn: "It is only Mandarin spoken quickly with an accent.",
        },
        {
          id: "b",
          labelPt:
            "É uma variedade linguística distinta; mandarim padrão é outra camada de comunicação.",
          labelEn:
            "It is a distinct language variety; standard Mandarin is another layer of communication.",
        },
        {
          id: "c",
          labelPt: "Na China só existe um jeito certo de falar e de comer.",
          labelEn: "In China there is only one correct way to speak and eat.",
        },
      ],
      correctOptionId: "b",
      explanationPt:
        "Cantonês e mandarim não são o mesmo sistema com 'sotaque'. Variação regional é o normal.",
      explanationEn:
        "Cantonese and Mandarin are not the same system with an 'accent'. Regional variation is normal.",
    },
  },
];

export type Culture13fShortSpec = {
  id: string;
  difficulty?: 1 | 2 | 3;
  concept: { pt: string; en: string };
  pairs: {
    id: string;
    left: { pt: string; en: string };
    right: { pt: string; en: string };
  }[];
  takeaways: { pt: string; en: string }[];
};

export const CULTURE_13F_SHORT_SPECS: Culture13fShortSpec[] = [
  {
    id: "wechat-life",
    difficulty: 2,
    concept: {
      pt: "WeChat concentra mensagem, grupos, Moments e Mini Programs — pagamento é só uma camada.",
      en: "WeChat concentrates messaging, groups, Moments, and Mini Programs — payment is only one layer.",
    },
    pairs: [
      {
        id: "p1",
        left: { pt: "Grupo da turma ou do time", en: "Class or team group" },
        right: { pt: "Coordenação por chat, não só QR", en: "Chat coordination, not only QR" },
      },
      {
        id: "p2",
        left: { pt: "朋友圈 (Moments)", en: "朋友圈 (Moments)" },
        right: { pt: "Público social — checar antes de postar", en: "Social audience — check before posting" },
      },
      {
        id: "p3",
        left: { pt: "Mini Program / trabalho", en: "Mini Program / work" },
        right: { pt: "Serviço embutido no app", en: "Service embedded in the app" },
      },
    ],
    takeaways: [
      {
        pt: "Não reduza WeChat a carteira digital.",
        en: "Do not reduce WeChat to a digital wallet.",
      },
      {
        pt: "A dose de Moments e grupos muda com pessoa e geração.",
        en: "The dose of Moments and groups changes with person and generation.",
      },
    ],
  },
  {
    id: "high-speed-rail",
    difficulty: 2,
    concept: {
      pt: "高铁 pede bilhete, documento, tempo de fila e assento marcado.",
      en: "高铁 needs a ticket, ID, queue time, and an assigned seat.",
    },
    pairs: [
      {
        id: "p1",
        left: { pt: "Entrada na estação", en: "Station entry" },
        right: { pt: "Documento + bilhete prontos", en: "ID + ticket ready" },
      },
      {
        id: "p2",
        left: { pt: "车厢 / assento", en: "Carriage / seat" },
        right: { pt: "Localizar antes do 检票", en: "Find them before 检票" },
      },
      {
        id: "p3",
        left: { pt: "二等座 / 一等座", en: "二等座 / 一等座" },
        right: { pt: "Classe = tarifa e conforto", en: "Class = fare and comfort" },
      },
    ],
    takeaways: [
      {
        pt: "Chegue com margem — segurança e checagem levam tempo.",
        en: "Arrive with buffer — security and checks take time.",
      },
      {
        pt: "Estações e feriados mudam o fluxo.",
        en: "Stations and holidays change the flow.",
      },
    ],
  },
  {
    id: "gaokao-context",
    difficulty: 2,
    concept: {
      pt: "高考 pesa no calendário escolar e familiar — sem ser o único destino de todos.",
      en: "高考 weighs on school and family calendars — without being everyone's only destination.",
    },
    pairs: [
      {
        id: "p1",
        left: { pt: "Junho perto de uma escola", en: "June near a school" },
        right: { pt: "Silêncio e apoio possíveis", en: "Quiet and support are possible" },
      },
      {
        id: "p2",
        left: { pt: "Perguntar a nota na hora", en: "Asking for the score at once" },
        right: { pt: "Pode ser íntimo demais", en: "Can be too intimate" },
      },
      {
        id: "p3",
        left: { pt: "Caminhos além do gaokao", en: "Paths beyond the gaokao" },
        right: { pt: "Existem; não apague a variação", en: "Exist; do not erase variation" },
      },
    ],
    takeaways: [
      {
        pt: "Reconheça o peso sem virar sensacionalismo.",
        en: "Acknowledge the weight without turning it into sensationalism.",
      },
      {
        pt: "Província e família mudam a experiência.",
        en: "Province and family change the experience.",
      },
    ],
  },
  {
    id: "guanxi-relations",
    difficulty: 3,
    concept: {
      pt: "关系 é rede de confiança e reciprocidade — não atalho automático ilegal.",
      en: "关系 is a trust and reciprocity network — not an automatic illegal shortcut.",
    },
    pairs: [
      {
        id: "p1",
        left: { pt: "Apresentação a um amigo do amigo", en: "Introduction to a friend's friend" },
        right: { pt: "Ponte de confiança possível", en: "A possible trust bridge" },
      },
      {
        id: "p2",
        left: { pt: "Pedir burlar regra institucional", en: "Asking to bypass an institutional rule" },
        right: { pt: "Outra categoria — não é 'cultura'", en: "Another category — not 'culture'" },
      },
      {
        id: "p3",
        left: { pt: "Manter contato depois de um favor", en: "Staying in touch after a favour" },
        right: { pt: "Reciprocidade ao longo do tempo", en: "Reciprocity over time" },
      },
    ],
    takeaways: [
      {
        pt: "Indicação ≠ corrupção; abuse é outra coisa.",
        en: "Referral ≠ corruption; abuse is something else.",
      },
      {
        pt: "Canais oficiais continuam o caminho certo para processos formais.",
        en: "Official channels remain the right path for formal processes.",
      },
    ],
  },
  {
    id: "delivery-life",
    difficulty: 1,
    concept: {
      pt: "外卖 urbano (estilo Meituan / Ele.me) é hábito de densidade — uma opção entre várias.",
      en: "Urban 外卖 (Meituan / Ele.me style) is a density habit — one option among several.",
    },
    pairs: [
      {
        id: "p1",
        left: { pt: "Almoço no escritório", en: "Lunch at the office" },
        right: { pt: "Pedido no app + portaria", en: "In-app order + building gate" },
      },
      {
        id: "p2",
        left: { pt: "Cozinha em casa / cantina", en: "Home cooking / canteen" },
        right: { pt: "Continua existindo ao lado do delivery", en: "Still exists beside delivery" },
      },
      {
        id: "p3",
        left: { pt: "Pagamento do pedido", en: "Paying for the order" },
        right: { pt: "Móvel com frequência; confirme o endereço", en: "Often mobile; confirm the address" },
      },
    ],
    takeaways: [
      {
        pt: "Delivery não prova que 'ninguém cozinha'.",
        en: "Delivery does not prove that 'nobody cooks'.",
      },
      {
        pt: "Cobertura e regras do prédio variam.",
        en: "Coverage and building rules vary.",
      },
    ],
  },
  {
    id: "regional-china",
    difficulty: 2,
    concept: {
      pt: "Região muda língua, comida e hábito; cantonês ≠ sotaque de mandarim.",
      en: "Region changes language, food, and habit; Cantonese ≠ a Mandarin accent.",
    },
    pairs: [
      {
        id: "p1",
        left: { pt: "粤语 em Guangzhou", en: "粤语 in Guangzhou" },
        right: { pt: "Variedade distinta, não 'erro'", en: "A distinct variety, not an 'error'" },
      },
      {
        id: "p2",
        left: { pt: "Contrastes norte / sul na mesa", en: "North / south contrasts at the table" },
        right: { pt: "Tendências com muitas exceções locais", en: "Tendencies with many local exceptions" },
      },
      {
        id: "p3",
        left: { pt: "普通话 na escola", en: "普通话 at school" },
        right: { pt: "Língua franca — não apaga o local", en: "Lingua franca — does not erase the local" },
      },
    ],
    takeaways: [
      {
        pt: "Não trate a China como um único costume.",
        en: "Do not treat China as a single custom.",
      },
      {
        pt: "Pergunte a origem e a versão local com curiosidade, sem teste.",
        en: "Ask about origin and the local version with curiosity, not a quiz.",
      },
    ],
  },
];

export const CULTURE_13F_FLAGSHIP_DEEP: CultureDeepNode[] = [
  {
    itemId: "wechat-life",
    pathId: "china_digital",
    depth: "FLAGSHIP_DEEP",
    regionTags: ["urban", "broad"],
    generationTags: ["young", "contemporary"],
    contextTags: ["DIGITAL", "SOCIAL"],
    sourceRequired: true,
    stereotypeReviewFlags: [],
    sections: {
      scene: {
        pt: "O colega não manda e-mail: 'Te adiciono no WeChat e mando no grupo.'",
        en: "The colleague does not send email: 'I'll add you on WeChat and send it in the group.'",
      },
      context: {
        pt: "WeChat funciona como hub: chat, grupos, Moments, Mini Programs e também pagamento.",
        en: "WeChat works as a hub: chat, groups, Moments, Mini Programs, and also payment.",
      },
      culturalLogic: {
        pt: "Quando coordenação e serviços cabem no mesmo app, o contato diário migra para lá — sem apagar outros canais.",
        en: "When coordination and services fit in one app, daily contact migrates there — without erasing other channels.",
      },
      brazilComparison: {
        pt: "Parece WhatsApp + um pouco de Pix + serviços no mesmo lugar; a mistura é mais apertada que no Brasil.",
        en: "Like WhatsApp + a bit of Pix + services in one place; the mix is tighter than in Brazil.",
      },
      practicalBehavior: {
        pt: "Aceite o convite de trabalho/estudo, separe Moments de chat privado, e confirme Mini Programs antes de autorizar dados.",
        en: "Accept the work/study invite, separate Moments from private chat, and check Mini Programs before granting data.",
      },
      language: {
        pt: "微信、加我、朋友圈、小程序。",
        en: "微信, 加我, 朋友圈, 小程序.",
      },
      decision: {
        promptPt: "Alguém pede seu WeChat no primeiro dia de estágio. O que você faz?",
        promptEn: "Someone asks for your WeChat on the first day of an internship. What do you do?",
        options: [
          {
            id: "add_work",
            labelPt: "Adiciono e uso o chat para coordenação do trabalho",
            labelEn: "Add them and use chat for work coordination",
            quality: "preferred",
            explainPt: "Em muitos contextos urbanos, WeChat é o canal prático de equipe.",
            explainEn: "In many urban contexts, WeChat is the practical team channel.",
          },
          {
            id: "ask_purpose",
            labelPt: "Pergunto se é para o grupo do time ou só Moments",
            labelEn: "Ask whether it is for the team group or only Moments",
            quality: "acceptable",
            explainPt: "Esclarecer o uso evita misturar público e privado.",
            explainEn: "Clarifying use avoids mixing public and private.",
          },
          {
            id: "refuse_all",
            labelPt: "Recuso porque 'WeChat é só pagamento'",
            labelEn: "Refuse because 'WeChat is only for payment'",
            quality: "context_dependent",
            explainPt: "Pode isolar você do fluxo do time — a leitura do app está incompleta.",
            explainEn: "Can isolate you from team flow — the reading of the app is incomplete.",
          },
        ],
      },
      useIt: {
        pt: "Microdiálogo: — 我加你微信。 — 好，我通过。",
        en: "Micro-dialogue: — 我加你微信. — 好，我通过.",
      },
    },
  },
  {
    itemId: "high-speed-rail",
    pathId: "cidades_transporte",
    depth: "FLAGSHIP_DEEP",
    regionTags: ["urban", "broad"],
    contextTags: ["TRANSPORT"],
    sourceRequired: true,
    stereotypeReviewFlags: [],
    sections: {
      scene: {
        pt: "Na estação de 高铁, a fila de segurança anda e o painel mostra o horário de 检票.",
        en: "At the 高铁 station, the security line moves and the board shows 检票 time.",
      },
      context: {
        pt: "Bilhete nominativo, documento, vagão e classe organizam o embarque.",
        en: "Named ticket, ID, carriage, and class organise boarding.",
      },
      culturalLogic: {
        pt: "Infraestrutura de massa precisa de fluxo previsível — por isso checagem e assento marcado.",
        en: "Mass infrastructure needs predictable flow — hence checks and assigned seats.",
      },
      brazilComparison: {
        pt: "Mais próximo de embarque aéreo doméstico do que de ônibus intermunicipal sem documento.",
        en: "Closer to domestic air boarding than to an intercity bus without ID.",
      },
      practicalBehavior: {
        pt: "Documento na mão, margem de tempo, ler 车厢 e assento, seguir 检票 — sem tratar classe como hierarquia moral.",
        en: "ID in hand, time buffer, read 车厢 and seat, follow 检票 — without treating class as moral hierarchy.",
      },
      language: {
        pt: "高铁、检票、二等座、身份证 / 护照。",
        en: "高铁, 检票, 二等座, 身份证 / 护照.",
      },
      decision: {
        promptPt: "Faltam 12 minutos e a fila de segurança está longa. O que você faz?",
        promptEn: "Twelve minutes left and the security line is long. What do you do?",
        options: [
          {
            id: "stay_queue",
            labelPt: "Fico na fila com documento e bilhete prontos, sem furar",
            labelEn: "Stay in line with ID and ticket ready, without cutting",
            quality: "preferred",
            explainPt: "Fluxo e documentos são o hábito seguro; furar gera conflito.",
            explainEn: "Flow and documents are the safe habit; cutting creates conflict.",
          },
          {
            id: "ask_staff",
            labelPt: "Pergunto a um funcionário se ainda dá tempo para o meu trem",
            labelEn: "Ask staff whether there is still time for my train",
            quality: "acceptable",
            explainPt: "Pedir informação é útil; não substitui chegar mais cedo na próxima.",
            explainEn: "Asking is useful; it does not replace arriving earlier next time.",
          },
          {
            id: "skip_id",
            labelPt: "Corro direto ao vagão sem checagem",
            labelEn: "Run straight to the carriage without checks",
            quality: "context_dependent",
            explainPt: "Em geral não funciona — e atrasa os outros.",
            explainEn: "Usually does not work — and delays others.",
          },
        ],
      },
      useIt: {
        pt: "Microdiálogo: — 请问，检票口在哪里？ — 在那边。",
        en: "Micro-dialogue: — 请问，检票口在哪里？ — 在那边.",
      },
    },
  },
  {
    itemId: "gaokao-context",
    pathId: "escola_universidade",
    depth: "FLAGSHIP_DEEP",
    regionTags: ["broad"],
    generationTags: ["young", "traditional", "contemporary"],
    contextTags: ["SOCIAL"],
    sourceRequired: true,
    stereotypeReviewFlags: ["chineses sempre"],
    sections: {
      scene: {
        pt: "Em junho, a rua perto da escola pede silêncio; alguém menciona 高考.",
        en: "In June, the street near the school asks for quiet; someone mentions 高考.",
      },
      context: {
        pt: "O exame nacional de ingresso concentra tensão familiar e rotinas escolares por um período curto e intenso.",
        en: "The national entrance exam concentrates family tension and school routines for a short, intense period.",
      },
      culturalLogic: {
        pt: "Alta consequência + calendário compartilhado geram rituais de apoio — sem apagar caminhos alternativos.",
        en: "High stakes + a shared calendar generate support rituals — without erasing alternative paths.",
      },
      brazilComparison: {
        pt: "Lembra a pressão de vestibulares e ENEM, com peso calendário ainda mais visível em muitas cidades.",
        en: "Recalls university-entrance pressure, with an even more visible calendar weight in many cities.",
      },
      practicalBehavior: {
        pt: "Respeite pedidos locais de silêncio; reconheça o peso; não dramatize nem cobre a nota.",
        en: "Respect local quiet requests; acknowledge the weight; do not dramatise or demand the score.",
      },
      language: {
        pt: "高考、加油、考试顺利。",
        en: "高考, 加油, 考试顺利.",
      },
      decision: {
        promptPt: "Um amigo da família terminou o gaokao ontem. O que você diz?",
        promptEn: "A family friend finished the gaokao yesterday. What do you say?",
        options: [
          {
            id: "support",
            labelPt: "Parabenizo o esforço e desejo descanso — sem cobrar a nota",
            labelEn: "Congratulate the effort and wish rest — without demanding the score",
            quality: "preferred",
            explainPt: "Apoio sem invasão é a leitura mais segura.",
            explainEn: "Support without intrusion is the safer reading.",
          },
          {
            id: "ask_later",
            labelPt: "Pergunto se quer falar do exame, e aceito um 'depois'",
            labelEn: "Ask whether they want to talk about the exam, and accept a 'later'",
            quality: "acceptable",
            explainPt: "Deixa a pessoa no controle do assunto.",
            explainEn: "Leaves the person in control of the topic.",
          },
          {
            id: "score_now",
            labelPt: "Cobro a nota na hora e comparo com rankings",
            labelEn: "Demand the score at once and compare rankings",
            quality: "context_dependent",
            explainPt: "Pode ferir — o impacto emocional varia por família.",
            explainEn: "Can hurt — emotional impact varies by family.",
          },
        ],
      },
      useIt: {
        pt: "Microdiálogo: — 高考辛苦了。 — 谢谢，我想休息一下。",
        en: "Micro-dialogue: — 高考辛苦了. — 谢谢，我想休息一下.",
      },
    },
  },
  {
    itemId: "guanxi-relations",
    pathId: "etiqueta_relacoes",
    depth: "FLAGSHIP_DEEP",
    contextTags: ["SOCIAL", "WORK"],
    sourceRequired: true,
    stereotypeReviewFlags: ["chineses sempre", "guanxi = corrupção"],
    sections: {
      scene: {
        pt: "Um conhecido diz: 'Te apresento alguém que já passou por isso.'",
        en: "An acquaintance says: 'I'll introduce you to someone who has been through this.'",
      },
      context: {
        pt: "关系 nomeia redes de confiança e reciprocidade ao longo do tempo.",
        en: "关系 names trust and reciprocity networks over time.",
      },
      culturalLogic: {
        pt: "Introdução e memória de favores organizam acesso social — distinto de burlar regra.",
        en: "Introductions and memory of favours organise social access — distinct from bypassing rules.",
      },
      brazilComparison: {
        pt: "Parece indicação e 'conhecer alguém' no Brasil; a palavra não autoriza atalho ilegal.",
        en: "Like referrals and 'knowing someone' in Brazil; the word does not authorise illegal shortcuts.",
      },
      practicalBehavior: {
        pt: "Agradeça a ponte, mantenha contato, reciproque com o tempo, e use canal oficial para processos formais.",
        en: "Thank the bridge, keep contact, reciprocate over time, and use official channels for formal processes.",
      },
      language: {
        pt: "介绍一下、麻烦你、谢谢帮忙。",
        en: "介绍一下, 麻烦你, 谢谢帮忙.",
      },
      decision: {
        promptPt: "Alguém oferece uma introdução útil. O que você faz?",
        promptEn: "Someone offers a useful introduction. What do you do?",
        options: [
          {
            id: "thank_bridge",
            labelPt: "Agradeço e aceito a apresentação sem pedir atalho ilegal",
            labelEn: "Thank them and accept the introduction without asking for an illegal shortcut",
            quality: "preferred",
            explainPt: "Reciprocidade legítima ≠ burlar regra.",
            explainEn: "Legitimate reciprocity ≠ bypassing rules.",
          },
          {
            id: "clarify",
            labelPt: "Pergunto se é só apresentação ou se envolve processo formal",
            labelEn: "Ask whether it is only an introduction or involves a formal process",
            quality: "acceptable",
            explainPt: "Esclarecer o tipo de ajuda evita mal-entendido.",
            explainEn: "Clarifying the kind of help avoids misunderstanding.",
          },
          {
            id: "buy_favour",
            labelPt: "Ofereço dinheiro para 'garantir' o resultado oficial",
            labelEn: "Offer money to 'guarantee' the official outcome",
            quality: "context_dependent",
            explainPt: "Isso sai da rede de confiança e entra em risco ético/legal.",
            explainEn: "That leaves the trust network and enters ethical/legal risk.",
          },
        ],
      },
      useIt: {
        pt: "Microdiálogo: — 我给你介绍一位朋友。 — 谢谢，太麻烦你了。",
        en: "Micro-dialogue: — 我给你介绍一位朋友. — 谢谢，太麻烦你了.",
      },
    },
  },
  {
    itemId: "delivery-life",
    pathId: "vida_cotidiana",
    depth: "FLAGSHIP_DEEP",
    regionTags: ["urban"],
    generationTags: ["young", "contemporary"],
    contextTags: ["DIGITAL", "SOCIAL"],
    sourceRequired: true,
    stereotypeReviewFlags: [],
    sections: {
      scene: {
        pt: "Ao meio-dia, o corredor do escritório enche de sacolas 外卖.",
        en: "At noon, the office corridor fills with 外卖 bags.",
      },
      context: {
        pt: "Apps estilo Meituan / Ele.me organizam pedido, pagamento e entrega em muitas cidades.",
        en: "Meituan / Ele.me-style apps organise ordering, payment, and delivery in many cities.",
      },
      culturalLogic: {
        pt: "Densidade + plataformas tornam o almoço no prédio eficiente; não apagam cantina nem cozinha.",
        en: "Density + platforms make lunch in the building efficient; they do not erase canteens or cooking.",
      },
      brazilComparison: {
        pt: "Como iFood no escritório brasileiro — com pagamento móvel ainda mais acoplado.",
        en: "Like iFood in a Brazilian office — with mobile pay even more tightly coupled.",
      },
      practicalBehavior: {
        pt: "Confirme endereço e portaria, tenha o app e o pagamento prontos, e retire sem bloquear a entrada.",
        en: "Confirm address and gate, have the app and payment ready, and collect without blocking the entrance.",
      },
      language: {
        pt: "外卖、送到、放门口。",
        en: "外卖, 送到, 放门口.",
      },
      decision: {
        promptPt: "O entregador liga: está na portaria. O que você faz?",
        promptEn: "The courier calls: they are at the gate. What do you do?",
        options: [
          {
            id: "go_gate",
            labelPt: "Desço ou autorizo na portaria e confirmo o pedido",
            labelEn: "Go down or authorise at the gate and confirm the order",
            quality: "preferred",
            explainPt: "Fecha o fluxo sem deixar o entregador preso na entrada.",
            explainEn: "Closes the flow without trapping the courier at the entrance.",
          },
          {
            id: "locker",
            labelPt: "Peço para deixar no armário de entregas, se o prédio tiver",
            labelEn: "Ask to leave it in the delivery locker if the building has one",
            quality: "acceptable",
            explainPt: "Comum em muitos prédios — confirme a regra local.",
            explainEn: "Common in many buildings — confirm local rules.",
          },
          {
            id: "ignore",
            labelPt: "Ignoro a ligação; 'eles deixam em qualquer lugar'",
            labelEn: "Ignore the call; 'they leave it anywhere'",
            quality: "context_dependent",
            explainPt: "Pode atrasar ou cancelar o pedido — e atrapalha o entregador.",
            explainEn: "Can delay or cancel the order — and hinders the courier.",
          },
        ],
      },
      useIt: {
        pt: "Microdiálogo: — 外卖到了吗？ — 到了，我下楼。",
        en: "Micro-dialogue: — 外卖到了吗？ — 到了，我下楼.",
      },
    },
  },
  {
    itemId: "regional-china",
    pathId: "diferencas_regionais",
    depth: "FLAGSHIP_DEEP",
    regionTags: ["North", "South", "Guangzhou", "broad"],
    contextTags: ["REGIONAL", "SOCIAL"],
    sourceRequired: true,
    stereotypeReviewFlags: ["chineses sempre", "um único sotaque"],
    sections: {
      scene: {
        pt: "Em Guangzhou, o colega fala com a família em cantonês e muda para 普通话 com você.",
        en: "In Guangzhou, a colleague speaks Cantonese with family and switches to 普通话 with you.",
      },
      context: {
        pt: "Línguas, clima e mesa variam; mandarim padrão é língua franca, não o único sistema.",
        en: "Languages, climate, and table habits vary; standard Mandarin is a lingua franca, not the only system.",
      },
      culturalLogic: {
        pt: "Geografia grande produz variedade; prestígio escolar do 普通话 convive com línguas locais.",
        en: "Large geography produces variety; school prestige of 普通话 coexists with local languages.",
      },
      brazilComparison: {
        pt: "Como sotaques e pratos do Brasil: região muda o cotidiano sem invalidar a identidade compartilhada.",
        en: "Like Brazilian accents and dishes: region changes daily life without invalidating a shared identity.",
      },
      practicalBehavior: {
        pt: "Não chame cantonês de 'mandarim errado'; pergunte a origem com curiosidade; aceite variação na mesa.",
        en: "Do not call Cantonese 'wrong Mandarin'; ask about origin with curiosity; accept table variation.",
      },
      language: {
        pt: "普通话、方言、哪里人。",
        en: "普通话, 方言, 哪里人.",
      },
      decision: {
        promptPt: "Você não entende a conversa em cantonês ao lado. O que faz?",
        promptEn: "You do not understand the Cantonese conversation beside you. What do you do?",
        options: [
          {
            id: "respect_switch",
            labelPt: "Espero; quando falarem comigo, uso 普通话 sem corrigir a língua deles",
            labelEn: "Wait; when they speak to me, use 普通话 without correcting their language",
            quality: "preferred",
            explainPt: "Respeita a variedade local e usa a língua franca no seu canal.",
            explainEn: "Respects the local variety and uses the lingua franca on your channel.",
          },
          {
            id: "ask_learn",
            labelPt: "Pergunto com educação se posso aprender uma saudação local",
            labelEn: "Politely ask whether I can learn a local greeting",
            quality: "acceptable",
            explainPt: "Curiosidade sem teste costuma ser bem recebida.",
            explainEn: "Curiosity without a quiz is often welcome.",
          },
          {
            id: "correct_accent",
            labelPt: "Digo que deveriam falar 'chinês certo'",
            labelEn: "Say they should speak 'correct Chinese'",
            quality: "context_dependent",
            explainPt: "Apaga a geografia linguística e soa hostil.",
            explainEn: "Erases linguistic geography and sounds hostile.",
          },
        ],
      },
      useIt: {
        pt: "Microdiálogo: — 你是哪里人？ — 我是广州人。",
        en: "Micro-dialogue: — 你是哪里人？ — 我是广州人.",
      },
    },
  },
];
