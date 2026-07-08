import { useEffect } from "react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { useStore } from "../../lib/store";
import { fetchRemoteEntitlements } from "../../services/syncService";

/** Consulta entitlement Pro no servidor quando Supabase está ativo. */
export function EntitlementBootstrap() {
  const setServerEntitlement = useStore((state) => state.setServerEntitlement);

  useEffect(() => {
    if (!isSupabaseBackendEnabled()) return;

    async function refreshEntitlement() {
      const result = await fetchRemoteEntitlements();
      if (result.data) setServerEntitlement(result.data.isPro);
    }

    void refreshEntitlement();

    const client = getSupabaseClient();
    if (!client) return;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      void refreshEntitlement();
    });

    return () => subscription.unsubscribe();
  }, [setServerEntitlement]);

  return null;
}
