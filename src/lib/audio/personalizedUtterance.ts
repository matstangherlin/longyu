/**
 * Pure predicate: Mandarin text mixed with a Latin proper name.
 * Used by audio core to upgrade classification to PERSONAL_UTTERANCE /
 * DYNAMIC_CONTENT without importing React/store personalization modules.
 */

export const CJK_RE = /[㐀-鿿]/u;
export const LATIN_NAME_RE = /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,}/;

/** Utterance with Mandarin + Latin proper name — must use DYNAMIC speech path. */
export function isPersonalizedUtterance(text: string | undefined | null): boolean {
  const clean = String(text ?? "").trim();
  if (!clean) return false;
  return CJK_RE.test(clean) && LATIN_NAME_RE.test(clean);
}
