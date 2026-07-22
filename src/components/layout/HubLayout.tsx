import type { ComponentType, ReactNode, SVGProps } from "react";
import { Link } from "react-router-dom";
import { Card, EmptyState, PageHeader, Pill, SectionHeader } from "../ui/primitives";
import { IconChevron, IconStar } from "../ui/Icon";

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function HubPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("mx-auto min-w-0 max-w-5xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]", className)}>
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
  return <PageHeader eyebrow={eyebrow} title={title} desc={desc} actions={badge || aside ? <>{badge}{aside}</> : undefined} />;
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
    <section id={id} className={cx(id ? "scroll-mt-20" : undefined, className)}>
      <SectionHeader title={title} desc={desc} action={count} className="mb-3" />
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
  columns = "grid-cols-1 min-[390px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
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
      variant={item.disabled ? "basic" : "interactive"}
      className={cx(
        "flex h-full min-h-[96px] flex-col p-3 transition",
        item.disabled ? "bg-surface-2/60 opacity-80" : "",
        item.featured && !item.disabled ? "border-accent/30 bg-accent-soft/20" : ""
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            item.featured && !item.disabled ? "bg-accent text-white" : "bg-surface-2 text-accent/80"
          )}
        >
          <Icon width={15} height={15} />
        </span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {item.pro && <Pill tone="gold">Pro</Pill>}
          {item.status && (
            <Pill tone={item.statusTone ?? (item.featured ? "accent" : "muted")} className="max-w-[88px] truncate">
              {item.status}
            </Pill>
          )}
        </div>
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-tight text-ink">{item.title}</h3>
      <p className="mt-1 line-clamp-2 text-xs leading-4 text-ink-faint">{item.desc}</p>
    </Card>
  );

  if (item.disabled) return <div aria-disabled="true">{inner}</div>;
  if (item.onClick) {
    return (
      <button type="button" onClick={item.onClick} className="group h-full w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45">
        {inner}
      </button>
    );
  }
  if (!item.to) return <div>{inner}</div>;
  return (
    <Link to={item.to} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45">
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
    <Card className="p-3 sm:p-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
            <Icon width={18} height={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-[13px] font-semibold leading-tight text-ink sm:text-sm">{title}</h2>
              {status && <Pill tone={statusTone}>{status}</Pill>}
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-ink-faint sm:text-xs">{desc}</p>
            {footer}
          </div>
        </div>
        <Link to={ctaTo} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-card transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 sm:w-auto">
            {cta} <IconChevron width={15} height={15} />
        </Link>
      </div>
    </Card>
  );
}

export function HubProStrip({ isPremium }: { isPremium: boolean }) {
  return (
    <Card className="p-2.5 sm:p-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <IconStar width={14} height={14} />
        </span>
        <div className="min-w-0 flex-1 text-[13px] font-semibold text-ink">
          {isPremium ? "Pro ativo" : "Pro: revisão ilimitada e sem cargas"}
        </div>
        <Link to="/pro" className={cx("inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45", isPremium ? "border-transparent bg-accent-soft text-accent" : "border-line/65 bg-transparent text-ink hover:bg-surface-2")}>
            {isPremium ? "Plano" : "Ver Pro"}
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
  return <EmptyState title={title} desc={desc} action={action} />;
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
    <Card className={cx("p-3", className)}>
      <div className="flex items-start justify-between gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent/80">
            <Icon width={16} height={16} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[13px] font-semibold leading-tight text-ink">{title}</h3>
            {meta}
          </div>
          {desc && <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-ink-faint">{desc}</p>}
        </div>
      </div>
      {children}
      {action && <div className="mt-2.5">{action}</div>}
    </Card>
  );
}
