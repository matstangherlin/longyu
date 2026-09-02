import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { canSignInWithCredentials } from "../../lib/authForm";
import { Button } from "../ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";
import { PasswordField } from "./PasswordField";

export function CloudLoginForm({
  email,
  password,
  error,
  notice,
  loading,
  submitLabel,
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
  const { t } = useTranslation();
  const resolvedSubmit = submitLabel ?? t("auth.signIn");
  const canSubmit = canSignInWithCredentials(email, password) && !loading;

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {notice && (
        <p className="rounded-xl border border-good/25 bg-good-soft px-4 py-3 text-sm font-medium text-ink">
          {notice}
        </p>
      )}
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("auth.email")}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          placeholder={t("auth.emailPlaceholder")}
          className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <PasswordField
        name="password"
        label={t("auth.password")}
        labelTrailing={
          forgotPasswordHref ? (
            <Link to={forgotPasswordHref} className="text-xs font-semibold text-accent hover:underline">
              {t("auth.forgotPassword")}
            </Link>
          ) : null
        }
        autoComplete="current-password"
        value={password}
        onChange={(event) => onPassword(event.target.value)}
        placeholder={t("auth.passwordPlaceholder")}
      />
      {error && (
        <p className="rounded-xl border border-wrong/20 bg-wrong-soft px-4 py-3 text-sm font-medium text-wrong">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={loading || (!canSubmit && !email && !password)} className="w-full">
        {loading ? t("auth.signingIn") : resolvedSubmit}
      </Button>
    </form>
  );
}
