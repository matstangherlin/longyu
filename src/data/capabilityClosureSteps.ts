/**
 * RC2.2.9 — passos que fecham buracos REAIS de runtime nas capacidades
 * conversacionais.
 *
 * A auditoria (validate:capability-runtime-evidence) mostrou que várias
 * capacidades tinham o material declarado em metadados — inclusive em
 * `lexicalLifecycleEntries.ts`, que já dizia "不要辣 é introduzido em l26b",
 * "微信支付 em l27", "我需要帮助 em l4" — mas o planner real nunca entregava
 * esse ensino ao aluno: o recorte de maestria descartava a apresentação e
 * mantinha só a cobrança. Aqui cada passo mora na lição que o próprio ciclo
 * lexical já declarava, usando chunks canônicos que já existiam no registry.
 *
 * Nada aqui cria vocabulário: flashcards apontam para `CHUNKS`, e as frases de
 * produção/escuta combinam palavras já ensinadas antes do ponto em que entram.
 * O planner aplica estes passos em `lessonRoundStepsFor` (ponto único), depois
 * do plano da lição — ensino no fim de uma rodada anterior à cobrança.
 */

import { POST_CONVERSATION_TASK_LABELS, type LessonStep } from "./journey";
import type { MasteryPass } from "./masteryLoop";
import { conversationSceneStepFromId } from "./conversationScenes";
import { makeReverseRecall } from "./exerciseFeasibility";

export interface CapabilityClosureEntry {
  /** Lição da Jornada onde o passo entra. */
  lessonId: string;
  /**
   * Rodadas de maestria em que o passo entra. Lição sem rodada de maestria
   * (revisão, imersão) tem uma única rodada, tratada como 1.
   */
  passes: readonly MasteryPass[];
  /** Capacidades que este passo sustenta (relatório e gates). */
  capabilityIds: readonly string[];
  /** Por que o passo existe: o buraco de runtime que ele fecha. */
  reason: string;
  step: LessonStep;
}

const flashcard = (chunkId: string): LessonStep => ({ kind: "flashcard", chunkId });

function listen(text: string, pinyin: string, pt: string): LessonStep {
  return { kind: "listen", text, pinyin, pt };
}

/** Ouvir e escolher o sentido: a informação vem do áudio, o texto não aparece antes. */
function hearMeaning(title: string, audioText: string, correctAnswer: string, options: string[]): LessonStep {
  return {
    kind: "audio_to_action",
    title,
    audioText,
    prompt: "Ouça e toque no que você ouviu.",
    correctAnswer,
    options,
  };
}

function build(title: string, prompt: string, target: string[], distractors: string[]): LessonStep {
  return {
    kind: "sentence_build",
    title,
    prompt,
    target,
    bank: [...target, ...distractors],
    correctAnswer: target.join(""),
  };
}

function recall(title: string, situationPt: string, answer: string, accepts: string[]): LessonStep {
  return makeReverseRecall(title, situationPt, answer, accepts);
}

/**
 * Tarefa da fase Pós-Conversa (validate:conversation-loop): consolida, logo
 * depois da cena, a fala que o aluno acabou de usar — em outra modalidade.
 */
function afterScene(
  sceneId: string,
  type: NonNullable<LessonStep["postConversationTaskType"]>,
  coveredRef: string,
  index: number,
  count: number,
  step: LessonStep
): LessonStep {
  return {
    ...step,
    title: POST_CONVERSATION_TASK_LABELS[type],
    postConversationPhase: true,
    postConversationTaskType: type,
    postConversationIndex: index,
    postConversationCount: count,
    conversationDerived: true,
    conversationSourceSceneId: sceneId,
    conversationCoveredRef: coveredRef,
    conversationModality: step.kind,
    conversationExposureNumber: index,
    conversationDerivedReason: "rule",
  };
}

function scene(sceneId: string): LessonStep {
  const found = conversationSceneStepFromId(sceneId);
  if (!found) throw new Error(`capabilityClosureSteps: cena desconhecida ${sceneId}`);
  return {
    kind: "conversation_scene",
    title: found.title,
    sceneId: found.sceneId,
    setting: found.setting,
    characters: found.characters,
    lines: found.lines,
    checkpoint: found.checkpoint,
    nodes: found.nodes,
    entryNodeId: found.entryNodeId,
    sceneIntent: found.intent,
    learnedRefs: found.learnedRefs,
    newRefs: found.newRefs,
  };
}

export const CAPABILITY_CLOSURE_STEPS: readonly CapabilityClosureEntry[] = [
  // ——— ask_for_help: o ciclo lexical introduz 我需要帮助 em l4; o runtime só
  // cobrava a frase em p6-survival-mandarin (M4), antes de qualquer ensino.
  {
    lessonId: "l4",
    passes: [1],
    capabilityIds: ["ask_for_help"],
    reason: "ensino de 我需要帮助 onde o ciclo lexical o declara (antes: cobrado sem ensino)",
    step: flashcard("woxuyaobangzhu"),
  },
  {
    lessonId: "l4",
    passes: [2],
    capabilityIds: ["ask_for_help"],
    reason: "escuta: entender um pedido de ajuda pelo áudio",
    step: hearMeaning("O que a pessoa precisa?", "我需要帮助", "Preciso de ajuda", [
      "Preciso de ajuda",
      "De nada",
      "Obrigado",
      "Até logo",
    ]),
  },
  // ——— make_simple_plan: 我们走吧 é introduzido em l11 no ciclo lexical; o
  // runtime o cobrava pela primeira vez por áudio em l28, sem ensino.
  {
    lessonId: "l11",
    passes: [1],
    capabilityIds: ["make_simple_plan"],
    reason: "ensino de 我们走吧 onde o ciclo lexical o declara",
    step: flashcard("womenzouba"),
  },
  // ——— talk_family: 我没有… só aparecia como exposição; faltavam escuta da
  // estrutura, produção e uso fora da foto de família.
  {
    lessonId: "l24",
    passes: [1],
    capabilityIds: ["talk_family"],
    reason: "escuta: entender 我没有姐姐 pelo áudio",
    step: hearMeaning("O que a pessoa contou?", "我没有姐姐", "Não tenho irmã mais velha", [
      "Não tenho irmã mais velha",
      "Tenho uma irmã mais velha",
      "Este é meu pai",
      "Esta é minha casa",
    ]),
  },
  {
    lessonId: "l24",
    passes: [2],
    capabilityIds: ["talk_family"],
    reason: "produção da estrutura 我没有…",
    step: build("Sem irmã mais velha", "Monte: Eu não tenho irmã mais velha.", ["我", "没有", "姐姐"], ["有", "哥哥"]),
  },
  // ——— order_food / order_drink: l26b é onde o ciclo lexical introduz os
  // pedidos (我想喝水, 我要水, 我想吃米饭, 不要辣, 肉, 鱼); o recorte de maestria
  // mantinha as cobranças e descartava as apresentações.
  {
    lessonId: "l26b",
    passes: [1],
    capabilityIds: ["order_drink"],
    reason: "ensino de 我想喝水 antes da produção em M3",
    step: flashcard("woxiangheshui"),
  },
  {
    lessonId: "l26b",
    passes: [1],
    capabilityIds: ["order_drink"],
    reason: "ensino de 我要水 antes da produção em M4",
    step: flashcard("woyaoshui"),
  },
  {
    lessonId: "l26b",
    passes: [1],
    capabilityIds: ["order_food"],
    reason: "ensino de 我想吃… antes da produção em l26c",
    step: flashcard("woxiangchimifan"),
  },
  {
    lessonId: "l26b",
    passes: [1],
    capabilityIds: ["order_food"],
    reason: "ensino de 不要辣 (nunca chegava ao aluno)",
    step: flashcard("buyaola"),
  },
  {
    lessonId: "l26b",
    passes: [1],
    capabilityIds: ["order_food"],
    reason: "ensino de 肉 (cobrado depois em opções e transferências)",
    step: flashcard("woyaorou"),
  },
  {
    lessonId: "l26b",
    passes: [1],
    capabilityIds: ["order_food"],
    reason: "ensino de 鱼 (cobrado depois em 我想吃鱼)",
    step: flashcard("woyaoyu"),
  },
  {
    lessonId: "l26b",
    passes: [2],
    capabilityIds: ["order_food"],
    reason: "escuta: entender a restrição 不要辣 pelo áudio",
    step: hearMeaning("O que o cliente pediu?", "不要辣", "Sem pimenta", ["Sem pimenta", "Mais arroz", "A conta", "Um chá"]),
  },
  {
    lessonId: "l26b",
    passes: [3],
    capabilityIds: ["order_food"],
    reason: "produção de pedido com restrição",
    step: build("Pedido com restrição", "Monte: Quero arroz, sem pimenta.", ["我", "要", "米饭", "不要", "辣"], ["茶", "肉"]),
  },
  {
    lessonId: "l26b",
    passes: [4],
    capabilityIds: ["order_food"],
    reason: "uso de 不要辣 numa situação, sem alternativas",
    step: recall(
      "Sem pimenta",
      "O garçom pergunta se pode colocar pimenta no seu prato. Você não come comida picante. Responda.",
      "不要辣",
      ["不要辣", "不要辣。", "不要辣，谢谢", "不要辣，谢谢。"]
    ),
  },
  // ——— pay / negotiate_basic: l27 é onde o ciclo lexical introduz 微信支付,
  // 现金 e 可以刷卡吗; 便宜一点 era só ouvido, nunca produzido nem entendido.
  {
    lessonId: "l27",
    passes: [1],
    capabilityIds: ["pay"],
    reason: "ensino de 微信支付 onde o ciclo lexical o declara",
    step: flashcard("weixinzhifu"),
  },
  {
    lessonId: "l27",
    passes: [1],
    capabilityIds: ["pay"],
    reason: "ensino de 现金 onde o ciclo lexical o declara",
    step: flashcard("xianjin"),
  },
  {
    lessonId: "l27",
    passes: [1],
    capabilityIds: ["pay"],
    reason: "ensino de 可以刷卡吗 antes da cobrança em p6-survival-mandarin",
    step: flashcard("keyishuaka"),
  },
  {
    lessonId: "l27",
    passes: [1],
    capabilityIds: ["negotiate_basic"],
    reason: "ensino de 太贵了 antes da produção em M3 (antes: só aparecia depois, em p6-compras)",
    step: flashcard("taiguile"),
  },
  {
    lessonId: "l27",
    passes: [2],
    capabilityIds: ["negotiate_basic"],
    reason: "escuta: entender o pedido de desconto pelo áudio",
    step: hearMeaning("O que o cliente pediu?", "便宜一点", "Mais barato, por favor", [
      "Mais barato, por favor",
      "Está caro demais",
      "Quanto custa?",
      "Quero este",
    ]),
  },
  {
    lessonId: "l27",
    passes: [3],
    capabilityIds: ["negotiate_basic"],
    reason: "produção de 便宜一点 (antes só ouvido)",
    step: build("Peça desconto", "Monte: Está caro demais. Mais barato, por favor.", ["太", "贵", "了", "便宜", "一点"], ["多少", "钱"]),
  },
  {
    lessonId: "l27",
    passes: [4],
    capabilityIds: ["negotiate_basic"],
    reason: "negociação numa situação nova, sem alternativas",
    step: recall(
      "Pechincha",
      "No mercado, o vendedor diz o preço e você acha caro. Reclame do preço e peça um desconto.",
      "太贵了，便宜一点",
      ["太贵了，便宜一点", "太贵了，便宜一点。", "太贵了。便宜一点。", "太贵了！便宜一点！", "太贵了，便宜一点吧"]
    ),
  },
  // ——— express_preference: 我不喜欢… não existia em runtime, e não havia
  // conversa nem escuta de preferência.
  {
    lessonId: "l28",
    passes: [1],
    capabilityIds: ["express_preference"],
    reason: "ensino de 我不喜欢…",
    step: listen("我不喜欢肉", "wǒ bù xǐhuan ròu", "Eu não gosto de carne."),
  },
  {
    lessonId: "l28",
    passes: [2],
    capabilityIds: ["express_preference"],
    reason: "escuta: entender uma preferência negativa pelo áudio",
    step: hearMeaning("Do que a pessoa não gosta?", "我不喜欢茶", "Não gosto de chá", [
      "Não gosto de chá",
      "Gosto de chá",
      "Quero chá",
      "Quero beber água",
    ]),
  },
  {
    lessonId: "l28",
    passes: [3],
    capabilityIds: ["express_preference"],
    reason: "produção de 我不喜欢…",
    step: build("Uma preferência negativa", "Monte: Eu não gosto de carne.", ["我", "不", "喜欢", "肉"], ["吃", "茶"]),
  },
  {
    lessonId: "l28",
    passes: [4],
    capabilityIds: ["express_preference"],
    reason: "conversa: dizer do que gosta e do que não gosta, e aceitar a proposta",
    step: scene("gostos-na-casa"),
  },
  {
    lessonId: "l28",
    passes: [4],
    capabilityIds: ["express_preference"],
    reason: "pós-conversa: remontar a preferência usada na cena",
    step: afterScene("gostos-na-casa", "build_used_answer", "chunk:woxihuan", 1, 2, {
      kind: "sentence_build",
      prompt: "Monte: Eu gosto de chá.",
      target: ["我", "喜欢", "茶"],
      bank: ["我", "喜欢", "茶", "不", "肉"],
      correctAnswer: "我喜欢茶",
    }),
  },
  {
    lessonId: "l28",
    passes: [4],
    capabilityIds: ["express_preference"],
    reason: "pós-conversa: a mesma preferência numa situação nova",
    step: afterScene("gostos-na-casa", "situation_reply", "chunk:woxihuan", 2, 2, {
      kind: "contextual_choice",
      situationPt: "Mei oferece carne de novo. Você não gosta. O que diz?",
      dialoguePrompt: "Mei oferece carne de novo. Você não gosta. O que diz?",
      speaker: "Situação",
      correctAnswer: "我不喜欢肉",
      options: ["我不喜欢肉", "我喜欢肉", "我要一杯茶", "再见"],
    }),
  },
  // ——— use_metro / make_simple_plan / airport_basic: p6-cidade-lugares é
  // onde o ciclo lexical introduz 我要去北京, 我坐飞机 e 飞机场在哪里.
  {
    lessonId: "p6-cidade-lugares",
    passes: [1],
    capabilityIds: ["make_simple_plan"],
    reason: "ensino de 我要去… antes da produção em p6-china-cidades",
    step: flashcard("woyaoqubeijing"),
  },
  {
    lessonId: "p6-cidade-lugares",
    passes: [1],
    capabilityIds: ["airport_basic"],
    reason: "ensino de 我坐飞机 (nunca chegava ao aluno)",
    step: flashcard("wozuofeiji"),
  },
  {
    lessonId: "p6-cidade-lugares",
    passes: [1],
    capabilityIds: ["airport_basic"],
    reason: "ensino de 飞机场在哪里 (nunca chegava ao aluno)",
    step: flashcard("feijichangzainali"),
  },
  {
    lessonId: "p6-china-cidades",
    passes: [3],
    capabilityIds: ["use_metro"],
    reason: "produção de 我坐地铁 (antes só reconhecida na conversa)",
    step: build("De metrô", "Monte: Eu vou de metrô.", ["我", "坐", "地铁"], ["去", "北京"]),
  },
  {
    lessonId: "p6-china-cidades-2",
    passes: [1],
    capabilityIds: ["airport_basic"],
    reason: "ensino de 我的航班在哪里 onde o ciclo lexical o declara",
    step: flashcard("wodehangbanzainali"),
  },
  // ——— talk_routine / tell_time / weather_smalltalk: chunks declarados que
  // o runtime nunca mostrava.
  {
    lessonId: "p6-rotina-trabalho",
    passes: [1],
    capabilityIds: ["talk_routine"],
    reason: "ensino de 我吃早饭 onde o ciclo lexical o declara",
    step: flashcard("wochizaofan"),
  },
  {
    lessonId: "p6-rotina-trabalho",
    passes: [2],
    capabilityIds: ["talk_routine"],
    reason: "escuta: entender a rotina pelo áudio (não havia nenhuma)",
    step: hearMeaning("Que horas a pessoa acorda?", "我七点起床", "Eu acordo às sete", [
      "Eu acordo às sete",
      "Eu durmo às sete",
      "Eu volto para casa às sete",
      "Eu trabalho às sete",
    ]),
  },
  {
    lessonId: "p6-horarios",
    passes: [1],
    capabilityIds: ["tell_time"],
    reason: "ensino de 下午三点 onde o ciclo lexical o declara",
    step: flashcard("xiawusandian"),
  },
  {
    lessonId: "p6-horarios",
    passes: [1],
    capabilityIds: ["tell_time"],
    reason: "ensino de 九点十分 onde o ciclo lexical o declara",
    step: flashcard("jiudianshifen"),
  },
  {
    lessonId: "p6-horarios",
    passes: [1],
    capabilityIds: ["weather_smalltalk"],
    reason: "ensino de 天气很热 onde o ciclo lexical o declara",
    step: flashcard("tianqihenre"),
  },
  {
    lessonId: "p6-horarios",
    passes: [1],
    capabilityIds: ["weather_smalltalk"],
    reason: "ensino de 天气很冷 onde o ciclo lexical o declara",
    step: flashcard("tianqihenleng"),
  },
  // ——— use_taxi / health_basic: nenhuma escuta de runtime.
  {
    lessonId: "p6-china-ruas",
    passes: [2],
    capabilityIds: ["use_taxi"],
    reason: "escuta: entender o destino dito ao motorista",
    step: hearMeaning("Para onde o passageiro vai?", "我要去酒店", "Quero ir ao hotel", [
      "Quero ir ao hotel",
      "Quero ir ao metrô",
      "Onde fica o hotel?",
      "Quanto custa?",
    ]),
  },
  {
    lessonId: "p6-saude",
    passes: [2],
    capabilityIds: ["health_basic"],
    reason: "escuta: entender o sintoma pelo áudio",
    step: hearMeaning("O que a pessoa sente?", "我头疼", "Estou com dor de cabeça", [
      "Estou com dor de cabeça",
      "Estou com dor de barriga",
      "Estou com febre",
      "Estou bem",
    ]),
  },
  // ——— ask_directions: nenhuma conversa em que o aluno pede o caminho.
  {
    lessonId: "p6-direcoes",
    passes: [4],
    capabilityIds: ["ask_directions"],
    reason: "conversa: pedir o caminho e entender a instrução",
    step: scene("perguntar-o-caminho"),
  },
  {
    lessonId: "p6-direcoes",
    passes: [4],
    capabilityIds: ["ask_directions"],
    reason: "pós-conversa: remontar a pergunta de caminho usada na cena",
    step: afterScene("perguntar-o-caminho", "build_used_answer", "chunk:zenmezou", 1, 2, {
      kind: "sentence_build",
      prompt: "Monte: Como chego à estação de metrô?",
      target: ["地铁站", "怎么", "走"],
      bank: ["地铁站", "怎么", "走", "在", "哪里"],
      correctAnswer: "地铁站怎么走",
    }),
  },
  {
    lessonId: "p6-direcoes",
    passes: [4],
    capabilityIds: ["ask_directions"],
    reason: "pós-conversa: a mesma pergunta para outro destino",
    step: afterScene("perguntar-o-caminho", "situation_reply", "chunk:zenmezou", 2, 2, {
      kind: "contextual_choice",
      situationPt: "Agora você quer voltar ao hotel e não sabe o caminho. O que pergunta?",
      dialoguePrompt: "Agora você quer voltar ao hotel e não sabe o caminho. O que pergunta?",
      speaker: "Situação",
      correctAnswer: "酒店怎么走？",
      options: ["酒店怎么走？", "我坐地铁", "地铁站在左边", "谢谢"],
    }),
  },
  // ——— use_train: nenhuma escuta de trem e nenhum pedido de bilhete no guichê.
  {
    lessonId: "p7-imersao-estacao",
    passes: [2],
    capabilityIds: ["use_train"],
    reason: "escuta: entender a pergunta pela estação de trem",
    step: hearMeaning("O que a pessoa procura?", "火车站在哪里？", "A estação de trem", [
      "A estação de trem",
      "A estação de metrô",
      "O preço do bilhete",
      "O hotel",
    ]),
  },
  {
    lessonId: "p7-imersao-estacao",
    passes: [3],
    capabilityIds: ["use_train"],
    reason: "pedido de bilhete no guichê do trem, sem alternativas",
    step: recall("No guichê do trem", "Você está no guichê da estação de trem. Peça um bilhete.", "我要票", [
      "我要票",
      "我要票。",
      "我要火车票",
    ]),
  },
  // ——— weather_smalltalk / make_simple_plan: transferência em conversa
  // cotidiana (antes: nenhuma transferência de clima; plano só como despedida).
  {
    lessonId: "p7-conversa-cotidiana",
    passes: [1],
    capabilityIds: ["weather_smalltalk"],
    reason: "transferência: falar do tempo numa conversa nova",
    step: recall("Como está o tempo?", "Um colega pergunta como está o tempo hoje. Está muito quente. Responda.", "今天很热", [
      "今天很热",
      "今天很热。",
      "天气很热",
      "今天天气很热",
    ]),
  },
  {
    lessonId: "p7-conversa-cotidiana",
    passes: [1],
    capabilityIds: ["make_simple_plan"],
    reason: "plano simples: quando + destino",
    step: recall("Plano para amanhã", "Um amigo pergunta o que você vai fazer amanhã. Diga que amanhã você vai a Pequim.", "明天我要去北京", [
      "明天我要去北京",
      "明天我要去北京。",
      "我明天要去北京",
      "我明天要去北京。",
    ]),
  },
  // ——— talk_family / express_preference: transferência na visita à casa.
  {
    lessonId: "p7-imersao-casa-amigo",
    passes: [3],
    capabilityIds: ["talk_family"],
    reason: "transferência: falar dos irmãos numa visita (visit-home)",
    step: recall(
      "Na casa do amigo",
      "Na casa do seu amigo, a mãe dele pergunta se você tem irmãos. Responda que tem um irmão mais velho e que não tem irmã mais velha.",
      "我有一个哥哥，我没有姐姐",
      ["我有一个哥哥，我没有姐姐", "我有一个哥哥，我没有姐姐。", "我有一个哥哥。我没有姐姐。", "我有哥哥，我没有姐姐"]
    ),
  },
  {
    lessonId: "p7-imersao-casa-amigo",
    passes: [4],
    capabilityIds: ["express_preference"],
    reason: "transferência: recusar com educação um prato de que não gosta",
    step: recall(
      "Na mesa do amigo",
      "Na casa do seu amigo, ele oferece carne. Você não gosta. Agradeça e diga isso.",
      "谢谢，我不喜欢肉",
      ["谢谢，我不喜欢肉", "谢谢，我不喜欢肉。", "谢谢。我不喜欢肉。", "我不喜欢肉，谢谢"]
    ),
  },
];

/** Passos de fechamento da lição naquela rodada, na ordem declarada. */
export function capabilityClosureStepsFor(lessonId: string, pass: MasteryPass): LessonStep[] {
  return CAPABILITY_CLOSURE_STEPS.filter(
    (entry) => entry.lessonId === lessonId && entry.passes.includes(pass)
  ).map((entry) => ({ ...entry.step }));
}
