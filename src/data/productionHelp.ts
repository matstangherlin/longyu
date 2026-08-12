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
