import { useEffect, useRef, useState } from "react";
import { resolveVisualConcept, type VisualConceptId } from "../../data/visualVocabulary";
import { VISUAL_IMAGE_SRC_BY_ID } from "../../assets/visuals";
import { recordClientDiagnostic } from "../../lib/clientDiagnostics";
import { VisualConceptIcon } from "./VisualConceptIcon";

export type VisualConceptImageSize = "sm" | "md" | "lg" | "xl";
export type VisualImageStatus = "loading" | "ready" | "failed";

interface VisualConceptImageProps {
  conceptId: VisualConceptId | string;
  size?: VisualConceptImageSize;
  className?: string;
  /** Prefer eager for interactive choice tiles (B004). */
  eager?: boolean;
  onStatusChange?: (status: VisualImageStatus) => void;
  /** Fail closed if the image never paints. */
  loadTimeoutMs?: number;
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

export function VisualConceptImage({
  conceptId,
  size = "md",
  className = "",
  eager = false,
  onStatusChange,
  loadTimeoutMs = 6_000,
}: VisualConceptImageProps) {
  const concept = resolveVisualConcept(conceptId);
  const imageSrc = concept ? VISUAL_IMAGE_SRC_BY_ID[concept.id] : undefined;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!imageSrc);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const statusRef = useRef<VisualImageStatus>(imageSrc ? "loading" : "failed");
  const reportedFailureRef = useRef<string | null>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  function publish(status: VisualImageStatus) {
    if (statusRef.current === status) return;
    statusRef.current = status;
    onStatusChangeRef.current?.(status);
  }

  function reportFailure(reason: "missing" | "timeout" | "empty" | "network") {
    const conceptKey = concept?.id ?? String(conceptId);
    const failureKey = `${conceptKey}:${reason}`;
    if (reportedFailureRef.current === failureKey) return;
    reportedFailureRef.current = failureKey;
    recordClientDiagnostic({
      kind: "render_error",
      area: "visual-asset",
      message: `Asset visual indisponível (${reason}).`,
    });
  }

  useEffect(() => {
    setLoaded(false);
    setFailed(!imageSrc);
    statusRef.current = imageSrc ? "loading" : "failed";
    onStatusChangeRef.current?.(statusRef.current);
    reportedFailureRef.current = null;
    if (!imageSrc) reportFailure("missing");
  }, [imageSrc]);

  useEffect(() => {
    if (!imageSrc || failed || loaded) return;
    const timer = window.setTimeout(() => {
      setFailed(true);
      publish("failed");
      reportFailure("timeout");
    }, loadTimeoutMs);
    return () => window.clearTimeout(timer);
  }, [imageSrc, failed, loaded, loadTimeoutMs]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !imageSrc || failed) return;
    if (img.complete) {
      if (img.naturalWidth > 0) {
        setLoaded(true);
        publish("ready");
      } else {
        setFailed(true);
        publish("failed");
        reportFailure("empty");
      }
    }
  }, [imageSrc, failed]);

  const frameClass = [
    "relative overflow-hidden rounded-2xl border border-line bg-surface-2",
    SIZE_CLASS[size],
    className,
  ].join(" ");

  if (!imageSrc || failed) {
    return (
      <div className={[frameClass, "flex items-center justify-center"].join(" ")} data-visual-fallback="1">
        <VisualConceptIcon conceptId={conceptId} size={FALLBACK_SIZE[size]} className="border-0 bg-transparent" />
        <span className="sr-only">{concept?.imageAltPt ?? "Imagem visual indisponível"}</span>
      </div>
    );
  }

  const objectFit = concept?.backgroundStyle === "contextual" ? "object-cover" : "object-contain";

  return (
    <div className={frameClass} data-visual-status={loaded ? "ready" : "loading"}>
      {!loaded && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-surface-2" />}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={concept?.imageAltPt ?? "Imagem visual"}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        width={600}
        height={600}
        sizes={IMAGE_SIZES[size]}
        onLoad={() => {
          setLoaded(true);
          publish("ready");
        }}
        onError={() => {
          setFailed(true);
          publish("failed");
          reportFailure("network");
        }}
        className={[
          "h-full w-full transition-opacity duration-200",
          objectFit,
          loaded ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
    </div>
  );
}
