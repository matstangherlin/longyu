import { useEffect, useState } from "react";

/**
 * Quanto a viewport visual encolheu por causa do teclado virtual.
 * Usado para empurrar CTAs sticky para cima do teclado no mobile.
 */
export function useKeyboardBottomInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const sync = () => {
      const overlap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setInset(overlap > 48 ? Math.round(overlap) : 0);
    };

    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, []);

  return inset;
}
