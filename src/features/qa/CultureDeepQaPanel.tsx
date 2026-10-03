import { useMemo } from "react";
import { auditAllCultureItems, auditCultureJourneyGates, cultureDepthSummary } from "../../lib/cultureDeep/audit";
import {
  CULTURE_KIND_PRESENTATION_MISMATCH,
  CULTURE_LANGUAGE_LEAK,
  CULTURE_SOURCE_COVERAGE,
  CULTURE_UNSCOPED_ABSOLUTE_CLAIM,
  YEAR_SPECIFIC_SOURCE_USED_AS_EVERGREEN,
} from "../../lib/cultureDeep/gates";
import { CULTURE_STORY_FLAGSHIP_IDS } from "../../data/cultureNative";

/**
 * RC2.3.3 — Device QA panel for Culture Deep (never production UI).
 */
export function CultureDeepQaPanel() {
  const summary = useMemo(() => {
    const rows = auditAllCultureItems();
    const gates = auditCultureJourneyGates();
    const depth = cultureDepthSummary(rows);
    const findings = rows.flatMap((r) => r.editorialFindings.filter((f) => f.code));
    const flagships = rows.filter((r) =>
      (CULTURE_STORY_FLAGSHIP_IDS as readonly string[]).includes(r.itemId)
    );
    return {
      depth,
      gates,
      findings,
      shallow: rows.filter((r) => r.depthClass === "SHALLOW"),
      flagshipsNotDeep: flagships.filter((f) => f.depthClass !== "FLAGSHIP_DEEP"),
      noSource: rows.filter((r) => r.sources === 0),
      noVariability: rows.filter((r) => !r.variability),
      noMemory: rows.filter((r) => !r.memoryTarget),
      unjustifiedGates: gates.filter((g) => !g.justified),
    };
  }, []);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-culture-deep">
      <h2 className="text-base font-semibold text-ink">Culture Deep (RC2.3.3)</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Inspeção editorial — não é UI de aluno. Gates:{" "}
        <code className="text-xs">{CULTURE_KIND_PRESENTATION_MISMATCH}</code>,{" "}
        <code className="text-xs">{CULTURE_UNSCOPED_ABSOLUTE_CLAIM}</code>,{" "}
        <code className="text-xs">{CULTURE_SOURCE_COVERAGE}</code>,{" "}
        <code className="text-xs">{YEAR_SPECIFIC_SOURCE_USED_AS_EVERGREEN}</code>,{" "}
        <code className="text-xs">{CULTURE_LANGUAGE_LEAK}</code>
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-ink">
        <li className="rounded-lg bg-surface-2 px-3 py-2">Items: {summary.depth.total}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">
          FLAGSHIP_DEEP: {summary.depth.flagshipsDeep}/{summary.depth.flagshipCount}
        </li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">SHALLOW: {summary.depth.shallowCount}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Hub-only: {summary.depth.hubOnly}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Editorial findings: {summary.findings.length}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">
          Gates OK: {summary.gates.filter((g) => g.justified).length}/{summary.gates.length}
        </li>
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-ink">Depth by class</h3>
      <ul className="mt-1 text-xs text-ink-soft">
        {Object.entries(summary.depth.byClass).map(([k, v]) => (
          <li key={k}>
            {k}: {v}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-ink">Watchlist</h3>
      <ul className="mt-1 list-disc pl-5 text-xs text-ink-soft">
        <li>Items sem fonte: {summary.noSource.map((r) => r.itemId).join(", ") || "—"}</li>
        <li>Items sem variability: {summary.noVariability.length}</li>
        <li>Items shallow: {summary.shallow.map((r) => r.itemId).join(", ") || "—"}</li>
        <li>Flagships ≠ FLAGSHIP_DEEP: {summary.flagshipsNotDeep.map((r) => r.itemId).join(", ") || "—"}</li>
        <li>Items sem memory target: {summary.noMemory.length}</li>
        <li>Gates sem justificativa: {summary.unjustifiedGates.map((g) => g.gateId).join(", ") || "—"}</li>
        <li>Absolute claims / year misuse / language leaks: {summary.findings.length}</li>
      </ul>
    </section>
  );
}
