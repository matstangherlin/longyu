import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { isDevPreviewAllowed } from "../lib/entitlements";
import { fetchServerSubscription, subscriptionGrantsPro } from "./entitlementService";

export type SubscriptionState =
  | "not_subscriber"
  | "local_preview"
  | "real_trialing"
  | "real_active"
  | "real_canceling"
  | "real_expired";

export type ServerSubscriptionState =
  | "real_trialing"
  | "real_active"
  | "real_canceling"
  | "real_expired";

export interface ServerSubscriptionSnapshot {
  state: ServerSubscriptionState;
  planName?: string;
  nextBillingAt?: number;
  currentPeriodEnd?: number;
}

export type SubscriptionServiceStatus = "not_implemented" | "opened" | "error";

export interface SubscriptionServiceResult<T = undefined> {
  status: SubscriptionServiceStatus;
  message: string;
  data?: T;
}

export type ProPlanKey = "pro_monthly" | "pro_annual";

export function isBillingPortalAvailable(): boolean {
  return isSupabaseBackendEnabled();
}

const MANAGE_PENDING_MESSAGE =
  "Assinaturas reais ainda não estão ativas nesta versão. Quando o pagamento for integrado, você poderá gerenciar seu plano aqui.";

const CHECKOUT_PENDING_MESSAGE =
  "Assinaturas reais ainda não estão ativas nesta versão. Quando o Stripe for integrado, o checkout abrirá aqui de forma segura.";

const CHECKOUT_LOGIN_REQUIRED = "Faça login na sua conta para assinar o Longyu Pro.";

export function subscriptionStateFor(
  isPremiumPreview: boolean,
  snapshot: ServerSubscriptionSnapshot | null = null
): SubscriptionState {
  if (snapshot) {
    if (subscriptionGrantsPro(snapshot)) return snapshot.state;
    return snapshot.state;
  }
  if (isPremiumPreview && isDevPreviewAllowed()) return "local_preview";
  return "not_subscriber";
}

export async function createCheckoutSession(
  planKey: ProPlanKey = "pro_monthly"
): Promise<SubscriptionServiceResult<{ url?: string }>> {
  if (!isSupabaseBackendEnabled()) {
    return { status: "not_implemented", message: CHECKOUT_PENDING_MESSAGE };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { status: "not_implemented", message: CHECKOUT_PENDING_MESSAGE };
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) {
    return { status: "not_implemented", message: CHECKOUT_LOGIN_REQUIRED };
  }

  const { data, error } = await client.functions.invoke<{ url?: string }>("create-checkout-session", {
    body: { planKey },
  });

  if (error) {
    return { status: "error", message: error.message || CHECKOUT_PENDING_MESSAGE };
  }

  if (data?.url) {
    return {
      status: "opened",
      message: "Abrindo checkout seguro do Stripe...",
      data: { url: data.url },
    };
  }

  return { status: "not_implemented", message: CHECKOUT_PENDING_MESSAGE };
}

export async function getSubscription(): Promise<SubscriptionServiceResult<ServerSubscriptionSnapshot | null>> {
  if (!isSupabaseBackendEnabled()) {
    return { status: "not_implemented", message: MANAGE_PENDING_MESSAGE, data: null };
  }

  const snapshot = await fetchServerSubscription();
  if (!snapshot) {
    return {
      status: "not_implemented",
      message: "Nenhuma assinatura ativa encontrada para esta conta.",
      data: null,
    };
  }

  return {
    status: "opened",
    message: "Assinatura carregada do servidor.",
    data: snapshot,
  };
}

export async function openBillingPortal(): Promise<SubscriptionServiceResult<{ url?: string }>> {
  if (!isBillingPortalAvailable()) {
    return { status: "not_implemented", message: MANAGE_PENDING_MESSAGE };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { status: "not_implemented", message: MANAGE_PENDING_MESSAGE };
  }

  const { data, error } = await client.functions.invoke<{ url?: string }>("create-billing-portal");
  if (error) {
    return { status: "error", message: error.message };
  }
  if (data?.url) {
    return { status: "opened", message: "Abrindo o portal de cobrança...", data: { url: data.url } };
  }
  return { status: "not_implemented", message: MANAGE_PENDING_MESSAGE };
}

export async function cancelSubscription(): Promise<SubscriptionServiceResult<{ url?: string }>> {
  return openBillingPortal();
}
