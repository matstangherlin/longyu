/**
 * RC2.3.13R.3.2.4 — entrance emphasis plays once per app session.
 * Re-opening a screen, expanding a module again or re-rendering never
 * replays it (no queued animation chains on rapid navigation).
 */
const claimed = new Set<string>();

export function claimSessionOnce(key: string): boolean {
  if (claimed.has(key)) return false;
  claimed.add(key);
  return true;
}

/**
 * RC2.3.13R.3.2.6 — read without claiming: render-time decisions peek (StrictMode
 * runs initializers twice), and the claim is committed once in an effect.
 */
export function sessionOnceClaimed(key: string): boolean {
  return claimed.has(key);
}

/** Tests only. */
export function resetSessionOnceForTests(): void {
  claimed.clear();
}
