/**
 * Pedagogia V3.4 — Review Mastery.
 *
 * Revisões especiais NÃO usam o Mastery Loop de ensino (M1 descoberta → M4
 * domínio). Elas usam um modo próprio com quatro níveis de integração:
 *
 *   Review 1 — Recall
 *   Review 2 — Mixed
 *   Review 3 — Production
 *   Review 4 — Transfer
 *
 * A UX pode reutilizar os quatro segmentos do Mastery Loop, mas a semântica
 * interna é retenção / mistura / recuperação / transferência — nunca
 * "ensinar de novo o mesmo conteúdo em quatro passes".
 */
import type { LessonStep, StepKind } from "./journey";
import { withEquivalentAccepts } from "./masteryLoop";

export type ReviewMasteryLevel = 1 | 2 | 3 | 4;

export const REVIEW_MASTERY_LABELS: Record<ReviewMasteryLevel, string> = {
  1: "Recall",
  2: "Mixed",
  3: "Production",
  4: "Transfer",
};

export const REVIEW_MASTERY_LESSON_IDS = [
  "l14-char-rev",
  "p4-checkpoint-fundamentos",
  "l19-logica-rev",
  "l10-rev",
] as const;

export type ReviewMasteryLessonId = (typeof REVIEW_MASTERY_LESSON_IDS)[number];

export function isReviewMasteryLesson(lessonId: string): lessonId is ReviewMasteryLessonId {
  return (REVIEW_MASTERY_LESSON_IDS as readonly string[]).includes(lessonId);
}

export interface ReviewMasteryLevelProfile {
  level: ReviewMasteryLevel;
  intentPt: string;
  preferredKinds: StepKind[];
  discouragedKinds: StepKind[];
}

export const REVIEW_MASTERY_PROFILES: Record<ReviewMasteryLevel, ReviewMasteryLevelProfile> = {
  1: {
    level: 1,
    intentPt: "Recall — recuperação básica de itens já vistos",
    preferredKinds: ["recognize", "flashcard", "listen_select", "match_pairs", "contextual_choice"],
    discouragedKinds: ["intro"],
  },
  2: {
    level: 2,
    intentPt: "Mixed — misturar conceitos de várias lições sem revelar a origem",
    preferredKinds: ["match_pairs", "contextual_choice", "dialogue_completion", "substitution_drill", "comprehend"],
    discouragedKinds: ["intro", "flashcard"],
  },
  3: {
    level: 3,
    intentPt: "Production — produzir hanzi/frases sem apoio excessivo",
    preferredKinds: ["produce", "sentence_build", "translation_build", "reverse_recall", "sentence_transform", "hanzi_build"],
    discouragedKinds: ["intro", "flashcard", "recognize"],
  },
  4: {
    level: 4,
    intentPt: "Transfer — usar o repertório em contexto novo",
    preferredKinds: ["conversation_scene", "dialogue_completion", "reverse_recall", "contextual_choice", "city_context"],
    discouragedKinds: ["intro", "flashcard", "recognize"],
  },
};

export interface ReviewMasterySpec {
  lessonId: ReviewMasteryLessonId;
  titlePt: string;
  sourcePoolPt: string;
  /** Itens/frases que a revisão cobre (já ensinados antes). */
  retainedItems: { hanzi: string; meaningPt: string }[];
}

export const REVIEW_MASTERY_SPECS: Record<ReviewMasteryLessonId, ReviewMasterySpec> = {
  "l14-char-rev": {
    lessonId: "l14-char-rev",
    titlePt: "Revisão de reconhecimento",
    sourcePoolPt: "Caracteres fundamentais já apresentados (一 三 口 日 目 我 你 不 是).",
    retainedItems: [
      { hanzi: "一", meaningPt: "um" },
      { hanzi: "三", meaningPt: "três" },
      { hanzi: "口", meaningPt: "boca" },
      { hanzi: "日", meaningPt: "sol; dia" },
      { hanzi: "目", meaningPt: "olho" },
      { hanzi: "我", meaningPt: "eu" },
      { hanzi: "你", meaningPt: "você" },
      { hanzi: "不", meaningPt: "não" },
      { hanzi: "是", meaningPt: "ser; é" },
    ],
  },
  "p4-checkpoint-fundamentos": {
    lessonId: "p4-checkpoint-fundamentos",
    titlePt: "Checkpoint dos fundamentos",
    sourcePoolPt: "Cumprimentos, despedida, apresentação e caracteres-base da fase.",
    retainedItems: [
      { hanzi: "你好", meaningPt: "olá" },
      { hanzi: "谢谢", meaningPt: "obrigado" },
      { hanzi: "再见", meaningPt: "até logo" },
      { hanzi: "我叫", meaningPt: "eu me chamo" },
      { hanzi: "我", meaningPt: "eu" },
      { hanzi: "是", meaningPt: "ser" },
      { hanzi: "人", meaningPt: "pessoa" },
      { hanzi: "一二三", meaningPt: "um dois três" },
    ],
  },
  "l19-logica-rev": {
    lessonId: "l19-logica-rev",
    titlePt: "Revisão de peças",
    sourcePoolPt: "Compostos lógicos (林 森 明 休 好 从 中 吗) já montados.",
    retainedItems: [
      { hanzi: "明", meaningPt: "claro / brilhante" },
      { hanzi: "林", meaningPt: "bosque" },
      { hanzi: "吗", meaningPt: "partícula de pergunta" },
      { hanzi: "好", meaningPt: "bom" },
      { hanzi: "休", meaningPt: "descansar" },
    ],
  },
  "l10-rev": {
    lessonId: "l10-rev",
    titlePt: "Revisão do módulo",
    sourcePoolPt: "Preferência, pedido e preço do módulo de vida cotidiana.",
    retainedItems: [
      { hanzi: "我喜欢", meaningPt: "eu gosto" },
      { hanzi: "我想喝", meaningPt: "eu quero beber" },
      { hanzi: "多少钱", meaningPt: "quanto custa?" },
      { hanzi: "水", meaningPt: "água" },
      { hanzi: "木", meaningPt: "madeira; árvore" },
    ],
  },
};

function reverseRecall(title: string, situationPt: string, answer: string, accepts?: string[]): LessonStep {
  return {
    kind: "reverse_recall",
    title,
    situationPt,
    body: situationPt,
    answer,
    accepts: accepts ?? [answer],
    mode: "free_reflection",
    isNoHint: true,
  };
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
    speaker: "Situacao",
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

/**
 * Passos curados por nível de Review Mastery.
 * Não reensina — só recupera, mistura, produz e transfere.
 */
export function reviewMasteryStepsFor(lessonId: string, level: ReviewMasteryLevel): LessonStep[] {
  if (!isReviewMasteryLesson(lessonId)) return [];

  if (lessonId === "l14-char-rev") {
    if (level === 1) {
      return [
        { kind: "recognize", title: "Recall 我", hanzi: "我", prompt: "Qual é este caractere?", correctAnswer: "我", options: ["我", "你", "不", "是"] },
        { kind: "recognize", title: "Recall 你", hanzi: "你", prompt: "Qual é este caractere?", correctAnswer: "你", options: ["你", "我", "日", "口"] },
        { kind: "recognize", title: "Recall 是", hanzi: "是", prompt: "Qual é este caractere?", correctAnswer: "是", options: ["是", "不", "三", "目"] },
      ];
    }
    if (level === 2) {
      return [
        {
          kind: "match_pairs",
          title: "Misture significados",
          prompt: "Combine caractere e sentido.",
          pairs: [
            { left: "我", right: "eu" },
            { left: "你", right: "você" },
            { left: "不", right: "não" },
            { left: "是", right: "ser / é" },
          ],
        },
        contextualChoice("Mistura", "Qual caractere completa a ideia de negação?", "不", ["不", "是", "日", "三"]),
      ];
    }
    if (level === 3) {
      return [
        { kind: "produce", title: "Produza 一二三", prompt: "Escreva/selecione 一二三", correctAnswer: "一二三", options: ["一二三", "我你是", "不日目", "口三日"] },
        reverseRecall("Produza 我", "Digite o caractere para 'eu'.", "我", ["我"]),
      ];
    }
    return [
      contextualChoice("Novo contexto", "Numa placa, você precisa achar 'não'. Qual é?", "不", ["不", "是", "我", "你"]),
      reverseRecall("Transfer", "Alguém aponta para você. Qual caractere corresponde?", "你", ["你"]),
    ];
  }

  if (lessonId === "p4-checkpoint-fundamentos") {
    if (level === 1) {
      return [
        { kind: "flashcard", title: "Recall 你好", chunkId: "nihao" },
        { kind: "flashcard", title: "Recall 谢谢", chunkId: "xiexie" },
        { kind: "flashcard", title: "Recall 再见", chunkId: "zaijian" },
      ];
    }
    if (level === 2) {
      return [
        contextualChoice("Mistura social", "Alguém te ajudou. O que você diz?", "谢谢", ["谢谢", "再见", "你好吗", "多少钱"]),
        dialogueCompletion("Encadeie", "NPC: 你好！ Você: ___", "你好", ["你好", "一二三", "医院", "辣"], "Responda o cumprimento."),
      ];
    }
    if (level === 3) {
      return [
        withEquivalentAccepts(reverseRecall("Apresente-se", "Comece sua apresentação.", "我叫", ["我叫", "我叫。"])),
        { kind: "produce", title: "Produza 一二三", prompt: "Produza a sequência", correctAnswer: "一二三", options: ["一二三", "你好", "谢谢", "再见"] },
      ];
    }
    return [
      dialogueCompletion(
        "Encontro novo",
        "Você encontra alguém na rua. Cumprimente e depois se despeça na sequência mental: primeiro ___",
        "你好",
        ["你好", "再见", "多少钱", "医院"]
      ),
      withEquivalentAccepts(
        reverseRecall("Transfer social", "Hora de ir embora depois do checkpoint.", "再见", ["再见", "再见！"])
      ),
    ];
  }

  if (lessonId === "l19-logica-rev") {
    if (level === 1) {
      return [
        {
          kind: "match_pairs",
          title: "Recall compostos",
          prompt: "Combine peça e resultado.",
          pairs: [
            { left: "日+月", right: "明" },
            { left: "木+木", right: "林" },
            { left: "口+马", right: "吗" },
          ],
        },
      ];
    }
    if (level === 2) {
      return [
        contextualChoice("Mistura", "Qual composto significa 'bosque'?", "林", ["林", "明", "吗", "休"]),
        contextualChoice("Mistura 2", "Qual partícula de pergunta?", "吗", ["吗", "林", "好", "休"]),
      ];
    }
    if (level === 3) {
      return [
        reverseRecall("Produza 明", "Qual hanzi é sol+lua?", "明", ["明"]),
        reverseRecall("Produza 林", "Qual hanzi é árvore+árvore?", "林", ["林"]),
      ];
    }
    return [
      contextualChoice(
        "Contexto novo",
        "Numa frase '你好吗？', qual peça marca a pergunta?",
        "吗",
        ["吗", "林", "明", "休"]
      ),
      reverseRecall("Transfer", "Você quer dizer 'bom/bem' com o composto 女+子. Qual é?", "好", ["好"]),
    ];
  }

  // l10-rev
  if (level === 1) {
    return [
      { kind: "flashcard", title: "Recall 我喜欢", chunkId: "woxihuan" },
      { kind: "flashcard", title: "Recall 多少钱", chunkId: "duoshaoqian" },
      { kind: "flashcard", title: "Recall 我想喝", chunkId: "woxianghe" },
    ];
  }
  if (level === 2) {
    return [
      contextualChoice("Mistura", "No restaurante você quer chá. O que combina?", "我想喝", ["我想喝", "多少钱", "再见", "林"]),
      contextualChoice("Mistura preço", "Você aponta para um prato. O que pergunta?", "多少钱", ["多少钱", "我喜欢", "你好", "明"]),
    ];
  }
  if (level === 3) {
    return [
      withEquivalentAccepts(reverseRecall("Produza preferência", "Diga que você gosta.", "我喜欢", ["我喜欢", "我喜欢。"])),
      withEquivalentAccepts(reverseRecall("Produza preço", "Pergunte o preço.", "多少钱", ["多少钱", "多少钱？"])),
    ];
  }
  return [
    dialogueCompletion(
      "Cena do restaurante",
      "Você gosta de chá e quer pedir. NPC espera. Você: ___",
      "我想喝",
      ["我想喝", "再见", "林", "明"]
    ),
    withEquivalentAccepts(
      reverseRecall("Transfer compra", "No mercado, pergunte o preço sem dizer de qual aula veio.", "多少钱", [
        "多少钱",
        "多少钱？",
      ])
    ),
  ];
}

export function reviewMasteryProfile(level: ReviewMasteryLevel): ReviewMasteryLevelProfile {
  return REVIEW_MASTERY_PROFILES[level];
}
