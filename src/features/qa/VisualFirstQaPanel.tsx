import { useMemo } from "react";
import { VISUAL_CONCEPTS } from "../../data/visualVocabulary";
import { PEDAGOGY_VISUAL_SCENES } from "../../lib/visualFirst/contextScenes";
import { listHanziVisualPrep } from "../../lib/visualFirst/hanziVisualPrep";
import { CONCRETE_FIRST_EXPOSURE_WITHOUT_VISUAL } from "../../lib/visualFirst/resolveCurriculumVisual";

/**
 * RC2.3.1 — painel QA (somente Device QA) para inspecionar Visual First.
 * Nunca aparece na UI de produção do aluno.
 */
export function VisualFirstQaPanel() {
  const summary = useMemo(() => {
    const withAsset = VISUAL_CONCEPTS.filter((c) => c.imageSrc).length;
    const emojiOnly = VISUAL_CONCEPTS.filter((c) => !c.imageSrc).length;
    const unsafeImageOnly = VISUAL_CONCEPTS.filter((c) => c.imageOnlySafe === false).length;
    return { withAsset, emojiOnly, unsafeImageOnly, total: VISUAL_CONCEPTS.length, scenes: PEDAGOGY_VISUAL_SCENES.length };
  }, []);

  const missingAsset = VISUAL_CONCEPTS.filter((c) => !c.imageSrc).slice(0, 12);
  const hanziPrep = listHanziVisualPrep();

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-visual-first">
      <h2 className="text-base font-semibold text-ink">Visual First (RC2.3.1)</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Inspeção de cobertura visual — não é UI de aluno. Gate de referência:{" "}
        <code className="text-xs">{CONCRETE_FIRST_EXPOSURE_WITHOUT_VISUAL}</code>
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-ink">
        <li className="rounded-lg bg-surface-2 px-3 py-2">Banco: {summary.total}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Com asset local: {summary.withAsset}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Só emoji: {summary.emojiOnly}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">imageOnlySafe=false: {summary.unsafeImageOnly}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Cenas pedagógicas: {summary.scenes}</li>
        <li className="rounded-lg bg-surface-2 px-3 py-2">Hànzì prep (API 2.3.4): {hanziPrep.length}</li>
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-ink">ASSET_REQUIRED (sem imageSrc)</h3>
      {missingAsset.length === 0 ? (
        <p className="mt-1 text-sm text-ink-soft">Nenhum no banco atual.</p>
      ) : (
        <ul className="mt-1 max-h-40 overflow-auto text-xs text-ink-soft">
          {missingAsset.map((c) => (
            <li key={c.id}>
              {c.hanzi} · {c.id} · {c.meaningPt}
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-sm font-semibold text-ink">Próximas context scenes</h3>
      <ul className="mt-1 max-h-40 overflow-auto text-xs text-ink-soft">
        {PEDAGOGY_VISUAL_SCENES.slice(0, 8).map((s) => (
          <li key={s.id}>
            {s.id} · {s.wherePt} · {s.goalPt} · âncora {s.anchorConceptId}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-ink">Hànzì visual prep (sem pseudohistória)</h3>
      <ul className="mt-1 max-h-40 overflow-auto text-xs text-ink-soft">
        {hanziPrep.map((h) => (
          <li key={h.hanzi}>
            {h.hanzi} · {h.relationKind} · {h.notePt}
          </li>
        ))}
      </ul>
    </section>
  );
}
