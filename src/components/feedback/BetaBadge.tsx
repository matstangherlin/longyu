import { BETA_LABEL } from "../../lib/feedback";

export function BetaBadge({ className }: { className?: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {BETA_LABEL}
    </span>
  );
}
