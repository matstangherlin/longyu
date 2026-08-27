import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseBackendEnabled } from "./backendConfig";
import { getOpsSessionId, OPS_SESSION_HEADER } from "./opsCorrelation";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseBackendEnabled()) return null;
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        [OPS_SESSION_HEADER]: getOpsSessionId(),
      },
    },
  });
  return client;
}

export function resetSupabaseClientForTests(): void {
  client = null;
}
