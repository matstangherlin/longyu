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
 * STEP_TAP_THROUGH_RADIUS_PX), e só quando o toque anterior também foi
 * dentro do escopo. Um toque rápido em outro alvo passa.
 */
export function useTapThroughGuard(resetKey: unknown, scopeSelector: string): void {
  const mountedAtRef = useRef(0);
  const lastClickRef = useRef<{ x: number; y: number; at: number; inScope: boolean } | null>(null);
  useLayoutEffect(() => {
    mountedAtRef.current = performance.now();
  }, [resetKey]);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const now = performance.now();
      const target = event.target instanceof Element ? event.target : null;
      const inScope = Boolean(target?.closest(scopeSelector));
      const last = lastClickRef.current;
      lastClickRef.current = { x: event.clientX, y: event.clientY, at: now, inScope };
      // Só um toque DENTRO do passo (ex.: Continuar) arma a proteção. Fechar um
      // aviso/modal fora do passo e tocar logo em seguida não é toque duplo.
      if (!last || !last.inScope || !inScope || last.at > mountedAtRef.current) return;
      if (!isTapThrough(mountedAtRef.current, now) || !isTapThrough(last.at, now)) return;
      if (Math.hypot(event.clientX - last.x, event.clientY - last.y) > STEP_TAP_THROUGH_RADIUS_PX) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [scopeSelector]);
}
