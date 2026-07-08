import type { ComponentType, ReactNode, SVGProps } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Pill } from "../ui/primitives";
import { IconChevron, IconStar } from "../ui/Icon";

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function HubPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("mx-auto max-w-5xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]", className)}>
      {children}
    </div>
  );
}

export function HubHeader({
  eyebrow,
  title,
  desc,
  badge,
  aside,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  badge?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">{eyebrow}</div>
          {badge}
        </div>
        <h1 className="mt-1 font-serif text-[1.65rem] font-semibold leading-tight text-ink sm:text-[1.85rem]">
          {title}
        </h1>
        {desc && <p className="mt-1 max-w-xl text-sm leading-5 text-ink-soft">{desc}</p>}
      </div>
      {aside}
    </header>
  );
}

export function HubSection({
  title,
  desc,
  count,
  id,
  className,
  children,
}: {
  title: string;
  desc?: string;
  count?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cx(className ?? (id ? "scroll-mt-20" : undefined))}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>
          {desc && <p className="mt-0.5 text-xs text-ink-soft">{desc}</p>}
        </div>
        {count}
      </div>
      {children}
    </section>
  );
}

export interface HubNavItem {
  title: string;
  desc: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  to?: string;
  onClick?: () => void;
  status?: ReactNode;
  statusTone?: "muted" | "accent" | "good" | "gold";
  featured?: boolean;
  disabled?: boolean;
  pro?: boolean;
}

export function HubNavGrid({
  items,
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
}: {
  items: HubNavItem[];
  columns?: string;
}) {
  return (
    <div className={cx("grid gap-2", columns)}>
      {items.map((item) => (
        <HubNavCard key={item.title} item={item} />
      ))}
    </div>
  );
}

export function HubNavCard({ item }: { item: HubNavItem }) {
  const Icon = item.icon;
  const inner = (
    <Card
      className={cx(
        "flex h-full min-h-[100px] flex-col rounded-xl border-line/70 p-3 shadow-none transition",
        item.disabled ? "bg-surface-2/60 opacity-80" : "group-hover:border-line",
        item.featured && !item.disabled ? "border-accent/35 bg-accent-soft/25" : "",
        item.to || item.onClick ? "group-hover:shadow-card" : ""
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            item.featured && !item.disabled ? "bg-accent text-white" : "bg-accent-soft text-accent"
          )}
        >
          <Icon width={17} height={17} />
        </span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {item.pro && <Pill tone="gold">Pro</Pill>}
          {item.status && (
            <Pill tone={item.statusTone ?? (item.featured ? "accent" : "muted")} className="max-w-[96px] truncate">
              {item.status}
            </Pill>
          )}
        </div>
      </div>
      <h3 className="mt-2.5 text-sm font-semibold leading-tight text-ink">{item.title}</h3>
      <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-soft">{item.desc}</p>
    </Card>
  );

  if (item.disabled) return <div aria-disabled="true">{inner}</div>;
  if (item.onClick) {
    return (
      <button type="button" onClick={item.onClick} className="group h-full w-full text-left">
        {inner}
      </button>
    );
  }
  if (!item.to) return <div>{inner}</div>;
  return (
    <Link to={item.to} className="group">
      {inner}
    </Link>
  );
}

export function HubHeroCard({
  title,
  desc,
  status,
  statusTone = "accent",
  icon: Icon,
  cta,
  ctaTo,
  footer,
}: {
  title: string;
  desc: string;
  status?: ReactNode;
  statusTone?: "muted" | "accent" | "good" | "gold";
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  cta: string;
  ctaTo: string;
  footer?: ReactNode;
}) {
  return (
    <Card className="rounded-xl border-line/70 p-3.5 shadow-none sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <Icon width={20} height={20} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold leading-tight text-ink sm:text-base">{title}</h2>
              {status && <Pill tone={statusTone}>{status}</Pill>}
            </div>
            <p className="mt-0.5 text-xs leading-5 text-ink-soft sm:text-sm">{desc}</p>
            {footer}
          </div>
        </div>
        <Link to={ctaTo} className="shrink-0">
          <Button size="sm" className="w-full sm:w-auto">
            {cta} <IconChevron width={16} height={16} />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export function HubProStrip({ isPremium }: { isPremium: boolean }) {
  return (
    <Card className="rounded-xl border-line/70 p-3 shadow-none">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <IconStar width={16} height={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">
            {isPremium ? "Benefícios Pro ativos." : "Pro libera revisão detalhada e treinos ilimitados."}
          </div>
        </div>
        <Link to="/pro" className="shrink-0">
          <Button size="sm" variant={isPremium ? "soft" : "outline"}>
            {isPremium ? "Plano" : "Ver Pro"}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export function HubEmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <Card className="rounded-xl border-dashed border-line/70 p-6 text-center shadow-none">
      <div className="font-serif text-lg font-semibold text-ink">{title}</div>
      <p className="mt-1 text-sm text-ink-soft">{desc}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

export function HubContentCard({
  title,
  desc,
  meta,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  desc?: string;
  meta?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cx("rounded-xl border-line/70 p-3.5 shadow-none", className)}>
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Icon width={18} height={18} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold leading-tight text-ink">{title}</h3>
            {meta}
          </div>
          {desc && <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-soft">{desc}</p>}
        </div>
      </div>
      {children}
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}
