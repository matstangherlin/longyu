/**
 * RC2.3.11 — shared Stripe live-key refusal.
 *
 * While cloud.certification is BLOCKED (and until OA enables LIVE),
 * no Edge Function may call Stripe with a live secret.
 *
 * Detection is prefix-only (`sk_live_`). Never log the secret.
 */

export const STRIPE_LIVE_DISABLED_MESSAGE =
  "Stripe Live is disabled for this release candidate." as const;

export function isStripeLiveSecret(secret: string | null | undefined): boolean {
  return typeof secret === "string" && secret.startsWith("sk_live_");
}

export function refuseStripeLive(
  secret: string | null | undefined,
  headers: Record<string, string>
): Response | null {
  if (!isStripeLiveSecret(secret)) return null;
  return new Response(JSON.stringify({ error: STRIPE_LIVE_DISABLED_MESSAGE }), {
    status: 503,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
