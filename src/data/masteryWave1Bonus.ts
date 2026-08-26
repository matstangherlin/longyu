/**
 * Pedagogia V3.3 — Mastery Wave 1 bonus steps.
 *
 * Passos bonus (exigencia cognitiva distinta por pass) para as 24 licoes da
 * Wave 1 (ver masteryCoverage.ts / masteryPilot.ts). Extraido para um arquivo
 * proprio para manter masteryPilot.ts enxuto — chamado de
 * masteryBonusStepsFor() como fallback antes do `return []`.
 *
 * Helpers duplicados intencionalmente (nao importados de masteryPilot.ts)
 * para evitar dependencia circular entre os dois modulos.
 */
import type { LessonStep } from "./journey";
import type { MasteryPass } from "./masteryLoop";
import { withEquivalentAccepts } from "./masteryLoop";
import { makeReverseRecall } from "./exerciseFeasibility";

function contextualChoice(
  title: string,
  situationPt: string,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep {
  return {
    kind: "contextual_choice",
    title,
    situationPt,
    dialoguePrompt: situationPt,
    correctAnswer,
    options,
    explanation,
    speaker: "Situacao",
  };
}

function audioToAction(
  title: string,
  audioText: string,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep {
  return {
    kind: "audio_to_action",
    title,
    audioText,
    prompt: "Ouca e escolha a acao/imagem correspondente.",
    correctAnswer,
    options,
    explanation,
  };
}

function sentenceTransform(
  title: string,
  sourceHanzi: string,
  targetParts: string[],
  bank: string[],
  promptPt: string,
  explanation?: string
): LessonStep {
  return {
    kind: "sentence_transform",
    title,
    sourceText: sourceHanzi,
    prompt: promptPt,
    targetParts,
    bank,
    explanation,
  };
}

function substitutionDrill(
  title: string,
  patternBefore: string,
  blankAnswer: string,
  options: string[],
  promptPt: string,
  explanation?: string
): LessonStep {
  return {
    kind: "substitution_drill",
    title,
    sentenceBefore: patternBefore,
    blankAnswer,
    options,
    prompt: promptPt,
    explanation,
  };
}

function dialogueCompletion(
  title: string,
  dialoguePrompt: string,
  correctAnswer: string,
  options: string[],
  explanation?: string
): LessonStep {
  return {
    kind: "dialogue_completion",
    title,
    dialoguePrompt,
    correctAnswer,
    options,
    explanation,
    speaker: "Dialogo",
  };
}

function reverseRecall(title: string, situationPt: string, answer: string, accepts?: string[]): LessonStep {
  return makeReverseRecall(title, situationPt, answer, accepts);
}

/** Bonus por licao/pass — Wave 1 (V3.3). Ver masteryCoverage.ts para o mapa completo. */
export function wave1BonusStepsFor(lessonId: string, pass: MasteryPass): LessonStep[] {
  if (lessonId === "p1-ate-logo") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Hora de ir",
          "Voce esta de saida e quer se despedir.",
          "再见",
          ["再见", "你好", "谢谢", "不客气"],
          "再见 encerra a conversa."
        ),
        audioToAction("Ouca a despedida", "再见", "再见", ["再见", "你好", "谢谢", "我很好"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Chegar vs. sair",
          "Alguem chega e voce diz 你好. Alguem sai. O que voce diz?",
          "再见",
          ["再见", "你好", "谢谢", "不客气"],
          "再见 e o oposto funcional de 你好."
        ),
        dialogueCompletion(
          "Encerrar com cortesia",
          "A: 谢谢！ B: ___",
          "再见",
          ["再见", "你好", "不客气", "多少钱"],
          "Depois de agradecer, a despedida fecha a troca."
        ),
      ];
    }
    if (pass === 3) {
      return [
        reverseRecall("Diga sozinho", "Despeca-se de alguem em chines.", "再见", ["再见", "再见！"]),
        dialogueCompletion(
          "Complete a troca",
          "A: 谢谢！ B: 不客气！ A: ___",
          "再见",
          ["再见", "你好", "谢谢", "多少钱"],
          "A despedida fecha a sequencia social."
        ),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall("Transferencia", "A festa acabou. Despeca-se de todos.", "再见", ["再见", "再见！"])
      ),
      dialogueCompletion(
        "Novo encontro",
        "NPC: 谢谢，再见！ Voce: ___",
        "再见",
        ["再见", "你好吗？", "多少钱", "我要这个"],
        "Mesmo em situacao nova, 再见 fecha o encontro."
      ),
    ];
  }

  if (lessonId === "p1-qingwen-cortesia") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Abrir com cortesia",
          "Voce quer perguntar algo a um estranho na rua. Como comeca?",
          "请问",
          ["请问", "再见", "谢谢", "不客气"],
          "请问 abre a pergunta com educacao."
        ),
        audioToAction("Ouca a abertura", "请问", "请问", ["请问", "谢谢", "再见", "你好吗"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar",
          "Qual frase NAO agradece, apenas abre uma pergunta?",
          "请问",
          ["请问", "谢谢", "不客气", "再见"],
          "请问 nao agradece; abre a pergunta."
        ),
        substitutionDrill(
          "Complete a abertura",
          "请问，___？",
          "你好吗",
          ["你好吗", "再见", "谢谢", "多少钱"],
          "Depois de 请问 voce pode perguntar se esta tudo bem."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Junte a abertura",
          "请问",
          ["请", "问", "，", "你", "好", "吗"],
          ["请", "问", "，", "你", "好", "吗", "谢", "再"],
          "Transforme 请问 na abertura completa: 请问，你好吗？"
        ),
        reverseRecall("Produza a abertura", "Peca licenca para fazer uma pergunta.", "请问", ["请问", "请问。"]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall("Transferencia", "Voce esta perdido e quer perguntar a um estranho.", "请问", ["请问", "请问。"])
      ),
      dialogueCompletion(
        "Na rua",
        "Estranho: 你好！ Voce: ___ 你好吗？",
        "请问",
        ["请问", "谢谢", "再见", "多少钱"],
        "请问 abre a pergunta mesmo em situacao nova."
      ),
    ];
  }

  if (lessonId === "p1-primeira-conversa") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Primeiro passo",
          "Voce encontra alguem por acaso. Primeira coisa a dizer?",
          "你好",
          ["你好", "谢谢", "再见", "不客气"],
          "你好 abre qualquer encontro."
        ),
      ];
    }
    if (pass === 2) {
      return [
        dialogueCompletion(
          "Encadeie a pergunta",
          "A: 你好！ 你好吗？ B: ___",
          "我很好",
          ["我很好", "再见", "谢谢", "我叫Matheus"],
          "我很好 responde a pergunta de bem-estar."
        ),
        substitutionDrill(
          "Complete o agradecimento",
          "A ajudou. B: ___",
          "谢谢",
          ["谢谢", "再见", "你好", "不客气"],
          "谢谢 agradece a ajuda."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Monte a despedida completa",
          "谢谢",
          ["不", "客", "气", "，", "再", "见"],
          ["不", "客", "气", "，", "再", "见", "你", "好"],
          "Transforme o agradecimento na resposta e despedida: 不客气，再见。"
        ),
        reverseRecall("Produza sem apoio", "Termine a conversa educadamente.", "再见", ["再见", "再见！"]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Conversa inteira",
          "Do inicio ao fim: cumprimente, responda que esta bem e se despeca.",
          "你好，我很好，再见",
          ["你好，我很好，再见", "你好, 我很好, 再见", "你好我很好再见"]
        )
      ),
      dialogueCompletion(
        "Situacao nova",
        "NPC: 你好吗？ Voce: 我很好，谢谢！ NPC: ___",
        "不客气",
        ["不客气", "再见", "你好", "多少钱"],
        "不客气 responde o agradecimento antes de se despedir."
      ),
    ];
  }

  if (lessonId === "l9") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Apresente-se",
          "Alguem pergunta seu nome. O que voce diz?",
          "我叫Matheus",
          ["我叫Matheus", "我很好", "再见", "谢谢"],
          "我叫 + nome apresenta quem voce e."
        ),
        audioToAction("Ouca a apresentacao", "我叫Matheus", "我叫Matheus", ["我叫Matheus", "我是巴西人", "我很好", "谢谢"]),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Troque o nome",
          "我叫___",
          "Ana",
          ["Ana", "Matheus", "中国", "朋友"],
          "我叫 + nome muda o nome, mantem a estrutura."
        ),
        contextualChoice(
          "Discriminar",
          "Qual frase apresenta o NOME, e nao a nacionalidade?",
          "我叫Matheus",
          ["我叫Matheus", "我是巴西人", "你好吗？", "谢谢"],
          "我叫 apresenta o nome; 我是 apresenta a nacionalidade."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Monte com outro nome",
          "我叫Matheus",
          ["我", "叫", "Ana"],
          ["我", "叫", "Ana", "你", "什么"],
          "Troque o nome mantendo a estrutura 我叫 + nome."
        ),
        withEquivalentAccepts(
          reverseRecall("Diga seu nome", "Apresente-se dizendo seu nome.", "我叫Matheus", ["我叫Matheus"])
        ),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Transferencia",
          "Alguem que voce nunca viu, numa festa, pergunta quem voce e.",
          "我叫Matheus",
          ["我叫Matheus"]
        )
      ),
      dialogueCompletion(
        "Nova pessoa",
        "NPC: 你好！你叫什么？ Voce: ___",
        "我叫Matheus",
        ["我叫Matheus", "我很好", "再见", "多少钱"],
        "我叫 + nome responde a pergunta do nome em qualquer situacao."
      ),
    ];
  }

  if (lessonId === "l9-qual-nome") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Pergunte o nome",
          "Voce quer saber como a pessoa se chama.",
          "你叫什么？",
          ["你叫什么？", "你好吗？", "多少钱？", "再见"],
          "你叫什么？ pergunta o nome de alguem."
        ),
        audioToAction("Ouca a pergunta", "你叫什么", "你叫什么？", ["你叫什么？", "你好吗？", "谢谢", "再见"]),
      ];
    }
    if (pass === 2) {
      return [
        dialogueCompletion(
          "Complete a resposta",
          "A: 你叫什么？ B: ___",
          "我叫Matheus",
          ["我叫Matheus", "我很好", "再见", "多少钱"],
          "我叫 + nome responde a pergunta."
        ),
        contextualChoice(
          "Discriminar",
          "Qual pergunta pede o NOME, e nao o bem-estar?",
          "你叫什么？",
          ["你叫什么？", "你好吗？", "多少钱？", "再见"],
          "你叫什么？ pergunta o nome; 你好吗？ pergunta bem-estar."
        ),
      ];
    }
    if (pass === 3) {
      return [
        reverseRecall("Pergunte sozinho", "Pergunte a alguem como ele se chama.", "你叫什么？", ["你叫什么？", "你叫什么"]),
        sentenceTransform(
          "Da pergunta a resposta",
          "你叫什么？",
          ["我", "叫", "Matheus"],
          ["我", "叫", "Matheus", "你", "什么"],
          "Responda a pergunta com sua propria apresentacao."
        ),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall("Transferencia", "Voce conhece alguem novo e quer saber o nome dele.", "你叫什么？", [
          "你叫什么？",
          "你叫什么",
        ])
      ),
      dialogueCompletion(
        "Novo encontro",
        "Voce: 你好！ NPC: 你好！ Voce: ___",
        "你叫什么？",
        ["你叫什么？", "多少钱？", "再见", "谢谢"],
        "你叫什么？ continua a apresentacao em qualquer encontro novo."
      ),
    ];
  }

  if (lessonId === "l10") {
    if (pass === 1) {
      return [
        contextualChoice(
          "De onde voce e?",
          "Alguem quer saber sua nacionalidade.",
          "你是哪国人？",
          ["你是哪国人？", "你叫什么？", "你好吗？", "多少钱？"],
          "你是哪国人？ pergunta a nacionalidade."
        ),
        audioToAction("Ouca a resposta", "我是巴西人", "我是巴西人", ["我是巴西人", "我叫Matheus", "我很好", "谢谢"]),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Troque o pais",
          "我是___人",
          "法国",
          ["法国", "巴西", "中国", "朋友"],
          "我是 + pais + 人 diz a nacionalidade."
        ),
        contextualChoice(
          "Discriminar",
          "Qual frase responde a pergunta de nacionalidade?",
          "我是巴西人",
          ["我是巴西人", "我叫Matheus", "我很好", "谢谢"],
          "我是巴西人 responde 你是哪国人？"
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Da pergunta a resposta",
          "你是哪国人？",
          ["我", "是", "巴西人"],
          ["我", "是", "巴西人", "你", "哪", "国"],
          "Responda a pergunta de origem com sua propria nacionalidade."
        ),
        reverseRecall("Diga sua origem", "Diga de que pais voce e.", "我是巴西人", ["我是巴西人", "我是巴西人。"]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall("Transferencia", "Alguem que voce acabou de conhecer pergunta sua origem.", "我是巴西人", [
          "我是巴西人",
          "我是巴西人。",
        ])
      ),
      dialogueCompletion(
        "Nova pessoa",
        "NPC: 你好！你是哪国人？ Voce: ___",
        "我是巴西人",
        ["我是巴西人", "我叫Matheus", "谢谢", "再见"],
        "我是 + nacionalidade responde em qualquer situacao nova."
      ),
    ];
  }

  if (lessonId === "l11") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Primeiro reparo",
          "Alguem fala rapido demais e voce nao entende o que ouviu.",
          "我听不懂",
          ["我听不懂", "请再说一遍", "我不会说中文", "我很好"],
          "我听不懂 comunica que voce nao entendeu."
        ),
        audioToAction("Ouca o reparo", "我听不懂", "我听不懂", ["我听不懂", "请再说一遍", "我不会说中文", "谢谢"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar reparos",
          "Qual frase comunica que voce NAO ENTENDEU o que ouviu (nao que nao sabe falar)?",
          "我听不懂",
          ["我听不懂", "我不会说中文", "谢谢", "再见"],
          "我听不懂 = nao entendi ouvindo; 我不会说中文 = nao sei falar."
        ),
        dialogueCompletion(
          "Peca a repeticao",
          "Voce diz 我听不懂. A pessoa nao reage. O que voce pede a seguir?",
          "请再说一遍",
          ["请再说一遍", "我听不懂", "谢谢", "再见"],
          "请再说一遍 pede a repeticao depois de dizer que nao entendeu."
        ),
      ];
    }
    if (pass === 3) {
      return [
        reverseRecall("Produza o segundo reparo", "Peca para a pessoa falar de novo.", "请再说一遍", [
          "请再说一遍",
          "请再说一遍。",
        ]),
        reverseRecall("Diferencie", "Diga que nao sabe falar chines (nao que nao entendeu).", "我不会说中文", [
          "我不会说中文",
          "我不会说中文。",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Transferencia",
          "Alguem fala rapido demais numa loja. Comunique que nao entendeu.",
          "我听不懂",
          ["我听不懂", "我听不懂。"]
        )
      ),
      dialogueCompletion(
        "Situacao nova",
        "Voce: 我听不懂. NPC continua falando rapido. Voce: ___",
        "请再说一遍",
        ["请再说一遍", "谢谢", "再见", "我很好"],
        "Depois de nao entender, peca a repeticao."
      ),
    ];
  }

  if (lessonId === "l11-falo-pouco") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Nem tudo, nem nada",
          "Voce fala um pouco de chines, nao nada.",
          "我会说一点中文",
          ["我会说一点中文", "我不会说中文", "我很好", "谢谢"],
          "我会说一点中文 suaviza: sei falar um pouco."
        ),
        audioToAction("Ouca a frase", "我会说一点中文", "我会说一点中文", [
          "我会说一点中文",
          "我不会说中文",
          "我听不懂",
          "谢谢",
        ]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar niveis",
          "Qual frase diz que voce sabe falar UM POUCO (nao nada)?",
          "我会说一点中文",
          ["我会说一点中文", "我不会说中文", "我听不懂", "谢谢"],
          "会说一点 = sei um pouco; 不会说 = nao sei nada."
        ),
        substitutionDrill(
          "Complete a frase",
          "我会说一点___",
          "中文",
          ["中文", "英语", "朋友", "中国"],
          "我会说一点 + lingua diz que voce fala um pouco daquela lingua."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "De nao saber a saber um pouco",
          "我不会说中文",
          ["我", "会", "说", "一", "点", "中文"],
          ["我", "会", "说", "一", "点", "中文", "不", "听不懂"],
          "Transforme a negacao total em: sei falar um pouco."
        ),
        reverseRecall("Produza sozinho", "Diga que voce sabe falar um pouco de chines.", "我会说一点中文", [
          "我会说一点中文",
          "我会说一点中文。",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Transferencia",
          "Alguem pergunta se voce fala chines fluente. Explique seu nivel real.",
          "我会说一点中文",
          ["我会说一点中文", "我会说一点中文。"]
        )
      ),
      dialogueCompletion(
        "Continue explicando",
        "NPC: 你会说中文吗？ Voce: 我会说一点中文。 NPC: 你在学吗？ Voce: ___",
        "我在学中文",
        ["我在学中文", "我不会说中文", "我听不懂", "谢谢"],
        "我在学中文 completa a explicacao sobre seu nivel."
      ),
    ];
  }

  if (lessonId === "p3-wobuhui-shuo-zhongwen") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Protecao",
          "Alguem fala rapido demais em chines e voce nao entende nada.",
          "我不会说中文",
          ["我不会说中文", "谢谢", "我很好", "再见"],
          "我不会说中文 avisa que voce nao fala a lingua."
        ),
        audioToAction("Ouca a frase", "我不会说中文", "我不会说中文", ["我不会说中文", "你好", "我很好", "谢谢"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar",
          "Qual frase avisa que voce NAO SABE FALAR chines (nao que nao entendeu esta frase)?",
          "我不会说中文",
          ["我不会说中文", "我听不懂", "谢谢", "再见"],
          "我不会说中文 = nao sei falar; 我听不懂 = nao entendi o que ouvi."
        ),
        dialogueCompletion(
          "Revisao com cumprimento",
          "Antes de avisar que nao fala chines, qual cumprimento abre a conversa?",
          "你好",
          ["你好", "再见", "谢谢", "不客气"],
          "你好 abre; 我不会说中文 protege depois."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Monte a frase de emergencia",
          "我很好",
          ["我", "不会", "说", "中文"],
          ["我", "不会", "说", "中文", "很好", "听不懂"],
          "Monte a frase que protege quando voce nao entende nada."
        ),
        reverseRecall("Produza sozinho", "Avise que voce nao sabe falar chines.", "我不会说中文", [
          "我不会说中文",
          "我不会说中文。",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Transferencia",
          "Um estranho fala com voce rapido demais em chines, numa loja nova.",
          "我不会说中文",
          ["我不会说中文", "我不会说中文。"]
        )
      ),
      dialogueCompletion(
        "Situacao nova",
        "Vendedor fala rapido. Voce: ___",
        "我不会说中文",
        ["我不会说中文", "谢谢", "多少钱", "再见"],
        "我不会说中文 funciona em qualquer situacao nova de sobrevivencia."
      ),
    ];
  }

  if (lessonId === "p3-qing-zai-shuo-yibian") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Peca repeticao",
          "Voce nao entendeu bem o que a pessoa disse. O que voce pede?",
          "请再说一遍",
          ["请再说一遍", "我很好", "谢谢", "再见"],
          "请再说一遍 pede que a pessoa repita."
        ),
        audioToAction("Ouca o pedido", "请再说一遍", "请再说一遍", ["请再说一遍", "我听不懂", "谢谢", "你好"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar",
          "Qual frase PEDE A REPETICAO, em vez de so dizer que nao entendeu?",
          "请再说一遍",
          ["请再说一遍", "我听不懂", "谢谢", "再见"],
          "请再说一遍 pede a acao de repetir; 我听不懂 so descreve o problema."
        ),
        dialogueCompletion(
          "Antes do pedido",
          "Antes de pedir para repetir, o que voce costuma dizer primeiro?",
          "我听不懂",
          ["我听不懂", "谢谢", "再见", "多少钱"],
          "我听不懂 vem antes de 请再说一遍 na sequencia de reparo."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "De nao entender a pedir repeticao",
          "我听不懂",
          ["请", "再", "说", "一", "遍"],
          ["请", "再", "说", "一", "遍", "听不懂", "很好"],
          "Transforme o aviso de nao entender no pedido de repeticao."
        ),
        reverseRecall("Produza sozinho", "Peca para a pessoa repetir o que disse.", "请再说一遍", [
          "请再说一遍",
          "请再说一遍。",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Transferencia",
          "Numa loja nova, o vendedor fala rapido e voce quer ouvir de novo.",
          "请再说一遍",
          ["请再说一遍", "请再说一遍。"]
        )
      ),
      dialogueCompletion(
        "Situacao nova",
        "Vendedor fala rapido demais. Voce: 我听不懂. Vendedor: 什么？ Voce: ___",
        "请再说一遍",
        ["请再说一遍", "谢谢", "多少钱", "再见"],
        "请再说一遍 continua o reparo em qualquer contexto novo."
      ),
    ];
  }

  if (lessonId === "l13-dialogo-ola") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Abra o dialogo",
          "Voce encontra alguem. O que abre a conversa?",
          "你好",
          ["你好", "谢谢", "再见", "不客气"],
          "你好 abre o microdialogo."
        ),
        audioToAction("Ouca a resposta", "我很好", "我很好", ["我很好", "你好吗？", "谢谢", "再见"]),
      ];
    }
    if (pass === 2) {
      return [
        dialogueCompletion(
          "Encadeie",
          "A: 你好！你好吗？ B: ___",
          "我很好",
          ["我很好", "再见", "谢谢", "我叫Matheus"],
          "我很好 responde a pergunta de bem-estar."
        ),
        substitutionDrill(
          "Feche com cortesia",
          "B ajudou A. A: ___",
          "谢谢",
          ["谢谢", "再见", "你好", "不客气"],
          "谢谢 agradece a ajuda no fim do dialogo."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Monte o microdialogo",
          "你好",
          ["你", "好", "吗", "？"],
          ["你", "好", "吗", "？", "很", "我"],
          "Transforme o cumprimento na pergunta de bem-estar."
        ),
        reverseRecall("Produza a sequencia", "Cumprimente, pergunte se esta tudo bem e agradeca.", "你好，你好吗？谢谢", [
          "你好，你好吗？谢谢",
          "你好你好吗谢谢",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Transferencia",
          "Voce encontra alguem novo. Conduza o microdialogo completo sozinho.",
          "你好，你好吗？我很好，谢谢",
          ["你好，你好吗？我很好，谢谢", "你好你好吗我很好谢谢"]
        )
      ),
      dialogueCompletion(
        "Nova pessoa",
        "NPC: 你好！你好吗？ Voce: ___",
        "我很好",
        ["我很好", "再见", "多少钱", "我叫Matheus"],
        "我很好 encadeia naturalmente com qualquer novo interlocutor."
      ),
    ];
  }

  if (lessonId === "l13-dialogo-nome") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Pergunte o nome",
          "Depois de cumprimentar, voce quer saber o nome da pessoa.",
          "你叫什么？",
          ["你叫什么？", "你好吗？", "多少钱？", "再见"],
          "你叫什么？ segue naturalmente o cumprimento."
        ),
        audioToAction("Ouca a resposta", "我叫Matheus", "我叫Matheus", ["我叫Matheus", "我是巴西人", "我很好", "谢谢"]),
      ];
    }
    if (pass === 2) {
      return [
        dialogueCompletion(
          "Encadeie a origem",
          "A: 你叫什么？ B: 我叫Matheus。 A: 你是哪国人？ B: ___",
          "我是巴西人",
          ["我是巴西人", "我很好", "谢谢", "再见"],
          "我是巴西人 encadeia depois da apresentacao pelo nome."
        ),
        substitutionDrill(
          "Peca repeticao",
          "Voce nao ouviu bem o nome. O que pede?",
          "请再说一遍",
          ["请再说一遍", "谢谢", "再见", "多少钱"],
          "请再说一遍 pede que a pessoa repita o nome."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Monte a cadeia completa",
          "你叫什么？",
          ["我", "叫", "Matheus", "，", "我", "是", "巴西人"],
          ["我", "叫", "Matheus", "，", "我", "是", "巴西人", "你", "什么"],
          "Junte nome e origem numa unica apresentacao."
        ),
        reverseRecall(
          "Produza a apresentacao completa",
          "Diga seu nome e sua nacionalidade numa unica fala.",
          "我叫Matheus，我是巴西人",
          ["我叫Matheus，我是巴西人", "我叫Matheus我是巴西人"]
        ),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Transferencia",
          "Numa festa, alguem pede que voce se apresente por completo.",
          "我叫Matheus，我是巴西人",
          ["我叫Matheus，我是巴西人", "我叫Matheus我是巴西人"]
        )
      ),
      dialogueCompletion(
        "Nao ouviu o nome",
        "NPC fala seu proprio nome baixo. Voce quer ouvir de novo. Voce: ___",
        "请再说一遍",
        ["请再说一遍", "谢谢", "再见", "多少钱"],
        "请再说一遍 continua util em qualquer apresentacao nova."
      ),
    ];
  }

  if (lessonId === "l19") {
    if (pass === 1) {
      return [
        contextualChoice("Quantos?", "Voce ve ● ● ● (tres bolinhas). Qual numero?", "三", ["三", "一", "二", "五"]),
        audioToAction("Ouca o numero", "四", "四", ["四", "一", "二", "五"]),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Complete a sequencia",
          "一 二 ___ 四 五",
          "三",
          ["三", "二", "四", "一"],
          "三 fica entre 二 e 四."
        ),
        contextualChoice("Discriminar", "Qual numero vem depois de 四?", "五", ["五", "三", "一", "二"]),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Monte a sequencia crescente",
          "一",
          ["一", "二", "三", "四", "五"],
          ["一", "二", "三", "四", "五", "六"],
          "Monte a sequencia completa de um a cinco."
        ),
        reverseRecall("Diga o proximo numero", "Depois de 三, qual numero vem?", "四"),
      ];
    }
    return [
      reverseRecall(
        "Transferencia",
        "Alguem pergunta quantos dedos voce esta mostrando: tres. Diga o numero.",
        "三"
      ),
      dialogueCompletion(
        "Contagem nova",
        "Alguem conta em voz alta: 一，二，三，___",
        "四",
        ["四", "五", "一", "二"],
        "四 continua a contagem crescente."
      ),
    ];
  }

  if (lessonId === "l20") {
    if (pass === 1) {
      return [
        contextualChoice("Quantos?", "Voce conta seis objetos em fila. Qual numero?", "六", ["六", "七", "八", "九"]),
        audioToAction("Ouca o numero", "九", "九", ["九", "六", "七", "八"]),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Complete a sequencia",
          "六 七 ___ 九 十",
          "八",
          ["八", "七", "九", "六"],
          "八 fica entre 七 e 九."
        ),
        contextualChoice("Discriminar", "Qual numero fecha a contagem de 1 a 10?", "十", ["十", "九", "八", "七"]),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Monte a sequencia final",
          "六",
          ["六", "七", "八", "九", "十"],
          ["六", "七", "八", "九", "十", "五"],
          "Monte a sequencia completa de seis a dez."
        ),
        reverseRecall("Diga o numero", "Fale o numero que fecha a contagem 1-10.", "十"),
      ];
    }
    return [
      reverseRecall(
        "Transferencia",
        "O garcom pergunta a mesa: numero oito. Diga o numero em chines.",
        "八"
      ),
      dialogueCompletion(
        "Telefone pedagogico",
        "Alguem dita um numero de telefone: 六，七，___",
        "八",
        ["八", "九", "十", "六"],
        "八 continua a sequencia dita em voz alta."
      ),
    ];
  }

  if (lessonId === "l21") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Grupo",
          "Voce e seus amigos, juntos. Como se diz 'nos'?",
          "我们",
          ["我们", "你们", "朋友", "中国"],
          "我 + 们 = 我们 (nos)."
        ),
        audioToAction("Ouca o plural", "你们", "你们", ["你们", "我们", "朋友", "中国"]),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill("Troque o pronome", "___们", "你", ["你", "我", "朋友", "中国"], "你 + 们 = 你们 (voces)."),
        contextualChoice(
          "Discriminar",
          "Voce fala do grupo do OUVINTE (voces), nao do seu proprio grupo (nos). Qual palavra?",
          "你们",
          ["你们", "我们", "朋友", "中国"],
          "你们 = voces; 我们 = nos."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "De eu a nos",
          "我",
          ["我", "们"],
          ["我", "们", "你", "人"],
          "Transforme 我 (eu) em 我们 (nos) com o sufixo 们."
        ),
        reverseRecall("Diga 'voces'", "Refira-se ao grupo de amigos dela.", "你们"),
      ];
    }
    return [
      reverseRecall("Transferencia", "Voce e seus amigos vao viajar juntos. Diga 'nos vamos'.", "我们", [
        "我们",
        "我们。",
      ]),
      dialogueCompletion(
        "Grupo novo",
        "A: 你和你的朋友们要去哪里？ B: ___ 要去中国。",
        "我们",
        ["我们", "你们", "朋友", "中国"],
        "我们 refere-se ao seu proprio grupo na resposta."
      ),
    ];
  }

  if (lessonId === "l22") {
    if (pass === 1) {
      return [
        contextualChoice("Pais", "Voce quer nomear o pais onde nasceu seu amigo chines.", "中国", ["中国", "朋友", "我们", "你们"]),
        audioToAction("Ouca a palavra", "朋友", "朋友", ["朋友", "中国", "我们", "你们"]),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Troque a quantidade",
          "我有___个朋友",
          "五",
          ["五", "三", "一", "二"],
          "Troque a quantidade de amigos usando um numero ja conhecido."
        ),
        contextualChoice("Discriminar", "Qual palavra significa 'amigo', nao 'pais'?", "朋友", ["朋友", "中国", "我们", "你们"]),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Monte a frase de amigos",
          "朋友",
          ["我", "有", "三", "个", "朋友"],
          ["我", "有", "三", "个", "朋友", "中国"],
          "Cresca a palavra 朋友 na frase completa: 我有三个朋友."
        ),
        reverseRecall("Diga que tem amigos", "Diga que voce tem tres amigos.", "我有三个朋友", [
          "我有三个朋友",
          "我有三个朋友。",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Transferencia",
          "Alguem pergunta se voce tem amigos chineses. Diga quantos amigos voce tem.",
          "我有三个朋友",
          ["我有三个朋友", "我有三个朋友。"]
        )
      ),
      dialogueCompletion(
        "Nova conversa",
        "A: 你是哪国人？ B: 我是巴西人。 A: 你有中国朋友吗？ B: ___",
        "我有三个朋友",
        ["我有三个朋友", "我叫Matheus", "谢谢", "再见"],
        "我有三个朋友 responde de forma natural, mesmo sem a pergunta exata ensinada."
      ),
    ];
  }

  if (lessonId === "l25") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Objeto misterioso",
          "Voce ve algo que nao conhece e quer saber o que e.",
          "这是什么？",
          ["这是什么？", "这是我爸爸", "你好", "多少钱？"],
          "这是什么？ pergunta o que e um objeto."
        ),
        audioToAction("Ouca a pergunta", "这是什么", "这是什么？", ["这是什么？", "这是我爸爸", "我很好", "谢谢"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar",
          "Qual frase pergunta o que ALGO E (nao quem alguem e)?",
          "这是什么？",
          ["这是什么？", "这是我爸爸", "你叫什么？", "你好吗？"],
          "这是什么？ pergunta sobre objetos; 这是我爸爸 apresenta uma pessoa."
        ),
        dialogueCompletion(
          "Hora de ir",
          "A visita acabou. O que voce diz para ir para casa?",
          "我回家",
          ["我回家", "这是什么？", "太贵了", "我很好"],
          "我回家 fecha a visita."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Da pergunta a despedida",
          "这是什么？",
          ["我", "回", "家"],
          ["我", "回", "家", "这", "是", "什么"],
          "Depois de perguntar sobre o objeto, encerre dizendo que vai para casa."
        ),
        reverseRecall("Pergunte sozinho", "Voce nao sabe o que e aquele objeto. Pergunte.", "这是什么？", [
          "这是什么？",
          "这是什么",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall("Transferencia", "Voce ve um objeto novo na casa de um amigo. Pergunte o que e.", "这是什么？", [
          "这是什么？",
          "这是什么",
        ])
      ),
      dialogueCompletion(
        "Fim da visita",
        "Esta tarde e voce precisa ir. O que voce diz?",
        "我回家",
        ["我回家", "这是什么？", "太贵了", "谢谢"],
        "我回家 funciona para encerrar qualquer visita."
      ),
    ];
  }

  if (lessonId === "l26") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Preferencia",
          "Voce adora estudar chines. O que voce diz?",
          "我喜欢中文",
          ["我喜欢中文", "我饿了", "多少钱", "谢谢"],
          "我喜欢 + coisa expressa preferencia."
        ),
        audioToAction("Ouca a fome", "我饿了", "我饿了", ["我饿了", "我喜欢中文", "很好吃", "谢谢"]),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Troque o gosto",
          "我喜欢___",
          "茶",
          ["茶", "中文", "朋友", "中国"],
          "我喜欢 + coisa troca o objeto do gosto."
        ),
        contextualChoice(
          "Discriminar",
          "Qual frase fala de GOSTO, e nao de FOME?",
          "我喜欢中文",
          ["我喜欢中文", "我饿了", "很好吃", "多少钱"],
          "我喜欢 expressa gosto; 我饿了 expressa fome."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "De gosto a fome",
          "我喜欢中文",
          ["我", "饿", "了"],
          ["我", "饿", "了", "喜欢", "中文"],
          "Troque a expressao de gosto pela expressao de fome."
        ),
        reverseRecall("Diga que gosta", "Diga que voce gosta de chines.", "我喜欢中文", [
          "我喜欢中文",
          "我喜欢中文。",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall("Transferencia", "Alguem pergunta o que voce gosta de estudar. Responda.", "我喜欢中文", [
          "我喜欢中文",
          "我喜欢中文。",
        ])
      ),
      dialogueCompletion(
        "Situacao nova",
        "Amigo: 你喜欢什么？ Voce: ___",
        "我喜欢中文",
        ["我喜欢中文", "我饿了", "多少钱", "再见"],
        "我喜欢中文 responde naturalmente a pergunta de preferencia."
      ),
    ];
  }

  if (lessonId === "l28") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Convite de saida",
          "Voce esta com amigos e chegou a hora de ir. O que voce diz?",
          "我们走吧",
          ["我们走吧", "再见", "谢谢", "我很好"],
          "我们走吧 convida o grupo a sair."
        ),
        audioToAction("Ouca o convite", "我们走吧", "我们走吧", ["我们走吧", "再见", "你好", "谢谢"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar",
          "Qual frase CONVIDA o grupo a sair (nao apenas se despede)?",
          "我们走吧",
          ["我们走吧", "再见", "谢谢", "不客气"],
          "我们走吧 e um convite de acao; 再见 apenas despede."
        ),
        dialogueCompletion(
          "Depois do convite",
          "A: 我们走吧！ B: ___",
          "再见",
          ["再见", "我们走吧", "谢谢", "多少钱"],
          "再见 pode fechar a saida depois do convite."
        ),
      ];
    }
    if (pass === 3) {
      return [
        reverseRecall("Produza o convite", "Convide seus amigos a irem embora.", "我们走吧", [
          "我们走吧",
          "我们走吧。",
        ]),
        sentenceTransform(
          "De nos a convite",
          "我们",
          ["我", "们", "走", "吧"],
          ["我", "们", "走", "吧", "你", "见"],
          "Transforme 我们 (nos) no convite completo: 我们走吧."
        ),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall("Transferencia", "Um amigo aparece e voce quer convidar todos a sair juntos.", "我们走吧", [
          "我们走吧",
          "我们走吧。",
        ])
      ),
      dialogueCompletion(
        "Reencontro",
        "Amigo: 你好，朋友！ Voce: ___",
        "我们走吧",
        ["我们走吧", "谢谢", "多少钱", "我很好"],
        "我们走吧 convida o amigo reencontrado a sair junto."
      ),
    ];
  }

  if (lessonId === "p6-saude") {
    if (pass === 1) {
      return [
        {
          kind: "place_label",
          title: "Placa de saude",
          prompt: "Qual destas e o hospital?",
          dialoguePrompt: "Qual destas e o hospital?",
          correctAnswer: "医院",
          options: ["医院", "饭馆", "酒店", "公园"],
          placeLabelCategory: "saude",
          speaker: "Placa",
        },
        contextualChoice("Nao estou bem", "Voce esta doente. O que voce diz?", "我病了", [
          "我病了",
          "我很好",
          "谢谢",
          "再见",
        ]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar sintomas",
          "Qual frase indica DOR DE CABECA especificamente, nao doenca em geral?",
          "我头疼",
          ["我头疼", "我病了", "我很好", "谢谢"],
          "我头疼 aponta o sintoma especifico; 我病了 e geral."
        ),
        substitutionDrill(
          "Complete o sintoma",
          "我___了",
          "病",
          ["病", "很好", "饿"],
          "我病了 = estou doente."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "De sintoma a pedido",
          "我头疼",
          ["我", "要", "看", "医", "生"],
          ["我", "要", "看", "医", "生", "病"],
          "Transforme o sintoma no pedido de ajuda: 我要看医生."
        ),
        reverseRecall("Peca o medico", "Diga que quer ver um medico.", "我要看医生", [
          "我要看医生",
          "我要看医生。",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall("Transferencia", "Voce esta doente numa cidade nova. Diga isso.", "我病了", [
          "我病了",
          "我病了。",
        ])
      ),
      dialogueCompletion(
        "Achar o hospital",
        "Voce esta doente numa cidade nova e precisa de ajuda medica. O que voce pergunta?",
        "医院在哪里？",
        ["医院在哪里？", "现在几点？", "多少钱？", "再见"],
        "医院在哪里？ acha o hospital em qualquer cidade nova."
      ),
    ];
  }

  if (lessonId === "p6-clima") {
    if (pass === 1) {
      return [
        contextualChoice("Que calor!", "Esta muito quente. O que voce diz?", "天气很热", [
          "天气很热",
          "天气很冷",
          "有风",
          "下雪了",
        ]),
        audioToAction("Ouca o clima", "下雪了", "下雪了", ["下雪了", "天气很热", "天气很冷", "有风"]),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Troque a sensacao",
          "天气很___",
          "冷",
          ["冷", "热", "好", "风"],
          "天气很 + sensacao descreve o clima."
        ),
        contextualChoice(
          "Discriminar",
          "Qual frase fala de VENTO, e nao de temperatura?",
          "有风",
          ["有风", "天气很热", "天气很冷", "下雪了"],
          "有风 fala de vento; as outras falam de temperatura/precipitacao."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "De frio a nevando",
          "天气很冷",
          ["下", "雪", "了"],
          ["下", "雪", "了", "热", "风"],
          "Transforme a descricao de frio na descricao de neve."
        ),
        reverseRecall("Comente o tempo", "Diga que hoje o tempo esta otimo.", "今天天气很好", [
          "今天天气很好",
          "今天天气很好。",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall("Transferencia", "Voce chega numa cidade nova e alguem pergunta como esta o tempo hoje.", "今天天气很好", [
          "今天天气很好",
          "今天天气很好。",
        ])
      ),
      dialogueCompletion(
        "Situacao nova",
        "Amigo: 今天怎么样？ Voce: ___",
        "天气很热",
        ["天气很热", "天气很冷", "有风", "下雪了"],
        "Qualquer descricao de clima aprendida responde naturalmente."
      ),
    ];
  }

  if (lessonId === "p7-imersao-mercado") {
    if (pass === 1) {
      return [
        contextualChoice(
          "No mercado",
          "Voce aponta para um produto e quer saber o preco.",
          "多少钱？",
          ["多少钱？", "太贵了", "你好", "再见"],
          "多少钱？ pergunta o preco."
        ),
        audioToAction("Ouca o preco", "多少钱", "多少钱？", ["多少钱？", "太贵了", "谢谢", "你好"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar",
          "Qual frase RECLAMA do preco, em vez de apenas perguntar?",
          "太贵了",
          ["太贵了", "多少钱？", "谢谢", "你好"],
          "太贵了 reclama; 多少钱？ apenas pergunta."
        ),
        dialogueCompletion(
          "Depois do preco",
          "Vendedor: 五十元！ Voce: ___",
          "太贵了",
          ["太贵了", "多少钱？", "谢谢", "再见"],
          "太贵了 reage a um preco alto."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "De pergunta a reclamacao",
          "多少钱？",
          ["太", "贵", "了"],
          ["太", "贵", "了", "多", "少", "钱"],
          "Transforme a pergunta de preco na reclamacao: 太贵了."
        ),
        withEquivalentAccepts(reverseRecall("Negocie", "O preco esta alto. Reclame.", "太贵了", ["太贵了", "太贵了！"])),
      ];
    }
    return [
      {
        kind: "price_task",
        title: "Preco no mercado",
        prompt: "A placa mostra 38元. Quanto custa?",
        dialoguePrompt: "A placa mostra 38元. Quanto custa?",
        priceHanzi: "38元",
        correctAnswer: "38元",
        options: ["38元", "8元", "18元", "谢谢"],
        speaker: "Preco",
      },
      withEquivalentAccepts(
        reverseRecall(
          "Transferencia",
          "Um novo vendedor te da um preco alto por outro produto. Negocie.",
          "太贵了",
          ["太贵了", "太贵了！"]
        )
      ),
    ];
  }

  if (lessonId === "p7-imersao-casa-amigo") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Cha, por favor",
          "A anfitria oferece cha. O que voce diz?",
          "我想喝茶",
          ["我想喝茶", "太贵了", "再见", "多少钱？"],
          "我想喝茶 aceita a oferta com naturalidade."
        ),
        audioToAction("Ouca a oferta", "我想喝茶", "我想喝茶", ["我想喝茶", "这是我妈妈", "太贵了", "谢谢"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar",
          "Qual frase ACEITA uma bebida, e nao apresenta uma pessoa?",
          "我想喝茶",
          ["我想喝茶", "这是我妈妈", "太贵了", "再见"],
          "我想喝茶 aceita a bebida; 这是我妈妈 apresenta a familia."
        ),
        dialogueCompletion(
          "Complete o reencontro",
          "Esta tarde. Como voce se despede ja marcando o proximo encontro?",
          "明天见",
          ["明天见", "你好", "这是什么？", "我要这个"],
          "明天见 despede e marca: ate amanha!"
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "De aceitar cha a marcar reencontro",
          "我想喝茶",
          ["明", "天", "见"],
          ["明", "天", "见", "喝", "茶"],
          "Depois de aceitar o cha, marque o proximo encontro."
        ),
        reverseRecall("Marque o reencontro", "Esta tarde. Despeca-se marcando amanha.", "明天见", [
          "明天见",
          "明天见！",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Transferencia",
          "Voce visita a casa de um novo amigo e ele oferece cha.",
          "我想喝茶",
          ["我想喝茶", "我要茶"]
        )
      ),
      dialogueCompletion(
        "Fim da visita",
        "Amigo: 谢谢你来我家！ Voce: ___",
        "明天见",
        ["明天见", "太贵了", "多少钱？", "我很好"],
        "明天见 encerra qualquer visita marcando o proximo encontro."
      ),
    ];
  }

  if (lessonId === "p3-wohenhao") {
    if (pass === 1) {
      return [
        contextualChoice("Voce esta bem?", "Alguem pergunta 你好吗？ e voce esta bem.", "我很好", [
          "我很好",
          "谢谢",
          "再见",
          "你叫什么？",
        ]),
        audioToAction("Ouca a resposta", "我很好", "我很好", ["我很好", "你好吗？", "谢谢", "再见"]),
      ];
    }
    if (pass === 2) {
      return [
        dialogueCompletion("Complete a resposta", "A: 你好吗？ B: ___", "我很好", [
          "我很好",
          "再见",
          "谢谢",
          "多少钱",
        ]),
        contextualChoice(
          "Discriminar",
          "Qual frase RESPONDE a pergunta de bem-estar, e nao a de nome?",
          "我很好",
          ["我很好", "我叫Matheus", "谢谢", "再见"],
          "我很好 responde 你好吗？; 我叫 responde 你叫什么？"
        ),
      ];
    }
    if (pass === 3) {
      return [
        reverseRecall("Produza a resposta", "Diga que voce esta bem.", "我很好", ["我很好", "我很好。"]),
        sentenceTransform(
          "Da pergunta a resposta",
          "你好吗？",
          ["我", "很", "好"],
          ["我", "很", "好", "你", "吗"],
          "Responda a pergunta de bem-estar."
        ),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall("Transferencia", "Alguem que voce acabou de conhecer pergunta como voce esta.", "我很好", [
          "我很好",
          "我很好。",
        ])
      ),
      dialogueCompletion(
        "Nova pessoa",
        "NPC: 你好！你好吗？ Voce: ___",
        "我很好",
        ["我很好", "再见", "多少钱", "我叫Matheus"],
        "我很好 responde naturalmente em qualquer novo encontro."
      ),
    ];
  }

  return [];
}
