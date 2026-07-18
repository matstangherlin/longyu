import { useEffect } from "react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { hydrateTelemetryConsentFromProfile } from "../../services/telemetryConsent";

/** Sincroniza consentimento do perfil cloud após login / sessão inicial. */
export function TelemetryConsentBootstrap() {
  useEffect(() => {
    if (!isSupabaseBackendEnabled()) return;

    void hydrateTelemetryConsentFromProfile();

    const client = getSupabaseClient();
    if (!client) return;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        void hydrateTelemetryConsentFromProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
