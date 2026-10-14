import type { ProgressionNodeState } from "./progressionTypes";

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
  const filled = fromState === "COMPLETED" || fromState === "CURRENT";
  const future = toState === "LOCKED" && !filled;
  return (
    <div
      aria-hidden
      data-testid="progression-connector"
      data-from={fromState}
      data-to={toState}
      className={[
        "progression-connector mx-auto h-6 w-px shrink-0",
        filled ? "bg-accent/55" : future ? "bg-line/35" : "bg-line/50",
      ].join(" ")}
    />
  );
}
