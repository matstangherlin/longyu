import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { canSignInWithCredentials } from "../../lib/authForm";
import { Button } from "../ui/primitives";

export function CloudLoginForm({
  email,
  password,
  error,
  notice,
  loading,
  submitLabel = "Entrar",
  forgotPasswordHref = "/esqueci-senha",
  onEmail,
  onPassword,
  onSubmit,
}: {
  email: string;
  password: string;
  error?: string | null;
  notice?: string | null;
  loading?: boolean;
  submitLabel?: string;
  forgotPasswordHref?: string | null;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const canSubmit = canSignInWithCredentials(email, password) && !loading;

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {notice && (
        <p className="rounded-xl border border-good/25 bg-good-soft px-4 py-3 text-sm font-medium text-ink">
          {notice}
        </p>
      )}
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          placeholder="voce@email.com"
          className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <label className="block">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Senha</span>
          {forgotPasswordHref && (
            <Link to={forgotPasswordHref} className="text-xs font-semibold text-accent hover:underline">
              Esqueci minha senha
            </Link>
          )}
        </div>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          placeholder="Mínimo de 6 caracteres"
          className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
        />
      </label>
      {error && (
        <p className="rounded-xl border border-wrong/20 bg-wrong-soft px-4 py-3 text-sm font-medium text-wrong">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={loading || (!canSubmit && !email && !password)} className="w-full">
        {loading ? "Entrando…" : submitLabel}
      </Button>
    </form>
  );
}
