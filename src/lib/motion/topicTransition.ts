/**
 * RC2.3.13R.3.2.4 — direction of the next Culture root ↔ topic entrance.
 * Set by the tap that navigates (topic card → forward, back link → back) and
 * read once by the page that mounts; reloads and deep links enter still.
 */
export type TopicTransition = "forward" | "back";

let pending: TopicTransition | null = null;

export function markTopicTransition(direction: TopicTransition): void {
  pending = direction;
}

export function consumeTopicTransition(): TopicTransition | null {
  const direction = pending;
  pending = null;
  return direction;
}
