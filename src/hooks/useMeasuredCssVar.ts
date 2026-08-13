import { useLayoutEffect, useRef, type RefObject } from "react";

/** Mantém um token global sincronizado com a altura realmente renderizada. */
export function useMeasuredHeightCssVar<T extends HTMLElement>(
  variableName: `--${string}`
): RefObject<T> {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const root = document.documentElement;
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(element.getBoundingClientRect().height);
        if (height > 0) root.style.setProperty(variableName, `${height}px`);
      });
    };

    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      root.style.removeProperty(variableName);
    };
  }, [variableName]);

  return ref as RefObject<T>;
}
