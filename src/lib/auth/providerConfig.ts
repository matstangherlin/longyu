/**
 * RC2.3.8 — which social providers are switched on for this build.
 * Source of truth: VITE_AUTH_PROVIDERS (public list the owner sets after
 * enabling the provider in Supabase Auth). Seeded E2E/QA sessions may override
 * via localStorage, never in production builds.
 */
import { parseEnabledProviders, providerAvailability, type ProviderAvailability, type SocialProviderId } from "./providers";
import { allowSeededLocalSession } from "./localAuthPolicy";
import { isNativeApp } from "../platform/nativePlatform";

export const QA_PROVIDERS_OVERRIDE_KEY = "longyu:qa-auth-providers";

export function enabledSocialProviders(): Set<SocialProviderId> {
  let raw: string | undefined = import.meta.env.VITE_AUTH_PROVIDERS;
  try {
    if (allowSeededLocalSession()) {
      const override = localStorage.getItem(QA_PROVIDERS_OVERRIDE_KEY);
      if (override !== null) raw = override;
    }
  } catch {
    /* ignore */
  }
  return parseEnabledProviders(raw);
}

export function currentProviderAvailability(): ProviderAvailability[] {
  return providerAvailability(enabledSocialProviders(), isNativeApp() ? "android" : "web");
}
