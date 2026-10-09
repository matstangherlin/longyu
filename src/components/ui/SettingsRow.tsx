import type { ComponentType, ReactNode, SVGProps } from "react";
import { Link } from "react-router-dom";
import { IconChevron } from "./Icon";
import { cx } from "./primitives";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * RC2.3.13A — canonical settings/nav row (Similarity + Affordance + Proximity).
 * Use for Account / More Options / Settings — not for learning primary CTAs.
 */
export function SettingsRow({
  to,
  icon: Icon,
  label,
  subtitle,
  trailing,
  testId,
  tone = "neutral",
  onClick,
}: {
  to?: string;
  icon?: IconType;
  label: string;
  subtitle?: string;
  trailing?: ReactNode;
  testId?: string;
  tone?: "neutral" | "destructive";
  onClick?: () => void;
}) {
  const className = cx(
    "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 active:bg-surface-2",
    tone === "destructive" ? "text-wrong hover:bg-wrong-soft/40" : "text-ink hover:bg-surface-2",
  );

  const body = (
    <>
      {Icon ? (
        <span
          className={cx(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
            tone === "destructive" ? "bg-wrong-soft text-wrong" : "bg-surface-2 text-accent",
          )}
          aria-hidden="true"
        >
          <Icon width={18} height={18} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className={cx("block text-sm font-semibold", tone === "destructive" ? "text-wrong" : "text-ink")}>
          {label}
        </span>
        {subtitle ? <span className="mt-0.5 block text-xs text-ink-faint">{subtitle}</span> : null}
      </span>
      {trailing ?? (to ? <IconChevron width={16} height={16} className="shrink-0 text-ink-faint" aria-hidden="true" /> : null)}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className} data-testid={testId} data-settings-row="" data-cta-hierarchy="secondary">
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} data-testid={testId} data-settings-row="" data-cta-hierarchy="secondary">
      {body}
    </button>
  );
}

export function SettingsGroup({
  title,
  children,
  testId,
}: {
  title?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section className="rounded-2xl border border-line/70 bg-surface" data-testid={testId} data-settings-group="">
      {title ? (
        <h2 className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">{title}</h2>
      ) : null}
      <div className="divide-y divide-line/50 px-1 py-1">{children}</div>
    </section>
  );
}
