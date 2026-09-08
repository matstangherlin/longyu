import type {
  ConversationEmotion,
  ConversationNode,
  ConversationRepairType,
  ConversationSpeechAct,
} from "./conversationScenes";

/** Authored time/routine scenes: produce_reply with continuity, typed repair, and a scene ending. */
type Turn = {
  question: string;
  sound: string;
  meaning: string;
  prompt: string;
  answer: string;
  pinyin: string;
  pt: string;
  accepts?: string[];
  speechAct: ConversationSpeechAct;
  expectedResponseAct: ConversationSpeechAct;
  repairType: ConversationRepairType;
  repairHanzi: string;
  repairPinyin: string;
  repairPt: string;
  reaction?: { hanzi: string; pinyin: string; pt: string; emotion?: ConversationEmotion };
};

type Ending = { hanzi: string; pinyin: string; pt: string; emotion?: ConversationEmotion };

function turns(prefix: string, speakerId: string, rows: Turn[], ending: Ending): ConversationNode[] {
  const nodes: ConversationNode[] = [];
  rows.forEach((row, index) => {
    const id = `${prefix}-${index + 1}`;
    const isLast = index === rows.length - 1;
    const afterAnswer = row.reaction ? `${id}-react` : isLast ? `${prefix}-end` : `${prefix}-${index + 2}`;
    nodes.push({
      id,
      speakerId,
      hanzi: row.question,
      pinyin: row.sound,
      pt: row.meaning,
      interaction: {
        type: "produce_reply",
        prompt: row.prompt,
        correctAnswer: row.answer,
        accepts: [row.answer, ...(row.accepts ?? [])],
        correctNextNodeId: `${id}-answer`,
        wrongNextNodeId: `${id}-retry`,
        speechAct: row.speechAct,
        expectedResponseAct: row.expectedResponseAct,
        repairType: row.repairType,
      },
    });
    nodes.push({
      id: `${id}-retry`,
      speakerId,
      hanzi: row.repairHanzi,
      pinyin: row.repairPinyin,
      pt: row.repairPt,
      emotion: "thinking",
      nextNodeId: id,
    });
    nodes.push({
      id: `${id}-answer`,
      speakerId: "lin",
      hanzi: row.answer,
      pinyin: row.pinyin,
      pt: row.pt,
      nextNodeId: afterAnswer,
    });
    if (row.reaction) {
      nodes.push({
        id: `${id}-react`,
        speakerId,
        hanzi: row.reaction.hanzi,
        pinyin: row.reaction.pinyin,
        pt: row.reaction.pt,
        emotion: row.reaction.emotion ?? "happy",
        nextNodeId: isLast ? `${prefix}-end` : `${prefix}-${index + 2}`,
      });
    }
  });
  nodes.push({
    id: `${prefix}-end`,
    speakerId,
    hanzi: ending.hanzi,
    pinyin: ending.pinyin,
    pt: ending.pt,
    emotion: ending.emotion ?? "happy",
  });
  return nodes;
}

export const ROUTINE_TIME_TOMORROW_NODES = turns(
  "amanha",
  "mei",
  [
    {
      question: "你好！",
      sound: "nǐ hǎo!",
      meaning: "Olá!",
      prompt: "Mei cumprimenta você na rua. Responda ao olá.",
      answer: "你好",
      pinyin: "nǐ hǎo.",
      pt: "Olá.",
      accepts: ["你好。", "你好！"],
      speechAct: "greet",
      expectedResponseAct: "greet",
      repairType: "reask",
      repairHanzi: "你好？",
      repairPinyin: "nǐ hǎo?",
      repairPt: "Olá?",
      reaction: { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    },
    {
      question: "明天见？",
      sound: "míngtiān jiàn?",
      meaning: "Até amanhã?",
      prompt: "Mei confirma o encontro. Combine o plano de amanhã.",
      answer: "明天见",
      pinyin: "míngtiān jiàn.",
      pt: "Até amanhã.",
      accepts: ["明天见。", "明天见！"],
      speechAct: "confirm_plan",
      expectedResponseAct: "confirm_plan",
      repairType: "reask",
      repairHanzi: "明天见？",
      repairPinyin: "míngtiān jiàn?",
      repairPt: "Até amanhã?",
      reaction: { hanzi: "好！明天见。", pinyin: "hǎo! míngtiān jiàn.", pt: "Certo! Até amanhã." },
    },
    {
      question: "再见！",
      sound: "zàijiàn!",
      meaning: "Até logo!",
      prompt: "O plano está combinado. Despeça-se agora.",
      answer: "再见",
      pinyin: "zàijiàn.",
      pt: "Até logo.",
      accepts: ["再见。", "再见！"],
      speechAct: "farewell",
      expectedResponseAct: "farewell",
      repairType: "reask",
      repairHanzi: "再见？",
      repairPinyin: "zàijiàn?",
      repairPt: "Até logo?",
    },
  ],
  { hanzi: "明天见！", pinyin: "míngtiān jiàn!", pt: "Até amanhã!", emotion: "happy" }
);

export const ROUTINE_TIME_CLOCK_NODES = turns(
  "hora",
  "wang",
  [
    {
      question: "现在几点？",
      sound: "xiànzài jǐ diǎn?",
      meaning: "Que horas são?",
      prompt: "São oito e meia. Diga as horas.",
      answer: "八点半",
      pinyin: "bā diǎn bàn.",
      pt: "Oito e meia.",
      accepts: ["八点半。", "现在八点半", "现在八点半。"],
      speechAct: "ask_time",
      expectedResponseAct: "tell_time",
      repairType: "confirm_time",
      repairHanzi: "八点半吗？",
      repairPinyin: "bā diǎn bàn ma?",
      repairPt: "Oito e meia?",
      reaction: { hanzi: "八点半？好。", pinyin: "bā diǎn bàn? hǎo.", pt: "Oito e meia? Certo." },
    },
    {
      question: "什么时候？",
      sound: "shénme shíhou?",
      meaning: "Quando?",
      prompt: "Vocês vão sair agora. Diga quando.",
      answer: "现在",
      pinyin: "xiànzài.",
      pt: "Agora.",
      accepts: ["现在。"],
      speechAct: "ask_when",
      expectedResponseAct: "tell_when",
      repairType: "clarify",
      repairHanzi: "什么？",
      repairPinyin: "shénme?",
      repairPt: "O quê?",
      reaction: { hanzi: "现在？好。", pinyin: "xiànzài? hǎo.", pt: "Agora? Certo." },
    },
  ],
  { hanzi: "好，八点见！", pinyin: "hǎo, bā diǎn jiàn!", pt: "Certo, às oito!", emotion: "happy" }
);

export const ROUTINE_TIME_ROUTINE_NODES = turns(
  "rotina",
  "mei",
  [
    {
      question: "你几点起床？",
      sound: "nǐ jǐ diǎn qǐchuáng?",
      meaning: "A que horas você acorda?",
      prompt: "Você acorda às sete. Diga quando acorda.",
      answer: "我七点起床",
      pinyin: "wǒ qī diǎn qǐchuáng.",
      pt: "Acordo às sete.",
      accepts: ["我七点起床。", "七点起床"],
      speechAct: "ask_time",
      expectedResponseAct: "tell_time",
      repairType: "confirm_time",
      repairHanzi: "七点吗？",
      repairPinyin: "qī diǎn ma?",
      repairPt: "Sete horas?",
      reaction: { hanzi: "七点？", pinyin: "qī diǎn?", pt: "Sete?" },
    },
    {
      question: "你几点上班？",
      sound: "nǐ jǐ diǎn shàngbān?",
      meaning: "A que horas você começa o trabalho?",
      prompt: "Você começa às oito. Diga o horário.",
      answer: "八点",
      pinyin: "bā diǎn.",
      pt: "Oito horas.",
      accepts: ["八点。", "我八点上班", "我八点上班。", "八点上班"],
      speechAct: "ask_time",
      expectedResponseAct: "tell_time",
      repairType: "confirm_time",
      repairHanzi: "八点吗？",
      repairPinyin: "bā diǎn ma?",
      repairPt: "Oito horas?",
      reaction: { hanzi: "八点见？", pinyin: "bā diǎn jiàn?", pt: "Às oito, então?" },
    },
    {
      question: "你在哪里工作？",
      sound: "nǐ zài nǎlǐ gōngzuò?",
      meaning: "Onde você trabalha?",
      prompt: "Você trabalha numa empresa. Diga onde trabalha.",
      answer: "我在公司上班",
      pinyin: "wǒ zài gōngsī shàngbān.",
      pt: "Trabalho numa empresa.",
      accepts: ["我在公司上班。"],
      speechAct: "ask_location",
      expectedResponseAct: "tell_location",
      repairType: "reask",
      repairHanzi: "你在哪里工作？",
      repairPinyin: "nǐ zài nǎlǐ gōngzuò?",
      repairPt: "Onde você trabalha?",
      reaction: { hanzi: "上班？好。", pinyin: "shàngbān? hǎo.", pt: "Trabalho? Certo." },
    },
  ],
  { hanzi: "好。", pinyin: "hǎo.", pt: "Certo.", emotion: "happy" }
);
