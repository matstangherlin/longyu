import type { SocialActivityType } from "../lib/social/types";

const queue: { type: SocialActivityType; payload: Record<string, unknown> }[] = [];

export function queueSocialEvent(type: SocialActivityType, payload: Record<string, unknown> = {}) {
  queue.push({ type, payload });
}

export async function flushSocialEventQueue(): Promise<void> {
  if (!queue.length) return;
  const { recordSocialActivity } = await import("./socialService");
  const batch = queue.splice(0, queue.length);
  for (const item of batch) {
    await recordSocialActivity(item.type, item.payload);
  }
}
