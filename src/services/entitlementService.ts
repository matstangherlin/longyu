import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import type { ServerSubscriptionSnapshot } from "./subscriptionService";

const ACTIVE_STATUSES = new Set(["trialing", "active"]);

export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_STATUSES.has(status);
}

export async function fetchServerSubscription(): Promise<ServerSubscriptionSnapshot | null> {
  if (!isSupabaseBackendEnabled()) return null;
  const client = getSupabaseClient();
  if (!client) return null;

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError || !user) return null;

  const { data, error } = await client
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const periodEnd = data.current_period_end ? Date.parse(data.current_period_end) : undefined;
  const stillValid = !periodEnd || periodEnd > Date.now();

  if (isActiveSubscriptionStatus(data.status) && stillValid) {
    return {
      state: "real_active",
      planName: "Longyu Pro",
      currentPeriodEnd: periodEnd,
      nextBillingAt: periodEnd,
    };
  }

  if (data.status === "canceled" || data.cancel_at_period_end) {
    return {
      state: stillValid ? "real_active" : "real_canceled",
      planName: "Longyu Pro",
      currentPeriodEnd: periodEnd,
    };
  }

  return {
    state: "real_expired",
    planName: "Longyu Pro",
    currentPeriodEnd: periodEnd,
  };
}

export async function fetchServerIsPro(): Promise<boolean> {
  const snapshot = await fetchServerSubscription();
  return snapshot?.state === "real_active";
}
