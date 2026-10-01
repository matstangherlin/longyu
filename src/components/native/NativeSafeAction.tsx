/**
 * RC2.2.31D — contrato único de toque APK para ações críticas.
 *
 * Traces só nos handlers REAIS (nunca fabricados).
 * Dedupe por gestureId (pointerdown), nunca só por actionKey.
 * Observers / telemetry NUNCA bloqueiam a ação pedagógica.
 */
import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { recordTechEvent } from "../../lib/techEvents";

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

/** Telemetry never blocks pedagogical action. */
export function safeObserve(fn?: () => void): void {
  if (!fn) return;
  try {
    fn();
  } catch {
    try {
      recordTechEvent("js_error", { errorClass: "NativeSafeObserveError", source: "safeObserve" });
    } catch {
      /* never throw */
    }
  }
}

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
  // Timer / late click must call the latest action (current node), not a stale closure.
  const actionRef = useRef(action);
  actionRef.current = action;
  const actionKeyRef = useRef(actionKey);
  actionKeyRef.current = actionKey;
  const mountedRef = useRef(true);

  function clearFallback() {
    if (fallbackTimerRef.current != null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearFallback();
      pendingRef.current = null;
    };
  }, []);

  function runOnce(source: "click" | "pointer_fallback", gestureId: number | null) {
    if (!mountedRef.current) return;
    // Same gestureId → one execution (click + fallback). New pointerdown → new id → eligible.
    if (gestureId != null && executedGestureRef.current === gestureId) {
      return;
    }
    const key = actionKeyRef.current;
    if (source === "pointer_fallback") {
      if (pendingRef.current == null) return;
      if (pendingRef.current.key !== key) return;
      if (gestureId == null) return;
      safeObserve(() => observersRef.current?.onFallbackObserved?.());
    }
    if (gestureId != null) executedGestureRef.current = gestureId;
    pendingRef.current = null;
    clearFallback();
    try {
      safeObserve(() => observersRef.current?.onActionExecuted?.(source));
      actionRef.current();
    } catch (err) {
      try {
        recordTechEvent("js_error", {
          errorClass: err instanceof Error ? err.name : "NativeActionError",
          source: "native_action_error",
          actionKey: key,
          gestureId: gestureId ?? undefined,
          detail: source,
        });
      } catch {
        /* never throw */
      }
      /* pedagogical action should not throw; if it does, allow retap */
      executedGestureRef.current = null;
    }
  }

  return {
    onPointerDown: () => {
      gestureSeq += 1;
      pendingRef.current = { gestureId: gestureSeq, key: actionKeyRef.current };
      clearFallback();
      safeObserve(() => observersRef.current?.onPointerDownObserved?.());
    },
    onClick: () => {
      safeObserve(() => observersRef.current?.onClickObserved?.());
      const key = actionKeyRef.current;
      const gid = pendingRef.current?.key === key ? pendingRef.current.gestureId : gestureSeq + 1;
      if (pendingRef.current?.key !== key) {
        // Click without pointerdown (some WebViews): invent a fresh gesture id.
        gestureSeq += 1;
        runOnce("click", gestureSeq);
        return;
      }
      runOnce("click", gid);
    },
    onPointerUp: () => {
      safeObserve(() => observersRef.current?.onPointerUpObserved?.());
      const pending = pendingRef.current;
      const key = actionKeyRef.current;
      if (pending == null || pending.key !== key) return;
      if (executedGestureRef.current === pending.gestureId) {
        pendingRef.current = null;
        return;
      }
      clearFallback();
      const gestureId = pending.gestureId;
      fallbackTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        runOnce("pointer_fallback", gestureId);
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
