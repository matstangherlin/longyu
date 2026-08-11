import { useEffect } from "react";

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
    const prevBody = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      touchAction: body.style.touchAction,
    };
    const prevHtmlOverflow = html.style.overflow;

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
      html.style.overflow = prevHtmlOverflow;
      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      body.style.overflow = prevBody.overflow;
      body.style.touchAction = prevBody.touchAction;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
