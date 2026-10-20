import type { ProgressionNodeState } from "./progressionTypes";

/**
 * RC2.3.13R.3.2.6 — connector states, calm and never flowing:
 *   complete — between two completed nodes: a solid accent line;
 *   lead     — from the last completed node into the current one: a subtle accent;
 *   locked   — into a locked node: muted;
 *   open     — anything else: the neutral line.
 * Its fill plays once (progression-living.css) only when the node above it
 * just completed in this session; otherwise it is simply drawn.
 */
export type ProgressionConnectorState = "complete" | "lead" | "open" | "locked";

export function progressionConnectorState(fromState: ProgressionNodeState, toState: ProgressionNodeState): ProgressionConnectorState {
  if (fromState === "COMPLETED" && toState === "COMPLETED") return "complete";
  if (fromState === "COMPLETED" && (toState === "CURRENT" || toState === "AVAILABLE")) return "lead";
  if (toState === "LOCKED") return "locked";
  return "open";
}

const CONNECTOR_TONE: Readonly<Record<ProgressionConnectorState, string>> = {
  complete: "bg-accent/55",
  lead: "bg-accent/35",
  open: "bg-line/50",
  locked: "bg-line/35",
};

/**
 * Thin vertical connector between path bubbles.
 * Completed span is stronger; future span is subtle.
 */
export function ProgressionConnector({
  fromState,
  toState,
}: {
  fromState: ProgressionNodeState;
  toState: ProgressionNodeState;
}) {
  const connector = progressionConnectorState(fromState, toState);
  return (
    <div
      aria-hidden
      data-testid="progression-connector"
      data-from={fromState}
      data-to={toState}
      data-connector-state={connector}
      className={["progression-connector mx-auto h-6 w-px shrink-0", CONNECTOR_TONE[connector]].join(" ")}
    />
  );
}
