import type { ConversationNode } from "./conversationScenes";

/** Authored content for existing time/routine scenes; uses the existing produce_reply player. */
type Turn = {
  question: string;
  sound: string;
  meaning: string;
  prompt: string;
  answer: string;
  pinyin: string;
  pt: string;
  accepts?: string[];
};

function turns(prefix: string, speakerId: string, rows: Turn[]): ConversationNode[] {
  return rows
    .flatMap((row, index): ConversationNode[] => {
      const id = `${prefix}-${index + 1}`;
      return [
        {
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
          },
        },
        {
          id: `${id}-retry`,
          speakerId,
          hanzi: "请再说一遍。",
          pinyin: "qǐng zài shuō yí biàn.",
          pt: "Por favor, fale de novo.",
          emotion: "thinking",
          nextNodeId: id,
        },
        {
          id: `${id}-answer`,
          speakerId: "lin",
          hanzi: row.answer,
          pinyin: row.pinyin,
          pt: row.pt,
          nextNodeId: index < rows.length - 1 ? `${prefix}-${index + 2}` : `${prefix}-end`,
        },
      ];
    })
    .concat([{ id: `${prefix}-end`, speakerId, hanzi: "好！谢谢！", pinyin: "hǎo! xièxie!", pt: "Certo! Obrigado!", emotion: "happy" }]);
}

export const ROUTINE_TIME_TOMORROW_NODES = turns("amanha", "mei", [
  {
    question: "你好！",
    sound: "nǐ hǎo!",
    meaning: "Olá!",
    prompt: "Mei cumprimenta você na rua. Responda ao olá.",
    answer: "你好",
    pinyin: "nǐ hǎo.",
    pt: "Olá.",
    accepts: ["你好。", "你好！"],
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
  },
]);

export const ROUTINE_TIME_CLOCK_NODES = turns("hora", "wang", [
  {
    question: "现在几点？",
    sound: "xiànzài jǐ diǎn?",
    meaning: "Que horas são?",
    prompt: "São oito e meia. Diga as horas.",
    answer: "八点半",
    pinyin: "bā diǎn bàn.",
    pt: "Oito e meia.",
    accepts: ["八点半。", "现在八点半", "现在八点半。"],
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
  },
  {
    question: "好！",
    sound: "hǎo!",
    meaning: "Certo!",
    prompt: "Wang aceitou o horário. Agradeça.",
    answer: "谢谢",
    pinyin: "xièxie.",
    pt: "Obrigado.",
    accepts: ["谢谢。", "谢谢！"],
  },
]);

export const ROUTINE_TIME_ROUTINE_NODES = turns("rotina", "mei", [
  {
    question: "你几点起床？",
    sound: "nǐ jǐ diǎn qǐchuáng?",
    meaning: "A que horas você acorda?",
    prompt: "Você acorda às sete. Diga quando acorda.",
    answer: "我七点起床",
    pinyin: "wǒ qī diǎn qǐchuáng.",
    pt: "Acordo às sete.",
    accepts: ["我七点起床。", "七点起床"],
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
  },
  {
    question: "你做什么工作？",
    sound: "nǐ zuò shénme gōngzuò?",
    meaning: "O que você faz de trabalho?",
    prompt: "Onde você trabalha?",
    answer: "我在公司上班",
    pinyin: "wǒ zài gōngsī shàngbān.",
    pt: "Trabalho numa empresa.",
    accepts: ["我在公司上班。"],
  },
]);
