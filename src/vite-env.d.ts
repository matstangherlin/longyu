/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_SHA__: string;

interface ImportMetaEnv {
  readonly VITE_BACKEND_MODE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
