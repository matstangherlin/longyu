import { useEffect, useLayoutEffect, useRef } from "react";
import { isTapThrough, STEP_TAP_THROUGH_RADIUS_PX } from "./lessonStepContract";

/**
 * RC2.2.14 · Z — descarta o clique que "atravessa" para a tela nova.
 *
 * No celular, o segundo toque de um toque duplo em Continuar caía no botão
 * que nasce no MESMO lugar na tela seguinte e respondia/avançava sozinho.
 * Toda vez que `resetKey` muda (passo, item ou rodada novos), um clique dentro
 * de `scopeSelector` é ignorado se vier nos primeiros
 * STEP_TAP_THROUGH_GUARD_MS E no mesmo ponto do clique anterior (raio de
 * STEP_TAP_THROUGH_RADIUS_PX). Um toque rápido em outro alvo passa.
 */
export function useTapThroughGuard(resetKey: unknown, scopeSelector: string): void {
  const mountedAtRef = useRef(0);
  const lastClickRef = useRef<{ x: number; y: number; at: number } | null>(null);
  useLayoutEffect(() => {
    mountedAtRef.current = performance.now();
  }, [resetKey]);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const now = performance.now();
      const last = lastClickRef.current;
      lastClickRef.current = { x: event.clientX, y: event.clientY, at: now };
      if (!last || last.at > mountedAtRef.current) return;
      if (!isTapThrough(mountedAtRef.current, now) || !isTapThrough(last.at, now)) return;
      if (Math.hypot(event.clientX - last.x, event.clientY - last.y) > STEP_TAP_THROUGH_RADIUS_PX) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest(scopeSelector)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [scopeSelector]);
}
