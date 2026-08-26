import { getSupabaseClient } from "../supabaseClient";
import { isSupabaseBackendEnabled } from "../backendConfig";

export async function getCloudUserId(): Promise<string | null> {
  if (!isSupabaseBackendEnabled()) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  const {
    data: { session },
  } = await client.auth.getSession();
  return session?.user?.id ?? null;
}

export function cloudCacheKey(userId: string): string {
  return `longyu:user-cache:${userId}`;
}
