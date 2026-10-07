/**
 * RC2.3.8 — auth provider registry (one architecture, several providers).
 *
 * Canonical identity is ALWAYS the Supabase user id (`auth.users.id`), never an
 * e-mail: Apple can hide it (private relay), Microsoft can alias it, a provider
 * can change it. E-mail is contact data, not identity.
 *
 * "Code exists" ≠ "provider works": a provider is offered to learners only when
 * the owner enabled it in Supabase Auth and listed it in VITE_AUTH_PROVIDERS.
 */

export type AuthProviderId = "email" | "google" | "apple" | "microsoft";

/** Supabase provider names (current docs: Microsoft is `azure`). */
export const SUPABASE_PROVIDER: Record<Exclude<AuthProviderId, "email">, "google" | "apple" | "azure"> = {
  google: "google",
  apple: "apple",
  microsoft: "azure",
};

export type ProviderConfigStatus =
  | "NOT_CONFIGURED"
  | "CODE_READY"
  | "PROVIDER_CONFIG_REQUIRED"
  | "READY_FOR_WEB_TEST"
  | "READY_FOR_ANDROID_TEST"
  | "VERIFIED";

export interface AuthProviderMeta {
  id: AuthProviderId;
  /** Learner label (PT-BR). Official wording: "Continuar com Apple", never "iCloud". */
  label: string;
  /** Optional discreet subtitle. */
  sublabel?: string;
  /** Icon id (rendered next to text — never icon-only). */
  icon: "google" | "apple" | "microsoft" | "mail";
  webSupported: boolean;
  androidSupported: boolean;
  /** OAuth scopes required by Supabase for this provider. */
  scopes?: string;
  /** Status of the CODE in this repo; runtime availability comes from configuration. */
  codeStatus: ProviderConfigStatus;
}

export const AUTH_PROVIDERS: readonly AuthProviderMeta[] = [
  { id: "google", label: "Continuar com Google", icon: "google", webSupported: true, androidSupported: true, codeStatus: "CODE_READY" },
  { id: "apple", label: "Continuar com Apple", icon: "apple", webSupported: true, androidSupported: true, scopes: "name email", codeStatus: "CODE_READY" },
  // Supabase requires the `email` scope for Azure (Microsoft) — current docs.
  { id: "microsoft", label: "Continuar com Microsoft", sublabel: "Outlook · Hotmail · Live", icon: "microsoft", webSupported: true, androidSupported: true, scopes: "email", codeStatus: "CODE_READY" },
  { id: "email", label: "Continuar com e-mail", icon: "mail", webSupported: true, androidSupported: true, codeStatus: "VERIFIED" },
];

export const SOCIAL_PROVIDER_IDS = ["google", "apple", "microsoft"] as const;
export type SocialProviderId = (typeof SOCIAL_PROVIDER_IDS)[number];

/** Parse the public list of enabled providers (accepts `azure` or `microsoft`). */
export function parseEnabledProviders(raw: string | undefined | null): Set<SocialProviderId> {
  const out = new Set<SocialProviderId>();
  for (const part of String(raw ?? "").split(",")) {
    const id = part.trim().toLowerCase();
    if (id === "google" || id === "apple") out.add(id);
    if (id === "microsoft" || id === "azure") out.add("microsoft");
  }
  return out;
}

export interface ProviderAvailability {
  provider: AuthProviderMeta;
  /** Shown to learners. */
  offered: boolean;
  status: ProviderConfigStatus;
}

/**
 * Which providers a learner sees. E-mail is ALWAYS offered (never removed by a
 * social provider being down or unconfigured).
 */
export function providerAvailability(enabled: ReadonlySet<SocialProviderId>, platform: "web" | "android", outage: ReadonlySet<SocialProviderId> = new Set()): ProviderAvailability[] {
  return AUTH_PROVIDERS.map((provider) => {
    if (provider.id === "email") return { provider, offered: true, status: "VERIFIED" as const };
    const id = provider.id as SocialProviderId;
    const platformOk = platform === "web" ? provider.webSupported : provider.androidSupported;
    if (!enabled.has(id)) return { provider, offered: false, status: "PROVIDER_CONFIG_REQUIRED" as const };
    if (!platformOk) return { provider, offered: false, status: "CODE_READY" as const };
    if (outage.has(id)) return { provider, offered: false, status: platform === "web" ? "READY_FOR_WEB_TEST" : "READY_FOR_ANDROID_TEST" };
    return { provider, offered: true, status: platform === "web" ? "READY_FOR_WEB_TEST" : "READY_FOR_ANDROID_TEST" };
  });
}
