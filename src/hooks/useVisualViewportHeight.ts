import { useEffect, useState } from "react";

/**
 * Altura útil da visualViewport (mobile: encolhe com teclado/barras do browser).
 * Preferível a `100vh` no shell do Lesson Player.
 */
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    return Math.round(window.visualViewport?.height ?? window.innerHeight);
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const sync = () => {
      const next = Math.round(window.visualViewport?.height ?? window.innerHeight);
      setHeight((prev) => (prev === next ? prev : next));
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

  return height;
}
