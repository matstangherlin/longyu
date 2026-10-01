/**
 * RC2.2.31C — contrato único de toque APK para ações críticas.
 *
 * Traces só nos handlers REAIS (nunca fabricados).
 * Dedupe por gestureId (pointerdown), nunca só por actionKey.
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

let gestureSeq = 0;

export function useNativeSafeAction(
  action: () => void,
  actionKey: string,
  observers?: NativeSafeActionObservers
): NativeSafeActionHandlers {
  const pendingRef = useRef<{ gestureId: number; key: string } | null>(null);
  const executedGestureRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observersRef = useRef(observers);
  observersRef.current = observers;

  function clearFallback() {
    if (fallbackTimerRef.current != null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  function runOnce(source: "click" | "pointer_fallback", gestureId: number | null) {
    // Same gestureId → one execution (click + fallback). New pointerdown → new id → eligible.
    if (gestureId != null && executedGestureRef.current === gestureId) {
      return;
    }
    if (source === "pointer_fallback") {
      if (pendingRef.current == null) return;
      if (pendingRef.current.key !== actionKey) return;
      if (gestureId == null) return;
      observersRef.current?.onFallbackObserved?.();
    }
    if (gestureId != null) executedGestureRef.current = gestureId;
    pendingRef.current = null;
    clearFallback();
    // Wrap action so side-effect throws inside the handler never poison the button.
    try {
      observersRef.current?.onActionExecuted?.(source);
      action();
    } catch {
      /* pedagogical action should not throw; if it does, allow retap */
      executedGestureRef.current = null;
    }
  }

  return {
    onPointerDown: () => {
      gestureSeq += 1;
      pendingRef.current = { gestureId: gestureSeq, key: actionKey };
      clearFallback();
      observersRef.current?.onPointerDownObserved?.();
    },
    onClick: () => {
      observersRef.current?.onClickObserved?.();
      const gid = pendingRef.current?.key === actionKey ? pendingRef.current.gestureId : gestureSeq + 1;
      if (pendingRef.current?.key !== actionKey) {
        // Click without pointerdown (some WebViews): invent a fresh gesture id.
        gestureSeq += 1;
        runOnce("click", gestureSeq);
        return;
      }
      runOnce("click", gid);
    },
    onPointerUp: () => {
      observersRef.current?.onPointerUpObserved?.();
      const pending = pendingRef.current;
      if (pending == null || pending.key !== actionKey) return;
      if (executedGestureRef.current === pending.gestureId) {
        pendingRef.current = null;
        return;
      }
      clearFallback();
      fallbackTimerRef.current = setTimeout(() => {
        runOnce("pointer_fallback", pending.gestureId);
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
