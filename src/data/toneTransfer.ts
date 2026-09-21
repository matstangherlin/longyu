/**
 * RC2.2.7 — Tone Transfer Closure.
 *
 * O tom sai do exercício de tom e entra na comunicação real.
 *
 * Até aqui o currículo tinha 190 tarefas com consciência tonal e **zero**
 * transferência: o aluno percebia contorno, escolhia número e marcava marca —
 * sempre dentro de um exercício cujo assunto era o tom. Nenhuma tarefa pedia
 * que ele usasse o tom para *dizer alguma coisa a alguém*.
 *
 * Este registro é a fonte única dessas tarefas. Ele não inventa vocabulário,
 * não cria teoria tonal nova e não abre lição nova: cada alvo já é ensinado na
 * própria lição onde a tarefa entra, e o que muda é o CONTEXTO — exatamente o
 * que `SUPPORT_FADING_POLICY.TRANSFER` descreve (`visibleSupport:
 * ["new context", "known structural frame"]`).
 *
 * HONESTIDADE (RC2.2.7 P0): `analyzePronunciation` compara sílabas em ordem e
 * não mede altura nem contorno. Por isso nenhum texto daqui afirma que o tom do
 * aluno está certo. `toneReminderPt`/`toneReminderEn` são LEMBRETE do alvo,
 * mostrados depois da tentativa — nunca avaliação. `validate:tone-transfer-honesty`
 * recusa qualquer frase que reivindique medição de tom.
 */

export type ToneNumber = 1 | 2 | 3 | 4;

/**
 * Onde a tarefa acontece.
 *
 * `conversation` obriga o passo a entrar IMEDIATAMENTE depois de uma
 * `conversation_scene` na mesma lição — e isso é verificado estruturalmente
 * contra `ALL_LESSONS`, não declarado de boa fé.
 */
export type ToneTransferContext = "conversation" | "situation";

/** Os três sandhi que o currículo já ensina. Nenhum é teoria nova aqui. */
export type ToneTransferSandhi = "third-third" | "bu" | "yi";

export type ToneTransferTask = {
  id: string;
  lessonId: string;
  context: ToneTransferContext;
  /** Cena que o passo retoma. Obrigatório quando `context === "conversation"`. */
  sceneId?: string;
  titlePt: string;
  titleEn: string;
  /** Situação em português, SEM hànzì: mostrar o alvo transformaria em cópia. */
  situationPt: string;
  situationEn: string;
  targetHanzi: string;
  targetPinyin: string;
  meaningPt: string;
  accepts?: readonly string[];
  /** Contornos que a frase realmente carrega. */
  tones: readonly ToneNumber[];
  sandhi?: readonly ToneTransferSandhi[];
  /** Lembrete do alvo tonal, DEPOIS da tentativa. Nunca diz que o tom saiu certo. */
  toneReminderPt: string;
  toneReminderEn: string;
};

/** Id de conhecimento por sandhi. Reusa `knowledgeTargetIds`, não cria sistema novo. */
export const TONE_SANDHI_TARGET_IDS: Record<ToneTransferSandhi, string> = {
  "third-third": "concept:tone-sandhi-third-third",
  bu: "concept:tone-sandhi-bu",
  yi: "concept:tone-sandhi-yi",
};

const SPEECH_HONESTY_PT = "O app confere as sílabas, não o tom — ouça o modelo e compare.";
const SPEECH_HONESTY_EN = "The app checks the syllables, not the tone — listen to the model and compare.";

export const TONE_TRANSFER_TASKS: readonly ToneTransferTask[] = [
  // ── l3 · Tudo bem? ──────────────────────────────────────────────────────
  {
    id: "tt-l3-estou-bem",
    lessonId: "l3",
    context: "conversation",
    sceneId: "perguntando-se-esta-bem",
    titlePt: "Diga que está bem",
    titleEn: "Say you are well",
    situationPt:
      "A conversa acabou e outra pessoa chega perguntando como você está. Responda em voz alta que você está bem.",
    situationEn:
      "The conversation is over and someone else comes up asking how you are. Say out loud that you are well.",
    targetHanzi: "我很好",
    targetPinyin: "wǒ hěn hǎo",
    meaningPt: "Estou bem",
    accepts: ["我很好。"],
    tones: [3],
    sandhi: ["third-third"],
    toneReminderPt: `Na fala, hěn hǎo sai hén hǎo: dois terceiros tons seguidos e o primeiro sobe. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `In speech, hěn hǎo comes out as hén hǎo: two third tones in a row and the first one rises. ${SPEECH_HONESTY_EN}`,
  },
  {
    id: "tt-l3-devolva-pergunta",
    lessonId: "l3",
    context: "situation",
    titlePt: "Devolva a pergunta em voz alta",
    titleEn: "Ask it back out loud",
    situationPt:
      "Você já disse que está bem. Agora pergunte à pessoa, em voz alta, se ela está bem.",
    situationEn:
      "You already said you are well. Now ask the other person, out loud, whether they are well.",
    targetHanzi: "你好吗？",
    targetPinyin: "nǐ hǎo ma?",
    meaningPt: "Tudo bem?",
    accepts: ["你好吗"],
    tones: [3],
    sandhi: ["third-third"],
    toneReminderPt: `nǐ hǎo tem a mesma dupla de terceiros tons de hěn hǎo: sai ní hǎo ma. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `nǐ hǎo has the same pair of third tones as hěn hǎo: it comes out as ní hǎo ma. ${SPEECH_HONESTY_EN}`,
  },

  // ── l4 · Obrigado ───────────────────────────────────────────────────────
  {
    id: "tt-l4-de-nada",
    lessonId: "l4",
    context: "conversation",
    sceneId: "agradecendo",
    titlePt: "Responda ao agradecimento",
    titleEn: "Answer the thanks",
    situationPt:
      "A cena terminou e a pessoa agradece mais uma vez, agora olhando para você. Responda em voz alta que não foi nada.",
    situationEn:
      "The scene is over and the person thanks you once more, now looking right at you. Say out loud that it was nothing.",
    targetHanzi: "不客气",
    targetPinyin: "bú kèqi",
    meaningPt: "De nada",
    accepts: ["不客气。"],
    tones: [2, 4],
    sandhi: ["bu"],
    toneReminderPt: `bù sobe para bú porque kè é quarto tom — a mesma regra que você viu nesta lição. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `bù rises to bú because kè is a fourth tone — the same rule you saw in this lesson. ${SPEECH_HONESTY_EN}`,
  },
  {
    id: "tt-l4-obrigado",
    lessonId: "l4",
    context: "situation",
    titlePt: "Agradeça em voz alta",
    titleEn: "Thank them out loud",
    situationPt:
      "Alguém segura a porta para você passar. Agradeça em voz alta, com a forma curta.",
    situationEn:
      "Someone holds the door open for you. Thank them out loud, using the short form.",
    targetHanzi: "谢谢",
    targetPinyin: "xièxie",
    meaningPt: "Obrigado(a)",
    accepts: ["谢谢。"],
    tones: [4],
    sandhi: [],
    toneReminderPt: `xiè é quarto tom: a voz cai. O segundo xie sai leve e curto, sem marca. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `xiè is a fourth tone: the voice falls. The second xie stays light and short, with no mark. ${SPEECH_HONESTY_EN}`,
  },

  // ── p3-wobuhui-shuo-zhongwen · 我不会说中文 ─────────────────────────────
  {
    id: "tt-p3wbh-nao-sei-falar",
    lessonId: "p3-wobuhui-shuo-zhongwen",
    context: "conversation",
    sceneId: "nao-falo-chinês",
    titlePt: "Proteja a conversa em voz alta",
    titleEn: "Protect the conversation out loud",
    situationPt:
      "Terminada a cena, outra pessoa começa a falar com você bem rápido. Diga em voz alta que você não sabe falar chinês.",
    situationEn:
      "Once the scene ends, someone else starts speaking to you very fast. Say out loud that you cannot speak Chinese.",
    targetHanzi: "我不会说中文",
    targetPinyin: "wǒ bú huì shuō Zhōngwén",
    meaningPt: "Não sei falar chinês",
    accepts: ["我不会说中文。"],
    tones: [1, 2, 3, 4],
    sandhi: ["bu"],
    toneReminderPt: `bù sobe para bú antes de huì, que é quarto tom; logo depois shuō volta ao primeiro, alto e reto. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `bù rises to bú before huì, a fourth tone; right after it shuō goes back to the first tone, high and level. ${SPEECH_HONESTY_EN}`,
  },
  {
    id: "tt-p3wbh-cumprimente",
    lessonId: "p3-wobuhui-shuo-zhongwen",
    context: "situation",
    titlePt: "Cumprimente antes de explicar",
    titleEn: "Greet before you explain",
    situationPt:
      "Antes de explicar que não fala chinês, cumprimente a pessoa em voz alta.",
    situationEn: "Before explaining that you cannot speak Chinese, greet the person out loud.",
    targetHanzi: "你好",
    targetPinyin: "nǐ hǎo",
    meaningPt: "Olá",
    accepts: ["你好。"],
    tones: [3],
    sandhi: ["third-third"],
    toneReminderPt: `nǐ hǎo são dois terceiros tons: na fala sai ní hǎo. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `nǐ hǎo is two third tones: in speech it comes out as ní hǎo. ${SPEECH_HONESTY_EN}`,
  },

  // ── p3-qing-zai-shuo-yibian · 请再说一遍 ────────────────────────────────
  {
    id: "tt-p3qzs-repita",
    lessonId: "p3-qing-zai-shuo-yibian",
    context: "conversation",
    sceneId: "pedir-repeticao",
    titlePt: "Peça a repetição em voz alta",
    titleEn: "Ask for the repeat out loud",
    situationPt:
      "Depois da cena, a pessoa responde e você perde de novo o que ela disse. Peça em voz alta, com educação, que ela fale de novo.",
    situationEn:
      "After the scene, the person answers and you miss what they said again. Ask out loud, politely, for them to say it again.",
    targetHanzi: "请再说一遍",
    targetPinyin: "qǐng zài shuō yí biàn",
    meaningPt: "Por favor, fale de novo",
    accepts: ["请再说一遍。"],
    tones: [1, 3, 4],
    sandhi: ["yi"],
    toneReminderPt: `yī vira yí porque biàn é quarto tom — por isso o fim sai yí biàn. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `yī becomes yí because biàn is a fourth tone — that is why the ending comes out as yí biàn. ${SPEECH_HONESTY_EN}`,
  },
  {
    // 我听不懂 seria o contraste natural aqui, mas esta lição vem ANTES de l11,
    // onde a frase é ensinada. Cobrar produção dela aqui seria teste-surpresa.
    id: "tt-p3qzs-estou-bem",
    lessonId: "p3-qing-zai-shuo-yibian",
    context: "situation",
    titlePt: "Responda antes de pedir a repetição",
    titleEn: "Answer before asking for the repeat",
    situationPt:
      "Antes de perder o fio da conversa, a pessoa tinha perguntado como você está. Responda em voz alta.",
    situationEn:
      "Before you lost the thread of the conversation, the person had asked how you are. Answer out loud.",
    targetHanzi: "我很好",
    targetPinyin: "wǒ hěn hǎo",
    meaningPt: "Estou bem",
    accepts: ["我很好。"],
    tones: [3],
    sandhi: ["third-third"],
    toneReminderPt: `Mesma dupla de terceiros tons, conversa diferente: hěn hǎo sai hén hǎo. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `Same pair of third tones, different conversation: hěn hǎo comes out as hén hǎo. ${SPEECH_HONESTY_EN}`,
  },

  // ── l9 · Meu nome é ─────────────────────────────────────────────────────
  {
    id: "tt-l9-sou-brasileiro",
    lessonId: "l9",
    context: "situation",
    titlePt: "Diga de onde você é",
    titleEn: "Say where you are from",
    situationPt:
      "Logo depois da apresentação, a pessoa quer saber de que país você é. Responda em voz alta.",
    situationEn:
      "Right after the introduction, the person wants to know which country you are from. Answer out loud.",
    targetHanzi: "我是巴西人",
    targetPinyin: "wǒ shì Bāxī rén",
    meaningPt: "Sou brasileiro",
    accepts: ["我是巴西人。"],
    tones: [1, 2, 3, 4],
    sandhi: [],
    toneReminderPt: `Os quatro contornos cabem nesta frase: wǒ desce e volta, shì cai, Bā e xī ficam altos e retos, rén sobe. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `All four contours fit in this sentence: wǒ dips, shì falls, Bā and xī stay high and level, rén rises. ${SPEECH_HONESTY_EN}`,
  },
  {
    // Âncora de conversa em l9. `我叫Matheus` seria o alvo óbvio logo depois da
    // cena, mas a situação diria "alguém quer saber o SEU nome" e só aceitaria
    // um nome fixo — e, em modo de fala, o trecho latino não sobreviveria ao
    // reconhecimento em zh-CN. 请坐 é do módulo 1, cabe na cena e é honesto.
    id: "tt-l9-sente-se",
    lessonId: "l9",
    context: "conversation",
    sceneId: "me-apresentando",
    titlePt: "Convide a pessoa a sentar",
    titleEn: "Invite them to sit",
    situationPt:
      "A pessoa entra na sala e continua de pé. Convide-a a sentar, em voz alta e com educação.",
    situationEn:
      "The person comes into the room and stays standing. Invite them to sit, out loud and politely.",
    targetHanzi: "请坐",
    targetPinyin: "qǐng zuò",
    meaningPt: "Sente-se, por favor",
    accepts: ["请坐。"],
    tones: [3, 4],
    sandhi: [],
    toneReminderPt: `qǐng desce e volta; zuò cai. Dois contornos diferentes em duas sílabas. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `qǐng dips; zuò falls. Two different contours in two syllables. ${SPEECH_HONESTY_EN}`,
  },

  // ── l11 · Não entendi ───────────────────────────────────────────────────
  {
    id: "tt-l11-repita",
    lessonId: "l11",
    context: "conversation",
    sceneId: "nao-entendi-reparo",
    titlePt: "Reparo em voz alta",
    titleEn: "Repair it out loud",
    situationPt:
      "A cena acabou e a pessoa voltou a falar rápido. Peça em voz alta que ela repita.",
    situationEn:
      "The scene is over and the person is speaking fast again. Ask out loud for them to repeat.",
    targetHanzi: "请再说一遍",
    targetPinyin: "qǐng zài shuō yí biàn",
    meaningPt: "Por favor, fale de novo",
    accepts: ["请再说一遍。"],
    tones: [1, 3, 4],
    sandhi: ["yi"],
    toneReminderPt: `Mesmo pedido, conversa diferente: yī continua virando yí antes de biàn, quarto tom. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `Same request, different conversation: yī still becomes yí before biàn, a fourth tone. ${SPEECH_HONESTY_EN}`,
  },
  {
    id: "tt-l11-mais-devagar",
    lessonId: "l11",
    context: "situation",
    titlePt: "Peça mais devagar",
    titleEn: "Ask them to slow down",
    situationPt:
      "A pessoa repetiu, mas continua rápido demais. Peça em voz alta que ela fale mais devagar.",
    situationEn:
      "The person repeated it, but they are still too fast. Ask out loud for them to speak more slowly.",
    targetHanzi: "请慢一点",
    targetPinyin: "qǐng màn yìdiǎn",
    meaningPt: "Por favor, mais devagar",
    accepts: ["请慢一点。"],
    tones: [3, 4],
    sandhi: ["yi"],
    toneReminderPt: `Aqui yī vira yì, e não yí, porque diǎn é terceiro tom. Compare com yí biàn, onde o que vem depois é quarto. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `Here yī becomes yì, not yí, because diǎn is a third tone. Compare it with yí biàn, where what follows is a fourth. ${SPEECH_HONESTY_EN}`,
  },

  // ── l11-falo-pouco · Falo um pouco ──────────────────────────────────────
  {
    id: "tt-l11fp-falo-um-pouco",
    lessonId: "l11-falo-pouco",
    context: "situation",
    titlePt: "Ajuste a expectativa em voz alta",
    titleEn: "Set the expectation out loud",
    situationPt:
      "A pessoa pergunta se você fala chinês e espera a resposta. Diga em voz alta que você fala um pouco.",
    situationEn:
      "The person asks whether you speak Chinese and waits for the answer. Say out loud that you speak a little.",
    targetHanzi: "我会说一点中文",
    targetPinyin: "wǒ huì shuō yìdiǎn Zhōngwén",
    meaningPt: "Sei falar um pouco de chinês",
    accepts: ["我会说一点中文。"],
    tones: [1, 3, 4],
    sandhi: ["yi"],
    toneReminderPt: `yī vira yì antes de diǎn, terceiro tom; e Zhōng volta ao primeiro, alto e reto. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `yī becomes yì before diǎn, a third tone; and Zhōng goes back to the first tone, high and level. ${SPEECH_HONESTY_EN}`,
  },
  {
    id: "tt-l11fp-estudo-chines",
    lessonId: "l11-falo-pouco",
    context: "situation",
    titlePt: "Conte o que você estuda",
    titleEn: "Tell them what you study",
    situationPt:
      "Na mesma conversa, a pessoa quer saber o que você estuda. Responda em voz alta que você estuda chinês.",
    situationEn:
      "In the same conversation, the person wants to know what you study. Answer out loud that you study Chinese.",
    targetHanzi: "我学习中文",
    targetPinyin: "wǒ xuéxí Zhōngwén",
    meaningPt: "Eu estudo chinês",
    accepts: ["我学习中文。"],
    tones: [1, 2, 3],
    sandhi: [],
    toneReminderPt: `xué e xí sobem, os dois são segundo tom; Zhōng é primeiro, alto e reto. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `xué and xí both rise, both are second tones; Zhōng is a first tone, high and level. ${SPEECH_HONESTY_EN}`,
  },
];

const BY_ID = new Map(TONE_TRANSFER_TASKS.map((task) => [task.id, task]));

export function toneTransferTaskById(id: string): ToneTransferTask {
  const task = BY_ID.get(id);
  if (!task) throw new Error(`Unknown tone transfer task: ${id}`);
  return task;
}

export function toneTransferTasksForLesson(lessonId: string): ToneTransferTask[] {
  return TONE_TRANSFER_TASKS.filter((task) => task.lessonId === lessonId);
}

/**
 * Alvos de conhecimento do passo. É ISTO que faz a tarefa contar como tonal em
 * `validate:tone-teach-before-test` — o metadado, não a palavra que o aluno lê.
 */
export function toneTransferKnowledgeTargetIds(task: ToneTransferTask): string[] {
  return [
    "concept:tone-system",
    ...task.tones.map((tone) => `concept:tone-${tone}`),
    ...(task.sandhi ?? []).map((rule) => TONE_SANDHI_TARGET_IDS[rule]),
  ];
}

/** Tons cobertos pelo conjunto inteiro — usado pelo gate de cobertura. */
export function toneTransferToneCoverage(): ToneNumber[] {
  const seen = new Set<ToneNumber>();
  for (const task of TONE_TRANSFER_TASKS) for (const tone of task.tones) seen.add(tone);
  return [...seen].sort((a, b) => a - b);
}

/** Sandhi cobertos pelo conjunto inteiro. */
export function toneTransferSandhiCoverage(): ToneTransferSandhi[] {
  const seen = new Set<ToneTransferSandhi>();
  for (const task of TONE_TRANSFER_TASKS) for (const rule of task.sandhi ?? []) seen.add(rule);
  return [...seen];
}
