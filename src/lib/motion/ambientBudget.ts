import { useEffect, type RefObject } from "react";
import {
  AMBIENT_PRIORITY,
  MAX_VISIBLE_AMBIENT_ANIMATIONS,
  documentHidden,
  prefersReducedMotion,
  subscribeReducedMotion,
  type AmbientKind,
} from "./livingUiMotion";

/**
 * RC2.3.13R.3.2.4 — ambient motion budget.
 *
 * Looping decoration (scene drift, the current-node halo, lane ornaments)
 * only runs on elements the budget grants: visible (or near the viewport),
 * at most MAX_VISIBLE_AMBIENT_ANIMATIONS at a time, highest priority first,
 * and nothing while the document is hidden or the learner asked for
 * reduced motion. CSS animates only `[data-ambient="run"]`; the default
 * (no attribute, or "rest") is still. One shared IntersectionObserver
 * writes the attribute directly — no React state, no re-render per frame.
 */

export type AmbientCandidate = {
  id: number;
  priority: number;
  visible: boolean;
};

/** Pure allocation: visible candidates, best priority first, then registration order. */
export function allocateAmbientSlots(
  candidates: readonly AmbientCandidate[],
  max: number = MAX_VISIBLE_AMBIENT_ANIMATIONS,
  paused = false,
): Set<number> {
  if (paused || max <= 0) return new Set();
  return new Set(
    candidates
      .filter((candidate) => candidate.visible)
      .sort((a, b) => a.priority - b.priority || a.id - b.id)
      .slice(0, max)
      .map((candidate) => candidate.id),
  );
}

type Entry = AmbientCandidate & { el: Element };

const entries = new Map<Element, Entry>();
let nextId = 1;
let observer: IntersectionObserver | null = null;
let installed = false;
let scheduled = false;
let frame: number | null = null;
let fallback: ReturnType<typeof setTimeout> | null = null;

/** "Well outside the viewport" means beyond this margin. */
const NEAR_VIEWPORT = "48px 0px 48px 0px";

/**
 * RC2.3.13R.3.2.5 — the frame is only the fast path. Browsers suspend
 * requestAnimationFrame in a hidden document and may throttle it (WebKit,
 * background webviews); a pending frame must never hold the budget stale, so
 * a timer always backs it up and whichever fires first applies.
 */
const APPLY_FALLBACK_MS = 120;

function apply(): void {
  scheduled = false;
  if (frame !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
  if (fallback !== null) clearTimeout(fallback);
  frame = null;
  fallback = null;
  const paused = documentHidden() || prefersReducedMotion();
  const granted = allocateAmbientSlots([...entries.values()], MAX_VISIBLE_AMBIENT_ANIMATIONS, paused);
  for (const entry of entries.values()) {
    const next = granted.has(entry.id) ? "run" : "rest";
    if (entry.el.getAttribute("data-ambient") !== next) entry.el.setAttribute("data-ambient", next);
  }
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  const hidden = documentHidden();
  if (typeof requestAnimationFrame === "function" && !hidden) frame = requestAnimationFrame(apply);
  fallback = setTimeout(apply, hidden ? 0 : APPLY_FALLBACK_MS);
}

function install(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("visibilitychange", schedule);
  subscribeReducedMotion(schedule);
  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          const entry = entries.get(record.target);
          if (entry) entry.visible = record.isIntersecting;
        }
        schedule();
      },
      { rootMargin: NEAR_VIEWPORT, threshold: 0 },
    );
  }
}

/** Registers one looping decoration; returns the unregister function. */
export function registerAmbient(el: Element, kind: AmbientKind): () => void {
  if (typeof document === "undefined") return () => {};
  install();
  // Without IntersectionObserver every element counts as visible; the cap still holds.
  const entry: Entry = { id: nextId++, priority: AMBIENT_PRIORITY[kind], visible: observer === null, el };
  entries.set(el, entry);
  el.setAttribute("data-ambient", "rest");
  el.setAttribute("data-ambient-kind", kind);
  observer?.observe(el);
  schedule();
  return () => {
    observer?.unobserve(el);
    entries.delete(el);
    el.setAttribute("data-ambient", "rest");
    schedule();
  };
}

/** React binding: the element at `ref` joins the budget while `enabled`. */
export function useAmbientMotion(ref: RefObject<Element | null>, kind: AmbientKind, enabled = true): void {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    return registerAmbient(el, kind);
  }, [ref, kind, enabled]);
}

/** QA / tests: current allocation snapshot. */
export function ambientSnapshot(): { registered: number; running: number } {
  let running = 0;
  for (const entry of entries.values()) if (entry.el.getAttribute("data-ambient") === "run") running += 1;
  return { registered: entries.size, running };
}
