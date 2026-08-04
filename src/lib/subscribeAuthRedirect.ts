import type { ProPlanKey } from "../services/subscriptionService";

export const PENDING_CHECKOUT_PLAN_KEY = "longyu:pending-checkout-plan";

const SAFE_INTERNAL_PATH = /^\/[A-Za-z0-9\-/_?=&%]*$/;

/** Destino pós-login/cadastro a partir da query (?next= / ?intent=subscribe). */
export function resolvePostAuthPath(
  searchParams: URLSearchParams | { get(name: string): string | null },
  fallback = "/jornada"
): string {
  const next = searchParams.get("next")?.trim() ?? "";
  if (next.startsWith("/") && !next.startsWith("//") && SAFE_INTERNAL_PATH.test(next.split("#")[0] ?? next)) {
    return next;
  }
  if (searchParams.get("intent") === "subscribe") return "/pro";
  return fallback;
}

export function isSubscribeIntent(
  searchParams: URLSearchParams | { get(name: string): string | null }
): boolean {
  return searchParams.get("intent") === "subscribe";
}

export function parseProPlanKey(value: string | null | undefined): ProPlanKey | null {
  if (value === "pro_monthly" || value === "pro_annual") return value;
  return null;
}

/** URL da tela de conta/criação para quem tenta assinar sem sessão cloud. */
export function subscribeAccountPath(plan?: ProPlanKey | null): string {
  const params = new URLSearchParams({
    intent: "subscribe",
    next: "/pro",
  });
  if (plan) params.set("plan", plan);
  return `/conta?${params.toString()}`;
}

export function savePendingCheckoutPlan(plan: ProPlanKey): void {
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_PLAN_KEY, plan);
  } catch {
    // ignore quota / private mode
  }
}

export function peekPendingCheckoutPlan(): ProPlanKey | null {
  try {
    return parseProPlanKey(sessionStorage.getItem(PENDING_CHECKOUT_PLAN_KEY));
  } catch {
    return null;
  }
}

export function takePendingCheckoutPlan(): ProPlanKey | null {
  const plan = peekPendingCheckoutPlan();
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
  } catch {
    // ignore
  }
  return plan;
}

export function clearPendingCheckoutPlan(): void {
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
  } catch {
    // ignore
  }
}
