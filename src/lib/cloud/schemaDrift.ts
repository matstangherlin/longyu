/**
 * Drift de schema (LGY-001 / LGY-036). Cache de sessão: uma falha 42703
 * não vira um loop de requests. Sem console.error — o aviso vai ao reporter.
 */

export type PostgrestLikeError = {
  code?: string;
  message?: string;
  status?: number;
  details?: string;
};

const missing = new Set<string>();
const reported = new Set<string>();
let reporter: (objectName: string) => void = () => {};

export function setSchemaDriftReporter(fn: (objectName: string) => void): void {
  reporter = fn;
}

export function resetSchemaDriftForTests(): void {
  missing.clear();
  reported.clear();
  reporter = () => {};
}

export function isKnownMissing(objectName: string): boolean {
  return missing.has(objectName);
}

/** @returns true na primeira vez que o objeto é marcado nesta sessão. */
export function markMissing(objectName: string): boolean {
  if (missing.has(objectName)) return false;
  missing.add(objectName);
  if (!reported.has(objectName)) {
    reported.add(objectName);
    reporter(objectName);
  }
  return true;
}

function errorText(error: PostgrestLikeError | null | undefined): string {
  return `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
}

export function isMissingColumnError(error: PostgrestLikeError | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  const text = errorText(error);
  return text.includes("column") && text.includes("does not exist");
}

export function isMissingRelationError(error: PostgrestLikeError | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01" || error.status === 404) return true;
  const text = errorText(error);
  return text.includes("could not find the function") || text.includes("could not find the table") || text.includes("schema cache");
}

const LOCALE_COLUMNS = ["instruction_locale", "interface_locale", "country_code"] as const;

export function withoutMissingLocaleColumns<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload };
  for (const column of LOCALE_COLUMNS) delete next[column];
  return next;
}

type LocaleRow = { instruction_locale?: unknown };
type LocaleRead = () => PromiseLike<{ data: LocaleRow | null; error: PostgrestLikeError | null }>;

const LOCALE_OBJECT = "profiles.instruction_locale";
const inflight = new Map<string, Promise<string | null>>();
const settled = new Map<string, string | null>();

/** Uma leitura de instruction_locale por usuário e por sessão. 42703 vira no-op. */
export async function readInstructionLocale(userId: string, select: LocaleRead): Promise<string | null> {
  if (isKnownMissing(LOCALE_OBJECT)) return null;
  if (settled.has(userId)) return settled.get(userId) ?? null;
  const pending = inflight.get(userId);
  if (pending) return pending;
  const run = (async () => {
    const { data, error } = await select();
    if (error && isMissingColumnError(error)) {
      markMissing(LOCALE_OBJECT);
      settled.set(userId, null);
      return null;
    }
    if (error || !data) return null;
    const locale = typeof data.instruction_locale === "string" ? data.instruction_locale : null;
    settled.set(userId, locale);
    return locale;
  })().finally(() => inflight.delete(userId));
  inflight.set(userId, run);
  return run;
}

export function rememberInstructionLocale(userId: string, locale: string | null): void {
  settled.set(userId, locale);
}
