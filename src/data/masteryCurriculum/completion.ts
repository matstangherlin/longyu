/**
 * Pedagogia V3.4 — Mastery Completion (as 6 lições normais remanescentes).
 *
 * Fecha a lacuna deixada pela Wave 1 (V3.3): as últimas lições "normais"
 * (não review-special, não sound/hanzi-lab) que ainda estavam em `later`
 * em masteryCoverage.ts. Ver masteryCoverage.ts para a classificação e
 * masteryPilot.ts para como isto se conecta ao piloto.
 *
 * Lições:
 * - l9-tudo-bem  — Tudo bem? (variante de l3/p3-wohenhao; conteúdo mastery
 *                  próprio, sem repetir os mesmos bônus).
 * - l13          — Microtexto 1 (leitura): 你好！谢谢。我是巴西人。再见！
 * - p6-natureza  — Natureza: 这里有山 / 我喜欢这里 / 下雨了 / 山很漂亮;
 *                  M4 combina com clima/cidade (sem vocabulário novo).
 * - l23          — Microtexto 2 (leitura): 你好！我叫Matheus。我是巴西人。
 *                  我有三个朋友。
 * - l29          — Eu e meus amigos: 我有三个朋友 / 我喜欢中文 / 我想喝茶 /
 *                  我们走吧 / 书 / 我看书.
 * - l30          — Leitura em voz alta (shadowing das mesmas linhas de l29
 *                  + produção; M4 sem vocabulário novo, só reuso produtivo).
 *
 * Helpers duplicados intencionalmente (nao importados de masteryPilot.ts)
 * para evitar dependência circular — mesmo padrão de masteryWave1Bonus.ts.
 */
import type { LessonStep } from "../journey";
import type { MasteryPass } from "../masteryLoop";
import { withEquivalentAccepts } from "../masteryLoop";
import type { UnitLexicalTargets } from "./types";
import { makeReverseRecall } from "../exerciseFeasibility";

export const COMPLETION_LESSON_IDS = ["l9-tudo-bem", "l13", "p6-natureza", "l23", "l29", "l30"] as const;

export type CompletionLessonId = (typeof COMPLETION_LESSON_IDS)[number];

export function isCompletionLesson(lessonId: string): lessonId is CompletionLessonId {
  return (COMPLETION_LESSON_IDS as readonly string[]).includes(lessonId);
}

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
    speaker: "Situação",
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
    prompt: "Ouça e escolha a ação/imagem correspondente.",
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
    speaker: "Diálogo",
  };
}

function reverseRecall(title: string, situationPt: string, answer: string, accepts?: string[]): LessonStep {
  return makeReverseRecall(title, situationPt, answer, accepts);
}

// ————————————————————————————————————————————————————————————
// Alvos lexicais — V3.4.
// ————————————————————————————————————————————————————————————

export const COMPLETION_LEXICAL_TARGETS: Record<CompletionLessonId, UnitLexicalTargets> = {
  "l9-tudo-bem": {
    lessonId: "l9-tudo-bem",
    themePt: "Tudo bem? (variante) — resposta com cortesia combinada",
    newVocabularyTarget: 4,
    productiveVocabularyTarget: 2,
    structuresTarget: ["你好吗？ (consolidação)", "我很好 (resposta direta)", "我很好，谢谢 (resposta + agradecimento)"],
    communicativeFunctions: ["confirmar bem-estar", "responder combinando bem-estar e cortesia"],
    vocabulary: [
      { ref: "chunk:nihaoma", hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", meaningPt: "Tudo bem?", role: "core", introduceAtPass: 1 },
      { ref: "chunk:wohenhao", hanzi: "我很好", pinyin: "wǒ hěn hǎo", meaningPt: "Estou bem", role: "core", introduceAtPass: 1 },
      { ref: "chunk:xiexie", hanzi: "谢谢", pinyin: "xièxie", meaningPt: "obrigado(a) (revisão)", role: "support", introduceAtPass: 2 },
      {
        ref: "chunk:wohenhaoxiexie",
        hanzi: "我很好，谢谢",
        pinyin: "wǒ hěn hǎo, xièxie",
        meaningPt: "Estou bem, obrigado(a)",
        role: "productive",
        introduceAtPass: 3,
      },
    ],
    networkChunks: ["你好吗？ → 我很好", "我很好，谢谢", "discriminar bem-estar vs. apresentação pelo nome"],
  },
  l13: {
    lessonId: "l13",
    themePt: "Microtexto 1 (leitura) — sequência social fixa",
    newVocabularyTarget: 4,
    productiveVocabularyTarget: 2,
    structuresTarget: ["你好！ → 谢谢。 → 我是巴西人。 → 再见！", "ordem fixa do microtexto"],
    communicativeFunctions: ["ler o microtexto na ordem certa", "reconhecer a sequência social", "produzir a sequência completa"],
    vocabulary: [
      { ref: "chunk:nihao", hanzi: "你好！", pinyin: "nǐ hǎo!", meaningPt: "Olá!", role: "core", introduceAtPass: 1 },
      { ref: "chunk:xiexie", hanzi: "谢谢。", pinyin: "xièxie.", meaningPt: "Obrigado(a).", role: "core", introduceAtPass: 1 },
      { ref: "chunk:wature", hanzi: "我是巴西人。", pinyin: "wǒ shì Bāxī rén.", meaningPt: "Sou brasileiro.", role: "support", introduceAtPass: 2 },
      { ref: "chunk:zaijian", hanzi: "再见！", pinyin: "zàijiàn!", meaningPt: "Até logo!", role: "support", introduceAtPass: 2 },
      {
        ref: "chunk:microtexto1completo",
        hanzi: "你好！谢谢。我是巴西人。再见！",
        pinyin: "nǐ hǎo! xièxie. wǒ shì Bāxī rén. zàijiàn!",
        meaningPt: "Olá! Obrigado(a). Sou brasileiro. Até logo!",
        role: "productive",
        introduceAtPass: 3,
      },
    ],
    networkChunks: ["你好！谢谢。我是巴西人。再见！", "sequência social completa em 4 frases"],
  },
  "p6-natureza": {
    lessonId: "p6-natureza",
    themePt: "A natureza — descrever a paisagem e comentar o clima nela",
    newVocabularyTarget: 6,
    productiveVocabularyTarget: 3,
    structuresTarget: ["这里有 + elemento", "我喜欢这里", "下雨了 (revisão)", "X很漂亮"],
    communicativeFunctions: ["descrever a paisagem", "expressar apreciação do lugar", "comentar o clima na paisagem"],
    vocabulary: [
      { ref: "chunk:zheliyoushan", hanzi: "这里有山", pinyin: "zhè lǐ yǒu shān", meaningPt: "há uma montanha aqui", role: "core", introduceAtPass: 1 },
      { ref: "char:shan_mountain", hanzi: "山", pinyin: "shān", meaningPt: "montanha", role: "core", introduceAtPass: 1 },
      { ref: "chunk:xiayule", hanzi: "下雨了", pinyin: "xià yǔ le", meaningPt: "está chovendo (revisão)", role: "support", introduceAtPass: 2 },
      {
        ref: "chunk:woxihuanzheli",
        hanzi: "我喜欢这里",
        pinyin: "wǒ xǐhuan zhè lǐ",
        meaningPt: "eu gosto daqui",
        role: "productive",
        introduceAtPass: 2,
      },
      { ref: "char:piaoliang", hanzi: "漂亮", pinyin: "piàoliang", meaningPt: "bonito(a)", role: "support", introduceAtPass: 2 },
      {
        ref: "chunk:shanhenpiaoliang",
        hanzi: "山很漂亮",
        pinyin: "shān hěn piàoliang",
        meaningPt: "a montanha é muito bonita",
        role: "productive",
        introduceAtPass: 3,
      },
    ],
    networkChunks: ["这里有山", "我喜欢这里", "山很漂亮", "paisagem + clima (transferência M4)"],
  },
  l23: {
    lessonId: "l23",
    themePt: "Microtexto 2 (leitura) — apresentação com nome, origem e amigos",
    newVocabularyTarget: 5,
    productiveVocabularyTarget: 2,
    structuresTarget: ["你好！ → 我叫... → 我是巴西人。 → 我有三个朋友。", "sequência de apresentação completa"],
    communicativeFunctions: ["ler a apresentação completa", "reconhecer a ordem nome → origem → amigos", "produzir a apresentação com amigos"],
    vocabulary: [
      { ref: "chunk:nihao", hanzi: "你好！", pinyin: "nǐ hǎo!", meaningPt: "Olá!", role: "core", introduceAtPass: 1 },
      { ref: "chunk:wojiao", hanzi: "我叫Matheus。", pinyin: "wǒ jiào Matheus.", meaningPt: "Meu nome é Matheus.", role: "core", introduceAtPass: 1 },
      { ref: "chunk:wature", hanzi: "我是巴西人。", pinyin: "wǒ shì Bāxī rén.", meaningPt: "Sou brasileiro.", role: "support", introduceAtPass: 2 },
      {
        ref: "chunk:woyousangepengyou",
        hanzi: "我有三个朋友。",
        pinyin: "wǒ yǒu sān ge péngyou.",
        meaningPt: "Tenho três amigos.",
        role: "support",
        introduceAtPass: 2,
      },
      {
        ref: "chunk:microtexto2completo",
        hanzi: "你好！我叫Matheus。我是巴西人。我有三个朋友。",
        pinyin: "nǐ hǎo! wǒ jiào Matheus. wǒ shì Bāxī rén. wǒ yǒu sān ge péngyou.",
        meaningPt: "Olá! Meu nome é Matheus. Sou brasileiro. Tenho três amigos.",
        role: "productive",
        introduceAtPass: 3,
      },
    ],
    networkChunks: ["你好！我叫Matheus。我是巴西人。我有三个朋友。", "apresentação social + quantidade de amigos"],
  },
  l29: {
    lessonId: "l29",
    themePt: "Eu e meus amigos — leitura encadeada de gostos e objeto (livro)",
    newVocabularyTarget: 6,
    productiveVocabularyTarget: 3,
    structuresTarget: ["我有三个朋友", "我喜欢中文", "我想喝茶", "这是书 / 我看书", "我们走吧 (fechar a cena)"],
    communicativeFunctions: ["apresentar amigos e preferências", "identificar um objeto (livro)", "encerrar a cena social"],
    vocabulary: [
      {
        ref: "chunk:woyousangepengyou",
        hanzi: "我有三个朋友。",
        pinyin: "wǒ yǒu sān ge péngyou.",
        meaningPt: "Eu tenho três amigos.",
        role: "core",
        introduceAtPass: 1,
      },
      { ref: "chunk:woxihuan", hanzi: "我喜欢中文。", pinyin: "wǒ xǐhuan Zhōngwén.", meaningPt: "Eu gosto de chinês.", role: "core", introduceAtPass: 1 },
      { ref: "char:shu_book", hanzi: "书", pinyin: "shū", meaningPt: "livro", role: "support", introduceAtPass: 2 },
      { ref: "chunk:woxianghe", hanzi: "我想喝茶。", pinyin: "wǒ xiǎng hē chá.", meaningPt: "Quero beber chá.", role: "support", introduceAtPass: 2 },
      { ref: "chunk:wokanshu", hanzi: "我看书。", pinyin: "wǒ kàn shū.", meaningPt: "Eu leio o livro.", role: "productive", introduceAtPass: 3 },
      { ref: "chunk:womenzouba", hanzi: "我们走吧。", pinyin: "wǒmen zǒu ba.", meaningPt: "Vamos embora (revisão).", role: "productive", introduceAtPass: 3 },
    ],
    networkChunks: [
      "我有三个朋友 → 我喜欢中文 → 我想喝茶 → 我们走吧",
      "这是书 / 我看书",
      "leitura encadeada de 5 chunks",
    ],
  },
  l30: {
    lessonId: "l30",
    themePt: "Leitura em voz alta — shadowing das linhas de l29 + produção sem apoio",
    newVocabularyTarget: 0,
    productiveVocabularyTarget: 4,
    structuresTarget: ["shadowing linha a linha", "produção sem apoio: reconstituir as 4 linhas", "encerrar com 我们走吧"],
    communicativeFunctions: ["repetir em voz alta (shadowing)", "produzir as linhas sem ordem dada", "encerrar a cena falada"],
    vocabulary: [
      {
        ref: "chunk:woyousangepengyou",
        hanzi: "我有三个朋友。",
        pinyin: "wǒ yǒu sān ge péngyou.",
        meaningPt: "Eu tenho três amigos (shadowing).",
        role: "core",
        introduceAtPass: 1,
      },
      {
        ref: "chunk:woxihuan",
        hanzi: "我喜欢中文。",
        pinyin: "wǒ xǐhuan Zhōngwén.",
        meaningPt: "Eu gosto de chinês (shadowing).",
        role: "core",
        introduceAtPass: 1,
      },
      {
        ref: "chunk:woxianghe",
        hanzi: "我想喝茶。",
        pinyin: "wǒ xiǎng hē chá.",
        meaningPt: "Quero beber chá (shadowing).",
        role: "support",
        introduceAtPass: 1,
      },
      {
        ref: "chunk:womenzouba",
        hanzi: "我们走吧。",
        pinyin: "wǒmen zǒu ba.",
        meaningPt: "Vamos embora (produção final).",
        role: "productive",
        introduceAtPass: 2,
      },
    ],
    networkChunks: ["我有三个朋友 → 我喜欢中文 → 我想喝茶 → 我们走吧 (shadowing completo)", "produção após shadowing"],
  },
};

// ————————————————————————————————————————————————————————————
// Passos bônus por pass — V3.4.
// ————————————————————————————————————————————————————————————

export function completionBonusStepsFor(lessonId: string, pass: MasteryPass): LessonStep[] {
  if (lessonId === "l9-tudo-bem") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Reencontro",
          "Você encontra alguém depois de um tempo e ela pergunta 你好吗？ O que você diz se está bem?",
          "我很好",
          ["我很好", "谢谢", "再见", "我叫Matheus"],
          "我很好 responde diretamente a 你好吗？"
        ),
        audioToAction("Ouça a pergunta", "你好吗", "你好吗？", ["你好吗？", "我很好", "谢谢", "再见"]),
      ];
    }
    if (pass === 2) {
      return [
        contextualChoice(
          "Discriminar bem-estar vs. nome",
          "Qual frase responde SE VOCÊ ESTÁ BEM, e não quem você é?",
          "我很好",
          ["我很好", "我叫Matheus", "谢谢", "再见"],
          "我很好 responde 你好吗？; 我叫Matheus responde 你叫什么？"
        ),
        substitutionDrill(
          "Una bem-estar e cortesia",
          "我很好，___",
          "谢谢",
          ["谢谢", "你呢", "再见", "不客气"],
          "我很好，谢谢 combina a resposta com o agradecimento."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Combine a resposta",
          "我很好",
          ["我", "很", "好", "，", "谢", "谢"],
          ["我", "很", "好", "，", "谢", "谢", "你", "呢"],
          "Transforme 我很好 na resposta combinada: 我很好，谢谢。"
        ),
        reverseRecall("Responda e agradeça", "Diga que está bem e agradeça na mesma frase.", "我很好，谢谢", [
          "我很好，谢谢",
          "我很好谢谢",
        ]),
      ];
    }
    return [
      withEquivalentAccepts(
        reverseRecall(
          "Transferência",
          "Um conhecido de longa data te encontra na rua e pergunta como você está.",
          "我很好，谢谢",
          ["我很好，谢谢", "我很好"]
        )
      ),
      dialogueCompletion(
        "Reencontro novo",
        "Conhecido: 你好吗？ Voce: ___",
        "我很好，谢谢",
        ["我很好，谢谢", "我叫Matheus", "多少钱", "再见"],
        "我很好，谢谢 combina bem-estar e cortesia em qualquer reencontro."
      ),
    ];
  }

  if (lessonId === "l13") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Abrir o microtexto",
          "Qual frase ABRE o microtexto: 你好！谢谢。我是巴西人。再见！?",
          "你好！",
          ["你好！", "谢谢。", "我是巴西人。", "再见！"],
          "你好！ é a primeira frase do microtexto."
        ),
        audioToAction("Ouça a segunda frase", "谢谢", "谢谢。", ["谢谢。", "你好！", "我是巴西人。", "再见！"]),
      ];
    }
    if (pass === 2) {
      return [
        dialogueCompletion(
          "Depois de agradecer",
          "你好！ 谢谢。 ___",
          "我是巴西人。",
          ["我是巴西人。", "你好！", "再见！", "多少钱"],
          "我是巴西人。 vem depois de 谢谢。 na sequência do microtexto."
        ),
        contextualChoice(
          "Discriminar o fechamento",
          "Qual frase FECHA o microtexto?",
          "再见！",
          ["再见！", "你好！", "谢谢。", "我是巴西人。"],
          "再见！ é a última frase."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Monte a sequência",
          "你好！",
          ["谢", "谢", "。", "我", "是", "巴西人", "。"],
          ["谢", "谢", "。", "我", "是", "巴西人", "。", "再", "见"],
          "Depois de 你好！, monte as próximas duas frases do microtexto."
        ),
        reverseRecall(
          "Produza o microtexto completo",
          "Recite as 4 frases do microtexto, na ordem.",
          "你好！谢谢。我是巴西人。再见！",
          ["你好！谢谢。我是巴西人。再见！", "你好谢谢我是巴西人再见"]
        ),
      ];
    }
    return [
      dialogueCompletion(
        "Novo personagem",
        "Um novo personagem começa: 你好！ Você continua a sequência com o agradecimento: ___",
        "谢谢。",
        ["谢谢。", "再见！", "我是巴西人。", "多少钱"],
        "谢谢。 continua a sequência mesmo com um personagem novo."
      ),
      withEquivalentAccepts(
        reverseRecall(
          "Transferência",
          "Alguém que você nunca viu te aborda. Recite o microtexto completo para ela, do início ao fim.",
          "你好！谢谢。我是巴西人。再见！",
          ["你好！谢谢。我是巴西人。再见！", "你好谢谢我是巴西人再见"]
        )
      ),
    ];
  }

  if (lessonId === "p6-natureza") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Você vê a paisagem",
          "Você olha para a paisagem e vê uma montanha. O que você diz?",
          "这里有山",
          ["这里有山", "下雨了", "我很好", "多少钱"],
          "这里有山 descreve o que existe no lugar."
        ),
        audioToAction("Ouça o elemento", "山", "山", ["山", "水", "树", "花"]),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Troque o elemento",
          "这里有___",
          "山",
          ["山", "水", "树", "花"],
          "这里有 + elemento descreve a paisagem."
        ),
        dialogueCompletion(
          "Gostar do lugar",
          "A: 你喜欢这里吗？ B: ___",
          "我喜欢这里",
          ["我喜欢这里", "下雨了", "这里有山", "谢谢"],
          "我喜欢这里 responde se você gosta do lugar, não descreve o clima."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "De existir a descrever",
          "这里有山",
          ["山", "很", "漂", "亮"],
          ["山", "很", "漂", "亮", "水", "花"],
          "Transforme a existência da montanha numa descrição: 山很漂亮."
        ),
        reverseRecall("Diga que é bonita", "Diga que a montanha é muito bonita.", "山很漂亮", [
          "山很漂亮",
          "山很漂亮。",
        ]),
      ];
    }
    return [
      dialogueCompletion(
        "Paisagem com bom tempo",
        "Você chega a um lugar novo com montanhas. O tempo está bom hoje. O que você diz sobre a montanha?",
        "山很漂亮",
        ["山很漂亮", "下雨了", "我很好", "多少钱"],
        "山很漂亮 comenta a paisagem, combinando com o bom tempo da cena."
      ),
      withEquivalentAccepts(
        reverseRecall(
          "Transferência",
          "Você está numa cidade nova, no campo, com o tempo bom. Diga que gosta daqui.",
          "我喜欢这里",
          ["我喜欢这里", "我喜欢这里。"]
        )
      ),
    ];
  }

  if (lessonId === "l23") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Qual frase é o NOME?",
          "No microtexto 你好！我叫Matheus。我是巴西人。我有三个朋友。, qual frase apresenta o NOME?",
          "我叫Matheus。",
          ["我叫Matheus。", "我是巴西人。", "我有三个朋友。", "你好！"],
          "我叫Matheus。 apresenta o nome; as outras frases vêm depois."
        ),
        audioToAction("Ouça a linha dos amigos", "我有三个朋友", "我有三个朋友。", [
          "我有三个朋友。",
          "我叫Matheus。",
          "我是巴西人。",
          "你好！",
        ]),
      ];
    }
    if (pass === 2) {
      return [
        dialogueCompletion(
          "Depois do nome",
          "你好！ 我叫Matheus。 ___",
          "我是巴西人。",
          ["我是巴西人。", "我有三个朋友。", "你好！", "多少钱"],
          "我是巴西人。 vem depois do nome, antes dos amigos."
        ),
        substitutionDrill(
          "Troque a quantidade",
          "我有___个朋友。",
          "五",
          ["五", "三", "一", "二"],
          "Troque a quantidade de amigos mantendo a estrutura."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Junte origem e amigos",
          "我是巴西人。",
          ["我", "有", "三", "个", "朋友", "。"],
          ["我", "有", "三", "个", "朋友", "。", "是", "巴西人"],
          "Depois da origem, junte a linha dos amigos."
        ),
        reverseRecall(
          "Apresente-se completo",
          "Apresente-se com nome, origem e diga quantos amigos você tem.",
          "我叫Matheus，我是巴西人，我有三个朋友",
          ["我叫Matheus，我是巴西人，我有三个朋友", "我叫Matheus我是巴西人我有三个朋友"]
        ),
      ];
    }
    return [
      dialogueCompletion(
        "Festa nova",
        "Numa festa nova, alguém pergunta quem você é. Depois do nome e da origem, o que você diz sobre amigos?",
        "我有三个朋友。",
        ["我有三个朋友。", "谢谢。", "再见！", "多少钱？"],
        "我有三个朋友。 encerra a apresentação em qualquer situação nova."
      ),
      withEquivalentAccepts(
        reverseRecall(
          "Transferência",
          "Alguém que você nunca viu pede que você se apresente por completo, com amigos.",
          "我叫Matheus，我是巴西人，我有三个朋友",
          ["我叫Matheus，我是巴西人，我有三个朋友", "我有三个朋友"]
        )
      ),
    ];
  }

  if (lessonId === "l29") {
    if (pass === 1) {
      return [
        contextualChoice(
          "Quantos amigos?",
          "Você quer contar quantos amigos tem. O que você diz?",
          "我有三个朋友",
          ["我有三个朋友", "我喜欢中文", "我想喝茶", "我们走吧"],
          "我有三个朋友 diz a quantidade de amigos."
        ),
        audioToAction("Ouça o objeto", "书", "书", ["书", "茶", "朋友", "中文"]),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Troque o gosto",
          "我喜欢___",
          "中文",
          ["中文", "茶", "书", "朋友"],
          "我喜欢 + coisa expressa preferência."
        ),
        dialogueCompletion(
          "Aponte o objeto",
          "Alguém aponta um objeto na mesa. Você: 这是___",
          "书",
          ["书", "茶", "朋友", "中文"],
          "这是书 identifica o livro na cena."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "De identificar a usar",
          "这是书",
          ["我", "看", "书"],
          ["我", "看", "书", "喝", "茶"],
          "Transforme 这是书 na ação: 我看书."
        ),
        reverseRecall("Diga que está lendo", "Diga que você está lendo o livro.", "我看书", ["我看书", "我看书。"]),
      ];
    }
    return [
      dialogueCompletion(
        "Fim da cena",
        "Você conheceu alguém novo, falou de amigos, gostos e chá. Hora de encerrar. O que você diz?",
        "我们走吧",
        ["我们走吧", "我有三个朋友", "我喜欢中文", "我想喝茶"],
        "我们走吧 encerra a cena social, mesmo com um interlocutor novo."
      ),
      withEquivalentAccepts(
        reverseRecall(
          "Transferência",
          "Você e um amigo novo terminaram de falar sobre livros e chá. Convide-o a sair.",
          "我们走吧",
          ["我们走吧", "我们走吧。"]
        )
      ),
    ];
  }

  if (lessonId === "l30") {
    if (pass === 1) {
      return [
        audioToAction("Ouça e repita: amigos", "我有三个朋友", "我有三个朋友", [
          "我有三个朋友",
          "我喜欢中文",
          "我想喝茶",
          "我们走吧",
        ]),
        contextualChoice(
          "Reconheça a linha",
          "Qual linha do shadowing fala de PREFERÊNCIA por chinês?",
          "我喜欢中文",
          ["我喜欢中文", "我有三个朋友", "我想喝茶", "我们走吧"],
          "我喜欢中文 fala de gosto/preferência."
        ),
      ];
    }
    if (pass === 2) {
      return [
        substitutionDrill(
          "Troque a bebida",
          "我想喝___",
          "茶",
          ["茶", "水", "书", "朋友"],
          "我想喝 + bebida na linha de shadowing."
        ),
        dialogueCompletion(
          "Ordem do shadowing",
          "我有三个朋友。 我喜欢中文。 ___",
          "我想喝茶。",
          ["我想喝茶。", "我们走吧。", "你好！", "谢谢。"],
          "我想喝茶。 vem depois da linha de gosto, antes de encerrar."
        ),
      ];
    }
    if (pass === 3) {
      return [
        sentenceTransform(
          "Reconstitua sem ordem dada",
          "我喜欢中文",
          ["我", "想", "喝", "茶"],
          ["我", "想", "喝", "茶", "喜欢", "朋友"],
          "Depois da linha de gosto, reconstitua a linha do chá."
        ),
        reverseRecall(
          "Produza a linha final",
          "Sem ver as opções, encerre a cena falada.",
          "我们走吧",
          ["我们走吧", "我们走吧。"]
        ),
      ];
    }
    return [
      dialogueCompletion(
        "Nova cena de shadowing",
        "Com um novo amigo, você repete o mesmo roteiro: amigos, gosto, chá. Como encerra?",
        "我们走吧",
        ["我们走吧", "我有三个朋友", "我喜欢中文", "我想喝茶"],
        "我们走吧 encerra qualquer cena, mesmo repetida com outro interlocutor."
      ),
      withEquivalentAccepts(
        reverseRecall(
          "Transferência: produção completa",
          "Sem áudio-guia, produza as 4 linhas na ordem: amigos, gosto, chá e saída.",
          "我有三个朋友，我喜欢中文，我想喝茶，我们走吧",
          ["我有三个朋友，我喜欢中文，我想喝茶，我们走吧", "我有三个朋友我喜欢中文我想喝茶我们走吧"]
        )
      ),
    ];
  }

  return [];
}
