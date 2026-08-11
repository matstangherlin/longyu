import { useEffect, useState } from "react";

export interface VisualViewportFrame {
  height: number;
  offsetTop: number;
  offsetLeft: number;
  width: number;
}

function readVisualViewportFrame(): VisualViewportFrame {
  const viewport = window.visualViewport;
  return {
    height: Math.round(viewport?.height ?? window.innerHeight),
    offsetTop: Math.round(viewport?.offsetTop ?? 0),
    offsetLeft: Math.round(viewport?.offsetLeft ?? 0),
    width: Math.round(viewport?.width ?? window.innerWidth),
  };
}

/**
 * Caixa visível real (mobile: encolhe com teclado; offsetTop evita gap ao arrastar).
 */
export function useVisualViewportFrame(): VisualViewportFrame | null {
  const [frame, setFrame] = useState<VisualViewportFrame | null>(() =>
    typeof window === "undefined" ? null : readVisualViewportFrame()
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const sync = () => {
      const next = readVisualViewportFrame();
      setFrame((prev) =>
        prev &&
        prev.height === next.height &&
        prev.offsetTop === next.offsetTop &&
        prev.offsetLeft === next.offsetLeft &&
        prev.width === next.width
          ? prev
          : next
      );
    };

    sync();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return frame;
}
