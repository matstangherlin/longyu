import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import {
  courseDirectionForInstructionLocale,
  instructionLocaleForDirection,
  type CourseDirectionId,
} from "../i18n/courseDirection";

/**
 * RC2.2.14B · T — curso da conta cloud, sem migração nova: usa as colunas que
 * `profiles` já tem desde o cadastro (instruction_locale / native_language).
 * Web e Android leem o mesmo valor; o idioma do aparelho não o sobrescreve.
 */
export async function syncCourseDirectionToProfile(id: CourseDirectionId): Promise<void> {
  if (!isSupabaseBackendEnabled()) return;
  const client = getSupabaseClient();
  const locale = instructionLocaleForDirection(id);
  if (!client || !locale) return;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;
  await client
    .from("profiles")
    .update({ instruction_locale: locale, native_language: locale, updated_at: new Date().toISOString() })
    .eq("id", user.id);
}

/** Curso salvo no perfil da conta autenticada (null sem sessão/sem valor válido). */
export async function fetchCourseDirectionFromProfile(): Promise<{ userId: string; direction: CourseDirectionId } | null> {
  if (!isSupabaseBackendEnabled()) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data, error } = await client.from("profiles").select("instruction_locale").eq("id", user.id).maybeSingle();
  if (error || !data) return null;
  const direction = courseDirectionForInstructionLocale((data as { instruction_locale?: unknown }).instruction_locale);
  return direction ? { userId: user.id, direction } : null;
}
