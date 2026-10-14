import type { ProgressionNodeState } from "./progressionTypes";

export function ProgressionNodeLabel({
  title,
  statusLabel,
  metaLabel,
  state,
}: {
  title: string;
  statusLabel?: string;
  metaLabel?: string;
  state: ProgressionNodeState;
}) {
  const muted = state === "LOCKED";
  const emphasize = state === "CURRENT";
  return (
    <div
      data-testid="progression-node-label"
      className={[
        "progression-node-copy mt-2 w-[8.75rem] max-w-full text-center",
        muted ? "text-ink-faint" : emphasize ? "text-ink" : "text-ink-soft",
      ].join(" ")}
    >
      <p
        className={[
          "line-clamp-2 text-[11px] leading-tight",
          emphasize ? "font-semibold" : "font-medium",
        ].join(" ")}
      >
        {title}
      </p>
      {statusLabel ? (
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-faint">
          {statusLabel}
        </p>
      ) : null}
      {metaLabel ? (
        <p className="mt-0.5 text-[10px] text-accent" data-testid="progression-node-meta">
          {metaLabel}
        </p>
      ) : null}
    </div>
  );
}
