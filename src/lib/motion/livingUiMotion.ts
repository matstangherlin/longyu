/**
 * RC2.3.13R.3.2.4 — Living UI motion system (presentation only).
 *
 * One source of truth for timing, the reduced-motion signal and the ambient
 * budget. Durations mirror the CSS tokens in index.css (`--motion-*`);
 * components never invent their own. Motion supplements state — it never
 * carries meaning alone, never blocks input, and nothing here touches
 * curriculum, rewards, audio or progress.
 */

/** Mirrors `:root { --motion-* }` in index.css. */
export const MOTION_MS = {
  instant: 80,
  fast: 140,
  normal: 220,
  emphasis: 280,
  /** Upper bound for the whole Victory celebration (one shot). */
  celebrate: 1100,
} as const;

/** Ambient loops (scene drift, current-node halo) live between 5 s and 10 s. */
export const AMBIENT_MS = { min: 5_000, max: 10_000 } as const;

/** No more than this many looping ambient animations run at any moment. */
export const MAX_VISIBLE_AMBIENT_ANIMATIONS = 4;

/** Lower number wins a slot first. */
export const AMBIENT_PRIORITY = {
  currentNode: 0,
  recording: 0,
  chest: 1,
  mascot: 1,
  scene: 2,
  ornament: 3,
} as const;

export type AmbientKind = keyof typeof AMBIENT_PRIORITY;

/**
 * RC2.3.13R.3.2.6 — owners per kind inside the same budget of 4. A living
 * scene animates a few of its own subjects (lanterns, clouds, steam), but it
 * stays ONE owner. At most two scenes and two lane ornaments run at once, so
 * the current node always keeps its halo and a screen never moves everywhere.
 */
export const AMBIENT_KIND_CAP: Readonly<Partial<Record<AmbientKind, number>>> = {
  scene: 2,
  ornament: 2,
};

/** Looping parts one owner may animate (a scene's lanterns + cloud, …). */
export const MAX_AMBIENT_PARTS_PER_OWNER = 4;

/** Every running ambient loop on screen: owners × their parts, never more. */
export const MAX_AMBIENT_LOOPS = MAX_VISIBLE_AMBIENT_ANIMATIONS * MAX_AMBIENT_PARTS_PER_OWNER;

/**
 * RC2.3.13R.3.2.5 — the chest opening ritual (press → lid → light → reward)
 * before the already-claimed rewards are shown. Reduced motion: 0.
 */
export const CHEST_REVEAL_MS = 680;

/** One-shot celebration particles on Victory (plum blossoms), then stop. */
export const COMPLETION_PARTICLES = 6;

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/** The single reduced-motion read for Living UI code. */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(REDUCED_QUERY).matches;
  } catch {
    return false;
  }
}

/** Subscribe to reduced-motion changes (one media query listener per caller set). */
export function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  let mq: MediaQueryList;
  try {
    mq = window.matchMedia(REDUCED_QUERY);
  } catch {
    return () => {};
  }
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }
  // Older WebKit: MediaQueryList.addListener only.
  mq.addListener?.(onChange);
  return () => mq.removeListener?.(onChange);
}

export function documentHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}
