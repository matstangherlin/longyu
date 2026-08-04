import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button, Card, Pill } from "../../components/ui/primitives";
import {
  clearPendingConfirmEmail,
  peekPendingConfirmEmail,
  storePendingConfirmEmail,
} from "../../lib/authRedirect";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { resolvePostAuthPath } from "../../lib/subscribeAuthRedirect";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { useStore } from "../../lib/store";
import { resendConfirmationEmail } from "../../services/authService";
import { syncAuthSessionProgress } from "../../services/cloudSyncCoordinator";

export function ConfirmEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const postAuthPath = resolvePostAuthPath(searchParams, "/jornada");
  const setAccountSetupComplete = useStore((s) => s.setAccountSetupComplete);

  const initialEmail = useMemo(() => {
    return (searchParams.get("email") ?? peekPendingConfirmEmail() ?? "").trim();
  }, [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(true);
  const cloudEnabled = isSupabaseBackendEnabled();

  useEffect(() => {
    if (email) storePendingConfirmEmail(email);
  }, [email]);

  useEffect(() => {
    if (!cloudEnabled) {
      setConfirming(false);
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setConfirming(false);
      return;
    }

    let cancelled = false;

    const finishConfirmed = async () => {
      setAccountSetupComplete(true);
      clearPendingConfirmEmail();
      const sync = await syncAuthSessionProgress();
      if (cancelled) return;
      setNotice(
        sync.ok
          ? "Email confirmado. Sua conta está ativa e o progresso já sincroniza na nuvem."
          : "Email confirmado. Sua conta está ativa."
      );
      setTimeout(() => navigate(postAuthPath, { replace: true }), 1200);
    };

    const checkSession = async () => {
      const {
        data: { session },
      } = await client.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        await finishConfirmed();
        return;
      }
      setConfirming(false);
    };

    // detectSessionInUrl consome #access_token / ?code= em um tick após o load.
    const timer = window.setTimeout(() => {
      void checkSession();
    }, 450);

    void checkSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        void finishConfirmed();
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [cloudEnabled, navigate, postAuthPath, setAccountSetupComplete]);

  async function handleResend(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setError("Informe o email usado no cadastro.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    const result = await resendConfirmationEmail(email);
    setLoading(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    storePendingConfirmEmail(email);
    setNotice(result.message);
  }

  if (!cloudEnabled) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <Mascot size={96} variant="wave" />
        <h1 className="font-serif text-2xl font-semibold text-ink">Confirmação indisponível</h1>
        <p className="text-sm text-ink-soft">O backend em nuvem não está ativo neste ambiente.</p>
        <Link to="/conta" className="font-semibold text-accent hover:underline">
          Voltar ao cadastro
        </Link>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center text-sm text-ink-soft">
        Confirmando seu email…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col justify-center py-6 sm:py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <Mascot size={88} variant="wave" />
        </div>
        <Pill tone="accent">Quase lá</Pill>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-ink sm:text-3xl">Confirme seu email</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Enviamos um link de ativação. Abra o email e toque em confirmar — sem isso a conta não libera
          sincronização, Pro por indicação nem login completo.
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <form onSubmit={(event) => void handleResend(event)} className="grid gap-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              placeholder="voce@email.com"
              className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
            />
          </label>

          {notice && (
            <p className="rounded-xl border border-good/25 bg-good-soft px-4 py-3 text-sm font-medium text-ink">
              {notice}
            </p>
          )}
          {error && (
            <p className="rounded-xl border border-wrong/20 bg-wrong-soft px-4 py-3 text-sm font-medium text-wrong">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? "Reenviando…" : "Reenviar link de confirmação"}
          </Button>
        </form>
      </Card>

      <div className="mt-5 flex flex-col items-center gap-2 text-center text-sm text-ink-soft">
        <p>Já confirmou?</p>
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Entrar na conta
        </Link>
      </div>
    </div>
  );
}
