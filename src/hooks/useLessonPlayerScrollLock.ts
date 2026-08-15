import { useEffect } from "react";
import { hasModalBodyScrollLock, releaseLessonPlayerPageScrollLock } from "../lib/bodyScrollLock";

/**
 * Trava scroll/rubber-band da página no Lesson Player (Android Chrome / Safari).
 * Só `[data-lesson-activity-scroll]` pode rolar — e apenas quando o conteúdo transborda.
 */
export function useLessonPlayerScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return undefined;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        event.preventDefault();
        return;
      }
      const scrollHost = target.closest("[data-lesson-activity-scroll]");
      if (!(scrollHost instanceof HTMLElement)) {
        event.preventDefault();
        return;
      }
      if (scrollHost.scrollHeight <= scrollHost.clientHeight + 2) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });

    return () => {
      document.removeEventListener("touchmove", onTouchMove, { capture: true });
      // Sempre libera a trava do player. Se um modal ainda estiver aberto,
      // overflow fica hidden via hasModalBodyScrollLock — sem reaplicar o
      // "hidden" antigo do player como se fosse o estado normal da página.
      releaseLessonPlayerPageScrollLock({
        restoreScrollY: hasModalBodyScrollLock() ? undefined : scrollY,
      });
    };
  }, [active]);
}
