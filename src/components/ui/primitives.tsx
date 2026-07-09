import type {
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  ReactNode,
  SVGProps,
} from "react";

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-xl border border-line/50 bg-surface text-ink shadow-card transition-colors",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

type Variant = "primary" | "ghost" | "soft" | "outline" | "good";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: BtnProps) {
  const variants: Record<Variant, string> = {
    primary:
      "bg-accent text-white hover:bg-accent-strong active:scale-[.98] shadow-card",
    ghost: "text-ink-soft hover:bg-surface-2 active:scale-[.98]",
    soft: "bg-accent-soft text-accent hover:brightness-95 active:scale-[.98]",
    outline: "border border-line/60 bg-surface text-ink hover:bg-surface-2 active:scale-[.98]",
    good:
      "bg-[rgb(var(--good))] text-white hover:brightness-95 active:scale-[.98] shadow-card",
  };
  const sizes = {
    sm: "h-9 px-3 text-sm rounded-xl",
    md: "h-11 px-4 text-[15px] rounded-xl",
    lg: "h-12 px-5 text-base rounded-2xl",
  };
  return (
    <button
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-soft disabled:opacity-100 disabled:shadow-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ProgressBar({
  value,
  max = 100,
  className,
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)));
  return (
    <div className={cx("h-1.5 overflow-hidden rounded-full bg-surface-2", className)}>
      <div
        className="h-full rounded-full bg-accent shadow-inner transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Pill({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "good" | "gold";
  className?: string;
}) {
  const tones = {
    muted: "bg-surface-2 text-ink-soft border-line",
    accent: "bg-accent-soft text-accent border-transparent",
    good: "bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))] border-transparent",
    gold: "bg-[#B7791F]/10 text-gold border-[#B7791F]/25",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// Card grande de hub (mobile-first): entrada tocável para uma área do app.
// Usado nos hubs Meu, Praticar, Biblioteca e Imersão.
export function HubCard({
  title,
  desc,
  icon: Icon,
  badge,
  active = false,
  featured = false,
  onClick,
  className,
}: {
  title: string;
  desc?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: ReactNode;
  active?: boolean;
  featured?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-h-[76px] flex-col items-start rounded-xl border p-2.5 text-left transition active:scale-[.99] sm:min-h-[84px] sm:p-3",
        active
          ? "border-accent/40 bg-accent-soft/25 shadow-card"
          : featured
            ? "border-accent/25 bg-accent-soft/15"
            : "border-line/50 bg-surface shadow-card",
        className
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span
          className={cx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            active || featured ? "bg-accent text-white" : "bg-surface-2 text-accent/80"
          )}
        >
          <Icon width={16} height={16} />
        </span>
        {badge}
      </span>
      <span className="mt-1.5 text-[13px] font-semibold leading-tight text-ink">{title}</span>
      {desc && <span className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-ink-faint">{desc}</span>}
    </button>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  desc,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
          {eyebrow}
        </div>
      )}
      <h1 className="font-serif text-[1.45rem] font-semibold leading-tight text-ink sm:text-[1.65rem]">
        {title}
      </h1>
      {desc && <p className="mt-1 max-w-xl text-sm leading-5 text-ink-soft">{desc}</p>}
    </div>
  );
}
