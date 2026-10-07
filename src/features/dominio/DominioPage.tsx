/**
 * RC2.3.6 — "Seu Domínio": what the learner already handles, what is worth
 * practising and what is due. Human labels only — no scores, no percentages,
 * no ranking, 3–5 items per group. "Por que estou vendo isto?" explains the
 * state in plain, non-judgmental words.
 */
import { useMemo, useState } from "react";
import { HubHeader, HubPage } from "../../components/layout/HubLayout";
import { ButtonLink, Card, Pill } from "../../components/ui/primitives";
import { STATE_LABEL_PT, VIEW_LABEL_PT } from "../../lib/mastery/personalMastery";
import type { CompetencyView } from "../../lib/mastery/competency";
import { knowledgeGraph } from "../../lib/mastery/knowledgeGraph";
import { useLearnerMastery } from "./useLearnerMastery";

const GROUP_LIMIT = 5;

type Row = { targetId: string; view: CompetencyView };

function uniqueByTarget<T extends Row>(rows: T[], limit = GROUP_LIMIT): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (seen.has(r.targetId)) continue;
    seen.add(r.targetId);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

export function DominioPage() {
  const pm = useLearnerMastery();
  const graph = knowledgeGraph();
  const [open, setOpen] = useState<string | null>(null);
  const groups = useMemo(
    () => ({
      strong: uniqueByTarget(pm.getStrongTargets()),
      practice: uniqueByTarget([...pm.getWeakTargets(), ...pm.getDevelopingTargets()]),
      review: uniqueByTarget(pm.getReviewDueTargets()),
    }),
    [pm]
  );
  const empty = !groups.strong.length && !groups.practice.length && !groups.review.length;
  const canPractice = groups.practice.length + groups.review.length > 0;

  const renderGroup = (title: string, rows: Row[], testId: string) =>
    rows.length ? (
      <section data-testid={testId} className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <ul className="grid gap-2">
          {rows.map((r) => {
            const label = graph.targets.get(r.targetId)?.label ?? r.targetId;
            const state = pm.getDimensionState(r.targetId, r.view).state;
            const key = `${r.targetId}|${r.view}`;
            const explanation = open === key ? pm.explainTargetState(r.targetId).views.find((v) => v.view === r.view) : null;
            return (
              <li key={key}>
                <Card className="p-3">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 break-words text-base text-ink" lang="zh">{label}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Pill tone="muted">{VIEW_LABEL_PT[r.view]}</Pill>
                      <Pill tone={state === "STRONG" || state === "STABLE" ? "good" : "accent"}>{STATE_LABEL_PT[state]}</Pill>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs text-ink-soft underline"
                    data-testid="mastery-why"
                    aria-expanded={open === key}
                    onClick={() => setOpen(open === key ? null : key)}
                  >
                    Por que estou vendo isto?
                  </button>
                  {explanation ? (
                    <ul className="mt-1 list-disc pl-5 text-xs text-ink-soft" data-testid="mastery-why-text">
                      {explanation.whyPt.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    ) : null;

  return (
    <HubPage compact data-testid="dominio-page">
      <HubHeader eyebrow="Seu progresso" title="Seu Domínio" desc="O que você já usa bem e o que vale praticar — a partir do que você fez." />
      {empty ? (
        <Card className="p-4 text-sm text-ink-soft" data-testid="dominio-empty">
          Ainda não há atividades suficientes para mostrar algo aqui. Continue a Jornada — isto se preenche sozinho.
        </Card>
      ) : null}
      {canPractice ? (
        <ButtonLink to="/revisao?sessao=dominio&iniciar=1" className="w-full" data-testid="practice-what-i-need">
          Praticar o que preciso
        </ButtonLink>
      ) : null}
      {renderGroup("Você está firme em", groups.strong, "dominio-strong")}
      {renderGroup("Vale praticar", groups.practice, "dominio-practice")}
      {renderGroup("Hora de revisar", groups.review, "dominio-review")}
    </HubPage>
  );
}
