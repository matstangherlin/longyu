import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button } from "../../components/ui/primitives";
import { canRegisterWithCredentials } from "../../lib/authForm";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { updatePasswordAfterRecovery } from "../../services/authService";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const cloudEnabled = isSupabaseBackendEnabled();

  useEffect(() => {
    if (!cloudEnabled) {
      setChecking(false);
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setChecking(false);
      return;
    }

    const syncSession = async () => {
      const {
        data: { session },
      } = await client.auth.getSession();
      setSessionReady(Boolean(session));
      setChecking(false);
    };

    void syncSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void client.auth.getSession().then(({ data: { session } }) => {
          setSessionReady(Boolean(session));
          setChecking(false);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [cloudEnabled]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRegisterWithCredentials("user@longyu.app", password, passwordConfirm)) {
      setError("Use uma senha de pelo menos 6 caracteres e confirme igual nos dois campos.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await updatePasswordAfterRecovery(password);
    setLoading(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setNotice(result.message);
    setTimeout(() => navigate("/login", { replace: true }), 1800);
  }

  if (!cloudEnabled) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <Mascot size={96} variant="wave" />
        <h1 className="font-serif text-2xl font-semibold text-ink">Redefinição indisponível</h1>
        <Link
          to="/login"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-line/60 bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-2"
        >
          Voltar ao login
        </Link>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center text-sm text-ink-soft">
        Validando link de recuperação…
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <Mascot size={88} variant="wave" />
        <h1 className="font-serif text-2xl font-semibold text-ink">Link inválido ou expirado</h1>
        <p className="text-sm leading-6 text-ink-soft">
          Solicite um novo email de recuperação e abra o link mais recente.
        </p>
        <Link
          to="/esqueci-senha"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-white shadow-card hover:bg-accent-strong"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 py-8">
      <div className="text-center">
        <Mascot size={88} variant="wave" className="mx-auto" />
        <h1 className="mt-4 font-serif text-2xl font-semibold text-ink">Nova senha</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">Escolha uma senha nova para sua conta Longyu.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[28px] border border-line bg-surface p-5 shadow-lift sm:p-6">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Nova senha</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo de 6 caracteres"
            className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Confirmar senha</span>
          <input
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            placeholder="Repita a senha"
            className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25"
          />
        </label>

        {notice && (
          <p className="mt-4 rounded-xl border border-good/25 bg-good-soft px-4 py-3 text-sm font-medium text-ink">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-wrong/20 bg-wrong-soft px-4 py-3 text-sm font-medium text-wrong">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading} className="mt-5 w-full">
          {loading ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
