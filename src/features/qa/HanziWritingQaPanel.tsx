import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  auditHanziSystem,
  handwritingCoverage,
  earlyHanziProgressionRows,
} from "../../lib/hanziWriting/audit";
import { gradingSourcePolicy, listVerifiedHandwritingCharacters } from "../../lib/hanziWriting/handwritingReference";
import { HANZI_CORE_STAGE_ORDER } from "../../lib/hanziWriting/stages";
import {
  BUILDER_GEOMETRY_NOT_GRADING_SOURCE,
  HANDWRITING_CURRICULUM_LEAK,
  HANDWRITING_REFERENCE_REQUIRED,
  HANDWRITING_REFERENCE_VERIFIED,
  STROKE_ORDER_DATA_MISSING,
} from "../../lib/hanziWriting/gates";
import { loadFormEvidenceMap, writingStrength } from "../../lib/hanziWriting/evidence";
import { detectHandwritingCurriculumLeaks } from "../../lib/hanziWriting/curriculumLeak";

/**
 * RC2.3.4 — Device QA panel for Hànzì Progressive Writing (never production UI).
 */
export function HanziWritingQaPanel() {
  const summary = useMemo(() => {
    const rows = auditHanziSystem();
    const coverage = handwritingCoverage();
    const early = earlyHanziProgressionRows();
    const evidence = loadFormEvidenceMap();
    const leaks = detectHandwritingCurriculumLeaks(
      listVerifiedHandwritingCharacters().map((hanzi) => {
        const row = rows.find((r) => r.hanzi === hanzi)!;
        return {
          charId: row.charId,
          character: hanzi,
          stage: "MEMORY_WRITE" as const,
          completedLessons: [],
        };
      })
    );
    return {
      rows,
      coverage,
      early,
      evidenceCount: Object.keys(evidence).length,
      weakWriting: Object.values(evidence).filter((e) => writingStrength(e) < 0.45).length,
      leaks,
      policy: gradingSourcePolicy(),
    };
  }, []);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-hanzi-writing">
      <h2 className="text-base font-semibold text-ink">Hànzì Writing (RC2.3.4)</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Inspeção de escrita progressiva — não é UI de aluno. Gates:{" "}
        <code className="text-xs">{HANDWRITING_REFERENCE_REQUIRED}</code>,{" "}
        <code className="text-xs">{HANDWRITING_REFERENCE_VERIFIED}</code>,{" "}
        <code className="text-xs">{BUILDER_GEOMETRY_NOT_GRADING_SOURCE}</code>,{" "}
        <code className="text-xs">{STROKE_ORDER_DATA_MISSING}</code>,{" "}
        <code className="text-xs">{HANDWRITING_CURRICULUM_LEAK}</code>
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-ink">
        <li className="rounded-lg bg-surface-2 px-3 py-2">Chars total: {summary.coverage.charactersTotal}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">
          Verified refs: {summary.coverage.handwritingReferenceVerified}
        </li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Builder support: {summary.coverage.builderSupported}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Data required: {summary.coverage.dataRequired}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Trace supported: {summary.coverage.traceSupported}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Memory write: {summary.coverage.memoryWriteSupported}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Evidence entries: {summary.evidenceCount}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">
          Leak candidates (untaught): {summary.leaks.leaks}
        </li>
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-ink">Stages</h3>
      <p className="text-xs text-ink-soft">{HANZI_CORE_STAGE_ORDER.join(" → ")}</p>

      <h3 className="mt-4 text-sm font-semibold text-ink">Verified set</h3>
      <p className="text-xs text-ink-soft">{summary.coverage.verifiedCharacters.join(" ")}</p>

      <h3 className="mt-4 text-sm font-semibold text-ink">Builder ≠ grading</h3>
      <p className="text-xs text-ink-soft">{summary.policy.note}</p>

      <h3 className="mt-4 text-sm font-semibold text-ink">Early progression watch</h3>
      <ul className="mt-1 list-disc pl-5 text-xs text-ink-soft">
        {summary.early.map((e) => (
          <li key={e.charId}>
            {e.hanzi}: intro={e.introduction ?? "—"} builder={String(e.builder)} complete={String(e.complete)}{" "}
            trace={String(e.trace)} memory={String(e.memory)}
            {e.jumpRisk ? ` · RISK: ${e.jumpRisk}` : ""}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-ink">Open samples</h3>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <Link className="rounded-lg border border-line px-3 py-2" to="/hanzi?mode=trace" data-testid="qa-hanzi-trace-sample">
          Trace sample
        </Link>
        <Link className="rounded-lg border border-line px-3 py-2" to="/hanzi?mode=memory" data-testid="qa-hanzi-memory-sample">
          Memory sample
        </Link>
        <Link className="rounded-lg border border-line px-3 py-2" to="/hanzi?lab=1&char=mu" data-testid="qa-hanzi-lab-sample">
          Lab / missing-stroke
        </Link>
      </div>
    </section>
  );
}
