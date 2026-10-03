import { useMemo } from "react";
import { EVERYDAY_SCENARIOS } from "../../lib/everydayMandarin/scenarios";
import {
  CONTEXT_LEAKS_EXPECTED_ANSWER,
  EVERYDAY_CONTEXT_QUALITY,
  EVERYDAY_CURRICULUM_LEAK,
} from "../../lib/everydayMandarin/quality";

/**
 * RC2.3.2 — painel QA Everyday Mandarin (somente Device QA).
 * Nunca aparece na UI de produção do aluno.
 */
export function EverydayMandarinQaPanel() {
  const summary = useMemo(() => {
    const byDomain = EVERYDAY_SCENARIOS.reduce<Record<string, number>>((acc, s) => {
      acc[s.domain] = (acc[s.domain] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: EVERYDAY_SCENARIOS.length,
      byDomain,
      intents: new Set(EVERYDAY_SCENARIOS.map((s) => s.intent)).size,
    };
  }, []);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-everyday-mandarin">
      <h2 className="text-base font-semibold text-ink">Everyday Mandarin (RC2.3.2)</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Inspeção de situações humanas — não é UI de aluno. Gates:{" "}
        <code className="text-xs">{EVERYDAY_CURRICULUM_LEAK}</code>,{" "}
        <code className="text-xs">{EVERYDAY_CONTEXT_QUALITY}</code>,{" "}
        <code className="text-xs">{CONTEXT_LEAKS_EXPECTED_ANSWER}</code>
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-ink">
        <li className="rounded-lg bg-surface-2 px-3 py-2">Cenários: {summary.total}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Intents únicos: {summary.intents}</li>
        {Object.entries(summary.byDomain).map(([domain, n]) => (
          <li key={domain} className="rounded-lg bg-surface-2 px-3 py-2">
            {domain}: {n}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-ink">Cenários (amostra)</h3>
      <ul className="mt-1 max-h-48 overflow-auto text-xs text-ink-soft">
        {EVERYDAY_SCENARIOS.slice(0, 12).map((s) => (
          <li key={s.id}>
            {s.id} · {s.intent} · {s.locationPt}/{s.participantRolePt} → {s.expectedHanzi}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-ink">O que olhar no Device QA</h3>
      <ul className="mt-1 list-disc pl-5 text-xs text-ink-soft">
        <li>Sessões ainda metalinguísticas demais</li>
        <li>Lições sem communicative outcome</li>
        <li>Context leak / artificial</li>
        <li>Pass 3 sem produção · Pass 4 sem transferência</li>
        <li>CONTEXTUAL_REUSE vs TARGET_REPEAT</li>
      </ul>
    </section>
  );
}
