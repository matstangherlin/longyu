import { VISUAL_SCENE_IMAGE_SRC_BY_ID } from "../../assets/visuals";
import { resolveVisualScene, type VisualSceneId } from "../../data/visualScenes";

export type VisualSceneImageSize = "sm" | "md" | "lg" | "xl";

interface VisualSceneImageProps {
  sceneId: VisualSceneId | string;
  size?: VisualSceneImageSize;
  className?: string;
  /** Quando true, usa alt neutra (exercício avaliado). */
  hideAnswerInAlt?: boolean;
}

const SIZE_CLASS: Record<VisualSceneImageSize, string> = {
  sm: "h-16 w-16",
  md: "h-28 w-28",
  lg: "h-40 w-40",
  xl: "h-52 w-52 sm:h-56 sm:w-56",
};

const IMAGE_SIZES: Record<VisualSceneImageSize, string> = {
  sm: "64px",
  md: "112px",
  lg: "160px",
  xl: "224px",
};

export function VisualSceneImage({
  sceneId,
  size = "md",
  className = "",
  hideAnswerInAlt = true,
}: VisualSceneImageProps) {
  const scene = resolveVisualScene(sceneId);
  if (!scene) return null;
  const src = VISUAL_SCENE_IMAGE_SRC_BY_ID[scene.id as VisualSceneId];
  if (!src) {
    return (
      <div
        className={["flex items-center justify-center rounded-2xl border border-line bg-surface-2 text-ink-faint", SIZE_CLASS[size], className].join(
          " "
        )}
      >
        Cena
      </div>
    );
  }
  const alt = hideAnswerInAlt ? scene.exerciseAltPt : scene.imageAltPt;
  return (
    <img
      src={src}
      alt={alt}
      width={600}
      height={600}
      sizes={IMAGE_SIZES[size]}
      className={["rounded-2xl border border-line object-cover shadow-card", SIZE_CLASS[size], className].join(" ")}
      loading="lazy"
      decoding="async"
    />
  );
}
