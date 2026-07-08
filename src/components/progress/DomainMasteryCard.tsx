import { Link } from "react-router-dom";
import { DOMAIN_META } from "../../data/domains";
import { engineInsights, nextBestEngineAction } from "../../lib/engineIntelligence";
import type { SRSItem } from "../../lib/srs";
import { Card, Pill } from "../ui/primitives";

export function DomainMasteryCard({
  completedLessons,
  srs,
}: {
  completedLessons: string[];
  srs: Record<string, SRSItem>;
}) {
  const rows = engineInsights(completedLessons, srs);
  const next = nextBestEngineAction(rows);
  const nextMeta = DOMAIN_META[next.track];
  const NextIcon = nextMeta.icon;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Método Longyu
          </div>
          <h2 className="font-serif text-xl font-semibold text-ink">
            Os 4 motores conectados
          </h2>
          <p className="mt-1 max-w-lg text-sm text-ink-soft">
            Cada treino alimenta biblioteca, revisão e o próximo motor da jornada.
          </p>
        </div>
        <Pill tone={next.dueItems > 0 ? "accent" : "muted"} className="hidden shrink-0 sm:inline-flex">
          Próximo: {nextMeta.label}
        </Pill>
      </div>

      <div className="mb-4 rounded-2xl border border-line bg-surface-2/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${nextMeta.color}1a`, color: nextMeta.color }}
              >
                <NextIcon width={18} height={18} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">Recomendação inteligente</div>
                <div className="truncate text-xs text-ink-faint">{next.weakness}</div>
              </div>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{next.recommendation}</p>
          </div>
          <Link
            to={next.href}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-white shadow-sm transition hover:bg-accent-strong"
          >
            {next.actionLabel}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const meta = DOMAIN_META[row.track];
          const Icon = meta.icon;
          return (
            <div key={row.track} className="min-w-0 rounded-2xl border border-line bg-surface-2/50 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${meta.color}1a`, color: meta.color }}
                  >
                    <Icon width={18} height={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
                      {meta.label}
                    </div>
                    <div className="truncate text-[11px] text-ink-faint">
                      {row.completedLessons}/{row.totalLessons} lições · {row.reviewedItems} domínios · {row.dueItems} vencidos
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                  {row.percent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line/70">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${row.percent}%`, background: meta.color }}
                />
              </div>
              <div className="mt-3 grid gap-2 text-xs text-ink-soft sm:grid-cols-2">
                <div className="rounded-xl bg-surface px-3 py-2">
                  <span className="font-medium text-ink">Recebe: </span>{row.receives}
                </div>
                <div className="rounded-xl bg-surface px-3 py-2">
                  <span className="font-medium text-ink">Alimenta: </span>{row.feed}
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {row.locked && <Pill>bloqueado</Pill>}
                  <p className="min-w-0 text-xs text-ink-faint">{row.weakness}</p>
                </div>
                <Link
                  to={row.href}
                  className="shrink-0 text-xs font-semibold text-accent hover:underline"
                >
                  {row.actionLabel}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
