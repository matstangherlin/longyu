import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import type { ServerSubscriptionSnapshot } from "./subscriptionService";

const ACTIVE_STATUSES = new Set(["trialing", "active"]);
const INACTIVE_STATUSES = new Set(["past_due", "unpaid", "incomplete", "incomplete_expired"]);
const INTERNAL_TEST_PRO_EMAILS = new Set(["teste@longyu.app"]);

export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_STATUSES.has(status);
}

export function subscriptionGrantsPro(snapshot: ServerSubscriptionSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  return snapshot.state === "real_trialing" || snapshot.state === "real_active" || snapshot.state === "real_canceling";
}

export function resolveServerSubscriptionRow(input: {
  status: string | null | undefined;
  current_period_end: string | null | undefined;
  cancel_at_period_end?: boolean | null;
}): ServerSubscriptionSnapshot | null {
  const status = input.status ?? "";
  const periodEnd = input.current_period_end ? Date.parse(input.current_period_end) : undefined;
  const stillValid = !periodEnd || periodEnd > Date.now();
  const base = {
    planName: "Longyu Pro" as const,
    currentPeriodEnd: periodEnd,
    nextBillingAt: periodEnd,
  };

  if (INACTIVE_STATUSES.has(status)) {
    return { ...base, state: "real_expired" };
  }

  if (status === "trialing") {
    return stillValid ? { ...base, state: "real_trialing" } : { ...base, state: "real_expired" };
  }

  if (status === "active" && stillValid) {
    return { ...base, state: "real_active" };
  }

  if ((status === "canceled" || input.cancel_at_period_end) && stillValid) {
    return { ...base, state: "real_canceling" };
  }

  if (isActiveSubscriptionStatus(status) && stillValid) {
    return { ...base, state: "real_active" };
  }

  if (status === "canceled") {
    return { ...base, state: stillValid ? "real_canceling" : "real_expired" };
  }

  return { ...base, state: "real_expired" };
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
  return resolveServerSubscriptionRow(data);
}

export async function fetchServerIsPro(): Promise<boolean> {
  if (!isSupabaseBackendEnabled()) return false;
  const client = getSupabaseClient();
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user?.email && INTERNAL_TEST_PRO_EMAILS.has(user.email.toLowerCase())) {
      return true;
    }
  }
  const snapshot = await fetchServerSubscription();
  return subscriptionGrantsPro(snapshot);
}
