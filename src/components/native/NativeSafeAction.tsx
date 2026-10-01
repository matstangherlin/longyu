/**
 * RC2.2.31B — contrato único de toque APK para ações críticas.
 *
 * Traces só nos handlers REAIS (nunca fabricados).
 * pointerdown → click → pointerup fallback (~50ms), idempotente.
 */
import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";

const POINTER_FALLBACK_MS = 50;

export interface NativeSafeActionObservers {
  onPointerDownObserved?: () => void;
  onPointerUpObserved?: () => void;
  onClickObserved?: () => void;
  onFallbackObserved?: () => void;
  onActionExecuted?: (source: "click" | "pointer_fallback") => void;
}

export interface NativeSafeActionHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export function useNativeSafeAction(
  action: () => void,
  actionKey: string,
  observers?: NativeSafeActionObservers
): NativeSafeActionHandlers {
  const pendingRef = useRef<{ at: number; key: string } | null>(null);
  const lastGestureAtRef = useRef<number | null>(null);
  const lastRanAtRef = useRef(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observersRef = useRef(observers);
  observersRef.current = observers;

  function clearFallback() {
    if (fallbackTimerRef.current != null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  function runOnce(source: "click" | "pointer_fallback") {
    const now = Date.now();
    // Só dedupe o MESMO gesto (click + pointer_fallback). Nunca bloqueie o
    // próximo toque do aluno — no APK Continuar com o mesmo actionKey (lock
    // rejeitado / spokenCount igual) precisa poder tentar de novo.
    if (lastRanAtRef.current > 0 && now - lastRanAtRef.current < POINTER_FALLBACK_MS + 30) {
      return;
    }
    if (source === "pointer_fallback") {
      if (pendingRef.current == null) return;
      if (pendingRef.current.key !== actionKey) return;
      observersRef.current?.onFallbackObserved?.();
    }
    pendingRef.current = null;
    lastRanAtRef.current = now;
    lastGestureAtRef.current = now;
    clearFallback();
    observersRef.current?.onActionExecuted?.(source);
    action();
  }

  return {
    onPointerDown: () => {
      pendingRef.current = { at: Date.now(), key: actionKey };
      clearFallback();
      observersRef.current?.onPointerDownObserved?.();
    },
    onClick: () => {
      observersRef.current?.onClickObserved?.();
      runOnce("click");
    },
    onPointerUp: () => {
      observersRef.current?.onPointerUpObserved?.();
      if (pendingRef.current == null || pendingRef.current.key !== actionKey) return;
      // Se o click já rodou neste gesto, não agenda fallback.
      if (lastRanAtRef.current > 0 && Date.now() - lastRanAtRef.current < POINTER_FALLBACK_MS + 30) {
        pendingRef.current = null;
        return;
      }
      clearFallback();
      fallbackTimerRef.current = setTimeout(() => {
        runOnce("pointer_fallback");
      }, POINTER_FALLBACK_MS);
    },
  };
}

export type NativeSafeActionRenderProps = {
  children: (handlers: NativeSafeActionHandlers) => ReactNode;
  action: () => void;
  actionKey: string;
  observers?: NativeSafeActionObservers;
};

export function NativeSafeAction({ children, action, actionKey, observers }: NativeSafeActionRenderProps) {
  const handlers = useNativeSafeAction(action, actionKey, observers);
  return <>{children(handlers)}</>;
}
