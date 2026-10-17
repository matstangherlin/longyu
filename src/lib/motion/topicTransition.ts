/**
 * RC2.3.13R.3.2.4 — direction of the next Culture root ↔ topic entrance.
 * Set by the tap that navigates (topic card → forward, back link → back) and
 * read once by the page that mounts; reloads and deep links enter still.
 *
 * RC2.3.13R.3.2.5 — a mark only describes a real in-app navigation:
 * - it is written only for a plain primary click (no Ctrl/Cmd/Shift/Alt,
 *   no middle click, not prevented) — the clicks React Router handles itself;
 *   any other click clears it (the browser opens a new tab or window instead);
 * - it names its destination and is read only by that path, shortly after
 *   the tap, so it can never leak into a later, unrelated navigation;
 * - reading is idempotent per history entry (`location.key`): React StrictMode
 *   runs a state initializer twice, and both runs must see the same answer.
 */
export type TopicTransition = "forward" | "back";

type Mark = { direction: TopicTransition; to: string; at: number };

/** A mark older than this is not the navigation that set it. */
export const TOPIC_TRANSITION_MAX_AGE_MS = 3000;

let pending: Mark | null = null;
let consumed: { key: string; direction: TopicTransition | null } | null = null;

export type NavigationClick = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
};

const now = () => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now());

/** Mirrors the clicks a router `<Link>` turns into an SPA navigation. */
export function isInAppNavigationClick(event: NavigationClick): boolean {
  return !event.defaultPrevented && event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}

export function markTopicTransition(direction: TopicTransition, to: string, event?: NavigationClick): void {
  pending = event && !isInAppNavigationClick(event) ? null : { direction, to, at: now() };
}

/** The direction for the page now mounting at `pathname` (history entry `key`). */
export function consumeTopicTransition(pathname: string, key: string): TopicTransition | null {
  if (consumed && consumed.key === key) return consumed.direction;
  const mark = pending;
  pending = null;
  const fresh = mark !== null && mark.to === pathname && now() - mark.at <= TOPIC_TRANSITION_MAX_AGE_MS;
  const direction = fresh ? mark.direction : null;
  consumed = { key, direction };
  return direction;
}
