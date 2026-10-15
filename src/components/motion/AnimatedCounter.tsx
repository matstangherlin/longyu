import { useEffect, useRef, type ReactNode } from "react";
import { MOTION_MS, prefersReducedMotion } from "../../lib/motion/livingUiMotion";
import { useValueDelta } from "../../lib/motion/valueDelta";

/**
 * RC2.3.13R.3.2.4 — one brief response when a counter really changes
 * (XP, Fôlego, Ofensiva, Qi, completion counts). Scale 1 → 1.08 → 1 once;
 * reduced motion keeps a short opacity cue instead. The number itself is
 * never tweened or counted up from zero, and nothing is written back.
 */
export function AnimatedCounter({
  id,
  value,
  children,
  className,
}: {
  id: string;
  value: number | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const { key, direction } = useValueDelta(id, value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!key || !el || typeof el.animate !== "function") return;
    const frames = prefersReducedMotion()
      ? [{ opacity: 0.55 }, { opacity: 1 }]
      : [{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }];
    const animation = el.animate(frames, {
      duration: prefersReducedMotion() ? MOTION_MS.fast : MOTION_MS.emphasis,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    });
    return () => animation.cancel();
  }, [key]);

  return (
    <span
      ref={ref}
      className={className ? `living-counter ${className}` : "living-counter"}
      data-living-counter={id}
      data-delta={direction ?? undefined}
    >
      {children}
    </span>
  );
}
