import type { BackendMode } from "./repositories/learningRepository";

export type BackendFeatureFlag = BackendMode;

/** Modo de backend: local (padrão) ou supabase quando credenciais estiverem configuradas. */
export function backendMode(): BackendFeatureFlag {
  return import.meta.env.VITE_BACKEND_MODE === "supabase" ? "supabase" : "local";
}

export function isSupabaseBackendEnabled(): boolean {
  if (backendMode() !== "supabase") return false;
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export const BACKEND_NOT_READY_MESSAGE =
  "Backend em nuvem ainda não está ativo nesta versão. Seu progresso continua salvo neste dispositivo.";
