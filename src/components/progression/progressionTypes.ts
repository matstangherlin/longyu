/**
 * RC2.3.13H — shared Progression grammar (Journey + Culture).
 * Presentation only: domain code maps into these states.
 */

export type ProgressionNodeState = "COMPLETED" | "CURRENT" | "AVAILABLE" | "LOCKED";

export type ProgressionPersonality = "journey" | "culture";

export type ProgressionPassRing = {
  /** Canonical mastery/pass progress — never recomputed here. */
  progress: number;
  total: number;
};

export type ProgressionPathNode = {
  id: string;
  title: string;
  state: ProgressionNodeState;
  href?: string;
  /** Short status under title (e.g. "Aula", "Feito"). */
  statusLabel?: string;
  /** Semantic icon id consumed by the bubble. */
  iconId?: string;
  passRing?: ProgressionPassRing;
  /** Optional metadata badge (e.g. seen from Journey) — not a state authority. */
  metaLabel?: string;
  disabled?: boolean;
  onSelect?: () => void;
  testId?: string;
  /** Anchor key for ProgressionShell restore. */
  anchor?: string;
};
