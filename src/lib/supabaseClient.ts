import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseBackendEnabled } from "./backendConfig";

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
  });
  return client;
}

export function resetSupabaseClientForTests(): void {
  client = null;
}
