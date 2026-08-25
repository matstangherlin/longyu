/**
 * Pedagogia V3 — Mastery Loop
 *
 * Camada de domínio progressivo por lição (0–4), distinta de:
 * - estrelas (qualidade da tentativa / unlock)
 * - stages internos da sessão (intro→…→consolidation)
 * - SRS (retenção após aquisição)
 *
 * Mastery = profundidade da primeira aprendizagem na Jornada.
 * SRS = manutenção da memória depois.
 */

import type { StepKind } from "./journey";

export type MasteryLevel = 0 | 1 | 2 | 3 | 4;

/** Passo pedagógico que o aluno está prestes a praticar (1–4). */
export type MasteryPass = 1 | 2 | 3 | 4;

export type CompetencyDimension = "meaning" | "listening" | "form" | "production";

export interface ItemDimensionScores {
  meaning: number;
  listening: number;
  form: number;
  production: number;
  updatedAt: number;
}

export interface LessonMasteryRecord {
  /** Maior nível já alcançado (0 = nunca iniciada). */
  level: MasteryLevel;
  /** Quantas passes concluídas com sucesso nesta lição. */
  passCount: number;
  /** Última pass concluída (1–4). */
  lastPass?: MasteryPass;
  /** Accuracy média da última pass (0–1). */
  lastAccuracy?: number;
  /** Rodada extra de recuperação pedida pelo desempenho fraco. */
  recoveryPending?: boolean;
  updatedAt: number;
}

export interface MasteryScaffoldPolicy {
  showPortuguese: boolean;
  showPinyin: boolean;
  pinyinOnDemand: boolean;
  showImages: boolean;
  translationAfterAnswer: boolean;
  closeDistractors: boolean;
  helpMode: "character" | "word" | "sentence" | "progressive" | "disabled";
  productionHelpInitial: 0 | 1 | 2 | 3 | 4;
  labelPt: string;
  objectivePt: string;
}

export interface MasteryPassProfile {
  pass: MasteryPass;
  namePt: string;
  objectivePt: string;
  preferredKinds: readonly StepKind[];
  discouragedKinds: readonly StepKind[];
  /** Famílias cognitivas exigidas nesta pass. */
  requiredFamilies: readonly ("recognition" | "discrimination" | "production" | "transfer")[];
  scaffold: MasteryScaffoldPolicy;
  /** Peso relativo de produção vs reconhecimento no score do planner. */
  productionBias: number;
}

export const MASTERY_PASS_COUNT = 4;

export const MASTERY_LEVEL_LABELS: Record<MasteryLevel, string> = {
  0: "Não iniciada",
  1: "Descoberta",
  2: "Consolidação",
  3: "Produção",
  4: "Domínio",
};

export const MASTERY_PASS_LABELS: Record<MasteryPass, string> = {
  1: "Descoberta",
  2: "Consolidação",
  3: "Produção",
  4: "Domínio",
};

const PASS_PROFILES: Record<MasteryPass, MasteryPassProfile> = {
  1: {
    pass: 1,
    namePt: "Descoberta",
    objectivePt: "Compreender o material novo com apoio alto.",
    preferredKinds: [
      "intro",
      "listen",
      "flashcard",
      "image_choice",
      "compare_with_image",
      "comprehend",
      "match_pairs",
      "listen_select",
      "recognize",
      "contextual_choice",
      "audio_to_action",
      "place_label",
      "map_direction",
      "city_context",
      "sign_reading",
      "menu_reading",
      "price_task",
    ],
    discouragedKinds: ["free_production", "transfer_task", "conversation_repair", "reverse_recall"],
    requiredFamilies: ["recognition"],
    scaffold: {
      showPortuguese: true,
      showPinyin: true,
      pinyinOnDemand: false,
      showImages: true,
      translationAfterAnswer: false,
      closeDistractors: false,
      helpMode: "sentence",
      productionHelpInitial: 2,
      labelPt: "Português + pinyin + imagem",
      objectivePt: "Scaffold alto: PT, pinyin e imagens óbvias.",
    },
    productionBias: 0.15,
  },
  2: {
    pass: 2,
    namePt: "Consolidação",
    objectivePt: "Diferenciar e recuperar com menos tradução.",
    preferredKinds: [
      "listen_select",
      "comprehend",
      "odd_one_out",
      "compare_with_image",
      "fill_blank",
      "sentence_build",
      "audio_discrimination",
      "image_choice",
      "spot_error",
      "substitution_drill",
      "audio_to_action",
      "dialogue_completion",
      "map_direction",
      "place_label",
      "city_context",
      "sign_reading",
      "price_task",
      "schedule_reading",
    ],
    discouragedKinds: ["intro", "flashcard"],
    requiredFamilies: ["recognition", "discrimination"],
    scaffold: {
      showPortuguese: true,
      showPinyin: false,
      pinyinOnDemand: true,
      showImages: true,
      translationAfterAnswer: true,
      closeDistractors: true,
      helpMode: "word",
      productionHelpInitial: 1,
      labelPt: "PT limitado + pinyin sob demanda",
      objectivePt: "Distractors próximos; menos ajuda automática.",
    },
    productionBias: 0.35,
  },
  3: {
    pass: 3,
    namePt: "Produção",
    objectivePt: "Produzir o que foi aprendido com apoio mínimo de tradução.",
    preferredKinds: [
      "sentence_build",
      "translation_build",
      "dictation",
      "produce",
      "write",
      "fill_blank",
      "free_production",
      "conversation_repair",
      "sentence_transform",
      "substitution_drill",
      "reverse_recall",
      "dialogue_completion",
      "hanzi_build",
      "address_build",
      "map_direction",
      "route_sequence",
      "menu_reading",
      "price_task",
    ],
    discouragedKinds: ["intro", "flashcard", "match_pairs"],
    requiredFamilies: ["production"],
    scaffold: {
      showPortuguese: false,
      showPinyin: false,
      pinyinOnDemand: true,
      showImages: false,
      translationAfterAnswer: true,
      closeDistractors: true,
      helpMode: "progressive",
      productionHelpInitial: 1,
      labelPt: "Hànzì/áudio primeiro; tradução depois",
      objectivePt: "Montagem, ditado e resposta sem ordem dada.",
    },
    productionBias: 0.7,
  },
  4: {
    pass: 4,
    namePt: "Domínio",
    objectivePt: "Usar o conteúdo em situação nova, com ajuda mínima.",
    preferredKinds: [
      "conversation_scene",
      "free_production",
      "transfer_task",
      "conversation_repair",
      "contextual_choice",
      "dialogue_completion",
      "reverse_recall",
      "sentence_transform",
      "dictation",
      "listen_select",
      "dialogue_choice",
      "city_context",
      "map_direction",
      "address_build",
      "route_sequence",
      "sign_reading",
      "menu_reading",
    ],
    discouragedKinds: ["intro", "flashcard", "match_pairs", "recognize"],
    requiredFamilies: ["production", "transfer"],
    scaffold: {
      showPortuguese: false,
      showPinyin: false,
      pinyinOnDemand: false,
      showImages: false,
      translationAfterAnswer: true,
      closeDistractors: true,
      helpMode: "disabled",
      productionHelpInitial: 0,
      labelPt: "Sem tradução antecipada",
      objectivePt: "Transferência, conversa e produção sem prompt direto.",
    },
    productionBias: 0.9,
  },
};

export function clampMasteryLevel(value: unknown): MasteryLevel {
  const n = Math.max(0, Math.min(4, Math.floor(Number(value) || 0)));
  return n as MasteryLevel;
}

export function masteryPassProfile(pass: MasteryPass): MasteryPassProfile {
  return PASS_PROFILES[pass];
}

export function scaffoldForMasteryPass(pass: MasteryPass): MasteryScaffoldPolicy {
  return PASS_PROFILES[pass].scaffold;
}

/** Qual pass praticar agora, dado o nível já alcançado. */
export function nextMasteryPass(
  currentLevel: MasteryLevel,
  options: { recoveryPending?: boolean; forcePass?: MasteryPass } = {}
): MasteryPass {
  if (options.forcePass) return options.forcePass;
  if (options.recoveryPending && currentLevel >= 1) {
    return Math.min(4, Math.max(1, currentLevel)) as MasteryPass;
  }
  if (currentLevel >= 4) return 4;
  return (currentLevel + 1) as MasteryPass;
}

export function blankDimensionScores(now = Date.now()): ItemDimensionScores {
  return { meaning: 0, listening: 0, form: 0, production: 0, updatedAt: now };
}

export function normalizeDimensionScores(
  value: Partial<ItemDimensionScores> | null | undefined,
  now = Date.now()
): ItemDimensionScores {
  const base = blankDimensionScores(now);
  if (!value) return base;
  return {
    meaning: clampScore(value.meaning),
    listening: clampScore(value.listening),
    form: clampScore(value.form),
    production: clampScore(value.production),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : now,
  };
}

function clampScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

const KIND_TO_DIMENSION: Partial<Record<StepKind, CompetencyDimension>> = {
  comprehend: "meaning",
  flashcard: "meaning",
  image_choice: "meaning",
  compare_with_image: "meaning",
  odd_one_out: "meaning",
  match_pairs: "meaning",
  contextual_choice: "meaning",
  listen: "listening",
  listen_select: "listening",
  audio_discrimination: "listening",
  dictation: "listening",
  tone: "listening",
  tone_pair: "listening",
  audio_to_action: "listening",
  recognize: "form",
  decompose: "form",
  hanzi_build: "form",
  hanzi_evolution: "form",
  microread: "form",
  spot_error: "form",
  sentence_build: "production",
  translation_build: "production",
  produce: "production",
  write: "production",
  fill_blank: "production",
  free_production: "production",
  transfer_task: "production",
  conversation_repair: "production",
  conversation_scene: "production",
  dialogue_choice: "production",
  sentence_transform: "production",
  substitution_drill: "production",
  dialogue_completion: "production",
  reverse_recall: "production",
  map_direction: "meaning",
  place_label: "form",
  address_build: "production",
  city_context: "meaning",
  sign_reading: "form",
  menu_reading: "meaning",
  price_task: "meaning",
  route_sequence: "production",
  schedule_reading: "meaning",
};

export function dimensionForStepKind(kind: StepKind): CompetencyDimension | null {
  return KIND_TO_DIMENSION[kind] ?? null;
}

export function isProductionOrTransferKind(kind: StepKind): boolean {
  return (
    kind === "free_production" ||
    kind === "transfer_task" ||
    kind === "conversation_repair" ||
    kind === "conversation_scene" ||
    kind === "reverse_recall" ||
    kind === "sentence_transform" ||
    kind === "dialogue_completion" ||
    kind === "produce" ||
    kind === "write" ||
    kind === "address_build" ||
    kind === "city_context" ||
    kind === "map_direction" ||
    kind === "route_sequence"
  );
}

/**
 * V3.2 — orçamento de passos graduados por pass.
 * O plano pode ter muitos candidatos; o planner escolhe ~7–10 para
 * manter M1–M4 profundos sem sessões de 15+ exercícios.
 */
export const MASTERY_PASS_GRADED_BUDGET: Record<MasteryPass, { min: number; max: number }> = {
  1: { min: 5, max: 8 },
  2: { min: 6, max: 8 },
  3: { min: 6, max: 9 },
  4: { min: 6, max: 9 },
};

/** Respostas semanticamente equivalentes para produção M3/M4. */
const EQUIVALENT_ANSWER_GROUPS: string[][] = [
  ["我要水", "我要水。", "我想喝水", "我想喝水。"],
  ["我要茶", "我要茶。", "我想喝茶", "我想喝茶。"],
  ["谢谢", "谢谢！", "谢谢。"],
  ["不客气", "不客气。", "不用谢", "不用谢。"],
  ["再见", "再见！", "再见。", "拜拜", "拜拜！"],
  ["多少钱", "多少钱？", "多少钱。"],
  ["怎么走", "怎么走？", "怎么走。"],
  ["我需要帮助", "我需要帮助。", "请帮助我", "请帮助我。"],
  // ————————————————————————————————————————————————————————————
  // Pedagogia V3.3 — Wave 1: grupos curados para as licoes migradas.
  // Mantidos intencionais (parafraseiam a mesma funcao comunicativa),
  // nao free-form — cada variante e algo que um professor aceitaria.
  // ————————————————————————————————————————————————————————————
  ["我很好", "我很好。", "我还好", "我还好。"],
  ["我叫Matheus", "我叫Matheus。", "我的名字是Matheus", "我的名字是Matheus。"],
  ["太贵了", "太贵了！", "太贵了。"],
  ["我起床", "我起床。", "我起床了", "我起床了。"],
  ["现在几点？", "现在几点"],
  ["我病了", "我病了。", "我生病了", "我生病了。"],
  ["我不舒服", "我不舒服。", "我很不舒服", "我很不舒服。"],
  ["我坐地铁", "我坐地铁。", "我坐地铁去", "我坐地铁去。"],
  ["我喜欢茶", "我喜欢茶。"],
  ["我不喜欢咖啡", "我不喜欢咖啡。"],
  ["我不会说中文", "我不会说中文。"],
  ["请再说一遍", "请再说一遍。", "请再说一次", "请再说一次。"],
  ["我听不懂", "我听不懂。"],
  ["我喜欢中文", "我喜欢中文。"],
  ["我们走吧", "我们走吧。"],
  ["我要看医生", "我要看医生。"],
];

export function equivalentAnswersFor(canonical: string): string[] {
  const key = canonical.trim();
  const group = EQUIVALENT_ANSWER_GROUPS.find((entries) =>
    entries.some((entry) => entry.replace(/[。！？]/g, "") === key.replace(/[。！？]/g, ""))
  );
  if (!group) return [canonical, `${canonical.replace(/[。！？]$/, "")}`, `${canonical.replace(/[。！？]$/, "")}。`].filter(Boolean);
  return [...new Set(group)];
}

export function withEquivalentAccepts<T extends { answer?: string; correctAnswer?: string; accepts?: string[] }>(
  step: T,
  extras: string[] = []
): T {
  const canonical = step.answer ?? step.correctAnswer;
  if (!canonical) return step;
  const merged = [...new Set([...(step.accepts ?? []), ...equivalentAnswersFor(canonical), ...extras])];
  return { ...step, accepts: merged };
}

/** Atualiza scores dimensionais com EMA suave após um exercício. */
export function updateDimensionScore(
  current: ItemDimensionScores | undefined,
  dimension: CompetencyDimension,
  correct: boolean,
  now = Date.now()
): ItemDimensionScores {
  const next = normalizeDimensionScores(current, now);
  const alpha = 0.35;
  const target = correct ? 1 : Math.max(0, next[dimension] * 0.5);
  next[dimension] = clampScore(next[dimension] * (1 - alpha) + target * alpha);
  next.updatedAt = now;
  return next;
}

export interface MasteryAdvancementInput {
  current: LessonMasteryRecord | undefined;
  pass: MasteryPass;
  /** 0–1 */
  accuracy: number;
  mistakeCount: number;
  /** Conteúdo permite tarefa de produção/transferência nesta pass. */
  hadProductionOrTransfer: boolean;
  /**
   * V4.6 Topic Path: the ring is 0–4 with one cognitive pass each.
   * Skip-ahead would open M4 from a 2/4 circle. Default true for legacy
   * mastery-loop tests; the player passes false for teaching topics.
   */
  allowSkipAhead?: boolean;
}

export interface MasteryAdvancementResult {
  record: LessonMasteryRecord;
  /** Se true, a próxima entrada deve repetir a pass (recuperação). */
  scheduleRecovery: boolean;
  /** Se true, desempenho excelente pode pular uma pass no futuro. */
  allowSkipNext: boolean;
}

/**
 * Critério de avanço (PED-039):
 * - concluir pass N → level N (se accuracy razoável)
 * - muitos erros → recoveryPending (não grind artificial de 4× se já foi bem)
 * - excelente (≥0.92, ≤1 erro) em pass ≥2 pode avançar +1 extra (cap 4)
 */
export function advanceLessonMastery(input: MasteryAdvancementInput, now = Date.now()): MasteryAdvancementResult {
  const prev = input.current ?? { level: 0 as MasteryLevel, passCount: 0, updatedAt: now };
  const weak = input.accuracy < 0.55 || input.mistakeCount >= 5;
  const excellent = input.accuracy >= 0.92 && input.mistakeCount <= 1;

  if (weak) {
    return {
      record: {
        ...prev,
        lastPass: input.pass,
        lastAccuracy: input.accuracy,
        recoveryPending: true,
        updatedAt: now,
      },
      scheduleRecovery: true,
      allowSkipNext: false,
    };
  }

  let nextLevel = Math.max(prev.level, input.pass) as MasteryLevel;
  if (input.allowSkipAhead !== false && excellent && input.pass >= 2 && nextLevel < 4) {
    nextLevel = Math.min(4, nextLevel + 1) as MasteryLevel;
  }
  // Pass 4 sem produção quando o conteúdo permite → não marca domínio total.
  if (input.pass === 4 && !input.hadProductionOrTransfer && nextLevel >= 4) {
    nextLevel = 3;
  }

  return {
    record: {
      level: nextLevel,
      passCount: (prev.passCount ?? 0) + 1,
      lastPass: input.pass,
      lastAccuracy: input.accuracy,
      recoveryPending: false,
      updatedAt: now,
    },
    scheduleRecovery: false,
    allowSkipNext: excellent && input.pass < 4,
  };
}

/** Migração segura: conta antiga com lição concluída → M1 (ou M2 se 3★). Nunca auto-M4. */
export function migrateLessonMasteryFromCompletion(
  completedLessons: readonly string[],
  lessonStarsById: Record<string, number>,
  existing: Record<string, LessonMasteryRecord> | undefined,
  now = Date.now()
): Record<string, LessonMasteryRecord> {
  const next: Record<string, LessonMasteryRecord> = { ...(existing ?? {}) };
  for (const lessonId of completedLessons) {
    if (next[lessonId]?.level && next[lessonId].level > 0) continue;
    const stars = lessonStarsById[lessonId] ?? 0;
    const level: MasteryLevel = stars >= 3 ? 2 : 1;
    next[lessonId] = {
      level,
      passCount: 1,
      lastPass: level as MasteryPass,
      updatedAt: now,
    };
  }
  return next;
}

export function mergeLessonMasteryRecords(
  local: Record<string, LessonMasteryRecord> | undefined,
  remote: Record<string, LessonMasteryRecord> | undefined
): Record<string, LessonMasteryRecord> {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const merged: Record<string, LessonMasteryRecord> = {};
  for (const key of keys) {
    const a = local?.[key];
    const b = remote?.[key];
    if (!a) {
      merged[key] = b!;
      continue;
    }
    if (!b) {
      merged[key] = a;
      continue;
    }
    const richer = (a.level > b.level) || (a.level === b.level && (a.passCount ?? 0) >= (b.passCount ?? 0)) ? a : b;
    merged[key] = {
      level: Math.max(a.level, b.level) as MasteryLevel,
      passCount: Math.max(a.passCount ?? 0, b.passCount ?? 0),
      lastPass: richer.lastPass,
      lastAccuracy: richer.lastAccuracy,
      recoveryPending: Boolean(a.recoveryPending || b.recoveryPending) && Math.max(a.level, b.level) < 4,
      updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0),
    };
  }
  return merged;
}

export function mergeItemDimensionScores(
  local: Record<string, ItemDimensionScores> | undefined,
  remote: Record<string, ItemDimensionScores> | undefined
): Record<string, ItemDimensionScores> {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const merged: Record<string, ItemDimensionScores> = {};
  for (const key of keys) {
    const a = local?.[key];
    const b = remote?.[key];
    if (!a) {
      merged[key] = normalizeDimensionScores(b);
      continue;
    }
    if (!b) {
      merged[key] = normalizeDimensionScores(a);
      continue;
    }
    merged[key] = {
      meaning: Math.max(a.meaning, b.meaning),
      listening: Math.max(a.listening, b.listening),
      form: Math.max(a.form, b.form),
      production: Math.max(a.production, b.production),
      updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0),
    };
  }
  return merged;
}

/** Preferência de dimensão fraca para o planner (ex.: meaning alto → priorizar production). */
export function weakestDimension(scores: ItemDimensionScores | undefined): CompetencyDimension {
  const s = normalizeDimensionScores(scores);
  const entries: [CompetencyDimension, number][] = [
    ["meaning", s.meaning],
    ["listening", s.listening],
    ["form", s.form],
    ["production", s.production],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

export function kindMatchesPreferred(kind: StepKind, pass: MasteryPass): boolean {
  return PASS_PROFILES[pass].preferredKinds.includes(kind);
}

export function masteryKindPriority(kind: StepKind, pass: MasteryPass): number {
  const profile = PASS_PROFILES[pass];
  if (profile.discouragedKinds.includes(kind)) return -2;
  if (profile.preferredKinds.includes(kind)) return 2;
  return 0;
}

export function applyScaffoldToStep<T extends { kind: StepKind; helpMode?: string; pt?: string; pinyin?: string; isNoHint?: boolean; productionHelpInitial?: number; compareWithImageLevel?: 1 | 2 | 3 }>(
  step: T,
  pass: MasteryPass
): T {
  const scaffold = scaffoldForMasteryPass(pass);
  const next: T = { ...step };
  next.helpMode = scaffold.helpMode as T["helpMode"];
  if (!scaffold.showPortuguese && next.pt && pass >= 3) {
    // Mantém pt nos metadados para pós-resposta; marca no-hint na UI.
    next.isNoHint = true;
  }
  if (pass >= 3 && "productionHelpInitial" in next) {
    (next as { productionHelpInitial?: number }).productionHelpInitial = scaffold.productionHelpInitial;
  }
  if (step.kind === "compare_with_image") {
    const level = pass === 1 ? 1 : pass === 2 ? 2 : 3;
    (next as { compareWithImageLevel?: 1 | 2 | 3 }).compareWithImageLevel = level;
  }
  return next;
}
