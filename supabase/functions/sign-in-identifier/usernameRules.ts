// RC2.2.11 — cópia Deno das regras de src/lib/username.ts.
// A Edge não importa código de src/; o validador `username-contract` garante
// que o padrão aqui é idêntico ao do cliente e ao da migration pendente.

export const USERNAME_PATTERN = /^[a-z0-9_](?:[a-z0-9_]|\.(?!\.)){1,18}[a-z0-9_]$/;

/** Normaliza (trim, @ opcional, minúsculas ASCII) e valida. Unicode falha fechado. */
export function normalizeLoginUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  for (let i = 0; i < withoutAt.length; i += 1) {
    const code = withoutAt.charCodeAt(i);
    if (code < 0x21 || code > 0x7e) return null;
  }
  const lower = withoutAt.replace(/[A-Z]/g, (ch) => ch.toLowerCase());
  return USERNAME_PATTERN.test(lower) ? lower : null;
}
