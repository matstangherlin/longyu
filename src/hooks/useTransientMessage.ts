import { useCallback, useEffect, useRef, useState } from "react";

/**
 * RC2.3.13R.3.2.5 — a short-lived confirmation ("+20 Qi", "Comprado").
 * One timer at a time: a second message restarts the clock instead of being
 * cut short by the first message's timer, and nothing fires after unmount.
 */
export function useTransientMessage(durationMs: number): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const show = useCallback(
    (next: string) => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      setMessage(next);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        setMessage(null);
      }, durationMs);
    },
    [durationMs],
  );

  return [message, show];
}
