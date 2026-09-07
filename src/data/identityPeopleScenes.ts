import type { ConversationNode } from "./conversationScenes";

/** Authored content for existing scenes; uses the existing produce_reply player. */
type Turn = { question: string; sound: string; meaning: string; prompt: string; answer: string; pinyin: string; pt: string; accepts?: string[] };
function turns(prefix: string, speakerId: string, rows: Turn[]): ConversationNode[] {
  return rows.flatMap((row, index): ConversationNode[] => {
    const id = `${prefix}-${index + 1}`;
    return [
      { id, speakerId, hanzi: row.question, pinyin: row.sound, pt: row.meaning,
        interaction: { type: "produce_reply", prompt: row.prompt, correctAnswer: row.answer,
          accepts: [row.answer, ...(row.accepts ?? [])], correctNextNodeId: `${id}-answer`, wrongNextNodeId: `${id}-retry` } },
      { id: `${id}-retry`, speakerId, hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Por favor, fale de novo.", emotion: "thinking", nextNodeId: id },
      { id: `${id}-answer`, speakerId: "lin", hanzi: row.answer, pinyin: row.pinyin, pt: row.pt,
        nextNodeId: index < rows.length - 1 ? `${prefix}-${index + 2}` : `${prefix}-end` },
    ];
  }).concat([{ id: `${prefix}-end`, speakerId, hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", emotion: "happy" }]);
}

export const IDENTITY_CLASSROOM_NODES = turns("aula", "hua", [
  { question: "你好！你叫什么？", sound: "nǐ hǎo! nǐ jiào shénme?", meaning: "Olá! Como você se chama?",
    prompt: "Nesta conversa, você é Lin. Responda com seu nome.", answer: "我叫Lin。", pinyin: "wǒ jiào Lin.", pt: "Meu nome é Lin." },
  { question: "你是哪国人？", sound: "nǐ shì nǎ guó rén?", meaning: "De que país você é?",
    prompt: "Você é brasileiro. Responda e devolva a pergunta.", answer: "我是巴西人。你呢？", pinyin: "wǒ shì Bāxī rén. nǐ ne?", pt: "Sou brasileiro. E você?" },
  { question: "我是中国人。你是学生吗？", sound: "wǒ shì Zhōngguó rén. nǐ shì xuésheng ma?", meaning: "Sou chinês. Você é estudante?",
    prompt: "Você é estudante. Responda à pergunta.", answer: "我是学生。", pinyin: "wǒ shì xuésheng.", pt: "Sou estudante.", accepts: ["是，我是学生。"] },
  { question: "我也是。你学习什么？", sound: "wǒ yě shì. nǐ xuéxí shénme?", meaning: "Eu também. O que você estuda?",
    prompt: "Diga que você estuda chinês.", answer: "我学习中文。", pinyin: "wǒ xuéxí Zhōngwén.", pt: "Eu estudo chinês.", accepts: ["我在学中文。"] },
  { question: "认识你很高兴。", sound: "rènshi nǐ hěn gāoxìng.", meaning: "Prazer em conhecer você.",
    prompt: "Diga que o prazer é recíproco.", answer: "我也是。", pinyin: "wǒ yě shì.", pt: "Eu também." },
]);

export const IDENTITY_PERSON_NODES = turns("pessoa", "mei", [
  { question: "你好！你是学生吗？", sound: "nǐ hǎo! nǐ shì xuésheng ma?", meaning: "Olá! Você é estudante?",
    prompt: "Você é estudante. Responda e devolva a pergunta.", answer: "我是学生。你呢？", pinyin: "wǒ shì xuésheng. nǐ ne?", pt: "Sou estudante. E você?", accepts: ["是，我是学生。你呢？"] },
  { question: "我也是。这是你妈妈吗？", sound: "wǒ yě shì. zhè shì nǐ māma ma?", meaning: "Eu também. Esta é sua mãe?",
    prompt: "Mei aponta para sua mãe na foto. Apresente sua mãe.", answer: "这是我妈妈。", pinyin: "zhè shì wǒ māma.", pt: "Esta é minha mãe.", accepts: ["是，这是我妈妈。"] },
  { question: "你妈妈好吗？", sound: "nǐ māma hǎo ma?", meaning: "Sua mãe está bem?",
    prompt: "Sua mãe está bem. Responda falando dela, sem repetir a relação familiar.", answer: "她很好。", pinyin: "tā hěn hǎo.", pt: "Ela está bem." },
  { question: "这是你朋友吗？", sound: "zhè shì nǐ péngyou ma?", meaning: "Este é seu amigo?",
    prompt: "Em outra foto está Wang, seu amigo. Apresente seu amigo.", answer: "这是我朋友。", pinyin: "zhè shì wǒ péngyou.", pt: "Este é meu amigo." },
  { question: "他是学生吗？", sound: "tā shì xuésheng ma?", meaning: "Ele é estudante?",
    prompt: "Wang é estudante. Responda falando dele, sem repetir o nome.", answer: "他是学生。", pinyin: "tā shì xuésheng.", pt: "Ele é estudante.", accepts: ["是，他是学生。"] },
]);
