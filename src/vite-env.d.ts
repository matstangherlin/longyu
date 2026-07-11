/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_MODE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_COMMIT_SHA?: string;
  readonly VITE_BUILD_TIME?: string;
  readonly VITE_RELEASE_CHANNEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
