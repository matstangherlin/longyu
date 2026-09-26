import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button } from "../../components/ui/primitives";
import { PasswordField, PasswordRequirements } from "../../components/auth/PasswordField";
import { isValidEmail } from "../../lib/authForm";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import {
  RECOVERY_CODE_LENGTH,
  RECOVERY_MIN_PASSWORD_LENGTH,
  isRecoveryCodeComplete,
  normalizeRecoveryCode,
} from "../../lib/passwordRecovery";
import { completePasswordRecovery, requestPasswordReset, verifyRecoveryCode } from "../../services/authService";
import { localizeUserMessage } from "../../i18n/errors";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * RC2.2.19 — recuperação de senha DENTRO do app (P1
 * PASSWORD_RECOVERY_FLOW_BROKEN_ON_MOBILE):
 *
 *   email → código de 6 dígitos → nova senha → Login
 *
 * O código vive só no estado deste formulário: nunca vai para store, URL,
 * log ou analytics. A resposta ao e-mail é sempre a mesma, exista a conta ou
 * não (anti-enumeração).
 */
type Stage = "email" | "code" | "password" | "done";

const FIELD_CLASS =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-accent/25";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cloudEnabled = isSupabaseBackendEnabled();

  async function sendCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!isValidEmail(email)) {
      setError(t("auth.errors.invalidEmail"));
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.status === "error") {
      setError(localizeUserMessage(result.message));
      return;
    }
    setNotice(localizeUserMessage(result.message));
    setCode("");
    setStage("code");
  }

  async function confirmCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isRecoveryCodeComplete(code)) {
      setError(t("auth.errors.recoveryCodeInvalid"));
      return;
    }
    setLoading(true);
    setError(null);
    const result = await verifyRecoveryCode(email, code);
    setLoading(false);
    if (result.status === "error") {
      setError(localizeUserMessage(result.message));
      return;
    }
    // O código já cumpriu o papel: sai da memória do formulário.
    setCode("");
    setNotice(null);
    setStage("password");
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < RECOVERY_MIN_PASSWORD_LENGTH) {
      setError(localizeUserMessage("A nova senha precisa ter pelo menos 6 caracteres."));
      return;
    }
    if (password !== passwordConfirm) {
      setError(t("auth.recoveryPasswordsDiffer"));
      return;
    }
    setLoading(true);
    setError(null);
    const result = await completePasswordRecovery(password);
    setLoading(false);
    if (result.status === "error") {
      setError(localizeUserMessage(result.message));
      return;
    }
    setPassword("");
    setPasswordConfirm("");
    setStage("done");
    setTimeout(() => navigate("/login", { replace: true }), 1600);
  }

  if (!cloudEnabled) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <Mascot size={96} variant="wave" />
        <h1 className="font-serif text-2xl font-semibold text-ink">{t("auth.recoveryUnavailable")}</h1>
        <p className="text-sm text-ink-soft">{t("auth.backendInactive")}</p>
        <Link
          to="/login"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-line/60 bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-2"
        >
          {t("auth.backToLogin")}
        </Link>
      </div>
    );
  }

  const title =
    stage === "email"
      ? t("auth.forgotPassword")
      : stage === "code"
        ? t("auth.recoveryCodeTitle")
        : stage === "password"
          ? t("auth.recoveryNewPasswordTitle")
          : t("auth.recoveryDone");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 py-8" data-testid="password-recovery" data-recovery-stage={stage}>
      <div className="text-center">
        <Mascot size={88} variant="wave" className="mx-auto" />
        <h1 className="mt-4 font-serif text-2xl font-semibold text-ink">{title}</h1>
        {stage === "email" && <p className="mt-2 text-sm leading-6 text-ink-soft">{t("auth.forgotPasswordLead")}</p>}
        {stage === "code" && (
          <p className="mt-2 text-sm leading-6 text-ink-soft" data-testid="recovery-code-lead">
            {t("auth.recoveryCodeLead", { email: email.trim() })}
          </p>
        )}
      </div>

      {stage === "email" && (
        <form onSubmit={sendCode} className="rounded-[28px] border border-line bg-surface p-5 shadow-lift sm:p-6">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("auth.email")}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              className={FIELD_CLASS}
              data-testid="recovery-email"
            />
          </label>
          <Feedback notice={notice} error={error} />
          <Button type="submit" size="lg" disabled={loading} className="mt-5 w-full" data-testid="recovery-send">
            {loading ? t("auth.sending") : t("auth.sendResetLink")}
          </Button>
        </form>
      )}

      {stage === "code" && (
        <form onSubmit={confirmCode} className="rounded-[28px] border border-line bg-surface p-5 shadow-lift sm:p-6">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("auth.recoveryCodeLabel")}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={RECOVERY_CODE_LENGTH + 2}
              value={code}
              onChange={(event) => setCode(normalizeRecoveryCode(event.target.value))}
              className={`${FIELD_CLASS} text-center font-mono text-2xl tracking-[0.5em]`}
              aria-describedby="recovery-code-hint"
              data-testid="recovery-code"
            />
          </label>
          <p id="recovery-code-hint" className="mt-2 text-xs leading-5 text-ink-faint">
            {t("auth.recoveryLinkAlsoWorks")}
          </p>
          <Feedback notice={notice} error={error} />
          <Button type="submit" size="lg" disabled={loading || !isRecoveryCodeComplete(code)} className="mt-5 w-full" data-testid="recovery-verify">
            {loading ? t("auth.recoveryVerifying") : t("auth.recoveryVerify")}
          </Button>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
            <button type="button" className="min-h-11 px-2 font-semibold text-accent hover:underline" disabled={loading} onClick={() => void sendCode()} data-testid="recovery-resend">
              {t("auth.recoveryResend")}
            </button>
            <span aria-hidden className="text-ink-faint">·</span>
            <button
              type="button"
              className="min-h-11 px-2 font-semibold text-ink-soft hover:underline"
              onClick={() => {
                setStage("email");
                setCode("");
                setError(null);
                setNotice(null);
              }}
            >
              {t("auth.recoveryChangeEmail")}
            </button>
          </div>
        </form>
      )}

      {stage === "password" && (
        <form onSubmit={savePassword} className="rounded-[28px] border border-line bg-surface p-5 shadow-lift sm:p-6">
          <PasswordField
            label={t("auth.recoveryNewPasswordLabel")}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            data-testid="recovery-new-password"
          />
          <PasswordField
            className="mt-4"
            label={t("auth.recoveryConfirmPasswordLabel")}
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            data-testid="recovery-confirm-password"
          />
          <PasswordRequirements password={password} confirmation={passwordConfirm} progressive className="mt-3" />
          <Feedback notice={null} error={error} />
          <Button type="submit" size="lg" disabled={loading} className="mt-5 w-full" data-testid="recovery-save">
            {loading ? t("auth.recoverySaving") : t("auth.recoverySave")}
          </Button>
        </form>
      )}

      {stage === "done" && (
        <p className="rounded-xl border border-good/25 bg-good-soft px-4 py-3 text-center text-sm font-medium text-ink" role="status" data-testid="recovery-done">
          {t("auth.recoveryDone")}
        </p>
      )}

      <p className="text-center text-sm text-ink-soft">
        <Link to="/login" className="font-semibold text-accent hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </div>
  );
}

function Feedback({ notice, error }: { notice: string | null; error: string | null }) {
  return (
    <>
      {notice && (
        <p className="mt-4 rounded-xl border border-good/25 bg-good-soft px-4 py-3 text-sm font-medium text-ink" role="status" data-testid="recovery-notice">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-wrong/20 bg-wrong-soft px-4 py-3 text-sm font-medium text-wrong" role="alert" data-testid="recovery-error">
          {error}
        </p>
      )}
    </>
  );
}
