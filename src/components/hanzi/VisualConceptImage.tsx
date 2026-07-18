import { useEffect, useState } from "react";
import { resolveVisualConcept, type VisualConceptId } from "../../data/visualVocabulary";
import { VISUAL_IMAGE_SRC_BY_ID } from "../../assets/visuals";
import { VisualConceptIcon } from "./VisualConceptIcon";

export type VisualConceptImageSize = "sm" | "md" | "lg" | "xl";

interface VisualConceptImageProps {
  conceptId: VisualConceptId | string;
  size?: VisualConceptImageSize;
  className?: string;
}

const SIZE_CLASS: Record<VisualConceptImageSize, string> = {
  sm: "h-20 w-20",
  md: "h-32 w-full max-w-[13rem] sm:h-36",
  lg: "h-48 w-full max-w-sm sm:h-56",
  xl: "h-56 w-full max-w-xl sm:h-72",
};

const FALLBACK_SIZE: Record<VisualConceptImageSize, "sm" | "md" | "lg"> = {
  sm: "sm",
  md: "lg",
  lg: "lg",
  xl: "lg",
};

const IMAGE_SIZES: Record<VisualConceptImageSize, string> = {
  sm: "80px",
  md: "(min-width: 640px) 208px, 45vw",
  lg: "(min-width: 640px) 384px, 92vw",
  xl: "(min-width: 640px) 576px, 92vw",
};

export function VisualConceptImage({ conceptId, size = "md", className = "" }: VisualConceptImageProps) {
  const concept = resolveVisualConcept(conceptId);
  const imageSrc = concept ? VISUAL_IMAGE_SRC_BY_ID[concept.id] : undefined;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [imageSrc]);

  const frameClass = [
    "relative overflow-hidden rounded-2xl border border-line bg-surface-2",
    SIZE_CLASS[size],
    className,
  ].join(" ");

  if (!imageSrc || failed) {
    return (
      <div className={[frameClass, "flex items-center justify-center"].join(" ")}>
        <VisualConceptIcon conceptId={conceptId} size={FALLBACK_SIZE[size]} className="border-0 bg-transparent" />
        <span className="sr-only">{concept?.imageAltPt ?? "Imagem visual indisponível"}</span>
      </div>
    );
  }

  // Fundo neutro/transparente: object-contain para nunca cortar o sujeito.
  // Cena contextual: object-cover, pois recortar o cenário é aceitável.
  const objectFit = concept?.backgroundStyle === "contextual" ? "object-cover" : "object-contain";

  return (
    <div className={frameClass}>
      {/* Skeleton ocupa o quadro inteiro (altura fixa) — nada de layout shift. */}
      {!loaded && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-surface-2" />}
      <img
        src={imageSrc}
        alt={concept?.imageAltPt ?? "Imagem visual"}
        loading="lazy"
        decoding="async"
        width={600}
        height={600}
        sizes={IMAGE_SIZES[size]}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={[
          "h-full w-full transition-opacity duration-200",
          objectFit,
          loaded ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
    </div>
  );
}
