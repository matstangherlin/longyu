/**
 * LGY-040 — rascunho jurídico da beta fechada.
 * [PREENCHER] pode ir ao ar enquanto VITE_PUBLIC_RELEASE não for "true".
 * Beta pública / cobrança: a flag liga e o teste recusa o placeholder.
 */
export function legalPlaceholdersAllowed(
  env: { VITE_PUBLIC_RELEASE?: string } = import.meta.env as { VITE_PUBLIC_RELEASE?: string }
): boolean {
  return env.VITE_PUBLIC_RELEASE !== "true";
}

export const LEGAL_PLACEHOLDER_MARK = "[PREENCHER:";
