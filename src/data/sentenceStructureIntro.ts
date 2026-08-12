/**
 * Introdução gradual à estrutura de frase (mandarim pela lógica).
 *
 * Não é aula de gramática: o aluno vê o chinês, responde perguntas simples,
 * reconhece o padrão, e só depois recebe os nomes técnicos.
 *
 * Currículo real (não o exemplo ideal 我要茶 cedo demais):
 *   Em p3 o aluno já conhece 我是巴西人 / 我叫… / 你好吗？
 *   我要 + coisa (饭/茶) só aparece ~l26b/l27 — reforço do mesmo padrão lá.
 */

export type StructureIntroStage = 1 | 2 | 3 | 4 | 5;

export interface StructureIntroStageSpec {
  stage: StructureIntroStage;
  /** Lição em que esta etapa é ensinada (conteúdo autoral). */
  lessonId: string;
  titlePt: string;
  /** O que o aluno experimenta — sem jargão nas etapas 1–3. */
  learnerSees: string;
  /** Exemplos em chinês usados nesta etapa (já ensinados antes ou na lição). */
  chineseFirst: string[];
}

/**
 * Mapa canônico etapa → lição.
 * Atualize juntos: journey.ts, structuralConcepts.introducedAt/practicedAt.
 */
export const SENTENCE_STRUCTURE_INTRO: StructureIntroStageSpec[] = [
  {
    stage: 1,
    lessonId: "p3-ordem-das-palavras",
    titlePt: "Ver a frase em peças",
    learnerSees: "Frase chinesa + perguntas Quem? / O que faz? / O quê?",
    chineseFirst: ["我是巴西人", "我叫Matheus"],
  },
  {
    stage: 2,
    lessonId: "p3-ordem-das-palavras",
    titlePt: "A lógica",
    learnerSees: "quem + ação + coisa",
    chineseFirst: ["我是巴西人", "我叫Matheus"],
  },
  {
    stage: 3,
    lessonId: "p3-ordem-das-palavras",
    titlePt: "Pergunta no fim",
    learnerSees: "quem + ação + coisa + pergunta",
    chineseFirst: ["你好吗？"],
  },
  {
    stage: 4,
    lessonId: "p3-nomes-da-frase",
    titlePt: "Os nomes das peças",
    learnerSees: "quem=sujeito · ação=verbo · coisa=objeto · 吗=partícula de pergunta",
    chineseFirst: ["我是巴西人", "你好吗？"],
  },
  {
    stage: 5,
    lessonId: "l5-rev",
    titlePt: "Termos técnicos nas atividades",
    learnerSees: "Atividades usam sujeito / verbo / objeto / partícula com naturalidade",
    chineseFirst: ["我是巴西人", "你好吗？", "我叫Matheus"],
  },
];

/** Reforço do mesmo padrão quando 要 + coisa entra no currículo. */
export const SENTENCE_STRUCTURE_REINFORCEMENT = {
  lessonId: "l26b",
  chineseFirst: ["我要饭", "我要茶"],
  patternPt: "quem + ação + coisa",
  notePt:
    "Mesma lógica de p3: 我要饭 / 我要茶. Não é tradução palavra a palavra — é o padrão quem + ação + coisa.",
} as const;

/** Lição em que os nomes técnicos são apresentados (etapa 4). */
export const STRUCTURE_NAMES_LESSON_ID = "p3-nomes-da-frase";

/** Lição em que a lógica visual começa (etapas 1–3). */
export const STRUCTURE_LOGIC_LESSON_ID = "p3-ordem-das-palavras";

/** A partir daqui a UI pode usar só o termo técnico (etapa 5). */
export const STRUCTURE_TECHNICAL_LESSON_ID = "l5-rev";
