import type { ArticulationDiagramSpec, LipShape, TonguePlacement } from "../../data/articulationTargets";

/**
 * RC2.2.19 — corte lateral da boca (lábios, dentes, céu da boca, língua) para
 * CONSOANTES e VOGAIS. Nunca usado para tom: tom é altura da voz
 * (ToneContour), não posição de língua.
 *
 * Desenho esquemático e estático (sem animação que distraia). Cores por token.
 */
const TONGUE_PATH: Record<TonguePlacement, string> = {
  // Ponta encostada atrás dos dentes de cima.
  "tip-behind-upper-teeth": "M 52 98 C 70 76, 110 78, 150 92 C 175 100, 190 118, 196 140 L 60 140 Z",
  // Ponta dobrada para trás, perto da gengiva de cima (retroflexa).
  "tip-curled-back": "M 62 110 C 70 96, 88 84, 96 76 C 90 88, 108 92, 150 94 C 176 100, 190 118, 196 140 L 66 140 Z",
  // Ponta embaixo; o dorso sobe ao palato duro (j/q/x).
  "blade-to-hard-palate": "M 50 118 C 62 100, 88 70, 120 66 C 150 68, 178 94, 196 140 L 54 140 Z",
  // Língua relaxada no meio (e).
  "tip-low-body-mid": "M 54 116 C 76 100, 116 96, 150 102 C 176 108, 190 124, 196 140 L 58 140 Z",
  // Ponta atrás dos dentes de baixo; dorso alto e à frente (i/ü).
  "tip-behind-lower-teeth": "M 50 118 C 60 96, 90 74, 122 72 C 152 74, 180 98, 196 140 L 54 140 Z",
};

const LIP_UPPER: Record<LipShape, string> = {
  spread: "M 18 70 C 30 64, 40 66, 46 72",
  neutral: "M 14 68 C 28 62, 40 66, 46 72",
  rounded: "M 6 72 C 16 56, 38 60, 46 72",
};
const LIP_LOWER: Record<LipShape, string> = {
  spread: "M 18 108 C 30 114, 40 112, 46 106",
  neutral: "M 14 110 C 28 116, 40 112, 46 106",
  rounded: "M 6 106 C 16 122, 38 118, 46 106",
};

export function ArticulationDiagram({ spec, locale = "pt" }: { spec: ArticulationDiagramSpec; locale?: "pt" | "en" }) {
  const tip = locale === "en" ? spec.tipEn : spec.tipPt;
  const label = `${spec.sounds}: ${tip}`;
  return (
    <figure className="rounded-2xl border border-line bg-surface p-3" data-articulation-diagram={spec.id} data-tongue={spec.tongue} data-lips={spec.lips}>
      <svg viewBox="0 0 220 150" role="img" aria-label={label} className="mx-auto h-32 w-auto">
        {/* céu da boca (palato duro → mole) */}
        <path d="M 56 60 C 90 36, 150 34, 214 56" fill="none" stroke="rgb(var(--ink-faint))" strokeWidth="3" strokeLinecap="round" />
        {/* dentes de cima e de baixo */}
        <path d="M 48 62 L 56 60 L 58 80 L 50 82 Z" fill="rgb(var(--surface-2))" stroke="rgb(var(--ink-soft))" strokeWidth="1.5" />
        <path d="M 48 118 L 56 120 L 58 102 L 50 100 Z" fill="rgb(var(--surface-2))" stroke="rgb(var(--ink-soft))" strokeWidth="1.5" />
        {/* lábios */}
        <path d={LIP_UPPER[spec.lips]} fill="none" stroke="rgb(var(--accent))" strokeWidth="4" strokeLinecap="round" />
        <path d={LIP_LOWER[spec.lips]} fill="none" stroke="rgb(var(--accent))" strokeWidth="4" strokeLinecap="round" />
        {/* língua */}
        <path d={TONGUE_PATH[spec.tongue]} fill="rgb(var(--accent) / 0.22)" stroke="rgb(var(--accent))" strokeWidth="2" />
      </svg>
      <figcaption className="mt-2 text-center">
        <span className="block font-semibold text-ink">{spec.sounds}</span>
        <span className="mt-1 block text-sm leading-5 text-ink-soft">{tip}</span>
      </figcaption>
    </figure>
  );
}
