/**
 * RC2.3.13R.3.2.3 — Device QA panel for the Journey scene pack (never learner UI).
 * Shows the pack identity the owner compares with the handoff (version, plan
 * digest, slot counts) and every scene at real lane size in the live theme, so
 * crispness, theme and motion can be judged on the physical device.
 */
import { JourneyScene } from "../journey/scenes/JourneyScene";
import { JOURNEY_SCENES, JOURNEY_SCENE_PACK_VERSION } from "../journey/scenes/journeySceneRegistry";
import { getJourneyScenePlan } from "../journey/scenes/journeyScenePlan";

const PHYSICAL_CHECKS = [
  "SVG loads",
  "SVG crispness",
  "SVG theme (light + dark)",
  "SVG side alternation",
  "SVG/node collision",
  "SVG/text collision",
  "SVG animation (slow drift)",
  "SVG reduced motion (still, visible)",
];

export function JourneySvgQaPanel() {
  const plan = getJourneyScenePlan();
  const theme = typeof document !== "undefined" ? document.documentElement.dataset.theme ?? "clay" : "clay";
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-journey-svg">
      <h2 className="text-base font-semibold text-ink">Journey SVG scenes (RC2.3.13R.3.2.3)</h2>
      <p className="mt-1 text-sm text-ink-soft">Inspeção — não é UI de aluno. Compare a identidade com o handoff.</p>
      <ul className="mt-2 grid gap-1 font-mono text-xs text-ink-soft">
        <li>
          pack v{JOURNEY_SCENE_PACK_VERSION} · {JOURNEY_SCENES.length} scenes · digest {plan.digest}
        </li>
        <li>
          slots: {plan.scenes.length} scenes · {plan.ornaments.length} ornaments
        </li>
        <li>
          theme: {theme} · reduced motion: {reducedMotion ? "ON" : "OFF"}
        </li>
      </ul>
      <div className="mt-3 grid grid-cols-3 gap-2" data-testid="qa-journey-svg-gallery">
        {JOURNEY_SCENES.map((scene, index) => (
          <div key={scene.id} className="flex flex-col items-center gap-1">
            <JourneyScene sceneId={scene.id} side={index % 2 === 0 ? "left" : "right"} ordinal={1000 + index} />
            <span className="font-mono text-[10px] text-ink-faint">{scene.id}</span>
          </div>
        ))}
      </div>
      <ol className="mt-3 list-decimal pl-5 text-xs text-ink-soft" data-testid="qa-journey-svg-checks">
        {PHYSICAL_CHECKS.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ol>
    </section>
  );
}
