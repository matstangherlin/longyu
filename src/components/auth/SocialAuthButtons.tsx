/**
 * RC2.3.8 — "Continuar com Google / Apple / Microsoft", one per line, icon +
 * text (never icon-only). Only providers the owner switched on are shown; the
 * e-mail path below always stays.
 */
import { useState } from "react";
import { currentProviderAvailability } from "../../lib/auth/providerConfig";
import { authErrorCopyPt, type AuthError } from "../../lib/auth/authError";
import type { SocialProviderId } from "../../lib/auth/providers";
import { startProviderAuth } from "../../services/oauthService";

function ProviderIcon({ id }: { id: string }) {
  const common = { width: 20, height: 20, "aria-hidden": true } as const;
  if (id === "google")
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
        <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
        <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z" />
        <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" />
      </svg>
    );
  if (id === "apple")
    return (
      <svg {...common} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7a4.6 4.6 0 0 0-3.6-1.9c-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.9-1.7 0-3.2 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.6 1.3-2.7 0 0-2.4-1-2.3-3.9zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z" />
      </svg>
    );
  if (id === "microsoft")
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
        <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
        <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
        <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
      </svg>
    );
  return null;
}

export function SocialAuthButtons({ returnTo, onOtherMethod }: { returnTo?: string; onOtherMethod?: () => void }) {
  const offered = currentProviderAvailability().filter((a) => a.offered && a.provider.id !== "email");
  const [busy, setBusy] = useState<SocialProviderId | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  if (offered.length === 0) return null;

  const start = async (id: SocialProviderId) => {
    setBusy(id);
    setError(null);
    const result = await startProviderAuth(id, { intent: "signin", returnTo });
    // On success the page navigates away; on failure the buttons come back.
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
    }
  };

  const copy = error ? authErrorCopyPt(error) : null;
  return (
    <div className="space-y-2.5" data-testid="social-auth">
      {offered.map(({ provider }) => (
        <button
          key={provider.id}
          type="button"
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 text-[15px] font-semibold text-ink shadow-card disabled:opacity-60"
          onClick={() => void start(provider.id as SocialProviderId)}
          disabled={busy !== null}
          aria-busy={busy === provider.id}
          data-testid={`auth-provider-${provider.id}`}
        >
          <ProviderIcon id={provider.icon} />
          <span className="flex flex-col items-start leading-tight">
            <span>{busy === provider.id ? "Abrindo…" : provider.label}</span>
            {provider.sublabel ? <span className="text-xs font-normal text-ink-soft">{provider.sublabel}</span> : null}
          </span>
        </button>
      ))}
      {copy ? (
        <div role="alert" className="rounded-xl border border-line bg-surface-2 p-3 text-sm" data-testid="social-auth-error">
          <p className="font-semibold text-ink">{copy.title}</p>
          <p className="text-ink-soft">{copy.body}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" className="font-semibold text-accent" onClick={() => error && void start(error.provider as SocialProviderId)}>
              Tentar novamente
            </button>
            {onOtherMethod ? (
              <button type="button" className="font-semibold text-accent" onClick={onOtherMethod}>
                Usar outro método
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="flex items-center gap-3 py-1 text-xs text-ink-faint" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
