/**
 * Scaffolding progressivo de produção / transferência (níveis 0–4).
 *
 * Separado de `ProductionAssist` (guided → question): aquele mede a
 * dificuldade linguística da transformação; este mede quanto APOIO visual
 * a UI oferece. O aluno forte fica no 0; quem trava sobe sob demanda.
 *
 * 0 independente — situação + input
 * 1 padrão — 你要 ___ 吗？
 * 2 estrutura — 你 | 要 | ___ | 吗 + rótulos
 * 3 vocabulário — poucas palavras úteis (não monta a frase)
 * 4 sentence build — só após dificuldade repetida
 */

export type ProductionHelpLevel = 0 | 1 | 2 | 3 | 4;

export const PRODUCTION_HELP_LEVELS: readonly ProductionHelpLevel[] = [0, 1, 2, 3, 4];

export function clampProductionHelpLevel(value: number): ProductionHelpLevel {
  if (value <= 0) return 0;
  if (value === 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  return 4;
}

export interface ProductionHelpPlan {
  /** Nível já visível ao abrir o exercício. */
  initial: ProductionHelpLevel;
  /**
   * Teto pedível sem erro repetido.
   * Nível 4 só destrava após dificuldade repetida (ver unlock).
   */
  softCeiling: ProductionHelpLevel;
  /** Primeira transferência desta estrutura no currículo. */
  firstOfStructure: boolean;
}

/**
 * Nível inicial depende do estágio pedagógico:
 * - 1ª transferência da estrutura → mais guiada (padrão à vista)
 * - transferências posteriores / retry → independente
 * - free guiada → padrão (é produção apoiada por definição)
 * - open → independente
 */
export function resolveProductionHelpPlan(input: {
  kind: "transfer_task" | "free_production";
  productionOpen?: boolean;
  firstOfStructure: boolean;
  attemptNumber?: number;
}): ProductionHelpPlan {
  const attemptNumber = input.attemptNumber ?? 0;
  if (input.productionOpen) {
    return { initial: 0, softCeiling: 1, firstOfStructure: false };
  }
  if (input.kind === "free_production") {
    return { initial: 1, softCeiling: 3, firstOfStructure: false };
  }
  // Retry da mesma lição: já viu o desafio — menos andaime.
  if (attemptNumber > 0) {
    return { initial: 0, softCeiling: 2, firstOfStructure: false };
  }
  if (input.firstOfStructure) {
    return { initial: 1, softCeiling: 3, firstOfStructure: true };
  }
  return { initial: 0, softCeiling: 2, firstOfStructure: false };
}

/** Próximo nível pedível, ou null se já no teto destrancado. */
export function nextProductionHelpLevel(
  current: ProductionHelpLevel,
  unlockedMax: ProductionHelpLevel
): ProductionHelpLevel | null {
  if (current >= unlockedMax) return null;
  return clampProductionHelpLevel(current + 1);
}

/**
 * Após erro: libera mais ajuda sem punir o pedido.
 * - 1º erro → até nível 3 (vocabulário)
 * - 2º+ erros → nível 4 (sentence build)
 */
export function unlockProductionHelpAfterMistake(input: {
  unlockedMax: ProductionHelpLevel;
  mistakeCount: number;
  softCeiling: ProductionHelpLevel;
}): ProductionHelpLevel {
  const { mistakeCount, softCeiling, unlockedMax } = input;
  if (mistakeCount >= 2) return 4;
  if (mistakeCount >= 1) {
    return clampProductionHelpLevel(Math.max(unlockedMax, softCeiling, 3));
  }
  return clampProductionHelpLevel(Math.max(unlockedMax, softCeiling));
}

export function productionHelpLevelLabel(level: ProductionHelpLevel): string {
  switch (level) {
    case 0:
      return "independente";
    case 1:
      return "padrão";
    case 2:
      return "estrutura";
    case 3:
      return "vocabulário";
    case 4:
      return "montagem";
  }
}

/** First productive use vs transfer of an already-mastered phrase. */
export type ConversationScaffoldKind = "first" | "transfer" | "none";

export interface ConversationProduceHelpPlan {
  initial: ProductionHelpLevel;
  softCeiling: ProductionHelpLevel;
  showPiecesInitially: boolean;
  showPinyinOnPieces: boolean;
}

/**
 * Conversation produce_reply reuses the 0–4 help ladder.
 * Transfer starts independent; first guided exposure may start with pieces.
 * Help steps: none → frame → vocab → pieces (pieces never on the first help tap).
 */
export function resolveConversationProduceHelp(input: {
  variantLevel?: "guided" | "assisted" | "independent" | "audio_first";
  scaffoldKind: ConversationScaffoldKind;
  sceneCompletions: number;
  lastAttempts?: number;
}): ConversationProduceHelpPlan {
  const variant = input.variantLevel ?? "guided";
  const completions = input.sceneCompletions;
  const lastAttempts = input.lastAttempts ?? 1;

  if (input.scaffoldKind === "none") {
    return { initial: 0, softCeiling: 0, showPiecesInitially: false, showPinyinOnPieces: false };
  }

  if (input.scaffoldKind === "transfer") {
    return { initial: 0, softCeiling: 4, showPiecesInitially: false, showPinyinOnPieces: false };
  }

  if (completions >= 2 || variant === "audio_first" || variant === "independent") {
    const softCeiling = lastAttempts >= 3 ? 4 : 3;
    return { initial: 0, softCeiling, showPiecesInitially: false, showPinyinOnPieces: false };
  }
  if (completions >= 1 || variant === "assisted") {
    return { initial: 3, softCeiling: 4, showPiecesInitially: false, showPinyinOnPieces: false };
  }
  return { initial: 4, softCeiling: 4, showPiecesInitially: true, showPinyinOnPieces: true };
}

/** Frame → vocab → pieces. Never reveal the full bank on the first help tap. */
export function nextConversationHelpLevel(
  current: ProductionHelpLevel,
  unlockedMax: ProductionHelpLevel
): ProductionHelpLevel | null {
  const sequence: ProductionHelpLevel[] = [0, 1, 3, 4].filter((level) => level <= unlockedMax) as ProductionHelpLevel[];
  const index = sequence.indexOf(current);
  if (index < 0) {
    const next = sequence.find((level) => level > current);
    return next ?? null;
  }
  return sequence[index + 1] ?? null;
}

export function conversationHelpShowsFrame(level: ProductionHelpLevel): boolean {
  return level >= 1;
}

export function conversationHelpShowsVocab(level: ProductionHelpLevel): boolean {
  return level >= 3 && level < 4;
}

export function conversationHelpShowsPieces(level: ProductionHelpLevel): boolean {
  return level >= 4;
}
