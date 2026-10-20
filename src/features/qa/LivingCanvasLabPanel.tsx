/**
 * RC2.3.13R.3.2.6 — Device QA: Chinese Living Canvas Lab (never learner UI).
 * The owner judges each living scene on the physical device: its motion
 * profile, the parts that move, the neutral still frame (paused = the authored
 * drawing, exactly what a scene shows when it has no ambient slot), the
 * entrance from either side, and a live readout of the ambient budget. The
 * playing scene registers through the same budget as the Journey lanes, so it
 * only moves when granted — the lab never bypasses the ≤ 4 owners rule.
 */
import { useEffect, useId, useMemo, useState } from "react";
import { JourneyScene, rawSceneFor } from "../journey/scenes/JourneyScene";
import { prepareSceneMarkup } from "../journey/scenes/journeySceneMarkup";
import { JOURNEY_SCENES, type JourneySceneId, type JourneySceneSide } from "../journey/scenes/journeySceneRegistry";
import { SCENE_PART_NEUTRAL, sceneMotionFor } from "../journey/scenes/sceneMotionProfiles";
import { ORNAMENT_MOTIFS, ORNAMENT_MOTION_PROFILE, SymbolicOrnament } from "../../components/progression/symbolicOrnaments";
import { ambientSnapshot } from "../../lib/motion/ambientBudget";
import { AMBIENT_KIND_CAP, MAX_AMBIENT_LOOPS, MAX_VISIBLE_AMBIENT_ANIMATIONS, prefersReducedMotion } from "../../lib/motion/livingUiMotion";

/** Ordinals ≥ 2000: never collide with the lanes' or the R.3.2.3 panel's reveal-once state. */
const LAB_ORDINAL_BASE = 2000;

const PHYSICAL_CHECKS = [
  "Each scene moves by its subject; the drawing never bobs as a whole",
  "Paused / no slot: the authored still frame (no tilted lantern, no faded cloud)",
  "Entrance from its own side, once, then still",
  "Never more than 2 scenes and 2 ornaments moving at once",
  "Light and dark: the art stays legible",
  "Reduced motion: everything still, the art stays",
];

/** The authored drawing with no ambient registration: the neutral frame. */
function StillScene({ sceneId }: { sceneId: JourneySceneId }) {
  const instance = useId();
  const markup = useMemo(() => {
    const raw = rawSceneFor(sceneId);
    return raw ? prepareSceneMarkup(raw, `lab-still-${sceneId}-${instance}`) : null;
  }, [sceneId, instance]);
  if (!markup) return null;
  const motion = sceneMotionFor(sceneId);
  return (
    <div className="journey-scene" aria-hidden="true" data-reveal="done" data-testid="qa-living-canvas-still">
      <div className="journey-scene-reveal">
        <div className="journey-scene-drift" data-scene-profile={motion.profile} dangerouslySetInnerHTML={{ __html: markup }} />
      </div>
    </div>
  );
}

export function LivingCanvasLabPanel() {
  const [sceneId, setSceneId] = useState<JourneySceneId>(JOURNEY_SCENES[0].id);
  const [side, setSide] = useState<JourneySceneSide>("left");
  const [playing, setPlaying] = useState(true);
  const [mount, setMount] = useState(0);
  const [snapshot, setSnapshot] = useState(() => ambientSnapshot());
  const theme = typeof document !== "undefined" ? document.documentElement.dataset.theme ?? "clay" : "clay";
  const reduced = prefersReducedMotion();
  const motion = sceneMotionFor(sceneId);
  const parts = [...motion.loops, ...motion.oneShot];

  useEffect(() => {
    const id = window.setInterval(() => setSnapshot(ambientSnapshot()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const replayFrom = (next: JourneySceneSide) => {
    setSide(next);
    setPlaying(true);
    setMount((n) => n + 1);
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-living-canvas-lab">
      <h2 className="text-base font-semibold text-ink">Chinese Living Canvas Lab (RC2.3.13R.3.2.6)</h2>
      <p className="mt-1 text-sm text-ink-soft">Inspeção — não é UI de aluno. Julgue no aparelho físico.</p>

      <ul className="mt-2 grid gap-1 font-mono text-xs text-ink-soft" data-testid="qa-living-canvas-budget">
        <li>
          ambient: {snapshot.running} running / {snapshot.registered} registered · owners ≤ {MAX_VISIBLE_AMBIENT_ANIMATIONS} · scenes ≤{" "}
          {AMBIENT_KIND_CAP.scene} · ornaments ≤ {AMBIENT_KIND_CAP.ornament} · loops ≤ {MAX_AMBIENT_LOOPS}
        </li>
        <li>
          by kind:{" "}
          {Object.entries(snapshot.byKind ?? {})
            .map(([kind, n]) => `${kind} ${n}`)
            .join(" · ") || "—"}
        </li>
        <li>
          theme: {theme} · reduced motion: {reduced ? "ON (all still)" : "OFF"}
        </li>
      </ul>

      <label className="mt-3 block text-sm font-medium text-ink" htmlFor="qa-living-canvas-scene">
        Cena
      </label>
      <select
        id="qa-living-canvas-scene"
        className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink"
        value={sceneId}
        onChange={(event) => {
          setSceneId(event.target.value as JourneySceneId);
          setMount((n) => n + 1);
        }}
        data-testid="qa-living-canvas-scene-select"
      >
        {JOURNEY_SCENES.map((scene) => (
          <option key={scene.id} value={scene.id}>
            {scene.id}
          </option>
        ))}
      </select>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold text-ink"
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={!playing}
          data-testid="qa-living-canvas-toggle"
        >
          {playing ? "Pausar (quadro neutro)" : "Tocar"}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold text-ink"
          onClick={() => replayFrom("left")}
          data-testid="qa-living-canvas-enter-left"
        >
          Entrada · esquerda
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold text-ink"
          onClick={() => replayFrom("right")}
          data-testid="qa-living-canvas-enter-right"
        >
          Entrada · direita
        </button>
      </div>

      <div className="mx-auto mt-3 w-64 max-w-full" data-testid="qa-living-canvas-stage" data-playing={playing ? "true" : "false"} data-side={side}>
        {playing ? (
          <JourneyScene key={`${sceneId}-${mount}`} sceneId={sceneId} side={side} ordinal={LAB_ORDINAL_BASE + mount} />
        ) : (
          <StillScene sceneId={sceneId} />
        )}
      </div>

      <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs" data-testid="qa-living-canvas-profile">
        <dt className="font-semibold text-ink">perfil</dt>
        <dd className="font-mono text-ink-soft">
          {motion.profile} · {motion.intensity}
        </dd>
        <dt className="font-semibold text-ink">loops</dt>
        <dd className="font-mono text-ink-soft">{motion.loops.join(", ") || "—"}</dd>
        <dt className="font-semibold text-ink">uma vez</dt>
        <dd className="font-mono text-ink-soft">{motion.oneShot.join(", ") || "—"}</dd>
      </dl>
      <ul className="mt-2 grid gap-0.5 text-xs text-ink-soft" data-testid="qa-living-canvas-neutral">
        {parts.map((part) => (
          <li key={part}>
            <span className="font-mono text-ink">{part}</span> — neutro: {SCENE_PART_NEUTRAL[part]}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-ink">Ornamentos da Cultura</h3>
      <div className="mt-2 grid grid-cols-4 gap-2" data-testid="qa-living-canvas-ornaments">
        {ORNAMENT_MOTIFS.map((motif) => (
          <div key={motif} className="flex flex-col items-center gap-1">
            <SymbolicOrnament motif={motif} />
            <span className="font-mono text-[10px] text-ink-faint">
              {motif} · {ORNAMENT_MOTION_PROFILE[motif]}
            </span>
          </div>
        ))}
      </div>

      <ol className="mt-3 list-decimal pl-5 text-xs text-ink-soft" data-testid="qa-living-canvas-checks">
        {PHYSICAL_CHECKS.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ol>
    </section>
  );
}
