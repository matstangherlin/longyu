/**
 * RC2.3.6 — Device QA panel for Personal Mastery (never learner UI).
 * Shows the evidence chain behind any target state ("Why this state?").
 */
import { useMemo, useState } from "react";
import { auditKnowledgeGraph, resolveAlias } from "../../lib/mastery/knowledgeGraph";
import { currentRecord } from "../../lib/mastery/recorder";
import { useLearnerMastery } from "../dominio/useLearnerMastery";

export function PersonalMasteryQaPanel() {
  const pm = useLearnerMastery();
  const [query, setQuery] = useState("");
  const audit = useMemo(() => auditKnowledgeGraph(), []);
  const record = currentRecord();
  const targetId = query.includes(":") ? query.trim() : resolveAlias(query).find((a) => a.kind === "IDENTICAL")?.id ?? "";
  const explanation = targetId ? pm.explainTargetState(targetId) : null;
  const signals = pm.errorSignals().slice(0, 5);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-personal-mastery">
      <h2 className="text-base font-semibold text-ink">Personal Mastery (RC2.3.6)</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Inspeção — não é UI de aluno. Eventos recentes: {record.recent.length} · agregados: {Object.keys(record.aggregates).length} · alvos no grafo:{" "}
        {audit.targets} · relações: {audit.relations} · ciclos: {audit.prerequisiteCycles.length} · órfãos: {audit.orphans.length}
      </p>
      <p className="mt-1 text-xs text-ink-soft">Jev: DEV_AUDIT apenas — nunca decide estado no runtime do aluno.</p>
      <label className="mt-3 block text-sm text-ink">
        Alvo (hànzì, pinyin com tom, ou id):
        <input className="mt-1 w-full rounded-lg border border-line bg-surface-2 p-2" value={query} onChange={(e) => setQuery(e.target.value)} data-testid="qa-mastery-query" />
      </label>
      {explanation ? (
        <div className="mt-3 space-y-2 text-xs" data-testid="qa-mastery-explain">
          <div className="font-mono">{explanation.targetId} → {explanation.headline}</div>
          {explanation.views.map((v) => (
            <div key={v.view} className="rounded-lg border border-line p-2">
              <div className="font-semibold">
                {v.view}: {v.state} ({v.confidence})
              </div>
              <div>regras: {v.rules.join(", ")}</div>
              <ul className="mt-1 font-mono">
                {v.evidence.map((e) => (
                  <li key={e.id}>
                    {new Date(e.timestamp).toISOString().slice(0, 16)} {e.skill} {e.result} ind={e.independence} {e.supportUsed.join("+")} · {e.source.activityId}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
      {signals.length ? (
        <div className="mt-3 text-xs" data-testid="qa-mastery-signals">
          <div className="font-semibold">Sinais de erro (repetidos):</div>
          {signals.map((s) => (
            <div key={s.family} className="font-mono">
              {s.family}: {s.failures}/{s.attempts} · {s.targets.slice(0, 4).join(" ")}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
