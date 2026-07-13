import { useEffect, useState } from "react";
import { resolveVisualScene, type VisualSceneId } from "../../data/visualScenes";
import { VISUAL_SCENE_IMAGE_SRC_BY_ID } from "../../assets/visuals";
import { VisualConceptImage, type VisualConceptImageSize } from "./VisualConceptImage";

interface VisualSceneImageProps {
  sceneId: VisualSceneId | string;
  size?: VisualConceptImageSize;
  className?: string;
}

export function VisualSceneImage({ sceneId, size = "md", className = "" }: VisualSceneImageProps) {
  const scene = resolveVisualScene(sceneId);
  const imageSrc = scene ? VISUAL_SCENE_IMAGE_SRC_BY_ID[scene.id] : undefined;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [imageSrc]);

  if (!scene) return null;

  const frameClass = [
    "relative overflow-hidden rounded-2xl border border-line bg-surface-2",
    size === "sm" ? "h-20 w-20" : size === "md" ? "h-32 w-full max-w-[13rem] sm:h-36" : size === "lg" ? "h-48 w-full max-w-sm sm:h-56" : "h-56 w-full max-w-xl sm:h-72",
    className,
  ].join(" ");

  if (!imageSrc || failed) {
    if (scene.conceptId) {
      return <VisualConceptImage conceptId={scene.conceptId} size={size} className={className} />;
    }
    return (
      <div className={[frameClass, "flex items-center justify-center text-ink-faint"].join(" ")}>
        <span className="sr-only">{scene.imageAltPt}</span>
      </div>
    );
  }

  const imageSizes =
    size === "sm" ? "80px" : size === "md" ? "(min-width: 640px) 208px, 45vw" : size === "lg" ? "(min-width: 640px) 384px, 92vw" : "(min-width: 640px) 576px, 92vw";

  return (
    <div className={frameClass}>
      {!loaded && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-surface-2" />}
      <img
        src={imageSrc}
        alt={scene.imageAltPt}
        loading="lazy"
        decoding="async"
        width={600}
        height={600}
        sizes={imageSizes}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={[
          "h-full w-full object-cover transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
    </div>
  );
}
