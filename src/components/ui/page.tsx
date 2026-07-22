import type { ComponentType, ReactNode, SVGProps } from "react";
import { Link } from "react-router-dom";
import { Button, ButtonLink, Card, ProgressBar } from "./primitives";
import { IconChevron } from "./Icon";

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ─────────────────────────────────────────────────────────────────────────
// PageShell — largura por tipo de página; no desktop, centro + right rail
// opcional; no mobile, coluna única (o rail cai abaixo do conteúdo).
// ─────────────────────────────────────────────────────────────────────────
type PageWidth = "narrow" | "default" | "wide";
const WIDTH: Record<PageWidth, string> = {
  narrow: "max-w-2xl",
  default: "max-w-4xl",
  wide: "max-w-5xl",
};

export function PageShell({
  width = "default",
  rail,
  children,
  className,
}: {
  width?: PageWidth;
  rail?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const pad = "pb-[calc(env(safe-area-inset-bottom)+1rem)]";
  if (rail) {
    return (
      <div className={cx("mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_21rem]", pad, className)}>
        <div className="min-w-0 space-y-4">{children}</div>
        <aside className="lg:sticky lg:top-4 lg:self-start">{rail}</aside>
      </div>
    );
  }
  return <div className={cx("mx-auto w-full space-y-4", WIDTH[width], pad, className)}>{children}</div>;
}

// ─────────────────────────────────────────────────────────────────────────
// PageHeader — título, subtítulo curto, ação principal e progresso opcional.
// ─────────────────────────────────────────────────────────────────────────
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  action,
  progress,
  back,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  action?: ReactNode;
  progress?: { value: number; max: number; label?: string };
  back?: { to: string; label: string };
}) {
  return (
    <header>
      {back && (
        <Link
          to={back.to}
          className="mb-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-1.5 text-xs font-medium text-ink-soft transition hover:bg-surface-2 hover:text-ink"
        >
          <IconChevron width={15} height={15} className="rotate-180" />
          {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent sm:flex">
              <Icon width={22} height={22} />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{eyebrow}</div>}
            <h1 className="mt-0.5 font-serif text-[1.4rem] font-semibold leading-tight text-ink sm:text-[1.6rem]">{title}</h1>
            {subtitle && <p className="mt-0.5 max-w-xl text-xs leading-5 text-ink-soft sm:text-sm">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {progress && (
        <div className="mt-3">
          {progress.label && (
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-ink-faint">
              <span>{progress.label}</span>
              <span className="tabular-nums">{progress.value}/{progress.max}</span>
            </div>
          )}
          <ProgressBar value={progress.value} max={progress.max} className="h-2" />
        </div>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CompactCard — card menor, padding reduzido, borda sutil, radius consistente.
// ─────────────────────────────────────────────────────────────────────────
export function CompactCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Card className={cx("p-3 sm:p-3.5", onClick && "cursor-pointer transition hover:border-accent/30 active:scale-[.99]", className)} onClick={onClick}>
      {children}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// StatTile — métrica compacta: ícone + número + legenda curta.
// ─────────────────────────────────────────────────────────────────────────
export function StatTile({
  icon: Icon,
  value,
  label,
  tone = "default",
}: {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  value: ReactNode;
  label: string;
  tone?: "default" | "accent" | "good" | "gold";
}) {
  const toneText = {
    default: "text-ink",
    accent: "text-accent",
    good: "text-[rgb(var(--good))]",
    gold: "text-gold",
  }[tone];
  return (
    <div className="min-w-0 rounded-xl border border-line/50 bg-surface px-3 py-2.5 shadow-card">
      <div className="flex items-center gap-1.5 text-ink-faint">
        {Icon && <Icon width={13} height={13} />}
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className={cx("mt-1 truncate font-serif text-lg font-semibold sm:text-xl", toneText)}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// RightRail — coluna lateral com no máximo 2–3 cards.
// ─────────────────────────────────────────────────────────────────────────
export function RightRail({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

// ─────────────────────────────────────────────────────────────────────────
// EmptyState — estado vazio bonito e útil, sempre com CTA.
// ─────────────────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed p-6 text-center">
      {Icon && (
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent">
          <Icon width={22} height={22} />
        </div>
      )}
      <div className="font-serif text-base font-semibold text-ink sm:text-lg">{title}</div>
      {desc && <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-ink-soft sm:text-sm">{desc}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ActionButton — CTA principal forte / secundária discreta, tamanho consistente.
// ─────────────────────────────────────────────────────────────────────────
export function ActionButton({
  children,
  to,
  onClick,
  variant = "primary",
  size = "md",
  icon,
  trailingChevron = false,
  block = false,
  disabled = false,
  className,
}: {
  children: ReactNode;
  to?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  trailingChevron?: boolean;
  block?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const resolvedVariant = variant === "secondary" ? "outline" : "primary";
  const classes = cx(block && "w-full", variant === "primary" && "shadow-lift", className);
  const content = (
    <>
      {icon}
      {children}
      {trailingChevron && <IconChevron width={size === "sm" ? 15 : 17} height={size === "sm" ? 15 : 17} />}
    </>
  );
  // Com `to`, renderiza um link real (ButtonLink) em vez de <Link><Button/></Link>,
  // que aninharia um <button> dentro de um <a> (HTML inválido e ruim para o teclado).
  if (to && !disabled) {
    return (
      <ButtonLink to={to} variant={resolvedVariant} size={size} className={classes}>
        {content}
      </ButtonLink>
    );
  }
  return (
    <Button
      variant={resolvedVariant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {content}
    </Button>
  );
}
