/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_MODE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ADMIN_EMAILS?: string;
  readonly VITE_APP_VERSION?: string;
  /** development | preview | production_beta */
  readonly VITE_APP_ENV?: string;
  /** Nunca true no ambiente principal (Production Beta). */
  readonly VITE_ALLOW_PRO_PREVIEW?: string;
  /** Fixtures de teste — bloqueado em Production Beta. */
  readonly VITE_USE_TEST_FIXTURES?: string;
  /** Bypass DEV/E2E de conta local. Hard-fail se ativo em Production Beta. */
  readonly VITE_DEV_ALLOW_LOCAL_AUTH?: string;
  /** Rollback: false desliga conversas V2 (usa player V1). */
  readonly VITE_ENABLE_CONVERSATION_V2?: string;
  /** Rollback: false desliga telemetria pedagógica. */
  readonly VITE_ENABLE_TELEMETRY?: string;
  /** Rollback: false desliga envio de feedback. */
  readonly VITE_ENABLE_BETA_FEEDBACK?: string;
  /**
   * Handoff V4.7.1. Default false em production_beta até schema/Edges no staging
   * e depois produção. true em preview/dev. Não reativa conta local.
   */
  readonly VITE_CLOUD_ONBOARDING_V2_ENABLED?: string;
  /** Site key pública do Cloudflare Turnstile. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** URL canônica do site (SEO: canonical, Open Graph, sitemap). */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
