import { useEffect } from "react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { useStore } from "../../lib/store";
import { useEntitlementStatus } from "../../lib/entitlementStatus";
import { isQaTestStateActive } from "../../lib/qaFastPathAccess";
import { fetchRemoteEntitlements } from "../../services/syncService";

async function refreshServerEntitlement(setServerEntitlement: (isPro: boolean) => void): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const {
    data: { session },
  } = await client.auth.getSession();

  // Sem sessão cloud não existe confirmação de servidor válida.
  if (!session?.user) {
    setServerEntitlement(false);
    return;
  }

  // Só marca "Verificando seu plano..." quando há sessão cloud real a consultar.
  // Assim um Pro legítimo não vê paywall piscar enquanto o servidor responde, e
  // quem não tem login nunca vê o estado de checagem. Sempre limpo no finally.
  const { beginCheck, endCheck } = useEntitlementStatus.getState();
  beginCheck();
  try {
    const result = await fetchRemoteEntitlements();
    if (result.data) setServerEntitlement(result.data.isPro);
  } finally {
    endCheck();
  }
}

/** Consulta entitlement Pro no servidor quando Supabase está ativo. */
export function EntitlementBootstrap() {
  const setServerEntitlement = useStore((state) => state.setServerEntitlement);

  useEffect(() => {
    if (isQaTestStateActive()) return;
    if (!isSupabaseBackendEnabled()) return;

    let unsubHydration: (() => void) | undefined;
    if (useStore.persist.hasHydrated()) {
      void refreshServerEntitlement(setServerEntitlement);
    } else {
      unsubHydration = useStore.persist.onFinishHydration(() => {
        unsubHydration?.();
        unsubHydration = undefined;
        void refreshServerEntitlement(setServerEntitlement);
      });
    }

    const client = getSupabaseClient();
    if (!client) {
      return () => unsubHydration?.();
    }

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

    return () => {
      unsubHydration?.();
      subscription.unsubscribe();
    };
  }, [setServerEntitlement]);

  return null;
}
