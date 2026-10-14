// Cliente mínimo do TypeSafe Jev (System One): estado + perguntas tipadas →
// respostas tipadas com probabilidade. Só roda no servidor (Edge); a API key
// nunca vai para o browser.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createCircuitBreaker, resolveCostPolicy, stableInputHash, type CostPolicy } from "./budgetPolicy.ts";
import { validateJevAnswers, type JevAnswer, type JevQuestion } from "./jevAnswers.ts";

export type { JevAnswer, JevQuestion } from "./jevAnswers.ts";
export { validateJevAnswers } from "./jevAnswers.ts";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = Deno.env.get("TYPESAFE_MODEL")?.trim() || "jev-latest";
/** RC2.3.4A — short timeout: Jev answers in 70–500 ms; anything slower fails cheap. */
const JEV_TIMEOUT_MS = 3_000;

/**
 * Why Jev is being called. LEARNER_RUNTIME stays off for launch
 * (JEV_RUNTIME_ENABLED=false); DEV_AUDIT is internal and has its own kill switch.
 */
export type JevPurpose = "DEV_AUDIT" | "LEARNER_RUNTIME";

/** Per-isolate breaker: 3 consecutive failures → 60 s without calling Jev. */
const breaker = createCircuitBreaker({ failureThreshold: 3, cooldownMs: 60_000 });

export function jevPolicy(): CostPolicy {
  return resolveCostPolicy((key) => Deno.env.get(key));
}

export function jevAllowed(purpose: JevPurpose, policy: CostPolicy = jevPolicy()): boolean {
  return purpose === "LEARNER_RUNTIME" ? policy.JEV_RUNTIME_ENABLED : policy.JEV_DEV_AUDIT_ENABLED;
}

export function jevInputHash(state: string, questions: Record<string, JevQuestion>): string {
  return stableInputHash({ model: JEV_MODEL, state, questions });
}

export interface JevResponse {
  model: string;
  answers: Record<string, JevAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** Env (supabase secrets) primeiro; fallback Vault via RPC service_role. */
export async function resolveTypesafeApiKey(admin: SupabaseClient): Promise<string | null> {
  const fromEnv = Deno.env.get("TYPESAFE_API_KEY")?.trim();
  if (fromEnv) return fromEnv;
  const { data, error } = await admin.rpc("_edge_get_typesafe_api_key");
  if (error) {
    console.error("typesafe vault rpc:", error.message);
    return null;
  }
  return typeof data === "string" && data.trim() ? data.trim() : null;
}

export async function askJev(
  apiKey: string,
  state: string,
  questions: Record<string, JevQuestion>,
  purpose: JevPurpose,
): Promise<JevResponse> {
  if (!jevAllowed(purpose)) throw new Error(`jev_disabled_by_policy:${purpose}`);
  if (!breaker.canCall(Date.now())) throw new Error("jev_circuit_open");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JEV_TIMEOUT_MS);
  try {
    const res = await fetch(JEV_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state, model: JEV_MODEL, questions }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`jev_http_${res.status}: ${detail}`);
    }
    const body = (await res.json()) as JevResponse;
    if (!body || typeof body !== "object") throw new Error("jev_bad_response");
    validateJevAnswers(questions, body.answers);
    breaker.recordSuccess();
    return { model: typeof body.model === "string" ? body.model : JEV_MODEL, answers: body.answers, usage: body.usage };
  } catch (err) {
    breaker.recordFailure(Date.now());
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
