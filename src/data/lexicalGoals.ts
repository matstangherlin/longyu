/**
 * Pedagogia V3.7 — metas lexicais globais do produto (LEX-030).
 * Metas de produto, não equivalência automática HSK/CEFR.
 */

export const JOURNEY_LEXICAL_GOALS = {
  productiveTargetMin: 800,
  productiveTargetMax: 1200,
  receptiveTargetMin: 1500,
  receptiveTargetMax: 2000,
  atlasLongTermCharacters: 5000,
  /** Metas progressivas de classificação curricular do Atlas (LEX-054). */
  atlasClassifiedTargets: {
    v37: 500,
    v38: 750,
    v4x: 1000,
  },
  /** Lifecycle declarativo mínimo nesta remessa (LEX-055). */
  lifecycleMinEntries: 120,
} as const;

export type LexicalTier =
  | "T0_seed"
  | "T1_survival"
  | "T2_daily"
  | "T3_functional_china"
  | "T4_social"
  | "T5_extended"
  | "T6_atlas_reference";

export const LEXICAL_TIER_LABELS: Record<LexicalTier, string> = {
  T0_seed: "Seed",
  T1_survival: "Survival Core",
  T2_daily: "Daily Conversation",
  T3_functional_china: "Functional China",
  T4_social: "Social Expansion",
  T5_extended: "Extended Vocabulary",
  T6_atlas_reference: "Atlas Reference",
};
