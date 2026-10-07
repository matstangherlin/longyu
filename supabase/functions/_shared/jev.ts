// Cliente mínimo do TypeSafe Jev (System One): estado + perguntas tipadas →
// respostas tipadas com probabilidade. Só roda no servidor (Edge); a API key
// nunca vai para o browser.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = Deno.env.get("TYPESAFE_MODEL")?.trim() || "jev-latest";
const JEV_TIMEOUT_MS = 8_000;

export type JevQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] }
  | { type: "noul"; instructions: string; criteria?: { true: string; false: string } };

export type JevAnswer =
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: "score"; score: number; probabilities: Record<string, number>; confidence: number }
  | { type: "noul"; noul: number };

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
): Promise<JevResponse> {
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
    if (!body || typeof body.answers !== "object") throw new Error("jev_bad_response");
    return body;
  } finally {
    clearTimeout(timer);
  }
}
