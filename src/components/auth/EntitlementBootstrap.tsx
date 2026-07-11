import { useEffect, useRef } from "react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { useStore } from "../../lib/store";
import { fetchServerSubscription } from "../../services/entitlementService";
import { trackAnalytics, ANALYTICS_EVENTS } from "../../services/analyticsService";

/** Consulta entitlement Pro no servidor quando Supabase está ativo. */
export function EntitlementBootstrap() {
  const setServerEntitlement = useStore((state) => state.setServerEntitlement);
  const prevIsProRef = useRef<boolean | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseBackendEnabled()) return;

    async function refreshEntitlement() {
      const snapshot = await fetchServerSubscription();
      const isPro = snapshot?.state === "real_active";
      setServerEntitlement(isPro);

      const prevIsPro = prevIsProRef.current;
      if (prevIsPro !== null) {
        if (!prevIsPro && isPro) {
          trackAnalytics({ event: ANALYTICS_EVENTS.subscription_activated });
        }
        if (prevIsPro && !isPro) {
          trackAnalytics({ event: ANALYTICS_EVENTS.subscription_canceled });
        }
      }

      const status = snapshot?.rawStatus ?? null;
      if (status === "trialing" && prevStatusRef.current !== "trialing") {
        trackAnalytics({ event: ANALYTICS_EVENTS.trial_started });
      }

      prevIsProRef.current = isPro;
      prevStatusRef.current = status;
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
