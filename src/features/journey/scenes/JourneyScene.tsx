import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAmbientMotion } from "../../../lib/motion/ambientBudget";
import { prepareSceneMarkup } from "./journeySceneMarkup";
import { JOURNEY_SCENE_BY_ID, type JourneySceneId, type JourneySceneSide } from "./journeySceneRegistry";
import { sceneMotionFor } from "./sceneMotionProfiles";

/**
 * Bundled at build time (no network, works offline and inside Capacitor).
 * ~4 KB per scene; only registered files are ever looked up.
 */
const SCENE_SOURCES = import.meta.glob<string>("../../../assets/journey/scenes/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** RC2.3.13R.3.2.6 — also read by the one Culture topic hero scene (CultureHeroScene). */
export function rawSceneFor(id: JourneySceneId): string | undefined {
  const entry = JOURNEY_SCENE_BY_ID.get(id);
  if (!entry) return undefined;
  return SCENE_SOURCES[`../../../assets/journey/scenes/${entry.file}`];
}

/** Revealed once per session: expanding a module again never replays it. */
const revealedThisSession = new Set<number>();

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function initialReveal(ordinal: number): "pending" | "done" {
  if (revealedThisSession.has(ordinal)) return "done";
  if (prefersReducedMotion()) return "done";
  if (typeof IntersectionObserver === "undefined") return "done";
  return "pending";
}

/**
 * Decorative Journey scene. Knows asset, side, size and motion — never
 * pedagogy. Hidden from assistive tech, never focusable, never tappable.
 * The box is sized by CSS (4:3) before paint, so nothing shifts on load.
 */
export function JourneyScene({
  sceneId,
  side,
  ordinal,
}: {
  sceneId: JourneySceneId;
  side: JourneySceneSide;
  ordinal: number;
}) {
  const instance = useId();
  const markup = useMemo(() => {
    const raw = rawSceneFor(sceneId);
    return raw ? prepareSceneMarkup(raw, `${sceneId}-${instance}`) : null;
  }, [sceneId, instance]);
  const ref = useRef<HTMLDivElement>(null);
  const [reveal, setReveal] = useState<"pending" | "done">(() => initialReveal(ordinal));
  // RC2.3.13R.3.2.6 — true only for the mount that actually revealed the scene,
  // so one-shot parts (the brush stroke) play once and never on a remount.
  const [enteredNow, setEnteredNow] = useState(false);
  const motion = sceneMotionFor(sceneId);
  // RC2.3.13R.3.2.4 — the drift loop runs only where the ambient budget grants it.
  const driftRef = useRef<HTMLDivElement>(null);
  useAmbientMotion(driftRef, "scene", markup !== null);

  useEffect(() => {
    if (reveal === "done") {
      revealedThisSession.add(ordinal);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setReveal("done");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          io.disconnect();
          setEnteredNow(true);
          setReveal("done");
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reveal, ordinal]);

  if (!markup) return null;

  // Desynchronize the slow drift so neighbouring scenes never bob in unison.
  const style = { "--journey-scene-phase": `${-((ordinal * 1.7) % 11).toFixed(2)}s` } as CSSProperties;

  return (
    <div
      ref={ref}
      className="journey-scene"
      aria-hidden="true"
      data-testid="journey-scene"
      data-journey-scene={sceneId}
      data-scene-side={side}
      data-scene-ordinal={ordinal}
      data-reveal={reveal}
      data-scene-entered={enteredNow ? "now" : undefined}
      style={style}
    >
      <div className="journey-scene-reveal">
        <div
          ref={driftRef}
          className="journey-scene-drift"
          data-scene-profile={motion.profile}
          data-scene-intensity={motion.intensity}
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      </div>
    </div>
  );
}
