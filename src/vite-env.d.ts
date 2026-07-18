/// <reference types="vite/client" />

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
  /** Rollback: false desliga conversas V2 (usa player V1). */
  readonly VITE_ENABLE_CONVERSATION_V2?: string;
  /** Rollback: false desliga telemetria pedagógica. */
  readonly VITE_ENABLE_TELEMETRY?: string;
  /** Rollback: false desliga envio de feedback. */
  readonly VITE_ENABLE_BETA_FEEDBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
