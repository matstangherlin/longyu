import { useId, useMemo, useRef } from "react";
import { useAmbientMotion } from "../../lib/motion/ambientBudget";
import { rawSceneFor } from "../journey/scenes/JourneyScene";
import { prepareSceneMarkup } from "../journey/scenes/journeySceneMarkup";
import { sceneMotionFor } from "../journey/scenes/sceneMotionProfiles";
import { cultureTopicVisual } from "./cultureVisualTheme";

/**
 * RC2.3.13R.3.2.6 — the one thematic living illustration in a Culture topic
 * hero (owner request: Culture feels alive, editorially). Same bundled scene
 * assets, palette and motion profiles as the Journey lanes; one per topic
 * page, never on subtopics or nodes. Decorative: hidden from assistive tech,
 * never focusable or tappable. Its parts move only while the ambient budget
 * grants it a slot (it counts as one scene owner).
 */
export function CultureHeroScene({ topicId }: { topicId: string }) {
  const visual = cultureTopicVisual(topicId);
  const instance = useId();
  const markup = useMemo(() => {
    if (!visual) return null;
    const raw = rawSceneFor(visual.heroScene);
    return raw ? prepareSceneMarkup(raw, `hero-${visual.heroScene}-${instance}`) : null;
  }, [visual, instance]);
  const ref = useRef<HTMLDivElement>(null);
  useAmbientMotion(ref, "scene", markup !== null);
  if (!visual || !markup) return null;
  const motion = sceneMotionFor(visual.heroScene);
  return (
    <div
      className="journey-scene culture-hero-scene"
      aria-hidden="true"
      data-testid="culture-hero-scene"
      data-culture-hero-scene={visual.heroScene}
      data-reveal="done"
    >
      <div className="journey-scene-reveal">
        <div
          ref={ref}
          className="journey-scene-drift"
          data-scene-profile={motion.profile}
          data-scene-intensity={motion.intensity}
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      </div>
    </div>
  );
}
