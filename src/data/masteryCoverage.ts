/**
 * Pedagogia V3.3 — Mastery Coverage Expansion.
 *
 * Camada de CLASSIFICACAO, nao de execucao: mapeia toda a Jornada em
 * categorias/ondas/status de migracao para o Mastery Loop (masteryLoop.ts,
 * masteryPilot.ts). Este arquivo NAO recria o motor de mastery — apenas
 * organiza QUAIS licoes ja migraram, quais entram na remessa "wave 1" e
 * quais nunca vao (labs de tom/hanzi, revisoes, telas de sistema).
 *
 * Ondas:
 * - migrated: ja tem masteryLoop: true na Jornada (V3–V3.3), 40 licoes.
 * - wave1-candidate: reservado para candidatas futuras; Wave 1 (24) ja migrada.
 * - later: fala/leitura fora da wave 1, aguardando expansao futura (PED-050).
 * - not-applicable: sound-lab/hanzi-lab/system — drill isolado ou tela
 *   conceitual, sem "situacao comunicativa" para aplicar mastery loop.
 * - review-special: checkpoints/revisoes — usam os proprios itens ja
 *   migrados como insumo (ver TRANSFER_REVIEWS), nao precisam de mastery
 *   loop proprio.
 */

export type MasteryWave = "foundation" | "daily-life" | "functional" | "advanced" | "china-real" | "survival";

export type MasteryMigrationStatus = "migrated" | "wave1-candidate" | "later" | "not-applicable" | "review-special";

export interface MasteryLessonCoverageMeta {
  lessonId: string;
  category:
    | "foundation"
    | "daily-life"
    | "travel"
    | "china-real"
    | "survival"
    | "intermediate"
    | "review"
    | "sound-lab"
    | "hanzi-lab"
    | "system";
  wave?: MasteryWave;
  status: MasteryMigrationStatus;
  notesPt?: string;
}

// ————————————————————————————————————————————————————————————————
// Onda 1 — as 24 licoes que entram nesta remessa.
// ————————————————————————————————————————————————————————————————

export const WAVE1_EXPANSION_LESSON_IDS = [
  "p1-ate-logo",
  "p1-qingwen-cortesia",
  "p1-primeira-conversa",
  "l9",
  "l9-qual-nome",
  "l10",
  "l11",
  "l11-falo-pouco",
  "p3-wobuhui-shuo-zhongwen",
  "p3-qing-zai-shuo-yibian",
  "l13-dialogo-ola",
  "l13-dialogo-nome",
  "l19",
  "l20",
  "l21",
  "l22",
  "l25",
  "l26",
  "l28",
  "p6-saude",
  "p6-clima",
  "p7-imersao-mercado",
  "p7-imersao-casa-amigo",
  "p3-wohenhao",
] as const;

export type Wave1ExpansionLessonId = (typeof WAVE1_EXPANSION_LESSON_IDS)[number];

// ————————————————————————————————————————————————————————————————
// Meta de cobertura por licao — TODA a Jornada esta classificada aqui.
// ————————————————————————————————————————————————————————————————

export const MASTERY_LESSON_COVERAGE: readonly MasteryLessonCoverageMeta[] = [
  // --- Fase 1 · Primeiro Contato — bootstrap/engine (antes da Jornada) ---
  { lessonId: "p1-o-que-e-mandarim", category: "system", status: "not-applicable", notesPt: "Tela conceitual, sem situacao comunicativa." },
  { lessonId: "p1-o-que-e-pinyin", category: "system", status: "not-applicable", notesPt: "Tela conceitual sobre pinyin." },
  { lessonId: "p1-o-que-e-tom", category: "system", status: "not-applicable", notesPt: "Tela conceitual sobre tom." },
  { lessonId: "p1-o-que-e-hanzi", category: "system", status: "not-applicable", notesPt: "Tela conceitual sobre hanzi." },
  { lessonId: "p1-primeiros-hanzi", category: "hanzi-lab", status: "not-applicable", notesPt: "Laboratorio de montagem de hanzi, sem fala situacional." },
  { lessonId: "p1-engine-2-lab", category: "system", status: "not-applicable", notesPt: "Laboratorio generico de exercicios do motor." },

  // --- Fase 1 · unidades u1-1/u1-2 ---
  { lessonId: "l1", category: "system", status: "not-applicable", notesPt: "Introducao ao sistema mandarim/pinyin/tom." },
  { lessonId: "l2", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Cumprimento (Ola) — mastery loop V3." },
  { lessonId: "l3", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Tudo bem? / Estou bem — mastery loop V3." },
  { lessonId: "l4", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Obrigado / De nada — mastery loop V3." },
  { lessonId: "p1-ate-logo", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Despedida (再见) — mastery loop V3.3 wave 1." },
  { lessonId: "p1-primeira-conversa", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Primeiro mini-dialogo — mastery loop V3.3 wave 1." },
  { lessonId: "p1-qingwen-cortesia", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Com licenca (请问) — mastery loop V3.3 wave 1." },

  // --- Fase 2 · Som e Tons — tudo sound-lab, sem mastery loop ---
  { lessonId: "p2-ma-primeiro-tom", category: "sound-lab", status: "not-applicable" },
  { lessonId: "p2-ma-segundo-tom", category: "sound-lab", status: "not-applicable" },
  { lessonId: "p2-ma-terceiro-tom", category: "sound-lab", status: "not-applicable" },
  { lessonId: "p2-ma-quarto-tom", category: "sound-lab", status: "not-applicable" },
  { lessonId: "p2-comparar-tom-1-4", category: "sound-lab", status: "not-applicable" },
  { lessonId: "p2-comparar-tom-2-3", category: "sound-lab", status: "not-applicable" },
  { lessonId: "p2-tons-nihao", category: "sound-lab", status: "not-applicable" },
  { lessonId: "p2-tons-xiexie", category: "sound-lab", status: "not-applicable" },
  { lessonId: "l5", category: "sound-lab", status: "not-applicable", notesPt: "Quatro tons — drill perceptivo." },
  { lessonId: "l6", category: "sound-lab", status: "not-applicable", notesPt: "Treino guiado de tom." },
  { lessonId: "l7", category: "sound-lab", status: "not-applicable", notesPt: "A silaba yao — drill de som." },
  { lessonId: "l8", category: "sound-lab", status: "not-applicable", notesPt: "Tons em 好/谢 — drill de som." },
  { lessonId: "l8-compare", category: "sound-lab", status: "not-applicable" },
  { lessonId: "l8-shi", category: "sound-lab", status: "not-applicable" },
  { lessonId: "p2-sons-brasileiros", category: "sound-lab", status: "not-applicable", notesPt: "Sons que brasileiros confundem — drill perceptivo." },
  { lessonId: "p2-numeros-1-5", category: "sound-lab", status: "not-applicable", notesPt: "Numeros pelo som, foco em percepcao auditiva." },

  // --- Fase 3 · Frases Reais — u3-1 (Quem sou eu) ---
  { lessonId: "p3-wohenhao", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Estou bem (variante) — mastery loop V3.3 wave 1." },
  { lessonId: "p3-wobuhui-shuo-zhongwen", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Nao falo chines — mastery loop V3.3 wave 1." },
  { lessonId: "p3-qing-zai-shuo-yibian", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Por favor, repita — mastery loop V3.3 wave 1." },
  { lessonId: "l9", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Me apresentar (我叫...) — mastery loop V3.3 wave 1." },
  { lessonId: "l9-tudo-bem", category: "foundation", status: "later", notesPt: "Variante de Tudo bem?, fora da wave 1." },
  { lessonId: "l9-qual-nome", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Como voce se chama? — mastery loop V3.3 wave 1." },
  { lessonId: "l10", category: "foundation", wave: "foundation", status: "migrated", notesPt: "De onde sou — mastery loop V3.3 wave 1." },
  { lessonId: "l11", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Nao entendi — mastery loop V3.3 wave 1." },
  { lessonId: "l11-falo-pouco", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Falo um pouco — mastery loop V3.3 wave 1." },

  // --- Fase 3 · u3-2 (Primeira leitura) ---
  { lessonId: "l12", category: "hanzi-lab", status: "not-applicable", notesPt: "Pecas da frase — foco em analise estrutural, nao fala." },
  { lessonId: "l13", category: "foundation", status: "later", notesPt: "Microtexto 1 — leitura, fora da wave 1." },
  { lessonId: "l13-dialogo-ola", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Microdialogo de cumprimento — mastery loop V3.3 wave 1." },
  { lessonId: "l13-dialogo-nome", category: "foundation", wave: "foundation", status: "migrated", notesPt: "Microdialogo de apresentacao — mastery loop V3.3 wave 1." },
  { lessonId: "p3-ordem-das-palavras", category: "system", status: "not-applicable", notesPt: "Explicacao de ordem gramatical, sem situacao comunicativa." },
  { lessonId: "p3-nomes-da-frase", category: "system", status: "not-applicable", notesPt: "Nomenclatura de pecas da frase — conceitual." },

  // --- Fase 4 · Hanzi Logico — tudo hanzi-lab/system ---
  { lessonId: "l14", category: "hanzi-lab", status: "not-applicable", notesPt: "Radicais basicos." },
  { lessonId: "l14-numeros-visuais", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "l14-pecas-natureza", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "l14-frase-minima", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "l14-char-rev", category: "review", status: "review-special", notesPt: "Revisao de reconhecimento de caracteres." },
  { lessonId: "l15", category: "hanzi-lab", status: "not-applicable", notesPt: "Repetir intensifica — drill de memoria de traco." },
  { lessonId: "l16", category: "hanzi-lab", status: "not-applicable", notesPt: "妈: sentido + som." },
  { lessonId: "l17", category: "hanzi-lab", status: "not-applicable", notesPt: "Sol e lua — composicao logica." },
  { lessonId: "l18", category: "hanzi-lab", status: "not-applicable", notesPt: "Amigo — composicao logica." },
  { lessonId: "p4-checkpoint-fundamentos", category: "review", status: "review-special", notesPt: "Checkpoint dos fundamentos — revisao acumulada da fase." },
  { lessonId: "p4-num-123", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-num-45", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-num-678", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-num-910", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-mu", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-ren", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-kou", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-ri", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-yue", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-shan", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-shui", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-tian", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-huo", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-da", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-xiao", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-zhong", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-bu", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-shi", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-wo", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p4-char-ni", category: "hanzi-lab", status: "not-applicable" },

  // --- Fase 5 · Construcao Logica — u5-0 (peca+som), tudo hanzi-lab ---
  { lessonId: "p5-mu-mu-lin", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p5-mu-mu-mu-sen", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p5-ri-yue-ming", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p5-ren-mu-xiu", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p5-nv-zi-hao", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p5-ren-ren-cong", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p5-ren-ren-ren-zhong", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p5-nv-ma-mae", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "p5-kou-ma-pergunta", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "l19-logica-madeira", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "l19-logica-luz", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "l19-logica-pessoas", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "l19-logica-ma", category: "hanzi-lab", status: "not-applicable" },
  { lessonId: "l19-logica-rev", category: "review", status: "review-special", notesPt: "Revisao de pecas logicas da unidade." },

  // --- Fase 5 · u5-1 (Numeros 1 a 10) / u5-2 (Palavras compostas) ---
  { lessonId: "l19", category: "intermediate", wave: "functional", status: "migrated", notesPt: "Um a cinco — mastery loop V3.3 wave 1." },
  { lessonId: "l20", category: "intermediate", wave: "functional", status: "migrated", notesPt: "Seis a dez — mastery loop V3.3 wave 1." },
  { lessonId: "l21", category: "intermediate", wave: "functional", status: "migrated", notesPt: "Nos e voces — mastery loop V3.3 wave 1." },
  { lessonId: "l22", category: "intermediate", wave: "functional", status: "migrated", notesPt: "China e amigos — mastery loop V3.3 wave 1." },
  { lessonId: "l23", category: "intermediate", status: "later", notesPt: "Microtexto 2 — leitura, fora da wave 1." },

  // --- Fase 6 · Vida Cotidiana — u6-1 (Familia) ---
  { lessonId: "l24", category: "daily-life", wave: "daily-life", status: "migrated", notesPt: "Pai e mae — mastery loop V3.2." },
  { lessonId: "l25", category: "daily-life", wave: "daily-life", status: "migrated", notesPt: "Perguntas uteis — mastery loop V3.3 wave 1." },

  // --- Fase 6 · u6-2 (Comida e compras) ---
  { lessonId: "l26", category: "daily-life", wave: "daily-life", status: "migrated", notesPt: "Fome e gosto — mastery loop V3.3 wave 1." },
  { lessonId: "l26b", category: "daily-life", wave: "daily-life", status: "migrated", notesPt: "No cardapio — mastery loop V3.2." },
  { lessonId: "l27", category: "daily-life", wave: "daily-life", status: "migrated", notesPt: "Na loja — mastery loop V3.2." },
  { lessonId: "l28", category: "daily-life", wave: "daily-life", status: "migrated", notesPt: "Vamos embora — mastery loop V3.3 wave 1." },
  { lessonId: "p6-rotina-trabalho", category: "daily-life", wave: "daily-life", status: "migrated", notesPt: "Rotina e trabalho — mastery loop V3.2." },
  { lessonId: "p6-cidade-lugares", category: "travel", wave: "daily-life", status: "migrated", notesPt: "Cidade e lugares — mastery loop V3.1." },
  { lessonId: "p6-china-cidades", category: "china-real", wave: "china-real", status: "migrated", notesPt: "Cidades da China — mastery loop V3.1." },
  { lessonId: "p6-china-cidades-2", category: "china-real", wave: "china-real", status: "migrated", notesPt: "Cidades da China onda 2 — mastery loop V3.2." },
  { lessonId: "p6-china-ruas", category: "china-real", wave: "china-real", status: "migrated", notesPt: "Ruas e enderecos — mastery loop V3.1." },
  { lessonId: "p6-saude", category: "daily-life", wave: "daily-life", status: "migrated", notesPt: "Saude — mastery loop V3.3 wave 1." },
  { lessonId: "p6-horarios", category: "daily-life", wave: "daily-life", status: "migrated", notesPt: "Que horas sao? — mastery loop V3.2." },
  { lessonId: "p6-natureza", category: "daily-life", status: "later", notesPt: "A natureza — fora da wave 1." },
  { lessonId: "p6-clima", category: "daily-life", wave: "daily-life", status: "migrated", notesPt: "O tempo (clima) — mastery loop V3.3 wave 1." },
  { lessonId: "p6-direcoes", category: "travel", wave: "china-real", status: "migrated", notesPt: "Direcoes — mastery loop V3.1." },
  { lessonId: "p6-compras", category: "daily-life", wave: "daily-life", status: "migrated", notesPt: "Compras: roupas e itens — mastery loop V3.2." },
  { lessonId: "p6-survival-mandarin", category: "survival", wave: "survival", status: "migrated", notesPt: "Survival Mandarin (pagar/hotel/ajuda) — mastery loop V3.2." },
  { lessonId: "l10-rev", category: "review", status: "review-special", notesPt: "Revisao do modulo — usa itens ja migrados como insumo." },

  // --- Fase 7 · Leitura Graduada ---
  { lessonId: "l29", category: "intermediate", status: "later", notesPt: "Eu e meus amigos — leitura, fora da wave 1." },
  { lessonId: "l30", category: "intermediate", status: "later", notesPt: "Leitura em voz alta — fora da wave 1." },
  { lessonId: "p7-imersao-mercado", category: "china-real", wave: "china-real", status: "migrated", notesPt: "Imersao no mercado — mastery loop V3.3 wave 1." },
  { lessonId: "p7-imersao-estacao", category: "china-real", wave: "china-real", status: "migrated", notesPt: "Imersao na estacao — mastery loop V3.1." },
  { lessonId: "p7-imersao-casa-amigo", category: "china-real", wave: "china-real", status: "migrated", notesPt: "Imersao na casa de um amigo — mastery loop V3.3 wave 1." },
];

// ————————————————————————————————————————————————————————————————
// Alvos de cobertura.
// ————————————————————————————————————————————————————————————————

/** Piso minimo de licoes migradas para a remessa V3.3 ser considerada suficiente. */
export const TARGET_MASTERY_MIN = 35;

/** Alvo ideal de licoes migradas (16 atuais + 24 da wave 1 = 40). */
export const TARGET_MASTERY_IDEAL = 40;

// ————————————————————————————————————————————————————————————————
// Helpers.
// ————————————————————————————————————————————————————————————————

const coverageById = new Map<string, MasteryLessonCoverageMeta>(
  MASTERY_LESSON_COVERAGE.map((meta) => [meta.lessonId, meta])
);

/** Meta de cobertura de uma licao especifica, ou undefined se nao classificada. */
export function getCoverageMeta(lessonId: string): MasteryLessonCoverageMeta | undefined {
  return coverageById.get(lessonId);
}

/** Todas as licoes classificadas com um determinado status. */
export function listByStatus(status: MasteryMigrationStatus): MasteryLessonCoverageMeta[] {
  return MASTERY_LESSON_COVERAGE.filter((meta) => meta.status === status);
}

export interface MasteryCoverageStats {
  /** Total de ids de licao passados pelo chamador (a Jornada inteira). */
  totalLessons: number;
  /** Quantas dessas licoes tem meta de cobertura registrada aqui. */
  classifiedLessons: number;
  /** Ids passados pelo chamador sem entrada em MASTERY_LESSON_COVERAGE. */
  unclassifiedLessons: number;
  migratedCount: number;
  wave1CandidateCount: number;
  laterCount: number;
  notApplicableCount: number;
  reviewSpecialCount: number;
  /** migrated + wave1-candidate + later — licoes que algum dia podem ganhar mastery loop. */
  applicableLessons: number;
  /** migratedCount / applicableLessons, em percentual (0–100, 1 casa decimal). */
  coveragePercent: number;
  meetsMin: boolean;
  meetsIdeal: boolean;
  remainingToMin: number;
  remainingToIdeal: number;
}

/**
 * Estatisticas de cobertura do Mastery Loop sobre a Jornada.
 * `migratedIds` reflete o estado REAL da Jornada (masteryLoop: true), nao a
 * classificacao estatica deste arquivo — assim o numero acompanha journey.ts
 * mesmo antes de uma licao "wave1-candidate" ser efetivamente migrada.
 */
export function coverageStats(
  allLessonIds: readonly string[],
  migratedIds: readonly string[]
): MasteryCoverageStats {
  const migratedSet = new Set(migratedIds);

  let wave1CandidateCount = 0;
  let laterCount = 0;
  let notApplicableCount = 0;
  let reviewSpecialCount = 0;
  let unclassifiedLessons = 0;

  for (const lessonId of allLessonIds) {
    const meta = coverageById.get(lessonId);
    if (!meta) {
      unclassifiedLessons += 1;
      continue;
    }
    switch (meta.status) {
      case "wave1-candidate":
        wave1CandidateCount += 1;
        break;
      case "later":
        laterCount += 1;
        break;
      case "not-applicable":
        notApplicableCount += 1;
        break;
      case "review-special":
        reviewSpecialCount += 1;
        break;
      case "migrated":
        // Contabilizado abaixo via migratedIds (estado real da Jornada).
        break;
    }
  }

  const migratedCount = migratedSet.size;
  const applicableLessons = migratedCount + wave1CandidateCount + laterCount;
  const coveragePercent =
    applicableLessons > 0 ? Math.round((migratedCount / applicableLessons) * 1000) / 10 : 0;

  return {
    totalLessons: allLessonIds.length,
    classifiedLessons: allLessonIds.length - unclassifiedLessons,
    unclassifiedLessons,
    migratedCount,
    wave1CandidateCount,
    laterCount,
    notApplicableCount,
    reviewSpecialCount,
    applicableLessons,
    coveragePercent,
    meetsMin: migratedCount >= TARGET_MASTERY_MIN,
    meetsIdeal: migratedCount >= TARGET_MASTERY_IDEAL,
    remainingToMin: Math.max(0, TARGET_MASTERY_MIN - migratedCount),
    remainingToIdeal: Math.max(0, TARGET_MASTERY_IDEAL - migratedCount),
  };
}

// ————————————————————————————————————————————————————————————————
// Revisoes de transferencia — misturam conteudo de varias licoes sem
// revelar a origem ("isto e da licao de numeros"). Servem como checkpoint
// apos um grupo de licoes wave1-candidate ser migrado.
// ————————————————————————————————————————————————————————————————

export type TransferReviewId = "foundation_transfer" | "daily_life_transfer" | "city_transfer" | "shopping_transfer";

export interface TransferReviewSpec {
  id: TransferReviewId;
  titlePt: string;
  prerequisiteLessonIds: string[];
  situationPt: string;
  /** Pares de prompt/resposta curados, sem revelar a licao de origem. */
  tasks: { situationPt: string; answer: string; accepts?: string[]; options?: string[] }[];
}

export const TRANSFER_REVIEWS: TransferReviewSpec[] = [
  {
    id: "foundation_transfer",
    titlePt: "Revisao: contato e apresentacao",
    prerequisiteLessonIds: ["l2", "l3", "l4", "p1-ate-logo", "l9", "l9-qual-nome", "l10", "l11"],
    situationPt:
      "Uma sequencia de mini-encontros: cumprimentar, agradecer, se despedir e se apresentar, tudo misturado.",
    tasks: [
      {
        situationPt: "Alguem te ve pela primeira vez e diz 你好. Como voce responde?",
        answer: "你好",
        accepts: ["你好", "你好！"],
      },
      {
        situationPt: "Ela pergunta 你好吗？ Diga que voce esta bem.",
        answer: "我很好",
        accepts: ["我很好", "我很好。"],
      },
      {
        situationPt: "Ela te ajudou com as malas. Como voce agradece?",
        answer: "谢谢",
        accepts: ["谢谢", "谢谢！"],
      },
      {
        situationPt: "Alguem pergunta seu nome. Qual frase inicia sua apresentacao?",
        answer: "我叫",
        accepts: ["我叫"],
        options: ["我叫", "你好吗", "多少钱", "再见"],
      },
      {
        situationPt: "Hora de ir. Como voce se despede?",
        answer: "再见",
        accepts: ["再见", "再见！"],
      },
    ],
  },
  {
    id: "daily_life_transfer",
    titlePt: "Revisao: familia, comida e rotina",
    prerequisiteLessonIds: ["l24", "l25", "l26", "l26b", "l27", "p6-rotina-trabalho", "p6-horarios", "p6-saude"],
    situationPt: "Um dia comum: apresentar a familia, pedir comida, falar da rotina e da saude.",
    tasks: [
      {
        situationPt: "Voce mostra uma foto e aponta para seu pai. O que voce diz?",
        answer: "这是我爸爸",
        accepts: ["这是我爸爸", "这是我爸爸。"],
      },
      {
        situationPt: "No restaurante, voce quer agua. O que voce diz?",
        answer: "我要水",
        accepts: ["我要水", "我要水。", "我想喝水"],
      },
      {
        situationPt: "Voce acabou de acordar. Como voce diz isso?",
        answer: "我起床",
        accepts: ["我起床", "我起床。"],
      },
      {
        situationPt: "Voce quer saber que horas sao. O que voce pergunta?",
        answer: "现在几点？",
        accepts: ["现在几点？", "现在几点"],
      },
      {
        situationPt: "Voce nao esta bem e quer avisar. Qual opcao combina melhor?",
        answer: "我病了",
        options: ["我病了", "我很好", "多少钱", "再见"],
      },
    ],
  },
  {
    id: "city_transfer",
    titlePt: "Revisao: cidades, ruas e direcoes",
    prerequisiteLessonIds: [
      "p6-china-cidades",
      "p6-china-cidades-2",
      "p6-china-ruas",
      "p6-direcoes",
      "p7-imersao-estacao",
      "p7-imersao-mercado",
    ],
    situationPt: "Voce viaja de cidade em cidade: reconhecer o lugar, achar a rua e pedir informacao no caminho.",
    tasks: [
      {
        situationPt: "Voce quer saber onde fica a capital da China. O que pergunta?",
        answer: "北京在哪里？",
        accepts: ["北京在哪里？", "北京在哪里"],
      },
      {
        situationPt: "Voce esta perdido numa rua e quer saber como chegar. O que pergunta?",
        answer: "怎么走？",
        accepts: ["怎么走？", "怎么走"],
      },
      {
        situationPt: "O atendente pede para virar. Qual instrucao combina com virar para a esquerda?",
        answer: "左转",
        options: ["左转", "右转", "一直走", "多少钱"],
      },
      {
        situationPt: "Voce chegou de trem e precisa de um bilhete de volta. O que voce diz?",
        answer: "我要票",
        accepts: ["我要票", "我要票。"],
      },
      {
        situationPt: "Voce esta na Nanjing Road e quer confirmar que esta no lugar certo. O que voce diz?",
        answer: "我在南京路",
        accepts: ["我在南京路", "我在南京路。"],
      },
    ],
  },
  {
    id: "shopping_transfer",
    titlePt: "Revisao: comprar e negociar",
    prerequisiteLessonIds: ["l27", "p6-compras", "p6-survival-mandarin", "p7-imersao-mercado"],
    situationPt: "No mercado ou na loja: perguntar preco, escolher item, reclamar do preco e pagar.",
    tasks: [
      {
        situationPt: "Voce aponta para um produto e quer saber o preco. O que voce pergunta?",
        answer: "多少钱？",
        accepts: ["多少钱？", "多少钱"],
      },
      {
        situationPt: "O preco esta bom e voce quer fechar a compra. O que voce diz?",
        answer: "我要这个",
        accepts: ["我要这个", "我要这个。"],
      },
      {
        situationPt: "O vendedor disse um preco alto demais. Qual reacao combina?",
        answer: "太贵了",
        options: ["太贵了", "多少钱", "我很好", "再见"],
      },
      {
        situationPt: "Voce quer saber se pode pagar com cartao. O que voce pergunta?",
        answer: "可以刷卡吗？",
        accepts: ["可以刷卡吗？", "可以刷卡吗"],
      },
    ],
  },
];

// ————————————————————————————————————————————————————————————————
// Limites de novidade por pass — evita sobrecarregar uma unica pass com
// muito conteudo novo (core/support/completamente novo).
// ————————————————————————————————————————————————————————————————

export const NOVELTY_LIMITS_BY_PASS = {
  1: { maxCore: 5 },
  2: { maxSupport: 3 },
  3: { maxNew: 1 },
  4: { maxNew: 0 },
} as const;
