/**
 * RC2.3.8 — "Métodos de acesso" (account settings).
 * Linking uses Supabase's official manual linking; the client never decides
 * that two identities are the same person. The last access method can never
 * be removed (ACCOUNT_MUST_REMAIN_RECOVERABLE). Unlink ≠ delete account.
 */
import { useEffect, useState } from "react";
import { AUTH_PROVIDERS, SUPABASE_PROVIDER, type SocialProviderId } from "../../lib/auth/providers";
import { enabledSocialProviders } from "../../lib/auth/providerConfig";
import { canUnlink, listAccessMethods, startProviderAuth, unlinkAccessMethod, type AccessMethod } from "../../services/oauthService";

const LABEL: Record<string, string> = { email: "E-mail", google: "Google", apple: "Apple", azure: "Microsoft" };

export function AccessMethodsCard() {
  const [methods, setMethods] = useState<AccessMethod[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const enabled = enabledSocialProviders();

  const refresh = () => void listAccessMethods().then(setMethods);
  useEffect(refresh, []);

  if (methods === null) return null;
  const linked = new Set(methods.map((m) => m.provider));
  const linkable = AUTH_PROVIDERS.filter((p) => p.id !== "email" && enabled.has(p.id as SocialProviderId) && !linked.has(SUPABASE_PROVIDER[p.id as SocialProviderId]));

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="access-methods">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Métodos de acesso</div>
      <ul className="mt-2 grid gap-2">
        {methods.map((m) => (
          <li key={m.identityId} className="flex min-h-11 items-center justify-between gap-2 text-sm">
            <span className="text-ink">
              {LABEL[m.provider] ?? m.provider} ✓{m.emailHint ? <span className="ml-2 text-ink-soft">{m.emailHint}</span> : null}
            </span>
            {canUnlink(methods, m.provider) ? (
              <button
                type="button"
                className="min-h-11 px-2 text-sm font-semibold text-accent"
                onClick={() =>
                  void unlinkAccessMethod(m.provider).then((r) => {
                    setMessage(r.ok ? "Método removido." : r.reason === "LAST_METHOD" ? "Adicione outro método antes de remover este." : "Não foi possível remover agora. Tente novamente.");
                    refresh();
                  })
                }
              >
                Remover
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {linkable.length ? (
        <div className="mt-3 grid gap-2">
          {linkable.map((p) => (
            <button
              key={p.id}
              type="button"
              className="min-h-11 rounded-xl border border-line px-3 text-left text-sm font-semibold text-ink"
              onClick={() =>
                void startProviderAuth(p.id as SocialProviderId, { intent: "link", returnTo: "/conta" }).then((r) => {
                  if (!r.ok) setMessage(r.error.category === "CONFLICT" ? "Este método já está ligado a outra conta." : "Não foi possível vincular agora. Tente novamente.");
                })
              }
            >
              Vincular {LABEL[SUPABASE_PROVIDER[p.id as SocialProviderId]]}
            </button>
          ))}
        </div>
      ) : null}
      {message ? (
        <p role="status" className="mt-2 text-sm text-ink-soft">
          {message}
        </p>
      ) : null}
    </section>
  );
}
