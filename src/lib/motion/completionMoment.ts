import { useEffect, useRef, useState } from "react";
import { isCelebrationActive } from "../celebrationLock";
import { prefersReducedMotion } from "./livingUiMotion";
import { claimSessionOnce, sessionOnceClaimed } from "./sessionOnce";

/**
 * RC2.3.13R.3.2.6 — the one-shot moment when a path node becomes completed
 * in this session (back from a lesson Victory): the ring settles, the check
 * appears, a tiny sparkle, the line fills — ≤ 1100 ms, then still.
 *
 * It plays only:
 * - for a node this session saw incomplete (noteNodeState),
 * - on the first path view after a Victory (armCompletionMoments opens a
 *   short window at that view — a module expanded minutes later stays still),
 * - once (claimSessionOnce): a cold start, a remount or scrolling back never
 *   replays it,
 * - never under reduced motion (the final state at once),
 * - never under another ceremony or modal: it holds its starting pose until
 *   the screen has been calm for a moment, and gives up silently after
 *   COMPLETION_PENDING_MAX_MS.
 */
const seenIncomplete = new Set<string>();

export type CompletionNodeState = "COMPLETED" | "CURRENT" | "AVAILABLE" | "LOCKED";

/** Records that `id` was on screen before it was completed. */
export function noteNodeState(id: string, state: CompletionNodeState): void {
  if (state !== "COMPLETED") seenIncomplete.add(id);
}

const momentKey = (id: string) => `progression-complete:${id}`;

/** The whole moment (settle, check, sparkle, line fill) ends inside this. */
export const COMPLETION_MOMENT_MS = 1100;
/** After a ceremony or modal closes, the screen must stay calm this long before the moment plays. */
export const CEREMONY_SETTLE_MS = 600;
/** Bubbles mounting this long after the first path view following a Victory never play. */
export const COMPLETION_WINDOW_MS = 4000;
/** A moment still waiting on a ceremony after this long is dropped (the final state, silently). */
export const COMPLETION_PENDING_MAX_MS = 20000;

export type CompletionMomentPhase = "pending" | "play" | "done" | null;

let armedAt: number | null = null;
let windowOpenedAt: number | null = null;

/** A lesson Victory just showed: the next path view may play completion moments. */
export function armCompletionMoments(now: number = Date.now()): void {
  armedAt = now;
  windowOpenedAt = null;
}

/** The first path view after a Victory opens the window (idempotent until re-armed). */
export function openCompletionWindow(now: number = Date.now()): void {
  if (armedAt !== null && windowOpenedAt === null) windowOpenedAt = now;
}

function armed(now: number): boolean {
  if (armedAt === null) return false;
  return windowOpenedAt === null || now - windowOpenedAt <= COMPLETION_WINDOW_MS;
}

/** Pure: would this node play its moment now? (Render-time; never claims.) */
export function peekCompletionMoment(id: string, state: CompletionNodeState, now: number = Date.now()): boolean {
  return (
    state === "COMPLETED" &&
    seenIncomplete.has(id) &&
    armed(now) &&
    !sessionOnceClaimed(momentKey(id)) &&
    !prefersReducedMotion()
  );
}

/** The id this moment uses with the celebration lock. */
export const COMPLETION_MOMENT_CEREMONY_ID = "progression-moment";

/** Another ceremony (lock holder) or any modal (e.g. the streak screen) is on screen. */
export function ceremonyOrModalOnScreen(): boolean {
  if (isCelebrationActive(COMPLETION_MOMENT_CEREMONY_ID)) return true;
  if (typeof document === "undefined") return false;
  return document.querySelector('[aria-modal="true"]') !== null;
}

/**
 * Calls `onCalm` once no ceremony or modal is on screen — after
 * CEREMONY_SETTLE_MS of calm when one was seen — or `onGiveUp` after
 * COMPLETION_PENDING_MAX_MS. The first look is a macrotask later, so a
 * ceremony mounting in the same commit (its lock is a passive effect) is
 * seen. Shared by the node moment and the Journey axis fill, so the whole
 * moment waits on the same rule. Returns a cancel function.
 */
export function whenScreenCalm(onCalm: () => void, onGiveUp: () => void): () => void {
  const startedWaiting = Date.now();
  let calmSince: number | null = null;
  let sawCeremony = false;
  let settled = false;
  let timer = 0;
  const attempt = () => {
    if (settled) return;
    const now = Date.now();
    if (now - startedWaiting > COMPLETION_PENDING_MAX_MS) {
      settled = true;
      onGiveUp();
      return;
    }
    if (ceremonyOrModalOnScreen()) {
      sawCeremony = true;
      calmSince = null;
      timer = window.setTimeout(attempt, 300);
      return;
    }
    if (calmSince === null) calmSince = now;
    if (sawCeremony && now - calmSince < CEREMONY_SETTLE_MS) {
      timer = window.setTimeout(attempt, 150);
      return;
    }
    settled = true;
    onCalm();
  };
  timer = window.setTimeout(attempt, 60);
  return () => {
    settled = true;
    window.clearTimeout(timer);
  };
}

/**
 * Bubble binding. Render-time code only peeks (StrictMode runs initializers
 * twice; a claim there would be eaten by the discarded call). An eligible node
 * renders "pending" — the moment's starting pose, static — and a passive
 * effect starts it once the screen is calm (whenScreenCalm). The claim is
 * committed once (the ref survives StrictMode).
 */
export function useCompletionMoment(id: string, state: CompletionNodeState): CompletionMomentPhase {
  const [phase, setPhase] = useState<CompletionMomentPhase>(() => (peekCompletionMoment(id, state) ? "pending" : null));
  const owned = useRef(false);
  const previous = useRef(state);
  useEffect(() => {
    openCompletionWindow();
    if (previous.current !== state && state === "COMPLETED" && !owned.current && peekCompletionMoment(id, state)) setPhase("pending");
    previous.current = state;
    noteNodeState(id, state);
  }, [id, state]);
  useEffect(() => {
    if (phase !== "pending" || owned.current) return;
    return whenScreenCalm(
      () => {
        if (owned.current) return;
        owned.current = true;
        setPhase(claimSessionOnce(momentKey(id)) ? "play" : null);
      },
      () => {
        // Never left in the starting pose: drop the moment, show the final state.
        claimSessionOnce(momentKey(id));
        owned.current = true;
        setPhase(null);
      },
    );
  }, [phase, id]);
  // Then still: the moment's styles (and the sparkle) leave once it is over.
  useEffect(() => {
    if (phase !== "play") return;
    const timer = window.setTimeout(() => setPhase("done"), COMPLETION_MOMENT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);
  return phase;
}

/** Tests only. */
export function resetCompletionMomentsForTests(): void {
  seenIncomplete.clear();
  armedAt = null;
  windowOpenedAt = null;
}
