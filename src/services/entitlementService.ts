import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import {
  EMPTY_SERVER_ENTITLEMENT,
  parseServerEntitlementRpc,
  type ServerEntitlement,
} from "../lib/accessTier";
import { useStore } from "../lib/store";
import type { ServerSubscriptionSnapshot } from "./subscriptionService";

const ACTIVE_STATUSES = new Set(["trialing", "active"]);
const INACTIVE_STATUSES = new Set(["past_due", "unpaid", "incomplete", "incomplete_expired"]);

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

export interface ServerEntitlementRpcResult {
  isPro: boolean | null;
  pearlProExpiresAt: number | null;
  source?: string;
  entitlement: ServerEntitlement;
}

function applyPearlProExpiresFromRpc(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

async function fetchServerEntitlementRpc(): Promise<ServerEntitlementRpcResult> {
  const client = getSupabaseClient();
  if (!client) return { isPro: null, pearlProExpiresAt: null, entitlement: { ...EMPTY_SERVER_ENTITLEMENT } };
  const { data, error } = await client.rpc("get_server_entitlement");
  if (error) return { isPro: null, pearlProExpiresAt: null, entitlement: { ...EMPTY_SERVER_ENTITLEMENT } };
  if (data && typeof data === "object") {
    const row = data as {
      is_pro?: boolean;
      pearl_pro_expires_at?: string | number | null;
      source?: string;
    };
    const pearlProExpiresAt = applyPearlProExpiresFromRpc(row.pearl_pro_expires_at ?? null);
    const entitlement = parseServerEntitlementRpc(data);
    if (pearlProExpiresAt != null || row.pearl_pro_expires_at === null) {
      useStore.setState((s) => {
        const account = s.accounts[s.currentAccountId];
        const accounts = account
          ? {
              ...s.accounts,
              [s.currentAccountId]: { ...account, pearlProExpiresAt },
            }
          : s.accounts;
        return { pearlProExpiresAt, accounts };
      });
    }
    if ("is_pro" in row) {
      return {
        isPro: entitlement.premiumAccess,
        pearlProExpiresAt,
        source: entitlement.source,
        entitlement,
      };
    }
  }
  return { isPro: null, pearlProExpiresAt: null, entitlement: { ...EMPTY_SERVER_ENTITLEMENT } };
}

export async function fetchServerIsPro(): Promise<boolean> {
  const entitlement = await fetchServerEntitlement();
  return entitlement.premiumAccess;
}

/** Entitlement completo; `premiumAccess` alimenta `serverIsPro` na migração. */
export async function fetchServerEntitlement(): Promise<ServerEntitlement> {
  if (!isSupabaseBackendEnabled()) return { ...EMPTY_SERVER_ENTITLEMENT };
  const client = getSupabaseClient();
  if (!client) return { ...EMPTY_SERVER_ENTITLEMENT };

  const rpc = await fetchServerEntitlementRpc();
  if (rpc.isPro !== null) return rpc.entitlement;

  const snapshot = await fetchServerSubscription();
  if (subscriptionGrantsPro(snapshot)) {
    return {
      tier: "pro",
      premiumAccess: true,
      source: "individual_subscription",
    };
  }
  return { ...EMPTY_SERVER_ENTITLEMENT };
}
