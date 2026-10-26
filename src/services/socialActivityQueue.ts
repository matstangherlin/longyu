import type { SocialActivityType } from "../lib/social/types";
import { isBackendDomainAvailable } from "../lib/cloud/backendCapability";
import { partitionOwnedSyncItems } from "../lib/auth/accountIsolation";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getSupabaseClient } from "../lib/supabaseClient";

const queue: { type: SocialActivityType; payload: Record<string, unknown>; ownerUserId: string | null }[] = [];
let discardedWhileSocialUnavailable = 0;

export function discardedSocialEventCount(): number {
  return discardedWhileSocialUnavailable;
}

export function resetSocialEventQueueForTests(): void {
  queue.length = 0;
  discardedWhileSocialUnavailable = 0;
}

export function queueSocialEvent(
  type: SocialActivityType,
  payload: Record<string, unknown> = {},
  ownerUserId?: string | null
) {
  queue.push({ type, payload, ownerUserId: ownerUserId ?? null });
}

async function sessionUserId(): Promise<string | null> {
  if (!isSupabaseBackendEnabled()) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

export async function flushSocialEventQueue(): Promise<void> {
  if (!queue.length) return;
  if (!isBackendDomainAvailable("social")) {
    discardedWhileSocialUnavailable += queue.length;
    queue.length = 0;
    return;
  }
  const batch = queue.splice(0, queue.length);
  const { send, hold } = partitionOwnedSyncItems(batch, await sessionUserId());
  if (hold.length) queue.push(...hold);
  if (!send.length) return;
  const { recordSocialActivity } = await import("./socialService");
  for (const item of send) {
    await recordSocialActivity(item.type, item.payload);
  }
}
