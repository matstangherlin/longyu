import { useEffect, useState, type RefObject } from "react";
import { documentHidden } from "./livingUiMotion";

/**
 * RC2.3.13R.3.2.6 — when a guide line may type (GuideDialogue, TeacherSpeechBubble).
 *
 * Seen: a line starts once at least GUIDE_ON_SCREEN_RATIO of the guide is on
 * screen in a visible document — not at mount, not below the fold, not in a
 * backgrounded app. The latch is one-way and the observer disconnects on the
 * first hit, so later scrolling never restarts or pauses the line. Without
 * IntersectionObserver (old WebViews, node gate runners) or without an
 * element the guide counts as seen: a guide is never stuck silent.
 *
 * Floor: one guide types at a time. The latest claim speaks (a sheet's guide
 * over the page's); the one under it pauses its tick and resumes on release.
 * A hidden document holds every line (the voice is already muted there).
 *
 * Every browser global is behind a `typeof` guard: the node runners execute
 * these components with a fake window and no document.
 */
export const GUIDE_ON_SCREEN_RATIO = 0.6;

/**
 * Steps up to the ratio so a guide that grows into view, or one taller than
 * the screen, is re-checked while it scrolls in (the observer is gone after
 * the first hit, so these never pause or restart a line).
 */
export const GUIDE_OBSERVER_THRESHOLDS: readonly number[] = [0, 0.15, 0.3, 0.45, GUIDE_ON_SCREEN_RATIO, 0.8, 1];

export function canObserveOnScreen(): boolean {
  return typeof IntersectionObserver === "function";
}

/**
 * On screen enough to start: GUIDE_ON_SCREEN_RATIO of the guide is visible —
 * or, for a guide taller than the screen (which can never show that share of
 * itself), it fills that share of the viewport.
 */
export function guideRecordOnScreen(
  record: Pick<IntersectionObserverEntry, "isIntersecting" | "intersectionRatio"> &
    Partial<Pick<IntersectionObserverEntry, "intersectionRect" | "rootBounds">>,
  ratio = GUIDE_ON_SCREEN_RATIO,
): boolean {
  if (!record.isIntersecting) return false;
  if (record.intersectionRatio >= ratio - 0.01) return true;
  const root = record.rootBounds;
  const rect = record.intersectionRect;
  return Boolean(root && rect && root.height > 0 && rect.height >= root.height * ratio);
}

/** Calls `onSeen` once, the first time `el` is on screen in a visible document. Returns the stop function. */
export function observeOnScreenOnce(el: Element | null, onSeen: () => void, ratio = GUIDE_ON_SCREEN_RATIO): () => void {
  if (!el || !canObserveOnScreen()) {
    onSeen();
    return () => {};
  }
  let inView = false;
  let done = false;
  const hasDocument = typeof document !== "undefined";
  const io = new IntersectionObserver(
    (records) => {
      for (const record of records) inView = guideRecordOnScreen(record, ratio);
      check();
    },
    { threshold: [...GUIDE_OBSERVER_THRESHOLDS.filter((step) => step !== ratio), ratio].sort((a, b) => a - b) },
  );
  function stop(): void {
    io.disconnect();
    if (hasDocument) document.removeEventListener("visibilitychange", check);
  }
  function check(): void {
    if (done || !inView || documentHidden()) return;
    done = true;
    stop();
    onSeen();
  }
  io.observe(el);
  if (hasDocument) document.addEventListener("visibilitychange", check);
  return stop;
}

/**
 * True once the element at `ref` has been on screen for this `key` (latched).
 * A new key (a new line in the same bubble) waits to be seen again;
 * `enabled = false` (reduced motion) never creates an observer.
 */
export function useOnScreenOnce(ref: RefObject<Element | null>, enabled = true, key = ""): boolean {
  const [seenKey, setSeenKey] = useState<string | null>(null);
  const seen = !canObserveOnScreen() || seenKey === key;
  useEffect(() => {
    if (!enabled || seen) return;
    return observeOnScreenOnce(ref.current, () => setSeenKey(key));
  }, [ref, enabled, seen, key]);
  return seen;
}

const floor: number[] = [];
const floorListeners = new Set<() => void>();
let floorSeq = 0;

function emitFloor(): void {
  for (const listener of [...floorListeners]) listener();
}

export function claimGuideFloor(): number {
  floorSeq += 1;
  floor.push(floorSeq);
  emitFloor();
  return floorSeq;
}

export function releaseGuideFloor(id: number): void {
  const index = floor.lastIndexOf(id);
  if (index < 0) return;
  floor.splice(index, 1);
  emitFloor();
}

export function guideFloorOwner(): number | null {
  return floor.length ? floor[floor.length - 1] : null;
}

/** While `wants` (this guide is typing) it holds a claim; true while that claim is on top and the document is visible. */
export function useGuideFloor(wants: boolean): boolean {
  const [owns, setOwns] = useState(false);
  const [visibleDoc, setVisibleDoc] = useState(() => !documentHidden());
  useEffect(() => {
    if (!wants) return;
    const id = claimGuideFloor();
    const sync = () => setOwns(guideFloorOwner() === id);
    floorListeners.add(sync);
    sync();
    return () => {
      floorListeners.delete(sync);
      releaseGuideFloor(id);
      setOwns(false);
    };
  }, [wants]);
  useEffect(() => {
    if (!wants || typeof document === "undefined") return;
    const onVisibility = () => setVisibleDoc(!documentHidden());
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [wants]);
  return wants && owns && visibleDoc;
}
