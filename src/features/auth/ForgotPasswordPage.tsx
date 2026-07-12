import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button } from "../../components/ui/primitives";
import { isValidEmail } from "../../lib/authForm";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { requestPasswordReset } from "../../services/authService";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cloudEnabled = isSupabaseBackendEnabled();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Informe um email válido.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setNotice(result.message);
  }

  if (!cloudEnabled) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <Mascot size={96} variant="wave" />
        <h1 className="font-serif text-2xl font-semibold text-ink">Recuperação indisponível</h1>
        <p className="text-sm text-ink-soft">O backend em nuvem não está ativo neste ambiente.</p>
        <Link
          to="/login"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-line/60 bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-2"
        >
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 py-8">
      <div className="text-center">
        <Mascot size={88} variant="wave" className="mx-auto" />
        <h1 className="mt-4 font-serif text-2xl font-semibold text-ink">Esqueci minha senha</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Enviaremos um link para redefinir sua senha no email cadastrado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[28px] border border-line bg-surface p-5 shadow-lift sm:p-6">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@email.com"
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
          {loading ? "Enviando…" : "Enviar link de recuperação"}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-soft">
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
