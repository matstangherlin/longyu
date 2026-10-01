/**
 * RC2.2.31 — contrato único de toque APK para ações críticas (Continue, etc.).
 *
 * pointerdown → click → pointerup fallback (~50ms) com actionId idempotente.
 * Duplo evento nao duplica avanço.
 */
import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";

const POINTER_FALLBACK_MS = 50;

export interface NativeSafeActionHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export function useNativeSafeAction(action: () => void, actionKey: string): NativeSafeActionHandlers {
  const pendingRef = useRef<{ at: number; key: string } | null>(null);
  const lastActionIdRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearFallback() {
    if (fallbackTimerRef.current != null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  function runOnce(source: "click" | "pointer_fallback") {
    const actionId = `${actionKey}:${source}:${Date.now()}`;
    // Idempotency window: same key within the pending gesture only once.
    if (lastActionIdRef.current === actionKey && pendingRef.current == null) {
      // Already consumed this gesture via click; ignore fallback.
      return;
    }
    if (source === "click") {
      lastActionIdRef.current = actionKey;
      pendingRef.current = null;
      clearFallback();
      action();
      return;
    }
    // pointer fallback only if click never cleared pending
    if (pendingRef.current == null) return;
    if (pendingRef.current.key !== actionKey) return;
    pendingRef.current = null;
    lastActionIdRef.current = actionKey;
    clearFallback();
    action();
    void actionId;
  }

  return {
    onPointerDown: () => {
      pendingRef.current = { at: Date.now(), key: actionKey };
      lastActionIdRef.current = null;
      clearFallback();
    },
    onClick: () => {
      runOnce("click");
    },
    onPointerUp: () => {
      if (pendingRef.current == null || pendingRef.current.key !== actionKey) return;
      clearFallback();
      fallbackTimerRef.current = setTimeout(() => {
        runOnce("pointer_fallback");
      }, POINTER_FALLBACK_MS);
    },
  };
}

/** Props spread onto a Button for APK-safe Continue. */
export function nativeSafeActionProps(
  action: () => void,
  actionKey: string,
  handlers?: NativeSafeActionHandlers
): NativeSafeActionHandlers {
  return handlers ?? {
    // lazily unused — prefer useNativeSafeAction in components
    onPointerDown: () => undefined,
    onPointerUp: () => undefined,
    onClick: () => {
      action();
      void actionKey;
    },
  };
}

export type NativeSafeActionRenderProps = {
  children: (handlers: NativeSafeActionHandlers) => ReactNode;
  action: () => void;
  actionKey: string;
};

export function NativeSafeAction({ children, action, actionKey }: NativeSafeActionRenderProps) {
  const handlers = useNativeSafeAction(action, actionKey);
  return <>{children(handlers)}</>;
}
