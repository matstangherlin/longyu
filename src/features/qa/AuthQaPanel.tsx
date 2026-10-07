/**
 * RC2.3.8 — Device QA panel for auth (never learner UI). Shows ids truncated,
 * providers, namespaces and claim state. NEVER tokens, secrets or auth codes.
 */
import { useEffect, useState } from "react";
import { useStore } from "../../lib/store";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { currentStorageNamespace } from "../../lib/accountStorage";
import { currentProviderAvailability } from "../../lib/auth/providerConfig";
import { CLAIM_LEDGER_KEY } from "../../lib/auth/progressClaim";
import type { SocialProviderId } from "../../lib/auth/providers";
import { listAccessMethods, oauthDiagnostics, startProviderAuth, type AccessMethod } from "../../services/oauthService";

const short = (id: string | null | undefined) => (id ? `${id.slice(0, 8)}…` : "—");

export function AuthQaPanel() {
  const accountId = useStore((s) => s.currentAccountId);
  const authMode = useStore((s) => s.accounts[s.currentAccountId]?.authMode ?? "local");
  const [userId, setUserId] = useState<string | null>(null);
  const [methods, setMethods] = useState<AccessMethod[]>([]);
  useEffect(() => {
    const client = getSupabaseClient();
    void client?.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    void listAccessMethods().then(setMethods);
  }, [accountId]);
  let ledger = "—";
  try {
    const l = JSON.parse(localStorage.getItem(CLAIM_LEDGER_KEY) ?? "{}") as { claimed?: string[]; parked?: string[] };
    ledger = `claimed ${l.claimed?.length ?? 0} · parked ${l.parked?.length ?? 0}`;
  } catch {
    /* ignore */
  }
  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="qa-auth">
      <h2 className="text-base font-semibold text-ink">Auth & Identity (RC2.3.8)</h2>
      <p className="mt-1 text-sm text-ink-soft">Inspeção — sem tokens, segredos ou códigos.</p>
      <ul className="mt-2 grid gap-1 font-mono text-xs text-ink-soft">
        <li>user: {short(userId)} · account: {accountId.startsWith("cloud:") ? `cloud:${short(accountId.slice(6))}` : accountId} · mode: {authMode}</li>
        <li>session: {userId ? "ACTIVE" : "NONE"}</li>
        <li>identities: {methods.map((m) => m.provider).join(", ") || "—"}</li>
        <li>evidence namespace: {currentStorageNamespace().startsWith("cloud:") ? `cloud:${short(currentStorageNamespace().slice(6))}` : currentStorageNamespace()}</li>
        <li>last callback: {oauthDiagnostics.lastOutcome ?? "—"} ({oauthDiagnostics.lastStage ?? "—"})</li>
        <li>claims: {ledger}</li>
      </ul>
      <div className="mt-3 grid gap-2">
        {currentProviderAvailability().map(({ provider, offered, status }) => (
          <div key={provider.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {provider.label} · <code className="text-xs">{offered ? "CONFIGURED" : status === "PROVIDER_CONFIG_REQUIRED" ? "OWNER_ACTION_REQUIRED" : status}</code>
            </span>
            {provider.id !== "email" ? (
              <button type="button" className="min-h-11 rounded-lg border border-line px-3 text-xs" disabled={!offered} onClick={() => void startProviderAuth(provider.id as SocialProviderId, { returnTo: "/qa/device" })}>
                Testar
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
