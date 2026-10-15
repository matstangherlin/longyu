import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  ReactNode,
  SVGProps,
} from "react";
import { Link, type LinkProps } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";
import { ProgressFill } from "../motion/ProgressFill";

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

/**
 * RC2.3.13R.3.2.5 — a Card's `className` wins over its variant, per property
 * family. Tailwind emits same-property utilities in its own fixed order, so a
 * caller's `border-accent/15` lost to the variant's `border-line/55` without a
 * trace (10 surfaces). An unprefixed border colour, background colour or
 * shadow in `className` now drops the variant's default for that family;
 * state-prefixed ones (`hover:`, `sm:`) never conflict with the base.
 */
const CARD_FAMILIES: Array<[string, RegExp]> = [
  ["border", /^border-(?!(?:[0-9]|x|y|t|b|l|r|s|e|solid|dashed|dotted|double|none)(?:-|$))/],
  ["bg", /^bg-(?!(?:gradient|fixed|local|scroll|clip|origin|no-repeat|repeat|cover|contain|center|top|bottom|left|right|blend|none)(?:-|$)|\[(?:radial|linear|conic|url))/],
  ["shadow", /^shadow(?:-|$)/],
];

export function mergeCardClasses(base: string, override?: string): string {
  if (!override) return base;
  const set = override.split(/\s+/).filter((token) => token && !token.includes(":"));
  const owned = new Set(CARD_FAMILIES.filter(([, re]) => set.some((token) => re.test(token))).map(([family]) => family));
  if (!owned.size) return base;
  return base
    .split(/\s+/)
    .filter((token) => token.includes(":") || !CARD_FAMILIES.some(([family, re]) => owned.has(family) && re.test(token)))
    .join(" ");
}

export function Card({
  className,
  children,
  variant = "basic",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  const variants: Record<CardVariant, string> = {
    basic: "border-line/55 bg-surface shadow-card",
    interactive:
      "border-line/60 bg-surface shadow-card hover:-translate-y-px hover:border-accent/25 hover:shadow-lift active:translate-y-0 group-focus-visible:ring-2 group-focus-visible:ring-focus-ring",
    progress: "border-accent/15 bg-accent-soft/10",
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
        mergeCardClasses(variants[variant], className),
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "soft"
  | "outline"
  | "good"
  | "danger"
  | "premium"
  | "text";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

// Base compartilhada por Button e ButtonLink para que um CTA fique idêntico
// quer seja <button> quer seja um link de navegação.
// RC2.3.13R.3.2.5 — the focus ring is the full-strength --focus-ring token
// (≥ 3:1 on every theme); the disabled LOOK lives per variant group (below) so
// a loading button keeps its colours while staying inert.
const BUTTON_BASE =
  "inline-flex select-none items-center justify-center gap-2 touch-manipulation font-semibold transition duration-[var(--motion-fast)] ease-[var(--ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:shadow-none";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-card hover:bg-accent-strong active:scale-[.98]",
  secondary:
    "border border-line/65 bg-surface text-ink shadow-card hover:border-accent/25 hover:bg-surface-2 active:scale-[.98]",
  ghost: "text-ink-soft hover:bg-surface-2 active:scale-[.98]",
  soft: "bg-accent-soft text-accent-on-soft hover:brightness-95 active:scale-[.98]",
  outline:
    "border border-line/65 bg-transparent text-ink hover:border-accent/25 hover:bg-surface-2 active:scale-[.98]",
  good:
    "bg-[rgb(var(--good))] text-on-good shadow-card hover:brightness-95 active:scale-[.98]",
  danger:
    "bg-[rgb(var(--wrong))] text-on-wrong shadow-card hover:brightness-95 active:scale-[.98]",
  premium:
    "bg-gold text-on-gold shadow-card hover:brightness-95 active:scale-[.98]",
  text: "px-1 text-accent hover:text-accent-strong hover:underline active:opacity-75",
};

/**
 * RC2.3.13R.3.2.5 — disabled must read as "not now" (grey, legible label),
 * never as active and never vanish: a filled CTA turns into a solid line-grey
 * pill; bordered ones keep their outline; ghost/text only fade their label.
 */
const BUTTON_DISABLED: Record<ButtonVariant, string> = {
  primary: "disabled:bg-line disabled:text-ink-soft",
  good: "disabled:bg-line disabled:text-ink-soft",
  danger: "disabled:bg-line disabled:text-ink-soft",
  premium: "disabled:bg-line disabled:text-ink-soft",
  soft: "disabled:bg-line disabled:text-ink-soft",
  secondary: "disabled:border-line disabled:bg-surface-2 disabled:text-ink-soft",
  outline: "disabled:border-line disabled:bg-transparent disabled:text-ink-soft",
  ghost: "disabled:bg-transparent disabled:text-ink-faint",
  text: "disabled:text-ink-faint disabled:no-underline",
};

// sm = CTA de card (missões, hub)
// md = CTA de hero / página
// lg = CTA de modal / recompensa
// Todos ≥ 44px de altura (alvo de toque).
const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 type-button text-sm rounded-xl",
  md: "min-h-11 px-4 type-button rounded-xl",
  lg: "min-h-12 px-5 type-button text-base rounded-2xl",
  icon: "h-11 w-11 shrink-0 rounded-xl p-0",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
  { loading = false }: { loading?: boolean } = {}
): string {
  // Loading stays inert (native disabled) but keeps the variant's colours,
  // so "working on it" never looks like "not allowed".
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], loading ? "cursor-progress" : BUTTON_DISABLED[variant], BUTTON_SIZES[size], className);
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: BtnProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className, { loading })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-button-variant={variant}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      )}
      {/*
        inline-flex evita o SVG (display:block no Preflight do Tailwind)
        cair na linha de baixo do rótulo — o bug do chevron sob "Continuar".
      */}
      <span
        className={cx(
          "inline-flex items-center justify-center gap-2",
          loading && "opacity-90"
        )}
      >
        {children}
      </span>
    </button>
  );
}

// CTA de navegação: mesmo visual do Button, mas renderiza um link real.
// Evita o antipadrão <Link><Button/></Link> (um <button> aninhado em <a>,
// que é HTML inválido e confunde o teclado e leitores de tela).
interface ButtonLinkProps extends Omit<LinkProps, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

// Variante para âncoras nativas (href externo, mailto, download).
interface AnchorButtonProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}
export function AnchorButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: AnchorButtonProps) {
  return (
    <a className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </a>
  );
}

export function ProgressBar({
  value,
  max = 100,
  className,
  label,
  progressId,
}: {
  value: number;
  max?: number;
  className?: string;
  label?: string;
  /** RC2.3.13R.3.2.4 — stable id so a real delta animates once (never from zero). */
  progressId?: string;
}) {
  const { t } = useTranslation();
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeValue = Number.isFinite(value) ? value : 0;
  const pct = Math.max(0, Math.min(100, Math.round((safeValue / safeMax) * 100)));
  return (
    <div
      className={cx("h-2 overflow-hidden rounded-full bg-line", className)}
      role="progressbar"
      aria-label={label ?? t("missions.progressLabel")}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.max(0, Math.min(safeMax, safeValue))}
      aria-valuetext={`${pct}%`}
      data-progress-pct={pct}
    >
      <ProgressFill
        id={progressId}
        value={pct}
        className="h-full w-full rounded-full bg-accent shadow-inner"
      />
    </div>
  );
}

export function Pill({
  children,
  tone = "muted",
  className,
  ...rest
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "good" | "gold" | "warning" | "wrong";
  className?: string;
} & HTMLAttributes<HTMLSpanElement>) {
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
      {...rest}
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
        {eyebrow && <div className="type-eyebrow mb-1">{eyebrow}</div>}
        <h1 className="type-page-title">{title}</h1>
        {desc && <p className="type-supporting mt-1 max-w-2xl">{desc}</p>}
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
        <h2 className="type-section-title text-[1.125rem] sm:text-[1.375rem]">{title}</h2>
        {desc && <p className="type-supporting mt-0.5">{desc}</p>}
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
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const resolved = label ?? t("common.loading");
  return (
    <div className={cx("flex min-h-32 items-center justify-center gap-3 text-sm text-ink-soft", className)} role="status">
      <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-accent/25 border-r-accent motion-reduce:animate-none" />
      <span>{resolved}</span>
    </div>
  );
}

export function ErrorState({
  title,
  desc,
  action,
  onRetry,
  retrying = false,
  className,
}: {
  title?: string;
  desc?: string;
  action?: ReactNode;
  /** RC2.3.13R.3.2.5 — an error is never a dead end: a retry when the caller can reload. */
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("errors.loadFailed");
  return (
    <Card variant="alert" className={cx("p-5", className)} role="alert">
      <h3 className="font-semibold text-ink">{resolvedTitle}</h3>
      {desc && <p className="mt-1 text-sm leading-5 text-ink-soft">{desc}</p>}
      {(action || onRetry) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onRetry && (
            <Button variant="soft" loading={retrying} onClick={onRetry} data-testid="error-state-retry">
              {t("errors.retry")}
            </Button>
          )}
          {action}
        </div>
      )}
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
        "flex min-h-[88px] flex-col items-start rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[.99]",
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
