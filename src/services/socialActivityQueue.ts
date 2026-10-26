import type { SocialActivityType } from "../lib/social/types";
import { isBackendDomainAvailable } from "../lib/cloud/backendCapability";

const queue: { type: SocialActivityType; payload: Record<string, unknown> }[] = [];
let discardedWhileSocialUnavailable = 0;

export function discardedSocialEventCount(): number {
  return discardedWhileSocialUnavailable;
}

export function resetSocialEventQueueForTests(): void {
  queue.length = 0;
  discardedWhileSocialUnavailable = 0;
}

export function queueSocialEvent(type: SocialActivityType, payload: Record<string, unknown> = {}) {
  queue.push({ type, payload });
}

export async function flushSocialEventQueue(): Promise<void> {
  if (!queue.length) return;
  if (!isBackendDomainAvailable("social")) {
    discardedWhileSocialUnavailable += queue.length;
    queue.length = 0;
    return;
  }
  const { recordSocialActivity } = await import("./socialService");
  const batch = queue.splice(0, queue.length);
  for (const item of batch) {
    await recordSocialActivity(item.type, item.payload);
  }
}
