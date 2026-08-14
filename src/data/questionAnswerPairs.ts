/**
 * Pedagogia V3.7 — pares pergunta/resposta (LEX-041/042).
 */

export interface QuestionAnswerLadder {
  id: string;
  questionHanzi: string;
  questionGlossPt: string;
  answers: Array<{ hanzi: string; glossPt: string }>;
  introduceQuestionAt?: string;
  packet?: string;
  questionWord?: string;
}

export const QUESTION_WORDS_LADDER = [
  { word: "谁", glossPt: "quem", introduceAt: "l24", packet: "basic_questions" },
  { word: "什么", glossPt: "o quê", introduceAt: "l14-frase-minima", packet: "basic_questions" },
  { word: "哪里", glossPt: "onde", introduceAt: "p6-cidade-lugares", packet: "directions" },
  { word: "哪儿", glossPt: "onde (coloquial)", introduceAt: "p6-direcoes", packet: "directions" },
  { word: "哪个", glossPt: "qual", introduceAt: "p6-compras", packet: "shopping" },
  { word: "多少", glossPt: "quanto", introduceAt: "l27", packet: "shopping" },
  { word: "几", glossPt: "quantos (pequeno)", introduceAt: "l20", packet: "numbers_dates" },
  { word: "什么时候", glossPt: "quando", introduceAt: "p6-horarios", packet: "time" },
  { word: "为什么", glossPt: "por quê", introduceAt: "future-social", packet: "social" },
  { word: "怎么", glossPt: "como", introduceAt: "p6-direcoes", packet: "directions" },
  { word: "怎么样", glossPt: "que tal", introduceAt: "l9-tudo-bem", packet: "basic_questions" },
] as const;

export const QUESTION_ANSWER_PAIRS: QuestionAnswerLadder[] = [
  {
    id: "ask_origin",
    questionHanzi: "你是哪国人？",
    questionGlossPt: "De que país você é?",
    answers: [
      { hanzi: "我是巴西人。", glossPt: "Sou brasileiro." },
      { hanzi: "我是中国人。", glossPt: "Sou chinês." },
      { hanzi: "我是美国人。", glossPt: "Sou americano." },
    ],
    introduceQuestionAt: "l9",
    packet: "introductions",
    questionWord: "哪",
  },
  {
    id: "ask_name",
    questionHanzi: "你叫什么？",
    questionGlossPt: "Como você se chama?",
    answers: [
      { hanzi: "我叫Matheus。", glossPt: "Meu nome é Matheus." },
      { hanzi: "我叫Mei。", glossPt: "Meu nome é Mei." },
    ],
    introduceQuestionAt: "p1-primeira-conversa",
    packet: "introductions",
    questionWord: "什么",
  },
  {
    id: "ask_job",
    questionHanzi: "你做什么工作？",
    questionGlossPt: "O que você faz / qual é o seu trabalho?",
    answers: [
      { hanzi: "我是老师。", glossPt: "Sou professor(a)." },
      { hanzi: "我是学生。", glossPt: "Sou estudante." },
      { hanzi: "我在公司工作。", glossPt: "Trabalho numa empresa." },
    ],
    introduceQuestionAt: "p6-rotina-trabalho",
    packet: "work",
    questionWord: "什么",
  },
  {
    id: "ask_food_pref",
    questionHanzi: "你喜欢吃什么？",
    questionGlossPt: "O que você gosta de comer?",
    answers: [
      { hanzi: "我喜欢吃米饭。", glossPt: "Gosto de arroz." },
      { hanzi: "我喜欢吃面。", glossPt: "Gosto de macarrão." },
      { hanzi: "我喜欢吃鱼。", glossPt: "Gosto de peixe." },
    ],
    introduceQuestionAt: "l26b",
    packet: "restaurant",
    questionWord: "什么",
  },
  {
    id: "ask_price",
    questionHanzi: "多少钱？",
    questionGlossPt: "Quanto custa?",
    answers: [
      { hanzi: "二十八元。", glossPt: "Vinte e oito yuan." },
      { hanzi: "太贵了。", glossPt: "Caro demais." },
    ],
    introduceQuestionAt: "l27",
    packet: "shopping",
    questionWord: "多少",
  },
  {
    id: "ask_where",
    questionHanzi: "在哪里？",
    questionGlossPt: "Onde fica?",
    answers: [
      { hanzi: "在左边。", glossPt: "À esquerda." },
      { hanzi: "在前面。", glossPt: "Em frente." },
      { hanzi: "我不知道。", glossPt: "Não sei." },
    ],
    introduceQuestionAt: "p6-cidade-lugares",
    packet: "directions",
    questionWord: "哪里",
  },
  {
    id: "ask_wellbeing",
    questionHanzi: "你好吗？",
    questionGlossPt: "Tudo bem?",
    answers: [
      { hanzi: "我很好。", glossPt: "Estou bem." },
      { hanzi: "今天很好。", glossPt: "Hoje está ótimo." },
    ],
    introduceQuestionAt: "l3",
    packet: "greetings",
    questionWord: "吗",
  },
  {
    id: "ask_drink",
    questionHanzi: "你想喝什么？",
    questionGlossPt: "O que você quer beber?",
    answers: [
      { hanzi: "我要茶。", glossPt: "Quero chá." },
      { hanzi: "我想喝水。", glossPt: "Quero beber água." },
      { hanzi: "我要咖啡。", glossPt: "Quero café." },
    ],
    introduceQuestionAt: "l26b",
    packet: "restaurant",
    questionWord: "什么",
  },
];
