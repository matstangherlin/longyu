import type {
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  ReactNode,
  SVGProps,
} from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type CardVariant =
  | "basic"
  | "interactive"
  | "progress"
  | "reward"
  | "info"
  | "premium"
  | "alert"
  | "empty";

export function Card({
  className,
  children,
  variant = "basic",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  const variants: Record<CardVariant, string> = {
    basic: "border-line/55 bg-surface shadow-card",
    interactive:
      "border-line/60 bg-surface shadow-card hover:-translate-y-px hover:border-accent/25 hover:shadow-lift active:translate-y-0 group-focus-visible:ring-2 group-focus-visible:ring-accent/40",
    progress: "border-accent/16 bg-accent-soft/10",
    reward: "border-[rgb(var(--good)/0.2)] bg-[rgb(var(--good)/0.06)]",
    info: "border-accent/20 bg-accent-soft/20",
    premium: "border-gold/25 bg-gradient-to-br from-gold/10 to-surface",
    alert: "border-[rgb(var(--wrong)/0.25)] bg-[rgb(var(--wrong)/0.06)]",
    empty: "border-dashed border-line/70 bg-surface/65",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border text-ink transition-[border-color,background-color,box-shadow,transform]",
        variants[variant],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "soft"
  | "outline"
  | "good"
  | "danger"
  | "premium"
  | "text";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: BtnProps) {
  const variants: Record<Variant, string> = {
    primary:
      "bg-accent text-white shadow-card hover:bg-accent-strong active:scale-[.98]",
    secondary:
      "border border-line/65 bg-surface text-ink shadow-card hover:border-accent/25 hover:bg-surface-2 active:scale-[.98]",
    ghost: "text-ink-soft hover:bg-surface-2 active:scale-[.98]",
    soft: "bg-accent-soft text-accent hover:brightness-95 active:scale-[.98]",
    outline:
      "border border-line/65 bg-transparent text-ink hover:border-accent/25 hover:bg-surface-2 active:scale-[.98]",
    good:
      "bg-[rgb(var(--good))] text-white shadow-card hover:brightness-95 active:scale-[.98]",
    danger:
      "bg-[rgb(var(--wrong))] text-white shadow-card hover:brightness-95 active:scale-[.98]",
    premium:
      "bg-gold text-white shadow-card hover:brightness-95 active:scale-[.98]",
    text: "px-1 text-accent hover:text-accent-strong hover:underline active:opacity-75",
  };
  const sizes = {
    sm: "min-h-11 px-3 text-sm rounded-xl",
    md: "min-h-11 px-4 text-[15px] rounded-xl",
    lg: "min-h-12 px-5 text-base rounded-2xl",
    icon: "h-11 w-11 shrink-0 rounded-xl p-0",
  };
  return (
    <button
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-soft disabled:opacity-70 disabled:shadow-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      )}
      <span className={cx(loading && "opacity-90")}>{children}</span>
    </button>
  );
}

export function ProgressBar({
  value,
  max = 100,
  className,
  label = "Progresso",
}: {
  value: number;
  max?: number;
  className?: string;
  label?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)));
  return (
    <div
      className={cx("h-2 overflow-hidden rounded-full bg-surface-2", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.max(0, Math.min(safeMax, value))}
      aria-valuetext={`${pct}%`}
    >
      <div
        className="h-full rounded-full bg-accent shadow-inner transition-[width] duration-300 motion-reduce:transition-none"
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
  tone?: "muted" | "accent" | "good" | "gold" | "warning" | "wrong";
  className?: string;
}) {
  const tones = {
    muted: "border-line bg-surface-2 text-ink-soft",
    accent: "border-transparent bg-accent-soft text-accent",
    good: "border-transparent bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]",
    gold: "border-gold/25 bg-gold/10 text-gold",
    warning: "border-transparent bg-gold/10 text-gold",
    wrong: "border-transparent bg-[rgb(var(--wrong)/0.12)] text-[rgb(var(--wrong))]",
  };
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  desc,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif text-2xl font-semibold leading-tight text-ink sm:text-[1.7rem]">
          {title}
        </h1>
        {desc && <p className="mt-1 max-w-2xl text-sm leading-5 text-ink-soft">{desc}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  desc,
  action,
  className,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex min-w-0 items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-6 text-ink sm:text-lg">{title}</h2>
        {desc && <p className="mt-0.5 text-sm leading-5 text-ink-soft">{desc}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  desc,
  icon,
  action,
  className,
}: {
  title: string;
  desc?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card variant="empty" className={cx("px-5 py-8 text-center", className)}>
      {icon && (
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-accent" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {desc && <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-ink-soft">{desc}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

export function LoadingState({
  label = "Carregando…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cx("flex min-h-32 items-center justify-center gap-3 text-sm text-ink-soft", className)} role="status">
      <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-accent/25 border-r-accent motion-reduce:animate-none" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  title = "Não foi possível carregar",
  desc,
  action,
  className,
}: {
  title?: string;
  desc?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card variant="alert" className={cx("p-5", className)} role="alert">
      <h3 className="font-semibold text-ink">{title}</h3>
      {desc && <p className="mt-1 text-sm leading-5 text-ink-soft">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

// Card grande de hub (mobile-first): entrada tocável para uma área do app.
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
        "flex min-h-[88px] flex-col items-start rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[.99]",
        active
          ? "border-accent/40 bg-accent-soft/25 shadow-card"
          : featured
            ? "border-accent/25 bg-accent-soft/15"
            : "border-line/55 bg-surface shadow-card hover:-translate-y-px hover:border-accent/25 hover:shadow-lift",
        className
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span
          className={cx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            active || featured ? "bg-accent text-white" : "bg-surface-2 text-accent"
          )}
        >
          <Icon width={17} height={17} />
        </span>
        {badge}
      </span>
      <span className="mt-2 text-sm font-semibold leading-tight text-ink">{title}</span>
      {desc && <span className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-faint">{desc}</span>}
    </button>
  );
}

export function SectionTitle(props: {
  eyebrow?: string;
  title: string;
  desc?: string;
}) {
  return <PageHeader {...props} className="mb-4" />;
}
