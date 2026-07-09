import { useEffect } from "react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { useStore } from "../../lib/store";
import { restoreCloudSessionIfPresent } from "../../services/cloudSyncCoordinator";

function waitForStoreHydration(): Promise<void> {
  if (useStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

/** Restaura sessão Supabase após hidratar a store, promove perfil para cloud e sincroniza. */
export function AuthBootstrap() {
  const endCloudSession = useStore((state) => state.endCloudSession);
  const setServerEntitlement = useStore((state) => state.setServerEntitlement);

  useEffect(() => {
    if (!isSupabaseBackendEnabled()) return;
    const client = getSupabaseClient();
    if (!client) return;

    const applySession = async () => {
      await waitForStoreHydration();
      await restoreCloudSessionIfPresent();
    };

    void applySession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id;
      if (userId && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        void waitForStoreHydration().then(() => restoreCloudSessionIfPresent());
        return;
      }
      if (event === "SIGNED_OUT") {
        endCloudSession();
        setServerEntitlement(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [endCloudSession, setServerEntitlement]);

  return null;
}
