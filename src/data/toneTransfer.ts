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
  // ── p1-ate-logo · Até logo ──────────────────────────────────────────────
  {
    id: "tt-p1ate-ate-logo",
    lessonId: "p1-ate-logo",
    context: "conversation",
    sceneId: "despedida",
    titlePt: "Despeça-se em voz alta",
    titleEn: "Say goodbye out loud",
    situationPt:
      "A conversa terminou e a pessoa já está saindo. Despeça-se em voz alta antes que ela vá.",
    situationEn:
      "The conversation is over and the person is already leaving. Say goodbye out loud before they go.",
    targetHanzi: "再见",
    targetPinyin: "zàijiàn",
    meaningPt: "Até logo",
    accepts: ["再见。"],
    tones: [4],
    sandhi: [],
    toneReminderPt: `zài e jiàn caem os dois: quarto tom seguido de quarto tom. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `zài and jiàn both fall: a fourth tone followed by a fourth tone. ${SPEECH_HONESTY_EN}`,
  },

  // ── p1-qingwen-cortesia · Com licença ───────────────────────────────────
  {
    id: "tt-p1qw-com-licenca",
    lessonId: "p1-qingwen-cortesia",
    context: "conversation",
    sceneId: "cortesia-loja",
    titlePt: "Peça licença em voz alta",
    titleEn: "Excuse yourself out loud",
    situationPt:
      "Saindo da loja, você precisa interromper alguém para perguntar uma coisa. Peça licença em voz alta antes de falar.",
    situationEn:
      "On your way out of the shop, you need to interrupt someone to ask something. Excuse yourself out loud before speaking.",
    targetHanzi: "请问",
    targetPinyin: "qǐng wèn",
    meaningPt: "Com licença, posso perguntar?",
    accepts: ["请问。", "请问，"],
    tones: [3, 4],
    sandhi: [],
    toneReminderPt: `qǐng desce e volta; wèn cai. É a mesma dupla de contornos de qǐng zuò. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `qǐng dips; wèn falls. It is the same pair of contours as qǐng zuò. ${SPEECH_HONESTY_EN}`,
  },

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

  // ── l4 · Obrigado ───────────────────────────────────────────────────────
  {
    // 不客气 já era resposta correta três vezes nesta lição antes desta remessa:
    // uma quarta ocorrência transformaria produção em decoreba, e
    // `validate:exercise-depth` recusa com razão. 没关系 é ensinado aqui e usado
    // como resposta uma única vez — mas só DEPOIS da cena, então esta tarefa
    // deixa de ser ancorada em conversa. Preferi perder a âncora a empurrar
    // repetição, e a lição não foi reescrita para abrir espaço para mim.
    id: "tt-l4-sem-problema",
    lessonId: "l4",
    context: "situation",
    titlePt: "Acalme quem pediu desculpa",
    titleEn: "Reassure someone who apologised",
    situationPt:
      "A pessoa esbarra em você e pede desculpa, visivelmente sem graça. Diga em voz alta que não tem problema.",
    situationEn:
      "Someone bumps into you and apologises, clearly embarrassed. Say out loud that it is not a problem.",
    targetHanzi: "没关系",
    targetPinyin: "méi guānxi",
    meaningPt: "Não tem problema",
    accepts: ["没关系。"],
    tones: [1, 2],
    sandhi: [],
    toneReminderPt: `méi sobe, guān fica alto e reto, e xi sai leve e curto, sem marca. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `méi rises, guān stays high and level, and xi comes out light and short, with no mark. ${SPEECH_HONESTY_EN}`,
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

  // ── l9 · Meu nome é ─────────────────────────────────────────────────────
  {
    // A âncora de conversa de l9. `我叫Matheus` seria o alvo óbvio logo depois da
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

  // ── l9-tudo-bem · Tudo bem? ─────────────────────────────────────────────
  {
    id: "tt-l9tb-pergunte-de-volta",
    lessonId: "l9-tudo-bem",
    context: "conversation",
    sceneId: "perguntando-se-esta-bem",
    titlePt: "Pergunte de volta em voz alta",
    titleEn: "Ask them back out loud",
    situationPt:
      "A pessoa contou como está e ficou esperando. Pergunte em voz alta se ela está bem.",
    situationEn:
      "The person told you how they are and is waiting. Ask out loud whether they are well.",
    targetHanzi: "你好吗？",
    targetPinyin: "nǐ hǎo ma?",
    meaningPt: "Tudo bem?",
    accepts: ["你好吗"],
    tones: [3],
    sandhi: ["third-third"],
    toneReminderPt: `nǐ hǎo são dois terceiros tons seguidos: sai ní hǎo ma. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `nǐ hǎo is two third tones in a row: it comes out as ní hǎo ma. ${SPEECH_HONESTY_EN}`,
  },

  // ── l10 · De onde sou ───────────────────────────────────────────────────
  {
    id: "tt-l10-sou-brasileiro",
    lessonId: "l10",
    context: "conversation",
    sceneId: "de-onde-sou",
    titlePt: "Diga de onde você é",
    titleEn: "Say where you are from",
    situationPt:
      "Terminada a cena, outra pessoa entra na roda e quer saber de que país você é. Responda em voz alta.",
    situationEn:
      "Once the scene ends, another person joins the circle and wants to know which country you are from. Answer out loud.",
    targetHanzi: "我是巴西人",
    targetPinyin: "wǒ shì Bāxī rén",
    meaningPt: "Sou brasileiro",
    accepts: ["我是巴西人。"],
    tones: [1, 2, 3, 4],
    sandhi: [],
    toneReminderPt: `Os quatro contornos cabem nesta frase: wǒ desce e volta, shì cai, Bā e xī ficam altos e retos, rén sobe. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `All four contours fit in this sentence: wǒ dips, shì falls, Bā and xī stay high and level, rén rises. ${SPEECH_HONESTY_EN}`,
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

  // ── l13 · Combinar de novo ──────────────────────────────────────────────
  {
    id: "tt-l13-ate-amanha",
    lessonId: "l13",
    context: "conversation",
    sceneId: "encontro-amanha",
    titlePt: "Combine o reencontro em voz alta",
    titleEn: "Agree on meeting again, out loud",
    situationPt:
      "Ficou combinado que vocês se veem no dia seguinte. Encerre a conversa em voz alta dizendo isso.",
    situationEn:
      "You have agreed to see each other the next day. Close the conversation out loud by saying so.",
    targetHanzi: "明天见",
    targetPinyin: "míngtiān jiàn",
    meaningPt: "Até amanhã",
    accepts: ["明天见。"],
    tones: [1, 2, 4],
    sandhi: [],
    toneReminderPt: `Três contornos em três sílabas: míng sobe, tiān fica alto e reto, jiàn cai. ${SPEECH_HONESTY_PT}`,
    toneReminderEn: `Three contours in three syllables: míng rises, tiān stays high and level, jiàn falls. ${SPEECH_HONESTY_EN}`,
  },

  // ── l11-falo-pouco · Falo um pouco ──────────────────────────────────────
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
