import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import {
  courseDirectionForInstructionLocale,
  instructionLocaleForDirection,
  type CourseDirectionId,
} from "../i18n/courseDirection";
import { isKnownMissing, isMissingColumnError, markMissing, readInstructionLocale, rememberInstructionLocale, setSchemaDriftReporter } from "../lib/cloud/schemaDrift";
import { captureSchemaDrift } from "../lib/observability/errorReporting";

const LOCALE_OBJECT = "profiles.instruction_locale";
setSchemaDriftReporter((objectName) => captureSchemaDrift(objectName));

/**
 * RC2.2.14B · T — curso da conta cloud. A autoridade é profiles.instruction_locale.
 * Em produção essa coluna ainda pode faltar (LGY-001): a leitura acontece uma
 * vez por sessão e, no 42703, vira no-op até recarregar. O curso local fica.
 */
export async function syncCourseDirectionToProfile(id: CourseDirectionId): Promise<void> {
  if (!isSupabaseBackendEnabled()) return;
  const client = getSupabaseClient();
  const locale = instructionLocaleForDirection(id);
  if (!client || !locale) return;
  if (isKnownMissing(LOCALE_OBJECT)) return;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;
  const { error } = await client
    .from("profiles")
    .update({ instruction_locale: locale, native_language: locale, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error && isMissingColumnError(error)) {
    markMissing(LOCALE_OBJECT);
    return;
  }
  if (!error) rememberInstructionLocale(user.id, locale);
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
  const locale = await readInstructionLocale(user.id, () =>
    client.from("profiles").select("instruction_locale").eq("id", user.id).maybeSingle()
  );
  if (!locale) return null;
  const direction = courseDirectionForInstructionLocale(locale);
  return direction ? { userId: user.id, direction } : null;
}
