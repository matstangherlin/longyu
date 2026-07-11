import { useEffect } from "react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { isInternalTestProEmail } from "../../lib/entitlements";
import { useStore } from "../../lib/store";
import { fetchRemoteEntitlements } from "../../services/syncService";

async function refreshServerEntitlement(setServerEntitlement: (isPro: boolean) => void): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const {
    data: { session },
  } = await client.auth.getSession();

  if (isInternalTestProEmail(session?.user?.email)) {
    setServerEntitlement(true);
    return;
  }

  const result = await fetchRemoteEntitlements();
  if (result.data) setServerEntitlement(result.data.isPro);
}

/** Consulta entitlement Pro no servidor quando Supabase está ativo. */
export function EntitlementBootstrap() {
  const setServerEntitlement = useStore((state) => state.setServerEntitlement);

  useEffect(() => {
    if (!isSupabaseBackendEnabled()) return;

    void refreshServerEntitlement(setServerEntitlement);

    const client = getSupabaseClient();
    if (!client) return;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        void refreshServerEntitlement(setServerEntitlement);
      }
      if (event === "SIGNED_OUT") {
        setServerEntitlement(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [setServerEntitlement]);

  return null;
}
